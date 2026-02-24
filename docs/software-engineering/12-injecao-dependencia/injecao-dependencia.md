# Injecao de Dependencia (DI) e Inversao de Controle (IoC)

## Guia Definitivo -- Nivel PhD

**Autor:** Lucas Campanini (com assistencia de IA)
**Data:** Fevereiro 2026
**Versao:** 1.0

---

## Sumario

1. [Fundamentos Filosoficos e Historicos](#1-fundamentos-filosoficos-e-historicos)
2. [O Principio da Inversao de Dependencia (DIP -- SOLID)](#2-o-principio-da-inversao-de-dependencia-dip--solid)
3. [Inversao de Controle (IoC)](#3-inversao-de-controle-ioc)
4. [Injecao de Dependencia (DI)](#4-injecao-de-dependencia-di)
5. [Tipos de Injecao](#5-tipos-de-injecao)
6. [IoC Containers e Lifecycle Management](#6-ioc-containers-e-lifecycle-management)
7. [Composition Root](#7-composition-root)
8. [Pure DI -- DI sem Framework](#8-pure-di--di-sem-framework)
9. [Frameworks e Bibliotecas por Linguagem](#9-frameworks-e-bibliotecas-por-linguagem)
10. [Design Patterns Relacionados](#10-design-patterns-relacionados)
11. [Anti-Patterns](#11-anti-patterns)
12. [Testabilidade](#12-testabilidade)
13. [Aplicacao ao Trading Bot](#13-aplicacao-ao-trading-bot)
14. [Livros Fundamentais](#14-livros-fundamentais)
15. [Referencias Completas](#15-referencias-completas)

---

## 1. Fundamentos Filosoficos e Historicos

### 1.1 A Genese do Conceito

O conceito de Inversao de Controle nao nasceu com frameworks modernos. Suas raizes
remontam ao **Principio de Hollywood** ("Don't call us, we'll call you"), utilizado
em frameworks de GUI nos anos 1980. A ideia era simples: o framework chama o seu
codigo, nao o contrario.

Em **2004**, Martin Fowler publicou o artigo seminal **"Inversion of Control Containers
and the Dependency Injection pattern"**, que cunhou o termo "Dependency Injection" como
conhecemos hoje. Antes disso, o conceito era vagamente agrupado sob o guarda-chuva de
"Inversion of Control", mas Fowler percebeu que IoC era generico demais -- quase todo
framework faz alguma inversao de controle. O nome "Dependency Injection" descreve
precisamente **o que** esta sendo invertido: a obtencao de dependencias.

### 1.2 A Hierarquia Conceitual

```
+------------------------------------------------------------------+
|                    PRINCIPIOS (SOLID)                             |
|                                                                  |
|  S - Single Responsibility                                       |
|  O - Open/Closed                                                 |
|  L - Liskov Substitution                                         |
|  I - Interface Segregation                                       |
|  D - DEPENDENCY INVERSION PRINCIPLE  <-- O PRINCIPIO             |
+------------------------------------------------------------------+
          |
          | inspira
          v
+------------------------------------------------------------------+
|             INVERSAO DE CONTROLE (IoC)                           |
|       "O principio geral de inverter o fluxo de controle"        |
|                                                                  |
|   Implementacoes:                                                |
|   - Dependency Injection  <-- O PADRAO                           |
|   - Service Locator                                              |
|   - Template Method                                              |
|   - Strategy Pattern                                             |
|   - Event-driven / Observer                                      |
+------------------------------------------------------------------+
          |
          | implementado via
          v
+------------------------------------------------------------------+
|           INJECAO DE DEPENDENCIA (DI)                            |
|     "O mecanismo especifico para fornecer dependencias"          |
|                                                                  |
|   Tipos:                                                         |
|   - Constructor Injection (PREFERIDO)                            |
|   - Setter/Property Injection                                    |
|   - Interface Injection                                          |
|   - Method Injection                                             |
+------------------------------------------------------------------+
          |
          | gerenciado por
          v
+------------------------------------------------------------------+
|              IoC CONTAINER (Opcional)                             |
|        "O framework que automatiza a injecao"                    |
|                                                                  |
|   - Registro de dependencias                                     |
|   - Resolucao automatica                                         |
|   - Lifecycle management                                         |
|   - Auto-wiring                                                  |
+------------------------------------------------------------------+
```

### 1.3 Distincao Crucial: DIP vs IoC vs DI

| Conceito | O que e | Nivel |
|----------|---------|-------|
| **DIP** (Dependency Inversion Principle) | Um **principio** de design (o "D" do SOLID) | Teoria/Principio |
| **IoC** (Inversion of Control) | Um **conceito arquitetural** geral | Padrao Arquitetural |
| **DI** (Dependency Injection) | Uma **tecnica especifica** para implementar IoC | Padrao de Implementacao |
| **IoC Container** | Uma **ferramenta** que automatiza DI | Infraestrutura |

> **Analogia:** DIP e a *lei da fisica*. IoC e a *engenharia* que aplica essa lei.
> DI e a *tecnica construtiva* especifica. O Container e a *ferramenta eletrica*
> que facilita a construcao.

---

## 2. O Principio da Inversao de Dependencia (DIP -- SOLID)

### 2.1 Definicao de Robert C. Martin

O DIP, formulado por Robert C. Martin ("Uncle Bob"), possui **duas regras**:

> **Regra 1:** Modulos de alto nivel NAO devem depender de modulos de baixo nivel.
> Ambos devem depender de abstracoes.
>
> **Regra 2:** Abstracoes NAO devem depender de detalhes.
> Detalhes devem depender de abstracoes.

### 2.2 Diagrama: Antes e Depois do DIP

**ANTES (violando DIP) -- Acoplamento Direto:**

```
+-------------------+          +--------------------+
|   OrderService    |--------->|  MySQLDatabase     |
|   (alto nivel)    |          |  (baixo nivel)     |
+-------------------+          +--------------------+
        |
        |  depende diretamente de
        v
+-------------------+
|  EmailSender      |
|  (baixo nivel)    |
+-------------------+

Problema: OrderService conhece e depende das implementacoes concretas.
Se mudar o banco de MySQL para PostgreSQL, OrderService quebra.
```

**DEPOIS (aplicando DIP) -- Dependendo de Abstracoes:**

```
+-------------------+          +--------------------+
|   OrderService    |--------->| <<interface>>      |
|   (alto nivel)    |          | IDatabase          |
+-------------------+          +--------------------+
                                       ^
                                       | implementa
                               +--------------------+
                               |  MySQLDatabase     |
                               +--------------------+
                               |  PostgreSQLDatabase|
                               +--------------------+

+-------------------+          +--------------------+
|   OrderService    |--------->| <<interface>>      |
|                   |          | INotificationSender|
+-------------------+          +--------------------+
                                       ^
                                       | implementa
                               +--------------------+
                               |  EmailSender       |
                               +--------------------+
                               |  SMSSender         |
                               +--------------------+

Solucao: OrderService depende de abstracoes (interfaces).
Implementacoes concretas sao intercambiaveis.
```

### 2.3 Relacao com Outros Principios SOLID

Martin equiparou o DIP como uma "combinacao de primeira classe" do **Open/Closed
Principle** (software aberto para extensao, fechado para modificacao) e do **Liskov
Substitution Principle** (subtipos devem ser substituiveis por seus tipos base).
O DIP e tao fundamental que merece seu proprio nome, pois e o mecanismo que
*viabiliza* OCP e LSP na pratica.

---

## 3. Inversao de Controle (IoC)

### 3.1 Definicao

Inversao de Controle e o principio pelo qual o **fluxo de controle de um programa
e invertido** em relacao a programacao procedural tradicional.

Na programacao tradicional:
- SEU codigo chama bibliotecas
- SEU codigo controla o fluxo

Com IoC:
- O FRAMEWORK chama seu codigo
- O FRAMEWORK controla o fluxo

### 3.2 Martin Fowler e a Clarificacao

Fowler percebeu que "Inversao de Controle" era um termo muito vago. Todo framework,
por definicao, inverte algum controle. A pergunta correta e: **"Que aspecto do
controle esta sendo invertido?"**

No caso da Dependency Injection, o aspecto invertido e: **como um componente
obtem suas dependencias**. Em vez de o componente buscar ou criar suas dependencias
(controle normal), as dependencias sao *fornecidas* a ele (controle invertido).

### 3.3 Formas de IoC

```
                     Inversao de Controle (IoC)
                              |
          +-------------------+-------------------+
          |                   |                   |
   Dependency             Template            Eventos /
   Injection              Method              Observer
          |                   |                   |
   "Quem fornece         "Quem define         "Quem decide
    dependencias?"         o algoritmo?"        quando notificar?"
          |                   |                   |
   O container /          A superclasse        O publisher
   o chamador             define o             decide
   fornece                esqueleto            quando chamar
```

---

## 4. Injecao de Dependencia (DI)

### 4.1 Definicao Precisa (Fowler, 2004)

> "Dependency Injection e um padrao onde um objeto separado (assembler) popula
> um campo na classe cliente com uma implementacao apropriada, invertendo o
> controle sobre como as dependencias sao obtidas."

### 4.2 O Problema Que DI Resolve

**Sem DI (acoplamento forte):**

```python
class TradingBot:
    def __init__(self):
        # O bot CRIA suas proprias dependencias
        self.broker = BinanceBroker()           # Acoplado a Binance
        self.data = YahooFinanceData()          # Acoplado a Yahoo
        self.risk = SimpleRiskManager()         # Acoplado a implementacao
        self.db = PostgreSQLRepository()        # Acoplado a PostgreSQL

    def execute(self):
        data = self.data.get_prices("BTCUSDT")
        if self.risk.can_trade(data):
            self.broker.place_order(...)
```

**Problemas:**
1. Impossivel testar sem se conectar a Binance, Yahoo, PostgreSQL
2. Impossivel trocar Binance por outra exchange sem modificar TradingBot
3. Impossivel rodar backtests com dados historicos
4. Violacao do Single Responsibility Principle (TradingBot sabe criar tudo)
5. Violacao do Open/Closed Principle (precisa alterar TradingBot para cada mudanca)

**Com DI (acoplamento fraco):**

```python
from abc import ABC, abstractmethod

class IBrokerAdapter(ABC):
    @abstractmethod
    def place_order(self, order: Order) -> OrderResult: ...

class IMarketDataProvider(ABC):
    @abstractmethod
    def get_prices(self, symbol: str) -> PriceData: ...

class IRiskManager(ABC):
    @abstractmethod
    def can_trade(self, data: PriceData) -> bool: ...

class TradingBot:
    def __init__(
        self,
        broker: IBrokerAdapter,           # Depende da ABSTRACAO
        data: IMarketDataProvider,        # Depende da ABSTRACAO
        risk: IRiskManager,               # Depende da ABSTRACAO
    ):
        self.broker = broker
        self.data = data
        self.risk = risk

    def execute(self):
        data = self.data.get_prices("BTCUSDT")
        if self.risk.can_trade(data):
            self.broker.place_order(...)
```

**Beneficios:**
1. Testavel: injete mocks para testar sem conexoes externas
2. Flexivel: troque Binance por Bybit sem alterar TradingBot
3. Backtestavel: injete HistoricalDataProvider em vez de LiveDataProvider
4. SRP: TradingBot faz apenas orquestracao
5. OCP: novas exchanges = novas implementacoes, zero mudanca no bot

### 4.3 Os Tres Atores do DI

```
+------------------+     +------------------+     +------------------+
|    CLIENTE       |     |   SERVICO        |     |   INJETOR        |
|  (Consumer)      |     |  (Dependency)    |     |  (Assembler)     |
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| - Usa o servico  |     | - Implementa a  |     | - Cria o servico |
| - NAO cria o     |     |   interface      |     | - Injeta no      |
|   servico        |     | - NAO sabe quem  |     |   cliente        |
| - NAO sabe qual  |     |   o usa          |     | - Gerencia       |
|   implementacao  |     |                  |     |   lifecycle      |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
        |                        ^                        |
        |    "preciso de um      |    "aqui esta a        |
        |     IService"          |     implementacao"     |
        +------------------------+------------------------+
```

---

## 5. Tipos de Injecao

### 5.1 Constructor Injection (PREFERIDO)

As dependencias sao fornecidas atraves do construtor da classe.

```python
class OrderProcessor:
    def __init__(
        self,
        repository: IOrderRepository,
        validator: IOrderValidator,
        notifier: INotificationService,
    ):
        # Dependencias sao IMUTAVEIS apos construcao
        self._repository = repository
        self._validator = validator
        self._notifier = notifier
```

**Vantagens:**
- Dependencias sao **explicitas** -- basta olhar o construtor
- Dependencias sao **imutaveis** (podem ser `final`/`readonly`)
- Objeto e **sempre valido** apos construcao (nao existe estado parcial)
- **Compile-time safety** -- erros sao detectados cedo
- **Facil de testar** -- passe mocks no construtor
- Sinaliza **Constructor Over-injection** quando ha dependencias demais (> 3-4),
  indicando violacao de SRP

**Desvantagens:**
- Pode resultar em construtores longos (mas isso e um SINAL, nao um problema)
- Todas as dependencias devem existir no momento da construcao

**Quando usar:** SEMPRE como primeira opcao. E o padrao recomendado por Seemann,
Fowler, e praticamente toda a literatura.

### 5.2 Setter/Property Injection

As dependencias sao fornecidas atraves de metodos setter apos a construcao.

```python
class OrderProcessor:
    def __init__(self):
        self._logger = None  # Dependencia OPCIONAL

    @property
    def logger(self) -> ILogger:
        return self._logger

    @logger.setter
    def logger(self, value: ILogger):
        self._logger = value
```

**Vantagens:**
- Permite dependencias **opcionais**
- Permite alterar dependencias em runtime
- Util para **configuracao tardia**

**Desvantagens:**
- Objeto pode estar em **estado invalido** (dependencia nao setada)
- **Temporal coupling** -- ordem de chamada importa
- Dependencias sao **mutaveis** (qualquer um pode trocar)
- Dependencias ficam **escondidas** (nao aparecem no construtor)

**Quando usar:** Apenas para dependencias genuinamente opcionais (ex: logger
com fallback para NullLogger).

### 5.3 Interface Injection

O componente implementa uma interface que o container usa para injetar a dependencia.

```python
class IMessageSenderAware(ABC):
    @abstractmethod
    def set_message_sender(self, sender: IMessageSender): ...

class OrderProcessor(IMessageSenderAware):
    def set_message_sender(self, sender: IMessageSender):
        self._sender = sender
```

**Vantagens:**
- O contrato de injecao e explicito na interface
- Util em frameworks como Avalon (historico)

**Desvantagens:**
- **Invasivo** -- polui a interface da classe
- Pouco usado na pratica moderna
- Adiciona complexidade sem beneficio claro sobre constructor injection

**Quando usar:** Raramente. Historicamente usado em frameworks Java (Avalon).
Praticamente obsoleto.

### 5.4 Method Injection

A dependencia e fornecida como parametro do metodo que a utiliza.

```python
class PriceAnalyzer:
    def analyze(
        self,
        symbol: str,
        data_provider: IMarketDataProvider,  # Injetado por metodo
    ) -> AnalysisResult:
        prices = data_provider.get_prices(symbol)
        return self._process(prices)
```

**Vantagens:**
- Dependencia visivel exatamente onde e usada
- Permite diferentes implementacoes por chamada
- Util quando a dependencia varia entre invocacoes

**Desvantagens:**
- Polui a assinatura do metodo
- Transfere a responsabilidade para o chamador
- Pode indicar que a dependencia deveria ser do construtor

**Quando usar:** Quando a dependencia muda entre chamadas ao mesmo metodo,
ou em padroes como Strategy selecionado dinamicamente.

### 5.5 Tabela Comparativa

```
+---------------------+---------------+-----------+-----------+----------+
| Criterio            | Constructor   | Setter    | Interface | Method   |
+---------------------+---------------+-----------+-----------+----------+
| Imutabilidade       | SIM           | NAO       | NAO       | N/A      |
| Obrigatoriedade     | OBRIGATORIO   | OPCIONAL  | OBRIGAT.  | POR CALL |
| Visibilidade        | ALTA          | MEDIA     | MEDIA     | ALTA     |
| Validade do objeto  | GARANTIDA     | NAO GARANT| NAO GARANT| N/A      |
| Complexidade        | BAIXA         | MEDIA     | ALTA      | BAIXA    |
| Testabilidade       | EXCELENTE     | BOA       | BOA       | BOA      |
| Uso recomendado     | PADRAO        | OPCIONAL  | RARO      | PONTUAL  |
+---------------------+---------------+-----------+-----------+----------+
```

---

## 6. IoC Containers e Lifecycle Management

### 6.1 O Que e um IoC Container

Um IoC Container (ou DI Container) e um framework que:

1. **Registra** mapeamentos: interface -> implementacao concreta
2. **Resolve** dependencias: dada uma interface, retorna a instancia correta
3. **Compoe** grafos de objetos: cria toda a arvore de dependencias automaticamente
4. **Gerencia** ciclo de vida: singleton, transient, scoped

### 6.2 Service Locator vs DI Container

```
              SERVICE LOCATOR                    DEPENDENCY INJECTION
        +------------------------+          +------------------------+
        |                        |          |                        |
        |   Classe PEDE a        |          |   Classe RECEBE a      |
        |   dependencia ao       |          |   dependencia do       |
        |   locator              |          |   container            |
        |                        |          |                        |
        +------------------------+          +------------------------+

class OrderService:                    class OrderService:
    def __init__(self):                    def __init__(self, repo: IRepo):
        # PEDE ao locator                      # RECEBE por construtor
        self.repo = ServiceLocator         self._repo = repo
            .get(IOrderRepository)

PROBLEMA: dependencia OCULTA             SOLUCAO: dependencia EXPLICITA
no ServiceLocator.get()                  no construtor
```

**Por que Service Locator e um Anti-Pattern (segundo Mark Seemann):**

1. **Dependencias ocultas** -- voce nao ve no construtor o que a classe precisa
2. **Erros em runtime** -- se o servico nao esta registrado, so descobre rodando
3. **Acoplamento ao container** -- toda classe precisa conhecer o ServiceLocator
4. **Teste dificil** -- precisa configurar o ServiceLocator global em cada teste

**Contra-argumento (Jimmy Bogard):** Em alguns cenarios (middlewares, plugins),
Service Location pode ser necessario. Todo DI Container internamente USA um Service
Locator. O problema e quando CLASSES DE NEGOCIO usam o locator diretamente.

### 6.3 Lifecycle Management

O container gerencia o ciclo de vida das instancias criadas:

```
+-------------------------------------------------------------------+
|                    LIFECYCLES / LIFETIMES                          |
+-------------------------------------------------------------------+
|                                                                   |
|  SINGLETON                                                        |
|  +------------------------------------------------------------+  |
|  |  UMA instancia para TODA a aplicacao                        |  |
|  |  Criada na primeira resolucao, reutilizada sempre           |  |
|  |                                                             |  |
|  |  Uso: ConfigurationManager, LoggerFactory, ConnectionPool   |  |
|  |  Cuidado: DEVE ser thread-safe, NAO deve ter estado mutavel |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  SCOPED                                                           |
|  +------------------------------------------------------------+  |
|  |  UMA instancia por ESCOPO (ex: requisicao HTTP, trade)      |  |
|  |  Criada no inicio do escopo, destruida ao final              |  |
|  |                                                             |  |
|  |  Uso: DbContext, UnitOfWork, RequestContext                 |  |
|  |  Cuidado: NAO injetar scoped em singleton (captive dep.)   |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  TRANSIENT                                                        |
|  +------------------------------------------------------------+  |
|  |  NOVA instancia a cada resolucao                            |  |
|  |  Nunca compartilhada, sem estado                            |  |
|  |                                                             |  |
|  |  Uso: Validators, Mappers, Calculators, Commands            |  |
|  |  Cuidado: pode gerar MUITAS instancias (pressao no GC)     |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+-------------------------------------------------------------------+
```

**Regra de Ouro dos Lifetimes:**

> Um servico so pode depender de servicos com lifetime IGUAL ou MAIOR.
> - Singleton pode depender de: Singleton
> - Scoped pode depender de: Scoped, Singleton
> - Transient pode depender de: Transient, Scoped, Singleton
>
> Violacao: injetar Scoped em Singleton = "Captive Dependency" (anti-pattern)

### 6.4 Auto-Wiring

Auto-wiring e a capacidade do container de resolver automaticamente as dependencias
analisando o construtor da classe, sem registro explicito de cada dependencia.

```python
# Registro explicito (manual)
container.register(IOrderRepository, SqlOrderRepository)
container.register(IValidator, OrderValidator)
container.register(OrderService)  # Container descobre que precisa de IRepo + IValidator

# Auto-wiring: o container analisa o construtor de OrderService,
# ve que precisa de IOrderRepository e IValidator,
# e automaticamente injeta SqlOrderRepository e OrderValidator
```

### 6.5 Registration by Convention

Em vez de registrar cada servico manualmente, o container escaneia assemblies/modulos
e registra automaticamente baseado em convencoes:

```python
# Convencao: toda classe que implementa uma interface I<Nome>
# e registrada automaticamente como a implementacao de I<Nome>

# IOrderRepository -> OrderRepository (automatico)
# IUserService -> UserService (automatico)
# IBrokerAdapter -> BinanceBrokerAdapter (precisa desambiguar)
```

---

## 7. Composition Root

### 7.1 Definicao

O **Composition Root** e o unico local da aplicacao onde o grafo de objetos e
montado. E onde todas as dependencias sao registradas e resolvidas.

> "A Composition Root e um ponto (idealmente unico) na aplicacao onde os modulos
> sao compostos juntos." -- Mark Seemann

### 7.2 Onde Fica o Composition Root

```
+-------------------------------------------------------------------+
|                      APLICACAO                                    |
+-------------------------------------------------------------------+
|                                                                   |
|  +---------------------+                                          |
|  |  COMPOSITION ROOT   |  <-- AQUI: main(), startup, Program.cs  |
|  |  (ponto de entrada) |                                          |
|  +---------------------+                                          |
|          |                                                        |
|          | cria e configura                                       |
|          v                                                        |
|  +---------------------+                                          |
|  |   IoC CONTAINER     |                                          |
|  |   (ou Pure DI)      |                                          |
|  +---------------------+                                          |
|          |                                                        |
|          | resolve e injeta                                       |
|          v                                                        |
|  +---------------------+  +------------------+  +---------------+ |
|  |   Domain Layer      |  |  Application     |  | Infrastructure| |
|  |   (entidades,       |  |  Layer            |  | Layer          | |
|  |    interfaces)      |  |  (servicos,      |  | (repos,        | |
|  |                     |  |   use cases)     |  |  APIs, DB)     | |
|  +---------------------+  +------------------+  +---------------+ |
|                                                                   |
|  NENHUMA dessas camadas conhece o container!                      |
|  Somente o Composition Root sabe do container.                    |
|                                                                   |
+-------------------------------------------------------------------+
```

### 7.3 Exemplo Pratico: Composition Root para Trading Bot

```python
# composition_root.py -- O UNICO arquivo que conhece o container

from dependency_injector import containers, providers

class TradingBotContainer(containers.DeclarativeContainer):
    """Composition Root: configura TODAS as dependencias."""

    # -- Configuracao
    config = providers.Configuration()

    # -- Infraestrutura (baixo nivel)
    database = providers.Singleton(
        PostgreSQLRepository,
        connection_string=config.database.connection_string,
    )

    # -- Market Data
    market_data = providers.Singleton(
        BinanceMarketData,
        api_key=config.binance.api_key,
        api_secret=config.binance.api_secret,
    )

    # -- Broker
    broker = providers.Singleton(
        BinanceBrokerAdapter,
        api_key=config.binance.api_key,
        api_secret=config.binance.api_secret,
    )

    # -- Risk Management
    risk_manager = providers.Factory(
        PositionSizeRiskManager,
        max_risk_per_trade=config.risk.max_risk_percent,
        max_portfolio_risk=config.risk.max_portfolio_percent,
    )

    # -- Strategy Engine
    strategy_engine = providers.Factory(
        MomentumStrategyEngine,
        data_provider=market_data,
        risk_manager=risk_manager,
    )

    # -- Notificacao
    notifier = providers.Singleton(
        TelegramNotifier,
        bot_token=config.telegram.bot_token,
        chat_id=config.telegram.chat_id,
    )

    # -- O Bot (classe principal)
    trading_bot = providers.Factory(
        TradingBot,
        broker=broker,
        data_provider=market_data,
        risk_manager=risk_manager,
        strategy_engine=strategy_engine,
        notifier=notifier,
        repository=database,
    )


# main.py -- Ponto de entrada
def main():
    container = TradingBotContainer()
    container.config.from_yaml("config.yaml")

    bot = container.trading_bot()
    bot.run()

if __name__ == "__main__":
    main()
```

### 7.4 Principios do Composition Root

1. **Unico por aplicacao** -- so existe UM composition root
2. **No ponto de entrada** -- `main()`, `Startup.cs`, `AppConfig`
3. **Nenhuma outra camada conhece o container** -- o container e infraestrutura
4. **Registro completo** -- todas as dependencias sao registradas aqui
5. **Pode usar Pure DI ou Container** -- a decisao e irrelevante para o resto da app

---

## 8. Pure DI -- DI sem Framework

### 8.1 O Que e Pure DI

**Pure DI** (anteriormente chamado de "Poor Man's DI") e a pratica de aplicar
Dependency Injection sem usar um IoC Container. O termo foi cunhado por Mark Seemann
para substituir "Poor Man's DI", que soava depreciativo e passava a ideia errada
de que seria uma pratica inferior.

> "Pure DI nao e inferior a DI com Container. Em muitos casos, e SUPERIOR."
> -- Mark Seemann

### 8.2 Como Funciona

```python
# pure_di_composition_root.py -- SEM CONTAINER

def create_trading_bot(config: Config) -> TradingBot:
    """Composition Root com Pure DI -- montagem manual do grafo."""

    # Infraestrutura
    database = PostgreSQLRepository(
        connection_string=config.database.connection_string,
    )

    # Market Data
    market_data = BinanceMarketData(
        api_key=config.binance.api_key,
        api_secret=config.binance.api_secret,
    )

    # Broker
    broker = BinanceBrokerAdapter(
        api_key=config.binance.api_key,
        api_secret=config.binance.api_secret,
    )

    # Risk Management
    risk_manager = PositionSizeRiskManager(
        max_risk_per_trade=config.risk.max_risk_percent,
        max_portfolio_risk=config.risk.max_portfolio_percent,
    )

    # Strategy
    strategy_engine = MomentumStrategyEngine(
        data_provider=market_data,
        risk_manager=risk_manager,
    )

    # Notificacao
    notifier = TelegramNotifier(
        bot_token=config.telegram.bot_token,
        chat_id=config.telegram.chat_id,
    )

    # Composicao final
    return TradingBot(
        broker=broker,
        data_provider=market_data,
        risk_manager=risk_manager,
        strategy_engine=strategy_engine,
        notifier=notifier,
        repository=database,
    )


def main():
    config = load_config("config.yaml")
    bot = create_trading_bot(config)
    bot.run()
```

### 8.3 Container vs Pure DI -- Quando Usar Cada

```
+---------------------------+---------------------------+
|       IoC CONTAINER       |        PURE DI            |
+---------------------------+---------------------------+
| Centenas de dependencias  | Dezenas de dependencias   |
| Auto-wiring necessario    | Grafo simples e estavel   |
| Convention-based config   | Montagem explicita        |
| Lifecycle complexo        | Lifecycle simples         |
| Late binding necessario   | Compile-time safety       |
| Equipe grande             | Equipe pequena/media      |
| Configuracao dinamica     | Configuracao estatica     |
+---------------------------+---------------------------+

Recomendacao de Seemann: Comece com Pure DI.
Migre para container SOMENTE quando a complexidade justificar.
```

### 8.4 Quando NAO Usar um Container

- Projeto pequeno/medio (< 50 classes no grafo de dependencias)
- Grafo de dependencias estavel (muda raramente)
- Equipe nao familiarizada com containers
- Quando compile-time safety e prioritario
- Quando debug/rastreamento de dependencias precisa ser obvio

---

## 9. Frameworks e Bibliotecas por Linguagem

### 9.1 Python

| Framework | Tipo | Destaque | Link |
|-----------|------|----------|------|
| **dependency-injector** | Container completo | Container declarativo, wiring, providers, lifecycle | python-dependency-injector.ets-labs.org |
| **FastAPI Depends** | Built-in (FastAPI) | Integrado ao framework, async nativo | fastapi.tiangolo.com |
| **inject** | Leve | Decorators simples | pypi.org/project/inject |
| **python-inject** | Leve | Configuracao minimalista | pypi.org/project/python-inject |
| **lagom** | Moderno | Type-based, sem decorators | lagom-di.readthedocs.io |
| **Pure DI** | Manual | Funcoes factory, sem framework | N/A |

**Observacao sobre Python:** Por ser uma linguagem dinamica com duck typing, Python
naturalmente suporta DI sem frameworks. Funcoes sao objetos de primeira classe,
e closures podem servir como factories. Muitos Pythonistas preferem Pure DI com
protocolos (typing.Protocol) ou ABCs.

```python
# Python: DI idiomatico com Protocol (sem framework)
from typing import Protocol

class MarketDataProvider(Protocol):
    def get_prices(self, symbol: str) -> list[float]: ...

class BinanceData:
    def get_prices(self, symbol: str) -> list[float]:
        # Implementacao real
        ...

class MockData:
    def get_prices(self, symbol: str) -> list[float]:
        return [100.0, 101.5, 99.8]  # Dados fake para teste

# Funcao factory (Pure DI)
def create_bot(data: MarketDataProvider) -> TradingBot:
    return TradingBot(data_provider=data)

# Producao
bot = create_bot(BinanceData())

# Teste
bot = create_bot(MockData())
```

### 9.2 Java

| Framework | Tipo | Destaque |
|-----------|------|----------|
| **Spring Framework** | Container enterprise | Ecossistema completo, annotation-based, XML, Java config |
| **Google Guice** | Container leve | Runtime DI, modular, binding modules |
| **Dagger 2** | Compile-time | Code generation, zero reflection, Android preferido |
| **Micronaut** | Compile-time | Startup rapido, cloud-native, GraalVM |
| **CDI (Jakarta)** | Padrao Java EE | Parte da especificacao Jakarta EE |

**Spring vs Guice vs Dagger:**
- **Spring**: Enterprise, ecossistema massivo, curva de aprendizado ingreme
- **Guice**: Leve, baseado em reflexao, modular, ideal para apps menores
- **Dagger 2**: Compile-time, zero overhead runtime, padrao no Android

### 9.3 .NET

| Framework | Tipo | Destaque |
|-----------|------|----------|
| **Microsoft.Extensions.DI** | Built-in | Integrado ao ASP.NET Core, 3 lifetimes |
| **Autofac** | Container avancado | 7 lifetime scopes, modules, scanning, decorators |
| **Ninject** | Container leve | Fluent API, convention-based |
| **Simple Injector** | Container rigoroso | Diagnostics, verificacao em startup |
| **Castle Windsor** | Container maduro | Interceptors, facilities, extensivel |

**Built-in vs Autofac:**
O DI built-in do .NET oferece Singleton, Scoped e Transient. Autofac adiciona:
- InstancePerLifetimeScope, InstancePerMatchingLifetimeScope
- InstancePerRequest, InstancePerOwned
- Scanning de assemblies, Modules, Decorators, Interceptors

### 9.4 Go

| Framework | Tipo | Destaque |
|-----------|------|----------|
| **Wire (Google)** | Compile-time | Code generation, zero runtime overhead |
| **Dig (Uber)** | Runtime | Reflexao, API simples, runtime errors |
| **Fx (Uber)** | Application framework | Lifecycle management, built on Dig |
| **Pure DI** | Manual | Idiomatico em Go, struct composition |

**Go e DI:** A comunidade Go tende a preferir Pure DI (injecao manual via struct
constructors). Wire e usado quando o grafo fica complexo demais. Fx e o mais
completo, com lifecycle hooks (OnStart, OnStop).

---

## 10. Design Patterns Relacionados

DI nao opera isoladamente. Diversos patterns do Gang of Four (GoF) sao
**facilitados ou viabilizados** pela injecao de dependencias.

### 10.1 Factory e Abstract Factory

```
Sem DI:                              Com DI:
A classe CRIA a dependencia          A Factory e INJETADA na classe
usando new/create diretamente        e cria quando necessario

class OrderService:                  class OrderService:
    def process(self):                   def __init__(self,
        validator = OrderValidator()         factory: IValidatorFactory):
        validator.validate(order)            self._factory = factory
                                         def process(self):
                                             validator = self._factory.create()
                                             validator.validate(order)
```

**Relacao:** DI injeta a Factory; a Factory cria objetos sob demanda. Util quando
a dependencia precisa ser criada em runtime (ex: uma nova instancia por trade).

### 10.2 Strategy Pattern

```
+-----------------+         +-------------------+
|  TradingBot     |-------->| <<interface>>     |
|                 |         | IStrategy         |
+-----------------+         +-------------------+
                                    ^
                    +---------------+---------------+
                    |               |               |
            +-------+----+  +------+------+  +-----+------+
            | Momentum   |  | MeanRevert  |  | Arbitrage  |
            | Strategy   |  | Strategy    |  | Strategy   |
            +------------+  +-------------+  +------------+

DI permite trocar a estrategia SEM modificar o TradingBot.
O Composition Root decide qual Strategy injetar.
```

O Strategy Pattern e o caso de uso mais natural para DI: a estrategia e uma
dependencia injetada, e o cliente (TradingBot) nao sabe nem se importa com
qual estrategia esta usando.

### 10.3 Observer Pattern

```
+-------------------+         +--------------------+
| MarketDataFeed    |-------->| <<interface>>      |
| (Subject)         |         | IMarketObserver    |
+-------------------+         +--------------------+
                                      ^
                      +---------------+---------------+
                      |               |               |
              +-------+----+  +------+------+  +-----+------+
              | Strategy   |  | RiskMonitor |  | Logger     |
              | Engine     |  |             |  |            |
              +------------+  +-------------+  +------------+

DI injeta a lista de observers no subject.
Novos observers podem ser adicionados sem alterar o MarketDataFeed.
```

### 10.4 Adapter Pattern

```
+-------------------+         +--------------------+
| TradingBot        |-------->| <<interface>>      |
|                   |         | IBrokerAdapter     |
+-------------------+         +--------------------+
                                      ^
                      +---------------+---------------+
                      |               |               |
              +-------+------+ +-----+------+ +------+------+
              | BinanceAdapt | | BybitAdapt | | MockBroker  |
              | (adapta API  | | (adapta API| | (para teste)|
              |  Binance)    | |  Bybit)    | |             |
              +--------------+ +------------+ +-------------+

DI + Adapter: cada adapter traduz a API especifica da exchange
para a interface generica IBrokerAdapter que o bot espera.
```

### 10.5 Decorator Pattern

```
+-------------------+         +--------------------+
| TradingBot        |-------->| <<interface>>      |
|                   |         | IBrokerAdapter     |
+-------------------+         +--------------------+
                                      ^
                                      |
                              +-------+--------+
                              | LoggingBroker   |  <-- Decorator
                              | Adapter         |
                              +-------+--------+
                                      |
                                      | delega para
                                      v
                              +-------+--------+
                              | RetryBroker     |  <-- Decorator
                              | Adapter         |
                              +-------+--------+
                                      |
                                      | delega para
                                      v
                              +-------+--------+
                              | BinanceBroker   |  <-- Implementacao real
                              | Adapter         |
                              +----------------+

DI permite empilhar decorators transparentemente.
O Composition Root configura a cadeia de decorators.
```

---

## 11. Anti-Patterns

### 11.1 Service Locator

**O que e:** Classes pedem suas dependencias a um locator global em vez de
recebe-las por injecao.

```python
# ANTI-PATTERN: Service Locator
class OrderService:
    def __init__(self):
        self.repo = ServiceLocator.resolve(IOrderRepository)  # OCULTO
        self.validator = ServiceLocator.resolve(IValidator)    # OCULTO
```

**Por que e ruim:**
- Dependencias sao **invissiveis** para quem usa a classe
- Erros sao detectados apenas em **runtime**
- **Todo** codigo fica acoplado ao ServiceLocator
- Testes precisam configurar um ServiceLocator global

**Excecao:** O proprio container internamente usa Service Location. O anti-pattern
e quando classes de negocio acessam o container diretamente.

### 11.2 Ambient Context

**O que e:** Uma dependencia exposta como propriedade estatica global.

```python
# ANTI-PATTERN: Ambient Context
class TimeProvider:
    _current: "ITimeProvider" = SystemTimeProvider()

    @classmethod
    def now(cls) -> datetime:
        return cls._current.now()

# Qualquer codigo pode chamar TimeProvider.now() sem declarar dependencia
class OrderService:
    def process(self):
        timestamp = TimeProvider.now()  # Dependencia OCULTA
```

**Por que e ruim:**
- Dependencia **completamente oculta** (nao aparece em nenhuma assinatura)
- **Temporal coupling** -- precisa configurar antes de usar
- **Problemas de concorrencia** -- acesso estatico compartilhado
- Mascara **Constructor Over-injection** (excesso de dependencias)

### 11.3 Constrained Construction

**O que e:** Forcar um construtor padrao (sem parametros) para satisfazer um
framework, impedindo constructor injection.

```python
# ANTI-PATTERN: Constrained Construction
class PluginBase(ABC):
    def __init__(self):  # Forcado a ter construtor vazio
        pass             # Como injetar dependencias?

class MyPlugin(PluginBase):
    def __init__(self):
        super().__init__()
        # Precisa usar Service Locator ou Ambient Context... anti-pattern!
        self.repo = ServiceLocator.resolve(IRepository)
```

### 11.4 Constructor Over-Injection

**O que e:** Um construtor com dependencias demais (geralmente > 4-5).

```python
# CODE SMELL: Constructor Over-injection
class GodService:
    def __init__(
        self,
        repo: IRepository,
        validator: IValidator,
        mapper: IMapper,
        logger: ILogger,
        notifier: INotifier,
        cache: ICache,
        auth: IAuthService,
        config: IConfigProvider,
        metrics: IMetricsCollector,
    ):
        # 9 dependencias = ALGO ESTA ERRADO
        # Esta classe provavelmente viola o SRP
        ...
```

**Solucao:** Refatorar a classe, extraindo responsabilidades em classes menores.
O excesso de dependencias e um **sintoma**, nao o problema. O problema real e que
a classe faz coisas demais.

### 11.5 Container as Service Locator

**O que e:** Injetar o proprio container como dependencia.

```python
# ANTI-PATTERN: Injetando o container
class OrderService:
    def __init__(self, container: IContainer):
        self.container = container  # TUDO pode ser resolvido

    def process(self):
        repo = self.container.resolve(IRepository)  # Service Location disfarçado
```

**Por que e ruim:** Transforma o container em um Service Locator. A classe pode
resolver qualquer coisa, suas dependencias reais ficam ocultas.

### 11.6 God Container / Control Freak

**O que e:** Um unico container monolitico que registra TODAS as dependencias
da aplicacao sem organizacao.

**Solucao:** Organize registros em modulos/installers tematicos:

```python
# Em vez de UM container monolitico:
class InfrastructureModule:
    """Registra dependencias de infraestrutura."""
    ...

class TradingModule:
    """Registra dependencias de trading."""
    ...

class NotificationModule:
    """Registra dependencias de notificacao."""
    ...
```

### 11.7 Tabela Resumo de Anti-Patterns

```
+--------------------------+-----------------------------+--------------------------+
| Anti-Pattern             | Sintoma                     | Solucao                  |
+--------------------------+-----------------------------+--------------------------+
| Service Locator          | Classe pede deps ao locator | Constructor Injection    |
| Ambient Context          | Deps como static globals    | Constructor Injection    |
| Constrained Construction | Construtor vazio forcado    | Abstract Factory         |
| Constructor Over-inject  | > 4-5 deps no construtor    | Extrair classes (SRP)    |
| Container as Dependency  | Container injetado na classe| Injetar deps reais       |
| God Container            | Container monolitico        | Modulos / Installers     |
| Captive Dependency       | Scoped injetado em Singleton| Respeitar lifetime rules |
+--------------------------+-----------------------------+--------------------------+
```

---

## 12. Testabilidade

### 12.1 DI como Habilitador de Testes

DI e o pilar fundamental da testabilidade em software orientado a objetos.
Sem DI, testar uma classe isoladamente e praticamente impossivel quando ela
cria suas proprias dependencias.

### 12.2 Tipos de Test Doubles

```
+-------------------------------------------------------------------+
|                    TEST DOUBLES (Gerard Meszaros)                  |
+-------------------------------------------------------------------+
|                                                                   |
|  DUMMY          Objeto passado mas nunca usado                    |
|                 Apenas preenche parametro                         |
|                                                                   |
|  STUB           Retorna respostas pre-programadas                 |
|                 Nao verifica interacoes                           |
|                 Ex: MockData que retorna [100, 101, 99]           |
|                                                                   |
|  SPY            Registra chamadas recebidas                       |
|                 Permite verificar APOS a execucao                 |
|                 Ex: verificar se notifier.send() foi chamado      |
|                                                                   |
|  MOCK           Expectativas pre-definidas                        |
|                 Verifica interacoes DURANTE a execucao            |
|                 Ex: mock(broker).expect_call("place_order", 1x)  |
|                                                                   |
|  FAKE            Implementacao funcional simplificada              |
|                 Ex: InMemoryDatabase em vez de PostgreSQL         |
|                 Ex: PaperTradingBroker em vez de BinanceBroker    |
|                                                                   |
+-------------------------------------------------------------------+
```

### 12.3 Exemplo Pratico: Testando o Trading Bot

```python
import pytest
from unittest.mock import MagicMock, AsyncMock

class TestTradingBot:
    """Testes unitarios do TradingBot usando DI + Test Doubles."""

    def setup_method(self):
        """Cria test doubles para cada dependencia."""
        # STUBS: retornam dados pre-definidos
        self.mock_data = MagicMock(spec=IMarketDataProvider)
        self.mock_data.get_prices.return_value = PriceData(
            symbol="BTCUSDT",
            prices=[50000, 50100, 50200, 50300, 50400],
            timestamps=[...],
        )

        # MOCK: verificamos se foi chamado corretamente
        self.mock_broker = MagicMock(spec=IBrokerAdapter)
        self.mock_broker.place_order.return_value = OrderResult(
            order_id="TEST-001",
            status="FILLED",
        )

        # STUB: risk manager que permite trading
        self.mock_risk = MagicMock(spec=IRiskManager)
        self.mock_risk.can_trade.return_value = True

        # SPY: verificamos se notificacao foi enviada
        self.mock_notifier = MagicMock(spec=INotificationService)

        # FAKE: banco em memoria
        self.fake_repo = InMemoryTradeRepository()

        # COMPOSICAO: injeta todos os test doubles
        self.bot = TradingBot(
            broker=self.mock_broker,
            data_provider=self.mock_data,
            risk_manager=self.mock_risk,
            strategy_engine=MomentumStrategyEngine(
                data_provider=self.mock_data,
                risk_manager=self.mock_risk,
            ),
            notifier=self.mock_notifier,
            repository=self.fake_repo,
        )

    def test_execute_places_order_when_signal_is_buy(self):
        """Verifica que o bot envia ordem quando o sinal e de compra."""
        self.bot.execute()

        # Verifica que o broker recebeu uma ordem
        self.mock_broker.place_order.assert_called_once()

        # Verifica que a notificacao foi enviada
        self.mock_notifier.send.assert_called_once()

    def test_execute_does_not_trade_when_risk_exceeds_limit(self):
        """Verifica que o bot NAO opera quando o risco e alto demais."""
        self.mock_risk.can_trade.return_value = False

        self.bot.execute()

        # Verifica que NENHUMA ordem foi enviada
        self.mock_broker.place_order.assert_not_called()

    def test_trade_is_persisted_in_repository(self):
        """Verifica que o trade executado e salvo no repositorio."""
        self.bot.execute()

        # Usando o FAKE repository para verificar persistencia
        trades = self.fake_repo.get_all()
        assert len(trades) == 1
        assert trades[0].symbol == "BTCUSDT"
```

### 12.4 Integration Tests com Implementacoes Reais

DI tambem facilita integration tests: injete a implementacao real em vez do mock.

```python
class TestTradingBotIntegration:
    """Integration tests -- usa implementacoes REAIS (sandbox/testnet)."""

    def setup_method(self):
        self.bot = TradingBot(
            broker=BinanceTestnetBroker(api_key="testnet_key"),  # REAL (testnet)
            data_provider=BinanceMarketData(api_key="testnet_key"),  # REAL
            risk_manager=PositionSizeRiskManager(max_risk=0.01),  # REAL
            strategy_engine=MomentumStrategyEngine(...),  # REAL
            notifier=ConsoleNotifier(),  # REAL (mas simplificado)
            repository=SQLiteRepository(":memory:"),  # REAL (mas em memoria)
        )

    def test_full_trading_cycle(self):
        """Testa o ciclo completo de trading no testnet."""
        result = self.bot.execute()
        assert result.status in ["EXECUTED", "NO_SIGNAL"]
```

### 12.5 A Piramide de Testes e DI

```
                    /\
                   /  \
                  / E2E \          Poucos testes, implementacoes reais
                 /  Tests \        DI: todas dependencias reais
                /----------\
               / Integration\      Mais testes, mix real/mock
              /    Tests      \    DI: deps reais + fakes
             /----------------\
            /    Unit Tests     \   Muitos testes, tudo mockado
           /                    \  DI: todos test doubles
          /______________________\

DI e o mecanismo que permite TRANSITAR entre os niveis da piramide
simplesmente trocando as implementacoes injetadas.
```

---

## 13. Aplicacao ao Trading Bot

### 13.1 Arquitetura de Dependencias do Bot

```
+-------------------------------------------------------------------+
|                    TRADING BOT -- GRAFO DE DEPENDENCIAS            |
+-------------------------------------------------------------------+
|                                                                   |
|                    +-------------------+                          |
|                    |   TradingBot      |                          |
|                    |   (Orchestrator)  |                          |
|                    +--------+----------+                          |
|                             |                                    |
|          +------------------+------------------+                 |
|          |         |        |        |         |                 |
|          v         v        v        v         v                 |
|  +-------+  +-----+--+ +---+----+ +-+------+ ++---------+      |
|  |IBroker|  |IMarket |  |IRisk  | |IStrategy| |INotifier |      |
|  |Adapter|  |Data    |  |Manager| |Engine   | |          |      |
|  +---+---+  |Provider|  +---+---+ +---+-----+ +----+----+      |
|      |      +---+----+      |         |            |            |
|      |          |            |         |            |            |
|      v          v            v         v            v            |
|  +---+---+  +--+-----+ +---+----+ +--+------+ +---+------+     |
|  |IOrder |  |IPrice  | |IPosit. | |IIndicat.| |IMessage  |     |
|  |Execut.|  |Feed    | |Sizer   | |Calculat.| |Sender    |     |
|  +-------+  +--------+ +--------+ +---------+ +----------+     |
|                                                                  |
+-------------------------------------------------------------------+
```

### 13.2 Interfaces Fundamentais

```python
from abc import ABC, abstractmethod
from typing import Protocol
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

# ============================================================
# VALUE OBJECTS
# ============================================================
class OrderSide(Enum):
    BUY = "BUY"
    SELL = "SELL"

@dataclass(frozen=True)
class Order:
    symbol: str
    side: OrderSide
    quantity: float
    price: float | None = None  # None = market order

@dataclass(frozen=True)
class OrderResult:
    order_id: str
    status: str
    filled_price: float
    filled_quantity: float
    timestamp: datetime

@dataclass(frozen=True)
class PriceData:
    symbol: str
    prices: list[float]
    volumes: list[float]
    timestamps: list[datetime]

@dataclass(frozen=True)
class Signal:
    symbol: str
    side: OrderSide
    strength: float  # 0.0 a 1.0
    reason: str

# ============================================================
# INTERFACES (Abstracoes que o bot depende)
# ============================================================
class IBrokerAdapter(Protocol):
    """Adaptador para interagir com a corretora."""
    def place_order(self, order: Order) -> OrderResult: ...
    def cancel_order(self, order_id: str) -> bool: ...
    def get_balance(self) -> dict[str, float]: ...
    def get_open_orders(self) -> list[Order]: ...

class IMarketDataProvider(Protocol):
    """Provedor de dados de mercado."""
    def get_prices(self, symbol: str, timeframe: str, limit: int) -> PriceData: ...
    def get_orderbook(self, symbol: str) -> dict: ...
    def subscribe_ticker(self, symbol: str, callback) -> None: ...

class IRiskManager(Protocol):
    """Gerenciador de risco."""
    def can_trade(self, signal: Signal, balance: dict) -> bool: ...
    def calculate_position_size(self, signal: Signal, balance: dict) -> float: ...
    def check_drawdown(self) -> bool: ...

class IStrategyEngine(Protocol):
    """Motor de estrategia que gera sinais."""
    def analyze(self, symbol: str) -> Signal | None: ...
    def get_active_symbols(self) -> list[str]: ...

class INotificationService(Protocol):
    """Servico de notificacao."""
    def send_alert(self, message: str, severity: str) -> None: ...
    def send_trade_notification(self, result: OrderResult) -> None: ...

class IDatabaseRepository(Protocol):
    """Repositorio para persistencia."""
    def save_trade(self, result: OrderResult) -> None: ...
    def get_trade_history(self, symbol: str) -> list[OrderResult]: ...
    def save_signal(self, signal: Signal) -> None: ...
```

### 13.3 Implementacoes Intercambiaveis

```
+-------------------------------------------------------------------+
|           IMPLEMENTACOES POR AMBIENTE                             |
+-------------------------------------------------------------------+
|                                                                   |
| IBrokerAdapter:                                                   |
|   PRODUCAO:   BinanceBrokerAdapter, BybitBrokerAdapter            |
|   BACKTEST:   PaperTradingBroker (simula ordens sem dinheiro)     |
|   TESTE:      MockBroker (retorna resultados fixos)               |
|                                                                   |
| IMarketDataProvider:                                              |
|   PRODUCAO:   BinanceLiveData, BybitLiveData                      |
|   BACKTEST:   HistoricalCSVData, HistoricalDBData                 |
|   TESTE:      MockMarketData (retorna dados fixos)                |
|                                                                   |
| IRiskManager:                                                     |
|   PRODUCAO:   PositionSizeRiskManager (risk real)                 |
|   BACKTEST:   BacktestRiskManager (sem limites de capital)        |
|   TESTE:      AlwaysApproveRiskManager (sempre aprova)            |
|                                                                   |
| IStrategyEngine:                                                  |
|   PRODUCAO:   MomentumStrategy, MeanReversionStrategy             |
|   BACKTEST:   (mesmo que producao)                                |
|   TESTE:      AlwaysBuyStrategy (sempre gera sinal de compra)     |
|                                                                   |
| INotificationService:                                             |
|   PRODUCAO:   TelegramNotifier, DiscordNotifier                   |
|   BACKTEST:   ConsoleNotifier (imprime no terminal)               |
|   TESTE:      NullNotifier (nao faz nada)                         |
|                                                                   |
| IDatabaseRepository:                                              |
|   PRODUCAO:   PostgreSQLRepository                                |
|   BACKTEST:   SQLiteRepository (arquivo local)                    |
|   TESTE:      InMemoryRepository (dicionario Python)              |
|                                                                   |
+-------------------------------------------------------------------+
```

### 13.4 Composition Root por Ambiente

```python
# composition_root.py

def create_production_bot(config: Config) -> TradingBot:
    """Monta o bot para PRODUCAO."""
    return TradingBot(
        broker=BinanceBrokerAdapter(
            api_key=config.binance.api_key,
            api_secret=config.binance.api_secret,
        ),
        data_provider=BinanceLiveData(
            api_key=config.binance.api_key,
        ),
        risk_manager=PositionSizeRiskManager(
            max_risk_per_trade=0.02,
            max_portfolio_risk=0.10,
            max_drawdown=0.15,
        ),
        strategy_engine=MomentumStrategyEngine(
            lookback_period=20,
            threshold=0.02,
        ),
        notifier=TelegramNotifier(
            bot_token=config.telegram.token,
            chat_id=config.telegram.chat_id,
        ),
        repository=PostgreSQLRepository(
            connection_string=config.database.url,
        ),
    )


def create_backtest_bot(
    config: Config,
    historical_data_path: str,
) -> TradingBot:
    """Monta o bot para BACKTEST."""
    return TradingBot(
        broker=PaperTradingBroker(
            initial_balance=10000.0,
            commission_rate=0.001,
        ),
        data_provider=HistoricalCSVData(
            file_path=historical_data_path,
        ),
        risk_manager=BacktestRiskManager(
            max_risk_per_trade=0.02,
        ),
        strategy_engine=MomentumStrategyEngine(
            lookback_period=20,
            threshold=0.02,
        ),
        notifier=ConsoleNotifier(),
        repository=SQLiteRepository(":memory:"),
    )


def create_test_bot() -> TradingBot:
    """Monta o bot para TESTES UNITARIOS."""
    return TradingBot(
        broker=MockBroker(),
        data_provider=MockMarketData(),
        risk_manager=AlwaysApproveRiskManager(),
        strategy_engine=AlwaysBuyStrategy(),
        notifier=NullNotifier(),
        repository=InMemoryRepository(),
    )
```

### 13.5 Diagrama Completo: Fluxo de DI no Bot

```
+===================================================================+
||                   main.py (PONTO DE ENTRADA)                    ||
||                                                                 ||
||  1. Le configuracao (config.yaml / env vars)                    ||
||  2. Determina ambiente (production / backtest / test)           ||
||  3. Chama Composition Root apropriado                           ||
||  4. Recebe TradingBot completamente montado                     ||
||  5. Chama bot.run()                                             ||
||                                                                 ||
+===================================================================+
          |
          | chama
          v
+===================================================================+
||            Composition Root (create_*_bot)                       ||
||                                                                 ||
||  - Cria TODAS as implementacoes concretas                       ||
||  - Injeta via CONSTRUCTOR INJECTION                             ||
||  - E o UNICO lugar que conhece classes concretas                ||
||  - Nenhuma outra camada sabe como o grafo e montado             ||
||                                                                 ||
+===================================================================+
          |
          | monta
          v
+===================================================================+
||                   TradingBot (Orquestrador)                     ||
||                                                                 ||
||  - Recebe ABSTRACOES (interfaces/protocols)                     ||
||  - NAO sabe se esta em producao, backtest ou teste              ||
||  - NAO sabe qual exchange, banco de dados, notificador          ||
||  - Apenas orquestra o fluxo: dados -> analise -> risco -> ordem ||
||                                                                 ||
+===================================================================+
          |
          | usa (via interfaces)
          v
+===================================================================+
||              Implementacoes Concretas                            ||
||                                                                 ||
||  BinanceBrokerAdapter  |  PaperTradingBroker  |  MockBroker     ||
||  BinanceLiveData       |  HistoricalCSVData   |  MockMarketData ||
||  PositionSizeRiskMgr   |  BacktestRiskMgr     |  AlwaysApprove  ||
||  TelegramNotifier      |  ConsoleNotifier     |  NullNotifier   ||
||  PostgreSQLRepository  |  SQLiteRepository    |  InMemoryRepo   ||
||                                                                 ||
+===================================================================+
```

### 13.6 Beneficios Concretos para o Trading Bot

| Beneficio | Descricao | Exemplo |
|-----------|-----------|---------|
| **Backtesting** | Trocar dados live por historicos sem alterar o bot | `HistoricalCSVData` em vez de `BinanceLiveData` |
| **Paper Trading** | Simular ordens sem dinheiro real | `PaperTradingBroker` em vez de `BinanceBrokerAdapter` |
| **Multi-Exchange** | Suportar varias exchanges com a mesma logica | `BybitBrokerAdapter` ou `BinanceBrokerAdapter` |
| **Testes Unitarios** | Testar logica sem conexoes externas | Todos os mocks |
| **A/B Testing** | Comparar estrategias injetando diferentes `IStrategyEngine` | `MomentumStrategy` vs `MeanReversionStrategy` |
| **Monitoramento** | Decorar broker com logging/metrics sem alterar codigo | `LoggingBrokerDecorator(real_broker)` |
| **Resiliencia** | Decorar broker com retry sem alterar codigo | `RetryBrokerDecorator(real_broker)` |
| **Feature Flags** | Trocar notificador baseado em config | `TelegramNotifier` ou `NullNotifier` |

---

## 14. Livros Fundamentais

### 14.1 A Biblia: "Dependency Injection: Principles, Practices, and Patterns"

- **Autores:** Steven van Deursen e Mark Seemann
- **Editora:** Manning Publications
- **Ano:** 2019 (2a edicao)
- **ISBN:** 978-1-61729-473-0
- **Paginas:** 552

Este e O livro definitivo sobre Dependency Injection. Cobre tudo: principios,
patterns, anti-patterns, lifecycle, composition root, Pure DI, e uso com containers.
Embora os exemplos sejam em C#/.NET, os conceitos sao universais.

**Conteudo principal:**
- Parte 1: Fundamentos de DI (o que, por que, como)
- Parte 2: Catalogo de patterns e anti-patterns
- Parte 3: Cross-cutting concerns (logging, caching, decorators)
- Parte 4: Uso com DI containers (Autofac, Simple Injector, MS.DI)

### 14.2 Outros Livros Essenciais

| Livro | Autor(es) | Ano | Relevancia para DI |
|-------|-----------|-----|---------------------|
| **Clean Architecture** | Robert C. Martin | 2017 | DIP como base da arquitetura limpa |
| **Clean Code** | Robert C. Martin | 2008 | Principios que DI viabiliza |
| **Design Patterns (GoF)** | Gamma, Helm, Johnson, Vlissides | 1994 | Patterns facilitados por DI |
| **Head First Design Patterns** | Freeman & Robson | 2004/2020 | Introducao acessivel aos patterns |
| **Patterns of Enterprise Application Architecture** | Martin Fowler | 2002 | Contexto arquitetural |
| **Growing Object-Oriented Software, Guided by Tests** | Freeman & Pryce | 2009 | TDD + DI na pratica |
| **Working Effectively with Legacy Code** | Michael Feathers | 2004 | DI para tornar codigo legado testavel |
| **Dependency Injection in .NET** | Mark Seemann | 2011 | 1a edicao do livro biblia |

---

## 15. Referencias Completas

### Artigos Seminais

1. **Fowler, Martin.** "Inversion of Control Containers and the Dependency Injection pattern." (2004).
   - URL: https://martinfowler.com/articles/injection.html
   - Tipo: Artigo seminal / Web
   - O artigo que cunhou o termo "Dependency Injection"

2. **Fowler, Martin.** "Inversion of Control." Bliki. (2005).
   - URL: https://martinfowler.com/bliki/InversionOfControl.html
   - Tipo: Artigo / Blog

3. **Seemann, Mark.** "Service Locator is an Anti-Pattern." (2010).
   - URL: https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/
   - Tipo: Artigo / Blog
   - Argumento definitivo contra Service Locator

4. **Seemann, Mark.** "Pure DI." (2014).
   - URL: https://blog.ploeh.dk/2014/06/10/pure-di/
   - Tipo: Artigo / Blog
   - Define o conceito de DI sem containers

5. **Seemann, Mark.** "Composition Root." (2011).
   - URL: https://blog.ploeh.dk/2011/07/28/CompositionRoot/
   - Tipo: Artigo / Blog

6. **Seemann, Mark.** "When to use a DI Container." (2012).
   - URL: https://blog.ploeh.dk/2012/11/06/WhentouseaDIContainer/
   - Tipo: Artigo / Blog

### Livros

7. **Van Deursen, Steven; Seemann, Mark.** *Dependency Injection: Principles, Practices, and Patterns.* Manning, 2019.
   - URL: https://www.manning.com/books/dependency-injection-principles-practices-patterns
   - Tipo: Livro
   - A referencia definitiva

8. **Martin, Robert C.** *Clean Architecture: A Craftsman's Guide to Software Structure and Design.* Prentice Hall, 2017.
   - Tipo: Livro

9. **Gamma, Helm, Johnson, Vlissides.** *Design Patterns: Elements of Reusable Object-Oriented Software.* Addison-Wesley, 1994.
   - Tipo: Livro

### Documentacao Tecnica

10. **Microsoft.** "Dependency injection in .NET."
    - URL: https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection
    - Tipo: Documentacao oficial

11. **FastAPI.** "Dependencies."
    - URL: https://fastapi.tiangolo.com/tutorial/dependencies/
    - Tipo: Documentacao oficial

12. **dependency-injector.** "Dependency injection and inversion of control in Python."
    - URL: https://python-dependency-injector.ets-labs.org/introduction/di_in_python.html
    - Tipo: Documentacao de biblioteca

### Artigos Academicos

13. **Lacerda, G. et al.** "Cataloging dependency injection anti-patterns in software systems." *Journal of Systems and Software*, 2021.
    - URL: https://www.sciencedirect.com/science/article/pii/S0164121221002223
    - Tipo: Artigo academico (peer-reviewed)

### Tutoriais e Guias

14. **Stackify.** "SOLID Design Principles Explained: Dependency Inversion."
    - URL: https://stackify.com/dependency-inversion-principle/
    - Tipo: Tutorial

15. **Baeldung.** "Dependency Injection vs. Service Locator."
    - URL: https://www.baeldung.com/cs/dependency-injection-vs-service-locator
    - Tipo: Tutorial

16. **DEV Community.** "Dependency Injection in Go: Comparing Wire, Dig, Fx & More."
    - URL: https://dev.to/rezende79/dependency-injection-in-go-comparing-wire-dig-fx-more-3nkj
    - Tipo: Tutorial

17. **Medium / Alexander Obregon.** "Comparing Dependency Injection Frameworks -- Spring, Guice, and Dagger."
    - URL: https://medium.com/@AlexanderObregon/comparing-dependency-injection-frameworks-spring-guice-and-dagger-a614dccd5859
    - Tipo: Artigo comparativo

18. **Manning (Free Content).** "The Ambient Context Anti-Pattern."
    - URL: https://freecontent.manning.com/the-ambient-context-anti-pattern/
    - Tipo: Capitulo gratuito de livro

19. **Manning (Free Content).** "Understanding the Composition Root."
    - URL: https://freecontent.manning.com/dependency-injection-in-net-2nd-edition-understanding-the-composition-root/
    - Tipo: Capitulo gratuito de livro

20. **Wikipedia.** "Dependency Injection."
    - URL: https://en.wikipedia.org/wiki/Dependency_injection
    - Tipo: Enciclopedia

---

## Apendice A: Glossario

| Termo | Definicao |
|-------|-----------|
| **DIP** | Dependency Inversion Principle -- principio SOLID |
| **IoC** | Inversion of Control -- conceito arquitetural |
| **DI** | Dependency Injection -- padrao de implementacao |
| **Composition Root** | Local unico onde o grafo de objetos e montado |
| **Pure DI** | DI sem usar IoC Container |
| **Auto-wiring** | Resolucao automatica de dependencias pelo container |
| **Captive Dependency** | Servico de vida curta capturado por servico de vida longa |
| **Test Double** | Objeto substituto usado em testes (mock, stub, fake, spy, dummy) |
| **Seam** | Ponto no codigo onde comportamento pode ser alterado sem editar o codigo |
| **Cross-cutting concern** | Funcionalidade que afeta multiplas camadas (logging, caching) |

## Apendice B: Checklist de Implementacao DI para o Bot

- [ ] Definir interfaces (Protocols) para todas as dependencias externas
- [ ] Implementar constructor injection em todas as classes de negocio
- [ ] Criar Composition Root em `main.py` ou `composition_root.py`
- [ ] Implementar pelo menos 2 implementacoes por interface (real + mock)
- [ ] Garantir que nenhuma classe de negocio importe classes concretas de infraestrutura
- [ ] Escrever testes unitarios usando test doubles injetados
- [ ] Escrever testes de integracao usando implementacoes reais (testnet)
- [ ] Documentar o grafo de dependencias
- [ ] Verificar que nao ha Service Locator ou Ambient Context no codigo
- [ ] Verificar que o container (se usado) so e acessado no Composition Root

---

*Documento compilado a partir de 20+ fontes academicas, livros, artigos e
documentacao tecnica. Todas as fontes estao listadas na secao de Referencias.*
