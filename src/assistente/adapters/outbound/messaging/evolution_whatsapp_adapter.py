"""Adapter: Evolution API (WhatsApp).

Evolution API é open source e permite usar número WhatsApp pessoal/Business.
Documentação: https://doc.evolution-api.com

Para configurar:
  1. Instalar Evolution API (Docker: docker run evolution-api/evolution-api)
  2. Criar instância com seu número
  3. Escanear QR Code pelo WhatsApp
  4. Configurar BOT_EVOLUTION_API_URL, BOT_EVOLUTION_API_KEY, BOT_EVOLUTION_INSTANCE_NAME no .env
"""

from __future__ import annotations

import structlog
import httpx

logger = structlog.get_logger(__name__)


class EvolutionWhatsAppAdapter:
    """Envia mensagens via Evolution API."""

    def __init__(self, api_url: str, api_key: str, instance_name: str) -> None:
        self._base_url = api_url.rstrip("/")
        self._api_key = api_key
        self._instance = instance_name
        self._headers = {"apikey": api_key, "Content-Type": "application/json"}

    async def enviar_mensagem(self, numero: str, mensagem: str) -> bool:
        """Envia mensagem de texto.

        Args:
            numero: Número no formato internacional sem + (ex: 5511999999999)
            mensagem: Texto da mensagem
        """
        url = f"{self._base_url}/message/sendText/{self._instance}"
        payload = {
            "number": numero,
            "text": mensagem,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=self._headers)
                resp.raise_for_status()
                logger.info("whatsapp_enviado", numero=numero[:6] + "****")
                return True
        except httpx.HTTPError as e:
            logger.error("whatsapp_erro_envio", erro=str(e), numero=numero[:6] + "****")
            return False

    async def enviar_documento(self, numero: str, caminho_arquivo: str, caption: str = "") -> bool:
        """Envia arquivo (PDF, XLSX) via Evolution API.

        Args:
            numero: Número no formato internacional sem +
            caminho_arquivo: Caminho absoluto do arquivo
            caption: Legenda do arquivo
        """
        import base64
        from pathlib import Path

        arquivo = Path(caminho_arquivo)
        if not arquivo.exists():
            logger.error("whatsapp_arquivo_nao_encontrado", caminho=caminho_arquivo)
            return False

        with open(arquivo, "rb") as f:
            conteudo_b64 = base64.b64encode(f.read()).decode()

        url = f"{self._base_url}/message/sendMedia/{self._instance}"
        payload = {
            "number": numero,
            "mediatype": "document",
            "mimetype": "application/octet-stream",
            "caption": caption,
            "media": conteudo_b64,
            "fileName": arquivo.name,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload, headers=self._headers)
                resp.raise_for_status()
                logger.info("whatsapp_documento_enviado", arquivo=arquivo.name)
                return True
        except httpx.HTTPError as e:
            logger.error("whatsapp_erro_documento", erro=str(e))
            return False
