# Regras de Dominio Extraidas - BOT Assessor

**Compilado em:** 2026-02-07
**Fonte:** 7 documentos de pesquisa do projeto BOT Assessor
**Objetivo:** Fornecer regras para o CLAUDE.md que forcam o Claude Code a entender o dominio do trading bot no mercado brasileiro

---

## RESUMO EXECUTIVO POR DOCUMENTO

---

### DOC 01 - Estrutura do Mercado Financeiro Brasileiro

**CONCEITOS-CHAVE DO DOMINIO:**
- B3 (Brasil, Bolsa, Balcao): Unica bolsa de valores do Brasil e maior da America Latina. Monopolio de bolsa (sem fragmentacao como nos EUA).
- PUMA Trading System: Plataforma eletronica principal baseada na arquitetura CME Globex. Algoritmo de price-time priority.
- Segmentos: Listado (bolsa), Balcao (CETIP/renda fixa), Infraestrutura para Financiamento.
- Segmentos de governanca: Basico, Nivel 1, Nivel 2, Novo Mercado (apenas ON).
- Liquidacao: D+2 no Brasil (EUA ja migrou para D+1 em 2024).
- Latencia do matching engine: ~350 microsegundos (2025), meta <300us em 2026. NYSE faz 20-50us.

**REGRAS REGULATORIAS:**
- CVM regula valores mobiliarios; Bacen regula sistema financeiro.
- Robo-trader (execucao de ordens) NAO requer registro na CVM, mas deve operar via corretora autorizada.
- Robo-advisor (recomendacao a terceiros) REQUER registro na CVM (Resolucao CVM 19/21, ICVM 558).
- Algoritmos devem ser testados em ambiente de certificacao da B3 antes de producao.
- Kill switch obrigatorio (capacidade de cancelar todas as ordens imediatamente).

**LIMITES E RESTRICOES:**
- Circuit breaker: 10% queda = 30min; 15% = 1h; 20% = indefinido.
- After-market suspenso desde nov/2025 (exceto vencimento de opcoes).
- After-market (quando vigente): oscilacao maxima 2%, limite R$ 900k por CPF.
- Tuneis de negociacao rejeitam ordens com precos muito fora do mercado.
- Leiloes de volatilidade: 5-15 minutos quando ativo oscila alem dos parametros.

**APIS E DADOS:**
- Protocolos: EntryPoint (B3 BOE) para ordens, UMDF (FIX/FAST) para market data, Binary UMDF (SBE) para market data de baixa latencia.
- DMA 1 (Home broker), DMA 2 (via provedor), DMA 3 (conexao direta), DMA 4 (colocation no datacenter da B3 em Santana de Parnaiba/SP).
- Dados de mercado: Level 1 (best bid/ask), Level 2 (book completo), MBO (market by order).

**UBIQUITOUS LANGUAGE:**
- Acoes ON (sufixo 3), PN (sufixo 4), Units (sufixo 11)
- WIN/IND = mini-indice/indice cheio futuro; WDO/DOL = mini-dolar/dolar cheio futuro
- Call de fechamento = leilao de fechamento (17:55-18:00)
- Spread bid-ask = diferenca entre melhor oferta de compra e venda
- ADTV = Average Daily Trading Volume
- IBOV/Ibovespa = principal indice, 85 ativos, rebalanceamento quadrimestral (jan/mai/set)
- Tick = menor variacao de preco possivel

---

### DOC 02 - Regulamentacao e Compliance para Trading Algoritmico

**CONCEITOS-CHAVE DO DOMINIO:**
- Lei 6.385/1976: Marco legal do mercado de capitais e criacao da CVM.
- Resolucao CVM 35/2021: Intermediacao EXCLUSIVA por instituicoes autorizadas.
- ICVM 8/1979: Base legal para combate a manipulacao (spoofing, layering, wash trading, churning, front running).
- BSM (B3 Supervisao de Mercados): Autorreguladora que supervisiona 100% das ofertas e operacoes.
- Resolucao CVM 50/2021: Prevencao a lavagem de dinheiro (PLD/FTP) com abordagem baseada em risco (ABR).
- LGPD (Lei 13.709/2018): Protecao de dados pessoais.

**REGRAS REGULATORIAS:**
- Multas da CVM: ate R$ 50 milhoes ou 3x a vantagem economica obtida (Lei 13.506/2017).
- Spoofing/Layering = CRIME: reclusao de 1 a 8 anos + multa de ate 3x vantagem ilicita.
- Prescricao: 8 anos a partir da pratica do ilicito.
- Comunicacao ao COAF de operacoes suspeitas em 24 horas.
- Registro de transacoes por minimo 5 anos (AML/PLD).
- Cancel-on-Disconnect: obrigatorio para seguranca de conexoes FIX.
- Programa HFT da B3: registro obrigatorio para HFT, com requisitos minimos de ADV e percentual de day trades por familia de ativos.

**LIMITES E RESTRICOES:**
- Bot NUNCA pode: enviar ordens sem intencao de execucao (spoofing), criar volume artificial (wash trading), usar informacoes privilegiadas (front running).
- Limites de posicao definidos pela B3: formula max[(4 x P2) x Q; 4 x L2].
- Margem: 100% deve ser depositada; aporte em D+1 ate 13h.
- Limites de mensagens por segundo por sessao FIX (throttling).
- Tuneis de negociacao: rejeicao, leilao e protecao.

**APIS E DADOS:**
- Ambiente de certificacao da B3 obrigatorio antes de producao.
- Sessoes FIX para order routing.
- BSM Guia de Alertas v2.0 como referencia para monitoramento.

**UBIQUITOUS LANGUAGE:**
- PNP = Participante de Negociacao Pleno; PL = Participante de Liquidacao
- PLD/FTP = Prevencao a Lavagem de Dinheiro e Financiamento do Terrorismo
- KYC = Know Your Customer; KYP = Know Your Partner; KYE = Know Your Employee
- DARF = Documento de Arrecadacao de Receitas Federais
- PAD = Processo Administrativo Disciplinar
- MRP = Mecanismo de Ressarcimento de Prejuizos
- SISCOAF = Sistema de Informacoes do COAF

---

### DOC 03 - Estrategias Quantitativas

**CONCEITOS-CHAVE DO DOMINIO:**
- Factor Investing: NEFIN-USP fornece fatores gratuitos (Mercado, SMB, HML, WML, IML).
- Momentum (WML): retorno historico de 528% em 10 anos no Brasil vs. -16,32% do mercado. Fator mais persistente.
- Pairs Trading: Estudo Caldeira/Moura (2013) - lucro acumulado de 189,29% em 4 anos com Z-score > 2 desvios.
- Mean Reversion: Processo de Ornstein-Uhlenbeck (OU) com theta > 0.03 e half-life de 5-200 dias.
- Arbitragem de Indice (Cash-and-Carry): F = S * (1 + r - d)^T.
- Rebalanceamento do Ibovespa: inclusao gera +10,4% pre-evento; exclusao gera -20,7% pre-evento.
- Carry Trade: diferencial Selic vs. Fed Funds de ~10pp. BRL entre as 4 moedas mais usadas em carry trade global.
- IVol-BR / VXBR: VIX brasileiro, mede volatilidade implicita de 30 dias do Ibovespa.

**REGRAS DE NEGOCIO:**
- Vencimento de opcoes: 3a sexta-feira do mes (mensal); toda sexta exceto 3a (semanal).
- Vencimento futuros de indice: quarta mais proxima do dia 15 (meses pares: fev/abr/jun/ago/out/dez).
- Vencimento futuros de dolar: 1o dia util do mes.
- Rebalanceamento Ibovespa: quadrimestral (jan/mai/set), previa divulgada 1 mes antes.
- Empresas brasileiras obrigadas a distribuir minimo 25% do lucro liquido como dividendo.
- JCP (Juros sobre Capital Proprio): mecanismo tributario unico do Brasil.

**LIMITES E RESTRICOES:**
- Pairs trading: mercado brasileiro menos liquido; custo de aluguel de acoes pode ser alto.
- Universo limitado: apenas ~100 acoes com liquidez adequada.
- Market making puro requer colocation (DMA 4) - inviavel para bot retail.
- Arbitragem de ADR requer execucao em milissegundos e cobertura cambial.

**UBIQUITOUS LANGUAGE:**
- WML = Winners Minus Losers (fator momentum)
- SMB = Small Minus Big (fator tamanho)
- HML = High Minus Low (fator valor)
- IML = Illiquid Minus Liquid (fator liquidez, unico do BR)
- CTA = Commodity Trading Advisor
- HMM = Hidden Markov Model (deteccao de regimes)
- HRP = Hierarchical Risk Parity

---

### DOC 04 - Machine Learning e IA Aplicados a Trading

**CONCEITOS-CHAVE DO DOMINIO:**
- Gradient Boosting (XGBoost, LightGBM, CatBoost): melhor para dados tabulares financeiros. Acuracia tipica 55-70%.
- LSTM/GRU: deep learning para series temporais. GRU melhor para curto prazo; LSTM para longo prazo.
- Temporal Fusion Transformer (TFT): estado da arte para previsao multi-horizonte com interpretabilidade.
- FinBERT-PT-BR: modelo pre-treinado para sentimento financeiro em portugues (Hugging Face: lucas-leme/FinBERT-PT-BR).
- Reinforcement Learning: PPO para portfolio optimization, FinRL como framework.
- CPCV (Combinatorial Purged Cross-Validation): metodo de validacao de Lopez de Prado, superior ao walk-forward.

**REGRAS DE NEGOCIO (ML):**
- Acuracia > 55% em previsao direcional e considerada significativa; > 70% provavelmente indica overfitting.
- Sharpe > 2.0 sustentado e extremamente raro; maioria dos quant hedge funds opera entre 1.0-2.0.
- Performance de RL em backtests degrada 30-60% em trading real.
- Sentimento baseado em ChatGPT NAO aprimorou previsao out-of-sample do Ibovespa (cautela com LLMs genericos).
- N_features < sqrt(N_amostras) como regra para evitar curse of dimensionality.
- Normalizar APENAS com dados passados (expanding window); NUNCA com dados futuros.

**LIMITES E RESTRICOES:**
- Look-ahead bias: NUNCA usar dados futuros na construcao de features.
- Survival bias: usar datasets point-in-time incluindo empresas delistadas.
- Jane Street Kaggle: restricao de 16ms por iteracao como benchmark de latencia.
- Dados historicos brasileiros: menor profundidade (~20-30 anos de qualidade).
- Dados textuais em portugues: volume muito menor que ingles.

**APIS E DADOS:**
- brapi.dev: API REST brasileira para cotacoes B3 (gratuita/paga).
- dadosdemercado.com.br: banco de dados aberto de investimentos no Brasil.
- NEFIN-USP: fatores de risco diarios gratuitos.
- BCB API: Selic, IPCA, cambio, curva DI (gratuito).
- Google Trends (pytrends): volume de busca como dado alternativo.
- CVM dados abertos: fatos relevantes, demonstracoes financeiras.
- Open Finance Brasil: dados bancarios consentidos.

**UBIQUITOUS LANGUAGE:**
- Alpha = retorno excedente sobre benchmark
- Backtest = simulacao com dados historicos
- PBO = Probability of Backtest Overfitting
- Purging = remocao de amostras sobrepostas treino/teste
- Embargo = gap temporal entre treino e teste
- Slippage = diferenca entre preco esperado e executado
- Meta-labeling = rotulagem secundaria sobre sinais primarios
- Deflated Sharpe Ratio = Sharpe ajustado por multiplas tentativas

---

### DOC 05 - Gestao de Risco

**CONCEITOS-CHAVE DO DOMINIO:**
- VaR (Value at Risk): perda maxima esperada com dado nivel de confianca. NAO e medida coerente.
- CVaR (Conditional VaR / Expected Shortfall): perda media nos cenarios piores que VaR. Medida coerente. Padrao Basel III (FRTB) a 97.5%.
- Maximum Drawdown historico no Brasil: COVID-19 = -46.8%, Crise 2008 = -60%, Joesley Day = -8.8% (1 dia).
- Kelly Criterion: f* = (mu - rf) / sigma^2. Usar 25% Kelly (Quarter Kelly) no mercado BR.
- Hierarchical Risk Parity (HRP): otimizacao de portfolio sem inversao de matriz, mais robusta que Markowitz.
- Black-Litterman: combina retornos de equilibrio com views do modelo de alpha via inferencia Bayesiana.
- DCC-GARCH: correlacoes dinamicas no tempo (Engle, 2002).
- GJR-GARCH com t-Student: melhor modelo de volatilidade para Ibovespa (captura leverage effect).

**REGRAS DE NEGOCIO (RISCO):**
- CVaR a 97.5% como metrica PRIMARIA de risco (nao VaR).
- Backtesting VaR: zona verde de Basel = ate 4 violacoes em 250 dias (VaR 99%).
- Calmar Ratio minimo = 1.5; se < 1.0 por 3 meses, reduzir exposicao 50%.
- Fixed Fractional: NUNCA mais que 5% do capital em uma unica operacao.
- Parametros tipicos Ibovespa GARCH: alpha 0.05-0.15, beta 0.80-0.93.
- Curtose do Ibovespa: 5-8 em crises (normal = 3). Usar distribuicao t-Student com df=5 para Monte Carlo.
- Correlacoes em crises convergem para 0.8-0.95 (diversificacao "desaparece").

**LIMITES E RESTRICOES (CIRCUIT BREAKERS DO BOT):**
- Nivel 1 - Diario: perda > 3% = reduzir 50%; > 5% = pausar 24h; > 7% = fechar tudo e pausar 48h.
- Nivel 2 - Semanal: perda > 5% = revisar; > 8% = reduzir 50%; > 12% = modo emergencia.
- Nivel 3 - Mensal: DD > 10% = alerta; > 15% = modo conservador 30 dias; > 20% = desligamento total.
- Nivel 4 - Mercado: Ibovespa -5% = reduzir 50%; -10% = fechar longs; VXBR > 40 = modo protecao; USD/BRL +3% = alerta.
- Drawdown-based sizing: 0-5% = 100%; 5-10% = 75%; 10-15% = 50%; 15-20% = 25%; >20% = desligar.
- Diversificacao: max 25% por setor.

**CENARIOS DE STRESS HISTORICOS:**
- Crise Asiatica 1997: Ibov -25%, USD +20%, Selic +45%
- Crise Russa 1998: Ibov -40%, USD +65%
- Eleicao Lula 2002: Ibov -30%, USD +53%
- Subprime 2008: Ibov -60%, USD +45%
- Joesley Day 2017: Ibov -8.8% (1d), USD +8% (1d)
- COVID-19 2020: Ibov -46.8%, USD +30%

**UBIQUITOUS LANGUAGE:**
- MDD = Maximum Drawdown
- Calmar Ratio = Retorno Anualizado / |MDD|
- Ulcer Index = sqrt(media dos drawdowns^2)
- VRP = Variance Risk Premium (IV^2 - RV^2)
- VXBR = S&P/B3 Ibovespa VIX (volatilidade implicita 30d)
- IVol-BR = indice de volatilidade implicita do NEFIN-USP

---

### DOC 06 - Infraestrutura, APIs e Dados

**CONCEITOS-CHAVE DO DOMINIO:**
- Cedro Technologies (Plataforma Anywhere): principal provedor de API para B3, suporta REST/WebSocket/FIX 4.4.
- Nelogica/Profit (ProfitDLL): plataforma mais popular entre traders BR, DLL para Delphi/C/Python, NTSL.
- B3 UMDF: market data oficial; Binary UMDF (SBE) = menor latencia; FIX/FAST = legado.
- brapi.dev: API REST especializada B3, plano gratuito ate Pro (~R$ 299/mes), 400+ ativos.
- BCB SGS: fonte oficial dados macroeconomicos, API REST gratuita sem autenticacao.
- QuestDB: melhor time-series DB para dados financeiros (ASOF JOIN nativo, 12-36x mais rapido que InfluxDB).
- Equinix SP3: datacenter do matching engine da B3; colocation = menor latencia possivel.

**APIS E DADOS (DETALHADO):**
| Fonte | Tipo | Custo | Observacao |
|-------|------|-------|-----------|
| brapi.dev | Cotacoes B3, fundamentalistas | Free-R$299/mes | Melhor custo-beneficio |
| Yahoo Finance (yfinance) | Cotacoes historicas | Gratuito | Sem SLA, pode ser bloqueado |
| BCB SGS | Selic, IPCA, cambio, PTAX | Gratuito | Fonte oficial |
| BCB Focus (OData) | Expectativas de mercado | Gratuito | Consenso do mercado |
| CVM dados.cvm.gov.br | DFP, ITR, FCA, FRE | Gratuito | Fonte oficial, CSV/XBRL |
| IBGE SIDRA | PIB, IPCA, emprego | Gratuito | API REST |
| Tesouro Transparente | Titulos publicos, fiscal | Gratuito | API REST/JSON |
| IPEADATA | Series macroeconomicas longas | Gratuito | Desde 1900+ |
| NEFIN-USP | Fatores de risco BR | Gratuito | Diario |
| Bloomberg | Dados globais completos | ~USD 20k/ano | Custo proibitivo para retail |
| B3 UMDF direto | Market data oficial L1/L2 | R$500-50k+/mes | Complexo de integrar |
| Cedro Technologies | Trading API + market data | Sob consulta | REST/WebSocket/FIX |
| Economatica | Fundamentalistas desde 1986 | R$2-10k/mes | Referencia academica |

**PROTOCOLOS:**
- FIX 4.4: padrao global, texto, ~80us via matching engine, suportado por QuickFIX.
- B3 Binary Gateway (SBE): <25us em colocation, maior capacidade.
- UMDF Binary (SBE): market data de menor latencia.
- REST/WebSocket: para estrategias de media/baixa frequencia via Cedro ou brapi.

**ARMAZENAMENTO:**
- QuestDB: recomendado para dados financeiros (ASOF JOIN, SQL nativo, performance excepcional).
- TimescaleDB: alternativa solida se ja usa PostgreSQL (sem ASOF JOIN).
- Apache Parquet: formato colunar para data lake.
- Apache Arrow: formato em memoria para processamento rapido.

**CUSTOS DE INFRAESTRUTURA:**
- Colocation Equinix SP3: R$ 30k-80k/mes (HFT).
- Cloud AWS sa-east-1: escalavel, adequado para swing/position trade.
- Bare metal Sao Paulo: latencia previsivel, bom para day trade automatizado.

**UBIQUITOUS LANGUAGE:**
- UMDF = Unified Market Data Feed
- SBE = Simple Binary Encoding
- DMA = Direct Market Access (modelos 1-4)
- PTAX = taxa de cambio oficial BCB
- SGS = Sistema Gerenciador de Series Temporais (BCB)
- OHLCV = Open, High, Low, Close, Volume
- ASOF JOIN = join por timestamp mais proximo

---

### DOC 07 - Tributacao e Custos Operacionais

**CONCEITOS-CHAVE DO DOMINIO:**
- Swing Trade: 15% IR sobre lucro, isencao vendas ate R$ 20k/mes (APENAS acoes a vista PF).
- Day Trade: 20% IR sobre lucro, SEM isencao. IRRF de 1% sobre lucro ("dedo-duro").
- Separacao obrigatoria: prejuizo DT so compensa DT; prejuizo ST so compensa ST.
- Prejuizos nao expiram e podem ser carregados indefinidamente.
- DARF mensal codigo 6015, vencimento ultimo dia util do mes seguinte.
- Preco medio ponderado (NAO FIFO) para calculo de custo de aquisicao.
- Lei 15.270/2025 (vigente): IRRF 10% sobre dividendos > R$ 50k/mes por fonte pagadora (PF), a partir de 2026.
- MP 1.303/2025 CADUCOU: regras anteriores mantidas integralmente.

**REGRAS POR TIPO DE ATIVO:**
| Ativo | Swing | Day Trade | Isencao 20k | IRRF Swing |
|-------|-------|-----------|-------------|------------|
| Acoes | 15% | 20% | SIM | 0,005% |
| FIIs | 20% | 20% | NAO | 0,005% |
| ETFs RV | 15% | 20% | NAO | 0,005% |
| BDRs | 15% | 20% | NAO | 0,005% |
| Opcoes | 15% | 20% | NAO | 0,005% |
| Futuros | 15% | 20% | NAO | 0,005% |

**CUSTOS B3 (TARIFAS):**
- Acoes swing (ADTV < R$3M): 0,030% total (negociacao + liquidacao + registro).
- Acoes day trade (ADTV < R$200k): 0,023% total.
- Mini-indice WIN: ~R$ 0,32/contrato normal; ~R$ 0,16 day trade.
- Mini-dolar WDO: ~R$ 0,82/contrato normal; ~R$ 0,41 day trade.

**RLP (Retail Liquidity Provider):**
- Corretora como contraparte das ordens de varejo.
- Viabiliza corretagem zero.
- Riscos ocultos: spread, conflito de interesses, slippage.

**RENDA FIXA (tabela regressiva mantida):**
- Ate 180d: 22,5%; 181-360d: 20%; 361-720d: 17,5%; >720d: 15%.
- LCI/LCA/CRI/CRA: ISENTOS de IR para PF.
- FIIs rendimentos: ISENTOS para PF (min 100 cotistas, max 10% cotas).

**OTIMIZACAO FISCAL:**
- Tax Loss Harvesting: Brasil NAO tem regra de wash sale formal.
- Gestao da isencao R$ 20k: adiar vendas quando proximo do limite mensal.
- Fracionar vendas entre meses para manter abaixo de R$ 20k.
- Realizar prejuizos antes de lucros no mesmo mes.

**PF vs PJ:**
- PF geralmente mais vantajosa para trading (isencao R$20k, isencao FIIs, compensacao ilimitada).
- PJ Lucro Presumido: 24-34% (IRPJ + CSLL), sem isencoes.
- PJ Lucro Real: ~34%, compensacao limitada a 30% do lucro.
- Simples Nacional: NAO indicado para trading.

**UBIQUITOUS LANGUAGE:**
- IRRF = Imposto de Renda Retido na Fonte
- DARF = Documento de Arrecadacao de Receitas Federais (codigo 6015 para PF)
- DT = Day Trade; ST = Swing Trade
- JCP = Juros sobre Capital Proprio (15% IRRF definitivo)
- Come-cotas = antecipacao semestral de IR em fundos (maio e novembro)
- PM = Preco Medio (custo medio ponderado de aquisicao)
- RLP = Retail Liquidity Provider
- Tax Loss Harvesting = realizacao estrategica de prejuizos

---

## LISTA CONSOLIDADA DE REGRAS DE DOMINIO PARA CLAUDE.MD

As regras abaixo devem ser incorporadas ao CLAUDE.md para garantir que o Claude Code entenda o dominio do trading bot no mercado brasileiro.

---

### REGRA 1 - ESTRUTURA DO MERCADO

```
O mercado brasileiro opera na B3, a UNICA bolsa de valores do Brasil.
- NAO existe fragmentacao de venues como nos EUA (sem smart order routing).
- Liquidacao e D+2 (diferente dos EUA que e D+1).
- O bot DEVE operar exclusivamente atraves de corretora autorizada pela CVM.
- Acoes ON (sufixo 3), PN (sufixo 4), Units (sufixo 11).
- Ticker de opcoes: XXXXMYY (A-L = calls jan-dez, M-X = puts jan-dez).
- Mini-indice (WIN): R$ 0,20/ponto, variacao minima 5 pontos, vencimento meses pares.
- Mini-dolar (WDO): R$ 10,00/ponto, variacao minima 0,5 ponto, vencimento mensal.
```

### REGRA 2 - HORARIOS DE NEGOCIACAO

```
Grade horaria vigente (desde nov/2025):
- Acoes pre-abertura: 09:30-10:00
- Acoes sessao continua: 10:00-17:55
- Acoes call de fechamento: 17:55-18:00
- Futuros indice (WIN/IND): 09:00-18:25
- Futuros dolar (WDO/DOL): 09:00-18:30
- Opcoes sobre acoes: 10:00-17:55

O bot DEVE respeitar esses horarios e NAO enviar ordens fora deles.
Quarta-feira de Cinzas: sessao reduzida 13:00-17:55.
```

### REGRA 3 - CIRCUIT BREAKERS E LEILOES

```
Circuit breaker da B3 (sobre Ibovespa):
- Queda 10% = paralisacao 30 minutos
- Queda 15% = paralisacao 1 hora
- Queda 20% = prazo indeterminado

O bot DEVE detectar e suspender operacoes quando Ibovespa cair > 8%.
O bot DEVE detectar leiloes de volatilidade e NAO enviar ordens durante leiloes.
O bot DEVE implementar kill switch proprio (cancelar todas as ordens instantaneamente).
```

### REGRA 4 - REGULAMENTACAO E COMPLIANCE

```
O bot NAO pode:
- Fazer spoofing (ordens sem intencao de execucao) - CRIME: 1-8 anos de reclusao
- Fazer layering (camadas de ordens artificiais)
- Fazer wash trading (compra e venda do mesmo comitente)
- Fazer front running (uso de informacao privilegiada)
- Fazer churning (operacoes excessivas para gerar comissao)

O bot DEVE:
- Manter registros de TODAS as operacoes por minimo 5 anos
- Operar via corretora autorizada pela CVM (RCVM 35/2021)
- Respeitar limites de posicao da B3
- Respeitar limites de margem (100% depositada, D+1 ate 13h)
- Implementar controles pre-trade: limite de posicao, loss limit, price collar
- Ter cancel-on-disconnect habilitado
- Ser testado em ambiente de certificacao da B3 antes de producao
```

### REGRA 5 - TRIBUTACAO OBRIGATORIA

```
Aliquotas de IR:
- Swing Trade: 15% sobre lucro liquido
- Day Trade: 20% sobre lucro liquido

Isencao R$ 20k/mes:
- Aplica-se APENAS a acoes no mercado a vista (swing trade, PF)
- Sobre VALOR TOTAL DE VENDAS no mes, NAO sobre lucro
- Se vendas > R$ 20k, TODO o lucro do mes e tributado
- NAO se aplica a: day trade, opcoes, futuros, ETFs, FIIs, BDRs

Separacao obrigatoria:
- Prejuizo DT so compensa lucro DT
- Prejuizo ST so compensa lucro ST
- Prejuizos podem ser carregados indefinidamente

DARF mensal:
- Codigo 6015 (PF)
- Vencimento: ultimo dia util do mes seguinte
- IRRF DT: 1% sobre lucro (dedo-duro)
- IRRF ST: 0,005% sobre valor de venda

Preco medio: calculo por custo medio ponderado (NAO FIFO).

FIIs: 20% sobre ganho de capital; rendimentos ISENTOS para PF (com requisitos).
Dividendos: IRRF 10% se > R$ 50k/mes por fonte (Lei 15.270/2025, vigente 2026).
JCP: 15% IRRF definitivo.
```

### REGRA 6 - CUSTOS OPERACIONAIS

```
Taxas B3 (mercado a vista):
- Swing trade (ADTV < R$ 3M): ~0,030% do volume
- Day trade (ADTV < R$ 200k): ~0,023% do volume

Minicontratos:
- WIN normal: ~R$ 0,32/contrato; day trade: ~R$ 0,16
- WDO normal: ~R$ 0,82/contrato; day trade: ~R$ 0,41

Corretagem: R$ 0 na maioria das corretoras (via RLP).
RLP: corretora como contraparte - risco de spread e conflito de interesses.

O bot DEVE incluir custos realistas em TODOS os backtests:
- Taxas B3
- Spread bid-ask estimado
- Slippage esperado
- IR sobre lucro
```

### REGRA 7 - GESTAO DE RISCO OBRIGATORIA

```
Metrica primaria de risco: CVaR a 97.5% (NAO VaR sozinho).
Modelo de volatilidade: GJR-GARCH(1,1) com distribuicao t-Student (df=5 para Brasil).

Position sizing:
- Quarter Kelly (25% do Kelly Criterion) no maximo
- NUNCA mais que 5% do capital em uma unica operacao
- Fixed Fractional: 0.5%-2% por operacao tipicamente

Circuit breakers do bot:
- Perda diaria > 3%: reduzir 50% novas operacoes
- Perda diaria > 5%: pausar 24 horas
- Perda diaria > 7%: fechar tudo, pausar 48h
- Drawdown > 20%: desligamento total ate revisao manual
- VXBR > 40: modo de protecao ativado
- Ibovespa -10% intraday: fechar todas posicoes long

Diversificacao: max 25% por setor.
Drawdown sizing: reduzir posicoes progressivamente com drawdown.
Stress testing: testar cenarios historicos (COVID, Joesley, Subprime) e hipoteticos.
```

### REGRA 8 - ESTRATEGIAS QUANTITATIVAS

```
Hierarquia de estrategias por evidencia no Brasil:
1. Factor Momentum (WML) - evidencia muito forte
2. Rebalanceamento de Indice - evidencia muito forte
3. Pairs Trading (Cointegracao) - evidencia forte
4. Carry Trade Domestico - evidencia forte
5. Mean Reversion (OU) - evidencia moderada
6. Momentum Time-Series (futuros) - evidencia moderada

Regime switching: usar HMM para detectar Bull/Bear/Neutro.
- Bull: preferir momentum, trend following
- Bear: preferir mean reversion, volatility
- Alta vol: preferir pairs, volatility trading
- Crise: momentum time-series (short), tail hedge

Universo de ativos: foco nos componentes do Ibovespa (85 ativos liquidos).
Evitar: small/micro caps com volume < R$ 5M/dia.
```

### REGRA 9 - MACHINE LEARNING

```
Pipeline recomendado:
1. Baseline: LightGBM para dados tabulares
2. Enhancement: Ensemble (XGBoost + LightGBM + CatBoost) + LSTM/GRU
3. Advanced: TFT + FinBERT-PT-BR + PPO (FinRL)

Validacao OBRIGATORIA:
- Usar Purged K-Fold ou CPCV (NUNCA KFold padrao para dados temporais)
- Embargo entre treino e teste >= volatility half-life
- Normalizar APENAS com dados passados (expanding window)
- NUNCA usar dados futuros na construcao de features (look-ahead bias)
- Calcular PBO (Probability of Backtest Overfitting) < 0.3

Thresholds realistas:
- Acuracia direcional > 55% e significativa; > 70% provavelmente overfitting
- Sharpe > 2.0 sustentado e extremamente raro
- Win rate > 52% ja e relevante pos-custos
```

### REGRA 10 - INFRAESTRUTURA E APIs

```
APIs prioritarias para o bot:
- brapi.dev: cotacoes B3, fundamentalistas (REST, Free-Pro)
- BCB SGS: Selic, IPCA, cambio (REST, gratuito)
- BCB Focus: expectativas de mercado (OData, gratuito)
- CVM dados.cvm.gov.br: demonstracoes financeiras (CSV, gratuito)
- NEFIN-USP: fatores de risco diarios (gratuito)
- yfinance: cotacoes historicas B3 (sufixo .SA, gratuito, sem SLA)

Para execucao:
- Cedro Technologies (Anywhere): REST/WebSocket/FIX para B3 (via corretoras)
- Nelogica/Profit (ProfitDLL): DLL para Python, dados tick-by-tick 90 dias

Armazenamento:
- QuestDB para time-series (ASOF JOIN nativo, performance excepcional)
- PostgreSQL + TimescaleDB como alternativa
- Apache Parquet para data lake

Stack tecnologico:
- Python (principal) + C++ (execucao critica)
- LightGBM/XGBoost/CatBoost para ML tabular
- PyTorch para deep learning
- FinBERT-PT-BR para NLP (Hugging Face)
- stable-baselines3 para RL
- FIX protocol para conexao B3
```

### REGRA 11 - CALENDARIO E SAZONALIDADE

```
Datas criticas:
- Vencimento opcoes acoes: 3a sexta-feira do mes
- Vencimento futuros indice: quarta mais proxima do 15 (meses pares)
- Vencimento futuros dolar: 1o dia util do mes
- Rebalanceamento Ibovespa: janeiro, maio, setembro (previa 1 mes antes)
- COPOM: 8 reunioes/ano (eventos de alto impacto)
- Come-cotas fundos: ultimo dia util maio e novembro
- DARF mensal: ultimo dia util do mes seguinte
- IRPF anual: marco-abril

Sazonalidade:
- Liquidez intraday em "U": alta 10:00-10:30, baixa 10:30-14:00, alta 14:00-17:55
- Abertura mercado EUA (11:30 ou 12:30 BRT) impacta commodities (VALE3, PETR4)
- 2o semestre concentra maiores dividendos
- Efeito virada de mes: retornos positivos nos ultimos/primeiros dias do mes
- Earnings seasons: fev-mar (4T), maio (1T), agosto (2T), novembro (3T)
```

### REGRA 12 - GLOSSARIO UBIQUITOUS LANGUAGE (PT-BR)

```
TERMOS DO MERCADO:
- B3 = Brasil, Bolsa, Balcao (unica bolsa do Brasil)
- Ibovespa/IBOV = principal indice de acoes (~85 ativos)
- Selic = taxa basica de juros do Brasil
- COPOM = Comite de Politica Monetaria (define Selic)
- PTAX = taxa de cambio oficial do BCB
- CDI = Certificado de Deposito Interbancario (benchmark renda fixa)
- CVM = Comissao de Valores Mobiliarios (regulador)
- Bacen/BCB = Banco Central do Brasil
- BSM = B3 Supervisao de Mercados (autorreguladora)

TERMOS DE TRADING:
- Day Trade (DT) = compra e venda no mesmo dia
- Swing Trade (ST) = operacao com mais de 1 dia
- Book de ofertas = livro de ordens de compra e venda
- Spread bid-ask = diferenca entre melhor compra e melhor venda
- Slippage = diferenca entre preco esperado e executado
- Call de fechamento = leilao de fechamento da B3
- Margem = garantia exigida pela B3 para derivativos
- Ajuste diario = mark-to-market em futuros

TERMOS TRIBUTARIOS:
- DARF = guia de recolhimento de imposto (codigo 6015)
- IRRF = imposto retido na fonte (dedo-duro)
- PM = preco medio ponderado de aquisicao
- JCP = Juros sobre Capital Proprio
- Come-cotas = antecipacao semestral de IR em fundos
- Tax Loss Harvesting = realizacao estrategica de prejuizos

TERMOS TECNICOS:
- DMA = Direct Market Access (modelos 1-4)
- FIX = Financial Information eXchange (protocolo)
- SBE = Simple Binary Encoding (protocolo binario B3)
- UMDF = Unified Market Data Feed (market data B3)
- OHLCV = Open, High, Low, Close, Volume
- VWAP = Volume-Weighted Average Price
- TWAP = Time-Weighted Average Price
- ATR = Average True Range

TERMOS QUANTITATIVOS:
- Alpha = retorno excedente sobre benchmark
- Sharpe Ratio = retorno ajustado ao risco
- Calmar Ratio = retorno anualizado / max drawdown
- MDD = Maximum Drawdown
- CVaR/ES = Conditional VaR / Expected Shortfall
- VRP = Variance Risk Premium (IV^2 - RV^2)
- HMM = Hidden Markov Model (deteccao de regimes)
- CPCV = Combinatorial Purged Cross-Validation
- PBO = Probability of Backtest Overfitting
- HRP = Hierarchical Risk Parity
- WML = Winners Minus Losers (fator momentum)
```

### REGRA 13 - CONTROLES PRE-TRADE OBRIGATORIOS

```
CONTROLES PRE-TRADE (OBRIGATORIOS):
[x] Limite maximo de posicao por ativo
[x] Limite maximo de perda diaria (loss limit)
[x] Limite de tamanho de ordem individual
[x] Verificacao de margem disponivel antes de cada ordem
[x] Price collar (rejeicao de ordens fora do tunel)
[x] Rate limiting (controle de frequencia de ordens)

CONTROLES DE SEGURANCA:
[x] Kill switch (interrupcao total imediata)
[x] Circuit breaker proprio (pausa em condicoes adversas)
[x] Cancel-on-disconnect (cancelar ordens se perder conexao)
[x] Monitoramento de P&L em tempo real
[x] Alertas automaticos para anomalias
[x] Log completo de todas as decisoes e ordens

CONTROLES POS-TRADE:
[x] Reconciliacao de posicoes
[x] Analise de execucao (slippage, market impact)
[x] Relatorio de compliance diario
[x] Arquivamento de logs por 5+ anos
```

### REGRA 14 - MODULO FISCAL OBRIGATORIO

```
O bot DEVE implementar modulo fiscal com:
1. Registro de TODAS operacoes com timestamp completo (classificacao DT/ST)
2. Calculo de preco medio ponderado por ativo (considerando eventos corporativos)
3. Apuracao mensal separada DT e ST com saldos de prejuizo independentes
4. Verificacao de isencao R$ 20k/mes (apenas acoes a vista swing trade)
5. Calculo de IRRF retido (0,005% swing / 1% DT)
6. Geracao de DARF mensal codigo 6015
7. Tax loss harvesting automatizado (Brasil nao tem wash sale rule)
8. Gestao de isencao mensal R$ 20k (adiar vendas quando proximo do limite)
9. Tratamento de eventos corporativos (dividendos, JCP, bonificacoes, splits)
10. Relatorios para IRPF anual
11. Armazenamento historico por minimo 5 anos
12. Monitoramento limite R$ 50k/mes para tributacao de dividendos (Lei 15.270/2025)
```

### REGRA 15 - PARTICULARIDADES DO MERCADO BRASILEIRO

```
O mercado brasileiro tem especificidades que DEVEM ser consideradas:

1. MONOPOLIO DE BOLSA: B3 e a unica bolsa - sem roteamento entre venues.
2. TAXA DE JUROS ELEVADA: Selic historicamente entre 2% e 14,75%+ - impacta custo de oportunidade.
3. RISCO CAMBIAL: Exposicao USD/BRL em ativos dolarizados (VALE3, PETR4).
4. CONCENTRACAO: Poucos ativos (VALE3, PETR4, ITUB4, BBDC4) dominam o volume.
5. FLUXO ESTRANGEIRO: ~58-60% do volume; principal driver de direcao.
6. CORRELACAO COM EUA: Forte, especialmente na sobreposicao de horarios.
7. HORARIO DE VERAO ASSIMETRICO: Brasil aboliu (2019), EUA mantem - impacta derivativos.
8. CAUDAS PESADAS: Curtose do Ibovespa de 5-8 em crises (usar t-Student, nao Normal).
9. LEVERAGE EFFECT: Noticias negativas geram mais volatilidade (usar GJR-GARCH).
10. LIQUIDEZ LIMITADA: Spread bid-ask maior que mercados desenvolvidos.
11. DERIVATIVOS SOFISTICADOS: Mercado herdado da BM&F, liquido em futuros e cambio.
12. DIVIDENDOS OBRIGATORIOS: Minimo 25% do lucro liquido por lei.
```

---

*Documento gerado automaticamente a partir da analise de 7 documentos de pesquisa do projeto BOT Assessor. Atualizado em 2026-02-07.*
