"""Port: integração com calendário (Outlook)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass
class EventoCalendario:
    titulo: str
    data_inicio: datetime
    data_fim: datetime
    descricao: str = ""
    local: str = ""


class CalendarPort(Protocol):
    """Interface para criar eventos no Outlook via Microsoft Graph API."""

    async def criar_evento(self, evento: EventoCalendario) -> str:
        """Cria evento no calendário. Retorna o ID do evento criado."""
        ...

    async def cancelar_evento(self, evento_id: str) -> bool:
        """Cancela evento pelo ID. Retorna True se cancelado com sucesso."""
        ...

    async def listar_eventos_do_dia(self, data: datetime) -> list[EventoCalendario]:
        """Lista eventos de um dia específico."""
        ...
