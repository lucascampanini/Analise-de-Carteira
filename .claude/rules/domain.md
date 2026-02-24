# Regras de Dominio - BOT Assessor (Mercado Financeiro Brasileiro)

## Mercado Brasileiro (B3)
- B3 e a UNICA bolsa do Brasil (monopolio, sem fragmentacao de venues)
- Liquidacao D+2 (diferente dos EUA que e D+1)
- Bot opera EXCLUSIVAMENTE via corretora autorizada pela CVM
- Matching engine: PUMA Trading System, price-time priority

## Horarios de Negociacao (desde nov/2025)
- Acoes: pre-abertura 09:30, sessao 10:00-17:55, call de fechamento 17:55-18:00
- Futuros indice (WIN/IND): 09:00-18:25
- Futuros dolar (WDO/DOL): 09:00-18:30
- NUNCA enviar ordens fora desses horarios
- Quarta de Cinzas: sessao reduzida 13:00-17:55

## Compliance (CRITICO - Violacoes sao CRIME)
- NUNCA: spoofing, layering, wash trading, front running, churning
- Spoofing = CRIME: 1-8 anos de reclusao + multa 3x vantagem
- Kill switch OBRIGATORIO
- Registros por MINIMO 5 anos
- Cancel-on-disconnect habilitado
- Testar em ambiente de certificacao B3 antes de producao

## Controles Pre-Trade OBRIGATORIOS
- Limite maximo de posicao por ativo
- Limite maximo de perda diaria (loss limit)
- Limite de tamanho de ordem individual
- Verificacao de margem antes de cada ordem
- Price collar (rejeitar ordens fora do tunel)
- Rate limiting de ordens

## Tributacao
- Swing Trade: 15% IR sobre lucro (isencao R$20k/mes APENAS acoes a vista PF)
- Day Trade: 20% IR sobre lucro (SEM isencao)
- Prejuizo DT compensa APENAS DT; ST compensa APENAS ST
- Preco medio: custo medio ponderado (NAO FIFO)
- DARF mensal codigo 6015 (ultimo dia util do mes seguinte)
- FIIs: 20% ganho capital; rendimentos ISENTOS PF (com requisitos)
- Bot DEVE ter modulo fiscal automatizado

## Gestao de Risco
- CVaR 97.5% como metrica PRIMARIA (nao VaR sozinho)
- GJR-GARCH(1,1) com t-Student (df=5) para volatilidade Ibovespa
- Quarter Kelly (25% Kelly) para position sizing
- NUNCA mais de 5% do capital em uma operacao
- Max 25% por setor

### Circuit Breakers do Bot
- Perda diaria > 3%: reduzir 50% novas operacoes
- Perda diaria > 5%: pausar 24 horas
- Perda diaria > 7%: fechar tudo, pausar 48h
- Drawdown > 20%: desligamento total ate revisao manual
- VXBR > 40: modo protecao
- Ibovespa -10% intraday: fechar todas posicoes long

### Drawdown-Based Sizing
- 0-5% DD: 100% alocacao
- 5-10% DD: 75%
- 10-15% DD: 50%
- 15-20% DD: 25%
- >20% DD: 0% (desligar)

## Estrategias por Evidencia no Brasil
1. Factor Momentum (WML) - evidencia muito forte
2. Rebalanceamento de Indice - evidencia muito forte
3. Pairs Trading (Cointegracao) - evidencia forte
4. Carry Trade Domestico - evidencia forte
5. Mean Reversion (Ornstein-Uhlenbeck) - evidencia moderada

## ML/AI
- LightGBM como baseline para dados tabulares
- CPCV ou Purged K-Fold para validacao (NUNCA KFold padrao)
- NUNCA usar dados futuros em features (look-ahead bias)
- Normalizar APENAS com dados passados (expanding window)
- Acuracia > 70% provavelmente indica overfitting
- Sharpe > 2.0 sustentado e extremamente raro
- Backtests DEVEM incluir custos realistas (taxas B3 + spread + slippage + IR)

## APIs Prioritarias
- brapi.dev: cotacoes B3 (REST, Free-Pro)
- BCB SGS: Selic, IPCA, cambio (REST, gratuito)
- BCB Focus: expectativas de mercado (OData, gratuito)
- CVM dados.cvm.gov.br: demonstracoes financeiras (CSV, gratuito)
- NEFIN-USP: fatores de risco diarios (gratuito)
- yfinance: historico B3 (sufixo .SA, sem SLA)
- Cedro Technologies: execucao via B3 (REST/WebSocket/FIX)

## Calendario Critico
- Vencimento opcoes: 3a sexta-feira do mes
- Vencimento futuros indice: quarta mais proxima do 15 (meses pares)
- Vencimento futuros dolar: 1o dia util do mes
- Rebalanceamento Ibovespa: jan/mai/set (previa 1 mes antes)
- COPOM: 8 reunioes/ano (alto impacto)
- DARF: ultimo dia util do mes seguinte
- Liquidez intraday em "U": alta inicio/fim, baixa no meio
