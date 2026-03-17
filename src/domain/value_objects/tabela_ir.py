"""Value Object TabelaIR - tabela regressiva de IR para Renda Fixa."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import ClassVar


@dataclass(frozen=True)
class TabelaIR:
    """Regras da tabela regressiva de IR para Renda Fixa (RFB — Lei 11.033/2004).

    Alíquotas determinadas pelo prazo decorrido desde a data de aplicação.
    Instrumento imutável — as faixas são lei, não configuração.

    Isenções para Pessoa Física (Lei 12.431/2011 e art. 3º Lei 11.033/2004):
    - CRI (Certificado de Recebíveis Imobiliários)
    - CRA (Certificado de Recebíveis do Agronegócio)
    - Debêntures Incentivadas (infraestrutura)
    - LCI, LCA (isenção tratada pelo campo ir_isento na entidade)
    """

    # Faixas: (prazo_max_dias, aliquota_decimal)
    FAIXAS: ClassVar[tuple[tuple[int, float], ...]] = (
        (180,  0.225),  # até 180 dias: 22,5%
        (360,  0.200),  # 181–360 dias: 20,0%
        (720,  0.175),  # 361–720 dias: 17,5%
        (9999, 0.150),  # acima de 720 dias: 15,0%
    )

    def aliquota(
        self,
        data_aplicacao: date | None,
        data_pagamento: date,
        ir_isento: bool = False,
    ) -> float:
        """Retorna a alíquota de IR aplicável a um evento de pagamento.

        Args:
            data_aplicacao: Data de compra/aplicação do título.
                Se None, assume 15% (prazo longo — conservador para o cliente).
            data_pagamento: Data do evento (cupom, amortização, vencimento).
            ir_isento: True para CRI, CRA, Debêntures Incentivadas, LCI, LCA.

        Returns:
            Alíquota decimal (0.0 a 0.225). Zero se isento.
        """
        if ir_isento:
            return 0.0
        if data_aplicacao is None:
            return 0.150  # assume prazo longo
        dias = (data_pagamento - data_aplicacao).days
        for prazo_max, aliquota in self.FAIXAS:
            if dias <= prazo_max:
                return aliquota
        return 0.150  # fallback

    def imposto_sobre_ganho(
        self,
        valor_bruto: float,
        custo: float,
        data_aplicacao: date | None,
        data_pagamento: date,
        ir_isento: bool = False,
    ) -> float:
        """Calcula IR em R$ sobre o ganho de capital de um evento.

        Args:
            valor_bruto: Valor bruto recebido no evento.
            custo: Custo de aquisição da parcela correspondente.
            data_aplicacao: Data de aplicação.
            data_pagamento: Data do pagamento.
            ir_isento: Isenção para CRI/CRA/DEB incentivadas.

        Returns:
            Valor de IR em R$ (nunca negativo).
        """
        if ir_isento:
            return 0.0
        ganho = max(0.0, valor_bruto - custo)
        aliq = self.aliquota(data_aplicacao, data_pagamento, ir_isento)
        return ganho * aliq

    def valor_liquido(
        self,
        valor_bruto: float,
        custo: float,
        data_aplicacao: date | None,
        data_pagamento: date,
        ir_isento: bool = False,
    ) -> float:
        """Retorna valor líquido após IR."""
        return valor_bruto - self.imposto_sobre_ganho(
            valor_bruto, custo, data_aplicacao, data_pagamento, ir_isento
        )
