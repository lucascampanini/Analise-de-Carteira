"""Domain Service: CalculadorRisco - métricas de risco da carteira."""

from __future__ import annotations

import math
import statistics


class CalculadorRisco:
    """Calcula métricas de risco a partir de histórico de retornos.

    Recebe listas de retornos diários (já computados externamente).
    Stateless service — não tem estado interno.
    """

    def calcular_volatilidade_anualizada(
        self, retornos_diarios: list[float]
    ) -> float | None:
        """Calcula a volatilidade anualizada (std × √252).

        Args:
            retornos_diarios: Lista de retornos diários (ex: [0.01, -0.02, ...]).

        Returns:
            Volatilidade anualizada em percentual (ex: 22.5 = 22,5%) ou None.
        """
        if len(retornos_diarios) < 20:
            return None

        try:
            std_diaria = statistics.stdev(retornos_diarios)
            volatilidade = std_diaria * math.sqrt(252) * 100.0
            return round(volatilidade, 4)
        except statistics.StatisticsError:
            return None

    def calcular_cvar_95(
        self, retornos_diarios: list[float]
    ) -> float | None:
        """Calcula o CVaR 95% (Expected Shortfall) da carteira.

        CVaR 95% = média dos 5% piores retornos diários.
        Valor negativo indica perda esperada.

        Args:
            retornos_diarios: Lista de retornos diários.

        Returns:
            CVaR 95% em percentual (ex: -3.2 = -3,2% no pior cenário) ou None.
        """
        if len(retornos_diarios) < 20:
            return None

        retornos_ordenados = sorted(retornos_diarios)
        n_piores = max(1, int(len(retornos_ordenados) * 0.05))
        piores_retornos = retornos_ordenados[:n_piores]

        cvar = statistics.mean(piores_retornos) * 100.0
        return round(cvar, 4)

    def calcular_beta(
        self,
        retornos_carteira: list[float],
        retornos_benchmark: list[float],
    ) -> float | None:
        """Calcula o Beta da carteira em relação ao benchmark.

        Beta = Cov(carteira, benchmark) / Var(benchmark)

        Args:
            retornos_carteira: Retornos diários da carteira.
            retornos_benchmark: Retornos diários do benchmark (ex: IBOV).

        Returns:
            Beta calculado ou None se dados insuficientes.
        """
        if len(retornos_carteira) < 20 or len(retornos_benchmark) < 20:
            return None

        # Alinhar tamanhos
        n = min(len(retornos_carteira), len(retornos_benchmark))
        rc = retornos_carteira[-n:]
        rb = retornos_benchmark[-n:]

        if len(rc) < 20:
            return None

        try:
            media_c = statistics.mean(rc)
            media_b = statistics.mean(rb)

            cov = sum(
                (rc[i] - media_c) * (rb[i] - media_b)
                for i in range(n)
            ) / (n - 1)

            var_b = statistics.variance(rb)
            if var_b == 0:
                return None

            beta = cov / var_b
            return round(beta, 4)
        except (statistics.StatisticsError, ZeroDivisionError):
            return None

    def calcular_retornos_carteira(
        self,
        retornos_por_ativo: dict[str, list[float]],
        pesos: dict[str, float],
    ) -> list[float]:
        """Calcula os retornos diários ponderados da carteira.

        Args:
            retornos_por_ativo: Dict ticker -> lista de retornos diários.
            pesos: Dict ticker -> peso (% como decimal, ex: 0.35).

        Returns:
            Lista de retornos diários da carteira ponderada.
        """
        if not retornos_por_ativo:
            return []

        # Alinhar tamanho mínimo
        n = min(len(v) for v in retornos_por_ativo.values() if v)
        if n == 0:
            return []

        retornos_carteira: list[float] = []
        for i in range(n):
            retorno_dia = 0.0
            peso_total = 0.0
            for ticker, retornos in retornos_por_ativo.items():
                if i < len(retornos):
                    peso = pesos.get(ticker, 0.0)
                    retorno_dia += retornos[-(n - i)] * peso
                    peso_total += peso

            if peso_total > 0:
                retornos_carteira.append(retorno_dia / peso_total)

        return retornos_carteira
