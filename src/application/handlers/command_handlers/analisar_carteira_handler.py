"""Handler: AnalisarCarteiraHandler."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from src.application.commands.analisar_carteira import AnalisarCarteira
from src.application.ports.outbound.analise_carteira_repository import AnaliseCarteiraRepository
from src.application.ports.outbound.carteira_repository import CarteiraRepository
from src.application.ports.outbound.cliente_repository import ClienteRepository
from src.application.ports.outbound.fundamentals_data_provider import FundamentalsDataProvider
from src.application.ports.outbound.historical_price_provider import HistoricalPriceProvider
from src.domain.entities.analise_carteira import AnaliseCarteira
from src.domain.entities.cliente import Cliente
from src.domain.exceptions.domain_exceptions import InsufficientDataError, InvalidEntityError
from src.domain.services.analisador_alavancagem import AnalisadorAlavancagem
from src.domain.services.analisador_alocacao import AnalisadorAlocacao
from src.domain.services.analisador_concentracao import AnalisadorConcentracao
from src.domain.services.calculador_aderencia import CalculadorAderencia
from src.domain.services.calculador_risco import CalculadorRisco
from src.domain.services.gerador_recomendacoes import GeradorRecomendacoes
from src.domain.specifications.carteira_specifications import CarteiraTemPosicoesSpec
from src.domain.value_objects.classe_ativo import ClasseAtivo
from src.domain.value_objects.indicadores_alavancagem import IndicadoresAlavancagem


class AnalisarCarteiraHandler:
    """Handler para o command AnalisarCarteira.

    Orquestra toda a análise quantitativa: alocação, concentração, risco,
    aderência ao perfil e geração de recomendações.
    """

    def __init__(
        self,
        carteira_repository: CarteiraRepository,
        cliente_repository: ClienteRepository,
        analise_repository: AnaliseCarteiraRepository,
        historical_price_provider: HistoricalPriceProvider,
        analisador_alocacao: AnalisadorAlocacao,
        analisador_concentracao: AnalisadorConcentracao,
        calculador_risco: CalculadorRisco,
        calculador_aderencia: CalculadorAderencia,
        gerador_recomendacoes: GeradorRecomendacoes,
        fundamentals_provider: FundamentalsDataProvider | None = None,
        analisador_alavancagem: AnalisadorAlavancagem | None = None,
    ) -> None:
        self._carteira_repo = carteira_repository
        self._cliente_repo = cliente_repository
        self._analise_repo = analise_repository
        self._price_provider = historical_price_provider
        self._analisador_alocacao = analisador_alocacao
        self._analisador_concentracao = analisador_concentracao
        self._calculador_risco = calculador_risco
        self._calculador_aderencia = calculador_aderencia
        self._gerador_recomendacoes = gerador_recomendacoes
        self._fundamentals_provider = fundamentals_provider
        self._analisador_alavancagem = analisador_alavancagem or AnalisadorAlavancagem()

    async def handle(self, command: AnalisarCarteira) -> str:
        """Executa o command AnalisarCarteira.

        Args:
            command: Command com carteira_id e cliente_id.

        Returns:
            ID da análise gerada.

        Raises:
            InvalidEntityError: Se carteira ou cliente não encontrado.
            InsufficientDataError: Se carteira não tiver posições.
        """
        carteira_id = UUID(command.carteira_id)
        cliente_id = UUID(command.cliente_id)

        # 1. Carregar entidades
        carteira = await self._carteira_repo.find_by_id(carteira_id)
        if carteira is None:
            raise InvalidEntityError(f"Carteira {carteira_id} não encontrada.")

        cliente = await self._cliente_repo.find_by_id(cliente_id)
        if cliente is None:
            raise InvalidEntityError(f"Cliente {cliente_id} não encontrado.")

        # 2. Verificar pré-condição: carteira com posições
        spec = CarteiraTemPosicoesSpec()
        if not spec.is_satisfied_by(carteira):
            raise InsufficientDataError(spec.explain_failure(carteira))

        # 3. Criar análise no estado PENDENTE
        analise = AnaliseCarteira(
            id=uuid4(),
            carteira_id=carteira_id,
            cliente_id=cliente_id,
            data_referencia=carteira.data_referencia,
        )
        analise.iniciar_processamento()
        await self._analise_repo.save(analise)

        try:
            # 4. Calcular métricas de alocação (domain service, puro)
            percentual_rv = self._analisador_alocacao.calcular_percentual_rv(carteira)
            percentual_rf = self._analisador_alocacao.calcular_percentual_rf(carteira)
            alocacao_por_classe = self._analisador_alocacao.calcular_percentual_por_classe(carteira)
            alocacao_por_setor = self._analisador_alocacao.calcular_percentual_por_setor(carteira)
            alocacao_por_emissor = self._analisador_alocacao.calcular_percentual_por_emissor(carteira)

            # 5. Calcular métricas de concentração (inclui alertas FGC automaticamente)
            hhi = self._analisador_concentracao.calcular_hhi(carteira)
            top5 = self._analisador_concentracao.calcular_top5(carteira)
            alertas = self._analisador_concentracao.gerar_alertas_concentracao(carteira)

            # 5b. Coletar alertas individuais de RF (vencimento, carência, high yield, duration)
            alertas_rf_por_posicao = (
                self._analisador_concentracao.gerar_alertas_rf_por_posicao(carteira)
            )
            for ticker_alerts in alertas_rf_por_posicao.values():
                alertas.extend(ticker_alerts)

            # 6. Buscar histórico de preços (I/O via port) e alavancagem (I/O via port)
            pl = carteira.patrimonio_liquido
            retornos_por_ativo: dict[str, list[float]] = {}
            pesos: dict[str, float] = {}

            for posicao in carteira.posicoes:
                if posicao.ativo.tem_historico_preco and not pl.is_zero():
                    ticker = posicao.ativo.ticker
                    retornos = await self._price_provider.fetch_daily_returns(ticker)
                    if retornos:
                        retornos_por_ativo[ticker] = retornos
                        pesos[ticker] = posicao.valor_atual.cents / pl.cents

            # 6b. Buscar indicadores de alavancagem para ACAO e BDR
            alavancagem_por_ticker: dict[str, IndicadoresAlavancagem] = {}
            if self._fundamentals_provider is not None:
                tickers_equity = [
                    p.ativo.ticker
                    for p in carteira.posicoes
                    if p.ativo.classe in {ClasseAtivo.ACAO, ClasseAtivo.BDR}
                ]
                for ticker in tickers_equity:
                    try:
                        ind = await self._fundamentals_provider.fetch_indicadores_alavancagem(
                            ticker
                        )
                        if ind is not None:
                            alavancagem_por_ticker[ticker] = ind
                    except Exception:
                        pass  # falha silenciosa por ticker individual

            # Alertas de alavancagem incorporados aos alertas gerais
            alertas.extend(
                self._analisador_alavancagem.gerar_alertas_carteira(alavancagem_por_ticker)
            )
            alavancagem_serializada = {
                t: ind.to_dict() for t, ind in alavancagem_por_ticker.items()
            }

            # 7. Calcular métricas de risco
            retornos_benchmark = await self._price_provider.fetch_benchmark_returns("IBOV")
            retornos_carteira = self._calculador_risco.calcular_retornos_carteira(
                retornos_por_ativo, pesos
            )

            volatilidade = self._calculador_risco.calcular_volatilidade_anualizada(
                retornos_carteira
            )
            cvar = self._calculador_risco.calcular_cvar_95(retornos_carteira)
            beta = self._calculador_risco.calcular_beta(retornos_carteira, retornos_benchmark)

            # 8. Calcular score de aderência
            score = self._calculador_aderencia.calcular_score(
                cliente=cliente,
                percentual_rv=percentual_rv,
                percentual_rf=percentual_rf,
                alertas_concentracao=alertas,
            )

            # 9. Gerar recomendações se necessário
            recomendacoes = self._gerador_recomendacoes.gerar(
                analise_id=analise.id,
                cliente=cliente,
                percentual_rv=percentual_rv,
                percentual_rf=percentual_rf,
                alocacao_por_classe=alocacao_por_classe,
                alertas_concentracao=alertas,
                score_aderencia=score,
            )

            # 10. Concluir análise
            analise.concluir(
                percentual_rv=percentual_rv,
                percentual_rf=percentual_rf,
                alocacao_por_classe=alocacao_por_classe,
                alocacao_por_setor=alocacao_por_setor,
                alocacao_por_emissor=alocacao_por_emissor,
                hhi=hhi,
                top5_ativos=top5,
                alertas_concentracao=alertas,
                volatilidade_anualizada=volatilidade,
                cvar_95=cvar,
                beta_ibovespa=beta,
                rentabilidade_carteira=None,  # TODO: calcular com histórico
                rentabilidade_cdi=None,       # TODO: comparar com CDI
                rentabilidade_ibov=None,      # TODO: comparar com IBOV
                score_aderencia=score,
                recomendacoes=recomendacoes,
                alavancagem_por_ticker=alavancagem_serializada,
            )

        except Exception as exc:
            analise.marcar_erro(str(exc))

        # 11. Persistir resultado final
        await self._analise_repo.save(analise)
        return str(analise.id)
