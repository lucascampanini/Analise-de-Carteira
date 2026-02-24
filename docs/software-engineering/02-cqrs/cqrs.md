# CQRS -- Command Query Responsibility Segregation

> **Documento de Referencia Nivel PhD**
> Pesquisa abrangente cobrindo fundamentos teoricos, arquitetura, implementacao,
> trade-offs, anti-patterns e aplicacao pratica ao BOT Assessor de Trading.

---

## Indice

1. [Fundamentos: De CQS a CQRS](#1-fundamentos-de-cqs-a-cqrs)
2. [Arquitetura CQRS](#2-arquitetura-cqrs)
3. [CQRS + Event Sourcing](#3-cqrs--event-sourcing)
4. [Read Model e Projections](#4-read-model-e-projections)
5. [CQRS sem Event Sourcing](#5-cqrs-sem-event-sourcing)
6. [Consistencia e Sagas](#6-consistencia-e-sagas)
7. [Frameworks e Implementacoes](#7-frameworks-e-implementacoes)
8. [Anti-Patterns](#8-anti-patterns)
9. [CQRS para Trading Systems](#9-cqrs-para-trading-systems)
10. [Aplicacao ao BOT Assessor](#10-aplicacao-ao-bot-assessor)
11. [Referencias Bibliograficas](#11-referencias-bibliograficas)

---

## 1. Fundamentos: De CQS a CQRS

### 1.1 Command-Query Separation (CQS) -- Bertrand Meyer (1988)

O principio CQS foi introduzido por **Bertrand Meyer** em seu livro
*Object-Oriented Software Construction* (1988, Prentice Hall). A regra e
simples e elegante:

> **"Every method should either be a command that performs an action,
> or a query that returns data to the caller, but not both."**
> -- Bertrand Meyer

```
+--------------------------------------------------+
|              CQS -- Nivel de Metodo               |
+--------------------------------------------------+
|                                                    |
|   COMMAND (void)          QUERY (retorna valor)    |
|   +--------------+       +--------------+          |
|   | Altera estado|       | Nao altera   |          |
|   | Nao retorna  |       | estado       |          |
|   | valor         |       | Retorna dado |          |
|   +--------------+       +--------------+          |
|                                                    |
|   Exemplo:                Exemplo:                 |
|   account.deposit(100)   account.get_balance()     |
|   stack.push(item)       stack.top()               |
|                                                    |
+--------------------------------------------------+
```

**Implicacoes do CQS:**

- Queries sao *side-effect free* (funcoes puras em essencia)
- Commands alteram estado mas nao informam o resultado diretamente
- Facilita reasoning sobre codigo: queries podem ser chamadas em qualquer
  ordem sem efeitos colaterais
- Excepcao classica: `stack.pop()` que retorna E remove (Meyer reconheceu
  isso como violacao pragmatica)

### 1.2 De CQS para CQRS -- Greg Young (2010)

**Greg Young** elevou o principio CQS do nivel de metodo para o nivel
**arquitetural**, cunhando o termo CQRS em 2010. A diferenca fundamental:

| Aspecto          | CQS (Meyer)                    | CQRS (Young)                        |
|------------------|--------------------------------|--------------------------------------|
| Nivel            | Metodo/Classe                  | Arquitetura/Sistema                  |
| Separacao        | Metodos command vs query       | Modelos inteiros separados           |
| Modelos de dados | Mesmo modelo para R/W          | Modelos distintos para R e W         |
| Database         | Mesma                          | Pode ser separada                    |
| Escala           | Objeto                         | Bounded Context / Servico            |
| Ano              | 1988                           | 2010                                 |

```
+---------------------------------------------------------------+
|              CQRS -- Nivel Arquitetural                       |
+---------------------------------------------------------------+
|                                                                |
|   CLIENT                                                       |
|     |                                                          |
|     +--------+----------+                                      |
|              |          |                                      |
|         COMMAND      QUERY                                     |
|         MODEL        MODEL                                     |
|     +----------+  +----------+                                 |
|     | Command  |  | Query    |                                 |
|     | Handler  |  | Handler  |                                 |
|     +----+-----+  +----+-----+                                 |
|          |              |                                      |
|     +----v-----+  +----v-----+                                 |
|     | Write    |  | Read     |                                 |
|     | Database |  | Database |                                 |
|     +----------+  +----------+                                 |
|                                                                |
|   "Use different models to update information                  |
|    than the model you use to read information."                |
|    -- Greg Young                                               |
+---------------------------------------------------------------+
```

### 1.3 Motivacoes para CQRS

**Por que separar leitura de escrita?**

1. **Assimetria de carga**: Na maioria dos sistemas, reads >> writes
   (tipicamente 90/10 ou mais). Cada lado pode escalar independentemente.

2. **Complexidade do dominio**: O modelo de escrita precisa de regras de
   negocio complexas (validacao, invariantes), enquanto o modelo de leitura
   precisa ser rapido e denormalizado.

3. **Otimizacao independente**: Write model pode usar normalizado (3NF) para
   consistencia; read model pode usar denormalizado/materialized views para
   performance.

4. **Seguranca**: Diferentes permissoes para operacoes de leitura vs escrita.

5. **Evolucao independente**: Read e write models podem evoluir em ritmos
   diferentes sem acoplar um ao outro.

### 1.4 Trade-offs Fundamentais

| Vantagem                              | Custo                                    |
|---------------------------------------|------------------------------------------|
| Escalabilidade independente R/W       | Complexidade operacional                 |
| Modelos otimizados para cada lado     | Eventual consistency (se DBs separados)  |
| Melhor performance de leitura         | Mais codigo e infraestrutura             |
| Seguranca granular                    | Curva de aprendizado da equipe           |
| Fit natural com Event Sourcing        | Sincronizacao de modelos                 |

---

## 2. Arquitetura CQRS

### 2.1 Componentes Principais

```
+------------------------------------------------------------------+
|                    ARQUITETURA CQRS COMPLETA                     |
+------------------------------------------------------------------+
|                                                                    |
|  API / Controller                                                  |
|       |                                                            |
|       +---> [Command DTO] ---> COMMAND BUS ---> COMMAND HANDLER    |
|       |                            |                  |            |
|       |                     [Pipeline Behaviors]      |            |
|       |                     - Logging                 |            |
|       |                     - Validation              |            |
|       |                     - Authorization            |            |
|       |                     - Transaction             |            |
|       |                            |                  |            |
|       |                     COMMAND HANDLER            |            |
|       |                            |                  |            |
|       |                     [Domain Model]             |            |
|       |                            |                  |            |
|       |                     WRITE DATABASE             |            |
|       |                            |                  |            |
|       |                     [Domain Events] --------+  |            |
|       |                                             |  |            |
|       |                                    EVENT BUS/  |            |
|       |                                    PROJECTOR   |            |
|       |                                             |  |            |
|       +---> [Query DTO] ----> QUERY BUS ---> QUERY HANDLER         |
|                                  |                  |              |
|                           [Pipeline Behaviors]      |              |
|                           - Caching                 |              |
|                           - Logging                 |              |
|                                  |                  |              |
|                            QUERY HANDLER            |              |
|                                  |                  |              |
|                            READ DATABASE <----------+              |
|                                                                    |
+------------------------------------------------------------------+
```

### 2.2 Commands

Um **Command** representa a *intencao* do usuario de alterar o estado do sistema.
Caracteristicas:

- **Imperativo**: `CreateOrder`, `CancelTrade`, `UpdatePortfolio`
- **Void**: Nao retorna dados (apenas sucesso/falha)
- **Validavel**: Deve ser validado antes da execucao
- **Idempotente** (idealmente): Executar 2x nao deve causar efeito duplicado
- **Unico handler**: Cada command tem exatamente 1 handler

```python
# Exemplo em Python

@dataclass(frozen=True)
class PlaceOrderCommand:
    """Command para colocar uma ordem de trading."""
    order_id: str
    symbol: str
    side: OrderSide  # BUY ou SELL
    quantity: Decimal
    price: Decimal
    order_type: OrderType  # MARKET, LIMIT, STOP
    timestamp: datetime
    idempotency_key: str  # Para garantir idempotencia
```

### 2.3 Command Handlers

O **Command Handler** recebe um command, executa a logica de negocio e
persiste as alteracoes:

```python
class PlaceOrderCommandHandler:
    def __init__(
        self,
        order_repository: OrderRepository,
        risk_service: RiskService,
        event_publisher: EventPublisher,
    ):
        self._order_repo = order_repository
        self._risk_service = risk_service
        self._event_publisher = event_publisher

    async def handle(self, command: PlaceOrderCommand) -> None:
        # 1. Verificar idempotencia
        if await self._order_repo.exists(command.order_id):
            return  # Ja processado, idempotente

        # 2. Validacao de negocio / Risk check
        risk_result = await self._risk_service.check(
            symbol=command.symbol,
            quantity=command.quantity,
            side=command.side,
        )
        if not risk_result.approved:
            raise OrderRejectedError(risk_result.reason)

        # 3. Criar aggregate
        order = Order.place(
            order_id=command.order_id,
            symbol=command.symbol,
            side=command.side,
            quantity=command.quantity,
            price=command.price,
            order_type=command.order_type,
        )

        # 4. Persistir
        await self._order_repo.save(order)

        # 5. Publicar eventos de dominio
        for event in order.pending_events:
            await self._event_publisher.publish(event)
```

### 2.4 Queries e Query Handlers

Uma **Query** e um pedido de informacao que nao altera estado:

```python
@dataclass(frozen=True)
class GetPortfolioQuery:
    """Query para consultar portfolio atual."""
    account_id: str
    include_open_orders: bool = True


class GetPortfolioQueryHandler:
    def __init__(self, read_db: ReadDatabase):
        self._read_db = read_db

    async def handle(self, query: GetPortfolioQuery) -> PortfolioView:
        portfolio = await self._read_db.get_portfolio(query.account_id)
        if query.include_open_orders:
            portfolio.open_orders = await self._read_db.get_open_orders(
                query.account_id
            )
        return portfolio
```

### 2.5 Command Bus e Query Bus

O **Bus** (ou **Mediator**) e o componente que roteia commands/queries para
seus handlers. Pode ser implementado como:

1. **In-process Mediator** (MediatR, Ecotone)
2. **Message Queue** (RabbitMQ, Kafka)
3. **Service Bus** (Azure Service Bus, AWS SQS)

```
+----------------------------------------------------------------+
|              MEDIATOR / BUS PATTERN                             |
+----------------------------------------------------------------+
|                                                                  |
|   Request ---> MEDIATOR ---> Pipeline Behavior 1                 |
|                    |              |                               |
|                    |         Pipeline Behavior 2                 |
|                    |              |                               |
|                    |         Pipeline Behavior N                 |
|                    |              |                               |
|                    +-------> HANDLER                             |
|                                  |                               |
|                              Response                            |
|                                                                  |
|   Exemplos de Pipeline Behaviors:                                |
|   - ValidationBehavior (FluentValidation)                        |
|   - AuthorizationBehavior                                        |
|   - LoggingBehavior                                              |
|   - TransactionBehavior                                          |
|   - CachingBehavior (apenas queries)                             |
|   - RetryBehavior                                                |
|   - MetricsBehavior                                              |
|                                                                  |
+----------------------------------------------------------------+
```

### 2.6 Pipeline Behaviors

Pipeline Behaviors sao **middlewares** que interceptam requests antes/depois
do handler. Implementam cross-cutting concerns de forma limpa:

```python
class ValidationBehavior:
    """Pipeline behavior que valida commands antes do handler."""

    def __init__(self, validators: list[Validator]):
        self._validators = validators

    async def handle(
        self, request: Any, next_handler: Callable
    ) -> Any:
        # Pre-handler: validar
        errors = []
        for validator in self._validators:
            if validator.can_validate(request):
                result = await validator.validate(request)
                errors.extend(result.errors)

        if errors:
            raise ValidationError(errors)

        # Chamar proximo behavior ou handler
        return await next_handler(request)


class LoggingBehavior:
    """Pipeline behavior para logging de commands e queries."""

    async def handle(
        self, request: Any, next_handler: Callable
    ) -> Any:
        logger.info(f"Handling {type(request).__name__}", extra={
            "request_type": type(request).__name__,
            "request_data": asdict(request),
        })
        start = time.monotonic()

        try:
            result = await next_handler(request)
            elapsed = time.monotonic() - start
            logger.info(
                f"Handled {type(request).__name__} in {elapsed:.3f}s"
            )
            return result
        except Exception as e:
            elapsed = time.monotonic() - start
            logger.error(
                f"Failed {type(request).__name__} after {elapsed:.3f}s: {e}"
            )
            raise
```

---

## 3. CQRS + Event Sourcing

### 3.1 Conceito Fundamental

Event Sourcing e a pratica de armazenar todas as mudancas de estado como
uma sequencia de **eventos imutaveis**, em vez de armazenar apenas o estado
atual. Combinado com CQRS, forma uma arquitetura poderosa:

```
+------------------------------------------------------------------+
|            CQRS + EVENT SOURCING                                 |
+------------------------------------------------------------------+
|                                                                    |
|  COMMAND SIDE (Write)              QUERY SIDE (Read)               |
|                                                                    |
|  Command                           Query                           |
|     |                                 |                            |
|  Command Handler                   Query Handler                   |
|     |                                 |                            |
|  Aggregate                         Read Model                      |
|     |                                 ^                            |
|  Event Store   ---[Events]--->   Projections                       |
|  (append-only)     (async)       (materialized                     |
|                                   views)                           |
|                                                                    |
|  +------------+    Publish     +------------+                      |
|  | Event      | ------------> | Projection | --> Read DB           |
|  | Store      |   (Event Bus) | Engine     |    (denormalized)     |
|  | (imutavel) |               +------------+                      |
|  +------------+                                                    |
|                                                                    |
|  Estado = f(eventos)  -- O estado e derivado dos eventos           |
|                                                                    |
+------------------------------------------------------------------+
```

### 3.2 Event Store

O **Event Store** e a fonte de verdade (source of truth). Caracteristicas:

- **Append-only**: Eventos nunca sao alterados ou deletados
- **Ordenado**: Cada stream tem eventos em ordem cronologica
- **Versionado**: Cada evento tem um numero de versao sequencial
- **Stream-based**: Eventos sao agrupados por aggregate ID

```python
@dataclass(frozen=True)
class DomainEvent:
    """Evento base de dominio."""
    event_id: str
    aggregate_id: str
    aggregate_type: str
    event_type: str
    version: int
    timestamp: datetime
    data: dict
    metadata: dict  # correlation_id, causation_id, user_id


# Exemplo de eventos de trading
@dataclass(frozen=True)
class OrderPlacedEvent(DomainEvent):
    symbol: str
    side: str
    quantity: Decimal
    price: Decimal
    order_type: str


@dataclass(frozen=True)
class OrderFilledEvent(DomainEvent):
    fill_price: Decimal
    fill_quantity: Decimal
    commission: Decimal


@dataclass(frozen=True)
class OrderCancelledEvent(DomainEvent):
    reason: str
    cancelled_by: str
```

### 3.3 Aggregate com Event Sourcing

O aggregate reconstroi seu estado a partir dos eventos:

```python
class Order:
    """Aggregate de Order usando Event Sourcing."""

    def __init__(self):
        self._id: str = ""
        self._status: OrderStatus = OrderStatus.NONE
        self._symbol: str = ""
        self._side: OrderSide = OrderSide.BUY
        self._quantity: Decimal = Decimal("0")
        self._filled_quantity: Decimal = Decimal("0")
        self._price: Decimal = Decimal("0")
        self._events: list[DomainEvent] = []
        self._version: int = 0

    # --- Factory Method (Command) ---
    @classmethod
    def place(cls, order_id, symbol, side, quantity, price, order_type):
        order = cls()
        order._apply(OrderPlacedEvent(
            event_id=str(uuid4()),
            aggregate_id=order_id,
            aggregate_type="Order",
            event_type="OrderPlaced",
            version=1,
            timestamp=datetime.utcnow(),
            data={},
            metadata={},
            symbol=symbol,
            side=side.value,
            quantity=quantity,
            price=price,
            order_type=order_type.value,
        ))
        return order

    # --- Apply Events (Reconstroi estado) ---
    def _apply(self, event: DomainEvent):
        self._route_event(event)
        self._events.append(event)
        self._version = event.version

    def _route_event(self, event):
        handler = getattr(self, f"_on_{event.event_type}", None)
        if handler:
            handler(event)

    def _on_OrderPlaced(self, event: OrderPlacedEvent):
        self._id = event.aggregate_id
        self._status = OrderStatus.PENDING
        self._symbol = event.symbol
        self._side = OrderSide(event.side)
        self._quantity = event.quantity
        self._price = event.price

    def _on_OrderFilled(self, event: OrderFilledEvent):
        self._filled_quantity += event.fill_quantity
        if self._filled_quantity >= self._quantity:
            self._status = OrderStatus.FILLED
        else:
            self._status = OrderStatus.PARTIALLY_FILLED

    def _on_OrderCancelled(self, event: OrderCancelledEvent):
        self._status = OrderStatus.CANCELLED

    # --- Reconstituir do Event Store ---
    @classmethod
    def from_events(cls, events: list[DomainEvent]) -> "Order":
        order = cls()
        for event in events:
            order._route_event(event)
            order._version = event.version
        return order

    @property
    def pending_events(self) -> list[DomainEvent]:
        return list(self._events)
```

### 3.4 Snapshots

Quando um aggregate tem muitos eventos (centenas ou milhares), reconstruir
do zero a cada operacao se torna custoso. **Snapshots** resolvem isso:

```
+------------------------------------------------------------------+
|                    SNAPSHOT STRATEGY                              |
+------------------------------------------------------------------+
|                                                                    |
|  Sem Snapshot:                                                     |
|  [E1] -> [E2] -> [E3] -> ... -> [E500] -> Estado Atual            |
|  (Replay de 500 eventos a cada load)                              |
|                                                                    |
|  Com Snapshot:                                                     |
|  [E1] -> ... -> [E100] -> [SNAPSHOT@100] -> [E101] -> ... [E500]  |
|                                |                                   |
|                     Load snapshot + replay 400 eventos             |
|                                                                    |
|  Estrategias de Snapshot:                                          |
|  - A cada N eventos (ex: a cada 100)                              |
|  - Baseado em tempo (ex: a cada hora)                             |
|  - Sob demanda (quando load time > threshold)                     |
|                                                                    |
+------------------------------------------------------------------+
```

```python
class SnapshotStore:
    """Armazena snapshots de aggregates."""

    async def save_snapshot(
        self,
        aggregate_id: str,
        aggregate_type: str,
        version: int,
        state: dict,
    ) -> None:
        await self._db.snapshots.insert_one({
            "aggregate_id": aggregate_id,
            "aggregate_type": aggregate_type,
            "version": version,
            "state": state,
            "created_at": datetime.utcnow(),
        })

    async def load_aggregate(self, aggregate_id: str) -> Order:
        # 1. Tentar carregar snapshot mais recente
        snapshot = await self._db.snapshots.find_one(
            {"aggregate_id": aggregate_id},
            sort=[("version", -1)]
        )

        if snapshot:
            # 2. Carregar apenas eventos APOS o snapshot
            events = await self._event_store.get_events(
                aggregate_id=aggregate_id,
                after_version=snapshot["version"]
            )
            order = Order.from_snapshot(snapshot["state"])
        else:
            # 3. Sem snapshot: carregar todos os eventos
            events = await self._event_store.get_events(
                aggregate_id=aggregate_id
            )
            order = Order()

        # 4. Aplicar eventos restantes
        for event in events:
            order._route_event(event)

        return order
```

### 3.5 Event Versioning e Upcasting

A medida que o sistema evolui, os esquemas de eventos mudam. Estrategias:

**Versionamento Semantico de Eventos:**

```python
# V1 do evento (original)
class OrderPlacedEvent_V1:
    symbol: str
    quantity: Decimal
    price: Decimal

# V2 do evento (adicionou campo)
class OrderPlacedEvent_V2:
    symbol: str
    quantity: Decimal
    price: Decimal
    exchange: str  # Novo campo


class EventUpcaster:
    """Transforma eventos antigos para formato novo durante replay."""

    def upcast(self, event: dict) -> dict:
        event_type = event["event_type"]
        version = event.get("schema_version", 1)

        if event_type == "OrderPlaced" and version == 1:
            # Upcasting: V1 -> V2
            event["data"]["exchange"] = "DEFAULT"
            event["schema_version"] = 2

        return event
```

**Regras de Ouro para Event Versioning:**

1. **Nunca altere** um evento ja publicado (imutabilidade)
2. **Adicionar campos** e seguro (backward compatible)
3. **Remover campos** requer upcasting
4. **Renomear eventos** requer mapeamento de tipo
5. **Manter schema registry** com todas as versoes

### 3.6 Eventual Consistency entre Write e Read

```
+------------------------------------------------------------------+
|          EVENTUAL CONSISTENCY TIMELINE                            |
+------------------------------------------------------------------+
|                                                                    |
|  t0: Command recebido                                             |
|  t1: Command Handler executa logica de negocio                    |
|  t2: Evento persistido no Event Store      <-- Write consistente  |
|  t3: Evento publicado no Event Bus                                |
|  t4: Projection Handler recebe evento                             |
|  t5: Read Model atualizado                 <-- Read atualizado    |
|                                                                    |
|  JANELA DE INCONSISTENCIA: t2 -> t5                               |
|  (tipicamente milissegundos a poucos segundos)                    |
|                                                                    |
|  Cliente le dados em t3?                                          |
|  -> Ve estado ANTERIOR ao command (stale read)                    |
|                                                                    |
|  Estrategias de mitigacao:                                         |
|  - Read-your-writes: apos command, le do write model              |
|  - Polling com version: cliente espera version >= X               |
|  - Subscription: cliente recebe notificacao de atualizacao        |
|  - UI Optimistic Update: assume sucesso no frontend               |
|                                                                    |
+------------------------------------------------------------------+
```

---

## 4. Read Model e Projections

### 4.1 O Que Sao Projections?

Uma **Projection** (ou **Projector**) e o processo de transformar uma
sequencia de eventos em uma representacao estruturada otimizada para
consultas. O resultado e chamado de **Read Model** ou **Materialized View**.

```
+------------------------------------------------------------------+
|                  PROJECTIONS PIPELINE                             |
+------------------------------------------------------------------+
|                                                                    |
|  Event Stream:                                                     |
|  [OrderPlaced] [OrderFilled] [OrderCancelled] [TradeSettled] ...  |
|        |             |              |                |             |
|        v             v              v                v             |
|  +-----------------------------------------------------------+    |
|  |              PROJECTION ENGINE                             |    |
|  +-----------------------------------------------------------+    |
|        |             |              |                |             |
|        v             v              v                v             |
|  +-----------+ +-----------+ +-----------+ +-------------+        |
|  | Portfolio | | Order     | | P&L       | | Trade       |        |
|  | View      | | History   | | Summary   | | Blotter     |        |
|  | (Mongo)   | | (Postgres)| | (Redis)   | | (TimescaleDB|        |
|  +-----------+ +-----------+ +-----------+ +-------------+        |
|                                                                    |
|  Cada projecao e otimizada para seu caso de uso de consulta        |
|                                                                    |
+------------------------------------------------------------------+
```

### 4.2 Tipos de Projections

**Synchronous (In-Process):**
- Atualiza read model na mesma transacao do write
- Consistencia forte (sem eventual consistency)
- Mais simples, porem acopla write e read
- Adequado para sistemas menores ou requisitos de consistencia forte

**Asynchronous (Event-Driven):**
- Atualiza read model via eventos asincronos
- Eventual consistency
- Melhor escalabilidade e desacoplamento
- Adequado para sistemas maiores e alta carga

**Catch-up Subscriptions:**
- Le eventos do event store a partir de uma posicao conhecida
- Mantem checkpoint do ultimo evento processado
- Permite rebuild completo do read model
- Garante processamento ordenado

**Persistent Subscriptions:**
- Servidor mantém posicao da subscription
- Suporta competing consumers (multiplos workers)
- NAO garante processamento ordenado
- Adequado para workloads que toleram processamento desordenado

```python
class PortfolioProjection:
    """Projection que materializa a view de portfolio."""

    def __init__(self, read_db: ReadDatabase):
        self._read_db = read_db
        self._handlers = {
            "OrderFilled": self._on_order_filled,
            "OrderCancelled": self._on_order_cancelled,
            "DepositReceived": self._on_deposit_received,
            "WithdrawalProcessed": self._on_withdrawal_processed,
        }

    async def handle(self, event: DomainEvent) -> None:
        handler = self._handlers.get(event.event_type)
        if handler:
            await handler(event)
            # Salvar checkpoint
            await self._read_db.save_checkpoint(
                projection_name="portfolio",
                position=event.version,
            )

    async def _on_order_filled(self, event: OrderFilledEvent) -> None:
        portfolio = await self._read_db.get_portfolio(event.account_id)

        if event.side == "BUY":
            portfolio.add_position(
                symbol=event.symbol,
                quantity=event.fill_quantity,
                avg_price=event.fill_price,
            )
        elif event.side == "SELL":
            portfolio.reduce_position(
                symbol=event.symbol,
                quantity=event.fill_quantity,
                realized_pnl=self._calculate_pnl(event),
            )

        await self._read_db.save_portfolio(portfolio)

    async def rebuild(self) -> None:
        """Rebuild completo da projecao a partir dos eventos."""
        await self._read_db.clear_portfolio_collection()
        async for event in self._event_store.read_all_events():
            await self.handle(event)
```

### 4.3 Denormalizacao do Read Model

O read model e **intencionalmente denormalizado** para performance de leitura:

```
+------------------------------------------------------------------+
|      WRITE MODEL (normalizado)    vs    READ MODEL (denormalizado)|
+------------------------------------------------------------------+
|                                                                    |
|  orders                            portfolio_view                  |
|  +----------+                      +-----------------------+       |
|  | order_id |                      | account_id            |       |
|  | acct_id  |                      | total_equity          |       |
|  | symbol   |                      | cash_balance          |       |
|  | side     |                      | unrealized_pnl        |       |
|  | qty      |                      | realized_pnl          |       |
|  | price    |                      | positions: [          |       |
|  | status   |                      |   { symbol, qty,      |       |
|  +----------+                      |     avg_price,        |       |
|                                    |     current_price,    |       |
|  fills                             |     unrealized_pnl,   |       |
|  +----------+                      |     weight_pct }      |       |
|  | fill_id  |                      | ]                     |       |
|  | order_id |                      | open_orders: [        |       |
|  | price    |                      |   { order_id, symbol, |       |
|  | qty      |                      |     side, qty, price, |       |
|  | fee      |                      |     status }          |       |
|  +----------+                      | ]                     |       |
|                                    | last_updated          |       |
|  accounts                          +-----------------------+       |
|  +----------+                                                      |
|  | acct_id  |  <- Normalizado:         Denormalizado:              |
|  | balance  |     3+ tabelas,          1 documento/row,            |
|  | ...      |     JOINs para ler       leitura em 1 query,        |
|  +----------+                          pre-calculado               |
|                                                                    |
+------------------------------------------------------------------+
```

### 4.4 Escolha de Databases para Read Model

| Caso de Uso               | Database Recomendada     | Justificativa                    |
|---------------------------|--------------------------|----------------------------------|
| Portfolio / Dashboard     | MongoDB, DynamoDB        | Documentos flexiveis, rapido     |
| Trade History (time)      | TimescaleDB, InfluxDB    | Series temporais otimizadas      |
| Busca full-text           | Elasticsearch            | Busca e agregacoes               |
| Caches de alta velocidade | Redis                    | In-memory, sub-ms latencia       |
| Relatorios analiticos     | ClickHouse, BigQuery     | OLAP, colunar                    |
| Graficos / OHLCV          | TimescaleDB              | Continous aggregates             |

---

## 5. CQRS sem Event Sourcing

### 5.1 CQRS Simplificado

CQRS **nao requer** Event Sourcing. As duas tecnicas sao complementares
mas independentes. CQRS simplificado e frequentemente a melhor opcao para
comecar:

```
+------------------------------------------------------------------+
|              CQRS SIMPLIFICADO (sem Event Sourcing)              |
+------------------------------------------------------------------+
|                                                                    |
|  Opcao A: MESMA DATABASE, modelos separados no codigo              |
|                                                                    |
|  Command Handler ---> WriteModel (ORM) ---> [PostgreSQL]           |
|  Query Handler   ---> ReadModel (SQL)  ---> [PostgreSQL]           |
|                                              (mesma DB)            |
|  Vantagem: Consistencia forte, simples                             |
|  Desvantagem: Mesma DB para ambos, menos escalavel                |
|                                                                    |
|  ------------------------------------------------------------------
|                                                                    |
|  Opcao B: DATABASE SEPARADA com sincronizacao                      |
|                                                                    |
|  Command Handler ---> WriteModel ---> [PostgreSQL Write]           |
|                            |                                       |
|                       [CDC / Eventos]                              |
|                            |                                       |
|  Query Handler  ---> ReadModel  ---> [PostgreSQL Read Replica]     |
|                                  ou  [MongoDB Read Store]          |
|                                                                    |
|  Vantagem: Escalabilidade, modelos otimizados                      |
|  Desvantagem: Eventual consistency                                 |
|                                                                    |
|  ------------------------------------------------------------------
|                                                                    |
|  Opcao C: MESMA DATABASE com Views/Materialized Views              |
|                                                                    |
|  Command Handler ---> Tabelas normalizadas ---> [PostgreSQL]       |
|  Query Handler   ---> Materialized Views   ---> [PostgreSQL]       |
|                                                  (mesma DB)        |
|  Vantagem: Consistencia + leituras otimizadas                      |
|  Desvantagem: Refresh de materialized views                        |
|                                                                    |
+------------------------------------------------------------------+
```

### 5.2 Quando Usar CQRS sem Event Sourcing

- Dominio nao requer audit trail completo
- Equipe esta comecando com CQRS
- Complexidade do write model e moderada
- Leituras pesadas justificam read model separado
- Nao ha necessidade de "time travel" no estado

### 5.3 Exemplo Pratico: CQRS Simplificado com SQLAlchemy

```python
# --- Write Model (normalizado, com regras de negocio) ---

class OrderWriteModel(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    account_id = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    side = Column(Enum(OrderSide), nullable=False)
    quantity = Column(Numeric, nullable=False)
    price = Column(Numeric, nullable=False)
    status = Column(Enum(OrderStatus), nullable=False)
    created_at = Column(DateTime, nullable=False)


class PlaceOrderHandler:
    async def handle(self, cmd: PlaceOrderCommand) -> None:
        order = OrderWriteModel(
            id=cmd.order_id,
            account_id=cmd.account_id,
            symbol=cmd.symbol,
            side=cmd.side,
            quantity=cmd.quantity,
            price=cmd.price,
            status=OrderStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        self._session.add(order)
        await self._session.commit()


# --- Read Model (denormalizado, otimizado para queries) ---
# Pode ser uma VIEW no PostgreSQL ou um modelo separado

PORTFOLIO_VIEW_SQL = """
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT
    o.account_id,
    o.symbol,
    SUM(CASE WHEN o.side = 'BUY' THEN o.quantity ELSE -o.quantity END)
        AS net_quantity,
    AVG(o.price) AS avg_price,
    COUNT(*) AS trade_count,
    SUM(f.commission) AS total_commission
FROM orders o
LEFT JOIN fills f ON f.order_id = o.id
WHERE o.status = 'FILLED'
GROUP BY o.account_id, o.symbol;
"""


class GetPortfolioHandler:
    async def handle(self, query: GetPortfolioQuery) -> PortfolioView:
        result = await self._session.execute(
            text("SELECT * FROM portfolio_summary WHERE account_id = :id"),
            {"id": query.account_id}
        )
        return PortfolioView.from_rows(result.fetchall())
```

---

## 6. Consistencia e Sagas

### 6.1 Modelos de Consistencia

```
+------------------------------------------------------------------+
|              ESPECTRO DE CONSISTENCIA                             |
+------------------------------------------------------------------+
|                                                                    |
|  STRONG         CAUSAL          SESSION        EVENTUAL            |
|  CONSISTENCY    CONSISTENCY     CONSISTENCY    CONSISTENCY          |
|  <--------------------------------------------------------------> |
|  Mais lento     |               |              Mais rapido        |
|  Mais simples   |               |              Mais complexo      |
|                 |               |                                  |
|  Todas as       Respeita        O cliente      Eventualmente       |
|  leituras       ordem           ve suas        todos os nos        |
|  veem a         causal          proprias       convergem           |
|  escrita         dos            escritas                           |
|  mais           eventos                                            |
|  recente                                                           |
|                                                                    |
|  CQRS mesma DB  |  CQRS + CDC  | Read-your-  | CQRS + async      |
|                 |               | writes      | projections        |
+------------------------------------------------------------------+
```

### 6.2 Sagas e Compensacao

Uma **Saga** e uma sequencia de transacoes locais onde cada passo tem uma
**acao compensatoria** para reverter em caso de falha:

```
+------------------------------------------------------------------+
|              SAGA: Execucao de Trade                              |
+------------------------------------------------------------------+
|                                                                    |
|  PASSO 1: Validar Risco                                           |
|    Acao: risk_service.approve(order)                               |
|    Compensacao: risk_service.release_limit(order)                  |
|                                                                    |
|  PASSO 2: Reservar Margem                                         |
|    Acao: margin_service.reserve(account, amount)                   |
|    Compensacao: margin_service.release(account, amount)            |
|                                                                    |
|  PASSO 3: Enviar Ordem ao Exchange                                |
|    Acao: exchange.submit_order(order)                              |
|    Compensacao: exchange.cancel_order(order_id)                    |
|                                                                    |
|  PASSO 4: Registrar Trade                                         |
|    Acao: trade_service.record(trade)                               |
|    Compensacao: trade_service.void(trade_id)                       |
|                                                                    |
|  FLUXO DE FALHA (ex: Passo 3 falha):                             |
|  Passo 3 FALHA -> Compensar Passo 2 -> Compensar Passo 1          |
|                                                                    |
+------------------------------------------------------------------+
```

**Dois modelos de Saga:**

```
+----------------------------------+----------------------------------+
|        ORCHESTRATION             |        CHOREOGRAPHY              |
+----------------------------------+----------------------------------+
|                                  |                                  |
|  Saga Orchestrator               |  Cada servico reage              |
|       |                          |  a eventos do anterior           |
|       +-> Step 1                 |                                  |
|       |   (success)              |  Service A --> Event A           |
|       +-> Step 2                 |       |                          |
|       |   (success)              |  Service B <-- (escuta Event A)  |
|       +-> Step 3                 |       |                          |
|       |   (FAILURE)              |  Service B --> Event B           |
|       +-> Compensate 2           |       |                          |
|       +-> Compensate 1           |  Service C <-- (escuta Event B)  |
|                                  |                                  |
|  Pros: Controle central,        |  Pros: Desacoplado,              |
|        facil de debugar          |        escalavel                 |
|  Cons: Single point of failure   |  Cons: Dificil de rastrear,     |
|        orquestrador complexo     |        debugging complexo        |
|                                  |                                  |
+----------------------------------+----------------------------------+
```

### 6.3 Idempotencia de Commands

Idempotencia garante que executar o mesmo command 2+ vezes produz o
mesmo resultado:

```python
class IdempotentCommandHandler:
    """Decorator para garantir idempotencia de commands."""

    def __init__(self, inner_handler, idempotency_store):
        self._inner = inner_handler
        self._store = idempotency_store

    async def handle(self, command) -> None:
        # 1. Verificar se ja foi processado
        key = command.idempotency_key
        if await self._store.exists(key):
            logger.info(f"Command {key} ja processado, ignorando")
            return

        # 2. Processar command
        try:
            result = await self._inner.handle(command)
        except Exception:
            raise

        # 3. Marcar como processado (com TTL)
        await self._store.mark_processed(
            key=key,
            ttl=timedelta(hours=24),
            result_summary=str(result),
        )

        return result
```

**Estrategias de idempotencia:**

| Estrategia              | Descricao                                | Uso                          |
|-------------------------|------------------------------------------|------------------------------|
| Idempotency Key         | Cliente envia chave unica por request    | APIs REST, commands          |
| Natural Key             | Usa campos do negocio como chave         | Ordens com order_id unico    |
| Deduplication Store     | Armazena hashes de commands processados  | Message consumers            |
| Optimistic Concurrency  | Verifica versao antes de escrever        | Aggregates com versioning    |
| Database Constraints    | UNIQUE constraints previnem duplicatas   | Inserts                      |

---

## 7. Frameworks e Implementacoes

### 7.1 Ecossistema por Linguagem

#### Python

| Biblioteca          | Descricao                                   | URL                                                |
|---------------------|---------------------------------------------|----------------------------------------------------|
| eventsourcing       | Biblioteca madura de ES em Python           | github.com/pyeventsourcing/eventsourcing           |
| kant                | CQRS + ES framework, optimistic concurrency | github.com/patrickporto/kant                       |
| cqrs-eventsource    | Implementacao async de ES                   | github.com/laskoviymishka/cqrs-eventsource         |

**eventsourcing** e a biblioteca mais madura (versao 9.5.x). Suporta:
- Event-sourced aggregates
- Materialised views e CQRS
- Extensoes para Django e SQLAlchemy
- Pull-based notifications para projecoes
- Snapshotting
- Domain event encryption

#### Java/JVM

| Framework           | Descricao                                   | URL                              |
|---------------------|---------------------------------------------|----------------------------------|
| Axon Framework      | Framework completo DDD/CQRS/ES (70M+ downloads) | axoniq.io                    |
| Axon Server         | Event Store e Message Router dedicado       | axoniq.io                        |
| Reveno              | CQRS/ES lock-free para trading              | github.com/dmart28/reveno        |

**Axon Framework** e o padrao-ouro para CQRS/ES em Java:
- Command Bus, Event Bus, Query Bus integrados
- Sagas nativas
- Aggregate lifecycle management
- Testabilidade com fixtures de teste
- Distribuido com Axon Server

#### .NET

| Framework           | Descricao                                   | URL                              |
|---------------------|---------------------------------------------|----------------------------------|
| MediatR             | Mediator pattern in-process                 | github.com/jbogard/MediatR       |
| EventStoreDB Client | Client oficial para EventStoreDB            | eventstore.com                   |
| Marten              | .NET Document DB + Event Store (PostgreSQL) | martendb.io                      |

#### Infraestrutura (Language-Agnostic)

| Tecnologia          | Descricao                                   | URL                              |
|---------------------|---------------------------------------------|----------------------------------|
| EventStoreDB        | Database dedicada para Event Sourcing       | eventstore.com                   |
| Apache Kafka        | Event streaming platform                    | kafka.apache.org                 |
| Redis Streams       | Streaming leve para eventos                 | redis.io                         |

### 7.2 EventStoreDB em Detalhe

EventStoreDB (agora comercializado pela Kurrent) e a database projetada
especificamente para Event Sourcing:

**Funcionalidades-chave:**
- Streams de eventos nativos
- Projections server-side (JavaScript)
- Catch-up Subscriptions (processamento ordenado para read models)
- Persistent Subscriptions (competing consumers)
- Optimistic Concurrency Control nativo
- Cluster mode para alta disponibilidade

```
+------------------------------------------------------------------+
|          EventStoreDB - Subscription Types                       |
+------------------------------------------------------------------+
|                                                                    |
|  CATCH-UP SUBSCRIPTION            PERSISTENT SUBSCRIPTION         |
|  +--------------------+           +--------------------+           |
|  | Posicao mantida    |           | Posicao mantida    |           |
|  | pelo CLIENTE       |           | pelo SERVIDOR      |           |
|  |                    |           |                    |           |
|  | Garante ordem      |           | NAO garante ordem  |           |
|  |                    |           |                    |           |
|  | 1 consumer por     |           | N consumers        |           |
|  | subscription       |           | (competing)        |           |
|  |                    |           |                    |           |
|  | Ideal para:        |           | Ideal para:        |           |
|  | - Read models      |           | - Notificacoes     |           |
|  | - Projections      |           | - Emails           |           |
|  | - Rebuild          |           | - Integracoes      |           |
|  +--------------------+           +--------------------+           |
|                                                                    |
+------------------------------------------------------------------+
```

---

## 8. Anti-Patterns

### 8.1 Cargo Cult CQRS

> **"For most systems CQRS adds risky complexity."**
> -- Martin Fowler

O anti-pattern mais comum: adotar CQRS porque e "a arquitetura do momento"
sem ter os problemas que CQRS resolve.

```
+------------------------------------------------------------------+
|              SINAIS DE CARGO CULT CQRS                            |
+------------------------------------------------------------------+
|                                                                    |
|  [X] Sistema e basicamente CRUD sem regras complexas              |
|  [X] Reads e writes tem basicamente o mesmo modelo                |
|  [X] Equipe tem < 3 pessoas e pouca experiencia com o padrao     |
|  [X] Nao ha problemas de escala que justifiquem separacao         |
|  [X] "Todo mundo esta usando CQRS" como justificativa             |
|  [X] Adicionou Event Sourcing "porque sim"                       |
|  [X] Latencia de eventual consistency e inaceitavel no dominio    |
|                                                                    |
+------------------------------------------------------------------+
```

### 8.2 Catalogo de Anti-Patterns

#### 8.2.1 CQRS em Todo o Sistema

**Problema:** Aplicar CQRS como arquitetura top-level de todo o sistema.

**Correto:** CQRS deve ser aplicado por **Bounded Context**. Nem todo
contexto precisa de CQRS. Um sistema pode ter contextos CRUD simples
e contextos CQRS complexos coexistindo.

```
+------------------------------------------------------------------+
|              CQRS SELETIVO POR BOUNDED CONTEXT                   |
+------------------------------------------------------------------+
|                                                                    |
|  [User Management] ---- CRUD simples, sem CQRS                   |
|  [Configuration]   ---- CRUD simples, sem CQRS                   |
|  [Order Execution] ---- CQRS + Event Sourcing (complexo)          |
|  [Risk Management] ---- CQRS (read model otimizado)               |
|  [Reporting]       ---- Read-only (consome eventos)               |
|                                                                    |
+------------------------------------------------------------------+
```

#### 8.2.2 Commands Que Retornam Dados

**Problema:** Commands que retornam o estado atualizado ao cliente.

**Por que e problema:** Viola CQS; mistura escrita com leitura; acopla
modelos; dificulta async.

**Excecao pragmatica:** Retornar apenas o ID do recurso criado e
aceitavel e amplamente praticado.

#### 8.2.3 Events Que Nao Sao do Dominio

**Problema:** Criar eventos "tecnicos" como `DatabaseUpdatedEvent`,
`CacheInvalidatedEvent`, `UIRefreshedEvent`.

**Correto:** Eventos devem refletir o **linguagem do dominio**:
`OrderPlaced`, `TradeFilled`, `RiskLimitBreached`.

#### 8.2.4 Projections com Logica de Negocio

**Problema:** Colocar regras de negocio nas projections do read model.

**Correto:** Projections devem ser pura transformacao de dados. Logica
de negocio pertence ao command side (domain model).

#### 8.2.5 Ignorar Idempotencia

**Problema:** Nao tratar reprocessamento de commands/eventos.

**Consequencia:** Duplicacao de dados, inconsistencia, efeitos colaterais
repetidos (ex: enviar email 2x, cobrar 2x).

#### 8.2.6 Event Store como Message Queue

**Problema:** Usar o event store como sistema de mensageria para
comunicacao entre servicos.

**Correto:** Event store armazena fatos do dominio. Para comunicacao
inter-servicos, use um message broker adequado (Kafka, RabbitMQ).

#### 8.2.7 Over-engineering: CQRS + ES + Sagas + Microservices de Uma Vez

**Problema:** Adotar todas as tecnicas simultaneamente desde o dia 1.

**Correto:** Adotar incrementalmente:
1. Comece com CQRS simplificado (mesma DB, modelos separados no codigo)
2. Se precisar, separe databases
3. Se precisar de audit trail, adicione Event Sourcing
4. Se precisar de coordenacao, adicione Sagas

### 8.3 Quando NAO Usar CQRS

| Situacao                                         | Alternativa                |
|--------------------------------------------------|----------------------------|
| CRUD simples sem regras de negocio               | Active Record / CRUD       |
| Reads e writes com mesmo modelo                  | Repository Pattern         |
| Equipe pequena sem experiencia                   | Comece simples, refatore   |
| Consistencia forte obrigatoria em tudo           | Transacoes tradicionais    |
| Prototipo / MVP                                  | Monolito simples           |
| Dominio simples, pouca complexidade              | DDD Lite sem CQRS          |

---

## 9. CQRS para Trading Systems

### 9.1 Por Que CQRS e Natural para Trading

Trading systems sao um dos **casos de uso ideais** para CQRS porque:

1. **Assimetria extrema R/W**: Milhares de consultas de preco/portfolio por
   segundo vs dezenas/centenas de ordens por segundo.

2. **Modelos de dominio complexos no write side**: Validacao de risco,
   margem, limites, regras de compliance.

3. **Read models diversos**: Portfolio view, P&L, trade blotter, risk
   dashboard -- cada um com requisitos diferentes.

4. **Audit trail regulatorio**: Reguladores exigem historico completo e
   imutavel de todas as transacoes.

5. **Performance critica**: Latencia de execucao de ordens deve ser minima;
   consultas pesadas de relatorios nao devem impactar.

### 9.2 Arquitetura CQRS para Trading

```
+===================================================================+
|          CQRS ARCHITECTURE - TRADING BOT                          |
+===================================================================+
|                                                                     |
|  +-----------+   +-----------+   +------------+                     |
|  | Market    |   | Strategy  |   | Risk       |                     |
|  | Data Feed |   | Engine    |   | Manager    |                     |
|  +-----+-----+   +-----+-----+   +-----+------+                     |
|        |               |               |                            |
|        v               v               v                            |
|  +==========================================================+       |
|  |              COMMAND SIDE (Write)                         |       |
|  +==========================================================+       |
|  |                                                            |       |
|  |  Commands:                                                 |       |
|  |  - PlaceOrder(symbol, side, qty, price)                   |       |
|  |  - CancelOrder(order_id, reason)                          |       |
|  |  - ModifyOrder(order_id, new_qty, new_price)              |       |
|  |  - AdjustRiskLimit(symbol, new_limit)                     |       |
|  |  - RecordFill(order_id, fill_price, fill_qty)             |       |
|  |                                                            |       |
|  |  Pipeline:                                                 |       |
|  |  Command -> Validation -> Risk Check -> Handler -> Events |       |
|  |                                                            |       |
|  |  Write Store: PostgreSQL / EventStoreDB                   |       |
|  |                                                            |       |
|  +==========================================================+       |
|        |                                                            |
|        | [Domain Events: OrderPlaced, OrderFilled, ...]            |
|        v                                                            |
|  +==========================================================+       |
|  |              EVENT BUS / PROJECTIONS                      |       |
|  +==========================================================+       |
|        |          |          |           |                           |
|        v          v          v           v                          |
|  +==========================================================+       |
|  |              QUERY SIDE (Read)                            |       |
|  +==========================================================+       |
|  |                                                            |       |
|  |  Read Models:                                              |       |
|  |  +---------------+  +--------------+  +----------------+  |       |
|  |  | Portfolio     |  | Trade        |  | P&L            |  |       |
|  |  | View          |  | Blotter      |  | Summary        |  |       |
|  |  | (MongoDB)     |  | (TimescaleDB)|  | (Redis)        |  |       |
|  |  +---------------+  +--------------+  +----------------+  |       |
|  |                                                            |       |
|  |  +---------------+  +--------------+                       |       |
|  |  | Risk          |  | Audit        |                       |       |
|  |  | Dashboard     |  | Log          |                       |       |
|  |  | (Grafana/PG)  |  | (Immutable)  |                       |       |
|  |  +---------------+  +--------------+                       |       |
|  |                                                            |       |
|  |  Queries:                                                  |       |
|  |  - GetPortfolio(account_id)                               |       |
|  |  - GetOpenOrders(account_id, filters)                     |       |
|  |  - GetPnL(account_id, period)                             |       |
|  |  - GetTradeHistory(account_id, date_range)                |       |
|  |  - GetRiskExposure(account_id)                            |       |
|  |                                                            |       |
|  +==========================================================+       |
|                                                                     |
+===================================================================+
```

### 9.3 Event Sourcing para Audit Trail de Trades

```python
# Eventos de dominio de trading (imutaveis, auditaveis)

@dataclass(frozen=True)
class OrderPlacedEvent:
    order_id: str
    account_id: str
    symbol: str
    side: OrderSide
    quantity: Decimal
    price: Decimal
    order_type: OrderType
    strategy_id: str
    timestamp: datetime
    metadata: dict  # IP, session, correlation_id


@dataclass(frozen=True)
class OrderSentToExchangeEvent:
    order_id: str
    exchange: str
    exchange_order_id: str
    timestamp: datetime


@dataclass(frozen=True)
class OrderFilledEvent:
    order_id: str
    exchange_order_id: str
    fill_price: Decimal
    fill_quantity: Decimal
    commission: Decimal
    liquidity: str  # MAKER ou TAKER
    timestamp: datetime


@dataclass(frozen=True)
class OrderRejectedEvent:
    order_id: str
    reason: str
    rejected_by: str  # RISK_ENGINE, EXCHANGE, MARGIN_CHECK
    timestamp: datetime


# Audit trail completo: qualquer auditor pode reconstruir
# o estado exato do sistema em qualquer ponto no tempo
```

**Beneficios regulatorios:**

- **Reconstrucao temporal**: Reguladores podem pedir o estado exato do
  portfolio em qualquer momento passado
- **Imutabilidade**: Eventos nao podem ser alterados retroativamente
- **Rastreabilidade**: Cada trade pode ser tracado de volta a decisao da
  strategy, ao signal do mercado, ao risk check que aprovou
- **Reconciliacao**: Reducao de ~60% no esforco de reconciliacao com exchanges
- **Compliance**: Reducao de ~65% no tempo de preparacao para auditoria

### 9.4 Command vs Query no Contexto de Trading

```
+------------------------------------------------------------------+
|      COMMANDS (Write Side)         QUERIES (Read Side)            |
+------------------------------------------------------------------+
|                                                                    |
|  PlaceOrder                        GetPortfolio                    |
|  -> Valida risco                   -> Retorna positions,           |
|  -> Verifica margem                   cash, equity                 |
|  -> Envia ao exchange                                              |
|  -> Registra evento                GetOpenOrders                   |
|                                    -> Lista ordens ativas          |
|  CancelOrder                                                       |
|  -> Verifica se cancelavel         GetPnL                          |
|  -> Envia cancel ao exchange       -> Realized + Unrealized        |
|  -> Registra evento                -> Por periodo, por symbol      |
|                                                                    |
|  RecordFill                        GetTradeHistory                 |
|  -> Atualiza posicao              -> Historico com filtros          |
|  -> Calcula PnL realizado         -> Paginacao, export             |
|  -> Registra evento                                                |
|                                    GetRiskExposure                 |
|  AdjustRiskLimit                   -> Exposure por symbol          |
|  -> Valida novo limite            -> VaR, drawdown                 |
|  -> Aplica ao risk engine         -> Margem utilizada              |
|  -> Registra evento                                                |
|                                                                    |
|  LATENCIA: < 10ms                  LATENCIA: < 50ms               |
|  (critico para execucao)          (aceitavel para consulta)       |
|                                                                    |
+------------------------------------------------------------------+
```

---

## 10. Aplicacao ao BOT Assessor

### 10.1 Recomendacao Arquitetural

Para o BOT Assessor de trading, a recomendacao e adotar **CQRS
incrementalmente**, comecando pelo nivel mais simples e evoluindo
conforme necessidade comprovada:

```
+------------------------------------------------------------------+
|          EVOLUCAO CQRS NO BOT ASSESSOR                           |
+------------------------------------------------------------------+
|                                                                    |
|  FASE 1 (Atual/Imediato): CQRS Simplificado                      |
|  +----------------------------------------------------------+     |
|  | - Mesma database (PostgreSQL)                              |     |
|  | - Modelos separados no codigo (WriteModel vs ReadModel)    |     |
|  | - Materialized Views para queries complexas               |     |
|  | - Command/Query handlers separados                        |     |
|  | - Sem event sourcing                                      |     |
|  +----------------------------------------------------------+     |
|                                                                    |
|  FASE 2 (Quando escala justificar): Read Replica                  |
|  +----------------------------------------------------------+     |
|  | - PostgreSQL primary (writes)                              |     |
|  | - PostgreSQL read replica (queries)                       |     |
|  | - Redis cache para queries frequentes (portfolio, P&L)     |     |
|  | - Event log simples para auditoria (tabela de eventos)     |     |
|  +----------------------------------------------------------+     |
|                                                                    |
|  FASE 3 (Se necessario): CQRS + Event Sourcing                   |
|  +----------------------------------------------------------+     |
|  | - Event Store dedicado (EventStoreDB ou tabela de eventos) |     |
|  | - Projections asincronas                                   |     |
|  | - Read models em MongoDB/Redis                            |     |
|  | - Audit trail completo                                    |     |
|  | - Snapshot strategy para aggregates grandes               |     |
|  +----------------------------------------------------------+     |
|                                                                    |
+------------------------------------------------------------------+
```

### 10.2 Bounded Contexts do BOT com/sem CQRS

```
+------------------------------------------------------------------+
|          BOUNDED CONTEXTS - BOT ASSESSOR                         |
+------------------------------------------------------------------+
|                                                                    |
|  [Market Data]        -> Sem CQRS (read-only, streaming)          |
|  [Strategy Engine]    -> Sem CQRS (processamento interno)         |
|  [Order Execution]    -> CQRS (commands + audit trail)            |
|  [Portfolio Mgmt]     -> CQRS (read model otimizado)              |
|  [Risk Management]    -> CQRS (read model de risco + alertas)     |
|  [User Settings]      -> CRUD simples (sem CQRS)                  |
|  [Backtesting]        -> Read-only (consome dados historicos)      |
|                                                                    |
+------------------------------------------------------------------+
```

### 10.3 Implementacao Pratica - Command Side

```python
# bot_assessor/application/commands/place_order.py

@dataclass(frozen=True)
class PlaceOrderCommand:
    """Command emitido pela Strategy Engine quando quer abrir posicao."""
    order_id: str
    strategy_id: str
    symbol: str
    side: OrderSide
    quantity: Decimal
    price: Optional[Decimal]  # None para MARKET
    order_type: OrderType
    idempotency_key: str
    metadata: dict  # signal_id, reason, indicators


class PlaceOrderCommandHandler:
    """Handler para execucao de ordens do bot."""

    def __init__(
        self,
        order_repo: OrderRepository,
        risk_engine: RiskEngine,
        exchange_gateway: ExchangeGateway,
        event_publisher: EventPublisher,
        idempotency_store: IdempotencyStore,
    ):
        self._order_repo = order_repo
        self._risk = risk_engine
        self._exchange = exchange_gateway
        self._events = event_publisher
        self._idempotency = idempotency_store

    async def handle(self, cmd: PlaceOrderCommand) -> None:
        # 1. Idempotencia
        if await self._idempotency.is_processed(cmd.idempotency_key):
            return

        # 2. Risk check
        risk_result = await self._risk.evaluate(
            symbol=cmd.symbol,
            side=cmd.side,
            quantity=cmd.quantity,
            strategy_id=cmd.strategy_id,
        )
        if not risk_result.approved:
            await self._events.publish(OrderRejectedEvent(
                order_id=cmd.order_id,
                reason=risk_result.reason,
                rejected_by="RISK_ENGINE",
                timestamp=datetime.utcnow(),
            ))
            return

        # 3. Criar e persistir ordem
        order = Order.place(
            order_id=cmd.order_id,
            strategy_id=cmd.strategy_id,
            symbol=cmd.symbol,
            side=cmd.side,
            quantity=cmd.quantity,
            price=cmd.price,
            order_type=cmd.order_type,
        )
        await self._order_repo.save(order)

        # 4. Enviar ao exchange
        exchange_result = await self._exchange.submit(order)

        # 5. Publicar eventos
        await self._events.publish(OrderPlacedEvent(
            order_id=cmd.order_id,
            account_id=order.account_id,
            symbol=cmd.symbol,
            side=cmd.side,
            quantity=cmd.quantity,
            price=cmd.price,
            order_type=cmd.order_type,
            strategy_id=cmd.strategy_id,
            exchange_order_id=exchange_result.exchange_order_id,
            timestamp=datetime.utcnow(),
            metadata=cmd.metadata,
        ))

        # 6. Marcar idempotencia
        await self._idempotency.mark_processed(cmd.idempotency_key)
```

### 10.4 Implementacao Pratica - Query Side

```python
# bot_assessor/application/queries/get_portfolio.py

@dataclass(frozen=True)
class GetPortfolioQuery:
    account_id: str
    include_open_orders: bool = True
    include_pnl: bool = True


@dataclass
class PortfolioView:
    """Read model denormalizado do portfolio."""
    account_id: str
    total_equity: Decimal
    cash_balance: Decimal
    unrealized_pnl: Decimal
    realized_pnl_today: Decimal
    positions: list[PositionView]
    open_orders: list[OpenOrderView]
    risk_metrics: RiskMetricsView
    last_updated: datetime


class GetPortfolioQueryHandler:
    """Handler que le do read model otimizado."""

    def __init__(self, read_db: ReadDatabase, cache: Cache):
        self._read_db = read_db
        self._cache = cache

    async def handle(self, query: GetPortfolioQuery) -> PortfolioView:
        # 1. Tentar cache primeiro
        cache_key = f"portfolio:{query.account_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return PortfolioView.from_dict(cached)

        # 2. Buscar do read model (denormalizado, 1 query)
        portfolio = await self._read_db.get_portfolio_view(
            account_id=query.account_id,
        )

        if query.include_open_orders:
            portfolio.open_orders = await self._read_db.get_open_orders(
                account_id=query.account_id,
            )

        if query.include_pnl:
            portfolio.risk_metrics = await self._read_db.get_risk_metrics(
                account_id=query.account_id,
            )

        # 3. Cachear (TTL curto para trading: 1-5 segundos)
        await self._cache.set(
            cache_key,
            portfolio.to_dict(),
            ttl=timedelta(seconds=2),
        )

        return portfolio
```

### 10.5 Estrutura de Pastas Recomendada

```
bot_assessor/
+-- application/
|   +-- commands/
|   |   +-- __init__.py
|   |   +-- place_order.py          # Command + Handler
|   |   +-- cancel_order.py
|   |   +-- record_fill.py
|   |   +-- adjust_risk_limit.py
|   |   +-- close_position.py
|   +-- queries/
|   |   +-- __init__.py
|   |   +-- get_portfolio.py        # Query + Handler
|   |   +-- get_open_orders.py
|   |   +-- get_pnl.py
|   |   +-- get_trade_history.py
|   |   +-- get_risk_exposure.py
|   +-- events/
|   |   +-- __init__.py
|   |   +-- order_events.py         # Domain Events
|   |   +-- trade_events.py
|   |   +-- risk_events.py
|   +-- projections/
|   |   +-- __init__.py
|   |   +-- portfolio_projection.py # Event -> Read Model
|   |   +-- pnl_projection.py
|   |   +-- trade_blotter_projection.py
|   +-- behaviors/
|       +-- __init__.py
|       +-- validation.py           # Pipeline Behavior
|       +-- logging.py
|       +-- idempotency.py
|       +-- risk_check.py
+-- domain/
|   +-- aggregates/
|   |   +-- order.py
|   |   +-- portfolio.py
|   +-- value_objects/
|   +-- events/
|   +-- services/
+-- infrastructure/
    +-- persistence/
    |   +-- write_db.py
    |   +-- read_db.py
    |   +-- event_store.py
    +-- messaging/
    |   +-- event_bus.py
    |   +-- command_bus.py
    +-- exchange/
        +-- gateway.py
```

---

## 11. Referencias Bibliograficas

### 11.1 Livros Fundamentais

| # | Titulo | Autor(es) | Ano | Tipo |
|---|--------|-----------|-----|------|
| 1 | *Object-Oriented Software Construction* | Bertrand Meyer | 1988/1997 | Livro - Origem do CQS |
| 2 | *Domain-Driven Design: Tackling Complexity in the Heart of Software* | Eric Evans | 2003 | Livro - DDD foundational |
| 3 | *Implementing Domain-Driven Design* | Vaughn Vernon | 2013 | Livro - DDD + CQRS pratico |
| 4 | *CQRS Journey* | Microsoft Patterns & Practices | 2012 | Livro/Guide - CQRS ref. impl. |
| 5 | *Designing Data-Intensive Applications* | Martin Kleppmann | 2017 | Livro - Sistemas distribuidos |

### 11.2 Papers, Artigos e Documentos Seminais

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 6 | *CQRS Documents* | Greg Young | 2010 | Paper/PDF | https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf |
| 7 | *CQRS (bliki)* | Martin Fowler | 2011 | Blog/Artigo | https://www.martinfowler.com/bliki/CQRS.html |
| 8 | *CQRS Pattern* | Microsoft Azure Architecture Center | 2024 | Documentacao | https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs |
| 9 | *Event Sourcing Pattern* | Microsoft Azure Architecture Center | 2024 | Documentacao | https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing |
| 10 | *SE Radio 218: Udi Dahan on CQRS* | Udi Dahan / SE Radio | 2015 | Podcast/Talk | https://se-radio.net/2015/01/episode-218-udi-dahan-on-cqrs-command-query-responsibility-segregation/ |

### 11.3 Artigos e Guias Tecnicos

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 11 | *CQRS Facts and Myths Explained* | Oskar Dudycz (Event-Driven.io) | 2023 | Blog/Artigo | https://event-driven.io/en/cqrs_facts_and_myths_explained/ |
| 12 | *Busting Some CQRS Myths* | Jimmy Bogard (LosTechies) | 2012 | Blog/Artigo | https://lostechies.com/jimmybogard/2012/08/22/busting-some-cqrs-myths/ |
| 13 | *A Beginner's Guide to CQRS* | Kurrent (EventStore) | 2024 | Guia | https://www.kurrent.io/cqrs-pattern |
| 14 | *CQRS & Event Sourcing in Financial Services* | Icon Solutions | 2024 | Blog/Artigo | https://iconsolutions.com/blog/cqrs-event-sourcing |
| 15 | *Persistent vs Catch-up EventStoreDB Subscriptions* | Oskar Dudycz (Event-Driven.io) | 2023 | Blog/Artigo | https://event-driven.io/en/persistent_vs_catch_up_eventstoredb_subscriptions_in_action/ |
| 16 | *CQRS Antipatterns* | Trailmax Tech | 2017 | Blog/Artigo | https://tech.trailmax.info/2017/01/cqrs-antipatterns/ |
| 17 | *CQRS Without Multiple Data Sources* | Derek Comartin (CodeOpinion) | 2023 | Blog/Video | https://codeopinion.com/cqrs-without-multiple-data-sources/ |
| 18 | *Event Sourcing, CQRS: Real FinTech Example* | Lukas Niessen | 2024 | Blog/Artigo | https://dev.to/lukasniessen/event-sourcing-cqrs-and-micro-services-real-fintech-example-from-my-consulting-career-1j9b |
| 19 | *CQRS & Event Sourcing Architecture* | Touch-Fire Trading | 2024 | Landing Page | https://touch-fire.com/en/cqrs-event-sourcing.html |
| 20 | *A Pattern Every Modern Developer Should Know: CQRS* | ByteByteGo | 2024 | Newsletter | https://blog.bytebytego.com/p/a-pattern-every-modern-developer |

### 11.4 Frameworks e Bibliotecas

| # | Nome | Linguagem | URL |
|---|------|-----------|-----|
| 21 | Axon Framework | Java | https://www.axoniq.io/products/axon-framework |
| 22 | EventStoreDB | Multi-linguagem | https://www.eventstore.com/ |
| 23 | MediatR | .NET | https://github.com/jbogard/MediatR |
| 24 | Ecotone | PHP | https://github.com/ecotoneFramework/ecotone |
| 25 | eventsourcing (Python) | Python | https://github.com/pyeventsourcing/eventsourcing |
| 26 | Marten | .NET / PostgreSQL | https://martendb.io/ |

### 11.5 Repositorios e Codigo de Referencia

| # | Nome | URL |
|---|------|-----|
| 27 | CQRS Journey (Microsoft) | https://github.com/microsoftarchive/cqrs-journey |
| 28 | Awesome DDD (curated list) | https://github.com/heynickc/awesome-ddd |
| 29 | StockTradingAnalysis (CQRS+ES) | https://github.com/BenjaminBest/StockTradingAnalysisWebsite |
| 30 | Python-Eventsourcing-CQRS | https://github.com/aliseylaneh/Python-Eventsourcing-CQRS |

---

## Apendice A: Checklist de Adocao CQRS

```
ANTES de adotar CQRS, responda:

[ ] O dominio tem complexidade significativa no write side?
[ ] Reads e writes tem modelos significativamente diferentes?
[ ] Ha assimetria de carga entre reads e writes?
[ ] A equipe tem familiaridade com patterns DDD?
[ ] Ha necessidade de audit trail completo?
[ ] A eventual consistency e aceitavel para o dominio?
[ ] O custo de infraestrutura adicional e justificado?
[ ] Ha bounded contexts claros para aplicar CQRS seletivamente?

Se < 4 respostas SIM: Provavelmente nao precisa de CQRS.
Se >= 4 respostas SIM: CQRS pode ser benefico.
Se >= 6 respostas SIM: CQRS e fortemente recomendado.
```

## Apendice B: Glossario

| Termo | Definicao |
|-------|-----------|
| **Aggregate** | Cluster de objetos de dominio tratado como unidade para mudancas de estado |
| **Bounded Context** | Limite explicito dentro do qual um modelo de dominio se aplica |
| **Command** | Intencao de alterar estado do sistema |
| **Command Bus** | Infraestrutura que roteia commands para handlers |
| **Command Handler** | Componente que processa um command especifico |
| **CQS** | Command-Query Separation (nivel de metodo, Meyer 1988) |
| **CQRS** | Command Query Responsibility Segregation (nivel arquitetural, Young 2010) |
| **Domain Event** | Fato imutavel que ocorreu no dominio |
| **Event Sourcing** | Persistir estado como sequencia de eventos imutaveis |
| **Event Store** | Database otimizada para armazenar streams de eventos |
| **Eventual Consistency** | Garantia de que todas as replicas convergirao eventualmente |
| **Idempotency** | Propriedade de operacao que produz mesmo resultado se executada multiplas vezes |
| **Materialized View** | View pre-computada e persistida, otimizada para leitura |
| **Mediator** | Pattern que encapsula como objetos interagem |
| **Pipeline Behavior** | Middleware que intercepta requests antes/depois do handler |
| **Projection** | Processo de transformar eventos em read model |
| **Query** | Pedido de informacao que nao altera estado |
| **Read Model** | Modelo de dados otimizado para consultas |
| **Saga** | Sequencia de transacoes locais com acoes compensatorias |
| **Snapshot** | Checkpoint do estado de um aggregate em ponto especifico |
| **Upcasting** | Transformacao de eventos antigos para formato de schema novo |
| **Write Model** | Modelo de dados otimizado para operacoes de escrita |

---

> **Documento compilado em**: Fevereiro 2026
> **Baseado em**: 30+ fontes primarias e secundarias
> **Aplicacao**: BOT Assessor de Trading
> **Proximo documento recomendado**: `03-padrao-saga/saga.md`
