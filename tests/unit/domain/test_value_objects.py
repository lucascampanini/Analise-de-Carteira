"""Testes unitários para Value Objects do domínio.

Seguem escola Detroit/Clássica: sem mocks, lógica pura.
Padrão AAA (Arrange, Act, Assert) com UMA ação por teste.
"""

import pytest

from src.domain.value_objects.ticker import Ticker
from src.domain.value_objects.cnpj import CNPJ
from src.domain.value_objects.money import Money
from src.domain.value_objects.ratio import Ratio
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType


class TestTicker:
    """Testes para o Value Object Ticker."""

    def test_creates_valid_stock_ticker(self) -> None:
        ticker = Ticker("PETR4")

        assert ticker.symbol == "PETR4"

    def test_creates_valid_unit_ticker(self) -> None:
        ticker = Ticker("KLBN11")

        assert ticker.symbol == "KLBN11"

    def test_creates_valid_ticker_with_lowercase_converts_to_upper(self) -> None:
        ticker = Ticker("petr4")

        assert ticker.symbol == "PETR4"

    def test_rejects_empty_ticker(self) -> None:
        with pytest.raises(ValueError, match="símbolo"):
            Ticker("")

    def test_rejects_ticker_too_short(self) -> None:
        with pytest.raises(ValueError, match="símbolo"):
            Ticker("AB")

    def test_rejects_ticker_too_long(self) -> None:
        with pytest.raises(ValueError, match="símbolo"):
            Ticker("ABCDEFGH")

    def test_ticker_equality(self) -> None:
        ticker1 = Ticker("PETR4")
        ticker2 = Ticker("PETR4")

        assert ticker1 == ticker2

    def test_ticker_inequality(self) -> None:
        ticker1 = Ticker("PETR4")
        ticker2 = Ticker("VALE3")

        assert ticker1 != ticker2

    def test_ticker_is_immutable(self) -> None:
        ticker = Ticker("PETR4")

        with pytest.raises(AttributeError):
            ticker.symbol = "VALE3"  # type: ignore[misc]


class TestCNPJ:
    """Testes para o Value Object CNPJ."""

    def test_creates_valid_cnpj(self) -> None:
        cnpj = CNPJ("33.000.167/0001-01")

        assert cnpj.number == "33000167000101"

    def test_creates_cnpj_from_digits_only(self) -> None:
        cnpj = CNPJ("33000167000101")

        assert cnpj.number == "33000167000101"

    def test_rejects_cnpj_with_wrong_length(self) -> None:
        with pytest.raises(ValueError, match="CNPJ"):
            CNPJ("1234567890")

    def test_rejects_cnpj_with_all_same_digits(self) -> None:
        with pytest.raises(ValueError, match="CNPJ"):
            CNPJ("11111111111111")

    def test_rejects_cnpj_with_invalid_check_digit(self) -> None:
        with pytest.raises(ValueError, match="CNPJ"):
            CNPJ("33000167000199")

    def test_cnpj_formatted_output(self) -> None:
        cnpj = CNPJ("33000167000101")

        assert cnpj.formatted == "33.000.167/0001-01"

    def test_cnpj_equality(self) -> None:
        cnpj1 = CNPJ("33.000.167/0001-01")
        cnpj2 = CNPJ("33000167000101")

        assert cnpj1 == cnpj2

    def test_cnpj_is_immutable(self) -> None:
        cnpj = CNPJ("33000167000101")

        with pytest.raises(AttributeError):
            cnpj.number = "00000000000000"  # type: ignore[misc]


class TestMoney:
    """Testes para o Value Object Money (valores monetários em centavos)."""

    def test_creates_money_from_cents(self) -> None:
        money = Money(cents=1050)

        assert money.cents == 1050

    def test_creates_money_from_reais(self) -> None:
        money = Money.from_reais(10.50)

        assert money.cents == 1050

    def test_money_to_reais(self) -> None:
        money = Money(cents=1050)

        assert money.to_reais() == 10.50

    def test_money_addition(self) -> None:
        m1 = Money(cents=1050)
        m2 = Money(cents=500)

        result = m1 + m2

        assert result.cents == 1550

    def test_money_subtraction(self) -> None:
        m1 = Money(cents=1050)
        m2 = Money(cents=500)

        result = m1 - m2

        assert result.cents == 550

    def test_money_negative_allowed(self) -> None:
        money = Money(cents=-500)

        assert money.cents == -500

    def test_money_equality(self) -> None:
        m1 = Money(cents=1050)
        m2 = Money(cents=1050)

        assert m1 == m2

    def test_money_is_immutable(self) -> None:
        money = Money(cents=1050)

        with pytest.raises(AttributeError):
            money.cents = 2000  # type: ignore[misc]

    def test_money_is_zero(self) -> None:
        money = Money(cents=0)

        assert money.is_zero()

    def test_money_is_positive(self) -> None:
        money = Money(cents=1050)

        assert money.is_positive()

    def test_money_is_negative(self) -> None:
        money = Money(cents=-500)

        assert money.is_negative()


class TestRatio:
    """Testes para o Value Object Ratio (indicadores financeiros)."""

    def test_creates_ratio(self) -> None:
        ratio = Ratio(value=0.15, name="ROE")

        assert ratio.value == 0.15
        assert ratio.name == "ROE"

    def test_ratio_as_percentage(self) -> None:
        ratio = Ratio(value=0.15, name="ROE")

        assert ratio.as_percentage() == 15.0

    def test_ratio_equality(self) -> None:
        r1 = Ratio(value=0.15, name="ROE")
        r2 = Ratio(value=0.15, name="ROE")

        assert r1 == r2

    def test_ratio_is_immutable(self) -> None:
        ratio = Ratio(value=0.15, name="ROE")

        with pytest.raises(AttributeError):
            ratio.value = 0.20  # type: ignore[misc]

    def test_ratio_rejects_empty_name(self) -> None:
        with pytest.raises(ValueError, match="nome"):
            Ratio(value=0.15, name="")


class TestFiscalPeriod:
    """Testes para o Value Object FiscalPeriod."""

    def test_creates_annual_period(self) -> None:
        period = FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL)

        assert period.year == 2024
        assert period.period_type == PeriodType.ANNUAL
        assert period.quarter is None

    def test_creates_quarterly_period(self) -> None:
        period = FiscalPeriod(year=2024, period_type=PeriodType.QUARTERLY, quarter=3)

        assert period.year == 2024
        assert period.quarter == 3

    def test_rejects_quarterly_without_quarter_number(self) -> None:
        with pytest.raises(ValueError, match="trimestre"):
            FiscalPeriod(year=2024, period_type=PeriodType.QUARTERLY)

    def test_rejects_invalid_quarter(self) -> None:
        with pytest.raises(ValueError, match="trimestre"):
            FiscalPeriod(year=2024, period_type=PeriodType.QUARTERLY, quarter=5)

    def test_rejects_invalid_year(self) -> None:
        with pytest.raises(ValueError, match="ano"):
            FiscalPeriod(year=1899, period_type=PeriodType.ANNUAL)

    def test_fiscal_period_equality(self) -> None:
        p1 = FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL)
        p2 = FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL)

        assert p1 == p2

    def test_fiscal_period_is_immutable(self) -> None:
        period = FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL)

        with pytest.raises(AttributeError):
            period.year = 2025  # type: ignore[misc]

    def test_fiscal_period_label_annual(self) -> None:
        period = FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL)

        assert period.label == "2024-ANUAL"

    def test_fiscal_period_label_quarterly(self) -> None:
        period = FiscalPeriod(year=2024, period_type=PeriodType.QUARTERLY, quarter=3)

        assert period.label == "2024-Q3"
