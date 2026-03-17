"""Entidade ClienteAssessor — cliente do assessor na XP."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum


class Suitability(str, Enum):
    CONSERVADOR = "CONSERVADOR"
    MODERADO = "MODERADO"
    ARROJADO = "ARROJADO"
    AGRESSIVO = "AGRESSIVO"


@dataclass
class ClienteAssessor:
    """Representa um cliente do assessor importado das planilhas XP."""

    id: str
    codigo_conta: str
    nome: str
    profissao: str | None = None
    data_nascimento: date | None = None
    data_cadastro: date | None = None
    net: float | None = None
    suitability: str | None = None
    segmento: str | None = None
    saldo_d0: float | None = None
    saldo_d1: float | None = None
    saldo_d2: float | None = None
    saldo_d3: float | None = None
    telefone: str | None = None

    @property
    def tem_liquidacao_pendente(self) -> bool:
        """Verifica se há saldo em D+1, D+2 ou D+3 (liquidações pendentes)."""
        return any(
            (s or 0) != 0
            for s in [self.saldo_d1, self.saldo_d2, self.saldo_d3]
        )

    @property
    def idade(self) -> int | None:
        if self.data_nascimento is None:
            return None
        hoje = date.today()
        return (
            hoje.year
            - self.data_nascimento.year
            - ((hoje.month, hoje.day) < (self.data_nascimento.month, self.data_nascimento.day))
        )

    @property
    def anos_como_cliente(self) -> int | None:
        if self.data_cadastro is None:
            return None
        hoje = date.today()
        return hoje.year - self.data_cadastro.year
