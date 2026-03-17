"""Entidade PosicaoPrev — posição em previdência privada."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone


def _inferir_tipo_prev(dsc_sub_produto: str) -> str:
    sub = dsc_sub_produto.upper()
    if "MULTIMERCADO" in sub or "MACRO" in sub:
        return "MULTIMERCADO"
    if "RENDA FIXA" in sub or "PÓS" in sub or "POS" in sub:
        return "RF"
    if "AÇÕES" in sub or "ACOES" in sub:
        return "ACOES"
    return "OUTROS"


@dataclass
class PosicaoPrev:
    """Posição em previdência privada importada do Diversificador XP."""

    id: str
    codigo_conta: str
    nome_cliente: str | None
    tipo_fundo: str   # MULTIMERCADO | RF | ACOES | OUTROS
    nome_fundo: str | None
    gestora: str | None
    valor_net: float | None
    data_referencia: date | None
    importado_em: datetime = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.importado_em is None:
            self.importado_em = datetime.now(timezone.utc)
