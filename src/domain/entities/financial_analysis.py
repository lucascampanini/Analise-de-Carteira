"""Entity FinancialAnalysis - resultado de análise de balanço patrimonial."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID

from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.fiscal_period import FiscalPeriod
from src.domain.value_objects.ratio import Ratio


class AnalysisStatus(Enum):
    """Status da análise financeira."""

    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


@dataclass
class FinancialAnalysis:
    """Resultado completo da análise financeira de uma empresa.

    Aggregate Root que contém Piotroski F-Score, Altman Z-Score
    e indicadores financeiros calculados.
    """

    id: UUID
    company_id: UUID
    period: FiscalPeriod
    status: AnalysisStatus = AnalysisStatus.PENDING
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    # Piotroski F-Score
    piotroski_score: int | None = None
    piotroski_details: dict[str, Any] = field(default_factory=dict)

    # Altman Z-Score
    altman_z_score: float | None = None
    altman_classification: str | None = None

    # Indicadores financeiros
    ratios: list[Ratio] = field(default_factory=list)

    def record_piotroski_score(self, score: int, details: dict[str, Any]) -> None:
        """Registra o Piotroski F-Score calculado.

        Args:
            score: Valor do F-Score (0-9).
            details: Detalhamento de cada critério.
        """
        if not 0 <= score <= 9:
            raise InvalidEntityError(
                f"Piotroski F-Score deve estar entre 0 e 9, recebeu {score}."
            )
        self.piotroski_score = score
        self.piotroski_details = details

    def record_altman_z_score(self, z_score: float, classification: str) -> None:
        """Registra o Altman Z-Score calculado.

        Args:
            z_score: Valor do Z''-Score.
            classification: Classificação (SEGURA, ZONA_CINZA, STRESS_FINANCEIRO).
        """
        valid_classifications = {"SEGURA", "ZONA_CINZA", "STRESS_FINANCEIRO"}
        if classification not in valid_classifications:
            raise InvalidEntityError(
                f"Classificação Altman inválida: '{classification}'. "
                f"Válidas: {valid_classifications}"
            )
        self.altman_z_score = z_score
        self.altman_classification = classification

    def record_ratios(self, ratios: list[Ratio]) -> None:
        """Registra os indicadores financeiros calculados."""
        self.ratios = list(ratios)

    def complete(self) -> None:
        """Marca a análise como completa.

        Raises:
            InvalidEntityError: Se a análise está incompleta.
        """
        if self.piotroski_score is None or self.altman_z_score is None or not self.ratios:
            raise InvalidEntityError(
                "Análise incompleta: Piotroski F-Score, Altman Z-Score "
                "e indicadores financeiros são obrigatórios."
            )
        self.status = AnalysisStatus.COMPLETED

    def fail(self, reason: str) -> None:
        """Marca a análise como falha."""
        self.status = AnalysisStatus.FAILED

    @property
    def is_financially_strong(self) -> bool:
        """Empresa é financeiramente forte (Piotroski >= 7)."""
        return self.piotroski_score is not None and self.piotroski_score >= 7

    @property
    def is_financially_weak(self) -> bool:
        """Empresa é financeiramente fraca (Piotroski <= 3)."""
        return self.piotroski_score is not None and self.piotroski_score <= 3

    @property
    def is_safe_zone(self) -> bool:
        """Empresa está na zona segura do Altman Z-Score (> 2.6)."""
        return self.altman_z_score is not None and self.altman_z_score > 2.6

    @property
    def is_distress_zone(self) -> bool:
        """Empresa está em stress financeiro no Altman Z-Score (< 1.1)."""
        return self.altman_z_score is not None and self.altman_z_score < 1.1
