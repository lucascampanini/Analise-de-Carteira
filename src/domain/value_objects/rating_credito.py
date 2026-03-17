"""Value Object RatingCredito - classificação de risco de crédito do emissor."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class EscalaRating(str, Enum):
    """Escala de rating de crédito (mapeada para S&P/Fitch como referência)."""

    # ── Grau de Investimento ─────────────────────────────────────────────
    AAA    = "AAA"    # Risco mínimo
    AA_POS = "AA+"
    AA     = "AA"
    AA_NEG = "AA-"
    A_POS  = "A+"
    A      = "A"
    A_NEG  = "A-"
    BBB_POS = "BBB+"
    BBB    = "BBB"
    BBB_NEG = "BBB-"  # Mínimo grau de investimento

    # ── Grau Especulativo (High Yield) ───────────────────────────────────
    BB_POS = "BB+"
    BB     = "BB"
    BB_NEG = "BB-"
    B_POS  = "B+"
    B      = "B"
    B_NEG  = "B-"
    CCC    = "CCC"
    CC     = "CC"
    C      = "C"
    D      = "D"      # Default / Inadimplência

    # ── Sem Rating ───────────────────────────────────────────────────────
    NAO_CLASSIFICADO = "NR"

    @property
    def eh_grau_investimento(self) -> bool:
        """Rating de grau de investimento (BBB- ou superior)."""
        grau_investimento = {
            EscalaRating.AAA, EscalaRating.AA_POS, EscalaRating.AA, EscalaRating.AA_NEG,
            EscalaRating.A_POS, EscalaRating.A, EscalaRating.A_NEG,
            EscalaRating.BBB_POS, EscalaRating.BBB, EscalaRating.BBB_NEG,
        }
        return self in grau_investimento

    @property
    def eh_high_yield(self) -> bool:
        """Rating especulativo (abaixo de BBB-)."""
        return self not in {EscalaRating.NAO_CLASSIFICADO} and not self.eh_grau_investimento

    @property
    def nivel_risco(self) -> str:
        """Classificação de risco simplificada para o relatório."""
        if self in {EscalaRating.AAA, EscalaRating.AA_POS, EscalaRating.AA, EscalaRating.AA_NEG}:
            return "Baixíssimo"
        if self in {EscalaRating.A_POS, EscalaRating.A, EscalaRating.A_NEG}:
            return "Baixo"
        if self in {EscalaRating.BBB_POS, EscalaRating.BBB, EscalaRating.BBB_NEG}:
            return "Moderado"
        if self in {EscalaRating.BB_POS, EscalaRating.BB, EscalaRating.BB_NEG}:
            return "Elevado"
        if self == EscalaRating.NAO_CLASSIFICADO:
            return "Não Avaliado"
        return "Alto"


class AgenciaRating(str, Enum):
    """Agência classificadora de risco."""
    SP      = "S&P"
    FITCH   = "Fitch"
    MOODYS  = "Moody's"
    AUSTIN  = "Austin Rating"    # principal agência local BR
    SR      = "SR Rating"        # agência local BR
    OUTRO   = "Outro"


@dataclass(frozen=True)
class RatingCredito:
    """Rating de crédito de um emissor ou emissão.

    Args:
        escala: Nota de crédito na escala S&P/Fitch.
        agencia: Agência classificadora.
        data_referencia: Data da última atualização do rating (ISO format).
    """

    escala: EscalaRating
    agencia: AgenciaRating
    data_referencia: str = ""    # "YYYY-MM-DD"

    def __post_init__(self) -> None:
        if self.data_referencia and len(self.data_referencia) != 10:
            raise ValueError(
                f"data_referencia deve estar no formato YYYY-MM-DD, "
                f"recebeu '{self.data_referencia}'"
            )

    def __str__(self) -> str:
        agencia = self.agencia.value
        return f"{self.escala.value} ({agencia})"
