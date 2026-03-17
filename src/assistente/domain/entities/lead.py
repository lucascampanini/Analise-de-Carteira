"""Entidade Lead — prospect no funil de prospecção."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from enum import Enum


class EstagioLead(str, Enum):
    PROSPECTO = "PROSPECTO"
    CONTATO   = "CONTATO"
    PROPOSTA  = "PROPOSTA"
    CLIENTE   = "CLIENTE"


class OrigemLead(str, Enum):
    INDICACAO  = "INDICACAO"
    EVENTO     = "EVENTO"
    LINKEDIN   = "LINKEDIN"
    COLD_CALL  = "COLD_CALL"
    OUTRO      = "OUTRO"


@dataclass
class Lead:
    id: str
    nome: str
    estagio: EstagioLead = EstagioLead.PROSPECTO
    telefone: str | None = None
    email: str | None = None
    origem: OrigemLead | None = None
    valor_potencial: float | None = None
    anotacoes: str | None = None
    proximo_passo: str | None = None
    data_proximo_contato: date | None = None
    criado_em: datetime = None  # type: ignore[assignment]
    atualizado_em: datetime = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        agora = datetime.now(timezone.utc)
        if self.criado_em is None:
            self.criado_em = agora
        if self.atualizado_em is None:
            self.atualizado_em = agora

    def avancar_estagio(self) -> None:
        ordem = list(EstagioLead)
        idx = ordem.index(self.estagio)
        if idx < len(ordem) - 1:
            self.estagio = ordem[idx + 1]
            self.atualizado_em = datetime.now(timezone.utc)
