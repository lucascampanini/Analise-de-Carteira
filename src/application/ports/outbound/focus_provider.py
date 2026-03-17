"""Driven Port FocusProvider - expectativas do Boletim Focus do BCB."""

from __future__ import annotations

from datetime import date
from typing import Protocol, runtime_checkable

from src.domain.value_objects.premissas_mercado import PremissasMercado


@runtime_checkable
class FocusProvider(Protocol):
    """Porta de saída: fornece projeções de mercado do Boletim Focus (BCB Olinda API).

    Implementações:
    - BcbFocusProvider (produção) — BCB Olinda OData API
    - FakeFocusProvider (testes) — dados hardcoded

    Se a API estiver indisponível, o adapter deve retornar PremissasMercado.fallback()
    sem propagar a exceção (degradação graciosa).
    """

    async def fetch_premissas(
        self,
        anos: list[int],
        data_referencia: date | None = None,
    ) -> PremissasMercado:
        """Busca expectativas de mercado para os anos solicitados.

        Args:
            anos: Lista de anos-calendário para buscar (ex: [2026, 2027, ..., 2031]).
            data_referencia: Data de referência para o Focus. None = hoje.

        Returns:
            PremissasMercado com CDI, IPCA, IGPM e Selic por ano.
            Retorna PremissasMercado.fallback() se a API estiver indisponível.
        """
        ...
