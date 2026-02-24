"""Settings: Pydantic Settings por ambiente.

Configuração centralizada com validação automática.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configurações do BOT Assessor."""

    # Application
    app_name: str = "BOT Assessor"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"

    # Database (PostgreSQL)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bot_assessor"

    # External APIs
    brapi_token: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8080

    model_config = {
        "env_prefix": "BOT_",
        "env_file": ".env",
        "extra": "ignore",
    }
