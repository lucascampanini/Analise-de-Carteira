"""Port outbound: FinancialDataProvider.

Interface para obter dados financeiros de fontes externas
(CVM, brapi, yfinance, etc).
"""

from __future__ import annotations

from typing import Protocol

from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.income_statement import IncomeStatement
from src.domain.value_objects.fiscal_period import FiscalPeriod
from src.domain.value_objects.ticker import Ticker


class FinancialDataProvider(Protocol):
    """Provedor de dados financeiros de fontes externas."""

    async def fetch_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet | None:
        """Obtém balanço patrimonial de uma empresa para um período.

        Args:
            ticker: Símbolo da empresa na B3.
            period: Período fiscal desejado.

        Returns:
            BalanceSheet ou None se não encontrado.
        """
        ...

    async def fetch_income_statement(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement | None:
        """Obtém DRE de uma empresa para um período.

        Args:
            ticker: Símbolo da empresa na B3.
            period: Período fiscal desejado.

        Returns:
            IncomeStatement ou None se não encontrado.
        """
        ...

    async def fetch_previous_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet | None:
        """Obtém balanço patrimonial do período anterior.

        Necessário para cálculo do Piotroski F-Score (comparação YoY).
        """
        ...

    async def fetch_previous_income_statement(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement | None:
        """Obtém DRE do período anterior.

        Necessário para cálculo do Piotroski F-Score (comparação YoY).
        """
        ...
