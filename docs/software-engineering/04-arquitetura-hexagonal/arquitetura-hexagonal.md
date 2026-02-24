# Arquitetura Hexagonal (Ports and Adapters)

**Pesquisa Aprofundada - Nivel PhD**
**Data:** 2026-02-07
**Escopo:** Conceitos fundamentais, implementacao pratica e aplicacao ao Trading Bot

---

## Sumario

1. [Origem e Conceitos Fundamentais](#1-origem-e-conceitos-fundamentais)
2. [Ports (Portas)](#2-ports-portas)
3. [Adapters (Adaptadores)](#3-adapters-adaptadores)
4. [Dependency Rule e Inversao de Dependencia](#4-dependency-rule-e-inversao-de-dependencia)
5. [Comparacao com Outras Arquiteturas](#5-comparacao-com-outras-arquiteturas)
6. [Estrutura de Pastas](#6-estrutura-de-pastas)
7. [Testabilidade](#7-testabilidade)
8. [Anti-Patterns e Armadilhas Comuns](#8-anti-patterns-e-armadilhas-comuns)
9. [Aplicacao ao Trading Bot](#9-aplicacao-ao-trading-bot)
10. [Livros e Referencias Fundamentais](#10-livros-e-referencias-fundamentais)

---

## 1. Origem e Conceitos Fundamentais

### 1.1 Historia e Motivacao

A **Arquitetura Hexagonal** foi concebida por **Alistair Cockburn** em 2005, inicialmente descrita no wiki de Ward Cunningham (c2.com) em 2004, e publicada formalmente em seu site em setembro de 2005. Cockburn a batizou posteriormente como **Ports and Adapters**, nome que descreve com mais precisao o mecanismo central do padrao.

**Problema original que resolve:**
Cockburn observou que sistemas de software sofrem de problemas estruturais recorrentes:

- Contaminacao da logica de negocios com codigo de interface grafica
- Dependencias indesejadas entre camadas
- Impossibilidade de testar o sistema sem infraestrutura real (banco de dados, APIs)
- Acoplamento rigido que impede troca de tecnologias

**Definicao canonica (Cockburn, 2005):**

> "Allow an application to equally be driven by users, programs, automated test
> or batch scripts, and to be developed and tested in isolation from its eventual
> run-time devices and databases."

### 1.2 O Hexagono: Inside vs Outside

A metafora do hexagono divide o sistema em duas regioes fundamentais:

```
                        O U T S I D E
    +---------------------------------------------------------+
    |                                                         |
    |    [REST API]    [CLI]    [gRPC]    [Message Queue]     |
    |        |           |        |             |             |
    |        v           v        v             v             |
    |   +-------------------------------------------+        |
    |   |          DRIVING ADAPTERS (IN)            |        |
    |   +-------------------------------------------+        |
    |        |           |        |             |             |
    |        v           v        v             v             |
    |   +===========================================+        |
    |   ||          DRIVING PORTS (IN)             ||        |
    |   ||=========================================||        |
    |   ||                                         ||        |
    |   ||       +---------------------------+     ||        |
    |   ||       |     APPLICATION LAYER     |     ||        |
    |   ||       |      (Use Cases /         |     ||        |
    |   ||       |    Application Services)  |     ||        |
    |   ||       +---------------------------+     ||        |
    |   ||                  |                      ||        |
    |   ||                  v                      ||        |
    |   ||       +---------------------------+     ||        |
    |   ||       |      DOMAIN LAYER         |     ||        |
    |   ||       |   (Entities, Value Objs,  |     ||        |
    |   ||       |    Domain Services,       |     ||        |
    |   ||       |    Business Rules)        |     ||        |
    |   ||       +---------------------------+     ||        |
    |   ||                                         ||        |
    |   ||=========================================||        |
    |   ||         DRIVEN PORTS (OUT)              ||        |
    |   +===========================================+        |
    |        |           |        |             |             |
    |        v           v        v             v             |
    |   +-------------------------------------------+        |
    |   |          DRIVEN ADAPTERS (OUT)            |        |
    |   +-------------------------------------------+        |
    |        |           |        |             |             |
    |        v           v        v             v             |
    |   [PostgreSQL] [Redis] [External API] [File System]    |
    |                                                         |
    +---------------------------------------------------------+
                        O U T S I D E
```

**INSIDE (O Hexagono):**
- Contem exclusivamente logica de negocio
- Nenhuma referencia a tecnologia, framework ou dispositivo real
- Agnositco a detalhes de implementacao
- Nao sabe se esta sendo acessado via REST, CLI, ou teste automatizado

**OUTSIDE (O Mundo Externo):**
- Tudo que nao e logica de negocio
- Interfaces de usuario, bancos de dados, APIs externas
- Filas de mensagens, sistemas de arquivos
- Frameworks e bibliotecas

### 1.3 Atores

Os atores sao entidades externas que interagem com a aplicacao:

**Driving Actors (Atores Primarios):**
- Iniciam a interacao com a aplicacao
- Representam usuarios (humanos ou maquinas)
- Exemplos: usuario web, script de teste, sistema externo que consome a API

**Driven Actors (Atores Secundarios):**
- Sao acionados pela aplicacao
- Fornecem servicos requeridos pelo dominio
- Dois subtipos:
  - **Repositories**: fornecem informacao recuperavel (bancos de dados, storage)
  - **Recipients**: recebem informacao de saida (servicos de email, filas de mensagens)

### 1.4 Configurable Dependency

O padrao mais importante da arquitetura hexagonal e a **Configurable Dependency** (tambem chamada de Dependency Injection ou Inversion of Control). Este padrao permite:

1. O hexagono ser desacoplado de qualquer tecnologia
2. Trocar tecnologias sem alterar codigo de negocio
3. Testar a aplicacao em isolamento completo
4. Configurar diferentes implementacoes em runtime

---

## 2. Ports (Portas)

### 2.1 Definicao

Ports sao **interfaces** (contratos) que definem os pontos de interacao entre o hexagono e o mundo externo. Eles pertencem ao hexagono -- sao parte da fronteira da aplicacao, nao da infraestrutura.

> "Ports organize boundary interactions by purpose, named using
> action-oriented language."

### 2.2 Driving Ports (Primary / Inbound)

Driving ports definem a **API da aplicacao** -- os servicos que o sistema oferece ao mundo externo.

```
Caracteristicas:
- Expoe funcionalidades da aplicacao
- Define o contrato de entrada (o que pode ser feito)
- Representa os use cases do sistema
- Nomeado com verbos de acao: "criar_ordem", "cancelar_ordem"
```

**Exemplo conceitual:**

```python
# driving_port.py (pertence ao hexagono)
from abc import ABC, abstractmethod

class OrderServicePort(ABC):
    """Driving Port: define o que a aplicacao OFERECE"""

    @abstractmethod
    def create_order(self, symbol: str, quantity: int, side: str) -> Order:
        """Cria uma nova ordem de compra/venda"""
        pass

    @abstractmethod
    def cancel_order(self, order_id: str) -> bool:
        """Cancela uma ordem existente"""
        pass

    @abstractmethod
    def get_order_status(self, order_id: str) -> OrderStatus:
        """Consulta status de uma ordem"""
        pass
```

### 2.3 Driven Ports (Secondary / Outbound)

Driven ports definem o **SPI (Service Provider Interface)** -- os servicos que a aplicacao NECESSITA do mundo externo.

```
Caracteristicas:
- Especifica funcionalidades requeridas pela aplicacao
- A aplicacao depende destas interfaces para sua logica
- Implementadas por driven adapters
- Nomeado pela funcao: "order_repository", "market_data_provider"
```

**Exemplo conceitual:**

```python
# driven_port.py (pertence ao hexagono)
from abc import ABC, abstractmethod

class OrderRepositoryPort(ABC):
    """Driven Port: define o que a aplicacao NECESSITA"""

    @abstractmethod
    def save(self, order: Order) -> None:
        pass

    @abstractmethod
    def find_by_id(self, order_id: str) -> Optional[Order]:
        pass

    @abstractmethod
    def find_open_orders(self) -> List[Order]:
        pass


class MarketDataPort(ABC):
    """Driven Port: dados de mercado"""

    @abstractmethod
    def get_current_price(self, symbol: str) -> Decimal:
        pass

    @abstractmethod
    def get_order_book(self, symbol: str) -> OrderBook:
        pass


class BrokerPort(ABC):
    """Driven Port: integracao com corretora"""

    @abstractmethod
    def submit_order(self, order: Order) -> BrokerConfirmation:
        pass

    @abstractmethod
    def cancel_order(self, broker_order_id: str) -> bool:
        pass
```

### 2.4 Simetria e Assimetria

A arquitetura hexagonal apresenta uma dualidade:

**Simetria:** Todos os adapters dependem do hexagono; a aplicacao permanece agnostica a tecnologia em ambos os lados (entrada e saida).

**Assimetria:** A direcao de controle difere:
- **Driving side:** O adapter chama o port (o adapter conhece o port; o hexagono nao sabe qual adapter o aciona)
- **Driven side:** A aplicacao chama o port; o adapter implementa o port (a aplicacao precisa saber qual adapter usar via injecao)

```
    DRIVING SIDE                           DRIVEN SIDE

    [Adapter] ---usa---> [Port]            [Port] <---implementa--- [Adapter]
                          |                  ^
                          v                  |
                     [Application] ---depende-de---> [Port Interface]
```

---

## 3. Adapters (Adaptadores)

### 3.1 Definicao

Adapters sao componentes que **traduzem** entre a interface do port e a tecnologia especifica do mundo externo. Eles convertem formatos, protocolos e modelos de dados.

### 3.2 Driving Adapters (Primary / Inbound)

Convertem requisicoes externas em chamadas compreensiveis pelos ports da aplicacao.

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| **REST Controller** | Converte HTTP requests em chamadas de use case | FastAPI router, Flask blueprint |
| **gRPC Service** | Converte chamadas gRPC em chamadas de use case | gRPC servicer |
| **CLI** | Converte comandos de terminal em chamadas de use case | Click/Typer commands |
| **Message Consumer** | Converte mensagens de fila em chamadas de use case | Kafka consumer, RabbitMQ listener |
| **WebSocket Handler** | Converte eventos WebSocket em chamadas de use case | Socket.IO handler |
| **Scheduler/Cron** | Converte triggers temporais em chamadas de use case | APScheduler job |
| **Test Harness** | Converte cenarios de teste em chamadas de use case | pytest fixtures |
| **GUI** | Converte interacoes de UI em chamadas de use case | Desktop app handler |

**Exemplo: REST Driving Adapter**

```python
# adapters/inbound/rest/order_controller.py
from fastapi import APIRouter, Depends

class OrderController:
    """Driving Adapter: converte HTTP -> Use Case"""

    def __init__(self, order_service: OrderServicePort):
        self.order_service = order_service
        self.router = APIRouter()
        self._setup_routes()

    def _setup_routes(self):
        self.router.post("/orders")(self.create_order)
        self.router.delete("/orders/{order_id}")(self.cancel_order)

    async def create_order(self, request: CreateOrderRequest):
        # Traduz: HTTP Request -> Domain Call
        order = self.order_service.create_order(
            symbol=request.symbol,
            quantity=request.quantity,
            side=request.side
        )
        # Traduz: Domain Response -> HTTP Response
        return CreateOrderResponse.from_domain(order)
```

### 3.3 Driven Adapters (Secondary / Outbound)

Implementam as interfaces dos driven ports usando tecnologias especificas.

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| **Database Adapter** | Implementa persistencia com BD especifico | PostgreSQL via SQLAlchemy |
| **Cache Adapter** | Implementa cache com tecnologia especifica | Redis adapter |
| **External API Adapter** | Integra com APIs de terceiros | B3 API, corretora API |
| **Message Producer** | Publica mensagens em filas | Kafka producer |
| **File System Adapter** | Persiste em sistema de arquivos | CSV writer, JSON storage |
| **Email Adapter** | Envia notificacoes por email | SMTP adapter |
| **In-Memory Adapter** | Implementacao para testes | Dict-based repository |

**Exemplo: Database Driven Adapter**

```python
# adapters/outbound/persistence/sqlalchemy_order_repository.py

class SQLAlchemyOrderRepository(OrderRepositoryPort):
    """Driven Adapter: implementa persistencia com PostgreSQL"""

    def __init__(self, session_factory):
        self.session_factory = session_factory

    def save(self, order: Order) -> None:
        with self.session_factory() as session:
            db_order = OrderModel.from_domain(order)  # Domain -> DB Model
            session.add(db_order)
            session.commit()

    def find_by_id(self, order_id: str) -> Optional[Order]:
        with self.session_factory() as session:
            db_order = session.query(OrderModel).filter_by(id=order_id).first()
            return db_order.to_domain() if db_order else None  # DB Model -> Domain
```

**Exemplo: External API Driven Adapter**

```python
# adapters/outbound/broker/b3_broker_adapter.py

class B3BrokerAdapter(BrokerPort):
    """Driven Adapter: integra com API da B3/corretora"""

    def __init__(self, api_client, api_key: str):
        self.client = api_client
        self.api_key = api_key

    def submit_order(self, order: Order) -> BrokerConfirmation:
        # Traduz: Domain Order -> B3 API format
        payload = {
            "symbol": order.symbol,
            "qty": order.quantity,
            "side": "BUY" if order.side == OrderSide.BUY else "SELL",
            "type": "LIMIT",
            "price": str(order.price)
        }
        response = self.client.post("/orders", json=payload)
        # Traduz: B3 API response -> Domain Confirmation
        return BrokerConfirmation(
            broker_order_id=response["orderId"],
            status=self._map_status(response["status"]),
            timestamp=response["timestamp"]
        )
```

### 3.4 Mapeamento entre Modelos (Model Mapping)

Um aspecto critico dos adapters e a **traducao de modelos**. Cada adapter deve mapear entre o modelo do mundo externo e o modelo do dominio:

```
    Mundo Externo         Adapter          Dominio
    +-----------+    +-------------+    +-----------+
    | HTTP JSON | -> | Mapper/DTO  | -> | Entity    |
    | DB Row    | -> | Mapper/ORM  | -> | Value Obj |
    | API Resp  | -> | Mapper      | -> | Domain Obj|
    +-----------+    +-------------+    +-----------+
```

**Regra fundamental:** Objetos de infraestrutura (DTOs, ORMs, payloads de API) NUNCA devem cruzar a fronteira do hexagono. O adapter e responsavel pela conversao.

---

## 4. Dependency Rule e Inversao de Dependencia

### 4.1 A Regra de Dependencia

A regra mais importante da arquitetura hexagonal:

> **Todas as dependencias de codigo-fonte apontam para DENTRO (em direcao ao dominio).**
> **O dominio NAO CONHECE a infraestrutura.**

```
                    Direcao das Dependencias
                    ========================

    +-------------------+
    | ADAPTERS (OUT)    |----+
    +-------------------+    |
                             |
    +-------------------+    |      +-------------------+
    | ADAPTERS (IN)     |----+----> | APPLICATION CORE  |
    +-------------------+    |      | (Domain + App)    |
                             |      +-------------------+
    +-------------------+    |
    | CONFIGURATION     |----+
    +-------------------+

    Infraestrutura depende do Dominio.
    Dominio NAO depende de nada externo.
```

### 4.2 Dependency Inversion Principle (DIP)

O DIP e o mecanismo que torna a regra de dependencia possivel:

**Sem DIP (problema):**
```
Application ---depende-de---> PostgreSQLRepository (concreto)
              DEPENDENCIA DIRETA = ACOPLAMENTO
```

**Com DIP (solucao hexagonal):**
```
Application ---depende-de---> OrderRepositoryPort (interface/abstraction)
                                      ^
                                      |
                              implementa
                                      |
                              PostgreSQLRepository (concreto)
```

A aplicacao define a INTERFACE (port). A infraestrutura IMPLEMENTA a interface. A dependencia foi INVERTIDA: agora a infraestrutura depende da abstracoes definida pelo dominio.

### 4.3 Camadas e Suas Responsabilidades

```
+================================================================+
|                      INFRASTRUCTURE                             |
|  Adapters (IN + OUT), Configuracao, Frameworks                  |
|  DEPENDE DE: Application, Domain                                |
+================================================================+
         |                                          |
         v                                          v
+================================+  +================================+
|       APPLICATION LAYER        |  |  (dependency injection aqui)   |
|  Use Cases, Application        |  |                                |
|  Services, Orquestracao        |  |                                |
|  DEPENDE DE: Domain            |  |                                |
+================================+  +================================+
                |
                v
+================================================================+
|                        DOMAIN LAYER                             |
|  Entities, Value Objects, Domain Services, Domain Events        |
|  DEPENDE DE: NADA (zero dependencias externas)                  |
+================================================================+
```

### 4.4 Inversion of Control (IoC) na Pratica

O **Composition Root** (ponto de composicao) e o unico lugar onde as dependencias concretas sao conectadas:

```python
# composition_root.py (UNICO lugar com dependencias concretas)

def create_application():
    # 1. Instanciar driven adapters (infraestrutura)
    db_session = create_session("postgresql://...")
    order_repo = SQLAlchemyOrderRepository(db_session)
    broker = B3BrokerAdapter(api_client, api_key="...")
    market_data = B3MarketDataAdapter(ws_client)

    # 2. Instanciar application core (injetando driven adapters)
    order_service = OrderService(
        order_repository=order_repo,    # Port <- Adapter
        broker=broker,                   # Port <- Adapter
        market_data=market_data          # Port <- Adapter
    )

    # 3. Instanciar driving adapters (conectando ao core)
    rest_controller = OrderController(order_service)
    ws_handler = MarketDataWebSocket(market_data_service)

    return Application(
        controllers=[rest_controller],
        handlers=[ws_handler]
    )
```

---

## 5. Comparacao com Outras Arquiteturas

### 5.1 Quadro Comparativo

```
+--------------------+------------------+------------------+------------------+
| Aspecto            | Hexagonal        | Clean Arch       | Onion Arch       |
|                    | (Cockburn, 2005) | (Uncle Bob, 2012)| (Palermo, 2008)  |
+--------------------+------------------+------------------+------------------+
| Metafora Visual    | Hexagono com     | Circulos         | Camadas de       |
|                    | ports/adapters   | concentricos     | cebola           |
+--------------------+------------------+------------------+------------------+
| Nucleo             | Application +    | Entities +       | Domain Model     |
|                    | Domain           | Use Cases        | (centro)         |
+--------------------+------------------+------------------+------------------+
| Mecanismo de       | Ports (inter-    | Dependency Rule  | Dependency       |
| Isolamento         | faces) + Adapt.  | (deps p/ dentro) | Inversion        |
+--------------------+------------------+------------------+------------------+
| Camadas            | Nao prescreve    | 4 camadas        | 4+ camadas       |
|                    | camadas internas | explicitas       | explicitas       |
+--------------------+------------------+------------------+------------------+
| Foco Principal     | Isolamento via   | Separacao de     | Dominio como     |
|                    | Ports/Adapters   | concerns + rules | nucleo imutavel  |
+--------------------+------------------+------------------+------------------+
| Testabilidade      | Mocks nos Ports  | Mocks em todas   | Mocks nas        |
|                    | (driven side)    | as boundaries    | interfaces       |
+--------------------+------------------+------------------+------------------+
| Prescricao de      | Baixa (flexivel) | Alta (4 camadas) | Media            |
| Estrutura Interna  |                  |                  |                  |
+--------------------+------------------+------------------+------------------+
```

### 5.2 Hexagonal vs Layered (Tradicional N-Tier)

```
    LAYERED (Problema)                    HEXAGONAL (Solucao)
    ==================                    ===================

    +----------------+                    Adapters (IN)
    | Presentation   |                        |
    +----------------+                        v
           |                              +--------+
           v                              | Domain | <-- nao depende de nada
    +----------------+                    +--------+
    | Business Logic |                        ^
    +----------------+                        |
           |                              Adapters (OUT)
           v
    +----------------+                    Dependencias apontam
    | Data Access    |                    PARA DENTRO
    +----------------+
                                          Domain nao conhece
    Dependencias apontam                  infraestrutura
    PARA BAIXO
    Business depende de Data!
```

**Problemas do Layered:**
- Business Logic depende diretamente do Data Access
- Impossivel testar logica sem banco de dados real
- Mudanca de banco afeta a camada de negocio
- Tendencia ao "Big Ball of Mud"

### 5.3 Hexagonal vs MVC

MVC (Model-View-Controller) e um padrao de **apresentacao**, nao de **arquitetura de aplicacao**. Pode-se usar MVC como driving adapter dentro de uma arquitetura hexagonal:

```
    MVC como Driving Adapter:

    [View] <-> [Controller] -----> [Driving Port] -----> [Application Core]
                (Adapter IN)         (Interface)            (Hexagono)
```

### 5.4 Convergencia dos Tres Padroes

Herberto Graca (2017) demonstrou que Hexagonal, Clean e Onion sao **variantes do mesmo principio fundamental**: isolamento do dominio via inversao de dependencias. As diferencas sao mais terminologicas do que conceituais:

```
    Hexagonal          Clean Architecture     Onion Architecture
    =========          ==================     ==================
    Ports          =   Interface Adapters  =  Infrastructure Interfaces
    Adapters       =   Frameworks/Drivers  =  Infrastructure
    Application    =   Use Cases           =  Application Services
    Domain         =   Entities            =  Domain Model
```

---

## 6. Estrutura de Pastas

### 6.1 Estrutura Recomendada (Generica)

```
project/
|
+-- src/
|   |
|   +-- domain/                          # NUCLEO - Zero dependencias externas
|   |   +-- __init__.py
|   |   +-- entities/                    # Entidades de dominio
|   |   |   +-- order.py                 # Entity: Order
|   |   |   +-- portfolio.py             # Entity: Portfolio
|   |   |   +-- position.py              # Entity: Position
|   |   |   +-- strategy.py             # Entity: Strategy
|   |   |
|   |   +-- value_objects/               # Value Objects imutaveis
|   |   |   +-- money.py                 # VO: Money (amount + currency)
|   |   |   +-- symbol.py               # VO: Symbol (ticker)
|   |   |   +-- quantity.py             # VO: Quantity
|   |   |   +-- price.py               # VO: Price
|   |   |   +-- order_side.py           # VO/Enum: BUY/SELL
|   |   |
|   |   +-- events/                      # Domain Events
|   |   |   +-- order_created.py
|   |   |   +-- order_filled.py
|   |   |   +-- position_opened.py
|   |   |
|   |   +-- services/                    # Domain Services
|   |   |   +-- risk_calculator.py
|   |   |   +-- position_sizer.py
|   |   |
|   |   +-- exceptions/                  # Domain Exceptions
|   |       +-- insufficient_funds.py
|   |       +-- invalid_order.py
|   |
|   +-- application/                     # USE CASES - Orquestracao
|   |   +-- __init__.py
|   |   +-- ports/                       # TODOS os ports vivem aqui
|   |   |   +-- inbound/                 # Driving Ports (API da aplicacao)
|   |   |   |   +-- order_service_port.py
|   |   |   |   +-- portfolio_query_port.py
|   |   |   |   +-- strategy_management_port.py
|   |   |   |
|   |   |   +-- outbound/               # Driven Ports (SPI)
|   |   |       +-- order_repository_port.py
|   |   |       +-- broker_port.py
|   |   |       +-- market_data_port.py
|   |   |       +-- notification_port.py
|   |   |       +-- event_publisher_port.py
|   |   |
|   |   +-- use_cases/                   # Implementacao dos Use Cases
|   |   |   +-- create_order.py
|   |   |   +-- cancel_order.py
|   |   |   +-- execute_strategy.py
|   |   |   +-- rebalance_portfolio.py
|   |   |
|   |   +-- services/                    # Application Services
|   |   |   +-- order_service.py         # Implementa OrderServicePort
|   |   |   +-- portfolio_service.py
|   |   |   +-- strategy_service.py
|   |   |
|   |   +-- dto/                         # Data Transfer Objects (app level)
|   |       +-- order_dto.py
|   |       +-- portfolio_summary_dto.py
|   |
|   +-- adapters/                        # INFRAESTRUTURA - Implementacoes
|   |   +-- __init__.py
|   |   +-- inbound/                     # Driving Adapters (entrada)
|   |   |   +-- rest/
|   |   |   |   +-- order_controller.py
|   |   |   |   +-- portfolio_controller.py
|   |   |   |   +-- schemas/            # Request/Response schemas
|   |   |   |       +-- order_schemas.py
|   |   |   |
|   |   |   +-- websocket/
|   |   |   |   +-- market_data_ws.py
|   |   |   |
|   |   |   +-- cli/
|   |   |   |   +-- trading_cli.py
|   |   |   |
|   |   |   +-- scheduler/
|   |   |       +-- strategy_scheduler.py
|   |   |
|   |   +-- outbound/                    # Driven Adapters (saida)
|   |       +-- persistence/
|   |       |   +-- sqlalchemy/
|   |       |   |   +-- models/          # ORM models (NAO sao domain entities!)
|   |       |   |   |   +-- order_model.py
|   |       |   |   |   +-- portfolio_model.py
|   |       |   |   +-- repositories/
|   |       |   |   |   +-- sqlalchemy_order_repo.py
|   |       |   |   |   +-- sqlalchemy_portfolio_repo.py
|   |       |   |   +-- mappers/
|   |       |   |       +-- order_mapper.py
|   |       |   |
|   |       |   +-- in_memory/           # Para testes
|   |       |       +-- in_memory_order_repo.py
|   |       |
|   |       +-- broker/
|   |       |   +-- b3_broker_adapter.py
|   |       |   +-- xp_broker_adapter.py
|   |       |   +-- simulated_broker.py  # Para backtesting
|   |       |
|   |       +-- market_data/
|   |       |   +-- b3_market_data_adapter.py
|   |       |   +-- yahoo_finance_adapter.py
|   |       |   +-- csv_market_data_adapter.py  # Para backtesting
|   |       |
|   |       +-- notification/
|   |           +-- telegram_notifier.py
|   |           +-- email_notifier.py
|   |           +-- console_notifier.py
|   |
|   +-- config/                          # Composition Root + Config
|       +-- __init__.py
|       +-- container.py                 # Dependency Injection Container
|       +-- settings.py                  # Environment config
|       +-- app_factory.py              # Application Factory
|
+-- tests/
|   +-- unit/
|   |   +-- domain/                      # Testes do dominio (sem mocks)
|   |   |   +-- test_order.py
|   |   |   +-- test_risk_calculator.py
|   |   +-- application/                 # Testes de use cases (com mocks)
|   |       +-- test_create_order.py
|   |       +-- test_execute_strategy.py
|   |
|   +-- integration/
|   |   +-- adapters/
|   |       +-- test_sqlalchemy_order_repo.py
|   |       +-- test_b3_broker_adapter.py
|   |
|   +-- e2e/
|       +-- test_order_flow.py
|
+-- pyproject.toml
+-- docker-compose.yml
```

### 6.2 Principios da Organizacao

**Separacao inside/outside:** A fronteira mais importante e entre `domain/` + `application/` (inside) e `adapters/` + `config/` (outside).

**Package by feature, nao by layer:** Para sistemas maiores, considere agrupar por bounded context:

```
src/
+-- trading/           # Bounded Context: Trading
|   +-- domain/
|   +-- application/
|   +-- adapters/
|
+-- risk/              # Bounded Context: Risk Management
|   +-- domain/
|   +-- application/
|   +-- adapters/
|
+-- reporting/         # Bounded Context: Reporting
    +-- domain/
    +-- application/
    +-- adapters/
```

---

## 7. Testabilidade

### 7.1 Por Que Hexagonal Facilita Testes

A arquitetura hexagonal foi **projetada para testabilidade**. Cockburn declarou explicitamente que um dos objetivos primarios era permitir testes automatizados sem infraestrutura real.

```
    Estrategia de Teste por Camada
    ==============================

    +------------------+     +------------------+     +------------------+
    | UNIT TESTS       |     | INTEGRATION      |     | E2E TESTS        |
    | (Domain + App)   |     | TESTS (Adapters) |     | (Full Stack)     |
    +------------------+     +------------------+     +------------------+
    | - Rapidos         |    | - Moderados       |    | - Lentos          |
    | - Sem I/O         |    | - Com I/O real    |    | - Infraestrutura  |
    | - Sem mocks de    |    | - Testcontainers  |    |   completa        |
    |   infraestrutura  |    | - DB real (test)  |    | - Cenarios reais  |
    | - Mocks nos ports |    | - API sandbox     |    |                   |
    +------------------+     +------------------+     +------------------+
           MUITOS                 ALGUNS                    POUCOS
    (Piramide de testes)
```

### 7.2 Testando o Dominio (Unit Tests)

O dominio e testado **sem qualquer mock** -- apenas logica pura:

```python
# tests/unit/domain/test_order.py

class TestOrder:
    def test_create_buy_order(self):
        order = Order(
            symbol=Symbol("PETR4"),
            quantity=Quantity(100),
            side=OrderSide.BUY,
            price=Price(Decimal("28.50"))
        )
        assert order.total_value == Money(Decimal("2850.00"), "BRL")

    def test_cannot_create_order_with_zero_quantity(self):
        with pytest.raises(InvalidOrderError):
            Order(
                symbol=Symbol("PETR4"),
                quantity=Quantity(0),  # invalido!
                side=OrderSide.BUY,
                price=Price(Decimal("28.50"))
            )

    def test_order_can_be_cancelled_when_pending(self):
        order = Order(...)
        order.cancel()
        assert order.status == OrderStatus.CANCELLED

    def test_filled_order_cannot_be_cancelled(self):
        order = Order(...)
        order.fill(fill_price=Decimal("28.50"))
        with pytest.raises(InvalidStateTransitionError):
            order.cancel()
```

### 7.3 Testando Use Cases (com Mocks nos Ports)

Use cases sao testados com **mocks/fakes nos driven ports**:

```python
# tests/unit/application/test_create_order.py

class TestCreateOrderUseCase:
    def setup_method(self):
        # In-memory fakes para driven ports
        self.order_repo = InMemoryOrderRepository()
        self.broker = FakeBrokerAdapter()
        self.market_data = FakeMarketDataAdapter(
            prices={"PETR4": Decimal("28.50")}
        )
        self.notifier = FakeNotifier()

        # Use case com fakes injetados
        self.use_case = CreateOrderUseCase(
            order_repository=self.order_repo,
            broker=self.broker,
            market_data=self.market_data,
            notifier=self.notifier
        )

    def test_creates_order_successfully(self):
        result = self.use_case.execute(
            symbol="PETR4",
            quantity=100,
            side="BUY"
        )
        assert result.status == OrderStatus.SUBMITTED
        assert len(self.order_repo.orders) == 1
        assert self.broker.submitted_orders == 1

    def test_rejects_order_when_market_closed(self):
        self.market_data.set_market_closed(True)
        with pytest.raises(MarketClosedError):
            self.use_case.execute(symbol="PETR4", quantity=100, side="BUY")
```

### 7.4 Testando Adapters (Integration Tests)

Adapters sao testados contra infraestrutura real (ou containerizada):

```python
# tests/integration/adapters/test_sqlalchemy_order_repo.py

@pytest.fixture
def db_session():
    """Usa Testcontainers para PostgreSQL real"""
    with PostgresContainer("postgres:15") as postgres:
        engine = create_engine(postgres.get_connection_url())
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        yield Session()

class TestSQLAlchemyOrderRepository:
    def test_save_and_retrieve_order(self, db_session):
        repo = SQLAlchemyOrderRepository(db_session)
        order = Order(symbol=Symbol("PETR4"), ...)

        repo.save(order)
        retrieved = repo.find_by_id(order.id)

        assert retrieved is not None
        assert retrieved.symbol == Symbol("PETR4")
```

### 7.5 Quatro Estagios de Teste (Cockburn)

Cockburn definiu uma progressao de testes:

```
    Estagio 1: Test Harness + Mock Adapters
    (Valida logica de negocio pura)

    [Test] --> [Port IN] --> [Application] --> [Port OUT] --> [Fake/Mock]


    Estagio 2: Real Driver + Mock Adapters
    (Valida interface real de entrada)

    [REST/CLI] --> [Port IN] --> [Application] --> [Port OUT] --> [Fake/Mock]


    Estagio 3: Test Harness + Real Adapters
    (Valida integracao com infraestrutura)

    [Test] --> [Port IN] --> [Application] --> [Port OUT] --> [PostgreSQL/API]


    Estagio 4: Real Driver + Real Adapters
    (Teste end-to-end completo)

    [REST/CLI] --> [Port IN] --> [Application] --> [Port OUT] --> [PostgreSQL/API]
```

---

## 8. Anti-Patterns e Armadilhas Comuns

### 8.1 Anemic Domain Model

**Problema:** Entidades de dominio sao apenas containers de dados (getters/setters), sem logica de negocio. A logica fica dispersa em services.

```python
# ANTI-PATTERN: Modelo Anemico
class Order:
    def __init__(self):
        self.symbol = None
        self.quantity = None
        self.status = None
        # Apenas dados, sem comportamento!

class OrderService:
    def cancel_order(self, order):
        if order.status == "PENDING":    # Logica FORA da entidade!
            order.status = "CANCELLED"
        else:
            raise Exception("Cannot cancel")
```

```python
# CORRETO: Domain Model Rico
class Order:
    def cancel(self) -> None:
        """Logica de negocio DENTRO da entidade"""
        if self.status != OrderStatus.PENDING:
            raise InvalidStateTransitionError(
                f"Cannot cancel order in state {self.status}"
            )
        self.status = OrderStatus.CANCELLED
        self.cancelled_at = datetime.utcnow()
        self._add_event(OrderCancelled(self.id))
```

### 8.2 Leaking Infrastructure (Vazamento de Infraestrutura)

**Problema:** Conceitos de infraestrutura vazam para dentro do dominio.

```python
# ANTI-PATTERN: Infraestrutura no dominio
from sqlalchemy import Column, Integer, String  # SQLAlchemy no dominio!

class Order(Base):                # Herda de Base do SQLAlchemy!
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    symbol = Column(String)
    # Entidade de dominio ACOPLADA ao banco!
```

```python
# CORRETO: Dominio puro, adapter faz mapeamento
# domain/entities/order.py
class Order:
    """Entidade pura de dominio - sem imports de infraestrutura"""
    def __init__(self, id: str, symbol: Symbol, quantity: Quantity):
        self.id = id
        self.symbol = symbol
        self.quantity = quantity

# adapters/outbound/persistence/models/order_model.py
class OrderModel(Base):
    """Modelo de persistencia - separado da entidade de dominio"""
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    symbol = Column(String)

    def to_domain(self) -> Order:
        return Order(id=self.id, symbol=Symbol(self.symbol), ...)

    @classmethod
    def from_domain(cls, order: Order) -> "OrderModel":
        return cls(id=order.id, symbol=str(order.symbol), ...)
```

### 8.3 Over-Abstraction (Abstracao Excessiva)

**Problema:** Criar ports e adapters para tudo, mesmo quando nao ha necessidade de troca ou testabilidade.

```python
# ANTI-PATTERN: Port desnecessario para logica interna
class MathCalculatorPort(ABC):
    @abstractmethod
    def add(self, a: int, b: int) -> int: ...

class MathCalculatorAdapter(MathCalculatorPort):
    def add(self, a: int, b: int) -> int:
        return a + b  # Realmente precisa de um port para isso?
```

**Regra:** Crie ports apenas para fronteiras com o mundo externo (I/O, infraestrutura, servicos externos). Logica interna pura nao precisa de ports.

### 8.4 Adapter Bloat (Adaptadores Inchados)

**Problema:** Adapters que contem logica de negocio alem da traducao.

```python
# ANTI-PATTERN: Logica de negocio no adapter
class OrderController:
    async def create_order(self, request):
        # Validacao de negocio no controller!
        if request.quantity > self.max_position_size:
            raise HTTPException(400, "Position too large")

        # Calculo de risco no controller!
        risk = request.quantity * request.price * 0.02
        if risk > self.max_risk:
            raise HTTPException(400, "Risk too high")

        order = self.order_service.create_order(...)
```

**Solucao:** Adapters devem APENAS traduzir entre formatos. Toda logica de negocio pertence ao dominio ou application layer.

### 8.5 Use-Case Interdependency (Interdependencia de Use Cases)

**Problema:** Use cases chamando outros use cases diretamente, criando acoplamento.

```python
# ANTI-PATTERN
class CreateOrderUseCase:
    def __init__(self, check_risk_use_case: CheckRiskUseCase):
        self.check_risk = check_risk_use_case  # Use case depende de use case!

    def execute(self, ...):
        self.check_risk.execute(...)  # Acoplamento!
```

**Solucao:** Use Domain Services ou Domain Events para comunicacao entre use cases. Cada use case deve ser auto-contido.

### 8.6 Database-First Design

**Problema:** Projetar o schema do banco de dados antes do dominio.

**Cockburn recomenda:** Comece pelo dominio e use cases. Defina ports, implemente logica. O banco de dados e um **detalhe de implementacao** a ser resolvido por ultimo atraves de um driven adapter.

### 8.7 Brittle Interfaces (Interfaces Frageis)

**Problema:** Interfaces de ports que mudam frequentemente, quebrando todos os adapters.

```python
# ANTI-PATTERN: Interface muito especifica
class UserRegistrationPort(ABC):
    @abstractmethod
    def register(self, username: str, password: str) -> User: ...
    # Adicionar email? Quebra a interface!
```

**Solucao:** Use objetos de comando/request ao inves de parametros individuais:

```python
# CORRETO: Interface estavel
@dataclass
class RegisterUserCommand:
    username: str
    password: str
    email: Optional[str] = None  # Extensivel sem quebrar interface

class UserRegistrationPort(ABC):
    @abstractmethod
    def register(self, command: RegisterUserCommand) -> User: ...
```

---

## 9. Aplicacao ao Trading Bot

### 9.1 Visao Geral da Arquitetura para o Bot

```
                    +==================================+
                    |         TRADING BOT               |
                    |         HEXAGONAL                 |
                    +==================================+

    DRIVING SIDE (Entrada)              DRIVEN SIDE (Saida)
    ======================              ====================

    +------------------+                +--------------------+
    | REST API         |                | B3/Corretora API   |
    | (monitoramento)  |---+        +---| (execucao ordens)  |
    +------------------+   |        |   +--------------------+
                           |        |
    +------------------+   |        |   +--------------------+
    | Scheduler        |   |        |   | PostgreSQL         |
    | (cron triggers)  |---+        +---| (persistencia)     |
    +------------------+   |        |   +--------------------+
                           |        |
    +------------------+   |   +--+ |   +--------------------+
    | WebSocket Feed   |---+-->|  |-+---| Redis              |
    | (market data IN) |   |   |  |     | (cache/estado)     |
    +------------------+   |   |HE|     +--------------------+
                           |   |XA|
    +------------------+   |   |GO|     +--------------------+
    | CLI              |---+-->|NO|--+--| Yahoo Finance      |
    | (comandos admin) |   |   |  |  |  | (dados historicos) |
    +------------------+   |   |  |  |  +--------------------+
                           |   +--+  |
    +------------------+   |         |  +--------------------+
    | Telegram Bot     |---+         +--| Telegram API       |
    | (comandos user)  |               | (notificacoes)     |
    +------------------+                +--------------------+
```

### 9.2 Domain Layer do Trading Bot

```python
# ================================================================
# domain/entities/order.py
# ================================================================
@dataclass
class Order:
    id: OrderId
    symbol: Symbol
    side: OrderSide
    order_type: OrderType
    quantity: Quantity
    price: Optional[Price]
    status: OrderStatus
    strategy_id: Optional[StrategyId]
    created_at: datetime
    filled_at: Optional[datetime] = None
    fill_price: Optional[Price] = None

    def fill(self, fill_price: Price, filled_at: datetime) -> None:
        if self.status != OrderStatus.SUBMITTED:
            raise InvalidStateTransitionError(...)
        self.status = OrderStatus.FILLED
        self.fill_price = fill_price
        self.filled_at = filled_at

    def cancel(self) -> None:
        if self.status not in (OrderStatus.PENDING, OrderStatus.SUBMITTED):
            raise InvalidStateTransitionError(...)
        self.status = OrderStatus.CANCELLED

    @property
    def total_value(self) -> Money:
        price = self.fill_price or self.price
        return Money(price.value * self.quantity.value, "BRL")


# ================================================================
# domain/entities/portfolio.py
# ================================================================
@dataclass
class Portfolio:
    id: PortfolioId
    positions: Dict[Symbol, Position]
    cash: Money
    max_position_size: Decimal
    max_portfolio_risk: Decimal

    def can_open_position(self, symbol: Symbol, quantity: Quantity,
                          price: Price) -> bool:
        cost = Money(price.value * quantity.value, "BRL")
        if cost > self.cash:
            return False
        position_pct = cost.amount / self.total_value.amount
        return position_pct <= self.max_position_size

    @property
    def total_value(self) -> Money:
        positions_value = sum(p.market_value.amount for p in self.positions.values())
        return Money(self.cash.amount + positions_value, "BRL")


# ================================================================
# domain/entities/strategy.py
# ================================================================
@dataclass
class Strategy:
    id: StrategyId
    name: str
    parameters: StrategyParameters
    status: StrategyStatus
    symbols: List[Symbol]

    def generate_signals(self, market_data: MarketSnapshot) -> List[Signal]:
        """Gera sinais de trading baseado nos dados de mercado"""
        raise NotImplementedError("Subclasses must implement")

    def activate(self) -> None:
        if self.status == StrategyStatus.ACTIVE:
            raise AlreadyActiveError(...)
        self.status = StrategyStatus.ACTIVE

    def deactivate(self) -> None:
        self.status = StrategyStatus.INACTIVE


# ================================================================
# domain/value_objects/
# ================================================================
@dataclass(frozen=True)
class Symbol:
    ticker: str
    def __post_init__(self):
        if not self.ticker or len(self.ticker) < 3:
            raise InvalidSymbolError(f"Invalid symbol: {self.ticker}")

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str
    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise CurrencyMismatchError(...)
        return Money(self.amount + other.amount, self.currency)

@dataclass(frozen=True)
class Price:
    value: Decimal
    def __post_init__(self):
        if self.value <= 0:
            raise InvalidPriceError(...)

@dataclass(frozen=True)
class Quantity:
    value: int
    def __post_init__(self):
        if self.value <= 0:
            raise InvalidQuantityError(...)
```

### 9.3 Ports do Trading Bot

```python
# ================================================================
# application/ports/inbound/ (Driving Ports - API do sistema)
# ================================================================

class TradingServicePort(ABC):
    """O que o sistema OFERECE para trading"""
    @abstractmethod
    def place_order(self, cmd: PlaceOrderCommand) -> OrderResult: ...

    @abstractmethod
    def cancel_order(self, order_id: str) -> bool: ...

    @abstractmethod
    def get_portfolio_summary(self) -> PortfolioSummary: ...


class StrategyManagementPort(ABC):
    """O que o sistema OFERECE para gestao de estrategias"""
    @abstractmethod
    def activate_strategy(self, strategy_id: str) -> None: ...

    @abstractmethod
    def deactivate_strategy(self, strategy_id: str) -> None: ...

    @abstractmethod
    def run_backtest(self, cmd: BacktestCommand) -> BacktestResult: ...


# ================================================================
# application/ports/outbound/ (Driven Ports - O que o sistema PRECISA)
# ================================================================

class OrderRepositoryPort(ABC):
    """Persistencia de ordens"""
    @abstractmethod
    def save(self, order: Order) -> None: ...

    @abstractmethod
    def find_by_id(self, order_id: str) -> Optional[Order]: ...

    @abstractmethod
    def find_open_orders(self) -> List[Order]: ...

    @abstractmethod
    def find_by_strategy(self, strategy_id: str) -> List[Order]: ...


class BrokerPort(ABC):
    """Integracao com corretora para execucao"""
    @abstractmethod
    def submit_order(self, order: Order) -> BrokerConfirmation: ...

    @abstractmethod
    def cancel_order(self, broker_order_id: str) -> bool: ...

    @abstractmethod
    def get_order_status(self, broker_order_id: str) -> BrokerOrderStatus: ...


class MarketDataPort(ABC):
    """Dados de mercado em tempo real e historicos"""
    @abstractmethod
    def get_current_price(self, symbol: Symbol) -> Price: ...

    @abstractmethod
    def get_order_book(self, symbol: Symbol) -> OrderBook: ...

    @abstractmethod
    def get_historical_data(self, symbol: Symbol,
                            start: datetime, end: datetime,
                            interval: str) -> List[OHLCV]: ...

    @abstractmethod
    def subscribe_price_updates(self, symbols: List[Symbol],
                                callback: Callable) -> None: ...


class NotificationPort(ABC):
    """Notificacoes para o operador"""
    @abstractmethod
    def send_alert(self, message: str, severity: Severity) -> None: ...

    @abstractmethod
    def send_trade_notification(self, order: Order) -> None: ...


class PortfolioRepositoryPort(ABC):
    """Persistencia do portfolio"""
    @abstractmethod
    def save(self, portfolio: Portfolio) -> None: ...

    @abstractmethod
    def load(self, portfolio_id: str) -> Portfolio: ...
```

### 9.4 Use Cases do Trading Bot

```python
# ================================================================
# application/use_cases/place_order.py
# ================================================================
class PlaceOrderUseCase:
    """Orquestra a colocacao de uma ordem"""

    def __init__(
        self,
        order_repo: OrderRepositoryPort,
        portfolio_repo: PortfolioRepositoryPort,
        broker: BrokerPort,
        market_data: MarketDataPort,
        notifier: NotificationPort
    ):
        self.order_repo = order_repo
        self.portfolio_repo = portfolio_repo
        self.broker = broker
        self.market_data = market_data
        self.notifier = notifier

    def execute(self, command: PlaceOrderCommand) -> OrderResult:
        # 1. Obter preco atual
        current_price = self.market_data.get_current_price(
            Symbol(command.symbol)
        )

        # 2. Validar com portfolio (logica de dominio)
        portfolio = self.portfolio_repo.load(command.portfolio_id)
        if not portfolio.can_open_position(
            Symbol(command.symbol),
            Quantity(command.quantity),
            current_price
        ):
            raise InsufficientFundsError(...)

        # 3. Criar ordem (entidade de dominio)
        order = Order(
            id=OrderId.generate(),
            symbol=Symbol(command.symbol),
            side=OrderSide(command.side),
            order_type=OrderType(command.order_type),
            quantity=Quantity(command.quantity),
            price=current_price,
            status=OrderStatus.PENDING,
            strategy_id=command.strategy_id,
            created_at=datetime.utcnow()
        )

        # 4. Persistir ordem
        self.order_repo.save(order)

        # 5. Enviar para corretora
        confirmation = self.broker.submit_order(order)
        order.submit(confirmation.broker_order_id)
        self.order_repo.save(order)

        # 6. Notificar
        self.notifier.send_trade_notification(order)

        return OrderResult.from_order(order)
```

### 9.5 Adapters do Trading Bot

```python
# ================================================================
# adapters/outbound/broker/b3_broker_adapter.py
# ================================================================
class B3BrokerAdapter(BrokerPort):
    """Driven Adapter: conecta com API da B3 via corretora"""

    def __init__(self, api_url: str, api_key: str, api_secret: str):
        self.api_url = api_url
        self.headers = self._build_auth_headers(api_key, api_secret)

    def submit_order(self, order: Order) -> BrokerConfirmation:
        payload = self._to_b3_format(order)
        response = requests.post(
            f"{self.api_url}/orders",
            json=payload,
            headers=self.headers
        )
        response.raise_for_status()
        return self._to_domain_confirmation(response.json())

    def _to_b3_format(self, order: Order) -> dict:
        """Traduz Domain -> B3 API format"""
        return {
            "symbol": str(order.symbol.ticker),
            "qty": order.quantity.value,
            "side": "C" if order.side == OrderSide.BUY else "V",
            "ordType": self._map_order_type(order.order_type),
            "px": str(order.price.value) if order.price else None,
        }

    def _to_domain_confirmation(self, data: dict) -> BrokerConfirmation:
        """Traduz B3 API response -> Domain"""
        return BrokerConfirmation(
            broker_order_id=data["clOrdId"],
            status=self._map_status(data["ordStatus"]),
            timestamp=datetime.fromisoformat(data["transactTime"])
        )


# ================================================================
# adapters/outbound/broker/simulated_broker.py
# ================================================================
class SimulatedBrokerAdapter(BrokerPort):
    """Driven Adapter para backtesting -- simula execucao"""

    def __init__(self, slippage: Decimal = Decimal("0.001")):
        self.slippage = slippage
        self.orders: Dict[str, Order] = {}

    def submit_order(self, order: Order) -> BrokerConfirmation:
        simulated_id = f"SIM-{uuid4()}"
        self.orders[simulated_id] = order
        # Simula preenchimento imediato com slippage
        fill_price = order.price.value * (1 + self.slippage)
        return BrokerConfirmation(
            broker_order_id=simulated_id,
            status=BrokerOrderStatus.FILLED,
            timestamp=datetime.utcnow()
        )


# ================================================================
# adapters/inbound/scheduler/strategy_scheduler.py
# ================================================================
class StrategySchedulerAdapter:
    """Driving Adapter: executa estrategias em intervalos"""

    def __init__(self, strategy_service: StrategyManagementPort):
        self.strategy_service = strategy_service
        self.scheduler = APScheduler()

    def start(self):
        self.scheduler.add_job(
            self._execute_active_strategies,
            trigger="interval",
            seconds=60  # a cada minuto
        )
        self.scheduler.start()

    def _execute_active_strategies(self):
        """Converte trigger temporal -> chamada de use case"""
        self.strategy_service.execute_active_strategies()
```

### 9.6 Composition Root do Trading Bot

```python
# ================================================================
# config/container.py
# ================================================================
class TradingBotContainer:
    """Composition Root: conecta tudo"""

    def __init__(self, settings: Settings):
        self.settings = settings

    def build(self) -> "TradingBotApplication":
        # ---- Driven Adapters (infraestrutura) ----
        db_engine = create_engine(self.settings.database_url)
        session_factory = sessionmaker(bind=db_engine)

        order_repo = SQLAlchemyOrderRepository(session_factory)
        portfolio_repo = SQLAlchemyPortfolioRepository(session_factory)

        broker = self._create_broker()
        market_data = self._create_market_data()
        notifier = TelegramNotifierAdapter(self.settings.telegram_token)

        # ---- Application Services (use cases) ----
        trading_service = TradingService(
            order_repo=order_repo,
            portfolio_repo=portfolio_repo,
            broker=broker,
            market_data=market_data,
            notifier=notifier
        )

        strategy_service = StrategyService(
            trading_service=trading_service,
            market_data=market_data,
            strategy_repo=SQLAlchemyStrategyRepository(session_factory)
        )

        # ---- Driving Adapters (entrada) ----
        rest_api = RestApiAdapter(trading_service, strategy_service)
        scheduler = StrategySchedulerAdapter(strategy_service)
        telegram_bot = TelegramBotAdapter(trading_service, self.settings.telegram_token)

        return TradingBotApplication(
            rest_api=rest_api,
            scheduler=scheduler,
            telegram_bot=telegram_bot
        )

    def _create_broker(self) -> BrokerPort:
        if self.settings.environment == "backtest":
            return SimulatedBrokerAdapter(slippage=Decimal("0.001"))
        elif self.settings.environment == "paper":
            return PaperTradingBrokerAdapter()
        else:
            return B3BrokerAdapter(
                api_url=self.settings.broker_api_url,
                api_key=self.settings.broker_api_key,
                api_secret=self.settings.broker_api_secret
            )

    def _create_market_data(self) -> MarketDataPort:
        if self.settings.environment == "backtest":
            return CSVMarketDataAdapter(self.settings.historical_data_path)
        else:
            return B3MarketDataAdapter(
                ws_url=self.settings.market_data_ws_url,
                api_key=self.settings.market_data_api_key
            )
```

### 9.7 Beneficios Concretos para o Trading Bot

```
    +----------------------------+-------------------------------------------+
    | Beneficio                  | Aplicacao Pratica no Bot                  |
    +----------------------------+-------------------------------------------+
    | Troca de corretora         | Novo adapter (XP, Clear, Inter) sem       |
    |                            | alterar logica de trading                 |
    +----------------------------+-------------------------------------------+
    | Backtesting                | Substituir BrokerPort por SimulatedBroker |
    |                            | e MarketDataPort por CSVMarketData        |
    +----------------------------+-------------------------------------------+
    | Paper Trading              | Adapter de paper trading sem risco real   |
    +----------------------------+-------------------------------------------+
    | Testes unitarios           | Testar estrategias com fakes, sem API     |
    |                            | real, sem banco, sem latencia             |
    +----------------------------+-------------------------------------------+
    | Multiplos mercados         | Novos adapters para crypto, forex, etc.   |
    |                            | sem alterar dominio                       |
    +----------------------------+-------------------------------------------+
    | Multiplas interfaces       | CLI para operacao, REST para dashboard,   |
    |                            | Telegram para alertas -- mesmo core       |
    +----------------------------+-------------------------------------------+
    | Evolucao de estrategias    | Novas estrategias implementam mesmos      |
    |                            | ports, testadas isoladamente              |
    +----------------------------+-------------------------------------------+
    | Migracoes de BD            | Trocar PostgreSQL por TimescaleDB sem     |
    |                            | tocar no dominio                          |
    +----------------------------+-------------------------------------------+
```

---

## 10. Livros e Referencias Fundamentais

### 10.1 Catalogo de Referencias

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 1 | "Hexagonal Architecture" (artigo original) | Alistair Cockburn | 2005 | Artigo Web | [alistair.cockburn.us](https://alistair.cockburn.us/hexagonal-architecture/) |
| 2 | *Hexagonal Architecture Explained* | Alistair Cockburn, Juan Manuel Garrido de Paz | 2024 | Livro | [Amazon](https://www.amazon.com/Hexagonal-Architecture-Explained-Alistair-Cockburn/dp/173751978X) |
| 3 | *Clean Architecture: A Craftsman's Guide to Software Structure and Design* | Robert C. Martin (Uncle Bob) | 2017 | Livro | [Amazon](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164) |
| 4 | *Get Your Hands Dirty on Clean Architecture* (2nd ed.) | Tom Hombergs | 2023 | Livro | [reflectoring.io/book](https://reflectoring.io/book/) |
| 5 | "Hexagonal Architecture - Ports and Adapters Pattern" | Juan Manuel Garrido de Paz | 2018 | Artigo Web | [jmgarridopaz.github.io](https://jmgarridopaz.github.io/content/hexagonalarchitecture.html) |
| 6 | "DDD, Hexagonal, Onion, Clean, CQRS -- How I put it all together" | Herberto Graca | 2017 | Artigo Blog | [herbertograca.com](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/) |
| 7 | "Ports & Adapters Architecture" (Software Architecture Chronicles) | Herberto Graca | 2017 | Artigo Medium | [Medium](https://medium.com/the-software-architecture-chronicles/ports-adapters-architecture-d19f2d476eca) |
| 8 | "Hexagonal Architecture Explained" | Arho Huttunen | 2023 | Artigo Blog | [arhohuttunen.com](https://www.arhohuttunen.com/hexagonal-architecture/) |
| 9 | "Ports & Adapters (aka hexagonal) architecture explained" | Code Soapbox | 2021 | Artigo Blog | [codesoapbox.dev](https://codesoapbox.dev/ports-adapters-aka-hexagonal-architecture-explained/) |
| 10 | "Hexagonal architecture pattern" | AWS Prescriptive Guidance | 2023 | Documentacao | [AWS Docs](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html) |
| 11 | "O que e uma Arquitetura Hexagonal?" | Marco Tulio Valente | 2020 | Artigo Web | [engsoftmoderna.info](https://engsoftmoderna.info/artigos/arquitetura-hexagonal.html) |
| 12 | "Hexagonal Architecture - What Is It? Why Use It?" | HappyCoders.eu | 2023 | Artigo Blog | [happycoders.eu](https://www.happycoders.eu/software-craftsmanship/hexagonal-architecture/) |
| 13 | "On Hexagonal architecture: Common mistakes (Part 2)" | Sapalo.dev | 2021 | Artigo Blog | [sapalo.dev](https://sapalo.dev/2021/02/02/reflections-on-hexagonal-architecture-design/) |
| 14 | "A testing strategy for a domain-centric architecture" | Luis Soares | 2022 | Artigo Medium | [Medium](https://medium.com/codex/a-testing-strategy-for-a-domain-centric-architecture-e-g-hexagonal-9e8d7c6d4448) |
| 15 | "Domain-Driven Hexagon" (repositorio referencia) | Sairyss | 2021 | GitHub Repo | [GitHub](https://github.com/Sairyss/domain-driven-hexagon) |
| 16 | *Domain-Driven Design: Tackling Complexity in the Heart of Software* | Eric Evans | 2003 | Livro | [Amazon](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215) |
| 17 | *Implementing Domain-Driven Design* | Vaughn Vernon | 2013 | Livro | [Amazon](https://www.amazon.com/Implementing-Domain-Driven-Design-Vaughn-Vernon/dp/0321834577) |
| 18 | "Clean Architecture vs. Onion Architecture vs. Hexagonal Architecture" | CCD Akademie | 2023 | Artigo Web | [ccd-akademie.de](https://ccd-akademie.de/en/clean-architecture-vs-onion-architecture-vs-hexagonal-architecture/) |

### 10.2 Leituras Recomendadas por Ordem

**Nivel 1 -- Fundamentos (comece aqui):**
1. Artigo original de Cockburn (Ref #1)
2. Artigo de Juan Manuel Garrido de Paz (Ref #5)
3. Artigo de Arho Huttunen (Ref #8)

**Nivel 2 -- Aprofundamento:**
4. *Hexagonal Architecture Explained* de Cockburn (Ref #2)
5. *Get Your Hands Dirty on Clean Architecture* de Hombergs (Ref #4)
6. Artigo de Herberto Graca sobre Explicit Architecture (Ref #6)

**Nivel 3 -- Contexto Amplo:**
7. *Clean Architecture* de Robert C. Martin (Ref #3)
8. *Domain-Driven Design* de Eric Evans (Ref #16)
9. *Implementing Domain-Driven Design* de Vaughn Vernon (Ref #17)

---

## Apendice A: Diagrama Completo de Dependencias

```
    +=============================================================+
    |                     COMPOSITION ROOT                         |
    |                    (config/container.py)                      |
    |  Instancia tudo. Unico lugar com dependencias concretas.     |
    +=============================================================+
           |              |              |              |
           | cria         | cria         | cria         | cria
           v              v              v              v
    +------------+  +------------+  +----------+  +----------+
    | REST       |  | Scheduler  |  | Telegram |  | CLI      |
    | Controller |  | Adapter    |  | Bot      |  | Adapter  |
    | (IN)       |  | (IN)       |  | (IN)     |  | (IN)     |
    +------------+  +------------+  +----------+  +----------+
           |              |              |              |
           | usa          | usa          | usa          | usa
           v              v              v              v
    +=============================================================+
    |              DRIVING PORTS (Interfaces Inbound)               |
    |      TradingServicePort  |  StrategyManagementPort           |
    +=============================================================+
           |                                      |
           | implementado por                     | implementado por
           v                                      v
    +=============================================================+
    |                  APPLICATION SERVICES                         |
    |         TradingService  |  StrategyService                   |
    |         (orquestra use cases)                                 |
    +=============================================================+
           |                                      |
           | usa                                  | usa
           v                                      v
    +=============================================================+
    |                      DOMAIN LAYER                            |
    |    Order | Portfolio | Strategy | Position | Value Objects    |
    |    Domain Services | Domain Events | Business Rules          |
    +=============================================================+
           ^                                      ^
           | define                               | define
           |                                      |
    +=============================================================+
    |              DRIVEN PORTS (Interfaces Outbound)               |
    |  OrderRepoPort | BrokerPort | MarketDataPort | NotifierPort  |
    +=============================================================+
           ^              ^              ^              ^
           | implementa   | implementa   | implementa   | implementa
           |              |              |              |
    +------------+  +------------+  +----------+  +----------+
    | SQLAlchemy |  | B3 Broker  |  | B3 Mkt   |  | Telegram |
    | Repository |  | Adapter    |  | Data     |  | Notifier |
    | (OUT)      |  | (OUT)      |  | (OUT)    |  | (OUT)    |
    +------------+  +------------+  +----------+  +----------+
           |              |              |              |
           v              v              v              v
    [PostgreSQL]    [B3/Corretora]  [B3 WebSocket]  [Telegram API]
```

## Apendice B: Glossario

| Termo | Definicao |
|-------|-----------|
| **Port** | Interface que define um contrato de comunicacao entre hexagono e mundo externo |
| **Adapter** | Implementacao concreta que traduz entre um port e uma tecnologia especifica |
| **Driving (Primary)** | Lado que INICIA a interacao com a aplicacao (de fora para dentro) |
| **Driven (Secondary)** | Lado que a aplicacao ACIONA para obter servicos externos (de dentro para fora) |
| **Hexagon** | O nucleo da aplicacao contendo logica de dominio e de aplicacao |
| **Composition Root** | Ponto unico onde dependencias concretas sao instanciadas e conectadas |
| **DIP** | Dependency Inversion Principle -- modulos de alto nivel nao dependem de modulos de baixo nivel; ambos dependem de abstracoes |
| **IoC** | Inversion of Control -- o controle do fluxo de dependencias e invertido (framework chama seu codigo) |
| **SPI** | Service Provider Interface -- interfaces que definem o que a aplicacao precisa do mundo externo |
| **Actor** | Entidade externa que interage com o hexagono (usuario, banco, API, teste) |
| **Configurable Dependency** | Padrao que permite trocar implementacoes via configuracao/injecao |
| **Bounded Context** | Fronteira explicita dentro da qual um modelo de dominio particular e definido e aplicavel (DDD) |

## Apendice C: Checklist de Implementacao

```
[ ] Dominio definido sem dependencias externas
[ ] Value Objects imutaveis para conceitos de dominio
[ ] Entidades com logica de negocio (nao anemicas)
[ ] Driving ports definidos como interfaces (ABC)
[ ] Driven ports definidos como interfaces (ABC)
[ ] Driving adapters criados para cada canal de entrada
[ ] Driven adapters criados para cada servico externo
[ ] Mapeamento de modelos nos adapters (nao no dominio)
[ ] Composition Root configurado (DI container)
[ ] Testes unitarios do dominio (sem mocks)
[ ] Testes unitarios de use cases (com fakes nos ports)
[ ] Testes de integracao dos adapters
[ ] Nenhum import de infraestrutura no dominio
[ ] Nenhuma logica de negocio nos adapters
[ ] Dependency Rule respeitada (deps apontam para dentro)
```

---

*Documento gerado como parte da base de conhecimento do Trading Bot Assessor.*
*Baseado em pesquisa de 18+ fontes academicas e tecnicas.*
