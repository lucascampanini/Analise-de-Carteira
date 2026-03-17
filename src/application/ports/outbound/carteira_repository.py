"""Port outbound: CarteiraRepository."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.domain.entities.carteira import Carteira


class CarteiraRepository(Protocol):
    """Repositório de Carteiras (Driven Port)."""

    async def save(self, carteira: Carteira) -> None:
        """Persiste uma carteira com suas posições."""
        ...

    async def find_by_id(self, carteira_id: UUID) -> Carteira | None:
        """Busca carteira por ID."""
        ...

    async def find_by_cliente_id(self, cliente_id: UUID) -> list[Carteira]:
        """Lista carteiras de um cliente."""
        ...
