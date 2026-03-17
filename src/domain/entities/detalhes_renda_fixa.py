"""Entity DetalhesRendaFixa - informações específicas de crédito privado/RF."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from uuid import UUID

from src.domain.exceptions.domain_exceptions import InvalidEntityError
from src.domain.value_objects.indexador_renda_fixa import IndexadorRendaFixa
from src.domain.value_objects.rating_credito import RatingCredito
from src.domain.value_objects.subtipo_renda_fixa import SubtipoRendaFixa


class LiquidezRendaFixa(str):
    """Liquidez disponível para resgate."""
    DIARIA          = "DIARIA"           # resgate em D+0 ou D+1
    CARENCIA        = "CARENCIA"         # só após período de carência
    NO_VENCIMENTO   = "NO_VENCIMENTO"    # liquidez apenas no vencimento
    MERCADO_SEC     = "MERCADO_SECUNDARIO"  # negociável no mercado secundário


@dataclass
class DetalhesRendaFixa:
    """Informações específicas de um ativo de Renda Fixa / Crédito Privado.

    Entity embedded dentro de Ativo — não é Aggregate Root.
    Captura tudo necessário para análise de crédito, tributação e duração.

    Args:
        ativo_id: ID do Ativo ao qual estes detalhes pertencem.
        subtipo: Tipo específico do instrumento (CDB, LCI, Debênture, etc.).
        indexador: Índice de remuneração (CDI%, IPCA+, Prefixado, etc.).
        taxa: Valor da taxa (ex: 120.0 para 120% CDI; 5.5 para IPCA+5,5%).
        data_emissao: Data de emissão do título.
        data_vencimento: Data de vencimento.
        data_carencia: Data até a qual não há liquidez (None = sem carência).
        liquidez: Tipo de liquidez disponível.
        coberto_fgc: Se coberto pelo FGC (automático via subtipo, pode ser sobrescrito).
        valor_coberto_fgc: Valor efetivamente coberto pelo FGC nesta posição.
        cnpj_emissor: CNPJ do emissor (14 dígitos, sem formatação).
        rating: Rating de crédito do emissor ou da emissão (None se não classificado).
        numero_serie: Série ou código de emissão (ex: 1ª Série, ISIN BR...).
        garantias: Descrição das garantias (ex: "Garantia real — alienação fiduciária").
        amortizacao: Regime de amortização (ex: "bullet", "mensal", "semestral").
    """

    ativo_id: UUID
    subtipo: SubtipoRendaFixa
    indexador: IndexadorRendaFixa
    taxa: float                          # valor numérico da taxa
    data_vencimento: date
    data_emissao: date | None = None
    data_carencia: date | None = None
    liquidez: str = "NO_VENCIMENTO"
    coberto_fgc: bool = field(init=False)
    valor_coberto_fgc: float = 0.0       # R$ efetivamente protegido pelo FGC
    cnpj_emissor: str = ""
    rating: RatingCredito | None = None
    numero_serie: str = ""
    garantias: str = "Sem garantia real"
    amortizacao: str = "Bullet"

    # ── Campos para projeção de fluxo de caixa (ConsolidarCarteiras) ────
    pmt_tipo: str = "bullet"              # "bullet" | "semestral"
    pmt_meses: list[int] = field(default_factory=list)  # ex: [2, 8] para NTN-B
    ntnb_coupon_flag: bool = False        # True → cupom = posicao * 2.9563% (NTN-B 6% real)
    data_aplicacao: date | None = None   # data de compra para tabela regressiva de IR

    def __post_init__(self) -> None:
        # Cobertura FGC é determinada pelo subtipo (regra de negócio do domínio)
        object.__setattr__(self, "coberto_fgc", self.subtipo.coberto_fgc)

        if self.taxa < 0:
            raise InvalidEntityError(
                f"DetalhesRendaFixa inválido: taxa não pode ser negativa ({self.taxa})."
            )
        if self.data_emissao and self.data_emissao > self.data_vencimento:
            raise InvalidEntityError(
                "DetalhesRendaFixa inválido: data de emissão não pode ser após o vencimento."
            )
        if self.data_carencia and self.data_carencia > self.data_vencimento:
            raise InvalidEntityError(
                "DetalhesRendaFixa inválido: carência não pode ser após o vencimento."
            )
        # Limpa CNPJ para somente dígitos
        if self.cnpj_emissor:
            import re
            cnpj_digits = re.sub(r"\D", "", self.cnpj_emissor)
            if cnpj_digits and len(cnpj_digits) != 14:
                raise InvalidEntityError(
                    f"DetalhesRendaFixa inválido: CNPJ deve ter 14 dígitos, "
                    f"recebeu '{self.cnpj_emissor}'."
                )
            self.cnpj_emissor = cnpj_digits

    # ── Cálculos de tempo ────────────────────────────────────────────────

    @property
    def dias_ate_vencimento(self) -> int:
        """Dias corridos até o vencimento (negativo se já vencido)."""
        return (self.data_vencimento - date.today()).days

    @property
    def dias_ate_carencia(self) -> int | None:
        """Dias corridos até o fim da carência (None se sem carência)."""
        if self.data_carencia is None:
            return None
        return max(0, (self.data_carencia - date.today()).days)

    @property
    def esta_vencido(self) -> bool:
        return self.dias_ate_vencimento < 0

    @property
    def vence_em_breve(self) -> bool:
        """Vence em até 90 dias."""
        return 0 <= self.dias_ate_vencimento <= 90

    @property
    def em_carencia(self) -> bool:
        """Ainda dentro do período de carência."""
        if self.data_carencia is None:
            return False
        return date.today() <= self.data_carencia

    # ── Tributação ───────────────────────────────────────────────────────

    @property
    def isento_ir(self) -> bool:
        """Isento de IR para Pessoa Física."""
        return self.subtipo.isento_ir_pf

    @property
    def aliquota_ir_atual(self) -> float:
        """Alíquota de IR atual com base no prazo decorrido desde a emissão (tabela regressiva).

        Tabela regressiva IR RF:
          até 180 dias:  22,5%
          181-360 dias:  20,0%
          361-720 dias:  17,5%
          acima 720 dias: 15,0%
        """
        if self.isento_ir:
            return 0.0
        if self.data_emissao is None:
            return 15.0  # assume prazo longo se não informado
        dias_decorridos = (date.today() - self.data_emissao).days
        if dias_decorridos <= 180:
            return 22.5
        elif dias_decorridos <= 360:
            return 20.0
        elif dias_decorridos <= 720:
            return 17.5
        return 15.0

    # ── Descrição da taxa ─────────────────────────────────────────────────

    @property
    def taxa_formatada(self) -> str:
        """Retorna a taxa no formato legível (ex: '120% CDI', 'IPCA+5,50%', '13,25% a.a.')."""
        idx = self.indexador
        if idx == IndexadorRendaFixa.CDI_PERCENTUAL:
            return f"{self.taxa:.0f}% CDI"
        elif idx == IndexadorRendaFixa.CDI_MAIS:
            return f"CDI + {self.taxa:.2f}%"
        elif idx == IndexadorRendaFixa.IPCA_MAIS:
            return f"IPCA + {self.taxa:.2f}% a.a."
        elif idx == IndexadorRendaFixa.IPCA_PERCENTUAL:
            return f"{self.taxa:.0f}% IPCA"
        elif idx == IndexadorRendaFixa.PREFIXADO:
            return f"{self.taxa:.2f}% a.a."
        elif idx == IndexadorRendaFixa.SELIC:
            return f"{self.taxa:.0f}% Selic"
        elif idx == IndexadorRendaFixa.IGPM:
            return f"IGP-M + {self.taxa:.2f}%"
        return f"{self.taxa:.2f}% ({self.indexador})"

    # ── Alertas ──────────────────────────────────────────────────────────

    def gerar_alertas(self, valor_posicao: float) -> list[str]:
        """Gera alertas relevantes para esta posição de RF.

        Args:
            valor_posicao: Valor atual da posição em R$.

        Returns:
            Lista de alertas para exibir no relatório.
        """
        alertas: list[str] = []

        if self.esta_vencido:
            alertas.append(
                f"⚠ VENCIDO: {self.subtipo} venceu em "
                f"{self.data_vencimento.strftime('%d/%m/%Y')}. Providencie resgate."
            )

        if self.vence_em_breve:
            alertas.append(
                f"⏰ VENCE EM BREVE: {self.subtipo} vence em "
                f"{self.dias_ate_vencimento} dias ({self.data_vencimento.strftime('%d/%m/%Y')})."
            )

        if self.em_carencia:
            alertas.append(
                f"🔒 EM CARÊNCIA: {self.subtipo} não pode ser resgatado até "
                f"{self.data_carencia.strftime('%d/%m/%Y')} "  # type: ignore[union-attr]
                f"({self.dias_ate_carencia} dias)."
            )

        if (
            self.coberto_fgc
            and valor_posicao > self.subtipo.limite_fgc
        ):
            excesso = valor_posicao - self.subtipo.limite_fgc
            alertas.append(
                f"⚠ EXCEDE LIMITE FGC: posição de R${valor_posicao:,.2f} no "
                f"{self.subtipo} da instituição supera o limite do FGC de "
                f"R${self.subtipo.limite_fgc:,.0f}. "
                f"R${excesso:,.2f} sem cobertura."
            )

        if not self.coberto_fgc and not self.subtipo.eh_titulo_publico:
            alertas.append(
                f"ℹ SEM FGC: {self.subtipo} não possui cobertura do Fundo "
                "Garantidor de Crédito. Risco de crédito do emissor."
            )

        if self.rating and self.rating.escala.eh_high_yield:
            alertas.append(
                f"⚠ HIGH YIELD: emissor com rating {self.rating} "
                f"(grau especulativo — risco de crédito elevado)."
            )

        if self.indexador.sensivel_a_juros and self.dias_ate_vencimento > 365:
            alertas.append(
                f"📉 RISCO DE DURATION: {self.taxa_formatada} com vencimento em "
                f"{self.dias_ate_vencimento} dias. Marcação a mercado pode ser "
                "negativa se juros subirem."
            )

        return alertas
