# Backtesting e Simulacao de Estrategias para Bot de Investimentos no Mercado Brasileiro

## Documento de Pesquisa Aprofundada (Nivel PhD)

**Autor:** Pesquisa Automatizada via Claude
**Data:** Fevereiro 2026
**Versao:** 1.0
**Escopo:** Frameworks, metodologias, armadilhas e best practices para backtesting quantitativo no mercado brasileiro (B3)

---

## Sumario

1. [Frameworks de Backtesting](#1-frameworks-de-backtesting)
2. [Event-Driven vs Vectorized Backtesting](#2-event-driven-vs-vectorized-backtesting)
3. [Walk-Forward Analysis](#3-walk-forward-analysis)
4. [Overfitting em Backtesting](#4-overfitting-em-backtesting)
5. [Combinatorial Purged Cross-Validation (CPCV)](#5-combinatorial-purged-cross-validation-cpcv)
6. [Transaction Costs e Slippage](#6-transaction-costs-e-slippage)
7. [Monte Carlo Simulation](#7-monte-carlo-simulation)
8. [Paper Trading no Brasil](#8-paper-trading-no-brasil)
9. [Metricas de Performance](#9-metricas-de-performance)
10. [Dados para Backtesting no Brasil](#10-dados-para-backtesting-no-brasil)
11. [Regime Detection](#11-regime-detection)
12. [Armadilhas Comuns e Best Practices](#12-armadilhas-comuns-e-best-practices)
13. [Arquitetura Recomendada para o Bot](#13-arquitetura-recomendada-para-o-bot)
14. [Referencias](#14-referencias)

---

## 1. Frameworks de Backtesting

### 1.1 Visao Geral Comparativa

O ecossistema Python oferece diversos frameworks de backtesting, cada um com filosofia e trade-offs distintos. A escolha do framework correto e uma decisao arquitetural critica que impacta todo o ciclo de vida do bot.

### 1.2 Tabela Comparativa dos Principais Frameworks

| Caracteristica | VectorBT | Backtrader | bt (Python) | QuantConnect (LEAN) | NautilusTrader | Zipline-Reloaded |
|---|---|---|---|---|---|---|
| **Paradigma** | Vectorizado | Event-Driven | Tree-Based | Event-Driven | Event-Driven | Event-Driven |
| **Linguagem Core** | Python/Numba | Python | Python | C# | Rust/Cython | Python/Cython |
| **Velocidade** | Muito Alta | Media | Media | Alta | Muito Alta | Baixa-Media |
| **Realismo** | Medio | Alto | Medio | Muito Alto | Muito Alto | Alto |
| **Curva Aprendizado** | Ingreme | Moderada | Suave | Ingreme | Muito Ingreme | Moderada |
| **Dados BR Nativos** | Nao | Nao | Nao | Nao (custom) | Nao | Nao |
| **Live Trading** | Limitado | Sim | Nao | Sim | Sim | Nao |
| **Manutencao Ativa** | Sim (PRO) | Comunidade | Sim | Sim | Sim | Comunidade |
| **Multi-Asset** | Sim | Sim | Sim | Sim | Sim | Limitado |
| **Licenca** | MIT/Comercial | GPL | MIT | Apache 2.0 | LGPL | Apache 2.0 |

### 1.3 VectorBT -- O Motor de Alta Performance

VectorBT e o framework mais rapido disponivel, utilizando NumPy, pandas e Numba para backtests totalmente vetorizados. Foi benchmarkado simulando milhoes de trades em menos de um segundo, tornando-o o lider indiscutivel para estrategias que abrangem multiplos ativos ou requerem otimizacao profunda.

**Pontos Fortes:**
- Compilacao JIT via Numba para performance proxima a C
- Integracao nativa com PyPortfolioOpt, Riskfolio-Lib e Universal Portfolios
- Asset weighting consistente aplicado a todas as series temporais e metricas
- Suporte a posicoes long e short com analise distinta
- Portfolio rebalancing dinamico com templates Numba

**Pontos Fracos:**
- Curva de aprendizado ingreme para quem nao domina programacao vetorizada
- Menos realista para modelagem de slippage e fills parciais
- Versao PRO e comercial (recursos avancados pagos)

**Exemplo de uso para mercado brasileiro:**

```python
import vectorbt as vbt
import yfinance as yf

# Dados brasileiros via Yahoo Finance
symbols = ['PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA']
data = yf.download(symbols, start='2020-01-01', end='2025-12-31')

# Backtest vetorizado de cruzamento de medias
fast_ma = vbt.MA.run(data['Close'], window=20)
slow_ma = vbt.MA.run(data['Close'], window=50)
entries = fast_ma.ma_crossed_above(slow_ma)
exits = fast_ma.ma_crossed_below(slow_ma)

portfolio = vbt.Portfolio.from_signals(
    data['Close'], entries, exits,
    fees=0.0003,      # Emolumentos B3 (swing trade)
    slippage=0.001,   # Slippage estimado
    freq='1D'
)
print(portfolio.stats())
```

### 1.4 Backtrader -- O Veterano Confiavel

Backtrader permanece como um dos frameworks mais utilizados pela comunidade, com ampla documentacao e flexibilidade para estrategias complexas.

**Pontos Fortes:**
- Arquitetura event-driven realista com suporte a order types complexos
- Cerebro engine com suporte a multiplos data feeds simultaneos
- Broker simulation com margin, commission schemes e sizers
- Integracoes com Interactive Brokers, Oanda e outros brokers
- Analyzers embutidos (Sharpe, DrawDown, TradeAnalyzer, etc.)

**Pontos Fracos:**
- Performance limitada para grandes universos de ativos
- Mantenedor original menos ativo (comunidade sustenta)
- Sem suporte nativo a dados brasileiros

### 1.5 bt (Python) -- Flexibilidade Modular

O framework bt adota uma abordagem baseada em arvore (tree structure) que facilita a composicao de estrategias complexas e modulares.

**Pontos Fortes:**
- Algos e AlgoStacks para logica reutilizavel e testavel
- Tree structure para composicao hierarquica de estrategias
- Rebalancing embutido com frequencias configuraveis
- Visualizacoes e estatisticas comparativas entre backtests
- Integracao natural com ecossistema Python (pandas, scikit-learn)

**Pontos Fracos:**
- Nao suporta live trading
- Menos adequado para estrategias intraday de alta frequencia
- Modelagem de custos simplificada

### 1.6 QuantConnect (LEAN Engine)

LEAN e uma engine de trading algoritmico open-source escrita em C# que combina backtesting com capacidades de live trading.

**Pontos Fortes:**
- Engine de producao utilizada por fundos quantitativos
- Suporte multi-asset: acoes, opcoes, futuros, crypto, forex
- Cloud-based com data library extensa
- Transicao seamless de backtest para live trading
- Comunidade ativa com +40.000 membros

**Integracao com Mercado Brasileiro:**
Ativos da B3 NAO sao suportados nativamente no QuantConnect. Porem, existe um template documentado para importar dados customizados:

```csharp
// Carregar CSVs da B3 no Object Store do QuantConnect
// Template para dados customizados de acoes brasileiras
public class B3CustomData : BaseData
{
    public decimal Open, High, Low, Close;
    public long Volume;

    public override BaseData Reader(SubscriptionDataConfig config,
                                     string line, DateTime date, bool isLive)
    {
        // Parse de CSV da B3
        var csv = line.Split(',');
        return new B3CustomData
        {
            Symbol = config.Symbol,
            Time = DateTime.ParseExact(csv[0], "yyyy-MM-dd", null),
            Open = decimal.Parse(csv[1]),
            High = decimal.Parse(csv[2]),
            Low = decimal.Parse(csv[3]),
            Close = decimal.Parse(csv[4]),
            Volume = long.Parse(csv[5]),
            Value = decimal.Parse(csv[4])
        };
    }
}
```

### 1.7 NautilusTrader -- O Estado da Arte

NautilusTrader representa o estado da arte em backtesting de alta performance, com core escrito em Rust e bindings Python via Cython e PyO3.

**Pontos Fortes:**
- Streaming de ate 5 milhoes de linhas por segundo
- Resolucao de nanosegundos na simulacao
- Mesmo codigo para backtest e live trading (zero reimplementacao)
- Suporte a multiplos venues simultaneos
- Arquitetura event-driven de producao

**Pontos Fracos:**
- Curva de aprendizado muito ingreme
- Documentacao ainda em evolucao
- Comunidade menor comparada a Backtrader

### 1.8 Recomendacao para o Bot Brasileiro

Para um bot de investimentos de alto nivel no mercado brasileiro, recomenda-se uma **abordagem hibrida em duas fases:**

1. **Fase de Pesquisa (Research):** VectorBT para screening rapido e otimizacao de parametros em grande escala
2. **Fase de Validacao (Validation):** Backtrader ou NautilusTrader para validacao final event-driven com modelagem realista de custos da B3

---

## 2. Event-Driven vs Vectorized Backtesting

### 2.1 Diferenca Fundamental

A escolha entre backtesting vetorizado e event-driven e uma das decisoes mais importantes na arquitetura de um sistema quantitativo.

**Backtesting Vetorizado** processa dados em lotes de timesteps fixos (barras diarias, minutais) e usa operacoes vetorizadas para computar sinais em todos os ativos simultaneamente.

**Backtesting Event-Driven** simula um ambiente live processando sequencialmente eventos discretos de mercado (ticks, fechamento de barras, etc.).

### 2.2 Comparacao Detalhada

| Aspecto | Vetorizado | Event-Driven |
|---|---|---|
| **Velocidade** | Muito rapida (SIMD/BLAS) | Mais lenta, processamento sequencial |
| **Look-Ahead Bias** | ALTO risco (propensao inerente) | BAIXO risco (processamento cronologico) |
| **Fills Parciais** | Nao suporta | Suporta nativamente |
| **Slippage Intra-bar** | Nao modela | Modela com precisao |
| **Stop Loss/Take Profit** | Aproximado | Preciso (intra-bar highs/lows) |
| **Money Management** | Limitado | Complexo e dinamico |
| **Transicao para Live** | Requer reimplementacao total | Minima troca de componentes |
| **Uso Ideal** | Screening, pesquisa, fatores | Validacao final, HFT, execucao |

### 2.3 O Problema do Look-Ahead Bias em Sistemas Vetorizados

Um dos problemas mais insidiosos do backtesting vetorizado e a propensao ao look-ahead bias. Em sistemas vetorizados, dados futuros podem inadvertidamente ser incorporados em decisoes anteriores. Isso ocorre porque:

- Operacoes de normalizacao/padronizacao usam estatisticas de toda a serie
- Filtros e indicadores podem usar dados futuros se nao forem cuidadosamente implementados
- Selecao de ativos pode ser baseada em informacao futura

**Mitigacao:**

```python
# ERRADO - look-ahead bias
data['signal'] = (data['close'] - data['close'].mean()) / data['close'].std()

# CORRETO - rolling window
data['signal'] = (data['close'] - data['close'].rolling(252).mean()) / \
                  data['close'].rolling(252).std()
```

### 2.4 Abordagem Hibrida Recomendada

Muitas equipes quantitativas adotam uma abordagem hibrida: usam backtests vetorizados para filtrar e reduzir o universo de candidatos, depois migram os designs promissores para um framework event-driven para validacao final antes do deployment live.

```
[Universo de Estrategias]
        |
        v
[VectorBT: Screening Rapido] --> Descarta 90% das estrategias
        |
        v
[Backtrader: Validacao Event-Driven] --> Validacao com custos reais
        |
        v
[Paper Trading: Validacao Real-Time] --> Teste em tempo real
        |
        v
[Live Trading: Deploy]
```

---

## 3. Walk-Forward Analysis

### 3.1 Conceito e Importancia

Walk-Forward Analysis (WFA) e considerada o "padrao ouro" em validacao de estrategias de trading. Diferente do backtesting tradicional que usa um unico periodo in-sample para otimizar e um unico periodo out-of-sample para validar, WFA emprega uma abordagem de janela rolante.

O proposito de um teste walk-forward e determinar se a performance de um sistema de trading otimizado e realista ou resultado de curve-fitting.

### 3.2 Tipos de Walk-Forward

#### 3.2.1 Anchored Walk-Forward
- O inicio do periodo in-sample permanece fixo
- A janela in-sample cresce progressivamente
- Captura toda a historia disponivel para treinamento
- Melhor para mercados com tendencias de longo prazo

```
IS Period 1: [====]    OOS: [==]
IS Period 2: [======]  OOS:     [==]
IS Period 3: [========]OOS:         [==]
IS Period 4: [==========]OOS:           [==]
```

#### 3.2.2 Rolling Walk-Forward
- Janela in-sample de tamanho fixo que "rola" no tempo
- Mais adaptavel a mudancas de regime
- Descarta dados antigos que podem nao ser mais relevantes
- Melhor para mercados dinamicos como o brasileiro

```
IS Period 1: [====]    OOS: [==]
IS Period 2:   [====]  OOS:   [==]
IS Period 3:     [====]OOS:     [==]
IS Period 4:       [====]OOS:     [==]
```

### 3.3 Parametros Criticos

**Razao IS/OOS:** A razao entre periodo in-sample e out-of-sample tipicamente varia de 2:1 a 5:1. Para o mercado brasileiro, recomenda-se 3:1 a 4:1 devido a maior volatilidade.

**Tamanho da Janela OOS:** Deve conter trades suficientes para significancia estatistica. Minimo de 30-50 trades por janela OOS.

**Frequencia de Re-otimizacao:** Depende do horizonte da estrategia:
- Day trade: re-otimizar semanalmente ou quinzenalmente
- Swing trade: re-otimizar mensalmente ou trimestralmente
- Position trade: re-otimizar trimestralmente ou semestralmente

### 3.4 Walk-Forward Optimization (WFO)

```python
import numpy as np
import pandas as pd
from itertools import product

def walk_forward_optimization(data, strategy_func, param_grid,
                               is_window=252, oos_window=63,
                               step=63, metric='sharpe'):
    """
    Implementacao de Walk-Forward Optimization.

    Args:
        data: DataFrame com dados OHLCV
        strategy_func: funcao(data, params) -> returns
        param_grid: dict de parametros para otimizar
        is_window: tamanho da janela in-sample (dias)
        oos_window: tamanho da janela out-of-sample (dias)
        step: passo de avanco (dias)
        metric: metrica para otimizacao

    Returns:
        DataFrame com resultados OOS concatenados
    """
    results = []
    param_combinations = list(product(*param_grid.values()))
    param_names = list(param_grid.keys())

    total_len = len(data)
    start = 0

    while start + is_window + oos_window <= total_len:
        # Periodo In-Sample
        is_data = data.iloc[start:start + is_window]
        # Periodo Out-of-Sample
        oos_data = data.iloc[start + is_window:start + is_window + oos_window]

        # Otimizar nos dados IS
        best_metric = -np.inf
        best_params = None

        for params in param_combinations:
            param_dict = dict(zip(param_names, params))
            is_returns = strategy_func(is_data, param_dict)

            if metric == 'sharpe':
                score = is_returns.mean() / (is_returns.std() + 1e-10) * np.sqrt(252)
            elif metric == 'sortino':
                downside = is_returns[is_returns < 0].std()
                score = is_returns.mean() / (downside + 1e-10) * np.sqrt(252)

            if score > best_metric:
                best_metric = score
                best_params = param_dict

        # Aplicar melhores parametros no OOS
        oos_returns = strategy_func(oos_data, best_params)
        results.append({
            'start_date': oos_data.index[0],
            'end_date': oos_data.index[-1],
            'params': best_params,
            'is_metric': best_metric,
            'oos_returns': oos_returns
        })

        start += step

    return results
```

### 3.5 Walk-Forward Efficiency Ratio

O **Walk-Forward Efficiency Ratio (WFER)** mede a degradacao de performance entre IS e OOS:

```
WFER = (Metrica OOS Media) / (Metrica IS Media)
```

- WFER > 0.5: Estrategia robusta, boa generalizacao
- WFER 0.3-0.5: Estrategia aceitavel, algum overfitting
- WFER < 0.3: Overfitting significativo, estrategia suspeita

### 3.6 Limitacoes

**Window Selection Bias:** O tamanho das janelas de treinamento e teste molda fundamentalmente os resultados. Uma janela de treinamento muito curta perde ciclos de mercado essenciais e produz parametros instaveis, enquanto uma janela muito longa incorpora condicoes de mercado ultrapassadas que podem nao ser mais relevantes.

---

## 4. Overfitting em Backtesting

### 4.1 O Problema Central

Overfitting em backtesting ocorre quando uma estrategia de trading e ajustada tao proximamente aos dados historicos que captura ruido aleatorio em vez de padroes reais de mercado. A estrategia parece lucrativa em testes passados mas falha quando operada ao vivo.

> "Given enough time, enough attempts, and enough imagination, virtually any random data set can be overfit to show a seemingly remarkable result." -- Bailey & Lopez de Prado (2014)

### 4.2 Data Snooping Bias

Data snooping bias (tambem chamado de multiple testing ou p-hacking) aparece quando voce testa muitas versoes de um modelo e reporta apenas a melhor. O "vencedor" frequentemente vence por sorte, nao por habilidade.

**Exemplo pratico:** Um pesquisador testa 100 combinacoes de medias moveis. Mesmo que NENHUMA tenha valor preditivo real, espera-se que pelo menos 5 apresentem resultados "significativos" ao nivel de 5%.

### 4.3 White's Reality Check (RC)

Proposto por Halbert White (2000), o Reality Check e um metodo para detectar data snooping construindo p-values baseados em bootstrap para a hipotese nula de que nenhuma estrategia supera um benchmark.

**Funcionamento:**
1. Define H0: nenhuma das k estrategias testadas supera o benchmark
2. Calcula a estatistica de teste: max performance entre todas as estrategias
3. Usa bootstrap para gerar a distribuicao nula
4. Compara a estatistica observada com a distribuicao bootstrap

**Limitacao:** O RC pode ser manipulado pela inclusao de previsoes ruins e irrelevantes no conjunto de alternativas.

### 4.4 Hansen's Superior Predictive Ability (SPA) Test

Hansen (2005) introduziu o teste SPA como melhoria do RC, minimizando o impacto de regras de trading com performance ruim.

**Melhorias sobre o RC:**
- Usa uma estatistica de teste studentizada que reduz a influencia de previsoes erraticas
- Invoca uma distribuicao nula dependente da amostra
- Mais poderoso e menos sensivel a alternativas pobres e irrelevantes

**Implementacao em Python (via arch library):**

```python
from arch.bootstrap import SPA

# losses: array (n_obs, n_models) de perdas de cada modelo
# benchmark_losses: array (n_obs,) de perdas do benchmark
spa = SPA(benchmark_losses, model_losses, block_size=10)
spa.compute()

print(f"p-value (consistent): {spa.pvalues['consistent']:.4f}")
print(f"p-value (upper): {spa.pvalues['upper']:.4f}")
print(f"p-value (lower): {spa.pvalues['lower']:.4f}")
```

### 4.5 Deflated Sharpe Ratio (DSR)

O Deflated Sharpe Ratio, desenvolvido por Bailey e Lopez de Prado (2014), fornece uma estatistica de performance mais robusta, particularmente quando os retornos seguem uma distribuicao nao-normal.

**Definicao:** O DSR e a probabilidade de que um Sharpe ratio observado tenha sido extraido de uma distribuicao com media positiva, apos controlar por:
- Comprimento da amostra (T)
- Assimetria (skewness) dos retornos
- Curtose (kurtosis) dos retornos
- Numero de variacoes de estrategia exploradas (N)

**Formula:**

```
DSR = P[SR* > 0 | SR_hat, SR_benchmark]

Onde:
SR* = SR ajustado para multiplas comparacoes
SR_hat = Sharpe ratio observado
SR_benchmark = E[max_N{SR}] sob H0 (todos SR = 0)
```

**Minimum Backtest Length (MinBTL):**

Bailey e Lopez de Prado provaram que, apos testar apenas 7 configuracoes de estrategia, um pesquisador espera identificar pelo menos um backtest de 2 anos com Sharpe ratio anualizado acima de 1, quando o Sharpe ratio OOS esperado e zero.

```python
import numpy as np
from scipy.stats import norm

def deflated_sharpe_ratio(sr_observed, sr_benchmark, n_trials,
                          T, skew=0, kurtosis=3):
    """
    Calcula o Deflated Sharpe Ratio.

    Args:
        sr_observed: Sharpe ratio observado (anualizado)
        sr_benchmark: Sharpe ratio benchmark (E[max_N])
        n_trials: numero de estrategias testadas
        T: numero de observacoes
        skew: assimetria dos retornos
        kurtosis: curtose dos retornos

    Returns:
        DSR (probabilidade)
    """
    # Variancia do estimador de Sharpe
    sr_std = np.sqrt((1 - skew * sr_observed +
                      (kurtosis - 1) / 4 * sr_observed**2) / (T - 1))

    # Estatistica de teste
    z = (sr_observed - sr_benchmark) / sr_std

    # DSR = probabilidade
    dsr = norm.cdf(z)

    return dsr

def expected_max_sr(n_trials, T, skew=0, kurtosis=3):
    """
    Calcula o Sharpe ratio maximo esperado sob H0.
    Correcao de Euler-Mascheroni para N trials.
    """
    euler_mascheroni = 0.5772156649
    z = norm.ppf(1 - 1/n_trials)

    sr_max = ((1 - euler_mascheroni) * norm.ppf(1 - 1/n_trials) +
              euler_mascheroni * norm.ppf(1 - 1/(n_trials * np.e)))

    # Ajustar para comprimento da amostra
    sr_max *= np.sqrt(1/T) * np.sqrt(252)  # anualizado

    return sr_max

def minimum_backtest_length(n_trials, target_sr=1.0, freq=252):
    """
    Calcula o comprimento minimo do backtest em anos.
    """
    minBTL = (n_trials ** (2/freq)) / (target_sr ** 2)
    return minBTL
```

### 4.6 Probability of Backtest Overfitting (PBO)

A PBO, proposta por Bailey, Borwein, Lopez de Prado e Zhu, estima a probabilidade de que a melhor estrategia in-sample tenha performance negativa out-of-sample.

**Metodo CSCV (Combinatorially Symmetric Cross-Validation):**
1. Dividir dados em S subgrupos
2. Para todas as combinacoes C(S, S/2), dividir em treino e teste
3. Encontrar a melhor estrategia no treino
4. Avaliar essa estrategia no teste
5. PBO = fracao de combinacoes onde a melhor IS teve performance negativa OOS

**Interpretacao:**
- PBO < 0.10: Baixa probabilidade de overfitting (bom)
- PBO 0.10-0.30: Risco moderado
- PBO > 0.30: Alta probabilidade de overfitting (rejeitar)

### 4.7 Checklist Anti-Overfitting

1. **Limitar trials:** Minimizar o numero de configuracoes testadas
2. **Registrar TODOS os testes:** Manter log de todas as estrategias testadas, nao apenas as vencedoras
3. **Calcular DSR:** Ajustar o Sharpe ratio pelo numero de trials
4. **Usar WFA:** Validar com walk-forward analysis
5. **Aplicar CPCV:** Cross-validation com purging e embargo
6. **Testar PBO:** Calcular a probabilidade de overfitting
7. **Monte Carlo:** Verificar robustez via simulacao
8. **Paper Trade:** Validar em tempo real antes de ir live

---

## 5. Combinatorial Purged Cross-Validation (CPCV)

### 5.1 Motivacao

Tecnicas tradicionais de cross-validation (k-fold, hold-out) sao inadequadas para series temporais financeiras por dois motivos criticos:

1. **Dependencia temporal:** Observacoes consecutivas sao correlacionadas
2. **Sobreposicao de labels:** Labels que se sobrepoem no tempo causam leakage

### 5.2 Conceito do CPCV

O CPCV, proposto por Marcos Lopez de Prado em "Advances in Financial Machine Learning" (2018), aborda a falha de selection bias e leakage temporal gerando uma multitude de particoes treino-teste que respeitam a cronologia.

**Mecanismo:**
1. Dividir a serie temporal em N grupos sequenciais nao-sobrepostos
2. Selecionar todas as combinacoes de k grupos (k < N) como conjuntos de teste
3. Grupos restantes (N - k) sao usados para treinamento
4. Para cada combinacao, aplicar **purging** e **embargo**

### 5.3 Purging

Purging consiste em remover do conjunto de treinamento todas as observacoes cujos labels se sobrepoem no tempo com os labels incluidos no conjunto de teste.

```
Treino: [...XXXXX|----purge----|XXXXX...]
Teste:              [TTTTTTTT]

X = dados de treino usados
- = dados de treino removidos (purged)
T = dados de teste
```

### 5.4 Embargo Period

O embargo adiciona um "buffer" temporal entre treino e teste para prevenir leakage de informacao que persiste alem da sobreposicao direta de labels:

```
Treino: [...XXXXX|--purge--|--embargo--|XXXXX...]
Teste:              [TTTTTTTTT]
```

**Regra pratica para o embargo period:**
- Para dados diarios: 1-5 dias uteis
- Para dados intraday: 1-24 horas
- Para ML com features de longo prazo: ate 2-4 semanas

### 5.5 Implementacao com skfolio

```python
from skfolio.model_selection import CombinatorialPurgedCV
import numpy as np

# Configurar CPCV
cpcv = CombinatorialPurgedCV(
    n_folds=10,           # N = 10 grupos
    n_test_folds=2,       # k = 2 grupos de teste
    purge_threshold=2,    # Purging de 2 periodos
    embargo_threshold=1   # Embargo de 1 periodo
)

# Gerar splits
X = np.random.randn(2520, 10)  # ~10 anos de dados diarios, 10 features
splits = list(cpcv.split(X))

print(f"Numero total de combinacoes: {len(splits)}")
# C(10,2) = 45 combinacoes de treino-teste

for i, (train_idx, test_idx) in enumerate(splits[:3]):
    print(f"Split {i}: Train={len(train_idx)}, Test={len(test_idx)}")
```

### 5.6 Beneficios do CPCV

O resultado nao e um unico score de performance por conjunto de parametros, mas sim uma **distribuicao empirica de resultados out-of-sample**, que revela a estabilidade -- ou falta dela -- da estrategia atraves de um conjunto diverso de caminhos historicos plausiveis.

**Vantagens sobre k-fold tradicional:**
- Gera C(N,k) combinacoes (muito mais que k splits)
- Cada combinacao respeita a ordem temporal
- Purging elimina leakage de labels sobrepostos
- Embargo previne leakage residual
- Distribuicao de performance OOS permite calcular PBO

### 5.7 Triple Barrier Method e Meta-Labeling

Complementar ao CPCV, Lopez de Prado propoe o **Triple Barrier Method** para labeling de dados de trading:

- **Barreira Superior:** Threshold para oportunidade de compra (label 1)
- **Barreira Inferior:** Threshold para venda (label -1)
- **Barreira Vertical:** Tempo maximo antes de receber label 0

**Meta-Labeling:** Envolve criar um modelo secundario de ML que aprende como usar o modelo primario, levando a metricas melhoradas de accuracy, precision, recall e F1-score. Meta-labeling pode ser usado para aprender o tamanho das apostas depois que se conhece o lado (compra/venda).

---

## 6. Transaction Costs e Slippage

### 6.1 Importancia da Modelagem Realista

A diferenca entre um backtest lucrativo e uma estrategia real lucrativa frequentemente esta na modelagem de custos de transacao. Incorporar modelos realistas de transaction costs e slippage nos frameworks de backtesting permite entender a verdadeira performance das estrategias.

### 6.2 Custos Operacionais da B3

#### 6.2.1 Estrutura de Tarifas (Valores Atualizados)

| Componente | Swing Trade | Day Trade |
|---|---|---|
| **Taxa de Negociacao** | 0,005% | 0,005% |
| **Taxa de Liquidacao** | 0,025% | 0,020% |
| **Total Emolumentos** | 0,030% | 0,025% |
| **ISS (sobre emolumentos)** | 5% do emolumento | 5% do emolumento |
| **Corretagem** | Varia por corretora | Varia por corretora |

**Nota:** A B3 segregou as tarifas em Tarifa de Negociacao, Tarifa de Contraparte Central e Tarifa de Transferencia de ativos, com modelo progressivo.

#### 6.2.2 Impostos

| Tipo | Aliquota | Observacao |
|---|---|---|
| **IR Swing Trade** | 15% sobre lucro | Isencao ate R$20k/mes em vendas |
| **IR Day Trade** | 20% sobre lucro | Sem isencao |
| **IRRF (dedo-duro)** | 1% Swing / 0,005% Day | Retido na fonte |

### 6.3 Modelagem de Slippage

Slippage e a diferenca entre o preco no momento da decisao de transacionar e o preco real de execucao na bolsa. Depende de:

- **Bid-ask spread:** Diferenca entre melhor oferta de compra e venda
- **Liquidez do ativo:** Ativos menos liquidos tem maior slippage
- **Volatilidade:** Mercados volateis ampliam o slippage
- **Tamanho da ordem:** Ordens maiores sofrem mais market impact
- **Latencia:** Tempo entre decisao e execucao

**Slippage estimado por faixa de liquidez (B3):**

| Faixa de Liquidez | Ativos Exemplo | Slippage Estimado |
|---|---|---|
| Alta Liquidez | PETR4, VALE3, ITUB4, BBDC4 | 0.01% - 0.05% |
| Media Liquidez | RENT3, RAIL3, JBSS3 | 0.05% - 0.15% |
| Baixa Liquidez | Small caps | 0.15% - 0.50%+ |

### 6.4 Modelo Almgren-Chriss para Market Impact

O modelo Almgren-Chriss e o framework matematico padrao para execucao otima, equilibrando o tradeoff entre custo de market impact e risco de timing.

**Componentes:**

1. **Impacto Permanente:** Mudanca de longo prazo no preco do ativo resultante do trade, que persiste apos a conclusao
2. **Impacto Temporario:** Mudanca de curto prazo no preco causada pela presenca do trade no mercado, que desaparece apos a conclusao

**Modelo:**

```python
def almgren_chriss_cost(shares_to_trade, total_shares, daily_volume,
                        volatility, urgency_parameter=0.5):
    """
    Modelo simplificado Almgren-Chriss para estimativa de custo.

    Args:
        shares_to_trade: numero de acoes a negociar
        total_shares: total de acoes em circulacao
        daily_volume: volume diario medio
        volatility: volatilidade diaria do ativo
        urgency_parameter: 0=paciente, 1=urgente

    Returns:
        Custo estimado em percentual do valor da ordem
    """
    # Participacao no volume
    participation_rate = shares_to_trade / daily_volume

    # Impacto permanente (linear)
    permanent_impact = 0.1 * volatility * (shares_to_trade / daily_volume)

    # Impacto temporario (nao-linear - raiz quadrada)
    temporary_impact = 0.1 * volatility * (participation_rate ** 0.5)

    # Custo total ajustado por urgencia
    total_cost = permanent_impact + urgency_parameter * temporary_impact

    return total_cost
```

### 6.5 Fill Simulation Realista

Para um backtest realista, a simulacao de fills deve considerar:

```python
class RealisticFillSimulator:
    """Simulador de fills realista para mercado brasileiro."""

    def __init__(self, default_slippage_bps=5, impact_coefficient=0.1):
        self.default_slippage_bps = default_slippage_bps
        self.impact_coefficient = impact_coefficient

    def simulate_fill(self, order_size, price, volume, spread,
                      volatility, is_market_order=True):
        """
        Simula o fill de uma ordem.

        Args:
            order_size: tamanho da ordem em acoes
            price: preco atual do ativo
            volume: volume medio diario
            spread: bid-ask spread percentual
            volatility: volatilidade diaria
            is_market_order: True para market order

        Returns:
            dict com preco de fill, slippage, custos
        """
        # 1. Custo do spread (metade para cada lado)
        spread_cost = spread / 2

        # 2. Market impact (modelo raiz quadrada)
        participation = order_size / volume
        market_impact = self.impact_coefficient * volatility * (participation ** 0.5)

        # 3. Slippage aleatorio (simulacao de latencia)
        import numpy as np
        random_slippage = np.random.normal(0, self.default_slippage_bps / 10000)

        # 4. Emolumentos B3
        emolumentos = 0.0003  # 0.03% swing trade

        # 5. Preco de fill total
        total_slippage = spread_cost + market_impact + max(0, random_slippage)
        fill_price = price * (1 + total_slippage)  # Para compra

        # 6. Custo total por acao
        total_cost_pct = total_slippage + emolumentos

        return {
            'fill_price': fill_price,
            'spread_cost_pct': spread_cost,
            'market_impact_pct': market_impact,
            'random_slippage_pct': random_slippage,
            'emolumentos_pct': emolumentos,
            'total_cost_pct': total_cost_pct,
            'total_cost_brl': order_size * price * total_cost_pct
        }
```

### 6.6 Impacto dos Custos na Performance

Regra pratica para viabilidade de estrategias no mercado brasileiro:

| Frequencia | Custos Roundtrip Estimados | Retorno Minimo por Trade |
|---|---|---|
| **Scalping** (segundos) | 0.10% - 0.20% | > 0.25% |
| **Day Trade** (minutos-horas) | 0.08% - 0.15% | > 0.20% |
| **Swing Trade** (dias) | 0.06% - 0.12% | > 0.15% |
| **Position** (semanas-meses) | 0.06% - 0.10% | > 0.50% |

---

## 7. Monte Carlo Simulation

### 7.1 Conceito

Monte Carlo simulation e um metodo para determinar a robustez de um sistema, respondendo a pergunta: "E se o passado tivesse sido ligeiramente diferente?"

A equity curve do backtest e reamostrada aleatoriamente muitas vezes, gerando diversas equity curves que representam diferentes ordens de trades e diferentes movimentos de preco dentro de cada trade.

### 7.2 Tipos de Simulacao Monte Carlo para Trading

#### 7.2.1 Trade Shuffling (Permutacao de Trades)
Embaralha a ordem dos trades mantendo seus retornos individuais intactos. Revela como a sequencia dos trades afeta drawdowns e equity curves.

#### 7.2.2 Return Bootstrap
Reamostra retornos com reposicao para gerar novas sequencias. Preserva a distribuicao dos retornos mas destroi a autocorrelacao.

#### 7.2.3 Parametric Bootstrap
Ajusta uma distribuicao aos retornos (Normal, t-Student, etc.) e gera novas amostras a partir da distribuicao fitted.

#### 7.2.4 Block Bootstrap
Reamostra blocos de retornos consecutivos para preservar a estrutura de dependencia temporal.

#### 7.2.5 Strategy Parameter Perturbation
Perturba ligeiramente os parametros da estrategia para avaliar sensibilidade.

### 7.3 Implementacao Completa

```python
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple

class MonteCarloSimulator:
    """Simulador Monte Carlo para analise de robustez de estrategias."""

    def __init__(self, trade_returns: np.ndarray, n_simulations: int = 5000):
        """
        Args:
            trade_returns: array de retornos por trade
            n_simulations: numero de simulacoes (min 1000, recomendado 5000+)
        """
        self.trade_returns = trade_returns
        self.n_simulations = n_simulations
        self.simulated_equity_curves = None

    def trade_shuffling(self, initial_capital: float = 100000) -> np.ndarray:
        """
        Simulacao por permutacao da ordem dos trades.
        Preserva retornos individuais, varia a sequencia.
        """
        n_trades = len(self.trade_returns)
        equity_curves = np.zeros((self.n_simulations, n_trades + 1))
        equity_curves[:, 0] = initial_capital

        for i in range(self.n_simulations):
            shuffled = np.random.permutation(self.trade_returns)
            for j in range(n_trades):
                equity_curves[i, j+1] = equity_curves[i, j] * (1 + shuffled[j])

        self.simulated_equity_curves = equity_curves
        return equity_curves

    def return_bootstrap(self, n_periods: int = None,
                         initial_capital: float = 100000) -> np.ndarray:
        """
        Bootstrap de retornos com reposicao.
        """
        if n_periods is None:
            n_periods = len(self.trade_returns)

        equity_curves = np.zeros((self.n_simulations, n_periods + 1))
        equity_curves[:, 0] = initial_capital

        for i in range(self.n_simulations):
            sampled = np.random.choice(self.trade_returns, size=n_periods,
                                        replace=True)
            for j in range(n_periods):
                equity_curves[i, j+1] = equity_curves[i, j] * (1 + sampled[j])

        self.simulated_equity_curves = equity_curves
        return equity_curves

    def block_bootstrap(self, block_size: int = 20,
                        initial_capital: float = 100000) -> np.ndarray:
        """
        Block bootstrap para preservar dependencia temporal.
        """
        n_trades = len(self.trade_returns)
        n_blocks = n_trades // block_size

        equity_curves = np.zeros((self.n_simulations, n_trades + 1))
        equity_curves[:, 0] = initial_capital

        for i in range(self.n_simulations):
            # Selecionar blocos aleatorios
            block_starts = np.random.randint(0, n_trades - block_size,
                                              size=n_blocks + 1)
            bootstrapped = np.concatenate([
                self.trade_returns[s:s+block_size] for s in block_starts
            ])[:n_trades]

            for j in range(n_trades):
                equity_curves[i, j+1] = equity_curves[i, j] * (1 + bootstrapped[j])

        self.simulated_equity_curves = equity_curves
        return equity_curves

    def compute_confidence_intervals(self,
                                      confidence_levels: List[float] = [0.95, 0.99]
                                      ) -> Dict:
        """
        Calcula intervalos de confianca das equity curves simuladas.
        """
        if self.simulated_equity_curves is None:
            raise ValueError("Execute uma simulacao primeiro.")

        results = {}
        final_values = self.simulated_equity_curves[:, -1]

        for cl in confidence_levels:
            alpha = 1 - cl
            lower = np.percentile(final_values, alpha/2 * 100)
            upper = np.percentile(final_values, (1 - alpha/2) * 100)
            results[f'{cl*100:.0f}%'] = {
                'lower': lower,
                'upper': upper,
                'median': np.median(final_values),
                'mean': np.mean(final_values)
            }

        return results

    def compute_max_drawdown_distribution(self) -> Dict:
        """
        Calcula a distribuicao de drawdowns maximos.
        """
        if self.simulated_equity_curves is None:
            raise ValueError("Execute uma simulacao primeiro.")

        max_drawdowns = []

        for i in range(self.n_simulations):
            curve = self.simulated_equity_curves[i]
            running_max = np.maximum.accumulate(curve)
            drawdowns = (curve - running_max) / running_max
            max_drawdowns.append(drawdowns.min())

        max_drawdowns = np.array(max_drawdowns)

        return {
            'mean_max_dd': np.mean(max_drawdowns),
            'median_max_dd': np.median(max_drawdowns),
            'worst_5pct': np.percentile(max_drawdowns, 5),
            'worst_1pct': np.percentile(max_drawdowns, 1),
            'std_max_dd': np.std(max_drawdowns)
        }

    def probability_of_ruin(self, ruin_threshold: float = 0.5,
                            initial_capital: float = 100000) -> float:
        """
        Calcula a probabilidade de ruina (drawdown abaixo do threshold).
        """
        if self.simulated_equity_curves is None:
            raise ValueError("Execute uma simulacao primeiro.")

        ruin_level = initial_capital * (1 - ruin_threshold)
        ruin_count = np.sum(
            np.any(self.simulated_equity_curves < ruin_level, axis=1)
        )

        return ruin_count / self.n_simulations
```

### 7.4 Numero de Simulacoes Recomendado

| Fase | Simulacoes | Precisao | Uso |
|---|---|---|---|
| Screening Rapido | 1.000 | ~3% | Filtragem inicial |
| Validacao | 2.000-5.000 | ~1.5% | Analise aprofundada |
| Decisao Final | 5.000-10.000 | ~1% | Antes de ir live |

### 7.5 Interpretacao dos Resultados

- **Mediana da equity final:** Expectativa realista de retorno
- **Percentil 5%:** "Worst case" razoavel (95% de confianca)
- **Percentil 1%:** Cenario extremo (99% de confianca)
- **Prob. de Ruina < 1%:** Condicao minima para ir live
- **Max Drawdown 95th percentile:** Capital necessario para sobreviver

---

## 8. Paper Trading no Brasil

### 8.1 Conceito e Importancia

Paper trading e a pratica de simular operacoes em tempo real sem arriscar capital. E o penultimo passo antes do live trading, permitindo validar:

- Execucao da estrategia em condicoes reais de mercado
- Latencia e conectividade
- Fills e slippage reais
- Comportamento em diferentes condicoes de mercado
- Estabilidade do codigo em producao

### 8.2 MetaTrader 5 (MT5) no Brasil

O MetaTrader 5 e a plataforma mais acessivel para paper trading no mercado brasileiro, com servidor demo da MetaQuotes disponivel para acompanhar ativos da Bovespa gratuitamente.

**Funcionalidades para Paper Trading:**
- Operacoes com dinheiro virtual em tempo real
- Configuracao de Stop Loss e Take Profit
- Suporte a indicadores tecnicos e ferramentas de desenho
- Backtesting integrado via Strategy Tester
- Linguagem MQL5 para algoritmos automatizados
- Disponivel em Windows, Mac, web e mobile

**Integracoes para o Bot:**
- API MQL5 para comunicacao com estrategias Python
- Suporte a DLLs externas
- WebSocket/REST API via Expert Advisors customizados

### 8.3 Profit (Nelogica)

O Profit, desenvolvido pela Nelogica, e a plataforma de trading mais utilizada no Brasil, processando aproximadamente 7 milhoes de ordens por dia (cerca de 80% do mercado de varejo).

**Funcionalidades:**
- Simulador integrado: operacoes como no mercado real sem risco de capital
- Modulo de simulacao: envio de ordens em tempo real ou em replay
- Graficos detalhados com ampla gama de indicadores tecnicos
- Execucao rapida de ordens com baixa latencia
- Profundidade de mercado (book de ofertas)
- Suporte a scripts e algoritmos de trading
- Backtesting integrado

**Versoes:**
- **Profit Free:** Versao gratuita com funcionalidades basicas
- **Profit Pro:** Versao completa para traders profissionais (paga ou gratuita via corretoras parceiras)
- **Profit Ultra:** Versao premium para HFT e mesa de operacoes

### 8.4 Outras Plataformas para Paper Trading

| Plataforma | Tipo | Custo | Mercado BR |
|---|---|---|---|
| MetaTrader 5 | Desktop/Mobile | Gratuito | Sim (demo) |
| Profit (Nelogica) | Desktop/Mobile | Gratuito-Pago | Sim (nativo) |
| TradingView | Web/Desktop | Freemium | Sim (dados) |
| Clear Trader | Web | Gratuito | Sim (nativo) |
| XP Investimentos | Web/Desktop | Gratuito | Sim (nativo) |
| TradeMap | Mobile | Freemium | Sim (dados) |

### 8.5 Pipeline de Paper Trading para o Bot

```
[Backtest Aprovado]
      |
      v
[Deploy em Paper Trading]
      |
      v
[Monitorar por 1-3 meses]
      |
      +--- Metricas reais vs backtested
      +--- Slippage real vs estimado
      +--- Latencia e falhas de conexao
      +--- Drawdowns e recuperacao
      |
      v
[Decisao: Live ou Recalibrar?]
```

**Criterios para aprovacao no paper trading:**
- Sharpe ratio OOS > 70% do backtested
- Max drawdown < 120% do backtested
- Win rate dentro de 2 desvios padrao do esperado
- Slippage medio < 2x o estimado no backtest
- Zero falhas criticas de execucao

---

## 9. Metricas de Performance

### 9.1 Metricas de Retorno Ajustado ao Risco

#### 9.1.1 Sharpe Ratio

Criado por William Sharpe, mede o retorno de um investimento relativo ao seu risco. E a metrica mais utilizada mas tem limitacoes importantes.

```
Sharpe = (Rp - Rf) / sigma_p

Onde:
Rp = retorno do portfolio (anualizado)
Rf = taxa livre de risco (Selic no Brasil)
sigma_p = desvio padrao dos retornos (anualizado)
```

**Interpretacao para o mercado brasileiro:**

| Sharpe | Interpretacao | Qualidade |
|---|---|---|
| < 0 | Retorno abaixo da Selic | Inaceitavel |
| 0 - 0.5 | Baixo retorno ajustado | Fraco |
| 0.5 - 1.0 | Retorno razoavel | Aceitavel |
| 1.0 - 2.0 | Bom retorno ajustado | Bom |
| 2.0 - 3.0 | Excelente | Muito Bom |
| > 3.0 | Excepcional (verificar overfitting!) | Suspeito |

**Limitacoes:**
- Assume distribuicao normal dos retornos
- Penaliza igualmente volatilidade positiva e negativa
- Sensivel ao periodo de amostragem
- Nao captura tail risk

#### 9.1.2 Sortino Ratio

Similar ao Sharpe mas foca apenas na volatilidade negativa (downside risk), sendo mais adequado para estrategias assimericas.

```
Sortino = (Rp - Rf) / sigma_downside

Onde:
sigma_downside = desvio padrao apenas dos retornos negativos
```

**Vantagem:** Nao penaliza ganhos grandes (volatilidade positiva), que sao desejados.

#### 9.1.3 Calmar Ratio

Mede o retorno ajustado comparado ao pior drawdown, indicando quanto retorno se ganha para cada unidade de maximo capital em risco.

```
Calmar = Retorno Anualizado / |Max Drawdown|
```

**Interpretacao:**
- Calmar > 3.0: Excelente controle de drawdown
- Calmar 1.0-3.0: Bom
- Calmar < 1.0: Drawdowns excessivos

#### 9.1.4 Information Ratio

Mede o retorno ativo (acima do benchmark) por unidade de tracking error.

```
IR = (Rp - Rb) / TE

Onde:
Rb = retorno do benchmark (ex: Ibovespa)
TE = tracking error = std(Rp - Rb)
```

### 9.2 Metricas de Trading

#### 9.2.1 Win Rate (Taxa de Acerto)

```
Win Rate = Trades Vencedores / Total de Trades
```

**Contexto:** Win rate isolado e enganoso. Um win rate de 30% com payoff ratio de 4:1 e mais lucrativo que 70% com payoff ratio de 0.5:1.

#### 9.2.2 Profit Factor

```
Profit Factor = Soma dos Lucros / |Soma dos Prejuizos|
```

| Profit Factor | Interpretacao |
|---|---|
| < 1.0 | Estrategia perdedora |
| 1.0 - 1.5 | Marginalmente lucrativa |
| 1.5 - 2.0 | Boa |
| 2.0 - 3.0 | Muito boa |
| > 3.0 | Excelente (verificar overfitting) |

#### 9.2.3 Expectancy (Expectativa Matematica)

```
Expectancy = (Win Rate x Avg Win) - (Loss Rate x Avg Loss)
```

Ou equivalente:

```
Expectancy = Avg Win x Win Rate - Avg Loss x (1 - Win Rate)
```

Uma expectativa positiva significa que o sistema e estatisticamente lucrativo no longo prazo.

#### 9.2.4 Payoff Ratio (Risk/Reward)

```
Payoff Ratio = Avg Win / |Avg Loss|
```

### 9.3 Metricas de Risco

#### 9.3.1 Maximum Drawdown (MDD)

```python
def max_drawdown(equity_curve):
    """Calcula o maximum drawdown de uma equity curve."""
    running_max = np.maximum.accumulate(equity_curve)
    drawdowns = (equity_curve - running_max) / running_max
    return drawdowns.min()
```

#### 9.3.2 Average Drawdown Duration

Tempo medio que a estrategia leva para se recuperar de um drawdown.

#### 9.3.3 Tail Ratio

```
Tail Ratio = |Percentil 95 dos retornos| / |Percentil 5 dos retornos|
```

Tail ratio > 1 indica que os retornos positivos extremos sao maiores que os negativos extremos (bom).

### 9.4 Dashboard de Metricas Recomendado

```python
def strategy_report(returns: pd.Series, benchmark: pd.Series = None,
                    risk_free_rate: float = 0.1075):
    """
    Gera relatorio completo de metricas da estrategia.
    Risk-free rate default = Selic (10.75% a.a. como referencia).
    """
    daily_rf = (1 + risk_free_rate) ** (1/252) - 1
    excess_returns = returns - daily_rf

    # Retorno
    total_return = (1 + returns).prod() - 1
    annual_return = (1 + total_return) ** (252 / len(returns)) - 1

    # Risco
    annual_vol = returns.std() * np.sqrt(252)
    downside_vol = returns[returns < 0].std() * np.sqrt(252)

    # Ratios
    sharpe = excess_returns.mean() / returns.std() * np.sqrt(252) if returns.std() > 0 else 0
    sortino = excess_returns.mean() / returns[returns < 0].std() * np.sqrt(252) if len(returns[returns < 0]) > 0 else 0

    # Drawdown
    equity = (1 + returns).cumprod()
    running_max = equity.cummax()
    drawdown = (equity - running_max) / running_max
    mdd = drawdown.min()
    calmar = annual_return / abs(mdd) if mdd != 0 else 0

    # Trading
    positive_trades = returns[returns > 0]
    negative_trades = returns[returns < 0]
    win_rate = len(positive_trades) / len(returns) if len(returns) > 0 else 0
    avg_win = positive_trades.mean() if len(positive_trades) > 0 else 0
    avg_loss = abs(negative_trades.mean()) if len(negative_trades) > 0 else 0
    payoff = avg_win / avg_loss if avg_loss > 0 else float('inf')
    profit_factor = positive_trades.sum() / abs(negative_trades.sum()) if negative_trades.sum() != 0 else float('inf')
    expectancy = win_rate * avg_win - (1 - win_rate) * avg_loss

    # Tail risk
    tail_ratio = abs(np.percentile(returns, 95)) / abs(np.percentile(returns, 5)) if np.percentile(returns, 5) != 0 else float('inf')

    report = {
        '--- RETORNO ---': '',
        'Retorno Total': f'{total_return:.2%}',
        'Retorno Anualizado': f'{annual_return:.2%}',
        '--- RISCO ---': '',
        'Volatilidade Anualizada': f'{annual_vol:.2%}',
        'Downside Volatility': f'{downside_vol:.2%}',
        'Max Drawdown': f'{mdd:.2%}',
        '--- RATIOS ---': '',
        'Sharpe Ratio': f'{sharpe:.3f}',
        'Sortino Ratio': f'{sortino:.3f}',
        'Calmar Ratio': f'{calmar:.3f}',
        'Tail Ratio': f'{tail_ratio:.3f}',
        '--- TRADING ---': '',
        'Win Rate': f'{win_rate:.2%}',
        'Payoff Ratio': f'{payoff:.2f}',
        'Profit Factor': f'{profit_factor:.2f}',
        'Expectancy': f'{expectancy:.4f}',
        '--- CONTEXTO ---': '',
        'Numero de Trades': len(returns),
        'Periodo (dias)': len(returns),
    }

    if benchmark is not None:
        benchmark_return = (1 + benchmark).prod() - 1
        tracking_error = (returns - benchmark).std() * np.sqrt(252)
        info_ratio = (annual_return - ((1+benchmark_return)**(252/len(benchmark))-1)) / tracking_error if tracking_error > 0 else 0
        report['--- BENCHMARK ---'] = ''
        report['Information Ratio'] = f'{info_ratio:.3f}'
        report['Tracking Error'] = f'{tracking_error:.2%}'

    return report
```

---

## 10. Dados para Backtesting no Brasil

### 10.1 Fontes de Dados Historicos

#### 10.1.1 Dados Oficiais da B3

A B3 oferece series historicas de cotacoes completas desde 1986, incluindo:
- Nome e codigo da empresa
- Codigo da acao e ISIN
- Tipo de mercado e especificacao (ON/PN)
- Precos: anterior, abertura, minimo, medio, maximo, fechamento
- Numero de negocios e volume financeiro

**Acesso:** https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/

**Limitacao:** A B3 adicionou CAPTCHA aos downloads, exigindo uso de VPN ou metodos alternativos de coleta.

#### 10.1.2 APIs e Servicos

| Fonte | Tipo | Custo | Cobertura | Ajuste Proventos |
|---|---|---|---|---|
| **Yahoo Finance** | API (yfinance) | Gratuito | ~20 anos | Sim (automatico) |
| **brapi.dev** | REST API | Freemium | 10+ anos | Sim |
| **Dados de Mercado** | API/Website | Gratuito | Variavel | Sim |
| **B3 Market Data** | Oficial | Pago | Desde 1986 | Sim |
| **Market Data Cloud** | API | Pago | Tempo real + historico | Sim |
| **CVM** | Dados abertos | Gratuito | Fundamentalista | N/A |
| **Trading com Dados** | Tutorials/API | Gratuito | Proventos B3 | Sim |

**Yahoo Finance - Ticker brasileiros:**
```python
import yfinance as yf

# Tickers brasileiros usam sufixo .SA
petr4 = yf.download('PETR4.SA', start='2015-01-01')
# Dados geralmente disponiveis desde os anos 2000
```

**brapi.dev:**
```python
import requests

# API com dados validados de fontes oficiais (CVM, B3, BCB)
response = requests.get('https://brapi.dev/api/quote/PETR4')
data = response.json()
```

#### 10.1.3 GitHub - B3 API Dados Historicos

Projeto open-source que disponibiliza API de dados historicos da B3:
- Repository: https://github.com/cvscarlos/b3-api-dados-historicos
- Dados de diversos ativos do mercado brasileiro

### 10.2 Survivorship Bias

O survivorship bias e um dos vieses mais perigosos em backtesting. Ocorre quando o universo de ativos testado inclui apenas empresas que "sobreviveram" ate o presente, excluindo aquelas que faliram, foram deslistadas ou incorporadas.

**Impacto no mercado brasileiro:**
- Empresas como OGX (OGXP3), que faliu em 2013, desaparecem das bases padrao
- Fusoes e aquisicoes removem tickers historicos
- Ativos que migraram de segmento (ex: Novo Mercado) podem ter dados alterados

**Mitigacao:**
1. Preferir bases de dados que preservem empresas extintas
2. Incluir ativos deslistados no universo de backtesting
3. Usar composicao historica de indices (ex: Ibovespa historico)
4. Documentar e testar o impacto do survivorship bias

```python
# Exemplo: universo com survivorship bias vs sem
# COM bias (errado): usar composicao atual do Ibovespa para testar 2010-2020
# SEM bias (correto): usar composicao do Ibovespa que era vigente em cada data
```

### 10.3 Ajuste de Proventos

Para backtesting efetivo na B3, os dados devem ser corrigidos de TODOS os eventos corporativos:

| Evento | Ajuste Necessario | Impacto |
|---|---|---|
| **Dividendos** | Ajustar precos anteriores para baixo | Evita sinais falsos de queda |
| **JSCP** | Idem dividendos (antes do IR) | Idem |
| **Splits (Desdobramentos)** | Dividir precos anteriores pelo fator | Evita "gaps" artificiais |
| **Grupamentos (Inplits)** | Multiplicar precos anteriores pelo fator | Idem |
| **Bonificacoes** | Ajustar precos pelo fator de bonificacao | Evita distorcao de retornos |
| **Subscricoes** | Ajustar pelo fator teorico | Complexo de modelar |

**Regra fundamental:** NUNCA usar precos nao ajustados para backtesting. Preco sem ajuste distorce completamente os resultados.

```python
# Yahoo Finance ja fornece dados ajustados na coluna 'Adj Close'
# Para dados da B3, ajustar manualmente:

def adjust_for_split(prices, split_date, split_factor):
    """Ajusta precos historicos para um split."""
    mask = prices.index < split_date
    prices.loc[mask] = prices.loc[mask] / split_factor
    return prices

def adjust_for_dividend(prices, ex_date, dividend_per_share):
    """Ajusta precos historicos para dividendo."""
    factor = 1 - (dividend_per_share / prices.loc[ex_date])
    mask = prices.index < ex_date
    prices.loc[mask] = prices.loc[mask] * factor
    return prices
```

### 10.4 Dados Tick-by-Tick

Dados tick-by-tick sao essenciais para:
- Estrategias de HFT e scalping
- Modelagem precisa de market impact
- Analise de microestrutura de mercado
- Simulacao de book de ofertas

**Fontes para dados tick no Brasil:**
- **B3 Market Data:** Dados oficiais tick-by-tick (pago, caro)
- **Market Data Cloud:** Streaming em tempo real + historico
- **Nelogica:** Via plataforma Profit (acesso via corretora)
- **Corretoras:** Algumas fornecem historico tick para clientes

**Consideracoes de storage:**
- Dados tick da B3 geram ~2-5 GB por dia para todos os ativos
- Armazenamento de 1 ano: ~500 GB - 1.2 TB
- Recomenda-se compressao (Parquet, HDF5) e amostragem para pesquisa

---

## 11. Regime Detection

### 11.1 Conceito

Deteccao de regimes de mercado e uma abordagem estatistica para identificar estados distintos ou "regimes" nos mercados financeiros. Os mercados nao sao estacionarios -- alternam entre periodos de alta volatilidade, baixa volatilidade, tendencia de alta, tendencia de baixa, etc.

Um backtest que nao considera mudancas de regime pode:
- Otimizar para um regime especifico e falhar em outros
- Subestimar drawdowns em regimes adversos
- Superestimar retornos assumindo estacionariedade

### 11.2 Hidden Markov Models (HMMs)

HMMs modelam a dinamica subjacente do mercado como um sistema que transita entre diferentes estados, cada um com seu proprio comportamento caracteristico em termos de retornos, volatilidade e outras metricas.

**Como funcionam:**
1. Define-se um numero de estados ocultos (tipicamente 2-4)
2. O HMM estima:
   - Probabilidades de transicao entre estados
   - Distribuicao de emissao (retornos) por estado
   - Probabilidades filtradas para o estado atual
3. Resultados guiam decisoes de risco e alocacao

**Regimes tipicos identificados:**

| Regime | Caracteristicas | Estrategia Adaptada |
|---|---|---|
| **Bull Market** | Retornos positivos, baixa volatilidade | Agressivo, long-biased |
| **Bear Market** | Retornos negativos, alta volatilidade | Defensivo, hedge, cash |
| **Alta Volatilidade** | Retornos erraticos, vol elevada | Reduzir posicoes, stops apertados |
| **Range-Bound** | Retornos neutros, baixa volatilidade | Mean-reversion, opcoes |

### 11.3 Implementacao com hmmlearn

```python
from hmmlearn.hmm import GaussianHMM
import numpy as np
import pandas as pd

class MarketRegimeDetector:
    """Detector de regimes de mercado usando Hidden Markov Models."""

    def __init__(self, n_regimes: int = 3, n_iter: int = 100):
        """
        Args:
            n_regimes: numero de regimes a identificar (2-4)
            n_iter: iteracoes do algoritmo EM
        """
        self.n_regimes = n_regimes
        self.model = GaussianHMM(
            n_components=n_regimes,
            covariance_type='full',
            n_iter=n_iter,
            random_state=42
        )
        self.fitted = False

    def prepare_features(self, prices: pd.Series,
                         window: int = 21) -> np.ndarray:
        """
        Prepara features para o HMM a partir de precos.

        Features:
        1. Retornos diarios
        2. Volatilidade realizada (rolling)
        3. Volume relativo (se disponivel)
        """
        returns = prices.pct_change().dropna()
        volatility = returns.rolling(window).std()

        # Combinar features
        features = pd.DataFrame({
            'returns': returns,
            'volatility': volatility
        }).dropna()

        return features.values, features.index

    def fit(self, prices: pd.Series) -> None:
        """Ajusta o modelo HMM aos dados."""
        features, _ = self.prepare_features(prices)
        self.model.fit(features)
        self.fitted = True

    def predict_regime(self, prices: pd.Series) -> pd.Series:
        """Prediz o regime atual para cada observacao."""
        if not self.fitted:
            raise ValueError("Modelo nao ajustado. Execute fit() primeiro.")

        features, index = self.prepare_features(prices)
        regimes = self.model.predict(features)

        return pd.Series(regimes, index=index, name='regime')

    def get_regime_stats(self, prices: pd.Series) -> pd.DataFrame:
        """Retorna estatisticas por regime."""
        features, index = self.prepare_features(prices)
        regimes = self.model.predict(features)
        returns = prices.pct_change().reindex(index).dropna()

        stats = []
        for r in range(self.n_regimes):
            mask = regimes == r
            r_returns = returns[mask]
            stats.append({
                'regime': r,
                'mean_return': r_returns.mean() * 252,
                'volatility': r_returns.std() * np.sqrt(252),
                'sharpe': r_returns.mean() / r_returns.std() * np.sqrt(252) if r_returns.std() > 0 else 0,
                'frequency': mask.mean(),
                'avg_duration_days': self._avg_duration(regimes, r)
            })

        return pd.DataFrame(stats)

    def _avg_duration(self, regimes, target_regime):
        """Calcula duracao media de um regime."""
        durations = []
        count = 0
        for r in regimes:
            if r == target_regime:
                count += 1
            elif count > 0:
                durations.append(count)
                count = 0
        if count > 0:
            durations.append(count)
        return np.mean(durations) if durations else 0


# Uso para backtesting adaptativo:
class RegimeAdaptiveBacktester:
    """Backtester que adapta parametros ao regime detectado."""

    def __init__(self, regime_detector: MarketRegimeDetector,
                 regime_strategies: dict):
        """
        Args:
            regime_detector: instancia de MarketRegimeDetector
            regime_strategies: dict {regime_id: strategy_params}
        """
        self.detector = regime_detector
        self.strategies = regime_strategies

    def run(self, prices: pd.Series) -> pd.Series:
        """
        Executa backtest adaptativo por regime.
        Walk-forward: re-treina periodicamente.
        """
        returns = prices.pct_change()
        regimes = self.detector.predict_regime(prices)

        strategy_returns = pd.Series(0.0, index=regimes.index)

        for date in regimes.index:
            current_regime = regimes[date]
            params = self.strategies.get(current_regime, {})

            # Aplicar estrategia especifica do regime
            # (implementacao depende da estrategia)
            position_size = params.get('position_size', 1.0)
            strategy_returns[date] = returns.get(date, 0) * position_size

        return strategy_returns
```

### 11.4 Adaptive Hierarchical HMM

Modelos HMM padrao assumem probabilidades de transicao invariantes no tempo, o que trata o mecanismo de switching como fixo, mesmo durante episodios de mudanca profunda.

O **Adaptive Hierarchical HMM (AH-HMM)** introduz um meta-regime que reflete o ambiente macro-financeiro mais amplo, recuperando grandes pontos de inflexao como a Crise Financeira Global, COVID-19 e o aperto monetario de 2022-2023.

### 11.5 Structural Breaks

Alem de HMMs, outras tecnicas para detectar mudancas estruturais:

- **CUSUM Test:** Detecta mudancas na media cumulativa
- **Bai-Perron Test:** Identifica multiplos breakpoints em series temporais
- **Chow Test:** Testa se os coeficientes de uma regressao mudam em um ponto especifico
- **PELT (Pruned Exact Linear Time):** Algoritmo eficiente para deteccao de changepoints

```python
# Exemplo com ruptures (Python)
import ruptures as rpt

def detect_structural_breaks(returns, n_breakpoints=5, method='pelt'):
    """Detecta structural breaks em uma serie de retornos."""
    signal = returns.values.reshape(-1, 1)

    if method == 'pelt':
        algo = rpt.Pelt(model='rbf').fit(signal)
        result = algo.predict(pen=10)
    elif method == 'binseg':
        algo = rpt.Binseg(model='normal').fit(signal)
        result = algo.predict(n_bkps=n_breakpoints)

    breakpoint_dates = [returns.index[i-1] for i in result if i < len(returns)]
    return breakpoint_dates
```

---

## 12. Armadilhas Comuns e Best Practices

### 12.1 Os 7 Pecados Capitais do Backtesting

#### Pecado 1: Look-Ahead Bias
**O que e:** Usar informacao futura em decisoes passadas.
**Como evitar:** Usar apenas dados disponiveis no momento da decisao. Nunca normalizar com estatisticas de toda a serie.

#### Pecado 2: Survivorship Bias
**O que e:** Testar apenas em ativos que sobreviveram.
**Como evitar:** Usar composicao historica dos indices. Incluir ativos deslistados.

#### Pecado 3: Ignorar Custos de Transacao
**O que e:** Backtests sem custos mostram resultados irreais.
**Como evitar:** Modelar emolumentos B3, slippage, market impact, spread.

#### Pecado 4: Data Snooping
**O que e:** Testar centenas de variacoes e reportar apenas a melhor.
**Como evitar:** Registrar todos os testes. Usar DSR. Aplicar testes SPA/RC.

#### Pecado 5: Overfitting de Parametros
**O que e:** Ajustar parametros ate que o backtest fique perfeito.
**Como evitar:** Walk-forward analysis. CPCV. Limitar parametros livres.

#### Pecado 6: Ignorar Regime Changes
**O que e:** Assumir que o mercado e estacionario.
**Como evitar:** HMMs, regime detection, adaptive strategies.

#### Pecado 7: Periodo de Teste Curto
**O que e:** Backtests que cobrem apenas periodos favoraveis.
**Como evitar:** Testar em multiplos ciclos de mercado. Minimo 5-10 anos. Incluir crises (2008, 2015, 2020).

### 12.2 Checklist de Backtesting Robusto

```
PRE-BACKTEST:
[ ] Dados ajustados por proventos (dividendos, splits, bonificacoes)
[ ] Survivorship bias tratado
[ ] Universo de ativos definido com criterios claros
[ ] Hipotese economica formulada ANTES do teste
[ ] Numero de parametros livres minimizado

DURANTE O BACKTEST:
[ ] Custos de transacao modelados realisticamente
[ ] Slippage e market impact incluidos
[ ] Look-ahead bias verificado e eliminado
[ ] Liquidez verificada para cada trade
[ ] Tamanho de posicao respeitando limites reais

POS-BACKTEST:
[ ] Walk-forward analysis executada
[ ] CPCV com purging e embargo aplicada
[ ] Deflated Sharpe Ratio calculado
[ ] Monte Carlo simulation com 5000+ iteracoes
[ ] PBO (Probability of Backtest Overfitting) < 0.10
[ ] Resultados comparados com benchmark relevante
[ ] Metricas multiplas analisadas (nao apenas Sharpe)
[ ] Paper trading por 1-3 meses antes de ir live
```

### 12.3 Regra de Ouro: Numero de Parametros

> "Uma boa regra e ter pelo menos 10 trades (ou 10 anos de dados, o que for maior) para cada parametro livre na estrategia." -- Ernest Chan

| Parametros Livres | Minimo de Trades | Minimo de Dados (diario) |
|---|---|---|
| 1 | 10 | ~2 meses |
| 2 | 20 | ~4 meses |
| 5 | 50 | ~10 meses |
| 10 | 100 | ~20 meses |
| 20+ | 200+ | ~3-4 anos |

---

## 13. Arquitetura Recomendada para o Bot

### 13.1 Pipeline Completo de Backtesting

```
                    PIPELINE DE BACKTESTING
                    ======================

[1. COLETA DE DADOS]
    |
    +-- Yahoo Finance (yfinance) para dados diarios
    +-- brapi.dev para dados fundamentalistas
    +-- B3 historico para dados desde 1986
    +-- Market Data Cloud para tick data
    |
    v
[2. PREPARACAO DE DADOS]
    |
    +-- Ajuste de proventos (dividendos, splits, bonificacoes)
    +-- Tratamento de survivorship bias
    +-- Deteccao de outliers e erros
    +-- Armazenamento em Parquet/HDF5
    |
    v
[3. RESEARCH PHASE - VectorBT]
    |
    +-- Screening rapido de estrategias
    +-- Otimizacao de parametros em larga escala
    +-- Analise de sensibilidade
    +-- Selecao de top 10-20 candidatas
    |
    v
[4. VALIDATION PHASE - Backtrader/NautilusTrader]
    |
    +-- Walk-Forward Analysis (rolling, 3:1 IS/OOS)
    +-- CPCV com purging e embargo
    +-- Modelagem realista de custos B3
    +-- Regime-adaptive testing
    |
    v
[5. STATISTICAL VALIDATION]
    |
    +-- Deflated Sharpe Ratio
    +-- Hansen's SPA Test
    +-- Monte Carlo (5000 simulacoes)
    +-- PBO < 0.10
    |
    v
[6. PAPER TRADING - MetaTrader 5 / Profit]
    |
    +-- Validacao em tempo real (1-3 meses)
    +-- Comparacao metricas reais vs backtested
    +-- Monitoramento de slippage e latencia
    |
    v
[7. LIVE TRADING]
    |
    +-- Deploy gradual (10% -> 50% -> 100% capital)
    +-- Monitoramento continuo de regime
    +-- Re-otimizacao periodica (walk-forward)
    +-- Kill switch automatico se MDD > threshold
```

### 13.2 Stack Tecnologico Recomendado

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Dados** | yfinance + brapi + B3 API | Cobertura completa e gratuita/low-cost |
| **Storage** | PostgreSQL + Parquet | SQL para metadados, Parquet para series |
| **Research** | VectorBT PRO | Velocidade maxima para otimizacao |
| **Validation** | Backtrader + custom engine | Event-driven com custos reais B3 |
| **ML/Stats** | scikit-learn + skfolio + arch | CPCV, SPA, HMM |
| **Monte Carlo** | NumPy + custom | Flexibilidade total |
| **Paper Trading** | MetaTrader 5 (MQL5-Python bridge) | Plataforma madura com dados BR |
| **Live Trading** | API corretora + MT5 | Execucao real |
| **Monitoramento** | Grafana + PostgreSQL | Dashboards em tempo real |

### 13.3 Criterios de Aprovacao para Live Trading

Uma estrategia so deve ir para live trading se passar em TODOS os gates:

| Gate | Criterio | Threshold |
|---|---|---|
| **Gate 1** | Sharpe Ratio (WFA OOS) | > 1.0 |
| **Gate 2** | Deflated Sharpe Ratio | > 0.95 (95% confianca) |
| **Gate 3** | PBO | < 0.10 |
| **Gate 4** | Max Drawdown (Monte Carlo 95%) | < 20% |
| **Gate 5** | Profit Factor | > 1.5 |
| **Gate 6** | Paper Trading (3 meses) | Metricas dentro de 2 sigma |
| **Gate 7** | Regime Robustness | Positivo em 2+ de 3 regimes |

---

## 14. Referencias

### 14.1 Livros e Papers Academicos

1. **Bailey, D.H. & Lopez de Prado, M.** (2014). "The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality." *Journal of Portfolio Management*. URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551

2. **Bailey, D.H., Borwein, J., Lopez de Prado, M. & Zhu, Q.J.** (2015). "The Probability of Backtest Overfitting." *Journal of Computational Finance*. URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253

3. **Lopez de Prado, M.** (2018). *Advances in Financial Machine Learning*. Wiley. URL: https://www.wiley.com/en-us/Advances+in+Financial+Machine+Learning-p-9781119482086

4. **White, H.** (2000). "A Reality Check for Data Snooping." *Econometrica*. URL: https://www.researchgate.net/publication/4896389_A_Reality_Check_for_Data_Snooping

5. **Hansen, P.R.** (2005). "A Test for Superior Predictive Ability." *Journal of Business & Economic Statistics*. URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=264569

6. **Almgren, R. & Chriss, N.** (2000). "Optimal Execution of Portfolio Transactions." *Journal of Risk*. URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=53501

7. **Yuan, Y. & Mitra, G.** (2019). "Market Regime Identification Using Hidden Markov Models." *SSRN*. URL: https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID3406068_code3576909.pdf?abstractid=3406068

### 14.2 Recursos Online e Documentacao

8. **QuantStart** -- "Backtesting Systematic Trading Strategies in Python." URL: https://www.quantstart.com/articles/backtesting-systematic-trading-strategies-in-python-considerations-and-open-source-frameworks/

9. **QuantStart** -- "Market Regime Detection using Hidden Markov Models in QSTrader." URL: https://www.quantstart.com/articles/market-regime-detection-using-hidden-markov-models-in-qstrader/

10. **QuantInsti** -- "Walk-Forward Optimization: How It Works, Its Limitations, and Backtesting Implementation." URL: https://blog.quantinsti.com/walk-forward-optimization-introduction/

11. **BSIC (Bocconi Students Investment Club)** -- "Backtesting Series Episode 5: Transaction Cost Modelling." URL: https://bsic.it/backtesting-series-episode-5-transaction-cost-modelling/

12. **Interactive Brokers** -- "A Practical Breakdown of Vector-Based vs. Event-Based Backtesting." URL: https://www.interactivebrokers.com/campus/ibkr-quant-news/a-practical-breakdown-of-vector-based-vs-event-based-backtesting/

13. **Bookdown** -- "The Dangers of Backtesting (Portfolio Optimization)." URL: https://bookdown.org/palomar/portfoliooptimizationbook/8.3-dangers-backtesting.html

14. **Towards AI** -- "The Combinatorial Purged Cross-Validation Method." URL: https://towardsai.net/p/l/the-combinatorial-purged-cross-validation-method

### 14.3 Frameworks e Bibliotecas

15. **VectorBT** -- Lightning-fast backtesting engine. URL: https://vectorbt.dev/ | GitHub: https://github.com/polakowo/vectorbt

16. **Backtrader** -- Python Backtesting library. URL: https://www.backtrader.com/

17. **bt (Python)** -- Flexible Backtesting for Python. URL: https://pmorissette.github.io/bt/ | GitHub: https://github.com/pmorissette/bt

18. **QuantConnect LEAN** -- Open-source algorithmic trading engine. URL: https://www.lean.io/ | GitHub: https://github.com/QuantConnect/Lean

19. **NautilusTrader** -- High-performance algorithmic trading platform. URL: https://nautilustrader.io/ | GitHub: https://github.com/nautechsystems/nautilus_trader

20. **skfolio** -- Portfolio optimization with CombinatorialPurgedCV. URL: https://skfolio.org/

21. **arch** -- ARCH models and SPA/RC tests for Python. URL: https://arch.readthedocs.io/

### 14.4 Fontes de Dados Brasileiros

22. **B3 Market Data** -- Dados historicos oficiais. URL: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/

23. **brapi.dev** -- API de acoes da bolsa brasileira. URL: https://brapi.dev/

24. **Dados de Mercado** -- Banco de dados aberto de investimentos no Brasil. URL: https://www.dadosdemercado.com.br/

25. **B3 API Dados Historicos** -- GitHub. URL: https://github.com/cvscarlos/b3-api-dados-historicos

26. **Market Data Cloud** -- APIs de Market Data em tempo real. URL: https://www.marketdatacloud.com.br/

### 14.5 Plataformas de Trading no Brasil

27. **MetaTrader 5** -- Plataforma de trading. URL: https://www.metatrader5.com/

28. **Profit (Nelogica)** -- Maior plataforma de trading da America Latina. URL: https://www.nelogica.com.br/

29. **B3 Bora Investir** -- Backtesting e robo trader. URL: https://borainvestir.b3.com.br/

### 14.6 Artigos e Tutoriais Complementares

30. **Analyzing Alpha** -- "The Top 21 Python Trading Tools (January 2026)." URL: https://analyzingalpha.com/python-trading-tools

31. **autotradelab** -- "Backtrader vs NautilusTrader vs VectorBT vs Zipline-reloaded: Choosing the Right Backtesting Framework." URL: https://autotradelab.com/blog/backtrader-vs-nautilusttrader-vs-vectorbt-vs-zipline-reloaded

32. **QuantBeckman** -- "[WITH CODE] Combinatorial Purged Cross Validation for Optimization." URL: https://www.quantbeckman.com/p/with-code-combinatorial-purged-cross

33. **HackerNoon** -- "Using Monte Carlo Simulation for Algorithmic Trading." URL: https://hackernoon.com/using-monte-carlo-simulation-for-algorithmic-trading

34. **QuantJourney** -- "Slippage: A Comprehensive Analysis and Non-Linear Modeling with Machine Learning." URL: https://quantjourney.substack.com/p/slippage-a-comprehensive-analysis

35. **MoneyStart** -- "Backtest de estrategias na B3 Brasil: guia pratico." URL: https://moneystart.com.br/backtest-de-estrategias-na-b3-brasil/

---

## Apendice A: Glossario

| Termo | Definicao |
|---|---|
| **Backtest** | Simulacao de uma estrategia em dados historicos |
| **Walk-Forward** | Validacao com re-otimizacao periodica em janelas rolantes |
| **Overfitting** | Ajuste excessivo a ruido nos dados historicos |
| **CPCV** | Combinatorial Purged Cross-Validation |
| **DSR** | Deflated Sharpe Ratio |
| **PBO** | Probability of Backtest Overfitting |
| **SPA** | Superior Predictive Ability test |
| **HMM** | Hidden Markov Model |
| **IS/OOS** | In-Sample / Out-of-Sample |
| **MDD** | Maximum Drawdown |
| **Slippage** | Diferenca entre preco esperado e preco de execucao |
| **Market Impact** | Mudanca no preco causada pela propria ordem |
| **Survivorship Bias** | Vies de incluir apenas ativos que sobreviveram |
| **Look-Ahead Bias** | Uso inadvertido de informacao futura |

---

## Apendice B: Formulas Resumidas

### Metricas de Performance

```
Sharpe Ratio       = (Rp - Rf) / sigma_p * sqrt(252)
Sortino Ratio      = (Rp - Rf) / sigma_downside * sqrt(252)
Calmar Ratio       = Retorno Anualizado / |Max Drawdown|
Information Ratio  = (Rp - Rb) / Tracking Error
Profit Factor      = Sum(Lucros) / |Sum(Prejuizos)|
Expectancy         = WinRate * AvgWin - LossRate * AvgLoss
Payoff Ratio       = AvgWin / |AvgLoss|
Win Rate           = N_wins / N_total
```

### Custos B3

```
Emolumentos ST     = 0.030% (negociacao + liquidacao)
Emolumentos DT     = 0.025% (negociacao + liquidacao)
IR Swing Trade     = 15% sobre lucro (isencao < R$20k/mes vendas)
IR Day Trade       = 20% sobre lucro (sem isencao)
```

### Walk-Forward

```
WFER = Media(Metrica_OOS) / Media(Metrica_IS)
WFER > 0.5 = Robusto | WFER < 0.3 = Overfitting
```

---

*Documento gerado em Fevereiro 2026. Dados de custos da B3 e taxas devem ser verificados no site oficial para valores vigentes. As implementacoes de codigo sao ilustrativas e devem ser adaptadas e testadas antes de uso em producao.*
