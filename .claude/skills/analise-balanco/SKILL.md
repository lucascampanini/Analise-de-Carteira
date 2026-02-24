---
name: analise-balanco
description: Cria e executa o modulo completo de analise de balanco patrimonial de empresas brasileiras (B3). Implementa Domain Entities, Use Cases CQRS, Adapters (CVM/brapi) e testes.
disable-model-invocation: true
user-invocable: true
---

# Analise de Balanco Patrimonial - BOT Assessor

Implemente o modulo completo de analise de balanco de empresas da B3: `$ARGUMENTS`

## Escopo do Modulo

### Domain Layer (src/domain/)
1. **Entities**: Company, BalanceSheet, IncomeStatement, FinancialAnalysis
2. **Value Objects**: Ticker, CNPJ, Money, Ratio, FiscalPeriod, AnalysisScore
3. **Domain Service**: BalanceSheetAnalyzer (calcula indicadores e scores)
4. **Domain Events**: AnalysisCompleted, CompanyEvaluated
5. **Specifications**: MinimumLiquiditySpec, SolvencySpec, ProfitabilitySpec

### Indicadores Financeiros Obrigatorios
- **Liquidez**: Corrente, Seca, Imediata, Geral
- **Endividamento**: Divida/PL, Divida/Ativos, Cobertura de Juros
- **Rentabilidade**: ROE, ROA, ROIC, Margem Liquida, Margem EBITDA
- **Eficiencia**: Giro do Ativo, Giro de Estoques, PMR, PMP
- **Valuation**: P/L, P/VP, EV/EBITDA, Dividend Yield
- **Piotroski F-Score** (0-9 pontos)
- **Altman Z-Score** (adaptado Brasil)

### Application Layer (src/application/)
- Command: AnalyzeCompanyBalanceSheet (com idempotency_key)
- Query: GetCompanyAnalysis, ListAnalyzedCompanies, CompareCompanies
- Ports outbound: FinancialDataProvider, CompanyRepository, AnalysisRepository

### Adapters (src/adapters/)
- CVM dados.cvm.gov.br (demonstracoes financeiras CSV, gratuito)
- brapi.dev (cotacoes, dados fundamentalistas)
- yfinance (historico, fallback)
- PostgreSQL Repository (SQLAlchemy)
- REST API (FastAPI endpoints)

### Testes (TDD)
- Unit tests para domain (sem mocks, logica pura)
- Unit tests para handlers (com Fakes/InMemory)
- Integration tests para adapters (Testcontainers)

## Regras
- Seguir TODA a documentacao em docs/ e .claude/rules/
- TDD: escrever testes ANTES da implementacao
- Arquitetura Hexagonal com Dependency Rule
- Rich Domain Model (NUNCA anemico)
- CQRS rigoroso
