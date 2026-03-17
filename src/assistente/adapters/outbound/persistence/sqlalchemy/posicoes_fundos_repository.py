"""Repositório SQLAlchemy para PosicaoFundo e PosicaoPrev."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.posicao_fundo import PosicaoFundo
from src.assistente.domain.entities.posicao_prev import PosicaoPrev
from src.assistente.models.assistente_models import AssPosicaoFundoModel, AssPosicaoPrevModel


class SqlAlchemyPosicaoFundoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar_todos(self, posicoes: list[PosicaoFundo]) -> int:
        if not posicoes:
            return 0
        agora = datetime.now(timezone.utc)
        valores = [
            {
                "id": p.id,
                "codigo_conta": p.codigo_conta,
                "nome_cliente": p.nome_cliente,
                "tipo_fundo": p.tipo_fundo,
                "cnpj_fundo": p.cnpj_fundo,
                "nome_fundo": p.nome_fundo,
                "gestora": p.gestora,
                "valor_net": p.valor_net,
                "data_referencia": p.data_referencia,
                "importado_em": agora,
            }
            for p in posicoes
        ]
        stmt = pg_insert(AssPosicaoFundoModel).values(valores)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "nome_cliente": stmt.excluded.nome_cliente,
                "tipo_fundo": stmt.excluded.tipo_fundo,
                "nome_fundo": stmt.excluded.nome_fundo,
                "gestora": stmt.excluded.gestora,
                "valor_net": stmt.excluded.valor_net,
                "data_referencia": stmt.excluded.data_referencia,
                "importado_em": stmt.excluded.importado_em,
            },
        )
        await self._session.execute(stmt)
        return len(posicoes)

    async def listar_por_conta(self, codigo_conta: str) -> list[PosicaoFundo]:
        stmt = (
            select(AssPosicaoFundoModel)
            .where(AssPosicaoFundoModel.codigo_conta == codigo_conta)
            .order_by(AssPosicaoFundoModel.tipo_fundo)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def deletar_todos(self) -> int:
        result = await self._session.execute(delete(AssPosicaoFundoModel))
        return result.rowcount

    async def total(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(AssPosicaoFundoModel))
        return result.scalar_one()

    def _to_entity(self, m: AssPosicaoFundoModel) -> PosicaoFundo:
        return PosicaoFundo(
            id=m.id,
            codigo_conta=m.codigo_conta,
            nome_cliente=m.nome_cliente,
            tipo_fundo=m.tipo_fundo,
            cnpj_fundo=m.cnpj_fundo,
            nome_fundo=m.nome_fundo,
            gestora=m.gestora,
            valor_net=m.valor_net,
            data_referencia=m.data_referencia,
            importado_em=m.importado_em,
        )


class SqlAlchemyPosicaoPrevRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar_todos(self, posicoes: list[PosicaoPrev]) -> int:
        if not posicoes:
            return 0
        agora = datetime.now(timezone.utc)
        valores = [
            {
                "id": p.id,
                "codigo_conta": p.codigo_conta,
                "nome_cliente": p.nome_cliente,
                "tipo_fundo": p.tipo_fundo,
                "nome_fundo": p.nome_fundo,
                "gestora": p.gestora,
                "valor_net": p.valor_net,
                "data_referencia": p.data_referencia,
                "importado_em": agora,
            }
            for p in posicoes
        ]
        stmt = pg_insert(AssPosicaoPrevModel).values(valores)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "nome_cliente": stmt.excluded.nome_cliente,
                "tipo_fundo": stmt.excluded.tipo_fundo,
                "nome_fundo": stmt.excluded.nome_fundo,
                "gestora": stmt.excluded.gestora,
                "valor_net": stmt.excluded.valor_net,
                "data_referencia": stmt.excluded.data_referencia,
                "importado_em": stmt.excluded.importado_em,
            },
        )
        await self._session.execute(stmt)
        return len(posicoes)

    async def listar_por_conta(self, codigo_conta: str) -> list[PosicaoPrev]:
        stmt = (
            select(AssPosicaoPrevModel)
            .where(AssPosicaoPrevModel.codigo_conta == codigo_conta)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def deletar_todos(self) -> int:
        result = await self._session.execute(delete(AssPosicaoPrevModel))
        return result.rowcount

    async def total(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(AssPosicaoPrevModel))
        return result.scalar_one()

    def _to_entity(self, m: AssPosicaoPrevModel) -> PosicaoPrev:
        return PosicaoPrev(
            id=m.id,
            codigo_conta=m.codigo_conta,
            nome_cliente=m.nome_cliente,
            tipo_fundo=m.tipo_fundo,
            nome_fundo=m.nome_fundo,
            gestora=m.gestora,
            valor_net=m.valor_net,
            data_referencia=m.data_referencia,
            importado_em=m.importado_em,
        )
