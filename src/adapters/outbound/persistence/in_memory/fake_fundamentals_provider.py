"""Fake FundamentalsDataProvider para testes unitários."""

from __future__ import annotations

from src.domain.value_objects.indicadores_alavancagem import IndicadoresAlavancagem


class FakeFundamentalsProvider:
    """Implementação fake do FundamentalsDataProvider para testes.

    Retorna indicadores fixos configuráveis por ticker.
    Por padrão inclui exemplos com diferentes níveis de alavancagem.
    """

    _DEFAULT_INDICATORS: dict[str, IndicadoresAlavancagem] = {
        "PETR4": IndicadoresAlavancagem(
            ticker="PETR4",
            divida_liquida_ebitda=1.8,
            divida_bruta_pl=0.92,
            cobertura_juros=5.2,
            divida_liquida_milhoes=180_000.0,
            ebitda_milhoes=100_000.0,
            data_referencia="2024-09-30",
        ),
        "VALE3": IndicadoresAlavancagem(
            ticker="VALE3",
            divida_liquida_ebitda=0.6,
            divida_bruta_pl=0.35,
            cobertura_juros=12.4,
            divida_liquida_milhoes=32_000.0,
            ebitda_milhoes=53_000.0,
            data_referencia="2024-09-30",
        ),
        "COGN3": IndicadoresAlavancagem(
            ticker="COGN3",
            divida_liquida_ebitda=7.2,
            divida_bruta_pl=3.10,
            cobertura_juros=0.8,
            divida_liquida_milhoes=5_400.0,
            ebitda_milhoes=750.0,
            data_referencia="2024-09-30",
        ),
        "WEGE3": IndicadoresAlavancagem(
            ticker="WEGE3",
            divida_liquida_ebitda=-0.4,  # caixa líquido
            divida_bruta_pl=0.08,
            cobertura_juros=None,  # sem dívida significativa
            divida_liquida_milhoes=-2_100.0,
            ebitda_milhoes=5_250.0,
            data_referencia="2024-09-30",
        ),
    }

    def __init__(
        self,
        indicadores: dict[str, IndicadoresAlavancagem] | None = None,
        should_fail: bool = False,
    ) -> None:
        self._indicadores = indicadores if indicadores is not None else self._DEFAULT_INDICATORS
        self._should_fail = should_fail

    async def fetch_indicadores_alavancagem(
        self, ticker: str
    ) -> IndicadoresAlavancagem | None:
        if self._should_fail:
            raise RuntimeError("FakeFundamentalsProvider configurado para falhar.")
        return self._indicadores.get(ticker.upper())
