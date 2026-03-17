"""Adapter: PdfPlumberClaudeParser - extração de posições de PDF via pdfplumber + Claude API."""

from __future__ import annotations

import io
import json
import logging
from decimal import Decimal, InvalidOperation

import httpx

from src.application.ports.outbound.pdf_parser_port import PosicaoParsedDTO

logger = logging.getLogger(__name__)


EXTRACTION_PROMPT = """\
Você é um especialista em extratos de corretoras brasileiras (XP, BTG, Rico, Clear, Nu Invest, etc.).

Dado o texto abaixo extraído de um extrato de carteira de investimentos, extraia TODAS as posições.

Para cada posição encontrada, retorne um objeto JSON com EXATAMENTE estes campos:
{
  "ticker": "código do ativo (ex: PETR4, MXRF11, TESOURO-SELIC-2027, CDB-BANCO-2026)",
  "nome": "nome completo do ativo",
  "quantidade": "número de unidades/cotas como string numérica (ex: '100', '1.5', '0.00012345')",
  "preco_medio": "preço médio de aquisição em R$ como string numérica (ex: '32.50')",
  "valor_atual": "valor atual de mercado em R$ como string numérica (ex: '3500.00')",
  "classe_ativo": "uma das opções: ACAO, FII, ETF, RENDA_FIXA, BDR, FUNDO_INVESTIMENTO, CRIPTO",
  "setor": "setor econômico (ex: 'Petróleo e Gás', 'Fundos Imobiliários', 'Renda Fixa', 'Tecnologia')",
  "emissor": "nome da empresa emissora ou banco (ex: 'Petrobras', 'Tesouro Nacional', 'Itaú')",

  "subtipo_rf": "APENAS para RENDA_FIXA — subtipo: TESOURO_SELIC/TESOURO_PREFIXADO/TESOURO_IPCA/CDB/LCI/LCA/LC/LF/RDB/DEBENTURE/DEBENTURE_INCENTIVADA/CRI/CRA/CCB/CPR/CCCB/NCE/FIDC/COE/OUTRO — null para outros",
  "indexador_rf": "APENAS para RENDA_FIXA — indexador: CDI_PERCENTUAL/CDI_MAIS/SELIC/IGPM/IPCA_MAIS/IPCA_PERCENTUAL/PREFIXADO/USD_MAIS/OUTRO — null para outros",
  "taxa_rf": "APENAS para RENDA_FIXA — valor numérico da taxa (ex: 120.0 para 120% CDI, 5.5 para IPCA+5,5%, 13.25 para 13,25% a.a.) — null para outros",
  "data_vencimento_rf": "APENAS para RENDA_FIXA — data de vencimento no formato YYYY-MM-DD — null para outros",
  "data_carencia_rf": "APENAS para RENDA_FIXA — data de carência YYYY-MM-DD se houver, ou null",
  "liquidez_rf": "APENAS para RENDA_FIXA — DIARIA/CARENCIA/NO_VENCIMENTO/MERCADO_SECUNDARIO — null para outros",
  "cnpj_emissor_rf": "APENAS para RENDA_FIXA — CNPJ do emissor com 14 dígitos sem pontuação, ou null se não disponível",
  "rating_escala_rf": "APENAS para RENDA_FIXA — escala de rating: AAA/AA+/AA/AA-/A+/A/A-/BBB+/BBB/BBB-/BB+/BB/BB-/B+/B/B-/CCC/CC/C/D/NR — null se não disponível",
  "rating_agencia_rf": "APENAS para RENDA_FIXA — agência: S&P/Fitch/Moody's/Austin Rating/SR Rating — null se não disponível",
  "garantias_rf": "APENAS para RENDA_FIXA — descrição das garantias (ex: 'Alienação fiduciária', 'Sem garantia real') — null para outros"
}

Regras importantes:
- Use RENDA_FIXA para: Tesouro Direto, CDB, LCI, LCA, Debêntures, CRI, CRA, CCB, LC, LCI, LF, FIDC, COE
- Use FII para fundos imobiliários (geralmente terminam em 11)
- Use ACAO para ações (ON, PN, Units)
- Use ETF para fundos de índice (BOVA11, IVVB11, etc.)
- Use BDR para BDRs brasileiros (geralmente terminam em 34 ou 35)
- Use CRIPTO para Bitcoin, Ethereum e outras criptomoedas
- Para ativos de RENDA_FIXA, preencha TODOS os campos *_rf que conseguir identificar no texto
- Taxas CDI_PERCENTUAL: valor é o percentual do CDI (ex: 110 para 110% CDI)
- Taxas CDI_MAIS, IPCA_MAIS, IGPM: valor é o spread (ex: 3.5 para CDI+3,5% ou IPCA+3,5%)
- Taxas PREFIXADO: valor é a taxa anual (ex: 13.5 para 13,5% a.a.)
- Se quantidade ou preço médio não estiver disponível, use "0"
- Retorne SOMENTE um array JSON válido, SEM markdown, SEM explicações

Texto do extrato:
"""


class PdfPlumberClaudeParser:
    """Parser de extrato de corretora usando pdfplumber para extração de texto
    e Claude API para interpretação inteligente das posições.

    Fallback para extração por regex se Claude API não estiver disponível.
    """

    ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
    CLAUDE_MODEL = "claude-haiku-4-5-20251001"
    MAX_TEXT_CHARS = 15000  # Limite para não estourar context window

    def __init__(
        self,
        anthropic_api_key: str,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = anthropic_api_key
        self._http_client = http_client
        self._own_client = http_client is None

    async def parse_extrato(self, pdf_bytes: bytes) -> list[PosicaoParsedDTO]:
        """Extrai posições de um PDF de extrato de corretora.

        Fluxo: pdfplumber (extrai texto) → Claude API (interpreta) → fallback regex.

        Args:
            pdf_bytes: Conteúdo binário do arquivo PDF.

        Returns:
            Lista de posições parseadas como PosicaoParsedDTO.

        Raises:
            ValueError: Se nenhuma posição for encontrada.
        """
        # 1. Extrair texto e tabelas com pdfplumber
        texto = self._extract_text(pdf_bytes)
        if not texto.strip():
            raise ValueError("PDF não contém texto extraível. Verifique se é um PDF válido.")

        # 2. Tentar extração via Claude API
        try:
            posicoes = await self._extract_via_claude(texto)
            if posicoes:
                logger.info(
                    "PDF parseado com sucesso via Claude API",
                    extra={"total_posicoes": len(posicoes)},
                )
                return posicoes
        except Exception as exc:
            logger.warning(
                "Claude API falhou, usando fallback",
                extra={"error": str(exc)},
            )

        # 3. Fallback: extração por regex
        posicoes = self._extract_via_regex_fallback(texto)
        if posicoes:
            logger.info(
                "PDF parseado com fallback regex",
                extra={"total_posicoes": len(posicoes)},
            )
            return posicoes

        raise ValueError(
            "Não foi possível extrair posições do PDF. "
            "Verifique se o arquivo é um extrato de carteira válido."
        )

    def _extract_text(self, pdf_bytes: bytes) -> str:
        """Extrai texto e tabelas do PDF usando pdfplumber."""
        try:
            import pdfplumber
        except ImportError:
            raise RuntimeError(
                "pdfplumber não está instalado. Execute: pip install pdfplumber"
            )

        pages_text: list[str] = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text() or ""

                # Extrair tabelas também
                tables = page.extract_tables()
                table_text = ""
                for table in tables:
                    for row in table:
                        if row:
                            row_str = " | ".join(str(cell or "").strip() for cell in row)
                            if row_str.strip(" |"):
                                table_text += row_str + "\n"

                pages_text.append(
                    f"=== Página {page_num} ===\n{page_text}\n{table_text}"
                )

        full_text = "\n\n".join(pages_text)
        # Truncar se muito longo
        if len(full_text) > self.MAX_TEXT_CHARS:
            full_text = full_text[: self.MAX_TEXT_CHARS] + "\n[... texto truncado ...]"

        return full_text

    async def _extract_via_claude(self, texto: str) -> list[PosicaoParsedDTO]:
        """Chama Claude API para extrair posições do texto."""
        prompt = EXTRACTION_PROMPT + texto

        payload = {
            "model": self.CLAUDE_MODEL,
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
        }
        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        if self._own_client:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.ANTHROPIC_API_URL, json=payload, headers=headers
                )
        else:
            response = await self._http_client.post(
                self.ANTHROPIC_API_URL, json=payload, headers=headers
            )

        response.raise_for_status()
        data = response.json()

        content = data["content"][0]["text"].strip()

        # Remover markdown se presente
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content

        raw_list = json.loads(content)
        return [self._parse_raw_posicao(item) for item in raw_list if item]

    def _parse_raw_posicao(self, raw: dict) -> PosicaoParsedDTO:
        """Converte dict bruto do Claude para PosicaoParsedDTO."""
        def to_decimal(value: str | float | int) -> Decimal:
            try:
                cleaned = str(value).replace(",", ".").strip()
                return Decimal(cleaned)
            except (InvalidOperation, ValueError):
                return Decimal("0")

        quantidade = to_decimal(raw.get("quantidade", "0"))
        preco_medio = float(to_decimal(raw.get("preco_medio", "0")))
        valor_atual = float(to_decimal(raw.get("valor_atual", "0")))

        # Calcular valor_atual a partir de quantidade * preco_medio se ausente
        if valor_atual == 0 and quantidade > 0 and preco_medio > 0:
            valor_atual = float(quantidade) * preco_medio

        def to_str_or_none(key: str) -> str | None:
            val = raw.get(key)
            if val is None or str(val).lower() in ("null", "none", ""):
                return None
            return str(val).strip()

        def to_float_or_none(key: str) -> float | None:
            val = raw.get(key)
            if val is None or str(val).lower() in ("null", "none", ""):
                return None
            try:
                return float(str(val).replace(",", "."))
            except (ValueError, TypeError):
                return None

        return PosicaoParsedDTO(
            ticker=str(raw.get("ticker", "DESCONHECIDO")).upper().strip(),
            nome=str(raw.get("nome", raw.get("ticker", "Ativo Desconhecido"))).strip(),
            quantidade=quantidade,
            preco_medio=preco_medio,
            valor_atual=max(0.01, valor_atual),  # Mínimo R$0,01 para ser válido
            classe_ativo=str(raw.get("classe_ativo", "ACAO")).upper().strip(),
            setor=str(raw.get("setor", "Não classificado")).strip(),
            emissor=str(raw.get("emissor", raw.get("nome", "Desconhecido"))).strip(),
            # RF-specific fields
            subtipo_rf=to_str_or_none("subtipo_rf"),
            indexador_rf=to_str_or_none("indexador_rf"),
            taxa_rf=to_float_or_none("taxa_rf"),
            data_vencimento_rf=to_str_or_none("data_vencimento_rf"),
            data_carencia_rf=to_str_or_none("data_carencia_rf"),
            liquidez_rf=to_str_or_none("liquidez_rf"),
            cnpj_emissor_rf=to_str_or_none("cnpj_emissor_rf"),
            rating_escala_rf=to_str_or_none("rating_escala_rf"),
            rating_agencia_rf=to_str_or_none("rating_agencia_rf"),
            garantias_rf=to_str_or_none("garantias_rf"),
        )

    def _extract_via_regex_fallback(self, texto: str) -> list[PosicaoParsedDTO]:
        """Fallback: tenta extrair posições usando padrões regex comuns em extratos B3."""
        import re

        posicoes: list[PosicaoParsedDTO] = []

        # Padrão para ações B3: ticker (4 letras + 1-2 dígitos) seguido de números
        padrao_acao = re.compile(
            r"\b([A-Z]{4}\d{1,2})\b"
            r"[^\n]*?(\d[\d.,]*)\s+(?:cotas?|un|ações)?"
            r"[^\n]*?R?\$?\s*([\d.,]+)",
            re.IGNORECASE,
        )

        for match in padrao_acao.finditer(texto):
            ticker = match.group(1).upper()
            try:
                quantidade = Decimal(match.group(2).replace(".", "").replace(",", "."))
                valor = float(match.group(3).replace(".", "").replace(",", "."))
                if quantidade > 0 and valor > 0:
                    posicoes.append(
                        PosicaoParsedDTO(
                            ticker=ticker,
                            nome=ticker,
                            quantidade=quantidade,
                            preco_medio=valor / float(quantidade),
                            valor_atual=valor,
                            classe_ativo=self._inferir_classe(ticker),
                            setor="Não classificado",
                            emissor="Desconhecido",
                        )
                    )
            except (InvalidOperation, ZeroDivisionError, ValueError):
                continue

        return posicoes

    @staticmethod
    def _inferir_classe(ticker: str) -> str:
        """Infere a classe do ativo pelo padrão do ticker."""
        import re

        ticker = ticker.upper()
        if re.match(r"^[A-Z]{4}11$", ticker):
            return "FII"  # ex: MXRF11, HGLG11
        if re.match(r"^[A-Z]{4}3[45]$", ticker):
            return "BDR"  # ex: AMZO34, MSFT34
        if ticker.startswith("TESOURO") or ticker.startswith("CDB") or ticker.startswith("LCI"):
            return "RENDA_FIXA"
        if ticker in {"BOVA11", "IVVB11", "SMAL11", "HASH11", "GOLD11"}:
            return "ETF"
        return "ACAO"
