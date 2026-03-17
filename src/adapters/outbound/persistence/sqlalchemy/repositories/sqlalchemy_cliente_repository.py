"""Repository SQLAlchemy para Cliente."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import ClienteModel
from src.domain.entities.cliente import Cliente
from src.domain.value_objects.cpf import CPF
from src.domain.value_objects.horizonte_investimento import HorizonteInvestimento
from src.domain.value_objects.objetivo_financeiro import ObjetivoFinanceiro
from src.domain.value_objects.perfil_investidor import PerfilInvestidor


class SqlAlchemyClienteRepository:
    """Repositório SQLAlchemy para Cliente."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, cliente: Cliente) -> None:
        model = await self._session.get(ClienteModel, str(cliente.id))
        if model is None:
            model = ClienteModel(
                id=str(cliente.id),
                nome=cliente.nome,
                cpf=cliente.cpf.number,
                perfil=cliente.perfil.value,
                objetivo=cliente.objetivo.value,
                horizonte=cliente.horizonte.value,
                tolerancia_perda_percentual=cliente.tolerancia_perda_percentual,
                criado_em=cliente.criado_em,
            )
            self._session.add(model)
        else:
            model.nome = cliente.nome
            model.perfil = cliente.perfil.value
        await self._session.flush()

    async def find_by_id(self, cliente_id: UUID) -> Cliente | None:
        model = await self._session.get(ClienteModel, str(cliente_id))
        if model is None:
            return None
        return self._to_entity(model)

    async def find_by_cpf(self, cpf: CPF) -> Cliente | None:
        stmt = select(ClienteModel).where(ClienteModel.cpf == cpf.number)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    async def list_all(self) -> list[Cliente]:
        stmt = select(ClienteModel)
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    @staticmethod
    def _to_entity(model: ClienteModel) -> Cliente:
        return Cliente(
            id=UUID(model.id),
            nome=model.nome,
            cpf=CPF(model.cpf),
            perfil=PerfilInvestidor(model.perfil),
            objetivo=ObjetivoFinanceiro(model.objetivo),
            horizonte=HorizonteInvestimento(model.horizonte),
            tolerancia_perda_percentual=model.tolerancia_perda_percentual,
            criado_em=model.criado_em,
        )
