"""Specifications para análise financeira.

Specification Pattern para encapsular regras de negócio reutilizáveis.
"""

from __future__ import annotations

from src.domain.entities.financial_analysis import FinancialAnalysis


class IsFinanciallyStrongSpec:
    """Empresa financeiramente forte: Piotroski >= 7 e Altman zona segura."""

    def is_satisfied_by(self, analysis: FinancialAnalysis) -> bool:
        """Verifica se a análise indica empresa financeiramente forte."""
        return analysis.is_financially_strong and analysis.is_safe_zone


class IsFinanciallyWeakSpec:
    """Empresa financeiramente fraca: Piotroski <= 3 ou Altman zona stress."""

    def is_satisfied_by(self, analysis: FinancialAnalysis) -> bool:
        """Verifica se a análise indica empresa financeiramente fraca."""
        return analysis.is_financially_weak or analysis.is_distress_zone


class IsHighlyLeveragedSpec:
    """Empresa altamente alavancada: Dívida Líquida/EBITDA > 3.0."""

    def __init__(self, max_dl_ebitda: float = 3.0) -> None:
        self._max_dl_ebitda = max_dl_ebitda

    def is_satisfied_by(self, analysis: FinancialAnalysis) -> bool:
        """Verifica se a empresa está altamente alavancada."""
        dl_ebitda = next(
            (r for r in analysis.ratios if r.name == "Dívida Líquida/EBITDA"),
            None,
        )
        if dl_ebitda is None:
            return False
        return dl_ebitda.value > self._max_dl_ebitda


class IsProfitableSpec:
    """Empresa rentável: ROE acima do benchmark."""

    def __init__(self, min_roe: float = 0.15) -> None:
        self._min_roe = min_roe

    def is_satisfied_by(self, analysis: FinancialAnalysis) -> bool:
        """Verifica se a empresa é rentável acima do benchmark."""
        roe = next(
            (r for r in analysis.ratios if r.name == "ROE"),
            None,
        )
        if roe is None:
            return False
        return roe.value >= self._min_roe
