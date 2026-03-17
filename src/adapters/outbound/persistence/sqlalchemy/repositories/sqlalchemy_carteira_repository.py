"""Repository SQLAlchemy para Carteira."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import CarteiraModel
from src.domain.entities.ativo import Ativo
from src.domain.entities.carteira import Carteira
from src.domain.entities.posicao import Posicao
from src.domain.value_objects.classe_ativo import ClasseAtivo
from src.domain.value_objects.money import Money


class SqlAlchemyCarteiraRepository:
    """Repositório SQLAlchemy para Carteira."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, carteira: Carteira) -> None:
        posicoes_json = [
            {
                "id": str(p.id),
                "ativo_id": str(p.ativo.id),
                "ativo_ticker": p.ativo.ticker,
                "ativo_nome": p.ativo.nome,
                "ativo_classe": p.ativo.classe.value,
                "ativo_setor": p.ativo.setor,
                "ativo_emissor": p.ativo.emissor,
                "ativo_tem_historico": p.ativo.tem_historico_preco,
                "quantidade": str(p.quantidade),
                "preco_medio_cents": p.preco_medio.cents,
                "valor_atual_cents": p.valor_atual.cents,
            }
            for p in carteira.posicoes
        ]

        model = await self._session.get(CarteiraModel, str(carteira.id))
        if model is None:
            model = CarteiraModel(
                id=str(carteira.id),
                cliente_id=str(carteira.cliente_id),
                data_referencia=carteira.data_referencia,
                origem_arquivo=carteira.origem_arquivo,
                posicoes_json=posicoes_json,
                criada_em=carteira.criada_em,
            )
            self._session.add(model)
        else:
            model.posicoes_json = posicoes_json
        await self._session.flush()

    async def find_by_id(self, carteira_id: UUID) -> Carteira | None:
        model = await self._session.get(CarteiraModel, str(carteira_id))
        if model is None:
            return None
        return self._to_entity(model)

    async def find_by_cliente_id(self, cliente_id: UUID) -> list[Carteira]:
        stmt = select(CarteiraModel).where(CarteiraModel.cliente_id == str(cliente_id))
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    @staticmethod
    def _to_entity(model: CarteiraModel) -> Carteira:
        carteira_id = UUID(model.id)
        carteira = Carteira(
            id=carteira_id,
            cliente_id=UUID(model.cliente_id),
            data_referencia=model.data_referencia,
            origem_arquivo=model.origem_arquivo,
            criada_em=model.criada_em,
        )

        for p_data in (model.posicoes_json or []):
            try:
                ativo = Ativo(
                    id=UUID(p_data["ativo_id"]),
                    ticker=p_data["ativo_ticker"],
                    nome=p_data["ativo_nome"],
                    classe=ClasseAtivo(p_data["ativo_classe"]),
                    setor=p_data.get("ativo_setor", "Não classificado"),
                    emissor=p_data.get("ativo_emissor", "Desconhecido"),
                )
                posicao = Posicao(
                    id=UUID(p_data["id"]),
                    carteira_id=carteira_id,
                    ativo=ativo,
                    quantidade=Decimal(str(p_data["quantidade"])),
                    preco_medio=Money(cents=int(p_data["preco_medio_cents"])),
                    valor_atual=Money(cents=int(p_data["valor_atual_cents"])),
                )
                carteira.adicionar_posicao(posicao)
            except (KeyError, ValueError):
                continue

        return carteira
