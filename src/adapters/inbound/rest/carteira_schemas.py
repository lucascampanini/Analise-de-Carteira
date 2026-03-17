"""Pydantic schemas para a API de análise de carteira."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CriarClienteRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255, description="Nome completo")
    cpf: str = Field(..., description="CPF com ou sem formatação")
    perfil: str = Field(..., description="CONSERVADOR, MODERADO ou ARROJADO")
    objetivo: str = Field(
        ...,
        description="PRESERVACAO_CAPITAL, RENDA_PASSIVA, CRESCIMENTO_PATRIMONIAL, APOSENTADORIA ou RESERVA_EMERGENCIA",
    )
    horizonte: str = Field(
        ..., description="CURTO_PRAZO, MEDIO_PRAZO ou LONGO_PRAZO"
    )
    tolerancia_perda_percentual: float = Field(
        ..., ge=0.0, le=100.0, description="% máximo de perda aceito"
    )


class CriarClienteResponse(BaseModel):
    cliente_id: str
    message: str = "Cliente cadastrado com sucesso."


class UploadExtratoResponse(BaseModel):
    analise_id: str
    status: str
    message: str


class RecomendacaoResponse(BaseModel):
    tipo: str
    ticker: str
    justificativa: str
    impacto_tributario: str
    prioridade: int
    percentual_sugerido: float | None


class PosicaoResponse(BaseModel):
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


class AnaliseCarteiraResponse(BaseModel):
    analise_id: str
    carteira_id: str
    cliente_id: str
    status: str
    data_referencia: str
    criada_em: str
    expira_em: str
    patrimonio_liquido: float
    percentual_rv: float | None
    percentual_rf: float | None
    alocacao_por_classe: dict[str, float]
    alocacao_por_setor: dict[str, float]
    alocacao_por_emissor: dict[str, float]
    hhi: float | None
    top5_ativos: list[dict]
    alertas_concentracao: list[str]
    volatilidade_anualizada: float | None
    cvar_95: float | None
    beta_ibovespa: float | None
    rentabilidade_carteira: float | None
    rentabilidade_cdi: float | None
    rentabilidade_ibov: float | None
    score_aderencia: float | None
    classificacao_aderencia: str | None
    precisa_rebalanceamento: bool
    recomendacoes: list[RecomendacaoResponse]
    posicoes: list[PosicaoResponse]
    mensagem_erro: str | None
