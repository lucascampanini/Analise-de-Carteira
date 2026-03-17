"""Serviço de prazos de resgate de fundos.

Importação via planilha XP (lista-fundos-*.xlsx).
Colunas usadas: CNPJ_FUNDO, NOME_FUNDO, NOME_GESTORA,
                COTIZACAO_RESGATE, PERIODO_COTIZACAO,
                LIQUIDACAO_RESGATE, PERIODO_LIQUIDACAO.
"""

from __future__ import annotations

import re
from pathlib import Path

import structlog

logger = structlog.get_logger(__name__)


def _normalizar_cnpj(cnpj: str | None) -> str:
    """Remove formatação e retorna somente os 14 dígitos."""
    if not cnpj:
        return ""
    return re.sub(r"\D", "", str(cnpj))


def _parse_prazo(valor: str | None) -> int | None:
    """Converte 'D+10' → 10, '---' ou None → None."""
    if not valor:
        return None
    s = str(valor).strip()
    if s in ("---", "-", "", "N/A"):
        return None
    m = re.match(r"D\+(\d+)", s, re.IGNORECASE)
    if m:
        return int(m.group(1))
    try:
        return int(s)
    except ValueError:
        return None


def _tipo_dia(valor: str | None) -> str | None:
    """'Dias Úteis' → 'DU', 'Dias Corridos' → 'DC'."""
    if not valor:
        return None
    s = str(valor).strip().upper()
    if "ÚTEIS" in s or "UTEIS" in s or s == "DU":
        return "DU"
    if "CORRIDOS" in s or s == "DC":
        return "DC"
    return None


def formatar_prazo(
    cotiz: int | None,
    pagto: int | None,
    tipo_cotiz: str | None = None,
    tipo_pagto: str | None = None,
) -> str:
    """Formata prazo de resgate para exibição.

    Exemplos:
        D+0 / D+2 DU
        D+30 DU / D+32 DU
        D+360 DC / D+362 DC
    """
    if cotiz is None and pagto is None:
        return "—"

    c = cotiz if cotiz is not None else 0
    p = pagto if pagto is not None else 0
    total = c + p

    tc = f" {tipo_cotiz}" if tipo_cotiz else ""
    tp = f" {tipo_pagto}" if tipo_pagto else ""

    if c == 0:
        return f"D+{total}{tp}"
    return f"D+{c}{tc} / D+{total}{tp}"


def importar_lista_xp(caminho: str | Path) -> list[dict]:
    """Lê a planilha lista-fundos-*.xlsx da XP e retorna lista de dicts prontos para upsert.

    Raises:
        ImportError: se openpyxl não estiver instalado.
        ValueError: se as colunas obrigatórias não forem encontradas.
    """
    try:
        import openpyxl
    except ImportError as e:
        raise ImportError("openpyxl não instalado. Execute: pip install openpyxl") from e

    wb = openpyxl.load_workbook(caminho, read_only=True, data_only=True)
    ws = wb.active

    rows = ws.iter_rows(values_only=True)
    raw_header = [str(c).strip() if c is not None else "" for c in next(rows)]

    # Normaliza header (remove acentos para matching robusto)
    def _norm(s: str) -> str:
        import unicodedata
        return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper().strip()

    header = [_norm(h) for h in raw_header]

    def _idx(candidates: list[str]) -> int | None:
        for c in candidates:
            if c in header:
                return header.index(c)
        return None

    col_cnpj    = _idx(["CNPJ_FUNDO", "CNPJ"])
    col_nome    = _idx(["NOME_FUNDO", "NOME"])
    col_gestora = _idx(["NOME_GESTORA", "GESTORA"])
    col_cotiz   = _idx(["COTIZACAO_RESGATE", "COTIZACAO", "PRAZO_COTIZACAO"])
    col_pcotiz  = _idx(["PERIODO_COTIZACAO", "PERIODO COTIZACAO"])
    col_liq     = _idx(["LIQUIDACAO_RESGATE", "LIQUIDACAO", "PRAZO_LIQUIDACAO"])
    col_pliq    = _idx(["PERIODO_LIQUIDACAO", "PERIODO LIQUIDACAO"])

    if col_cnpj is None:
        raise ValueError(f"Coluna CNPJ não encontrada. Header: {raw_header[:10]}")

    fundos = []
    for row in rows:
        if not row or row[col_cnpj] is None:
            continue

        cnpj = _normalizar_cnpj(str(row[col_cnpj]))
        if len(cnpj) != 14:
            continue

        fundos.append({
            "cnpj":            cnpj,
            "denom_social":    str(row[col_nome]).strip() if col_nome is not None and row[col_nome] else None,
            "gestora":         str(row[col_gestora]).strip() if col_gestora is not None and row[col_gestora] else None,
            "situacao":        "EM FUNCIONAMENTO NORMAL",
            "prazo_cotiz_resg": _parse_prazo(row[col_cotiz] if col_cotiz is not None else None),
            "tipo_dia_cotiz":  _tipo_dia(row[col_pcotiz] if col_pcotiz is not None else None),
            "prazo_pagto_resg": _parse_prazo(row[col_liq] if col_liq is not None else None),
            "tipo_dia_pagto":  _tipo_dia(row[col_pliq] if col_pliq is not None else None),
        })

    logger.info("lista_xp_lida", total=len(fundos))
    return fundos
