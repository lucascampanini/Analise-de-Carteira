"""Value Object HorizonteInvestimento - prazo de investimento."""

from __future__ import annotations

from enum import Enum


class HorizonteInvestimento(str, Enum):
    """Horizonte de tempo do investidor.

    Usado para validar aderência ao perfil declarado.
    """

    CURTO_PRAZO = "CURTO_PRAZO"    # < 2 anos
    MEDIO_PRAZO = "MEDIO_PRAZO"   # 2-5 anos
    LONGO_PRAZO = "LONGO_PRAZO"   # > 5 anos

    def __str__(self) -> str:
        labels = {
            HorizonteInvestimento.CURTO_PRAZO: "Curto Prazo (< 2 anos)",
            HorizonteInvestimento.MEDIO_PRAZO: "Médio Prazo (2-5 anos)",
            HorizonteInvestimento.LONGO_PRAZO: "Longo Prazo (> 5 anos)",
        }
        return labels[self]
