"""Handler: RegistrarEventoCommand."""

from __future__ import annotations

import uuid

import structlog

from src.assistente.application.commands.registrar_evento import RegistrarEventoCommand
from src.assistente.application.ports.outbound.evento_repository import EventoRepository
from src.assistente.domain.entities.evento import Evento, TipoEvento

logger = structlog.get_logger(__name__)


class RegistrarEventoHandler:
    def __init__(self, evento_repository: EventoRepository) -> None:
        self._repo = evento_repository

    async def handle(self, command: RegistrarEventoCommand) -> str:
        """Registra evento. Retorna o ID criado."""
        evento = Evento(
            id=str(uuid.uuid4()),
            tipo=TipoEvento(command.tipo),
            descricao=command.descricao,
            data_evento=command.data_evento,
            alertar_dias_antes=command.alertar_dias_antes,
            codigo_conta=command.codigo_conta,
            nome_cliente=command.nome_cliente,
        )
        await self._repo.salvar(evento)
        logger.info(
            "evento_registrado",
            evento_id=evento.id,
            tipo=evento.tipo,
            data=str(evento.data_evento),
            cliente=evento.nome_cliente,
        )
        return evento.id
