"""Adapter: CVM Data Provider.

Coleta dados financeiros do Portal de Dados Abertos da CVM (dados.cvm.gov.br).
Anticorruption Layer: traduz formato CSV da CVM para entidades de domínio.
"""

from __future__ import annotations

import csv
import io
import zipfile
from uuid import uuid4

import httpx

from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.income_statement import IncomeStatement
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.money import Money
from src.domain.value_objects.ticker import Ticker


# Mapeamento de contas CVM para campos das entidades
_CVM_BALANCE_SHEET_ACCOUNTS = {
    "1": "ativo_total",
    "1.01": "ativo_circulante",
    "1.01.01": "caixa_equivalentes",
    "1.01.04": "estoques",
    "2": "passivo_total",
    "2.01": "passivo_circulante",
    "2.03": "patrimonio_liquido",
}

_CVM_INCOME_ACCOUNTS = {
    "3.01": "receita_liquida",
    "3.02": "custo_mercadorias",
    "3.03": "lucro_bruto",
    "3.05": "ebit",
    "3.06": "resultado_financeiro",
    "3.07": "lucro_antes_ir",
    "3.08": "imposto_renda",
    "3.11": "lucro_liquido",
}


class CvmDataProvider:
    """Provedor de dados financeiros da CVM (dados.cvm.gov.br).

    Baixa e processa CSVs de DFP (anual) e ITR (trimestral).
    """

    BASE_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC"

    def __init__(self, http_client: httpx.AsyncClient | None = None) -> None:
        self._client = http_client

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def _download_zip(self, url: str) -> bytes:
        """Baixa ZIP da CVM."""
        client = await self._get_client()
        response = await client.get(url)
        response.raise_for_status()
        return response.content

    def _parse_csv_from_zip(
        self, zip_content: bytes, filename: str
    ) -> list[dict[str, str]]:
        """Extrai e parseia CSV de dentro do ZIP."""
        with zipfile.ZipFile(io.BytesIO(zip_content)) as zf:
            with zf.open(filename) as f:
                text = io.TextIOWrapper(f, encoding="latin-1")
                reader = csv.DictReader(text, delimiter=";")
                return list(reader)

    def _find_company_rows(
        self, rows: list[dict[str, str]], cvm_code: str
    ) -> list[dict[str, str]]:
        """Filtra linhas por código CVM da empresa."""
        return [
            r for r in rows
            if r.get("CD_CVM") == cvm_code
            and r.get("ORDEM_EXERC") == "ÚLTIMO"
            and r.get("ST_CONTA_FIXA") == "S"
        ]

    async def fetch_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod, cvm_code: str = ""
    ) -> BalanceSheet | None:
        """Obtém balanço patrimonial da CVM.

        Args:
            ticker: Ticker da empresa (para referência).
            period: Período fiscal.
            cvm_code: Código CVM da empresa.

        Returns:
            BalanceSheet ou None se não encontrado.
        """
        if not cvm_code:
            return None

        year = period.year
        url = f"{self.BASE_URL}/DFP/DADOS/dfp_cia_aberta_{year}.zip"

        try:
            zip_content = await self._download_zip(url)
        except httpx.HTTPError:
            return None

        # Balanço Patrimonial Ativo
        try:
            bpa_rows = self._parse_csv_from_zip(
                zip_content, f"dfp_cia_aberta_BPA_con_{year}.csv"
            )
            bpp_rows = self._parse_csv_from_zip(
                zip_content, f"dfp_cia_aberta_BPP_con_{year}.csv"
            )
        except (KeyError, zipfile.BadZipFile):
            return None

        company_bpa = self._find_company_rows(bpa_rows, cvm_code)
        company_bpp = self._find_company_rows(bpp_rows, cvm_code)

        if not company_bpa and not company_bpp:
            return None

        values: dict[str, int] = {}
        for row in company_bpa + company_bpp:
            cd_conta = row.get("CD_CONTA", "")
            vl_conta = row.get("VL_CONTA", "0")
            field = _CVM_BALANCE_SHEET_ACCOUNTS.get(cd_conta)
            if field:
                values[field] = int(float(vl_conta.replace(",", ".")) * 100)

        return BalanceSheet(
            id=uuid4(),
            company_id=uuid4(),
            period=period,
            ativo_total=Money(cents=values.get("ativo_total", 0)),
            ativo_circulante=Money(cents=values.get("ativo_circulante", 0)),
            caixa_equivalentes=Money(cents=values.get("caixa_equivalentes", 0)),
            estoques=Money(cents=values.get("estoques", 0)),
            passivo_total=Money(cents=values.get("passivo_total", 0)),
            passivo_circulante=Money(cents=values.get("passivo_circulante", 0)),
            patrimonio_liquido=Money(cents=values.get("patrimonio_liquido", 0)),
            divida_curto_prazo=Money(cents=0),
            divida_longo_prazo=Money(cents=0),
            lucros_retidos=Money(cents=0),
        )

    async def fetch_income_statement(
        self, ticker: Ticker, period: FiscalPeriod, cvm_code: str = ""
    ) -> IncomeStatement | None:
        """Obtém DRE da CVM."""
        if not cvm_code:
            return None

        year = period.year
        url = f"{self.BASE_URL}/DFP/DADOS/dfp_cia_aberta_{year}.zip"

        try:
            zip_content = await self._download_zip(url)
        except httpx.HTTPError:
            return None

        try:
            dre_rows = self._parse_csv_from_zip(
                zip_content, f"dfp_cia_aberta_DRE_con_{year}.csv"
            )
        except (KeyError, zipfile.BadZipFile):
            return None

        company_dre = self._find_company_rows(dre_rows, cvm_code)
        if not company_dre:
            return None

        values: dict[str, int] = {}
        for row in company_dre:
            cd_conta = row.get("CD_CONTA", "")
            vl_conta = row.get("VL_CONTA", "0")
            field = _CVM_INCOME_ACCOUNTS.get(cd_conta)
            if field:
                values[field] = int(float(vl_conta.replace(",", ".")) * 100)

        return IncomeStatement(
            id=uuid4(),
            company_id=uuid4(),
            period=period,
            receita_liquida=Money(cents=values.get("receita_liquida", 0)),
            custo_mercadorias=Money(cents=values.get("custo_mercadorias", 0)),
            lucro_bruto=Money(cents=values.get("lucro_bruto", 0)),
            despesas_operacionais=Money(cents=0),
            ebit=Money(cents=values.get("ebit", 0)),
            resultado_financeiro=Money(cents=values.get("resultado_financeiro", 0)),
            lucro_antes_ir=Money(cents=values.get("lucro_antes_ir", 0)),
            imposto_renda=Money(cents=values.get("imposto_renda", 0)),
            lucro_liquido=Money(cents=values.get("lucro_liquido", 0)),
            depreciacao_amortizacao=Money(cents=0),
            fluxo_caixa_operacional=Money(cents=0),
            acoes_total=0,
        )

    async def fetch_previous_balance_sheet(
        self, ticker: Ticker, period: FiscalPeriod, cvm_code: str = ""
    ) -> BalanceSheet | None:
        """Obtém balanço patrimonial do período anterior."""
        previous = FiscalPeriod(year=period.year - 1, period_type=PeriodType.ANNUAL)
        return await self.fetch_balance_sheet(ticker, previous, cvm_code)

    async def fetch_previous_income_statement(
        self, ticker: Ticker, period: FiscalPeriod, cvm_code: str = ""
    ) -> IncomeStatement | None:
        """Obtém DRE do período anterior."""
        previous = FiscalPeriod(year=period.year - 1, period_type=PeriodType.ANNUAL)
        return await self.fetch_income_statement(ticker, previous, cvm_code)
