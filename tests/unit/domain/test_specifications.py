"""Testes para Specifications de análise financeira."""

from uuid import uuid4

from src.domain.entities.financial_analysis import FinancialAnalysis
from src.domain.specifications.analysis_specifications import (
    IsFinanciallyStrongSpec,
    IsFinanciallyWeakSpec,
    IsHighlyLeveragedSpec,
    IsProfitableSpec,
)
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.ratio import Ratio


def _make_analysis(
    piotroski: int | None = None,
    altman: float | None = None,
    altman_class: str | None = None,
    ratios: list[Ratio] | None = None,
) -> FinancialAnalysis:
    """Cria uma FinancialAnalysis para testes."""
    analysis = FinancialAnalysis(
        id=uuid4(),
        company_id=uuid4(),
        period=FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL),
    )
    if piotroski is not None:
        analysis.record_piotroski_score(piotroski, {"test": True})
    if altman is not None and altman_class is not None:
        analysis.record_altman_z_score(altman, altman_class)
    if ratios is not None:
        analysis.record_ratios(ratios)
    return analysis


class TestIsFinanciallyStrongSpec:
    """Testes para IsFinanciallyStrongSpec."""

    def test_strong_company_satisfies(self) -> None:
        spec = IsFinanciallyStrongSpec()
        analysis = _make_analysis(piotroski=8, altman=3.5, altman_class="SEGURA")
        assert spec.is_satisfied_by(analysis) is True

    def test_weak_piotroski_does_not_satisfy(self) -> None:
        spec = IsFinanciallyStrongSpec()
        analysis = _make_analysis(piotroski=4, altman=3.5, altman_class="SEGURA")
        assert spec.is_satisfied_by(analysis) is False

    def test_grey_zone_does_not_satisfy(self) -> None:
        spec = IsFinanciallyStrongSpec()
        analysis = _make_analysis(piotroski=8, altman=2.0, altman_class="ZONA_CINZA")
        assert spec.is_satisfied_by(analysis) is False


class TestIsFinanciallyWeakSpec:
    """Testes para IsFinanciallyWeakSpec."""

    def test_weak_piotroski_satisfies(self) -> None:
        spec = IsFinanciallyWeakSpec()
        analysis = _make_analysis(piotroski=2, altman=3.0, altman_class="SEGURA")
        assert spec.is_satisfied_by(analysis) is True

    def test_distress_zone_satisfies(self) -> None:
        spec = IsFinanciallyWeakSpec()
        analysis = _make_analysis(piotroski=5, altman=0.8, altman_class="STRESS_FINANCEIRO")
        assert spec.is_satisfied_by(analysis) is True

    def test_healthy_company_does_not_satisfy(self) -> None:
        spec = IsFinanciallyWeakSpec()
        analysis = _make_analysis(piotroski=6, altman=3.0, altman_class="SEGURA")
        assert spec.is_satisfied_by(analysis) is False


class TestIsHighlyLeveragedSpec:
    """Testes para IsHighlyLeveragedSpec."""

    def test_high_leverage_satisfies(self) -> None:
        spec = IsHighlyLeveragedSpec()
        ratios = [Ratio(name="Dívida Líquida/EBITDA", value=4.5)]
        analysis = _make_analysis(ratios=ratios)
        assert spec.is_satisfied_by(analysis) is True

    def test_low_leverage_does_not_satisfy(self) -> None:
        spec = IsHighlyLeveragedSpec()
        ratios = [Ratio(name="Dívida Líquida/EBITDA", value=1.5)]
        analysis = _make_analysis(ratios=ratios)
        assert spec.is_satisfied_by(analysis) is False

    def test_missing_ratio_does_not_satisfy(self) -> None:
        spec = IsHighlyLeveragedSpec()
        analysis = _make_analysis(ratios=[])
        assert spec.is_satisfied_by(analysis) is False

    def test_custom_threshold(self) -> None:
        spec = IsHighlyLeveragedSpec(max_dl_ebitda=2.0)
        ratios = [Ratio(name="Dívida Líquida/EBITDA", value=2.5)]
        analysis = _make_analysis(ratios=ratios)
        assert spec.is_satisfied_by(analysis) is True


class TestIsProfitableSpec:
    """Testes para IsProfitableSpec."""

    def test_profitable_company_satisfies(self) -> None:
        spec = IsProfitableSpec()
        ratios = [Ratio(name="ROE", value=0.20)]
        analysis = _make_analysis(ratios=ratios)
        assert spec.is_satisfied_by(analysis) is True

    def test_unprofitable_company_does_not_satisfy(self) -> None:
        spec = IsProfitableSpec()
        ratios = [Ratio(name="ROE", value=0.08)]
        analysis = _make_analysis(ratios=ratios)
        assert spec.is_satisfied_by(analysis) is False

    def test_missing_roe_does_not_satisfy(self) -> None:
        spec = IsProfitableSpec()
        analysis = _make_analysis(ratios=[])
        assert spec.is_satisfied_by(analysis) is False

    def test_custom_min_roe(self) -> None:
        spec = IsProfitableSpec(min_roe=0.10)
        ratios = [Ratio(name="ROE", value=0.12)]
        analysis = _make_analysis(ratios=ratios)
        assert spec.is_satisfied_by(analysis) is True
