"""Repositório SQLAlchemy para Reuniao."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.reuniao import Reuniao
from src.assistente.models.assistente_models import AssReuniaoModel


class SqlAlchemyReuniaoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar(self, reuniao: Reuniao) -> None:
        model = AssReuniaoModel(
            id=reuniao.id,
            codigo_conta=reuniao.codigo_conta,
            nome_cliente=reuniao.nome_cliente,
            titulo=reuniao.titulo,
            descricao=reuniao.descricao,
            data_hora=reuniao.data_hora,
            duracao_minutos=reuniao.duracao_minutos,
            outlook_event_id=reuniao.outlook_event_id,
            gerar_relatorio=reuniao.gerar_relatorio,
            relatorio_gerado=reuniao.relatorio_gerado,
            status=reuniao.status,
            criado_em=reuniao.criado_em,
        )
        self._session.add(model)

    async def buscar_por_id(self, id: str) -> Reuniao | None:
        result = await self._session.get(AssReuniaoModel, id)
        return self._to_entity(result) if result else None

    async def listar_do_dia(self, data: date) -> list[Reuniao]:
        inicio = datetime(data.year, data.month, data.day, tzinfo=timezone.utc)
        fim = inicio + timedelta(days=1)
        stmt = (
            select(AssReuniaoModel)
            .where(AssReuniaoModel.data_hora >= inicio)
            .where(AssReuniaoModel.data_hora < fim)
            .where(AssReuniaoModel.status == "AGENDADA")
            .order_by(AssReuniaoModel.data_hora)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_por_conta(self, codigo_conta: str) -> list[Reuniao]:
        stmt = (
            select(AssReuniaoModel)
            .where(AssReuniaoModel.codigo_conta == codigo_conta)
            .order_by(AssReuniaoModel.data_hora.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_proximas(self, dias: int = 7) -> list[Reuniao]:
        agora = datetime.now(timezone.utc)
        limite = agora + timedelta(days=dias)
        stmt = (
            select(AssReuniaoModel)
            .where(AssReuniaoModel.data_hora >= agora)
            .where(AssReuniaoModel.data_hora <= limite)
            .where(AssReuniaoModel.status == "AGENDADA")
            .order_by(AssReuniaoModel.data_hora)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def marcar_relatorio_gerado(self, id: str) -> None:
        await self._session.execute(
            update(AssReuniaoModel)
            .where(AssReuniaoModel.id == id)
            .values(relatorio_gerado=True)
        )

    async def atualizar_outlook_id(self, id: str, outlook_event_id: str) -> None:
        await self._session.execute(
            update(AssReuniaoModel)
            .where(AssReuniaoModel.id == id)
            .values(outlook_event_id=outlook_event_id)
        )

    def _to_entity(self, model: AssReuniaoModel) -> Reuniao:
        return Reuniao(
            id=model.id,
            titulo=model.titulo,
            data_hora=model.data_hora,
            duracao_minutos=model.duracao_minutos,
            codigo_conta=model.codigo_conta,
            nome_cliente=model.nome_cliente,
            descricao=model.descricao,
            outlook_event_id=model.outlook_event_id,
            gerar_relatorio=model.gerar_relatorio,
            relatorio_gerado=model.relatorio_gerado,
            status=model.status,
            criado_em=model.criado_em,
        )
