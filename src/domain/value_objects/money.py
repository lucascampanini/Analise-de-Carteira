"""Value Object Money - valores monetários em centavos (BRL)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    """Valor monetário em centavos de Real (BRL).

    Armazena em centavos (int) para evitar erros de ponto flutuante.
    Valores negativos são permitidos (prejuízos, despesas).
    """

    cents: int

    @classmethod
    def from_reais(cls, value: float) -> Money:
        """Cria Money a partir de um valor em reais."""
        return cls(cents=round(value * 100))

    def to_reais(self) -> float:
        """Converte para valor em reais."""
        return self.cents / 100

    def is_zero(self) -> bool:
        """Verifica se o valor é zero."""
        return self.cents == 0

    def is_positive(self) -> bool:
        """Verifica se o valor é positivo."""
        return self.cents > 0

    def is_negative(self) -> bool:
        """Verifica se o valor é negativo."""
        return self.cents < 0

    def __add__(self, other: Money) -> Money:
        if not isinstance(other, Money):
            return NotImplemented
        return Money(cents=self.cents + other.cents)

    def __sub__(self, other: Money) -> Money:
        if not isinstance(other, Money):
            return NotImplemented
        return Money(cents=self.cents - other.cents)

    def __str__(self) -> str:
        return f"R$ {self.to_reais():,.2f}"
