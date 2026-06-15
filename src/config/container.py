"""Composition Root: Dependency Injection Container."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.llm.claude_chat_adapter import ClaudeChatAdapter
from src.adapters.outbound.market_data.bcb_sgs_provider import BcbSgsProvider
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
from src.adapters.outbound.market_data.macro_context_provider import MacroContextProvider
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
from src.application.handlers.query_handlers.gerar_argumento_venda_handler import (
    GerarArgumentoVendaHandler,
)
from src.config.settings import Settings
from src.domain.services.analisador_alavancagem import AnalisadorAlavancagem
from src.domain.services.analisador_alocacao import AnalisadorAlocacao
from src.domain.services.analisador_concentracao import AnalisadorConcentracao
from src.domain.services.balance_sheet_analyzer import BalanceSheetAnalyzer
from src.domain.services.calculador_aderencia import CalculadorAderencia
from src.domain.services.calculador_risco import CalculadorRisco
from src.domain.services.calculador_ir_rf import CalculadorIrRf
from src.domain.services.gerador_argumento_venda import GeradorArgumentoVenda
from src.domain.services.gerador_fluxo_caixa import GeradorFluxoCaixa
from src.domain.services.gerador_recomendacoes import GeradorRecomendacoes
from src.domain.services.projetor_patrimonio import ProjetorPatrimonio


class SharedServices:
    """Serviços stateless criados uma vez no startup da aplicação.

    Domain services e adapters sem estado são criados aqui e reutilizados
    em todas as requests, eliminando instanciação desnecessária por request.
    """

    def __init__(self, settings: Settings) -> None:
        # ===== DOMAIN SERVICES (stateless) =====
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
        self.gerador_argumento_venda = GeradorArgumentoVenda()

        # ===== DRIVEN ADAPTERS stateless =====
        self.bcb_sgs_provider = BcbSgsProvider()
        self.historical_price_provider = YFinanceHistoricalProvider(
            bcb_sgs_provider=self.bcb_sgs_provider
        )
        self.fundamentals_provider = YFinanceFundamentalsProvider()
        self.financial_data_provider = BrapiDataProvider(brapi_token=settings.brapi_token)
        self.pdf_parser = PdfPlumberClaudeParser(
            anthropic_api_key=settings.anthropic_api_key,
        )
        self.excel_parser = OpenpyxlCarteiraParser()
        self.report_generator = WeasyPrintReportGenerator()
        self.focus_provider = BcbFocusProvider()
        self.excel_generator = OpenpyxlExcelGenerator()
        self.llm_adapter = ClaudeChatAdapter(api_key=settings.anthropic_api_key)
        self.macro_context_provider = MacroContextProvider(bcb_provider=self.bcb_sgs_provider)

        # Fallback de CDI para quando BCB SGS estiver indisponível
        self.cdi_fallback_aa = settings.cdi_atual_aa_fallback


class Container:
    """Dependências por request — apenas o que precisa de AsyncSession.

    Recebe SharedServices (criado no startup) e a session da request atual.
    Handlers são criados aqui pois composem repositórios (stateful) + serviços compartilhados.
    """

    def __init__(self, shared: SharedServices, session: AsyncSession) -> None:
        # ===== REPOSITORIES (precisam de session) =====
        self.company_repository = SqlAlchemyCompanyRepository(session)
        self.analysis_repository = SqlAlchemyAnalysisRepository(session)
        self.cliente_repository = SqlAlchemyClienteRepository(session)
        self.carteira_repository = SqlAlchemyCarteiraRepository(session)
        self.analise_carteira_repository = SqlAlchemyAnaliseCarteiraRepository(session)

        # ===== COMMAND HANDLERS =====
        self.analyze_company_handler = AnalyzeCompanyBalanceSheetHandler(
            financial_data_provider=shared.financial_data_provider,
            company_repository=self.company_repository,
            analysis_repository=self.analysis_repository,
            analyzer=shared.analyzer,
        )
        self.criar_cliente_handler = CriarClienteHandler(
            cliente_repository=self.cliente_repository,
        )
        self.analisar_carteira_handler = AnalisarCarteiraHandler(
            carteira_repository=self.carteira_repository,
            cliente_repository=self.cliente_repository,
            analise_repository=self.analise_carteira_repository,
            historical_price_provider=shared.historical_price_provider,
            analisador_alocacao=shared.analisador_alocacao,
            analisador_concentracao=shared.analisador_concentracao,
            calculador_risco=shared.calculador_risco,
            calculador_aderencia=shared.calculador_aderencia,
            gerador_recomendacoes=shared.gerador_recomendacoes,
            fundamentals_provider=shared.fundamentals_provider,
            analisador_alavancagem=shared.analisador_alavancagem,
        )
        self.processar_extrato_handler = ProcessarExtratoHandler(
            pdf_parser=shared.pdf_parser,
            cliente_repository=self.cliente_repository,
            carteira_repository=self.carteira_repository,
            analisar_handler=self.analisar_carteira_handler,
        )
        self.processar_excel_handler = ProcessarExcelHandler(
            excel_parser=shared.excel_parser,
            cliente_repository=self.cliente_repository,
            carteira_repository=self.carteira_repository,
            analisar_handler=self.analisar_carteira_handler,
        )
        self.consolidar_carteiras_handler = ConsolidarCarteirasHandler(
            focus_provider=shared.focus_provider,
            gerador_fluxo=shared.gerador_fluxo_caixa,
            projetor=shared.projetor_patrimonio,
            calculador_ir=shared.calculador_ir_rf,
            bcb_sgs=shared.bcb_sgs_provider,
            cdi_fallback_aa=shared.cdi_fallback_aa,
        )

        # ===== QUERY HANDLERS =====
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
        self.get_analise_carteira_handler = GetAnaliseCarteiraHandler(
            analise_repository=self.analise_carteira_repository,
            carteira_repository=self.carteira_repository,
            calculador_aderencia=shared.calculador_aderencia,
        )
        self.get_relatorio_handler = GetRelatorioCarteiraHandler(
            analise_repository=self.analise_carteira_repository,
            carteira_repository=self.carteira_repository,
            cliente_repository=self.cliente_repository,
            calculador_aderencia=shared.calculador_aderencia,
        )
        self.gerar_argumento_venda_handler = GerarArgumentoVendaHandler(
            analise_repository=self.analise_carteira_repository,
            cliente_repository=self.cliente_repository,
            gerador_argumento=shared.gerador_argumento_venda,
        )

        # ===== CHAT HANDLER =====
        self.chat_handler = ChatHandler(
            llm_port=shared.llm_adapter,
            criar_cliente_handler=self.criar_cliente_handler,
            analisar_carteira_handler=self.analisar_carteira_handler,
            get_analise_handler=self.get_analise_carteira_handler,
            macro_context_provider=shared.macro_context_provider,
        )
