"""Entity Carteira - Aggregate Root para carteira de investimentos."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from src.domain.entities.posicao import Posicao
from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.classe_ativo import ClasseAtivo
from src.domain.value_objects.money import Money


@dataclass
class Carteira:
    """Carteira de investimentos de um cliente (Aggregate Root).

    Contém o conjunto de posições em um dado momento.
    Referencia Cliente apenas por ID (nunca por objeto).

    Args:
        id: Identificador único.
        cliente_id: ID do cliente proprietário.
        data_referencia: Data de referência da carteira (extrato).
        origem_arquivo: Nome/identificador do arquivo de origem.
        posicoes: Lista de posições da carteira.
        criada_em: Data/hora de criação do registro.
    """

    id: UUID
    cliente_id: UUID
    data_referencia: datetime
    origem_arquivo: str
    posicoes: list[Posicao] = field(default_factory=list)
    criada_em: datetime = field(default_factory=lambda: __import__("datetime").datetime.now(__import__("datetime").timezone.utc))

    def __post_init__(self) -> None:
        if not self.origem_arquivo.strip():
            raise InvalidEntityError("Carteira inválida: origem_arquivo é obrigatório.")

    def adicionar_posicao(self, posicao: Posicao) -> None:
        """Adiciona uma posição à carteira."""
        if posicao.carteira_id != self.id:
            raise InvalidEntityError(
                f"Posição {posicao.id} não pertence a esta carteira."
            )
        self.posicoes.append(posicao)

    @property
    def patrimonio_liquido(self) -> Money:
        """Patrimônio líquido total (soma dos valores atuais de todas as posições)."""
        total_cents = sum(p.valor_atual.cents for p in self.posicoes)
        return Money(cents=total_cents)

    @property
    def tem_posicoes(self) -> bool:
        """Verifica se a carteira tem pelo menos uma posição."""
        return len(self.posicoes) > 0

    @property
    def total_posicoes(self) -> int:
        """Número total de posições."""
        return len(self.posicoes)

    def percentual_posicao(self, posicao: Posicao) -> float:
        """Calcula o percentual de uma posição no PL total."""
        pl = self.patrimonio_liquido
        if pl.is_zero():
            return 0.0
        return (posicao.valor_atual.cents / pl.cents) * 100.0

    def posicoes_por_classe(self) -> dict[ClasseAtivo, list[Posicao]]:
        """Agrupa posições por classe de ativo."""
        resultado: dict[ClasseAtivo, list[Posicao]] = {}
        for posicao in self.posicoes:
            classe = posicao.ativo.classe
            if classe not in resultado:
                resultado[classe] = []
            resultado[classe].append(posicao)
        return resultado

    def valor_por_classe(self) -> dict[ClasseAtivo, Money]:
        """Calcula o valor total por classe de ativo."""
        resultado: dict[ClasseAtivo, int] = {}
        for posicao in self.posicoes:
            classe = posicao.ativo.classe
            resultado[classe] = resultado.get(classe, 0) + posicao.valor_atual.cents
        return {k: Money(cents=v) for k, v in resultado.items()}
