"""REST Controller para análise de carteira."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import Response

from src.adapters.inbound.rest.carteira_schemas import (
    AnaliseCarteiraResponse,
    CriarClienteRequest,
    CriarClienteResponse,
    PosicaoResponse,
    RecomendacaoResponse,
    UploadExtratoResponse,
)
from src.application.commands.criar_cliente import CriarCliente
from src.application.commands.processar_extrato import ProcessarExtrato
from src.application.queries.get_analise_carteira import GetAnaliseCarteira, GetRelatorioCarteira
from src.config.container import Container

router = APIRouter(prefix="/api/v1/carteira", tags=["carteira"])


def _get_container(request: Request) -> Container:
    """Helper para obter o container de DI da requisição."""
    session_factory = request.app.state.session_factory
    settings = request.app.state.settings
    # Container é criado por request (session scoped)
    from sqlalchemy.ext.asyncio import AsyncSession
    # Nota: Container será construído com session no middleware/dependency
    # Por simplicidade aqui usamos o container já attachado
    container = getattr(request.state, "container", None)
    if container is None:
        raise HTTPException(status_code=500, detail="Container DI não inicializado")
    return container


@router.post("/clientes", status_code=201, response_model=CriarClienteResponse)
async def criar_cliente(
    request: Request,
    body: CriarClienteRequest,
    idempotency_key: str = Header(default_factory=lambda: str(uuid.uuid4()), alias="Idempotency-Key"),
) -> CriarClienteResponse:
    """Cadastra novo cliente com perfil de investidor."""
    container = _get_container(request)
    command = CriarCliente(
        nome=body.nome,
        cpf=body.cpf,
        perfil=body.perfil,
        objetivo=body.objetivo,
        horizonte=body.horizonte,
        tolerancia_perda_percentual=body.tolerancia_perda_percentual,
        idempotency_key=idempotency_key,
    )
    try:
        cliente_id = await container.criar_cliente_handler.handle(command)
        return CriarClienteResponse(cliente_id=cliente_id)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/upload", status_code=202, response_model=UploadExtratoResponse)
async def upload_extrato(
    request: Request,
    file: UploadFile = File(..., description="PDF do extrato de carteira"),
    cliente_id: str = Form(..., description="ID do cliente"),
    data_referencia: str = Form(..., description="Data de referência (YYYY-MM-DD)"),
    idempotency_key: str = Header(default_factory=lambda: str(uuid.uuid4()), alias="Idempotency-Key"),
) -> UploadExtratoResponse:
    """Faz upload do PDF de extrato e inicia análise da carteira."""
    container = _get_container(request)

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=400,
            detail="Arquivo deve ser um PDF (application/pdf)",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Arquivo PDF vazio")

    command = ProcessarExtrato(
        cliente_id=cliente_id,
        pdf_bytes=pdf_bytes,
        nome_arquivo=file.filename or "extrato.pdf",
        data_referencia=data_referencia,
        idempotency_key=idempotency_key,
    )

    try:
        analise_id = await container.processar_extrato_handler.handle(command)
        return UploadExtratoResponse(
            analise_id=analise_id,
            status="CONCLUIDA",
            message="Extrato processado e análise gerada com sucesso.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao processar extrato: {exc}") from exc


@router.get("/analise/{analise_id}", response_model=AnaliseCarteiraResponse)
async def get_analise(request: Request, analise_id: str) -> AnaliseCarteiraResponse:
    """Retorna o resultado da análise de carteira."""
    container = _get_container(request)
    query = GetAnaliseCarteira(analise_id=analise_id)

    try:
        dto = await container.get_analise_carteira_handler.handle(query)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if dto is None:
        raise HTTPException(status_code=404, detail=f"Análise {analise_id} não encontrada")

    return AnaliseCarteiraResponse(
        analise_id=dto.analise_id,
        carteira_id=dto.carteira_id,
        cliente_id=dto.cliente_id,
        status=dto.status,
        data_referencia=dto.data_referencia,
        criada_em=dto.criada_em,
        expira_em=dto.expira_em,
        patrimonio_liquido=dto.patrimonio_liquido,
        percentual_rv=dto.percentual_rv,
        percentual_rf=dto.percentual_rf,
        alocacao_por_classe=dto.alocacao_por_classe,
        alocacao_por_setor=dto.alocacao_por_setor,
        alocacao_por_emissor=dto.alocacao_por_emissor,
        hhi=dto.hhi,
        top5_ativos=dto.top5_ativos,
        alertas_concentracao=dto.alertas_concentracao,
        volatilidade_anualizada=dto.volatilidade_anualizada,
        cvar_95=dto.cvar_95,
        beta_ibovespa=dto.beta_ibovespa,
        rentabilidade_carteira=dto.rentabilidade_carteira,
        rentabilidade_cdi=dto.rentabilidade_cdi,
        rentabilidade_ibov=dto.rentabilidade_ibov,
        score_aderencia=dto.score_aderencia,
        classificacao_aderencia=dto.classificacao_aderencia,
        precisa_rebalanceamento=dto.precisa_rebalanceamento,
        recomendacoes=[
            RecomendacaoResponse(**r.__dict__) for r in dto.recomendacoes
        ],
        posicoes=[PosicaoResponse(**p.__dict__) for p in dto.posicoes],
        mensagem_erro=dto.mensagem_erro,
    )


@router.get("/analise/{analise_id}/relatorio")
async def download_relatorio(request: Request, analise_id: str) -> Response:
    """Faz download do relatório PDF da análise."""
    container = _get_container(request)
    query = GetRelatorioCarteira(analise_id=analise_id)

    try:
        dto = await container.get_relatorio_handler.handle(query)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if dto is None:
        raise HTTPException(status_code=404, detail=f"Análise {analise_id} não encontrada")

    try:
        pdf_bytes = await container.report_generator.generate_pdf(dto)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Erro ao gerar relatório: {exc}"
        ) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="analise_{analise_id}.pdf"',
        },
    )
