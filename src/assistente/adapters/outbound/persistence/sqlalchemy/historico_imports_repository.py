"""Repositório para histórico de imports."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.models.assistente_models import AssHistoricoImportModel

_MAX_POR_TIPO = 3


class SqlAlchemyHistoricoImportsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def registrar(
        self,
        tipo: str,
        data_referencia: date | None = None,
        total_rf: int = 0,
        total_rv: int = 0,
        total_fundos: int = 0,
        total_prev: int = 0,
        total_clientes: int = 0,
    ) -> AssHistoricoImportModel:
        """Persiste um novo registro e mantém apenas os últimos 3 por tipo."""
        novo = AssHistoricoImportModel(
            id=str(uuid.uuid4()),
            tipo=tipo,
            data_referencia=data_referencia,
            total_rf=total_rf,
            total_rv=total_rv,
            total_fundos=total_fundos,
            total_prev=total_prev,
            total_clientes=total_clientes,
            importado_em=datetime.now(timezone.utc),
        )
        self._session.add(novo)
        await self._session.flush()

        # Manter apenas os últimos _MAX_POR_TIPO registros por tipo
        stmt = (
            select(AssHistoricoImportModel)
            .where(AssHistoricoImportModel.tipo == tipo)
            .order_by(AssHistoricoImportModel.importado_em.desc())
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        if len(rows) > _MAX_POR_TIPO:
            ids_excluir = [r.id for r in rows[_MAX_POR_TIPO:]]
            await self._session.execute(
                delete(AssHistoricoImportModel).where(
                    AssHistoricoImportModel.id.in_(ids_excluir)
                )
            )

        return novo

    async def listar_todos(self) -> list[AssHistoricoImportModel]:
        stmt = select(AssHistoricoImportModel).order_by(
            AssHistoricoImportModel.importado_em.desc()
        )
        return list((await self._session.execute(stmt)).scalars().all())
