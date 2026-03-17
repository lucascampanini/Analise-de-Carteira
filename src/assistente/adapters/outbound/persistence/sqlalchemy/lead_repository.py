"""Repositório SQLAlchemy para Lead."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.lead import EstagioLead, Lead, OrigemLead
from src.assistente.models.assistente_models import AssLeadModel


class SqlAlchemyLeadRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar(self, lead: Lead) -> None:
        model = self._to_model(lead)
        await self._session.merge(model)

    async def buscar_por_id(self, id: str) -> Lead | None:
        result = await self._session.get(AssLeadModel, id)
        return self._to_entity(result) if result else None

    async def listar_todos(self) -> list[Lead]:
        stmt = select(AssLeadModel).order_by(AssLeadModel.criado_em.desc())
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_por_estagio(self, estagio: str) -> list[Lead]:
        stmt = (
            select(AssLeadModel)
            .where(AssLeadModel.estagio == estagio)
            .order_by(AssLeadModel.criado_em.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def atualizar_estagio(self, id: str, estagio: str) -> None:
        await self._session.execute(
            update(AssLeadModel)
            .where(AssLeadModel.id == id)
            .values(estagio=estagio, atualizado_em=datetime.now(timezone.utc))
        )

    async def deletar(self, id: str) -> None:
        model = await self._session.get(AssLeadModel, id)
        if model:
            await self._session.delete(model)

    def _to_model(self, lead: Lead) -> AssLeadModel:
        return AssLeadModel(
            id=lead.id,
            nome=lead.nome,
            telefone=lead.telefone,
            email=lead.email,
            origem=lead.origem.value if lead.origem else None,
            estagio=lead.estagio.value,
            valor_potencial=lead.valor_potencial,
            anotacoes=lead.anotacoes,
            proximo_passo=lead.proximo_passo,
            data_proximo_contato=lead.data_proximo_contato,
            criado_em=lead.criado_em,
            atualizado_em=lead.atualizado_em,
        )

    def _to_entity(self, m: AssLeadModel) -> Lead:
        return Lead(
            id=m.id,
            nome=m.nome,
            telefone=m.telefone,
            email=m.email,
            origem=OrigemLead(m.origem) if m.origem else None,
            estagio=EstagioLead(m.estagio),
            valor_potencial=m.valor_potencial,
            anotacoes=m.anotacoes,
            proximo_passo=m.proximo_passo,
            data_proximo_contato=m.data_proximo_contato,
            criado_em=m.criado_em,
            atualizado_em=m.atualizado_em,
        )
