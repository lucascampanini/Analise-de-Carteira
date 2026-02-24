"""Testes de integração para SqlAlchemyAnalysisRepository.

Testa persistência real contra PostgreSQL via Testcontainers.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from src.adapters.outbound.persistence.sqlalchemy.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from src.domain.entities.financial_analysis import AnalysisStatus, FinancialAnalysis
from src.domain.value_objects.fiscal_period import FiscalPeriod, PeriodType
from src.domain.value_objects.ratio import Ratio

pytestmark = pytest.mark.integration


def _make_analysis(
    company_id: None = None,
    year: int = 2024,
    period_type: PeriodType = PeriodType.ANNUAL,
    quarter: int | None = None,
    status: AnalysisStatus = AnalysisStatus.COMPLETED,
    **overrides,
) -> FinancialAnalysis:
    cid = company_id or uuid4()
    period = FiscalPeriod(year=year, period_type=period_type, quarter=quarter)
    analysis = FinancialAnalysis(
        id=overrides.pop("id", uuid4()),
        company_id=cid,
        period=period,
    )
    # Preencher dados para status COMPLETED
    if status == AnalysisStatus.COMPLETED:
        analysis.record_piotroski_score(
            overrides.pop("piotroski_score", 7),
            overrides.pop("piotroski_details", {"roa": True, "cfo": True}),
        )
        analysis.record_altman_z_score(
            overrides.pop("altman_z_score", 3.5),
            overrides.pop("altman_classification", "SEGURA"),
        )
        analysis.record_ratios(
            overrides.pop(
                "ratios",
                [
                    Ratio(value=0.165, name="ROE"),
                    Ratio(value=0.066, name="ROA"),
                    Ratio(value=0.375, name="Margem Bruta"),
                ],
            )
        )
        analysis.complete()
    return analysis


@pytest.fixture
def repo(async_session):
    return SqlAlchemyAnalysisRepository(async_session)


class TestSqlAlchemyAnalysisRepository:
    """Testes de integração do repositório de análises financeiras."""

    async def test_save_and_find_by_id(self, repo) -> None:
        """Round-trip completo com scores e ratios."""
        analysis = _make_analysis()

        await repo.save(analysis)
        found = await repo.find_by_id(analysis.id)

        assert found is not None
        assert found.id == analysis.id
        assert found.company_id == analysis.company_id
        assert found.status == AnalysisStatus.COMPLETED
        assert found.piotroski_score == 7
        assert found.altman_z_score == pytest.approx(3.5)
        assert found.altman_classification == "SEGURA"
        assert len(found.ratios) == 3
        assert found.ratios[0].name == "ROE"
        assert found.ratios[0].value == pytest.approx(0.165)

    async def test_find_by_company_and_period(self, repo) -> None:
        """Busca análise por empresa e período anual."""
        cid = uuid4()
        analysis = _make_analysis(company_id=cid, year=2024)

        await repo.save(analysis)
        period = FiscalPeriod(year=2024, period_type=PeriodType.ANNUAL)
        found = await repo.find_by_company_and_period(cid, period)

        assert found is not None
        assert found.id == analysis.id
        assert found.period.year == 2024

    async def test_find_by_company_and_period_quarterly(self, repo) -> None:
        """Busca análise por empresa e período trimestral."""
        cid = uuid4()
        analysis = _make_analysis(
            company_id=cid, year=2024, period_type=PeriodType.QUARTERLY, quarter=3
        )

        await repo.save(analysis)
        period = FiscalPeriod(year=2024, period_type=PeriodType.QUARTERLY, quarter=3)
        found = await repo.find_by_company_and_period(cid, period)

        assert found is not None
        assert found.period.quarter == 3

    async def test_find_by_id_returns_none_when_not_found(self, repo) -> None:
        """Retorna None para ID inexistente."""
        result = await repo.find_by_id(uuid4())

        assert result is None

    async def test_list_by_company(self, repo) -> None:
        """Lista análises por empresa, ordenadas por ano desc."""
        cid = uuid4()
        a2023 = _make_analysis(company_id=cid, year=2023)
        a2024 = _make_analysis(company_id=cid, year=2024)

        await repo.save(a2023)
        await repo.save(a2024)
        analyses = await repo.list_by_company(cid)

        assert len(analyses) == 2
        assert analyses[0].period.year == 2024  # desc order
        assert analyses[1].period.year == 2023

    async def test_list_by_company_returns_empty(self, repo) -> None:
        """Lista vazia para empresa sem análises."""
        analyses = await repo.list_by_company(uuid4())

        assert analyses == []

    async def test_list_all_latest(self, repo) -> None:
        """Retorna apenas a análise mais recente de cada empresa."""
        cid1 = uuid4()
        cid2 = uuid4()
        # Empresa 1: duas análises (2023, 2024)
        await repo.save(_make_analysis(company_id=cid1, year=2023))
        await repo.save(_make_analysis(company_id=cid1, year=2024))
        # Empresa 2: uma análise (2024)
        await repo.save(_make_analysis(company_id=cid2, year=2024))

        latest = await repo.list_all_latest()

        assert len(latest) == 2
        years_by_company = {a.company_id: a.period.year for a in latest}
        assert years_by_company[cid1] == 2024
        assert years_by_company[cid2] == 2024

    async def test_save_with_idempotency_key_and_find(self, repo) -> None:
        """Persiste idempotency_key e recupera via find_by_idempotency_key."""
        analysis = _make_analysis()
        key = "idem-key-integration-001"

        await repo.save(analysis, idempotency_key=key)
        found = await repo.find_by_idempotency_key(key)

        assert found is not None
        assert found.id == analysis.id

    async def test_find_by_idempotency_key_returns_none(self, repo) -> None:
        """Retorna None para chave de idempotência inexistente."""
        result = await repo.find_by_idempotency_key("chave-inexistente-xyz")

        assert result is None

    async def test_save_updates_existing_analysis(self, repo) -> None:
        """Upsert: salvar análise com mesmo ID atualiza dados."""
        analysis = _make_analysis(piotroski_score=5)
        await repo.save(analysis)

        # Atualizar score
        analysis.record_piotroski_score(9, {"roa": True, "cfo": True, "delta_roa": True})
        await repo.save(analysis)

        found = await repo.find_by_id(analysis.id)
        assert found is not None
        assert found.piotroski_score == 9
