"""Port outbound: AnaliseCarteiraRepository."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.domain.entities.analise_carteira import AnaliseCarteira


class AnaliseCarteiraRepository(Protocol):
    """Repositório de Análises de Carteira (Driven Port)."""

    async def save(self, analise: AnaliseCarteira) -> None:
        """Persiste uma análise."""
        ...

    async def find_by_id(self, analise_id: UUID) -> AnaliseCarteira | None:
        """Busca análise por ID."""
        ...

    async def find_by_carteira_id(self, carteira_id: UUID) -> list[AnaliseCarteira]:
        """Busca análises de uma carteira."""
        ...

    async def find_latest_by_carteira_id(self, carteira_id: UUID) -> AnaliseCarteira | None:
        """Busca a análise mais recente de uma carteira."""
        ...
