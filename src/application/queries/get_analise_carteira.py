"""Query: GetAnaliseCarteira."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GetAnaliseCarteira:
    """Query para obter o resultado de uma análise de carteira.

    Args:
        analise_id: ID da análise.
    """

    analise_id: str


@dataclass(frozen=True)
class GetRelatorioCarteira:
    """Query para obter dados enriquecidos para geração de relatório PDF.

    Args:
        analise_id: ID da análise.
    """

    analise_id: str


@dataclass(frozen=True)
class ListAnalisesByCliente:
    """Query para listar análises de um cliente.

    Args:
        cliente_id: ID do cliente.
    """

    cliente_id: str
