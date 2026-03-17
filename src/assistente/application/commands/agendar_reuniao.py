"""Command: agendar reunião com cliente."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class AgendarReuniaoCommand:
    titulo: str
    data_hora: datetime
    duracao_minutos: int = 60
    codigo_conta: str | None = None
    nome_cliente: str | None = None
    descricao: str | None = None
    gerar_relatorio: bool = False
    criar_no_outlook: bool = True
    idempotency_key: str = ""
