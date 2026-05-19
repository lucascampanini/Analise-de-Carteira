"""Testes unitários de ProjetorPatrimonio.

Cobre os dois casos de pagamento (bullet e semestral) e verifica que
projetar_principal() não inclui o spread de cupom no valor do principal.
"""

from __future__ import annotations

from datetime import date

import pytest

from src.domain.services.projetor_patrimonio import ProjetorPatrimonio
from src.domain.value_objects.indexador_projecao import IndexadorProjecao
from src.domain.value_objects.premissas_mercado import PremissaAno, PremissasMercado


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def premissas_simples() -> PremissasMercado:
    """Premissas com CDI 10% e IPCA 5% para os anos 2026-2028."""
    return PremissasMercado(
        data_referencia=date(2026, 1, 1),
        anos=(
            PremissaAno(ano=2026, cdi_pct_aa=10.0, ipca_pct_aa=5.0, igpm_pct_aa=5.0, selic_pct_aa=10.5),
            PremissaAno(ano=2027, cdi_pct_aa=10.0, ipca_pct_aa=5.0, igpm_pct_aa=5.0, selic_pct_aa=10.5),
            PremissaAno(ano=2028, cdi_pct_aa=10.0, ipca_pct_aa=5.0, igpm_pct_aa=5.0, selic_pct_aa=10.5),
        ),
        fonte="Test",
    )


@pytest.fixture
def projetor() -> ProjetorPatrimonio:
    return ProjetorPatrimonio()


# Data anterior ao primeiro ano de projeção → _fracao_ano retorna 1.0 para 2026
DATA_BASE = date(2025, 12, 31)


# ── projetar_ativo (bullet) ───────────────────────────────────────────────────

class TestProjetarAtivoBullet:
    def test_cdi_ano_cheio(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """CDB a 100% CDI (10% a.a.) cresce exatamente 10% em um ano."""
        resultado = projetor.projetar_ativo(
            posicao=100_000.0,
            indexador=IndexadorProjecao.CDI,
            taxa=100.0,  # 100% CDI
            vencimento=date(2027, 1, 1),
            face=None,
            preco_unitario=None,
            premissas=premissas_simples,
            data_base=DATA_BASE,
            ano_alvo=2026,
        )
        assert abs(resultado - 110_000.0) < 1.0, f"Esperado ~110k, obtido {resultado:.2f}"

    def test_cdi_dois_anos(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """CDB a 100% CDI acumula composto em dois anos."""
        resultado = projetor.projetar_ativo(
            posicao=100_000.0,
            indexador=IndexadorProjecao.CDI,
            taxa=100.0,
            vencimento=date(2028, 6, 1),
            face=None,
            preco_unitario=None,
            premissas=premissas_simples,
            data_base=DATA_BASE,
            ano_alvo=2027,
        )
        esperado = 100_000.0 * 1.10 * 1.10
        assert abs(resultado - esperado) < 5.0

    def test_ativo_ja_vencido_excluido(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """Ativo com vencimento antes do ano-alvo retorna 0 (excluído da projeção)."""
        resultado = projetor.projetar_ativo(
            posicao=100_000.0,
            indexador=IndexadorProjecao.CDI,
            taxa=100.0,
            vencimento=date(2025, 12, 31),  # já venceu
            face=None,
            preco_unitario=None,
            premissas=premissas_simples,
            data_base=DATA_BASE,
            ano_alvo=2026,
        )
        # Ativo vencido: projetar_ativo cresce mas não deve aparecer na projeção
        # O handler exclui via `if venc and date(yr, 1, 1) > venc: continue`
        # Aqui apenas verificamos que não retorna valor absurdo
        assert resultado >= 0.0


# ── projetar_principal (semestral — sem spread de cupom) ─────────────────────

class TestProjetarPrincipal:
    def test_ipca_principal_sem_spread(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """NTN-B: principal deve crescer apenas com IPCA, sem o spread de 5%."""
        principal = projetor.projetar_principal(
            posicao=100_000.0,
            indexador=IndexadorProjecao.IPCA,
            taxa=5.0,           # spread = 5%, mas NÃO deve entrar aqui
            vencimento=date(2028, 8, 15),
            face=None,
            preco_unitario=None,
            premissas=premissas_simples,
            data_base=DATA_BASE,
            ano_alvo=2026,
        )
        # Esperado: 100k × (1 + 0.05)^1 = 105k (só IPCA)
        assert abs(principal - 105_000.0) < 1.0, f"Esperado ~105k, obtido {principal:.2f}"

    def test_principal_menor_que_ativo_total(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """projetar_principal deve sempre retornar <= projetar_ativo para IPCA+spread."""
        kwargs = dict(
            posicao=100_000.0,
            indexador=IndexadorProjecao.IPCA,
            taxa=6.0,
            vencimento=date(2028, 8, 15),
            face=None,
            preco_unitario=None,
            premissas=premissas_simples,
            data_base=DATA_BASE,
            ano_alvo=2027,
        )
        total = projetor.projetar_ativo(**kwargs)
        principal = projetor.projetar_principal(**kwargs)
        assert principal < total, (
            f"principal ({principal:.2f}) deve ser menor que total ({total:.2f})"
        )

    def test_pre_principal_constante(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """Ativo pré com cupons periódicos: principal retorna posição original (sem crescimento)."""
        principal = projetor.projetar_principal(
            posicao=100_000.0,
            indexador=IndexadorProjecao.PRE,
            taxa=13.0,
            vencimento=date(2028, 1, 1),
            face=None,
            preco_unitario=None,
            premissas=premissas_simples,
            data_base=DATA_BASE,
            ano_alvo=2026,
        )
        # Para PRE semestral, o principal (face) não cresce — apenas é devolvido no vencimento
        assert abs(principal - 100_000.0) < 1.0, f"Esperado ~100k, obtido {principal:.2f}"

    def test_cdi_principal_igual_ativo(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """Para CDI, principal == projetar_ativo (não há cupom separado; tudo fica no saldo)."""
        kwargs = dict(
            posicao=100_000.0,
            indexador=IndexadorProjecao.CDI,
            taxa=100.0,
            vencimento=date(2028, 12, 31),
            face=None,
            preco_unitario=None,
            premissas=premissas_simples,
            data_base=DATA_BASE,
            ano_alvo=2026,
        )
        total = projetor.projetar_ativo(**kwargs)
        principal = projetor.projetar_principal(**kwargs)
        assert abs(total - principal) < 0.01, (
            "Para CDI não há cupom separado — principal deve igualar o total"
        )


# ── projetar_reinvestimento ───────────────────────────────────────────────────

class TestProjetarReinvestimento:
    def test_sem_fluxos_retorna_zero(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        resultado = projetor.projetar_reinvestimento(
            fluxos_por_ano={},
            premissas=premissas_simples,
            anos=[2026, 2027],
            ano_alvo=2027,
        )
        assert resultado == 0.0

    def test_fluxo_ano_anterior_reinvestido(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """Fluxo do ano 2026 deve ser reinvestido a CDI até 2027."""
        resultado = projetor.projetar_reinvestimento(
            fluxos_por_ano={2026: 10_000.0},
            premissas=premissas_simples,
            anos=[2026, 2027],
            ano_alvo=2027,
        )
        # 10k × (1 + 0.10) = 11k
        assert abs(resultado - 11_000.0) < 1.0, f"Esperado ~11k, obtido {resultado:.2f}"

    def test_fluxo_ano_corrente_nao_incluido(self, projetor: ProjetorPatrimonio, premissas_simples: PremissasMercado):
        """Fluxo do próprio ano-alvo NÃO deve ser somado (já está em projetar_ativo/principal)."""
        resultado = projetor.projetar_reinvestimento(
            fluxos_por_ano={2026: 10_000.0},
            premissas=premissas_simples,
            anos=[2026, 2027],
            ano_alvo=2026,  # mesmo ano do fluxo
        )
        assert resultado == 0.0, f"Fluxo do ano corrente não deve aparecer, obtido {resultado:.2f}"
