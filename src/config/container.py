"""Composition Root: Dependency Injection Container."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.llm.claude_chat_adapter import ClaudeChatAdapter
from src.adapters.outbound.market_data.brapi_data_provider import BrapiDataProvider
from src.adapters.outbound.market_data.yfinance_fundamentals_provider import (
    YFinanceFundamentalsProvider,
)
from src.adapters.outbound.market_data.yfinance_historical_provider import (
    YFinanceHistoricalProvider,
)
from src.adapters.outbound.excel_parser.openpyxl_carteira_parser import OpenpyxlCarteiraParser
from src.adapters.outbound.pdf_parser.pdfplumber_claude_parser import PdfPlumberClaudeParser
from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_analise_carteira_repository import (
    SqlAlchemyAnaliseCarteiraRepository,
)
from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_carteira_repository import (
    SqlAlchemyCarteiraRepository,
)
from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_cliente_repository import (
    SqlAlchemyClienteRepository,
)
from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_company_repository import (
    SqlAlchemyCompanyRepository,
)
from src.adapters.outbound.market_data.bcb_focus_provider import BcbFocusProvider
from src.adapters.outbound.report.openpyxl_excel_generator import OpenpyxlExcelGenerator
from src.adapters.outbound.report.weasyprint_report_generator import WeasyPrintReportGenerator
from src.application.handlers.command_handlers.analyze_company_handler import (
    AnalyzeCompanyBalanceSheetHandler,
)
from src.application.handlers.command_handlers.analisar_carteira_handler import (
    AnalisarCarteiraHandler,
)
from src.application.handlers.command_handlers.chat_handler import ChatHandler
from src.application.handlers.command_handlers.criar_cliente_handler import CriarClienteHandler
from src.application.handlers.command_handlers.consolidar_carteiras_handler import (
    ConsolidarCarteirasHandler,
)
from src.application.handlers.command_handlers.processar_extrato_handler import (
    ProcessarExtratoHandler,
)
from src.application.handlers.command_handlers.processar_excel_handler import (
    ProcessarExcelHandler,
)
from src.application.handlers.query_handlers.get_analysis_handler import (
    CompareCompaniesHandler,
    GetCompanyAnalysisHandler,
    ListAnalyzedCompaniesHandler,
)
from src.application.handlers.query_handlers.get_analise_carteira_handler import (
    GetAnaliseCarteiraHandler,
    GetRelatorioCarteiraHandler,
)
from src.config.settings import Settings
from src.domain.services.analisador_alavancagem import AnalisadorAlavancagem
from src.domain.services.analisador_alocacao import AnalisadorAlocacao
from src.domain.services.analisador_concentracao import AnalisadorConcentracao
from src.domain.services.balance_sheet_analyzer import BalanceSheetAnalyzer
from src.domain.services.calculador_aderencia import CalculadorAderencia
from src.domain.services.calculador_risco import CalculadorRisco
from src.domain.services.calculador_ir_rf import CalculadorIrRf
from src.domain.services.gerador_fluxo_caixa import GeradorFluxoCaixa
from src.domain.services.gerador_recomendacoes import GeradorRecomendacoes
from src.domain.services.projetor_patrimonio import ProjetorPatrimonio


class Container:
    """Composition Root com Pure DI.

    Cria e conecta todas as dependências concretas.
    Constructor Injection apenas.
    """

    def __init__(self, settings: Settings, session: AsyncSession) -> None:
        self._settings = settings
        self._session = session

        # ===== DOMAIN SERVICES (stateless, shared) =====
        self.calculador_ir_rf = CalculadorIrRf()
        self.gerador_fluxo_caixa = GeradorFluxoCaixa(calculador_ir=self.calculador_ir_rf)
        self.projetor_patrimonio = ProjetorPatrimonio()
        self.analyzer = BalanceSheetAnalyzer()
        self.analisador_alocacao = AnalisadorAlocacao()
        self.analisador_concentracao = AnalisadorConcentracao()
        self.analisador_alavancagem = AnalisadorAlavancagem()
        self.calculador_risco = CalculadorRisco()
        self.calculador_aderencia = CalculadorAderencia()
        self.gerador_recomendacoes = GeradorRecomendacoes()

        # ===== DRIVEN ADAPTERS (outbound) — Existentes =====
        self.company_repository = SqlAlchemyCompanyRepository(session)
        self.analysis_repository = SqlAlchemyAnalysisRepository(session)
        self.financial_data_provider = BrapiDataProvider(brapi_token=settings.brapi_token)

        # ===== DRIVEN ADAPTERS (outbound) — Carteira =====
        self.cliente_repository = SqlAlchemyClienteRepository(session)
        self.carteira_repository = SqlAlchemyCarteiraRepository(session)
        self.analise_carteira_repository = SqlAlchemyAnaliseCarteiraRepository(session)

        self.pdf_parser = PdfPlumberClaudeParser(
            anthropic_api_key=settings.anthropic_api_key,
        )
        self.excel_parser = OpenpyxlCarteiraParser()
        self.historical_price_provider = YFinanceHistoricalProvider()
        self.fundamentals_provider = YFinanceFundamentalsProvider()
        self.report_generator = WeasyPrintReportGenerator()
        self.focus_provider = BcbFocusProvider()
        self.excel_generator = OpenpyxlExcelGenerator()

        # ===== COMMAND HANDLERS — Existentes =====
        self.analyze_company_handler = AnalyzeCompanyBalanceSheetHandler(
            financial_data_provider=self.financial_data_provider,
            company_repository=self.company_repository,
            analysis_repository=self.analysis_repository,
            analyzer=self.analyzer,
        )

        # ===== COMMAND HANDLERS — Carteira =====
        self.criar_cliente_handler = CriarClienteHandler(
            cliente_repository=self.cliente_repository,
        )
        self.analisar_carteira_handler = AnalisarCarteiraHandler(
            carteira_repository=self.carteira_repository,
            cliente_repository=self.cliente_repository,
            analise_repository=self.analise_carteira_repository,
            historical_price_provider=self.historical_price_provider,
            analisador_alocacao=self.analisador_alocacao,
            analisador_concentracao=self.analisador_concentracao,
            calculador_risco=self.calculador_risco,
            calculador_aderencia=self.calculador_aderencia,
            gerador_recomendacoes=self.gerador_recomendacoes,
            fundamentals_provider=self.fundamentals_provider,
            analisador_alavancagem=self.analisador_alavancagem,
        )
        self.processar_extrato_handler = ProcessarExtratoHandler(
            pdf_parser=self.pdf_parser,
            cliente_repository=self.cliente_repository,
            carteira_repository=self.carteira_repository,
            analisar_handler=self.analisar_carteira_handler,
        )
        self.processar_excel_handler = ProcessarExcelHandler(
            excel_parser=self.excel_parser,
            cliente_repository=self.cliente_repository,
            carteira_repository=self.carteira_repository,
            analisar_handler=self.analisar_carteira_handler,
        )

        # ===== QUERY HANDLERS — Existentes =====
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

        # ===== QUERY HANDLERS — Carteira =====
        # Construídos antes do ChatHandler pois ele depende de get_analise_carteira_handler
        self.get_analise_carteira_handler = GetAnaliseCarteiraHandler(
            analise_repository=self.analise_carteira_repository,
            carteira_repository=self.carteira_repository,
            calculador_aderencia=self.calculador_aderencia,
        )
        self.get_relatorio_handler = GetRelatorioCarteiraHandler(
            analise_repository=self.analise_carteira_repository,
            carteira_repository=self.carteira_repository,
            cliente_repository=self.cliente_repository,
            calculador_aderencia=self.calculador_aderencia,
        )

        # ===== COMMAND HANDLERS — Consolidação =====
        self.consolidar_carteiras_handler = ConsolidarCarteirasHandler(
            focus_provider=self.focus_provider,
            gerador_fluxo=self.gerador_fluxo_caixa,
            projetor=self.projetor_patrimonio,
            calculador_ir=self.calculador_ir_rf,
        )

        # ===== CHAT HANDLER (LLM + tool use) =====
        self._llm_adapter = ClaudeChatAdapter(api_key=settings.anthropic_api_key)
        self.chat_handler = ChatHandler(
            llm_port=self._llm_adapter,
            criar_cliente_handler=self.criar_cliente_handler,
            analisar_carteira_handler=self.analisar_carteira_handler,
            get_analise_handler=self.get_analise_carteira_handler,
        )
