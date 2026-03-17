"""Value Object ObjetivoFinanceiro - objetivo do investidor."""

from __future__ import annotations

from enum import Enum


class ObjetivoFinanceiro(str, Enum):
    """Objetivo financeiro principal do investidor."""

    PRESERVACAO_CAPITAL = "PRESERVACAO_CAPITAL"
    RENDA_PASSIVA = "RENDA_PASSIVA"
    CRESCIMENTO_PATRIMONIAL = "CRESCIMENTO_PATRIMONIAL"
    APOSENTADORIA = "APOSENTADORIA"
    RESERVA_EMERGENCIA = "RESERVA_EMERGENCIA"

    def __str__(self) -> str:
        labels = {
            ObjetivoFinanceiro.PRESERVACAO_CAPITAL: "Preservação de Capital",
            ObjetivoFinanceiro.RENDA_PASSIVA: "Renda Passiva",
            ObjetivoFinanceiro.CRESCIMENTO_PATRIMONIAL: "Crescimento Patrimonial",
            ObjetivoFinanceiro.APOSENTADORIA: "Aposentadoria",
            ObjetivoFinanceiro.RESERVA_EMERGENCIA: "Reserva de Emergência",
        }
        return labels[self]
