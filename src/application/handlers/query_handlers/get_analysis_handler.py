"""Query Handlers para consulta de análises financeiras.

Queries são side-effect free. Um handler por Query.
"""

from __future__ import annotations

from src.application.dto.analysis_dto import (
    AnalysisResultDTO,
    CompanyListItemDTO,
    ComparisonDTO,
    RatioDTO,
)
from src.application.ports.outbound.analysis_repository import AnalysisRepository
from src.application.ports.outbound.company_repository import CompanyRepository
from src.application.queries.get_analysis import (
    CompareCompanies,
    GetCompanyAnalysis,
    ListAnalyzedCompanies,
)
from src.domain.entities.financial_analysis import FinancialAnalysis


def _analysis_to_dto(analysis: FinancialAnalysis, company_name: str, ticker: str) -> AnalysisResultDTO:
    """Converte entidade FinancialAnalysis para DTO."""
    if analysis.piotroski_score is not None:
        if analysis.piotroski_score >= 7:
            piotroski_class = "FORTE"
        elif analysis.piotroski_score <= 3:
            piotroski_class = "FRACO"
        else:
            piotroski_class = "NEUTRO"
    else:
        piotroski_class = "N/A"

    return AnalysisResultDTO(
        company_name=company_name,
        ticker=ticker,
        period=analysis.period.label,
        status=analysis.status.value,
        piotroski_score=analysis.piotroski_score,
        piotroski_classification=piotroski_class,
        piotroski_details=analysis.piotroski_details,
        altman_z_score=analysis.altman_z_score,
        altman_classification=analysis.altman_classification,
        ratios=[
            RatioDTO(name=r.name, value=r.value, percentage=r.as_percentage())
            for r in analysis.ratios
        ],
        created_at=analysis.created_at,
    )


class GetCompanyAnalysisHandler:
    """Handler para a query GetCompanyAnalysis."""

    def __init__(
        self,
        company_repository: CompanyRepository,
        analysis_repository: AnalysisRepository,
    ) -> None:
        self._company_repo = company_repository
        self._analysis_repo = analysis_repository

    async def handle(self, query: GetCompanyAnalysis) -> AnalysisResultDTO | None:
        """Busca análise de uma empresa em um período.

        Returns:
            AnalysisResultDTO ou None se não encontrada.
        """
        company = await self._company_repo.find_by_ticker(query.ticker)
        if company is None:
            return None

        analysis = await self._analysis_repo.find_by_company_and_period(
            company.id, query.period
        )
        if analysis is None:
            return None

        return _analysis_to_dto(analysis, company.name, company.ticker.symbol)


class ListAnalyzedCompaniesHandler:
    """Handler para a query ListAnalyzedCompanies."""

    def __init__(
        self,
        company_repository: CompanyRepository,
        analysis_repository: AnalysisRepository,
    ) -> None:
        self._company_repo = company_repository
        self._analysis_repo = analysis_repository

    async def handle(self, query: ListAnalyzedCompanies) -> list[CompanyListItemDTO]:
        """Lista todas as empresas com análises concluídas."""
        analyses = await self._analysis_repo.list_all_latest()
        result: list[CompanyListItemDTO] = []

        for analysis in analyses:
            company = await self._company_repo.find_by_id(analysis.company_id)
            if company is None:
                continue
            result.append(
                CompanyListItemDTO(
                    ticker=company.ticker.symbol,
                    company_name=company.name,
                    latest_period=analysis.period.label,
                    piotroski_score=analysis.piotroski_score,
                    altman_classification=analysis.altman_classification,
                )
            )

        return result


class CompareCompaniesHandler:
    """Handler para a query CompareCompanies."""

    def __init__(
        self,
        company_repository: CompanyRepository,
        analysis_repository: AnalysisRepository,
    ) -> None:
        self._company_repo = company_repository
        self._analysis_repo = analysis_repository

    async def handle(self, query: CompareCompanies) -> ComparisonDTO:
        """Compara análises de múltiplas empresas no mesmo período."""
        companies_data: list[AnalysisResultDTO] = []

        for ticker in query.tickers:
            company = await self._company_repo.find_by_ticker(ticker)
            if company is None:
                continue

            analysis = await self._analysis_repo.find_by_company_and_period(
                company.id, query.period
            )
            if analysis is None:
                continue

            companies_data.append(
                _analysis_to_dto(analysis, company.name, company.ticker.symbol)
            )

        return ComparisonDTO(companies=companies_data, period=query.period.label)
