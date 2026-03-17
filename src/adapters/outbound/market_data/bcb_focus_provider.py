"""Adapter: BcbFocusProvider - Boletim Focus do BCB via Olinda OData API."""

from __future__ import annotations

from datetime import date
from urllib.parse import quote

import httpx
import structlog

from src.domain.value_objects.premissas_mercado import PremissaAno, PremissasMercado

logger = structlog.get_logger(__name__)

OLINDA_BASE = (
    "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata"
)

# Mapeamento de indicador Focus → chave em PremissaAno
_INDICADORES = {
    "CDI":   "cdi_pct_aa",
    "IPCA":  "ipca_pct_aa",
    "IGP-M": "igpm_pct_aa",
    "Selic": "selic_pct_aa",
}


class BcbFocusProvider:
    """Adapter para o Boletim Focus do BCB via API Olinda (OData).

    Busca ExpectativasMercadoAnuais para CDI, IPCA, IGP-M e Selic.
    Fallback automático para PremissasMercado.fallback() se API indisponível.

    Endpoints:
    - ExpectativasMercadoAnuais: projeções ano-calendário por indicador
    - Sem autenticação. Rate limit generoso (uso educacional/gratuito).
    """

    def __init__(self, http_client: httpx.AsyncClient | None = None) -> None:
        self._http_client = http_client
        self._own_client = http_client is None

    async def fetch_premissas(
        self,
        anos: list[int],
        data_referencia: date | None = None,
    ) -> PremissasMercado:
        """Busca expectativas Focus para os anos solicitados.

        Args:
            anos: Lista de anos-calendário.
            data_referencia: Referência de data para o Focus. None = hoje.

        Returns:
            PremissasMercado. Retorna fallback se API indisponível.
        """
        ref = data_referencia or date.today()

        try:
            dados: dict[str, dict[int, float]] = {}
            for indicador in _INDICADORES:
                dados[indicador] = await self._fetch_indicador(indicador, anos, ref)

            premissas_anos = []
            for ano in anos:
                selic = dados.get("Selic", {}).get(ano, 10.50)
                # CDI não existe como indicador em ExpectativasMercadoAnuais — usa Selic-0.10
                cdi = dados.get("CDI", {}).get(ano) or max(selic - 0.10, 0.01)
                premissas_anos.append(PremissaAno(
                    ano=ano,
                    cdi_pct_aa=cdi,
                    ipca_pct_aa=dados.get("IPCA", {}).get(ano, 3.50),
                    igpm_pct_aa=dados.get("IGP-M", {}).get(ano, 3.50),
                    selic_pct_aa=selic,
                ))

            if not premissas_anos:
                return PremissasMercado.fallback()

            return PremissasMercado(
                data_referencia=ref,
                anos=tuple(premissas_anos),
                fonte=f"BCB Focus {ref.strftime('%d/%m/%Y')}",
            )

        except Exception as exc:
            logger.warning(
                "bcb_focus_provider_erro",
                error=str(exc),
                fallback=True,
            )
            return PremissasMercado.fallback()

    async def _fetch_indicador(
        self,
        indicador: str,
        anos: list[int],
        data_ref: date,
    ) -> dict[int, float]:
        """Busca um indicador da ExpectativasMercadoAnuais e retorna {ano: mediana}."""
        # Filtros OData: indicador + suavizado + data de referência recente
        data_str = data_ref.strftime("%Y-%m-%d")
        # Busca últimas 100 entradas para o indicador, pega a mais recente por ano
        filtro = (
            f"Indicador eq '{indicador}'"
            f" and Suavizado eq 'S'"
        )
        params = {
            "$filter": filtro,
            "$orderby": "Data desc",
            "$top": "50",
            "$format": "json",
            "$select": "Indicador,Data,Ano,Mediana,Suavizado",
        }

        url = f"{OLINDA_BASE}/ExpectativasMercadoAnuais"
        dados_raw = await self._get(url, params)

        # Organiza por ano: pega a mediana mais recente disponível
        por_ano: dict[int, float] = {}
        for item in dados_raw:
            try:
                ano = int(item.get("Ano", 0))
                mediana = float(item.get("Mediana", 0))
                if ano in anos and ano not in por_ano and mediana > 0:
                    por_ano[ano] = mediana
            except (ValueError, TypeError):
                continue

        # Se não encontrou via Suavizado, tenta sem o filtro
        if not por_ano:
            por_ano = await self._fetch_indicador_sem_suavizado(indicador, anos)

        return por_ano

    async def _fetch_indicador_sem_suavizado(
        self, indicador: str, anos: list[int]
    ) -> dict[int, float]:
        """Fallback: busca sem filtro de suavizado."""
        params = {
            "$filter": f"Indicador eq '{indicador}'",
            "$orderby": "Data desc",
            "$top": "100",
            "$format": "json",
            "$select": "Indicador,Data,Ano,Mediana",
        }
        url = f"{OLINDA_BASE}/ExpectativasMercadoAnuais"
        dados_raw = await self._get(url, params)

        por_ano: dict[int, float] = {}
        for item in dados_raw:
            try:
                ano = int(item.get("Ano", 0))
                mediana = float(item.get("Mediana", 0))
                if ano in anos and ano not in por_ano and mediana > 0:
                    por_ano[ano] = mediana
            except (ValueError, TypeError):
                continue
        return por_ano

    async def _get(self, url: str, params: dict) -> list[dict]:
        """Executa GET na API Olinda e retorna a lista de valores."""
        try:
            if self._own_client:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(url, params=params)
            else:
                resp = await self._http_client.get(url, params=params)

            resp.raise_for_status()
            data = resp.json()
            return data.get("value", [])

        except httpx.HTTPStatusError as exc:
            logger.warning(
                "bcb_focus_http_error",
                status=exc.response.status_code,
                url=url,
            )
            return []
        except Exception as exc:
            logger.warning("bcb_focus_request_error", error=str(exc), url=url)
            return []
