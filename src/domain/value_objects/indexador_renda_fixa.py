"""Value Object IndexadorRendaFixa - indexador de remuneração de renda fixa."""

from __future__ import annotations

from enum import Enum


class IndexadorRendaFixa(str, Enum):
    """Indexador de remuneração de um instrumento de Renda Fixa.

    Determina o comportamento do ativo em diferentes cenários de mercado.
    """

    # ── Pós-fixados ──────────────────────────────────────────────────────
    CDI_PERCENTUAL  = "CDI_PERCENTUAL"  # % do CDI (ex: 120% CDI)
    CDI_MAIS        = "CDI_MAIS"        # CDI + spread (ex: CDI+2,5%)
    SELIC           = "SELIC"           # % da Selic (Tesouro Selic)
    IGPM            = "IGPM"            # IGP-M + spread

    # ── Inflação ─────────────────────────────────────────────────────────
    IPCA_MAIS       = "IPCA_MAIS"       # IPCA + spread (ex: IPCA+5,5%)
    IPCA_PERCENTUAL = "IPCA_PERCENTUAL" # % do IPCA

    # ── Prefixado ────────────────────────────────────────────────────────
    PREFIXADO       = "PREFIXADO"       # taxa fixa a.a. (ex: 13,5% a.a.)

    # ── Câmbio ───────────────────────────────────────────────────────────
    USD_MAIS        = "USD_MAIS"        # variação USD + spread (NDF, CCB cambial)

    # ── Outros ───────────────────────────────────────────────────────────
    OUTRO           = "OUTRO"

    @property
    def eh_pos_fixado(self) -> bool:
        """Retorno acompanha índice de mercado (CDI, Selic, IGPM)."""
        return self in {
            IndexadorRendaFixa.CDI_PERCENTUAL,
            IndexadorRendaFixa.CDI_MAIS,
            IndexadorRendaFixa.SELIC,
            IndexadorRendaFixa.IGPM,
        }

    @property
    def eh_inflacao(self) -> bool:
        """Retorno indexado à inflação (IPCA, IGPM)."""
        return self in {
            IndexadorRendaFixa.IPCA_MAIS,
            IndexadorRendaFixa.IPCA_PERCENTUAL,
            IndexadorRendaFixa.IGPM,
        }

    @property
    def eh_prefixado(self) -> bool:
        """Taxa determinada no momento da aplicação, sem indexação posterior."""
        return self == IndexadorRendaFixa.PREFIXADO

    @property
    def sensivel_a_juros(self) -> bool:
        """Sofre marcação a mercado relevante quando juros sobem/caem."""
        # Prefixados e IPCA+ de longo prazo têm duration relevante
        return self in {
            IndexadorRendaFixa.PREFIXADO,
            IndexadorRendaFixa.IPCA_MAIS,
            IndexadorRendaFixa.IPCA_PERCENTUAL,
        }

    def __str__(self) -> str:
        labels = {
            IndexadorRendaFixa.CDI_PERCENTUAL:  "% do CDI",
            IndexadorRendaFixa.CDI_MAIS:        "CDI+",
            IndexadorRendaFixa.SELIC:           "Selic",
            IndexadorRendaFixa.IGPM:            "IGP-M+",
            IndexadorRendaFixa.IPCA_MAIS:       "IPCA+",
            IndexadorRendaFixa.IPCA_PERCENTUAL: "% do IPCA",
            IndexadorRendaFixa.PREFIXADO:       "Prefixado",
            IndexadorRendaFixa.USD_MAIS:        "USD+",
            IndexadorRendaFixa.OUTRO:           "Outro",
        }
        return labels[self]
