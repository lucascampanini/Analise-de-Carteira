"""Command: importar base de clientes das planilhas XP."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ImportarClientesCommand:
    caminho_relatorio_saldo: str   # RelatorioSaldoConsolidado .xlsx
    caminho_positivador: str       # Positivador .xlsx
    codigo_assessor: str = "69567"
    idempotency_key: str = ""
