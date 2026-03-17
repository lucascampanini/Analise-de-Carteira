"""Query Handlers para análise de carteira."""

from __future__ import annotations

from uuid import UUID

from src.application.dto.carteira_dto import (
    AnaliseCarteiraDTO,
    AnaliseCarteiraRelatorioDTO,
    PosicaoDTO,
    RecomendacaoDTO,
)
from src.application.ports.outbound.analise_carteira_repository import AnaliseCarteiraRepository
from src.application.ports.outbound.carteira_repository import CarteiraRepository
from src.application.ports.outbound.cliente_repository import ClienteRepository
from src.application.queries.get_analise_carteira import GetAnaliseCarteira, GetRelatorioCarteira
from src.domain.entities.analise_carteira import AnaliseCarteira
from src.domain.entities.carteira import Carteira
from src.domain.services.calculador_aderencia import CalculadorAderencia


class GetAnaliseCarteiraHandler:
    """Handler para a query GetAnaliseCarteira."""

    def __init__(
        self,
        analise_repository: AnaliseCarteiraRepository,
        carteira_repository: CarteiraRepository,
        calculador_aderencia: CalculadorAderencia,
    ) -> None:
        self._analise_repo = analise_repository
        self._carteira_repo = carteira_repository
        self._calculador_aderencia = calculador_aderencia

    async def handle(self, query: GetAnaliseCarteira) -> AnaliseCarteiraDTO | None:
        """Busca e mapeia uma análise para DTO.

        Args:
            query: Query com analise_id.

        Returns:
            AnaliseCarteiraDTO ou None se não encontrada.
        """
        analise = await self._analise_repo.find_by_id(UUID(query.analise_id))
        if analise is None:
            return None

        carteira = await self._carteira_repo.find_by_id(analise.carteira_id)

        return self._to_dto(analise, carteira)

    def _to_dto(
        self,
        analise: AnaliseCarteira,
        carteira: Carteira | None,
    ) -> AnaliseCarteiraDTO:
        """Converte AnaliseCarteira para DTO."""
        recomendacoes_dto = [
            RecomendacaoDTO(
                tipo=r.tipo.value,
                ticker=r.ticker,
                justificativa=r.justificativa,
                impacto_tributario=r.impacto_tributario,
                prioridade=r.prioridade.value,
                percentual_sugerido=r.percentual_sugerido,
            )
            for r in analise.recomendacoes
        ]

        posicoes_dto: list[PosicaoDTO] = []
        patrimonio_liquido = 0.0
        if carteira is not None:
            pl = carteira.patrimonio_liquido
            patrimonio_liquido = pl.to_reais()
            for posicao in carteira.posicoes:
                percentual = carteira.percentual_posicao(posicao)
                rf = posicao.ativo.detalhes_rf

                # Alavancagem (ACAO/BDR) — lida diretamente do AnaliseCarteira
                alavancagem = analise.alavancagem_por_ticker.get(posicao.ativo.ticker)

                # Extrair campos RF se disponíveis
                if rf is not None:
                    alertas_rf = rf.gerar_alertas(posicao.valor_atual.to_reais())
                    posicoes_dto.append(
                        PosicaoDTO(
                            ticker=posicao.ativo.ticker,
                            nome=posicao.ativo.nome,
                            classe=str(posicao.ativo.classe),
                            setor=posicao.ativo.setor,
                            emissor=posicao.ativo.emissor,
                            quantidade=float(posicao.quantidade),
                            preco_medio=posicao.preco_medio.to_reais(),
                            valor_atual=posicao.valor_atual.to_reais(),
                            percentual_pl=round(percentual, 2),
                            rentabilidade_percentual=round(posicao.rentabilidade_percentual, 2),
                            lucro_prejuizo=posicao.lucro_prejuizo.to_reais(),
                            subtipo_rf=str(rf.subtipo),
                            taxa_rf=rf.taxa_formatada,
                            data_vencimento_rf=rf.data_vencimento.strftime("%d/%m/%Y"),
                            dias_ate_vencimento=rf.dias_ate_vencimento,
                            liquidez_rf=rf.liquidez,
                            coberto_fgc=rf.coberto_fgc,
                            isento_ir=rf.isento_ir,
                            aliquota_ir=rf.aliquota_ir_atual,
                            rating=str(rf.rating) if rf.rating else None,
                            cnpj_emissor=rf.cnpj_emissor or None,
                            alertas_rf=alertas_rf,
                        )
                    )
                else:
                    posicoes_dto.append(
                        PosicaoDTO(
                            ticker=posicao.ativo.ticker,
                            nome=posicao.ativo.nome,
                            classe=str(posicao.ativo.classe),
                            setor=posicao.ativo.setor,
                            emissor=posicao.ativo.emissor,
                            quantidade=float(posicao.quantidade),
                            preco_medio=posicao.preco_medio.to_reais(),
                            valor_atual=posicao.valor_atual.to_reais(),
                            percentual_pl=round(percentual, 2),
                            rentabilidade_percentual=round(posicao.rentabilidade_percentual, 2),
                            lucro_prejuizo=posicao.lucro_prejuizo.to_reais(),
                            alavancagem=alavancagem,
                        )
                    )

        classificacao = None
        if analise.score_aderencia is not None:
            calc = CalculadorAderencia()
            classificacao = calc.classificar_score(analise.score_aderencia)

        return AnaliseCarteiraDTO(
            analise_id=str(analise.id),
            carteira_id=str(analise.carteira_id),
            cliente_id=str(analise.cliente_id),
            status=analise.status.value,
            data_referencia=analise.data_referencia.isoformat(),
            criada_em=analise.criada_em.isoformat(),
            expira_em=analise.expira_em.isoformat(),
            patrimonio_liquido=patrimonio_liquido,
            percentual_rv=analise.percentual_rv,
            percentual_rf=analise.percentual_rf,
            alocacao_por_classe=analise.alocacao_por_classe,
            alocacao_por_setor=analise.alocacao_por_setor,
            alocacao_por_emissor=analise.alocacao_por_emissor,
            hhi=analise.hhi,
            top5_ativos=analise.top5_ativos,
            alertas_concentracao=analise.alertas_concentracao,
            volatilidade_anualizada=analise.volatilidade_anualizada,
            cvar_95=analise.cvar_95,
            beta_ibovespa=analise.beta_ibovespa,
            rentabilidade_carteira=analise.rentabilidade_carteira,
            rentabilidade_cdi=analise.rentabilidade_cdi,
            rentabilidade_ibov=analise.rentabilidade_ibov,
            score_aderencia=analise.score_aderencia,
            classificacao_aderencia=classificacao,
            precisa_rebalanceamento=analise.precisa_rebalanceamento,
            recomendacoes=recomendacoes_dto,
            posicoes=posicoes_dto,
            mensagem_erro=analise.mensagem_erro,
        )


class GetRelatorioCarteiraHandler:
    """Handler para a query GetRelatorioCarteira."""

    def __init__(
        self,
        analise_repository: AnaliseCarteiraRepository,
        carteira_repository: CarteiraRepository,
        cliente_repository: ClienteRepository,
        calculador_aderencia: CalculadorAderencia,
    ) -> None:
        self._analise_repo = analise_repository
        self._carteira_repo = carteira_repository
        self._cliente_repo = cliente_repository
        self._calculador_aderencia = calculador_aderencia

    async def handle(self, query: GetRelatorioCarteira) -> AnaliseCarteiraRelatorioDTO | None:
        """Busca dados enriquecidos para geração do relatório PDF.

        Args:
            query: Query com analise_id.

        Returns:
            AnaliseCarteiraRelatorioDTO ou None se não encontrada.
        """
        from datetime import datetime, timezone

        analise = await self._analise_repo.find_by_id(UUID(query.analise_id))
        if analise is None:
            return None

        carteira = await self._carteira_repo.find_by_id(analise.carteira_id)
        cliente = await self._cliente_repo.find_by_id(analise.cliente_id)

        if cliente is None:
            return None

        # Reusar GetAnaliseCarteiraHandler para montar o DTO base
        get_handler = GetAnaliseCarteiraHandler(
            analise_repository=self._analise_repo,
            carteira_repository=self._carteira_repo,
            calculador_aderencia=self._calculador_aderencia,
        )
        analise_dto = get_handler._to_dto(analise, carteira)

        return AnaliseCarteiraRelatorioDTO(
            cliente_nome=cliente.nome,
            cliente_cpf=str(cliente.cpf),
            cliente_perfil=str(cliente.perfil),
            cliente_objetivo=str(cliente.objetivo),
            cliente_horizonte=str(cliente.horizonte),
            analise=analise_dto,
            data_geracao=datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
            data_referencia=analise.data_referencia.strftime("%d/%m/%Y"),
        )
