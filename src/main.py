"""Entrypoint da aplicação."""

from src.config.app_factory import create_app

app = create_app()
