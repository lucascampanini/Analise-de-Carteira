# Estrategias Quantitativas de Investimento Aplicaveis ao Mercado Brasileiro

> **Pesquisa de nivel PhD para implementacao em bot de investimentos de alto nivel**
> Documento de referencia tecnica - Atualizado em Fevereiro/2026

---

## Sumario

1. [Factor Investing no Brasil](#1-factor-investing-no-brasil)
2. [Pairs Trading e Statistical Arbitrage](#2-pairs-trading-e-statistical-arbitrage)
3. [Mean Reversion](#3-mean-reversion)
4. [Momentum e Trend Following](#4-momentum-e-trend-following)
5. [Arbitragem](#5-arbitragem)
6. [Market Making](#6-market-making)
7. [Event-Driven](#7-event-driven)
8. [Multi-Strategy e Regime Switching](#8-multi-strategy-e-regime-switching)
9. [Carry Trade](#9-carry-trade)
10. [Volatility Trading](#10-volatility-trading)
11. [Implicacoes para Implementacao no Bot](#11-implicacoes-para-implementacao-no-bot)
12. [Referencias Bibliograficas Completas](#12-referencias-bibliograficas-completas)

---

## 1. Factor Investing no Brasil

### 1.1 Fundamentos e Contexto Academico

O Factor Investing (investimento baseado em fatores) e uma das abordagens quantitativas mais robustas e academicamente fundamentadas. No Brasil, o principal centro de referencia e o **NEFIN - Nucleo de Pesquisa em Economia Financeira da Universidade de Sao Paulo (USP)**, que disponibiliza gratuitamente series historicas de fatores de risco adaptados ao mercado brasileiro.

Os fatores de risco disponiveis no NEFIN incluem:

| Fator | Sigla | Definicao |
|-------|-------|-----------|
| Mercado | Rm - Rf | Retorno do portfolio de mercado menos a taxa livre de risco |
| Tamanho | SMB (Small Minus Big) | Retorno de acoes small caps menos large caps |
| Valor | HML (High Minus Low) | Retorno de acoes com alto B/M menos baixo B/M |
| Momentum | WML (Winners Minus Losers) | Retorno de vencedoras menos perdedoras (12-2 meses) |
| Liquidez | IML (Illiquid Minus Liquid) | Retorno de acoes iliquidas menos liquidas |

A construcao destes fatores segue a metodologia de Fama e French (1993), com adaptacoes especificas para as particularidades do mercado brasileiro realizadas pelo NEFIN.

### 1.2 Modelo de Cinco Fatores de Fama-French no Brasil

O modelo de cinco fatores de Fama e French (2015) adicionou os fatores de **lucratividade (RMW - Robust Minus Weak)** e **investimento (CMA - Conservative Minus Aggressive)** ao modelo de tres fatores original. Estudos empiricos brasileiros sobre este modelo apresentam resultados divergentes:

- **Siqueira, Amaral e Correia (2017)** encontraram que o modelo de cinco fatores tem desempenho superior ao de tres fatores na explicacao de retornos de acoes brasileiras, com coeficiente de determinacao mais elevado.
- **Vieira, Maia, Klotzle e Figueiredo (2017)** e **Leite, Klotzle, Pinto e Silva (2018)** confirmaram parcialmente a relevancia dos fatores adicionais.
- **Mussa, Rogers e Securato (2009)** e **Rizzi (2012)** encontraram evidencias de que nenhum dos modelos fatoriais testados foi capaz de explicar completamente as variacoes nos retornos no mercado brasileiro.

Uma avaliacao empirica do modelo de cinco fatores no mercado brasileiro entre 1997 e 2016 encontrou evidencias de retornos nao explicados pelo modelo, investigando a viabilidade de incluir o fator momentum (WML), criando efetivamente um modelo de seis fatores.

### 1.3 O Fator Momentum no Brasil

O fator momentum e particularmente relevante para o mercado brasileiro. Dados do NEFIN indicam que, ao longo de 10 anos, um portfolio formado pela estrategia de momentum teve retornos superiores a **528%**, enquanto o retorno do mercado foi de **-16,32%** no mesmo periodo. Esta evidencia e extraordinariamente forte e sugere que o momentum e um dos fatores mais persistentes e lucrativos no mercado brasileiro.

### 1.4 Fator de Baixa Volatilidade

A anomalia de baixa volatilidade -- onde ativos menos arriscados tendem a superar os mais arriscados em termos de retorno ajustado ao risco -- tambem foi documentada no Brasil. Estudos confirmaram a forca e persistencia do efeito de baixa volatilidade e baixo beta no mercado brasileiro, com dados cobrindo desde 2001.

Portfolios de minima variancia construidos com ativos do Ibovespa demonstraram reducao significativa de volatilidade com retornos comparaveis ou superiores ao indice de referencia.

### 1.5 Fator de Qualidade

O fator qualidade captura metricas como ROE (Return on Equity), baixos accruals, baixa alavancagem e alto fluxo de caixa. No Brasil, o fundo **AvantGarde Multifatores FIA** documenta em seu white paper a aplicacao pratica de multiplos fatores (incluindo qualidade) ao mercado brasileiro, demonstrando a viabilidade operacional desta abordagem.

### 1.6 Implicacoes para o Bot

- **Prioridade maxima**: Implementar estrategia de momentum (WML) dado o retorno historico excepcional no Brasil
- Construir portfolios baseados nos 5 fatores NEFIN (Mercado, SMB, HML, WML, IML)
- Utilizar dados gratuitos do NEFIN como base para calibracao
- O fator liquidez (IML) e unico do mercado brasileiro e deve ser explorado
- Considerar modelo de 6 fatores (5 Fama-French + Momentum) para precificacao

---

## 2. Pairs Trading e Statistical Arbitrage

### 2.1 Fundamentacao Teorica

Pairs trading e uma estrategia market-neutral que explora desvios temporarios na relacao de precos entre dois ativos cointegrados. A estrategia envolve identificar pares de acoes cujos precos se movem juntos historicamente (cointegrados), monitorar desvios da relacao de equilíbrio, e abrir posicoes long/short quando o spread diverge significativamente.

### 2.2 Evidencia Empirica no Mercado Brasileiro

#### Estudo Seminal: Caldeira e Moura (2013)

O trabalho de **Joao Frois Caldeira e Guilherme Valle Moura**, publicado na **Brazilian Review of Finance**, e o estudo de referencia para pairs trading no Brasil:

- **Universo**: 50 acoes mais liquidas do Ibovespa
- **Periodo de estimacao**: 1 ano (janela rolante)
- **Periodo de negociacao**: 4 meses subsequentes
- **Sinal de entrada**: Z-score diverge mais de 2 desvios-padrao
- **Resultado**: Lucro liquido acumulado de **189,29%** em 4 anos de testes out-of-sample
- **Retorno anual medio**: **16,38%**
- **Volatilidade**: Relativamente baixa
- **Correlacao com Ibovespa**: Insignificante, confirmando a neutralidade de mercado

#### Abordagem de Copulas Mistas: da Silva, Ziegelmann e Caldeira (2023)

Pesquisadores propuseram uma estrategia alternativa de pairs trading baseada em **copulas mistas** (combinacao linear otima de copulas):

- **Dados**: Acoes do S&P 500 (1990-2015)
- **Retornos anualizados medios**: Ate **3,98%** (vs. 3,14% do metodo de distancia)
- **Sharpe ratio anual**: Ate **0,88**
- **Superioridade**: Mais evidente durante periodos de crise

#### Estudo Recente: Salgado (2025)

Um estudo publicado na **Applied Stochastic Models in Business and Industry** aplicou estrategia de pairs trading baseada em copulas diretamente a acoes da B3, encontrando que a estrategia baseada em copulas e **estatisticamente superior** a estrategia de buy-and-hold em termos de lucratividade e risco.

### 2.3 Limitacoes no Mercado Brasileiro

- **Liquidez**: O mercado brasileiro nao e tao liquido quanto necessario para garantir que sera sempre possivel comprar/vender um par (long + short)
- **Custo de aluguel de acoes**: O custo de shorting no Brasil pode ser significativamente mais alto que em mercados desenvolvidos
- **Numero limitado de pares**: Com apenas ~100 acoes de liquidez adequada, o universo de pares potenciais e menor

### 2.4 Implicacoes para o Bot

- Implementar metodo de cointegra~ao de Engle-Granger e Johansen para selecao de pares
- Considerar copulas mistas para modelagem de dependencia nao-linear
- Monitorar custos de aluguel em tempo real antes de abrir posicoes short
- Focar nos 50 ativos mais liquidos do Ibovespa
- Utilizar janelas rolantes de 12 meses para estimacao e 4 meses para trading

---

## 3. Mean Reversion

### 3.1 Processo de Ornstein-Uhlenbeck

O processo de Ornstein-Uhlenbeck (OU) e o modelo matematico padrao para reversao a media em financas:

```
dX(t) = theta * (mu - X(t)) * dt + sigma * dW(t)
```

Onde:
- **theta** (velocidade de reversao): Determina quao rapido o processo reverte a media
- **mu** (media de longo prazo): Nivel de equilibrio
- **sigma** (volatilidade): Magnitude das flutuacoes
- **dW(t)**: Processo de Wiener (movimento browniano)

**Parametros criticos para filtragem**:
- Velocidade de reversao positiva: theta > 0.03
- Half-life entre 5 e 200 dias de negociacao
- P-valor medio < 0.2 nos testes de estacionariedade

Estudos em mercados de acoes demonstraram que ativos exibindo fortes caracteristicas de reversao a media OU geraram retornos significativos e performance ajustada ao risco superior aos benchmarks de mercado.

### 3.2 Bollinger Bands Adaptativas

A integracao de mecanismos adaptativos com Bollinger Bands representa uma evolucao significativa:

- **KAMA (Kaufman Adaptive Moving Average)** como banda central, ajustando-se automaticamente a volatilidade do mercado
- **ATR (Average True Range)** dinamico para ajustar o multiplicador das bandas
- **Integracao OU + Bollinger**: Combinar sinais de trading de Bollinger Bands com estimacao do processo OU para identificar comportamento de reversao a media estatisticamente significativo

### 3.3 Aplicacao ao Mercado Brasileiro

No mercado brasileiro, a reversao a media pode ser explorada em:

1. **Spreads de pares cointegrados**: Conforme documentado na secao de Pairs Trading
2. **Indices setoriais**: Desvios entre indices setoriais e o Ibovespa
3. **Acoes individuais**: Ativos com forte caracteritica de mean-reversion (filtrado por OU)
4. **Basis do futuro**: Desvio entre preco futuro e preco a vista do Ibovespa
5. **Spread de credito**: Diferenciais entre titulos corporativos e soberanos

### 3.4 Consideracoes Especificas do Brasil

- **Alta taxa de juros**: O custo de carregamento das posicoes e elevado (Selic 14,75% em 2025)
- **Volatilidade elevada**: A amplitude dos desvios tende a ser maior, criando mais oportunidades
- **Microestrutura**: Spreads bid-ask mais amplos impactam a execucao
- **Sazonalidade**: Efeitos de final de mes (fluxo de fundos) e datas de vencimento de opcoes

### 3.5 Implicacoes para o Bot

- Implementar estimacao de parametros OU para filtrar ativos mean-reverting
- Utilizar Bollinger Bands adaptativas com KAMA como banda central
- Calibrar half-life para definir horizonte de holding
- Considerar custos de carregamento brasileiros nos calculos de breakeven
- Integrar filtros de regime para evitar operar mean-reversion em mercados trending

---

## 4. Momentum e Trend Following

### 4.1 Momentum Cross-Sectional no Brasil

O momentum cross-sectional envolve comprar ativos com melhor performance recente e vender (short) os piores. No Brasil, a evidencia empirica e particularmente forte:

- **Dados NEFIN**: Portfolio WML gerou retornos de 528% em 10 anos vs. -16,32% do mercado
- O efeito momentum persiste mesmo apos controle por tamanho, valor e liquidez
- A magnitude do efeito e superior a observada em mercados desenvolvidos

**Implementacao tipica**:
- Periodo de formacao: 12 meses (excluindo o mes mais recente)
- Periodo de holding: 1-6 meses
- Universo: Acoes com liquidez minima definida
- Rebalanceamento: Mensal

### 4.2 Momentum Time-Series

Diferentemente do cross-sectional, o momentum time-series avalia se o proprio ativo esta em tendencia:

- **Sinal**: Retorno acumulado dos ultimos 12 meses (excluindo o mes recente)
- **Se positivo**: Compra (long)
- **Se negativo**: Vende (short) ou vai para caixa
- **Vantagem**: Pode reduzir exposicao total ao mercado em periodos de queda

Pesquisa de **Moskowitz, Ooi e Pedersen (2012)** demonstrou fortes retornos de time-series momentum em contratos futuros globais, incluindo mercados emergentes.

### 4.3 Dual Momentum (Antonacci)

A estrategia de Dual Momentum combina ambos os tipos:
1. **Momentum relativo** (cross-sectional): Seleciona o melhor ativo entre alternativas
2. **Momentum absoluto** (time-series): Verifica se o retorno e positivo (filtro de tendencia)
3. **Aplicacao**: Se o melhor ativo tem retorno negativo, move para renda fixa

No Brasil, pode ser aplicado entre:
- Ibovespa vs. renda fixa (Selic/CDI)
- Setores da B3
- Acoes individuais com filtro de tendencia

### 4.4 Trend Following em Futuros da B3

Estrategias de trend following em futuros negociados na B3:

| Contrato | Ticker | Caracteristicas |
|----------|--------|----------------|
| Indice Futuro | IND/WIN | Alta liquidez, movimentos tendenciais claros |
| Dolar Futuro | DOL/WDO | Altamente tendencial em crises |
| DI Futuro | DI1 | Tendencias de longo prazo ligadas a politica monetaria |
| Cafe | ICF | Tendencias sazonais e fundamentalistas |
| Boi Gordo | BGI | Ciclo pecuario cria tendencias |
| Milho | CCM | Sazonalidade agricola |

**Indicadores de tendencia relevantes**:
- Medias moveis (20, 50, 200 dias)
- Canal de Donchian (breakout de N dias)
- ADX (Average Directional Index) para forca da tendencia
- Heikin-Ashi para suavizacao

### 4.5 CTAs e Managed Futures

Estrategias tipo CTA (Commodity Trading Advisor) aplicadas ao Brasil:
- Performam melhor em ambientes de transicao macroeconomica (choques inflacionarios, mudancas na curva de juros, crises cambiais)
- Em regimes inflacionarios, tendencias de commodities e juros curtos dominam
- A diversificacao entre classes de ativos (acoes, cambio, juros, commodities) e essencial

### 4.6 Implicacoes para o Bot

- **Implementar WML como estrategia core**: Evidencia no Brasil e excepcional
- Combinar momentum cross-sectional e time-series (Dual Momentum)
- Aplicar trend following a contratos futuros da B3 (especialmente mini-indice e mini-dolar)
- Utilizar filtro de regime para alternar entre momentum e mean-reversion
- Incluir stop-loss baseado em ATR para gerenciar drawdowns de momentum crash

---

## 5. Arbitragem

### 5.1 Arbitragem de Indice (Futuro vs. Cesta)

A estrategia de **Cash-and-Carry** no Ibovespa envolve:

1. **Comprar** todas as acoes na mesma proporcao do Ibovespa (cesta)
2. **Vender** o contrato futuro do Ibovespa (INDFUT)
3. **Carregar** ate o vencimento do contrato futuro
4. **Lucro**: Diferenca entre o valor da venda do futuro e a compra no mercado a vista, deduzidos os custos de carregamento

O preco justo do futuro e:

```
F = S * (1 + r - d)^T
```

Onde:
- **F**: Preco futuro
- **S**: Preco spot (cesta de acoes)
- **r**: Taxa de juros (custo de carregamento)
- **d**: Dividend yield esperado
- **T**: Tempo ate o vencimento

Quando `F_mercado > F_justo`: Vende futuro, compra cesta (Cash-and-Carry)
Quando `F_mercado < F_justo`: Compra futuro, vende cesta (Reverse Cash-and-Carry)

Estudo publicado na **Revista Liceu On-Line (FECAP)** documentou empiricamente as oportunidades de Cash-and-Carry na arbitragem do futuro do indice de acoes do Ibovespa.

### 5.2 Arbitragem entre Acoes e ADRs

A arbitragem entre acoes brasileiras negociadas na B3 e seus ADRs (American Depositary Receipts) na NYSE e uma das estrategias mais estudadas no mercado brasileiro.

#### Estudos Academicos Relevantes

**Lima (dissertacao de mestrado, UnB)** investigou dupla negociacao e arbitragem entre acoes e ADRs de empresas brasileiras, analisando 24 ativos altamente liquidos minuto a minuto ao longo de tres meses.

**Sakamoto (Revista de Financas Aplicadas, FIA)** documentou diferencas de precos entre ADRs e acoes de empresas brasileiras como oportunidades de arbitragem.

**Estudo publicado na Revista Brasileira de Economia de Empresas (UCB)** testou estrategias de arbitragem entre acoes brasileiras e suas ADRs com dados intraday.

**Pesquisa publicada na RAC (Revista de Administracao Contemporanea, SciELO)** examinou cointegra~ao e descoberta de precos de ADR brasileiros, encontrando que:
- De 32 titulos analisados (fev/1999 a jun/2006), cointegra~ao de longo prazo existiu em apenas **15 pares**
- Parametros de correcao de erro foram significativos em apenas **2 pares**
- Ajustes de equilibrio de longo prazo ocorreram em ambos os mercados em apenas **6,25%** da amostra

#### Fatores Determinantes

- **Taxa de cambio**: Principal fator influenciando oportunidades de arbitragem (coeficiente contemporaneo medio de -0,65)
- **Sincronicidade**: Unica barreira significativa a arbitragem entre acoes brasileiras e seus ADRs correspondentes
- **Horario de negociacao**: Sobreposicao parcial entre B3 (10:00-17:00 BRT) e NYSE (10:30-17:00 BRT)

### 5.3 Arbitragem de Taxa de Juros

No mercado brasileiro, oportunidades de arbitragem de juros surgem de:

1. **Termo vs. DI Futuro**: Discrepancias entre taxas no mercado a termo e contratos DI
2. **Pre vs. IPCA**: Arbitragem entre titulos prefixados e indexados a inflacao
3. **Cupom cambial**: Spread entre taxa em reais e taxa em dolares ajustada pelo cambio
4. **Curva de juros**: Distorcoes na estrutura a termo da taxa de juros

### 5.4 Implicacoes para o Bot

- Implementar monitoramento em tempo real do basis (futuro vs. spot) do Ibovespa
- Construir modulo de arbitragem ADR/BDR com ajuste cambial automatico
- Monitorar custos de transacao incluindo emolumentos, aluguel e custos de cambio
- Foco nas janelas de sobreposicao de horarios B3/NYSE para arbitragem de ADR
- Considerar latencia: arbitragem de indice requer execucao em milissegundos

---

## 6. Market Making

### 6.1 Programas de Market Making na B3

A B3 regula a atividade de market makers e oferece programas com incentivos para provisao de liquidez. O programa foi expandido significativamente:

- **Outubro de 2018**: Atividade de market making estendida ao mercado de acoes a vista com programa para 54 acoes, cada uma com 3 vagas para market makers
- **Resultados positivos**: Aumento substancial de liquidez, crescimento de volume e melhora nos custos de transacao com maior profundidade no livro de ofertas e spreads mais estreitos
- **Abrangencia atual**: Mercados de acoes, juros, cambio e commodities

### 6.2 Componentes da Estrategia

#### Spread Capture

O lucro basico do market maker vem da captura do spread bid-ask:
- **Lucro por roundtrip** = Ask - Bid - Custos
- **Desafio**: Equilibrar captura de spread vs. risco de inventario
- **Market makers HFT** tipicamente utilizam market making passivo para ganhar o spread

#### Inventory Management

O gerenciamento de inventario e critico para evitar acumulo de posicao direcional:
- Ajustar tamanho de ordens na direcao de acumulo excessivo de posicao
- Utilizar tamanho adaptativo baseado na taxa de execucao
- Definir limites de posicao liquida baseados no volume medio de negociacao
- **Risco de end-of-day inventory**: Necessidade de encerrar posicoes antes do fechamento

#### Deteccao de Order Imbalance

Market makers sofisticados detectam desequilibrios no fluxo de ordens:
- **Market making passivo**: Coloca ordens em ambos os lados do livro
- **Market making agressivo**: Quando detecta tendencia no fluxo de orders, pode especular direcao
- Utilizacao de informacoes sobre market microstructure (profundidade, toxicidade do fluxo)

### 6.3 Desafios Especificos do Mercado Brasileiro

- **Concentracao de liquidez**: Poucos ativos tem liquidez suficiente para market making
- **Regulacao**: Obrigacoes de cotacao (quantidade minima, spread maximo)
- **Latencia**: Necessidade de colocation na B3 (data center da Equinix em Sao Paulo)
- **Custos**: Emolumentos e taxas da B3 afetam a viabilidade

### 6.4 Implicacoes para o Bot

- Market making puro requer infraestrutura de ultra-baixa latencia (nao adequado para bot retail)
- **Alternativa viavel**: Estrategia de "smart liquidity provision" em ativos menos liquidos
- Monitorar spreads bid-ask como indicador de custo de transacao para outras estrategias
- Utilizar microestrutura de mercado como sinal para timing de entrada/saida

---

## 7. Event-Driven

### 7.1 Rebalanceamento de Indices

O Ibovespa e rebalanceado a cada 4 meses (jan-abr, mai-ago, set-dez). A evidencia empirica brasileira e muito forte:

**Estudo da FGV (Repositorio FGV)** -- "Performance de acoes em eventos de rebalanceamento de indice: evidencia do mercado acionario brasileiro":

| Evento | Efeito Medio | Periodo |
|--------|-------------|---------|
| Inclusao: pre-evento (30 dias) | **+10,4%** | Antes do rebalanceamento |
| Inclusao: pos-evento imediato | Queda/lateralizacao | Primeiros dias |
| Inclusao: 6 meses apos | **+6,7%** | Medio prazo |
| Inclusao: 1 ano apos | **+25%** | Longo prazo |
| Exclusao: pre-evento (30 dias) | **-20,7%** | Antes do rebalanceamento |

Os retornos anormais positivos antes da inclusao seguidos de reversao sao consistentes com a **hipotese de pressao de precos**: fundos passivos e ETFs que replicam o Ibovespa precisam comprar (vender) acoes que entram (saem) do indice.

**Criterios de inclusao no Ibovespa**:
- Estar entre os ativos elegiveis que representem 85% do indice de negociabilidade
- Presenca em pelo menos 95% dos pregoes
- Participacao de volume financeiro >= 0,1%
- Preco > R$ 1,00 (nao ser penny stock)

### 7.2 Earnings e Resultados Trimestrais

Estudo publicado no **Investment Analysts Journal** analisou a informatividade dos lucros no mercado brasileiro, encontrando que:
- Dividendos distribuidos e a existencia de restricoes financeiras impactam a informatividade dos lucros
- A informatividade dos lucros varia de acordo com a empresa e o lag temporal
- A hipotese de conteudo informacional de dividendos e parcialmente suportada

**Estrategias de earnings no Brasil**:
- **Pre-earnings drift**: Movimento direcional nos dias antes do anuncio
- **Post-earnings announcement drift (PEAD)**: Continuacao do movimento apos surpresas de lucro
- **Earnings surprise**: Lucro real vs. consenso dos analistas

### 7.3 Dividendos

O mercado brasileiro tem caracteristicas unicas para estrategias de dividendos:
- **Obrigatoriedade legal**: Empresas brasileiras sao obrigadas a distribuir minimo de 25% do lucro liquido
- **Juros sobre Capital Proprio (JCP)**: Mecanismo tributario unico que cria oportunidades
- **Datas ex-dividendo**: Impacto previsivel no preco das acoes
- **IDIV (Indice de Dividendos da B3)**: Benchmark para estrategias de dividendos

### 7.4 IPOs e Follow-Ons

O mercado brasileiro de IPOs e follow-ons e ciclico:
- **371 IPOs e follow-ons concluidos** nos ultimos 5 anos (dados Chambers, 2025)
- **Underpricing de IPO**: Retorno medio positivo no primeiro dia
- **Lock-up expiration**: Pressao de venda apos expiracao do periodo de lock-up (tipicamente 180 dias)
- **Estrategia de follow-on**: Diluicao pode criar oportunidade de compra se precificada abaixo do valor justo

### 7.5 Implicacoes para o Bot

- **Prioridade alta**: Estrategia de rebalanceamento do Ibovespa (retornos expressivos e previsiveis)
- Construir calendario de eventos (earnings, dividendos, vencimentos, rebalanceamentos)
- Implementar modelo de previsao de inclusao/exclusao no Ibovespa
- Monitorar surpresas de earnings em tempo real
- Explorar datas ex-dividendo e ex-JCP para captura de anomalias

---

## 8. Multi-Strategy e Regime Switching

### 8.1 Conceito de Regime Switching

Um regime denota periodos estendidos e consecutivos que exibem dinamicas de mercado homogeneas em termos de retornos, volatilidade e sentimento. Modelos de regime-switching sao valorizados por sua interpretabilidade, ja que os regimes identificados frequentemente se correlacionam com eventos do mundo real como fases do ciclo economico ou mudancas na politica monetaria.

### 8.2 Hidden Markov Models (HMMs) para Deteccao de Regimes

Modelos Ocultos de Markov (HMMs) sao a ferramenta estatistica padrao para deteccao de regimes:

- **Estados tipicos**: Bull (alta), Bear (baixa), Neutro (lateral)
- **Observaveis**: Retornos, volatilidade, spreads, drawdowns
- **Regime Bear**: Menores retornos (mais negativos) e tipicamente maior volatilidade
- **Regime Bull**: Maiores retornos
- **Transicoes**: Probabilidades de mudanca entre regimes

**Aplicacao ao Brasil**: Pesquisadores aplicaram modelos de regime-switching ao mercado brasileiro, identificando 4 fatores de risco e desenvolvendo estrategias que diversificam entre portfolios formados com esses fatores. Os resultados demonstraram que estrategias baseadas em fatores formuladas via regime-switching tem potencial para superar benchmarks tradicionais em termos de retornos ajustados ao risco no mercado brasileiro.

### 8.3 Dynamic Factor Allocation

Pesquisa recente explora alocacao dinamica de fatores via analise de regimes:

- **Integracao com Black-Litterman**: Inferencias de regime especificas de cada fator sao integradas ao modelo Black-Litterman para construir portfolios multi-fator
- **Resultados**: Portfolios multi-fator melhoraram significativamente o information ratio de 0,05 (benchmark equally-weighted) para aproximadamente **0,4**
- **IR relativo**: Alocacao dinamica alcanca IR de **0,4 a 0,5** relativo ao benchmark equally-weighted

### 8.4 Risk Parity e Alocacao Quantitativa

Estudos brasileiros sobre otimizacao de portfolio:

- **Risk Parity aplicado ao Brasil**: Utilizando indices setoriais do mercado brasileiro, risk parity forneceu portfolios mais diversificados e pesos mais estaveis out-of-sample comparado a minima variancia e pesos iguais
- **Hierarchical Risk Parity (HRP)**: Aplicacao com metodos de clustering ao Ibovespa e S&P 500 alcancou **Sharpe ratio de 1,11**, superando outros metodos

### 8.5 Combinacao de Estrategias

Framework para multi-strategy:

```
Alocacao_estrategia(t) = f(regime(t), performance_recente, correlacao, capacidade)
```

| Regime | Estrategias Preferidas | Estrategias a Evitar |
|--------|----------------------|---------------------|
| Bull (tendencia alta) | Momentum, Trend Following | Mean Reversion |
| Bear (tendencia baixa) | Mean Reversion, Volatility | Momentum long-only |
| Alta Volatilidade | Volatility Trading, Pairs | Market Making |
| Baixa Volatilidade | Carry, Market Making | Volatility Trading |
| Crise | Momentum time-series (short), Tail hedge | Carry Trade |

### 8.6 Implicacoes para o Bot

- Implementar HMM para deteccao de regimes em tempo real (2-3 estados)
- Alocar dinamicamente entre estrategias baseado no regime detectado
- Utilizar Hierarchical Risk Parity para alocacao entre estrategias
- Construir meta-modelo que pondera estrategias por performance recente + regime
- Manter correlacao baixa entre estrategias para diversificacao

---

## 9. Carry Trade

### 9.1 Contexto do Carry Trade no Brasil

O Brasil e historicamente um dos melhores destinos para carry trade globalmente, devido ao elevado diferencial de juros:

- **Taxa Selic (maio/2025)**: 14,75%
- **Federal Funds Rate (EUA)**: ~4,50%
- **Diferencial**: ~10,25 pontos percentuais
- **Projecao**: Queda gradual para 12,5% em 2026, ainda muito acima das taxas americanas

### 9.2 Evidencia Historica

O **BIS Papers No. 81 ("Currency Carry Trades in Latin America")** e o documento de referencia para carry trade na America Latina:

- Periodos estendidos de retornos positivos com quedas acentuadas ocasionais (2008, 2011, 2013)
- O BRL e uma das quatro moedas mais utilizadas em estrategias de carry trade globalmente
- Em abril de 2022, o carry trade no Brasil produziu retorno de **24%** desde o final de dezembro, o melhor do mundo

### 9.3 Mecanismo de Implementacao

**Instrumentos principais**:
- **NDFs (Non-Deliverable Forwards)**: Principal veiculo para investidores, especialmente offshore
- **Titulos publicos**: Investimento em titulos do governo brasileiro (NTN-B, LTN, LFT)
- **Futuro de dolar (DOL/WDO)**: Posicao vendida em dolar (equivalente a comprada em BRL)
- **Cupom cambial (DDI/FRC)**: Spreads entre taxas domesticas e externas

**Formula basica**:
```
Retorno_carry = (taxa_BRL - taxa_USD) - depreciacao_BRL
```

### 9.4 Riscos e Drawdowns

O carry trade e fundamentalmente uma estrategia de **"picking up pennies in front of a steamroller"**:

- **Crash risk**: O BRL tende a depreciar rapidamente em crises
- **Risco politico**: Impacto negativo nos retornos do trade, resultando em depreciacao cambial
- **Liquidacao forcada**: Carry trades sao tipicamente financiados com divida; choques que produzem perdas sao amplificados por espirais de liquidez
- **Exemplo**: Mesmo que o BRL enfraqueca ate R$ 6,20/USD (proximo a minima historica), o trade pode se manter graas ao grande diferencial de juros

### 9.5 Carry em Renda Fixa Domestica

Alem do carry cambial, existe carry domestico:
- **Inclinacao da curva de juros**: Comprar DI longo, financiar com DI curto
- **NTN-B (IPCA+)**: Carry de juro real elevado (6-7% real em 2025)
- **Debentures**: Spread de credito sobre titulos soberanos
- **CRI/CRA**: Instrumentos isentos de IR com carry adicional

### 9.6 Implicacoes para o Bot

- Monitorar diferencial de juros em tempo real (Selic vs. Fed Funds, ECB, BOJ)
- Implementar filtro de risco: evitar carry em periodos de alta volatilidade cambial
- Utilizar stop-loss baseado em depreciacao maxima toleravel
- Combinar carry com momentum cambial (carry + trend = carry-momentum)
- Monitorar indicadores de risk appetite global (VIX, spreads de credito, DXY)

---

## 10. Volatility Trading

### 10.1 O Mercado de Opcoes Brasileiro

O mercado de opcoes sobre o Ibovespa e acoes individuais na B3 possui caracteristicas unicas:

- **Liquidez relativamente baixa** comparado a mercados desenvolvidos
- **Poucos strikes** disponiveis para opcoes sobre o Ibovespa
- **Concentracao**: A maior parte do volume esta em opcoes de PETR4, VALE3 e Ibovespa
- **Opcoes americanas**: Predominantes para acoes individuais (diferente da Europa)

### 10.2 IVol-BR: Indice de Volatilidade Implicita do Brasil

O **IVol-BR**, proposto pelo NEFIN-USP em 2015, e o VIX brasileiro:

- Baseado em precos diarios de opcoes sobre o Ibovespa
- Mede a volatilidade esperada do Ibovespa para os proximos 2 meses
- Combina metodologia internacional (utilizada nos EUA) com ajustes para a baixa liquidez brasileira
- Calculado como media ponderada de duas vertices de volatilidade: "near-term" e "next-term"

**Poder preditivo**: O IVol-BR tem poder preditivo significativo sobre a volatilidade futura dos retornos do Ibovespa, que nao e encontrado em variaveis tradicionais de previsao de volatilidade. E particularmente eficaz para prever retornos futuros de 20, 60, 120 e 250 dias.

**Lancamento do VXBR**: Em marco de 2024, a B3 e S&P Dow Jones Indices lancaram o **S&P/B3 Ibovespa VIX (VXBR)**, operando em tempo real durante o horario de mercado.

### 10.3 Variance Premium

O **premio de variancia** (diferenca entre volatilidade implicita e realizada) foi estudado especificamente no mercado brasileiro:

- Pesquisa publicada na **Revista Brasileira de Economia (RBE)** analisou o variance premium em um mercado de opcoes de baixa liquidez
- O IVol-BR ao quadrado pode ser decomposto em: (i) variancia esperada dos retornos e (ii) premio de variancia
- O premio de variancia e significativo e pode ser explorado sistematicamente

### 10.4 Volatility Skew no Brasil

Estudo publicado no **International Business Research** por Luz examinou o **skew do volatility smile e retornos de acoes no Brasil**:

- A assimetria da volatilidade implicita (skew) tem poder preditivo sobre retornos futuros
- O skew varia por empresa e periodo
- Modelos AR-GARCH com skew como regressor externo produziram ganhos previsiveis

### 10.5 Estrategias de Volatility Trading

#### Venda de Volatilidade (Premium Selling)
- **Covered Call**: Venda de calls sobre posicoes long (estrategia mais popular no Brasil)
- **Cash-Secured Put**: Venda de puts para compra em nivel desejado
- **Iron Condor**: Venda de volatilidade com protecao (limitada por liquidez no Brasil)
- **Short Straddle/Strangle**: Aposta em baixa volatilidade realizada

#### Compra de Volatilidade
- **Long Straddle/Strangle**: Aposta em movimento grande (qualquer direcao)
- **Calendar Spread**: Explora term structure (compra longo prazo, vende curto prazo)
- **Tail Risk Hedging**: Compra de puts OTM como protecao

#### Estrategias de Skew
- **Risk Reversal**: Compra call OTM, vende put OTM (beneficia-se da dinamica do skew)
- **Butterfly Spread**: Lucra com a forma do volatility smile
- **Ratio Spread**: Explora diferenciais de volatilidade implicita entre strikes

### 10.6 Volatility Surface e Term Structure

A superficie de volatilidade e uma representacao 3D:
- **Eixo X**: Tempo ate o vencimento
- **Eixo Y**: Moneyness (strike/spot)
- **Eixo Z**: Volatilidade implicita

**Padroes tipicos no Brasil**:
- **Skew negativo**: Puts OTM tem volatilidade implicita maior que calls OTM (efeito de protecao)
- **Term structure**: Tipicamente crescente em mercados calmos, invertida em crises
- **Volatility smile**: Mais pronunciado em periodos de estresse

### 10.7 Implicacoes para o Bot

- Monitorar IVol-BR/VXBR como indicador de regime e timing
- Implementar estrategia de venda sistematica de variance premium
- Focar em opcoes dos ativos mais liquidos (PETR4, VALE3, indice)
- Utilizar skew como sinal preditivo para direcao do mercado
- Calcular volatilidade implicita vs. realizada para identificar mispricing
- Construir superficie de volatilidade propria para precificacao

---

## 11. Implicacoes para Implementacao no Bot

### 11.1 Hierarquia de Estrategias por Viabilidade

Com base na evidencia empirica e viabilidade de implementacao no mercado brasileiro:

| Prioridade | Estrategia | Evidencia BR | Complexidade | Capital Minimo |
|-----------|-----------|-------------|-------------|----------------|
| 1 | Factor Momentum (WML) | Muito forte | Media | Medio |
| 2 | Rebalanceamento de Indice | Muito forte | Baixa | Baixo |
| 3 | Pairs Trading (Cointegra~ao) | Forte | Media | Medio |
| 4 | Carry Trade Domestico | Forte | Baixa | Baixo |
| 5 | Mean Reversion (OU) | Moderada | Media | Medio |
| 6 | Momentum Time-Series (Futuros) | Moderada | Media | Medio |
| 7 | Arbitragem ADR/BDR | Moderada | Alta | Alto |
| 8 | Volatility Trading | Moderada | Alta | Medio |
| 9 | Event-Driven (Earnings) | Moderada | Media | Medio |
| 10 | Multi-Strategy/Regime | Forte | Muito alta | Alto |
| 11 | Market Making | Limitada | Muito alta | Muito alto |
| 12 | Arbitragem de Indice | Limitada | Muito alta | Muito alto |

### 11.2 Arquitetura Multi-Strategy Recomendada

```
                    +---------------------------+
                    |   REGIME DETECTION (HMM)   |
                    |  Bull / Bear / Neutral     |
                    +-------------|-------------+
                                  |
                    +-------------|-------------+
                    | META-ALLOCATOR             |
                    | Risk Parity + Regime       |
                    +-----|--------|---------|---+
                          |        |         |
              +-----------+  +-----+-----+  +----------+
              |              |           |              |
    +---------|---+  +-------|----+  +---|--------+  +--|--------+
    | MOMENTUM    |  | MEAN REV   |  | CARRY      |  | EVENT    |
    | - WML       |  | - OU       |  | - Juros    |  | - Rebal  |
    | - Trend     |  | - Pairs    |  | - Cambio   |  | - Earn.  |
    | - Dual Mom  |  | - Bollinger|  | - NTN-B    |  | - Divid. |
    +-------------+  +------------+  +------------+  +----------+
```

### 11.3 Dados Necessarios

| Fonte | Tipo de Dado | Frequencia | Custo |
|-------|-------------|------------|-------|
| NEFIN-USP | Fatores de risco (SMB, HML, WML, IML) | Diaria | Gratuito |
| B3 (Market Data) | Cotacoes, livro de ofertas, opcoes | Tempo real | Pago |
| CVM | Eventos corporativos, demonstracoes | Eventual | Gratuito |
| BCB (API) | Selic, IPCA, cambio, curva DI | Diaria | Gratuito |
| Bloomberg/Refinitiv | Dados globais, ADRs, consenso | Tempo real | Pago (caro) |
| Yahoo Finance/Alpha Vantage | Cotacoes historicas | Diaria | Gratuito/Freemium |

### 11.4 Stack Tecnologico Sugerido

- **Linguagem**: Python (principal) + C++ (execucao critica)
- **Dados**: PostgreSQL + TimescaleDB para series temporais
- **Backtesting**: Backtrader, Zipline, ou framework proprietario
- **ML/Stats**: scikit-learn, statsmodels, PyTorch
- **Execucao**: FIX protocol para conexao com B3
- **Monitoramento**: Grafana + Prometheus para metricas em tempo real

---

## 12. Referencias Bibliograficas Completas

### Artigos Academicos e Working Papers

1. **Caldeira, J.F. & Moura, G.V.** (2013). "Selection of a Portfolio of Pairs Based on Cointegration: A Statistical Arbitrage Strategy." *Brazilian Review of Finance*, 11(1), 49-80.
   - URL: https://periodicos.fgv.br/rbfin/article/view/4785
   - Tipo: Artigo academico (peer-reviewed)

2. **da Silva, F.B.S., Ziegelmann, F.A. & Caldeira, J.F.** (2023). "A Pairs Trading Strategy Based on Mixed Copulas." *Quarterly Review of Economics and Finance*, 87, 16-34.
   - URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3070950
   - Tipo: Artigo academico (peer-reviewed)

3. **Salgado, C.** (2025). "Copula-Based Pairs Trading on Brazilian Stock Exchange Equities." *Applied Stochastic Models in Business and Industry*.
   - URL: https://onlinelibrary.wiley.com/doi/10.1002/asmb.70049
   - Tipo: Artigo academico (peer-reviewed)

4. **Fama, E.F. & French, K.R.** (2015). "A Five-Factor Asset Pricing Model." *Journal of Financial Economics*, 116(1), 1-22.
   - URL: https://www.sciencedirect.com/science/article/abs/pii/S0304405X14002323
   - Tipo: Artigo academico seminal

5. **Revista de Contabilidade da UFBA** - "O Modelo de Cinco Fatores de Fama e French e o Fator Momento: Uma Aplicacao ao Mercado Brasileiro."
   - URL: https://periodicos.ufba.br/index.php/rcontabilidade/article/view/42853
   - Tipo: Artigo academico (peer-reviewed)

6. **Urbano, F.R.** (2022). "Fama-French Five Factor Dynamic Betas for Efficient Frontier: An Empirical Approach for Comparison." *SSRN Working Paper*.
   - URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4269284
   - Tipo: Working paper

7. **Oliveira & Lima** - "Cash and Carry -- Arbitragem do Futuro do Indice de Acoes do Ibovespa." *Revista Liceu On-Line*.
   - URL: https://liceu.fecap.br/LICEU_ON-LINE/article/view/1699
   - Tipo: Artigo academico

8. **Lima, M.E.** - "Dupla Negociacao e Arbitragem entre Acoes e ADRs de Empresas Brasileiras." *Dissertacao de Mestrado, UnB*.
   - URL: http://ppgcont.unb.br/images/PPGCCMULTI/mest_dissert_078.pdf
   - Tipo: Dissertacao de mestrado

9. **Sakamoto** - "A diferenca de precos entre ADRs e acoes de empresas brasileiras como oportunidade de arbitragem." *Revista de Financas Aplicadas, FIA*.
   - URL: http://financasaplicadas.fia.com.br/index.php/financasaplicadas/article/view/47
   - Tipo: Artigo academico

10. **Revista Brasileira de Economia de Empresas (UCB)** - "Estrategia de arbitragem entre acoes brasileiras e suas ADRs: a resposta dos dados intraday."
    - URL: https://portalrevistas.ucb.br/index.php/rbee/article/view/4036
    - Tipo: Artigo academico

11. **SciELO/RAC** - "Cointegra~ao e descoberta de precos de ADR brasileiros."
    - URL: https://www.scielo.br/j/rac/a/df8sxHkfWQTKTMSTf57t3WS/
    - Tipo: Artigo academico (peer-reviewed)

12. **Luz** - "Skewness of the Volatility Smile and Stock Returns in Brazil." *International Business Research*.
    - URL: https://ccsenet.org/journal/index.php/ibr/article/view/41872
    - Tipo: Artigo academico (peer-reviewed)

13. **SciELO/RCF** - "Study on the Relationship between the IVol-BR and the Future Returns of the Brazilian Stock Market."
    - URL: https://www.scielo.br/j/rcf/a/f6BGdWZBtTymNX3hGTZg68d/?lang=pt
    - Tipo: Artigo academico (peer-reviewed)

14. **SciELO/RBE** - "Variance Premium and Implied Volatility in a Low-Liquidity Option Market."
    - URL: https://www.scielo.br/j/rbe/a/RjTbzmbfFtJyNSTWgNYmxNQ/
    - Tipo: Artigo academico (peer-reviewed)

15. **BIS Papers No. 81** - "Currency Carry Trades in Latin America." *Bank for International Settlements*.
    - URL: https://www.bis.org/publ/bppdf/bispap81.pdf
    - Tipo: Working paper institucional

16. **BIS Bulletin No. 90** - "The Market Turbulence and Carry Trade Unwind of August 2024."
    - URL: https://www.bis.org/publ/bisbull90.pdf
    - Tipo: Boletim institucional

17. **Moskowitz, T.J., Ooi, Y.H. & Pedersen, L.H.** (2012). "Time Series Momentum." *Journal of Financial Economics*, 104(2), 228-250.
    - URL: https://www.sciencedirect.com/science/article/pii/S0304405X11002613
    - Tipo: Artigo academico seminal

18. **FGV Repositorio** - "Performance de acoes em eventos de rebalanceamento de indice: evidencia do mercado acionario brasileiro."
    - URL: https://repositorio.fgv.br/items/0a793dcd-ddf6-4d66-88a7-29b427a7b786
    - Tipo: Dissertacao/Tese

19. **Investment Analysts Journal** - "Earnings Informativeness in the Brazilian Market: The Influence of Dividends and Financial Constraints."
    - URL: https://www.tandfonline.com/doi/abs/10.1080/10293523.2021.1991129
    - Tipo: Artigo academico (peer-reviewed)

20. **ScienceDirect** - "Does Algorithmic Trading Harm Liquidity? Evidence from Brazil."
    - URL: https://www.sciencedirect.com/science/article/abs/pii/S1062940820301406
    - Tipo: Artigo academico (peer-reviewed)

21. **FIA/B3** - "B3 Programs Help Market Makers Thrive."
    - URL: https://www.fia.org/marketvoice/articles/b3-programs-help-market-makers-thrive
    - Tipo: Artigo institucional

22. **Periodicos FGV/RBFIN** - "Using Hierarchical Risk Parity in the Brazilian Market: An Out-of-Sample Analysis."
    - URL: https://periodicos.fgv.br/rbfin/article/download/89848/84802/201368
    - Tipo: Artigo academico (peer-reviewed)

23. **Jashnani, M.** (2025). "Analysis of the Bollinger Bands and Ornstein-Uhlenbeck Model Mean Reversion Trading Strategy in S&P 500 Equities." *SSRN Working Paper*.
    - URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5713082
    - Tipo: Working paper

24. **AvantGarde Asset Management** - "Fatores que Explicam o Retorno do Fundo AvantGarde Multifatores FIA." *White Paper*.
    - URL: https://www.avantgardeam.com.br/wp-content/uploads/2021/11/WhitePaperAvantgarde.pdf
    - Tipo: White paper (industria)

25. **NEFIN-USP** - "Risk Factors" (dados e metodologia).
    - URL: https://nefin.com.br/data/risk_factors.html
    - Tipo: Base de dados academica

26. **NEFIN-USP** - "Methodology."
    - URL: https://nefin.com.br/resources/NEFIN_methodology.pdf
    - Tipo: Documento metodologico

27. **NEFIN-USP** - "IVol-BR (Volatility Index)."
    - URL: https://nefin.com.br/data/volatility_index.html
    - Tipo: Base de dados academica

28. **BCB Working Paper No. 525** - "Long-Term Stock Returns in Brazil: Volatile Equity Returns for US-Sized Equity Risk Premia."
    - URL: https://www.bcb.gov.br/pec/wps/ingl/wps525.pdf
    - Tipo: Working paper (Banco Central)

29. **Regis, Ospina, Bernardino & Cribari-Neto** (2023). "Asset Pricing in the Brazilian Financial Market Using Five-Factor GAMLSS Modeling." *Empirical Economics*.
    - URL: https://link.springer.com/article/10.1007/s00181-025-02794-1
    - Tipo: Artigo academico (peer-reviewed)

30. **ResearchGate** - "Risk Parity in the Brazilian Market."
    - URL: https://www.researchgate.net/publication/318600763_Risk_Parity_in_the_Brazilian_Market
    - Tipo: Artigo academico

31. **Zhu, X.** (2024). "Examining Pairs Trading Profitability." *Yale Economics Working Paper*.
    - URL: https://economics.yale.edu/sites/default/files/2024-05/Zhu_Pairs_Trading.pdf
    - Tipo: Working paper

32. **Columbia Emerging Markets Review** - "Brazil Carry Trade: How LatAm FX is Reshuffling After BOJ's Wake-Up Call."
    - URL: https://www.columbiaemergingmarketsreview.com/p/brazil-carry-trade-how-latam-fx-is
    - Tipo: Artigo analitico

33. **SBFin** - "A Volatility Index and the Volatility Premium in Brazil."
    - URL: https://sbfin.org.br/files/investimentos-artigo-xv-ebfin-4993.pdf
    - Tipo: Artigo de conferencia academica

34. **Periodicos UFSC** - "Performance of the Fama-French Five-Factor Model in the Brazilian Stock Market."
    - URL: https://periodicos.ufsc.br/index.php/contabilidade/article/download/78962/48094
    - Tipo: Artigo academico (peer-reviewed)

35. **AQR Capital Management** - "Demystifying Managed Futures."
    - URL: https://www.aqr.com/-/media/AQR/Documents/Insights/Journal-Article/Demystifying-Managed-Futures.pdf
    - Tipo: Working paper (industria)

36. **Academia.edu** - "Brazilian Dual-Listed Stocks, Arbitrage and Barriers."
    - URL: https://www.academia.edu/16965810/Brazilian_Dual_Listed_Stocks_Arbitrage_and_Barriers
    - Tipo: Artigo academico

37. **B3** - "Metodologia do Indice Bovespa (Ibovespa)."
    - URL: https://www.b3.com.br/data/files/9C/15/76/F6/3F6947102255C247AC094EA8/IBOV-Metodologia-pt-br__Novo_.pdf
    - Tipo: Documento metodologico oficial

38. **ArXiv** - "Dynamic Factor Allocation Leveraging Regime-Switching Signals."
    - URL: https://arxiv.org/abs/2410.14841
    - Tipo: Preprint academico

39. **Springer** - "Constrained Portfolio Strategies in a Regime-Switching Economy."
    - URL: https://link.springer.com/article/10.1007/s11408-022-00414-x
    - Tipo: Artigo academico (peer-reviewed)

40. **Nelson et al.** - "Stock Market's Price Movement Prediction with LSTM Neural Networks" (aplicacao ao mercado brasileiro, acuracia de 55,9%).
    - URL: https://www.researchgate.net/publication/318329563_Stock_market's_price_movement_prediction_with_LSTM_neural_networks
    - Tipo: Artigo academico

---

> **Nota**: Este documento foi compilado como referencia tecnica para o desenvolvimento de um bot de investimentos quantitativo focado no mercado brasileiro. Todas as estrategias descritas envolvem riscos significativos e devem ser extensivamente backtestadas antes de implementacao em producao. Performance passada nao garante resultados futuros.

> **Ultima atualizacao**: Fevereiro de 2026
