"""Repositório SQLAlchemy para PosicaoRV."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.posicao_rv import PosicaoRV
from src.assistente.models.assistente_models import AssPosicaoRVModel


class SqlAlchemyPosicaoRVRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar_todos(self, posicoes: list[PosicaoRV]) -> int:
        if not posicoes:
            return 0
        agora = datetime.now(timezone.utc)
        valores = [
            {
                "id": p.id,
                "codigo_conta": p.codigo_conta,
                "nome_cliente": p.nome_cliente,
                "tipo": p.tipo,
                "ticker": p.ticker,
                "dsc_ativo": p.dsc_ativo,
                "emissor": p.emissor,
                "quantidade": p.quantidade,
                "valor_net": p.valor_net,
                "data_vencimento": p.data_vencimento,
                "data_referencia": p.data_referencia,
                "importado_em": agora,
            }
            for p in posicoes
        ]
        stmt = pg_insert(AssPosicaoRVModel).values(valores)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "nome_cliente": stmt.excluded.nome_cliente,
                "ticker": stmt.excluded.ticker,
                "dsc_ativo": stmt.excluded.dsc_ativo,
                "emissor": stmt.excluded.emissor,
                "quantidade": stmt.excluded.quantidade,
                "valor_net": stmt.excluded.valor_net,
                "data_vencimento": stmt.excluded.data_vencimento,
                "data_referencia": stmt.excluded.data_referencia,
                "importado_em": stmt.excluded.importado_em,
            },
        )
        await self._session.execute(stmt)
        return len(posicoes)

    async def listar_por_conta(self, codigo_conta: str) -> list[PosicaoRV]:
        stmt = (
            select(AssPosicaoRVModel)
            .where(AssPosicaoRVModel.codigo_conta == codigo_conta)
            .order_by(AssPosicaoRVModel.tipo, AssPosicaoRVModel.ticker)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_por_tipo(self, tipo: str) -> list[PosicaoRV]:
        stmt = select(AssPosicaoRVModel).where(AssPosicaoRVModel.tipo == tipo)
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_clientes_por_ticker(self, ticker: str) -> list[PosicaoRV]:
        stmt = (
            select(AssPosicaoRVModel)
            .where(AssPosicaoRVModel.ticker.ilike(f"%{ticker}%"))
            .order_by(AssPosicaoRVModel.valor_net.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_tickers_distintos(self) -> list[str]:
        stmt = select(AssPosicaoRVModel.ticker).distinct().where(AssPosicaoRVModel.ticker.isnot(None))
        result = await self._session.execute(stmt)
        return [r for r in result.scalars().all() if r]

    async def deletar_todos(self) -> int:
        result = await self._session.execute(delete(AssPosicaoRVModel))
        return result.rowcount

    async def total(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(AssPosicaoRVModel))
        return result.scalar_one()

    def _to_entity(self, m: AssPosicaoRVModel) -> PosicaoRV:
        return PosicaoRV(
            id=m.id,
            codigo_conta=m.codigo_conta,
            nome_cliente=m.nome_cliente,
            tipo=m.tipo,
            ticker=m.ticker,
            dsc_ativo=m.dsc_ativo or "",
            emissor=m.emissor,
            quantidade=m.quantidade,
            valor_net=m.valor_net,
            data_vencimento=m.data_vencimento,
            data_referencia=m.data_referencia,
            importado_em=m.importado_em,
        )
