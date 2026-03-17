"""Value Object SubtipoRendaFixa - tipo específico de instrumento de renda fixa."""

from __future__ import annotations

from enum import Enum


class SubtipoRendaFixa(str, Enum):
    """Subtipo de instrumento de Renda Fixa / Crédito Privado.

    Determina: tributação exata, cobertura FGC, perfil de risco e liquidez típica.
    """

    # ── Títulos Públicos ─────────────────────────────────────────────────
    TESOURO_SELIC      = "TESOURO_SELIC"       # LFT — pós-fixado Selic
    TESOURO_PREFIXADO  = "TESOURO_PREFIXADO"   # LTN — prefixado
    TESOURO_IPCA       = "TESOURO_IPCA"        # NTN-B — IPCA+cupom

    # ── Crédito Bancário (cobertos pelo FGC até R$250k) ──────────────────
    CDB                = "CDB"                 # Certificado de Depósito Bancário
    LCI                = "LCI"                 # Letra de Crédito Imobiliário (isento IR PF)
    LCA                = "LCA"                 # Letra de Crédito do Agronegócio (isento IR PF)
    LC                 = "LC"                  # Letra de Câmbio (financeiras)
    LF                 = "LF"                  # Letra Financeira (mín R$150k, sem FGC)
    RDB                = "RDB"                 # Recibo de Depósito Bancário

    # ── Crédito Corporativo (sem FGC) ────────────────────────────────────
    DEBENTURE          = "DEBENTURE"           # Debênture comum (IR regressivo)
    DEBENTURE_INCENTIVADA = "DEBENTURE_INCENTIVADA"  # Lei 12.431 — isento IR PF
    CRI                = "CRI"                 # Certificado de Recebíveis Imobiliários (isento IR PF)
    CRA                = "CRA"                 # Certificado de Recebíveis do Agronegócio (isento IR PF)
    CCB                = "CCB"                 # Cédula de Crédito Bancário
    CPR                = "CPR"                 # Cédula de Produto Rural
    CCCB               = "CCCB"                # Certificado de Cédula de Crédito Bancário
    NCE                = "NCE"                 # Nota de Crédito à Exportação

    # ── Fundos e Estruturados ────────────────────────────────────────────
    FIDC               = "FIDC"                # Fundo de Investimento em Direitos Creditórios
    COE                = "COE"                 # Certificado de Operações Estruturadas

    # ── Outros ───────────────────────────────────────────────────────────
    OUTRO              = "OUTRO"

    @property
    def isento_ir_pf(self) -> bool:
        """Isento de IR para Pessoa Física (legislação vigente 2026)."""
        return self in {
            SubtipoRendaFixa.LCI,
            SubtipoRendaFixa.LCA,
            SubtipoRendaFixa.CRI,
            SubtipoRendaFixa.CRA,
            SubtipoRendaFixa.DEBENTURE_INCENTIVADA,
        }

    @property
    def coberto_fgc(self) -> bool:
        """Coberto pelo Fundo Garantidor de Crédito (até R$250k por CPF por instituição)."""
        return self in {
            SubtipoRendaFixa.CDB,
            SubtipoRendaFixa.LCI,
            SubtipoRendaFixa.LCA,
            SubtipoRendaFixa.LC,
            SubtipoRendaFixa.RDB,
        }

    @property
    def limite_fgc(self) -> float:
        """Limite de cobertura FGC por CPF por instituição (R$)."""
        return 250_000.0 if self.coberto_fgc else 0.0

    @property
    def aliquota_ir_minima(self) -> float:
        """Alíquota mínima de IR aplicável (tabela regressiva, prazo > 720 dias)."""
        if self.isento_ir_pf:
            return 0.0
        return 15.0  # tabela regressiva: 22,5% (≤180d) → 20% → 17,5% → 15% (>720d)

    @property
    def eh_titulo_publico(self) -> bool:
        """Emitido pelo Tesouro Nacional."""
        return self in {
            SubtipoRendaFixa.TESOURO_SELIC,
            SubtipoRendaFixa.TESOURO_PREFIXADO,
            SubtipoRendaFixa.TESOURO_IPCA,
        }

    @property
    def eh_credito_privado(self) -> bool:
        """Emitido por empresa privada ou banco (não Tesouro)."""
        return not self.eh_titulo_publico

    def __str__(self) -> str:
        labels = {
            SubtipoRendaFixa.TESOURO_SELIC:           "Tesouro Selic",
            SubtipoRendaFixa.TESOURO_PREFIXADO:        "Tesouro Prefixado",
            SubtipoRendaFixa.TESOURO_IPCA:             "Tesouro IPCA+",
            SubtipoRendaFixa.CDB:                      "CDB",
            SubtipoRendaFixa.LCI:                      "LCI",
            SubtipoRendaFixa.LCA:                      "LCA",
            SubtipoRendaFixa.LC:                       "LC",
            SubtipoRendaFixa.LF:                       "LF",
            SubtipoRendaFixa.RDB:                      "RDB",
            SubtipoRendaFixa.DEBENTURE:                "Debênture",
            SubtipoRendaFixa.DEBENTURE_INCENTIVADA:    "Debênture Incentivada",
            SubtipoRendaFixa.CRI:                      "CRI",
            SubtipoRendaFixa.CRA:                      "CRA",
            SubtipoRendaFixa.CCB:                      "CCB",
            SubtipoRendaFixa.CPR:                      "CPR",
            SubtipoRendaFixa.CCCB:                     "CCCB",
            SubtipoRendaFixa.NCE:                      "NCE",
            SubtipoRendaFixa.FIDC:                     "FIDC",
            SubtipoRendaFixa.COE:                      "COE",
            SubtipoRendaFixa.OUTRO:                    "Outro",
        }
        return labels[self]
