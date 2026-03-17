"""Value Object PerfilInvestidor - perfil de risco do investidor."""

from __future__ import annotations

from enum import Enum


class PerfilInvestidor(str, Enum):
    """Perfil de risco do investidor.

    Determina a alocação alvo e os alertas gerados na análise.
    """

    CONSERVADOR = "CONSERVADOR"
    MODERADO = "MODERADO"
    ARROJADO = "ARROJADO"

    @property
    def percentual_rv_maximo(self) -> float:
        """Percentual máximo recomendado em Renda Variável."""
        return {
            PerfilInvestidor.CONSERVADOR: 30.0,
            PerfilInvestidor.MODERADO: 60.0,
            PerfilInvestidor.ARROJADO: 100.0,
        }[self]

    @property
    def percentual_rf_minimo(self) -> float:
        """Percentual mínimo recomendado em Renda Fixa."""
        return {
            PerfilInvestidor.CONSERVADOR: 70.0,
            PerfilInvestidor.MODERADO: 40.0,
            PerfilInvestidor.ARROJADO: 0.0,
        }[self]

    def __str__(self) -> str:
        return self.value.capitalize()
