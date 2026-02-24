"""Fake InMemory FinancialDataProvider para testes."""

from __future__ import annotations

from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.income_statement import IncomeStatement
from src.domain.value_objects.fiscal_period import FiscalPeriod
from src.domain.value_objects.ticker import Ticker


class FakeFinancialDataProvider:
    """Implementação InMemory de FinancialDataProvider para testes."""

    def __init__(self) -> None:
        self._balance_sheets: dict[tuple[str, str], BalanceSheet] = {}
        self._income_statements: dict[tuple[str, str], IncomeStatement] = {}
        self._previous_balance_sheets: dict[tuple[str, str], BalanceSheet] = {}
        self._previous_income_statements: dict[tuple[str, str], IncomeStatement] = {}

    def add_balance_sheet(self, ticker: Ticker, period: FiscalPeriod, bs: BalanceSheet) -> None:
        """Configura dados de teste para balanço patrimonial."""
        self._balance_sheets[(ticker.symbol, period.label)] = bs

    def add_income_statement(
        self, ticker: Ticker, period: FiscalPeriod, dre: IncomeStatement
    ) -> None:
        """Configura dados de teste para DRE."""
        self._income_statements[(ticker.symbol, period.label)] = dre

    def add_previous_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod, bs: BalanceSheet
    ) -> None:
        """Configura dados de teste para balanço do período anterior."""
        self._previous_balance_sheets[(ticker.symbol, period.label)] = bs

    def add_previous_income_statement(
        self, ticker: Ticker, period: FiscalPeriod, dre: IncomeStatement
    ) -> None:
        """Configura dados de teste para DRE do período anterior."""
        self._previous_income_statements[(ticker.symbol, period.label)] = dre

    async def fetch_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet | None:
        return self._balance_sheets.get((ticker.symbol, period.label))

    async def fetch_income_statement(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement | None:
        return self._income_statements.get((ticker.symbol, period.label))

    async def fetch_previous_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet | None:
        return self._previous_balance_sheets.get((ticker.symbol, period.label))

    async def fetch_previous_income_statement(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement | None:
        return self._previous_income_statements.get((ticker.symbol, period.label))
