"""Port outbound: CompanyRepository.

Interface que o domínio/aplicação precisa para persistir/recuperar empresas.
Implementação concreta fica em adapters/outbound/persistence.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.domain.entities.company import Company
from src.domain.value_objects.ticker import Ticker


class CompanyRepository(Protocol):
    """Repository para a entidade Company."""

    async def save(self, company: Company) -> None:
        """Persiste uma empresa (insert ou update)."""
        ...

    async def find_by_id(self, company_id: UUID) -> Company | None:
        """Busca empresa por ID."""
        ...

    async def find_by_ticker(self, ticker: Ticker) -> Company | None:
        """Busca empresa por ticker."""
        ...

    async def find_by_cvm_code(self, cvm_code: str) -> Company | None:
        """Busca empresa por código CVM."""
        ...

    async def list_all(self) -> list[Company]:
        """Lista todas as empresas cadastradas."""
        ...
