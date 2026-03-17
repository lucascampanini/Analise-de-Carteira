"""Command ConsolidarCarteiras - consolida N carteiras em um relatório Excel."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AtivoRFInput:
    """Input de um ativo de Renda Fixa ou Fundo para consolidação."""
    nome: str
    conta: str
    tipo: str                       # "CDB", "Tesouro IPCA", "Fundo CDI", "CRI", etc.
    indexador: str                  # "CDI" | "IPCA" | "Pre" | "Multi" | "RV"
    posicao: float                  # valor atual em R$
    ir_isento: bool
    pmt_tipo: str                   # "bullet" | "semestral"
    taxa: float | None = None       # % CDI, spread IPCA ou taxa pré. None = estimativa
    pmt_meses: tuple[int, ...] = ()  # ex: (2, 8) para NTN-B. Vazio = bullet
    ntnb_coupon_flag: bool = False  # True = NTN-B 6% real (cupom 2.9563%/sem)
    data_aplicacao: str | None = None    # "YYYY-MM-DD"
    data_vencimento: str | None = None   # "YYYY-MM-DD"
    face: float | None = None           # valor de face (LTN = R$ 1.000)
    preco_unitario: float | None = None  # preço unitário atual (para YTM implícito)
    nota: str = ""


@dataclass(frozen=True)
class AcaoInput:
    """Input de uma ação para o quadro de renda variável."""
    ticker: str
    nome: str
    conta: str
    qtd: int
    ultimo_preco: float
    posicao: float


@dataclass(frozen=True)
class CenarioInput:
    """Definição de um cenário de análise de sensibilidade."""
    nome: str
    delta_cdi: float    # ajuste em pontos percentuais (ex: +0.5)
    delta_ipca: float   # ajuste em pontos percentuais (ex: -0.5)


# Cenários padrão: BASE, OTIMISTA, PESSIMISTA, STRESS
CENARIOS_PADRAO: tuple[CenarioInput, ...] = (
    CenarioInput("BASE (Focus BCB)",    delta_cdi=0.0,  delta_ipca=0.0),
    CenarioInput("OTIMISTA",            delta_cdi=+0.5, delta_ipca=-0.5),
    CenarioInput("PESSIMISTA",          delta_cdi=-1.0, delta_ipca=+1.5),
    CenarioInput("STRESS (juros altos)", delta_cdi=+2.0, delta_ipca=+2.0),
)


@dataclass(frozen=True)
class ConsolidarCarteiras:
    """Command para gerar consolidação e projeção de N carteiras de clientes.

    Produz um ConsolidacaoDTO com:
    - Posição consolidada por indexador
    - Fluxo de caixa RF com reinvestimento a 100% CDI
    - Projeção anual 2026–2031 com taxas Focus
    - Análise de cenários (BASE, OTIMISTA, PESSIMISTA, STRESS)
    - Quadro de ações separado

    Idempotency_key obrigatório (CQRS rule).
    """
    ativos_rf: tuple[AtivoRFInput, ...]
    acoes: tuple[AcaoInput, ...]
    idempotency_key: str
    anos_projecao: tuple[int, ...] = (2026, 2027, 2028, 2029, 2030, 2031)
    cenarios: tuple[CenarioInput, ...] = CENARIOS_PADRAO
    usar_focus_api: bool = True

    def __post_init__(self) -> None:
        if not self.idempotency_key.strip():
            raise ValueError("ConsolidarCarteiras: idempotency_key é obrigatória.")
        if not self.ativos_rf and not self.acoes:
            raise ValueError("ConsolidarCarteiras: ao menos um ativo é necessário.")
        if not self.anos_projecao:
            raise ValueError("ConsolidarCarteiras: anos_projecao não pode ser vazio.")
