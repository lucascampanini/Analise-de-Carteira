"""Handler: ImportarDiversificadorCommand.

Fluxo:
  1. Busca mapa {conta: nome} dos clientes já cadastrados
  2. Importa posições RF do Diversificador
  3. Opcionalmente limpa posições antigas
  4. Persiste posições novas
  5. Cria eventos de vencimento em ass_eventos para posições ainda sem evento
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date

import structlog

from src.assistente.application.commands.importar_diversificador import (
    ImportarDiversificadorCommand,
)
from src.assistente.application.ports.outbound.renda_fixa_repository import (
    RendaFixaRepository,
)
from src.assistente.application.ports.outbound.evento_repository import EventoRepository
from src.assistente.application.ports.outbound.cliente_assessor_repository import (
    ClienteAssessorRepository,
)
from src.assistente.adapters.outbound.importers.planilha_diversificador_importer import (
    importar_renda_fixa,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.historico_imports_repository import (
    SqlAlchemyHistoricoImportsRepository,
)
from src.assistente.domain.entities.evento import Evento, TipoEvento

logger = structlog.get_logger(__name__)


@dataclass
class ResultadoImportacaoDiversificador:
    posicoes_importadas: int
    eventos_criados: int
    clientes_com_rf: int
    data_referencia: date | None


class ImportarDiversificadorHandler:
    def __init__(
        self,
        renda_fixa_repository: RendaFixaRepository,
        evento_repository: EventoRepository,
        cliente_assessor_repository: ClienteAssessorRepository,
        historico_repo: SqlAlchemyHistoricoImportsRepository | None = None,
    ) -> None:
        self._rf_repo = renda_fixa_repository
        self._evento_repo = evento_repository
        self._cliente_repo = cliente_assessor_repository
        self._historico = historico_repo

    async def handle(
        self, command: ImportarDiversificadorCommand
    ) -> ResultadoImportacaoDiversificador:
        # 1. Mapa conta → nome para enriquecer os registros
        clientes = await self._cliente_repo.listar_todos()
        nomes_por_conta = {c.codigo_conta: c.nome for c in clientes}

        # 2. Importar planilha
        posicoes = importar_renda_fixa(
            caminho_diversificador=command.caminho_diversificador,
            nome_cliente_por_conta=nomes_por_conta,
        )
        if not posicoes:
            return ResultadoImportacaoDiversificador(
                posicoes_importadas=0,
                eventos_criados=0,
                clientes_com_rf=0,
                data_referencia=None,
            )

        # 3. Substituir posições anteriores se solicitado
        if command.substituir_existentes:
            deletadas = await self._rf_repo.deletar_todos()
            logger.info("posicoes_rf_deletadas", total=deletadas)

        # 4. Persistir
        await self._rf_repo.salvar_todos(posicoes)
        logger.info("posicoes_rf_salvas", total=len(posicoes))

        # 5. Criar eventos de vencimento
        hoje = date.today()
        eventos_criados = 0
        ids_com_evento: list[str] = []

        for p in posicoes:
            if p.data_vencimento < hoje:
                continue  # já vencido, não gera alerta

            evento = Evento(
                id=str(uuid.uuid4()),
                tipo=TipoEvento.VENCIMENTO_RF,
                descricao=p.descricao_evento,
                data_evento=p.data_vencimento,
                alertar_dias_antes=command.alertar_dias_antes,
                codigo_conta=p.codigo_conta,
                nome_cliente=p.nome_cliente,
            )
            await self._evento_repo.salvar(evento)
            ids_com_evento.append(p.id)
            eventos_criados += 1

        await self._rf_repo.marcar_evento_criado(ids_com_evento)

        clientes_distintos = len({p.codigo_conta for p in posicoes})
        data_ref = posicoes[0].data_referencia if posicoes else None

        if self._historico:
            await self._historico.registrar(
                tipo="RF",
                data_referencia=data_ref,
                total_rf=len(posicoes),
                total_clientes=clientes_distintos,
            )

        logger.info(
            "importacao_diversificador_finalizada",
            posicoes=len(posicoes),
            eventos=eventos_criados,
            clientes=clientes_distintos,
        )

        return ResultadoImportacaoDiversificador(
            posicoes_importadas=len(posicoes),
            eventos_criados=eventos_criados,
            clientes_com_rf=clientes_distintos,
            data_referencia=data_ref,
        )
