"""Repositório para Ofertas Mensais e Clientes de Oferta."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.assistente.models.assistente_models import AssClienteOfertaModel, AssOfertaMensalModel


class SqlAlchemyOfertaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Ofertas ────────────────────────────────────────────────────────────────

    async def salvar_oferta(self, oferta: AssOfertaMensalModel) -> AssOfertaMensalModel:
        self._session.add(oferta)
        await self._session.flush()
        return oferta

    async def buscar_oferta(self, oferta_id: str) -> AssOfertaMensalModel | None:
        return await self._session.get(AssOfertaMensalModel, oferta_id)

    async def listar_ofertas(self) -> list[AssOfertaMensalModel]:
        stmt = select(AssOfertaMensalModel).order_by(AssOfertaMensalModel.criado_em.desc())
        return list((await self._session.execute(stmt)).scalars().all())

    async def atualizar_oferta(self, oferta_id: str, dados: dict) -> None:
        await self._session.execute(
            update(AssOfertaMensalModel)
            .where(AssOfertaMensalModel.id == oferta_id)
            .values(**dados)
        )

    async def deletar_oferta(self, oferta_id: str) -> None:
        await self._session.execute(
            delete(AssClienteOfertaModel).where(AssClienteOfertaModel.oferta_id == oferta_id)
        )
        await self._session.execute(
            delete(AssOfertaMensalModel).where(AssOfertaMensalModel.id == oferta_id)
        )

    # ── Clientes da oferta ─────────────────────────────────────────────────────

    async def adicionar_cliente(self, cliente: AssClienteOfertaModel) -> AssClienteOfertaModel:
        self._session.add(cliente)
        await self._session.flush()
        return cliente

    async def listar_clientes_oferta(self, oferta_id: str) -> list[AssClienteOfertaModel]:
        stmt = (
            select(AssClienteOfertaModel)
            .where(AssClienteOfertaModel.oferta_id == oferta_id)
            .order_by(AssClienteOfertaModel.nome_cliente)
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def buscar_cliente_oferta(self, item_id: str) -> AssClienteOfertaModel | None:
        return await self._session.get(AssClienteOfertaModel, item_id)

    async def atualizar_cliente(self, item_id: str, dados: dict) -> None:
        dados["atualizado_em"] = datetime.now(timezone.utc)
        await self._session.execute(
            update(AssClienteOfertaModel)
            .where(AssClienteOfertaModel.id == item_id)
            .values(**dados)
        )

    async def remover_cliente(self, item_id: str) -> None:
        await self._session.execute(
            delete(AssClienteOfertaModel).where(AssClienteOfertaModel.id == item_id)
        )

    async def remover_todos_clientes(self, oferta_id: str) -> None:
        await self._session.execute(
            delete(AssClienteOfertaModel).where(AssClienteOfertaModel.oferta_id == oferta_id)
        )

    # ── Preview de receita ─────────────────────────────────────────────────────

    async def preview_receita(self, oferta_id: str) -> dict:
        """Calcula totais para a prévia de receita da oferta."""
        oferta = await self.buscar_oferta(oferta_id)
        clientes = await self.listar_clientes_oferta(oferta_id)

        total_ofertado = sum(c.valor_ofertado or 0 for c in clientes)
        total_finalizado = sum(
            c.valor_ofertado or 0 for c in clientes if c.status == "FINALIZADO"
        )
        total_confirmado = sum(
            c.valor_ofertado or 0 for c in clientes if c.status in ("FINALIZADO", "RESERVADO")
        )
        total_em_aberto = sum(
            c.valor_ofertado or 0 for c in clientes
            if c.status not in ("FINALIZADO", "RESERVADO")
        )
        roa = oferta.roa if oferta else 0.0
        receita_prevista = total_ofertado * roa / 100
        receita_finalizada = total_finalizado * roa / 100
        receita_confirmada = total_confirmado * roa / 100
        receita_em_aberto = total_em_aberto * roa / 100

        status_counts = {}
        for c in clientes:
            status_counts[c.status] = status_counts.get(c.status, 0) + 1

        return {
            "total_clientes": len(clientes),
            "total_ofertado": total_ofertado,
            "total_finalizado": total_finalizado,
            "total_confirmado": total_confirmado,
            "total_em_aberto": total_em_aberto,
            "roa": roa,
            "receita_prevista": receita_prevista,
            "receita_finalizada": receita_finalizada,
            "receita_confirmada": receita_confirmada,
            "receita_em_aberto": receita_em_aberto,
            "por_status": status_counts,
        }

    async def resumo_clientes_por_oferta(self, todos_clientes: list | None = None) -> dict:
        """Retorna todos os clientes participantes com suas ofertas.

        Formato retornado:
        {
          "ofertas": [{"id": ..., "nome": ..., "roa": ...}, ...],
          "clientes": [
            {
              "codigo_conta": ..., "nome_cliente": ..., "net": ...,
              "participacoes": {"oferta_id": {"valor": ..., "status": ..., "receita": ...}}
            },
            ...
          ]
        }
        """
        ofertas = await self.listar_ofertas()
        # Buscar todos os registros de clientes vinculados a ofertas
        stmt = select(AssClienteOfertaModel)
        todos_itens = list((await self._session.execute(stmt)).scalars().all())

        # Montar mapa de participações por conta
        participacoes_map: dict[str, dict] = {}
        for item in todos_itens:
            conta = item.codigo_conta
            if conta not in participacoes_map:
                participacoes_map[conta] = {}
            oferta = next((o for o in ofertas if o.id == item.oferta_id), None)
            receita = (item.valor_ofertado or 0) * (oferta.roa if oferta else 0) / 100
            participacoes_map[conta][item.oferta_id] = {
                "item_id": item.id,
                "valor": item.valor_ofertado,
                "status": item.status,
                "receita": receita,
            }

        # Montar lista de clientes — inclui todos se fornecidos, senão só vinculados
        if todos_clientes:
            clientes_lista = [
                {
                    "codigo_conta": c["codigo_conta"],
                    "nome_cliente": c["nome"],
                    "net": c["net"],
                    "participacoes": participacoes_map.get(c["codigo_conta"], {}),
                }
                for c in todos_clientes
            ]
        else:
            clientes_lista = sorted(
                [
                    {
                        "codigo_conta": conta,
                        "nome_cliente": next(
                            (i.nome_cliente for i in todos_itens if i.codigo_conta == conta), None
                        ),
                        "net": next(
                            (i.net for i in todos_itens if i.codigo_conta == conta), None
                        ),
                        "participacoes": parts,
                    }
                    for conta, parts in participacoes_map.items()
                ],
                key=lambda c: c["net"] or 0,
                reverse=True,
            )

        return {
            "ofertas": [
                {
                    "id": o.id, "nome": o.nome, "roa": o.roa,
                    "data_liquidacao": str(o.data_liquidacao) if o.data_liquidacao else None,
                }
                for o in ofertas
            ],
            "clientes": clientes_lista,
        }
