"""Entity Ativo - ativo financeiro."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING
from uuid import UUID

from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.classe_ativo import ClasseAtivo

if TYPE_CHECKING:
    from src.domain.entities.detalhes_renda_fixa import DetalhesRendaFixa


@dataclass
class Ativo:
    """Ativo financeiro (ação, FII, ETF, RF, BDR, fundo, cripto).

    Não é Aggregate Root — é referenciado dentro do Aggregate Carteira.

    Args:
        id: Identificador único.
        ticker: Código do ativo (ex: PETR4, TESOURO-SELIC-2029, CDB-ITAU-2026).
        nome: Nome completo do ativo.
        classe: Classe/categoria do ativo.
        setor: Setor econômico ou 'Renda Fixa' para ativos de RF.
        emissor: Nome da empresa emissora ou banco (ex: 'Petrobras', 'Tesouro Nacional').
        tem_historico_preco: False para ativos de RF que não têm cotação de mercado.
        detalhes_rf: Detalhes específicos de Renda Fixa/Crédito Privado (None para RV).
    """

    id: UUID
    ticker: str
    nome: str
    classe: ClasseAtivo
    setor: str
    emissor: str
    tem_historico_preco: bool = True
    detalhes_rf: DetalhesRendaFixa | None = None

    def __post_init__(self) -> None:
        if not self.ticker.strip():
            raise InvalidEntityError("Ativo inválido: ticker é obrigatório.")
        if not self.nome.strip():
            raise InvalidEntityError("Ativo inválido: nome é obrigatório.")
        if not self.setor.strip():
            raise InvalidEntityError("Ativo inválido: setor é obrigatório.")
        self.ticker = self.ticker.strip().upper()
        self.nome = self.nome.strip()
        self.setor = self.setor.strip()
        self.emissor = self.emissor.strip()
        # Ativos de renda fixa não têm preço de mercado histórico contínuo
        if self.classe.is_renda_fixa:
            object.__setattr__(self, "tem_historico_preco", False)
