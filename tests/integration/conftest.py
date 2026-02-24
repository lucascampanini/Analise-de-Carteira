"""Fixtures de integração com Testcontainers (PostgreSQL real)."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import Base


@pytest.fixture(scope="session")
def postgres_container():
    """Inicia container PostgreSQL para testes de integração."""
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest.fixture(scope="session")
def database_url(postgres_container):
    """Monta a URL async do PostgreSQL a partir do container."""
    url = postgres_container.get_connection_url()
    return url.replace("psycopg2", "asyncpg").replace(
        "postgresql://", "postgresql+asyncpg://"
    )


@pytest.fixture
async def async_session(database_url) -> AsyncGenerator[AsyncSession, None]:
    """Cria engine + sessão async por teste com isolamento via truncate."""
    engine = create_async_engine(database_url, echo=False)

    # Cria tabelas (idempotente via checkfirst)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_factory() as session:
        yield session

    # Isolamento: limpa todas as tabelas após cada teste
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())

    await engine.dispose()
