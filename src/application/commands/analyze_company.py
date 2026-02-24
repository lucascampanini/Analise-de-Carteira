"""Command: AnalyzeCompanyBalanceSheet.

Command imutável para solicitar análise de balanço patrimonial.
Segue CQRS: commands são void, com idempotency_key obrigatório.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.domain.value_objects.fiscal_period import FiscalPeriod
from src.domain.value_objects.ticker import Ticker


@dataclass(frozen=True)
class AnalyzeCompanyBalanceSheet:
    """Comando para analisar o balanço patrimonial de uma empresa.

    Args:
        ticker: Símbolo da empresa na B3.
        period: Período fiscal a analisar.
        idempotency_key: Chave de idempotência (obrigatória).
    """

    ticker: Ticker
    period: FiscalPeriod
    idempotency_key: str

    def __post_init__(self) -> None:
        if not self.idempotency_key.strip():
            raise ValueError("idempotency_key é obrigatória para commands.")
