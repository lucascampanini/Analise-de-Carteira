"""Value Object ArgumentoVenda - argumento SPIN estruturado para uma recomendação."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class ArgumentoVenda:
    """Argumento de venda estruturado via metodologia SPIN para uma recomendação.

    Encapsula perguntas SPIN, script de WhatsApp, objeções previstas e dados
    quantitativos de apoio. Gerado pelo GeradorArgumentoVenda a partir de uma
    Recomendacao e dos dados da análise.

    Args:
        recomendacao_id: UUID da Recomendacao à qual este argumento pertence.
        perguntas_situation: Perguntas de contexto (usar com parcimônia, max 3).
        perguntas_problem: Perguntas que expõem insatisfações latentes.
        perguntas_implication: Perguntas que amplificam o custo do problema (foco principal).
        perguntas_need_payoff: Perguntas que fazem o cliente articular o valor da solução.
        script_whatsapp: Mensagem pronta para envio por WhatsApp/escrita.
        objecoes_previstas: Lista de (objeção provável, resposta estruturada).
        challenger_reframe: Enquadramento contraintuitivo para abertura Challenger Sale.
        dados_quantitativos: Métricas da análise embutidas nos argumentos (ex: CVaR, HHI).
    """

    recomendacao_id: UUID
    perguntas_situation: tuple[str, ...]
    perguntas_problem: tuple[str, ...]
    perguntas_implication: tuple[str, ...]
    perguntas_need_payoff: tuple[str, ...]
    script_whatsapp: str
    objecoes_previstas: tuple[tuple[str, str], ...]
    challenger_reframe: str
    dados_quantitativos: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Serializa para JSON-safe dict."""
        return {
            "recomendacao_id": str(self.recomendacao_id),
            "spin": {
                "situation": list(self.perguntas_situation),
                "problem": list(self.perguntas_problem),
                "implication": list(self.perguntas_implication),
                "need_payoff": list(self.perguntas_need_payoff),
            },
            "script_whatsapp": self.script_whatsapp,
            "challenger_reframe": self.challenger_reframe,
            "objecoes_previstas": [
                {"objecao": o, "resposta": r} for o, r in self.objecoes_previstas
            ],
            "dados_quantitativos": self.dados_quantitativos,
        }
