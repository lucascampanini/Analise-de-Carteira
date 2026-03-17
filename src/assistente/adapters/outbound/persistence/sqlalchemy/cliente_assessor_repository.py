"""Repositório SQLAlchemy para ClienteAssessor."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.domain.entities.cliente_assessor import ClienteAssessor
from src.assistente.models.assistente_models import AssClienteModel


class SqlAlchemyClienteAssessorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def salvar(self, cliente: ClienteAssessor) -> None:
        model = self._to_model(cliente)
        await self._session.merge(model)

    async def salvar_todos(self, clientes: list[ClienteAssessor]) -> int:
        """Upsert em lote. Retorna quantidade inserida/atualizada."""
        if not clientes:
            return 0

        agora = datetime.now(timezone.utc)
        valores = [
            {
                "id": c.id,
                "codigo_conta": c.codigo_conta,
                "nome": c.nome,
                "profissao": c.profissao,
                "data_nascimento": c.data_nascimento,
                "data_cadastro": c.data_cadastro,
                "net": c.net,
                "suitability": c.suitability,
                "segmento": c.segmento,
                "saldo_d0": c.saldo_d0,
                "saldo_d1": c.saldo_d1,
                "saldo_d2": c.saldo_d2,
                "saldo_d3": c.saldo_d3,
                "telefone": c.telefone,
                "atualizado_em": agora,
            }
            for c in clientes
        ]

        stmt = pg_insert(AssClienteModel).values(valores)
        stmt = stmt.on_conflict_do_update(
            index_elements=["codigo_conta"],
            set_={
                "nome": stmt.excluded.nome,
                "profissao": stmt.excluded.profissao,
                "data_nascimento": stmt.excluded.data_nascimento,
                "data_cadastro": stmt.excluded.data_cadastro,
                "net": stmt.excluded.net,
                "suitability": stmt.excluded.suitability,
                "segmento": stmt.excluded.segmento,
                "saldo_d0": stmt.excluded.saldo_d0,
                "saldo_d1": stmt.excluded.saldo_d1,
                "saldo_d2": stmt.excluded.saldo_d2,
                "saldo_d3": stmt.excluded.saldo_d3,
                "atualizado_em": stmt.excluded.atualizado_em,
            },
        )
        await self._session.execute(stmt)
        return len(clientes)

    async def buscar_por_codigo(self, codigo_conta: str) -> ClienteAssessor | None:
        stmt = select(AssClienteModel).where(AssClienteModel.codigo_conta == codigo_conta)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def buscar_por_nome(self, nome: str) -> list[ClienteAssessor]:
        stmt = select(AssClienteModel).where(
            func.lower(AssClienteModel.nome).contains(nome.lower())
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def listar_todos(self) -> list[ClienteAssessor]:
        stmt = select(AssClienteModel).order_by(AssClienteModel.nome)
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def total(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(AssClienteModel))
        return result.scalar_one()

    def _to_model(self, c: ClienteAssessor) -> AssClienteModel:
        return AssClienteModel(
            id=c.id,
            codigo_conta=c.codigo_conta,
            nome=c.nome,
            profissao=c.profissao,
            data_nascimento=c.data_nascimento,
            data_cadastro=c.data_cadastro,
            net=c.net,
            suitability=c.suitability,
            segmento=c.segmento,
            saldo_d0=c.saldo_d0,
            saldo_d1=c.saldo_d1,
            saldo_d2=c.saldo_d2,
            saldo_d3=c.saldo_d3,
            telefone=c.telefone,
        )

    def _to_entity(self, m: AssClienteModel) -> ClienteAssessor:
        return ClienteAssessor(
            id=m.id,
            codigo_conta=m.codigo_conta,
            nome=m.nome,
            profissao=m.profissao,
            data_nascimento=m.data_nascimento,
            data_cadastro=m.data_cadastro,
            net=m.net,
            suitability=m.suitability,
            segmento=m.segmento,
            saldo_d0=m.saldo_d0,
            saldo_d1=m.saldo_d1,
            saldo_d2=m.saldo_d2,
            saldo_d3=m.saldo_d3,
            telefone=m.telefone,
        )
