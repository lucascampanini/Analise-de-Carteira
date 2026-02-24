"""Fake InMemory CompanyRepository para testes."""

from __future__ import annotations

from uuid import UUID

from src.domain.entities.company import Company
from src.domain.value_objects.ticker import Ticker


class FakeCompanyRepository:
    """Implementação InMemory de CompanyRepository para testes."""

    def __init__(self) -> None:
        self._companies: dict[UUID, Company] = {}

    async def save(self, company: Company) -> None:
        self._companies[company.id] = company

    async def find_by_id(self, company_id: UUID) -> Company | None:
        return self._companies.get(company_id)

    async def find_by_ticker(self, ticker: Ticker) -> Company | None:
        for company in self._companies.values():
            if company.ticker == ticker:
                return company
        return None

    async def find_by_cvm_code(self, cvm_code: str) -> Company | None:
        for company in self._companies.values():
            if company.cvm_code == cvm_code:
                return company
        return None

    async def list_all(self) -> list[Company]:
        return list(self._companies.values())
