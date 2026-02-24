"""Application Factory: cria e configura a aplicação FastAPI."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.adapters.inbound.rest.analysis_controller import router as analysis_router
from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import Base
from src.config.container import Container
from src.config.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Cria a aplicação FastAPI com todas as dependências configuradas.

    Args:
        settings: Configurações da aplicação. Se None, carrega do ambiente.

    Returns:
        Aplicação FastAPI pronta para uso.
    """
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
        yield
        await engine.dispose()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Armazena session_factory e settings no app.state para acesso nos endpoints
    app.state.session_factory = session_factory
    app.state.settings = settings

    app.include_router(analysis_router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "healthy", "version": settings.app_version}

    return app
