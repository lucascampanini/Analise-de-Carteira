"""Driven Port ExcelConsolidadoPort - geração de workbook Excel de consolidação."""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:
    from src.application.dto.consolidacao_dto import ConsolidacaoDTO


@runtime_checkable
class ExcelConsolidadoPort(Protocol):
    """Porta de saída: gera arquivo Excel (.xlsx) de consolidação de carteiras.

    Implementações:
    - OpenpyxlExcelGenerator (produção) — 6 abas com openpyxl
    """

    async def generate_excel(self, dto: "ConsolidacaoDTO") -> bytes:
        """Gera workbook Excel com 6 abas a partir do ConsolidacaoDTO.

        Abas geradas:
        - PREMISSAS: taxas Focus editáveis + tabela regressiva IR
        - POSICAO CONSOLIDADA: todos os ativos das N contas por indexador
        - FLUXO DE CAIXA RF: agenda de pagamentos + reinvestimento acumulado
        - PROJECAO ANUAL: evolução patrimonial ano a ano por ativo
        - CENARIOS: BASE / OTIMISTA / PESSIMISTA / STRESS
        - ACOES: quadro de renda variável separado

        Args:
            dto: Resultado completo da consolidação.

        Returns:
            Bytes do arquivo .xlsx pronto para download.

        Raises:
            RuntimeError: Em caso de falha na geração do arquivo.
        """
        ...
