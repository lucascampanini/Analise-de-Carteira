"""Entity FluxoCaixa - evento de pagamento projetado de um ativo de RF."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum
from uuid import UUID, uuid4

from src.domain.value_objects.indexador_projecao import IndexadorProjecao


class TipoEventoCaixa(str, Enum):
    """Tipo do evento de caixa gerado."""

    JUROS              = "Juros"              # cupom semestral intermediário
    AMORTIZACAO_FINAL  = "Amortizacao Final"  # devolução do principal no vencimento
    VENCIMENTO         = "Vencimento"         # bullet: cupom + principal juntos


@dataclass
class FluxoCaixa:
    """Evento de caixa projetado de um ativo de Renda Fixa.

    Representa um pagamento futuro (juros, amortização ou vencimento bullet)
    com valores bruto, alíquota de IR e líquido já calculados.

    Não é Aggregate Root — é entity satélite do domínio de consolidação.
    Gerado por GeradorFluxoCaixa e consumido pelo handler de consolidação.
    """

    id: UUID
    ativo_nome: str
    conta: str
    data: date
    evento: TipoEventoCaixa
    valor_bruto: float
    aliquota_ir: float          # 0.0 a 0.225 (ou 0.0 se isento)
    valor_liquido: float
    ir_isento: bool
    indexador: IndexadorProjecao

    @classmethod
    def criar(
        cls,
        ativo_nome: str,
        conta: str,
        data: date,
        evento: TipoEventoCaixa,
        valor_bruto: float,
        aliquota_ir: float,
        ir_isento: bool,
        indexador: IndexadorProjecao,
    ) -> "FluxoCaixa":
        """Factory method: cria FluxoCaixa calculando o valor líquido automaticamente."""
        ir_efetivo = 0.0 if ir_isento else aliquota_ir
        valor_liquido = valor_bruto * (1 - ir_efetivo)
        return cls(
            id=uuid4(),
            ativo_nome=ativo_nome,
            conta=conta,
            data=data,
            evento=evento,
            valor_bruto=valor_bruto,
            aliquota_ir=ir_efetivo,
            valor_liquido=valor_liquido,
            ir_isento=ir_isento,
            indexador=indexador,
        )

    @property
    def imposto(self) -> float:
        return self.valor_bruto - self.valor_liquido
