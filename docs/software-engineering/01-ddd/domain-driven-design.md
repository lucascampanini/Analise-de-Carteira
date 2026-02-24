# Domain-Driven Design (DDD) -- Guia Definitivo

> **Escopo:** Documento de referencia nivel PhD cobrindo todos os aspectos de Domain-Driven Design,
> desde fundamentos estrategicos ate padroes taticos de implementacao, com enfase em aplicacao
> pratica para um bot de investimentos.
>
> **Ultima atualizacao:** 2026-02-07

---

## Sumario

1. [Introducao e Contexto Historico](#1-introducao-e-contexto-historico)
2. [Conceitos Fundamentais](#2-conceitos-fundamentais)
3. [Building Blocks Taticos](#3-building-blocks-taticos)
4. [Strategic Design](#4-strategic-design)
5. [Aggregates em Profundidade](#5-aggregates-em-profundidade)
6. [Domain Events](#6-domain-events)
7. [CQRS e Event Sourcing](#7-cqrs-e-event-sourcing)
8. [Event Storming](#8-event-storming)
9. [DDD com Microservices](#9-ddd-com-microservices)
10. [Aplicacao Pratica](#10-aplicacao-pratica)
11. [DDD no Contexto de Trading e Fintech](#11-ddd-no-contexto-de-trading-e-fintech)
12. [Anti-Patterns e Quando NAO Usar DDD](#12-anti-patterns-e-quando-nao-usar-ddd)
13. [Implicacoes para o Bot de Investimentos](#13-implicacoes-para-o-bot-de-investimentos)
14. [Referencias Bibliograficas](#14-referencias-bibliograficas)

---

## 1. Introducao e Contexto Historico

### 1.1 O Que e Domain-Driven Design

Domain-Driven Design (DDD) e uma abordagem para desenvolvimento de software que coloca o
**dominio de negocio** no centro de todas as decisoes de design. Cunhado por **Eric Evans** em
seu livro seminal de 2003, *"Domain-Driven Design: Tackling Complexity in the Heart of
Software"* (conhecido como o **Blue Book**), DDD propoe que a complexidade essencial de um
sistema de software reside no dominio de negocio -- nao na tecnologia.

A premissa fundamental e que:

> Software eficaz requer uma compreensao profunda do dominio de negocio, e essa compreensao
> deve ser refletida diretamente no codigo.

### 1.2 Por Que DDD Importa

Em sistemas complexos -- como um bot de investimentos que lida com ordens, portfolios,
estrategias de trading, gestao de risco e conformidade regulatoria -- a maior fonte de
complexidade nao e a infraestrutura tecnica, mas sim as **regras de negocio**. DDD fornece:

1. **Linguagem comum** entre desenvolvedores e especialistas de dominio
2. **Limites claros** entre diferentes partes do sistema (Bounded Contexts)
3. **Padroes taticos** para modelar logica de negocio complexa
4. **Padroes estrategicos** para integrar multiplos modelos e equipes

### 1.3 A Evolucao do DDD

```
2003  Eric Evans publica o "Blue Book"
      |
2004  Jimmy Nilsson: "Applying DDD and Patterns"
      |
2009  Greg Young formaliza CQRS + Event Sourcing
      |
2011  Vaughn Vernon: artigos "Effective Aggregate Design"
      |
2013  Vaughn Vernon: "Implementing DDD" (Red Book)
      Alberto Brandolini cria Event Storming
      |
2015  Scott Millett & Nick Tune: "Patterns, Principles, and Practices of DDD"
      |
2016  Vaughn Vernon: "Domain-Driven Design Distilled"
      |
2021  Vlad Khononov: "Learning Domain-Driven Design"
      |
2024  Eric Evans propoe uso de LLMs treinados em Ubiquitous Language
```

---

## 2. Conceitos Fundamentais

### 2.1 Ubiquitous Language (Linguagem Ubiqua)

A Ubiquitous Language e o conceito mais importante de DDD. Trata-se de uma **linguagem
compartilhada** entre desenvolvedores, domain experts, product owners e todos os envolvidos
no projeto. Essa linguagem:

- E usada em conversas, documentacao, codigo-fonte, testes e nomes de classes
- Evolui continuamente com o aprendizado do dominio
- E **restrita a um Bounded Context** (a mesma palavra pode ter significados diferentes em
  contextos diferentes)
- Deve refletir diretamente na modelagem do software

**Exemplo para o Bot de Investimentos:**

```
Linguagem do Dominio          Codigo
--------------------          ------
"Submeter uma ordem"    -->   order.submit()
"Executar uma ordem"    -->   order.execute(executionPrice, quantity)
"Cancelar uma ordem"    -->   order.cancel(reason)
"Posicao aberta"        -->   Position com status = OPEN
"Stop Loss atingido"    -->   StopLossTriggered (Domain Event)
```

**Anti-pattern:** Usar termos tecnicos no lugar de termos de negocio. Por exemplo, dizer
"inserir um registro na tabela de ordens" em vez de "submeter uma ordem de compra".

### 2.2 Domain Model (Modelo de Dominio)

O Domain Model e uma **abstracao do dominio de negocio** expressa em software. Nao e um
diagrama ER, nao e um schema de banco de dados -- e um modelo conceitual que captura:

- **Conceitos** do dominio (entidades, valores)
- **Comportamentos** (regras de negocio, operacoes)
- **Relacionamentos** entre conceitos
- **Invariantes** que devem ser sempre verdadeiros

Martin Fowler distingue dois tipos de domain model:

1. **Rich Domain Model:** Objetos de dominio contem tanto dados quanto comportamento.
   Entidades validam suas proprias invariantes, encapsulam regras de negocio e expoe operacoes
   significativas. Este e o modelo preconizado por DDD.

2. **Anemic Domain Model (Anti-pattern):** Objetos de dominio sao meros "bags of getters and
   setters". Toda logica reside em servicos externos. Fowler classificou isso como anti-pattern
   em 2003, pois incorre em todos os custos de um domain model sem colher seus beneficios.

```
+----------------------------------------------------------+
|               RICH DOMAIN MODEL                          |
|                                                          |
|   class Order:                                           |
|     - orderId: OrderId                                   |
|     - items: List<OrderItem>                             |
|     - status: OrderStatus                                |
|                                                          |
|     + submit(): void         # valida e muda estado      |
|     + cancel(reason): void   # verifica se cancelavel    |
|     + execute(price): void   # aplica regras de execucao |
|     + totalValue(): Money    # calculo de dominio        |
|                                                          |
+----------------------------------------------------------+

+----------------------------------------------------------+
|               ANEMIC DOMAIN MODEL (Anti-pattern)         |
|                                                          |
|   class OrderDTO:                                        |
|     - orderId: string                                    |
|     - items: List<item>                                  |
|     - status: string                                     |
|                                                          |
|     + getId() / setId()                                  |
|     + getItems() / setItems()                            |
|     + getStatus() / setStatus()                          |
|                                                          |
|   class OrderService:  # toda logica aqui                |
|     + submitOrder(dto)                                   |
|     + cancelOrder(dto, reason)                           |
|     + executeOrder(dto, price)                           |
|                                                          |
+----------------------------------------------------------+
```

### 2.3 Bounded Context (Contexto Delimitado)

O Bounded Context e um **limite explicito** dentro do qual um domain model particular e
definido e aplicavel. Cada Bounded Context tem:

- Sua propria **Ubiquitous Language** (a mesma palavra pode ter significados diferentes em
  contextos diferentes)
- Seu proprio **modelo de dominio**
- Sua propria **base de codigo** (idealmente)
- Sua propria **equipe** (idealmente)

**Por que Bounded Contexts existem?**

Em qualquer dominio complexo, e impossivel ter um unico modelo unificado que funcione para
todos. O conceito de "Ordem" no contexto de Trading e diferente de "Ordem" no contexto de
Compliance. Tentar unificar leva a um modelo inchado e ambiguo.

```
+-----------------------------------+    +-----------------------------------+
|     BOUNDED CONTEXT: Trading      |    |   BOUNDED CONTEXT: Compliance     |
|                                   |    |                                   |
|   Order:                          |    |   Order:                          |
|   - symbol, side, type            |    |   - regulatoryId, reportStatus    |
|   - limitPrice, stopPrice         |    |   - auditTrail, riskCategory      |
|   - execute(), cancel()           |    |   - flagForReview(), approve()    |
|                                   |    |                                   |
|   "Ordem" = instrucao de trade    |    |   "Ordem" = registro regulatorio  |
+-----------------------------------+    +-----------------------------------+
```

### 2.4 Subdomains (Subdominios)

Um dominio de negocio e composto por **subdominios**, cada um representando uma area de
conhecimento ou atividade. Existem tres tipos:

#### 2.4.1 Core Subdomain (Subdominio Principal)

- E a **razao de existir** do sistema
- Diferencial competitivo da organizacao
- Requer os **melhores desenvolvedores** e maior investimento
- Deve usar padroes sofisticados (Domain Model, Event Sourcing)

> Para o bot de investimentos: **Estrategia de Trading** e **Gestao de Risco** sao core
> subdomains. E aqui que a logica unica e proprietaria reside.

#### 2.4.2 Supporting Subdomain (Subdominio de Suporte)

- Necessario para que o core funcione, mas nao e diferencial competitivo
- Especifico o suficiente para nao poder ser comprado pronto
- Pode usar padroes mais simples (Transaction Script, Active Record)

> Para o bot: **Gerenciamento de Portfolio**, **Notificacoes** sao supporting subdomains.

#### 2.4.3 Generic Subdomain (Subdominio Generico)

- Problema ja resolvido pela industria
- Pode (e deve) ser comprado, adotado ou terceirizado
- Nao justifica desenvolvimento interno

> Para o bot: **Autenticacao**, **Logging**, **Envio de Email** sao generic subdomains.
> Use bibliotecas ou servicos prontos.

```
+-----------------------------------------------------------------------+
|                    DOMINIO: Bot de Investimentos                      |
|                                                                       |
|  +---------------------+  +----------------------+  +---------------+ |
|  |   CORE SUBDOMAIN    |  | SUPPORTING SUBDOMAIN |  |    GENERIC    | |
|  |                     |  |                      |  |   SUBDOMAIN   | |
|  | - Trading Engine    |  | - Portfolio Mgmt     |  | - Auth/AuthZ  | |
|  | - Risk Management   |  | - Notifications      |  | - Logging     | |
|  | - Strategy Exec.    |  | - Report Generation  |  | - Email/SMS   | |
|  | - Signal Analysis   |  | - User Preferences   |  | - Scheduling  | |
|  |                     |  |                      |  |               | |
|  | >>> Best devs       |  | >>> Can outsource    |  | >>> Buy/adopt | |
|  | >>> Domain Model    |  | >>> Simpler patterns |  | >>> Off-shelf | |
|  +---------------------+  +----------------------+  +---------------+ |
+-----------------------------------------------------------------------+
```

### 2.5 Context Mapping

Context Mapping e a tecnica de **mapear os relacionamentos** entre Bounded Contexts. Um
Context Map mostra como os diferentes modelos se integram e se comunicam, revelando:

- Dependencias entre equipes e sistemas
- Fluxo de dados e transformacao de modelos
- Pontos de integracao e seus riscos

O Context Map e abordado em detalhes na secao de Strategic Design (secao 4).

---

## 3. Building Blocks Taticos

Os building blocks taticos sao os **padroes de implementacao** que DDD define para expressar
o domain model em codigo. Sao os tijolos com os quais construimos o software.

### 3.1 Entities (Entidades)

Uma Entity e um objeto que possui **identidade unica** que persiste ao longo do tempo. Duas
entidades com os mesmos atributos, mas IDs diferentes, sao entidades diferentes. A identidade
e o que importa, nao os atributos.

**Caracteristicas:**
- Possuem um **identificador unico** (ID)
- Sao **mutaveis** (seu estado muda ao longo do tempo)
- Igualdade baseada em **identidade**, nao em atributos
- Possuem **ciclo de vida** (criacao, alteracao, exclusao)

```python
# Exemplo: Entity "Order" no bot de investimentos
class Order:
    def __init__(self, order_id: OrderId, symbol: Symbol, side: Side,
                 order_type: OrderType, quantity: Quantity, price: Money):
        self._order_id = order_id
        self._symbol = symbol
        self._side = side
        self._order_type = order_type
        self._quantity = quantity
        self._price = price
        self._status = OrderStatus.PENDING
        self._created_at = datetime.utcnow()
        self._events: list[DomainEvent] = []

    @property
    def id(self) -> OrderId:
        return self._order_id

    def submit(self) -> None:
        """Submete a ordem para execucao."""
        if self._status != OrderStatus.PENDING:
            raise InvalidOrderStateError("Only pending orders can be submitted")
        self._status = OrderStatus.SUBMITTED
        self._events.append(OrderSubmitted(self._order_id, self._symbol))

    def __eq__(self, other) -> bool:
        if not isinstance(other, Order):
            return False
        return self._order_id == other._order_id  # Igualdade por identidade
```

### 3.2 Value Objects (Objetos de Valor)

Um Value Object e um objeto **sem identidade**. E definido exclusivamente pelos valores de
seus atributos. Dois Value Objects com os mesmos atributos sao considerados iguais.

**Caracteristicas:**
- **Sem identidade** (sem ID)
- **Imutaveis** -- para alterar, cria-se uma nova instancia
- Igualdade baseada em **atributos** (structural equality)
- Frequentemente representam conceitos como dinheiro, datas, enderecos, coordenadas
- Podem conter **logica de validacao** e **operacoes**

```python
# Exemplo: Value Object "Money" para operacoes financeiras
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)  # frozen=True garante imutabilidade
class Money:
    amount: Decimal
    currency: str

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")
        if len(self.currency) != 3:
            raise ValueError("Currency must be ISO 4217 code")

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise CurrencyMismatchError(self.currency, other.currency)
        return Money(self.amount + other.amount, self.currency)

    def multiply(self, factor: Decimal) -> 'Money':
        return Money(self.amount * factor, self.currency)

    def __eq__(self, other) -> bool:
        if not isinstance(other, Money):
            return False
        return self.amount == other.amount and self.currency == other.currency


# Exemplo: Value Object "Symbol" (ativo financeiro)
@dataclass(frozen=True)
class Symbol:
    ticker: str
    exchange: str

    def __post_init__(self):
        if not self.ticker or len(self.ticker) > 10:
            raise ValueError("Invalid ticker symbol")

    def __str__(self) -> str:
        return f"{self.ticker}.{self.exchange}"
```

**Quando usar Entity vs Value Object?**

| Criterio              | Entity              | Value Object          |
|-----------------------|---------------------|-----------------------|
| Identidade            | Sim (ID unico)      | Nao                   |
| Mutabilidade          | Mutavel             | Imutavel              |
| Igualdade             | Por ID              | Por atributos         |
| Ciclo de vida         | Sim                 | Nao (substituido)     |
| Exemplo (Trading)     | Order, Position     | Money, Symbol, Price  |

### 3.3 Aggregates (Agregados)

O Aggregate e um dos conceitos mais importantes e mais mal-compreendidos de DDD. Um Aggregate
e um **cluster de Entities e Value Objects** que sao tratados como uma **unidade de
consistencia**. Detalhado na secao 5.

**Definicao curta:** Um Aggregate define um **limite de transacao** dentro do qual todas as
invariantes de negocio devem ser mantidas.

### 3.4 Aggregate Root (Raiz do Agregado)

Cada Aggregate tem exatamente uma **Aggregate Root** -- a entidade principal pela qual todo
acesso externo ao Aggregate deve passar. A root:

- E a unica entidade do Aggregate que objetos externos podem referenciar
- Garante a **consistencia** de todo o Aggregate
- Controla o **ciclo de vida** das entidades internas
- E identificada por um **ID global**

```
+------------------------------------------+
|          AGGREGATE: Portfolio             |
|                                          |
|  +------------------------------------+  |
|  |  AGGREGATE ROOT: Portfolio         |  |
|  |  - portfolioId: PortfolioId        |  |
|  |  - ownerId: UserId                 |  |
|  |  - positions: List<Position>       |  |
|  |  - cashBalance: Money              |  |
|  |                                    |  |
|  |  + openPosition(symbol, qty, px)   |  |
|  |  + closePosition(positionId)       |  |
|  |  + totalValue(): Money             |  |
|  +------------------------------------+  |
|          |                               |
|          | contem (internal entity)       |
|          v                               |
|  +------------------------------------+  |
|  |  ENTITY: Position                  |  |
|  |  - positionId: PositionId (local)  |  |
|  |  - symbol: Symbol                  |  |
|  |  - quantity: Quantity              |  |
|  |  - averagePrice: Money             |  |
|  |  - status: PositionStatus          |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
     ^
     | Unico ponto de acesso externo
     | (via PortfolioRepository)
```

### 3.5 Repositories (Repositorios)

Repositories sao **abstracoes de persistencia** para Aggregates. Eles fornecem a ilusao de
uma colecao em memoria de Aggregate Roots, escondendo os detalhes de infraestrutura.

**Regras:**
- Existe **um Repository por Aggregate Root** (nao por Entity)
- O Repository opera sobre **Aggregates inteiros** (carrega e salva o Aggregate completo)
- A interface do Repository faz parte do **Domain Layer**
- A implementacao do Repository faz parte do **Infrastructure Layer**

```python
# Interface do Repository (Domain Layer)
from abc import ABC, abstractmethod

class OrderRepository(ABC):
    @abstractmethod
    def find_by_id(self, order_id: OrderId) -> Order | None:
        """Busca uma ordem pelo ID."""
        ...

    @abstractmethod
    def find_active_by_symbol(self, symbol: Symbol) -> list[Order]:
        """Busca ordens ativas para um simbolo."""
        ...

    @abstractmethod
    def save(self, order: Order) -> None:
        """Persiste uma ordem (nova ou existente)."""
        ...

    @abstractmethod
    def next_id(self) -> OrderId:
        """Gera o proximo ID de ordem."""
        ...


# Implementacao (Infrastructure Layer)
class SqlAlchemyOrderRepository(OrderRepository):
    def __init__(self, session: Session):
        self._session = session

    def find_by_id(self, order_id: OrderId) -> Order | None:
        row = self._session.query(OrderModel).filter_by(id=str(order_id)).first()
        if row is None:
            return None
        return self._to_domain(row)

    def save(self, order: Order) -> None:
        model = self._to_persistence(order)
        self._session.merge(model)

    # ... metodos de mapeamento ...
```

### 3.6 Domain Services (Servicos de Dominio)

Domain Services encapsulam **logica de negocio** que nao pertence naturalmente a nenhuma
Entity ou Value Object especifico. Sao usados quando uma operacao:

- Envolve **multiplos Aggregates**
- Representa um **conceito do dominio** que nao e uma coisa (Entity) nem um atributo (VO)
- Contem logica que seria **forjada** se colocada em uma entidade

**Caracteristicas:**
- Sao **stateless** (sem estado interno)
- Operam sobre entidades e value objects do dominio
- Seu nome reflete a **Ubiquitous Language**
- Pertencem ao **Domain Layer**

```python
# Exemplo: Domain Service para calculo de risco
class RiskAssessmentService:
    """Avalia risco de uma ordem considerando portfolio e mercado."""

    def assess_order_risk(self, order: Order, portfolio: Portfolio,
                          market_data: MarketData) -> RiskAssessment:
        exposure = self._calculate_exposure(order, portfolio)
        volatility = self._calculate_volatility(order.symbol, market_data)
        var = self._calculate_value_at_risk(exposure, volatility)

        if var > portfolio.max_allowed_var:
            return RiskAssessment.rejected("VaR exceeds limit")

        if exposure > portfolio.max_position_size:
            return RiskAssessment.rejected("Position size exceeds limit")

        return RiskAssessment.approved(var, exposure)
```

### 3.7 Application Services (Servicos de Aplicacao)

Application Services sao a **camada de orquestracao**. Eles coordenam o fluxo de trabalho
de um caso de uso, delegando a logica de negocio para o domain model.

**Responsabilidades:**
- Orquestrar **casos de uso** (use cases)
- Gerenciar **transacoes**
- Coordenar **repositorios** e **domain services**
- Converter entre DTOs externos e objetos de dominio
- **NAO contem logica de negocio**

```python
# Exemplo: Application Service para submissao de ordens
class SubmitOrderUseCase:
    def __init__(self, order_repo: OrderRepository,
                 portfolio_repo: PortfolioRepository,
                 risk_service: RiskAssessmentService,
                 market_data: MarketDataPort,
                 event_publisher: DomainEventPublisher):
        self._order_repo = order_repo
        self._portfolio_repo = portfolio_repo
        self._risk_service = risk_service
        self._market_data = market_data
        self._event_publisher = event_publisher

    def execute(self, command: SubmitOrderCommand) -> SubmitOrderResult:
        # 1. Buscar dados necessarios
        portfolio = self._portfolio_repo.find_by_id(command.portfolio_id)
        if portfolio is None:
            raise PortfolioNotFoundError(command.portfolio_id)

        market = self._market_data.get_current(command.symbol)

        # 2. Criar entidade de dominio
        order = Order(
            order_id=self._order_repo.next_id(),
            symbol=command.symbol,
            side=command.side,
            order_type=command.order_type,
            quantity=command.quantity,
            price=command.price,
        )

        # 3. Delegar logica de negocio ao dominio
        risk = self._risk_service.assess_order_risk(order, portfolio, market)
        if risk.is_rejected:
            return SubmitOrderResult.rejected(risk.reason)

        order.submit()  # Logica de negocio na entidade

        # 4. Persistir e publicar eventos
        self._order_repo.save(order)
        self._event_publisher.publish_all(order.domain_events)

        return SubmitOrderResult.success(order.id)
```

### 3.8 Domain Events (Eventos de Dominio)

Domain Events representam **algo significativo que aconteceu** no dominio. Sao fatos
imutaveis expressos no passado.

```python
# Exemplos de Domain Events para o bot
@dataclass(frozen=True)
class OrderSubmitted:
    order_id: OrderId
    symbol: Symbol
    occurred_at: datetime

@dataclass(frozen=True)
class OrderExecuted:
    order_id: OrderId
    execution_price: Money
    executed_quantity: Quantity
    occurred_at: datetime

@dataclass(frozen=True)
class StopLossTriggered:
    position_id: PositionId
    trigger_price: Money
    occurred_at: datetime

@dataclass(frozen=True)
class PortfolioRebalanced:
    portfolio_id: PortfolioId
    adjustments: list[PositionAdjustment]
    occurred_at: datetime
```

Detalhado na secao 6.

### 3.9 Factories (Fabricas)

Factories encapsulam a **logica complexa de criacao** de Aggregates e Entities. Sao usadas
quando a construcao de um objeto envolve regras de negocio ou e complexa demais para um
construtor simples.

```python
class OrderFactory:
    """Fabrica de ordens com validacao de regras de criacao."""

    def __init__(self, id_generator: OrderIdGenerator,
                 market_calendar: MarketCalendar):
        self._id_gen = id_generator
        self._calendar = market_calendar

    def create_market_order(self, symbol: Symbol, side: Side,
                            quantity: Quantity) -> Order:
        if not self._calendar.is_market_open(symbol.exchange):
            raise MarketClosedError(symbol.exchange)

        return Order(
            order_id=self._id_gen.next_id(),
            symbol=symbol,
            side=side,
            order_type=OrderType.MARKET,
            quantity=quantity,
            price=Money(Decimal("0"), "USD"),  # Market price
        )

    def create_limit_order(self, symbol: Symbol, side: Side,
                           quantity: Quantity, limit_price: Money) -> Order:
        if limit_price.amount <= 0:
            raise InvalidPriceError("Limit price must be positive")

        return Order(
            order_id=self._id_gen.next_id(),
            symbol=symbol,
            side=side,
            order_type=OrderType.LIMIT,
            quantity=quantity,
            price=limit_price,
        )
```

---

## 4. Strategic Design

Strategic Design e a parte de DDD que lida com o **quadro geral**: como dividir um dominio
grande em partes gerenciaveis, como essas partes se relacionam e como equipes colaboram.

### 4.1 Context Maps

Um Context Map e uma **representacao visual** dos Bounded Contexts e seus relacionamentos.
Cada relacionamento entre dois contexts segue um dos padroes abaixo.

### 4.2 Padroes de Context Mapping

#### 4.2.1 Shared Kernel

Dois Bounded Contexts compartilham um **subconjunto** do modelo de dominio. Ambas equipes
concordam sobre este codigo compartilhado e o modificam em conjunto.

```
+----------------+     +----------------+
|   Context A    |     |   Context B    |
|                |     |                |
|     +----------+-----+----------+    |
|     |    SHARED KERNEL          |    |
|     |  (codigo compartilhado)   |    |
|     +---------------------------+    |
+----------------+     +----------------+

Risco: Alto acoplamento. Mudancas no kernel afetam ambos os contextos.
Uso: Apenas quando duas equipes trabalham muito proximas e tem alta confianca mutua.
```

#### 4.2.2 Customer-Supplier (Cliente-Fornecedor)

Um contexto (Upstream/Supplier) fornece dados ou servicos para outro (Downstream/Customer).
O downstream pode negociar o que precisa.

```
+-------------------+         +-------------------+
|    UPSTREAM       |         |   DOWNSTREAM      |
|    (Supplier)     | ------> |   (Customer)      |
|                   |         |                   |
|  Market Data Svc  |         |  Trading Engine   |
+-------------------+         +-------------------+

O downstream influencia o design da interface do upstream.
```

#### 4.2.3 Conformist

Semelhante a Customer-Supplier, mas o downstream **nao tem poder de negociacao**. Deve
conformar-se ao modelo do upstream tal como ele e.

```
+-------------------+         +-------------------+
|    UPSTREAM       |         |   DOWNSTREAM      |
|   (Exchange API)  | ------> |  (Conformist)     |
|                   |         |                   |
|  B3 / Nasdaq API  |         |  Nosso Bot        |
+-------------------+         +-------------------+

Nao temos poder sobre a API da B3. Devemos nos conformar.
```

#### 4.2.4 Anticorruption Layer (ACL)

O downstream cria uma **camada de traducao** que isola seu modelo interno do modelo do
upstream. E o padrao mais protetor -- evita que conceitos externos "contaminem" o dominio.

```
+-------------------+     +-------+     +-------------------+
|    UPSTREAM       |     |  ACL  |     |   DOWNSTREAM      |
|   (External API)  | --> | Adapt | --> |  (Our Domain)     |
|                   |     | Trans |     |                   |
|  Legacy System    |     | late  |     |  Clean Model      |
+-------------------+     +-------+     +-------------------+

A ACL traduz entre o modelo externo e o nosso modelo de dominio.
Essencial quando integrando com APIs externas (corretoras, exchanges).
```

```python
# Exemplo: ACL para API de corretora externa
class BrokerACL:
    """Anticorruption Layer para API da corretora."""

    def __init__(self, broker_client: BrokerApiClient):
        self._client = broker_client

    def get_position(self, symbol: Symbol) -> Position:
        # API externa retorna formato proprio
        raw = self._client.get_holdings(ticker=symbol.ticker)

        # Traduzimos para nosso modelo de dominio
        return Position(
            position_id=PositionId(raw["ref_id"]),
            symbol=Symbol(raw["instrument_code"], raw["market"]),
            quantity=Quantity(raw["net_qty"]),
            average_price=Money(Decimal(str(raw["avg_px"])), raw["ccy"]),
            status=self._map_status(raw["state"]),
        )

    def _map_status(self, external_status: str) -> PositionStatus:
        mapping = {
            "ACTIVE": PositionStatus.OPEN,
            "LIQUIDATED": PositionStatus.CLOSED,
            "PENDING_SETTLEMENT": PositionStatus.SETTLING,
        }
        return mapping.get(external_status, PositionStatus.UNKNOWN)
```

#### 4.2.5 Open Host Service (OHS)

Um contexto define um **protocolo formal** (API) pelo qual outros contextos se comunicam com
ele. E um servico aberto com interface bem definida.

#### 4.2.6 Published Language

Extensao do OHS: a API e publicada em um formato que qualquer equipe pode usar para
construir clientes. Exemplos: OpenAPI/Swagger, Protobuf, AsyncAPI.

#### 4.2.7 Separate Ways

Dois contextos decidem que **nao ha beneficio em integracao**. Cada um segue seu caminho
independentemente.

#### 4.2.8 Partnership

Duas equipes em dois contextos cooperam **ad hoc**, sem contrato formal, sincronizando
releases e mudancas.

### 4.3 Context Map do Bot de Investimentos

```
+----------------------------------------------------------------+
|                    CONTEXT MAP: Bot de Investimentos            |
|                                                                |
|  +------------------+  OHS/PL  +-------------------+           |
|  | Trading Engine   |<-------->| Risk Management   |           |
|  | (Core)           |          | (Core)            |           |
|  +--------+---------+          +---------+---------+           |
|           |                              |                     |
|           | Domain Events                | Domain Events       |
|           v                              v                     |
|  +------------------+          +-------------------+           |
|  | Portfolio Mgmt   |          | Reporting &       |           |
|  | (Supporting)     |          | Analytics (Supp.) |           |
|  +------------------+          +-------------------+           |
|           |                                                    |
|           | ACL                                                |
|           v                                                    |
|  +------------------+                                          |
|  | Broker Gateway   |  <-- Conformist/ACL com APIs externas   |
|  | (Integration)    |                                          |
|  +--------+---------+                                          |
|           |                                                    |
|           | ACL                                                |
|           v                                                    |
|  [B3 API] [Binance] [IB] ... (Sistemas Externos)              |
+----------------------------------------------------------------+
```

---

## 5. Aggregates em Profundidade

### 5.1 As Quatro Regras de Vaughn Vernon

Vaughn Vernon, em seu artigo "Effective Aggregate Design" (2011) e no Red Book (2013),
estabeleceu quatro regras fundamentais para design de Aggregates:

#### Regra 1: Modele Invariantes Verdadeiras em Limites de Consistencia

Um Aggregate corretamente projetado pode ser modificado de qualquer forma requerida pelo
negocio com suas **invariantes completamente consistentes dentro de uma unica transacao**.

**O que e uma invariante?** E uma regra de negocio que deve ser verdadeira **sempre**, sem
excecoes. Exemplos:

- "O saldo do portfolio nao pode ficar negativo"
- "Uma ordem nao pode ser cancelada apos execucao"
- "A soma das quantidades parcialmente executadas nao pode exceder a quantidade total"

```python
class Portfolio:
    """Aggregate Root com invariantes de consistencia."""

    def open_position(self, symbol: Symbol, quantity: Quantity,
                      price: Money) -> None:
        total_cost = price.multiply(Decimal(str(quantity.value)))

        # INVARIANTE: saldo nao pode ficar negativo
        if total_cost.amount > self._cash_balance.amount:
            raise InsufficientFundsError(
                f"Need {total_cost} but only have {self._cash_balance}"
            )

        # INVARIANTE: nao pode ter mais que max_positions abertas
        if len(self._open_positions) >= self._max_positions:
            raise MaxPositionsExceededError(self._max_positions)

        position = Position(
            position_id=self._next_position_id(),
            symbol=symbol,
            quantity=quantity,
            average_price=price,
        )
        self._positions.append(position)
        self._cash_balance = self._cash_balance.subtract(total_cost)
```

#### Regra 2: Projete Aggregates Pequenos

**Large-cluster Aggregates sao um anti-pattern.** Vernon relata que aproximadamente:
- **70%** dos Aggregates devem ter apenas a Root Entity com Value Objects
- **30%** devem ter no maximo 2-3 Entities internas

```
BOM (Aggregate pequeno):              RUIM (Aggregate grande):

+-------------------+                 +----------------------------+
| Order (Root)      |                 | Portfolio (Root)           |
| - orderId         |                 | - portfolioId              |
| - symbol (VO)     |                 | - positions: List<Pos>     |
| - price (VO)      |                 | - orders: List<Order>      |
| - status (VO)     |                 | - tradeHistory: List<Trade>|
| - createdAt (VO)  |                 | - watchlists: List<Watch>  |
+-------------------+                 | - alerts: List<Alert>      |
                                      | - settings: UserSettings   |
Simples, focado,                      +----------------------------+
alta performance.
                                      Muito grande! Contencao de lock,
                                      problemas de performance,
                                      dificil de manter.
```

#### Regra 3: Referencie Outros Aggregates Apenas por Identidade

Nunca mantenha referencias de objeto diretas para outros Aggregates. Use apenas o **ID**.

```python
# CORRETO: referencia por ID
class Order:
    def __init__(self, order_id: OrderId, portfolio_id: PortfolioId, ...):
        self._portfolio_id = portfolio_id  # Apenas o ID, nao o objeto

# INCORRETO: referencia por objeto
class Order:
    def __init__(self, order_id: OrderId, portfolio: Portfolio, ...):
        self._portfolio = portfolio  # Referencia direta -- EVITAR
```

**Beneficios:**
- Aggregates menores e mais leves
- Menos memoria consumida
- Limites de transacao claros
- Facilita distribuicao em microservicos

#### Regra 4: Use Eventual Consistency Fora do Limite

Se um comando em um Aggregate requer que regras adicionais sejam aplicadas em **outro**
Aggregate, use **consistencia eventual** via Domain Events.

```
Transacao 1 (sincrono):           Transacao 2 (assincrono):
+-------------------+             +-------------------+
| Order.execute()   |  --Event--> | Portfolio         |
| - muda status     |             | .updatePosition() |
| - gera evento     |             | - ajusta posicao  |
| OrderExecuted     |             | - recalcula saldo |
+-------------------+             +-------------------+

Cada Aggregate e modificado em sua PROPRIA transacao.
A consistencia entre eles e EVENTUAL (via eventos).
```

### 5.2 Quando Quebrar as Regras

Vernon tambem reconhece cenarios onde pode ser necessario quebrar as regras:

1. **User Interface convenience:** Quando a UI precisa exibir dados de multiplos Aggregates
2. **Falta de infraestrutura de mensageria:** Quando nao ha como implementar eventual
   consistency de forma confiavel
3. **Regras de negocio globais:** Quando uma invariante genuinamente requer consistencia
   entre multiplos Aggregates (raro, mas possivel)
4. **Latencia:** Quando a eventual consistency causaria problemas de experiencia do usuario

### 5.3 Aggregate Design para Trading

No contexto de trading, o design de Aggregates e particularmente critico:

```
+-----------------------------------------------------------------+
|  Aggregates no Dominio de Trading                               |
|                                                                 |
|  Order Aggregate:           Portfolio Aggregate:                |
|  +------------------+      +----------------------+             |
|  | Order (Root)     |      | Portfolio (Root)     |             |
|  | - orderId        |      | - portfolioId        |             |
|  | - portfolioId*   |      | - positions: [Pos]   |             |
|  | - symbol         |      | - cashBalance        |             |
|  | - side           |      | - maxDrawdown        |             |
|  | - type           |      +----------------------+             |
|  | - quantity       |                                           |
|  | - price          |      Strategy Aggregate:                  |
|  | - fills: [Fill]  |      +----------------------+             |
|  +------------------+      | Strategy (Root)      |             |
|                            | - strategyId         |             |
|  * = referencia por ID     | - parameters: [Param]|             |
|                            | - signals: [Signal]  |             |
|                            | - status             |             |
|                            +----------------------+             |
+-----------------------------------------------------------------+
```

---

## 6. Domain Events

### 6.1 O Que Sao Domain Events

Um Domain Event e um registro de **algo significativo que aconteceu** no dominio. Sao:

- Expressos no **tempo passado** (OrderExecuted, PositionClosed, StopLossTriggered)
- **Imutaveis** -- representam fatos que ja aconteceram
- Parte da **Ubiquitous Language**
- Publicados pelo Aggregate que os gera

### 6.2 Domain Events vs Integration Events

Esta distincao e fundamental e frequentemente confundida:

```
+----------------------------------------------------------------+
|                                                                |
|  DOMAIN EVENTS                  INTEGRATION EVENTS             |
|  =============                  ==================             |
|                                                                |
|  Escopo: Dentro de um           Escopo: Entre Bounded          |
|          Bounded Context                 Contexts              |
|                                                                |
|  Transporte: In-memory          Transporte: Message Broker     |
|              (mediator)                     (RabbitMQ, Kafka)  |
|                                                                |
|  Timing: Sincrono ou            Timing: Assincrono             |
|          assincrono (local)              (distribuido)          |
|                                                                |
|  Formato: Objetos de dominio    Formato: DTOs/schemas          |
|           ricos                          serializaveis         |
|                                                                |
|  Acoplamento: Pode referenciar  Acoplamento: Contrato publico  |
|               tipos internos                 (Published Lang.) |
|                                                                |
|  Falha: Pode participar da      Falha: Outbox pattern,         |
|         mesma transacao                  at-least-once          |
|                                                                |
+----------------------------------------------------------------+
```

```python
# Domain Event (interno ao contexto de Trading)
@dataclass(frozen=True)
class OrderExecuted:
    order_id: OrderId
    symbol: Symbol
    execution_price: Money
    executed_quantity: Quantity
    occurred_at: datetime

# Integration Event (publicado para outros contextos)
@dataclass(frozen=True)
class TradeCompletedIntegrationEvent:
    """Evento publicado via message broker para outros bounded contexts."""
    event_id: str
    trade_reference: str  # ID simples, nao OrderId
    ticker: str           # string simples, nao Symbol
    price: float          # float simples, nao Money
    quantity: int
    currency: str
    timestamp: str        # ISO 8601 string
```

### 6.3 Event Sourcing

Event Sourcing e um padrao onde o **estado de um Aggregate e reconstruido** a partir de uma
sequencia de eventos, em vez de armazenar apenas o estado atual.

```
Abordagem Tradicional (CRUD):
+--------+       +--------+       +--------+
| Estado | ----> | Estado | ----> | Estado |
| v1     |       | v2     |       | v3     |
+--------+       +--------+       +--------+
  Apenas o ultimo estado e armazenado.

Event Sourcing:
+----------+    +----------+    +----------+    +----------+
| Evt 1    | -> | Evt 2    | -> | Evt 3    | -> | Evt 4    |
| OrderCre | -> | OrderSub | -> | OrderPar | -> | OrderFul |
| ated     |    | mitted   |    | tialFill |    | lFilled  |
+----------+    +----------+    +----------+    +----------+
  Todos os eventos sao armazenados. Estado e derivado.
```

**Beneficios para trading:**
- **Audit trail completo** -- essencial para compliance regulatoria
- **Replay de eventos** -- permite reconstruir o estado em qualquer ponto no tempo
- **Debugging** -- permite entender exatamente o que aconteceu
- **Analytics** -- eventos sao dados ricos para analise

**Desvantagens:**
- Complexidade de implementacao
- Event store especializado necessario
- Snapshots necessarios para performance
- Versionamento de eventos e desafiador

### 6.4 Padrao Outbox para Confiabilidade

Ao publicar Domain Events como Integration Events, o **Outbox Pattern** garante que a
persistencia do Aggregate e a publicacao do evento ocorram atomicamente:

```
+------------------------------------------+
|  TRANSACAO DO BANCO DE DADOS             |
|                                          |
|  1. UPDATE orders SET status = 'EXEC'    |
|  2. INSERT INTO outbox (event_data)      |
|                                          |
+------------------------------------------+
          |
          | (processo separado le outbox)
          v
+------------------------------------------+
|  OUTBOX PUBLISHER                        |
|                                          |
|  1. SELECT * FROM outbox WHERE sent = 0  |
|  2. Publica no Message Broker            |
|  3. UPDATE outbox SET sent = 1           |
|                                          |
+------------------------------------------+
          |
          v
    [Message Broker] --> [Consumers]
```

---

## 7. CQRS e Event Sourcing

### 7.1 CQRS (Command Query Responsibility Segregation)

CQRS separa o modelo de **escrita** (Commands) do modelo de **leitura** (Queries). E um
complemento natural ao DDD e Event Sourcing.

```
                    +-------------------+
                    |    API Layer      |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
    +-------------------+         +-------------------+
    |   COMMAND SIDE    |         |   QUERY SIDE      |
    |   (Write Model)   |         |   (Read Model)    |
    |                   |         |                   |
    | - Aggregates      |         | - Views/Projections|
    | - Domain Logic    |         | - Denormalized    |
    | - Invariantes     |         | - Optimized reads |
    | - Event Store     |         | - Read DB         |
    +-------------------+         +-------------------+
              |                             ^
              |      Domain Events          |
              +-----------------------------+
              (Projections atualizam read model)
```

### 7.2 Quando Usar CQRS + Event Sourcing

| Cenario                                     | CQRS | ES  | Ambos |
|---------------------------------------------|------|-----|-------|
| Leitura e escrita com padroes muito diferentes | Sim  | --  | --    |
| Necessidade de audit trail completo          | --   | Sim | Sim   |
| Dominio complexo com muitas regras           | Sim  | --  | Sim   |
| Alta escala de leitura, baixa escala escrita | Sim  | --  | --    |
| Requisitos regulatorios fortes (fintech)     | --   | Sim | Sim   |
| CRUD simples                                 | Nao  | Nao | Nao   |

---

## 8. Event Storming

### 8.1 O Que e Event Storming

Event Storming e uma **tecnica de workshop** criada por **Alberto Brandolini** em 2013 para
explorar e modelar dominios de negocio complexos de forma colaborativa. Usa sticky notes
coloridos em uma parede grande para visualizar fluxos de negocio.

### 8.2 Elementos do Event Storming

Cada cor de sticky note representa um conceito diferente:

```
+------------------+  +------------------+  +------------------+
| DOMAIN EVENT     |  | COMMAND          |  | AGGREGATE        |
| (Laranja)        |  | (Azul)           |  | (Amarelo)        |
|                  |  |                  |  |                  |
| "Algo que        |  | "Intencao do     |  | "Quem processa   |
|  aconteceu"      |  |  usuario"        |  |  o comando"      |
| Ex: OrderPlaced  |  | Ex: PlaceOrder   |  | Ex: Order        |
+------------------+  +------------------+  +------------------+

+------------------+  +------------------+  +------------------+
| ACTOR/USER       |  | READ MODEL       |  | EXTERNAL SYSTEM  |
| (Amarelo peq.)   |  | (Verde)          |  | (Rosa)           |
|                  |  |                  |  |                  |
| "Quem executa    |  | "Informacao que  |  | "Sistema         |
|  o comando"      |  |  o actor precisa"|  |  externo"        |
| Ex: Trader       |  | Ex: OrderBook    |  | Ex: Exchange API |
+------------------+  +------------------+  +------------------+

+------------------+  +------------------+
| POLICY           |  | HOTSPOT          |
| (Lilas)          |  | (Vermelho/Rosa)  |
|                  |  |                  |
| "Quando X,       |  | "Ponto de        |
|  entao Y"        |  |  conflito ou     |
| Ex: Whenever     |  |  duvida"         |
|  StopLossHit     |  |                  |
|  -> ClosePosition|  |                  |
+------------------+  +------------------+
```

### 8.3 Tres Niveis de Event Storming

#### Big Picture

- **Participantes:** 25-30 pessoas de diferentes areas
- **Objetivo:** Visao geral de todo o dominio, identificar subdominios e hotspots
- **Duracao:** 1 dia
- **Resultado:** Context Map de alto nivel, problemas e oportunidades identificados

#### Process Modeling

- **Participantes:** 8-12 pessoas (domain experts + desenvolvedores)
- **Objetivo:** Modelar um processo de negocio especifico em detalhe
- **Duracao:** Meio dia a 1 dia
- **Resultado:** Fluxo detalhado com commands, events, policies, read models

#### Software Design

- **Participantes:** 5-8 desenvolvedores
- **Objetivo:** Traduzir o process model em design de software
- **Duracao:** Algumas horas
- **Resultado:** Aggregates, Bounded Contexts, APIs definidas

### 8.4 Fluxo do Event Storming

```
Ator --> ve [Read Model] --> dispara [Command] --> processado por [Aggregate]
             --> gera [Domain Event] --> aciona [Policy] --> dispara [Command] ...

Exemplo de fluxo para o bot:

[Trader]
   |
   | ve
   v
[Dashboard com         [Submit         [Order           [OrderSubmitted]
 Cotacoes e Sinais] --> BuyOrder] ---> Aggregate] ----->
                                                         |
                                                         | aciona Policy
                                                         v
                                                    [RiskCheck Policy]
                                                         |
                                                         | dispara
                                                         v
                                                    [AssessRisk     [Risk
                                                     Command] ----> Aggregate]
                                                                      |
                                                                      v
                                                                [RiskApproved]
                                                                      |
                                                                      v
                                                                [SendToExchange
                                                                 Policy]
                                                                      |
                                                                      v
                                                                [SendOrder] --> [Exchange]
```

---

## 9. DDD com Microservices

### 9.1 O Alinhamento Natural

DDD e microservices compartilham um principio fundamental: **limites bem definidos**.

- **Bounded Context** = candidato natural para um **microservice boundary**
- **Context Map** = mapa de comunicacao entre microservicos
- **Ubiquitous Language** = contrato de cada servico

### 9.2 Decomposicao por Subdomain

O padrao "Decompose by Subdomain" de Chris Richardson usa DDD para guiar a decomposicao:

```
+---------------------------------------------------------------+
|                                                               |
|  Monolito                       Microservices (DDD-guided)    |
|                                                               |
|  +-------------------------+    +---------------+             |
|  | TradingModule           |    | trading-svc   | Core        |
|  | PortfolioModule         |    | portfolio-svc | Supporting  |
|  | RiskModule              | -> | risk-svc      | Core        |
|  | ReportingModule         |    | reporting-svc | Supporting  |
|  | NotificationModule      |    | notif-svc     | Supporting  |
|  | AuthModule              |    | auth-svc      | Generic     |
|  +-------------------------+    +---------------+             |
|                                                               |
|  Cada modulo se torna um servico alinhado ao seu BC.          |
+---------------------------------------------------------------+
```

### 9.3 Comunicacao Entre Contexts/Services

```
+-------------------+                    +-------------------+
|  Trading Service  |                    | Portfolio Service  |
|                   |                    |                   |
|  [Order Executed] |  Integration Event |  [Update Position]|
|  (Domain Event)   | ---- Kafka ------> |  (Event Handler)  |
|                   |                    |                   |
|  NUNCA acessa o   |                    |  NUNCA acessa o   |
|  banco do outro!  |                    |  banco do outro!  |
+-------------------+                    +-------------------+
```

**Principios:**
1. Cada microservico tem seu **proprio banco de dados** (database per service)
2. Comunicacao via **eventos asincronos** (preferred) ou **APIs sincronas** (quando necessario)
3. Cada servico e **autonomo** -- pode operar mesmo se outros estao fora
4. **Saga pattern** para transacoes distribuidas entre servicos

### 9.4 Armadilha: 1 Bounded Context != 1 Microservice (sempre)

Nem sempre e correto ter um microservico por Bounded Context. Regras praticas:

- **Comece com menos servicos** e divida quando necessario
- Se dois servicos precisam se comunicar constantemente, talvez devam ser um so
- Bounded Contexts muito pequenos podem gerar **overhead operacional** desproporcional
- Em equipes pequenas, um "modular monolith" com BCs claros pode ser mais adequado

---

## 10. Aplicacao Pratica

### 10.1 Estrutura de Pastas (Arquitetura Hexagonal + DDD)

A estrutura de pastas abaixo combina DDD com Arquitetura Hexagonal (Ports & Adapters):

```
src/
+-- trading/                          # Bounded Context: Trading
|   +-- domain/                       # CAMADA DE DOMINIO (pura, sem dependencias)
|   |   +-- model/
|   |   |   +-- order.py              # Aggregate Root: Order
|   |   |   +-- order_id.py           # Value Object: OrderId
|   |   |   +-- order_status.py       # Value Object: OrderStatus
|   |   |   +-- fill.py               # Entity interna do Aggregate
|   |   |   +-- money.py              # Value Object: Money
|   |   |   +-- symbol.py             # Value Object: Symbol
|   |   |   +-- quantity.py           # Value Object: Quantity
|   |   +-- events/
|   |   |   +-- order_submitted.py    # Domain Event
|   |   |   +-- order_executed.py     # Domain Event
|   |   |   +-- order_cancelled.py    # Domain Event
|   |   +-- services/
|   |   |   +-- risk_assessment.py    # Domain Service
|   |   |   +-- order_pricing.py      # Domain Service
|   |   +-- repositories/
|   |   |   +-- order_repository.py   # Interface (Port) do Repository
|   |   +-- factories/
|   |       +-- order_factory.py      # Factory
|   |
|   +-- application/                  # CAMADA DE APLICACAO (orquestracao)
|   |   +-- commands/
|   |   |   +-- submit_order.py       # Command + Handler
|   |   |   +-- cancel_order.py       # Command + Handler
|   |   +-- queries/
|   |   |   +-- get_order.py          # Query + Handler
|   |   |   +-- list_orders.py        # Query + Handler
|   |   +-- event_handlers/
|   |   |   +-- on_order_executed.py  # Reage a domain events
|   |   +-- ports/
|   |       +-- market_data_port.py   # Port para dados de mercado
|   |       +-- broker_port.py        # Port para execucao via broker
|   |
|   +-- infrastructure/              # CAMADA DE INFRAESTRUTURA (adapters)
|       +-- persistence/
|       |   +-- sqlalchemy_order_repo.py  # Adapter: Repository impl.
|       |   +-- order_model.py            # ORM Model
|       +-- messaging/
|       |   +-- kafka_event_publisher.py  # Adapter: Publicacao de eventos
|       +-- external/
|           +-- b3_broker_adapter.py      # Adapter: API da B3
|           +-- binance_adapter.py        # Adapter: API Binance
|           +-- broker_acl.py             # Anticorruption Layer
|
+-- portfolio/                        # Bounded Context: Portfolio
|   +-- domain/
|   +-- application/
|   +-- infrastructure/
|
+-- risk/                             # Bounded Context: Risk Management
|   +-- domain/
|   +-- application/
|   +-- infrastructure/
|
+-- shared/                           # Shared Kernel (minimizar!)
|   +-- kernel/
|       +-- money.py                  # Value Objects compartilhados
|       +-- event_bus.py              # Interface de event bus
|
+-- config/                           # Configuracao da aplicacao
+-- tests/                            # Testes (espelhando src/)
    +-- trading/
    |   +-- domain/
    |   +-- application/
    |   +-- infrastructure/
    +-- portfolio/
    +-- risk/
```

### 10.2 Dependency Rule

A regra fundamental de dependencia garante que camadas internas nunca dependam de externas:

```
+-----------------------------------------------------+
|                                                     |
|  Infrastructure --depends-on--> Application          |
|  Application    --depends-on--> Domain               |
|  Domain         --depends-on--> NADA (pura)          |
|                                                     |
|  Infrastructure  NUNCA <--depende-de-- Domain        |
|  Application     NUNCA <--depende-de-- Domain        |
|                                                     |
+-----------------------------------------------------+

  +-------------------+
  |    DOMAIN         |   Puros objetos Python. Sem imports de
  |    (centro)       |   frameworks, ORMs, HTTP, ou IO.
  +-------------------+
           ^
           |
  +-------------------+
  |   APPLICATION     |   Usa interfaces (Ports) definidas
  |   (orquestracao)  |   no Domain. Coordena use cases.
  +-------------------+
           ^
           |
  +-------------------+
  |  INFRASTRUCTURE   |   Implementa as interfaces (Adapters).
  |  (adapters)       |   SQLAlchemy, Kafka, HTTP clients.
  +-------------------+
```

### 10.3 Exemplo Completo: Submissao de Ordem

```python
# === DOMAIN LAYER ===

# domain/model/order.py
class Order:
    def __init__(self, order_id, symbol, side, order_type, quantity, price):
        self._id = order_id
        self._symbol = symbol
        self._side = side
        self._type = order_type
        self._quantity = quantity
        self._price = price
        self._status = OrderStatus.PENDING
        self._fills = []
        self._events = []

    def submit(self):
        if self._status != OrderStatus.PENDING:
            raise InvalidOrderState("Cannot submit non-pending order")
        self._status = OrderStatus.SUBMITTED
        self._events.append(OrderSubmitted(self._id, self._symbol))

    def add_fill(self, fill_price, fill_quantity):
        if self._status != OrderStatus.SUBMITTED:
            raise InvalidOrderState("Cannot fill non-submitted order")
        if self._total_filled + fill_quantity > self._quantity:
            raise OverfillError("Fill exceeds order quantity")

        fill = Fill(fill_price, fill_quantity)
        self._fills.append(fill)

        if self._total_filled == self._quantity:
            self._status = OrderStatus.FILLED
            self._events.append(OrderFilled(self._id, self.average_fill_price))
        else:
            self._status = OrderStatus.PARTIALLY_FILLED
            self._events.append(OrderPartiallyFilled(self._id, fill))

    @property
    def _total_filled(self):
        return sum(f.quantity for f in self._fills)

    @property
    def domain_events(self):
        return list(self._events)

    def clear_events(self):
        self._events.clear()


# === APPLICATION LAYER ===

# application/commands/submit_order.py
@dataclass(frozen=True)
class SubmitOrderCommand:
    portfolio_id: str
    symbol: str
    side: str
    order_type: str
    quantity: int
    price: float

class SubmitOrderHandler:
    def __init__(self, order_repo, portfolio_repo, risk_service,
                 event_publisher):
        self._order_repo = order_repo
        self._portfolio_repo = portfolio_repo
        self._risk_service = risk_service
        self._events = event_publisher

    def handle(self, cmd: SubmitOrderCommand):
        # Reconstituir objetos de dominio
        portfolio = self._portfolio_repo.find_by_id(cmd.portfolio_id)
        order = OrderFactory.create(cmd)

        # Delegar logica ao dominio
        risk = self._risk_service.assess(order, portfolio)
        if not risk.approved:
            raise OrderRejectedError(risk.reason)

        order.submit()

        # Persistir e publicar
        self._order_repo.save(order)
        for event in order.domain_events:
            self._events.publish(event)
        order.clear_events()

        return order.id


# === INFRASTRUCTURE LAYER ===

# infrastructure/persistence/sqlalchemy_order_repo.py
class SqlAlchemyOrderRepository(OrderRepository):
    def __init__(self, session):
        self._session = session

    def save(self, order):
        model = OrderMapper.to_persistence(order)
        self._session.merge(model)
        self._session.flush()

    def find_by_id(self, order_id):
        row = self._session.query(OrderModel).get(str(order_id))
        return OrderMapper.to_domain(row) if row else None
```

---

## 11. DDD no Contexto de Trading e Fintech

### 11.1 Desafios Especificos do Dominio Financeiro

O dominio financeiro traz desafios unicos que tornam DDD particularmente relevante:

1. **Precisao monetaria:** Operacoes financeiras exigem precisao de centavos. Value Objects
   como `Money` devem usar `Decimal`, nunca `float`.

2. **Audit trail:** Regulamentacoes exigem rastreabilidade total. Event Sourcing e natural.

3. **Concorrencia:** Ordens podem ser executadas simultaneamente. Aggregates devem proteger
   invariantes sob alta concorrencia.

4. **Multiplas exchanges:** Cada exchange e um sistema externo com API propria. ACLs sao
   essenciais.

5. **Time zones e market hours:** Logica de dominio depende de calendarios de mercado.

6. **Regulamentacao:** Regras de compliance variam por jurisdicao e mudam frequentemente.

### 11.2 Modelo de Dominio para Trading

```
+-------------------------------------------------------------------+
|                CORE DOMAIN: Trading Engine                         |
|                                                                   |
|  Aggregates:                                                      |
|                                                                   |
|  Order                    Position                                |
|  +------------------+    +------------------+                     |
|  | orderId          |    | positionId       |                     |
|  | portfolioId (ref)|    | portfolioId (ref)|                     |
|  | symbol           |    | symbol           |                     |
|  | side (BUY/SELL)  |    | side (LONG/SHORT)|                     |
|  | type (MKT/LMT)   |    | quantity         |                     |
|  | quantity         |    | averagePrice     |                     |
|  | limitPrice       |    | currentPrice     |                     |
|  | stopPrice        |    | unrealizedPnL    |                     |
|  | status           |    | stopLoss         |                     |
|  | fills: [Fill]    |    | takeProfit       |                     |
|  +------------------+    +------------------+                     |
|                                                                   |
|  Strategy                 Signal                                  |
|  +------------------+    +------------------+                     |
|  | strategyId       |    | signalId         |                     |
|  | name             |    | strategyId (ref) |                     |
|  | parameters       |    | symbol           |                     |
|  | status           |    | direction        |                     |
|  | riskLimits       |    | strength         |                     |
|  +------------------+    | timestamp        |                     |
|                          +------------------+                     |
|                                                                   |
|  Value Objects:                                                   |
|  Money, Symbol, Quantity, Price, Side, OrderType,                 |
|  OrderStatus, PositionStatus, RiskLevel, TimeInForce              |
|                                                                   |
|  Domain Events:                                                   |
|  OrderSubmitted, OrderExecuted, OrderCancelled,                   |
|  OrderRejected, PositionOpened, PositionClosed,                   |
|  StopLossTriggered, TakeProfitTriggered,                          |
|  SignalGenerated, StrategyActivated                               |
|                                                                   |
+-------------------------------------------------------------------+
```

### 11.3 Money Pattern em Detalhe

O tratamento de dinheiro e critico em sistemas financeiros. O padrao Money resolve:

```python
from decimal import Decimal, ROUND_HALF_UP

@dataclass(frozen=True)
class Money:
    """Value Object para operacoes monetarias com precisao."""
    amount: Decimal
    currency: Currency

    def __post_init__(self):
        if not isinstance(self.amount, Decimal):
            object.__setattr__(self, 'amount',
                             Decimal(str(self.amount)))

    def add(self, other: 'Money') -> 'Money':
        self._assert_same_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: 'Money') -> 'Money':
        self._assert_same_currency(other)
        return Money(self.amount - other.amount, self.currency)

    def multiply(self, factor: Decimal) -> 'Money':
        result = self.amount * Decimal(str(factor))
        return Money(result.quantize(Decimal('0.01'),
                     rounding=ROUND_HALF_UP), self.currency)

    def allocate(self, ratios: list[int]) -> list['Money']:
        """Distribui dinheiro por ratios sem perder centavos."""
        total_ratio = sum(ratios)
        results = []
        remainder = self.amount

        for i, ratio in enumerate(ratios):
            if i == len(ratios) - 1:
                results.append(Money(remainder, self.currency))
            else:
                share = (self.amount * ratio / total_ratio).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP)
                results.append(Money(share, self.currency))
                remainder -= share

        return results

    def _assert_same_currency(self, other: 'Money'):
        if self.currency != other.currency:
            raise CurrencyMismatchError(
                f"Cannot operate on {self.currency} and {other.currency}")
```

### 11.4 FINOS Common Domain Model

A **FINOS (Fintech Open Source Foundation)** criou o **Common Domain Model (CDM)** -- um
modelo de dominio padronizado e executavel para transacoes financeiras. Cobre:

- Derivatives, bonds, repos, securities lending
- Lifecycle events (trade execution, settlement, clearing)
- Legal agreements

Este modelo padrao pode servir como **Published Language** para integracao entre sistemas.

### 11.5 Fluxo de Ordem Completo (Event-Driven)

```
[Signal Generated]
      |
      v
+--Strategy Context--+     +--Trading Context--+     +--Risk Context--+
|                    |     |                    |     |                |
| Signal.evaluate()  |     |                    |     |                |
| --> SignalApproved  | --> | Order.create()     |     |                |
|                    |     | Order.submit()     |     |                |
+--------------------+     | --> OrderSubmitted  | --> | Risk.assess()  |
                           |                    |     | --> RiskApproved|
                           +--------------------+     +--------+-------+
                                    ^                          |
                                    |                          |
                                    +--------------------------+
                                    |
                           +--------v-----------+
                           | Order.sendToExch() |
                           | --> OrderSent       |
                           +--------+-----------+
                                    |
                           [Exchange executa]
                                    |
                           +--------v-----------+     +--Portfolio Ctx-+
                           | Order.addFill()    |     |                |
                           | --> OrderFilled     | --> | Position.open()|
                           +--------------------+     | Balance.debit()|
                                                      +----------------+
```

---

## 12. Anti-Patterns e Quando NAO Usar DDD

### 12.1 Anti-Patterns Comuns

#### 12.1.1 Anemic Domain Model
**Problema:** Objetos de dominio sao meros containers de dados. Toda logica esta em servicos.
**Solucao:** Mover logica de negocio para dentro das entidades e value objects.

#### 12.1.2 Aggregate Gigante
**Problema:** Um Aggregate contem dezenas de entidades e e carregado inteiramente a cada
operacao, causando problemas de performance e contencao.
**Solucao:** Aplicar Regra 2 de Vernon: design small aggregates. Separar entidades em seus
proprios aggregates quando possivel.

#### 12.1.3 Pular o Strategic Design
**Problema:** Equipe comeca implementando Entities e Repositories sem entender subdominios
ou bounded contexts. Resultado: um "big ball of mud".
**Solucao:** Comece pelo strategic design. Use Event Storming para descobrir o dominio.

#### 12.1.4 DDD Dogmatico
**Problema:** Aplicar todos os patterns de DDD a tudo, mesmo CRUD simples. Resultado:
complexidade acidental massiva.
**Solucao:** Use DDD onde ha complexidade de dominio. CRUD simples nao precisa de Aggregates.

#### 12.1.5 Ignorar o Domain Expert
**Problema:** Desenvolvedores modelam o dominio sozinhos, sem consultar especialistas.
Resultado: modelo que nao reflete a realidade do negocio.
**Solucao:** Sessoes regulares com domain experts. Event Storming. Ubiquitous Language real.

#### 12.1.6 Shared Kernel Descontrolado
**Problema:** O "shared kernel" cresce descontroladamente e se torna um monolito disfarjado.
**Solucao:** Shared Kernel deve ser minimizado. Pergunte-se: "Posso duplicar isso ao inves
de compartilhar?"

#### 12.1.7 Repository para Tudo
**Problema:** Criar repositories para entities internas do aggregate ou para value objects.
**Solucao:** Um repository por aggregate root. Entidades internas sao acessadas apenas via
aggregate root.

#### 12.1.8 Linguagem Ambigua
**Problema:** O mesmo termo ("Order") significa coisas diferentes em diferentes partes do
sistema, mas nao ha Bounded Contexts para separar os significados.
**Solucao:** Defina Bounded Contexts com linguagens distintas.

### 12.2 Quando NAO Usar DDD

DDD nao e a solucao para todos os problemas. **NAO use DDD quando:**

1. **O dominio e simples:** Aplicacoes CRUD basicas, APIs de proxy, servicos de utilidade.
   DDD adiciona complexidade desnecessaria.

2. **Nao ha acesso a domain experts:** DDD depende fundamentalmente de domain experts. Sem
   eles, o modelo sera uma adivinhacao.

3. **O time e muito pequeno e inexperiente:** DDD tem curva de aprendizado. Um time de 2
   juniors pode nao se beneficiar.

4. **Prototipo ou MVP descartavel:** Se o codigo sera reescrito em breve, a abstracoes de
   DDD sao overhead.

5. **Dominio bem estabelecido com solucoes prontas:** Se existe software pronto que resolve
   o problema, nao reinvente.

```
+--------------------------------------------------------------+
|                                                              |
|  Complexidade do Dominio   vs   Abordagem Recomendada        |
|                                                              |
|  [Baixa]  CRUD puro         --> Transaction Script           |
|  [Media]  Regras moderadas   --> Active Record / Table Module |
|  [Alta]   Regras complexas   --> Domain Model (DDD)           |
|  [Mto Alta] + Auditoria     --> Domain Model + Event Sourcing|
|                                                              |
+--------------------------------------------------------------+
```

---

## 13. Implicacoes para o Bot de Investimentos

### 13.1 Recomendacoes Estrategicas

Baseado em toda a analise acima, as seguintes recomendacoes se aplicam ao bot:

#### Identificacao de Subdominios

| Subdominio              | Tipo        | Abordagem                        |
|-------------------------|-------------|----------------------------------|
| Trading Engine          | Core        | Domain Model + Event Sourcing    |
| Strategy Execution      | Core        | Domain Model                     |
| Risk Management         | Core        | Domain Model                     |
| Portfolio Management    | Supporting  | Domain Model (simplificado)      |
| Market Data Ingestion   | Supporting  | Ports & Adapters (sem DDD full)  |
| Notifications           | Supporting  | Transaction Script               |
| User Management         | Generic     | Solucao pronta (auth library)    |
| Logging / Monitoring    | Generic     | Solucao pronta (OpenTelemetry)   |

#### Bounded Contexts Sugeridos

1. **Trading Context** -- Core. Order lifecycle, execucao, fills.
2. **Strategy Context** -- Core. Sinais, parametros, backtesting.
3. **Risk Context** -- Core. Limites, VaR, drawdown, exposure.
4. **Portfolio Context** -- Supporting. Posicoes, saldos, PnL.
5. **Market Data Context** -- Supporting. Cotacoes, orderbook, historico.
6. **Notification Context** -- Supporting. Alertas, relatorios.
7. **Gateway Context** -- Integration. Adapters para exchanges (ACL).

#### Context Map

```
     +---Strategy---+  events  +---Trading---+  events  +---Portfolio---+
     |   Context    |--------->|   Context   |--------->|    Context    |
     | (Core)       |          | (Core)      |          | (Supporting)  |
     +--------------+          +------+------+          +---------------+
                                      |
                                      | sync API
                                      v
                               +------+------+  events  +---Notif.---+
                               |    Risk     |--------->|  Context   |
                               |   Context   |          | (Support.) |
                               | (Core)      |          +------------+
                               +------+------+
                                      |
                                      | ACL
                                      v
                               +------+------+
                               |   Gateway   |  Conformist / ACL
                               |   Context   |  com exchanges externas
                               | (Integr.)   |
                               +------+------+
                                      |
                          +-----------+-----------+
                          |           |           |
                        [B3]     [Binance]     [IBKR]
```

### 13.2 Decisoes de Arquitetura

1. **Comece com Modular Monolith:** Para um bot com equipe pequena, comece com um monolito
   modular onde cada Bounded Context e um modulo com fronteiras claras. Extraia microservices
   apenas quando necessario.

2. **Event Sourcing no Trading Context:** O lifecycle de ordens e positions se beneficia
   enormemente de Event Sourcing para audit trail e replay.

3. **CQRS no Portfolio Context:** Leituras frequentes (dashboard) vs escritas esporadicas
   (trades) justificam separacao de modelos.

4. **ACL para todas as exchanges:** Cada exchange deve ser isolada atras de uma
   Anticorruption Layer que traduz para o modelo de dominio interno.

5. **Domain Events entre contexts:** Use um event bus in-memory no monolito modular. Se
   extrair microservices, migre para Kafka/RabbitMQ.

### 13.3 Ubiquitous Language do Bot

| Termo               | Definicao no Contexto do Bot                           |
|----------------------|--------------------------------------------------------|
| Order                | Instrucao de compra ou venda de um ativo                |
| Position             | Exposicao aberta em um ativo (long ou short)            |
| Portfolio            | Conjunto de posicoes e saldo de caixa                   |
| Fill                 | Execucao parcial ou total de uma ordem                  |
| Signal               | Indicacao gerada por estrategia para acao               |
| Strategy             | Algoritmo parametrizavel de geracao de sinais           |
| Stop Loss            | Preco-limite para encerramento automatico de posicao    |
| Take Profit          | Preco-alvo para realizacao automatica de lucro          |
| Drawdown             | Reducao percentual do pico ao vale do portfolio         |
| VaR (Value at Risk)  | Estimativa da perda maxima em um periodo de confianca   |
| Exposure             | Valor total em risco em uma ou mais posicoes            |
| Rebalance            | Ajuste das posicoes para realinhar ao target allocation  |
| Slippage             | Diferenca entre preco esperado e preco executado         |
| Market Data          | Dados de cotacao, volume, book de ofertas em tempo real  |

---

## 14. Referencias Bibliograficas

### 14.1 Livros Fundamentais (As "Biblias")

| # | Titulo | Autor(es) | Ano | Tipo | Alcunha |
|---|--------|-----------|-----|------|---------|
| 1 | *Domain-Driven Design: Tackling Complexity in the Heart of Software* | Eric Evans | 2003 | Livro | Blue Book |
| 2 | *Implementing Domain-Driven Design* | Vaughn Vernon | 2013 | Livro | Red Book |
| 3 | *Domain-Driven Design Distilled* | Vaughn Vernon | 2016 | Livro | -- |
| 4 | *Learning Domain-Driven Design: Aligning Software Architecture and Business Strategy* | Vlad Khononov | 2021 | Livro | -- |
| 5 | *Patterns, Principles, and Practices of Domain-Driven Design* | Scott Millett, Nick Tune | 2015 | Livro | -- |
| 6 | *Introducing EventStorming* | Alberto Brandolini | 2021 | Livro (Leanpub) | -- |

### 14.2 Artigos e Papers

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 7 | *Effective Aggregate Design (3 partes)* | Vaughn Vernon | 2011 | Artigo | https://www.dddcommunity.org/library/vernon_2011/ |
| 8 | *DDD Reference* | Eric Evans | 2015 | Referencia | https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf |
| 9 | *Strategic Domain Driven Design with Context Mapping* | Alberto Brandolini | 2009 | Artigo | https://www.infoq.com/articles/ddd-contextmapping/ |
| 10 | *Anemic Domain Model* | Martin Fowler | 2003 | Artigo (bliki) | https://martinfowler.com/bliki/AnemicDomainModel.html |
| 11 | *Bounded Context* | Martin Fowler | 2014 | Artigo (bliki) | https://martinfowler.com/bliki/BoundedContext.html |
| 12 | *Domain Events vs. Integration Events* | Cesar de la Torre | 2017 | Artigo | https://devblogs.microsoft.com/cesardelatorre/domain-events-vs-integration-events-in-domain-driven-design-and-microservices-architectures/ |

### 14.3 Recursos Online e Guias

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 13 | *Using tactical DDD to design microservices* | Microsoft | 2023 | Guia | https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-ddd |
| 14 | *Domain analysis for microservices* | Microsoft | 2023 | Guia | https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis |
| 15 | *DDD, Hexagonal, Onion, Clean, CQRS -- How I Put It All Together* | Herberto Graca | 2017 | Artigo | https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/ |
| 16 | *Domain-Driven Hexagon (GitHub)* | Sairyss | 2023 | Repositorio | https://github.com/Sairyss/domain-driven-hexagon |
| 17 | *Aggregate Design Rules (Vernon's Red Book)* | ArchiLab | 2023 | Artigo | https://www.archi-lab.io/infopages/ddd/aggregate-design-rules-vernon.html |
| 18 | *Decompose by Subdomain* | Chris Richardson | 2023 | Pattern | https://microservices.io/patterns/decomposition/decompose-by-subdomain.html |
| 19 | *EventStorming.com* | Alberto Brandolini | 2013+ | Website | https://www.eventstorming.com/ |
| 20 | *DDD in Fintech -- Trading Application Example* | InfoQ | 2015 | Artigo | https://www.infoq.com/news/2015/03/ddd-trading-example/ |

### 14.4 Talks e Apresentacoes

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 21 | *Practical DDD: Bounded Contexts + Events => Microservices* | Indu Alagarsamy | 2018 | Talk (InfoQ) | https://www.infoq.com/presentations/microservices-ddd-bounded-contexts/ |
| 22 | *Eric Evans Encourages DDD Practitioners to Experiment with LLMs* | InfoQ | 2024 | News/Talk | https://www.infoq.com/news/2024/03/Evans-ddd-experiment-llm/ |

### 14.5 Modelos de Referencia

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 23 | *FINOS Common Domain Model (CDM)* | FINOS Foundation | 2023+ | Standard | https://www.icmagroup.org/market-practice-and-regulatory-policy/repo-and-collateral-markets/fintech/common-domain-model-cdm/ |
| 24 | *Context Mapper DSL* | Context Mapper | 2023+ | Ferramenta | https://contextmapper.org/ |

---

> **Nota Final:** Este documento deve ser tratado como referencia viva. A medida que o bot
> de investimentos evolui, o modelo de dominio, os bounded contexts e as decisoes arquiteturais
> devem ser revisitados e refinados continuamente -- essa e a essencia de Domain-Driven Design.
