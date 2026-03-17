"""Handler: ProcessarExtratoHandler."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from src.application.commands.analisar_carteira import AnalisarCarteira
from src.application.commands.processar_extrato import ProcessarExtrato
from src.application.handlers.command_handlers.analisar_carteira_handler import (
    AnalisarCarteiraHandler,
)
from src.application.ports.outbound.carteira_repository import CarteiraRepository
from src.application.ports.outbound.cliente_repository import ClienteRepository
from src.application.ports.outbound.pdf_parser_port import PosicaoParsedDTO, PdfParserPort
from src.domain.entities.ativo import Ativo
from src.domain.entities.carteira import Carteira
from src.domain.entities.detalhes_renda_fixa import DetalhesRendaFixa
from src.domain.entities.posicao import Posicao
from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.classe_ativo import ClasseAtivo
from src.domain.value_objects.indexador_renda_fixa import IndexadorRendaFixa
from src.domain.value_objects.money import Money
from src.domain.value_objects.rating_credito import AgenciaRating, EscalaRating, RatingCredito
from src.domain.value_objects.subtipo_renda_fixa import SubtipoRendaFixa

logger = logging.getLogger(__name__)


class ProcessarExtratoHandler:
    """Handler para o command ProcessarExtrato.

    Orquestra: parse PDF → cria Carteira com Posições → dispara análise.
    """

    def __init__(
        self,
        pdf_parser: PdfParserPort,
        cliente_repository: ClienteRepository,
        carteira_repository: CarteiraRepository,
        analisar_handler: AnalisarCarteiraHandler,
    ) -> None:
        self._pdf_parser = pdf_parser
        self._cliente_repo = cliente_repository
        self._carteira_repo = carteira_repository
        self._analisar_handler = analisar_handler

    async def handle(self, command: ProcessarExtrato) -> str:
        """Executa o command ProcessarExtrato.

        Args:
            command: Command com pdf_bytes e metadados.

        Returns:
            ID da análise gerada.

        Raises:
            InvalidEntityError: Se cliente não encontrado.
            ValueError: Se PDF não puder ser parseado.
        """
        cliente_id = UUID(command.cliente_id)

        # 1. Validar que cliente existe
        cliente = await self._cliente_repo.find_by_id(cliente_id)
        if cliente is None:
            raise InvalidEntityError(f"Cliente {cliente_id} não encontrado.")

        # 2. Parse do PDF (I/O via port)
        posicoes_parsed = await self._pdf_parser.parse_extrato(command.pdf_bytes)
        if not posicoes_parsed:
            raise ValueError(
                "Nenhuma posição encontrada no PDF. "
                "Verifique se o arquivo é um extrato de carteira válido."
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

        # 4. Criar Posições a partir dos DTOs parseados (ACL conversion)
        for parsed in posicoes_parsed:
            try:
                classe = ClasseAtivo(parsed.classe_ativo)
            except ValueError:
                classe = ClasseAtivo.ACAO  # fallback

            ativo_id = uuid4()
            detalhes_rf = (
                self._build_detalhes_rf(parsed, ativo_id) if classe.is_renda_fixa else None
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

        # 6. Disparar análise
        analise_command = AnalisarCarteira(
            carteira_id=str(carteira_id),
            cliente_id=str(cliente_id),
            idempotency_key=f"analise-{carteira_id}",
        )
        analise_id = await self._analisar_handler.handle(analise_command)
        return analise_id

    @staticmethod
    def _build_detalhes_rf(
        parsed: PosicaoParsedDTO,
        ativo_id: UUID,
    ) -> DetalhesRendaFixa | None:
        """Constrói DetalhesRendaFixa a partir do DTO parseado (ACL conversion).

        Retorna None se dados insuficientes (sem data_vencimento_rf).
        """
        if not parsed.data_vencimento_rf:
            return None

        try:
            vencimento = date.fromisoformat(parsed.data_vencimento_rf)
        except (ValueError, TypeError):
            return None

        try:
            subtipo = SubtipoRendaFixa(parsed.subtipo_rf or "OUTRO")
        except ValueError:
            subtipo = SubtipoRendaFixa.OUTRO

        try:
            indexador = IndexadorRendaFixa(parsed.indexador_rf or "OUTRO")
        except ValueError:
            indexador = IndexadorRendaFixa.OUTRO

        carencia: date | None = None
        if parsed.data_carencia_rf:
            try:
                carencia = date.fromisoformat(parsed.data_carencia_rf)
            except (ValueError, TypeError):
                carencia = None

        rating: RatingCredito | None = None
        if parsed.rating_escala_rf and parsed.rating_agencia_rf:
            try:
                rating = RatingCredito(
                    escala=EscalaRating(parsed.rating_escala_rf),
                    agencia=AgenciaRating(parsed.rating_agencia_rf),
                )
            except ValueError:
                rating = None

        try:
            return DetalhesRendaFixa(
                ativo_id=ativo_id,
                subtipo=subtipo,
                indexador=indexador,
                taxa=parsed.taxa_rf or 0.0,
                data_vencimento=vencimento,
                data_carencia=carencia,
                liquidez=parsed.liquidez_rf or "NO_VENCIMENTO",
                cnpj_emissor=parsed.cnpj_emissor_rf or "",
                rating=rating,
                garantias=parsed.garantias_rf or "Sem garantia real",
            )
        except Exception as exc:
            logger.warning("Falha ao construir DetalhesRendaFixa: %s", exc)
            return None
