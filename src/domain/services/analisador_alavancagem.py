"""Domain Service: AnalisadorAlavancagem - alertas de alavancagem da carteira."""

from __future__ import annotations

from src.domain.value_objects.indicadores_alavancagem import IndicadoresAlavancagem


class AnalisadorAlavancagem:
    """Analisa a alavancagem financeira das empresas presentes na carteira.

    Stateless service — não tem estado interno.
    """

    def gerar_alertas_carteira(
        self,
        alavancagem_por_ticker: dict[str, IndicadoresAlavancagem],
    ) -> list[str]:
        """Agrega alertas de alavancagem de todas as posições relevantes.

        Args:
            alavancagem_por_ticker: Mapeamento ticker → IndicadoresAlavancagem.

        Returns:
            Lista de alertas de alavancagem para incluir no relatório.
        """
        alertas: list[str] = []
        for indicadores in alavancagem_por_ticker.values():
            alertas.extend(indicadores.gerar_alertas())
        return alertas

    def resumo_alavancagem_carteira(
        self,
        alavancagem_por_ticker: dict[str, IndicadoresAlavancagem],
    ) -> dict[str, int]:
        """Retorna contagem de empresas por nível de risco de alavancagem.

        Args:
            alavancagem_por_ticker: Mapeamento ticker → IndicadoresAlavancagem.

        Returns:
            Dict nivel_risco → contagem de empresas.
        """
        contagem: dict[str, int] = {}
        for indicadores in alavancagem_por_ticker.values():
            nivel = indicadores.nivel_risco
            contagem[nivel] = contagem.get(nivel, 0) + 1
        return contagem
