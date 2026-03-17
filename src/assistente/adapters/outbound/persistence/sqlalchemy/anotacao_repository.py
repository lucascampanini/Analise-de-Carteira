"""Repositório SQLAlchemy para Anotacao."""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.anotacao import Anotacao, TipoAnotacao
from src.assistente.models.assistente_models import AssAnotacaoModel


class SqlAlchemyAnotacaoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar(self, anotacao: Anotacao) -> None:
        self._session.add(
            AssAnotacaoModel(
                id=anotacao.id,
                codigo_conta=anotacao.codigo_conta,
                tipo=anotacao.tipo.value,
                texto=anotacao.texto,
                criado_em=anotacao.criado_em,
            )
        )

    async def listar_por_conta(self, codigo_conta: str) -> list[Anotacao]:
        stmt = (
            select(AssAnotacaoModel)
            .where(AssAnotacaoModel.codigo_conta == codigo_conta)
            .order_by(AssAnotacaoModel.criado_em.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def deletar(self, id: str) -> None:
        await self._session.execute(
            delete(AssAnotacaoModel).where(AssAnotacaoModel.id == id)
        )

    def _to_entity(self, m: AssAnotacaoModel) -> Anotacao:
        return Anotacao(
            id=m.id,
            codigo_conta=m.codigo_conta,
            tipo=TipoAnotacao(m.tipo),
            texto=m.texto,
            criado_em=m.criado_em,
        )
