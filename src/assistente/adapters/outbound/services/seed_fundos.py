"""Seed da base de fundos XP com prazos de resgate.

Popula ass_fundos_cvm automaticamente na primeira execução.
Dados extraídos da planilha lista-fundos XP em 17/03/2026 (866 fundos).
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog

logger = structlog.get_logger(__name__)


async def seed_fundos_xp(session_factory) -> int:
    """Insere os fundos XP na tabela ass_fundos_cvm se ainda estiver vazia.

    Returns:
        Número de fundos inseridos (0 se já havia dados).
    """
    from sqlalchemy import select, func
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from src.assistente.models.assistente_models import AssFundoCVMModel
    from src.assistente.adapters.outbound.services.fundos_xp_seed import FUNDOS_XP

    async with session_factory() as session:
        total = (await session.execute(select(func.count()).select_from(AssFundoCVMModel))).scalar()

    if total and total > 0:
        logger.info("seed_fundos_xp_skip", existentes=total)
        return 0

    agora = datetime.now(timezone.utc)
    async with session_factory() as session:
        async with session.begin():
            for f in FUNDOS_XP:
                stmt = pg_insert(AssFundoCVMModel).values(
                    cnpj=f["cnpj"],
                    denom_social=f.get("denom_social"),
                    gestora=f.get("gestora"),
                    situacao="EM FUNCIONAMENTO NORMAL",
                    prazo_cotiz_resg=f.get("prazo_cotiz_resg"),
                    tipo_dia_cotiz=f.get("tipo_dia_cotiz"),
                    prazo_pagto_resg=f.get("prazo_pagto_resg"),
                    tipo_dia_pagto=f.get("tipo_dia_pagto"),
                    atualizado_em=agora,
                ).on_conflict_do_nothing(index_elements=["cnpj"])
                await session.execute(stmt)

    logger.info("seed_fundos_xp_ok", inseridos=len(FUNDOS_XP))
    return len(FUNDOS_XP)
