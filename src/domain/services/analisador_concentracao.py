"""Domain Service: AnalisadorConcentracao - métricas de concentração."""

from __future__ import annotations

from src.domain.entities.carteira import Carteira
from src.domain.entities.posicao import Posicao

# Limiares de alertas de concentração (regras de negócio do domínio)
LIMITE_CONCENTRACAO_ATIVO = 20.0   # alerta se ativo > 20% do PL
LIMITE_CONCENTRACAO_SETOR = 40.0   # alerta se setor > 40% do PL


class AnalisadorConcentracao:
    """Calcula métricas de concentração de uma carteira.

    Stateless service — não tem estado interno.
    """

    def calcular_hhi(self, carteira: Carteira) -> float:
        """Calcula o Índice Herfindahl-Hirschman (HHI) da carteira.

        HHI = Σ(si²) onde si é o percentual de cada ativo no PL.
        HHI próximo de 0 = muito diversificado.
        HHI próximo de 10000 = muito concentrado.

        Args:
            carteira: Carteira com posições.

        Returns:
            HHI calculado (0 a 10000).
        """
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return 0.0

        hhi = 0.0
        for posicao in carteira.posicoes:
            percentual = (posicao.valor_atual.cents / pl.cents) * 100.0
            hhi += percentual ** 2

        return round(hhi, 2)

    def calcular_top5(self, carteira: Carteira) -> list[dict]:
        """Retorna os 5 maiores ativos por valor atual.

        Args:
            carteira: Carteira com posições.

        Returns:
            Lista de dicts com ticker, nome, valor_atual, percentual_pl.
        """
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return []

        posicoes_ordenadas = sorted(
            carteira.posicoes,
            key=lambda p: p.valor_atual.cents,
            reverse=True,
        )

        resultado = []
        for posicao in posicoes_ordenadas[:5]:
            percentual = (posicao.valor_atual.cents / pl.cents) * 100.0
            resultado.append({
                "ticker": posicao.ativo.ticker,
                "nome": posicao.ativo.nome,
                "valor_atual": posicao.valor_atual.to_reais(),
                "percentual_pl": round(percentual, 2),
                "classe": str(posicao.ativo.classe),
            })

        return resultado

    def gerar_alertas_concentracao(self, carteira: Carteira) -> list[str]:
        """Gera alertas de concentração excessiva.

        Regras:
        - Ativo > 20% do PL: alerta de concentração por emissor.
        - Setor > 40% do PL: alerta de concentração por setor.

        Args:
            carteira: Carteira com posições.

        Returns:
            Lista de strings descrevendo os alertas encontrados.
        """
        alertas: list[str] = []
        pl = carteira.patrimonio_liquido
        if pl.is_zero():
            return alertas

        # Alerta por ativo individual
        for posicao in carteira.posicoes:
            percentual = (posicao.valor_atual.cents / pl.cents) * 100.0
            if percentual > LIMITE_CONCENTRACAO_ATIVO:
                alertas.append(
                    f"CONCENTRAÇÃO ELEVADA: {posicao.ativo.ticker} representa "
                    f"{percentual:.1f}% do PL (limite: {LIMITE_CONCENTRACAO_ATIVO}%)."
                )

        # Alerta por setor
        valor_por_setor: dict[str, float] = {}
        for posicao in carteira.posicoes:
            setor = posicao.ativo.setor
            valor_por_setor[setor] = valor_por_setor.get(setor, 0.0) + posicao.valor_atual.cents

        for setor, valor in valor_por_setor.items():
            percentual = (valor / pl.cents) * 100.0
            if percentual > LIMITE_CONCENTRACAO_SETOR:
                alertas.append(
                    f"CONCENTRAÇÃO SETORIAL: setor '{setor}' representa "
                    f"{percentual:.1f}% do PL (limite: {LIMITE_CONCENTRACAO_SETOR}%)."
                )

        # Alertas de exposição FGC por instituição
        alertas.extend(self.gerar_alertas_fgc(carteira))

        return alertas

    def gerar_alertas_fgc(self, carteira: Carteira) -> list[str]:
        """Gera alertas de exposição acima do limite FGC por instituição emissora.

        Agrupa posições cobertas pelo FGC pelo CNPJ do emissor e alerta
        quando a exposição total supera R$250.000 por CPF por instituição.

        Args:
            carteira: Carteira com posições.

        Returns:
            Lista de alertas de exposição FGC.
        """
        alertas: list[str] = []
        # cnpj → (valor_total_coberto, nome_emissor)
        exposicao_por_cnpj: dict[str, float] = {}
        nome_por_cnpj: dict[str, str] = {}

        for posicao in carteira.posicoes:
            rf = posicao.ativo.detalhes_rf
            if rf is None or not rf.coberto_fgc:
                continue
            cnpj = rf.cnpj_emissor
            if not cnpj:
                # Sem CNPJ: não é possível agregar por instituição
                continue
            valor = posicao.valor_atual.to_reais()
            exposicao_por_cnpj[cnpj] = exposicao_por_cnpj.get(cnpj, 0.0) + valor
            nome_por_cnpj[cnpj] = posicao.ativo.emissor

        for cnpj, valor_total in exposicao_por_cnpj.items():
            if valor_total > 250_000.0:
                excesso = valor_total - 250_000.0
                nome = nome_por_cnpj.get(cnpj, cnpj)
                alertas.append(
                    f"⚠ RISCO FGC: Exposição total de R${valor_total:,.2f} na instituição "
                    f"'{nome}' (CNPJ: {cnpj}) supera o limite do FGC de R$250.000,00. "
                    f"R${excesso:,.2f} sem cobertura."
                )

        return alertas

    def gerar_alertas_rf_por_posicao(self, carteira: Carteira) -> dict[str, list[str]]:
        """Gera alertas individuais de RF por posição (vencimento, carência, high yield, etc.).

        Args:
            carteira: Carteira com posições.

        Returns:
            Dicionário ticker → lista de alertas para essa posição.
        """
        alertas_por_ticker: dict[str, list[str]] = {}
        for posicao in carteira.posicoes:
            rf = posicao.ativo.detalhes_rf
            if rf is None:
                continue
            alertas = rf.gerar_alertas(posicao.valor_atual.to_reais())
            if alertas:
                alertas_por_ticker[posicao.ativo.ticker] = alertas
        return alertas_por_ticker
