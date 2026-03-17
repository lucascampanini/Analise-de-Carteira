"""Fake HistoricalPriceProvider para testes."""

from __future__ import annotations

import math
import random


class FakeHistoricalPriceProvider:
    """Implementação fake do HistoricalPriceProvider para testes unitários.

    Gera retornos sintéticos determinísticos para uso em testes.
    """

    def __init__(self, seed: int = 42) -> None:
        self._seed = seed

    async def fetch_daily_returns(
        self, ticker: str, period_days: int = 252
    ) -> list[float]:
        """Retorna retornos sintéticos baseados no ticker."""
        rng = random.Random(hash(ticker) + self._seed)
        volatilidade_diaria = 0.015  # 1.5% ao dia ~ 24% aa
        retornos = [rng.gauss(0.0003, volatilidade_diaria) for _ in range(period_days)]
        return retornos

    async def fetch_benchmark_returns(
        self, benchmark: str, period_days: int = 252
    ) -> list[float]:
        """Retorna retornos sintéticos do benchmark."""
        rng = random.Random(hash(benchmark) + self._seed)
        volatilidade_diaria = 0.012  # IBOV ~19% aa
        retornos = [rng.gauss(0.0003, volatilidade_diaria) for _ in range(period_days)]
        return retornos
