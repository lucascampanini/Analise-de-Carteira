# Analise de Carteira - Sistema de Análise de Carteira de Clientes

## Visao Geral
Sistema de alto nível para assessores de investimento analisarem carteiras de clientes.
Permite diagnóstico de alocação, risco, performance, aderência ao perfil e geração de recomendações fundamentadas.
O projeto segue DDD, Arquitetura Hexagonal, CQRS e práticas rigorosas de engenharia de software.

## Objetivo do Negócio
- Assessor cadastra cliente com seu perfil de investidor (conservador, moderado, arrojado)
- Sistema ingere a carteira atual do cliente (posições, ativos, valores)
- Sistema analisa: alocação, concentração, risco (CVaR), performance, aderência ao perfil
- Sistema gera relatório com diagnóstico e recomendações de rebalanceamento
- Assessor usa o relatório para embasar reunião com o cliente

## Stack Tecnologico
- **Linguagem**: Python 3.12+
- **Framework Web**: FastAPI (async)
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL
- **Cache**: Redis
- **ML**: LightGBM, XGBoost, PyTorch (scoring de risco e recomendacoes)
- **Observabilidade**: OpenTelemetry + Grafana Stack (Tempo, Prometheus, Loki)
- **Testes**: pytest, Testcontainers, Hypothesis
- **CI/CD**: GitHub Actions

## Comandos Essenciais
- `pip install -e ".[dev]"` - Instalar dependencias
- `pytest tests/unit/` - Testes unitarios
- `pytest tests/integration/` - Testes de integracao
- `pytest tests/e2e/` - Testes end-to-end
- `pytest --cov=src --cov-branch` - Coverage report
- `ruff check src/` - Lint
- `mypy src/` - Type checking
- `black src/ tests/` - Formatacao
- `docker compose up -d` - Infraestrutura local (PostgreSQL, Redis)

## Arquitetura Obrigatoria

### Hexagonal (Ports and Adapters) com 4 Camadas
```
src/
  domain/           # NUCLEO - Zero dependencias externas
  application/      # USE CASES - Orquestracao via CQRS
  adapters/         # INFRAESTRUTURA - Driving (REST) e Driven (DB, APIs)
  config/           # Composition Root + Settings
```

### Dependency Rule
TODAS as dependencias apontam para DENTRO (Domain). O Domain NAO importa NADA de application, adapters ou config.

### CQRS
- Commands: imperativos, imutaveis, void, com idempotency_key
- Queries: side-effect free, podem retornar dados
- Um handler por Command/Query

## Dominio: Analise de Carteira de Clientes

### Entidades Principais
- **Cliente**: perfil de investidor, objetivo financeiro, horizonte, tolerancia a risco
- **Carteira**: conjunto de posicoes de um cliente em um momento
- **Posicao**: ativo + quantidade + preco medio + valor atual
- **Ativo**: ticker, tipo (acao, FII, RF, ETF, BDR, cripto), setor
- **Analise**: diagnostico gerado para uma carteira em uma data
- **Recomendacao**: sugestao de rebalanceamento com justificativa

### Perfis de Investidor (Ubiquitous Language)
- **Conservador**: RF > 70%, volatilidade baixa, horizonte curto (< 2 anos)
- **Moderado**: RF 40-70%, RV ate 60%, horizonte medio (2-5 anos)
- **Arrojado**: RV > 60%, aceita alta volatilidade, horizonte longo (> 5 anos)

### Metricas de Analise
- **Alocacao**: % por classe de ativo, por setor, por emissor
- **Concentracao**: HHI (Herfindahl-Hirschman Index), top 5 ativos
- **Risco**: Volatilidade anualizada, CVaR 95%, Beta da carteira vs Ibovespa
- **Performance**: Rentabilidade vs benchmark (CDI, IBOV, IPCA+)
- **Aderencia ao Perfil**: score 0-100 de aderencia ao perfil declarado
- **Diversificacao**: numero efetivo de ativos, correlacao media entre posicoes

### Regras de Negocio Criticas
- Carteira so pode ser analisada se tiver pelo menos 1 posicao
- Analise expira em 24h (dados de mercado mudam)
- Recomendacao de rebalanceamento so gerada se aderencia < 70
- Concentracao por emissor: alerta se > 20% em um unico ativo
- Concentracao por setor: alerta se > 40% em um unico setor
- Concentracao em RF: alertar conservador se RF < 60%, arrojado se RF > 80%

### Classes de Ativos Suportadas
- Acoes (ON, PN, Units) - B3
- FIIs (Fundos de Investimento Imobiliario)
- ETFs (nacionais e internacionais via BDR)
- Renda Fixa (Tesouro Direto, CDB, LCI, LCA, Debentures)
- BDRs (Brazilian Depositary Receipts)
- Fundos de Investimento
- Cripto (Bitcoin, Ethereum)

### Tributacao Relevante para Relatorios
- Acoes/ETFs: 15% swing, 20% day trade (isencao R$20k/mes acoes PF)
- FIIs: isentos para PF em bolsa se fundo > 50 cotistas e PF < 10% do fundo
- RF: tabela regressiva 22.5% (ate 180d) ate 15% (acima de 720d)
- BDRs: 15% (ate R$5mi) ou 22.5% acima
- Cripto: 15% acima de R$35k/mes
- Sistema deve indicar impacto tributario nas recomendacoes de rebalanceamento

### Glossario (Ubiquitous Language)
- **PM**: Preco medio ponderado (custo de aquisicao)
- **PL**: Patrimonio Liquido da carteira
- **RV**: Renda Variavel (acoes, FIIs, ETFs)
- **RF**: Renda Fixa (tesouro, CDB, LCI, LCA)
- **CVaR/ES**: Conditional Value at Risk / Expected Shortfall
- **HHI**: Herfindahl-Hirschman Index (medida de concentracao)
- **Score de Aderencia**: 0-100, quanto a carteira reflete o perfil do cliente
- **Rebalanceamento**: ajuste da carteira para realinhar ao perfil alvo
- **Benchmark**: CDI (RF), IBOV (RV), IPCA+ (inflacao), IMA-B (titulos indexados)

## Regras de Codigo

### Convencoes
- snake_case para arquivos, variaveis, funcoes
- PascalCase para classes
- UPPER_SNAKE_CASE para constantes
- Type hints OBRIGATORIOS em todas as funcoes
- Docstrings em funcoes publicas (Google style)
- Imports organizados: stdlib, third-party, local (isort)

### Domain Layer (REGRAS ABSOLUTAS)
- Entidades com logica de negocio (Rich Domain Model, NUNCA Anemic)
- Value Objects IMUTAVEIS: `@dataclass(frozen=True)` com validacao no `__post_init__`
- Um Aggregate Root por Aggregate (unico ponto de acesso externo)
- Um Repository por Aggregate Root (interface no domain, impl na infra)
- Domain Events no tempo passado e imutaveis (CarteiraCriada, AnaliseGerada, RecomendacaoEmitida)
- Referenciar outros Aggregates APENAS por ID, nunca por objeto
- Ubiquitous Language: nomes refletem o dominio

### Application Layer
- Use Cases orquestram mas NAO contem logica de negocio
- Commands com idempotency_key obrigatorio
- Pipeline Behaviors: Validation > Logging > Authorization > Transaction
- DTOs separados dos DTOs da Delivery

### Adapters/Infrastructure
- NENHUMA logica de negocio em adapters
- ORM models NAO sao domain entities (usar mappers)
- Anticorruption Layer para APIs externas (brapi.dev, BCB, CVM)

### Dependency Injection
- Constructor Injection como padrao
- Depender de abstracoes (Protocol/ABC), nunca de concretas
- Composition Root em config/container.py (UNICO lugar com deps concretas)
- NUNCA usar Service Locator

### Testes (REGRAS ABSOLUTAS)
- Piramide: MUITOS unitarios, ALGUNS integracao, POUCOS E2E
- Padrao AAA (Arrange, Act, Assert) com UMA acao por teste
- Testar COMPORTAMENTO, nao implementacao
- Domain: sem mocks, logica pura
- Use Cases: com Fakes (InMemoryRepository)
- Adapters: Testcontainers com infra real
- Coverage minimo: 80% branch para domain
- TDD preferido para logica de dominio

### Observabilidade
- Logs SEMPRE estruturados em JSON (structlog)
- Campos obrigatorios: timestamp, level, service, message, trace_id, span_id
- OpenTelemetry para traces e metricas
- Result Pattern para erros de dominio; Exceptions para erros de infra

## APIs de Dados de Mercado
- brapi.dev: cotacoes B3 (REST, Free-Pro)
- BCB SGS: CDI, IPCA, Selic (REST, gratuito)
- BCB Focus: expectativas de mercado (OData, gratuito)
- CVM dados.cvm.gov.br: demonstracoes financeiras (CSV, gratuito)
- yfinance: historico B3 (sufixo .SA)

## Skills Disponiveis (Slash Commands)
- `/review [arquivo]` - Review de codigo com checklist completo (arquitetura, DDD, CQRS)
- `/test [unit|integration|e2e|all|coverage]` - Executar testes com analise
- `/new-entity [entity|vo] [Nome]` - Criar Domain Entity ou Value Object (com TDD)
- `/new-use-case [command|query] [Nome]` - Criar Use Case seguindo CQRS
- `/check-architecture` - Verificacao automatica de violacoes arquiteturais
- `/analise-carteira [cliente_id]` - Gerar analise completa de carteira de cliente

## Documentacao Completa
@docs/INDEX.md
@docs/software-engineering/INDEX.md
@.claude/rules/architecture.md
@.claude/rules/testing.md
@.claude/rules/domain.md
