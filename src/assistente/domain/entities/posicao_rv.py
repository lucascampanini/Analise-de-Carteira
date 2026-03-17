"""Entidade PosicaoRV — posição de renda variável de um cliente."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone


def _inferir_ticker(dsc_ativo: str, emissor: str) -> str | None:
    """Extrai o ticker da ação/FII a partir do nome do ativo ou emissor XP."""
    # Emissor geralmente é o ticker (ex: "PETR4", "MXRF11")
    if emissor and len(emissor.strip()) <= 6 and emissor.strip().isupper():
        return emissor.strip()
    # DSC_ATIVO pode começar com o ticker
    partes = dsc_ativo.strip().split()
    if partes and len(partes[0]) <= 6 and partes[0].isupper():
        return partes[0]
    return None


@dataclass
class PosicaoRV:
    """Posição de renda variável importada do Diversificador XP."""

    id: str
    codigo_conta: str
    nome_cliente: str | None
    tipo: str              # ACAO | FII | OPCAO | ALUGUEL
    ticker: str | None
    dsc_ativo: str
    emissor: str | None
    quantidade: float | None
    valor_net: float | None
    data_vencimento: date | None  # apenas opções
    data_referencia: date | None
    importado_em: datetime = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.importado_em is None:
            self.importado_em = datetime.now(timezone.utc)
