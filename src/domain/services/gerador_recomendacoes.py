"""Domain Service: GeradorRecomendacoes - geração de recomendações de rebalanceamento."""

from __future__ import annotations

from uuid import UUID, uuid4

from src.domain.entities.cliente import Cliente
from src.domain.entities.recomendacao import (
    PrioridadeRecomendacao,
    Recomendacao,
    TipoRecomendacao,
)
from src.domain.value_objects.classe_ativo import ClasseAtivo
from src.domain.value_objects.perfil_investidor import PerfilInvestidor


class GeradorRecomendacoes:
    """Gera recomendações de rebalanceamento baseadas na análise da carteira.

    Só gera recomendações se score de aderência < 70.
    Stateless service — não tem estado interno.
    """

    def gerar(
        self,
        analise_id: UUID,
        cliente: Cliente,
        percentual_rv: float,
        percentual_rf: float,
        alocacao_por_classe: dict[str, float],
        alertas_concentracao: list[str],
        score_aderencia: float,
    ) -> list[Recomendacao]:
        """Gera lista de recomendações de rebalanceamento.

        Args:
            analise_id: ID da análise à qual as recomendações pertencem.
            cliente: Cliente com perfil declarado.
            percentual_rv: Percentual atual em Renda Variável.
            percentual_rf: Percentual atual em Renda Fixa.
            alocacao_por_classe: % por classe de ativo.
            alertas_concentracao: Alertas de concentração identificados.
            score_aderencia: Score de aderência calculado.

        Returns:
            Lista de recomendações (vazia se score >= 70).
        """
        if score_aderencia >= 70.0:
            return []

        recomendacoes: list[Recomendacao] = []
        perfil = cliente.perfil

        # Recomendação de RF insuficiente para conservador/moderado
        if percentual_rf < cliente.percentual_rf_minimo:
            deficit = cliente.percentual_rf_minimo - percentual_rf
            prioridade = (
                PrioridadeRecomendacao.CRITICA
                if percentual_rf < cliente.percentual_rf_minimo * 0.7
                else PrioridadeRecomendacao.ALTA
            )
            recomendacoes.append(
                Recomendacao(
                    id=uuid4(),
                    analise_id=analise_id,
                    tipo=TipoRecomendacao.AUMENTAR,
                    ticker="RENDA_FIXA",
                    justificativa=(
                        f"A carteira possui apenas {percentual_rf:.1f}% em Renda Fixa, "
                        f"abaixo do mínimo recomendado de {cliente.percentual_rf_minimo:.0f}% "
                        f"para o perfil {cliente.perfil}. "
                        f"Recomenda-se aumentar a exposição em RF em aprox. {deficit:.1f}%."
                    ),
                    impacto_tributario=(
                        "Renda Fixa: tabela regressiva de IR (22,5% até 180 dias, "
                        "15% acima de 720 dias). Prefira CDB/LCI/LCA com prazo > 720 dias."
                    ),
                    prioridade=prioridade,
                    percentual_sugerido=cliente.percentual_rf_minimo,
                )
            )

        # Recomendação de RV excessiva
        if percentual_rv > cliente.percentual_rv_maximo:
            excesso = percentual_rv - cliente.percentual_rv_maximo
            recomendacoes.append(
                Recomendacao(
                    id=uuid4(),
                    analise_id=analise_id,
                    tipo=TipoRecomendacao.REDUZIR,
                    ticker="RENDA_VARIAVEL",
                    justificativa=(
                        f"A carteira possui {percentual_rv:.1f}% em Renda Variável, "
                        f"acima do máximo recomendado de {cliente.percentual_rv_maximo:.0f}% "
                        f"para o perfil {cliente.perfil}. "
                        f"Recomenda-se reduzir a exposição em RV em aprox. {excesso:.1f}%."
                    ),
                    impacto_tributario=(
                        "Venda de ações: IR de 15% sobre lucro (swing trade). "
                        "Ações: isenção de IR para vendas até R$20.000/mês para PF. "
                        "Considere aproveitar a isenção mensal e fazer vendas graduais."
                    ),
                    prioridade=PrioridadeRecomendacao.ALTA,
                    percentual_sugerido=cliente.percentual_rv_maximo,
                )
            )

        # Recomendação por alertas de concentração
        for alerta in alertas_concentracao:
            if "CONCENTRAÇÃO ELEVADA" in alerta:
                ticker = self._extrair_ticker_alerta(alerta)
                recomendacoes.append(
                    Recomendacao(
                        id=uuid4(),
                        analise_id=analise_id,
                        tipo=TipoRecomendacao.REDUZIR,
                        ticker=ticker,
                        justificativa=(
                            f"Concentração excessiva identificada: {alerta} "
                            "Recomenda-se reduzir a posição para no máximo 20% do PL."
                        ),
                        impacto_tributario=(
                            "Verifique o prazo de posse para otimizar tributação. "
                            "Swing trade: 15% sobre lucro. Aproveite o limite de isenção "
                            "de R$20k/mês para ações."
                        ),
                        prioridade=PrioridadeRecomendacao.MEDIA,
                        percentual_sugerido=20.0,
                    )
                )

        # Ordenar por prioridade
        recomendacoes.sort(key=lambda r: r.prioridade.value)
        return recomendacoes

    @staticmethod
    def _extrair_ticker_alerta(alerta: str) -> str:
        """Extrai o ticker de um texto de alerta de concentração."""
        try:
            # Formato: "CONCENTRAÇÃO ELEVADA: TICKER representa..."
            partes = alerta.split(":")
            if len(partes) >= 2:
                ticker = partes[1].strip().split()[0]
                return ticker
        except (IndexError, AttributeError):
            pass
        return ""
