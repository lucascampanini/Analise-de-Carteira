"""Command: ProcessarExcel."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProcessarExcel:
    """Comando para processar uma planilha Excel de carteira e criar análise.

    Args:
        cliente_id: ID do cliente proprietário.
        excel_bytes: Conteúdo binário do arquivo .xlsx.
        nome_arquivo: Nome original do arquivo (para rastreabilidade).
        data_referencia: Data de referência da carteira (ISO format: YYYY-MM-DD).
        idempotency_key: Chave de idempotência (obrigatória).
    """

    cliente_id: str
    excel_bytes: bytes
    nome_arquivo: str
    data_referencia: str
    idempotency_key: str

    def __post_init__(self) -> None:
        if not self.idempotency_key.strip():
            raise ValueError("idempotency_key é obrigatória para commands.")
        if not self.cliente_id.strip():
            raise ValueError("cliente_id é obrigatório.")
        if not self.excel_bytes:
            raise ValueError("excel_bytes não pode ser vazio.")
        if not self.data_referencia.strip():
            raise ValueError("data_referencia é obrigatória.")
