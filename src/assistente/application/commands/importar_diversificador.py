"""Command: importar Diversificador XP."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ImportarDiversificadorCommand:
    caminho_diversificador: str
    alertar_dias_antes: int = 30   # gera evento de alerta com X dias de antecedência
    substituir_existentes: bool = True  # se True, limpa posições anteriores antes de importar
