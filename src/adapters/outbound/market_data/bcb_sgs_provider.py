"""Adapter: BcbSgsProvider - dados do Banco Central (CDI, IPCA, Selic)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

# Códigos das séries do BCB SGS
BCB_SGS_CDI = 12       # CDI diário (% ao dia)
BCB_SGS_IPCA = 433     # IPCA mensal (% ao mês)
BCB_SGS_SELIC = 11     # Selic diária (% ao dia)


class BcbSgsProvider:
    """Provedor de dados do Banco Central via API SGS (Sistema Gerenciador de Séries).

    API gratuita, sem autenticação: https://api.bcb.gov.br/dados/serie/
    """

    BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados"

    def __init__(self, http_client: httpx.AsyncClient | None = None) -> None:
        self._http_client = http_client
        self._own_client = http_client is None

    async def fetch_cdi_diario(self, period_days: int = 252) -> list[float]:
        """Busca CDI diário do BCB SGS.

        Args:
            period_days: Número de dias úteis de histórico.

        Returns:
            Lista de retornos diários decimais (ex: [0.000523, 0.000521]).
        """
        dados = await self._fetch_serie(BCB_SGS_CDI, period_days)
        # BCB retorna CDI em % ao dia (ex: 0.0523 = 0.0523%)
        return [float(d["valor"]) / 100.0 for d in dados if d.get("valor") not in (None, "")]

    async def fetch_selic_diaria(self, period_days: int = 252) -> list[float]:
        """Busca Selic diária do BCB SGS."""
        dados = await self._fetch_serie(BCB_SGS_SELIC, period_days)
        return [float(d["valor"]) / 100.0 for d in dados if d.get("valor") not in (None, "")]

    async def fetch_ipca_mensal(self, period_months: int = 12) -> list[float]:
        """Busca IPCA mensal do BCB SGS.

        Args:
            period_months: Número de meses de histórico.

        Returns:
            Lista de inflações mensais decimais.
        """
        dados = await self._fetch_serie(BCB_SGS_IPCA, period_months * 22)
        # Pegar apenas os últimos N meses
        return [float(d["valor"]) / 100.0 for d in dados[-period_months:] if d.get("valor") not in (None, "")]

    async def _fetch_serie(self, serie: int, period_days: int) -> list[dict]:
        """Busca dados de uma série do BCB SGS."""
        data_fim = datetime.now()
        data_inicio = data_fim - timedelta(days=period_days + 60)  # margem para feriados

        params = {
            "formato": "json",
            "dataInicial": data_inicio.strftime("%d/%m/%Y"),
            "dataFinal": data_fim.strftime("%d/%m/%Y"),
        }
        url = self.BASE_URL.format(serie=serie)

        try:
            if self._own_client:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url, params=params)
            else:
                response = await self._http_client.get(url, params=params)

            response.raise_for_status()
            dados = response.json()
            return dados[-period_days:] if len(dados) > period_days else dados

        except Exception as exc:
            logger.warning("Erro ao buscar série BCB SGS %s: %s", serie, exc)
            return []
