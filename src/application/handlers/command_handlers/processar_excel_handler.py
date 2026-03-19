"""Handler: ProcessarExcelHandler."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from src.application.commands.analisar_carteira import AnalisarCarteira
from src.application.commands.processar_excel import ProcessarExcel
from src.application.handlers.command_handlers.analisar_carteira_handler import AnalisarCarteiraHandler
from src.application.handlers.command_handlers.processar_extrato_handler import ProcessarExtratoHandler
from src.application.ports.outbound.carteira_repository import CarteiraRepository
from src.application.ports.outbound.cliente_repository import ClienteRepository
from src.application.ports.outbound.excel_parser_port import ExcelParserPort
from src.domain.entities.ativo import Ativo
from src.domain.entities.carteira import Carteira
from src.domain.entities.posicao import Posicao
from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.classe_ativo import ClasseAtivo
from src.domain.value_objects.money import Money

logger = logging.getLogger(__name__)


class ProcessarExcelHandler:
    """Handler para o command ProcessarExcel.

    Orquestra: parse Excel → cria Carteira com Posições → dispara análise.
    Reutiliza _build_detalhes_rf de ProcessarExtratoHandler (ACL compartilhado).
    """

    def __init__(
        self,
        excel_parser: ExcelParserPort,
        cliente_repository: ClienteRepository,
        carteira_repository: CarteiraRepository,
        analisar_handler: AnalisarCarteiraHandler,
    ) -> None:
        self._excel_parser = excel_parser
        self._cliente_repo = cliente_repository
        self._carteira_repo = carteira_repository
        self._analisar_handler = analisar_handler

    async def handle(self, command: ProcessarExcel) -> str:
        """Executa o command ProcessarExcel.

        Args:
            command: Command com excel_bytes e metadados.

        Returns:
            ID da análise gerada.

        Raises:
            InvalidEntityError: Se cliente não encontrado.
            ValueError: Se planilha não puder ser parseada.
        """
        cliente_id = UUID(command.cliente_id)

        # 1. Validar que cliente existe
        cliente = await self._cliente_repo.find_by_id(cliente_id)
        if cliente is None:
            raise InvalidEntityError(f"Cliente {cliente_id} não encontrado.")

        # 2. Parse do Excel (síncrono — openpyxl não é async)
        posicoes_parsed = self._excel_parser.parse_carteira(command.excel_bytes)
        if not posicoes_parsed:
            raise ValueError(
                "Nenhuma posição encontrada na planilha. "
                "Verifique se o arquivo segue o template e possui dados nas linhas 2+."
            )

        # 3. Criar Carteira aggregate
        carteira_id = uuid4()
        data_ref = (
            datetime.fromisoformat(command.data_referencia).replace(tzinfo=timezone.utc)
            if "T" not in command.data_referencia
            else datetime.fromisoformat(command.data_referencia)
        )

        carteira = Carteira(
            id=carteira_id,
            cliente_id=cliente_id,
            data_referencia=data_ref,
            origem_arquivo=command.nome_arquivo,
        )

        # 4. Criar Posições a partir dos DTOs (ACL conversion — mesma lógica do PDF handler)
        for parsed in posicoes_parsed:
            try:
                classe = ClasseAtivo(parsed.classe_ativo)
            except ValueError:
                logger.warning("Classe '%s' desconhecida para %s — usando ACAO.", parsed.classe_ativo, parsed.ticker)
                classe = ClasseAtivo.ACAO

            ativo_id = uuid4()
            detalhes_rf = (
                ProcessarExtratoHandler._build_detalhes_rf(parsed, ativo_id)
                if classe.is_renda_fixa
                else None
            )

            ativo = Ativo(
                id=ativo_id,
                ticker=parsed.ticker,
                nome=parsed.nome,
                classe=classe,
                setor=parsed.setor or "Não classificado",
                emissor=parsed.emissor or parsed.nome,
                detalhes_rf=detalhes_rf,
            )

            posicao = Posicao(
                id=uuid4(),
                carteira_id=carteira_id,
                ativo=ativo,
                quantidade=parsed.quantidade,
                preco_medio=Money.from_reais(parsed.preco_medio),
                valor_atual=Money.from_reais(parsed.valor_atual),
            )
            carteira.adicionar_posicao(posicao)

        # 5. Persistir carteira
        await self._carteira_repo.save(carteira)
        logger.info("Carteira %s criada via Excel com %d posições.", carteira_id, len(posicoes_parsed))

        # 6. Disparar análise
        analise_command = AnalisarCarteira(
            carteira_id=str(carteira_id),
            cliente_id=str(cliente_id),
            idempotency_key=f"analise-{carteira_id}",
        )
        analise_id = await self._analisar_handler.handle(analise_command)
        return analise_id
