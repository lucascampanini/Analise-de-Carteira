# Estrutura de Camadas de Software

## Delivery, Application, Domain, Infrastructure

**Guia Definitivo de Referencia -- Nivel PhD**

---

## Sumario

1. [Visao Geral e Fundamentacao Teorica](#1-visao-geral-e-fundamentacao-teorica)
2. [As Quatro Camadas em Profundidade](#2-as-quatro-camadas-em-profundidade)
   - 2.1 [Camada Domain (Core)](#21-camada-domain-core)
   - 2.2 [Camada Application (Use Cases)](#22-camada-application-use-cases)
   - 2.3 [Camada Delivery (Presentation/Interface)](#23-camada-delivery-presentationinterface)
   - 2.4 [Camada Infrastructure (Adapters)](#24-camada-infrastructure-adapters)
3. [A Dependency Rule](#3-a-dependency-rule)
4. [Cross-Cutting Concerns](#4-cross-cutting-concerns)
5. [Estrutura de Pastas Pratica](#5-estrutura-de-pastas-pratica)
6. [Anti-Patterns](#6-anti-patterns)
7. [Aplicacao ao Trading Bot](#7-aplicacao-ao-trading-bot)
8. [Exemplos de Codigo Conceitual](#8-exemplos-de-codigo-conceitual)
9. [Referencias e Bibliografia](#9-referencias-e-bibliografia)

---

## 1. Visao Geral e Fundamentacao Teorica

### 1.1 Evolucao Historica das Arquiteturas em Camadas

A organizacao de software em camadas nao nasceu de uma unica ideia, mas da convergencia
de multiplas escolas de pensamento ao longo de tres decadas:

| Ano  | Arquitetura               | Autor(es)              | Contribuicao Principal                              |
|------|---------------------------|------------------------|-----------------------------------------------------|
| 1992 | Layered Architecture      | Buschmann et al.       | Separacao em camadas horizontais                     |
| 2002 | Patterns of EAA           | Martin Fowler          | Repository, Unit of Work, Service Layer, Data Mapper |
| 2003 | Domain-Driven Design      | Eric Evans             | Camadas User Interface, Application, Domain, Infra   |
| 2005 | Hexagonal (Ports/Adapters)| Alistair Cockburn      | Portas e adaptadores, simetria inside/outside        |
| 2008 | Onion Architecture        | Jeffrey Palermo        | Aneis concentricos, dominio no centro                |
| 2012 | Clean Architecture        | Robert C. Martin       | Dependency Rule, Entities/Use Cases/Adapters/Drivers |
| 2013 | Implementing DDD          | Vaughn Vernon          | Aplicacao pratica do DDD com hexagonal               |

### 1.2 A Tese Central

Todas essas arquiteturas convergem para o mesmo principio fundamental:

> **O nucleo do software (regras de negocio) deve ser independente de frameworks,
> bancos de dados, interfaces de usuario e qualquer detalhe de infraestrutura.**

Mark Seemann, em seu artigo seminal "Layers, Onions, Ports, Adapters: it's all the same",
argumenta que apesar dos nomes diferentes, todas compartilham a mesma essencia:
o isolamento do dominio e a inversao de dependencias.

### 1.3 Diagrama Conceitual Unificado

```
                    +-------------------------------------------+
                    |          FRAMEWORKS & DRIVERS              |
                    |  (Web, DB, UI, Devices, External APIs)     |
                    |                                           |
                    |    +-----------------------------------+  |
                    |    |      INTERFACE ADAPTERS            |  |
                    |    |  (Controllers, Gateways,          |  |
                    |    |   Presenters, Repositories Impl)  |  |
                    |    |                                   |  |
                    |    |    +---------------------------+  |  |
                    |    |    |    APPLICATION LAYER      |  |  |
                    |    |    |  (Use Cases, App Services,|  |  |
                    |    |    |   Command/Query Handlers) |  |  |
                    |    |    |                           |  |  |
                    |    |    |    +-------------------+  |  |  |
                    |    |    |    |   DOMAIN LAYER    |  |  |  |
                    |    |    |    | (Entities, Value  |  |  |  |
                    |    |    |    |  Objects, Domain  |  |  |  |
                    |    |    |    |  Services, Events)|  |  |  |
                    |    |    |    +-------------------+  |  |  |
                    |    |    |                           |  |  |
                    |    |    +---------------------------+  |  |
                    |    |                                   |  |
                    |    +-----------------------------------+  |
                    |                                           |
                    +-------------------------------------------+

                    Dependencias SEMPRE apontam para DENTRO -->
```

### 1.4 Mapeamento de Terminologias

| Clean Architecture   | DDD (Evans)        | Hexagonal        | Onion           | Este Documento   |
|----------------------|--------------------|------------------|-----------------|------------------|
| Entities             | Domain Layer       | Domain Model     | Domain Model    | **Domain**       |
| Use Cases            | Application Layer  | Application      | Application     | **Application**  |
| Interface Adapters   | User Interface     | Adapters (Driving)| Infrastructure | **Delivery**     |
| Frameworks & Drivers | Infrastructure     | Adapters (Driven) | Infrastructure | **Infrastructure**|

---

## 2. As Quatro Camadas em Profundidade

### 2.1 Camada Domain (Core)

A camada Domain e o coracao do sistema. Ela contem as regras de negocio puras,
completamente independentes de qualquer tecnologia. Eric Evans a define como
"a manifestacao do modelo de dominio e todos os elementos de design diretamente relacionados".

#### 2.1.1 Componentes do Domain

##### Entities (Entidades)

Objetos com identidade unica que persistem ao longo do tempo. Duas entidades
com os mesmos atributos mas IDs diferentes sao entidades distintas.

```python
class Order:
    """
    Entidade Order -- Aggregate Root.
    Possui identidade unica (order_id) e encapsula regras de negocio.
    """

    def __init__(self, order_id: OrderId, symbol: Symbol, side: OrderSide):
        self._order_id = order_id
        self._symbol = symbol
        self._side = side
        self._status = OrderStatus.PENDING
        self._fills: list[Fill] = []
        self._events: list[DomainEvent] = []

    @property
    def order_id(self) -> OrderId:
        return self._order_id

    def fill(self, quantity: Quantity, price: Price) -> None:
        """Regra de negocio: uma Order so pode ser preenchida se estiver ativa."""
        if self._status != OrderStatus.ACTIVE:
            raise DomainException("Cannot fill an inactive order")
        if quantity <= Quantity.zero():
            raise DomainException("Fill quantity must be positive")

        fill = Fill(quantity=quantity, price=price, timestamp=Timestamp.now())
        self._fills.append(fill)
        self._events.append(OrderFilled(self._order_id, fill))

        if self._is_fully_filled():
            self._status = OrderStatus.FILLED
            self._events.append(OrderCompleted(self._order_id))

    def cancel(self) -> None:
        """Invariante: so pode cancelar orders que nao estao finalizadas."""
        if self._status in (OrderStatus.FILLED, OrderStatus.CANCELLED):
            raise DomainException(f"Cannot cancel order in status {self._status}")
        self._status = OrderStatus.CANCELLED
        self._events.append(OrderCancelled(self._order_id))

    def collect_events(self) -> list[DomainEvent]:
        events = self._events.copy()
        self._events.clear()
        return events
```

##### Value Objects (Objetos de Valor)

Objetos sem identidade propria, definidos apenas por seus atributos. Dois Value Objects
com os mesmos valores sao considerados identicos. Devem ser imutaveis.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    """
    Value Object imutavel representando um valor monetario.
    Dois Money com mesmo amount e currency sao iguais.
    """
    amount: Decimal
    currency: str

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if len(self.currency) != 3:
            raise ValueError("Currency must be ISO 4217 (3 letters)")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise DomainException("Cannot add different currencies")
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def multiply(self, factor: Decimal) -> "Money":
        return Money(amount=self.amount * factor, currency=self.currency)


@dataclass(frozen=True)
class Symbol:
    """Value Object para simbolo de ativo (ex: PETR4, VALE3)."""
    value: str

    def __post_init__(self):
        if not self.value or len(self.value) < 4:
            raise ValueError(f"Invalid symbol: {self.value}")


@dataclass(frozen=True)
class Price:
    """Value Object para preco de mercado."""
    value: Decimal
    currency: str = "BRL"

    def __post_init__(self):
        if self.value <= 0:
            raise ValueError("Price must be positive")
```

##### Aggregates (Agregados)

Um Aggregate e um cluster de Entities e Value Objects tratados como uma unica
unidade para fins de mudanca de dados. Todo Aggregate tem um Aggregate Root --
a entidade principal que controla o acesso a todo o cluster.

**Regras fundamentais de Aggregates (Vernon, 2013):**

1. Proteger invariantes de negocio dentro dos limites do Aggregate
2. Projetar Aggregates pequenos
3. Referenciar outros Aggregates apenas por identidade (ID)
4. Usar consistencia eventual entre Aggregates

```python
class Portfolio:
    """
    Aggregate Root: Portfolio contem Positions (entidades filhas).
    Toda operacao sobre Position DEVE passar pelo Portfolio.
    """

    def __init__(self, portfolio_id: PortfolioId, owner: TraderId):
        self._portfolio_id = portfolio_id
        self._owner = owner
        self._positions: dict[Symbol, Position] = {}
        self._risk_limit = Money(Decimal("100000"), "BRL")
        self._events: list[DomainEvent] = []

    def open_position(self, symbol: Symbol, quantity: Quantity, price: Price) -> None:
        """
        Invariante: exposicao total nao pode exceder o limite de risco.
        O Portfolio (Aggregate Root) garante essa invariante.
        """
        new_exposure = price.value * quantity.value
        current_exposure = self._calculate_total_exposure()

        if current_exposure + new_exposure > self._risk_limit.amount:
            raise DomainException("Risk limit exceeded")

        if symbol in self._positions:
            self._positions[symbol].increase(quantity, price)
        else:
            self._positions[symbol] = Position(symbol, quantity, price)

        self._events.append(PositionOpened(self._portfolio_id, symbol, quantity))

    def close_position(self, symbol: Symbol, quantity: Quantity, price: Price) -> None:
        if symbol not in self._positions:
            raise DomainException(f"No position for {symbol}")
        position = self._positions[symbol]
        position.decrease(quantity, price)
        if position.is_closed():
            del self._positions[symbol]
        self._events.append(PositionClosed(self._portfolio_id, symbol, quantity))
```

##### Domain Services

Quando uma operacao de negocio nao pertence naturalmente a nenhuma Entidade
ou Value Object, ela vive em um Domain Service. Domain Services sao stateless
e operam exclusivamente sobre objetos do dominio.

**Quando usar Domain Service (Evans, 2003):**

- A operacao envolve multiplas Entities/Aggregates
- Colocar a logica em uma entidade quebraria o encapsulamento
- A operacao e um conceito de dominio significativo por si so

```python
class RiskCalculationService:
    """
    Domain Service: calculo de risco envolve Portfolio + Market Data.
    Nao pertence a nenhuma entidade especifica.
    """

    def calculate_var(
        self,
        portfolio: Portfolio,
        market_data: MarketData,
        confidence_level: Decimal = Decimal("0.95"),
    ) -> Money:
        """Calcula Value at Risk do portfolio."""
        positions = portfolio.get_positions()
        returns = []
        for position in positions:
            historical_prices = market_data.get_prices(position.symbol)
            position_returns = self._calculate_returns(historical_prices)
            weighted_returns = [r * position.weight for r in position_returns]
            returns.extend(weighted_returns)
        var_value = self._percentile(returns, 1 - confidence_level)
        return Money(abs(var_value) * portfolio.total_value.amount, "BRL")
```

##### Domain Events

Eventos que representam algo significativo que aconteceu no dominio.
Sao fatos imutaveis no passado.

```python
from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

@dataclass(frozen=True)
class DomainEvent:
    event_id: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=datetime.utcnow)

@dataclass(frozen=True)
class OrderFilled(DomainEvent):
    order_id: str = ""
    symbol: str = ""
    quantity: Decimal = Decimal("0")
    price: Decimal = Decimal("0")
    side: str = ""

@dataclass(frozen=True)
class RiskLimitBreached(DomainEvent):
    portfolio_id: str = ""
    current_exposure: Decimal = Decimal("0")
    limit: Decimal = Decimal("0")
```

##### Specifications (Especificacoes)

Encapsulam regras de negocio como objetos combinaveis (pattern do Evans).

```python
from abc import ABC, abstractmethod

class Specification(ABC):
    @abstractmethod
    def is_satisfied_by(self, candidate) -> bool: ...

    def and_(self, other: "Specification") -> "Specification":
        return AndSpecification(self, other)

    def or_(self, other: "Specification") -> "Specification":
        return OrSpecification(self, other)

    def not_(self) -> "Specification":
        return NotSpecification(self)

class OrderIsEligibleForExecution(Specification):
    """Especificacao: uma order so pode ser executada se cumprir criterios."""
    def is_satisfied_by(self, order: Order) -> bool:
        return (
            order.status == OrderStatus.ACTIVE
            and order.quantity > Quantity.zero()
            and not order.is_expired()
        )

class PositionWithinRiskLimits(Specification):
    def __init__(self, max_exposure: Money):
        self._max_exposure = max_exposure

    def is_satisfied_by(self, position: Position) -> bool:
        return position.exposure <= self._max_exposure
```

##### Repository Interfaces (Ports)

O dominio define **interfaces** (portas) para persistencia. Ele NAO conhece
a implementacao concreta (banco de dados, arquivo, API).

```python
from abc import ABC, abstractmethod

class OrderRepository(ABC):
    """
    PORT: Interface definida no Domain.
    A implementacao concreta fica na Infrastructure.
    """

    @abstractmethod
    async def save(self, order: Order) -> None: ...

    @abstractmethod
    async def find_by_id(self, order_id: OrderId) -> Order | None: ...

    @abstractmethod
    async def find_active_by_symbol(self, symbol: Symbol) -> list[Order]: ...

    @abstractmethod
    async def find_all_by_portfolio(self, portfolio_id: PortfolioId) -> list[Order]: ...


class PortfolioRepository(ABC):
    @abstractmethod
    async def save(self, portfolio: Portfolio) -> None: ...

    @abstractmethod
    async def find_by_id(self, portfolio_id: PortfolioId) -> Portfolio | None: ...


class MarketDataPort(ABC):
    """Port para obter dados de mercado -- implementado pela Infrastructure."""

    @abstractmethod
    async def get_current_price(self, symbol: Symbol) -> Price: ...

    @abstractmethod
    async def get_historical_prices(
        self, symbol: Symbol, period: TimePeriod
    ) -> list[PriceCandle]: ...
```

#### 2.1.2 Regras de Ouro do Domain

| Regra | Descricao |
|-------|-----------|
| **Zero dependencias externas** | Nenhum import de framework, ORM, HTTP, banco de dados |
| **Logica de negocio pura** | Todas as regras de negocio vivem aqui |
| **Imutabilidade onde possivel** | Value Objects SEMPRE imutaveis |
| **Invariantes protegidas** | Aggregate Root garante consistencia |
| **Linguagem Ubiqua** | Nomes de classes/metodos refletem o vocabulario do negocio |
| **Testavel isoladamente** | Testes unitarios sem mock de infraestrutura |

---

### 2.2 Camada Application (Use Cases)

A camada Application orquestra o fluxo de dados entre a camada Delivery e o Domain.
Ela contem os **casos de uso** do sistema. Robert C. Martin a define como a camada
que "contem as regras de negocio especificas da aplicacao" -- em contraste com as
regras "enterprise-wide" do Domain.

#### 2.2.1 Responsabilidades da Application Layer

1. **Orquestracao** -- coordenar chamadas a repositorios, domain services e eventos
2. **Transaction Management** -- definir limites transacionais
3. **Autorizacao** -- verificar se o usuario pode executar a acao
4. **Mapeamento** -- converter DTOs de/para objetos de dominio
5. **Publicacao de eventos** -- despachar domain events para listeners

#### 2.2.2 O que NAO deve estar na Application Layer

- Regras de negocio (pertencem ao Domain)
- Detalhes de infraestrutura (pertencem a Infrastructure)
- Formatacao de resposta HTTP (pertence a Delivery)
- Acesso direto a banco de dados (pertence a Infrastructure)

#### 2.2.3 Padrao Command/Query (CQRS)

A camada Application frequentemente usa CQRS (Command Query Responsibility Segregation),
separando operacoes de escrita (Commands) de leitura (Queries).

```python
# ============================================================
# COMMANDS -- Operacoes de escrita (mudam estado)
# ============================================================

@dataclass(frozen=True)
class ExecuteTradeCommand:
    """Command: solicita execucao de um trade."""
    portfolio_id: str
    symbol: str
    side: str          # "BUY" ou "SELL"
    quantity: Decimal
    order_type: str    # "MARKET", "LIMIT"
    limit_price: Decimal | None = None
    requested_by: str = ""


@dataclass(frozen=True)
class CancelOrderCommand:
    order_id: str
    reason: str
    requested_by: str


# ============================================================
# QUERIES -- Operacoes de leitura (nao mudam estado)
# ============================================================

@dataclass(frozen=True)
class GetPortfolioSummaryQuery:
    portfolio_id: str
    include_closed_positions: bool = False


@dataclass(frozen=True)
class GetOrderHistoryQuery:
    portfolio_id: str
    symbol: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    page: int = 1
    page_size: int = 50
```

#### 2.2.4 Command Handlers (Use Cases de Escrita)

```python
class ExecuteTradeHandler:
    """
    Use Case: Executar um Trade.

    Responsabilidades:
    - Validar pre-condicoes de aplicacao (autorizacao, existencia)
    - Orquestrar Domain Objects
    - Gerenciar transacao
    - Despachar eventos
    """

    def __init__(
        self,
        portfolio_repo: PortfolioRepository,    # Interface do Domain
        order_repo: OrderRepository,            # Interface do Domain
        market_data: MarketDataPort,            # Interface do Domain
        risk_service: RiskCalculationService,   # Domain Service
        unit_of_work: UnitOfWork,               # Interface de Application
        event_publisher: EventPublisher,        # Interface de Application
    ):
        self._portfolio_repo = portfolio_repo
        self._order_repo = order_repo
        self._market_data = market_data
        self._risk_service = risk_service
        self._uow = unit_of_work
        self._event_publisher = event_publisher

    async def handle(self, command: ExecuteTradeCommand) -> ExecuteTradeResult:
        # 1. Carregar Aggregates
        portfolio = await self._portfolio_repo.find_by_id(
            PortfolioId(command.portfolio_id)
        )
        if portfolio is None:
            raise NotFoundException(f"Portfolio {command.portfolio_id} not found")

        # 2. Obter dados necessarios
        symbol = Symbol(command.symbol)
        current_price = await self._market_data.get_current_price(symbol)

        # 3. Verificar risco (Domain Service)
        market_data = await self._market_data.get_historical_prices(
            symbol, TimePeriod.last_30_days()
        )
        risk = self._risk_service.calculate_var(portfolio, market_data)

        # 4. Delegar logica de negocio ao Domain (Aggregate Root)
        order = Order.create(
            symbol=symbol,
            side=OrderSide(command.side),
            quantity=Quantity(command.quantity),
            order_type=OrderType(command.order_type),
            limit_price=Price(command.limit_price) if command.limit_price else None,
        )

        portfolio.open_position(symbol, Quantity(command.quantity), current_price)

        # 5. Persistir dentro de transacao
        async with self._uow:
            await self._order_repo.save(order)
            await self._portfolio_repo.save(portfolio)
            await self._uow.commit()

        # 6. Publicar Domain Events
        events = order.collect_events() + portfolio.collect_events()
        for event in events:
            await self._event_publisher.publish(event)

        # 7. Retornar DTO de resultado
        return ExecuteTradeResult(
            order_id=str(order.order_id),
            status=order.status.value,
            estimated_cost=str(current_price.value * command.quantity),
        )
```

#### 2.2.5 Query Handlers (Use Cases de Leitura)

```python
class GetPortfolioSummaryHandler:
    """
    Use Case de Leitura: pode usar modelo otimizado (read model)
    ou ir direto ao repositorio.
    """

    def __init__(
        self,
        portfolio_repo: PortfolioRepository,
        market_data: MarketDataPort,
    ):
        self._portfolio_repo = portfolio_repo
        self._market_data = market_data

    async def handle(self, query: GetPortfolioSummaryQuery) -> PortfolioSummaryDTO:
        portfolio = await self._portfolio_repo.find_by_id(
            PortfolioId(query.portfolio_id)
        )
        if portfolio is None:
            raise NotFoundException(f"Portfolio {query.portfolio_id} not found")

        positions_dto = []
        for position in portfolio.get_positions():
            current_price = await self._market_data.get_current_price(position.symbol)
            positions_dto.append(PositionDTO(
                symbol=str(position.symbol),
                quantity=str(position.quantity),
                avg_price=str(position.average_price),
                current_price=str(current_price.value),
                pnl=str(position.calculate_pnl(current_price)),
            ))

        return PortfolioSummaryDTO(
            portfolio_id=str(portfolio.portfolio_id),
            total_value=str(portfolio.total_value),
            positions=positions_dto,
            risk_utilization=str(portfolio.risk_utilization_pct),
        )
```

#### 2.2.6 Application DTOs e Mappers

```python
# DTOs da Application Layer (internos, diferentes dos DTOs da Delivery)

@dataclass(frozen=True)
class ExecuteTradeResult:
    order_id: str
    status: str
    estimated_cost: str

@dataclass(frozen=True)
class PortfolioSummaryDTO:
    portfolio_id: str
    total_value: str
    positions: list["PositionDTO"]
    risk_utilization: str

@dataclass(frozen=True)
class PositionDTO:
    symbol: str
    quantity: str
    avg_price: str
    current_price: str
    pnl: str


# Mapper: converte entre Domain Objects e DTOs
class OrderMapper:
    @staticmethod
    def to_dto(order: Order) -> OrderDTO:
        return OrderDTO(
            order_id=str(order.order_id),
            symbol=str(order.symbol),
            side=order.side.value,
            status=order.status.value,
            quantity=str(order.quantity),
            filled_quantity=str(order.filled_quantity),
        )

    @staticmethod
    def to_domain(dto: CreateOrderDTO) -> Order:
        return Order.create(
            symbol=Symbol(dto.symbol),
            side=OrderSide(dto.side),
            quantity=Quantity(Decimal(dto.quantity)),
            order_type=OrderType(dto.order_type),
        )
```

#### 2.2.7 Application Events vs Domain Events

| Aspecto | Domain Events | Application Events |
|---------|--------------|-------------------|
| **Onde nasce** | Dentro do Aggregate | No Application Service |
| **Quem consome** | Outros Aggregates, Projections | Servicos externos, notificacoes |
| **Exemplo** | `OrderFilled`, `RiskLimitBreached` | `TradeExecutionCompleted`, `UserNotified` |
| **Transacional** | Sim (mesmo bounded context) | Pode ser assincrono |

---

### 2.3 Camada Delivery (Presentation/Interface)

A camada Delivery e o ponto de entrada do mundo externo para o sistema.
Ela recebe requisicoes, valida inputs, invoca a Application Layer e formata respostas.

Na Clean Architecture de Uncle Bob, esta camada corresponde aos "Interface Adapters"
(lado driving/primary). Na Hexagonal, sao os "Driving Adapters".

#### 2.3.1 Componentes da Delivery Layer

| Componente | Responsabilidade | Exemplo |
|-----------|------------------|---------|
| **Controllers/Handlers** | Receber requisicao, invocar use case | REST controller, gRPC service |
| **Request DTOs** | Estrutura dos dados de entrada | `CreateOrderRequest` |
| **Response DTOs** | Estrutura dos dados de saida | `OrderResponse` |
| **Validators** | Validacao sintatica de input | Formato de email, campos obrigatorios |
| **Serializers** | Conversao JSON/Protobuf/XML | Pydantic models, marshmallow |
| **Middleware** | Concerns transversais da camada | Auth, CORS, rate limiting |
| **Error Handlers** | Conversao de excecoes para HTTP | DomainException -> 422 |
| **WebSocket Handlers** | Comunicacao bidirecional real-time | Market data stream |
| **CLI Handlers** | Interface de linha de comando | Backtest runner |

#### 2.3.2 Principio: Delivery Layer e "burra"

A Delivery Layer NAO contem logica de negocio. Ela e uma tradutora:

```
Requisicao Externa  -->  [Delivery]  -->  Command/Query  -->  [Application]
                                                                    |
Resposta Externa    <--  [Delivery]  <--  Result DTO    <--  [Application]
```

#### 2.3.3 REST API Handlers

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator

router = APIRouter(prefix="/api/v1/trades", tags=["trades"])

# ---------- Request/Response DTOs (Delivery Layer) ----------

class CreateTradeRequest(BaseModel):
    """DTO de entrada -- validacao sintatica aqui."""
    symbol: str = Field(..., min_length=4, max_length=10, examples=["PETR4"])
    side: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: str = Field(..., examples=["100"])
    order_type: str = Field(..., pattern="^(MARKET|LIMIT)$")
    limit_price: str | None = Field(None, examples=["28.50"])

    @validator("quantity")
    def quantity_must_be_positive(cls, v):
        if Decimal(v) <= 0:
            raise ValueError("quantity must be positive")
        return v

class TradeResponse(BaseModel):
    """DTO de saida -- formatacao para o cliente."""
    order_id: str
    status: str
    estimated_cost: str
    message: str

class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: dict | None = None

# ---------- Controller / Handler ----------

@router.post(
    "/",
    response_model=TradeResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "Business rule violation"},
    },
)
async def create_trade(
    request: CreateTradeRequest,
    handler: ExecuteTradeHandler = Depends(get_execute_trade_handler),
    current_user: User = Depends(get_current_user),
):
    """
    Controller: traduz HTTP -> Command -> Result -> HTTP.
    NAO contem logica de negocio.
    """
    try:
        # 1. Converter Request DTO -> Command
        command = ExecuteTradeCommand(
            portfolio_id=current_user.portfolio_id,
            symbol=request.symbol,
            side=request.side,
            quantity=Decimal(request.quantity),
            order_type=request.order_type,
            limit_price=Decimal(request.limit_price) if request.limit_price else None,
            requested_by=current_user.user_id,
        )

        # 2. Delegar para Application Layer
        result = await handler.handle(command)

        # 3. Converter Result DTO -> Response DTO
        return TradeResponse(
            order_id=result.order_id,
            status=result.status,
            estimated_cost=result.estimated_cost,
            message="Trade submitted successfully",
        )

    except DomainException as e:
        raise HTTPException(status_code=409, detail={
            "error_code": "BUSINESS_RULE_VIOLATION",
            "message": str(e),
        })
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "error_code": "NOT_FOUND",
            "message": str(e),
        })
```

#### 2.3.4 WebSocket Handlers (Real-Time)

```python
from fastapi import WebSocket, WebSocketDisconnect

class MarketDataWebSocketHandler:
    """
    Delivery Layer: WebSocket para streaming de dados de mercado.
    Apenas traduz e retransmite -- sem logica de negocio.
    """

    def __init__(self, market_stream_service: MarketStreamService):
        self._market_stream = market_stream_service
        self._active_connections: dict[str, WebSocket] = {}

    async def handle_connection(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self._active_connections[client_id] = websocket

        try:
            while True:
                # Receber subscricoes do cliente
                data = await websocket.receive_json()
                action = data.get("action")

                if action == "subscribe":
                    symbols = data.get("symbols", [])
                    await self._market_stream.subscribe(
                        client_id, symbols, callback=self._send_update
                    )
                elif action == "unsubscribe":
                    symbols = data.get("symbols", [])
                    await self._market_stream.unsubscribe(client_id, symbols)

        except WebSocketDisconnect:
            del self._active_connections[client_id]
            await self._market_stream.unsubscribe_all(client_id)

    async def _send_update(self, client_id: str, market_update: MarketUpdateDTO):
        ws = self._active_connections.get(client_id)
        if ws:
            await ws.send_json({
                "type": "market_update",
                "symbol": market_update.symbol,
                "price": market_update.price,
                "volume": market_update.volume,
                "timestamp": market_update.timestamp,
            })
```

#### 2.3.5 CLI Handlers

```python
import click

@click.group()
def cli():
    """Trading Bot CLI."""
    pass

@cli.command()
@click.option("--strategy", required=True, help="Strategy name")
@click.option("--start-date", required=True, help="Backtest start date (YYYY-MM-DD)")
@click.option("--end-date", required=True, help="Backtest end date (YYYY-MM-DD)")
@click.option("--initial-capital", default="100000", help="Initial capital")
def backtest(strategy: str, start_date: str, end_date: str, initial_capital: str):
    """
    CLI Handler: executa backtest.
    Traduz argumentos CLI -> Command -> Resultado formatado no terminal.
    """
    command = RunBacktestCommand(
        strategy_name=strategy,
        start_date=datetime.strptime(start_date, "%Y-%m-%d"),
        end_date=datetime.strptime(end_date, "%Y-%m-%d"),
        initial_capital=Decimal(initial_capital),
    )

    handler = container.get(RunBacktestHandler)
    result = asyncio.run(handler.handle(command))

    # Formatar saida para terminal
    click.echo(f"Backtest: {strategy}")
    click.echo(f"Period: {start_date} to {end_date}")
    click.echo(f"Return: {result.total_return_pct}%")
    click.echo(f"Sharpe: {result.sharpe_ratio}")
    click.echo(f"Max Drawdown: {result.max_drawdown_pct}%")
    click.echo(f"Win Rate: {result.win_rate_pct}%")
```

#### 2.3.6 Middleware

```python
class RateLimitMiddleware:
    """Middleware de Delivery: rate limiting antes de atingir Application."""

    def __init__(self, app, rate_limiter: RateLimiter):
        self.app = app
        self.rate_limiter = rate_limiter

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            client_ip = scope.get("client", ("unknown",))[0]
            if not await self.rate_limiter.is_allowed(client_ip):
                response = JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded"},
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


class RequestLoggingMiddleware:
    """Middleware: loga request/response sem interferir na logica."""

    async def __call__(self, scope, receive, send):
        start = time.monotonic()
        # ... log request
        await self.app(scope, receive, send)
        duration = time.monotonic() - start
        # ... log response com duration
```

---

### 2.4 Camada Infrastructure (Adapters)

A camada Infrastructure fornece implementacoes concretas para as interfaces
(ports) definidas no Domain. Ela contem todos os detalhes tecnicos: banco de dados,
APIs externas, cache, mensageria, file storage.

Na Hexagonal Architecture, estes sao os "Driven Adapters" (secundarios).

#### 2.4.1 Componentes da Infrastructure Layer

| Componente | Responsabilidade | Tecnologia Exemplo |
|-----------|------------------|--------------------|
| **Repository Implementations** | Persistencia de Aggregates | SQLAlchemy, raw SQL |
| **ORM Mappings** | Mapeamento objeto-relacional | SQLAlchemy models |
| **External API Clients** | Integracao com servicos externos | B3 API, Alpha Vantage |
| **Message Broker Adapters** | Pub/Sub, filas de mensagens | RabbitMQ, Redis Streams |
| **Cache Implementations** | Cache de dados frequentes | Redis, Memcached |
| **File Storage** | Persistencia de arquivos | S3, local filesystem |
| **Email/Notification** | Envio de alertas | SMTP, Twilio |
| **Logging Infrastructure** | Implementacao de logging | Structured logging, ELK |

#### 2.4.2 Repository Implementations

```python
from sqlalchemy.ext.asyncio import AsyncSession

class SqlAlchemyOrderRepository(OrderRepository):
    """
    ADAPTER: Implementa a interface OrderRepository (definida no Domain).
    Usa SQLAlchemy para persistencia. O Domain nao sabe que SQLAlchemy existe.
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, order: Order) -> None:
        """Converte Domain Entity -> ORM Model -> SQL."""
        model = self._to_model(order)
        self._session.add(model)
        await self._session.flush()

    async def find_by_id(self, order_id: OrderId) -> Order | None:
        """Converte SQL -> ORM Model -> Domain Entity."""
        stmt = select(OrderModel).where(OrderModel.id == str(order_id))
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def find_active_by_symbol(self, symbol: Symbol) -> list[Order]:
        stmt = (
            select(OrderModel)
            .where(OrderModel.symbol == str(symbol))
            .where(OrderModel.status == "ACTIVE")
            .order_by(OrderModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def find_all_by_portfolio(self, portfolio_id: PortfolioId) -> list[Order]:
        stmt = (
            select(OrderModel)
            .where(OrderModel.portfolio_id == str(portfolio_id))
            .order_by(OrderModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    # ---------- Mapeamento ORM <-> Domain ----------

    def _to_model(self, order: Order) -> "OrderModel":
        return OrderModel(
            id=str(order.order_id),
            symbol=str(order.symbol),
            side=order.side.value,
            status=order.status.value,
            quantity=order.quantity.value,
            filled_quantity=order.filled_quantity.value,
            order_type=order.order_type.value,
            created_at=order.created_at,
        )

    def _to_entity(self, model: "OrderModel") -> Order:
        return Order.reconstitute(
            order_id=OrderId(model.id),
            symbol=Symbol(model.symbol),
            side=OrderSide(model.side),
            status=OrderStatus(model.status),
            quantity=Quantity(model.quantity),
            filled_quantity=Quantity(model.filled_quantity),
            order_type=OrderType(model.order_type),
            created_at=model.created_at,
        )
```

#### 2.4.3 ORM Models (Infrastructure Only)

```python
from sqlalchemy import Column, String, Numeric, DateTime, Enum
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class OrderModel(Base):
    """
    ORM Model: pertence EXCLUSIVAMENTE a Infrastructure.
    O Domain NUNCA importa este modelo.
    """
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True)
    portfolio_id = Column(String(36), nullable=False, index=True)
    symbol = Column(String(10), nullable=False, index=True)
    side = Column(String(4), nullable=False)
    status = Column(String(20), nullable=False, index=True)
    quantity = Column(Numeric(18, 8), nullable=False)
    filled_quantity = Column(Numeric(18, 8), nullable=False, default=0)
    order_type = Column(String(10), nullable=False)
    limit_price = Column(Numeric(18, 8), nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)


class PositionModel(Base):
    __tablename__ = "positions"

    id = Column(String(36), primary_key=True)
    portfolio_id = Column(String(36), nullable=False, index=True)
    symbol = Column(String(10), nullable=False, index=True)
    quantity = Column(Numeric(18, 8), nullable=False)
    average_price = Column(Numeric(18, 8), nullable=False)
    opened_at = Column(DateTime, nullable=False)
```

#### 2.4.4 External API Clients

```python
import httpx

class B3MarketDataAdapter(MarketDataPort):
    """
    ADAPTER: Implementa o Port MarketDataPort conectando com API da B3.
    Todo detalhe de HTTP, autenticacao, retry, parsing fica aqui.
    """

    def __init__(self, base_url: str, api_key: str, timeout: float = 30.0):
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )

    async def get_current_price(self, symbol: Symbol) -> Price:
        try:
            response = await self._client.get(f"/quotes/{symbol.value}")
            response.raise_for_status()
            data = response.json()
            return Price(
                value=Decimal(str(data["lastPrice"])),
                currency="BRL",
            )
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise NotFoundException(f"Symbol {symbol} not found on B3")
            raise InfrastructureException(f"B3 API error: {e}")
        except httpx.RequestError as e:
            raise InfrastructureException(f"B3 connection error: {e}")

    async def get_historical_prices(
        self, symbol: Symbol, period: TimePeriod
    ) -> list[PriceCandle]:
        response = await self._client.get(
            f"/historical/{symbol.value}",
            params={
                "start": period.start.isoformat(),
                "end": period.end.isoformat(),
            },
        )
        response.raise_for_status()
        data = response.json()
        return [
            PriceCandle(
                open=Decimal(str(c["open"])),
                high=Decimal(str(c["high"])),
                low=Decimal(str(c["low"])),
                close=Decimal(str(c["close"])),
                volume=int(c["volume"]),
                timestamp=datetime.fromisoformat(c["date"]),
            )
            for c in data["candles"]
        ]
```

#### 2.4.5 Cache Implementation

```python
import redis.asyncio as redis
import json

class RedisCacheAdapter(CachePort):
    """
    ADAPTER: Implementa interface CachePort usando Redis.
    """

    def __init__(self, redis_url: str):
        self._redis = redis.from_url(redis_url)

    async def get(self, key: str) -> str | None:
        value = await self._redis.get(key)
        return value.decode() if value else None

    async def set(self, key: str, value: str, ttl_seconds: int = 300) -> None:
        await self._redis.setex(key, ttl_seconds, value)

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)

    async def get_json(self, key: str) -> dict | None:
        value = await self.get(key)
        return json.loads(value) if value else None

    async def set_json(self, key: str, value: dict, ttl_seconds: int = 300) -> None:
        await self.set(key, json.dumps(value), ttl_seconds)
```

#### 2.4.6 Message Broker Adapter

```python
class RedisEventPublisher(EventPublisher):
    """
    ADAPTER: Publica Domain Events via Redis Streams.
    """

    def __init__(self, redis_url: str, stream_name: str = "domain_events"):
        self._redis = redis.from_url(redis_url)
        self._stream = stream_name

    async def publish(self, event: DomainEvent) -> None:
        event_data = {
            "event_type": type(event).__name__,
            "event_id": event.event_id,
            "occurred_at": event.occurred_at.isoformat(),
            "payload": json.dumps(asdict(event), default=str),
        }
        await self._redis.xadd(self._stream, event_data)
```

---

## 3. A Dependency Rule

### 3.1 O Principio Fundamental

A Dependency Rule e a regra que governa toda a arquitetura. Robert C. Martin
a define de forma inequivoca:

> **"Source code dependencies can only point inwards.
> Nothing in an inner circle can know anything at all about
> something in an outer circle."**
> -- Robert C. Martin, Clean Architecture (2017)

### 3.2 Diagrama de Dependencias

```
    DELIVERY ---------> APPLICATION ---------> DOMAIN
       |                     |                    ^
       |                     |                    |
       v                     v                    |
  INFRASTRUCTURE -----> INFRASTRUCTURE ----> DOMAIN (interfaces)

  ============================================================
  Direcao PERMITIDA:     Fora -> Dentro (em direcao ao Domain)
  Direcao PROIBIDA:      Dentro -> Fora (Domain -> Infrastructure)
  ============================================================
```

### 3.3 Fluxo de Dependencias Detalhado

```
+------------------------------------------------------------------+
|                                                                  |
|  DELIVERY (FastAPI, CLI, WebSocket)                              |
|    |                                                             |
|    |-- depende de --> APPLICATION (Use Cases, Commands, Queries) |
|    |-- depende de --> DOMAIN (DTOs, Exceptions)                  |
|    |                                                             |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
|                                                                  |
|  APPLICATION (Handlers, Services, Mappers)                       |
|    |                                                             |
|    |-- depende de --> DOMAIN (Entities, Value Objects, Ports)     |
|    |-- NAO depende de --> INFRASTRUCTURE                         |
|    |-- NAO depende de --> DELIVERY                               |
|    |                                                             |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
|                                                                  |
|  DOMAIN (Entities, Value Objects, Services, Events, Ports)       |
|    |                                                             |
|    |-- NAO depende de NADA externo                               |
|    |-- Define interfaces (Ports) que Infrastructure implementa   |
|    |                                                             |
+------------------------------------------------------------------+
          ^
          | implementa interfaces
          |
+------------------------------------------------------------------+
|                                                                  |
|  INFRASTRUCTURE (Repos SQL, Redis, B3 API, Email)                |
|    |                                                             |
|    |-- depende de --> DOMAIN (para implementar Ports)             |
|    |-- NAO depende de --> APPLICATION                            |
|    |-- NAO depende de --> DELIVERY                               |
|    |                                                             |
+------------------------------------------------------------------+
```

### 3.4 Como a Dependency Rule Funciona na Pratica

A inversao de dependencias e o mecanismo que viabiliza a Dependency Rule:

```python
# ============================================================
# DOMAIN define a interface (Port)
# ============================================================
# Arquivo: domain/ports/order_repository.py

class OrderRepository(ABC):
    @abstractmethod
    async def save(self, order: Order) -> None: ...

    @abstractmethod
    async def find_by_id(self, order_id: OrderId) -> Order | None: ...


# ============================================================
# INFRASTRUCTURE implementa a interface
# ============================================================
# Arquivo: infrastructure/persistence/sqlalchemy_order_repository.py

class SqlAlchemyOrderRepository(OrderRepository):  # <-- Implementa o Port
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, order: Order) -> None:
        # ... implementacao com SQLAlchemy


# ============================================================
# APPLICATION usa a interface, NAO a implementacao
# ============================================================
# Arquivo: application/handlers/execute_trade_handler.py

class ExecuteTradeHandler:
    def __init__(self, order_repo: OrderRepository):  # <-- Recebe interface
        self._order_repo = order_repo  # NAO sabe que e SQLAlchemy


# ============================================================
# COMPOSICAO (Composition Root) -- onde tudo e conectado
# ============================================================
# Arquivo: infrastructure/di/container.py  (ou delivery/main.py)

def configure_container():
    session = create_async_session()
    order_repo = SqlAlchemyOrderRepository(session)       # Implementacao concreta
    handler = ExecuteTradeHandler(order_repo=order_repo)   # Injeta via interface
    return handler
```

### 3.5 Violations Comuns (e como evitar)

| Violacao | Exemplo | Solucao |
|----------|---------|---------|
| Domain importa ORM | `from sqlalchemy import Column` no domain | Mover modelos ORM para infrastructure |
| Application importa framework HTTP | `from fastapi import Request` no use case | Receber dados via Command/DTO |
| Domain depende de cache | `from redis import Redis` no domain service | Criar Port `CachePort` no domain |
| Delivery acessa banco direto | Controller faz `SELECT * FROM orders` | Usar repository via application |

---

## 4. Cross-Cutting Concerns

Cross-cutting concerns sao aspectos que afetam multiplas camadas do sistema.
A questao fundamental e: **onde colocar cada um?**

### 4.1 Mapa de Responsabilidades

```
+------------------+------------+-------------+----------+----------------+
| Concern          | Delivery   | Application | Domain   | Infrastructure |
+------------------+------------+-------------+----------+----------------+
| Input Validation | SINTATICA  |             |          |                |
| (formato, tipo)  | (Pydantic) |             |          |                |
+------------------+------------+-------------+----------+----------------+
| Business Valid.  |            |             | SEMANTICA|                |
| (regras negocio) |            |             | (Entity) |                |
+------------------+------------+-------------+----------+----------------+
| Authentication   | MIDDLEWARE |             |          | Token verify   |
| (quem e voce?)   | (JWT check)|             |          | (impl concreta)|
+------------------+------------+-------------+----------+----------------+
| Authorization    |            | USE CASE    | POLICY   |                |
| (pode fazer?)    |            | (pre-check) | (rules)  |                |
+------------------+------------+-------------+----------+----------------+
| Logging (request)|  REQUEST   |             |          |                |
| (HTTP logs)      | MIDDLEWARE |             |          |                |
+------------------+------------+-------------+----------+----------------+
| Logging (negocio)|            | USE CASE    |          | Logger impl    |
| (audit trail)    |            | (events)    |          | (infra)        |
+------------------+------------+-------------+----------+----------------+
| Error Handling   | TRADUZIR   | CAPTURAR    | LANCAR   |  LANCAR        |
|                  | p/ HTTP    | e re-throw  | DomainEx | InfraEx        |
+------------------+------------+-------------+----------+----------------+
| Caching          |            | DECIDIR     |          | Redis impl     |
| (quando cachear) |            | (use case)  |          | (adapter)      |
+------------------+------------+-------------+----------+----------------+
| Transactions     |            | GERENCIAR   |          | DB session     |
| (UoW boundary)   |            | (UoW begin/ |          | (impl concreta)|
|                  |            |  commit)    |          |                |
+------------------+------------+-------------+----------+----------------+
| Rate Limiting    | MIDDLEWARE |             |          | Redis counter  |
+------------------+------------+-------------+----------+----------------+
| Retry/Circuit    |            |             |          | ADAPTER        |
| Breaker          |            |             |          | (impl. no      |
|                  |            |             |          |  client HTTP)  |
+------------------+------------+-------------+----------+----------------+
```

### 4.2 Detalhamento por Concern

#### 4.2.1 Validacao

Ha dois tipos fundamentais de validacao, e eles vivem em camadas diferentes:

```python
# VALIDACAO SINTATICA -- Delivery Layer (Pydantic / FastAPI)
class CreateOrderRequest(BaseModel):
    symbol: str = Field(..., min_length=4, max_length=10)   # formato
    quantity: str = Field(..., pattern=r"^\d+(\.\d{1,8})?$") # formato numerico
    side: str = Field(..., pattern="^(BUY|SELL)$")           # enum valido

# VALIDACAO SEMANTICA -- Domain Layer (Entity / Value Object)
class Order:
    def fill(self, quantity: Quantity, price: Price) -> None:
        if self._status != OrderStatus.ACTIVE:
            raise DomainException("Cannot fill inactive order")  # regra de negocio
        if quantity > self.remaining_quantity:
            raise DomainException("Fill exceeds order quantity")  # invariante
```

#### 4.2.2 Autenticacao e Autorizacao

```python
# AUTENTICACAO -- Delivery Middleware (quem e voce?)
class AuthMiddleware:
    async def __call__(self, request, call_next):
        token = request.headers.get("Authorization")
        if not token:
            return JSONResponse(status_code=401, content={"error": "No token"})
        user = await self._auth_service.verify_token(token)  # infra adapter
        request.state.user = user
        return await call_next(request)

# AUTORIZACAO -- Application Layer (pode fazer isso?)
class ExecuteTradeHandler:
    async def handle(self, command: ExecuteTradeCommand) -> ExecuteTradeResult:
        # Verificar se o usuario pode operar neste portfolio
        if not self._auth_policy.can_trade(command.requested_by, command.portfolio_id):
            raise AuthorizationException("User cannot trade in this portfolio")
        # ... continuar com use case

# POLITICA DE AUTORIZACAO -- Domain Layer (regras de quem pode o que)
class TradingAuthorizationPolicy:
    """Domain: define as regras de autorizacao como conceito de negocio."""
    def can_trade(self, trader_id: str, portfolio_id: str) -> bool:
        # ... regra de negocio sobre permissoes de trading
        pass
```

#### 4.2.3 Tratamento de Erros (Error Handling)

A hierarquia de erros respeita a hierarquia de camadas:

```python
# DOMAIN -- Excecoes de negocio
class DomainException(Exception):
    """Erro de regra de negocio."""
    pass

class InsufficientFundsException(DomainException):
    pass

class RiskLimitExceededException(DomainException):
    pass

# APPLICATION -- Excecoes de aplicacao
class ApplicationException(Exception):
    pass

class NotFoundException(ApplicationException):
    pass

class AuthorizationException(ApplicationException):
    pass

# INFRASTRUCTURE -- Excecoes de infraestrutura
class InfrastructureException(Exception):
    pass

class DatabaseConnectionException(InfrastructureException):
    pass

class ExternalApiException(InfrastructureException):
    pass

# DELIVERY -- Traduz todas as excecoes para HTTP
@app.exception_handler(DomainException)
async def domain_exception_handler(request, exc):
    return JSONResponse(status_code=422, content={
        "error_code": "BUSINESS_RULE_VIOLATION",
        "message": str(exc),
    })

@app.exception_handler(NotFoundException)
async def not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={
        "error_code": "NOT_FOUND",
        "message": str(exc),
    })

@app.exception_handler(InfrastructureException)
async def infra_exception_handler(request, exc):
    # Log detalhado (nao expor detalhes ao cliente)
    logger.error(f"Infrastructure error: {exc}", exc_info=True)
    return JSONResponse(status_code=503, content={
        "error_code": "SERVICE_UNAVAILABLE",
        "message": "An internal error occurred. Please try again later.",
    })
```

---

## 5. Estrutura de Pastas Pratica

### 5.1 Organizacao por Camada (Layer-First)

Ideal para projetos pequenos/medios com equipe homogenea:

```
trading_bot/
|
|-- domain/                          # CAMADA DOMAIN (Core)
|   |-- __init__.py
|   |
|   |-- entities/                    # Entities & Aggregate Roots
|   |   |-- __init__.py
|   |   |-- order.py                 # Order (Aggregate Root)
|   |   |-- position.py             # Position (Entity)
|   |   |-- portfolio.py            # Portfolio (Aggregate Root)
|   |   |-- strategy.py             # Strategy (Entity)
|   |   `-- trade.py                # Trade (Entity)
|   |
|   |-- value_objects/               # Value Objects (imutaveis)
|   |   |-- __init__.py
|   |   |-- money.py                # Money (amount + currency)
|   |   |-- symbol.py               # Symbol (ticker)
|   |   |-- price.py                # Price
|   |   |-- quantity.py             # Quantity
|   |   |-- order_side.py           # OrderSide (BUY/SELL)
|   |   |-- order_status.py         # OrderStatus (PENDING/ACTIVE/FILLED)
|   |   |-- time_period.py          # TimePeriod
|   |   `-- price_candle.py         # PriceCandle (OHLCV)
|   |
|   |-- services/                    # Domain Services
|   |   |-- __init__.py
|   |   |-- risk_calculation.py     # RiskCalculationService
|   |   |-- position_sizing.py      # PositionSizingService
|   |   `-- signal_evaluation.py    # SignalEvaluationService
|   |
|   |-- events/                      # Domain Events
|   |   |-- __init__.py
|   |   |-- base.py                 # DomainEvent base class
|   |   |-- order_events.py         # OrderFilled, OrderCancelled, etc.
|   |   |-- portfolio_events.py     # PositionOpened, RiskLimitBreached
|   |   `-- strategy_events.py      # SignalGenerated, StrategyActivated
|   |
|   |-- ports/                       # Interfaces (Ports) -- para Infrastructure
|   |   |-- __init__.py
|   |   |-- order_repository.py     # OrderRepository (ABC)
|   |   |-- portfolio_repository.py # PortfolioRepository (ABC)
|   |   |-- market_data_port.py     # MarketDataPort (ABC)
|   |   |-- broker_port.py          # BrokerPort (ABC) -- enviar orders
|   |   |-- cache_port.py           # CachePort (ABC)
|   |   `-- event_publisher.py      # EventPublisher (ABC)
|   |
|   |-- specifications/             # Specification Pattern
|   |   |-- __init__.py
|   |   |-- base.py                 # Specification ABC
|   |   |-- order_specs.py          # OrderIsEligible, OrderIsExpired
|   |   `-- risk_specs.py           # WithinRiskLimits, MaxDrawdown
|   |
|   |-- policies/                    # Domain Policies
|   |   |-- __init__.py
|   |   |-- trading_policy.py       # Regras de horario, limites
|   |   `-- risk_policy.py          # Politicas de risco
|   |
|   `-- exceptions.py               # DomainException hierarchy
|
|-- application/                     # CAMADA APPLICATION (Use Cases)
|   |-- __init__.py
|   |
|   |-- commands/                    # Commands (operacoes de escrita)
|   |   |-- __init__.py
|   |   |-- execute_trade.py        # ExecuteTradeCommand
|   |   |-- cancel_order.py         # CancelOrderCommand
|   |   |-- run_backtest.py         # RunBacktestCommand
|   |   |-- activate_strategy.py    # ActivateStrategyCommand
|   |   `-- adjust_risk_limits.py   # AdjustRiskLimitsCommand
|   |
|   |-- queries/                     # Queries (operacoes de leitura)
|   |   |-- __init__.py
|   |   |-- get_portfolio.py        # GetPortfolioSummaryQuery
|   |   |-- get_order_history.py    # GetOrderHistoryQuery
|   |   |-- get_strategy_perf.py    # GetStrategyPerformanceQuery
|   |   `-- get_risk_report.py      # GetRiskReportQuery
|   |
|   |-- handlers/                    # Command & Query Handlers
|   |   |-- __init__.py
|   |   |-- execute_trade_handler.py
|   |   |-- cancel_order_handler.py
|   |   |-- run_backtest_handler.py
|   |   |-- get_portfolio_handler.py
|   |   |-- get_order_history_handler.py
|   |   `-- get_risk_report_handler.py
|   |
|   |-- dtos/                        # Application DTOs (internos)
|   |   |-- __init__.py
|   |   |-- trade_result.py
|   |   |-- portfolio_summary.py
|   |   |-- backtest_result.py
|   |   `-- risk_report.py
|   |
|   |-- mappers/                     # Mappers (Domain <-> DTO)
|   |   |-- __init__.py
|   |   |-- order_mapper.py
|   |   |-- portfolio_mapper.py
|   |   `-- strategy_mapper.py
|   |
|   |-- interfaces/                  # Interfaces da Application
|   |   |-- __init__.py
|   |   |-- unit_of_work.py         # UnitOfWork (ABC)
|   |   `-- event_publisher.py      # ApplicationEventPublisher
|   |
|   `-- exceptions.py               # ApplicationException hierarchy
|
|-- infrastructure/                  # CAMADA INFRASTRUCTURE (Adapters)
|   |-- __init__.py
|   |
|   |-- persistence/                 # Banco de dados
|   |   |-- __init__.py
|   |   |-- models/                  # ORM Models (SQLAlchemy)
|   |   |   |-- __init__.py
|   |   |   |-- order_model.py
|   |   |   |-- position_model.py
|   |   |   |-- portfolio_model.py
|   |   |   `-- strategy_model.py
|   |   |
|   |   |-- repositories/           # Repository implementations
|   |   |   |-- __init__.py
|   |   |   |-- sqlalchemy_order_repo.py
|   |   |   |-- sqlalchemy_portfolio_repo.py
|   |   |   `-- sqlalchemy_strategy_repo.py
|   |   |
|   |   |-- migrations/             # Database migrations (Alembic)
|   |   |   |-- versions/
|   |   |   `-- env.py
|   |   |
|   |   |-- database.py             # Database session factory
|   |   `-- unit_of_work.py         # SqlAlchemyUnitOfWork
|   |
|   |-- external/                    # APIs externas
|   |   |-- __init__.py
|   |   |-- b3/                      # Adaptador B3
|   |   |   |-- __init__.py
|   |   |   |-- b3_market_data.py   # B3MarketDataAdapter
|   |   |   |-- b3_broker.py        # B3BrokerAdapter
|   |   |   `-- b3_models.py        # Modelos de resposta B3
|   |   |
|   |   `-- alpha_vantage/          # Dados historicos alternativos
|   |       |-- __init__.py
|   |       `-- alpha_vantage_client.py
|   |
|   |-- cache/                       # Cache
|   |   |-- __init__.py
|   |   |-- redis_cache.py          # RedisCacheAdapter
|   |   `-- in_memory_cache.py      # InMemoryCacheAdapter (dev/test)
|   |
|   |-- messaging/                   # Message broker
|   |   |-- __init__.py
|   |   |-- redis_event_publisher.py
|   |   `-- redis_event_consumer.py
|   |
|   |-- logging/                     # Logging infrastructure
|   |   |-- __init__.py
|   |   |-- structured_logger.py
|   |   `-- log_config.py
|   |
|   `-- di/                          # Dependency Injection (Composition Root)
|       |-- __init__.py
|       `-- container.py             # Wire everything together
|
|-- delivery/                        # CAMADA DELIVERY (Presentation)
|   |-- __init__.py
|   |
|   |-- api/                         # REST API (FastAPI)
|   |   |-- __init__.py
|   |   |-- main.py                 # FastAPI app creation
|   |   |-- routers/
|   |   |   |-- __init__.py
|   |   |   |-- trades.py           # /api/v1/trades
|   |   |   |-- portfolio.py        # /api/v1/portfolio
|   |   |   |-- strategies.py       # /api/v1/strategies
|   |   |   `-- health.py           # /api/v1/health
|   |   |
|   |   |-- schemas/                 # Request/Response DTOs (Pydantic)
|   |   |   |-- __init__.py
|   |   |   |-- trade_schemas.py
|   |   |   |-- portfolio_schemas.py
|   |   |   `-- strategy_schemas.py
|   |   |
|   |   |-- middleware/
|   |   |   |-- __init__.py
|   |   |   |-- auth.py             # Authentication middleware
|   |   |   |-- rate_limit.py       # Rate limiting
|   |   |   |-- cors.py             # CORS configuration
|   |   |   `-- request_logging.py  # Request/Response logging
|   |   |
|   |   `-- error_handlers.py       # Exception -> HTTP response
|   |
|   |-- websocket/                   # WebSocket handlers
|   |   |-- __init__.py
|   |   |-- market_data_ws.py       # Market data streaming
|   |   |-- portfolio_ws.py         # Portfolio updates real-time
|   |   `-- connection_manager.py   # WebSocket connection management
|   |
|   `-- cli/                         # CLI interface
|       |-- __init__.py
|       |-- main.py                 # Click CLI app
|       |-- backtest_cmd.py         # backtest command
|       `-- strategy_cmd.py         # strategy management commands
|
|-- config/                          # Configuracao
|   |-- __init__.py
|   |-- settings.py                 # Settings (Pydantic BaseSettings)
|   `-- environments/
|       |-- development.env
|       |-- staging.env
|       `-- production.env
|
|-- tests/                           # Testes
|   |-- unit/
|   |   |-- domain/                 # Testes de Domain (sem infra)
|   |   |-- application/            # Testes de Use Cases (mocks)
|   |   `-- delivery/               # Testes de Controllers
|   |
|   |-- integration/
|   |   |-- infrastructure/         # Testes com banco real
|   |   `-- api/                    # Testes de API end-to-end
|   |
|   |-- conftest.py
|   `-- fixtures/
|
|-- pyproject.toml
|-- Dockerfile
`-- docker-compose.yml
```

### 5.2 Organizacao por Feature (Feature-First)

Para projetos maiores com multiplos bounded contexts e equipes:

```
trading_bot/
|
|-- shared/                          # Codigo compartilhado entre features
|   |-- domain/
|   |   |-- base_entity.py
|   |   |-- base_value_object.py
|   |   |-- domain_event.py
|   |   `-- specification.py
|   |-- application/
|   |   |-- unit_of_work.py
|   |   `-- event_publisher.py
|   `-- infrastructure/
|       |-- database.py
|       `-- di_container.py
|
|-- trading/                         # FEATURE: Trading (Bounded Context)
|   |-- domain/
|   |   |-- entities/
|   |   |   |-- order.py
|   |   |   `-- trade.py
|   |   |-- value_objects/
|   |   |   |-- order_side.py
|   |   |   `-- order_type.py
|   |   |-- services/
|   |   |   `-- order_matching.py
|   |   |-- events/
|   |   |   `-- order_events.py
|   |   `-- ports/
|   |       |-- order_repository.py
|   |       `-- broker_port.py
|   |
|   |-- application/
|   |   |-- commands/
|   |   |   `-- execute_trade.py
|   |   |-- queries/
|   |   |   `-- get_order_history.py
|   |   `-- handlers/
|   |       |-- execute_trade_handler.py
|   |       `-- get_order_history_handler.py
|   |
|   |-- infrastructure/
|   |   |-- persistence/
|   |   |   `-- sqlalchemy_order_repo.py
|   |   `-- external/
|   |       `-- b3_broker_adapter.py
|   |
|   `-- delivery/
|       |-- api/
|       |   |-- routes.py
|       |   `-- schemas.py
|       `-- websocket/
|           `-- order_updates.py
|
|-- risk_management/                 # FEATURE: Risk Management
|   |-- domain/
|   |   |-- entities/
|   |   |   `-- risk_profile.py
|   |   |-- services/
|   |   |   |-- var_calculator.py
|   |   |   `-- position_sizing.py
|   |   |-- events/
|   |   |   `-- risk_events.py
|   |   `-- ports/
|   |       `-- risk_repository.py
|   |
|   |-- application/
|   |   |-- commands/
|   |   |   `-- update_risk_limits.py
|   |   |-- queries/
|   |   |   `-- get_risk_report.py
|   |   `-- handlers/
|   |       `-- ...
|   |
|   |-- infrastructure/
|   |   `-- persistence/
|   |       `-- sqlalchemy_risk_repo.py
|   |
|   `-- delivery/
|       `-- api/
|           |-- routes.py
|           `-- schemas.py
|
|-- portfolio/                       # FEATURE: Portfolio Management
|   |-- domain/ ...
|   |-- application/ ...
|   |-- infrastructure/ ...
|   `-- delivery/ ...
|
|-- strategy/                        # FEATURE: Strategy Engine
|   |-- domain/ ...
|   |-- application/ ...
|   |-- infrastructure/ ...
|   `-- delivery/ ...
|
`-- backtesting/                     # FEATURE: Backtesting
    |-- domain/ ...
    |-- application/ ...
    |-- infrastructure/ ...
    `-- delivery/ ...
```

### 5.3 Comparacao: Layer-First vs Feature-First

| Aspecto | Layer-First | Feature-First |
|---------|-------------|---------------|
| **Quando usar** | Projetos pequenos/medios, 1-3 devs | Projetos grandes, multiplas equipes |
| **Coesao** | Menor (arquivos relacionados distantes) | Maior (tudo da feature junto) |
| **Escalabilidade** | Cresce verticalmente (pastas enormes) | Cresce horizontalmente (novas features) |
| **Navegacao** | Facil entender a arquitetura | Facil encontrar tudo de uma feature |
| **Microservices** | Dificil extrair | Cada feature vira um servico |
| **Duplicacao** | Menor (shared natural) | Precisa de `shared/` explicito |
| **Recomendacao** | Comecar aqui | Migrar quando crescer |

### 5.4 Abordagem Hibrida (Recomendada para o Trading Bot)

Comecar com Layer-First e migrar gradualmente para Feature-First conforme
o projeto cresce. Usar bounded contexts do DDD para definir os limites:

```
trading_bot/
|
|-- core/                            # Shared Kernel (DDD)
|   |-- domain/                      # Tipos e interfaces compartilhadas
|   |-- application/                 # Interfaces de aplicacao compartilhadas
|   `-- infrastructure/              # Infra compartilhada (DB, logging)
|
|-- modules/                         # Bounded Contexts como modulos
|   |-- trading/                     # Layer-first DENTRO de cada modulo
|   |   |-- domain/
|   |   |-- application/
|   |   |-- infrastructure/
|   |   `-- delivery/
|   |
|   |-- risk/
|   |-- portfolio/
|   |-- strategy/
|   `-- backtesting/
|
|-- delivery/                        # Delivery compartilhado (API gateway)
|   |-- api/
|   |-- websocket/
|   `-- cli/
|
`-- config/
```

---

## 6. Anti-Patterns

### 6.1 Catalogo de Anti-Patterns

#### 6.1.1 Anemic Domain Model

**Descricao:** Entidades que sao apenas "sacos de getters e setters" sem comportamento.
Toda a logica de negocio fica nos Application Services.

Martin Fowler classificou este como um dos anti-patterns mais comuns e prejudiciais:

> "The fundamental horror of this anti-pattern is that it's so contrary to the
> basic idea of object-oriented design; which is to combine data and process together."
> -- Martin Fowler

```python
# ====== ANTI-PATTERN: Anemic Domain Model ======

class Order:
    """ERRADO: Entity sem comportamento -- apenas dados."""
    def __init__(self):
        self.order_id = None
        self.symbol = None
        self.side = None
        self.quantity = None
        self.status = None         # Qualquer um pode mudar para qualquer valor!
        self.filled_quantity = None

class OrderService:
    """ERRADO: Toda logica de negocio no Service, Entity e vazia."""
    def fill_order(self, order: Order, quantity, price):
        if order.status != "ACTIVE":      # Regra no lugar errado!
            raise Exception("Cannot fill")
        order.filled_quantity += quantity   # Manipulacao direta de estado!
        if order.filled_quantity >= order.quantity:
            order.status = "FILLED"        # Entity nao protege invariantes!

# ====== CORRETO: Rich Domain Model ======

class Order:
    """CORRETO: Entity encapsula estado e comportamento."""
    def fill(self, quantity: Quantity, price: Price) -> None:
        """A propria Entity valida e protege suas invariantes."""
        if self._status != OrderStatus.ACTIVE:
            raise DomainException("Cannot fill inactive order")
        if quantity > self.remaining_quantity:
            raise DomainException("Fill exceeds remaining quantity")
        self._fills.append(Fill(quantity, price, Timestamp.now()))
        if self._is_fully_filled():
            self._status = OrderStatus.FILLED
```

#### 6.1.2 God Class / God Controller

**Descricao:** Um unico controller ou service que faz tudo.

```python
# ====== ANTI-PATTERN: God Controller ======

class TradingController:
    """ERRADO: Controller faz TUDO -- HTTP, logica, banco, cache."""

    @router.post("/trade")
    async def create_trade(self, request: Request):
        data = await request.json()

        # Validacao no controller
        if not data.get("symbol"):
            return {"error": "symbol required"}

        # Logica de negocio no controller!
        portfolio = db.query("SELECT * FROM portfolios WHERE id = ?", data["portfolio_id"])
        if portfolio["exposure"] + data["amount"] > portfolio["risk_limit"]:
            return {"error": "risk limit exceeded"}

        # Acesso direto ao banco!
        db.execute("INSERT INTO orders ...", data)

        # Cache no controller!
        redis.delete(f"portfolio:{data['portfolio_id']}")

        # Enviar email no controller!
        send_email(portfolio["owner_email"], "Trade created")

        return {"status": "ok"}

# ====== CORRETO: Controller fino, delega para Application ======

@router.post("/trade")
async def create_trade(
    request: CreateTradeRequest,                   # Validacao via Pydantic
    handler: ExecuteTradeHandler = Depends(...),    # Use Case injetado
):
    command = ExecuteTradeCommand(...)              # Converter p/ Command
    result = await handler.handle(command)          # Delegar
    return TradeResponse.from_result(result)        # Converter p/ Response
```

#### 6.1.3 Circular Dependencies

**Descricao:** Camadas que dependem umas das outras criando ciclos.

```
ERRADO:
  Domain --importa--> Infrastructure
  Infrastructure --importa--> Domain
  Application --importa--> Delivery
  Delivery --importa--> Application

CORRETO:
  Domain <--implementa-- Infrastructure  (via interfaces/ports)
  Application --usa--> Domain (direcao unica)
  Delivery --usa--> Application (direcao unica)
```

**Deteccao:** Usar ferramentas como `import-linter` (Python) para validar:

```ini
# .importlinter config
[importlinter]
root_package = trading_bot

[importlinter:contract:domain-independence]
name = Domain does not import from outer layers
type = forbidden
source_modules =
    trading_bot.domain
forbidden_modules =
    trading_bot.application
    trading_bot.infrastructure
    trading_bot.delivery

[importlinter:contract:application-no-infra]
name = Application does not import Infrastructure
type = forbidden
source_modules =
    trading_bot.application
forbidden_modules =
    trading_bot.infrastructure
    trading_bot.delivery
```

#### 6.1.4 Leaky Abstractions

**Descricao:** Detalhes de infraestrutura "vazam" para camadas internas.

```python
# ====== ANTI-PATTERN: Leaky Abstraction ======

class OrderRepository(ABC):
    """ERRADO: Interface do Domain expoe detalhes do SQLAlchemy."""
    @abstractmethod
    def find_by_query(self, query: "sqlalchemy.Query") -> list[Order]:
        # ^ Query SQLAlchemy na interface do Domain! Violacao!
        ...

    @abstractmethod
    def save(self, order: Order, session: "sqlalchemy.Session") -> None:
        # ^ Session SQLAlchemy na interface! Violacao!
        ...

# ====== CORRETO: Interface limpa ======

class OrderRepository(ABC):
    """CORRETO: Interface expressa necessidades do Domain, nao detalhes de infra."""
    @abstractmethod
    async def save(self, order: Order) -> None: ...

    @abstractmethod
    async def find_by_id(self, order_id: OrderId) -> Order | None: ...

    @abstractmethod
    async def find_active_by_symbol(self, symbol: Symbol) -> list[Order]: ...
```

#### 6.1.5 Fat Services (Service God)

**Descricao:** Application Service que faz tudo, sem delegar para o Domain.

```python
# ====== ANTI-PATTERN: Fat Service ======

class TradingService:
    """ERRADO: Service faz TODO o trabalho, Domain e anemic."""
    async def execute_trade(self, data):
        # Busca
        portfolio = await self.repo.find(data["portfolio_id"])
        # Calculo de risco (deveria ser Domain Service)
        exposure = sum(p.qty * p.price for p in portfolio.positions)
        # Verificacao de limites (deveria ser Domain)
        if exposure > portfolio.risk_limit:
            raise Exception("Risk limit")
        # Criacao de order (deveria ser Domain/Entity)
        order = Order()
        order.symbol = data["symbol"]
        order.side = data["side"]
        order.status = "ACTIVE"
        # Persistencia (OK)
        await self.repo.save(order)
        # Envio de evento (OK, mas evento deveria vir do Domain)
        await self.events.publish({"type": "order_created", "data": data})
```

#### 6.1.6 Resumo: Checklist de Anti-Patterns

| Anti-Pattern | Sintoma | Camada Afetada | Solucao |
|-------------|---------|----------------|---------|
| Anemic Domain Model | Entities sem metodos | Domain | Mover logica para entities |
| God Controller | Controller com 500+ linhas | Delivery | Extrair use cases |
| God Service | Service faz tudo | Application | Separar em handlers menores |
| Circular Dependencies | Import cycles | Todas | Dependency Rule + interfaces |
| Leaky Abstractions | ORM no domain | Domain/Infra | Interfaces limpas |
| Fat Controller | Controller acessa DB | Delivery | Usar Application layer |
| Shotgun Surgery | Mudar feature toca 10 files | Todas | Reorganizar por feature |
| Premature Abstraction | Interface para 1 impl | Todas | YAGNI, abstrair depois |

---

## 7. Aplicacao ao Trading Bot

### 7.1 Visao Geral da Arquitetura do Bot

```
+================================================================+
|                      DELIVERY LAYER                             |
|                                                                 |
|  +------------------+  +------------------+  +---------------+  |
|  |  REST API        |  |  WebSocket       |  |  CLI          |  |
|  |  (Dashboard)     |  |  (Real-Time)     |  |  (Backtest)   |  |
|  |                  |  |                  |  |               |  |
|  |  GET /portfolio  |  |  ws://market     |  |  $ bot run    |  |
|  |  POST /trade     |  |  ws://portfolio  |  |  $ bot test   |  |
|  |  GET /orders     |  |  ws://signals    |  |  $ bot config |  |
|  +--------+---------+  +--------+---------+  +-------+-------+  |
|           |                      |                    |          |
+===========|======================|====================|==========+
            |                      |                    |
            v                      v                    v
+================================================================+
|                    APPLICATION LAYER                             |
|                                                                 |
|  Commands:                    Queries:                           |
|  - ExecuteTradeCommand        - GetPortfolioSummaryQuery         |
|  - CancelOrderCommand         - GetOrderHistoryQuery             |
|  - ActivateStrategyCommand    - GetStrategyPerformanceQuery      |
|  - RunBacktestCommand         - GetRiskReportQuery               |
|  - AdjustRiskLimitsCommand    - GetMarketDataQuery               |
|                                                                 |
|  Handlers:                                                      |
|  - ExecuteTradeHandler        - GetPortfolioSummaryHandler       |
|  - CancelOrderHandler         - GetOrderHistoryHandler           |
|  - RunBacktestHandler         - GetRiskReportHandler             |
|                                                                 |
+====================+============================================+
                     |
                     v
+================================================================+
|                     DOMAIN LAYER                                |
|                                                                 |
|  Entities:                    Value Objects:                     |
|  - Order (Aggregate Root)     - Money, Price, Quantity           |
|  - Portfolio (Agg. Root)      - Symbol, OrderSide, OrderType     |
|  - Position (Entity)          - PriceCandle, TimePeriod          |
|  - Strategy (Agg. Root)       - TradingSignal                   |
|  - Trade (Entity)                                               |
|                               Domain Services:                  |
|  Domain Events:               - RiskCalculationService           |
|  - OrderFilled                - PositionSizingService            |
|  - PositionOpened             - SignalEvaluationService           |
|  - RiskLimitBreached                                            |
|  - SignalGenerated            Ports (Interfaces):               |
|                               - OrderRepository                  |
|  Specifications:              - PortfolioRepository              |
|  - OrderIsEligible            - MarketDataPort                   |
|  - WithinRiskLimits           - BrokerPort                       |
|                               - CachePort                        |
+================================================================+
                     ^
                     | implementa
+================================================================+
|                  INFRASTRUCTURE LAYER                            |
|                                                                 |
|  Persistence:                 External APIs:                    |
|  - SqlAlchemyOrderRepo       - B3MarketDataAdapter              |
|  - SqlAlchemyPortfolioRepo   - B3BrokerAdapter                  |
|  - PostgreSQL (database)      - AlphaVantageClient              |
|  - Alembic (migrations)                                        |
|                               Cache:                            |
|  Messaging:                   - RedisCacheAdapter               |
|  - RedisEventPublisher        - InMemoryCacheAdapter            |
|  - RedisEventConsumer                                           |
|                               Logging:                          |
|  DI Container:                - StructuredLogger                |
|  - Container config           - OpenTelemetry integration       |
+================================================================+
```

### 7.2 Fluxo de Execucao: "Executar um Trade"

Exemplo completo do fluxo de uma operacao de compra:

```
1. DELIVERY: Usuario clica "Comprar PETR4" no Dashboard
   |
   v
2. DELIVERY: REST Controller recebe POST /api/v1/trades
   Body: { "symbol": "PETR4", "side": "BUY", "quantity": "100", "order_type": "MARKET" }
   |
   | Validacao sintatica (Pydantic): symbol format, quantity > 0
   | Autenticacao (Middleware): JWT token valido?
   |
   v
3. DELIVERY -> APPLICATION: Controller cria ExecuteTradeCommand
   ExecuteTradeCommand(portfolio_id="P001", symbol="PETR4", side="BUY", quantity=100)
   |
   v
4. APPLICATION: ExecuteTradeHandler.handle(command)
   |
   |-- 4a. Busca Portfolio no repositorio (via interface)
   |-- 4b. Busca preco atual via MarketDataPort (via interface)
   |-- 4c. Calcula risco via RiskCalculationService (Domain Service)
   |
   v
5. DOMAIN: Portfolio.open_position(symbol, quantity, price)
   |
   |-- Verifica: exposicao total < risk_limit (invariante do Aggregate)
   |-- Cria Position ou incrementa existente
   |-- Gera evento: PositionOpened
   |
   v
6. DOMAIN: Order.create(symbol, side, quantity, order_type)
   |
   |-- Valida: quantity > 0, order_type valido
   |-- Status = PENDING
   |-- Gera evento: OrderCreated
   |
   v
7. APPLICATION: Persiste dentro de transacao (Unit of Work)
   |
   |-- await order_repo.save(order)           # Infra (SQLAlchemy)
   |-- await portfolio_repo.save(portfolio)   # Infra (SQLAlchemy)
   |-- await uow.commit()                     # Infra (DB transaction)
   |
   v
8. APPLICATION: Publica Domain Events
   |
   |-- await event_publisher.publish(OrderCreated)      # Infra (Redis)
   |-- await event_publisher.publish(PositionOpened)     # Infra (Redis)
   |
   v
9. APPLICATION -> DELIVERY: Retorna ExecuteTradeResult DTO
   ExecuteTradeResult(order_id="O123", status="PENDING", estimated_cost="2850.00")
   |
   v
10. DELIVERY: Controller converte para TradeResponse (HTTP 201)
    { "order_id": "O123", "status": "PENDING", "estimated_cost": "2850.00" }
    |
    v
11. DELIVERY: WebSocket Handler notifica dashboard em real-time
    ws.send({ "type": "order_created", "order_id": "O123" })
```

### 7.3 Mapeamento Completo: Conceito de Negocio -> Camada

| Conceito de Negocio | Camada | Classe/Componente |
|---------------------|--------|-------------------|
| Uma Order de compra/venda | Domain Entity | `Order` (Aggregate Root) |
| Preco de um ativo | Domain Value Object | `Price` |
| Quantidade de acoes | Domain Value Object | `Quantity` |
| Ticker do ativo (PETR4) | Domain Value Object | `Symbol` |
| Posicao aberta em um ativo | Domain Entity | `Position` |
| Carteira do trader | Domain Entity | `Portfolio` (Aggregate Root) |
| Estrategia de trading | Domain Entity | `Strategy` (Aggregate Root) |
| Calculo de Value at Risk | Domain Service | `RiskCalculationService` |
| Dimensionamento de posicao | Domain Service | `PositionSizingService` |
| "Order foi preenchida" | Domain Event | `OrderFilled` |
| "Limite de risco violado" | Domain Event | `RiskLimitBreached` |
| Salvar order no banco | Domain Port + Infra Adapter | `OrderRepository` + `SqlAlchemyOrderRepo` |
| Obter preco da B3 | Domain Port + Infra Adapter | `MarketDataPort` + `B3MarketDataAdapter` |
| Enviar order para B3 | Domain Port + Infra Adapter | `BrokerPort` + `B3BrokerAdapter` |
| Cachear preco recente | Domain Port + Infra Adapter | `CachePort` + `RedisCacheAdapter` |
| Executar um trade | Application Use Case | `ExecuteTradeHandler` |
| Rodar backtest | Application Use Case | `RunBacktestHandler` |
| Consultar portfolio | Application Use Case | `GetPortfolioSummaryHandler` |
| Endpoint REST /trades | Delivery Controller | `trades.py` router |
| Stream de precos real-time | Delivery WebSocket | `MarketDataWebSocketHandler` |
| CLI para backtest | Delivery CLI | `backtest_cmd.py` |

### 7.4 Bounded Contexts do Trading Bot

Usando Strategic DDD, o bot se organiza em bounded contexts:

```
+-------------------------------------------------------------------+
|                     TRADING BOT SYSTEM                             |
|                                                                   |
|  +-----------------+  +------------------+  +------------------+  |
|  |   TRADING       |  | RISK MANAGEMENT  |  |  PORTFOLIO       |  |
|  |   CONTEXT       |  |   CONTEXT        |  |   CONTEXT        |  |
|  |                 |  |                  |  |                  |  |
|  |  Order          |  |  RiskProfile     |  |  Portfolio       |  |
|  |  Trade          |  |  VaR             |  |  Position        |  |
|  |  BrokerPort     |  |  StressTest      |  |  BalanceSheet    |  |
|  |  OrderBook      |  |  RiskPolicy      |  |  PnL             |  |
|  +-----------------+  +------------------+  +------------------+  |
|                                                                   |
|  +-----------------+  +------------------+                        |
|  |   STRATEGY      |  |  BACKTESTING     |                        |
|  |   CONTEXT       |  |   CONTEXT        |                        |
|  |                 |  |                  |                        |
|  |  Strategy       |  |  Simulation      |                        |
|  |  Signal         |  |  HistoricalData  |                        |
|  |  Indicator      |  |  BacktestResult  |                        |
|  |  EntryRule      |  |  PerformanceRpt  |                        |
|  +-----------------+  +------------------+                        |
|                                                                   |
|  Comunicacao entre Contexts: Domain Events (async, eventual       |
|  consistency) ou Application Services (sincrono, mesmo processo)  |
+-------------------------------------------------------------------+
```

### 7.5 Consideracoes Especificas para Trading

| Aspecto | Decisao Arquitetural | Justificativa |
|---------|---------------------|---------------|
| **Latencia** | Domain logic in-process, sem chamadas de rede | Trading exige baixa latencia |
| **Market Data** | Cache em Redis com TTL curto (1-5s) | Evitar chamadas excessivas a API |
| **Order State** | Event Sourcing opcional para Orders | Auditoria completa de mudancas |
| **Concorrencia** | Optimistic locking no Portfolio | Evitar race conditions em posicoes |
| **Idempotencia** | Idempotency key em Commands | Evitar trades duplicados |
| **Circuit Breaker** | No B3BrokerAdapter | Proteger contra falhas da B3 |
| **Real-Time** | WebSocket para dashboard | Atualizacoes instantaneas de portfolio |
| **Backtest** | Mesmo Domain, Infrastructure diferente | Reutiliza regras, muda fonte de dados |

---

## 8. Exemplos de Codigo Conceitual

### 8.1 Composition Root (Wiring Everything Together)

O Composition Root e onde todas as dependencias sao resolvidas. Ele vive
na fronteira entre Infrastructure e Delivery.

```python
# infrastructure/di/container.py

from dependency_injector import containers, providers

class Container(containers.DeclarativeContainer):
    """
    Composition Root: conecta todas as camadas.
    Este e o UNICO lugar que conhece todas as implementacoes concretas.
    """

    # -- Config --
    config = providers.Configuration()

    # -- Infrastructure: Database --
    db_engine = providers.Singleton(
        create_async_engine,
        url=config.database.url,
    )
    db_session_factory = providers.Factory(
        AsyncSession,
        bind=db_engine,
    )

    # -- Infrastructure: External APIs --
    b3_market_data = providers.Singleton(
        B3MarketDataAdapter,
        base_url=config.b3.base_url,
        api_key=config.b3.api_key,
    )
    b3_broker = providers.Singleton(
        B3BrokerAdapter,
        base_url=config.b3.base_url,
        api_key=config.b3.api_key,
    )

    # -- Infrastructure: Cache --
    redis_cache = providers.Singleton(
        RedisCacheAdapter,
        redis_url=config.redis.url,
    )

    # -- Infrastructure: Event Publisher --
    event_publisher = providers.Singleton(
        RedisEventPublisher,
        redis_url=config.redis.url,
    )

    # -- Infrastructure: Repositories (implementam interfaces do Domain) --
    order_repository = providers.Factory(
        SqlAlchemyOrderRepository,
        session=db_session_factory,
    )
    portfolio_repository = providers.Factory(
        SqlAlchemyPortfolioRepository,
        session=db_session_factory,
    )

    # -- Infrastructure: Unit of Work --
    unit_of_work = providers.Factory(
        SqlAlchemyUnitOfWork,
        session=db_session_factory,
    )

    # -- Domain Services (puro, sem dependencias de infra) --
    risk_calculation_service = providers.Singleton(
        RiskCalculationService,
    )

    # -- Application: Handlers (Use Cases) --
    execute_trade_handler = providers.Factory(
        ExecuteTradeHandler,
        portfolio_repo=portfolio_repository,
        order_repo=order_repository,
        market_data=b3_market_data,          # Interface MarketDataPort
        risk_service=risk_calculation_service,
        unit_of_work=unit_of_work,
        event_publisher=event_publisher,      # Interface EventPublisher
    )
    cancel_order_handler = providers.Factory(
        CancelOrderHandler,
        order_repo=order_repository,
        unit_of_work=unit_of_work,
        event_publisher=event_publisher,
    )
    get_portfolio_handler = providers.Factory(
        GetPortfolioSummaryHandler,
        portfolio_repo=portfolio_repository,
        market_data=b3_market_data,
    )
```

### 8.2 Unit of Work Pattern

```python
# application/interfaces/unit_of_work.py (Interface na Application)

class UnitOfWork(ABC):
    @abstractmethod
    async def __aenter__(self) -> "UnitOfWork": ...

    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None: ...

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def rollback(self) -> None: ...


# infrastructure/persistence/unit_of_work.py (Implementacao)

class SqlAlchemyUnitOfWork(UnitOfWork):
    def __init__(self, session_factory):
        self._session_factory = session_factory

    async def __aenter__(self) -> "SqlAlchemyUnitOfWork":
        self._session = self._session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type:
            await self.rollback()
        await self._session.close()

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
```

### 8.3 Backtest: Mesmo Domain, Infra Diferente

Um dos maiores beneficios da arquitetura em camadas: reutilizar o Domain inteiro
com infraestrutura diferente para backtesting.

```python
# Para PRODUCAO: B3MarketDataAdapter (API real da B3)
# Para BACKTEST: HistoricalMarketDataAdapter (dados historicos de arquivo/banco)

class HistoricalMarketDataAdapter(MarketDataPort):
    """
    ADAPTER de backtest: implementa a mesma interface MarketDataPort,
    mas retorna dados historicos em vez de dados ao vivo.
    """

    def __init__(self, historical_data: dict[str, list[PriceCandle]]):
        self._data = historical_data
        self._current_index: dict[str, int] = {}

    async def get_current_price(self, symbol: Symbol) -> Price:
        """Retorna o preco do 'momento atual' da simulacao."""
        idx = self._current_index.get(str(symbol), 0)
        candle = self._data[str(symbol)][idx]
        return Price(value=candle.close, currency="BRL")

    async def get_historical_prices(
        self, symbol: Symbol, period: TimePeriod
    ) -> list[PriceCandle]:
        """Retorna candles historicos ate o momento atual da simulacao."""
        idx = self._current_index.get(str(symbol), 0)
        return self._data[str(symbol)][:idx]

    def advance_time(self, symbol: str):
        """Avanca o 'relogio' da simulacao."""
        self._current_index[symbol] = self._current_index.get(symbol, 0) + 1


# O RunBacktestHandler usa o MESMO ExecuteTradeHandler,
# mas com HistoricalMarketDataAdapter em vez de B3MarketDataAdapter.
# O Domain NAO muda. Apenas a Infrastructure muda.

class RunBacktestHandler:
    async def handle(self, command: RunBacktestCommand) -> BacktestResult:
        # Carregar dados historicos
        historical_data = await self._data_loader.load(
            command.symbol, command.start_date, command.end_date
        )

        # Criar infraestrutura de backtest
        market_data = HistoricalMarketDataAdapter(historical_data)
        in_memory_repo = InMemoryOrderRepository()
        in_memory_portfolio_repo = InMemoryPortfolioRepository()

        # Reutilizar o MESMO handler de trading com infra diferente
        trade_handler = ExecuteTradeHandler(
            portfolio_repo=in_memory_portfolio_repo,
            order_repo=in_memory_repo,
            market_data=market_data,               # <-- Infra de backtest
            risk_service=self._risk_service,       # <-- Mesmo Domain Service
            unit_of_work=InMemoryUnitOfWork(),
            event_publisher=InMemoryEventPublisher(),
        )

        # Executar simulacao
        for candle in historical_data[command.symbol]:
            market_data.advance_time(command.symbol)
            signal = await self._strategy.evaluate(market_data)
            if signal:
                await trade_handler.handle(signal.to_command())

        return self._calculate_results(in_memory_portfolio_repo)
```

---

## 9. Referencias e Bibliografia

### 9.1 Livros Fundamentais ("Biblias")

| # | Titulo | Autor(es) | Ano | Editora | Tipo |
|---|--------|-----------|-----|---------|------|
| 1 | **Clean Architecture: A Craftsman's Guide to Software Structure and Design** | Robert C. Martin | 2017 | Prentice Hall | Livro |
| 2 | **Domain-Driven Design: Tackling Complexity in the Heart of Software** | Eric Evans | 2003 | Addison-Wesley | Livro |
| 3 | **Implementing Domain-Driven Design** | Vaughn Vernon | 2013 | Addison-Wesley | Livro |
| 4 | **Patterns of Enterprise Application Architecture** | Martin Fowler | 2002 | Addison-Wesley | Livro |
| 5 | **Hexagonal Architecture (Ports and Adapters)** | Alistair Cockburn | 2005 | -- | Artigo original |

### 9.2 Artigos e Posts Essenciais

| # | Titulo | Autor(es) | Ano | URL | Tipo |
|---|--------|-----------|-----|-----|------|
| 6 | **The Clean Architecture** | Robert C. Martin | 2012 | [blog.cleancoder.com](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) | Blog post |
| 7 | **DDD, Hexagonal, Onion, Clean, CQRS -- How I put it all together** | Herberto Graca | 2017 | [herbertograca.com](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/) | Blog post |
| 8 | **Layers, Onions, Ports, Adapters: it's all the same** | Mark Seemann | 2013 | [blog.ploeh.dk](https://blog.ploeh.dk/2013/12/03/layers-onions-ports-adapters-its-all-the-same/) | Blog post |
| 9 | **AnemicDomainModel** | Martin Fowler | 2003 | [martinfowler.com](https://martinfowler.com/bliki/AnemicDomainModel.html) | Bliki |
| 10 | **CQRS** | Martin Fowler | 2011 | [martinfowler.com](https://www.martinfowler.com/bliki/CQRS.html) | Bliki |
| 11 | **Catalog of Patterns of Enterprise Application Architecture** | Martin Fowler | 2002 | [martinfowler.com](https://martinfowler.com/eaaCatalog/) | Catalogo online |
| 12 | **Domain services vs Application services** | Vladimir Khorikov | 2016 | [enterprisecraftsmanship.com](https://enterprisecraftsmanship.com/posts/domain-vs-application-services/) | Blog post |
| 13 | **CQRS Pattern** | Microsoft | 2023 | [learn.microsoft.com](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) | Documentacao |
| 14 | **Clean Architecture Folder Structure** | Milan Jovanovic | 2024 | [milanjovanovic.tech](https://www.milanjovanovic.tech/blog/clean-architecture-folder-structure) | Blog post |
| 15 | **Unpacking the Layers: Domain, Application, and Infrastructure Services** | Dan Does Code | 2024 | [dandoescode.com](https://www.dandoescode.com/blog/unpacking-the-layers-of-clean-architecture-domain-application-and-infrastructure-services) | Blog post |
| 16 | **Balancing Cross-Cutting Concerns in Clean Architecture** | Milan Jovanovic | 2024 | [milanjovanovic.tech](https://www.milanjovanovic.tech/blog/balancing-cross-cutting-concerns-in-clean-architecture) | Blog post |
| 17 | **Dominando a Escalabilidade: DDD, Clean Architecture e Hexagonal** | Elemar JR | 2024 | [elemarjr.com](https://elemarjr.com/clube-de-estudos/artigos/dominando-a-escalabilidade-integrando-ddd-clean-architecture-e-arquitetura-hexagonal/) | Artigo (PT-BR) |
| 18 | **Implementando Clean Architecture em Python** | Thiago Adriano | 2023 | [medium.com](https://programadriano.medium.com/implementando-clean-architecture-em-python-7459b507414b) | Blog post (PT-BR) |

### 9.3 Recursos sobre Trading Bot Architecture

| # | Titulo | Autor(es) | Ano | URL | Tipo |
|---|--------|-----------|-----|-----|------|
| 19 | **Algorithmic Trading System Architecture** | Stuart Gordon Reid | 2014 | [turingfinance.com](http://www.turingfinance.com/algorithmic-trading-system-architecture-post/) | Artigo |
| 20 | **Stock Trading Bot Architecture: Core Components** | James Hall | 2025 | [medium.com](https://medium.com/@halljames9963/stock-trading-bot-architecture-core-components-explained-d46f5d77c019) | Blog post |
| 21 | **Design and Architecture of a Real World Trading Platform** | Vamsi Talks Tech | 2024 | [vamsitalkstech.com](https://www.vamsitalkstech.com/architecture/design-and-architecture-of-a-real-world-trading-platform-23/) | Blog series |

### 9.4 Leitura Complementar Recomendada

| Titulo | Autor | Relevancia |
|--------|-------|------------|
| **Clean Code** | Robert C. Martin | Principios de codigo limpo subjacentes |
| **SOLID Principles** | Robert C. Martin | Base teorica para Dependency Rule |
| **Head First Design Patterns** | Freeman & Robson | Patterns fundamentais (Strategy, Observer) |
| **Release It!** | Michael Nygard | Circuit Breaker, resilience patterns |
| **Building Microservices** | Sam Newman | Quando extrair modulos para servicos |
| **Domain-Driven Design Distilled** | Vaughn Vernon | Versao condensada do DDD |

---

## Apendice A: Checklist de Revisao Arquitetural

Use esta checklist para validar que sua arquitetura segue os principios:

```
DOMAIN LAYER
[ ] Entities tem identidade unica e encapsulam comportamento
[ ] Value Objects sao imutaveis e definidos por atributos
[ ] Aggregates protegem invariantes de negocio
[ ] Domain Services sao stateless e operam sobre objetos de dominio
[ ] Domain Events representam fatos do passado
[ ] Nenhum import de framework/ORM/HTTP
[ ] Testavel sem mocks de infraestrutura

APPLICATION LAYER
[ ] Use Cases sao handlers de Command/Query
[ ] Orquestra Domain Objects sem conter logica de negocio
[ ] Gerencia transacoes (Unit of Work)
[ ] Publica Domain Events
[ ] Usa interfaces (Ports) do Domain, nao implementacoes

DELIVERY LAYER
[ ] Controllers sao finos (thin controllers)
[ ] Validacao sintatica apenas (formato, tipo, obrigatoriedade)
[ ] Converte Request DTO -> Command/Query -> Response DTO
[ ] Traduz excecoes para codigos HTTP apropriados
[ ] Middleware para concerns transversais (auth, rate limit, logging)

INFRASTRUCTURE LAYER
[ ] Implementa interfaces definidas no Domain
[ ] Contem ORM models, migrations, configuracoes de banco
[ ] External API clients com retry, timeout, circuit breaker
[ ] Composition Root conecta tudo via Dependency Injection

DEPENDENCY RULE
[ ] Domain nao importa de Application, Infrastructure ou Delivery
[ ] Application nao importa de Infrastructure ou Delivery
[ ] Infrastructure importa de Domain (para implementar interfaces)
[ ] Delivery importa de Application (para invocar use cases)
[ ] Nenhuma dependencia circular
```

---

## Apendice B: Glossario

| Termo | Definicao |
|-------|-----------|
| **Aggregate** | Cluster de entidades tratadas como unidade de mudanca |
| **Aggregate Root** | Entidade principal do aggregate, unico ponto de acesso |
| **Adapter** | Implementacao concreta de um Port (interface) |
| **Bounded Context** | Limite explicito de um modelo de dominio |
| **Command** | Objeto que representa uma intencao de alterar estado |
| **CQRS** | Command Query Responsibility Segregation |
| **Dependency Rule** | Dependencias apontam apenas para dentro (em direcao ao dominio) |
| **Domain Event** | Registro imutavel de algo que aconteceu no dominio |
| **DTO** | Data Transfer Object -- objeto para transferir dados entre camadas |
| **Entity** | Objeto com identidade unica que muda ao longo do tempo |
| **Invariant** | Regra que SEMPRE deve ser verdadeira (ex: saldo >= 0) |
| **Port** | Interface definida pelo dominio para comunicacao com o exterior |
| **Query** | Objeto que solicita dados sem alterar estado |
| **Rich Domain Model** | Entidades com comportamento e regras (oposto de Anemic) |
| **Specification** | Objeto que encapsula uma regra de negocio combinavel |
| **Ubiquitous Language** | Vocabulario compartilhado entre devs e domain experts |
| **Unit of Work** | Gerencia mudancas como uma unica transacao |
| **Use Case** | Operacao especifica que o sistema pode realizar |
| **Value Object** | Objeto sem identidade, definido por seus atributos, imutavel |

---

*Documento gerado em 2026-02-07 com base em pesquisa abrangente de fontes primarias e secundarias.*
*Revisao recomendada a cada 6 meses para incorporar evolucoes da comunidade.*
