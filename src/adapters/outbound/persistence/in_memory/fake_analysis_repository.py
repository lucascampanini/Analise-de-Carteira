"""Fake InMemory AnalysisRepository para testes."""

from __future__ import annotations

from uuid import UUID

from src.domain.entities.financial_analysis import FinancialAnalysis
from src.domain.value_objects.fiscal_period import FiscalPeriod


class FakeAnalysisRepository:
    """Implementação InMemory de AnalysisRepository para testes."""

    def __init__(self) -> None:
        self._analyses: dict[UUID, FinancialAnalysis] = {}
        self._idempotency_keys: dict[str, UUID] = {}

    async def save(
        self, analysis: FinancialAnalysis, idempotency_key: str | None = None
    ) -> None:
        self._analyses[analysis.id] = analysis
        if idempotency_key is not None:
            self._idempotency_keys[idempotency_key] = analysis.id

    async def find_by_id(self, analysis_id: UUID) -> FinancialAnalysis | None:
        return self._analyses.get(analysis_id)

    async def find_by_company_and_period(
        self, company_id: UUID, period: FiscalPeriod
    ) -> FinancialAnalysis | None:
        for analysis in self._analyses.values():
            if analysis.company_id == company_id and analysis.period == period:
                return analysis
        return None

    async def list_by_company(self, company_id: UUID) -> list[FinancialAnalysis]:
        return [a for a in self._analyses.values() if a.company_id == company_id]

    async def list_all_latest(self) -> list[FinancialAnalysis]:
        latest: dict[UUID, FinancialAnalysis] = {}
        for analysis in self._analyses.values():
            existing = latest.get(analysis.company_id)
            if existing is None or analysis.period.year > existing.period.year:
                latest[analysis.company_id] = analysis
        return list(latest.values())

    async def find_by_idempotency_key(self, key: str) -> FinancialAnalysis | None:
        analysis_id = self._idempotency_keys.get(key)
        if analysis_id:
            return self._analyses.get(analysis_id)
        return None

