"""Adapter: brapi.dev Data Provider.

Coleta dados de cotações e dados fundamentalistas via brapi.dev (REST API).
Fallback para yfinance quando brapi não disponível.
"""

from __future__ import annotations

from uuid import uuid4

import httpx

from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.income_statement import IncomeStatement
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.money import Money
from src.domain.value_objects.ticker import Ticker


class BrapiDataProvider:
    """Provedor de dados via brapi.dev com fallback para yfinance.

    brapi.dev: cotações B3 (REST, Free-Pro).
    yfinance: histórico B3 (sufixo .SA, sem SLA).
    """

    BRAPI_BASE_URL = "https://brapi.dev/api"

    def __init__(
        self,
        brapi_token: str = "",
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._token = brapi_token
        self._client = http_client

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _fetch_brapi_fundamentals(self, ticker: Ticker) -> dict | None:
        """Busca dados fundamentalistas via brapi.dev."""
        client = await self._get_client()
        params: dict[str, str] = {"fundamental": "true"}
        if self._token:
            params["token"] = self._token

        try:
            response = await client.get(
                f"{self.BRAPI_BASE_URL}/quote/{ticker.symbol}",
                params=params,
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            if results:
                return results[0]
        except (httpx.HTTPError, KeyError, IndexError):
            pass
        return None

    async def _fetch_yfinance_fallback(self, ticker: Ticker) -> dict | None:
        """Fallback via yfinance (sufixo .SA para B3)."""
        try:
            import yfinance as yf  # type: ignore[import-untyped]

            stock = yf.Ticker(f"{ticker.symbol}.SA")
            bs = stock.balance_sheet
            income = stock.income_stmt

            if bs is None or bs.empty or income is None or income.empty:
                return None

            latest_bs = bs.iloc[:, 0]
            latest_income = income.iloc[:, 0]

            return {
                "source": "yfinance",
                "balance_sheet": latest_bs.to_dict(),
                "income_statement": latest_income.to_dict(),
            }
        except Exception:
            return None

    async def fetch_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet | None:
        """Obtém balanço patrimonial via brapi ou yfinance."""
        data = await self._fetch_brapi_fundamentals(ticker)

        if data and "balanceSheetHistory" in data:
            statements = data["balanceSheetHistory"].get("balanceSheetStatements", [])
            for stmt in statements:
                end_date = stmt.get("endDate", {}).get("fmt", "")
                if str(period.year) in end_date:
                    return self._map_brapi_balance_sheet(stmt, ticker, period)

        # Fallback yfinance
        yf_data = await self._fetch_yfinance_fallback(ticker)
        if yf_data and yf_data.get("source") == "yfinance":
            return self._map_yfinance_balance_sheet(
                yf_data["balance_sheet"], ticker, period
            )

        return None

    async def fetch_income_statement(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement | None:
        """Obtém DRE via brapi ou yfinance."""
        data = await self._fetch_brapi_fundamentals(ticker)

        if data and "incomeStatementHistory" in data:
            statements = data["incomeStatementHistory"].get(
                "incomeStatementHistory", []
            )
            for stmt in statements:
                end_date = stmt.get("endDate", {}).get("fmt", "")
                if str(period.year) in end_date:
                    return self._map_brapi_income_statement(stmt, ticker, period)

        yf_data = await self._fetch_yfinance_fallback(ticker)
        if yf_data and yf_data.get("source") == "yfinance":
            return self._map_yfinance_income_statement(
                yf_data["income_statement"], ticker, period
            )

        return None

    async def fetch_previous_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet | None:
        """Obtém balanço do período anterior."""
        previous = FiscalPeriod(year=period.year - 1, period_type=PeriodType.ANNUAL)
        return await self.fetch_balance_sheet(ticker, previous)

    async def fetch_previous_income_statement(
        self, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement | None:
        """Obtém DRE do período anterior."""
        previous = FiscalPeriod(year=period.year - 1, period_type=PeriodType.ANNUAL)
        return await self.fetch_income_statement(ticker, previous)

    @staticmethod
    def _to_cents(value: float | int | None) -> int:
        """Converte valor para centavos (CVM reporta em milhares)."""
        if value is None:
            return 0
        return int(float(value) * 100)

    def _map_brapi_balance_sheet(
        self, stmt: dict, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet:
        """Mapeia resposta brapi para BalanceSheet."""
        return BalanceSheet(
            id=uuid4(),
            company_id=uuid4(),
            period=period,
            ativo_total=Money(cents=self._to_cents(stmt.get("totalAssets"))),
            ativo_circulante=Money(cents=self._to_cents(stmt.get("totalCurrentAssets"))),
            caixa_equivalentes=Money(cents=self._to_cents(stmt.get("cash"))),
            estoques=Money(cents=self._to_cents(stmt.get("inventory"))),
            passivo_total=Money(cents=self._to_cents(stmt.get("totalLiab"))),
            passivo_circulante=Money(cents=self._to_cents(stmt.get("totalCurrentLiabilities"))),
            patrimonio_liquido=Money(cents=self._to_cents(stmt.get("totalStockholderEquity"))),
            divida_curto_prazo=Money(cents=self._to_cents(stmt.get("shortLongTermDebt"))),
            divida_longo_prazo=Money(cents=self._to_cents(stmt.get("longTermDebt"))),
            lucros_retidos=Money(cents=self._to_cents(stmt.get("retainedEarnings"))),
        )

    def _map_yfinance_balance_sheet(
        self, data: dict, ticker: Ticker, period: FiscalPeriod
    ) -> BalanceSheet:
        """Mapeia resposta yfinance para BalanceSheet."""
        return BalanceSheet(
            id=uuid4(),
            company_id=uuid4(),
            period=period,
            ativo_total=Money(cents=self._to_cents(data.get("Total Assets"))),
            ativo_circulante=Money(cents=self._to_cents(data.get("Current Assets"))),
            caixa_equivalentes=Money(cents=self._to_cents(data.get("Cash And Cash Equivalents"))),
            estoques=Money(cents=self._to_cents(data.get("Inventory"))),
            passivo_total=Money(cents=self._to_cents(data.get("Total Liabilities Net Minority Interest"))),
            passivo_circulante=Money(cents=self._to_cents(data.get("Current Liabilities"))),
            patrimonio_liquido=Money(cents=self._to_cents(data.get("Stockholders Equity"))),
            divida_curto_prazo=Money(cents=self._to_cents(data.get("Current Debt"))),
            divida_longo_prazo=Money(cents=self._to_cents(data.get("Long Term Debt"))),
            lucros_retidos=Money(cents=self._to_cents(data.get("Retained Earnings"))),
        )

    def _map_brapi_income_statement(
        self, stmt: dict, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement:
        """Mapeia resposta brapi para IncomeStatement."""
        return IncomeStatement(
            id=uuid4(),
            company_id=uuid4(),
            period=period,
            receita_liquida=Money(cents=self._to_cents(stmt.get("totalRevenue"))),
            custo_mercadorias=Money(cents=self._to_cents(stmt.get("costOfRevenue"))),
            lucro_bruto=Money(cents=self._to_cents(stmt.get("grossProfit"))),
            despesas_operacionais=Money(cents=self._to_cents(stmt.get("totalOperatingExpenses"))),
            ebit=Money(cents=self._to_cents(stmt.get("ebit"))),
            resultado_financeiro=Money(cents=0),
            lucro_antes_ir=Money(cents=self._to_cents(stmt.get("incomeBeforeTax"))),
            imposto_renda=Money(cents=self._to_cents(stmt.get("incomeTaxExpense"))),
            lucro_liquido=Money(cents=self._to_cents(stmt.get("netIncome"))),
            depreciacao_amortizacao=Money(cents=0),
            fluxo_caixa_operacional=Money(cents=0),
            acoes_total=0,
        )

    def _map_yfinance_income_statement(
        self, data: dict, ticker: Ticker, period: FiscalPeriod
    ) -> IncomeStatement:
        """Mapeia resposta yfinance para IncomeStatement."""
        return IncomeStatement(
            id=uuid4(),
            company_id=uuid4(),
            period=period,
            receita_liquida=Money(cents=self._to_cents(data.get("Total Revenue"))),
            custo_mercadorias=Money(cents=self._to_cents(data.get("Cost Of Revenue"))),
            lucro_bruto=Money(cents=self._to_cents(data.get("Gross Profit"))),
            despesas_operacionais=Money(cents=self._to_cents(data.get("Operating Expense"))),
            ebit=Money(cents=self._to_cents(data.get("EBIT"))),
            resultado_financeiro=Money(cents=0),
            lucro_antes_ir=Money(cents=self._to_cents(data.get("Pretax Income"))),
            imposto_renda=Money(cents=self._to_cents(data.get("Tax Provision"))),
            lucro_liquido=Money(cents=self._to_cents(data.get("Net Income"))),
            depreciacao_amortizacao=Money(
                cents=self._to_cents(data.get("Reconciled Depreciation"))
            ),
            fluxo_caixa_operacional=Money(cents=0),
            acoes_total=0,
        )
