"""Entity Posicao - posição de um ativo em uma carteira."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from src.domain.entities.ativo import Ativo
from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.money import Money


@dataclass
class Posicao:
    """Posição de um ativo em uma Carteira (Entity dentro do Aggregate Carteira).

    Args:
        id: Identificador único da posição.
        carteira_id: ID da carteira à qual pertence.
        ativo: Ativo financeiro desta posição (embedded, mesmo aggregate).
        quantidade: Número de unidades/cotas (suporta frações para FIIs e cripto).
        preco_medio: Preço médio ponderado de aquisição (custo).
        valor_atual: Valor de mercado atual desta posição.
    """

    id: UUID
    carteira_id: UUID
    ativo: Ativo
    quantidade: Decimal
    preco_medio: Money
    valor_atual: Money

    def __post_init__(self) -> None:
        if self.quantidade <= Decimal("0"):
            raise InvalidEntityError(
                f"Posição inválida: quantidade deve ser positiva, recebeu {self.quantidade}."
            )
        if not self.preco_medio.is_positive():
            raise InvalidEntityError(
                "Posição inválida: preço médio deve ser positivo."
            )
        if not self.valor_atual.is_positive():
            raise InvalidEntityError(
                "Posição inválida: valor atual deve ser positivo."
            )

    @property
    def rentabilidade_percentual(self) -> float:
        """Retorna a rentabilidade da posição em percentual."""
        custo_total_cents = float(self.preco_medio.cents) * float(self.quantidade)
        if custo_total_cents == 0:
            return 0.0
        return ((self.valor_atual.cents / custo_total_cents) - 1.0) * 100.0

    @property
    def lucro_prejuizo(self) -> Money:
        """Retorna o lucro ou prejuízo absoluto da posição."""
        custo_total = Money(cents=round(float(self.preco_medio.cents) * float(self.quantidade)))
        return Money(cents=self.valor_atual.cents - custo_total.cents)

    @property
    def percentual_no_pl(self) -> float:
        """Percentual desta posição no PL (calculado externamente — placeholder)."""
        return 0.0  # Calculado pelo Aggregate Carteira
