"""Handler: AgendarReuniaoCommand."""

from __future__ import annotations

import uuid

import structlog

from src.assistente.application.commands.agendar_reuniao import AgendarReuniaoCommand
from src.assistente.application.ports.outbound.calendar_port import CalendarPort, EventoCalendario
from src.assistente.application.ports.outbound.reuniao_repository import ReuniaoRepository
from src.assistente.domain.entities.reuniao import Reuniao

logger = structlog.get_logger(__name__)


class AgendarReuniaoHandler:
    def __init__(
        self,
        reuniao_repository: ReuniaoRepository,
        calendar_port: CalendarPort | None = None,
    ) -> None:
        self._repo = reuniao_repository
        self._calendar = calendar_port

    async def handle(self, command: AgendarReuniaoCommand) -> str:
        """Agenda reunião. Retorna o ID criado."""
        reuniao = Reuniao(
            id=str(uuid.uuid4()),
            titulo=command.titulo,
            data_hora=command.data_hora,
            duracao_minutos=command.duracao_minutos,
            codigo_conta=command.codigo_conta,
            nome_cliente=command.nome_cliente,
            descricao=command.descricao,
            gerar_relatorio=command.gerar_relatorio,
        )

        # Criar no Outlook se configurado
        if command.criar_no_outlook and self._calendar is not None:
            from datetime import timedelta

            evento_outlook = EventoCalendario(
                titulo=command.titulo,
                data_inicio=command.data_hora,
                data_fim=command.data_hora + timedelta(minutes=command.duracao_minutos),
                descricao=command.descricao or "",
            )
            outlook_id = await self._calendar.criar_evento(evento_outlook)
            reuniao.outlook_event_id = outlook_id
            logger.info("reuniao_criada_outlook", outlook_id=outlook_id)

        await self._repo.salvar(reuniao)
        logger.info(
            "reuniao_agendada",
            reuniao_id=reuniao.id,
            titulo=reuniao.titulo,
            data=str(reuniao.data_hora),
            cliente=reuniao.nome_cliente,
        )
        return reuniao.id
