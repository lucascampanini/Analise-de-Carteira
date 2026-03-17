"""Entity AnaliseCarteira - Aggregate Root para análise de carteira."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from uuid import UUID

from src.domain.entities.recomendacao import Recomendacao
from src.domain.exceptions.domain_exceptions import InvalidEntityError


class StatusAnalise(str, Enum):
    """Status do processamento da análise."""

    PENDENTE = "PENDENTE"
    PROCESSANDO = "PROCESSANDO"
    CONCLUIDA = "CONCLUIDA"
    ERRO = "ERRO"


@dataclass
class AnaliseCarteira:
    """Resultado da análise de uma carteira de investimentos (Aggregate Root).

    Referencia Carteira e Cliente apenas por ID.
    A análise expira em 24 horas (dados de mercado mudam).

    Args:
        id: Identificador único.
        carteira_id: ID da carteira analisada.
        cliente_id: ID do cliente proprietário.
        data_referencia: Data de referência dos dados.
        status: Status atual do processamento.
        criada_em: Data/hora de criação.
        expira_em: Data/hora de expiração (24h após criação).
    """

    id: UUID
    carteira_id: UUID
    cliente_id: UUID
    data_referencia: datetime
    status: StatusAnalise = StatusAnalise.PENDENTE
    criada_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expira_em: datetime = field(init=False)

    # Métricas de alocação
    percentual_rv: float | None = None
    percentual_rf: float | None = None
    alocacao_por_classe: dict[str, float] = field(default_factory=dict)
    alocacao_por_setor: dict[str, float] = field(default_factory=dict)
    alocacao_por_emissor: dict[str, float] = field(default_factory=dict)

    # Métricas de concentração
    hhi: float | None = None
    top5_ativos: list[dict] = field(default_factory=list)
    alertas_concentracao: list[str] = field(default_factory=list)

    # Métricas de risco
    volatilidade_anualizada: float | None = None
    cvar_95: float | None = None
    beta_ibovespa: float | None = None

    # Métricas de performance
    rentabilidade_carteira: float | None = None
    rentabilidade_cdi: float | None = None
    rentabilidade_ibov: float | None = None

    # Score e recomendações
    score_aderencia: float | None = None
    recomendacoes: list[Recomendacao] = field(default_factory=list)

    # Alavancagem por empresa (ACAO/BDR): ticker → dict de IndicadoresAlavancagem serializado
    alavancagem_por_ticker: dict[str, dict] = field(default_factory=dict)

    # Mensagem de erro (se status == ERRO)
    mensagem_erro: str | None = None

    def __post_init__(self) -> None:
        self.expira_em = self.criada_em + timedelta(hours=24)

    @property
    def esta_expirada(self) -> bool:
        """Verifica se a análise está expirada (> 24h)."""
        return datetime.now(timezone.utc) > self.expira_em

    @property
    def esta_concluida(self) -> bool:
        """Verifica se a análise foi concluída com sucesso."""
        return self.status == StatusAnalise.CONCLUIDA

    @property
    def precisa_rebalanceamento(self) -> bool:
        """Verifica se a carteira precisa de rebalanceamento (score < 70)."""
        if self.score_aderencia is None:
            return False
        return self.score_aderencia < 70.0

    def iniciar_processamento(self) -> None:
        """Marca a análise como em processamento."""
        self.status = StatusAnalise.PROCESSANDO

    def concluir(
        self,
        *,
        percentual_rv: float,
        percentual_rf: float,
        alocacao_por_classe: dict[str, float],
        alocacao_por_setor: dict[str, float],
        alocacao_por_emissor: dict[str, float],
        hhi: float,
        top5_ativos: list[dict],
        alertas_concentracao: list[str],
        volatilidade_anualizada: float | None,
        cvar_95: float | None,
        beta_ibovespa: float | None,
        rentabilidade_carteira: float | None,
        rentabilidade_cdi: float | None,
        rentabilidade_ibov: float | None,
        score_aderencia: float,
        recomendacoes: list[Recomendacao],
        alavancagem_por_ticker: dict[str, dict] | None = None,
    ) -> None:
        """Preenche os resultados e marca a análise como concluída."""
        self.percentual_rv = percentual_rv
        self.percentual_rf = percentual_rf
        self.alocacao_por_classe = alocacao_por_classe
        self.alocacao_por_setor = alocacao_por_setor
        self.alocacao_por_emissor = alocacao_por_emissor
        self.hhi = hhi
        self.top5_ativos = top5_ativos
        self.alertas_concentracao = alertas_concentracao
        self.volatilidade_anualizada = volatilidade_anualizada
        self.cvar_95 = cvar_95
        self.beta_ibovespa = beta_ibovespa
        self.rentabilidade_carteira = rentabilidade_carteira
        self.rentabilidade_cdi = rentabilidade_cdi
        self.rentabilidade_ibov = rentabilidade_ibov
        self.score_aderencia = score_aderencia
        self.recomendacoes = recomendacoes
        self.alavancagem_por_ticker = alavancagem_por_ticker or {}
        self.status = StatusAnalise.CONCLUIDA

    def marcar_erro(self, mensagem: str) -> None:
        """Marca a análise como erro com a mensagem de falha."""
        self.mensagem_erro = mensagem
        self.status = StatusAnalise.ERRO
