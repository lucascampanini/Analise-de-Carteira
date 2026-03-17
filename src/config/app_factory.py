"""Application Factory: cria e configura a aplicação FastAPI."""

from __future__ import annotations

import structlog
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.adapters.inbound.rest.analysis_controller import router as analysis_router
from src.adapters.inbound.rest.carteira_controller import router as carteira_router
from src.adapters.inbound.rest.consolidacao_controller import router as consolidacao_router
from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import Base
from src.config.container import Container
from src.config.settings import Settings

# === ASSISTENTE MODULE — remover estas 2 linhas para desativar o módulo ===
import src.assistente.models.assistente_models  # noqa: F401 — registra tabelas ass_* no Base
from src.assistente.adapters.inbound.whatsapp.whatsapp_handler import router as assistente_router

logger = structlog.get_logger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Cria a aplicação FastAPI com todas as dependências configuradas."""
    if settings is None:
        settings = Settings()

    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_size=5,
        max_overflow=2,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Iniciar bot Telegram se o token estiver configurado
        if settings.telegram_bot_token:
            from src.adapters.inbound.telegram.telegram_bot import TelegramBotAdapter

            telegram_bot = TelegramBotAdapter(
                token=settings.telegram_bot_token,
                session_factory=session_factory,
                settings=settings,
            )
            await telegram_bot.start()
            app.state.telegram_bot = telegram_bot
            logger.info("telegram_bot_enabled")
        else:
            logger.info("telegram_bot_disabled", reason="BOT_TELEGRAM_BOT_TOKEN não configurado")

        # Backup do banco na inicialização
        import shutil
        from pathlib import Path
        db_path = Path("analise_carteira.db")
        if db_path.exists():
            backup_dir = Path("backups")
            backup_dir.mkdir(exist_ok=True)
            from datetime import datetime as _dt
            ts = _dt.now().strftime("%Y-%m-%d_%H-%M")
            shutil.copy2(db_path, backup_dir / f"analise_carteira_{ts}.db")
            logger.info("backup_startup_realizado", arquivo=f"backups/analise_carteira_{ts}.db")

        # === ASSISTENTE MODULE — Seed fundos XP ===
        from src.assistente.adapters.outbound.services.seed_fundos import seed_fundos_xp
        inseridos = await seed_fundos_xp(session_factory)
        if inseridos:
            logger.info("seed_fundos_xp_concluido", inseridos=inseridos)

        # === ASSISTENTE MODULE — Scheduler ===
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from src.assistente.adapters.inbound.scheduler.daily_jobs import registrar_jobs

        scheduler = AsyncIOScheduler()
        registrar_jobs(scheduler, session_factory, settings)
        scheduler.start()
        app.state.assistente_scheduler = scheduler
        logger.info("assistente_scheduler_iniciado")

        yield

        # Parar bot Telegram
        if hasattr(app.state, "telegram_bot"):
            await app.state.telegram_bot.stop()

        # Parar scheduler do assistente
        if hasattr(app.state, "assistente_scheduler"):
            app.state.assistente_scheduler.shutdown()

        await engine.dispose()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.session_factory = session_factory
    app.state.settings = settings

    # Middleware: cria Container com session por request
    @app.middleware("http")
    async def inject_container(request: Request, call_next):
        async with session_factory() as session:
            async with session.begin():
                request.state.container = Container(settings=settings, session=session)
                response = await call_next(request)
        return response

    app.include_router(analysis_router)
    app.include_router(carteira_router)
    app.include_router(consolidacao_router)
    app.include_router(assistente_router)  # === ASSISTENTE MODULE ===

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "healthy", "version": settings.app_version}

    return app
