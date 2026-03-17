"""DTOs para análise de carteira."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class PosicaoDTO:
    """DTO de posição de ativo."""

    ticker: str
    nome: str
    classe: str
    setor: str
    emissor: str
    quantidade: float
    preco_medio: float
    valor_atual: float
    percentual_pl: float
    rentabilidade_percentual: float
    lucro_prejuizo: float

    # ── Renda Fixa / Crédito Privado (None para ativos RV) ───────────────
    subtipo_rf: str | None = None            # ex: "CDB", "LCI", "Tesouro IPCA+"
    taxa_rf: str | None = None               # formatada: "120% CDI", "IPCA+5,50% a.a."
    data_vencimento_rf: str | None = None    # "DD/MM/YYYY"
    dias_ate_vencimento: int | None = None
    liquidez_rf: str | None = None           # "DIARIA", "NO_VENCIMENTO", etc.
    coberto_fgc: bool | None = None
    isento_ir: bool | None = None
    aliquota_ir: float | None = None         # % atual (ex: 15.0)
    rating: str | None = None               # "AA+ (S&P)"
    cnpj_emissor: str | None = None
    alertas_rf: list[str] = field(default_factory=list)

    # ── Alavancagem (None para FII, ETF, RF, Cripto, Fundo) ──────────────
    alavancagem: dict | None = None
    # dict keys: divida_liquida_ebitda, divida_bruta_pl, cobertura_juros,
    #            divida_liquida_milhoes, ebitda_milhoes, nivel_risco, alertas, data_referencia


@dataclass(frozen=True)
class RecomendacaoDTO:
    """DTO de recomendação de rebalanceamento."""

    tipo: str
    ticker: str
    justificativa: str
    impacto_tributario: str
    prioridade: int
    percentual_sugerido: float | None


@dataclass(frozen=True)
class AnaliseCarteiraDTO:
    """DTO com resultado completo da análise de carteira."""

    analise_id: str
    carteira_id: str
    cliente_id: str
    status: str
    data_referencia: str
    criada_em: str
    expira_em: str

    # Patrimônio
    patrimonio_liquido: float

    # Alocação
    percentual_rv: float | None
    percentual_rf: float | None
    alocacao_por_classe: dict[str, float]
    alocacao_por_setor: dict[str, float]
    alocacao_por_emissor: dict[str, float]

    # Concentração
    hhi: float | None
    top5_ativos: list[dict]
    alertas_concentracao: list[str]

    # Risco
    volatilidade_anualizada: float | None
    cvar_95: float | None
    beta_ibovespa: float | None

    # Performance
    rentabilidade_carteira: float | None
    rentabilidade_cdi: float | None
    rentabilidade_ibov: float | None

    # Score e recomendações
    score_aderencia: float | None
    classificacao_aderencia: str | None
    precisa_rebalanceamento: bool
    recomendacoes: list[RecomendacaoDTO]

    # Posições
    posicoes: list[PosicaoDTO] = field(default_factory=list)

    # Erro
    mensagem_erro: str | None = None


@dataclass(frozen=True)
class AnaliseCarteiraRelatorioDTO:
    """DTO enriquecido para geração do relatório PDF."""

    # Dados do cliente
    cliente_nome: str
    cliente_cpf: str
    cliente_perfil: str
    cliente_objetivo: str
    cliente_horizonte: str

    # Dados da análise
    analise: AnaliseCarteiraDTO
    data_geracao: str
    data_referencia: str
