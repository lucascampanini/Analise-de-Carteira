"""Command: CriarCliente."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CriarCliente:
    """Comando para cadastrar um novo cliente com perfil de investidor.

    Args:
        nome: Nome completo do cliente.
        cpf: CPF do cliente (com ou sem formatação).
        perfil: Perfil de risco (CONSERVADOR/MODERADO/ARROJADO).
        objetivo: Objetivo financeiro principal.
        horizonte: Horizonte de investimento.
        tolerancia_perda_percentual: Percentual máximo de perda aceito.
        idempotency_key: Chave de idempotência (obrigatória).
    """

    nome: str
    cpf: str
    perfil: str
    objetivo: str
    horizonte: str
    tolerancia_perda_percentual: float
    idempotency_key: str

    def __post_init__(self) -> None:
        if not self.idempotency_key.strip():
            raise ValueError("idempotency_key é obrigatória para commands.")
        if not self.nome.strip():
            raise ValueError("nome é obrigatório.")
        if not self.cpf.strip():
            raise ValueError("cpf é obrigatório.")
