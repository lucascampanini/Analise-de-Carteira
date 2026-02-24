"""Composition Root: Dependency Injection Container.

ÚNICO lugar com dependências concretas.
Pure DI: sem framework de container, apenas instanciação explícita.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.market_data.brapi_data_provider import BrapiDataProvider
from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_company_repository import (
    SqlAlchemyCompanyRepository,
)
from src.application.handlers.command_handlers.analyze_company_handler import (
    AnalyzeCompanyBalanceSheetHandler,
)
from src.application.handlers.query_handlers.get_analysis_handler import (
    CompareCompaniesHandler,
    GetCompanyAnalysisHandler,
    ListAnalyzedCompaniesHandler,
)
from src.config.settings import Settings
from src.domain.services.balance_sheet_analyzer import BalanceSheetAnalyzer


class Container:
    """Composition Root com Pure DI.

    Cria e conecta todas as dependências concretas.
    Constructor Injection apenas.
    """

    def __init__(self, settings: Settings, session: AsyncSession) -> None:
        self._settings = settings
        self._session = session

        # Domain Services (stateless)
        self.analyzer = BalanceSheetAnalyzer()

        # Driven Adapters (outbound)
        self.company_repository = SqlAlchemyCompanyRepository(session)
        self.analysis_repository = SqlAlchemyAnalysisRepository(session)
        self.financial_data_provider = BrapiDataProvider(
            brapi_token=settings.brapi_token,
        )

        # Command Handlers
        self.analyze_company_handler = AnalyzeCompanyBalanceSheetHandler(
            financial_data_provider=self.financial_data_provider,
            company_repository=self.company_repository,
            analysis_repository=self.analysis_repository,
            analyzer=self.analyzer,
        )

        # Query Handlers
        self.get_analysis_handler = GetCompanyAnalysisHandler(
            company_repository=self.company_repository,
            analysis_repository=self.analysis_repository,
        )
        self.list_analyzed_companies_handler = ListAnalyzedCompaniesHandler(
            company_repository=self.company_repository,
            analysis_repository=self.analysis_repository,
        )
        self.compare_companies_handler = CompareCompaniesHandler(
            company_repository=self.company_repository,
            analysis_repository=self.analysis_repository,
        )
