# Gestao de Risco: Framework Completo para Bot de Investimentos no Mercado Brasileiro

> **Documento de Referencia Tecnica -- Nivel PhD**
> Ultima atualizacao: Fevereiro 2026
> Escopo: Framework abrangente de gestao de risco para bot de investimentos automatizado operando no mercado brasileiro (B3)

---

## Sumario Executivo

A gestao de risco e o pilar fundamental de qualquer sistema de investimento automatizado. Enquanto estrategias de alpha geram retornos, e a gestao de risco que determina a sobrevivencia de longo prazo do bot. Este documento apresenta um framework completo e academicamente fundamentado, cobrindo desde metricas classicas como Value at Risk (VaR) ate tecnicas avancadas como Hierarchical Risk Parity (HRP) e modelos de volatilidade assimetrica, todos contextualizados para as particularidades do mercado brasileiro.

O mercado brasileiro apresenta desafios unicos: alta volatilidade (historicamente 2-3x a de mercados desenvolvidos), concentracao setorial no Ibovespa, risco politico elevado (Joesley Day, impeachment), baixa liquidez em grande parte dos ativos, e correlacoes que se amplificam drasticamente em crises. Um bot que nao incorpore essas especificidades esta condenado a falhar nos momentos mais criticos.

**Principios Fundamentais do Framework:**

1. **Preservacao de Capital** -- A primeira regra e nao perder dinheiro; a segunda e nao esquecer a primeira (Buffett)
2. **Antifragilidade** -- O bot deve se beneficiar da volatilidade, nao apenas sobreviver a ela
3. **Defesa em Profundidade** -- Multiplas camadas de protecao redundantes
4. **Adaptabilidade** -- Parametros de risco devem ser dinamicos, nao estaticos
5. **Worst-Case Thinking** -- Projetar para o cenario catastrofico, nao para o caso medio

---

## Indice

1. [Value at Risk (VaR)](#1-value-at-risk-var)
2. [CVaR / Expected Shortfall](#2-cvar--expected-shortfall)
3. [Drawdown Management](#3-drawdown-management)
4. [Position Sizing](#4-position-sizing)
5. [Portfolio Optimization](#5-portfolio-optimization)
6. [Correlacao e Diversificacao](#6-correlacao-e-diversificacao)
7. [Stress Testing e Cenarios](#7-stress-testing-e-cenarios)
8. [Volatility Modeling](#8-volatility-modeling)
9. [Risk Budgeting](#9-risk-budgeting)
10. [Stop Loss e Take Profit](#10-stop-loss-e-take-profit)
11. [Liquidez e Slippage](#11-liquidez-e-slippage)
12. [Framework Integrado para o Bot](#12-framework-integrado-para-o-bot)
13. [Referencias](#13-referencias)

---

## 1. Value at Risk (VaR)

### 1.1 Definicao Formal

O Value at Risk (VaR) e uma medida estatistica que quantifica a perda maxima esperada de um portfolio em um dado horizonte temporal, com um determinado nivel de confianca. Formalmente:

```
P(L > VaR_alpha) = 1 - alpha
```

Onde:
- `L` = perda do portfolio
- `alpha` = nivel de confianca (tipicamente 95% ou 99%)
- O VaR e o quantil `alpha` da distribuicao de perdas

**Interpretacao pratica**: "Com 95% de confianca, a perda maxima do portfolio nao excedera R$ X no proximo dia/semana/mes."

### 1.2 VaR Parametrico (Variancia-Covariancia)

O metodo parametrico assume que os retornos seguem uma distribuicao normal (ou outra distribuicao parametrica) e utiliza a media e o desvio-padrao do portfolio para calcular o VaR.

**Formula:**

```
VaR_alpha = mu_p - z_alpha * sigma_p
```

Onde:
- `mu_p` = retorno esperado do portfolio
- `z_alpha` = quantil da distribuicao normal padrao (1.645 para 95%, 2.326 para 99%)
- `sigma_p` = desvio-padrao do portfolio

**Para um portfolio com N ativos:**

```
sigma_p = sqrt(w^T * Sigma * w)
```

Onde:
- `w` = vetor de pesos do portfolio
- `Sigma` = matriz de covariancia dos retornos

**Vantagens:**
- Computacionalmente eficiente: O(N^2) para N ativos
- Facil de implementar e interpretar
- Ideal para monitoramento em tempo real

**Limitacoes criticas para o mercado brasileiro:**
- Assume normalidade dos retornos (retornos brasileiros tem caudas pesadas)
- Subestima sistematicamente o risco em periodos de estresse
- Nao captura efeitos de assimetria (skewness negativa tipica de mercados emergentes)
- A curtose do Ibovespa historicamente excede 3.0 (normal), alcancando 5-8 em periodos de crise

**Ajustes recomendados para o bot:**
- Usar distribuicao t-Student com graus de liberdade estimados via MLE
- Implementar Cornish-Fisher expansion para corrigir nao-normalidade:

```
z_CF = z_alpha + (1/6)(z_alpha^2 - 1)*S + (1/24)(z_alpha^3 - 3*z_alpha)*K - (1/36)(2*z_alpha^3 - 5*z_alpha)*S^2
```

Onde S = skewness e K = excesso de curtose.

### 1.3 VaR Historico

O metodo de simulacao historica nao assume nenhuma distribuicao parametrica. Utiliza diretamente os retornos historicos ordenados para determinar o quantil.

**Procedimento:**
1. Coletar N retornos historicos do portfolio
2. Ordenar do menor para o maior
3. O VaR(alpha) e o retorno na posicao `floor((1-alpha) * N)`

**Para o mercado brasileiro:**
- Janela recomendada: 252 dias (1 ano) a 756 dias (3 anos)
- Janelas curtas captam melhor mudancas de regime, mas sao mais ruidosas
- Janelas longas sao mais estaveis, mas podem incluir regimes irrelevantes

**VaR Historico Ponderado (Age-Weighted):**

```
w_i = lambda^(N-i) * (1-lambda) / (1 - lambda^N)
```

Onde `lambda` entre 0.94 e 0.99 (RiskMetrics usa 0.94 para dados diarios).

Evidencia empirica brasileira: Estudos da PUC-Rio e Mackenzie demonstram que o VaR historico com distribuicao t-Student se ajusta melhor aos dados empiricos do mercado acionario brasileiro do que o VaR parametrico com distribuicao normal, particularmente para intervalos de confianca de 99%.

### 1.4 VaR Monte Carlo

O metodo de Monte Carlo gera milhares de cenarios aleatorios para os fatores de risco e calcula a distribuicao dos retornos do portfolio.

**Procedimento:**
1. Estimar parametros do modelo estocastico (media, volatilidade, correlacoes)
2. Gerar N cenarios aleatorios (tipicamente 10.000 a 100.000)
3. Calcular o valor do portfolio em cada cenario
4. Determinar o quantil da distribuicao simulada

**Modelo GBM (Geometric Brownian Motion):**

```
S_t = S_0 * exp((mu - sigma^2/2)*t + sigma*W_t)
```

**Vantagens sobre outros metodos:**
- Pode incorporar distribuicoes nao-normais, saltos, e volatilidade estocastica
- Lida naturalmente com portfolios nao-lineares (opcoes, derivativos)
- Permite modelar correlacoes dinamicas via copulas

**Implementacao recomendada para o bot:**

```python
import numpy as np
from scipy import stats

def var_monte_carlo(returns, weights, n_simulations=10000,
                     confidence=0.95, horizon=1):
    """
    Calcula VaR via Monte Carlo com distribuicao t-Student
    para capturar caudas pesadas do mercado brasileiro.
    """
    # Estimar parametros da distribuicao t
    mu = returns.mean()
    cov = returns.cov()

    # Decomposicao de Cholesky para correlacao
    L = np.linalg.cholesky(cov)

    # Gerar cenarios com distribuicao t (df=5 para mercado BR)
    df = 5  # Graus de liberdade estimados para mercado brasileiro
    z = stats.t.rvs(df, size=(n_simulations, len(weights)))

    # Aplicar estrutura de correlacao
    correlated_returns = z @ L.T

    # Retornos do portfolio
    portfolio_returns = correlated_returns @ weights

    # Escalar para horizonte desejado
    portfolio_returns *= np.sqrt(horizon)

    # VaR como percentil
    var = np.percentile(portfolio_returns, (1 - confidence) * 100)

    return -var  # Retorna valor positivo
```

### 1.5 Limitacoes Fundamentais do VaR

O VaR, apesar de amplamente utilizado, possui limitacoes criticas que o bot deve considerar:

1. **Nao e subadtivo**: VaR(A+B) pode ser > VaR(A) + VaR(B), violando o principio da diversificacao
2. **Ignora a magnitude das caudas**: Nao informa QUANTO se perde alem do VaR
3. **Nao e uma medida coerente de risco** no sentido de Artzner et al. (1999)
4. **Backtesting limitado**: Viola Kupiec test com frequencia em mercados emergentes
5. **Falha em crises**: VaR subestimou sistematicamente o risco no Joesley Day (-8.8%) e COVID (-12.5% em um unico dia)

**Implicacao para o bot**: VaR deve ser usado como metrica complementar, NUNCA como unica medida de risco. O CVaR (secao 2) deve ser a metrica primaria.

### 1.6 Backtesting do VaR

O bot deve implementar backtesting rigoroso do VaR usando:

**Teste de Kupiec (Proportion of Failures):**

```
LR_POF = -2 * ln((1-p)^(T-x) * p^x) + 2 * ln((1-x/T)^(T-x) * (x/T)^x)
```

Onde x = numero de violacoes, T = tamanho da amostra, p = nivel de significancia.

**Teste de Christoffersen (Independence Test):**
Verifica se as violacoes sao independentes (nao ocorrem em clusters).

**Zona de semaforo de Basel:**
- Verde: Ate 4 violacoes em 250 dias (para VaR 99%) -- modelo aceitavel
- Amarela: 5-9 violacoes -- modelo sob observacao
- Vermelha: 10+ violacoes -- modelo rejeitado

---

## 2. CVaR / Expected Shortfall

### 2.1 Definicao e Fundamentacao Teorica

O CVaR (Conditional Value at Risk), tambem chamado de Expected Shortfall (ES), mede a perda media esperada nos cenarios que excedem o VaR. E uma medida coerente de risco no sentido de Artzner et al. (1999).

**Formula:**

```
CVaR_alpha = E[L | L > VaR_alpha] = (1/(1-alpha)) * integral_alpha^1 VaR_u du
```

**Interpretacao pratica**: "Se a perda exceder o VaR de 95%, a perda media esperada sera de R$ X."

### 2.2 Vantagens Sobre o VaR

O CVaR resolve as principais limitacoes do VaR:

| Propriedade | VaR | CVaR |
|---|---|---|
| Subaditividade | Nao | Sim |
| Medida coerente | Nao | Sim |
| Captura magnitude das caudas | Nao | Sim |
| Otimizacao convexa | Nem sempre | Sim |
| Reconhecimento regulatorio | Basel II | Basel III (FRTB) |
| Sensibilidade a caudas | Baixa | Alta |

**Subaditividade**: CVaR(A+B) <= CVaR(A) + CVaR(B), garantindo que a diversificacao sempre reduz o risco medido, ao contrario do VaR.

**Convexidade**: A funcao CVaR e convexa em relacao aos pesos do portfolio, permitindo otimizacao global eficiente (Rockafellar e Uryasev, 2000).

### 2.3 Calculo do CVaR

**CVaR Parametrico (Normal):**

```
CVaR_alpha = mu + sigma * phi(z_alpha) / (1 - alpha)
```

Onde `phi()` e a funcao densidade da normal padrao.

**CVaR Parametrico (t-Student):**

```
CVaR_alpha = mu + sigma * (nu + z_alpha^2) / (nu - 1) * f_t(z_alpha; nu) / (1 - alpha)
```

Onde `nu` = graus de liberdade e `f_t` = funcao densidade da t-Student.

**CVaR Historico:**

```
CVaR_alpha = (1/M) * sum(L_i para L_i > VaR_alpha)
```

Onde M = numero de observacoes que excedem o VaR.

### 2.4 Otimizacao de Portfolio com CVaR

Rockafellar e Uryasev (2000) demonstraram que o problema de otimizacao de CVaR pode ser reformulado como um programa linear:

```
Minimizar  alpha + (1/(S*(1-beta))) * sum_s max(f(w, y_s) - alpha, 0)

Sujeito a:
  sum(w_i) = 1
  w_i >= 0  (se long-only)
  E[r_p] >= r_target
```

Onde:
- `w` = pesos do portfolio
- `y_s` = cenarios de retornos (s = 1,...,S)
- `beta` = nivel de confianca
- `alpha` = variavel auxiliar que converge para o VaR otimo

**Implementacao para o bot:**

```python
import cvxpy as cp
import numpy as np

def optimize_cvar(returns, target_return, confidence=0.95):
    """
    Otimizacao de portfolio minimizando CVaR.
    Formulacao linear de Rockafellar-Uryasev.
    """
    n_assets = returns.shape[1]
    n_scenarios = returns.shape[0]

    # Variaveis de decisao
    weights = cp.Variable(n_assets)
    alpha = cp.Variable()  # VaR auxiliar
    u = cp.Variable(n_scenarios)  # Variaveis de folga

    # Funcao objetivo: minimizar CVaR
    cvar = alpha + (1 / (n_scenarios * (1 - confidence))) * cp.sum(u)

    # Restricoes
    constraints = [
        u >= -returns @ weights - alpha,
        u >= 0,
        cp.sum(weights) == 1,
        weights >= 0,  # Long-only
        returns.mean(axis=0) @ weights >= target_return
    ]

    problem = cp.Problem(cp.Minimize(cvar), constraints)
    problem.solve(solver=cp.ECOS)

    return weights.value, alpha.value, cvar.value
```

### 2.5 CVaR no Contexto Regulatorio

O Fundamental Review of the Trading Book (FRTB) do Basel III substituiu o VaR pelo Expected Shortfall (ES) ao nivel de 97.5% como medida padrao de risco de mercado. Para o mercado brasileiro, o Banco Central adota progressivamente essas diretrizes.

**Implicacao para o bot**: Usar CVaR a 97.5% como metrica primaria de risco, alinhando-se as melhores praticas regulatorias globais e tendo uma medida mais conservadora e coerente que o VaR.

---

## 3. Drawdown Management

### 3.1 Maximum Drawdown (MDD)

O Maximum Drawdown mede a maior queda percentual do pico ao vale de um portfolio.

**Formula:**

```
Drawdown(t) = (Peak(t) - Value(t)) / Peak(t)

MDD = max(Drawdown(t)) para todo t no periodo
```

Onde `Peak(t) = max(Value(s))` para `s <= t`.

**Evidencias empiricas no Brasil:**
- **COVID-19 (Marco 2020)**: Ibovespa caiu de 119.527 (23/01/2020) para 63.569 (23/03/2020) -- MDD de -46.8%
- **Joesley Day (Maio 2017)**: Queda de -8.8% em um unico dia, com circuit breaker acionado
- **Crise Subprime (2008)**: MDD de aproximadamente -60% entre maio e outubro de 2008
- **Circuit breakers em Marco/2020**: Acionados 4 vezes (dias 9, 11, 12 e 16 de marco)

### 3.2 Calmar Ratio

O Calmar Ratio relaciona o retorno anualizado ao maximum drawdown:

```
Calmar Ratio = Retorno Anualizado / |Maximum Drawdown|
```

**Interpretacao:**
- Calmar > 3.0: Excelente
- Calmar 1.0-3.0: Bom
- Calmar 0.5-1.0: Aceitavel
- Calmar < 0.5: Pobre

**Para o bot**: Meta minima de Calmar Ratio = 1.5. Se o Calmar cair abaixo de 1.0 por 3 meses consecutivos, o bot deve reduzir exposicao em 50%.

### 3.3 Ulcer Index

O Ulcer Index mede a profundidade e duracao dos drawdowns, penalizando drawdowns prolongados:

```
Ulcer Index = sqrt((1/N) * sum(Drawdown_i^2))
```

**Vantagens sobre o desvio-padrao:**
- Penaliza apenas drawdowns (volatilidade descendente)
- Quanto mais profundo e longo o drawdown, maior a penalidade
- Mais alinhado com a experiencia real do investidor

**Ulcer Performance Index (UPI ou Martin Ratio):**

```
UPI = (Retorno - Risk-Free Rate) / Ulcer Index
```

### 3.4 Drawdown-Based Position Sizing

O bot deve ajustar dinamicamente o tamanho das posicoes com base no drawdown corrente:

```python
def drawdown_position_sizing(current_drawdown, max_allowed_dd,
                               base_position_size):
    """
    Reduz posicoes progressivamente conforme o drawdown aumenta.
    """
    # Fator de reducao: linear de 1.0 (sem DD) a 0.0 (DD maximo)
    reduction_factor = max(0, 1 - (current_drawdown / max_allowed_dd))

    # Reducao exponencial para ser mais agressivo em drawdowns profundos
    reduction_factor = reduction_factor ** 1.5

    return base_position_size * reduction_factor
```

**Regras de escalonamento recomendadas:**

| Drawdown Corrente | Acao do Bot |
|---|---|
| 0% - 5% | Operacao normal (100% da posicao) |
| 5% - 10% | Reducao para 75% da posicao |
| 10% - 15% | Reducao para 50% da posicao |
| 15% - 20% | Reducao para 25% da posicao |
| > 20% | Desligamento completo (circuit breaker) |

### 3.5 Circuit Breakers do Bot

O bot deve implementar multiplos niveis de circuit breaker:

**Nivel 1 -- Circuit Breaker Diario:**
- Perda diaria > 3% do portfolio: Reduzir novas operacoes em 50%
- Perda diaria > 5% do portfolio: Interromper novas operacoes por 24h
- Perda diaria > 7% do portfolio: Fechar todas as posicoes e pausar 48h

**Nivel 2 -- Circuit Breaker Semanal:**
- Perda semanal > 5%: Revisar parametros de risco
- Perda semanal > 8%: Reduzir posicoes a 50%
- Perda semanal > 12%: Modo de emergencia (so posicoes defensivas)

**Nivel 3 -- Circuit Breaker Mensal:**
- Drawdown mensal > 10%: Alerta ao gestor, reducao para 50%
- Drawdown mensal > 15%: Modo conservador por 30 dias
- Drawdown mensal > 20%: Desligamento total ate revisao manual

**Nivel 4 -- Circuit Breaker de Mercado:**
- Ibovespa cai > 5% intraday: Reduzir exposicao em 50%
- Ibovespa cai > 10% intraday: Fechar todas as posicoes long
- IVol-BR/VXBR > 40: Modo de protecao ativado
- Dollar/BRL varia > 3% intraday: Alerta e revisao

---

## 4. Position Sizing

### 4.1 Kelly Criterion

O Criterio de Kelly (1956) determina a fracao otima do capital a ser investida para maximizar o crescimento geometrico do portfolio no longo prazo.

**Formula classica (binomial):**

```
f* = (b*p - q) / b
```

Onde:
- `f*` = fracao otima do capital
- `b` = odds (ganho por unidade apostada)
- `p` = probabilidade de ganho
- `q` = 1 - p = probabilidade de perda

**Formula generalizada para investimentos (distribuicao continua):**

```
f* = (mu - r_f) / sigma^2
```

Onde:
- `mu` = retorno esperado do ativo
- `r_f` = taxa livre de risco (Selic)
- `sigma^2` = variancia dos retornos

**Para multiplos ativos (Kelly vetorial):**

```
f* = Sigma^(-1) * (mu - r_f * 1)
```

Onde `Sigma^(-1)` e a inversa da matriz de covariancia.

### 4.2 Fractional Kelly

O Kelly completo e extremamente agressivo e leva a drawdowns inaceitaveis na pratica. O Fractional Kelly mitiga esse problema:

```
f_frac = k * f*    onde  0 < k < 1
```

**Relacao entre fracao Kelly e risco:**

| Fracao Kelly | Crescimento (% do otimo) | Risco de Drawdown 80% |
|---|---|---|
| 100% (Full Kelly) | 100% | 1 em 5 |
| 50% (Half Kelly) | 75% | 1 em 25 |
| 30% | 51% | 1 em 213 |
| 25% (Quarter Kelly) | 43.75% | 1 em 625 |

**Recomendacao para o bot**: Usar 25% Kelly (Quarter Kelly). Isso preserva quase metade do crescimento otimo enquanto reduz drasticamente o risco de ruina. No mercado brasileiro, com sua alta volatilidade, ir alem de 30% Kelly e imprudente.

### 4.3 Fixed Fractional

O metodo Fixed Fractional arrisca uma porcentagem fixa do capital em cada operacao:

```
Tamanho_posicao = (Capital * Fracao_risco) / Risco_por_unidade
```

**Exemplo:**
- Capital: R$ 1.000.000
- Fracao de risco: 1%
- Stop loss: R$ 2.00 por acao
- Tamanho: (1.000.000 * 0.01) / 2.00 = 5.000 acoes

**Parametros recomendados:**
- Estrategias conservadoras: 0.5% - 1.0% por operacao
- Estrategias moderadas: 1.0% - 2.0% por operacao
- Estrategias agressivas: 2.0% - 3.0% por operacao
- Limite absoluto: Nunca mais que 5% em uma unica operacao

### 4.4 Optimal-f

O Optimal-f de Ralph Vince generaliza o Kelly Criterion para distribuicoes de retornos nao-binomiais:

```
Optimal-f = argmax_f [prod(1 + f * (-Trade_i / MaxLoss))^(1/N)]
```

**Procedimento:**
1. Identificar a maior perda historica (MaxLoss)
2. Testar frações f de 0.01 a 1.00
3. Calcular o TWR (Terminal Wealth Relative) para cada f
4. O f que maximiza o TWR e o Optimal-f

**Advertencia**: Optimal-f e ainda mais agressivo que Kelly completo. Para o bot, usar no maximo 25% do Optimal-f calculado.

### 4.5 Anti-Martingale (Position Sizing Progressivo)

Sistemas anti-martingale aumentam a posicao apos ganhos e reduzem apos perdas (oposto do martingale):

```python
def anti_martingale_sizing(equity, initial_equity, base_risk):
    """
    Aumenta risco com equity crescente, reduz com equity decrescente.
    """
    equity_ratio = equity / initial_equity

    if equity_ratio > 1:
        # Equity positiva: aumentar gradualmente
        adjusted_risk = base_risk * (1 + 0.5 * (equity_ratio - 1))
    else:
        # Equity negativa: reduzir agressivamente
        adjusted_risk = base_risk * equity_ratio ** 2

    # Limites
    return max(0.001, min(adjusted_risk, base_risk * 2))
```

### 4.6 Position Sizing Dinamico (Volatility-Adjusted)

O metodo mais sofisticado para o bot combina volatilidade corrente com metricas de risco:

```python
def dynamic_position_size(capital, target_risk, current_vol,
                           historical_vol, current_drawdown,
                           max_drawdown, atr):
    """
    Position sizing dinamico que considera:
    - Volatilidade corrente vs historica
    - Drawdown corrente
    - ATR para distancia do stop
    """
    # Fator de volatilidade: reduz posicao quando vol esta acima da media
    vol_ratio = historical_vol / current_vol
    vol_factor = min(vol_ratio, 2.0)  # Limitar em 2x

    # Fator de drawdown: reducao progressiva
    dd_factor = max(0, 1 - (current_drawdown / max_drawdown)) ** 1.5

    # Risco por unidade baseado no ATR
    risk_per_unit = atr * 2  # Stop a 2x ATR

    # Calculo final
    risk_amount = capital * target_risk * vol_factor * dd_factor
    position_size = risk_amount / risk_per_unit

    return position_size
```

---

## 5. Portfolio Optimization

### 5.1 Markowitz -- Mean-Variance Optimization (MVO)

A Modern Portfolio Theory (MPT) de Markowitz (1952) busca o portfolio de minimo risco para um dado retorno esperado:

```
Minimizar  w^T * Sigma * w
Sujeito a:
  w^T * mu = r_target
  w^T * 1 = 1
  w >= 0  (se long-only)
```

**Limitacoes amplificadas no mercado brasileiro:**
- Alta sensibilidade a erros de estimacao (retornos esperados sao notoriamente dificeis de prever)
- Tende a concentrar em poucos ativos (problema agravado no Brasil com poucas acoes liquidas)
- Gera pesos instataveis quando a matriz de covariancia e mal-condicionada
- Performance out-of-sample frequentemente inferior a 1/N (carteira igualmente ponderada)

### 5.2 Black-Litterman Model

O modelo Black-Litterman (1992) resolve muitas limitacoes do Markowitz ao combinar retornos de equilibrio de mercado com visoes (views) do investidor usando inferencia Bayesiana.

**Retorno de equilibrio (prior):**

```
Pi = delta * Sigma * w_mkt
```

Onde:
- `delta` = coeficiente de aversao ao risco (tipicamente (E[r_m] - r_f) / sigma_m^2)
- `w_mkt` = pesos de capitalizacao de mercado
- `Sigma` = matriz de covariancia

**Retorno posterior (combinando prior com views):**

```
mu_BL = [(tau*Sigma)^(-1) + P^T * Omega^(-1) * P]^(-1) *
         [(tau*Sigma)^(-1) * Pi + P^T * Omega^(-1) * Q]
```

Onde:
- `tau` = escalar de incerteza sobre o prior (tipicamente 0.025 a 0.05)
- `P` = matriz de views (quais ativos)
- `Q` = vetor de retornos esperados nas views
- `Omega` = matriz de incerteza das views

**Vantagens para o bot:**
- Incorpora naturalmente sinais do modelo de alpha como "views"
- Produz pesos mais estaveis e diversificados
- Permite expressar incerteza sobre previsoes
- Ideal para combinar sinais quantitativos com views macro

**Implementacao pratica com PyPortfolioOpt:**

```python
from pypfopt import BlackLittermanModel, EfficientFrontier
from pypfopt import risk_models, expected_returns

# Views absolutas (geradas pelo modelo de alpha do bot)
viewdict = {
    "PETR4": 0.15,   # Espera-se 15% de retorno
    "VALE3": 0.10,   # Espera-se 10% de retorno
    "ITUB4": 0.08    # Espera-se 8% de retorno
}

# Confianca nas views (0 = sem confianca, 1 = certeza)
confidences = [0.6, 0.7, 0.5]

bl = BlackLittermanModel(
    cov_matrix=Sigma,
    pi=equilibrium_returns,
    absolute_views=viewdict,
    omega="idzorek",  # Metodo de Idzorek para especificar confianca
    view_confidences=confidences
)

bl_returns = bl.bl_returns()
bl_cov = bl.bl_cov()

ef = EfficientFrontier(bl_returns, bl_cov)
weights = ef.max_sharpe()
```

### 5.3 Risk Parity

A abordagem Risk Parity (Qian, 2005; Maillard et al., 2010) equaliza a contribuicao de risco de cada ativo ao portfolio:

**Contribuicao de risco do ativo i:**

```
RC_i = w_i * (Sigma * w)_i / sigma_p
```

**Objetivo Risk Parity:**

```
RC_i = RC_j  para todo i, j
```

Ou seja, cada ativo contribui igualmente para o risco total do portfolio.

**Formulacao como problema de otimizacao:**

```
Minimizar  sum_i sum_j (RC_i - RC_j)^2

ou equivalentemente:

Minimizar  sum_i (w_i * (Sigma * w)_i / (w^T * Sigma * w) - 1/N)^2
```

**Vantagens para o mercado brasileiro:**
- Evita concentracao excessiva em ativos de baixa volatilidade
- Mais robusta a erros de estimacao que MVO
- Historicamente boa performance em diferentes regimes de mercado
- Nao requer estimacao de retornos esperados

**Limitacoes:**
- Pode alocar excessivamente em ativos de baixa volatilidade e baixo retorno
- Ignora retornos esperados (puro risco-based)
- Em crises, as correlacoes convergem para 1, anulando o beneficio da diversificacao

### 5.4 Hierarchical Risk Parity (HRP)

Desenvolvido por Marcos Lopez de Prado (2016), o HRP e um avanco significativo sobre os metodos tradicionais, utilizando tecnicas de machine learning (clustering hierarquico) para construir portfolios mais robustos.

**Algoritmo em 3 etapas:**

**Etapa 1 -- Tree Clustering:**
- Calcular a matriz de distancias de correlacao: `d(i,j) = sqrt(0.5 * (1 - rho_ij))`
- Aplicar clustering hierarquico aglomerativo (linkage method: single, complete, ou ward)
- Resultado: dendrograma que organiza ativos por similaridade

**Etapa 2 -- Quasi-Diagonalization:**
- Reorganizar a matriz de covariancia para que ativos similares fiquem proximos
- Resultado: uma matriz quasi-diagonal que facilita a alocacao

**Etapa 3 -- Recursive Bisection:**
- Dividir recursivamente o portfolio em sub-clusters
- Alocar risco via inverse-variance dentro de cada cluster
- Resultado: pesos finais do portfolio

**Vantagens fundamentais:**

1. **Estabilidade numerica**: Nao requer inversao da matriz de covariancia (ao contrario de MVO)
2. **Menor concentracao**: Distribui melhor o risco entre ativos
3. **Robustez**: Menos sensivel a erros de estimacao na matriz de covariancia
4. **Performance out-of-sample**: Consistentemente superior a MVO em estudos empiricos
5. **Complexidade reduzida**: O(N^2 log N) vs O(N^3) para MVO

**Implementacao:**

```python
from pypfopt import HRPOpt
import pandas as pd

def hrp_portfolio(returns_df):
    """
    Portfolio otimizado via Hierarchical Risk Parity.
    """
    hrp = HRPOpt(returns_df)
    weights = hrp.optimize()
    performance = hrp.portfolio_performance(verbose=True)

    return weights, performance
```

**Evidencia empirica**: Lopez de Prado (2016) demonstrou que HRP supera MVO, Equal Weight, e CLA (Critical Line Algorithm) em testes out-of-sample com dados de 1998 a 2015.

### 5.5 Minimum Variance Portfolio

O portfolio de minima variancia minimiza a volatilidade do portfolio sem restricao de retorno alvo:

```
Minimizar  w^T * Sigma * w
Sujeito a:
  w^T * 1 = 1
  w >= 0
```

**Solucao analitica (sem restricao de shorts):**

```
w_MV = Sigma^(-1) * 1 / (1^T * Sigma^(-1) * 1)
```

**Performance no Brasil**: Estudos empiricos mostram que portfolios de minima variancia com acoes do Ibovespa superam consistentemente o indice ponderado por capitalizacao em termos de risco-ajustado (Sharpe ratio), embora com retorno absoluto potencialmente menor.

### 5.6 Maximum Diversification Portfolio

Proposto por Choueifaty e Coignard (2008), o portfolio de maxima diversificacao maximiza o Diversification Ratio:

```
DR = (w^T * sigma) / sqrt(w^T * Sigma * w)
```

Onde `sigma` e o vetor de volatilidades individuais e `Sigma` e a matriz de covariancia.

**Interpretacao**: O DR e a razao entre a volatilidade media ponderada dos ativos e a volatilidade do portfolio. Quanto maior, mais o portfolio se beneficia da diversificacao.

**Evidencias empiricas**: O Most Diversified Portfolio (MDP) consistentemente apresenta retornos ajustados ao risco superiores ao benchmark ponderado por capitalizacao, ao minimum variance, e ao equal weight, particularmente durante crises financeiras.

### 5.7 Recomendacao para o Bot -- Ensemble de Metodos

O bot deve combinar multiplos metodos de otimizacao:

```python
def ensemble_portfolio(returns, views=None, method_weights=None):
    """
    Combina multiplos metodos de otimizacao de portfolio.
    Pesos default: HRP 30%, Risk Parity 25%, BL 25%, MinVar 20%
    """
    if method_weights is None:
        method_weights = {
            'hrp': 0.30,
            'risk_parity': 0.25,
            'black_litterman': 0.25,
            'min_variance': 0.20
        }

    portfolios = {}
    portfolios['hrp'] = calculate_hrp(returns)
    portfolios['risk_parity'] = calculate_risk_parity(returns)
    portfolios['black_litterman'] = calculate_bl(returns, views)
    portfolios['min_variance'] = calculate_min_var(returns)

    # Ensemble: media ponderada dos pesos
    ensemble_weights = sum(
        method_weights[method] * np.array(list(weights.values()))
        for method, weights in portfolios.items()
    )

    return ensemble_weights / ensemble_weights.sum()
```

---

## 6. Correlacao e Diversificacao

### 6.1 Correlacao Estatica vs Dinamica

A correlacao estatica (Pearson) assume relacoes lineares constantes no tempo, o que e fundamentalmente incorreto para mercados financeiros:

```
rho_ij = Cov(r_i, r_j) / (sigma_i * sigma_j)
```

**Problemas da correlacao estatica no mercado brasileiro:**
- Correlacoes mudam dramaticamente em crises (convergem para +1)
- Dependem da janela de estimacao escolhida
- Nao capturam dependencias nao-lineares (tail dependence)
- No Joesley Day, correlacoes intraday entre acoes brasileiras saltaram de 0.3-0.5 para 0.8-0.95

### 6.2 DCC-GARCH (Dynamic Conditional Correlation)

O modelo DCC-GARCH de Engle (2002) permite modelar correlacoes variantes no tempo:

**Etapa 1 -- GARCH univariado para cada ativo:**

```
sigma_i,t^2 = omega_i + alpha_i * epsilon_i,t-1^2 + beta_i * sigma_i,t-1^2
```

**Etapa 2 -- Correlacao dinamica:**

```
Q_t = (1 - a - b) * Q_bar + a * (z_t-1 * z_t-1^T) + b * Q_t-1

R_t = diag(Q_t)^(-1/2) * Q_t * diag(Q_t)^(-1/2)
```

Onde:
- `z_t` = retornos padronizados (epsilon_t / sigma_t)
- `Q_bar` = matriz de correlacao incondicional
- `a, b` = parametros de persistencia (estimados via MLE)
- `R_t` = matriz de correlacao condicional no tempo t

**Interpretacao dos parametros:**
- `a` alto: correlacao reage rapidamente a choques recentes
- `b` alto: correlacao e altamente persistente
- `a + b` proximo de 1: processo quase integrado (altamente persistente)

**Implementacao:**

```python
from arch import arch_model
import numpy as np

def estimate_dcc_garch(returns):
    """
    Estima modelo DCC-GARCH para obter correlacoes dinamicas.
    """
    n_assets = returns.shape[1]

    # Etapa 1: GARCH univariado para cada ativo
    models = []
    std_residuals = np.zeros_like(returns)

    for i in range(n_assets):
        am = arch_model(returns.iloc[:, i], vol='Garch', p=1, q=1,
                        dist='StudentsT')
        res = am.fit(disp='off')
        models.append(res)
        std_residuals[:, i] = res.resid / res.conditional_volatility

    # Etapa 2: DCC (implementacao simplificada)
    Q_bar = np.corrcoef(std_residuals.T)

    # Parametros DCC (tipicamente estimados via MLE)
    a = 0.05  # Reatividade
    b = 0.93  # Persistencia

    T = len(returns)
    R_t = np.zeros((T, n_assets, n_assets))
    Q_t = Q_bar.copy()

    for t in range(1, T):
        z = std_residuals[t-1:t, :].T
        Q_t = (1 - a - b) * Q_bar + a * (z @ z.T) + b * Q_t

        # Normalizacao para obter correlacao
        D_inv = np.diag(1 / np.sqrt(np.diag(Q_t)))
        R_t[t] = D_inv @ Q_t @ D_inv

    return R_t, models
```

### 6.3 Diversificacao no Mercado Brasileiro

**Desafios especificos:**

1. **Concentracao setorial**: Top 5 empresas (Vale, Petrobras, Itau, Bradesco, Ambev) representam ~40% do Ibovespa
2. **Dependencia de commodities**: Setor de materiais basicos e petroleo tem alta correlacao com precos internacionais
3. **Risco politico sistematico**: Eventos como Joesley Day afetam todo o mercado simultaneamente
4. **Baixa liquidez em mid/small caps**: Dificulta diversificacao alem das blue chips
5. **Correlacao com mercados globais**: Beta alto com S&P 500 e mercados emergentes

**Estrategias de diversificacao para o bot:**

- **Diversificacao setorial**: Limitar exposicao a qualquer setor a no maximo 25%
- **Diversificacao por fator**: Combinar value, momentum, quality, low-vol, size
- **Diversificacao temporal**: Escalonar entradas para reduzir risco de timing
- **Diversificacao de estrategia**: Combinar trend-following, mean-reversion, statistical arbitrage
- **Correlacao condicional**: Reduzir exposicao quando correlacoes aumentam (regime de crise)

### 6.4 Correlacao em Crises (Tail Dependence)

A correlacao de Pearson subestima a dependencia em caudas. Para capturar isso, usar:

**Lower Tail Dependence Coefficient (copulas):**

```
lambda_L = lim_{u->0} P(U <= u | V <= u)
```

**Copula t-Student:**
Captura tail dependence simetrica. Para ativos brasileiros, o coeficiente de tail dependence tipicamente varia de 0.1 (normal) a 0.5-0.7 (crise).

**Implicacao para o bot**: A diversificacao "desaparece" justamente quando voce mais precisa dela. O bot deve:
1. Monitorar correlacoes em tempo real via DCC-GARCH
2. Aumentar cash quando correlacoes sobem acima de um threshold
3. Implementar hedging com opcoes de Ibovespa quando correlacoes se aproximam de 0.8+
4. Nunca confiar que a diversificacao funcionara em cenarios extremos

---

## 7. Stress Testing e Cenarios

### 7.1 Stress Testing Historico

O stress testing historico aplica retornos de periodos de crise ao portfolio atual:

**Cenarios historicos criticos para o mercado brasileiro:**

| Evento | Data | Ibovespa | Dollar | Juros | Duracao |
|---|---|---|---|---|---|
| Crise Asiatica | Out 1997 | -25% | +20% | +45% (Selic) | 3 meses |
| Crise Russa | Ago 1998 | -40% | +65% | +40% (Selic) | 4 meses |
| Eleicao Lula | Jun-Out 2002 | -30% | +53% | +7pp (Selic) | 5 meses |
| Crise Subprime | Mai-Out 2008 | -60% | +45% | - | 6 meses |
| Joesley Day | 18/Mai 2017 | -8.8% (1d) | +8% (1d) | +100bps DI | 1 dia |
| Greve Caminhoneiros | Mai 2018 | -12% (semana) | +5% | +50bps DI | 2 semanas |
| COVID-19 | Fev-Mar 2020 | -46.8% | +30% | - | 2 meses |
| Risco Fiscal 2021 | Set-Nov 2021 | -15% | +12% | +300bps DI | 3 meses |

**Implementacao:**

```python
def historical_stress_test(portfolio_weights, asset_returns, scenarios):
    """
    Aplica cenarios historicos ao portfolio atual.

    scenarios: dict com cenarios de stress
    Exemplo: {'covid': {'PETR4': -0.55, 'VALE3': -0.40, ...}}
    """
    results = {}

    for scenario_name, scenario_returns in scenarios.items():
        portfolio_return = sum(
            portfolio_weights.get(asset, 0) * ret
            for asset, ret in scenario_returns.items()
        )
        results[scenario_name] = portfolio_return

    return results
```

### 7.2 Cenarios Hipoteticos

Alem dos cenarios historicos, o bot deve testar cenarios hipoteticos:

**Cenario 1 -- "Novo Joesley Day" (Crise Politica Extrema):**
- Ibovespa: -15% em 1 dia
- Dolar: +12% em 1 dia
- DI futuro: +300bps
- Correlacao intra-acoes: 0.95
- Liquidez: 50% do normal

**Cenario 2 -- "Hiperinflacao" (Descontrole Fiscal):**
- Selic: +10pp em 6 meses
- Ibovespa real: -40%
- Dolar: +80%
- Credito corporativo: spread +500bps
- Duration: perda massiva

**Cenario 3 -- "China Hard Landing" (Colapso de Demanda por Commodities):**
- Minerio de ferro: -50%
- Petroleo: -40%
- Vale: -60%
- Petrobras: -50%
- Real: -20%
- Ibovespa: -35%

**Cenario 4 -- "Flash Crash Brasileiro":**
- Ibovespa: -10% em 30 minutos
- Circuit breaker acionado
- Liquidez: 10% do normal
- Slippage: 5-10x do normal
- Gap de abertura dia seguinte: -5% adicional

**Cenario 5 -- "Pandemia 2.0" (Nova Crise Sanitaria Global):**
- Ibovespa: -50% em 1 mes
- Multiplos circuit breakers
- Volatilidade: 80%+ anualizada
- Correlacoes: 0.9+ entre todos os ativos

### 7.3 Tail Risk e Eventos Black Swan

Nassim Taleb popularizou o conceito de Black Swan: eventos de alta impacto, baixa probabilidade, e que sao retrospectivamente previsveis.

**Metricas de tail risk para o bot:**

**Tail Risk Ratio:**
```
TRR = CVaR_99% / VaR_99%
```
Valores > 1.5 indicam caudas pesadas significativas.

**Tail Index (Hill Estimator):**
```
xi = (1/k) * sum(ln(X_(n-i+1)) - ln(X_(n-k)))  para i=1,...,k
```
Onde X_(i) sao as estatisticas de ordem e k e o numero de observacoes da cauda.

Para o Ibovespa, o tail index tipicamente indica caudas mais pesadas que a distribuicao normal, com `xi` entre 0.25 e 0.40.

### 7.4 Resposta do Bot a Stress

```python
class StressTestEngine:
    """
    Motor de stress testing para o bot.
    """
    def __init__(self, portfolio, scenarios):
        self.portfolio = portfolio
        self.scenarios = scenarios
        self.thresholds = {
            'warning': -0.05,      # -5%
            'alert': -0.10,        # -10%
            'critical': -0.20,     # -20%
            'catastrophic': -0.35  # -35%
        }

    def run_all_scenarios(self):
        results = {}
        for name, scenario in self.scenarios.items():
            loss = self.calculate_stress_loss(scenario)
            results[name] = {
                'loss': loss,
                'severity': self.classify_severity(loss),
                'action': self.recommended_action(loss)
            }
        return results

    def classify_severity(self, loss):
        if loss > self.thresholds['warning']:
            return 'NORMAL'
        elif loss > self.thresholds['alert']:
            return 'WARNING'
        elif loss > self.thresholds['critical']:
            return 'ALERT'
        elif loss > self.thresholds['catastrophic']:
            return 'CRITICAL'
        else:
            return 'CATASTROPHIC'

    def recommended_action(self, loss):
        severity = self.classify_severity(loss)
        actions = {
            'NORMAL': 'Manter operacao normal',
            'WARNING': 'Reduzir exposicao em 25%, aumentar hedging',
            'ALERT': 'Reduzir exposicao em 50%, ativar stops apertados',
            'CRITICAL': 'Reduzir para posicoes minimas, hedge maximo',
            'CATASTROPHIC': 'Fechar todas posicoes, modo cash'
        }
        return actions[severity]
```

---

## 8. Volatility Modeling

### 8.1 GARCH(1,1)

O modelo GARCH (Generalized Autoregressive Conditional Heteroskedasticity) de Bollerslev (1986) e o modelo padrao para volatilidade condicional:

```
sigma_t^2 = omega + alpha * epsilon_t-1^2 + beta * sigma_t-1^2
```

Onde:
- `omega` > 0: variancia de longo prazo (constante)
- `alpha` >= 0: reacao a choques recentes (ARCH effect)
- `beta` >= 0: persistencia da volatilidade (GARCH effect)
- `alpha + beta < 1`: condicao de estacionariedade

**Variancia incondicional (longo prazo):**

```
sigma_LP^2 = omega / (1 - alpha - beta)
```

**Meia-vida da volatilidade:**

```
t_1/2 = ln(2) / ln(alpha + beta)
```

**Parametros tipicos para Ibovespa:**
- `alpha` entre 0.05 e 0.15
- `beta` entre 0.80 e 0.93
- `alpha + beta` entre 0.90 e 0.99 (alta persistencia)
- Meia-vida tipica: 10-50 dias uteis

### 8.2 EGARCH

O EGARCH (Exponential GARCH) de Nelson (1991) modela a volatilidade no espaco logaritmico e captura assimetria:

```
ln(sigma_t^2) = omega + alpha * (|z_t-1| - E[|z_t-1|]) + gamma * z_t-1 + beta * ln(sigma_t-1^2)
```

Onde:
- `gamma` < 0: efeito alavancagem (choques negativos aumentam mais a volatilidade)
- Nao requer restricoes de nao-negatividade nos parametros
- `z_t = epsilon_t / sigma_t` = retorno padronizado

**Vantagens:**
- Captura naturalmente o efeito alavancagem
- Garante volatilidade positiva por construcao (logaritmo)
- Mais flexivel que GARCH simetrico

### 8.3 GJR-GARCH

O GJR-GARCH (Glosten, Jagannathan, Runkle, 1993) incorpora assimetria de forma direta:

```
sigma_t^2 = omega + (alpha + gamma * I_t-1) * epsilon_t-1^2 + beta * sigma_t-1^2
```

Onde:
- `I_t-1 = 1` se `epsilon_t-1 < 0` (choque negativo), `0` caso contrario
- `gamma` > 0: retornos negativos geram mais volatilidade (leverage effect)

**Evidencia para o mercado brasileiro:**
O GJR-GARCH consistentemente supera o GARCH simetrico para acoes brasileiras. O parametro `gamma` e tipicamente significativo e positivo, confirmando que noticias negativas geram mais volatilidade que noticias positivas no mercado brasileiro (leverage effect mais pronunciado que em mercados desenvolvidos).

**Comparacao empirica para Ibovespa:**

| Modelo | AIC (menor = melhor) | Captura Assimetria | Complexidade |
|---|---|---|---|
| GARCH(1,1) | Baseline | Nao | Baixa |
| EGARCH(1,1) | -5% a -10% vs GARCH | Sim | Media |
| GJR-GARCH(1,1) | -3% a -8% vs GARCH | Sim | Media |
| GARCH-t | -8% a -15% vs GARCH | Nao (mas fat tails) | Baixa |
| GJR-GARCH-t | -12% a -20% vs GARCH | Sim + fat tails | Media |

**Recomendacao**: GJR-GARCH(1,1) com distribuicao t-Student para os residuos. Oferece o melhor balanco entre acuracia e parcimonia para o mercado brasileiro.

### 8.4 Volatilidade Realizada

A volatilidade realizada usa dados intradiarios (high-frequency) para estimar a volatilidade de forma mais precisa:

```
RV_t = sum(r_i,t^2)  para i = 1,...,M
```

Onde `r_i,t` sao retornos em intervalos de 5 minutos (M retornos por dia).

**Ajuste para microestrutura (Kernel-based):**

```
RV_t^adj = sum(r_i,t^2) + 2 * sum_h=1^H K(h/H) * sum_i r_i,t * r_i-h,t
```

**Para o bot**: Se tiver acesso a dados tick-by-tick da B3, a volatilidade realizada e a estimativa mais precisa e deve ser preferida sobre GARCH para horizontes de curto prazo (intraday a 1 semana).

### 8.5 IVol-BR e S&P/B3 Ibovespa VIX (VXBR)

**IVol-BR (NEFIN-USP):**
O IVol-BR e um indice de volatilidade implicita proposto em 2015 pelo Nucleo de Pesquisa em Economia Financeira (NEFIN) da USP. Baseia-se nos precos diarios de opcoes do Ibovespa e mede a volatilidade esperada para os proximos dois meses. Sua metodologia segue o VIX da CBOE, com ajustes para as particularidades do mercado de opcoes brasileiro.

**S&P/B3 Ibovespa VIX (VXBR):**
Lancado em 19 de marco de 2024 pela B3 em parceria com S&P Dow Jones Indices, o VXBR mede a volatilidade implicita de 30 dias do Ibovespa em tempo real. Funciona como um "termometro" do mercado, indicando quanto os agentes esperam que o Ibovespa oscile nos proximos 30 dias.

**Niveis de referencia do VXBR:**
- < 15: Baixa volatilidade (complacencia)
- 15-25: Volatilidade normal
- 25-35: Volatilidade elevada (cautela)
- 35-50: Alta volatilidade (estresse)
- > 50: Volatilidade extrema (panico -- equivalente a crises como COVID)

**Uso no bot:**

```python
def volatility_regime(vxbr_level):
    """
    Classifica regime de volatilidade baseado no VXBR.
    """
    if vxbr_level < 15:
        return {
            'regime': 'LOW_VOL',
            'position_multiplier': 1.2,  # Pode aumentar levemente
            'strategy_bias': 'mean_reversion',
            'hedging': 'minimal'
        }
    elif vxbr_level < 25:
        return {
            'regime': 'NORMAL',
            'position_multiplier': 1.0,
            'strategy_bias': 'balanced',
            'hedging': 'standard'
        }
    elif vxbr_level < 35:
        return {
            'regime': 'ELEVATED',
            'position_multiplier': 0.7,
            'strategy_bias': 'trend_following',
            'hedging': 'increased'
        }
    elif vxbr_level < 50:
        return {
            'regime': 'HIGH_STRESS',
            'position_multiplier': 0.4,
            'strategy_bias': 'defensive',
            'hedging': 'maximum'
        }
    else:
        return {
            'regime': 'PANIC',
            'position_multiplier': 0.1,
            'strategy_bias': 'cash_preservation',
            'hedging': 'full_hedge'
        }
```

### 8.6 Volatilidade Implicita vs Realizada (Variance Risk Premium)

O Variance Risk Premium (VRP) e a diferenca entre volatilidade implicita e realizada:

```
VRP = IV^2 - RV^2
```

**Significado:**
- VRP > 0 (normal): Mercado "paga caro" por protecao -- possivel vender volatilidade
- VRP < 0 (raro): Mercado subestima risco -- comprar protecao e barato
- VRP muito alto: Possivel oportunidade de venda de volatilidade, mas com risco

**Para o bot**: Monitorar o VRP como indicador de regime e como possivel alpha source (venda sistematica de volatilidade quando VRP e alto, com hedging de cauda).

---

## 9. Risk Budgeting

### 9.1 Conceito e Framework

Risk budgeting e o processo de alocar um "orcamento de risco" total entre diferentes estrategias, ativos, ou fatores. O principio e que o capital e abundante, mas o risco e escasso.

**Principio fundamental:**
```
O portfolio e otimo quando a razao retorno excedente / contribuicao marginal de risco
e igual para todos os componentes.
```

**Formalmente:**

```
(E[r_i] - r_f) / MRC_i = constante  para todo i
```

Onde MRC_i = Marginal Risk Contribution = d(sigma_p)/d(w_i).

### 9.2 Risk Budgeting por Estrategia

O bot deve alocar risco entre suas diferentes estrategias:

```python
RISK_BUDGET = {
    'trend_following': {
        'risk_allocation': 0.30,  # 30% do risco total
        'max_var_contribution': 0.35,
        'max_drawdown_allowed': 0.15
    },
    'mean_reversion': {
        'risk_allocation': 0.25,
        'max_var_contribution': 0.30,
        'max_drawdown_allowed': 0.12
    },
    'statistical_arbitrage': {
        'risk_allocation': 0.20,
        'max_var_contribution': 0.25,
        'max_drawdown_allowed': 0.10
    },
    'momentum': {
        'risk_allocation': 0.15,
        'max_var_contribution': 0.20,
        'max_drawdown_allowed': 0.12
    },
    'volatility_trading': {
        'risk_allocation': 0.10,
        'max_var_contribution': 0.15,
        'max_drawdown_allowed': 0.08
    }
}
```

### 9.3 Risk Budgeting por Ativo

Limitar a contribuicao de risco de qualquer ativo individual:

```python
ASSET_RISK_LIMITS = {
    'max_single_stock_risk_contribution': 0.10,  # 10% do risco total
    'max_sector_risk_contribution': 0.25,         # 25% do risco total
    'max_factor_risk_contribution': 0.30,          # 30% do risco total
    'max_country_risk_contribution': 0.40           # 40% (para portfolio internacional)
}
```

**Contribuicao de risco do ativo i:**

```
RC_i = w_i * (Sigma * w)_i / sigma_p

% RC_i = RC_i / sigma_p
```

**Monitoramento continuo:**

```python
def monitor_risk_contributions(weights, cov_matrix, risk_budget):
    """
    Monitora se as contribuicoes de risco estao dentro do orcamento.
    """
    portfolio_risk = np.sqrt(weights @ cov_matrix @ weights)
    marginal_risk = cov_matrix @ weights / portfolio_risk
    risk_contributions = weights * marginal_risk
    pct_risk_contributions = risk_contributions / portfolio_risk

    violations = {}
    for i, asset in enumerate(asset_names):
        if pct_risk_contributions[i] > risk_budget[asset]:
            violations[asset] = {
                'current': pct_risk_contributions[i],
                'limit': risk_budget[asset],
                'action': 'REDUCE_POSITION'
            }

    return pct_risk_contributions, violations
```

### 9.4 Risk Budgeting por Fator

Decompor o risco do portfolio em fatores (Fama-French, Barra, etc.):

**Fatores tipicos:**
- **Mercado (Beta)**: Exposicao ao risco sistematico
- **Tamanho (SMB)**: Small minus Big
- **Valor (HML)**: High minus Low (Book-to-Market)
- **Momentum (WML)**: Winners minus Losers
- **Qualidade**: ROE, baixo endividamento
- **Volatilidade**: Low-vol anomaly

**Decomposicao:**

```
r_p = alpha + beta_mkt * r_mkt + beta_smb * SMB + beta_hml * HML + ... + epsilon

Risco fatorial = beta_factor^2 * sigma_factor^2
Risco especifico = sigma_epsilon^2
```

**Para o bot**: O risco fatorial nao deve exceder 70% do risco total (para evitar dependencia excessiva de fatores sistematicos). O risco especifico (alpha puro) deve representar pelo menos 30%.

---

## 10. Stop Loss e Take Profit

### 10.1 Tipos de Stop Loss

**10.1.1 Stop Fixo (Percentage-Based)**

```
Stop Price = Entry Price * (1 - stop_percentage)
```

- Simples de implementar
- Nao se adapta a volatilidade do ativo
- Tipicamente 2-5% para acoes brasileiras blue chip, 5-10% para small caps

**10.1.2 Stop por ATR (Average True Range)**

```
True Range = max(High - Low, |High - Close_prev|, |Low - Close_prev|)
ATR(n) = SMA(True Range, n)  ou  EMA(True Range, n)

Stop Price = Entry Price - multiplier * ATR(n)
```

**Multiplicadores recomendados:**
- Conservador: 3.0x ATR (menos stops prematuros, mais risco)
- Moderado: 2.0x ATR (balanceado)
- Agressivo: 1.5x ATR (mais stops, menor risco por trade)

**Evidencia empirica**: Estudos demonstram que stops baseados em ATR aumentam a performance em ate 15% comparados com stops fixos, pois se adaptam automaticamente a volatilidade do ativo e do momento de mercado.

**10.1.3 Trailing Stop**

```python
def trailing_stop(entry_price, current_price, highest_price,
                   trail_pct=None, trail_atr=None, atr_value=None):
    """
    Trailing stop que acompanha o preco a medida que sobe.
    """
    if trail_atr and atr_value:
        stop_distance = trail_atr * atr_value
    elif trail_pct:
        stop_distance = highest_price * trail_pct
    else:
        raise ValueError("Especifique trail_pct ou trail_atr + atr_value")

    stop_price = highest_price - stop_distance

    # Stop nunca desce (para posicoes long)
    return max(stop_price, entry_price - stop_distance)
```

**10.1.4 Volatility-Adjusted Stop**

```
Stop Distance = k * sigma_t * sqrt(holding_period)
```

Onde `sigma_t` e a volatilidade condicional estimada pelo GARCH.

**10.1.5 Chandelier Exit**

```
Long Stop = Highest High(n) - multiplier * ATR(n)
Short Stop = Lowest Low(n) + multiplier * ATR(n)
```

**10.1.6 Stop Temporal (Time-Based)**

```python
def time_based_stop(entry_time, current_time, max_holding_days,
                     current_pnl, min_profit_threshold):
    """
    Fecha posicao se nao atingiu objetivo em X dias.
    """
    days_held = (current_time - entry_time).days

    if days_held >= max_holding_days:
        if current_pnl < min_profit_threshold:
            return True, 'TIME_STOP'
    return False, None
```

### 10.2 Take Profit Strategies

**10.2.1 Take Profit Fixo (Risk:Reward Ratio)**

```
Take Profit = Entry + R * (Entry - Stop)
```

Onde R = risk:reward ratio (tipicamente 2:1 ou 3:1).

**10.2.2 Partial Take Profit (Saida Escalonada)**

```python
TAKE_PROFIT_LEVELS = [
    {'pct_of_position': 0.33, 'target_R': 1.0},  # 1/3 em 1R
    {'pct_of_position': 0.33, 'target_R': 2.0},  # 1/3 em 2R
    {'pct_of_position': 0.34, 'trailing': True}    # 1/3 com trailing
]
```

**10.2.3 Dynamic Take Profit (Baseado em Volatilidade)**

```
Take Profit Distance = k * ATR(14) * sqrt(expected_holding_period)
```

### 10.3 Impacto dos Stops no Retorno -- Evidencias Academicas

A literatura academica e mista sobre a eficacia de stop-losses:

**Argumentos a favor:**
- Limitam perdas catastroficas (protecao contra tail risk)
- Disciplinam o trader (evitam "anchoring bias")
- Liberam capital para novas oportunidades
- Stops baseados em volatilidade (ATR) demonstram melhoria de 15% vs fixos

**Argumentos contra:**
- Stops fixos apertados geram muitos falsos sinais (whipsaw)
- Em mercados volateis como o brasileiro, stops sao acionados com mais frequencia
- Custos de transacao se acumulam com stops frequentes
- O stop pode ser acionado exatamente no ponto de reversao

**Estudos relevantes:**
- Estudo com 87 estrategias de stop-loss diferentes mostrou que trailing stops baseados em ATR consistentemente superaram stops fixos
- A combinacao de trend-following entry com trailing volatility stop gera distribuicao de retornos com skew positivo significativo: 17% dos trades ganham 50%+ enquanto menos de 3% sofrem perdas extremas

**Recomendacao para o bot:**
1. Usar ATR-based stops como padrao (2.0-2.5x ATR)
2. Implementar trailing stops apos o trade mover 1R a favor
3. Partial exits em niveis pre-definidos
4. Time stops para posicoes que nao se movem
5. Ajustar dinamicamente o multiplicador ATR baseado no regime de volatilidade

---

## 11. Liquidez e Slippage

### 11.1 Risco de Liquidez no Brasil

O mercado brasileiro possui desafios significativos de liquidez:

**Dados estruturais:**
- ~400 acoes listadas na B3, mas apenas ~80 com liquidez significativa
- Top 20 acoes concentram ~60% do volume negociado
- Spread bid-ask medio: 0.05-0.10% para blue chips, 0.5-2.0% para small caps
- Volume medio diario do Ibovespa: ~R$ 20-30 bilhoes (2024)

**Evidencia academica especifica**: Pesquisa com dados da B3 demonstra que o trading algoritmico no mercado brasileiro aumenta tanto os spreads realizados quanto as variaveis de impacto de preco. Alem disso, esta associado ao aumento da commonality em liquidez, sugerindo que o trading algoritmico apresenta atividade de negociacao correlacionada.

**Implicacoes para o bot:**
- Ativos com volume diario < R$ 5 milhoes devem ser evitados
- Posicao maxima por ativo: 1-2% do volume medio diario
- Monitorar book de ofertas em tempo real para detectar deterioracao de liquidez
- Em periodos de estresse, a liquidez pode cair 50-80% (COVID: circuit breakers multiplos)

### 11.2 Modelagem de Slippage

**Modelo Linear (simplificado):**

```
Slippage = spread/2 + k * (Order Size / ADV)
```

Onde ADV = Average Daily Volume.

**Square Root Law (Almgren et al.):**

O modelo de impacto de mercado mais aceito empiricamente segue uma lei de raiz quadrada:

```
Market Impact = sigma * sqrt(Q / V)
```

Onde:
- `sigma` = volatilidade diaria do ativo
- `Q` = quantidade da ordem
- `V` = volume diario medio

**Modelo Almgren-Chriss Completo:**

```
Impact Total = Impacto Permanente + Impacto Temporario

Impacto Permanente = g(v) = gamma * v   (linear no rate de execucao)
Impacto Temporario = h(v) = eta * sign(v) + lambda * v^delta
```

Onde `v` = rate de execucao (shares/time) e `delta` tipicamente proximo de 0.5 (square root).

**Componentes do custo de execucao:**

```
Custo Total = Spread + Market Impact + Timing Risk + Opportunity Cost
```

### 11.3 Market Impact Models para o Bot

```python
class MarketImpactModel:
    """
    Modelo de market impact para o bot no mercado brasileiro.
    """
    def __init__(self):
        self.sigma_annual = 0.30  # Volatilidade tipica BR
        self.trading_days = 252

    def estimate_slippage(self, order_size, adv, daily_vol,
                           spread, urgency='normal'):
        """
        Estima slippage total para uma ordem.

        order_size: valor da ordem em R$
        adv: average daily volume em R$
        daily_vol: volatilidade diaria do ativo
        spread: bid-ask spread (percentual)
        urgency: 'low', 'normal', 'high'
        """
        # 1. Custo de spread
        spread_cost = spread / 2

        # 2. Market impact (square root law)
        participation_rate = order_size / adv
        impact = daily_vol * np.sqrt(participation_rate)

        # 3. Ajuste de urgencia
        urgency_multiplier = {'low': 0.7, 'normal': 1.0, 'high': 1.5}
        impact *= urgency_multiplier.get(urgency, 1.0)

        # 4. Timing risk (para ordens distribuidas no tempo)
        if urgency == 'low':
            timing_risk = daily_vol * np.sqrt(participation_rate) * 0.5
        else:
            timing_risk = 0

        total_slippage = spread_cost + impact + timing_risk

        return {
            'spread_cost': spread_cost,
            'market_impact': impact,
            'timing_risk': timing_risk,
            'total_slippage': total_slippage,
            'cost_bps': total_slippage * 10000  # Em basis points
        }

    def optimal_execution_schedule(self, total_shares, time_horizon,
                                     volatility, risk_aversion):
        """
        Calculo da trajetoria otima de execucao (Almgren-Chriss).
        Distribui a execucao ao longo do tempo minimizando
        impacto + timing risk.
        """
        # Trajetoria TWAP (Time-Weighted Average Price) como baseline
        n_periods = int(time_horizon)
        shares_per_period = total_shares / n_periods

        # Ajuste para Almgren-Chriss: front-load se risco alto
        kappa = np.sqrt(risk_aversion * volatility**2)

        schedule = []
        remaining = total_shares

        for t in range(n_periods):
            # Funcao de decaimento exponencial
            trade_size = remaining * (1 - np.exp(-kappa))
            trade_size = max(trade_size, shares_per_period * 0.5)
            trade_size = min(trade_size, remaining)

            schedule.append({
                'period': t,
                'shares': trade_size,
                'remaining': remaining - trade_size
            })
            remaining -= trade_size

        return schedule
```

### 11.4 Regras de Liquidez para o Bot

```python
LIQUIDITY_RULES = {
    # Limites de participacao no volume
    'max_participation_rate': 0.02,    # Max 2% do ADV por dia
    'max_participation_intraday': 0.10, # Max 10% do volume intraday

    # Limites de posicao
    'max_position_pct_adv': 0.25,  # Posicao max = 25% do ADV (1/4 dia)
    'max_position_pct_float': 0.01, # Max 1% do free float

    # Filtros de universo
    'min_adv': 5_000_000,           # R$ 5M de ADV minimo
    'min_market_cap': 500_000_000,  # R$ 500M de market cap minimo
    'max_spread': 0.005,            # Spread maximo de 0.5%

    # Ajustes em estresse
    'stress_adv_multiplier': 0.5,   # Em estresse, assume ADV = 50% do normal
    'stress_spread_multiplier': 3.0  # Em estresse, assume spread 3x maior
}
```

---

## 12. Framework Integrado para o Bot

### 12.1 Arquitetura do Sistema de Risco

```
+-------------------------------------------------------------+
|                    RISK MANAGEMENT ENGINE                     |
+-------------------------------------------------------------+
|                                                               |
|  +------------------+  +------------------+  +--------------+ |
|  | PRE-TRADE RISK   |  | REAL-TIME RISK   |  | POST-TRADE   | |
|  |                  |  |                  |  | RISK         | |
|  | - Position sizing|  | - P&L monitoring |  | - VaR calc   | |
|  | - Liquidity check|  | - Drawdown track |  | - CVaR calc  | |
|  | - Slippage est.  |  | - Circuit breaker|  | - Stress test| |
|  | - Correl. check  |  | - Vol regime     |  | - Backtesting| |
|  | - Risk budget    |  | - Stop mgmt      |  | - Attribution| |
|  | - Scenario check |  | - Exposure mgmt  |  | - Reporting  | |
|  +------------------+  +------------------+  +--------------+ |
|                                                               |
|  +----------------------------------------------------------+ |
|  |              PORTFOLIO OPTIMIZATION LAYER                 | |
|  |  HRP | Risk Parity | Black-Litterman | Min Var | Ensemble | |
|  +----------------------------------------------------------+ |
|                                                               |
|  +----------------------------------------------------------+ |
|  |              VOLATILITY & CORRELATION ENGINE              | |
|  |  GJR-GARCH | DCC-GARCH | Realized Vol | VXBR Monitor     | |
|  +----------------------------------------------------------+ |
|                                                               |
+-------------------------------------------------------------+
```

### 12.2 Fluxo de Decisao de Risco

```python
class RiskManagementEngine:
    """
    Motor central de gestao de risco do bot.
    """

    def pre_trade_check(self, signal):
        """
        Verificacoes antes de executar qualquer trade.
        Retorna True se o trade e aprovado, False caso contrario.
        """
        checks = [
            self.check_position_limit(signal),
            self.check_portfolio_var(signal),
            self.check_portfolio_cvar(signal),
            self.check_drawdown_limit(signal),
            self.check_correlation_impact(signal),
            self.check_liquidity(signal),
            self.check_risk_budget(signal),
            self.check_volatility_regime(signal),
            self.check_stress_scenarios(signal),
            self.check_circuit_breakers()
        ]

        # Todas as verificacoes devem passar
        return all(checks)

    def calculate_position_size(self, signal):
        """
        Calcula tamanho otimo da posicao considerando todos os fatores.
        """
        # 1. Kelly Criterion (25% Kelly)
        kelly_size = self.fractional_kelly(signal, fraction=0.25)

        # 2. Ajuste por volatilidade
        vol_adjusted = self.volatility_adjust(kelly_size)

        # 3. Ajuste por drawdown
        dd_adjusted = self.drawdown_adjust(vol_adjusted)

        # 4. Ajuste por liquidez
        liq_adjusted = self.liquidity_adjust(dd_adjusted, signal.asset)

        # 5. Verificar limites de risco
        final_size = self.apply_risk_limits(liq_adjusted)

        return final_size

    def real_time_monitoring(self):
        """
        Loop de monitoramento em tempo real.
        """
        while self.is_market_open():
            # Atualizar metricas
            self.update_pnl()
            self.update_drawdown()
            self.update_var_cvar()
            self.update_correlations()
            self.update_volatility()

            # Verificar circuit breakers
            if self.check_daily_loss_limit():
                self.trigger_circuit_breaker('DAILY_LOSS')

            if self.check_vxbr_level():
                self.adjust_for_volatility_regime()

            # Gerenciar stops
            self.manage_all_stops()

            # Verificar risk budget
            self.check_risk_budget_compliance()

    def end_of_day_risk_report(self):
        """
        Relatorio de risco de fim de dia.
        """
        return {
            'date': datetime.now().date(),
            'portfolio_value': self.portfolio_value,
            'daily_pnl': self.daily_pnl,
            'daily_return': self.daily_return,
            'current_drawdown': self.current_drawdown,
            'max_drawdown': self.max_drawdown,
            'var_95': self.calculate_var(0.95),
            'var_99': self.calculate_var(0.99),
            'cvar_975': self.calculate_cvar(0.975),
            'calmar_ratio': self.calmar_ratio,
            'sharpe_ratio': self.sharpe_ratio,
            'risk_contributions': self.get_risk_contributions(),
            'correlation_matrix': self.get_current_correlations(),
            'volatility_regime': self.get_vol_regime(),
            'stress_test_results': self.run_stress_tests(),
            'liquidity_metrics': self.get_liquidity_metrics(),
            'circuit_breaker_status': self.get_cb_status()
        }
```

### 12.3 Parametros de Risco Consolidados

```python
RISK_PARAMETERS = {
    # === LIMITES DE PORTFOLIO ===
    'max_portfolio_var_95_daily': 0.02,        # VaR 95% diario max: 2%
    'max_portfolio_cvar_975_daily': 0.035,     # CVaR 97.5% diario max: 3.5%
    'max_portfolio_volatility_annual': 0.20,   # Vol anual max: 20%
    'target_sharpe_ratio': 1.5,                # Sharpe alvo
    'target_calmar_ratio': 1.5,                # Calmar alvo

    # === DRAWDOWN ===
    'max_daily_loss': 0.03,                    # Perda diaria max: 3%
    'max_weekly_loss': 0.05,                   # Perda semanal max: 5%
    'max_monthly_drawdown': 0.10,              # DD mensal max: 10%
    'max_total_drawdown': 0.20,                # DD total max: 20%
    'drawdown_reduction_threshold': 0.05,      # Iniciar reducao em 5% DD

    # === POSITION SIZING ===
    'kelly_fraction': 0.25,                    # 25% Kelly
    'max_single_position': 0.05,               # Max 5% por posicao
    'max_sector_exposure': 0.25,               # Max 25% por setor
    'max_correlated_exposure': 0.30,           # Max 30% em ativos correlacionados
    'default_risk_per_trade': 0.01,            # 1% de risco por trade

    # === STOPS ===
    'default_stop_atr_multiplier': 2.0,        # Stop a 2x ATR
    'trailing_stop_activation': 1.0,           # Ativar trailing apos 1R
    'time_stop_days': 20,                      # Time stop em 20 dias
    'max_holding_period': 60,                  # Holding max: 60 dias

    # === LIQUIDEZ ===
    'min_adv': 5_000_000,                      # ADV minimo: R$ 5M
    'max_participation_rate': 0.02,            # Max 2% do ADV
    'max_spread': 0.005,                       # Spread max: 0.5%

    # === VOLATILIDADE ===
    'garch_model': 'GJR-GARCH(1,1)-t',        # Modelo de vol padrao
    'vol_lookback': 60,                        # Janela de vol: 60 dias
    'vol_halflife': 20,                        # Meia-vida EWMA: 20 dias
    'vxbr_panic_threshold': 40,                # VXBR > 40 = panico

    # === STRESS TESTING ===
    'max_loss_worst_scenario': 0.30,           # Perda max em pior cenario: 30%
    'stress_test_frequency': 'daily',          # Stress test diario
    'n_monte_carlo_scenarios': 10000,          # Cenarios Monte Carlo

    # === RISK BUDGET ===
    'max_factor_risk_pct': 0.70,               # Max 70% de risco fatorial
    'min_idiosyncratic_risk_pct': 0.30,        # Min 30% de risco especifico
    'rebalance_threshold': 0.05                # Rebalancear se drift > 5%
}
```

### 12.4 Hierarquia de Protecao (Defense in Depth)

```
Camada 1: Position Sizing (Kelly fracionario + vol-adjusted)
    |
    v
Camada 2: Stop Losses (ATR-based trailing stops)
    |
    v
Camada 3: Risk Budget (limites por ativo/setor/fator)
    |
    v
Camada 4: Portfolio VaR/CVaR (limites de portfolio)
    |
    v
Camada 5: Drawdown Circuit Breakers (reducao progressiva)
    |
    v
Camada 6: Market Circuit Breakers (VXBR, Ibovespa)
    |
    v
Camada 7: Kill Switch (desligamento total manual/automatico)
```

Cada camada funciona independentemente. Se uma falhar, as proximas camadas capturam o risco. Esta redundancia e essencial para a sobrevivencia do bot em cenarios extremos.

---

## 13. Referencias

### Livros e Textos Fundamentais

1. **Markowitz, H.** (1952). "Portfolio Selection". *The Journal of Finance*, 7(1), 77-91.
2. **Black, F. & Litterman, R.** (1992). "Global Portfolio Optimization". *Financial Analysts Journal*, 48(5), 28-43.
3. **Artzner, P. et al.** (1999). "Coherent Measures of Risk". *Mathematical Finance*, 9(3), 203-228.
4. **Rockafellar, R. T. & Uryasev, S.** (2000). "Optimization of Conditional Value-at-Risk". *Journal of Risk*, 2(3), 21-41.
5. **Engle, R.** (2002). "Dynamic Conditional Correlation". *Journal of Business & Economic Statistics*, 20(3), 339-350.
6. **Kelly, J. L.** (1956). "A New Interpretation of Information Rate". *Bell System Technical Journal*, 35(4), 917-926.
7. **Almgren, R. & Chriss, N.** (2000). "Optimal Execution of Portfolio Transactions". *Journal of Risk*, 3(2), 5-39.
8. **Lopez de Prado, M.** (2016). "Building Diversified Portfolios that Outperform Out-of-Sample". *Journal of Portfolio Management*, 42(4), 59-69.
9. **Choueifaty, Y. & Coignard, Y.** (2008). "Toward Maximum Diversification". *Journal of Portfolio Management*, 35(1), 40-51.
10. **Bollerslev, T.** (1986). "Generalized Autoregressive Conditional Heteroskedasticity". *Journal of Econometrics*, 31(3), 307-327.
11. **Nelson, D. B.** (1991). "Conditional Heteroskedasticity in Asset Returns: A New Approach". *Econometrica*, 59(2), 347-370.
12. **Glosten, L., Jagannathan, R. & Runkle, D.** (1993). "On the Relation between the Expected Value and the Volatility of the Nominal Excess Return on Stocks". *Journal of Finance*, 48(5), 1779-1801.
13. **Vince, R.** (1992). *The Mathematics of Money Management*. John Wiley & Sons.
14. **Taleb, N. N.** (2007). *The Black Swan: The Impact of the Highly Improbable*. Random House.

### Fontes Online e Papers Consultados

15. **Shokri, A. & Kythreotis, A.** (2024). "Enhancing Portfolio Risk Management: A Comparative Study of Parametric, Non-Parametric, and Monte Carlo Methods, with VaR and Percentile Ranking". [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4779957)
16. **QuantBrasil** -- "Utilizando o VaR (Value-at-Risk) no Gerenciamento de Risco de um Portfolio". [QuantBrasil](https://quantbrasil.com.br/blog/utilizando-o-var-value-at-risk-no-gerenciamento-de-risco-de-um-portfolio/)
17. **Revista Mackenzie** -- "Estimando o Value-at-Risk de Carteiras via Modelos da Familia GARCH". [Mackenzie](https://editorarevistas.mackenzie.br/index.php/rem/article/download/6665/4636/27280)
18. **PUC-Rio** -- "Value-at-Risk: Implementacao e Metodos". [PUC-Rio](https://www.maxwell.vrac.puc-rio.br/14108/14108_3.PDF)
19. **Rockafellar, R. T. & Uryasev, S.** -- "Portfolio Optimization with CVaR Objective and Constraints". [Paper](https://www.financerisks.com/filedati/WP/paper/CVaR%20Portfolio%20Optimization.pdf)
20. **Magdon-Ismail, M.** -- "An Analysis of the Maximum Drawdown Risk Measure". [Paper](https://www.cs.rpi.edu/~magdon/ps/journal/drawdown_RISK04.pdf)
21. **Hudson & Thames** -- "An Introduction to the Hierarchical Risk Parity Algorithm". [HRP](https://hudsonthames.org/an-introduction-to-the-hierarchical-risk-parity-algorithm/)
22. **AQR Capital** -- "Understanding Risk Parity". [AQR](https://www.aqr.com/-/media/AQR/Documents/Insights/White-Papers/Understanding-Risk-Parity.pdf)
23. **Roncalli, T.** -- "Risk Parity Portfolios with Risk Factors". [Paper](http://www.thierry-roncalli.com/download/risk-factor-parity.pdf)
24. **Idzorek, T.** -- "A Step-by-Step Guide to the Black-Litterman Model". [Duke](https://people.duke.edu/~charvey/Teaching/BA453_2006/Idzorek_onBL.pdf)
25. **SciELO Brazil** -- "Study on the relationship between the IVol-BR and the future returns of the Brazilian stock market". [SciELO](https://www.scielo.br/j/rcf/a/f6BGdWZBtTymNX3hGTZg68d/?lang=pt)
26. **B3** -- "Indices de Volatilidade / S&P/B3 Ibovespa VIX". [B3](https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-em-parceria-s-p-dowjones/indices-de-volatilidade.htm)
27. **InfoMoney** -- "Joesley Day: a delacao que fez o Ibovespa derreter mais de 10%". [InfoMoney](https://www.infomoney.com.br/mercados/joesley-day-a-delacao-que-colocou-em-xeque-a-agenda-de-reformas-e-fez-o-ibovespa-derreter-mais-de-10/)
28. **Agencia Brasil** -- "Circuit breaker triggered again as Ibovespa faces another plunge (COVID-19)". [Agencia Brasil](https://agenciabrasil.ebc.com.br/en/economia/noticia/2020-03/circuit-breaker-triggered-again-ibovespa-faces-another-plunge)
29. **ScienceDirect** -- "Does algorithmic trading harm liquidity? Evidence from Brazil". [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1062940820301406)
30. **QuestDB** -- "Optimal Execution Strategies - Almgren-Chriss Model". [QuestDB](https://questdb.com/glossary/optimal-execution-strategies-almgren-chriss-model/)
31. **TOBAM / Choueifaty** -- "Toward Maximum Diversification". [TOBAM](https://www.tobam.fr/wp-content/uploads/2014/12/TOBAM-JoPM-Maximum-Div-2008.pdf)
32. **CVM** -- "Resolucao CVM 175 - Regulacao de Fundos de Investimento". [CVM](https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/resolucoes/anexos/100/resol175consolid.pdf)
33. **Banco Central do Brasil** -- Trabalho de Discussao No. 291 - Correlacoes Dinamicas. [BCB](https://www.bcb.gov.br/pec/wps/port/TD291.pdf)
34. **PMC/NIH** -- "The Brazilian financial market reaction to COVID-19: A wavelet analysis". [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9164961/)
35. **Federal Reserve** -- "Black Swans and Financial Stability" (2025). [Fed](https://www.federalreserve.gov/econres/feds/files/2025043pap.pdf)
36. **Springer** -- "The reasons why maximum diversification is better than minimum risk". [Springer](https://link.springer.com/article/10.1057/s41260-025-00420-4)
37. **LuxAlgo** -- "5 ATR Stop-Loss Strategies for Risk Control". [LuxAlgo](https://www.luxalgo.com/blog/5-atr-stop-loss-strategies-for-risk-control/)
38. **Paper to Profit** -- "I Tested 87 Different Stop Loss Strategies". [Substack](https://papertoprofit.substack.com/p/i-tested-87-different-stop-loss-strategies)
39. **PyPortfolioOpt** -- Documentacao oficial para implementacao em Python. [Docs](https://pyportfolioopt.readthedocs.io/en/latest/)
40. **V-Lab NYU Stern** -- "GARCH Volatility Documentation". [V-Lab](https://vlab.stern.nyu.edu/docs/volatility/GARCH)

---

## Apendice A: Checklist de Implementacao

- [ ] Implementar VaR parametrico, historico e Monte Carlo
- [ ] Implementar CVaR como metrica primaria de risco
- [ ] Configurar circuit breakers em 4 niveis
- [ ] Implementar position sizing com Kelly fracionario (25%)
- [ ] Implementar ATR-based trailing stops
- [ ] Configurar portfolio optimization ensemble (HRP + Risk Parity + BL + MinVar)
- [ ] Implementar DCC-GARCH para correlacoes dinamicas
- [ ] Configurar stress testing com cenarios historicos brasileiros
- [ ] Implementar GJR-GARCH(1,1)-t para modelagem de volatilidade
- [ ] Configurar risk budgeting por estrategia, ativo e fator
- [ ] Implementar modelo de slippage (square root law)
- [ ] Configurar monitoramento de VXBR e regimes de volatilidade
- [ ] Implementar backtesting de VaR (Kupiec + Christoffersen)
- [ ] Configurar sistema de alertas e reporting
- [ ] Implementar kill switch de emergencia

## Apendice B: Regulacao Relevante

### CVM 175 (Resolucao de Fundos de Investimento)

A Resolucao CVM 175, publicada em dezembro de 2022 e em vigor desde outubro de 2023, estabelece o novo marco regulatorio de fundos de investimento no Brasil. Pontos relevantes para gestao de risco:

- **Limites de exposicao por classe**: Renda Fixa (20% margem), Acoes/Cambial (40%), Multimercado (70%)
- **Gestao de riscos formalizada**: Requisitos para monitoramento quantitativo e qualitativo
- **Limites de concentracao por emissor**: Regras de diversificacao compulsorias
- **Risco de liquidez**: Requisitos especificos de monitoramento e gestao
- **Responsabilidade do gestor**: Enquadramento da carteira passa a ser controlado pelo gestor

---

> **Nota Final**: Este documento deve ser revisado e atualizado trimestralmente, ou sempre que ocorrerem mudancas significativas no mercado ou na regulacao brasileira. Os parametros de risco devem ser calibrados continuamente com base em dados reais de operacao do bot.
