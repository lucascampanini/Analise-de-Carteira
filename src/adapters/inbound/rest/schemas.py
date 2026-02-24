"""Pydantic schemas para a REST API (Delivery DTOs).

Separados dos DTOs da Application Layer.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Request para analisar uma empresa."""

    ticker: str = Field(..., min_length=4, max_length=7, examples=["PETR4"])
    year: int = Field(..., ge=2000, le=2100, examples=[2024])
    period_type: str = Field(default="ANNUAL", examples=["ANNUAL", "QUARTERLY"])
    quarter: int | None = Field(default=None, ge=1, le=4)
    idempotency_key: str = Field(..., min_length=1, max_length=100)


class RatioResponse(BaseModel):
    """Indicador financeiro na resposta."""

    name: str
    value: float
    percentage: float


class AnalysisResponse(BaseModel):
    """Resposta com resultado da análise financeira."""

    company_name: str
    ticker: str
    period: str
    status: str

    piotroski_score: int | None
    piotroski_classification: str
    piotroski_details: dict[str, Any]

    altman_z_score: float | None
    altman_classification: str | None

    ratios: list[RatioResponse]
    created_at: datetime | None = None


class CompanyListItem(BaseModel):
    """Item da lista de empresas analisadas."""

    ticker: str
    company_name: str
    latest_period: str
    piotroski_score: int | None
    altman_classification: str | None


class ComparisonResponse(BaseModel):
    """Resposta da comparação entre empresas."""

    companies: list[AnalysisResponse]
    period: str


class ErrorResponse(BaseModel):
    """Resposta de erro."""

    detail: str
