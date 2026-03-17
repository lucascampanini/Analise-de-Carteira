"""Settings: Pydantic Settings por ambiente."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configurações do sistema de Análise de Carteira."""

    # Application
    app_name: str = "Analise de Carteira"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"

    # Database (PostgreSQL)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/analise_carteira"

    # External APIs
    brapi_token: str = ""
    anthropic_api_key: str = ""
    telegram_bot_token: str = ""

    # yfinance
    yfinance_period_days: int = 252

    # Server
    host: str = "0.0.0.0"
    port: int = 8080

    # === ASSISTENTE MODULE ===
    # Evolution API (WhatsApp)
    evolution_api_url: str = ""
    evolution_api_key: str = ""
    evolution_instance_name: str = ""
    whatsapp_numero_assessor: str = ""  # seu número que recebe os alertas (ex: 5511999999999)

    # Microsoft Graph API (Outlook)
    ms_tenant_id: str = ""
    ms_client_id: str = ""
    ms_client_secret: str = ""
    ms_user_email: str = ""  # email corporativo SVN

    model_config = {
        "env_prefix": "BOT_",
        "env_file": ".env",
        "extra": "ignore",
    }
