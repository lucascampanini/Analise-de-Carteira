"""Port: envio de mensagens WhatsApp."""

from __future__ import annotations

from typing import Protocol


class WhatsAppPort(Protocol):
    """Interface para envio de mensagens via WhatsApp."""

    async def enviar_mensagem(self, numero: str, mensagem: str) -> bool:
        """Envia mensagem de texto. Retorna True se enviado com sucesso."""
        ...

    async def enviar_documento(self, numero: str, caminho_arquivo: str, caption: str = "") -> bool:
        """Envia arquivo (PDF, XLSX). Retorna True se enviado com sucesso."""
        ...
