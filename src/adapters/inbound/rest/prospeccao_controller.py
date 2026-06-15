"""REST Controller para geração de scripts de prospecção via SPIN Selling."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from src.application.queries.gerar_script_prospeccao import GerarScriptProspeccao
from src.config.container import Container

router = APIRouter(prefix="/api/v1/prospeccao", tags=["prospeccao"])


def _get_container(request: Request) -> Container:
    container = getattr(request.state, "container", None)
    if container is None:
        raise HTTPException(status_code=500, detail="Container DI não inicializado")
    return container


# ── Schemas ────────────────────────────────────────────────────────────────

class GerarScriptRequest(BaseModel):
    cenario: str = Field(
        ...,
        description=(
            "ABORDAGEM_FRIA | INDICACAO | EVENTO | INSATISFEITO | EVENTO_DE_VIDA"
        ),
    )
    nome_prospect: str = Field(default="[Nome]", description="Nome do prospect")
    nome_indicador: str | None = Field(default=None, description="Quem indicou (cenário INDICACAO)")
    evento_de_vida: str | None = Field(
        default=None,
        description="Descrição do evento (cenário EVENTO_DE_VIDA). Ex: 'venda de empresa', 'herança'",
    )
    perfil_estimado: str | None = Field(
        default=None, description="Perfil estimado: CONSERVADOR | MODERADO | ARROJADO"
    )


class SpinResponse(BaseModel):
    situation: list[str]
    problem: list[str]
    implication: list[str]
    need_payoff: list[str]


class ObjecaoResponse(BaseModel):
    objecao: str
    resposta: str


class ScriptProspeccaoResponse(BaseModel):
    cenario: str
    nome_prospect: str
    mensagem_abertura: str
    spin: SpinResponse
    call_to_action: str
    challenger_hook: str
    followup_mensagem: str
    objecoes_previstas: list[ObjecaoResponse]


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post(
    "/script",
    response_model=ScriptProspeccaoResponse,
    summary="Gera roteiro SPIN para prospecção de novo cliente",
)
async def gerar_script_prospeccao(
    request: Request,
    body: GerarScriptRequest,
) -> ScriptProspeccaoResponse:
    """Gera roteiro SPIN completo para abordar um prospect — sem análise prévia.

    Retorna: mensagem de abertura, perguntas S/P/I/N, CTA, Challenger Hook,
    follow-up para caso sem resposta e objeções previstas com respostas.

    **Cenários disponíveis:**
    - `ABORDAGEM_FRIA` — contato inicial sem contexto anterior
    - `INDICACAO` — prospect indicado por cliente existente (informar `nome_indicador`)
    - `EVENTO` — contato após evento/networking
    - `INSATISFEITO` — prospect sinalizou insatisfação com assessor atual
    - `EVENTO_DE_VIDA` — herança, venda de empresa, aposentadoria (informar `evento_de_vida`)
    """
    container = _get_container(request)
    query = GerarScriptProspeccao(
        cenario=body.cenario,
        nome_prospect=body.nome_prospect,
        nome_indicador=body.nome_indicador,
        evento_de_vida=body.evento_de_vida,
        perfil_estimado=body.perfil_estimado,
    )

    try:
        dto = container.gerar_script_prospeccao_handler.handle(query)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ScriptProspeccaoResponse(
        cenario=dto.cenario,
        nome_prospect=dto.nome_prospect,
        mensagem_abertura=dto.mensagem_abertura,
        spin=SpinResponse(
            situation=dto.spin.situation,
            problem=dto.spin.problem,
            implication=dto.spin.implication,
            need_payoff=dto.spin.need_payoff,
        ),
        call_to_action=dto.call_to_action,
        challenger_hook=dto.challenger_hook,
        followup_mensagem=dto.followup_mensagem,
        objecoes_previstas=[
            ObjecaoResponse(objecao=o.objecao, resposta=o.resposta)
            for o in dto.objecoes_previstas
        ],
    )


@router.get(
    "/cenarios",
    summary="Lista cenários de prospecção disponíveis",
)
async def listar_cenarios() -> dict:
    """Lista todos os cenários de prospecção disponíveis com descrição."""
    return {
        "cenarios": [
            {
                "valor": "ABORDAGEM_FRIA",
                "descricao": "Contato inicial sem relacionamento prévio (WhatsApp, LinkedIn, telefone)",
                "campos_extras": [],
            },
            {
                "valor": "INDICACAO",
                "descricao": "Prospect indicado por cliente existente",
                "campos_extras": ["nome_indicador"],
            },
            {
                "valor": "EVENTO",
                "descricao": "Contato iniciado após encontro em evento ou networking",
                "campos_extras": [],
            },
            {
                "valor": "INSATISFEITO",
                "descricao": "Prospect sinalizou insatisfação com assessor/banco atual",
                "campos_extras": [],
            },
            {
                "valor": "EVENTO_DE_VIDA",
                "descricao": "Prospect passou por evento patrimonial relevante (herança, venda de empresa, aposentadoria)",
                "campos_extras": ["evento_de_vida"],
            },
        ]
    }
