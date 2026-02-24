"""Domain Service BalanceSheetAnalyzer.

Implementa Piotroski F-Score, Altman Z''-Score (mercados emergentes)
e indicadores financeiros de liquidez, endividamento, rentabilidade e eficiência.

Stateless: toda a lógica depende apenas dos dados recebidos.
"""

from __future__ import annotations

from typing import Any

from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.income_statement import IncomeStatement
from src.domain.value_objects.ratio import Ratio


class BalanceSheetAnalyzer:
    """Serviço de domínio para análise de balanço patrimonial.

    Calcula scores e indicadores financeiros usando dados
    de balanço patrimonial (BP) e demonstração de resultado (DRE).
    """

    def calculate_piotroski_f_score(
        self,
        current_bs: BalanceSheet,
        current_dre: IncomeStatement,
        previous_bs: BalanceSheet,
        previous_dre: IncomeStatement,
    ) -> tuple[int, dict[str, Any]]:
        """Calcula o Piotroski F-Score (0-9).

        Score >= 7: empresa financeiramente forte.
        Score <= 3: empresa financeiramente fraca.

        Args:
            current_bs: Balanço patrimonial do período atual.
            current_dre: DRE do período atual.
            previous_bs: Balanço patrimonial do período anterior.
            previous_dre: DRE do período anterior.

        Returns:
            Tupla (score, detalhes) com o F-Score e critérios individuais.
        """
        details: dict[str, Any] = {}

        # 1. ROA positivo (Lucratividade)
        roa_current = current_dre.lucro_liquido.cents / current_bs.ativo_total.cents
        details["roa_positivo"] = roa_current > 0

        # 2. FCO positivo (Lucratividade)
        details["fco_positivo"] = current_dre.fluxo_caixa_operacional.cents > 0

        # 3. Delta ROA positivo (Lucratividade)
        roa_previous = previous_dre.lucro_liquido.cents / previous_bs.ativo_total.cents
        details["delta_roa_positivo"] = roa_current > roa_previous

        # 4. Qualidade dos lucros: FCO > Lucro Líquido (Lucratividade)
        details["qualidade_lucros"] = (
            current_dre.fluxo_caixa_operacional.cents > current_dre.lucro_liquido.cents
        )

        # 5. Redução de alavancagem: dívida LP / ativo total diminuiu (Alavancagem)
        alav_current = current_bs.divida_longo_prazo.cents / current_bs.ativo_total.cents
        alav_previous = previous_bs.divida_longo_prazo.cents / previous_bs.ativo_total.cents
        details["reducao_alavancagem"] = alav_current < alav_previous

        # 6. Melhora na liquidez corrente (Liquidez)
        lc_current = current_bs.liquidez_corrente()
        lc_previous = previous_bs.liquidez_corrente()
        details["melhora_liquidez"] = lc_current > lc_previous

        # 7. Sem diluição: não emitiu novas ações (Alavancagem)
        details["sem_diluicao"] = current_dre.acoes_total <= previous_dre.acoes_total

        # 8. Melhora na margem bruta (Eficiência)
        mb_current = current_dre.margem_bruta()
        mb_previous = previous_dre.margem_bruta()
        details["melhora_margem_bruta"] = mb_current > mb_previous

        # 9. Melhora no giro do ativo (Eficiência)
        ga_current = current_dre.receita_liquida.cents / current_bs.ativo_total.cents
        ga_previous = previous_dre.receita_liquida.cents / previous_bs.ativo_total.cents
        details["melhora_giro_ativo"] = ga_current > ga_previous

        score = sum(1 for v in details.values() if v is True)
        return score, details

    def calculate_altman_z_score(
        self,
        bs: BalanceSheet,
        dre: IncomeStatement,
    ) -> tuple[float, str]:
        """Calcula o Altman Z''-Score para mercados emergentes.

        Z'' = 3.25 + 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4

        Onde:
            X1 = Capital de Giro / Ativo Total
            X2 = Lucros Retidos / Ativo Total
            X3 = EBIT / Ativo Total
            X4 = Patrimônio Líquido / Passivo Total

        Zonas: > 2.6 SEGURA, 1.1-2.6 ZONA_CINZA, < 1.1 STRESS_FINANCEIRO.

        Args:
            bs: Balanço patrimonial.
            dre: Demonstração de resultado.

        Returns:
            Tupla (z_score, classificação).
        """
        ativo_total = bs.ativo_total.cents
        if ativo_total == 0:
            return 0.0, "STRESS_FINANCEIRO"

        x1 = bs.capital_de_giro().cents / ativo_total
        x2 = bs.lucros_retidos.cents / ativo_total
        x3 = dre.ebit.cents / ativo_total
        x4 = (
            bs.patrimonio_liquido.cents / bs.passivo_total.cents
            if bs.passivo_total.cents != 0
            else 0.0
        )

        z_score = 3.25 + 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4

        if z_score > 2.6:
            classification = "SEGURA"
        elif z_score > 1.1:
            classification = "ZONA_CINZA"
        else:
            classification = "STRESS_FINANCEIRO"

        return z_score, classification

    def calculate_financial_ratios(
        self,
        bs: BalanceSheet,
        dre: IncomeStatement,
    ) -> list[Ratio]:
        """Calcula indicadores financeiros completos.

        Inclui: rentabilidade, liquidez, endividamento, eficiência.

        Args:
            bs: Balanço patrimonial.
            dre: Demonstração de resultado.

        Returns:
            Lista de Ratio com todos os indicadores calculados.
        """
        ratios: list[Ratio] = []

        # === Rentabilidade ===
        # ROE = Lucro Líquido / Patrimônio Líquido
        roe = (
            dre.lucro_liquido.cents / bs.patrimonio_liquido.cents
            if bs.patrimonio_liquido.cents != 0
            else 0.0
        )
        ratios.append(Ratio(value=roe, name="ROE"))

        # ROA = Lucro Líquido / Ativo Total
        roa = (
            dre.lucro_liquido.cents / bs.ativo_total.cents
            if bs.ativo_total.cents != 0
            else 0.0
        )
        ratios.append(Ratio(value=roa, name="ROA"))

        # ROIC = NOPAT / Capital Investido
        tax_rate = (
            dre.imposto_renda.cents / dre.lucro_antes_ir.cents
            if dre.lucro_antes_ir.cents != 0
            else 0.34
        )
        nopat = dre.ebit.cents * (1 - tax_rate)
        capital_investido = (
            bs.patrimonio_liquido.cents
            + bs.divida_curto_prazo.cents
            + bs.divida_longo_prazo.cents
        )
        roic = nopat / capital_investido if capital_investido != 0 else 0.0
        ratios.append(Ratio(value=roic, name="ROIC"))

        # === Margens ===
        ratios.append(Ratio(value=dre.margem_bruta(), name="Margem Bruta"))
        ratios.append(Ratio(value=dre.margem_liquida(), name="Margem Líquida"))
        ratios.append(Ratio(value=dre.margem_ebit(), name="Margem EBIT"))
        ratios.append(Ratio(value=dre.margem_ebitda(), name="Margem EBITDA"))

        # === Liquidez ===
        ratios.append(Ratio(value=bs.liquidez_corrente(), name="Liquidez Corrente"))
        ratios.append(Ratio(value=bs.liquidez_seca(), name="Liquidez Seca"))
        ratios.append(Ratio(value=bs.liquidez_imediata(), name="Liquidez Imediata"))

        # === Endividamento ===
        ratios.append(Ratio(value=bs.endividamento_geral(), name="Endividamento Geral"))
        ratios.append(Ratio(value=bs.divida_sobre_patrimonio(), name="Dívida/PL"))

        # Dívida Líquida / EBITDA
        ebitda = dre.ebitda().cents
        dl_ebitda = bs.divida_liquida().cents / ebitda if ebitda != 0 else float("inf")
        ratios.append(Ratio(value=dl_ebitda, name="Dívida Líquida/EBITDA"))

        # === Eficiência ===
        giro_ativo = (
            dre.receita_liquida.cents / bs.ativo_total.cents
            if bs.ativo_total.cents != 0
            else 0.0
        )
        ratios.append(Ratio(value=giro_ativo, name="Giro do Ativo"))

        return ratios
