# Regras Extraidas dos Documentos de Engenharia de Software

> **Objetivo:** Compilacao de todas as regras, padroes, anti-patterns e estruturas extraidas
> dos 8 documentos de referencia para uso no CLAUDE.md do projeto BOT Assessor.
>
> **Data de geracao:** 2026-02-07
> **Fonte:** docs/software-engineering/ (01-ddd, 02-cqrs, 04-arquitetura-hexagonal,
> 05-estrutura-camadas, 07-idempotencia, 08-observabilidade-otel, 09-testes-unitarios,
> 12-injecao-dependencia)

---

## SUMARIO

1. [Resumo Executivo por Documento](#1-resumo-executivo-por-documento)
2. [Regras Consolidadas para CLAUDE.md](#2-regras-consolidadas-para-claudemd)

---

## 1. Resumo Executivo por Documento

---

### 1.1 Domain-Driven Design (DDD)

**Fonte:** `docs/software-engineering/01-ddd/domain-driven-design.md`

#### REGRAS OBRIGATORIAS

- Usar **Ubiquitous Language** em todo o codigo: nomes de classes, metodos, variaveis e eventos DEVEM refletir o vocabulario do dominio de negocios (ex: `order.submit()`, nao `order.insertIntoDb()`)
- Entidades DEVEM ter **identidade unica** (ID) e igualdade baseada nesse ID, nao em atributos
- Value Objects DEVEM ser **imutaveis** (usar `@dataclass(frozen=True)` em Python)
- Value Objects DEVEM conter **validacao no construtor** (`__post_init__`)
- Cada Aggregate tem exatamente **um Aggregate Root** -- unico ponto de acesso externo
- Existe **um Repository por Aggregate Root**, nao por Entity
- A **interface** do Repository pertence ao Domain Layer; a **implementacao** pertence ao Infrastructure Layer
- Domain Services sao **stateless** e operam exclusivamente sobre objetos do dominio
- Application Services (Use Cases) orquestram o fluxo, mas **NAO contem logica de negocio**
- Domain Events sao expressos no **tempo passado** (OrderExecuted, PositionClosed) e sao **imutaveis**
- Aggregates DEVEM ser **pequenos** (70% apenas Root + Value Objects, 30% com no maximo 2-3 entities internas)
- Referenciar outros Aggregates **apenas por identidade** (ID), nunca por referencia de objeto
- Usar **consistencia eventual** entre Aggregates (via Domain Events)
- Usar **Anticorruption Layer (ACL)** ao integrar com APIs externas para isolar o dominio

#### ANTI-PATTERNS

- **Anemic Domain Model**: Entidades como "bags of getters/setters" com toda logica em services externos. Entidades DEVEM conter logica de negocio (Rich Domain Model)
- **Database-First Design**: Projetar schema antes do dominio. Comece pelo dominio e use cases
- **Usar termos tecnicos** no lugar de termos de negocio ("inserir registro" em vez de "submeter ordem")
- **Large-cluster Aggregates**: Aggregates grandes demais causam contencao de lock e problemas de performance
- **Referencia direta entre Aggregates**: Manter referencia de objeto para outro Aggregate em vez de usar apenas ID

#### ESTRUTURA DE CODIGO

```
src/
  domain/
    entities/          # Entities com logica de negocio
    value_objects/     # VOs imutaveis (Money, Symbol, Price, Quantity)
    events/            # Domain Events
    services/          # Domain Services (stateless)
    exceptions/        # Excecoes de dominio
    specifications/    # Specifications pattern (regras combinaveis)
    factories/         # Factories para criacao complexa de Aggregates
  application/
    use_cases/         # Orquestracao de casos de uso
    services/          # Application Services
    dto/               # Data Transfer Objects
    ports/             # Interfaces (ports) para infraestrutura
```

#### FERRAMENTAS RECOMENDADAS

- Python `dataclass(frozen=True)` para Value Objects
- ABC (Abstract Base Class) para interfaces de Repository
- Padrao Factory Method para criacao complexa de Aggregates
- Specification Pattern para regras de negocio combinaveis

#### PADROES DE TESTE

- Testes unitarios do dominio: sem mocks, logica pura
- Testes de use cases: com mocks/fakes nos ports de infraestrutura
- Testes de integracao: com infraestrutura real ou containerizada

---

### 1.2 CQRS (Command Query Responsibility Segregation)

**Fonte:** `docs/software-engineering/02-cqrs/cqrs.md`

#### REGRAS OBRIGATORIAS

- Separar operacoes de **escrita (Commands)** de **leitura (Queries)** em modelos distintos
- Commands sao **imperativos** (`PlaceOrderCommand`, `CancelTradeCommand`), representam intencao de alterar estado
- Commands sao **void** (nao retornam dados, apenas sucesso/falha)
- Cada Command tem **exatamente 1 handler**
- Commands DEVEM ser **imutaveis** (`@dataclass(frozen=True)`)
- Commands DEVEM incluir **idempotency_key** para garantir idempotencia
- Queries NAO alteram estado (side-effect free)
- Pipeline Behaviors (middlewares) para cross-cutting concerns: Validation, Logging, Authorization, Transaction
- Read Model pode ser **intencionalmente denormalizado** para performance de leitura
- Eventos NUNCA sao alterados ou deletados (append-only) quando usando Event Sourcing
- Event Versioning: nunca alterar evento ja publicado; adicionar campos e seguro; remover requer upcasting

#### ANTI-PATTERNS

- Usar CQRS em todo o sistema sem necessidade (aplicar apenas em Bounded Contexts que justifiquem)
- Retornar dados em Commands (viola CQS)
- Commands que fazem leitura diretamente no banco em vez de usar o write model
- Nao considerar eventual consistency entre write e read models
- Dual Write: escrever no banco E publicar evento sem transacao atomica (usar Outbox Pattern)

#### ESTRUTURA DE CODIGO

```
application/
  commands/            # Command DTOs (frozen dataclasses)
  queries/             # Query DTOs (frozen dataclasses)
  handlers/
    command_handlers/  # Um handler por Command
    query_handlers/    # Um handler por Query
  behaviors/           # Pipeline behaviors (validation, logging, etc.)
  projections/         # Projection handlers (Event -> Read Model)
```

#### FERRAMENTAS RECOMENDADAS

- Mediator/Bus pattern para roteamento de commands/queries
- Pipeline Behaviors para validacao, logging, autorizacao
- Event Store para Event Sourcing (append-only)
- Projections para materializar read models
- Snapshots para aggregates com muitos eventos

#### PADROES DE TESTE

- Testar command handlers com mocks nos repositories e event publishers
- Testar query handlers contra read model
- Testar projections com sequencias de eventos
- Testar idempotencia dos commands (executar 2x deve ter mesmo resultado)

---

### 1.3 Arquitetura Hexagonal (Ports and Adapters)

**Fonte:** `docs/software-engineering/04-arquitetura-hexagonal/arquitetura-hexagonal.md`

#### REGRAS OBRIGATORIAS

- **INSIDE (Hexagono):** contem exclusivamente logica de negocio, nenhuma referencia a tecnologia, framework ou dispositivo real
- **OUTSIDE (Mundo Externo):** tudo que nao e logica de negocio (UI, bancos de dados, APIs externas, filas, frameworks)
- **Dependency Rule:** TODAS as dependencias de codigo-fonte apontam para DENTRO (em direcao ao dominio). O dominio NAO conhece a infraestrutura
- **Ports (Portas):** interfaces (contratos) que definem pontos de interacao entre hexagono e mundo externo. Pertencem ao hexagono
- **Driving Ports (Inbound):** definem a API da aplicacao (o que o sistema oferece). Nomeados com verbos de acao
- **Driven Ports (Outbound):** definem o SPI (o que a aplicacao necessita). Nomeados pela funcao
- **Adapters:** traduzem entre a interface do port e a tecnologia especifica. Respondem pelo mapeamento de modelos
- Objetos de infraestrutura (DTOs, ORMs, payloads de API) **NUNCA devem cruzar a fronteira** do hexagono. O adapter e responsavel pela conversao
- **Composition Root:** unico lugar onde dependencias concretas sao instanciadas e conectadas
- Criar ports **apenas para fronteiras com o mundo externo** (I/O, infraestrutura, servicos externos). Logica interna pura nao precisa de ports

#### ANTI-PATTERNS

- **Leaking Infrastructure:** conceitos de infraestrutura vazando para o dominio (ex: SQLAlchemy Base no dominio)
- **Over-Abstraction:** criar ports e adapters para tudo, mesmo quando nao ha necessidade
- **Adapter Bloat:** adapters que contem logica de negocio alem da traducao
- **Use-Case Interdependency:** use cases chamando outros use cases diretamente (usar Domain Services ou Events)
- **Database-First Design:** projetar schema do banco antes do dominio

#### ESTRUTURA DE CODIGO

```
src/
  domain/                      # NUCLEO - Zero dependencias externas
    entities/
    value_objects/
    events/
    services/
    exceptions/

  application/                 # USE CASES - Orquestracao
    ports/
      inbound/                 # Driving Ports (API da aplicacao)
      outbound/                # Driven Ports (SPI)
    use_cases/
    services/
    dto/

  adapters/                    # INFRAESTRUTURA - Implementacoes
    inbound/                   # Driving Adapters (entrada)
      rest/
      websocket/
      cli/
      scheduler/
    outbound/                  # Driven Adapters (saida)
      persistence/
        sqlalchemy/
          models/              # ORM models (NAO sao domain entities!)
          repositories/
          mappers/
        in_memory/             # Para testes
      broker/
      market_data/
      notification/

  config/                      # Composition Root + Config
    container.py               # Dependency Injection Container
    settings.py
    app_factory.py

tests/
  unit/
    domain/                    # Testes do dominio (sem mocks)
    application/               # Testes de use cases (com mocks)
  integration/
    adapters/                  # Testes de adapters
  e2e/
```

#### FERRAMENTAS RECOMENDADAS

- Python ABC para definicao de Ports (interfaces)
- Dependency Injection (via constructor injection ou container)
- FastAPI para Driving Adapter REST
- SQLAlchemy para Driven Adapter de persistencia
- In-Memory Adapters para testes

#### PADROES DE TESTE

- **Dominio:** testes unitarios sem mocks, logica pura
- **Use Cases:** testes com mocks/fakes nos driven ports (In-Memory Adapters)
- **Adapters:** testes de integracao contra infraestrutura real (Testcontainers)
- **E2E:** testes com infraestrutura completa
- Seguir piramide de testes: MUITOS unitarios, ALGUNS integracao, POUCOS E2E

---

### 1.4 Estrutura de Camadas (Delivery, Application, Domain, Infrastructure)

**Fonte:** `docs/software-engineering/05-estrutura-camadas/estrutura-camadas.md`

#### REGRAS OBRIGATORIAS

- Quatro camadas: **Domain** (core), **Application** (use cases), **Delivery** (presentation), **Infrastructure** (adapters)
- **Domain Layer:** zero dependencias externas, logica de negocio pura, Value Objects SEMPRE imutaveis, invariantes protegidas pelo Aggregate Root, nomes refletem Ubiquitous Language
- **Application Layer:** orquestracao, transaction management, autorizacao, mapeamento DTO/domain, publicacao de eventos. NAO contem regras de negocio
- **Delivery Layer:** "burra" -- apenas traduz entre mundo externo e Application Layer. NAO contem logica de negocio
- **Infrastructure Layer:** implementacoes concretas dos ports definidos no Domain. Mapeamento ORM Model <-> Domain Entity
- Dependency Rule: dependencias SEMPRE apontam para DENTRO (Domain nunca depende de camadas externas)
- Commands separados de Queries (CQRS na Application Layer)
- DTOs da Delivery sao diferentes dos DTOs da Application
- Separar Domain Events de Application Events

#### ANTI-PATTERNS

- Logica de negocio na Delivery Layer (controllers)
- Logica de negocio na Infrastructure Layer (repositories)
- Domain depender de framework, ORM, HTTP ou banco de dados
- Delivery Layer acessando Repository diretamente (deve passar pela Application)
- Misturar DTOs de diferentes camadas

#### ESTRUTURA DE CODIGO

```
src/
  domain/              # Core: entities, VOs, events, services, specs, repository interfaces
  application/         # Use Cases: commands, queries, handlers, DTOs, event publishers
  delivery/            # Presentation: REST controllers, WebSocket, CLI, middleware, schemas
  infrastructure/      # Adapters: repository implementations, ORM models, external APIs, cache
  config/              # Composition Root, settings, app factory
```

#### FERRAMENTAS RECOMENDADAS

- FastAPI para camada Delivery (REST, WebSocket)
- Click/Typer para CLI
- Pydantic para validacao sintatica na Delivery
- SQLAlchemy (async) para Infrastructure
- UnitOfWork pattern para transacoes

#### PADROES DE TESTE

- Domain: testes unitarios sem I/O
- Application: testes com fakes/mocks nos ports
- Delivery: testes de controllers (HTTP test client)
- Infrastructure: testes de integracao com banco real

---

### 1.5 Idempotencia

**Fonte:** `docs/software-engineering/07-idempotencia/idempotencia.md`

#### REGRAS OBRIGATORIAS

- Toda operacao POST/PATCH DEVE receber **Idempotency-Key** no header
- A chave DEVE ser unica por operacao (UUID v4 com 128+ bits de entropia)
- A chave NAO DEVE ser reutilizada com payload diferente (retornar 409 Conflict se detectado)
- O servidor DEVE retornar o mesmo resultado para a mesma chave
- Armazenar resultado em tabela `idempotency_keys` com TTL (24h padrao Stripe)
- Usar **locking** para tratar race conditions (UPSERT com `ON CONFLICT`)
- Recovery Points: dividir processamento em fases atomicas com pontos de recuperacao
- Consumers de mensageria DEVEM ser **idempotentes** (Idempotent Consumer Pattern)
- Usar **Outbox Pattern** para evitar dual write (escrever no banco E publicar evento na mesma transacao)
- Usar **Inbox Pattern** para deduplicacao no consumer (INSERT ON CONFLICT DO NOTHING)
- Preferir operacoes naturalmente idempotentes: UPSERT em vez de INSERT, SET em vez de ADD
- Exactly-once semantics = at-least-once delivery + idempotent processing

#### ANTI-PATTERNS

- **Dual Write:** escrever no banco e publicar evento sem transacao atomica
- POST sem Idempotency-Key em operacoes que criam recursos
- Reutilizar Idempotency-Key com parametros diferentes sem verificacao
- Nao implementar TTL para limpeza de chaves de idempotencia
- Assumir que a rede e confiavel (Falacia #1 de sistemas distribuidos)
- Usar INSERT quando UPSERT seria mais seguro
- Nao considerar mensagens duplicadas em consumers de filas

#### ESTRUTURA DE CODIGO

```
infrastructure/
  idempotency/
    middleware.py            # IdempotencyMiddleware para interceptar requests
    store.py                 # IdempotencyStore (Redis ou PostgreSQL)
  messaging/
    outbox/
      outbox_table.sql       # Tabela outbox_events
      polling_publisher.py   # Polling ou CDC relay
    inbox/
      inbox_table.sql        # Tabela inbox_messages
      idempotent_consumer.py # Consumer com deduplicacao
```

#### FERRAMENTAS RECOMENDADAS

- PostgreSQL `INSERT ON CONFLICT` para UPSERT idempotente
- Redis para locking e cache de idempotency keys
- Debezium para CDC (Change Data Capture) do Outbox
- Kafka Idempotent Producer (`enable.idempotence=true`)
- Kafka Transactions para exactly-once

#### PADROES DE TESTE

- Testar que operacao executada 2x com mesma key retorna mesmo resultado
- Testar que key reutilizada com params diferentes retorna 409/422
- Testar race conditions (requests concorrentes com mesma key)
- Testar Outbox: garantir que evento e publicado apos commit do banco
- Testar Inbox: garantir que mensagem duplicada nao e processada

---

### 1.6 Observabilidade e OpenTelemetry (OTEL)

**Fonte:** `docs/software-engineering/08-observabilidade-otel/observabilidade-otel.md`

#### REGRAS OBRIGATORIAS

- Implementar os **tres pilares**: Logs (estruturados), Metricas, Traces
- Usar **OpenTelemetry (OTEL)** como padrao para instrumentacao
- Usar **OTLP** como protocolo de telemetria (unificado para traces, metrics, logs)
- Usar **W3C Trace Context** como padrao de propagacao de contexto
- Logging DEVE ser **estruturado em JSON** (nunca plain text em producao)
- Campos obrigatorios em cada log: `timestamp` (ISO 8601 UTC), `level`, `service`, `message`, `trace_id`, `span_id`
- Usar `correlation_id` para agrupar logs de uma mesma operacao de negocio
- **NUNCA** usar valores ilimitados como labels de metricas (user_id, order_id). Usar traces/logs para alta cardinalidade
- Metricas: Counter (monotonicamente crescente), Gauge (valor instantaneo), Histogram (distribuicao), Up-Down Counter
- Usar **tail-based sampling** para traces: 100% retencao para erros e ordens, 10-20% para traces normais
- Erros de dominio: usar Result Pattern (nao exceptions). Erros de infra: usar exceptions com retry/circuit breaker
- Error Boundaries: cada camada trata seus proprios erros e traduz para a camada superior

#### ANTI-PATTERNS

- Plain text logging em producao
- Alta cardinalidade em labels de metricas (explosao de time series)
- Nao correlacionar logs com traces (falta de trace_id/span_id)
- Coletar 100% dos traces em producao sem sampling
- Nao ter Error Boundaries entre camadas
- Usar exceptions para fluxo de controle de dominio (usar Result/Either)
- Nao distinguir erros de dominio de erros de infraestrutura

#### ESTRUTURA DE CODIGO

```
infrastructure/
  observability/
    tracing.py          # Setup OTEL tracing
    metrics.py          # Setup OTEL metrics
    logging_config.py   # Structured logging com structlog
config/
  otel-collector-config.yaml  # Configuracao do OTEL Collector
```

#### FERRAMENTAS RECOMENDADAS

- **OpenTelemetry SDK** para Python (`opentelemetry-sdk`)
- **structlog** para logging estruturado em JSON
- **OTEL Collector** para pipeline de telemetria (receivers -> processors -> exporters)
- **Grafana Tempo** para traces
- **Prometheus/Mimir** para metricas
- **Grafana Loki** para logs (custo-eficiente)
- **Grafana** para dashboards e alertas
- Result Pattern (Success/Failure) para erros de dominio

#### PADROES DE TESTE

- Verificar que spans sao criados corretamente para operacoes criticas
- Verificar que metricas sao incrementadas nos cenarios corretos
- Verificar que logs estruturados contem campos obrigatorios
- Verificar que correlation_id propaga entre componentes
- Testar Error Boundaries: erros de dominio retornam Result, erros de infra geram exceptions

---

### 1.7 Testes Unitarios

**Fonte:** `docs/software-engineering/09-testes-unitarios/testes-unitarios.md`

#### REGRAS OBRIGATORIAS

- Seguir principios **FIRST**: Fast, Isolated, Repeatable, Self-Validating, Timely
- Usar padrao **AAA** (Arrange, Act, Assert) ou **Given-When-Then**
- **Uma unica secao Act** por teste. Se tem multiplas acoes, dividir em testes separados
- Assert deve ser **minimalista** (idealmente uma unica assertion logica)
- Testar **comportamento** (o que o codigo faz), nao **implementacao** (como o codigo faz)
- Quatro pilares de qualidade (Khorikov): Protecao contra regressoes, Resistencia a refatoracao, Feedback rapido, Manutenibilidade
- Usar **stubs** para incoming interactions (queries) e **mocks** apenas para outgoing interactions (commands) observaveis externamente
- Abordagem **classica (Detroit)** preferida: usar objetos reais quando possivel, doubles apenas para dependencias de I/O
- Naming de testes: descritivos em linguagem natural, comunicando o que e testado, condicao e resultado esperado
- Estrutura de diretorios: espelhar src/, separar unit/integration/e2e
- Usar **pytest fixtures** (preferidas sobre setup/teardown classico)
- Usar **Test Data Builders** e **Object Mothers** para criacao de objetos de teste
- Coverage como gate minimo: 70-80% de branch coverage para logica de dominio
- Complementar coverage com **mutation testing** para medir efetividade real

#### ANTI-PATTERNS

- Testar **implementacao** em vez de **comportamento** (acessar metodos privados, verificar ordem de chamadas internas)
- Testes sem assertions (coverage sem valor)
- Testes que dependem de ordem de execucao
- Testes que acessam I/O (disco, rede, banco) -- esses sao testes de integracao
- Testes com multiplas acoes (Act) -- dividir em testes separados
- Mocks para todas as dependencias (escola London excessiva)
- Testar metodos triviais (getters/setters simples)
- Testar frameworks de terceiros
- Perseguir 100% de coverage (retorno decrescente apos ~80%)

#### ESTRUTURA DE CODIGO

```
tests/
  unit/
    domain/
      strategies/
        test_moving_average.py
      risk/
        test_position_sizer.py
      portfolio/
        test_portfolio.py
    conftest.py
  integration/
    test_broker_connection.py
    test_data_feed.py
  e2e/
    test_full_trading_cycle.py
  fixtures/
    candle_builder.py
    order_builder.py
    portfolio_builder.py
  conftest.py
```

#### FERRAMENTAS RECOMENDADAS

- **pytest** como framework de testes
- **pytest fixtures** para setup/teardown
- `unittest.mock.MagicMock` e `Mock` para test doubles
- **Test Data Builders** (padrao Nat Pryce) para criacao de objetos complexos
- **Object Mothers** para cenarios fixos recorrentes
- **mutmut** ou **cosmic-ray** para mutation testing
- **pytest-cov** para coverage reports
- **Testcontainers** para testes de integracao com infraestrutura

#### PADROES DE TESTE

- Piramide de testes: MUITOS unitarios, ALGUNS integracao, POUCOS E2E
- TDD (Red-Green-Refactor) como disciplina preferida
- Testes escritos durante o desenvolvimento, nao depois
- Cada teste: uma razao para falhar, uma assertion logica
- Fake Repositories (InMemory) para testes de use cases
- Stubs para dados de entrada, Mocks apenas para verificar comandos de saida

---

### 1.8 Injecao de Dependencia (DI)

**Fonte:** `docs/software-engineering/12-injecao-dependencia/injecao-dependencia.md`

#### REGRAS OBRIGATORIAS

- **Constructor Injection** como padrao PREFERIDO (dependencias explicitas, imutaveis, objeto sempre valido apos construcao)
- Depender de **abstracoes** (interfaces/protocols), nunca de implementacoes concretas
- **Composition Root:** unico local da aplicacao onde o grafo de objetos e montado (em `main.py` ou `composition_root.py`)
- NENHUMA outra camada conhece o container -- o container e infraestrutura
- Comecar com **Pure DI** (sem framework). Migrar para container somente quando complexidade justificar
- Regra de Lifetimes: servico so pode depender de servicos com lifetime IGUAL ou MAIOR (Singleton > Scoped > Transient)
- Constructor Over-Injection (> 4-5 deps) e um **code smell** indicando violacao de SRP -- refatorar a classe
- Definir interfaces usando `typing.Protocol` ou `ABC` em Python
- Pelo menos 2 implementacoes por interface (real + mock/fake para teste)
- Garantir que nenhuma classe de negocio importe classes concretas de infraestrutura

#### ANTI-PATTERNS

- **Service Locator:** classes pedem dependencias a um locator global em vez de recebe-las por injecao. Dependencias ficam ocultas
- **Ambient Context:** dependencia exposta como propriedade estatica global
- **Constrained Construction:** forcar construtor vazio impedindo constructor injection
- **Constructor Over-Injection:** mais de 4-5 deps no construtor (sintoma de SRP violado)
- **Container as Service Locator:** injetar o proprio container como dependencia
- **God Container:** container monolitico sem organizacao (usar modulos/installers)
- **Captive Dependency:** servico de vida curta (Scoped) capturado por servico de vida longa (Singleton)

#### ESTRUTURA DE CODIGO

```
config/
  container.py            # Composition Root (UNICO lugar com deps concretas)
  settings.py             # Configuracao por ambiente
  app_factory.py          # Factory que monta a aplicacao

# Interfaces (Protocols/ABCs) em:
domain/
  ou application/ports/

# Implementacoes concretas em:
adapters/ ou infrastructure/
```

#### FERRAMENTAS RECOMENDADAS

- **Pure DI** (funcoes factory, sem framework) como primeira opcao
- `typing.Protocol` para interfaces em Python (duck typing estrutural)
- `abc.ABC` e `@abstractmethod` para interfaces formais
- **dependency-injector** para container declarativo quando necessario
- **FastAPI Depends** para DI integrado ao framework web

#### PADROES DE TESTE

- Injetar test doubles (mocks, fakes, stubs) via constructor injection
- Cada teste monta seu proprio grafo de dependencias com fakes
- InMemoryRepository como Fake para persistencia
- NullNotifier, ConsoleNotifier como Fakes para notificacao
- Testes unitarios: todos test doubles injetados
- Testes de integracao: implementacoes reais (testnet/sandbox)
- Composition Root por ambiente: producao, backtest, teste

---

## 2. Regras Consolidadas para CLAUDE.md

As regras abaixo sao a compilacao final de TODAS as regras extraidas dos 8 documentos,
organizadas por categoria, prontas para inclusao no CLAUDE.md do projeto.

---

### ARQUITETURA E ESTRUTURA

```
REGRA-ARQ-01: Usar Arquitetura Hexagonal (Ports and Adapters) com 4 camadas:
              Domain, Application, Delivery (Inbound Adapters), Infrastructure (Outbound Adapters).
REGRA-ARQ-02: Dependency Rule -- TODAS as dependencias apontam para DENTRO (em direcao ao Domain).
              O Domain NAO depende de nenhuma camada externa.
REGRA-ARQ-03: Domain Layer tem ZERO dependencias externas (nenhum import de framework, ORM, HTTP, banco).
REGRA-ARQ-04: Ports (interfaces) pertencem ao Domain/Application. Adapters pertencem a Infrastructure.
REGRA-ARQ-05: Driving Ports (Inbound) definem a API da aplicacao. Driven Ports (Outbound) definem o SPI.
REGRA-ARQ-06: Adapters APENAS traduzem entre formatos. NENHUMA logica de negocio em adapters.
REGRA-ARQ-07: Objetos de infraestrutura (DTOs, ORM models, payloads) NUNCA cruzam a fronteira do hexagono.
REGRA-ARQ-08: Composition Root e o UNICO lugar com dependencias concretas (em config/container.py).
REGRA-ARQ-09: Separar Commands (escrita) de Queries (leitura) na Application Layer (CQRS).
REGRA-ARQ-10: DTOs da Delivery sao DIFERENTES dos DTOs da Application.
```

### DOMAIN-DRIVEN DESIGN

```
REGRA-DDD-01: Ubiquitous Language -- nomes de classes, metodos e eventos DEVEM refletir o vocabulario
              do dominio de negocios (ex: order.submit(), nao order.insertIntoDb()).
REGRA-DDD-02: Rich Domain Model -- Entidades DEVEM conter logica de negocio, nao serem "bags of getters/setters".
REGRA-DDD-03: Entities tem identidade unica (ID) e igualdade baseada nesse ID.
REGRA-DDD-04: Value Objects sao IMUTAVEIS (@dataclass(frozen=True)) com validacao no __post_init__.
REGRA-DDD-05: Cada Aggregate tem exatamente UM Aggregate Root como unico ponto de acesso externo.
REGRA-DDD-06: Aggregates DEVEM ser pequenos (preferencialmente Root + Value Objects).
REGRA-DDD-07: Referenciar outros Aggregates APENAS por identidade (ID), nunca por referencia de objeto.
REGRA-DDD-08: Um Repository por Aggregate Root. Interface no Domain, implementacao na Infrastructure.
REGRA-DDD-09: Domain Services sao stateless e operam exclusivamente sobre objetos do dominio.
REGRA-DDD-10: Domain Events expressos no tempo passado (OrderExecuted, PositionClosed), imutaveis.
REGRA-DDD-11: Consistencia eventual entre Aggregates (via Domain Events).
REGRA-DDD-12: Anticorruption Layer (ACL) ao integrar com APIs externas.
REGRA-DDD-13: Application Services orquestram use cases mas NAO contem logica de negocio.
```

### CQRS E EVENTOS

```
REGRA-CQRS-01: Commands sao imperativos (PlaceOrderCommand), imutaveis, void, com exatamente 1 handler.
REGRA-CQRS-02: Commands DEVEM incluir idempotency_key.
REGRA-CQRS-03: Queries NAO alteram estado (side-effect free).
REGRA-CQRS-04: Pipeline Behaviors para cross-cutting: Validation, Logging, Authorization, Transaction.
REGRA-CQRS-05: Read Model pode ser denormalizado para performance.
REGRA-CQRS-06: Eventos sao append-only, nunca alterados ou deletados.
REGRA-CQRS-07: Event Versioning: adicionar campos e seguro; remover requer upcasting.
REGRA-CQRS-08: Distinguir Domain Events (interno ao Bounded Context) de Integration Events (entre contextos).
```

### INJECAO DE DEPENDENCIA

```
REGRA-DI-01: Constructor Injection como padrao PREFERIDO para todas as dependencias.
REGRA-DI-02: Depender de abstracoes (Protocol/ABC), nunca de implementacoes concretas.
REGRA-DI-03: Composition Root em config/container.py -- UNICO lugar que conhece classes concretas.
REGRA-DI-04: NENHUMA outra camada conhece o container. O container e infraestrutura.
REGRA-DI-05: Comecar com Pure DI (sem framework). Container somente quando complexidade justificar.
REGRA-DI-06: Constructor Over-Injection (> 4-5 deps) indica violacao de SRP -- refatorar.
REGRA-DI-07: NUNCA usar Service Locator em classes de negocio.
REGRA-DI-08: NUNCA injetar o container como dependencia.
REGRA-DI-09: Pelo menos 2 implementacoes por interface (real + mock/fake para teste).
REGRA-DI-10: Lifecycle: Singleton > Scoped > Transient. Nunca injetar Scoped em Singleton.
```

### IDEMPOTENCIA

```
REGRA-IDEM-01: Toda operacao POST/PATCH DEVE receber Idempotency-Key no header.
REGRA-IDEM-02: Chave unica por operacao (UUID v4, 128+ bits de entropia).
REGRA-IDEM-03: Servidor DEVE retornar mesmo resultado para mesma chave.
REGRA-IDEM-04: Chave reutilizada com params diferentes: retornar 409 Conflict.
REGRA-IDEM-05: Armazenar resultado em tabela idempotency_keys com TTL 24h.
REGRA-IDEM-06: Usar Outbox Pattern para evitar dual write (banco + evento atomico).
REGRA-IDEM-07: Usar Inbox Pattern para deduplicacao no consumer.
REGRA-IDEM-08: Consumers de mensageria DEVEM ser idempotentes.
REGRA-IDEM-09: Preferir UPSERT a INSERT. Preferir SET a ADD.
REGRA-IDEM-10: Exactly-once = at-least-once delivery + idempotent processing.
```

### OBSERVABILIDADE

```
REGRA-OBS-01: Implementar os tres pilares: Logs (JSON estruturado), Metricas, Traces.
REGRA-OBS-02: Usar OpenTelemetry (OTEL) como padrao de instrumentacao.
REGRA-OBS-03: Usar OTLP como protocolo de telemetria.
REGRA-OBS-04: Usar W3C Trace Context como padrao de propagacao.
REGRA-OBS-05: Logging DEVE ser estruturado em JSON (NUNCA plain text em producao).
REGRA-OBS-06: Campos obrigatorios em log: timestamp (ISO 8601 UTC), level, service, message,
              trace_id, span_id, correlation_id.
REGRA-OBS-07: NUNCA usar valores ilimitados como labels de metricas (user_id, order_id).
REGRA-OBS-08: Tail-based sampling: 100% retencao para erros/ordens, 10-20% para normal.
REGRA-OBS-09: Erros de dominio: Result Pattern (Success/Failure). Erros de infra: Exceptions.
REGRA-OBS-10: Error Boundaries em cada camada. Cada camada traduz erros para a superior.
REGRA-OBS-11: Correlacionar logs com traces via trace_id e span_id.
```

### TESTES

```
REGRA-TEST-01: Principios FIRST: Fast, Isolated, Repeatable, Self-Validating, Timely.
REGRA-TEST-02: Padrao AAA (Arrange, Act, Assert) com UMA unica secao Act por teste.
REGRA-TEST-03: Testar COMPORTAMENTO, nao implementacao. Nunca testar metodos privados diretamente.
REGRA-TEST-04: Stubs para incoming interactions. Mocks APENAS para outgoing interactions observaveis.
REGRA-TEST-05: Abordagem classica (Detroit): objetos reais quando possivel, doubles apenas para I/O.
REGRA-TEST-06: Piramide de testes: MUITOS unitarios, ALGUNS integracao, POUCOS E2E.
REGRA-TEST-07: Estrutura de diretorios espelha src/. Separar unit/, integration/, e2e/.
REGRA-TEST-08: Usar pytest fixtures (preferidas sobre setup/teardown classico).
REGRA-TEST-09: Usar Test Data Builders e Object Mothers para criacao de objetos de teste.
REGRA-TEST-10: Coverage minimo: 70-80% branch coverage para logica de dominio.
REGRA-TEST-11: Naming: descritivo em linguagem natural (Khorikov) -- o que, condicao, resultado.
REGRA-TEST-12: Testes do dominio: sem mocks, logica pura.
REGRA-TEST-13: Testes de use cases: com Fakes (InMemoryRepository) nos driven ports.
REGRA-TEST-14: Testes de adapters: integracao contra infraestrutura real (Testcontainers).
REGRA-TEST-15: TDD (Red-Green-Refactor) como disciplina preferida para logica de dominio.
```

### ESTRUTURA DE PASTAS DO PROJETO

```
REGRA-PASTA-01: Estrutura padrao do projeto:

bot-assessor/
|-- src/
|   |-- domain/                          # NUCLEO - Zero dependencias externas
|   |   |-- entities/                    # Entidades com logica de negocio
|   |   |-- value_objects/               # VOs imutaveis (frozen dataclass)
|   |   |-- events/                      # Domain Events (passado, imutaveis)
|   |   |-- services/                    # Domain Services (stateless)
|   |   |-- exceptions/                  # Excecoes de dominio
|   |   |-- specifications/              # Specification Pattern
|   |
|   |-- application/                     # USE CASES - Orquestracao
|   |   |-- ports/
|   |   |   |-- inbound/                 # Driving Ports (API da aplicacao)
|   |   |   |-- outbound/               # Driven Ports (SPI - o que o app precisa)
|   |   |-- commands/                    # Command DTOs (frozen dataclass)
|   |   |-- queries/                     # Query DTOs (frozen dataclass)
|   |   |-- handlers/
|   |   |   |-- command_handlers/        # Um handler por Command
|   |   |   |-- query_handlers/          # Um handler por Query
|   |   |-- services/                    # Application Services
|   |   |-- dto/                         # Application DTOs
|   |   |-- behaviors/                   # Pipeline behaviors
|   |
|   |-- adapters/                        # INFRAESTRUTURA
|   |   |-- inbound/                     # Driving Adapters (entrada)
|   |   |   |-- rest/                    # FastAPI controllers + schemas
|   |   |   |-- websocket/              # WebSocket handlers
|   |   |   |-- cli/                    # CLI handlers
|   |   |   |-- scheduler/             # Scheduled tasks
|   |   |-- outbound/                    # Driven Adapters (saida)
|   |   |   |-- persistence/
|   |   |   |   |-- sqlalchemy/
|   |   |   |   |   |-- models/          # ORM models (NAO sao domain entities!)
|   |   |   |   |   |-- repositories/    # Repository implementations
|   |   |   |   |   |-- mappers/         # Domain <-> ORM mapping
|   |   |   |   |-- in_memory/           # Fakes para testes
|   |   |   |-- broker/                  # Integracao com corretoras
|   |   |   |-- market_data/             # Dados de mercado
|   |   |   |-- notification/            # Telegram, email, etc.
|   |   |   |-- messaging/
|   |   |   |   |-- outbox/             # Outbox Pattern
|   |   |   |   |-- inbox/              # Inbox Pattern
|   |   |-- observability/
|   |   |   |-- tracing.py
|   |   |   |-- metrics.py
|   |   |   |-- logging_config.py
|   |
|   |-- config/                          # Composition Root + Config
|   |   |-- container.py                 # DI Container / Composition Root
|   |   |-- settings.py                  # Environment config
|   |   |-- app_factory.py             # Application Factory
|
|-- tests/
|   |-- unit/
|   |   |-- domain/                      # Testes de dominio (sem mocks, logica pura)
|   |   |-- application/                 # Testes de use cases (com fakes)
|   |-- integration/
|   |   |-- adapters/                    # Testes com infra real
|   |-- e2e/                             # Testes end-to-end
|   |-- fixtures/                        # Test Data Builders, Object Mothers
|   |-- conftest.py                      # Fixtures globais
|
|-- config/
|   |-- otel-collector-config.yaml
|-- docker-compose.yml
|-- pyproject.toml
```

### CHECKLIST DE IMPLEMENTACAO

```
[ ] Dominio definido sem dependencias externas
[ ] Value Objects imutaveis (frozen=True) com validacao
[ ] Entidades com logica de negocio (Rich Domain Model)
[ ] Aggregate Roots como unico ponto de acesso
[ ] Driving Ports definidos como interfaces (ABC/Protocol)
[ ] Driven Ports definidos como interfaces (ABC/Protocol)
[ ] Driving Adapters criados para cada canal de entrada
[ ] Driven Adapters criados para cada servico externo
[ ] Mapeamento de modelos nos adapters (nao no dominio)
[ ] Composition Root configurado (config/container.py)
[ ] Constructor Injection em todas as classes de negocio
[ ] Commands com idempotency_key
[ ] Outbox Pattern para publicacao de eventos
[ ] Inbox Pattern para deduplicacao no consumer
[ ] Logging estruturado em JSON com trace_id/span_id
[ ] Metricas OTEL sem labels de alta cardinalidade
[ ] Testes unitarios do dominio (sem mocks)
[ ] Testes de use cases com fakes nos ports
[ ] Testes de integracao dos adapters
[ ] Nenhum import de infraestrutura no dominio
[ ] Nenhuma logica de negocio nos adapters
[ ] Dependency Rule respeitada (deps apontam para dentro)
[ ] Nenhum Service Locator ou Ambient Context no codigo
[ ] Container so e acessado no Composition Root
```

---

*Documento gerado automaticamente a partir de 8 documentos de referencia de engenharia de software.*
*Total de regras consolidadas: 80+ regras organizadas em 8 categorias.*
