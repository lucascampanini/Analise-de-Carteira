"""Fake in-memory ClienteRepository para testes."""

from __future__ import annotations

from uuid import UUID

from src.domain.entities.cliente import Cliente
from src.domain.value_objects.cpf import CPF


class FakeClienteRepository:
    """Implementação in-memory do ClienteRepository para testes unitários."""

    def __init__(self) -> None:
        self._store: dict[UUID, Cliente] = {}

    async def save(self, cliente: Cliente) -> None:
        self._store[cliente.id] = cliente

    async def find_by_id(self, cliente_id: UUID) -> Cliente | None:
        return self._store.get(cliente_id)

    async def find_by_cpf(self, cpf: CPF) -> Cliente | None:
        return next(
            (c for c in self._store.values() if c.cpf.number == cpf.number),
            None,
        )

    async def list_all(self) -> list[Cliente]:
        return list(self._store.values())
