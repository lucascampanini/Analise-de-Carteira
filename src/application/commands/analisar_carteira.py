"""Command: AnalisarCarteira."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AnalisarCarteira:
    """Comando para executar análise quantitativa de uma carteira.

    Args:
        carteira_id: ID da carteira a ser analisada.
        cliente_id: ID do cliente proprietário.
        idempotency_key: Chave de idempotência (obrigatória).
    """

    carteira_id: str
    cliente_id: str
    idempotency_key: str

    def __post_init__(self) -> None:
        if not self.idempotency_key.strip():
            raise ValueError("idempotency_key é obrigatória para commands.")
        if not self.carteira_id.strip():
            raise ValueError("carteira_id é obrigatório.")
        if not self.cliente_id.strip():
            raise ValueError("cliente_id é obrigatório.")
