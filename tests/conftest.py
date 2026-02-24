"""Fixtures globais para testes do BOT Assessor."""

import pytest


@pytest.fixture
def sample_balance_sheet_data() -> dict:
    """Dados de exemplo de balanço patrimonial para testes."""
    return {
        "ativo_total": 100_000_000_00,
        "ativo_circulante": 30_000_000_00,
        "passivo_total": 60_000_000_00,
        "passivo_circulante": 20_000_000_00,
        "patrimonio_liquido": 40_000_000_00,
        "caixa_equivalentes": 5_000_000_00,
        "estoques": 8_000_000_00,
        "divida_curto_prazo": 10_000_000_00,
        "divida_longo_prazo": 25_000_000_00,
        "lucros_retidos": 15_000_000_00,
    }


@pytest.fixture
def sample_income_statement_data() -> dict:
    """Dados de exemplo de DRE para testes."""
    return {
        "receita_liquida": 80_000_000_00,
        "custo_mercadorias": 50_000_000_00,
        "lucro_bruto": 30_000_000_00,
        "despesas_operacionais": 15_000_000_00,
        "ebit": 15_000_000_00,
        "resultado_financeiro": -5_000_000_00,
        "lucro_antes_ir": 10_000_000_00,
        "imposto_renda": 3_400_000_00,
        "lucro_liquido": 6_600_000_00,
        "depreciacao_amortizacao": 3_000_000_00,
        "fluxo_caixa_operacional": 9_600_000_00,
        "acoes_total": 1_000_000,
    }
