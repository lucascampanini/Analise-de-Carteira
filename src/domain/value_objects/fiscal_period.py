"""Value Object FiscalPeriod - período fiscal (anual ou trimestral)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class PeriodType(Enum):
    """Tipo de período fiscal."""

    ANNUAL = "ANNUAL"
    QUARTERLY = "QUARTERLY"


@dataclass(frozen=True)
class FiscalPeriod:
    """Período fiscal de demonstrações financeiras.

    Args:
        year: Ano fiscal (>= 1900).
        period_type: Tipo (ANNUAL ou QUARTERLY).
        quarter: Número do trimestre (1-4), obrigatório se QUARTERLY.
    """

    year: int
    period_type: PeriodType
    quarter: int | None = None

    def __post_init__(self) -> None:
        if self.year < 1900 or self.year > 2100:
            raise ValueError(
                f"FiscalPeriod inválido: ano deve estar entre 1900 e 2100, recebeu {self.year}."
            )

        if self.period_type == PeriodType.QUARTERLY:
            if self.quarter is None:
                raise ValueError(
                    "FiscalPeriod inválido: trimestre é obrigatório para período QUARTERLY."
                )
            if self.quarter < 1 or self.quarter > 4:
                raise ValueError(
                    f"FiscalPeriod inválido: trimestre deve ser 1-4, recebeu {self.quarter}."
                )

    @property
    def label(self) -> str:
        """Rótulo legível do período (ex: '2024-ANUAL', '2024-Q3')."""
        if self.period_type == PeriodType.ANNUAL:
            return f"{self.year}-ANUAL"
        return f"{self.year}-Q{self.quarter}"

    def __str__(self) -> str:
        return self.label
