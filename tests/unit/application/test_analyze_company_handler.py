"""Testes unitários para AnalyzeCompanyBalanceSheetHandler.

Usa Fakes (InMemory) para driven ports - escola Detroit/Clássica.
"""

import pytest
from uuid import uuid4

from src.adapters.outbound.persistence.in_memory.fake_analysis_repository import (
    FakeAnalysisRepository,
)
from src.adapters.outbound.persistence.in_memory.fake_company_repository import (
    FakeCompanyRepository,
)
from src.adapters.outbound.persistence.in_memory.fake_financial_data_provider import (
    FakeFinancialDataProvider,
)
from src.application.commands.analyze_company import AnalyzeCompanyBalanceSheet
from src.application.handlers.command_handlers.analyze_company_handler import (
    AnalyzeCompanyBalanceSheetHandler,
)
from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.financial_analysis import AnalysisStatus
from src.domain.entities.income_statement import IncomeStatement
from src.domain.exceptions.domain_exceptions import InsufficientDataError
from src.domain.services.balance_sheet_analyzer import BalanceSheetAnalyzer
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.money import Money
from src.domain.value_objects.ticker import Ticker


def _make_bs(company_id=None, year=2024, **overrides):
    defaults = {
        "id": uuid4(),
        "company_id": company_id or uuid4(),
        "period": FiscalPeriod(year=year, period_type=PeriodType.ANNUAL),
        "ativo_total": Money(cents=100_000_000_00),
        "ativo_circulante": Money(cents=30_000_000_00),
        "caixa_equivalentes": Money(cents=5_000_000_00),
        "estoques": Money(cents=8_000_000_00),
        "passivo_total": Money(cents=60_000_000_00),
        "passivo_circulante": Money(cents=20_000_000_00),
        "patrimonio_liquido": Money(cents=40_000_000_00),
        "divida_curto_prazo": Money(cents=10_000_000_00),
        "divida_longo_prazo": Money(cents=25_000_000_00),
        "lucros_retidos": Money(cents=15_000_000_00),
    }
    defaults.update(overrides)
    return BalanceSheet(**defaults)


def _make_dre(company_id=None, year=2024, **overrides):
    defaults = {
        "id": uuid4(),
        "company_id": company_id or uuid4(),
        "period": FiscalPeriod(year=year, period_type=PeriodType.ANNUAL),
        "receita_liquida": Money(cents=80_000_000_00),
        "custo_mercadorias": Money(cents=50_000_000_00),
        "lucro_bruto": Money(cents=30_000_000_00),
        "despesas_operacionais": Money(cents=15_000_000_00),
        "ebit": Money(cents=15_000_000_00),
        "resultado_financeiro": Money(cents=-5_000_000_00),
        "lucro_antes_ir": Money(cents=10_000_000_00),
        "imposto_renda": Money(cents=3_400_000_00),
        "lucro_liquido": Money(cents=6_600_000_00),
        "depreciacao_amortizacao": Money(cents=3_000_000_00),
        "fluxo_caixa_operacional": Money(cents=9_600_000_00),
        "acoes_total": 1_000_000,
    }
    defaults.update(overrides)
    return IncomeStatement(**defaults)


@pytest.fixture
def ticker():
    return Ticker("PETR4")


@pytest.fixture
def period():
    return FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL)


@pytest.fixture
def previous_period():
    return FiscalPeriod(year=2023, period_type=PeriodType.ANNUAL)


@pytest.fixture
def data_provider(ticker, period, previous_period):
    provider = FakeFinancialDataProvider()
    provider.add_balance_sheet(ticker, period, _make_bs(year=2024))
    provider.add_income_statement(ticker, period, _make_dre(year=2024))
    provider.add_previous_balance_sheet(ticker, period, _make_bs(year=2023))
    provider.add_previous_income_statement(ticker, period, _make_dre(year=2023))
    return provider


@pytest.fixture
def company_repo():
    return FakeCompanyRepository()


@pytest.fixture
def analysis_repo():
    return FakeAnalysisRepository()


@pytest.fixture
def handler(data_provider, company_repo, analysis_repo):
    return AnalyzeCompanyBalanceSheetHandler(
        financial_data_provider=data_provider,
        company_repository=company_repo,
        analysis_repository=analysis_repo,
        analyzer=BalanceSheetAnalyzer(),
    )


class TestAnalyzeCompanyHandler:
    """Testes para o command handler de análise de balanço."""

    async def test_analyzes_company_successfully(self, handler, analysis_repo, ticker, period) -> None:
        """Handler executa análise completa e salva resultado."""
        command = AnalyzeCompanyBalanceSheet(
            ticker=ticker,
            period=period,
            idempotency_key="test-key-001",
        )

        await handler.handle(command)

        analyses = await analysis_repo.list_all_latest()
        assert len(analyses) == 1
        assert analyses[0].status == AnalysisStatus.COMPLETED

    async def test_analysis_has_piotroski_score(self, handler, analysis_repo, ticker, period) -> None:
        """Análise inclui Piotroski F-Score."""
        command = AnalyzeCompanyBalanceSheet(
            ticker=ticker,
            period=period,
            idempotency_key="test-key-002",
        )

        await handler.handle(command)

        analyses = await analysis_repo.list_all_latest()
        assert analyses[0].piotroski_score is not None
        assert 0 <= analyses[0].piotroski_score <= 9

    async def test_analysis_has_altman_z_score(self, handler, analysis_repo, ticker, period) -> None:
        """Análise inclui Altman Z-Score."""
        command = AnalyzeCompanyBalanceSheet(
            ticker=ticker,
            period=period,
            idempotency_key="test-key-003",
        )

        await handler.handle(command)

        analyses = await analysis_repo.list_all_latest()
        assert analyses[0].altman_z_score is not None
        assert analyses[0].altman_classification in {"SEGURA", "ZONA_CINZA", "STRESS_FINANCEIRO"}

    async def test_analysis_has_financial_ratios(self, handler, analysis_repo, ticker, period) -> None:
        """Análise inclui indicadores financeiros."""
        command = AnalyzeCompanyBalanceSheet(
            ticker=ticker,
            period=period,
            idempotency_key="test-key-004",
        )

        await handler.handle(command)

        analyses = await analysis_repo.list_all_latest()
        assert len(analyses[0].ratios) >= 10

    async def test_idempotent_does_not_duplicate(self, handler, analysis_repo, ticker, period) -> None:
        """Mesmo idempotency_key não cria análise duplicada."""
        command = AnalyzeCompanyBalanceSheet(
            ticker=ticker,
            period=period,
            idempotency_key="test-key-005",
        )

        await handler.handle(command)

        # Segunda chamada com mesma chave deve ser idempotente
        await handler.handle(command)

        all_analyses = await analysis_repo.list_all_latest()
        assert len(all_analyses) == 1

    async def test_raises_on_missing_data(self, company_repo, analysis_repo, ticker, period) -> None:
        """Lança InsufficientDataError quando não há dados financeiros."""
        empty_provider = FakeFinancialDataProvider()
        handler = AnalyzeCompanyBalanceSheetHandler(
            financial_data_provider=empty_provider,
            company_repository=company_repo,
            analysis_repository=analysis_repo,
            analyzer=BalanceSheetAnalyzer(),
        )
        command = AnalyzeCompanyBalanceSheet(
            ticker=ticker,
            period=period,
            idempotency_key="test-key-006",
        )

        with pytest.raises(InsufficientDataError):
            await handler.handle(command)

    async def test_creates_company_if_not_exists(self, handler, company_repo, ticker, period) -> None:
        """Cria empresa automaticamente se não existe no repositório."""
        command = AnalyzeCompanyBalanceSheet(
            ticker=ticker,
            period=period,
            idempotency_key="test-key-007",
        )

        await handler.handle(command)

        company = await company_repo.find_by_ticker(ticker)
        assert company is not None
