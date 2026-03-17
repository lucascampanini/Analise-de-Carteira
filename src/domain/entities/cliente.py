"""Entity Cliente - Aggregate Root para cliente assessorado."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.cpf import CPF
from src.domain.value_objects.horizonte_investimento import HorizonteInvestimento
from src.domain.value_objects.objetivo_financeiro import ObjetivoFinanceiro
from src.domain.value_objects.perfil_investidor import PerfilInvestidor


@dataclass
class Cliente:
    """Cliente assessorado com seu perfil de investidor (Aggregate Root).

    Args:
        id: Identificador único.
        nome: Nome completo do cliente.
        cpf: CPF do cliente (único).
        perfil: Perfil de risco (Conservador/Moderado/Arrojado).
        objetivo: Objetivo financeiro principal.
        horizonte: Horizonte de investimento.
        tolerancia_perda_percentual: Percentual máximo de perda aceito (0-100).
        criado_em: Data/hora de criação do registro.
    """

    id: UUID
    nome: str
    cpf: CPF
    perfil: PerfilInvestidor
    objetivo: ObjetivoFinanceiro
    horizonte: HorizonteInvestimento
    tolerancia_perda_percentual: float
    criado_em: datetime

    def __post_init__(self) -> None:
        if not self.nome.strip():
            raise InvalidEntityError("Cliente inválido: nome é obrigatório.")
        if not 0.0 <= self.tolerancia_perda_percentual <= 100.0:
            raise InvalidEntityError(
                f"Cliente inválido: tolerância à perda deve estar entre 0 e 100, "
                f"recebeu {self.tolerancia_perda_percentual}."
            )
        self.nome = self.nome.strip()

    @property
    def percentual_rv_maximo(self) -> float:
        """Percentual máximo recomendado em Renda Variável para o perfil."""
        return self.perfil.percentual_rv_maximo

    @property
    def percentual_rf_minimo(self) -> float:
        """Percentual mínimo recomendado em Renda Fixa para o perfil."""
        return self.perfil.percentual_rf_minimo
