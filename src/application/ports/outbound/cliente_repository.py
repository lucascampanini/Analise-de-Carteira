"""Port outbound: ClienteRepository."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.domain.entities.cliente import Cliente
from src.domain.value_objects.cpf import CPF


class ClienteRepository(Protocol):
    """Repositório de Clientes (Driven Port)."""

    async def save(self, cliente: Cliente) -> None:
        """Persiste um cliente."""
        ...

    async def find_by_id(self, cliente_id: UUID) -> Cliente | None:
        """Busca cliente por ID."""
        ...

    async def find_by_cpf(self, cpf: CPF) -> Cliente | None:
        """Busca cliente por CPF (unicidade)."""
        ...

    async def list_all(self) -> list[Cliente]:
        """Lista todos os clientes."""
        ...
