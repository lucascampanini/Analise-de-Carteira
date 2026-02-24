"""Entity IncomeStatement - Demonstração de Resultado do Exercício (DRE)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.domain.value_objects.fiscal_period import FiscalPeriod
from src.domain.value_objects.money import Money


@dataclass
class IncomeStatement:
    """Demonstração de Resultado do Exercício (DRE).

    Dados estruturados conforme plano de contas CVM.
    """

    id: UUID
    company_id: UUID
    period: FiscalPeriod

    receita_liquida: Money
    custo_mercadorias: Money
    lucro_bruto: Money
    despesas_operacionais: Money
    ebit: Money
    resultado_financeiro: Money
    lucro_antes_ir: Money
    imposto_renda: Money
    lucro_liquido: Money
    depreciacao_amortizacao: Money
    fluxo_caixa_operacional: Money
    acoes_total: int

    def margem_bruta(self) -> float:
        """Margem Bruta = Lucro Bruto / Receita Líquida."""
        if self.receita_liquida.is_zero():
            return 0.0
        return self.lucro_bruto.cents / self.receita_liquida.cents

    def margem_liquida(self) -> float:
        """Margem Líquida = Lucro Líquido / Receita Líquida."""
        if self.receita_liquida.is_zero():
            return 0.0
        return self.lucro_liquido.cents / self.receita_liquida.cents

    def margem_ebit(self) -> float:
        """Margem EBIT = EBIT / Receita Líquida."""
        if self.receita_liquida.is_zero():
            return 0.0
        return self.ebit.cents / self.receita_liquida.cents

    def ebitda(self) -> Money:
        """EBITDA = EBIT + Depreciação e Amortização."""
        return Money(cents=self.ebit.cents + self.depreciacao_amortizacao.cents)

    def margem_ebitda(self) -> float:
        """Margem EBITDA = EBITDA / Receita Líquida."""
        if self.receita_liquida.is_zero():
            return 0.0
        return self.ebitda().cents / self.receita_liquida.cents

    def lpa(self) -> Money:
        """Lucro por Ação (LPA) = Lucro Líquido / Ações Total."""
        if self.acoes_total == 0:
            return Money(cents=0)
        return Money(cents=round(self.lucro_liquido.cents / self.acoes_total))
