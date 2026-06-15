"""DTOs para ArgumentoVenda — resposta da query GerarArgumentoVenda."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SpinQuestoesDTO:
    """As 4 categorias de perguntas SPIN para uma recomendação."""

    situation: list[str]
    problem: list[str]
    implication: list[str]
    need_payoff: list[str]


@dataclass(frozen=True)
class ObjecaoRespostaDTO:
    """Par objeção provável + resposta estruturada."""

    objecao: str
    resposta: str


@dataclass(frozen=True)
class ArgumentoVendaDTO:
    """DTO com argumento de venda completo via SPIN para uma recomendação."""

    recomendacao_id: str
    tipo_recomendacao: str
    ticker: str
    justificativa: str

    # SPIN
    spin: SpinQuestoesDTO

    # Challenger Sale
    challenger_reframe: str

    # Materiais prontos
    script_whatsapp: str
    objecoes_previstas: list[ObjecaoRespostaDTO]

    # Dados quantitativos de apoio
    dados_quantitativos: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ArgumentosVendaAnaliseDTO:
    """DTO com todos os argumentos SPIN para uma análise completa."""

    analise_id: str
    cliente_nome: str
    perfil_investidor: str
    total_recomendacoes: int
    argumentos: list[ArgumentoVendaDTO]
