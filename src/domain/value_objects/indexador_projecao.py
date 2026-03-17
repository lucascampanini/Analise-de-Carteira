"""Value Object IndexadorProjecao - bucket de indexador para projeção de carteira."""

from __future__ import annotations

from enum import Enum

from src.domain.value_objects.indexador_renda_fixa import IndexadorRendaFixa


class IndexadorProjecao(str, Enum):
    """Agrupamento de indexadores para fins de projeção de patrimônio.

    Mais granular que ClasseAtivo, mais coarse que IndexadorRendaFixa.
    Mapeia o contrato do título para o modelo de projeção adequado.
    """

    CDI   = "CDI"    # CDI_PERCENTUAL, CDI_MAIS, SELIC → rende % do CDI
    IPCA  = "IPCA"   # IPCA_MAIS, IPCA_PERCENTUAL → rende IPCA + spread
    PRE   = "PRE"    # PREFIXADO → taxa fixa contratada
    MULTI = "MULTI"  # Fundos multimercado → CDI + alpha estimado (+2% a.a.)
    RV    = "RV"     # Renda variável / Long Biased → CDI + alpha estimado (+3% a.a.)

    # Alpha padrão sobre CDI para cada bucket (pontos percentuais ao ano)
    @property
    def alpha_cdi_pp(self) -> float:
        """Alpha padrão acima do CDI para projeção estimada."""
        if self == IndexadorProjecao.MULTI:
            return 2.0
        if self == IndexadorProjecao.RV:
            return 3.0
        return 0.0

    @classmethod
    def from_string(cls, s: str) -> "IndexadorProjecao":
        """Converte string do build_carteiras ('CDI', 'IPCA', 'Pre', 'Multi', 'RV')."""
        mapping = {
            "CDI":   cls.CDI,
            "IPCA":  cls.IPCA,
            "Pre":   cls.PRE,
            "PRE":   cls.PRE,
            "Multi": cls.MULTI,
            "MULTI": cls.MULTI,
            "RV":    cls.RV,
        }
        try:
            return mapping[s]
        except KeyError:
            raise ValueError(f"IndexadorProjecao desconhecido: '{s}'. Válidos: {list(mapping)}")

    @classmethod
    def from_indexador_rf(cls, idx: IndexadorRendaFixa) -> "IndexadorProjecao":
        """Mapeia IndexadorRendaFixa → bucket de projeção."""
        if idx in (IndexadorRendaFixa.CDI_PERCENTUAL, IndexadorRendaFixa.CDI_MAIS,
                   IndexadorRendaFixa.SELIC):
            return cls.CDI
        if idx in (IndexadorRendaFixa.IPCA_MAIS, IndexadorRendaFixa.IPCA_PERCENTUAL):
            return cls.IPCA
        if idx == IndexadorRendaFixa.PREFIXADO:
            return cls.PRE
        if idx == IndexadorRendaFixa.IGPM:
            return cls.IPCA  # proxy: IGP-M → bucket IPCA para simplificação
        return cls.CDI  # fallback conservador
