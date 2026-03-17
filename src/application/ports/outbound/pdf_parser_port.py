"""Port outbound: PdfParserPort."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class PosicaoParsedDTO:
    """DTO retornado pelo parser de PDF (Anticorruption Layer).

    Nunca vaza para o domain — convertido em domain entities pelos handlers.
    Campos *_rf são preenchidos apenas para ativos de Renda Fixa.
    """

    ticker: str
    nome: str
    quantidade: Decimal
    preco_medio: float       # em reais
    valor_atual: float       # em reais
    classe_ativo: str        # valor de ClasseAtivo enum
    setor: str
    emissor: str

    # ── Renda Fixa / Crédito Privado ────────────────────────────────────
    subtipo_rf: str | None = None           # SubtipoRendaFixa value
    indexador_rf: str | None = None         # IndexadorRendaFixa value
    taxa_rf: float | None = None            # valor numérico da taxa
    data_vencimento_rf: str | None = None   # ISO date "YYYY-MM-DD"
    data_carencia_rf: str | None = None     # ISO date "YYYY-MM-DD" ou None
    liquidez_rf: str | None = None          # LiquidezRendaFixa value
    cnpj_emissor_rf: str | None = None      # 14 dígitos sem formatação
    rating_escala_rf: str | None = None     # EscalaRating value (ex: "AA+")
    rating_agencia_rf: str | None = None    # AgenciaRating value (ex: "S&P")
    garantias_rf: str | None = None         # descrição das garantias


class PdfParserPort(Protocol):
    """Parser de extratos de carteira em PDF (Driven Port)."""

    async def parse_extrato(self, pdf_bytes: bytes) -> list[PosicaoParsedDTO]:
        """Extrai posições de um PDF de extrato de corretora.

        Args:
            pdf_bytes: Conteúdo binário do arquivo PDF.

        Returns:
            Lista de posições parseadas.

        Raises:
            ValueError: Se o PDF não puder ser parseado.
        """
        ...
