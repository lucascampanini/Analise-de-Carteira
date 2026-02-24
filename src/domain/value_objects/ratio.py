"""Value Object Ratio - indicador financeiro numérico."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Ratio:
    """Indicador financeiro expresso como razão (ex: ROE=0.15 = 15%).

    Args:
        value: Valor numérico do indicador (ex: 0.15 para 15%).
        name: Nome do indicador (ex: "ROE", "P/L").
    """

    value: float
    name: str

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Ratio inválido: o nome do indicador não pode ser vazio.")
        object.__setattr__(self, "name", self.name.strip())

    def as_percentage(self) -> float:
        """Retorna o valor como porcentagem (ex: 0.15 -> 15.0)."""
        return round(self.value * 100, 4)

    def __str__(self) -> str:
        return f"{self.name}: {self.as_percentage():.2f}%"
