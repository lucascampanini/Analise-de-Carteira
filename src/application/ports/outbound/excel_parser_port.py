"""Port outbound: ExcelParserPort."""

from __future__ import annotations

from typing import Protocol

from src.application.ports.outbound.pdf_parser_port import PosicaoParsedDTO


class ExcelParserPort(Protocol):
    """Parser de carteiras em planilha Excel (Driven Port).

    Reutiliza PosicaoParsedDTO como ACL — mesmo contrato do PDF parser.
    """

    def parse_carteira(self, excel_bytes: bytes) -> list[PosicaoParsedDTO]:
        """Lê posições de um arquivo .xlsx de carteira.

        Args:
            excel_bytes: Conteúdo binário do arquivo Excel.

        Returns:
            Lista de posições parseadas.

        Raises:
            ValueError: Se o arquivo não puder ser lido ou estiver mal formatado.
        """
        ...
