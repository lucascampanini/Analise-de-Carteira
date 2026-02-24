"""Value Object Ticker - símbolo de ativo na B3."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Ticker:
    """Símbolo de negociação de um ativo na B3.

    Formato: 4 letras + 1-2 dígitos (ex: PETR4, KLBN11).
    Automaticamente convertido para maiúsculas.
    """

    symbol: str

    def __post_init__(self) -> None:
        symbol = self.symbol.strip().upper()
        object.__setattr__(self, "symbol", symbol)

        if not re.match(r"^[A-Z]{4}\d{1,2}$", symbol):
            raise ValueError(
                f"Ticker inválido: '{self.symbol}'. "
                "O símbolo deve ter 4 letras seguidas de 1 ou 2 dígitos (ex: PETR4, KLBN11)."
            )

    def __str__(self) -> str:
        return self.symbol
