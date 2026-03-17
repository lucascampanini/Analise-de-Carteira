"""Command: registrar evento/data importante."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class RegistrarEventoCommand:
    tipo: str  # TipoEvento value
    descricao: str
    data_evento: date
    alertar_dias_antes: int = 1
    codigo_conta: str | None = None
    nome_cliente: str | None = None
    idempotency_key: str = ""
