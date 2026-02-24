# BOT Assessor - Trading Bot de Alto Nivel para o Mercado Brasileiro

## Visao Geral
Bot de investimentos automatizado de altissimo nivel para o mercado financeiro brasileiro (B3).
O projeto segue DDD, Arquitetura Hexagonal, CQRS e praticas rigorosas de engenharia de software.

## Stack Tecnologico
- **Linguagem**: Python 3.12+ (principal), C++ (execucao critica)
- **Framework Web**: FastAPI (async)
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL + QuestDB (time-series)
- **Cache**: Redis
- **Message Broker**: Kafka / RabbitMQ
- **ML**: LightGBM, XGBoost, CatBoost, PyTorch, FinBERT-PT-BR
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
- `docker compose up -d` - Infraestrutura local (PostgreSQL, Redis, Kafka, QuestDB)

## Arquitetura Obrigatoria

### Hexagonal (Ports and Adapters) com 4 Camadas
```
src/
  domain/           # NUCLEO - Zero dependencias externas
  application/      # USE CASES - Orquestracao via CQRS
  adapters/         # INFRAESTRUTURA - Driving (REST, WS, CLI) e Driven (DB, APIs, Broker)
  config/           # Composition Root + Settings
```

### Dependency Rule
TODAS as dependencias apontam para DENTRO (Domain). O Domain NAO importa NADA de application, adapters ou config.

### CQRS
- Commands: imperativos, imutaveis, void, com idempotency_key
- Queries: side-effect free, podem retornar dados
- Um handler por Command/Query

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
- Domain Events no tempo passado e imutaveis (OrderExecuted, PositionClosed)
- Referenciar outros Aggregates APENAS por ID, nunca por objeto
- Ubiquitous Language: nomes refletem o dominio (order.submit(), NAO order.insert_into_db())

### Application Layer
- Use Cases orquestram mas NAO contem logica de negocio
- Commands com idempotency_key obrigatorio
- Pipeline Behaviors: Validation > Logging > Authorization > Transaction
- DTOs separados dos DTOs da Delivery

### Adapters/Infrastructure
- NENHUMA logica de negocio em adapters
- ORM models NAO sao domain entities (usar mappers)
- Anticorruption Layer para APIs externas (B3, corretoras)
- Outbox Pattern para publicacao atomica de eventos
- Inbox Pattern para deduplicacao de mensagens

### Dependency Injection
- Constructor Injection como padrao
- Depender de abstracoes (Protocol/ABC), nunca de concretas
- Composition Root em config/container.py (UNICO lugar com deps concretas)
- Pure DI primeiro; container so quando complexidade justificar
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
- NUNCA labels de alta cardinalidade em metricas
- Result Pattern para erros de dominio; Exceptions para erros de infra

### Idempotencia
- POST/PATCH com Idempotency-Key no header
- Outbox Pattern: banco + evento na mesma transacao
- UPSERT preferido a INSERT
- Exactly-once = at-least-once + idempotent processing

## Dominio: Mercado Financeiro Brasileiro

### Contexto
- B3: unica bolsa do Brasil (monopolio, sem fragmentacao)
- Liquidacao D+2
- Bot opera via corretora autorizada pela CVM

### Horarios de Negociacao
- Acoes: 10:00-17:55 (pre-abertura 09:30, call de fechamento 17:55-18:00)
- Futuros indice (WIN/IND): 09:00-18:25
- Futuros dolar (WDO/DOL): 09:00-18:30
- NAO enviar ordens fora desses horarios

### Compliance (CRITICO)
- NUNCA: spoofing, layering, wash trading, front running (CRIME: 1-8 anos)
- Kill switch obrigatorio
- Registros por minimo 5 anos
- Controles pre-trade: limite posicao, loss limit, price collar, rate limiting

### Tributacao
- Swing Trade: 15% IR (isencao R$20k/mes apenas acoes a vista PF)
- Day Trade: 20% IR (sem isencao)
- Prejuizo DT so compensa DT; ST so compensa ST
- Preco medio ponderado (NAO FIFO)
- Bot DEVE ter modulo fiscal automatizado

### Gestao de Risco
- CVaR 97.5% como metrica primaria
- Quarter Kelly (25% Kelly) para position sizing
- Max 5% capital por operacao
- Circuit breakers: -3% reduz 50%, -5% pausa 24h, -7% fecha tudo
- Drawdown > 20%: desligamento total
- Max 25% por setor

### Glossario (Ubiquitous Language)
- ON/PN/Units: tipos de acoes (sufixos 3/4/11)
- WIN/WDO: mini-indice/mini-dolar
- DT/ST: Day Trade/Swing Trade
- DARF: guia recolhimento IR (cod 6015)
- PM: preco medio ponderado
- CVaR/ES: Expected Shortfall
- HMM: Hidden Markov Model (regimes)
- CPCV: Combinatorial Purged Cross-Validation

## Skills Disponiveis (Slash Commands)
- `/review [arquivo]` - Review de codigo com checklist completo (arquitetura, DDD, CQRS, compliance B3)
- `/test [unit|integration|e2e|all|coverage]` - Executar testes com analise de resultados
- `/new-entity [entity|vo] [Nome]` - Criar Domain Entity ou Value Object (com TDD)
- `/new-use-case [command|query] [Nome]` - Criar Use Case seguindo CQRS
- `/check-architecture` - Verificacao automatica de violacoes arquiteturais
- `/backtest-report [path]` - Analise critica de resultados de backtest

## Documentacao Completa
@docs/INDEX.md
@docs/software-engineering/INDEX.md
@.claude/rules/architecture.md
@.claude/rules/testing.md
@.claude/rules/domain.md
