"""Value Object ScriptProspeccao — roteiro SPIN para abordagem de novos clientes."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class CenarioProspeccao(str, Enum):
    """Cenário de origem do contato com o prospect."""

    ABORDAGEM_FRIA = "ABORDAGEM_FRIA"          # WhatsApp/LinkedIn sem contexto anterior
    INDICACAO = "INDICACAO"                      # Cliente existente indicou
    EVENTO = "EVENTO"                            # Conheceu em evento/networking
    INSATISFEITO = "INSATISFEITO"               # Sinalizou insatisfação com assessor atual
    EVENTO_DE_VIDA = "EVENTO_DE_VIDA"           # Herança, venda de empresa, aposentadoria


@dataclass(frozen=True)
class ScriptProspeccao:
    """Roteiro SPIN completo para prospecção de novo cliente.

    Contexto diferente do ArgumentoVenda: o prospect ainda não é cliente,
    não há análise, e o único objetivo é converter o contato em um
    diagnóstico gratuito de carteira (primeira reunião).

    Args:
        cenario: Origem e contexto do contato.
        mensagem_abertura: Primeira mensagem (WhatsApp/LinkedIn) — curta, sem pitch.
        perguntas_situation: Contexto atual do prospect (max 2, não intimidar).
        perguntas_problem: Dores latentes sobre a carteira/assessoria atual.
        perguntas_implication: Custo de ficar como está (sem dados, usar estimativas de mercado).
        perguntas_need_payoff: Leva o prospect a pedir o diagnóstico.
        call_to_action: Frase exata de convite para a primeira reunião.
        objecoes_previstas: Objeções típicas de prospecção com respostas.
        challenger_hook: Insight contraintuitivo para abrir a conversa com credibilidade.
        followup_mensagem: Mensagem de follow-up caso não haja resposta em 3 dias.
    """

    cenario: CenarioProspeccao
    mensagem_abertura: str
    perguntas_situation: tuple[str, ...]
    perguntas_problem: tuple[str, ...]
    perguntas_implication: tuple[str, ...]
    perguntas_need_payoff: tuple[str, ...]
    call_to_action: str
    objecoes_previstas: tuple[tuple[str, str], ...]
    challenger_hook: str
    followup_mensagem: str

    def to_dict(self) -> dict:
        """Serializa para JSON-safe dict."""
        return {
            "cenario": self.cenario.value,
            "mensagem_abertura": self.mensagem_abertura,
            "spin": {
                "situation": list(self.perguntas_situation),
                "problem": list(self.perguntas_problem),
                "implication": list(self.perguntas_implication),
                "need_payoff": list(self.perguntas_need_payoff),
            },
            "call_to_action": self.call_to_action,
            "challenger_hook": self.challenger_hook,
            "followup_mensagem": self.followup_mensagem,
            "objecoes_previstas": [
                {"objecao": o, "resposta": r} for o, r in self.objecoes_previstas
            ],
        }
