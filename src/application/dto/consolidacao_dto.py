"""DTOs para o use case ConsolidarCarteiras."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ResumoIndexadorDTO:
    indexador: str
    total: float
    percentual: float   # 0.0–1.0


@dataclass(frozen=True)
class FluxoCaixaDTO:
    data: str           # "YYYY-MM-DD"
    ativo: str
    conta: str
    evento: str
    valor_bruto: float
    aliquota_ir: float
    valor_liquido: float
    ir_isento: bool
    acumulado_reinvest: float


@dataclass(frozen=True)
class ProjecaoAnoDTO:
    ano: int
    total_rf_fundos: float
    total_acoes: float
    total_geral: float
    variacao_vs_hoje: float     # percentual decimal (ex: 0.17 = 17%)
    retorno_medio_aa: float     # CAGR desde data_base
    reinvestimento_acumulado: float


@dataclass(frozen=True)
class CenarioDTO:
    nome: str
    delta_cdi: float            # p.p. (ex: +0.5)
    delta_ipca: float           # p.p. (ex: -0.5)
    patrimonio_por_ano: dict[int, float]
    patrimonio_final: float     # no último ano da projeção
    ganho_absoluto: float
    retorno_total: float        # decimal
    cagr: float                 # decimal


@dataclass(frozen=True)
class AtivoRFResumoDTO:
    """Resumo de um ativo RF para exibição nas abas da planilha."""
    nome: str
    conta: str
    tipo: str
    indexador: str
    taxa_formatada: str
    data_aplicacao: str | None
    data_vencimento: str | None
    posicao: float
    ir_isento: bool
    nota: str


@dataclass(frozen=True)
class AcaoResumoDTO:
    ticker: str
    nome: str
    conta: str
    qtd: int
    ultimo_preco: float
    posicao: float
    percentual_carteira: float


@dataclass(frozen=True)
class ConsolidacaoDTO:
    """Resultado completo da consolidação de carteiras.

    Produzido por ConsolidarCarteirasHandler e consumido por:
    - OpenpyxlExcelGenerator (gera o .xlsx)
    - REST endpoint (retorna como download)
    """
    data_referencia: str            # "YYYY-MM-DD"
    fonte_premissas: str            # "BCB Focus 06/03/2026"
    cdi_atual_aa: float             # CDI vigente em % a.a.
    total_rf_fundos: float
    total_acoes: float
    total_geral: float
    resumo_por_indexador: list[ResumoIndexadorDTO]
    ativos_rf: list[AtivoRFResumoDTO]
    acoes: list[AcaoResumoDTO]
    fluxos_caixa: list[FluxoCaixaDTO]
    projecao_por_ano: list[ProjecaoAnoDTO]
    cenarios: list[CenarioDTO]
    anos_projecao: list[int]
