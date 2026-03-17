"""Domain Service: CalculadorAderencia - score de aderência ao perfil."""

from __future__ import annotations

from src.domain.entities.cliente import Cliente
from src.domain.value_objects.perfil_investidor import PerfilInvestidor


class CalculadorAderencia:
    """Calcula o score de aderência da carteira ao perfil do cliente.

    Score de 0 a 100:
    - 100: Carteira perfeitamente alinhada ao perfil.
    - < 70: Recomendação de rebalanceamento gerada.
    - < 30: Situação crítica de desalinhamento.

    Stateless service — não tem estado interno.
    """

    def calcular_score(
        self,
        cliente: Cliente,
        percentual_rv: float,
        percentual_rf: float,
        alertas_concentracao: list[str],
    ) -> float:
        """Calcula o score de aderência (0-100).

        Args:
            cliente: Cliente com perfil declarado.
            percentual_rv: Percentual atual em Renda Variável.
            percentual_rf: Percentual atual em Renda Fixa.
            alertas_concentracao: Lista de alertas de concentração.

        Returns:
            Score de aderência de 0 a 100.
        """
        score = 100.0
        perfil = cliente.perfil

        # Penalidade por RF abaixo do mínimo
        if percentual_rf < cliente.percentual_rf_minimo:
            deficit_rf = cliente.percentual_rf_minimo - percentual_rf
            penalidade = min(40.0, deficit_rf * 1.5)
            score -= penalidade

        # Penalidade por RV acima do máximo
        if percentual_rv > cliente.percentual_rv_maximo:
            excesso_rv = percentual_rv - cliente.percentual_rv_maximo
            penalidade = min(40.0, excesso_rv * 1.5)
            score -= penalidade

        # Penalidades específicas por perfil
        if perfil == PerfilInvestidor.CONSERVADOR:
            # RF < 60%: situação crítica para conservador
            if percentual_rf < 60.0:
                score -= 20.0

        elif perfil == PerfilInvestidor.ARROJADO:
            # RF > 80%: situação crítica para arrojado
            if percentual_rf > 80.0:
                score -= 20.0

        # Penalidade por alertas de concentração
        penalidade_concentracao = min(20.0, len(alertas_concentracao) * 5.0)
        score -= penalidade_concentracao

        # Score mínimo: 0
        return max(0.0, round(score, 2))

    def classificar_score(self, score: float) -> str:
        """Retorna uma classificação textual do score.

        Args:
            score: Score de aderência (0-100).

        Returns:
            Classificação textual.
        """
        if score >= 90:
            return "Excelente"
        elif score >= 70:
            return "Bom"
        elif score >= 50:
            return "Regular"
        elif score >= 30:
            return "Ruim"
        else:
            return "Crítico"
