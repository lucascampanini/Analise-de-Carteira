"""Port outbound: HistoricalPriceProvider."""

from __future__ import annotations

from typing import Protocol


class HistoricalPriceProvider(Protocol):
    """Provedor de dados históricos de preço para cálculo de risco (Driven Port)."""

    async def fetch_daily_returns(
        self, ticker: str, period_days: int = 252
    ) -> list[float]:
        """Busca retornos diários de um ativo.

        Args:
            ticker: Código do ativo (sem sufixo .SA).
            period_days: Número de dias de histórico (padrão: 252 = 1 ano).

        Returns:
            Lista de retornos diários (ex: [0.01, -0.02, ...]). Vazia se não disponível.
        """
        ...

    async def fetch_benchmark_returns(
        self, benchmark: str, period_days: int = 252
    ) -> list[float]:
        """Busca retornos diários de um benchmark.

        Args:
            benchmark: Nome do benchmark ('IBOV', 'CDI', 'IPCA').
            period_days: Número de dias de histórico.

        Returns:
            Lista de retornos diários. Vazia se não disponível.
        """
        ...
