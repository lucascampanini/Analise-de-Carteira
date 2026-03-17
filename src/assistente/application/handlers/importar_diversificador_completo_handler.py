"""Handler: importar todas as classes do Diversificador XP."""

from __future__ import annotations

from dataclasses import dataclass

import structlog

from src.assistente.adapters.outbound.importers.planilha_diversificador_completo_importer import (
    importar_todas_classes,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.posicoes_rv_repository import (
    SqlAlchemyPosicaoRVRepository,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.posicoes_fundos_repository import (
    SqlAlchemyPosicaoFundoRepository,
    SqlAlchemyPosicaoPrevRepository,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.cliente_assessor_repository import (
    SqlAlchemyClienteAssessorRepository,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.historico_imports_repository import (
    SqlAlchemyHistoricoImportsRepository,
)

logger = structlog.get_logger(__name__)


@dataclass
class ResultadoImportacaoCompleta:
    rv: int
    fundos: int
    prev: int
    data_referencia: str | None


class ImportarDiversificadorCompletoHandler:
    def __init__(
        self,
        rv_repo: SqlAlchemyPosicaoRVRepository,
        fundo_repo: SqlAlchemyPosicaoFundoRepository,
        prev_repo: SqlAlchemyPosicaoPrevRepository,
        cliente_repo: SqlAlchemyClienteAssessorRepository,
        historico_repo: SqlAlchemyHistoricoImportsRepository | None = None,
    ) -> None:
        self._rv = rv_repo
        self._fundo = fundo_repo
        self._prev = prev_repo
        self._cliente = cliente_repo
        self._historico = historico_repo

    async def handle(self, caminho: str) -> ResultadoImportacaoCompleta:
        clientes = await self._cliente.listar_todos()
        nomes = {c.codigo_conta: c.nome for c in clientes}

        resultado = importar_todas_classes(caminho, nome_cliente_por_conta=nomes)

        # Substituir posições anteriores
        await self._rv.deletar_todos()
        await self._fundo.deletar_todos()
        await self._prev.deletar_todos()

        rv_total    = await self._rv.salvar_todos(resultado.posicoes_rv)
        fundo_total = await self._fundo.salvar_todos(resultado.posicoes_fundos)
        prev_total  = await self._prev.salvar_todos(resultado.posicoes_prev)

        clientes_distintos = len(
            {p.codigo_conta for p in resultado.posicoes_rv}
            | {p.codigo_conta for p in resultado.posicoes_fundos}
            | {p.codigo_conta for p in resultado.posicoes_prev}
        )

        if self._historico:
            await self._historico.registrar(
                tipo="COMPLETO",
                data_referencia=resultado.data_referencia,
                total_rv=rv_total,
                total_fundos=fundo_total,
                total_prev=prev_total,
                total_clientes=clientes_distintos,
            )

        logger.info("importacao_completa_finalizada", rv=rv_total, fundos=fundo_total, prev=prev_total)

        return ResultadoImportacaoCompleta(
            rv=rv_total,
            fundos=fundo_total,
            prev=prev_total,
            data_referencia=str(resultado.data_referencia) if resultado.data_referencia else None,
        )
