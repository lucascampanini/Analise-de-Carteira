"""Specifications para regras de negócio da Carteira."""

from __future__ import annotations

from datetime import datetime, timezone

from src.domain.entities.analise_carteira import AnaliseCarteira
from src.domain.entities.carteira import Carteira


class CarteiraTemPosicoesSpec:
    """Carteira deve ter pelo menos 1 posição para ser analisada."""

    def is_satisfied_by(self, carteira: Carteira) -> bool:
        """Verifica se a carteira tem posições."""
        return carteira.tem_posicoes

    def explain_failure(self, carteira: Carteira) -> str:
        """Explica por que a carteira não satisfaz a especificação."""
        return (
            f"Carteira {carteira.id} não pode ser analisada: "
            "é necessário ter pelo menos 1 posição."
        )


class AnaliseNaoExpiradaSpec:
    """Análise não deve estar expirada (< 24h desde criação)."""

    def is_satisfied_by(self, analise: AnaliseCarteira) -> bool:
        """Verifica se a análise ainda é válida."""
        return not analise.esta_expirada

    def explain_failure(self, analise: AnaliseCarteira) -> str:
        """Explica por que a análise não satisfaz a especificação."""
        return (
            f"Análise {analise.id} está expirada. "
            f"Expirou em: {analise.expira_em.isoformat()}. "
            "Gere uma nova análise."
        )
