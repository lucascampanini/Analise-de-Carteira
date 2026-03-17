"""Port outbound: FundamentalsDataProvider."""

from __future__ import annotations

from typing import Protocol

from src.domain.value_objects.indicadores_alavancagem import IndicadoresAlavancagem


class FundamentalsDataProvider(Protocol):
    """Provedor de dados fundamentalistas de empresas (Driven Port).

    Busca indicadores de alavancagem e balanço patrimonial dos últimos
    relatórios publicados (trimestral/anual) pelas empresas.

    Aplica-se a ACAO e BDR.
    """

    async def fetch_indicadores_alavancagem(
        self, ticker: str
    ) -> IndicadoresAlavancagem | None:
        """Busca indicadores de alavancagem para um ativo.

        Args:
            ticker: Código do ativo B3 sem sufixo (ex: PETR4, VALE3).

        Returns:
            IndicadoresAlavancagem preenchido, ou None se dados não disponíveis.
        """
        ...
