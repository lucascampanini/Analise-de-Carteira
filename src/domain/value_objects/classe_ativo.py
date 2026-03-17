"""Value Object ClasseAtivo - categoria de ativo financeiro."""

from __future__ import annotations

from enum import Enum


class ClasseAtivo(str, Enum):
    """Classe/categoria de ativo financeiro suportado.

    Determina regras tributárias e tratamento de risco.
    """

    ACAO = "ACAO"
    FII = "FII"
    ETF = "ETF"
    RENDA_FIXA = "RENDA_FIXA"
    BDR = "BDR"
    FUNDO_INVESTIMENTO = "FUNDO_INVESTIMENTO"
    CRIPTO = "CRIPTO"

    @property
    def is_renda_variavel(self) -> bool:
        """Ativos de renda variável (possuem histórico de preços de mercado)."""
        return self in {
            ClasseAtivo.ACAO,
            ClasseAtivo.FII,
            ClasseAtivo.ETF,
            ClasseAtivo.BDR,
            ClasseAtivo.CRIPTO,
        }

    @property
    def is_renda_fixa(self) -> bool:
        """Ativos de renda fixa (sem preço de mercado histórico contínuo)."""
        return self == ClasseAtivo.RENDA_FIXA

    @property
    def aliquota_ir_swing(self) -> float:
        """Alíquota de IR para swing trade (%)."""
        return {
            ClasseAtivo.ACAO: 15.0,
            ClasseAtivo.FII: 20.0,
            ClasseAtivo.ETF: 15.0,
            ClasseAtivo.BDR: 15.0,
            ClasseAtivo.RENDA_FIXA: 15.0,   # tabela regressiva, mínimo
            ClasseAtivo.FUNDO_INVESTIMENTO: 15.0,
            ClasseAtivo.CRIPTO: 15.0,
        }[self]

    def __str__(self) -> str:
        labels = {
            ClasseAtivo.ACAO: "Ação",
            ClasseAtivo.FII: "FII",
            ClasseAtivo.ETF: "ETF",
            ClasseAtivo.RENDA_FIXA: "Renda Fixa",
            ClasseAtivo.BDR: "BDR",
            ClasseAtivo.FUNDO_INVESTIMENTO: "Fundo de Investimento",
            ClasseAtivo.CRIPTO: "Cripto",
        }
        return labels[self]
