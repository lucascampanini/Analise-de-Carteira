"""Controller REST para consolidação de carteiras."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Header, Request, Response

from src.adapters.inbound.rest.consolidacao_schemas import ConsolidacaoRequest
from src.application.commands.consolidar_carteiras import (
    AcaoInput,
    AtivoRFInput,
    CenarioInput,
    CENARIOS_PADRAO,
    ConsolidarCarteiras,
)

router = APIRouter(prefix="/api/v1/consolidacao", tags=["consolidacao"])


def _get_container(request: Request):
    return request.app.state.container


@router.post(
    "",
    summary="Consolida N carteiras e retorna arquivo Excel (.xlsx)",
    response_description="Arquivo Excel com 6 abas de análise",
    responses={
        200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}}},
    },
)
async def consolidar(
    request: Request,
    body: ConsolidacaoRequest,
    idempotency_key: str = Header(
        default=None,
        alias="Idempotency-Key",
        description="Chave de idempotência (UUID). Gerada automaticamente se não informada.",
    ),
) -> Response:
    """Gera consolidação de N carteiras de investimentos.

    Retorna arquivo Excel (.xlsx) com:
    - **PREMISSAS**: taxas Focus editáveis + tabela regressiva IR
    - **POSICAO CONSOLIDADA**: todos os ativos por indexador
    - **FLUXO DE CAIXA RF**: cupons/amortizações + reinvestimento 100% CDI
    - **PROJECAO ANUAL**: evolução patrimonial 2026–2031
    - **CENARIOS**: BASE / OTIMISTA / PESSIMISTA / STRESS
    - **ACOES**: quadro de renda variável separado
    """
    container = _get_container(request)
    key = idempotency_key or str(uuid.uuid4())

    # Mapear cenários
    if body.cenarios:
        cenarios = tuple(
            CenarioInput(nome=c.nome, delta_cdi=c.delta_cdi, delta_ipca=c.delta_ipca)
            for c in body.cenarios
        )
    else:
        cenarios = CENARIOS_PADRAO

    command = ConsolidarCarteiras(
        ativos_rf=tuple(
            AtivoRFInput(
                nome=a.nome,
                conta=a.conta,
                tipo=a.tipo,
                indexador=a.indexador,
                posicao=a.posicao,
                ir_isento=a.ir_isento,
                pmt_tipo=a.pmt_tipo,
                taxa=a.taxa,
                pmt_meses=tuple(a.pmt_meses),
                ntnb_coupon_flag=a.ntnb_coupon_flag,
                data_aplicacao=a.data_aplicacao,
                data_vencimento=a.data_vencimento,
                face=a.face,
                preco_unitario=a.preco_unitario,
                nota=a.nota,
            )
            for a in body.ativos_rf
        ),
        acoes=tuple(
            AcaoInput(
                ticker=a.ticker,
                nome=a.nome,
                conta=a.conta,
                qtd=a.qtd,
                ultimo_preco=a.ultimo_preco,
                posicao=a.posicao,
            )
            for a in body.acoes
        ),
        anos_projecao=tuple(body.anos_projecao),
        cenarios=cenarios,
        idempotency_key=key,
        usar_focus_api=body.usar_focus_api,
    )

    dto = await container.consolidar_carteiras_handler.handle(command)
    excel_bytes = await container.excel_generator.generate_excel(dto)

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="carteiras_consolidadas.xlsx"',
            "Idempotency-Key": key,
        },
    )
