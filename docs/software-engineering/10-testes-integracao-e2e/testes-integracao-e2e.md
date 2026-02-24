# Testes de Integracao e Testes End-to-End (E2E) -- Guia Definitivo

> **Nivel:** Referencia PhD
> **Escopo:** Integration Testing, E2E Testing, Contract Testing, API Testing, Testcontainers, Test Data Management, Anti-patterns, Aplicacao a Trading Bots
> **Ultima atualizacao:** 2026-02-07

---

## Indice

1. [Piramide de Testes e Modelos Alternativos](#1-piramide-de-testes-e-modelos-alternativos)
2. [Testes de Integracao -- Definicao e Taxonomia](#2-testes-de-integracao--definicao-e-taxonomia)
3. [Testcontainers -- Infraestrutura Descartavel para Testes](#3-testcontainers--infraestrutura-descartavel-para-testes)
4. [Contract Testing -- Contratos entre Servicos](#4-contract-testing--contratos-entre-servicos)
5. [Testes End-to-End (E2E)](#5-testes-end-to-end-e2e)
6. [API Testing -- Validacao de APIs REST](#6-api-testing--validacao-de-apis-rest)
7. [Test Data Management -- Gestao de Dados de Teste](#7-test-data-management--gestao-de-dados-de-teste)
8. [Anti-patterns de Testes](#8-anti-patterns-de-testes)
9. [Livros Fundamentais -- A "Biblia" de Cada Area](#9-livros-fundamentais--a-biblia-de-cada-area)
10. [Aplicacao ao Trading Bot -- Estrategia Completa](#10-aplicacao-ao-trading-bot--estrategia-completa)
11. [Referencias e Fontes](#11-referencias-e-fontes)

---

## 1. Piramide de Testes e Modelos Alternativos

### 1.1 A Piramide Original de Mike Cohn (2009)

Mike Cohn introduziu a **Piramide de Testes** no livro *"Succeeding with Agile"* (2009) como metafora visual para a distribuicao ideal de testes automatizados. A ideia central: **quanto mais alto na piramide, mais caro, lento e fragil; quanto mais baixo, mais rapido, barato e confiavel**.

```
                    /\
                   /  \
                  / E2E\            <-- Poucos testes: lentos, caros, frageis
                 /______\               (minutos, ambiente completo)
                /        \
               /Integration\        <-- Moderados: velocidade media, custo medio
              /______________\          (segundos, 2+ componentes)
             /                \
            /   Unit Tests     \    <-- Muitos testes: rapidos, baratos, estaveis
           /____________________\       (milissegundos, isolados)
```

#### Proporcionas Ideais (Regra 70/20/10)

| Camada       | Proporcao | Velocidade     | Custo     | Confianca     | Fragilidade |
|--------------|-----------|----------------|-----------|---------------|-------------|
| Unit         | ~70%      | Milissegundos  | Muito baixo | Baixa (isolado) | Muito baixa |
| Integration  | ~20%      | Segundos       | Medio     | Media-Alta    | Media       |
| E2E          | ~10%      | Minutos        | Alto      | Muito Alta    | Alta        |

#### Principio Economico

A piramide e fundamentalmente um **modelo economico**. O ROI (Return on Investment) e maximizado na base porque:

- **Unit tests** custam centavos por execucao e rodam em milissegundos
- **E2E tests** custam dolares por execucao, requerem infraestrutura completa, e sao os mais propensos a falhas intermitentes (flaky)
- A cada camada acima, o custo de manutencao cresce exponencialmente

### 1.2 O Testing Trophy de Kent C. Dodds (2018)

Kent C. Dodds propoe uma redistribuicao radical: **"Write tests. Not too many. Mostly integration."**

```
              __|__
             / E2E \               <-- Poucos (smoke tests criticos)
            /       \
           |Integration|           <-- MAIORIA dos testes (o "corpo" do trofeu)
           |           |
           |           |
           |___________|
            | Unit    |            <-- Alguns (logica pura, utils)
            |_________|
           _|_________|_
          |   Static    |          <-- Base: linting, type checking, formatacao
          |_____________|
```

#### Filosofia Central

> "Integration tests strike a great balance on the trade-offs between confidence and speed/expense. This is why it's advisable to spend most (not all, mind you) of your effort there." -- Kent C. Dodds

**Razoes para priorizar integracao:**

1. **Confianca real**: Unit tests provam que uma funcao funciona isolada, mas nao que o sistema funciona
2. **Custo-beneficio**: Integration tests sao apenas ligeiramente mais lentos que unit tests, mas dao muito mais confianca
3. **Resistencia a refatoracao**: Testar comportamento (integration) em vez de implementacao (unit) reduz quebras por refatoracao
4. **Static analysis como base**: TypeScript, ESLint, mypy, ruff eliminam categorias inteiras de bugs sem testes

#### Atualizacao 2024-2025

Em 2024, Dodds reconhece que com ferramentas como **Playwright** e **Vitest Browser Mode**, os E2E tests ficaram tao rapidos e confiaveis que o trofeu pode estar evoluindo para dar mais peso a camada E2E, especialmente em aplicacoes SSR (Server-Side Rendering).

### 1.3 O Testing Honeycomb do Spotify (2018)

O Spotify propoe o **Honeycomb** (favo de mel) como modelo ideal para **microservicos**:

```
         _______________
        /               \
       |   Integrated    |       <-- Poucos: testes que cruzam multiplos servicos
       |    (E2E)        |
        \___ _________ _/
            |         |
       _____|_________|_____
      /                     \
     |    Integration        |   <-- MAIORIA: interacoes com dependencias
     |    Tests              |       (DB, APIs, message brokers)
     |                       |
      \_____________________/
            |         |
         ___|_________|___
        /                 \
       |  Implementation   |     <-- Poucos: detalhes internos, logica pura
       |  Detail Tests     |
        \_________________/
```

#### Principio Fundamental

> "The biggest complexity in a Microservice is not within the service itself, but in how it **interacts with others**."

- **Implementation Detail Tests** (base): testam logica interna, poucos
- **Integration Tests** (meio): testam como o servico interage com banco, fila, APIs externas -- **MAIORIA**
- **Integrated Tests** (topo): testam multiplos servicos juntos -- poucos, apenas para cenarios criticos

### 1.4 Modelo do Google -- Test Size vs Test Scope

O livro *"Software Engineering at Google"* (Winters, Manshreck & Wright, 2020) introduz uma distincao crucial entre **size** (tamanho) e **scope** (escopo):

#### Test Size (Recursos Necessarios)

| Size   | Processo      | Rede          | DB          | Tempo Max  |
|--------|---------------|---------------|-------------|------------|
| Small  | Single process | Nao          | Nao         | ~60s       |
| Medium | Single machine | localhost     | Sim (local) | ~300s      |
| Large  | Multi-machine  | Sim (rede)   | Sim (remoto)| ~900s+     |

#### Test Scope (O Que Esta Sendo Testado)

| Scope   | Alvo                               | Equivalente Tradicional |
|---------|------------------------------------|------------------------|
| Narrow  | Classe ou metodo individual         | Unit test              |
| Medium  | Interacao entre poucos componentes  | Integration test       |
| Large   | Sistema completo ou subsistema     | E2E test               |

**Insight critico:** Um teste pode ser "small" em size mas "medium" em scope (ex: testar dois modulos juntos em memoria, sem I/O). Essa distincao resolve muita confusao terminologica.

### 1.5 Comparacao dos Modelos

```
 Piramide (Cohn)     Trofeu (Dodds)     Honeycomb (Spotify)     Google
 ================    ===============    ==================    ============
      /E2E\           __|E2E|__          ___Integrated___     Large/Large
     /______\        |Integration|      | Integration   |     Medium/Medium
    / Integr \       |___________|      |_______________|     Small/Narrow
   /__________\      |  Unit  |          |Impl Detail|
  /   Unit     \     |________|          |___________|
 /______________\    |_Static_|
```

| Aspecto             | Piramide     | Trofeu       | Honeycomb    | Google       |
|---------------------|-------------|-------------|-------------|-------------|
| Enfase              | Unit tests  | Integration | Integration | Context-dep.|
| Contexto ideal      | Monolitos   | Frontend    | Microservicos| Qualquer    |
| Anti-pattern combatido | Ice cream | Excessos unit| Excessos E2E| Ambiguidade |
| Ano                 | 2009        | 2018        | 2018        | 2020        |

---

## 2. Testes de Integracao -- Definicao e Taxonomia

### 2.1 Definicao Formal

**Teste de integracao** verifica que **dois ou mais componentes** do sistema funcionam corretamente **quando combinados**. O objetivo nao e testar cada componente isoladamente (isso e unit test), mas sim as **interfaces, contratos e interacoes** entre eles.

> "An integration test verifies the communication paths and interactions between components to detect interface defects." -- ISTQB

### 2.2 A Confusao Terminologica (Martin Fowler)

Martin Fowler documenta extensamente a ambiguidade do termo "integration test". Existem **pelo menos tres definicoes** em uso:

1. **Broad integration test**: Testa multiplos servicos reais juntos (quase E2E)
2. **Narrow integration test**: Testa um servico contra uma dependencia real (DB, API)
3. **"Integration test" como sociable unit test**: Testa uma unidade com suas dependencias reais (sem mocks)

#### Sociable vs. Solitary (Fowler)

```
  Solitary Unit Test:                    Sociable Unit Test:
  +--------+    +------+               +--------+    +--------+
  | Class  | -> | Mock | (isolado)     | Class  | -> | Real   | (real)
  | Under  |    | Dep  |               | Under  |    | Dep    |
  | Test   |    +------+               | Test   |    | Class  |
  +--------+                           +--------+    +--------+
                                                          |
                                                     +--------+
                                                     | Real   |
                                                     | Dep 2  |
                                                     +--------+
```

### 2.3 Narrow vs. Broad Integration Tests

Esta e a taxonomia mais util na pratica, documentada por Martin Fowler e John Mikael Lindbakk:

#### Narrow Integration Tests

- Testam **um servico/modulo** contra **uma dependencia real** (banco de dados, API, fila)
- Outras dependencias sao **mockadas**
- Rapidos (segundos), faceis de debugar
- **Exemplo**: Testar o `OrderRepository` contra um PostgreSQL real (via Testcontainers), com o `PaymentGateway` mockado

```python
# Narrow Integration Test: Repository + Real Database
class TestOrderRepository:
    """Testa o repositorio contra PostgreSQL real via Testcontainers."""

    @pytest.fixture
    def db_session(self, postgres_container):
        engine = create_engine(postgres_container.get_connection_url())
        Base.metadata.create_all(engine)
        session = Session(engine)
        yield session
        session.rollback()
        session.close()

    def test_save_and_retrieve_order(self, db_session):
        # Arrange
        repo = OrderRepository(db_session)
        order = Order(symbol="BTCUSDT", side="BUY", quantity=0.5, price=50000.0)

        # Act
        repo.save(order)
        retrieved = repo.find_by_id(order.id)

        # Assert
        assert retrieved is not None
        assert retrieved.symbol == "BTCUSDT"
        assert retrieved.quantity == 0.5
```

#### Broad Integration Tests

- Testam **multiplos servicos/modulos reais** juntos
- Poucas ou nenhuma dependencia mockada
- Lentos (dezenas de segundos), complexos de configurar
- **Exemplo**: Testar o fluxo completo: `SignalGenerator -> RiskManager -> OrderExecutor -> Database`

```python
# Broad Integration Test: Multiplos componentes reais
class TestTradingPipeline:
    """Testa o pipeline completo com componentes reais."""

    def test_signal_to_order_pipeline(
        self, db_session, signal_generator, risk_manager, order_executor
    ):
        # Arrange - todos componentes reais, apenas broker mockado
        signal = signal_generator.analyze(market_data)

        # Act
        if signal.action == "BUY":
            risk_check = risk_manager.validate(signal)
            if risk_check.approved:
                order = order_executor.execute(signal)

        # Assert
        assert order.status == "FILLED"
        assert db_session.query(Order).count() == 1
        assert risk_manager.current_exposure < risk_manager.max_exposure
```

### 2.4 O Que Testar em Integration Tests

#### Deve Testar (Alta Prioridade)

| Componente                | O Que Validar                                         |
|--------------------------|-------------------------------------------------------|
| **Banco de dados**       | CRUD, migrations, queries complexas, constraints      |
| **Message brokers**      | Publicar/consumir, serialization, dead letter queue    |
| **APIs externas**        | Contratos, tratamento de erros, timeouts, retry        |
| **Cache**                | Hit/miss, TTL, invalidacao, serialization              |
| **File system**          | Leitura/escrita, paths, permissoes                     |
| **Configuracao**         | Environment variables, feature flags, secrets          |

#### Nao Deve Testar (Desperdicio)

- Logica de negocio pura (isso e unit test)
- Frameworks de terceiros (eles ja testam)
- Implementacao interna de classes (fragiliza o teste)

### 2.5 Classificacao de Vladimir Khorikov

No livro *"Unit Testing Principles, Practices, and Patterns"*, Khorikov define:

- **Out-of-process managed dependencies** (banco de dados proprio): testar com a dependencia **real**
- **Out-of-process unmanaged dependencies** (API de terceiros, email): testar com **mocks**

```
                    +-------------------+
                    |   Seu Sistema     |
                    +-------------------+
                           |
              +------------+------------+
              |                         |
    +---------v---------+    +----------v----------+
    | Managed Dependency |    | Unmanaged Dependency |
    | (seu banco de dados)|   | (API externa, email) |
    | TESTAR COM REAL    |    | TESTAR COM MOCK      |
    +--------------------+    +----------------------+
```

---

## 3. Testcontainers -- Infraestrutura Descartavel para Testes

### 3.1 O Que E Testcontainers

**Testcontainers** e uma biblioteca open-source que fornece **containers Docker descartaveis** para testes de integracao. Cada teste recebe um container limpo que e destruido apos o teste, garantindo **isolamento total**.

### 3.2 Por Que Testcontainers

| Problema Antigo                          | Solucao com Testcontainers                    |
|------------------------------------------|-----------------------------------------------|
| H2/SQLite como substituto do Postgres    | Postgres real em container                     |
| Banco de teste compartilhado na equipe   | Cada dev tem seu container efemero             |
| "Works on my machine"                    | Mesmo container em todos os ambientes          |
| CI/CD precisa de infra dedicada          | Container sobe e desce automaticamente         |
| Testes poluem o banco                    | Container destruido = estado limpo             |

### 3.3 Containers Disponiveis

| Servico       | Modulo Testcontainers        | Uso Comum                          |
|---------------|-----------------------------|------------------------------------|
| PostgreSQL    | `testcontainers-postgres`   | Banco relacional principal          |
| Redis         | `testcontainers-redis`      | Cache, session, pub/sub             |
| Kafka         | `testcontainers-kafka`      | Event streaming, mensageria         |
| RabbitMQ      | `testcontainers-rabbitmq`   | Message broker, filas               |
| MongoDB       | `testcontainers-mongodb`    | NoSQL, documentos                   |
| MySQL         | `testcontainers-mysql`      | Banco relacional alternativo        |
| Elasticsearch | `testcontainers-elasticsearch` | Busca full-text                  |
| LocalStack    | `testcontainers-localstack` | AWS (S3, SQS, DynamoDB) local       |

### 3.4 Testcontainers para Python

```python
# requirements.txt
# testcontainers[postgres]==4.x
# testcontainers[redis]==4.x
# testcontainers[kafka]==4.x

import pytest
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# ---- Fixture: PostgreSQL Container ----
@pytest.fixture(scope="session")
def postgres_container():
    """Sobe um PostgreSQL em container Docker para toda a sessao de testes."""
    with PostgresContainer("postgres:16-alpine") as postgres:
        postgres.with_env("POSTGRES_DB", "test_trading")
        yield postgres

@pytest.fixture(scope="function")
def db_session(postgres_container):
    """Cria uma sessao de banco limpa para cada teste."""
    engine = create_engine(postgres_container.get_connection_url())
    Base.metadata.create_all(engine)
    session = Session(engine)
    yield session
    session.rollback()
    session.close()

# ---- Fixture: Redis Container ----
@pytest.fixture(scope="session")
def redis_container():
    """Sobe um Redis em container Docker."""
    with RedisContainer("redis:7-alpine") as redis:
        yield redis

@pytest.fixture
def redis_client(redis_container):
    """Cliente Redis conectado ao container."""
    import redis as r
    client = r.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True
    )
    yield client
    client.flushall()

# ---- Uso nos testes ----
class TestPortfolioRepository:
    def test_save_position(self, db_session):
        repo = PortfolioRepository(db_session)
        position = Position(symbol="BTCUSDT", quantity=1.5, avg_price=45000.0)

        repo.save(position)
        result = repo.find_by_symbol("BTCUSDT")

        assert result.quantity == 1.5
        assert result.avg_price == 45000.0

class TestCacheService:
    def test_cache_market_data(self, redis_client):
        cache = CacheService(redis_client)
        data = {"price": 50000.0, "volume": 1234.5}

        cache.set("BTCUSDT:ticker", data, ttl=60)
        result = cache.get("BTCUSDT:ticker")

        assert result["price"] == 50000.0
```

### 3.5 Lifecycle Management

```
  Teste inicia
       |
       v
  [Docker: create container]
       |
       v
  [Aguarda container healthy]  <-- readiness check (ex: pg_isready)
       |
       v
  [Roda migrations / seed]
       |
       v
  [Executa testes]
       |
       v
  [Rollback / cleanup]
       |
       v
  [Docker: destroy container]
       |
       v
  Teste finalizado (estado limpo)
```

#### Estrategias de Escopo

| Escopo              | Fixture scope | Velocidade | Isolamento | Quando Usar                    |
|---------------------|---------------|------------|------------|-------------------------------|
| Container por teste | `function`    | Lento      | Maximo     | Testes que modificam schema    |
| Container por modulo| `module`      | Medio      | Alto       | Padrao recomendado             |
| Container por sessao| `session`     | Rapido     | Medio      | Quando todos testes sao safe   |

**Melhor pratica**: Container scope `session`, session scope `function` com rollback:

```python
@pytest.fixture(scope="session")
def postgres():
    """Container vive toda a sessao de testes."""
    with PostgresContainer("postgres:16") as pg:
        yield pg

@pytest.fixture(scope="function")
def db(postgres):
    """Cada teste recebe uma transacao que faz rollback."""
    engine = create_engine(postgres.get_connection_url())
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()   # <-- ROLLBACK: desfaz tudo que o teste fez
    connection.close()
```

### 3.6 Linguagens Suportadas

| Linguagem | Pacote                    | Maturidade |
|-----------|---------------------------|------------|
| Java      | `org.testcontainers`      | Mais maduro (original) |
| Python    | `testcontainers-python`   | Maduro     |
| .NET      | `Testcontainers.NET`      | Maduro     |
| Go        | `testcontainers-go`       | Maduro     |
| Rust      | `testcontainers-rs`       | Em crescimento |
| Node.js   | `testcontainers-node`     | Maduro     |

---

## 4. Contract Testing -- Contratos entre Servicos

### 4.1 O Problema

Em arquiteturas com multiplos servicos (microservicos, APIs externas, brokers), como garantir que uma mudanca no **provedor** nao quebra o **consumidor**?

```
  +----------+     HTTP/gRPC      +----------+
  | Consumer | -----------------> | Provider |
  | Service  |    "Contrato"      | Service  |
  +----------+  (implicito!)      +----------+
       |                               |
       |   Se Provider muda o          |
       |   formato da resposta...      |
       |                               |
       +--- Consumer QUEBRA! ----------+
```

### 4.2 Consumer-Driven Contract Testing (CDC)

O **consumidor** define o que espera do provedor. O contrato e gerado a partir dos testes do consumidor e verificado contra o provedor.

```
  1. Consumer escreve testes        2. Gera arquivo Pact
     com expectativas                  (contrato)
  +--------+                       +----------------+
  |Consumer|  ====>                | pact-btcbot-   |
  | Tests  |                       | exchange.json  |
  +--------+                       +----------------+
                                          |
  3. Provider executa                     |
     verificacao contra contrato          v
  +--------+                       +----------------+
  |Provider|  <====                | Pact Broker    |
  | Verify |                       | (repositorio)  |
  +--------+                       +----------------+
```

### 4.3 Pact -- A Ferramenta Padrao

**Pact** e o framework de referencia para consumer-driven contract testing, disponivel para Python, Java, .NET, Go, JavaScript, Ruby.

#### Exemplo: Consumer Side (Python)

```python
import atexit
import unittest
from pact import Consumer, Provider

# Configura o mock do provider
pact = Consumer("TradingBot").has_pact_with(
    Provider("ExchangeAPI"),
    pact_dir="./pacts"
)
pact.start_service()
atexit.register(pact.stop_service)

class TestExchangeAPIContract(unittest.TestCase):
    def test_get_ticker_price(self):
        """Consumer espera que GET /api/ticker/BTCUSDT retorne price e volume."""

        # Define a expectativa (o contrato)
        (pact
         .given("BTCUSDT ticker exists")
         .upon_receiving("a request for BTCUSDT ticker")
         .with_request("GET", "/api/ticker/BTCUSDT")
         .will_respond_with(200, body={
             "symbol": "BTCUSDT",
             "price": 50000.0,    # Pact usa matchers, nao valores exatos
             "volume": 1234.56,
             "timestamp": "2024-01-01T00:00:00Z"
         }))

        # Executa o codigo do consumer contra o mock
        with pact:
            client = ExchangeClient(base_url=pact.uri)
            ticker = client.get_ticker("BTCUSDT")

            assert ticker.symbol == "BTCUSDT"
            assert ticker.price > 0
```

#### Exemplo: Provider Side (Verificacao)

```python
# O provider verifica que satisfaz o contrato do consumer
from pact import Verifier

def test_provider_honors_contract():
    verifier = Verifier(
        provider="ExchangeAPI",
        provider_base_url="http://localhost:8080"
    )

    output, _ = verifier.verify_pacts(
        "./pacts/tradingbot-exchangeapi.json",
        provider_states_setup_url="http://localhost:8080/_pact/setup"
    )

    assert output == 0  # 0 = todos os contratos satisfeitos
```

### 4.4 Contract Testing vs. Integration Testing

| Aspecto                | Contract Testing           | Integration Testing        |
|------------------------|---------------------------|---------------------------|
| **Foco**               | Interface/contrato         | Comportamento completo     |
| **Dependencias**       | Mock (Pact mock service)   | Reais ou simuladas         |
| **Velocidade**         | Muito rapido               | Medio a lento              |
| **Quando quebra**      | Mudanca de schema/contrato | Bug de logica/integracao   |
| **Quem escreve**       | Consumer define, provider verifica | Equipe do servico    |
| **Melhor para**        | Microservicos, APIs        | Qualquer arquitetura       |
| **Nao substitui**      | Integration tests          | Contract tests             |

### 4.5 Schema Testing como Alternativa Leve

Para quem nao quer a complexidade do Pact, **schema testing** valida apenas a estrutura (nao o comportamento):

```python
from jsonschema import validate

TICKER_SCHEMA = {
    "type": "object",
    "required": ["symbol", "price", "volume", "timestamp"],
    "properties": {
        "symbol": {"type": "string", "pattern": "^[A-Z]{3,10}$"},
        "price": {"type": "number", "minimum": 0},
        "volume": {"type": "number", "minimum": 0},
        "timestamp": {"type": "string", "format": "date-time"}
    },
    "additionalProperties": False
}

def test_ticker_response_matches_schema(exchange_client):
    response = exchange_client.get("/api/ticker/BTCUSDT")
    validate(instance=response.json(), schema=TICKER_SCHEMA)
```

---

## 5. Testes End-to-End (E2E)

### 5.1 Definicao

Testes E2E validam o **sistema completo** de ponta a ponta, simulando o fluxo real do usuario ou do processo. Tratam o sistema como **caixa-preta** (black-box): enviam inputs reais e verificam outputs reais.

```
  Input Real                                              Output Real
  (ex: sinal  ---->[Sistema Completo em Execucao]----->  (ex: ordem
   de mercado)      [DB + Cache + API + Engine]           executada,
                    [Todos componentes reais]              P&L atualizado)
```

### 5.2 Caracteristicas dos Testes E2E

| Caracteristica        | Descricao                                              |
|----------------------|--------------------------------------------------------|
| **Escopo**           | Sistema inteiro, todos os componentes reais             |
| **Perspectiva**      | Black-box (externo ao sistema)                          |
| **Ambiente**         | O mais proximo possivel de producao                     |
| **Velocidade**       | Lentos (segundos a minutos por teste)                   |
| **Confianca**        | Maxima -- se passa, o sistema realmente funciona        |
| **Fragilidade**      | Alta -- muitas pecas moveis podem causar falhas falsas  |
| **Quantidade ideal** | Poucos (5-20 cenarios criticos, nao centenas)           |

### 5.3 Quando Usar E2E Tests

**Sim:**
- Fluxos criticos de negocio (happy path principal)
- Smoke tests pos-deploy ("o sistema esta funcionando?")
- Cenarios que envolvem multiplos servicos/sistemas
- Validacao de infraestrutura (DB + cache + API + engine integrados)

**Nao:**
- Validar logica de negocio detalhada (use unit tests)
- Testar permutacoes de input (use property-based tests)
- Testar edge cases de uma funcao (use unit tests)
- Testar toda a matrix de cenarios (use integration tests)

### 5.4 Test Environments

```
  +-------------+    +-------------+    +-------------+    +-------------+
  |   Local     |    |   CI/CD     |    |   Staging   |    |  Production |
  |   Dev       | -> |   Pipeline  | -> |   (pre-prod)| -> |   (canary)  |
  +-------------+    +-------------+    +-------------+    +-------------+
  | Unit tests  |    | Unit tests  |    | E2E tests   |    | Smoke tests |
  | Integration |    | Integration |    | Performance |    | Monitoring  |
  |   (narrow)  |    | + broad     |    | Security    |    |             |
  +-------------+    +-------------+    +-------------+    +-------------+
```

### 5.5 Testes Idempotentes

Um teste **idempotente** deixa o sistema no **mesmo estado** antes e depois da execucao. Isso e critico para E2E tests que rodam em ambientes compartilhados.

```python
class TestTradingE2E:
    """E2E tests idempotentes -- limpam depois de si mesmos."""

    def test_full_trading_cycle(self, trading_system, cleanup_orders):
        """Testa ciclo completo: sinal -> ordem -> execucao -> portfolio."""

        # Arrange
        initial_balance = trading_system.get_balance()

        # Act
        signal = trading_system.generate_signal("BTCUSDT")
        order_id = trading_system.place_order(signal)
        trading_system.wait_for_execution(order_id, timeout=30)

        # Assert
        order = trading_system.get_order(order_id)
        assert order.status == "FILLED"

        portfolio = trading_system.get_portfolio()
        assert "BTCUSDT" in portfolio.positions

        # Cleanup (idempotente)
        trading_system.close_position("BTCUSDT")
        trading_system.wait_for_settlement(timeout=30)

        final_balance = trading_system.get_balance()
        # Balanco deve estar proximo do inicial (menos taxas)
        assert abs(final_balance - initial_balance) < initial_balance * 0.01

    @pytest.fixture
    def cleanup_orders(self, trading_system):
        """Garante limpeza mesmo se o teste falhar."""
        yield
        # Cleanup runs even on test failure
        trading_system.cancel_all_pending_orders()
        trading_system.close_all_positions()
```

### 5.6 Estrategias de Isolamento em E2E

| Estrategia                    | Descricao                           | Trade-off              |
|-------------------------------|-------------------------------------|------------------------|
| Ambiente dedicado por PR      | Cada PR recebe seu ambiente         | Caro, mas isolado      |
| Database por teste            | Cada teste cria seu banco           | Lento, mas seguro      |
| Transacao com rollback        | Tudo dentro de transacao desfeita   | Rapido, mas limitado   |
| Cleanup apos teste            | Delete dos dados criados            | Risco de dados orfaos  |
| Dados com prefixo/namespace   | `test_123_order_456`                | Leve, mas fragil       |

---

## 6. API Testing -- Validacao de APIs REST

### 6.1 Camadas de Validacao de API

```
  +-----------------------------------------------+
  |              API Test Layers                    |
  +-----------------------------------------------+
  |                                                 |
  | 1. Status Code Validation (200, 201, 400, 404) |
  |    assert response.status_code == 200           |
  |                                                 |
  | 2. Response Body Validation                     |
  |    assert response.json()["price"] > 0          |
  |                                                 |
  | 3. Schema Validation (JSON Schema)              |
  |    validate(response.json(), SCHEMA)            |
  |                                                 |
  | 4. Header Validation                            |
  |    assert "application/json" in content_type    |
  |                                                 |
  | 5. Performance Validation                       |
  |    assert response.elapsed < timedelta(ms=500)  |
  |                                                 |
  | 6. Contract Validation (Pact)                   |
  |    Verifica contrato consumer-provider          |
  |                                                 |
  +-----------------------------------------------+
```

### 6.2 Ferramentas por Categoria

| Categoria         | Ferramenta         | Linguagem     | Uso Principal                     |
|-------------------|--------------------|---------------|-----------------------------------|
| HTTP Client       | `httpx`            | Python        | Async HTTP, moderno, tipo requests|
| HTTP Client       | `requests`         | Python        | Sincrono, simples, amplamente usado|
| Test Framework    | `pytest`           | Python        | Fixtures, parametrize, plugins    |
| Schema Validation | `jsonschema`       | Python        | Validacao JSON Schema             |
| Property Testing  | `schemathesis`     | Python        | Gera testes de OpenAPI spec       |
| REST Client       | `RestAssured`      | Java          | DSL fluente para REST tests       |
| API Platform      | `Postman/Newman`   | Multi         | Manual + CI/CD collections        |
| Load Testing      | `Locust`           | Python        | Performance, carga distribuida    |
| Load Testing      | `k6`               | JavaScript    | Performance moderna, cloud        |

### 6.3 Exemplo Completo: API Testing com pytest + httpx

```python
import pytest
import httpx
from jsonschema import validate
from datetime import timedelta

# ---- Schema Definitions ----
ORDER_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["id", "symbol", "side", "quantity", "price", "status", "created_at"],
    "properties": {
        "id": {"type": "string", "format": "uuid"},
        "symbol": {"type": "string"},
        "side": {"enum": ["BUY", "SELL"]},
        "quantity": {"type": "number", "exclusiveMinimum": 0},
        "price": {"type": "number", "exclusiveMinimum": 0},
        "status": {"enum": ["PENDING", "FILLED", "CANCELLED", "REJECTED"]},
        "created_at": {"type": "string", "format": "date-time"}
    }
}

# ---- Fixtures ----
@pytest.fixture(scope="session")
def api_client():
    """Cliente HTTP para a API do trading bot."""
    with httpx.Client(
        base_url="http://localhost:8000",
        headers={"Authorization": "Bearer test-token"},
        timeout=10.0
    ) as client:
        yield client

# ---- Status Code Tests ----
class TestOrderAPI:
    def test_create_order_returns_201(self, api_client):
        response = api_client.post("/api/v1/orders", json={
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.01,
            "price": 50000.0,
            "type": "LIMIT"
        })
        assert response.status_code == 201

    def test_get_nonexistent_order_returns_404(self, api_client):
        response = api_client.get("/api/v1/orders/nonexistent-id")
        assert response.status_code == 404

    def test_invalid_order_returns_422(self, api_client):
        response = api_client.post("/api/v1/orders", json={
            "symbol": "",           # invalido
            "side": "INVALID",      # invalido
            "quantity": -1,         # invalido
        })
        assert response.status_code == 422

    # ---- Schema Validation ----
    def test_order_response_matches_schema(self, api_client):
        response = api_client.post("/api/v1/orders", json={
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.01,
            "price": 50000.0,
            "type": "LIMIT"
        })
        validate(instance=response.json(), schema=ORDER_RESPONSE_SCHEMA)

    # ---- Performance Validation ----
    def test_order_creation_is_fast(self, api_client):
        response = api_client.post("/api/v1/orders", json={
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.01,
            "price": 50000.0,
            "type": "LIMIT"
        })
        assert response.elapsed < timedelta(milliseconds=500)

    # ---- Parametrized Tests ----
    @pytest.mark.parametrize("symbol,expected_status", [
        ("BTCUSDT", 200),
        ("ETHUSDT", 200),
        ("INVALID", 400),
        ("", 422),
    ])
    def test_get_ticker_various_symbols(self, api_client, symbol, expected_status):
        response = api_client.get(f"/api/v1/ticker/{symbol}")
        assert response.status_code == expected_status
```

### 6.4 Property-Based API Testing com Schemathesis

```python
# Gera testes automaticamente a partir da OpenAPI spec
import schemathesis

schema = schemathesis.from_url("http://localhost:8000/openapi.json")

@schema.parametrize()
def test_api_contract(case):
    """Schemathesis gera centenas de requests aleatorios e valida
    que a API responde de acordo com a OpenAPI spec."""
    response = case.call()
    case.validate_response(response)
```

---

## 7. Test Data Management -- Gestao de Dados de Teste

### 7.1 O Problema

Testes de integracao e E2E precisam de **dados**. Gerenciar esses dados e um dos maiores desafios:

- Como criar dados realistas?
- Como garantir isolamento entre testes?
- Como limpar depois?
- Como evitar que um teste dependa de dados de outro?

### 7.2 Estrategias de Criacao de Dados

#### Factories (Factory Pattern)

O padrao mais recomendado. Cada entidade tem uma **factory** que cria instancias com defaults sensiveis:

```python
# factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from datetime import datetime, timezone
from decimal import Decimal
import uuid

class OrderFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Order
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    symbol = "BTCUSDT"
    side = "BUY"
    quantity = factory.LazyFunction(lambda: Decimal("0.01"))
    price = factory.LazyFunction(lambda: Decimal("50000.00"))
    status = "PENDING"
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))

class PortfolioFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Portfolio
        sqlalchemy_session_persistence = "commit"

    owner = "test-bot"
    initial_balance = Decimal("100000.00")
    current_balance = Decimal("100000.00")

# Uso nos testes
def test_order_with_custom_values(db_session):
    OrderFactory._meta.sqlalchemy_session = db_session
    order = OrderFactory(symbol="ETHUSDT", quantity=Decimal("5.0"))
    assert order.symbol == "ETHUSDT"

def test_portfolio_with_multiple_orders(db_session):
    OrderFactory._meta.sqlalchemy_session = db_session
    PortfolioFactory._meta.sqlalchemy_session = db_session

    portfolio = PortfolioFactory()
    orders = OrderFactory.create_batch(10, portfolio_id=portfolio.id)
    assert len(orders) == 10
```

#### Fixtures (pytest)

```python
@pytest.fixture
def sample_market_data():
    """Dados de mercado para testes."""
    return {
        "symbol": "BTCUSDT",
        "candles": [
            {"open": 49000, "high": 51000, "low": 48500, "close": 50000, "volume": 100},
            {"open": 50000, "high": 52000, "low": 49500, "close": 51000, "volume": 120},
            {"open": 51000, "high": 53000, "low": 50500, "close": 52000, "volume": 90},
        ],
        "timeframe": "1h"
    }

@pytest.fixture
def populated_portfolio(db_session):
    """Portfolio com posicoes e historico para testes."""
    portfolio = PortfolioFactory(current_balance=Decimal("50000"))
    OrderFactory.create_batch(5, portfolio_id=portfolio.id, status="FILLED")
    return portfolio
```

#### Database Seeding

```python
# seed.py -- executado antes dos testes E2E
def seed_test_data(db_session):
    """Popula o banco com dados minimos para E2E tests."""

    # Configuracoes base
    db_session.add(TradingConfig(
        max_position_size=Decimal("10000"),
        max_daily_loss=Decimal("500"),
        allowed_symbols=["BTCUSDT", "ETHUSDT"]
    ))

    # Portfolio inicial
    db_session.add(Portfolio(
        owner="e2e-test-bot",
        initial_balance=Decimal("100000"),
        current_balance=Decimal("100000")
    ))

    db_session.commit()
```

### 7.3 Estrategias de Limpeza (Cleanup)

| Estrategia           | Como Funciona                             | Pros                  | Contras               |
|---------------------|-------------------------------------------|-----------------------|-----------------------|
| **Transaction rollback** | Cada teste roda em transacao desfeita | Rapido, confiavel     | Nao funciona com multi-process |
| **Truncate tables** | `TRUNCATE table CASCADE` entre testes     | Rapido, limpo         | Pode quebrar FKs      |
| **Delete all**      | `DELETE FROM table` entre testes          | Seguro                | Mais lento que truncate|
| **Database per test**| Cada teste cria/destroi seu banco        | Isolamento maximo     | Muito lento           |
| **Snapshot/restore** | Restaura snapshot entre testes           | Rapido apos setup     | Complexo de configurar|

#### Implementacao Recomendada: Transaction Rollback

```python
@pytest.fixture(autouse=True)
def db_transaction(db_engine):
    """
    Cada teste roda dentro de uma transacao que e revertida ao final.
    Isso garante isolamento total sem custo de recriacao do banco.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

### 7.4 Database Per Test vs. Shared Database

```
  Database Per Test:                     Shared Database + Rollback:

  Test 1 --> [DB_1] (create/destroy)     Test 1 --> [Shared DB] (begin/rollback)
  Test 2 --> [DB_2] (create/destroy)     Test 2 --> [Shared DB] (begin/rollback)
  Test 3 --> [DB_3] (create/destroy)     Test 3 --> [Shared DB] (begin/rollback)

  - Isolamento: MAXIMO                  - Isolamento: ALTO
  - Velocidade: LENTA                   - Velocidade: RAPIDA
  - Paralelismo: SEGURO                 - Paralelismo: CUIDADO (locks)
  - Uso: Testes que alteram schema      - Uso: Maioria dos testes
```

---

## 8. Anti-patterns de Testes

### 8.1 O Ice Cream Cone Anti-Pattern

A **inversao** da piramide: muitos E2E, poucos unit tests.

```
  Piramide Correta:              Ice Cream Cone (ERRADO):

        /\                              ___________
       /E2E\                           |  Manual   |  <-- Maioria: manual
      /______\                         |___________|
     /Integr. \                        | E2E/UI    |  <-- Muitos E2E
    /___________\                      |___________|
   /  Unit Tests \                     |Integration|  <-- Poucos integration
  /________________\                   |___________|
                                       | Unit      |  <-- Quase nenhum
                                       |___________|
```

**Consequencias:**
- Feedback lento (horas em vez de minutos)
- Testes flaky que ninguem confia
- Desenvolvedores param de rodar testes localmente
- CI/CD pipeline lento, PRs acumulam

### 8.2 Catalogo de Anti-patterns

#### 1. Flaky Tests (Testes Intermitentes)

```
Sintoma: Teste passa 90% das vezes, falha 10%
Causas:
  - Dependencia de timing (sleep, race conditions)
  - Dependencia de ordem de execucao
  - Estado compartilhado entre testes
  - Dependencia de servicos externos instáveis

Solucao:
  - Isolar estado (transaction rollback, containers)
  - Usar retry com backoff apenas como paliativo temporario
  - Marcar como @pytest.mark.flaky e corrigir ASAP
  - Usar polling em vez de sleep fixo
```

```python
# ANTI-PATTERN: sleep fixo
def test_order_execution():
    place_order(order)
    time.sleep(5)  # <-- ERRADO: fragil, lento
    assert get_order_status(order.id) == "FILLED"

# CORRETO: polling com timeout
def test_order_execution():
    place_order(order)
    status = poll_until(
        lambda: get_order_status(order.id),
        condition=lambda s: s == "FILLED",
        timeout=10,
        interval=0.5
    )
    assert status == "FILLED"
```

#### 2. Test Interdependency (Dependencia entre Testes)

```
Sintoma: Test B so passa se Test A rodar antes
Causa: Test A cria dados que Test B precisa

  Test A: cria usuario "john" no banco  -->  Test B: busca usuario "john"
  (se A nao roda, B falha)

Solucao: Cada teste cria seus proprios dados

  Test A: cria "john", testa, limpa
  Test B: cria "john" (proprio), testa, limpa
```

#### 3. Testing Implementation Instead of Behavior

```python
# ANTI-PATTERN: testa implementacao interna
def test_strategy_uses_ema_calculation(strategy):
    strategy.analyze(data)
    strategy._ema_calculator.calculate.assert_called_once_with(data, period=20)
    # Se mudar o nome do metodo interno, teste quebra sem bug real

# CORRETO: testa comportamento
def test_strategy_generates_buy_signal_on_uptrend(strategy):
    data = create_uptrend_data(periods=50)
    signal = strategy.analyze(data)
    assert signal.action == "BUY"
    assert signal.confidence > 0.7
    # Se refatorar internals, teste continua passando
```

#### 4. God Test (Teste que Testa Tudo)

```python
# ANTI-PATTERN: um teste gigante que testa 10 coisas
def test_everything():
    # Cria usuario, faz login, cria portfolio,
    # configura strategy, gera sinal, cria ordem,
    # executa ordem, atualiza portfolio, calcula P&L,
    # envia notificacao... tudo em um teste
    pass  # 200 linhas de teste

# CORRETO: testes focados
def test_signal_generation(): ...
def test_risk_validation(): ...
def test_order_execution(): ...
def test_portfolio_update(): ...
def test_pnl_calculation(): ...
```

#### 5. Testes Lentos Demais

```
Sintoma: Suite de testes demora 30+ minutos
Causas:
  - Muitos E2E tests (ice cream cone)
  - Setup pesado repetido (DB criado por teste)
  - Chamadas reais a APIs externas
  - Falta de paralelismo

Solucao:
  - Mover logica para unit tests (rapidos)
  - Reutilizar containers (session scope)
  - Mock para APIs externas
  - pytest-xdist para paralelismo
  - Categorizar: pytest -m "fast" vs pytest -m "slow"
```

#### 6. Testing Third-Party Code

```python
# ANTI-PATTERN: testar que a biblioteca funciona
def test_sqlalchemy_can_create_table():
    engine.execute("CREATE TABLE test (id INT)")
    result = engine.execute("SELECT 1")
    assert result  # Voce nao precisa testar SQLAlchemy!

# CORRETO: testar SEU codigo que usa a biblioteca
def test_order_repository_saves_order(db_session):
    repo = OrderRepository(db_session)
    order = Order(symbol="BTCUSDT", quantity=0.5)
    repo.save(order)
    assert repo.find_by_id(order.id) is not None
```

### 8.3 Resumo Visual dos Anti-patterns

```
  +------------------------------------------------------------------+
  |                    ANTI-PATTERNS DE TESTES                        |
  +------------------------------------------------------------------+
  | Anti-pattern          | Sintoma              | Severidade         |
  |-----------------------|----------------------|--------------------|
  | Ice Cream Cone        | Muitos E2E, pouco    | CRITICA            |
  |                       | unit test            |                    |
  | Flaky Tests           | Falham aleatoriamente| ALTA               |
  | Test Interdependency  | Ordem importa        | ALTA               |
  | God Test              | Teste com 200+ linhas| MEDIA              |
  | Testing Implementation| Mock de tudo         | MEDIA              |
  | Slow Suite            | 30+ min para rodar   | MEDIA              |
  | Testing 3rd Party     | Testa framework      | BAIXA              |
  | No Assertions         | Teste sem assert     | CRITICA            |
  +------------------------------------------------------------------+
```

---

## 9. Livros Fundamentais -- A "Biblia" de Cada Area

### 9.1 "Unit Testing: Principles, Practices, and Patterns" -- Vladimir Khorikov (2020)

**Editora:** Manning | **ISBN:** 978-1617296277

**Por que e fundamental para integration tests:**
- Parte 3 inteira dedicada a **Integration Testing** (Capitulos 8-11)
- Capitulo 8: "Why integration testing?" -- define quando usar integration vs unit
- Capitulo 9: "Mocking best practices" -- quando mockar e quando usar dependencia real
- Capitulo 10: "Testing the database" -- como testar com banco real, migrations, cleanup
- Capitulo 11: "Integration testing best practices"

**Conceitos-chave:**
- **Managed vs Unmanaged Dependencies**: banco de dados proprio = teste real; API externa = mock
- **Shared vs Private Dependencies**: banco compartilhado precisa de isolamento; fila privada nao
- **Humble Object Pattern**: separe logica complexa (unit testavel) de I/O (integration testavel)

### 9.2 "Growing Object-Oriented Software, Guided by Tests" -- Steve Freeman & Nat Pryce (2009)

**Editora:** Addison-Wesley | **ISBN:** 978-0321503626

**Contribuicao fundamental:**
- Abordagem **outside-in TDD**: comeca com um E2E test que falha, depois desce para integration e unit
- **Walking Skeleton**: primeira coisa a construir e um fluxo E2E minimo que funciona de ponta a ponta
- **Mock Objects**: Freeman e Pryce sao os criadores do conceito de mock objects (jMock)
- **Ports and Adapters**: testar adapters via integration tests, dominio via unit tests

**Ciclo Outside-In:**
```
  1. Escreva um E2E test (falha)
       |
  2. Escreva um Integration test (falha)
       |
  3. Escreva um Unit test (falha)
       |
  4. Implemente o minimo para o unit test passar
       |
  5. Integration test agora passa?
       |-- Nao: volte ao passo 3
       |-- Sim: continue
       |
  6. E2E test agora passa?
       |-- Nao: volte ao passo 2
       |-- Sim: refatore, proximo feature
```

### 9.3 "Continuous Delivery" -- Jez Humble & David Farley (2010)

**Editora:** Addison-Wesley | **ISBN:** 978-0321601919

**Contribuicao para testes:**
- **Deployment Pipeline**: sequencia automatizada de estagios de teste
  - Commit Stage: unit tests + build (minutos)
  - Acceptance Stage: integration + E2E automatizados (dezenas de minutos)
  - Capacity Stage: performance e carga
  - Manual Stage: exploratory testing
  - Production: smoke tests + monitoring

- **Principio**: "If it hurts, do it more frequently, and bring the pain forward"
- **Ambientes**: cada estagio roda em ambiente progressivamente mais proximo de producao

### 9.4 "Building Microservices" -- Sam Newman (2a edicao, 2021)

**Editora:** O'Reilly | **ISBN:** 978-1492034018

**Capitulo 9: Testing** -- Uma das melhores referencias para testing de sistemas distribuidos:
- **Consumer-Driven Contracts (CDCs)**: alternativa a E2E tests em microservicos
- **Testing Diamond**: para microservicos, priorize integration sobre unit e E2E
- **In-Production Testing**: canary releases, feature flags, observability como "teste"
- **Pact**: recomendacao explicita para CDC testing

**Insight central:**
> "The more moving parts, the more brittle our tests. If we can get the same level of confidence from a consumer-driven contract test as from an end-to-end test, prefer the contract test."

### 9.5 "Software Engineering at Google" -- Winters, Manshreck & Wright (2020)

**Editora:** O'Reilly | **ISBN:** 978-1492082798

**Capitulos de Testing (11-14):**
- **Chapter 11: Testing Overview** -- filosofia geral, test sizes vs scopes
- **Chapter 12: Unit Testing** -- boas praticas, naming, structure
- **Chapter 13: Test Doubles** -- mocks, fakes, stubs; quando usar cada um
- **Chapter 14: Larger Testing** -- integration, E2E, performance, fuzz testing

**Regra do Google para proporcionas:**
- ~80% Small tests (unit)
- ~15% Medium tests (integration)
- ~5% Large tests (E2E)

**Conceito de "Test Certified":** sistema de niveis (1-5) que mede maturidade de testes de um time.

### 9.6 Tabela Comparativa dos Livros

| Livro                          | Autor(es)                | Ano  | Foco Principal              | Melhor Para         |
|-------------------------------|--------------------------|------|-----------------------------|---------------------|
| Unit Testing                  | Khorikov                 | 2020 | Unit + Integration patterns  | Backend developers  |
| Growing OO Software           | Freeman & Pryce          | 2009 | Outside-in TDD, mocks        | OOP practitioners   |
| Continuous Delivery           | Humble & Farley          | 2010 | Pipeline, automation          | DevOps, CI/CD       |
| Building Microservices        | Newman                   | 2021 | Microservicos, contracts      | Distributed systems |
| SE at Google                  | Winters, Manshreck, Wright| 2020| Praticas em escala Google     | Engineering leaders  |

---

## 10. Aplicacao ao Trading Bot -- Estrategia Completa

### 10.1 Arquitetura do Bot e Mapeamento de Testes

```
  +------------------------------------------------------------------+
  |                    TRADING BOT ARCHITECTURE                       |
  +------------------------------------------------------------------+
  |                                                                    |
  |  [Market Data]  --> [Signal Generator] --> [Risk Manager]         |
  |       |                    |                     |                 |
  |       |              [Strategy Engine]      [Position Sizer]      |
  |       |                    |                     |                 |
  |       v                    v                     v                 |
  |  [Data Store]  <-- [Order Manager] --> [Broker API]              |
  |       |                    |                     |                 |
  |       v                    v                     v                 |
  |  [Portfolio]   <-- [Execution Engine] --> [Exchange]              |
  |       |                    |                                       |
  |       v                    v                                       |
  |  [P&L Calculator]   [Notification Service]                        |
  |                                                                    |
  +------------------------------------------------------------------+
```

### 10.2 Mapeamento: Componente -> Tipo de Teste

| Componente              | Unit Test                        | Integration Test                    | E2E Test                        |
|------------------------|----------------------------------|-------------------------------------|---------------------------------|
| Strategy Engine         | Calculo de indicadores           | Strategy + Risk Manager juntos      | Ciclo completo de trading       |
| Risk Manager            | Limites, position sizing         | Risk + Portfolio + DB               | --                              |
| Order Manager           | Validacao de ordens              | Order + DB + Mock Broker            | Sinal -> Ordem -> Execucao      |
| Data Store (Repository) | --                               | Repository + PostgreSQL real        | --                              |
| Broker Adapter          | Parsing de responses             | Adapter + Mock HTTP (VCR)           | Adapter + Testnet/Sandbox       |
| P&L Calculator          | Calculo de lucro/perda           | P&L + Portfolio + DB                | --                              |
| Portfolio               | Balanco, exposicao               | Portfolio + todas as posicoes no DB  | Portfolio update apos trade     |

### 10.3 Testes de Integracao para o Trading Bot

#### Test 1: Strategy + Risk Manager (Narrow Integration)

```python
class TestStrategyRiskIntegration:
    """Testa que a Strategy gera sinais que o Risk Manager sabe avaliar."""

    def test_buy_signal_passes_risk_check(self):
        # Arrange
        strategy = MomentumStrategy(lookback=20, threshold=0.02)
        risk_manager = RiskManager(
            max_position_pct=0.1,
            max_daily_loss=500.0,
            current_portfolio_value=100000.0
        )
        market_data = create_bullish_data(periods=50)

        # Act
        signal = strategy.analyze(market_data)
        risk_result = risk_manager.evaluate(signal)

        # Assert
        assert signal.action == "BUY"
        assert risk_result.approved is True
        assert risk_result.position_size <= 10000.0  # max 10% do portfolio

    def test_large_signal_rejected_by_risk(self):
        strategy = AggressiveStrategy()
        risk_manager = RiskManager(
            max_position_pct=0.05,   # apenas 5%
            max_daily_loss=200.0,     # loss apertado
            current_portfolio_value=10000.0  # portfolio pequeno
        )

        signal = Signal(action="BUY", symbol="BTCUSDT",
                       quantity=1.0, price=50000.0)  # 50k > 5% de 10k
        risk_result = risk_manager.evaluate(signal)

        assert risk_result.approved is False
        assert "exceeds max position" in risk_result.reason
```

#### Test 2: Order Pipeline + Mock Broker (Narrow Integration)

```python
class TestOrderPipelineIntegration:
    """Testa o pipeline de ordens completo com broker mockado."""

    @pytest.fixture
    def mock_broker(self):
        broker = MockBrokerClient()
        broker.configure_response("place_order", {
            "order_id": "mock-123",
            "status": "FILLED",
            "filled_price": 50100.0,
            "filled_quantity": 0.01,
            "commission": 0.50
        })
        return broker

    def test_order_pipeline_signal_to_execution(
        self, db_session, mock_broker
    ):
        # Arrange
        order_manager = OrderManager(
            broker=mock_broker,
            repository=OrderRepository(db_session),
            portfolio=PortfolioService(db_session)
        )
        signal = Signal(
            action="BUY",
            symbol="BTCUSDT",
            quantity=0.01,
            price=50000.0,
            stop_loss=49000.0,
            take_profit=52000.0
        )

        # Act
        result = order_manager.execute_signal(signal)

        # Assert - Ordem criada corretamente
        assert result.status == "FILLED"
        assert result.filled_price == 50100.0

        # Assert - Persistencia no banco
        saved_order = db_session.query(Order).filter_by(
            broker_order_id="mock-123"
        ).first()
        assert saved_order is not None
        assert saved_order.commission == 0.50

        # Assert - Portfolio atualizado
        portfolio = db_session.query(Portfolio).first()
        position = portfolio.get_position("BTCUSDT")
        assert position.quantity == 0.01
        assert position.avg_entry_price == 50100.0
```

#### Test 3: Repository + PostgreSQL Real (Testcontainers)

```python
class TestTradingRepositoryIntegration:
    """Testa repositorios contra PostgreSQL real."""

    @pytest.fixture(scope="session")
    def postgres(self):
        with PostgresContainer("postgres:16-alpine") as pg:
            yield pg

    @pytest.fixture
    def session(self, postgres):
        engine = create_engine(postgres.get_connection_url())
        Base.metadata.create_all(engine)
        session = Session(engine)
        yield session
        session.rollback()
        session.close()

    def test_complex_portfolio_query(self, session):
        """Testa query complexa que so funciona com SQL real."""
        # Arrange
        OrderFactory._meta.sqlalchemy_session = session
        # Cria ordens em diferentes datas e simbolos
        for i in range(100):
            OrderFactory(
                symbol=f"SYM{i % 5}",
                side="BUY" if i % 2 == 0 else "SELL",
                quantity=Decimal(str(i * 0.1)),
                created_at=datetime(2024, 1, 1) + timedelta(days=i)
            )

        # Act
        repo = AnalyticsRepository(session)
        daily_pnl = repo.calculate_daily_pnl(
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 3, 31)
        )

        # Assert
        assert len(daily_pnl) > 0
        assert all(isinstance(pnl.value, Decimal) for pnl in daily_pnl)

    def test_concurrent_order_creation(self, session):
        """Testa constraints de banco sob concorrencia."""
        repo = OrderRepository(session)

        # Testa unique constraint
        order1 = Order(client_order_id="unique-123", symbol="BTCUSDT")
        order2 = Order(client_order_id="unique-123", symbol="BTCUSDT")  # duplicado

        repo.save(order1)
        with pytest.raises(IntegrityError):
            repo.save(order2)
```

### 10.4 Testes E2E para o Trading Bot

#### Test E2E 1: Ciclo Completo de Trading

```python
@pytest.mark.e2e
class TestFullTradingCycle:
    """
    E2E: Simula ciclo completo de trading.
    Sinal -> Validacao -> Ordem -> Execucao -> Portfolio -> P&L

    Usa broker sandbox/testnet (nao mock).
    """

    @pytest.fixture(scope="class")
    def trading_bot(self, postgres_container, redis_container):
        """Inicializa o bot completo com infraestrutura real."""
        config = TradingConfig(
            db_url=postgres_container.get_connection_url(),
            redis_url=redis_container.get_connection_url(),
            broker_mode="sandbox",  # testnet, nao producao!
            initial_balance=100000.0
        )
        bot = TradingBot(config)
        bot.initialize()
        yield bot
        bot.shutdown()

    def test_buy_and_sell_cycle(self, trading_bot):
        """Testa: recebe dados -> gera sinal -> executa -> atualiza portfolio."""

        # 1. Injeta dados de mercado (simula feed)
        market_data = load_historical_data("BTCUSDT", "1h", periods=100)
        trading_bot.feed_market_data(market_data)

        # 2. Aguarda sinal (com timeout)
        signal = poll_until(
            trading_bot.get_latest_signal,
            condition=lambda s: s is not None,
            timeout=30
        )
        assert signal is not None
        assert signal.symbol == "BTCUSDT"

        # 3. Verifica que ordem foi criada
        orders = trading_bot.get_open_orders()
        assert len(orders) >= 1

        # 4. Aguarda execucao
        filled_order = poll_until(
            lambda: trading_bot.get_order(orders[0].id),
            condition=lambda o: o.status == "FILLED",
            timeout=60
        )
        assert filled_order.status == "FILLED"

        # 5. Verifica portfolio atualizado
        portfolio = trading_bot.get_portfolio()
        assert "BTCUSDT" in [p.symbol for p in portfolio.positions]

        # 6. Verifica P&L calculado
        pnl = trading_bot.get_current_pnl()
        assert pnl is not None
        assert isinstance(pnl.unrealized, float)

        # 7. Cleanup: fecha posicao
        trading_bot.close_all_positions()
        final_portfolio = trading_bot.get_portfolio()
        assert len(final_portfolio.positions) == 0

    def test_risk_limits_prevent_excessive_trading(self, trading_bot):
        """E2E: verifica que limites de risco funcionam no sistema completo."""

        # Configura limites apertados
        trading_bot.update_risk_config(max_daily_trades=2)

        # Executa 3 trades
        for i in range(3):
            trading_bot.force_signal(Signal(
                action="BUY", symbol="BTCUSDT",
                quantity=0.001, price=50000 + i
            ))

        # Terceiro deve ser rejeitado
        orders = trading_bot.get_orders_today()
        filled = [o for o in orders if o.status == "FILLED"]
        rejected = [o for o in orders if o.status == "REJECTED"]

        assert len(filled) == 2
        assert len(rejected) == 1
        assert "daily limit" in rejected[0].rejection_reason
```

#### Test E2E 2: Smoke Test Pos-Deploy

```python
@pytest.mark.smoke
class TestTradingBotSmoke:
    """Smoke tests minimos para verificar que o sistema esta operacional."""

    def test_bot_starts_successfully(self, trading_bot):
        assert trading_bot.is_running()

    def test_database_connection(self, trading_bot):
        assert trading_bot.health_check()["database"] == "healthy"

    def test_broker_connection(self, trading_bot):
        assert trading_bot.health_check()["broker"] == "connected"

    def test_market_data_feed(self, trading_bot):
        ticker = trading_bot.get_ticker("BTCUSDT")
        assert ticker.price > 0
        assert ticker.volume > 0

    def test_can_place_test_order(self, trading_bot):
        """Coloca e cancela uma ordem de teste."""
        order = trading_bot.place_test_order(
            symbol="BTCUSDT",
            side="BUY",
            quantity=0.0001,  # quantidade minima
            price=1.0         # preco absurdo (nao executa)
        )
        assert order.status in ["PENDING", "NEW"]

        trading_bot.cancel_order(order.id)
        cancelled = trading_bot.get_order(order.id)
        assert cancelled.status == "CANCELLED"
```

### 10.5 Estrutura de Diretorios para Testes do Bot

```
tests/
|-- conftest.py                    # Fixtures globais (containers, factories)
|-- unit/                          # ~70% dos testes
|   |-- test_strategy_engine.py    # Logica de indicadores, sinais
|   |-- test_risk_manager.py       # Limites, position sizing
|   |-- test_pnl_calculator.py     # Calculo de P&L
|   |-- test_order_validator.py    # Validacao de ordens
|   +-- test_portfolio_math.py     # Balanco, exposicao
|
|-- integration/                   # ~20% dos testes
|   |-- conftest.py                # Fixtures: Testcontainers, DB sessions
|   |-- test_strategy_risk.py      # Strategy + Risk Manager
|   |-- test_order_pipeline.py     # Order Manager + DB + Mock Broker
|   |-- test_repositories.py       # Repositories + PostgreSQL real
|   |-- test_cache_service.py      # Cache Service + Redis real
|   +-- test_broker_adapter.py     # Broker Adapter + recorded responses
|
|-- e2e/                           # ~10% dos testes
|   |-- conftest.py                # Fixtures: full system setup
|   |-- test_trading_cycle.py      # Ciclo completo de trading
|   |-- test_risk_limits_e2e.py    # Limites de risco no sistema completo
|   +-- test_smoke.py              # Smoke tests pos-deploy
|
|-- fixtures/                      # Dados de teste
|   |-- market_data/               # Dados historicos (CSV, JSON)
|   |-- recorded_responses/        # VCR cassettes (respostas da exchange)
|   +-- seed_data.py               # Database seeding
|
+-- factories/                     # Factory Boy factories
    |-- order_factory.py
    |-- portfolio_factory.py
    +-- signal_factory.py
```

### 10.6 Configuracao pytest para o Bot

```ini
# pytest.ini
[pytest]
markers =
    unit: Unit tests (fast, isolated)
    integration: Integration tests (need Docker)
    e2e: End-to-end tests (need full system)
    smoke: Smoke tests (minimal health checks)
    slow: Tests that take > 10 seconds

testpaths = tests
addopts =
    --strict-markers
    -v
    --tb=short

# Para rodar subconjuntos:
# pytest -m unit                    # So unit tests (~2 segundos)
# pytest -m integration             # So integration (~30 segundos)
# pytest -m e2e                     # So E2E (~2 minutos)
# pytest -m "not slow"              # Tudo menos lentos
# pytest -m "unit or integration"   # Unit + Integration
```

### 10.7 Pipeline CI/CD para Testes do Bot

```
  +------------------------------------------------------------+
  |                    CI/CD PIPELINE                            |
  +------------------------------------------------------------+
  |                                                              |
  |  Stage 1: Commit (< 2 min)                                  |
  |  +--------------------------------------------------+       |
  |  | - Lint (ruff, mypy)                               |       |
  |  | - Unit tests (pytest -m unit)                     |       |
  |  | - Coverage check (> 80%)                          |       |
  |  +--------------------------------------------------+       |
  |                        |                                     |
  |                        v                                     |
  |  Stage 2: Integration (< 10 min)                             |
  |  +--------------------------------------------------+       |
  |  | - Docker containers up (Testcontainers)           |       |
  |  | - Integration tests (pytest -m integration)       |       |
  |  | - Contract tests (Pact verify)                    |       |
  |  +--------------------------------------------------+       |
  |                        |                                     |
  |                        v                                     |
  |  Stage 3: E2E (< 20 min)                                    |
  |  +--------------------------------------------------+       |
  |  | - Full system deploy (Docker Compose)             |       |
  |  | - E2E tests (pytest -m e2e)                       |       |
  |  | - Smoke tests                                     |       |
  |  +--------------------------------------------------+       |
  |                        |                                     |
  |                        v                                     |
  |  Stage 4: Performance (nightly, < 60 min)                    |
  |  +--------------------------------------------------+       |
  |  | - Load tests (Locust)                             |       |
  |  | - Latency benchmarks                              |       |
  |  | - Memory leak detection                           |       |
  |  +--------------------------------------------------+       |
  |                                                              |
  +------------------------------------------------------------+
```

---

## 11. Referencias e Fontes

### 11.1 Fontes Primarias (Artigos e Blogs)

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 1 | Test Pyramid | Martin Fowler | 2012 | Blog/Bliki | https://martinfowler.com/bliki/TestPyramid.html |
| 2 | The Practical Test Pyramid | Ham Vocke (Fowler) | 2018 | Artigo | https://martinfowler.com/articles/practical-test-pyramid.html |
| 3 | Integration Test (Bliki) | Martin Fowler | 2024 | Blog/Bliki | https://martinfowler.com/bliki/IntegrationTest.html |
| 4 | Write tests. Not too many. Mostly integration. | Kent C. Dodds | 2019 | Blog | https://kentcdodds.com/blog/write-tests |
| 5 | The Testing Trophy and Testing Classifications | Kent C. Dodds | 2021 | Blog | https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications |
| 6 | Static vs Unit vs Integration vs E2E Testing | Kent C. Dodds | 2019 | Blog | https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests |
| 7 | Testing of Microservices (Honeycomb) | Spotify Engineering | 2018 | Blog | https://engineering.atspotify.com/2018/01/testing-of-microservices |
| 8 | Patterns of Narrow Integration Testing | John M. Lindbakk | 2024 | Blog | https://lindbakk.com/blog/patterns-of-narrow-integration-testing |
| 9 | On the Diverse And Fantastical Shapes of Testing | Martin Fowler | 2021 | Artigo | https://martinfowler.com/articles/2021-test-shapes.html |
| 10 | Best practices for creating E2E tests | Datadog | 2024 | Blog | https://www.datadoghq.com/blog/test-creation-best-practices/ |

### 11.2 Fontes Primarias (Livros)

| # | Titulo | Autor(es) | Ano | Editora | ISBN |
|---|--------|-----------|-----|---------|------|
| 11 | Unit Testing: Principles, Practices, and Patterns | Vladimir Khorikov | 2020 | Manning | 978-1617296277 |
| 12 | Growing Object-Oriented Software, Guided by Tests | Steve Freeman, Nat Pryce | 2009 | Addison-Wesley | 978-0321503626 |
| 13 | Continuous Delivery | Jez Humble, David Farley | 2010 | Addison-Wesley | 978-0321601919 |
| 14 | Building Microservices (2nd ed.) | Sam Newman | 2021 | O'Reilly | 978-1492034018 |
| 15 | Software Engineering at Google | Titus Winters, Tom Manshreck, Hyrum Wright | 2020 | O'Reilly | 978-1492082798 |
| 16 | Succeeding with Agile (Test Pyramid origin) | Mike Cohn | 2009 | Addison-Wesley | 978-0321579362 |

### 11.3 Fontes Tecnicas (Ferramentas e Documentacao)

| # | Titulo | Tipo | URL |
|---|--------|------|-----|
| 17 | Testcontainers Official Documentation | Docs | https://testcontainers.com/guides/ |
| 18 | Testcontainers for Python | Docs | https://testcontainers-python.readthedocs.io/ |
| 19 | Testcontainers Best Practices (Docker) | Blog | https://www.docker.com/blog/testcontainers-best-practices/ |
| 20 | Pact Documentation | Docs | https://docs.pact.io/ |
| 21 | Consumer-Driven Contract Testing | PactFlow | https://pactflow.io/what-is-consumer-driven-contract-testing/ |
| 22 | CDC Testing - Microsoft Engineering Playbook | Docs | https://microsoft.github.io/code-with-engineering-playbook/automated-testing/cdc-testing/ |
| 23 | E2E Testing - Microsoft Engineering Playbook | Docs | https://microsoft.github.io/code-with-engineering-playbook/automated-testing/e2e-testing/ |
| 24 | Schemathesis - Property-based API Testing | Tool | https://schemathesis.io/ |
| 25 | FastAPI Testing Documentation | Docs | https://fastapi.tiangolo.com/tutorial/testing/ |

### 11.4 Fontes Complementares

| # | Titulo | Autor(es) | Tipo | URL |
|---|--------|-----------|------|-----|
| 26 | The Ice Cream Cone Testing Approach | testRigor | Blog | https://testrigor.com/blog/the-ice-cream-cone-testing-approach/ |
| 27 | Introducing the Software Testing Cupcake Anti-Pattern | ThoughtWorks | Blog | https://www.thoughtworks.com/insights/blog/introducing-software-testing-cupcake-anti-pattern |
| 28 | Integration Testing Best Practices in Java | Digma | Blog | https://digma.ai/integration-testing-in-java/ |
| 29 | Database Testing with Fixtures and Seeding | Neon | Blog | https://neon.com/blog/database-testing-with-fixtures-and-seeding |
| 30 | 4 Practical Principles of Database Integration Tests in Go | Three Dots Labs | Blog | https://threedots.tech/post/database-integration-testing/ |
| 31 | Effective Integration Testing with Database in .NET | NimblePros | Blog | https://blog.nimblepros.com/blogs/integration-testing-with-database/ |
| 32 | Larger Testing (Ch. 14) - SE at Google | O'Reilly | Livro | https://www.oreilly.com/library/view/software-engineering-at/9781492082781/ch14.html |

---

## Apendice A: Glossario

| Termo | Definicao |
|-------|-----------|
| **Unit Test** | Teste que valida uma unica unidade de codigo (funcao, classe) em isolamento |
| **Integration Test** | Teste que valida a interacao entre 2+ componentes reais |
| **E2E Test** | Teste que valida o sistema completo de ponta a ponta |
| **Contract Test** | Teste que valida o contrato (interface) entre consumer e provider |
| **Smoke Test** | Teste minimo que verifica se o sistema esta operacional |
| **Flaky Test** | Teste que falha intermitentemente sem mudanca de codigo |
| **Test Double** | Substituto generico para dependencia (mock, stub, fake, spy, dummy) |
| **Mock** | Test double que verifica interacoes (chamadas a metodos) |
| **Stub** | Test double que retorna respostas pre-configuradas |
| **Fake** | Implementacao simplificada funcional (ex: banco in-memory) |
| **Fixture** | Dados ou objetos pre-configurados para testes |
| **Factory** | Codigo que cria objetos de teste com defaults sensiveis |
| **SUT** | System Under Test -- o que esta sendo testado |
| **Testcontainers** | Biblioteca que fornece containers Docker descartaveis para testes |
| **CDC** | Consumer-Driven Contracts -- consumer define o contrato |
| **Walking Skeleton** | Implementacao minima E2E que conecta todas as camadas |
| **Humble Object** | Pattern que separa logica (testavel) de I/O (integracao) |

---

## Apendice B: Cheat Sheet -- Decisao de Tipo de Teste

```
  Preciso testar...
  |
  |-- Logica pura (calculo, algoritmo, validacao)?
  |   --> UNIT TEST
  |
  |-- Interacao com banco de dados?
  |   --> INTEGRATION TEST (Testcontainers)
  |
  |-- Interacao com API externa?
  |   |-- Meu contrato com ela?
  |   |   --> CONTRACT TEST (Pact)
  |   |-- Comportamento real?
  |       --> INTEGRATION TEST (recorded responses / VCR)
  |
  |-- Dois modulos internos juntos?
  |   --> INTEGRATION TEST (narrow)
  |
  |-- O sistema inteiro funciona?
  |   --> E2E TEST (poucos, criticos)
  |
  |-- O deploy funcionou?
  |   --> SMOKE TEST
  |
  |-- Performance sob carga?
      --> LOAD TEST (Locust, k6)
```

---

> **Documento compilado em:** 2026-02-07
> **Fontes consultadas:** 32 referencias entre livros, artigos, documentacao oficial e blogs de engenharia
> **Aplicacao principal:** BOT Assessor -- Sistema de Trading Automatizado
