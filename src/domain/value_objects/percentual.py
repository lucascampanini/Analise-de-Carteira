"""Value Object Percentual - valor percentual entre 0 e 100."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Percentual:
    """Percentual entre 0.0 e 100.0 (inclusive).

    Args:
        value: Valor percentual (ex: 35.50 representa 35,50%).
    """

    value: float

    def __post_init__(self) -> None:
        if not 0.0 <= self.value <= 100.0:
            raise ValueError(
                f"Percentual deve estar entre 0 e 100, recebeu {self.value}"
            )

    def to_decimal(self) -> float:
        """Converte para decimal (ex: 35.50 -> 0.355)."""
        return self.value / 100.0

    def __str__(self) -> str:
        return f"{self.value:.2f}%"
