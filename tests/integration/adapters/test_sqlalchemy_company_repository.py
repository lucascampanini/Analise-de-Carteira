"""Testes de integração para SqlAlchemyCompanyRepository.

Testa persistência real contra PostgreSQL via Testcontainers.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_company_repository import (
    SqlAlchemyCompanyRepository,
)
from src.domain.entities.company import Company
from src.domain.value_objects.cnpj import CNPJ
from src.domain.value_objects.ticker import Ticker

pytestmark = pytest.mark.integration


def _make_company(**overrides) -> Company:
    defaults = {
        "id": uuid4(),
        "name": "Petróleo Brasileiro S.A.",
        "ticker": Ticker("PETR4"),
        "cnpj": CNPJ("33000167000101"),
        "sector": "Petróleo e Gás",
        "cvm_code": "9512",
        "subsector": "Exploração e Produção",
        "segment": "Integradas",
    }
    defaults.update(overrides)
    return Company(**defaults)


@pytest.fixture
def repo(async_session):
    return SqlAlchemyCompanyRepository(async_session)


class TestSqlAlchemyCompanyRepository:
    """Testes de integração do repositório de empresas."""

    async def test_save_and_find_by_id(self, repo) -> None:
        """Round-trip completo: save -> find_by_id."""
        company = _make_company()

        await repo.save(company)
        found = await repo.find_by_id(company.id)

        assert found is not None
        assert found.id == company.id
        assert found.name == company.name
        assert found.ticker == company.ticker
        assert found.cnpj == company.cnpj
        assert found.sector == company.sector
        assert found.cvm_code == company.cvm_code

    async def test_save_and_find_by_ticker(self, repo) -> None:
        """Busca empresa por ticker."""
        company = _make_company(ticker=Ticker("VALE3"))

        await repo.save(company)
        found = await repo.find_by_ticker(Ticker("VALE3"))

        assert found is not None
        assert found.ticker == Ticker("VALE3")
        assert found.id == company.id

    async def test_save_and_find_by_cvm_code(self, repo) -> None:
        """Busca empresa por código CVM."""
        company = _make_company(cvm_code="4170", ticker=Ticker("ITUB4"))

        await repo.save(company)
        found = await repo.find_by_cvm_code("4170")

        assert found is not None
        assert found.cvm_code == "4170"
        assert found.id == company.id

    async def test_find_by_id_returns_none_when_not_found(self, repo) -> None:
        """Retorna None para ID inexistente."""
        result = await repo.find_by_id(uuid4())

        assert result is None

    async def test_find_by_ticker_returns_none_when_not_found(self, repo) -> None:
        """Retorna None para ticker inexistente."""
        result = await repo.find_by_ticker(Ticker("XXXX3"))

        assert result is None

    async def test_list_all_returns_all_companies(self, repo) -> None:
        """Lista todas as empresas salvas."""
        c1 = _make_company(ticker=Ticker("BBDC4"), cvm_code="1001")
        c2 = _make_company(ticker=Ticker("MGLU3"), cvm_code="1002")

        await repo.save(c1)
        await repo.save(c2)
        companies = await repo.list_all()

        assert len(companies) == 2
        ids = {c.id for c in companies}
        assert c1.id in ids
        assert c2.id in ids

    async def test_list_all_returns_empty_when_no_companies(self, repo) -> None:
        """Lista vazia quando não há empresas."""
        companies = await repo.list_all()

        assert companies == []

    async def test_save_updates_existing_company(self, repo) -> None:
        """Upsert: salvar empresa com mesmo ID atualiza dados."""
        company = _make_company(ticker=Ticker("WEGE3"), cvm_code="5001")
        await repo.save(company)

        updated = Company(
            id=company.id,
            name="WEG S.A. (Atualizado)",
            ticker=Ticker("WEGE3"),
            cnpj=company.cnpj,
            sector="Industrial",
            cvm_code="5001",
            subsector="Motores",
            segment="Automação",
        )
        await repo.save(updated)

        found = await repo.find_by_id(company.id)
        assert found is not None
        assert found.name == "WEG S.A. (Atualizado)"
        assert found.sector == "Industrial"
        assert found.subsector == "Motores"
