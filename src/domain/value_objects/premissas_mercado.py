"""Value Object PremissasMercado - projeções do Boletim Focus por ano."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class PremissaAno:
    """Expectativas de mercado para um ano-calendário específico."""

    ano: int
    cdi_pct_aa: float    # ex: 13.60 → 13,60% a.a.
    ipca_pct_aa: float   # ex: 4.11
    igpm_pct_aa: float   # ex: 5.20
    selic_pct_aa: float  # ex: 13.70

    def __post_init__(self) -> None:
        if self.cdi_pct_aa < 0:
            raise ValueError(f"CDI não pode ser negativo: {self.cdi_pct_aa}")
        if self.ano < 2020 or self.ano > 2100:
            raise ValueError(f"Ano fora de intervalo razoável: {self.ano}")

    @property
    def cdi_decimal(self) -> float:
        return self.cdi_pct_aa / 100.0

    @property
    def ipca_decimal(self) -> float:
        return self.ipca_pct_aa / 100.0

    @property
    def igpm_decimal(self) -> float:
        return self.igpm_pct_aa / 100.0

    @property
    def selic_decimal(self) -> float:
        return self.selic_pct_aa / 100.0

    def com_ajuste(self, delta_cdi: float = 0.0, delta_ipca: float = 0.0) -> "PremissaAno":
        """Retorna nova PremissaAno com CDI e IPCA ajustados (cenários)."""
        return PremissaAno(
            ano=self.ano,
            cdi_pct_aa=max(5.0, self.cdi_pct_aa + delta_cdi),
            ipca_pct_aa=max(1.0, self.ipca_pct_aa + delta_ipca),
            igpm_pct_aa=max(1.0, self.igpm_pct_aa + delta_ipca),
            selic_pct_aa=max(5.0, self.selic_pct_aa + delta_cdi),
        )


# Premissas padrão baseadas no Focus BCB de 06/03/2026 (fallback quando API indisponível)
_PREMISSAS_FALLBACK: tuple[PremissaAno, ...] = (
    PremissaAno(ano=2026, cdi_pct_aa=13.60, ipca_pct_aa=4.11, igpm_pct_aa=5.20, selic_pct_aa=13.70),
    PremissaAno(ano=2027, cdi_pct_aa=11.40, ipca_pct_aa=3.74, igpm_pct_aa=4.00, selic_pct_aa=11.50),
    PremissaAno(ano=2028, cdi_pct_aa=10.40, ipca_pct_aa=3.50, igpm_pct_aa=3.50, selic_pct_aa=10.50),
    PremissaAno(ano=2029, cdi_pct_aa=10.40, ipca_pct_aa=3.50, igpm_pct_aa=3.50, selic_pct_aa=10.50),
    PremissaAno(ano=2030, cdi_pct_aa=10.40, ipca_pct_aa=3.50, igpm_pct_aa=3.50, selic_pct_aa=10.50),
    PremissaAno(ano=2031, cdi_pct_aa=10.40, ipca_pct_aa=3.50, igpm_pct_aa=3.50, selic_pct_aa=10.50),
)


@dataclass(frozen=True)
class PremissasMercado:
    """Conjunto de expectativas de mercado por ano-calendário.

    Imutável — cenários alternativos são criados via com_ajuste().
    Fonte primária: BCB Boletim Focus (OData Olinda).
    Fallback: constantes hardcoded baseadas no último Focus disponível.
    """

    data_referencia: date
    anos: tuple[PremissaAno, ...]
    fonte: str = "BCB Focus"

    def __post_init__(self) -> None:
        if not self.anos:
            raise ValueError("PremissasMercado requer ao menos um ano.")

    def para_ano(self, ano: int) -> PremissaAno:
        """Retorna premissa para o ano; usa último ano disponível como fallback."""
        for p in self.anos:
            if p.ano == ano:
                return p
        # Fallback: retorna o último ano disponível
        return sorted(self.anos, key=lambda a: a.ano)[-1]

    def com_ajuste(self, delta_cdi: float, delta_ipca: float) -> "PremissasMercado":
        """Cria novo PremissasMercado com CDI e IPCA ajustados (análise de cenários)."""
        return PremissasMercado(
            data_referencia=self.data_referencia,
            anos=tuple(p.com_ajuste(delta_cdi, delta_ipca) for p in self.anos),
            fonte=f"{self.fonte} [ajustado CDI{delta_cdi:+.2f}pp IPCA{delta_ipca:+.2f}pp]",
        )

    @classmethod
    def fallback(cls) -> "PremissasMercado":
        """Retorna premissas padrão (Focus BCB 06/03/2026) para uso offline."""
        return cls(
            data_referencia=date(2026, 3, 6),
            anos=_PREMISSAS_FALLBACK,
            fonte="BCB Focus 06/03/2026 (fallback)",
        )
