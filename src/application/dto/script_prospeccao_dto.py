"""DTOs para ScriptProspeccao."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SpinProspeccaoDTO:
    situation: list[str]
    problem: list[str]
    implication: list[str]
    need_payoff: list[str]


@dataclass(frozen=True)
class ObjecaoRespostaProspeccaoDTO:
    objecao: str
    resposta: str


@dataclass(frozen=True)
class ScriptProspeccaoDTO:
    cenario: str
    nome_prospect: str
    mensagem_abertura: str
    spin: SpinProspeccaoDTO
    call_to_action: str
    challenger_hook: str
    followup_mensagem: str
    objecoes_previstas: list[ObjecaoRespostaProspeccaoDTO]
