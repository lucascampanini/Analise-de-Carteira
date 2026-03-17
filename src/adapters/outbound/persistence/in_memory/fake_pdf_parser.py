"""Fake PdfParser para testes."""

from __future__ import annotations

from decimal import Decimal

from src.application.ports.outbound.pdf_parser_port import PosicaoParsedDTO


class FakePdfParser:
    """Implementação fake do PdfParserPort para testes unitários.

    Retorna um conjunto fixo de posições ou as posições configuradas.
    """

    def __init__(
        self,
        posicoes: list[PosicaoParsedDTO] | None = None,
        should_fail: bool = False,
    ) -> None:
        self._posicoes = posicoes or self._default_posicoes()
        self._should_fail = should_fail

    async def parse_extrato(self, pdf_bytes: bytes) -> list[PosicaoParsedDTO]:
        if self._should_fail:
            raise ValueError("FakePdfParser configurado para falhar.")
        return self._posicoes

    @staticmethod
    def _default_posicoes() -> list[PosicaoParsedDTO]:
        return [
            PosicaoParsedDTO(
                ticker="PETR4",
                nome="Petrobras PN",
                quantidade=Decimal("100"),
                preco_medio=30.00,
                valor_atual=3500.00,
                classe_ativo="ACAO",
                setor="Petróleo e Gás",
                emissor="Petrobras",
            ),
            PosicaoParsedDTO(
                ticker="MXRF11",
                nome="Maxi Renda FII",
                quantidade=Decimal("200"),
                preco_medio=9.80,
                valor_atual=2100.00,
                classe_ativo="FII",
                setor="Fundos Imobiliários",
                emissor="XP Asset",
            ),
            PosicaoParsedDTO(
                ticker="TESOURO-SELIC-2027",
                nome="Tesouro Selic 2027",
                quantidade=Decimal("1"),
                preco_medio=10000.00,
                valor_atual=10500.00,
                classe_ativo="RENDA_FIXA",
                setor="Renda Fixa",
                emissor="Tesouro Nacional",
                subtipo_rf="TESOURO_SELIC",
                indexador_rf="SELIC",
                taxa_rf=100.0,
                data_vencimento_rf="2027-03-01",
                liquidez_rf="DIARIA",
            ),
            PosicaoParsedDTO(
                ticker="CDB-ITAU-2026",
                nome="CDB Itaú 120% CDI",
                quantidade=Decimal("1"),
                preco_medio=50000.00,
                valor_atual=52000.00,
                classe_ativo="RENDA_FIXA",
                setor="Renda Fixa",
                emissor="Itaú Unibanco",
                subtipo_rf="CDB",
                indexador_rf="CDI_PERCENTUAL",
                taxa_rf=120.0,
                data_vencimento_rf="2026-12-01",
                liquidez_rf="NO_VENCIMENTO",
                cnpj_emissor_rf="60701190000104",
                rating_escala_rf="AAA",
                rating_agencia_rf="Austin Rating",
            ),
        ]
