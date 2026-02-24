"""Exceções de domínio do BOT Assessor."""


class DomainException(Exception):
    """Exceção base do domínio."""


class InvalidEntityError(DomainException):
    """Entidade com dados inválidos."""


class AnalysisError(DomainException):
    """Erro durante análise financeira."""


class InsufficientDataError(AnalysisError):
    """Dados insuficientes para realizar a análise."""
