"""Domain Service: AnalisadorAlocacao - análise de alocação da carteira."""

from __future__ import annotations

from src.domain.entities.carteira import Carteira
from src.domain.value_objects.classe_ativo import ClasseAtivo


class AnalisadorAlocacao:
    """Calcula métricas de alocação de uma carteira.

    Stateless service — não tem estado interno.
    """

    def calcular_percentual_por_classe(
        self, carteira: Carteira
    ) -> dict[str, float]:
        """Calcula o percentual alocado em cada classe de ativo.

        Args:
            carteira: Carteira com posições.

        Returns:
            Dict com ClasseAtivo.value -> percentual (%).
        """
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return {}

        resultado: dict[str, float] = {}
        for posicao in carteira.posicoes:
            chave = str(posicao.ativo.classe)
            valor = posicao.valor_atual.cents
            resultado[chave] = resultado.get(chave, 0.0) + valor

        return {k: (v / pl.cents) * 100.0 for k, v in resultado.items()}

    def calcular_percentual_por_setor(
        self, carteira: Carteira
    ) -> dict[str, float]:
        """Calcula o percentual alocado em cada setor econômico.

        Args:
            carteira: Carteira com posições.

        Returns:
            Dict com setor -> percentual (%).
        """
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return {}

        resultado: dict[str, float] = {}
        for posicao in carteira.posicoes:
            setor = posicao.ativo.setor
            valor = posicao.valor_atual.cents
            resultado[setor] = resultado.get(setor, 0.0) + valor

        return {k: (v / pl.cents) * 100.0 for k, v in resultado.items()}

    def calcular_percentual_por_emissor(
        self, carteira: Carteira
    ) -> dict[str, float]:
        """Calcula o percentual alocado em cada emissor.

        Args:
            carteira: Carteira com posições.

        Returns:
            Dict com emissor -> percentual (%).
        """
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return {}

        resultado: dict[str, float] = {}
        for posicao in carteira.posicoes:
            emissor = posicao.ativo.emissor
            valor = posicao.valor_atual.cents
            resultado[emissor] = resultado.get(emissor, 0.0) + valor

        return {k: (v / pl.cents) * 100.0 for k, v in resultado.items()}

    def calcular_percentual_rv(self, carteira: Carteira) -> float:
        """Calcula o percentual total em Renda Variável."""
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return 0.0

        total_rv = sum(
            p.valor_atual.cents
            for p in carteira.posicoes
            if p.ativo.classe.is_renda_variavel
        )
        return (total_rv / pl.cents) * 100.0

    def calcular_percentual_rf(self, carteira: Carteira) -> float:
        """Calcula o percentual total em Renda Fixa."""
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return 0.0

        total_rf = sum(
            p.valor_atual.cents
            for p in carteira.posicoes
            if p.ativo.classe.is_renda_fixa
        )
        return (total_rf / pl.cents) * 100.0
