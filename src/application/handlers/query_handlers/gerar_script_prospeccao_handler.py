"""Query Handler: GerarScriptProspeccaoHandler."""

from __future__ import annotations

from src.application.dto.script_prospeccao_dto import (
    ObjecaoRespostaProspeccaoDTO,
    ScriptProspeccaoDTO,
    SpinProspeccaoDTO,
)
from src.application.queries.gerar_script_prospeccao import GerarScriptProspeccao
from src.domain.services.gerador_script_prospeccao import GeradorScriptProspeccao
from src.domain.value_objects.script_prospeccao import CenarioProspeccao


class GerarScriptProspeccaoHandler:
    """Handler para a query GerarScriptProspeccao."""

    def __init__(self, gerador: GeradorScriptProspeccao) -> None:
        self._gerador = gerador

    def handle(self, query: GerarScriptProspeccao) -> ScriptProspeccaoDTO:
        """Gera o roteiro SPIN para o cenário de prospecção informado.

        Args:
            query: Query com cenário e contexto do prospect.

        Returns:
            ScriptProspeccaoDTO com roteiro completo.

        Raises:
            ValueError: Se o cenário informado não for válido.
        """
        try:
            cenario = CenarioProspeccao(query.cenario)
        except ValueError:
            validos = [c.value for c in CenarioProspeccao]
            raise ValueError(
                f"Cenário '{query.cenario}' inválido. Valores aceitos: {validos}"
            )

        script = self._gerador.gerar(
            cenario=cenario,
            nome_prospect=query.nome_prospect,
            nome_indicador=query.nome_indicador,
            evento_de_vida=query.evento_de_vida,
            perfil_estimado=query.perfil_estimado,
        )

        return ScriptProspeccaoDTO(
            cenario=script.cenario.value,
            nome_prospect=query.nome_prospect,
            mensagem_abertura=script.mensagem_abertura,
            spin=SpinProspeccaoDTO(
                situation=list(script.perguntas_situation),
                problem=list(script.perguntas_problem),
                implication=list(script.perguntas_implication),
                need_payoff=list(script.perguntas_need_payoff),
            ),
            call_to_action=script.call_to_action,
            challenger_hook=script.challenger_hook,
            followup_mensagem=script.followup_mensagem,
            objecoes_previstas=[
                ObjecaoRespostaProspeccaoDTO(objecao=o, resposta=r)
                for o, r in script.objecoes_previstas
            ],
        )
