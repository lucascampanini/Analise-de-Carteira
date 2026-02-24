"""Testes para Domain Events de análise financeira."""

from uuid import UUID, uuid4

from src.domain.events.analysis_events import (
    AnalysisCompleted,
    AnalysisFailed,
    FinancialDistressDetected,
)


class TestAnalysisCompleted:
    """Testes para evento AnalysisCompleted."""

    def test_creates_analysis_completed_event(self) -> None:
        analysis_id = uuid4()
        company_id = uuid4()
        event = AnalysisCompleted(
            analysis_id=analysis_id,
            company_id=company_id,
            piotroski_score=8,
            altman_z_score=3.5,
            altman_classification="SEGURA",
        )
        assert event.analysis_id == analysis_id
        assert event.company_id == company_id
        assert event.piotroski_score == 8
        assert event.altman_z_score == 3.5
        assert event.altman_classification == "SEGURA"

    def test_analysis_completed_has_auto_event_id(self) -> None:
        event = AnalysisCompleted(
            analysis_id=uuid4(),
            company_id=uuid4(),
            piotroski_score=5,
            altman_z_score=2.0,
            altman_classification="ZONA_CINZA",
        )
        assert isinstance(event.event_id, UUID)

    def test_analysis_completed_has_occurred_at(self) -> None:
        event = AnalysisCompleted(
            analysis_id=uuid4(),
            company_id=uuid4(),
            piotroski_score=5,
            altman_z_score=2.0,
            altman_classification="ZONA_CINZA",
        )
        assert event.occurred_at is not None

    def test_analysis_completed_is_immutable(self) -> None:
        event = AnalysisCompleted(
            analysis_id=uuid4(),
            company_id=uuid4(),
            piotroski_score=5,
            altman_z_score=2.0,
            altman_classification="ZONA_CINZA",
        )
        try:
            event.piotroski_score = 9  # type: ignore[misc]
            assert False, "Deveria ser imutável"
        except AttributeError:
            pass


class TestAnalysisFailed:
    """Testes para evento AnalysisFailed."""

    def test_creates_analysis_failed_event(self) -> None:
        analysis_id = uuid4()
        company_id = uuid4()
        event = AnalysisFailed(
            analysis_id=analysis_id,
            company_id=company_id,
            reason="Dados insuficientes",
        )
        assert event.analysis_id == analysis_id
        assert event.company_id == company_id
        assert event.reason == "Dados insuficientes"
        assert isinstance(event.event_id, UUID)

    def test_analysis_failed_is_immutable(self) -> None:
        event = AnalysisFailed(
            analysis_id=uuid4(),
            company_id=uuid4(),
            reason="Erro",
        )
        try:
            event.reason = "Outro erro"  # type: ignore[misc]
            assert False, "Deveria ser imutável"
        except AttributeError:
            pass


class TestFinancialDistressDetected:
    """Testes para evento FinancialDistressDetected."""

    def test_creates_financial_distress_event(self) -> None:
        analysis_id = uuid4()
        company_id = uuid4()
        event = FinancialDistressDetected(
            analysis_id=analysis_id,
            company_id=company_id,
            altman_z_score=0.8,
        )
        assert event.analysis_id == analysis_id
        assert event.company_id == company_id
        assert event.altman_z_score == 0.8
        assert isinstance(event.event_id, UUID)

    def test_financial_distress_is_immutable(self) -> None:
        event = FinancialDistressDetected(
            analysis_id=uuid4(),
            company_id=uuid4(),
            altman_z_score=0.5,
        )
        try:
            event.altman_z_score = 3.0  # type: ignore[misc]
            assert False, "Deveria ser imutável"
        except AttributeError:
            pass
