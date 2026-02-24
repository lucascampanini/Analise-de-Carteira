"""REST Controller para análise de balanço patrimonial.

Driving Adapter: traduz HTTP para Commands/Queries da Application Layer.
Nenhuma lógica de negócio aqui.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from src.adapters.inbound.rest.schemas import (
    AnalysisResponse,
    AnalyzeRequest,
    CompanyListItem,
    ComparisonResponse,
    ErrorResponse,
    RatioResponse,
)
from src.application.commands.analyze_company import AnalyzeCompanyBalanceSheet
from src.application.dto.analysis_dto import AnalysisResultDTO
from src.application.queries.get_analysis import (
    CompareCompanies,
    GetCompanyAnalysis,
    ListAnalyzedCompanies,
)
from src.config.container import Container
from src.domain.exceptions.domain_exceptions import (
    DomainException,
    InsufficientDataError,
)
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.ticker import Ticker

router = APIRouter(prefix="/api/v1/analysis", tags=["analysis"])


def _dto_to_response(dto: AnalysisResultDTO) -> AnalysisResponse:
    """Converte Application DTO para response schema."""
    return AnalysisResponse(
        company_name=dto.company_name,
        ticker=dto.ticker,
        period=dto.period,
        status=dto.status,
        piotroski_score=dto.piotroski_score,
        piotroski_classification=dto.piotroski_classification,
        piotroski_details=dto.piotroski_details,
        altman_z_score=dto.altman_z_score,
        altman_classification=dto.altman_classification,
        ratios=[
            RatioResponse(name=r.name, value=r.value, percentage=r.percentage)
            for r in dto.ratios
        ],
        created_at=dto.created_at,
    )


async def _get_container(request: Request) -> Container:
    """Obtém container com sessão para o request atual."""
    session_factory = request.app.state.session_factory
    settings = request.app.state.settings
    session = session_factory()
    return Container(settings=settings, session=session)


@router.post(
    "/analyze",
    status_code=status.HTTP_202_ACCEPTED,
    responses={422: {"model": ErrorResponse}},
)
async def analyze_company(request: Request, body: AnalyzeRequest) -> dict[str, str]:
    """Solicita análise de balanço patrimonial de uma empresa."""
    container = await _get_container(request)
    try:
        period_type = PeriodType(body.period_type)
        command = AnalyzeCompanyBalanceSheet(
            ticker=Ticker(body.ticker),
            period=FiscalPeriod(
                year=body.year,
                period_type=period_type,
                quarter=body.quarter,
            ),
            idempotency_key=body.idempotency_key,
        )
        await container.analyze_company_handler.handle(command)
        return {"status": "accepted", "message": f"Análise de {body.ticker} iniciada."}
    except InsufficientDataError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except (ValueError, DomainException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{ticker}/{year}",
    response_model=AnalysisResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_analysis(request: Request, ticker: str, year: int) -> AnalysisResponse:
    """Obtém resultado da análise de uma empresa em um período."""
    container = await _get_container(request)
    query = GetCompanyAnalysis(
        ticker=Ticker(ticker),
        period=FiscalPeriod(year=year, period_type=PeriodType.ANNUAL),
    )
    result = await container.get_analysis_handler.handle(query)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Análise não encontrada para {ticker}/{year}.",
        )
    return _dto_to_response(result)


@router.get("/companies", response_model=list[CompanyListItem])
async def list_companies(request: Request) -> list[CompanyListItem]:
    """Lista todas as empresas com análises concluídas."""
    container = await _get_container(request)
    query = ListAnalyzedCompanies()
    results = await container.list_analyzed_companies_handler.handle(query)
    return [
        CompanyListItem(
            ticker=r.ticker,
            company_name=r.company_name,
            latest_period=r.latest_period,
            piotroski_score=r.piotroski_score,
            altman_classification=r.altman_classification,
        )
        for r in results
    ]


@router.get(
    "/compare/{year}",
    response_model=ComparisonResponse,
)
async def compare_companies(request: Request, year: int, tickers: str) -> ComparisonResponse:
    """Compara análises de múltiplas empresas (tickers separados por vírgula)."""
    container = await _get_container(request)
    ticker_list = [Ticker(t.strip()) for t in tickers.split(",")]
    query = CompareCompanies(
        tickers=tuple(ticker_list),
        period=FiscalPeriod(year=year, period_type=PeriodType.ANNUAL),
    )
    result = await container.compare_companies_handler.handle(query)
    return ComparisonResponse(
        companies=[_dto_to_response(c) for c in result.companies],
        period=result.period,
    )
