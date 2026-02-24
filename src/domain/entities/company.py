"""Entity Company - Aggregate Root para empresa listada na B3."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.cnpj import CNPJ
from src.domain.value_objects.ticker import Ticker


@dataclass
class Company:
    """Empresa listada na B3 (Aggregate Root).

    Referenciada por ID em outros Aggregates.

    Args:
        id: Identificador único.
        name: Razão social.
        ticker: Símbolo de negociação na B3.
        cnpj: CNPJ da empresa.
        sector: Setor econômico.
        cvm_code: Código CVM da empresa.
    """

    id: UUID
    name: str
    ticker: Ticker
    cnpj: CNPJ
    sector: str
    cvm_code: str
    subsector: str = ""
    segment: str = ""

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise InvalidEntityError("Company inválida: o nome da empresa é obrigatório.")
        if not self.cvm_code.strip():
            raise InvalidEntityError("Company inválida: o código CVM é obrigatório.")
        self.name = self.name.strip()
        self.cvm_code = self.cvm_code.strip()
