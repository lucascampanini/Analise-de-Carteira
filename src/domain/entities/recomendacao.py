"""Entity Recomendacao - sugestão de rebalanceamento de carteira."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from uuid import UUID

from src.domain.exceptions.domain_exceptions import InvalidEntityError


class TipoRecomendacao(str, Enum):
    """Tipo de ação recomendada."""

    AUMENTAR = "AUMENTAR"
    REDUZIR = "REDUZIR"
    MANTER = "MANTER"
    INCLUIR = "INCLUIR"
    REMOVER = "REMOVER"


class PrioridadeRecomendacao(int, Enum):
    """Prioridade da recomendação (1=crítica, 5=opcional)."""

    CRITICA = 1
    ALTA = 2
    MEDIA = 3
    BAIXA = 4
    OPCIONAL = 5


@dataclass
class Recomendacao:
    """Recomendação de rebalanceamento (Entity dentro do Aggregate AnaliseCarteira).

    Args:
        id: Identificador único.
        analise_id: ID da análise à qual pertence.
        tipo: Tipo de ação recomendada.
        ticker: Ticker do ativo envolvido (vazio para recomendações gerais).
        justificativa: Explicação fundamentada da recomendação.
        impacto_tributario: Descrição do impacto fiscal da ação.
        prioridade: Prioridade da recomendação.
        percentual_sugerido: Percentual alvo sugerido para o ativo (None se não aplicável).
    """

    id: UUID
    analise_id: UUID
    tipo: TipoRecomendacao
    ticker: str
    justificativa: str
    impacto_tributario: str
    prioridade: PrioridadeRecomendacao
    percentual_sugerido: float | None = None

    def __post_init__(self) -> None:
        if not self.justificativa.strip():
            raise InvalidEntityError("Recomendação inválida: justificativa é obrigatória.")
        self.justificativa = self.justificativa.strip()
        self.impacto_tributario = self.impacto_tributario.strip()
        if self.percentual_sugerido is not None and not 0.0 <= self.percentual_sugerido <= 100.0:
            raise InvalidEntityError(
                f"Recomendação inválida: percentual_sugerido deve estar entre 0 e 100."
            )
