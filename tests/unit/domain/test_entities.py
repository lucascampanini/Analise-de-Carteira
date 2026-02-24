"""Testes unitários para Entities do domínio.

Escola Detroit/Clássica: sem mocks, lógica pura.
"""

import pytest
from uuid import uuid4

from src.domain.entities.company import Company
from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.income_statement import IncomeStatement
from src.domain.entities.financial_analysis import FinancialAnalysis, AnalysisStatus
from src.domain.value_objects.ticker import Ticker
from src.domain.value_objects.cnpj import CNPJ
from src.domain.value_objects.money import Money
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.ratio import Ratio
from src.domain.exceptions.domain_exceptions import InvalidEntityError


class TestCompany:
    """Testes para a entidade Company (Aggregate Root)."""

    def test_creates_company_with_valid_data(self) -> None:
        company = Company(
            id=uuid4(),
            name="Petróleo Brasileiro S.A.",
            ticker=Ticker("PETR4"),
            cnpj=CNPJ("33000167000101"),
            sector="Petróleo e Gás",
            cvm_code="9512",
        )

        assert company.name == "Petróleo Brasileiro S.A."
        assert company.ticker.symbol == "PETR4"
        assert company.sector == "Petróleo e Gás"

    def test_rejects_company_without_name(self) -> None:
        with pytest.raises(InvalidEntityError, match="nome"):
            Company(
                id=uuid4(),
                name="",
                ticker=Ticker("PETR4"),
                cnpj=CNPJ("33000167000101"),
                sector="Petróleo e Gás",
                cvm_code="9512",
            )

    def test_rejects_company_without_cvm_code(self) -> None:
        with pytest.raises(InvalidEntityError, match="CVM"):
            Company(
                id=uuid4(),
                name="Petrobras",
                ticker=Ticker("PETR4"),
                cnpj=CNPJ("33000167000101"),
                sector="Petróleo e Gás",
                cvm_code="",
            )


class TestBalanceSheet:
    """Testes para a entidade BalanceSheet (Balanço Patrimonial)."""

    def _make_balance_sheet(self, **overrides) -> BalanceSheet:
        """Factory method para criar BalanceSheet com defaults."""
        defaults = {
            "id": uuid4(),
            "company_id": uuid4(),
            "period": FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
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

    def test_creates_balance_sheet(self) -> None:
        bs = self._make_balance_sheet()

        assert bs.ativo_total.cents == 100_000_000_00

    def test_calculates_capital_de_giro(self) -> None:
        bs = self._make_balance_sheet()

        result = bs.capital_de_giro()

        assert result.cents == 10_000_000_00  # 30M - 20M

    def test_calculates_divida_liquida(self) -> None:
        bs = self._make_balance_sheet()

        result = bs.divida_liquida()

        # (10M + 25M) - 5M = 30M
        assert result.cents == 30_000_000_00

    def test_calculates_liquidez_corrente(self) -> None:
        bs = self._make_balance_sheet()

        result = bs.liquidez_corrente()

        assert result == pytest.approx(1.5)  # 30M / 20M

    def test_calculates_liquidez_seca(self) -> None:
        bs = self._make_balance_sheet()

        result = bs.liquidez_seca()

        # (30M - 8M) / 20M = 1.1
        assert result == pytest.approx(1.1)

    def test_calculates_liquidez_imediata(self) -> None:
        bs = self._make_balance_sheet()

        result = bs.liquidez_imediata()

        assert result == pytest.approx(0.25)  # 5M / 20M

    def test_calculates_endividamento_geral(self) -> None:
        bs = self._make_balance_sheet()

        result = bs.endividamento_geral()

        assert result == pytest.approx(0.6)  # 60M / 100M

    def test_calculates_divida_sobre_patrimonio(self) -> None:
        bs = self._make_balance_sheet()

        result = bs.divida_sobre_patrimonio()

        # (10M + 25M) / 40M = 0.875
        assert result == pytest.approx(0.875)


class TestIncomeStatement:
    """Testes para a entidade IncomeStatement (DRE)."""

    def _make_income_statement(self, **overrides) -> IncomeStatement:
        """Factory method para criar IncomeStatement com defaults."""
        defaults = {
            "id": uuid4(),
            "company_id": uuid4(),
            "period": FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
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

    def test_creates_income_statement(self) -> None:
        dre = self._make_income_statement()

        assert dre.receita_liquida.cents == 80_000_000_00

    def test_calculates_margem_bruta(self) -> None:
        dre = self._make_income_statement()

        result = dre.margem_bruta()

        assert result == pytest.approx(0.375)  # 30M / 80M

    def test_calculates_margem_liquida(self) -> None:
        dre = self._make_income_statement()

        result = dre.margem_liquida()

        assert result == pytest.approx(0.0825)  # 6.6M / 80M

    def test_calculates_margem_ebit(self) -> None:
        dre = self._make_income_statement()

        result = dre.margem_ebit()

        assert result == pytest.approx(0.1875)  # 15M / 80M

    def test_calculates_ebitda(self) -> None:
        dre = self._make_income_statement()

        result = dre.ebitda()

        # 15M + 3M = 18M
        assert result.cents == 18_000_000_00

    def test_calculates_margem_ebitda(self) -> None:
        dre = self._make_income_statement()

        result = dre.margem_ebitda()

        # 18M / 80M = 0.225
        assert result == pytest.approx(0.225)

    def test_calculates_lpa(self) -> None:
        dre = self._make_income_statement()

        result = dre.lpa()

        # 6.6M / 1M ações = R$6.60 (660 cents)
        assert result.cents == 660


class TestFinancialAnalysis:
    """Testes para a entidade FinancialAnalysis."""

    def test_creates_pending_analysis(self) -> None:
        analysis = FinancialAnalysis(
            id=uuid4(),
            company_id=uuid4(),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )

        assert analysis.status == AnalysisStatus.PENDING

    def test_records_piotroski_score(self) -> None:
        analysis = FinancialAnalysis(
            id=uuid4(),
            company_id=uuid4(),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )

        analysis.record_piotroski_score(7, {"roa_positivo": True, "fco_positivo": True})

        assert analysis.piotroski_score == 7
        assert analysis.piotroski_details["roa_positivo"] is True

    def test_records_altman_z_score(self) -> None:
        analysis = FinancialAnalysis(
            id=uuid4(),
            company_id=uuid4(),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )

        analysis.record_altman_z_score(3.5, "SEGURA")

        assert analysis.altman_z_score == pytest.approx(3.5)
        assert analysis.altman_classification == "SEGURA"

    def test_records_financial_ratios(self) -> None:
        analysis = FinancialAnalysis(
            id=uuid4(),
            company_id=uuid4(),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )
        ratios = [
            Ratio(value=0.15, name="ROE"),
            Ratio(value=1.5, name="Liquidez Corrente"),
        ]

        analysis.record_ratios(ratios)

        assert len(analysis.ratios) == 2

    def test_completes_analysis(self) -> None:
        analysis = FinancialAnalysis(
            id=uuid4(),
            company_id=uuid4(),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )
        analysis.record_piotroski_score(7, {})
        analysis.record_altman_z_score(3.5, "SEGURA")
        analysis.record_ratios([Ratio(value=0.15, name="ROE")])

        analysis.complete()

        assert analysis.status == AnalysisStatus.COMPLETED

    def test_cannot_complete_without_scores(self) -> None:
        analysis = FinancialAnalysis(
            id=uuid4(),
            company_id=uuid4(),
            period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
        )

        with pytest.raises(InvalidEntityError, match="incompleta"):
            analysis.complete()
