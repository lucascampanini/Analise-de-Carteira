"""Queries para consulta de análises financeiras.

Queries são side-effect free e retornam dados.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.domain.value_objects.fiscal_period import FiscalPeriod
from src.domain.value_objects.ticker import Ticker


@dataclass(frozen=True)
class GetCompanyAnalysis:
    """Query para buscar análise de uma empresa em um período."""

    ticker: Ticker
    period: FiscalPeriod


@dataclass(frozen=True)
class ListAnalyzedCompanies:
    """Query para listar todas as empresas analisadas."""

    pass


@dataclass(frozen=True)
class CompareCompanies:
    """Query para comparar análises de múltiplas empresas."""

    tickers: tuple[Ticker, ...]
    period: FiscalPeriod
