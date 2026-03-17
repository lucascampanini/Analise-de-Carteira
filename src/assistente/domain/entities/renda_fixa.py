"""Entidade RendaFixa — posição de renda fixa de um cliente."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone


def _inferir_indexador(dsc_ativo: str) -> str | None:
    """Infere indexador a partir do nome do ativo XP."""
    nome = dsc_ativo.upper()
    if " PRE " in nome or nome.startswith("PRE ") or " PRE_" in nome:
        return "PRE"
    if "IPCA" in nome or "NTNB" in nome or "NTN-B" in nome:
        return "IPCA"
    if " FLU " in nome or "CDI" in nome or " POS " in nome:
        return "CDI"
    return None


def _inferir_tipo(dsc_produto: str, dsc_sub_produto: str, dsc_ativo: str) -> str:
    """Infere tipo do ativo a partir dos campos XP."""
    sub = dsc_sub_produto.upper()
    ativo = dsc_ativo.upper()
    if dsc_produto.upper() == "TESOURO DIRETO" or "TESOURO" in sub:
        if "IPCA" in ativo or "NTN-B" in ativo:
            return "NTN-B"
        if "PREFIXADO" in ativo or "LTN" in ativo:
            return "LTN"
        if "SELIC" in ativo or "LFT" in ativo:
            return "LFT"
        return "TITULO_PUBLICO"
    if "EMISS" in sub:
        if "CDB" in ativo:
            return "CDB"
        if "LCI" in ativo:
            return "LCI"
        if "LCA" in ativo:
            return "LCA"
        if " LF " in ativo or ativo.startswith("LF "):
            return "LF"
        return "CDB"
    if "LETRA FINANCEIRA" in sub:
        return "LF"
    if "CREDITO" in sub or "CRÉDITO" in sub:
        if "CRI" in ativo:
            return "CRI"
        if "CRA" in ativo:
            return "CRA"
        if "DEB" in ativo or "DEBENTURE" in ativo or "DEBÊNTURE" in ativo:
            return "DEBENTURE"
        return "CREDITO_PRIVADO"
    if "ESTRUTURADO" in sub or "COE" in ativo:
        return "COE"
    if "TITULO" in sub or "TÍTULO" in sub:
        # Refinar pelo nome do ativo
        if "NTN-B" in ativo or "NTNB" in ativo or "IPCA" in ativo:
            return "NTN-B"
        if "LTN" in ativo or "PREFIXADO" in ativo:
            return "LTN"
        if "LFT" in ativo or "SELIC" in ativo:
            return "LFT"
        if "NTN-F" in ativo:
            return "NTN-F"
        return "TITULO_PUBLICO"
    return "OUTRO"


@dataclass
class RendaFixa:
    """Posição de renda fixa importada do Diversificador XP."""

    id: str
    codigo_conta: str
    nome_cliente: str | None
    tipo_ativo: str
    dsc_ativo: str          # nome original do ativo (ex: CDB PRE DU CDBA240MY9Q)
    emissor: str | None
    indexador: str | None   # CDI | IPCA | PRE | None
    data_vencimento: date
    valor_aplicado: float | None
    data_referencia: date | None  # DAT_DATA_FATO
    evento_criado: bool = False
    importado_em: datetime = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.importado_em is None:
            self.importado_em = datetime.now(timezone.utc)

    @property
    def descricao_evento(self) -> str:
        valor = f"R$ {self.valor_aplicado:,.2f}" if self.valor_aplicado else "valor n/d"
        emissor = self.emissor or "emissor n/d"
        return (
            f"Vencimento {self.tipo_ativo} – {self.dsc_ativo} "
            f"({emissor}) – {valor}"
        )
