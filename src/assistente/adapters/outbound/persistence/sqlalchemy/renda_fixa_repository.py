"""Repositório SQLAlchemy para RendaFixa."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.renda_fixa import RendaFixa
from src.assistente.models.assistente_models import AssRendaFixaModel


class SqlAlchemyRendaFixaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar_todos(self, posicoes: list[RendaFixa]) -> int:
        """Upsert em lote pelo id. Retorna quantidade processada."""
        if not posicoes:
            return 0

        agora = datetime.now(timezone.utc)
        valores = [
            {
                "id": p.id,
                "codigo_conta": p.codigo_conta,
                "nome_cliente": p.nome_cliente,
                "tipo_ativo": p.tipo_ativo,
                "dsc_ativo": p.dsc_ativo,
                "emissor": p.emissor,
                "indexador": p.indexador,
                "percentual_indexador": None,
                "data_compra": p.data_referencia,   # usa data_fato como proxy
                "data_vencimento": p.data_vencimento,
                "valor_aplicado": p.valor_aplicado,
                "evento_criado": p.evento_criado,
                "importado_em": agora,
            }
            for p in posicoes
        ]

        stmt = pg_insert(AssRendaFixaModel).values(valores)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "nome_cliente": stmt.excluded.nome_cliente,
                "tipo_ativo": stmt.excluded.tipo_ativo,
                "dsc_ativo": stmt.excluded.dsc_ativo,
                "emissor": stmt.excluded.emissor,
                "indexador": stmt.excluded.indexador,
                "data_compra": stmt.excluded.data_compra,
                "data_vencimento": stmt.excluded.data_vencimento,
                "valor_aplicado": stmt.excluded.valor_aplicado,
                "importado_em": stmt.excluded.importado_em,
            },
        )
        await self._session.execute(stmt)
        return len(posicoes)

    async def listar_por_conta(self, codigo_conta: str) -> list[RendaFixa]:
        stmt = (
            select(AssRendaFixaModel)
            .where(AssRendaFixaModel.codigo_conta == codigo_conta)
            .order_by(AssRendaFixaModel.data_vencimento)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_vencendo_em(self, dias: int) -> list[RendaFixa]:
        hoje = date.today()
        limite = hoje + timedelta(days=dias)
        stmt = (
            select(AssRendaFixaModel)
            .where(AssRendaFixaModel.data_vencimento >= hoje)
            .where(AssRendaFixaModel.data_vencimento <= limite)
            .order_by(AssRendaFixaModel.data_vencimento)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def marcar_evento_criado(self, ids: list[str]) -> None:
        if not ids:
            return
        await self._session.execute(
            update(AssRendaFixaModel)
            .where(AssRendaFixaModel.id.in_(ids))
            .values(evento_criado=True)
        )

    async def deletar_todos(self) -> int:
        result = await self._session.execute(delete(AssRendaFixaModel))
        return result.rowcount

    async def total(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(AssRendaFixaModel)
        )
        return result.scalar_one()

    def _to_entity(self, m: AssRendaFixaModel) -> RendaFixa:
        return RendaFixa(
            id=m.id,
            codigo_conta=m.codigo_conta,
            nome_cliente=m.nome_cliente,
            tipo_ativo=m.tipo_ativo,
            dsc_ativo=m.dsc_ativo or "",
            emissor=m.emissor,
            indexador=m.indexador,
            data_vencimento=m.data_vencimento,
            valor_aplicado=m.valor_aplicado,
            data_referencia=m.data_compra,
            evento_criado=m.evento_criado,
            importado_em=m.importado_em,
        )
