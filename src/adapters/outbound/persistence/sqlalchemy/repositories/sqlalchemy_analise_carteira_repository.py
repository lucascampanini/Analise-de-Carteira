"""Repository SQLAlchemy para AnaliseCarteira."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import AnaliseCarteiraModel
from src.domain.entities.analise_carteira import AnaliseCarteira, StatusAnalise
from src.domain.entities.recomendacao import (
    PrioridadeRecomendacao,
    Recomendacao,
    TipoRecomendacao,
)


class SqlAlchemyAnaliseCarteiraRepository:
    """Repositório SQLAlchemy para AnaliseCarteira."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, analise: AnaliseCarteira) -> None:
        recomendacoes_json = [
            {
                "id": str(r.id),
                "analise_id": str(r.analise_id),
                "tipo": r.tipo.value,
                "ticker": r.ticker,
                "justificativa": r.justificativa,
                "impacto_tributario": r.impacto_tributario,
                "prioridade": r.prioridade.value,
                "percentual_sugerido": r.percentual_sugerido,
            }
            for r in analise.recomendacoes
        ]

        model = await self._session.get(AnaliseCarteiraModel, str(analise.id))
        if model is None:
            model = AnaliseCarteiraModel(
                id=str(analise.id),
                carteira_id=str(analise.carteira_id),
                cliente_id=str(analise.cliente_id),
                data_referencia=analise.data_referencia,
                status=analise.status.value,
                criada_em=analise.criada_em,
                expira_em=analise.expira_em,
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
                recomendacoes_json=recomendacoes_json,
                mensagem_erro=analise.mensagem_erro,
            )
            self._session.add(model)
        else:
            # Update mutable fields
            model.status = analise.status.value
            model.percentual_rv = analise.percentual_rv
            model.percentual_rf = analise.percentual_rf
            model.alocacao_por_classe = analise.alocacao_por_classe
            model.alocacao_por_setor = analise.alocacao_por_setor
            model.alocacao_por_emissor = analise.alocacao_por_emissor
            model.hhi = analise.hhi
            model.top5_ativos = analise.top5_ativos
            model.alertas_concentracao = analise.alertas_concentracao
            model.volatilidade_anualizada = analise.volatilidade_anualizada
            model.cvar_95 = analise.cvar_95
            model.beta_ibovespa = analise.beta_ibovespa
            model.rentabilidade_carteira = analise.rentabilidade_carteira
            model.rentabilidade_cdi = analise.rentabilidade_cdi
            model.rentabilidade_ibov = analise.rentabilidade_ibov
            model.score_aderencia = analise.score_aderencia
            model.recomendacoes_json = recomendacoes_json
            model.mensagem_erro = analise.mensagem_erro

        await self._session.flush()

    async def find_by_id(self, analise_id: UUID) -> AnaliseCarteira | None:
        model = await self._session.get(AnaliseCarteiraModel, str(analise_id))
        if model is None:
            return None
        return self._to_entity(model)

    async def find_by_carteira_id(self, carteira_id: UUID) -> list[AnaliseCarteira]:
        stmt = select(AnaliseCarteiraModel).where(
            AnaliseCarteiraModel.carteira_id == str(carteira_id)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def find_latest_by_carteira_id(self, carteira_id: UUID) -> AnaliseCarteira | None:
        stmt = (
            select(AnaliseCarteiraModel)
            .where(AnaliseCarteiraModel.carteira_id == str(carteira_id))
            .order_by(desc(AnaliseCarteiraModel.criada_em))
            .limit(1)
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    @staticmethod
    def _to_entity(model: AnaliseCarteiraModel) -> AnaliseCarteira:
        analise = AnaliseCarteira(
            id=UUID(model.id),
            carteira_id=UUID(model.carteira_id),
            cliente_id=UUID(model.cliente_id),
            data_referencia=model.data_referencia,
            status=StatusAnalise(model.status),
            criada_em=model.criada_em,
        )
        # Override computed expira_em with stored value
        object.__setattr__(analise, "expira_em", model.expira_em)

        analise.percentual_rv = model.percentual_rv
        analise.percentual_rf = model.percentual_rf
        analise.alocacao_por_classe = model.alocacao_por_classe or {}
        analise.alocacao_por_setor = model.alocacao_por_setor or {}
        analise.alocacao_por_emissor = model.alocacao_por_emissor or {}
        analise.hhi = model.hhi
        analise.top5_ativos = model.top5_ativos or []
        analise.alertas_concentracao = model.alertas_concentracao or []
        analise.volatilidade_anualizada = model.volatilidade_anualizada
        analise.cvar_95 = model.cvar_95
        analise.beta_ibovespa = model.beta_ibovespa
        analise.rentabilidade_carteira = model.rentabilidade_carteira
        analise.rentabilidade_cdi = model.rentabilidade_cdi
        analise.rentabilidade_ibov = model.rentabilidade_ibov
        analise.score_aderencia = model.score_aderencia
        analise.mensagem_erro = model.mensagem_erro

        # Reconstruct recomendacoes
        recomendacoes = []
        for r_data in (model.recomendacoes_json or []):
            try:
                recomendacoes.append(
                    Recomendacao(
                        id=UUID(r_data["id"]),
                        analise_id=UUID(r_data["analise_id"]),
                        tipo=TipoRecomendacao(r_data["tipo"]),
                        ticker=r_data["ticker"],
                        justificativa=r_data["justificativa"],
                        impacto_tributario=r_data.get("impacto_tributario", ""),
                        prioridade=PrioridadeRecomendacao(r_data["prioridade"]),
                        percentual_sugerido=r_data.get("percentual_sugerido"),
                    )
                )
            except (KeyError, ValueError):
                continue
        analise.recomendacoes = recomendacoes

        return analise
