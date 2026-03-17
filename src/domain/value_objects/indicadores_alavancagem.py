"""Value Object IndicadoresAlavancagem - alavancagem financeira da empresa."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IndicadoresAlavancagem:
    """Indicadores de alavancagem financeira extraídos do último relatório da empresa.

    Baseado nos campos do balanço patrimonial e DRE (via yfinance).
    Aplica-se apenas a ACAO e BDR — não a RF, FII, ETF, Cripto ou Fundos.

    Args:
        ticker: Código do ativo (ex: PETR4, VALE3).
        divida_liquida_ebitda: Dívida Líquida / EBITDA (métrica principal de alavancagem).
        divida_bruta_pl: Dívida Bruta / Patrimônio Líquido (D/E ratio, decimal — ex: 1.5).
        cobertura_juros: EBIT / Despesas Financeiras (quantas vezes cobre os juros).
        divida_liquida_milhoes: Dívida Líquida em R$ milhões (pode ser negativa = caixa líquido).
        ebitda_milhoes: EBITDA em R$ milhões.
        data_referencia: Data do último relatório consultado ("YYYY-MM-DD").
        fonte: Fonte dos dados (ex: "yfinance").
    """

    ticker: str
    divida_liquida_ebitda: float | None   # principal métrica de alavancagem
    divida_bruta_pl: float | None         # D/E (ex: 1.5 = 150%)
    cobertura_juros: float | None         # EBIT / Desp. Financeiras
    divida_liquida_milhoes: float | None  # R$ mi (negativo = caixa líquido)
    ebitda_milhoes: float | None          # R$ mi
    data_referencia: str = ""             # "YYYY-MM-DD"
    fonte: str = "yfinance"

    # ── Classificação de risco ────────────────────────────────────────────

    @property
    def nivel_risco(self) -> str:
        """Classificação do risco de alavancagem com base na Dív. Líq./EBITDA."""
        dl_ebitda = self.divida_liquida_ebitda
        if dl_ebitda is None:
            return "Sem Dados"
        if dl_ebitda < 0:
            return "Caixa Líquido"
        if dl_ebitda <= 1.0:
            return "Baixa"
        if dl_ebitda <= 2.0:
            return "Moderada"
        if dl_ebitda <= 3.5:
            return "Alta"
        if dl_ebitda <= 5.0:
            return "Muito Alta"
        return "Crítica"

    @property
    def eh_preocupante(self) -> bool:
        """Alavancagem elevada: Dív./EBITDA > 3.5x ou Cobertura < 2.0x."""
        dl_ebitda = self.divida_liquida_ebitda
        if dl_ebitda is not None and dl_ebitda > 3.5:
            return True
        cj = self.cobertura_juros
        if cj is not None and cj < 2.0:
            return True
        return False

    @property
    def eh_critico(self) -> bool:
        """Alavancagem crítica: Dív./EBITDA > 5.0x ou Cobertura < 1.0x."""
        dl_ebitda = self.divida_liquida_ebitda
        if dl_ebitda is not None and dl_ebitda > 5.0:
            return True
        cj = self.cobertura_juros
        if cj is not None and cj < 1.0:
            return True
        return False

    # ── Alertas ──────────────────────────────────────────────────────────

    def gerar_alertas(self) -> list[str]:
        """Gera alertas de alavancagem para esta empresa.

        Returns:
            Lista de alertas (vazia se alavancagem saudável).
        """
        alertas: list[str] = []
        ticker = self.ticker
        dl_ebitda = self.divida_liquida_ebitda
        cj = self.cobertura_juros

        if dl_ebitda is not None:
            if dl_ebitda > 5.0:
                alertas.append(
                    f"🔴 ALAVANCAGEM CRÍTICA: {ticker} com Dív. Líq./EBITDA de "
                    f"{dl_ebitda:.1f}x — risco de insolvência elevado."
                )
            elif dl_ebitda > 3.5:
                alertas.append(
                    f"⚠ ALAVANCAGEM MUITO ALTA: {ticker} com Dív. Líq./EBITDA de "
                    f"{dl_ebitda:.1f}x — atenção ao endividamento."
                )
            elif dl_ebitda > 2.0:
                alertas.append(
                    f"ℹ ALAVANCAGEM ALTA: {ticker} com Dív. Líq./EBITDA de "
                    f"{dl_ebitda:.1f}x."
                )

        if cj is not None:
            if cj < 1.0:
                alertas.append(
                    f"🔴 COBERTURA DE JUROS CRÍTICA: {ticker} gera EBIT insuficiente "
                    f"para cobrir as despesas financeiras ({cj:.1f}x)."
                )
            elif cj < 2.0:
                alertas.append(
                    f"⚠ COBERTURA DE JUROS BAIXA: {ticker} cobre os juros apenas "
                    f"{cj:.1f}x com o EBIT atual."
                )

        return alertas

    # ── Serialização ─────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        """Serializa para dict JSON-safe (para armazenamento em AnaliseCarteira)."""
        return {
            "ticker": self.ticker,
            "divida_liquida_ebitda": self.divida_liquida_ebitda,
            "divida_bruta_pl": self.divida_bruta_pl,
            "cobertura_juros": self.cobertura_juros,
            "divida_liquida_milhoes": self.divida_liquida_milhoes,
            "ebitda_milhoes": self.ebitda_milhoes,
            "data_referencia": self.data_referencia,
            "fonte": self.fonte,
            "nivel_risco": self.nivel_risco,
            "eh_preocupante": self.eh_preocupante,
            "eh_critico": self.eh_critico,
            "alertas": self.gerar_alertas(),
        }
