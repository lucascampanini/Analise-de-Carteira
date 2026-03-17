"""ORM Models SQLAlchemy.

ORM models NÃO são domain entities! Usar mappers para converter.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, BigInteger, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base para todos os ORM models."""

    pass


class CompanyModel(Base):
    """ORM model para Company."""

    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, unique=True, index=True)
    cnpj: Mapped[str] = mapped_column(String(14), nullable=False)
    sector: Mapped[str] = mapped_column(String(100), nullable=False)
    cvm_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    subsector: Mapped[str] = mapped_column(String(100), default="")
    segment: Mapped[str] = mapped_column(String(100), default="")


class FinancialAnalysisModel(Base):
    """ORM model para FinancialAnalysis."""

    __tablename__ = "financial_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)
    period_quarter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    piotroski_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    piotroski_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    altman_z_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    altman_classification: Mapped[str | None] = mapped_column(String(30), nullable=True)

    ratios: Mapped[list | None] = mapped_column(JSON, nullable=True)

    idempotency_key: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True, index=True
    )


class ClienteModel(Base):
    """ORM model para Cliente."""

    __tablename__ = "clientes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf: Mapped[str] = mapped_column(String(11), nullable=False, unique=True, index=True)
    perfil: Mapped[str] = mapped_column(String(20), nullable=False)
    objetivo: Mapped[str] = mapped_column(String(50), nullable=False)
    horizonte: Mapped[str] = mapped_column(String(20), nullable=False)
    tolerancia_perda_percentual: Mapped[float] = mapped_column(Float, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class CarteiraModel(Base):
    """ORM model para Carteira."""

    __tablename__ = "carteiras"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    cliente_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    data_referencia: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    origem_arquivo: Mapped[str] = mapped_column(String(255), nullable=False)
    posicoes_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    criada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AnaliseCarteiraModel(Base):
    """ORM model para AnaliseCarteira."""

    __tablename__ = "analises_carteira"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    carteira_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    cliente_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    data_referencia: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDENTE")
    criada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Alocação
    percentual_rv: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentual_rf: Mapped[float | None] = mapped_column(Float, nullable=True)
    alocacao_por_classe: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    alocacao_por_setor: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    alocacao_por_emissor: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Concentração
    hhi: Mapped[float | None] = mapped_column(Float, nullable=True)
    top5_ativos: Mapped[list | None] = mapped_column(JSON, nullable=True)
    alertas_concentracao: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Risco
    volatilidade_anualizada: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvar_95: Mapped[float | None] = mapped_column(Float, nullable=True)
    beta_ibovespa: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Performance
    rentabilidade_carteira: Mapped[float | None] = mapped_column(Float, nullable=True)
    rentabilidade_cdi: Mapped[float | None] = mapped_column(Float, nullable=True)
    rentabilidade_ibov: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Score e recomendações
    score_aderencia: Mapped[float | None] = mapped_column(Float, nullable=True)
    recomendacoes_json: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Erro
    mensagem_erro: Mapped[str | None] = mapped_column(Text, nullable=True)
