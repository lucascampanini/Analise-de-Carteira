"""Pydantic schemas para o endpoint de consolidação de carteiras."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AtivoRFRequest(BaseModel):
    """Schema de entrada para um ativo de Renda Fixa ou Fundo."""
    nome: str
    conta: str
    tipo: str = Field(description="CDB, CRI, CRA, Debenture, Tesouro IPCA, Fundo CDI, etc.")
    indexador: str = Field(description="CDI | IPCA | Pre | Multi | RV")
    posicao: float = Field(gt=0, description="Valor atual em R$")
    ir_isento: bool = False
    pmt_tipo: str = Field(default="bullet", description="bullet | semestral")
    taxa: float | None = Field(default=None, description="% CDI, spread IPCA ou taxa pré")
    pmt_meses: list[int] = Field(default=[], description="Meses de pagamento. Ex: [2, 8] NTN-B")
    ntnb_coupon_flag: bool = Field(default=False, description="True para NTN-B (cupom 6% real)")
    data_aplicacao: str | None = Field(default=None, description="YYYY-MM-DD")
    data_vencimento: str | None = Field(default=None, description="YYYY-MM-DD")
    face: float | None = None
    preco_unitario: float | None = None
    nota: str = ""


class AcaoRequest(BaseModel):
    """Schema de entrada para uma ação."""
    ticker: str
    nome: str
    conta: str
    qtd: int = Field(gt=0)
    ultimo_preco: float = Field(gt=0)
    posicao: float = Field(gt=0)


class CenarioRequest(BaseModel):
    """Cenário personalizado de análise de sensibilidade."""
    nome: str
    delta_cdi: float = Field(description="Ajuste em p.p. (ex: +0.5 ou -1.0)")
    delta_ipca: float = Field(description="Ajuste em p.p. (ex: -0.5 ou +1.5)")


class ConsolidacaoRequest(BaseModel):
    """Body completo do POST /api/v1/consolidacao."""
    ativos_rf: list[AtivoRFRequest] = Field(min_length=1)
    acoes: list[AcaoRequest] = []
    anos_projecao: list[int] = Field(
        default=[2026, 2027, 2028, 2029, 2030, 2031],
        description="Anos do horizonte de projeção",
    )
    cenarios: list[CenarioRequest] | None = None
    usar_focus_api: bool = Field(
        default=True,
        description="True = busca taxas do BCB Focus em tempo real",
    )

    model_config = {"json_schema_extra": {
        "example": {
            "ativos_rf": [
                {
                    "nome": "CDB BANCO DIGIMAIS - ABR/2027",
                    "conta": "9702693",
                    "tipo": "CDB",
                    "indexador": "CDI",
                    "taxa": 121.0,
                    "posicao": 253227.61,
                    "ir_isento": False,
                    "pmt_tipo": "bullet",
                    "data_aplicacao": "2023-04-17",
                    "data_vencimento": "2027-04-16",
                }
            ],
            "acoes": [],
            "anos_projecao": [2026, 2027, 2028, 2029, 2030, 2031],
            "usar_focus_api": True,
        }
    }}
