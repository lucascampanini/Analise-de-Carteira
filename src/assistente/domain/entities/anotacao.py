"""Entidade Anotacao — registro de contato com cliente."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum


class TipoAnotacao(str, Enum):
    LIGACAO  = "LIGACAO"
    REUNIAO  = "REUNIAO"
    EMAIL    = "EMAIL"
    WHATSAPP = "WHATSAPP"
    NOTA     = "NOTA"


@dataclass
class Anotacao:
    id: str
    codigo_conta: str
    tipo: TipoAnotacao
    texto: str
    criado_em: datetime = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.criado_em is None:
            self.criado_em = datetime.now(timezone.utc)
