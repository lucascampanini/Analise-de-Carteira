# Regras de Arquitetura - BOT Assessor

## Arquitetura Hexagonal (Ports and Adapters)

### Estrutura de Pastas OBRIGATORIA
```
src/
  domain/                          # NUCLEO - Zero dependencias externas
    entities/                      # Entidades com logica de negocio (Rich Domain Model)
    value_objects/                  # VOs imutaveis (@dataclass(frozen=True))
    events/                        # Domain Events (passado, imutaveis)
    services/                      # Domain Services (stateless)
    exceptions/                    # Excecoes de dominio
    specifications/                # Specification Pattern

  application/                     # USE CASES - Orquestracao via CQRS
    ports/
      inbound/                     # Driving Ports (API da aplicacao)
      outbound/                    # Driven Ports (SPI - o que o app precisa)
    commands/                      # Command DTOs (frozen dataclass + idempotency_key)
    queries/                       # Query DTOs (frozen dataclass)
    handlers/
      command_handlers/            # Um handler por Command (void)
      query_handlers/              # Um handler por Query
    services/                      # Application Services
    dto/                           # Application DTOs
    behaviors/                     # Pipeline behaviors (validation, logging, auth)

  adapters/                        # INFRAESTRUTURA
    inbound/                       # Driving Adapters
      rest/                        # FastAPI controllers + Pydantic schemas
      websocket/                   # WebSocket handlers (market data real-time)
      cli/                         # CLI handlers (Click/Typer)
      scheduler/                   # Scheduled tasks (APScheduler)
    outbound/                      # Driven Adapters
      persistence/
        sqlalchemy/
          models/                  # ORM models (NAO sao domain entities!)
          repositories/            # Repository implementations
          mappers/                 # Domain Entity <-> ORM Model mapping
        in_memory/                 # Fake repositories para testes
      broker/                      # Integracao com corretoras (Cedro, Nelogica)
      market_data/                 # Dados de mercado (brapi, B3 UMDF, yfinance)
      notification/                # Alertas (Telegram, email)
      messaging/
        outbox/                    # Outbox Pattern (transacional)
        inbox/                     # Inbox Pattern (deduplicacao)
    observability/
      tracing.py                   # Setup OTEL tracing
      metrics.py                   # Setup OTEL metrics
      logging_config.py            # structlog JSON config

  config/                          # Composition Root + Config
    container.py                   # DI Container (UNICO lugar com deps concretas)
    settings.py                    # Pydantic Settings por ambiente
    app_factory.py                 # Application Factory

tests/
  unit/
    domain/                        # Sem mocks, logica pura
    application/                   # Com fakes nos driven ports
  integration/
    adapters/                      # Com infra real (Testcontainers)
  e2e/                             # Ciclo completo de trading
  fixtures/                        # Test Data Builders, Object Mothers
  conftest.py                      # Fixtures globais
```

### Dependency Rule
- Domain NAO importa NADA de application, adapters ou config
- Application importa APENAS domain
- Adapters importam domain e application (ports)
- Config importa tudo (Composition Root)

### CQRS
- Commands: `@dataclass(frozen=True)` com `idempotency_key: str`
- Commands sao void (retornam None ou Result)
- Queries: `@dataclass(frozen=True)`, retornam dados, side-effect free
- Um handler por Command/Query (nunca compartilhar)
- Pipeline Behaviors: Validation > Logging > Authorization > Transaction

### Idempotencia
- Toda operacao de escrita (POST/PATCH) DEVE ter Idempotency-Key
- Outbox Pattern: escrever evento E dado na mesma transacao
- Inbox Pattern: deduplicar mensagens recebidas
- UPSERT preferido a INSERT

### Observabilidade
- Logs: JSON estruturado com structlog
- Campos obrigatorios: timestamp, level, service, message, trace_id, span_id
- Metricas: OpenTelemetry com Counter, Gauge, Histogram
- Traces: W3C Trace Context, tail-based sampling
- NUNCA labels de alta cardinalidade (user_id, order_id em metricas)

### Circuit Breaker
- Implementar para cada adapter externo (broker, market data, APIs)
- Estados: CLOSED > OPEN > HALF_OPEN
- Fallback strategies obrigatorias (cache, pausar, modo seguro)

### Injecao de Dependencia
- Constructor Injection como padrao
- Depender de Protocol/ABC, nunca de classes concretas
- Composition Root em config/container.py
- NUNCA Service Locator
- NUNCA injetar o container como dependencia
