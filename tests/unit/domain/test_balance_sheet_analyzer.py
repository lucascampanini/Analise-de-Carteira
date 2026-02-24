"""Testes unitários para o Domain Service BalanceSheetAnalyzer.

Escola Detroit/Clássica: sem mocks, lógica pura de domínio.
Testa comportamento do Piotroski F-Score, Altman Z-Score e indicadores.
"""

import pytest
from uuid import uuid4

from src.domain.entities.balance_sheet import BalanceSheet
from src.domain.entities.income_statement import IncomeStatement
from src.domain.services.balance_sheet_analyzer import BalanceSheetAnalyzer
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.money import Money


def _make_bs(
    ativo_total: int = 100_000_000_00,
    ativo_circulante: int = 30_000_000_00,
    caixa_equivalentes: int = 5_000_000_00,
    estoques: int = 8_000_000_00,
    passivo_total: int = 60_000_000_00,
    passivo_circulante: int = 20_000_000_00,
    patrimonio_liquido: int = 40_000_000_00,
    divida_curto_prazo: int = 10_000_000_00,
    divida_longo_prazo: int = 25_000_000_00,
    lucros_retidos: int = 15_000_000_00,
    year: int = 2024,
) -> BalanceSheet:
    return BalanceSheet(
        id=uuid4(),
        company_id=uuid4(),
        period=FiscalPeriod(year=year, period_type=PeriodType.ANNUAL),
        ativo_total=Money(cents=ativo_total),
        ativo_circulante=Money(cents=ativo_circulante),
        caixa_equivalentes=Money(cents=caixa_equivalentes),
        estoques=Money(cents=estoques),
        passivo_total=Money(cents=passivo_total),
        passivo_circulante=Money(cents=passivo_circulante),
        patrimonio_liquido=Money(cents=patrimonio_liquido),
        divida_curto_prazo=Money(cents=divida_curto_prazo),
        divida_longo_prazo=Money(cents=divida_longo_prazo),
        lucros_retidos=Money(cents=lucros_retidos),
    )


def _make_dre(
    receita_liquida: int = 80_000_000_00,
    custo_mercadorias: int = 50_000_000_00,
    lucro_bruto: int = 30_000_000_00,
    despesas_operacionais: int = 15_000_000_00,
    ebit: int = 15_000_000_00,
    resultado_financeiro: int = -5_000_000_00,
    lucro_antes_ir: int = 10_000_000_00,
    imposto_renda: int = 3_400_000_00,
    lucro_liquido: int = 6_600_000_00,
    depreciacao_amortizacao: int = 3_000_000_00,
    fluxo_caixa_operacional: int = 9_600_000_00,
    acoes_total: int = 1_000_000,
    year: int = 2024,
) -> IncomeStatement:
    return IncomeStatement(
        id=uuid4(),
        company_id=uuid4(),
        period=FiscalPeriod(year=year, period_type=PeriodType.ANNUAL),
        receita_liquida=Money(cents=receita_liquida),
        custo_mercadorias=Money(cents=custo_mercadorias),
        lucro_bruto=Money(cents=lucro_bruto),
        despesas_operacionais=Money(cents=despesas_operacionais),
        ebit=Money(cents=ebit),
        resultado_financeiro=Money(cents=resultado_financeiro),
        lucro_antes_ir=Money(cents=lucro_antes_ir),
        imposto_renda=Money(cents=imposto_renda),
        lucro_liquido=Money(cents=lucro_liquido),
        depreciacao_amortizacao=Money(cents=depreciacao_amortizacao),
        fluxo_caixa_operacional=Money(cents=fluxo_caixa_operacional),
        acoes_total=acoes_total,
    )


class TestPiotroskiFScore:
    """Testes para cálculo do Piotroski F-Score (0-9)."""

    def test_perfect_score_for_excellent_company(self) -> None:
        """Empresa com todos os critérios positivos recebe score 9."""
        current_dre = _make_dre(
            lucro_liquido=6_600_000_00,
            fluxo_caixa_operacional=9_600_000_00,
            receita_liquida=80_000_000_00,
            lucro_bruto=30_000_000_00,
            acoes_total=1_000_000,
        )
        previous_dre = _make_dre(
            lucro_liquido=5_000_000_00,
            fluxo_caixa_operacional=7_000_000_00,
            receita_liquida=70_000_000_00,
            lucro_bruto=24_500_000_00,
            acoes_total=1_000_000,
            year=2023,
        )
        current_bs = _make_bs(
            ativo_total=100_000_000_00,
            ativo_circulante=30_000_000_00,
            passivo_circulante=18_000_000_00,
            divida_longo_prazo=20_000_000_00,
        )
        previous_bs = _make_bs(
            ativo_total=95_000_000_00,
            ativo_circulante=28_000_000_00,
            passivo_circulante=20_000_000_00,
            divida_longo_prazo=25_000_000_00,
            year=2023,
        )
        analyzer = BalanceSheetAnalyzer()

        score, details = analyzer.calculate_piotroski_f_score(
            current_bs, current_dre, previous_bs, previous_dre
        )

        assert score == 9

    def test_zero_score_for_weak_company(self) -> None:
        """Empresa com todos os critérios negativos recebe score 0."""
        current_dre = _make_dre(
            lucro_liquido=-2_000_000_00,
            fluxo_caixa_operacional=-5_000_000_00,
            receita_liquida=50_000_000_00,
            lucro_bruto=15_000_000_00,
            acoes_total=1_200_000,
        )
        previous_dre = _make_dre(
            lucro_liquido=1_000_000_00,
            fluxo_caixa_operacional=3_000_000_00,
            receita_liquida=60_000_000_00,
            lucro_bruto=21_000_000_00,
            acoes_total=1_000_000,
            year=2023,
        )
        current_bs = _make_bs(
            ativo_total=100_000_000_00,
            ativo_circulante=20_000_000_00,
            passivo_circulante=25_000_000_00,
            divida_longo_prazo=30_000_000_00,
        )
        previous_bs = _make_bs(
            ativo_total=95_000_000_00,
            ativo_circulante=22_000_000_00,
            passivo_circulante=20_000_000_00,
            divida_longo_prazo=25_000_000_00,
            year=2023,
        )
        analyzer = BalanceSheetAnalyzer()

        score, details = analyzer.calculate_piotroski_f_score(
            current_bs, current_dre, previous_bs, previous_dre
        )

        assert score == 0

    def test_roa_positive_scores_one_point(self) -> None:
        """ROA positivo = 1 ponto."""
        analyzer = BalanceSheetAnalyzer()
        current_dre = _make_dre(lucro_liquido=1000)
        current_bs = _make_bs(ativo_total=10000)

        roa = current_dre.lucro_liquido.cents / current_bs.ativo_total.cents

        assert roa > 0

    def test_details_contain_all_nine_criteria(self) -> None:
        """Detalhes retornam todas as 9 variáveis do Piotroski."""
        analyzer = BalanceSheetAnalyzer()
        current_bs = _make_bs()
        previous_bs = _make_bs(year=2023)
        current_dre = _make_dre()
        previous_dre = _make_dre(year=2023)

        _, details = analyzer.calculate_piotroski_f_score(
            current_bs, current_dre, previous_bs, previous_dre
        )

        expected_keys = {
            "roa_positivo",
            "fco_positivo",
            "delta_roa_positivo",
            "qualidade_lucros",
            "reducao_alavancagem",
            "melhora_liquidez",
            "sem_diluicao",
            "melhora_margem_bruta",
            "melhora_giro_ativo",
        }
        assert set(details.keys()) == expected_keys


class TestAltmanZScore:
    """Testes para cálculo do Altman Z''-Score (mercados emergentes)."""

    def test_safe_zone_for_healthy_company(self) -> None:
        """Empresa saudável fica na zona segura (Z'' > 2.6)."""
        bs = _make_bs(
            ativo_total=100_000_000_00,
            ativo_circulante=40_000_000_00,
            passivo_circulante=15_000_000_00,
            passivo_total=50_000_000_00,
            patrimonio_liquido=50_000_000_00,
            lucros_retidos=20_000_000_00,
        )
        dre = _make_dre(ebit=15_000_000_00)
        analyzer = BalanceSheetAnalyzer()

        z_score, classification = analyzer.calculate_altman_z_score(bs, dre)

        assert z_score > 2.6
        assert classification == "SEGURA"

    def test_distress_zone_for_troubled_company(self) -> None:
        """Empresa em dificuldade fica na zona de stress (Z'' < 1.1)."""
        bs = _make_bs(
            ativo_total=100_000_000_00,
            ativo_circulante=10_000_000_00,
            passivo_circulante=40_000_000_00,
            passivo_total=95_000_000_00,
            patrimonio_liquido=5_000_000_00,
            lucros_retidos=-10_000_000_00,
        )
        dre = _make_dre(ebit=-5_000_000_00)
        analyzer = BalanceSheetAnalyzer()

        z_score, classification = analyzer.calculate_altman_z_score(bs, dre)

        assert z_score < 1.1
        assert classification == "STRESS_FINANCEIRO"

    def test_grey_zone_for_moderate_company(self) -> None:
        """Empresa moderada fica na zona cinza (1.1 < Z'' < 2.6)."""
        bs = _make_bs(
            ativo_total=100_000_000_00,
            ativo_circulante=10_000_000_00,
            passivo_circulante=25_000_000_00,
            passivo_total=88_000_000_00,
            patrimonio_liquido=12_000_000_00,
            lucros_retidos=2_000_000_00,
        )
        dre = _make_dre(ebit=1_000_000_00)
        analyzer = BalanceSheetAnalyzer()

        z_score, classification = analyzer.calculate_altman_z_score(bs, dre)

        assert 1.1 < z_score < 2.6
        assert classification == "ZONA_CINZA"


class TestFinancialRatios:
    """Testes para cálculo de indicadores financeiros."""

    def test_calculates_roe(self) -> None:
        """ROE = Lucro Líquido / Patrimônio Líquido."""
        bs = _make_bs(patrimonio_liquido=40_000_000_00)
        dre = _make_dre(lucro_liquido=6_600_000_00)
        analyzer = BalanceSheetAnalyzer()

        ratios = analyzer.calculate_financial_ratios(bs, dre)

        roe = next(r for r in ratios if r.name == "ROE")
        assert roe.value == pytest.approx(0.165)  # 6.6M / 40M

    def test_calculates_roa(self) -> None:
        """ROA = Lucro Líquido / Ativo Total."""
        bs = _make_bs(ativo_total=100_000_000_00)
        dre = _make_dre(lucro_liquido=6_600_000_00)
        analyzer = BalanceSheetAnalyzer()

        ratios = analyzer.calculate_financial_ratios(bs, dre)

        roa = next(r for r in ratios if r.name == "ROA")
        assert roa.value == pytest.approx(0.066)  # 6.6M / 100M

    def test_calculates_roic(self) -> None:
        """ROIC = NOPAT / Capital Investido."""
        bs = _make_bs(
            patrimonio_liquido=40_000_000_00,
            divida_curto_prazo=10_000_000_00,
            divida_longo_prazo=25_000_000_00,
        )
        dre = _make_dre(ebit=15_000_000_00, imposto_renda=3_400_000_00, lucro_antes_ir=10_000_000_00)
        analyzer = BalanceSheetAnalyzer()

        ratios = analyzer.calculate_financial_ratios(bs, dre)

        roic = next(r for r in ratios if r.name == "ROIC")
        # NOPAT = EBIT * (1 - tax_rate), tax_rate = 3.4/10 = 0.34
        # NOPAT = 15M * 0.66 = 9.9M
        # Capital = PL + Dívida = 40M + 35M = 75M
        # ROIC = 9.9M / 75M = 0.132
        assert roic.value == pytest.approx(0.132)

    def test_calculates_divida_liquida_ebitda(self) -> None:
        """Dívida Líquida / EBITDA."""
        bs = _make_bs(
            divida_curto_prazo=10_000_000_00,
            divida_longo_prazo=25_000_000_00,
            caixa_equivalentes=5_000_000_00,
        )
        dre = _make_dre(ebit=15_000_000_00, depreciacao_amortizacao=3_000_000_00)
        analyzer = BalanceSheetAnalyzer()

        ratios = analyzer.calculate_financial_ratios(bs, dre)

        dl_ebitda = next(r for r in ratios if r.name == "Dívida Líquida/EBITDA")
        # DL = (10+25) - 5 = 30M, EBITDA = 15+3 = 18M
        # DL/EBITDA = 30/18 ≈ 1.667
        assert dl_ebitda.value == pytest.approx(1.6667, rel=1e-3)

    def test_calculates_giro_do_ativo(self) -> None:
        """Giro do Ativo = Receita Líquida / Ativo Total."""
        bs = _make_bs(ativo_total=100_000_000_00)
        dre = _make_dre(receita_liquida=80_000_000_00)
        analyzer = BalanceSheetAnalyzer()

        ratios = analyzer.calculate_financial_ratios(bs, dre)

        giro = next(r for r in ratios if r.name == "Giro do Ativo")
        assert giro.value == pytest.approx(0.8)

    def test_returns_all_key_ratios(self) -> None:
        """Retorna todos os indicadores-chave."""
        bs = _make_bs()
        dre = _make_dre()
        analyzer = BalanceSheetAnalyzer()

        ratios = analyzer.calculate_financial_ratios(bs, dre)

        ratio_names = {r.name for r in ratios}
        expected_names = {
            "ROE",
            "ROA",
            "ROIC",
            "Margem Bruta",
            "Margem Líquida",
            "Margem EBIT",
            "Margem EBITDA",
            "Liquidez Corrente",
            "Liquidez Seca",
            "Liquidez Imediata",
            "Endividamento Geral",
            "Dívida/PL",
            "Dívida Líquida/EBITDA",
            "Giro do Ativo",
        }
        assert expected_names.issubset(ratio_names)
