"""Domain Events para análise de carteira de investimentos.

Eventos no tempo passado, imutáveis (frozen dataclass).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4


@dataclass(frozen=True)
class CarteiraCriada:
    """Evento: carteira de investimentos foi criada a partir de um extrato."""

    carteira_id: UUID
    cliente_id: UUID
    total_posicoes: int
    patrimonio_liquido_cents: int
    origem_arquivo: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: UUID = field(default_factory=uuid4)


@dataclass(frozen=True)
class AnaliseGerada:
    """Evento: análise de carteira foi concluída com sucesso."""

    analise_id: UUID
    carteira_id: UUID
    cliente_id: UUID
    score_aderencia: float
    precisa_rebalanceamento: bool
    total_recomendacoes: int
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: UUID = field(default_factory=uuid4)


@dataclass(frozen=True)
class RecomendacaoEmitida:
    """Evento: recomendação de rebalanceamento foi emitida."""

    recomendacao_id: UUID
    analise_id: UUID
    cliente_id: UUID
    ticker: str
    tipo: str
    prioridade: int
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: UUID = field(default_factory=uuid4)


@dataclass(frozen=True)
class AnaliseFalhou:
    """Evento: análise de carteira falhou."""

    analise_id: UUID
    carteira_id: UUID
    cliente_id: UUID
    motivo: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: UUID = field(default_factory=uuid4)
