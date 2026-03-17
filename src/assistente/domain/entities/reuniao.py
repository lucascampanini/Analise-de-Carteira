"""Entidade Reuniao — reunião agendada no Outlook."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class Reuniao:
    """Reunião com cliente integrada ao Outlook Calendar."""

    id: str
    titulo: str
    data_hora: datetime
    duracao_minutos: int = 60
    codigo_conta: str | None = None
    nome_cliente: str | None = None
    descricao: str | None = None
    outlook_event_id: str | None = None
    gerar_relatorio: bool = False
    relatorio_gerado: bool = False
    status: str = "AGENDADA"
    criado_em: datetime = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.criado_em is None:
            self.criado_em = datetime.now(timezone.utc)

    @property
    def sincronizada_com_outlook(self) -> bool:
        return self.outlook_event_id is not None

    @property
    def precisa_gerar_relatorio_hoje(self) -> bool:
        """Verifica se deve gerar relatório hoje (manhã do dia da reunião)."""
        hoje = datetime.now(timezone.utc).date()
        return (
            self.gerar_relatorio
            and not self.relatorio_gerado
            and self.data_hora.date() == hoje
            and self.status == "AGENDADA"
        )
