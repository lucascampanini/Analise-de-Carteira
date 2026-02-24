"""Command Handler: AnalyzeCompanyBalanceSheetHandler.

Orquestra a análise de balanço patrimonial sem conter lógica de negócio.
Um handler por Command (CQRS).
"""

from __future__ import annotations

from uuid import uuid4

from src.application.commands.analyze_company import AnalyzeCompanyBalanceSheet
from src.application.ports.outbound.analysis_repository import AnalysisRepository
from src.application.ports.outbound.company_repository import CompanyRepository
from src.application.ports.outbound.financial_data_provider import FinancialDataProvider
from src.domain.entities.company import Company
from src.domain.entities.financial_analysis import FinancialAnalysis
from src.domain.exceptions.domain_exceptions import InsufficientDataError
from src.domain.services.balance_sheet_analyzer import BalanceSheetAnalyzer
from src.domain.value_objects.cnpj import CNPJ


class AnalyzeCompanyBalanceSheetHandler:
    """Handler para o comando AnalyzeCompanyBalanceSheet.

    Orquestra: busca dados -> analisa -> persiste resultado.
    Idempotente: se já existe análise com mesma chave, retorna sem processar.
    """

    def __init__(
        self,
        financial_data_provider: FinancialDataProvider,
        company_repository: CompanyRepository,
        analysis_repository: AnalysisRepository,
        analyzer: BalanceSheetAnalyzer,
    ) -> None:
        self._data_provider = financial_data_provider
        self._company_repo = company_repository
        self._analysis_repo = analysis_repository
        self._analyzer = analyzer

    async def handle(self, command: AnalyzeCompanyBalanceSheet) -> None:
        """Executa a análise de balanço patrimonial.

        Args:
            command: Comando com ticker, período e chave de idempotência.

        Raises:
            InsufficientDataError: Se dados financeiros não foram encontrados.
        """
        # Idempotência: verificar se já existe análise com essa chave
        existing = await self._analysis_repo.find_by_idempotency_key(
            command.idempotency_key
        )
        if existing is not None:
            return

        # Buscar ou criar empresa
        company = await self._company_repo.find_by_ticker(command.ticker)
        if company is None:
            company = Company(
                id=uuid4(),
                name=command.ticker.symbol,
                ticker=command.ticker,
                cnpj=CNPJ("00000000000191"),  # placeholder até enriquecer
                sector="Não classificado",
                cvm_code="0",
            )
            await self._company_repo.save(company)

        # Criar análise pendente
        analysis = FinancialAnalysis(
            id=uuid4(),
            company_id=company.id,
            period=command.period,
        )

        try:
            # Buscar dados financeiros (atual e anterior para Piotroski)
            current_bs = await self._data_provider.fetch_balance_sheet(
                command.ticker, command.period
            )
            current_dre = await self._data_provider.fetch_income_statement(
                command.ticker, command.period
            )

            if current_bs is None or current_dre is None:
                raise InsufficientDataError(
                    f"Dados financeiros não encontrados para {command.ticker} "
                    f"no período {command.period}."
                )

            previous_bs = await self._data_provider.fetch_previous_balance_sheet(
                command.ticker, command.period
            )
            previous_dre = await self._data_provider.fetch_previous_income_statement(
                command.ticker, command.period
            )

            # Calcular indicadores financeiros
            ratios = self._analyzer.calculate_financial_ratios(current_bs, current_dre)
            analysis.record_ratios(ratios)

            # Calcular Altman Z-Score
            z_score, z_classification = self._analyzer.calculate_altman_z_score(
                current_bs, current_dre
            )
            analysis.record_altman_z_score(z_score, z_classification)

            # Calcular Piotroski F-Score (precisa de dados do período anterior)
            if previous_bs is not None and previous_dre is not None:
                f_score, f_details = self._analyzer.calculate_piotroski_f_score(
                    current_bs, current_dre, previous_bs, previous_dre
                )
                analysis.record_piotroski_score(f_score, f_details)
            else:
                # Sem dados anteriores, Piotroski não é calculável
                analysis.record_piotroski_score(0, {"nota": "Sem dados do período anterior"})

            analysis.complete()

        except InsufficientDataError:
            analysis.fail("Dados financeiros insuficientes")
            raise
        except Exception as e:
            analysis.fail(str(e))
            raise

        finally:
            await self._analysis_repo.save(analysis, idempotency_key=command.idempotency_key)
