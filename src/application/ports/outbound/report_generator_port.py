"""Port outbound: ReportGeneratorPort."""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from src.application.dto.carteira_dto import AnaliseCarteiraRelatorioDTO


class ReportGeneratorPort(Protocol):
    """Gerador de relatórios de análise de carteira (Driven Port)."""

    async def generate_pdf(
        self, analise_dto: "AnaliseCarteiraRelatorioDTO"
    ) -> bytes:
        """Gera o relatório PDF da análise de carteira.

        Args:
            analise_dto: DTO enriquecido com todos os dados para o relatório.

        Returns:
            Bytes do PDF gerado.

        Raises:
            RuntimeError: Se a geração falhar.
        """
        ...
