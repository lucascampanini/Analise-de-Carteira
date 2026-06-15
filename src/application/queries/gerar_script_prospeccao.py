"""Query: GerarScriptProspeccao."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GerarScriptProspeccao:
    """Query para gerar roteiro SPIN de prospecção de novo cliente.

    Args:
        cenario: ABORDAGEM_FRIA | INDICACAO | EVENTO | INSATISFEITO | EVENTO_DE_VIDA
        nome_prospect: Nome do prospect para personalização das mensagens.
        nome_indicador: Nome de quem indicou (só para cenário INDICACAO).
        evento_de_vida: Descrição do evento (só para cenário EVENTO_DE_VIDA).
        perfil_estimado: Perfil estimado do prospect (opcional).
    """

    cenario: str
    nome_prospect: str = "[Nome]"
    nome_indicador: str | None = None
    evento_de_vida: str | None = None
    perfil_estimado: str | None = None
