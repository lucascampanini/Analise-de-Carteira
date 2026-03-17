"""Domain Service CalculadorIrRf - IR para eventos de renda fixa."""

from __future__ import annotations

from datetime import date

from src.domain.value_objects.tabela_ir import TabelaIR


class CalculadorIrRf:
    """Calcula IR para eventos de pagamento de Renda Fixa.

    Stateless — centraliza as regras de isenção e tabela regressiva.
    Isenções previstas em lei:
      - CRI/CRA (Lei 12.431/2011, art. 2º e 3º)
      - Debêntures Incentivadas (Lei 12.431/2011, art. 2º)
      - LCI/LCA (Lei 8.668/1993 c/c MP 2.158/2001)
    """

    def __init__(self) -> None:
        self._tabela = TabelaIR()

    def aliquota_evento(
        self,
        data_aplicacao: date | None,
        data_pagamento: date,
        ir_isento: bool,
    ) -> float:
        """Retorna a alíquota aplicável a um evento de pagamento.

        Args:
            data_aplicacao: Data de compra/aplicação. None → assume 15%.
            data_pagamento: Data futura do evento.
            ir_isento: True para CRI, CRA, Debêntures Incentivadas, LCI, LCA.

        Returns:
            Alíquota decimal (0.0–0.225). Zero para isentos.
        """
        return self._tabela.aliquota(data_aplicacao, data_pagamento, ir_isento)

    def calcular_ir_cupom(
        self,
        valor_cupom: float,
        data_aplicacao: date | None,
        data_pagamento: date,
        ir_isento: bool,
    ) -> tuple[float, float]:
        """Calcula IR sobre um cupom de juros intermediário.

        Para cupons semi-anuais, o IR incide sobre o valor bruto do cupom
        (simplificação de mercado — sem separação entre retorno de capital e juros).

        Args:
            valor_cupom: Valor bruto do cupom em R$.
            data_aplicacao: Data de aplicação inicial.
            data_pagamento: Data de pagamento do cupom.
            ir_isento: Flag de isenção.

        Returns:
            Tuple (aliquota, valor_ir) em decimal e R$.
        """
        aliq = self.aliquota_evento(data_aplicacao, data_pagamento, ir_isento)
        valor_ir = valor_cupom * aliq
        return aliq, valor_ir

    def calcular_ir_vencimento(
        self,
        valor_final: float,
        custo_aquisicao: float,
        data_aplicacao: date | None,
        data_vencimento: date,
        ir_isento: bool,
    ) -> tuple[float, float]:
        """Calcula IR sobre o ganho no vencimento de um título bullet.

        IR incide apenas sobre o GANHO de capital (valor_final − custo).

        Args:
            valor_final: Valor projetado no vencimento.
            custo_aquisicao: Valor investido originalmente.
            data_aplicacao: Data de aplicação.
            data_vencimento: Data de vencimento do título.
            ir_isento: Flag de isenção.

        Returns:
            Tuple (aliquota, valor_ir). Ganho negativo → IR = 0.
        """
        aliq = self.aliquota_evento(data_aplicacao, data_vencimento, ir_isento)
        ganho = max(0.0, valor_final - custo_aquisicao)
        valor_ir = ganho * aliq
        return aliq, valor_ir
