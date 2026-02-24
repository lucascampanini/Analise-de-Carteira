"""Port outbound: AnalysisRepository.

Interface para persistir/recuperar análises financeiras.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.domain.entities.financial_analysis import FinancialAnalysis
from src.domain.value_objects.fiscal_period import FiscalPeriod


class AnalysisRepository(Protocol):
    """Repository para a entidade FinancialAnalysis."""

    async def save(
        self, analysis: FinancialAnalysis, idempotency_key: str | None = None
    ) -> None:
        """Persiste uma análise financeira (insert ou update/upsert)."""
        ...

    async def find_by_id(self, analysis_id: UUID) -> FinancialAnalysis | None:
        """Busca análise por ID."""
        ...

    async def find_by_company_and_period(
        self, company_id: UUID, period: FiscalPeriod
    ) -> FinancialAnalysis | None:
        """Busca análise por empresa e período fiscal."""
        ...

    async def list_by_company(self, company_id: UUID) -> list[FinancialAnalysis]:
        """Lista todas as análises de uma empresa."""
        ...

    async def list_all_latest(self) -> list[FinancialAnalysis]:
        """Lista a análise mais recente de cada empresa."""
        ...

    async def find_by_idempotency_key(self, key: str) -> FinancialAnalysis | None:
        """Busca análise por chave de idempotência."""
        ...
