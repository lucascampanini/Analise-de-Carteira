"""Value Object CPF - Cadastro de Pessoa Física."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class CPF:
    """CPF do investidor (apenas dígitos, 11 caracteres).

    Args:
        number: CPF com ou sem formatação (ex: '123.456.789-09' ou '12345678909').
    """

    number: str

    def __post_init__(self) -> None:
        digits = re.sub(r"\D", "", self.number)
        if len(digits) != 11:
            raise ValueError(f"CPF inválido: deve ter 11 dígitos, recebeu '{self.number}'")
        if not self._validate_digits(digits):
            raise ValueError(f"CPF inválido: dígitos verificadores incorretos para '{self.number}'")
        object.__setattr__(self, "number", digits)

    @staticmethod
    def _validate_digits(digits: str) -> bool:
        """Valida os dígitos verificadores do CPF."""
        if len(set(digits)) == 1:
            return False
        # Primeiro dígito verificador
        total = sum(int(digits[i]) * (10 - i) for i in range(9))
        remainder = (total * 10) % 11
        if remainder == 10:
            remainder = 0
        if remainder != int(digits[9]):
            return False
        # Segundo dígito verificador
        total = sum(int(digits[i]) * (11 - i) for i in range(10))
        remainder = (total * 10) % 11
        if remainder == 10:
            remainder = 0
        return remainder == int(digits[10])

    def formatted(self) -> str:
        """Retorna CPF formatado (xxx.xxx.xxx-xx)."""
        n = self.number
        return f"{n[:3]}.{n[3:6]}.{n[6:9]}-{n[9:]}"

    def __str__(self) -> str:
        return self.formatted()
