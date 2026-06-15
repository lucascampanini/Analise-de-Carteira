"""Query: GerarArgumentoVenda."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GerarArgumentoVenda:
    """Query para gerar argumentos SPIN para todas as recomendações de uma análise.

    Args:
        analise_id: ID da análise cujas recomendações devem ser enriquecidas com SPIN.
    """

    analise_id: str


@dataclass(frozen=True)
class GerarArgumentoVendaPorRecomendacao:
    """Query para gerar argumento SPIN para uma recomendação específica.

    Args:
        analise_id: ID da análise.
        recomendacao_id: ID da recomendação específica.
    """

    analise_id: str
    recomendacao_id: str
