"""Domain Service ProjetorPatrimonio - projeção ano a ano de ativos RF/Fundos."""

from __future__ import annotations

from datetime import date

from src.domain.value_objects.indexador_projecao import IndexadorProjecao
from src.domain.value_objects.premissas_mercado import PremissasMercado


class ProjetorPatrimonio:
    """Projeta o valor de um ativo RF ou Fundo ano a ano usando premissas Focus.

    Stateless. Handles: CDI, IPCA, Pré (taxa fixa ou YTM implícito), Multi, RV.

    Regras de projeção por indexador:
    - CDI:   posicao × (1 + CDI × taxa/100)^frac
    - IPCA:  posicao × ((1 + IPCA) × (1 + taxa/100))^frac
    - PRE:   usa YTM implícito se face/preco informados; senão taxa direta
    - MULTI: posicao × (1 + CDI + alpha)^frac  (alpha padrão = 2% a.a.)
    - RV:    posicao × (1 + CDI + alpha)^frac  (alpha padrão = 3% a.a.)
    """

    def projetar_ativo(
        self,
        posicao: float,
        indexador: IndexadorProjecao,
        taxa: float | None,
        vencimento: date | None,
        face: float | None,
        preco_unitario: float | None,
        premissas: PremissasMercado,
        data_base: date,
        ano_alvo: int,
    ) -> float:
        """Projeta o valor de um ativo até o final do ano_alvo.

        Args:
            posicao: Valor atual em R$.
            indexador: Bucket de indexação (CDI/IPCA/PRE/MULTI/RV).
            taxa: Taxa contratada (% CDI, spread IPCA, taxa pré). None para fundos estimados.
            vencimento: Data de vencimento. None para fundos abertos.
            face: Valor de face (R$1.000 para LTN). Usado para YTM implícito.
            preco_unitario: Preço unitário atual. Usado para YTM implícito.
            premissas: Projeções Focus por ano.
            data_base: Data de referência (hoje).
            ano_alvo: Ano até o qual projetar.

        Returns:
            Valor projetado em R$ ao final do ano_alvo.
        """
        anos_proj = [yr for yr in sorted(p.ano for p in premissas.anos)
                     if yr <= ano_alvo]
        if not anos_proj:
            # Pega pelo menos o ano corrente do premissas
            anos_proj = [premissas.anos[0].ano]

        pos = posicao
        # CDI funds com taxa=None devem render 100% CDI (padrão Fundo DI)
        # Outros indexadores (IPCA, PRE) com taxa=None → 0% spread (conservador)
        if taxa is not None:
            taxa_efetiva = taxa
        elif indexador == IndexadorProjecao.CDI:
            taxa_efetiva = 100.0
        else:
            taxa_efetiva = 0.0

        for yr in anos_proj:
            if vencimento and date(yr, 1, 1) > vencimento:
                break

            prem = premissas.para_ano(yr)
            frac = self._fracao_ano(yr, vencimento, data_base, ano_alvo)

            pos = self._aplicar_rendimento(
                pos, indexador, taxa_efetiva, frac,
                prem.cdi_decimal, prem.ipca_decimal,
                vencimento, face, preco_unitario, data_base,
                indexador,
            )

            if vencimento and yr == vencimento.year:
                break

        return pos

    def projetar_reinvestimento(
        self,
        fluxos_por_ano: dict[int, float],
        premissas: PremissasMercado,
        anos: list[int],
        ano_alvo: int,
    ) -> float:
        """Acumula reinvestimento de fluxos de caixa a 100% CDI até ano_alvo.

        Lógica: compõe o saldo acumulado de anos anteriores e adiciona apenas
        fluxos de caixa de anos ANTERIORES ao ano_alvo (os fluxos do próprio
        ano_alvo já estão representados em projetar_ativo para evitar double-count).

        Args:
            fluxos_por_ano: {ano: total_liquido_recebido}.
            premissas: Projeções Focus.
            anos: Lista ordenada de anos do horizonte.
            ano_alvo: Até qual ano acumular.

        Returns:
            Saldo acumulado do reinvestimento em R$.
        """
        running = 0.0
        for yr in sorted(anos):
            if yr > ano_alvo:
                break
            cdi_r = premissas.para_ano(yr).cdi_decimal
            # Compõe o saldo do ano anterior
            running *= (1 + cdi_r)
            # Adiciona CFs apenas de anos ANTERIORES ao alvo (ano_alvo está em projetar_ativo)
            if yr < ano_alvo:
                running += fluxos_por_ano.get(yr, 0.0)
        return running

    # ── Internos ──────────────────────────────────────────────────────────

    def _fracao_ano(
        self,
        yr: int,
        vencimento: date | None,
        data_base: date,
        ano_alvo: int,
    ) -> float:
        """Fração do ano a aplicar o rendimento (1.0 = ano cheio).

        No ano de data_base (hoje), usa data_base como início do período.
        No ano de vencimento, usa o dia do vencimento como fim do período.
        """
        inicio = max(date(yr, 1, 1), data_base) if yr == data_base.year else date(yr, 1, 1)
        if vencimento and vencimento.year == yr:
            return max(0.0, (vencimento - inicio).days / 365.0)
        if yr == data_base.year:
            return max(0.0, (date(yr, 12, 31) - inicio).days / 365.0)
        return 1.0

    def _aplicar_rendimento(
        self,
        pos: float,
        indexador: IndexadorProjecao,
        taxa: float,
        frac: float,
        cdi_r: float,
        ipca_r: float,
        vencimento: date | None,
        face: float | None,
        preco_unitario: float | None,
        data_base: date,
        idx: IndexadorProjecao,
    ) -> float:
        """Aplica o fator de rendimento sobre a posição conforme o indexador."""
        if indexador == IndexadorProjecao.CDI:
            return pos * (1 + cdi_r * taxa / 100) ** frac

        if indexador == IndexadorProjecao.IPCA:
            return pos * ((1 + ipca_r) * (1 + taxa / 100)) ** frac

        if indexador == IndexadorProjecao.PRE:
            if face and preco_unitario and vencimento:
                # YTM implícito a partir do preço atual e face value
                yts = max(0.01, (vencimento - data_base).days / 365.25)
                ytm = (face / preco_unitario) ** (1 / yts) - 1
                return pos * (1 + ytm) ** frac
            # Fallback: usar taxa contratada diretamente
            return pos * (1 + taxa / 100) ** frac

        if indexador == IndexadorProjecao.MULTI:
            alpha = idx.alpha_cdi_pp / 100
            return pos * (1 + cdi_r + alpha) ** frac

        if indexador == IndexadorProjecao.RV:
            alpha = idx.alpha_cdi_pp / 100
            return pos * (1 + cdi_r + alpha) ** frac

        # Fallback conservador: CDI puro
        return pos * (1 + cdi_r) ** frac
