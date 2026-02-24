---
name: backtest-report
description: Analisa resultados de backtest e gera relatorio critico seguindo boas praticas (CPCV, custos realistas, vieses).
argument-hint: [path-to-results]
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob
---

# Relatorio de Backtest - BOT Assessor

Analise os resultados do backtest em `$ARGUMENTS` e gere um relatorio critico.

## Analise Obrigatoria

### 1. Validacao de Metodologia
- Walk-Forward Analysis (WFA) usado? Periodos in-sample/out-of-sample definidos?
- Combinatorial Purged Cross-Validation (CPCV) aplicado?
- Embargo period entre train/test para evitar look-ahead?
- Expanding window (NAO sliding) para normalizacao?
- Dados futuros usados em features? (PROIBIDO - look-ahead bias)

### 2. Custos Realistas (Contexto B3)
- Taxas de corretagem incluidas?
- Emolumentos B3 incluidos?
- Spread bid-ask estimado?
- Slippage modelado?
- IR calculado (15% ST / 20% DT)?
- Compensacao de prejuizo correta (DT so com DT, ST so com ST)?

### 3. Metricas Criticas
- Sharpe Ratio (> 2.0 sustentado = SUSPEITO de overfitting)
- Sortino Ratio
- Maximum Drawdown
- CVaR 97.5% (metrica primaria de risco)
- Calmar Ratio
- Win Rate + Profit Factor
- Numero de trades (significancia estatistica)

### 4. Deteccao de Vieses
- Survivorship bias (acoes delistadas incluidas?)
- Selection bias (estrategia escolhida pos-fato?)
- Overfitting (acuracia > 70% = SUSPEITO)
- Data snooping (multiplas estrategias testadas sem correcao?)
- Regime change (estrategia funciona em bull E bear?)

### 5. Stress Tests
- Monte Carlo simulation realizado?
- Stress scenarios (crise 2008, COVID 2020, Joesley Day)?
- Analise de sensibilidade a parametros?

## Formato de Output

```
# Relatorio de Backtest: [Estrategia]

## Resumo Executivo
- Resultado: APROVADO / REPROVADO / REQUER REVISAO
- Confianca: Alta / Media / Baixa

## Metricas Principais
| Metrica | Valor | Benchmark | Status |
|---------|-------|-----------|--------|

## Red Flags Detectados
1. ...

## Recomendacoes
1. ...

## Veredicto Final
...
```
