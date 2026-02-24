"""SQLAlchemy Repository para Company."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.persistence.sqlalchemy.mappers.analysis_mapper import (
    CompanyMapper,
)
from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import CompanyModel
from src.domain.entities.company import Company
from src.domain.value_objects.ticker import Ticker


class SqlAlchemyCompanyRepository:
    """Implementação SQLAlchemy do CompanyRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, company: Company) -> None:
        model = CompanyMapper.to_model(company)
        await self._session.merge(model)
        await self._session.flush()

    async def find_by_id(self, company_id: UUID) -> Company | None:
        result = await self._session.get(CompanyModel, str(company_id))
        return CompanyMapper.to_entity(result) if result else None

    async def find_by_ticker(self, ticker: Ticker) -> Company | None:
        stmt = select(CompanyModel).where(CompanyModel.ticker == ticker.symbol)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return CompanyMapper.to_entity(model) if model else None

    async def find_by_cvm_code(self, cvm_code: str) -> Company | None:
        stmt = select(CompanyModel).where(CompanyModel.cvm_code == cvm_code)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return CompanyMapper.to_entity(model) if model else None

    async def list_all(self) -> list[Company]:
        stmt = select(CompanyModel)
        result = await self._session.execute(stmt)
        return [CompanyMapper.to_entity(m) for m in result.scalars().all()]
