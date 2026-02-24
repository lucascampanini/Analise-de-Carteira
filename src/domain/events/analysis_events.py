"""Domain Events para análise financeira.

Eventos no tempo passado e imutáveis (frozen dataclass).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4


@dataclass(frozen=True)
class AnalysisCompleted:
    """Evento: análise financeira de uma empresa foi concluída."""

    analysis_id: UUID
    company_id: UUID
    piotroski_score: int
    altman_z_score: float
    altman_classification: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: UUID = field(default_factory=uuid4)


@dataclass(frozen=True)
class AnalysisFailed:
    """Evento: análise financeira falhou."""

    analysis_id: UUID
    company_id: UUID
    reason: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: UUID = field(default_factory=uuid4)


@dataclass(frozen=True)
class FinancialDistressDetected:
    """Evento: stress financeiro detectado (Altman Z'' < 1.1)."""

    analysis_id: UUID
    company_id: UUID
    altman_z_score: float
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: UUID = field(default_factory=uuid4)
