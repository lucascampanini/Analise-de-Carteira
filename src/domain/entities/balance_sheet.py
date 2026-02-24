"""Entity BalanceSheet - Balanço Patrimonial de uma empresa."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.domain.value_objects.fiscal_period import FiscalPeriod
from src.domain.value_objects.money import Money


@dataclass
class BalanceSheet:
    """Balanço Patrimonial (BP) de uma empresa em um período fiscal.

    Dados estruturados conforme plano de contas CVM.
    Valores em Money (centavos BRL) para precisão.
    """

    id: UUID
    company_id: UUID
    period: FiscalPeriod

    # Ativo
    ativo_total: Money
    ativo_circulante: Money
    caixa_equivalentes: Money
    estoques: Money

    # Passivo
    passivo_total: Money
    passivo_circulante: Money

    # Patrimônio Líquido
    patrimonio_liquido: Money

    # Dívida
    divida_curto_prazo: Money
    divida_longo_prazo: Money

    # Lucros Retidos
    lucros_retidos: Money

    def capital_de_giro(self) -> Money:
        """Capital de Giro = Ativo Circulante - Passivo Circulante."""
        return self.ativo_circulante - self.passivo_circulante

    def divida_liquida(self) -> Money:
        """Dívida Líquida = (Dívida CP + Dívida LP) - Caixa."""
        divida_bruta = Money(cents=self.divida_curto_prazo.cents + self.divida_longo_prazo.cents)
        return divida_bruta - self.caixa_equivalentes

    def liquidez_corrente(self) -> float:
        """Liquidez Corrente = Ativo Circulante / Passivo Circulante."""
        if self.passivo_circulante.is_zero():
            return float("inf")
        return self.ativo_circulante.cents / self.passivo_circulante.cents

    def liquidez_seca(self) -> float:
        """Liquidez Seca = (Ativo Circulante - Estoques) / Passivo Circulante."""
        if self.passivo_circulante.is_zero():
            return float("inf")
        return (self.ativo_circulante.cents - self.estoques.cents) / self.passivo_circulante.cents

    def liquidez_imediata(self) -> float:
        """Liquidez Imediata = Caixa / Passivo Circulante."""
        if self.passivo_circulante.is_zero():
            return float("inf")
        return self.caixa_equivalentes.cents / self.passivo_circulante.cents

    def endividamento_geral(self) -> float:
        """Endividamento Geral = Passivo Total / Ativo Total."""
        if self.ativo_total.is_zero():
            return 0.0
        return self.passivo_total.cents / self.ativo_total.cents

    def divida_sobre_patrimonio(self) -> float:
        """Dívida Bruta / Patrimônio Líquido (D/E ratio)."""
        if self.patrimonio_liquido.is_zero():
            return float("inf")
        divida_bruta = self.divida_curto_prazo.cents + self.divida_longo_prazo.cents
        return divida_bruta / self.patrimonio_liquido.cents
