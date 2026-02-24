"""Value Object CNPJ - Cadastro Nacional da Pessoa Jurídica."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class CNPJ:
    """CNPJ de uma empresa brasileira.

    Armazena apenas os 14 dígitos. Valida dígitos verificadores.
    Aceita entrada formatada (xx.xxx.xxx/xxxx-xx) ou só dígitos.
    """

    number: str

    def __post_init__(self) -> None:
        digits = re.sub(r"\D", "", self.number)
        object.__setattr__(self, "number", digits)

        if len(digits) != 14:
            raise ValueError(
                f"CNPJ inválido: deve conter 14 dígitos, recebeu {len(digits)}."
            )

        if len(set(digits)) == 1:
            raise ValueError("CNPJ inválido: todos os dígitos são iguais.")

        if not self._validate_check_digits(digits):
            raise ValueError(f"CNPJ inválido: dígitos verificadores incorretos para '{digits}'.")

    @staticmethod
    def _validate_check_digits(digits: str) -> bool:
        """Valida os dois dígitos verificadores do CNPJ."""
        def _calc_digit(base: str, weights: list[int]) -> int:
            total = sum(int(d) * w for d, w in zip(base, weights))
            remainder = total % 11
            return 0 if remainder < 2 else 11 - remainder

        weights_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        weights_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

        d1 = _calc_digit(digits[:12], weights_1)
        d2 = _calc_digit(digits[:13], weights_2)

        return digits[12] == str(d1) and digits[13] == str(d2)

    @property
    def formatted(self) -> str:
        """Retorna o CNPJ no formato XX.XXX.XXX/XXXX-XX."""
        n = self.number
        return f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{n[12:14]}"

    def __str__(self) -> str:
        return self.formatted
