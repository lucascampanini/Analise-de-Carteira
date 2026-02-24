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
