"""Adapter: YFinanceFundamentalsProvider - indicadores de alavancagem via yfinance."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from src.domain.value_objects.indicadores_alavancagem import IndicadoresAlavancagem

logger = logging.getLogger(__name__)

# Prefixos de ativos que NÃO são empresas e não têm dados fundamentalistas
_RF_PREFIXES = ("TESOURO", "CDB", "LCI", "LCA", "LFT", "NTN", "DEBENTURE", "CRI", "CRA")
_ETF_SUFFIXES_COMMON = {"BOVA11", "IVVB11", "SMAL11", "HASH11", "GOLD11", "SPXI11"}


class YFinanceFundamentalsProvider:
    """Provedor de indicadores de alavancagem usando yfinance.

    Usa sufixo .SA para ativos B3. Tenta sem sufixo como fallback para BDRs.
    Retorna None se dados insuficientes para calcular as métricas.
    """

    async def fetch_indicadores_alavancagem(
        self, ticker: str
    ) -> IndicadoresAlavancagem | None:
        """Busca indicadores de alavancagem do último relatório via yfinance.

        Args:
            ticker: Código B3 sem sufixo (ex: PETR4, VALE3, AAPL34).

        Returns:
            IndicadoresAlavancagem ou None se não disponível.
        """
        ticker_upper = ticker.upper()

        # Pular ativos que não têm balanço de empresa
        if any(ticker_upper.startswith(p) for p in _RF_PREFIXES):
            return None
        if ticker_upper in _ETF_SUFFIXES_COMMON:
            return None

        # Tentar com sufixo .SA (B3) primeiro
        result = await self._fetch_from_yfinance(f"{ticker_upper}.SA")
        if result is not None:
            return result

        # Fallback: tentar sem sufixo (pode funcionar para alguns BDRs/ADRs)
        result = await self._fetch_from_yfinance(ticker_upper)
        return result

    async def _fetch_from_yfinance(self, symbol: str) -> IndicadoresAlavancagem | None:
        """Busca e calcula indicadores de alavancagem para um símbolo yfinance."""
        try:
            import yfinance as yf
        except ImportError:
            logger.warning("yfinance não instalado. Execute: pip install yfinance")
            return None

        try:
            ticker_obj = yf.Ticker(symbol)
            info = ticker_obj.info

            if not info or info.get("regularMarketPrice") is None:
                return None  # símbolo não encontrado

            # ── Extração dos campos de balanço ───────────────────────────
            total_debt = self._to_float(info.get("totalDebt"))
            total_cash = self._to_float(info.get("totalCash"))
            ebitda = self._to_float(info.get("ebitda"))
            operating_income = self._to_float(info.get("operatingIncome"))
            interest_expense = self._to_float(info.get("interestExpense"))
            debt_to_equity = self._to_float(info.get("debtToEquity"))

            # ── Cálculos derivados ────────────────────────────────────────
            divida_liquida: float | None = None
            if total_debt is not None and total_cash is not None:
                divida_liquida = total_debt - total_cash

            dl_ebitda: float | None = None
            if divida_liquida is not None and ebitda is not None and ebitda != 0:
                dl_ebitda = round(divida_liquida / ebitda, 2)

            cobertura_juros: float | None = None
            if (
                operating_income is not None
                and interest_expense is not None
                and interest_expense != 0
            ):
                cobertura_juros = round(operating_income / abs(interest_expense), 2)

            # D/E: yfinance retorna em % (ex: 150 = 1.5x), dividir por 100
            divida_bruta_pl: float | None = None
            if debt_to_equity is not None:
                divida_bruta_pl = round(debt_to_equity / 100.0, 2)

            # Converter para R$ milhões para exibição legível
            dl_milhoes = round(divida_liquida / 1_000_000, 1) if divida_liquida is not None else None
            ebitda_milhoes = round(ebitda / 1_000_000, 1) if ebitda is not None else None

            # Rejeitar se nenhuma métrica calculável
            if dl_ebitda is None and cobertura_juros is None and divida_bruta_pl is None:
                logger.debug("Dados insuficientes para %s", symbol)
                return None

            data_ref = datetime.now(timezone.utc).strftime("%Y-%m-%d")

            ticker_clean = symbol.replace(".SA", "")
            return IndicadoresAlavancagem(
                ticker=ticker_clean,
                divida_liquida_ebitda=dl_ebitda,
                divida_bruta_pl=divida_bruta_pl,
                cobertura_juros=cobertura_juros,
                divida_liquida_milhoes=dl_milhoes,
                ebitda_milhoes=ebitda_milhoes,
                data_referencia=data_ref,
                fonte="yfinance",
            )

        except Exception as exc:
            logger.warning("Erro ao buscar alavancagem de %s: %s", symbol, exc)
            return None

    @staticmethod
    def _to_float(value: object) -> float | None:
        """Converte valor para float, retornando None se inválido."""
        if value is None:
            return None
        try:
            f = float(value)
            return f if f == f else None  # rejeita NaN
        except (TypeError, ValueError):
            return None
