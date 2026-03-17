"""Repositório SQLAlchemy para Evento."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.evento import Evento, StatusEvento, TipoEvento
from src.assistente.models.assistente_models import AssEventoModel


class SqlAlchemyEventoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar(self, evento: Evento) -> None:
        model = AssEventoModel(
            id=evento.id,
            tipo=evento.tipo.value,
            descricao=evento.descricao,
            data_evento=evento.data_evento,
            alertar_dias_antes=evento.alertar_dias_antes,
            status=evento.status.value,
            codigo_conta=evento.codigo_conta,
            nome_cliente=evento.nome_cliente,
            criado_em=evento.criado_em,
        )
        self._session.add(model)

    async def buscar_por_id(self, id: str) -> Evento | None:
        result = await self._session.get(AssEventoModel, id)
        return self._to_entity(result) if result else None

    async def listar_para_alertar(self, hoje: date) -> list[Evento]:
        """Busca eventos cujo alerta deve ser enviado hoje."""
        stmt = (
            select(AssEventoModel)
            .where(AssEventoModel.status == "ATIVO")
            .where(AssEventoModel.data_evento >= hoje)
            .where(
                AssEventoModel.data_evento
                <= hoje + timedelta(days=30)  # lookahead máximo
            )
        )
        result = await self._session.execute(stmt)
        eventos = [self._to_entity(m) for m in result.scalars().all()]
        return [e for e in eventos if e.deve_alertar(hoje)]

    async def listar_por_conta(self, codigo_conta: str) -> list[Evento]:
        stmt = select(AssEventoModel).where(AssEventoModel.codigo_conta == codigo_conta)
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_proximos(self, dias: int = 7) -> list[Evento]:
        hoje = date.today()
        limite = hoje + timedelta(days=dias)
        stmt = (
            select(AssEventoModel)
            .where(AssEventoModel.status == "ATIVO")
            .where(AssEventoModel.data_evento >= hoje)
            .where(AssEventoModel.data_evento <= limite)
            .order_by(AssEventoModel.data_evento)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def marcar_alertado(self, id: str) -> None:
        await self._session.execute(
            update(AssEventoModel)
            .where(AssEventoModel.id == id)
            .values(status=StatusEvento.ALERTADO.value)
        )

    async def marcar_concluido(self, id: str) -> None:
        await self._session.execute(
            update(AssEventoModel)
            .where(AssEventoModel.id == id)
            .values(status=StatusEvento.CONCLUIDO.value)
        )

    def _to_entity(self, model: AssEventoModel) -> Evento:
        return Evento(
            id=model.id,
            tipo=TipoEvento(model.tipo),
            descricao=model.descricao,
            data_evento=model.data_evento,
            alertar_dias_antes=model.alertar_dias_antes,
            status=StatusEvento(model.status),
            codigo_conta=model.codigo_conta,
            nome_cliente=model.nome_cliente,
            criado_em=model.criado_em,
        )
