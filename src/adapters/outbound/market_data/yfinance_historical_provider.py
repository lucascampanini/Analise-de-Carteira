"""Adapter: YFinanceHistoricalProvider - dados históricos via yfinance."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class YFinanceHistoricalProvider:
    """Provedor de dados históricos de preço usando yfinance.

    Usa sufixo .SA para ativos B3.
    Ativos de Renda Fixa (sem sufixo .SA) retornam lista vazia.
    """

    # Ativos que são RF e não têm cotação em bolsa
    _RF_PREFIXES = ("TESOURO", "CDB", "LCI", "LCA", "LFT", "NTN", "DEBENTURE", "CRI", "CRA")

    def __init__(self) -> None:
        pass

    async def fetch_daily_returns(
        self, ticker: str, period_days: int = 252
    ) -> list[float]:
        """Busca retornos diários de um ativo B3.

        Args:
            ticker: Código do ativo sem sufixo (ex: PETR4, BOVA11).
            period_days: Número de dias de histórico.

        Returns:
            Lista de retornos diários decimais (ex: [0.01, -0.02]).
            Vazia para ativos de Renda Fixa ou se não encontrado.
        """
        # Ativos de RF não têm histórico de preços de mercado
        ticker_upper = ticker.upper()
        if any(ticker_upper.startswith(pref) for pref in self._RF_PREFIXES):
            return []

        symbol = f"{ticker_upper}.SA"
        return await self._fetch_returns(symbol, period_days)

    async def fetch_benchmark_returns(
        self, benchmark: str, period_days: int = 252
    ) -> list[float]:
        """Busca retornos diários de um benchmark.

        Args:
            benchmark: 'IBOV', 'CDI' ou 'IPCA'.
            period_days: Número de dias.

        Returns:
            Lista de retornos diários.
        """
        symbol_map = {
            "IBOV": "^BVSP",
            "CDI": None,   # CDI vem do BCB SGS
            "IPCA": None,  # IPCA vem do BCB SGS
        }

        symbol = symbol_map.get(benchmark.upper())
        if symbol is None:
            # Para CDI/IPCA, usa retorno fixo diário aproximado
            return self._cdi_approximation(period_days)

        return await self._fetch_returns(symbol, period_days)

    async def _fetch_returns(self, symbol: str, period_days: int) -> list[float]:
        """Busca retornos históricos de um símbolo yfinance."""
        try:
            import yfinance as yf
        except ImportError:
            logger.warning("yfinance não instalado. Retornando lista vazia.")
            return []

        try:
            ticker_obj = yf.Ticker(symbol)
            # Pegar um pouco mais de dias para compensar fins de semana/feriados
            fetch_period = f"{min(period_days + 60, 365)}d"
            hist = ticker_obj.history(period=fetch_period)

            if hist.empty or len(hist) < 10:
                logger.warning("Sem dados históricos para %s", symbol)
                return []

            closes = hist["Close"].tolist()
            retornos = [
                (closes[i] - closes[i - 1]) / closes[i - 1]
                for i in range(1, len(closes))
                if closes[i - 1] != 0
            ]

            # Retornar apenas os últimos period_days retornos
            return retornos[-period_days:] if len(retornos) > period_days else retornos

        except Exception as exc:
            logger.warning("Erro ao buscar histórico de %s: %s", symbol, exc)
            return []

    @staticmethod
    def _cdi_approximation(period_days: int) -> list[float]:
        """Retorna aproximação do CDI diário (Selic ~13.25% a.a. em 2024)."""
        # CDI diário ≈ (1 + taxa_anual) ^ (1/252) - 1
        taxa_anual = 0.1325  # ~13.25% aa
        retorno_diario = (1 + taxa_anual) ** (1 / 252) - 1
        return [retorno_diario] * period_days
