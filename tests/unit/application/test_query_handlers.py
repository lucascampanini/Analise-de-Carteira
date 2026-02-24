"""Testes unitários para Query Handlers.

Usa Fakes (InMemory) para driven ports.
"""

import pytest
from uuid import uuid4

from src.adapters.outbound.persistence.in_memory.fake_analysis_repository import (
    FakeAnalysisRepository,
)
from src.adapters.outbound.persistence.in_memory.fake_company_repository import (
    FakeCompanyRepository,
)
from src.application.handlers.query_handlers.get_analysis_handler import (
    CompareCompaniesHandler,
    GetCompanyAnalysisHandler,
    ListAnalyzedCompaniesHandler,
)
from src.application.queries.get_analysis import (
    CompareCompanies,
    GetCompanyAnalysis,
    ListAnalyzedCompanies,
)
from src.domain.entities.company import Company
from src.domain.entities.financial_analysis import AnalysisStatus, FinancialAnalysis
from src.domain.value_objects.cnpj import CNPJ
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.ratio import Ratio
from src.domain.value_objects.ticker import Ticker


async def _seed_company_and_analysis(
    company_repo: FakeCompanyRepository,
    analysis_repo: FakeAnalysisRepository,
    ticker_str: str = "PETR4",
    year: int = 2024,
) -> tuple[Company, FinancialAnalysis]:
    """Helper para semear dados de teste."""
    company = Company(
        id=uuid4(),
        name=f"Empresa {ticker_str}",
        ticker=Ticker(ticker_str),
        cnpj=CNPJ("33000167000101"),
        sector="Teste",
        cvm_code="9999",
    )
    await company_repo.save(company)

    period = FiscalPeriod(year=year, period_type=PeriodType.ANNUAL)
    analysis = FinancialAnalysis(
        id=uuid4(),
        company_id=company.id,
        period=period,
    )
    analysis.record_piotroski_score(7, {"roa_positivo": True})
    analysis.record_altman_z_score(3.5, "SEGURA")
    analysis.record_ratios([
        Ratio(value=0.15, name="ROE"),
        Ratio(value=0.066, name="ROA"),
    ])
    analysis.complete()
    await analysis_repo.save(analysis)

    return company, analysis


class TestGetCompanyAnalysisHandler:
    """Testes para GetCompanyAnalysisHandler."""

    async def test_returns_analysis_for_existing_company(self) -> None:
        company_repo = FakeCompanyRepository()
        analysis_repo = FakeAnalysisRepository()
        company, _ = await _seed_company_and_analysis(company_repo, analysis_repo)

        handler = GetCompanyAnalysisHandler(company_repo, analysis_repo)
        query = GetCompanyAnalysis(
            ticker=Ticker("PETR4"),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )

        result = await handler.handle(query)

        assert result is not None
        assert result.ticker == "PETR4"
        assert result.piotroski_score == 7
        assert result.piotroski_classification == "FORTE"
        assert result.altman_classification == "SEGURA"

    async def test_returns_none_for_nonexistent_company(self) -> None:
        company_repo = FakeCompanyRepository()
        analysis_repo = FakeAnalysisRepository()

        handler = GetCompanyAnalysisHandler(company_repo, analysis_repo)
        query = GetCompanyAnalysis(
            ticker=Ticker("XXXX3"),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )

        result = await handler.handle(query)

        assert result is None


class TestListAnalyzedCompaniesHandler:
    """Testes para ListAnalyzedCompaniesHandler."""

    async def test_lists_all_analyzed_companies(self) -> None:
        company_repo = FakeCompanyRepository()
        analysis_repo = FakeAnalysisRepository()
        await _seed_company_and_analysis(company_repo, analysis_repo, "PETR4")
        await _seed_company_and_analysis(company_repo, analysis_repo, "VALE3")

        handler = ListAnalyzedCompaniesHandler(company_repo, analysis_repo)
        query = ListAnalyzedCompanies()

        result = await handler.handle(query)

        assert len(result) == 2
        tickers = {item.ticker for item in result}
        assert "PETR4" in tickers
        assert "VALE3" in tickers

    async def test_returns_empty_list_when_no_analyses(self) -> None:
        company_repo = FakeCompanyRepository()
        analysis_repo = FakeAnalysisRepository()

        handler = ListAnalyzedCompaniesHandler(company_repo, analysis_repo)
        query = ListAnalyzedCompanies()

        result = await handler.handle(query)

        assert result == []


class TestCompareCompaniesHandler:
    """Testes para CompareCompaniesHandler."""

    async def test_compares_multiple_companies(self) -> None:
        company_repo = FakeCompanyRepository()
        analysis_repo = FakeAnalysisRepository()
        await _seed_company_and_analysis(company_repo, analysis_repo, "PETR4")
        await _seed_company_and_analysis(company_repo, analysis_repo, "VALE3")

        handler = CompareCompaniesHandler(company_repo, analysis_repo)
        query = CompareCompanies(
            tickers=(Ticker("PETR4"), Ticker("VALE3")),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )

        result = await handler.handle(query)

        assert len(result.companies) == 2
        assert result.period == "2024-ANUAL"
