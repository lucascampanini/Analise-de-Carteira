"""Fake in-memory CarteiraRepository para testes."""

from __future__ import annotations

from uuid import UUID

from src.domain.entities.carteira import Carteira


class FakeCarteiraRepository:
    """Implementação in-memory do CarteiraRepository para testes unitários."""

    def __init__(self) -> None:
        self._store: dict[UUID, Carteira] = {}

    async def save(self, carteira: Carteira) -> None:
        self._store[carteira.id] = carteira

    async def find_by_id(self, carteira_id: UUID) -> Carteira | None:
        return self._store.get(carteira_id)

    async def find_by_cliente_id(self, cliente_id: UUID) -> list[Carteira]:
        return [c for c in self._store.values() if c.cliente_id == cliente_id]
