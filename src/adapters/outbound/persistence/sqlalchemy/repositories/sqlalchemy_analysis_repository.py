"""SQLAlchemy Repository para FinancialAnalysis."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.persistence.sqlalchemy.mappers.analysis_mapper import (
    AnalysisMapper,
)
from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import (
    FinancialAnalysisModel,
)
from src.domain.entities.financial_analysis import FinancialAnalysis
from src.domain.value_objects.fiscal_period import FiscalPeriod


class SqlAlchemyAnalysisRepository:
    """Implementação SQLAlchemy do AnalysisRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(
        self, analysis: FinancialAnalysis, idempotency_key: str | None = None
    ) -> None:
        model = AnalysisMapper.to_model(analysis, idempotency_key=idempotency_key)
        await self._session.merge(model)
        await self._session.flush()

    async def find_by_id(self, analysis_id: UUID) -> FinancialAnalysis | None:
        result = await self._session.get(FinancialAnalysisModel, str(analysis_id))
        return AnalysisMapper.to_entity(result) if result else None

    async def find_by_company_and_period(
        self, company_id: UUID, period: FiscalPeriod
    ) -> FinancialAnalysis | None:
        stmt = select(FinancialAnalysisModel).where(
            FinancialAnalysisModel.company_id == str(company_id),
            FinancialAnalysisModel.period_year == period.year,
            FinancialAnalysisModel.period_type == period.period_type.value,
        )
        if period.quarter is not None:
            stmt = stmt.where(FinancialAnalysisModel.period_quarter == period.quarter)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return AnalysisMapper.to_entity(model) if model else None

    async def list_by_company(self, company_id: UUID) -> list[FinancialAnalysis]:
        stmt = (
            select(FinancialAnalysisModel)
            .where(FinancialAnalysisModel.company_id == str(company_id))
            .order_by(FinancialAnalysisModel.period_year.desc())
        )
        result = await self._session.execute(stmt)
        return [AnalysisMapper.to_entity(m) for m in result.scalars().all()]

    async def list_all_latest(self) -> list[FinancialAnalysis]:
        # Subquery: max year per company
        stmt = (
            select(FinancialAnalysisModel)
            .order_by(
                FinancialAnalysisModel.company_id,
                FinancialAnalysisModel.period_year.desc(),
            )
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()

        # Deduplicate: keep latest per company
        latest: dict[str, FinancialAnalysisModel] = {}
        for model in models:
            if model.company_id not in latest:
                latest[model.company_id] = model

        return [AnalysisMapper.to_entity(m) for m in latest.values()]

    async def find_by_idempotency_key(self, key: str) -> FinancialAnalysis | None:
        stmt = select(FinancialAnalysisModel).where(
            FinancialAnalysisModel.idempotency_key == key
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return AnalysisMapper.to_entity(model) if model else None
