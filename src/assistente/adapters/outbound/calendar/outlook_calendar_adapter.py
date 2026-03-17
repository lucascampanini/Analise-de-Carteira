"""Adapter: Microsoft Graph API (Outlook Calendar).

Requer registro de aplicativo no Azure AD da SVN:
  1. Acesse portal.azure.com com conta admin da SVN
  2. Azure Active Directory > App registrations > New registration
  3. Nome: "Assistente Assessor"
  4. Permissions: Calendars.ReadWrite (Application permission)
  5. Gerar Client Secret
  6. Configurar BOT_MS_TENANT_ID, BOT_MS_CLIENT_ID, BOT_MS_CLIENT_SECRET, BOT_MS_USER_EMAIL no .env
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog

from src.assistente.application.ports.outbound.calendar_port import CalendarPort, EventoCalendario

logger = structlog.get_logger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class OutlookCalendarAdapter:
    """Gerencia eventos no Outlook via Microsoft Graph API."""

    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        user_email: str,
    ) -> None:
        self._tenant_id = tenant_id
        self._client_id = client_id
        self._client_secret = client_secret
        self._user_email = user_email
        self._token: str | None = None
        self._token_expira: datetime | None = None

    async def _get_token(self) -> str:
        """Obtém token OAuth2 via MSAL (renova automaticamente)."""
        import msal

        agora = datetime.now(timezone.utc)
        if self._token and self._token_expira and agora < self._token_expira:
            return self._token

        app = msal.ConfidentialClientApplication(
            client_id=self._client_id,
            client_credential=self._client_secret,
            authority=f"https://login.microsoftonline.com/{self._tenant_id}",
        )
        result = app.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"]
        )
        if "access_token" not in result:
            raise RuntimeError(f"Falha ao obter token Outlook: {result.get('error_description')}")

        self._token = result["access_token"]
        self._token_expira = agora + timedelta(seconds=result.get("expires_in", 3600) - 60)
        return self._token

    async def criar_evento(self, evento: EventoCalendario) -> str:
        """Cria evento no calendário Outlook. Retorna o ID do evento."""
        import httpx

        token = await self._get_token()
        url = f"{GRAPH_BASE}/users/{self._user_email}/events"

        payload = {
            "subject": evento.titulo,
            "body": {"contentType": "text", "content": evento.descricao},
            "start": {
                "dateTime": evento.data_inicio.isoformat(),
                "timeZone": "E. South America Standard Time",  # Brasília
            },
            "end": {
                "dateTime": evento.data_fim.isoformat(),
                "timeZone": "E. South America Standard Time",
            },
            "location": {"displayName": evento.local} if evento.local else {},
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            resp.raise_for_status()
            evento_id = resp.json()["id"]
            logger.info("outlook_evento_criado", evento_id=evento_id[:20] + "...", titulo=evento.titulo)
            return evento_id

    async def cancelar_evento(self, evento_id: str) -> bool:
        """Cancela (deleta) evento no Outlook."""
        import httpx

        token = await self._get_token()
        url = f"{GRAPH_BASE}/users/{self._user_email}/events/{evento_id}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(
                url,
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 204:
                logger.info("outlook_evento_cancelado", evento_id=evento_id[:20] + "...")
                return True
            logger.warning("outlook_cancelar_falhou", status=resp.status_code)
            return False

    async def listar_eventos_do_dia(self, data: datetime) -> list[EventoCalendario]:
        """Lista eventos de um dia no Outlook."""
        import httpx

        token = await self._get_token()
        inicio = data.replace(hour=0, minute=0, second=0).isoformat()
        fim = data.replace(hour=23, minute=59, second=59).isoformat()
        url = (
            f"{GRAPH_BASE}/users/{self._user_email}/calendarView"
            f"?startDateTime={inicio}&endDateTime={fim}"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            items = resp.json().get("value", [])

        return [
            EventoCalendario(
                titulo=item["subject"],
                data_inicio=datetime.fromisoformat(item["start"]["dateTime"]),
                data_fim=datetime.fromisoformat(item["end"]["dateTime"]),
                descricao=item.get("body", {}).get("content", ""),
            )
            for item in items
        ]
