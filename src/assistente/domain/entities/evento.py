"""Entidade Evento — data importante monitorada pelo assistente."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from enum import Enum


class TipoEvento(str, Enum):
    VENCIMENTO_RF = "VENCIMENTO_RF"
    ANIVERSARIO = "ANIVERSARIO"
    JANELA_RESGATE = "JANELA_RESGATE"
    RESGATE_FUNDO = "RESGATE_FUNDO"
    LIQUIDACAO = "LIQUIDACAO"
    OUTROS = "OUTROS"
    TAREFA = "TAREFA"
    REUNIAO_AGENDADA = "REUNIAO_AGENDADA"


class StatusEvento(str, Enum):
    ATIVO = "ATIVO"
    ALERTADO = "ALERTADO"
    CONCLUIDO = "CONCLUIDO"
    CANCELADO = "CANCELADO"


@dataclass
class Evento:
    """Data importante a ser monitorada e alertada via WhatsApp."""

    id: str
    tipo: TipoEvento
    descricao: str
    data_evento: date
    alertar_dias_antes: int = 1
    status: StatusEvento = StatusEvento.ATIVO
    codigo_conta: str | None = None
    nome_cliente: str | None = None
    criado_em: datetime = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.criado_em is None:
            self.criado_em = datetime.now(timezone.utc)

    def dias_para_evento(self, hoje: date | None = None) -> int:
        """Quantos dias faltam para o evento."""
        if hoje is None:
            hoje = date.today()
        return (self.data_evento - hoje).days

    def deve_alertar(self, hoje: date | None = None) -> bool:
        """Verifica se hoje é o dia de enviar o alerta."""
        dias = self.dias_para_evento(hoje)
        return self.status == StatusEvento.ATIVO and 0 <= dias <= self.alertar_dias_antes
