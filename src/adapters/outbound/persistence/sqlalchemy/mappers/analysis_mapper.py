"""Mappers: Domain Entity <-> ORM Model.

Converte entre entidades de domínio e modelos ORM do SQLAlchemy.
"""

from __future__ import annotations

from uuid import UUID

from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import (
    CompanyModel,
    FinancialAnalysisModel,
)
from src.domain.entities.company import Company
from src.domain.entities.financial_analysis import AnalysisStatus, FinancialAnalysis
from src.domain.value_objects.cnpj import CNPJ
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.ratio import Ratio
from src.domain.value_objects.ticker import Ticker


class CompanyMapper:
    """Mapper entre Company (domain) e CompanyModel (ORM)."""

    @staticmethod
    def to_model(entity: Company) -> CompanyModel:
        return CompanyModel(
            id=str(entity.id),
            name=entity.name,
            ticker=entity.ticker.symbol,
            cnpj=entity.cnpj.number,
            sector=entity.sector,
            cvm_code=entity.cvm_code,
            subsector=entity.subsector,
            segment=entity.segment,
        )

    @staticmethod
    def to_entity(model: CompanyModel) -> Company:
        return Company(
            id=UUID(model.id),
            name=model.name,
            ticker=Ticker(model.ticker),
            cnpj=CNPJ(model.cnpj),
            sector=model.sector,
            cvm_code=model.cvm_code,
            subsector=model.subsector or "",
            segment=model.segment or "",
        )


class AnalysisMapper:
    """Mapper entre FinancialAnalysis (domain) e FinancialAnalysisModel (ORM)."""

    @staticmethod
    def to_model(
        entity: FinancialAnalysis, idempotency_key: str | None = None
    ) -> FinancialAnalysisModel:
        ratios_data = [
            {"name": r.name, "value": r.value} for r in entity.ratios
        ] if entity.ratios else None

        return FinancialAnalysisModel(
            id=str(entity.id),
            company_id=str(entity.company_id),
            period_year=entity.period.year,
            period_type=entity.period.period_type.value,
            period_quarter=entity.period.quarter,
            status=entity.status.value,
            created_at=entity.created_at,
            piotroski_score=entity.piotroski_score,
            piotroski_details=entity.piotroski_details or None,
            altman_z_score=entity.altman_z_score,
            altman_classification=entity.altman_classification,
            ratios=ratios_data,
            idempotency_key=idempotency_key,
        )

    @staticmethod
    def to_entity(model: FinancialAnalysisModel) -> FinancialAnalysis:
        period_type = PeriodType(model.period_type)
        period = FiscalPeriod(
            year=model.period_year,
            period_type=period_type,
            quarter=model.period_quarter,
        )

        ratios = []
        if model.ratios:
            for r in model.ratios:
                ratios.append(Ratio(value=r["value"], name=r["name"]))

        analysis = FinancialAnalysis(
            id=UUID(model.id),
            company_id=UUID(model.company_id),
            period=period,
            status=AnalysisStatus(model.status),
            created_at=model.created_at,
            piotroski_score=model.piotroski_score,
            piotroski_details=model.piotroski_details or {},
            altman_z_score=model.altman_z_score,
            altman_classification=model.altman_classification,
            ratios=ratios,
        )

        return analysis
