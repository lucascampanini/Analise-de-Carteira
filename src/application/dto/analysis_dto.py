"""DTOs da Application Layer para análise financeira."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class RatioDTO:
    """DTO para um indicador financeiro."""

    name: str
    value: float
    percentage: float


@dataclass(frozen=True)
class AnalysisResultDTO:
    """DTO com resultado completo de uma análise financeira."""

    company_name: str
    ticker: str
    period: str
    status: str

    piotroski_score: int | None
    piotroski_classification: str
    piotroski_details: dict[str, Any]

    altman_z_score: float | None
    altman_classification: str | None

    ratios: list[RatioDTO]
    created_at: datetime | None = None


@dataclass(frozen=True)
class CompanyListItemDTO:
    """DTO para item de lista de empresas analisadas."""

    ticker: str
    company_name: str
    latest_period: str
    piotroski_score: int | None
    altman_classification: str | None


@dataclass(frozen=True)
class ComparisonDTO:
    """DTO para comparação entre empresas."""

    companies: list[AnalysisResultDTO]
    period: str
