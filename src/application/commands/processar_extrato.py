"""Command: ProcessarExtrato."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProcessarExtrato:
    """Comando para processar um extrato PDF e criar análise de carteira.

    Args:
        cliente_id: ID do cliente proprietário.
        pdf_bytes: Conteúdo binário do PDF de extrato.
        nome_arquivo: Nome original do arquivo (para rastreabilidade).
        data_referencia: Data de referência do extrato (ISO format: YYYY-MM-DD).
        idempotency_key: Chave de idempotência (obrigatória).
    """

    cliente_id: str
    pdf_bytes: bytes
    nome_arquivo: str
    data_referencia: str
    idempotency_key: str

    def __post_init__(self) -> None:
        if not self.idempotency_key.strip():
            raise ValueError("idempotency_key é obrigatória para commands.")
        if not self.cliente_id.strip():
            raise ValueError("cliente_id é obrigatório.")
        if not self.pdf_bytes:
            raise ValueError("pdf_bytes não pode ser vazio.")
        if not self.data_referencia.strip():
            raise ValueError("data_referencia é obrigatória.")
