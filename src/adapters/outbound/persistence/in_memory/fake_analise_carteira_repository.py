"""Fake in-memory AnaliseCarteiraRepository para testes."""

from __future__ import annotations

from uuid import UUID

from src.domain.entities.analise_carteira import AnaliseCarteira


class FakeAnaliseCarteiraRepository:
    """Implementação in-memory do AnaliseCarteiraRepository para testes unitários."""

    def __init__(self) -> None:
        self._store: dict[UUID, AnaliseCarteira] = {}

    async def save(self, analise: AnaliseCarteira) -> None:
        self._store[analise.id] = analise

    async def find_by_id(self, analise_id: UUID) -> AnaliseCarteira | None:
        return self._store.get(analise_id)

    async def find_by_carteira_id(self, carteira_id: UUID) -> list[AnaliseCarteira]:
        return [a for a in self._store.values() if a.carteira_id == carteira_id]

    async def find_latest_by_carteira_id(self, carteira_id: UUID) -> AnaliseCarteira | None:
        analises = [a for a in self._store.values() if a.carteira_id == carteira_id]
        if not analises:
            return None
        return max(analises, key=lambda a: a.criada_em)
