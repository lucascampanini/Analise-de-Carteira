# Circuit Breaker Pattern -- Referencia Definitiva

> **Nivel**: PhD-level deep dive
> **Ultima atualizacao**: 2026-02-07
> **Contexto**: Documentacao tecnica para o BOT Assessor -- Trading Bot
> **Autor da compilacao**: Claude Opus 4.6 (pesquisa e sintese)

---

## Sumario

1. [Origens e Conceitos Fundamentais](#1-origens-e-conceitos-fundamentais)
2. [Maquina de Estados -- Os Tres Estados](#2-maquina-de-estados--os-tres-estados)
3. [Configuracao Detalhada](#3-configuracao-detalhada)
4. [Padroes Relacionados -- Resilience Patterns](#4-padroes-relacionados--resilience-patterns)
5. [Implementacoes e Bibliotecas](#5-implementacoes-e-bibliotecas)
6. [Circuit Breaker Distribuido](#6-circuit-breaker-distribuido)
7. [Monitoramento e Observabilidade](#7-monitoramento-e-observabilidade)
8. [Anti-Patterns e Erros Comuns](#8-anti-patterns-e-erros-comuns)
9. [Aplicacao ao Trading Bot](#9-aplicacao-ao-trading-bot)
10. [Livros Fundamentais e Bibliografia](#10-livros-fundamentais-e-bibliografia)
11. [Catalogo de Fontes](#11-catalogo-de-fontes)

---

## 1. Origens e Conceitos Fundamentais

### 1.1 A Analogia com o Disjuntor Eletrico

O Circuit Breaker Pattern e uma analogia direta com o disjuntor eletrico residencial/industrial. Quando a corrente eletrica excede um limite seguro (curto-circuito, sobrecarga), o disjuntor "desarma" automaticamente, interrompendo o fluxo de corrente para proteger a instalacao contra incendios e danos. Da mesma forma, o Circuit Breaker em software "desarma" quando detecta que um servico downstream esta falhando repetidamente, interrompendo as chamadas para proteger o sistema inteiro.

**Analogia completa:**

| Eletrica                      | Software                                      |
|-------------------------------|-----------------------------------------------|
| Corrente eletrica             | Requisicoes/chamadas de API                   |
| Sobrecarga / curto-circuito   | Falhas consecutivas / timeouts                |
| Disjuntor desarma             | Circuit Breaker abre (estado OPEN)            |
| Circuito interrompido         | Chamadas bloqueadas, fail-fast                |
| Tecnico verifica e religa     | Half-Open: tentativa de teste                 |
| Disjuntor religado            | Circuit Breaker fecha (estado CLOSED)         |

### 1.2 Michael Nygard e "Release It!"

O Circuit Breaker Pattern foi popularizado por **Michael T. Nygard** em seu livro seminal **"Release It! Design and Deploy Production-Ready Software"** (Pragmatic Programmers, 2007; 2a edicao 2018). Nygard trouxe o conceito do mundo eletrico para o design de software como um dos **Stability Patterns** -- padroes que aumentam a estabilidade de sistemas em producao.

No capitulo 5 da segunda edicao ("Stability Patterns"), Nygard apresenta aproximadamente dez padroes de estabilidade, entre eles:

- **Timeouts** -- nunca esperar indefinidamente
- **Circuit Breaker** -- parar de chamar servicos que estao falhando
- **Bulkheads** -- isolar componentes para evitar propagacao de falhas
- **Fail Fast** -- se vai falhar, falhe rapido
- **Handshaking** -- negociar capacidade antes de enviar carga
- **Steady State** -- manter o sistema em estado estavel

A motivacao central: **prevenir falhas em cascata** (cascading failures). Quando um servico A depende de B, e B esta lento ou falhando, A fica esperando (threads bloqueadas, conexoes esgotadas), o que faz A tambem falhar, propagando o problema para C, D, etc.

### 1.3 Martin Fowler e a Formalizacao

**Martin Fowler** publicou o artigo definitivo "CircuitBreaker" em seu bliki (blog/wiki), formalizando o padrao com codigo de exemplo e descricao detalhada dos estados. Segundo Fowler:

> "The basic idea behind the circuit breaker is very simple. You wrap a protected function call in a circuit breaker object, which monitors for failures. Once the failures reach a certain threshold, the circuit breaker trips, and all further calls to the circuit breaker return with an error, without the protected call being made at all."

Fowler tambem enfatiza pontos cruciais:

- **Nem todos os erros devem disparar o circuit breaker** -- erros de negocio (ex: validacao) sao diferentes de falhas de infraestrutura (timeout, conexao recusada).
- **O circuit breaker e um proxy transparente** -- o codigo cliente nao precisa saber dos detalhes internos.
- **Fallbacks sao essenciais** -- o circuit breaker nao resolve o problema, apenas evita agrava-lo; e necessario ter uma estrategia alternativa.

### 1.4 Fail-Fast e Falhas em Cascata

O principio **Fail-Fast** e o coracao do Circuit Breaker:

```
SEM Circuit Breaker:
  Cliente --> Servico A --> [espera 30s] --> Servico B (morto)
  Resultado: Thread bloqueada por 30s, timeout, retry, mais threads bloqueadas...
             Servico A esgota pool de threads --> Servico A morre
             Clientes de A falham --> Cascata completa

COM Circuit Breaker:
  Cliente --> Servico A --> [Circuit Breaker OPEN] --> Fallback imediato (2ms)
  Resultado: Resposta degradada mas RAPIDA, sistema continua operando
```

**Cascading Failure** e o cenario mais perigoso em sistemas distribuidos: uma unica falha se propaga exponencialmente. O Circuit Breaker atua como "firewall" entre servicos, contendo a falha no ponto de origem.

---

## 2. Maquina de Estados -- Os Tres Estados

O Circuit Breaker e implementado como uma **maquina de estados finita** (Finite State Machine) com tres estados primarios.

### 2.1 Diagrama de Estados ASCII

```
                    +--------------------------------------------------+
                    |                                                  |
                    |  Falha no teste                                  |
                    |  (trial request fails)                           |
                    v                                                  |
            +-------------+      timeout          +-----------+       |
  START --> |   CLOSED    | ---> expira -------->  | HALF-OPEN | ------+
            |  (Normal)   |                        | (Testando)|
            +------+------+                        +-----+-----+
                   |                                     |
                   |  failure count                      |  trial request
                   |  >= threshold                       |  succeeds
                   |                                     |
                   v                                     v
            +-------------+                        +-------------+
            |    OPEN     | <--- timeout --------- |   CLOSED    |
            | (Bloqueado) |      nao expirou       |  (Resetado) |
            +------+------+                        +-------------+
                   |
                   | apos wait duration
                   | timeout expira
                   v
            +-----------+
            | HALF-OPEN |
            | (Testando)|
            +-----------+
```

### 2.2 Diagrama Detalhado com Transicoes

```
    +=============================================================+
    |              CIRCUIT BREAKER STATE MACHINE                   |
    +=============================================================+

    +-------------------+
    |      CLOSED       |  <-- Estado inicial (tudo normal)
    |                   |
    | - Todas as        |
    |   chamadas passam |
    | - Contadores de   |           failure_count >= threshold
    |   falha ativos    | ----------------------------------------+
    | - Metricas sendo  |                                         |
    |   coletadas       |                                         |
    +--------+----------+                                         |
             ^                                                    |
             |                                                    |
             | success_count                                      v
             | >= threshold                              +-------------------+
             | (em half-open)                            |       OPEN        |
             |                                           |                   |
             |                                           | - TODAS chamadas  |
             |                                           |   BLOQUEADAS      |
    +--------+----------+                                | - Retorna erro    |
    |     HALF-OPEN     |                                |   imediatamente   |
    |                   |                                | - Timer iniciado  |
    | - Permite N       |    wait_duration expira        |   (wait_duration) |
    |   chamadas teste  | <------------------------------+                   |
    | - Monitora        |                                +-------------------+
    |   resultado       |
    | - Se falhar:      |----> volta para OPEN
    |   OPEN novamente  |
    +-------------------+
```

### 2.3 Descricao Detalhada de Cada Estado

#### CLOSED (Fechado -- Normal)

- **Comportamento**: Todas as requisicoes passam normalmente para o servico downstream.
- **Monitoramento**: O circuit breaker coleta metricas continuamente (taxa de falha, taxa de chamadas lentas, contagem de erros).
- **Sliding Window**: Usa uma janela deslizante (count-based ou time-based) para calcular as metricas.
- **Transicao para OPEN**: Quando a taxa de falha (failure rate) ou a taxa de chamadas lentas (slow call rate) excede o threshold configurado.

#### OPEN (Aberto -- Bloqueado)

- **Comportamento**: TODAS as chamadas sao **imediatamente rejeitadas** sem sequer tentar chamar o servico downstream.
- **Resposta**: Retorna uma excecao/erro (ex: `CallNotPermittedException`, `CircuitBreakerOpenException`) ou executa um **fallback**.
- **Timer**: Um timer de `wait_duration_in_open_state` e iniciado.
- **Transicao para HALF-OPEN**: Quando o timer expira, o circuit breaker transiciona automaticamente para Half-Open.

#### HALF-OPEN (Meio-Aberto -- Testando)

- **Comportamento**: Permite um numero **limitado** de chamadas de teste (`permitted_number_of_calls_in_half_open_state`).
- **Avaliacao**: Se as chamadas de teste tiverem sucesso, o servico e considerado recuperado.
- **Transicao para CLOSED**: Se a taxa de sucesso das chamadas de teste atingir o threshold de sucesso.
- **Transicao para OPEN**: Se alguma chamada de teste falhar (ou se a taxa de falha exceder o threshold), volta imediatamente para OPEN e reinicia o timer.

### 2.4 Estados Especiais (Resilience4j)

Alem dos tres estados normais, o Resilience4j implementa dois estados especiais:

- **DISABLED**: O circuit breaker esta desabilitado -- todas as chamadas passam, nenhuma metrica e coletada. Util para testes.
- **FORCED_OPEN**: O circuit breaker esta forcadamente aberto -- todas as chamadas sao rejeitadas. Util para manutencao planejada.

```
    Estados Especiais:

    +-------------------+     +-------------------+
    |     DISABLED      |     |   FORCED_OPEN     |
    |                   |     |                   |
    | - Bypass total    |     | - Bloqueio total  |
    | - Sem metricas    |     | - Sem transicoes  |
    | - Para testes     |     | - Para manutencao |
    +-------------------+     +-------------------+
```

---

## 3. Configuracao Detalhada

### 3.1 Parametros Fundamentais

| Parametro | Descricao | Valor Tipico | Impacto |
|-----------|-----------|--------------|---------|
| `failureRateThreshold` | % de falhas para abrir o circuito | 50% | Sensibilidade a falhas |
| `slowCallRateThreshold` | % de chamadas lentas para abrir | 100% | Sensibilidade a latencia |
| `slowCallDurationThreshold` | Duracao para considerar "lenta" | 60s | Definicao de "lento" |
| `slidingWindowType` | Tipo de janela deslizante | COUNT_BASED | Metodo de calculo |
| `slidingWindowSize` | Tamanho da janela | 100 | Amostra estatistica |
| `minimumNumberOfCalls` | Minimo de chamadas antes de avaliar | 100 | Evitar falsos positivos |
| `waitDurationInOpenState` | Tempo em OPEN antes de HALF-OPEN | 60s | Tempo de recuperacao |
| `permittedNumberOfCallsInHalfOpenState` | Chamadas teste em HALF-OPEN | 10 | Agressividade do teste |
| `automaticTransitionFromOpenToHalfOpenEnabled` | Transicao automatica | false | Controle de transicao |

### 3.2 Sliding Window: Count-Based vs Time-Based

#### Count-Based Sliding Window

Registra e agrega os resultados das ultimas N chamadas (onde N = `slidingWindowSize`).

```
Exemplo: slidingWindowSize = 10

Chamadas: [OK] [OK] [FAIL] [OK] [FAIL] [FAIL] [OK] [OK] [FAIL] [OK]
                                                                 ^
                                                           mais recente

Falhas: 4 de 10 = 40%
Se failureRateThreshold = 50% --> permanece CLOSED
Se failureRateThreshold = 30% --> transiciona para OPEN
```

**Vantagens:**
- Simples de entender e implementar
- Previsivel: sempre baseado nas ultimas N chamadas
- Bom para servicos com trafego constante

**Desvantagens:**
- Nao considera o fator tempo (falhas antigas tem mesmo peso)
- Em trafego baixo, pode demorar para acumular N chamadas

#### Time-Based Sliding Window

Registra e agrega os resultados das chamadas dos ultimos N segundos (onde N = `slidingWindowSize`).

```
Exemplo: slidingWindowSize = 60 (ultimos 60 segundos)

t=0s   t=15s  t=30s  t=45s  t=60s
|------|------|------|------|
 OK OK  FAIL   FAIL   OK
 OK     FAIL   OK     FAIL
        OK     FAIL

Chamadas no periodo: 10
Falhas: 5 = 50%
```

**Vantagens:**
- Sensivel ao tempo: falhas recentes tem peso proporcional
- Adapta-se automaticamente ao volume de trafego
- Melhor para servicos com trafego variavel

**Desvantagens:**
- Mais complexo de implementar (buckets de tempo)
- Pode ter comportamento imprevisivel em trafego muito baixo

### 3.3 Configuracao Exemplo -- Resilience4j (YAML)

```yaml
resilience4j:
  circuitbreaker:
    instances:
      # Circuit Breaker para API da corretora (critico)
      brokerApi:
        failure-rate-threshold: 50
        slow-call-rate-threshold: 80
        slow-call-duration-threshold: 5s
        sliding-window-type: COUNT_BASED
        sliding-window-size: 10
        minimum-number-of-calls: 5
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
        automatic-transition-from-open-to-half-open-enabled: true
        record-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
          - java.net.ConnectException
        ignore-exceptions:
          - com.example.BusinessException

      # Circuit Breaker para market data (menos critico)
      marketData:
        failure-rate-threshold: 60
        slow-call-rate-threshold: 90
        slow-call-duration-threshold: 3s
        sliding-window-type: TIME_BASED
        sliding-window-size: 60
        minimum-number-of-calls: 10
        wait-duration-in-open-state: 15s
        permitted-number-of-calls-in-half-open-state: 5
```

### 3.4 Configuracao Exemplo -- Polly (.NET / C#)

```csharp
// Circuit Breaker com Polly v8+
var circuitBreakerStrategy = new ResiliencePipelineBuilder()
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions
    {
        FailureRatio = 0.5,                          // 50% failure rate
        SamplingDuration = TimeSpan.FromSeconds(10),  // janela de 10s
        MinimumThroughput = 8,                        // minimo 8 chamadas
        BreakDuration = TimeSpan.FromSeconds(30),     // 30s em OPEN
        ShouldHandle = new PredicateBuilder()
            .Handle<HttpRequestException>()
            .Handle<TimeoutException>()
            .HandleResult<HttpResponseMessage>(r =>
                r.StatusCode == HttpStatusCode.ServiceUnavailable),
        OnOpened = args =>
        {
            Console.WriteLine($"Circuit OPENED! Failure ratio: {args.FailureRatio}");
            return ValueTask.CompletedTask;
        },
        OnClosed = args =>
        {
            Console.WriteLine("Circuit CLOSED - service recovered");
            return ValueTask.CompletedTask;
        },
        OnHalfOpened = args =>
        {
            Console.WriteLine("Circuit HALF-OPEN - testing...");
            return ValueTask.CompletedTask;
        }
    })
    .Build();
```

### 3.5 Configuracao Exemplo -- Python (pybreaker)

```python
import pybreaker
import logging

# Listener customizado para monitoramento
class CircuitBreakerMonitor(pybreaker.CircuitBreakerListener):
    def state_change(self, cb, old_state, new_state):
        logging.warning(
            f"Circuit Breaker '{cb.name}': {old_state.name} -> {new_state.name}"
        )

    def failure(self, cb, exc):
        logging.error(f"Circuit Breaker '{cb.name}': failure recorded - {exc}")

    def success(self, cb):
        logging.debug(f"Circuit Breaker '{cb.name}': success recorded")

# Configuracao do Circuit Breaker
broker_api_breaker = pybreaker.CircuitBreaker(
    name="broker_api",
    fail_max=5,                    # abre apos 5 falhas consecutivas
    reset_timeout=30,              # tenta reabrir apos 30 segundos
    exclude=[ValueError],          # nao conta erros de negocio
    listeners=[CircuitBreakerMonitor()]
)

# Uso como decorator
@broker_api_breaker
def call_broker_api(order):
    """Envia ordem para a corretora."""
    response = requests.post(
        "https://api.broker.com/orders",
        json=order,
        timeout=5
    )
    response.raise_for_status()
    return response.json()

# Uso como context manager
def get_market_data(symbol):
    try:
        with broker_api_breaker:
            return fetch_market_data(symbol)
    except pybreaker.CircuitBreakerError:
        # Fallback: retornar dados do cache
        return get_cached_market_data(symbol)
```

### 3.6 Configuracao Exemplo -- Python Async (aiobreaker)

```python
from aiobreaker import CircuitBreaker
from datetime import timedelta

# Circuit Breaker para operacoes async
broker_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=timedelta(seconds=60)
)

@broker_breaker
async def fetch_account_balance():
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://api.broker.com/account/balance",
            timeout=aiohttp.ClientTimeout(total=5)
        ) as response:
            return await response.json()
```

---

## 4. Padroes Relacionados -- Resilience Patterns

O Circuit Breaker nao atua sozinho. Ele faz parte de um ecossistema de **Resilience Patterns** que, combinados, criam sistemas verdadeiramente resilientes.

### 4.1 Mapa de Padroes de Resiliencia

```
+================================================================+
|                   RESILIENCE PATTERNS                           |
+================================================================+
|                                                                 |
|  +----------+    +----------------+    +----------+             |
|  |  RETRY   |--->| CIRCUIT BREAKER|--->| FALLBACK |             |
|  | (Tentar  |    | (Parar de      |    | (Plano B)|             |
|  |  de novo)|    |  tentar)       |    |          |             |
|  +----------+    +-------+--------+    +----------+             |
|                          |                                      |
|  +----------+    +-------+--------+    +----------+             |
|  | TIMEOUT  |    |    BULKHEAD    |    |   RATE   |             |
|  | (Limite  |    | (Isolamento de |    |  LIMITER |             |
|  |  de tempo|    |  recursos)     |    | (Limite  |             |
|  +----------+    +----------------+    |  de taxa)|             |
|                                        +----------+             |
+================================================================+
```

### 4.2 Retry Pattern

**O que faz**: Tenta novamente uma operacao que falhou, com a expectativa de que falhas transitorias se resolvam.

**Relacao com Circuit Breaker**: O Retry opera DENTRO do Circuit Breaker. Quando o circuito esta CLOSED, retries sao permitidos. Quando esta OPEN, retries sao desnecessarios (fail-fast).

```
Fluxo combinado:

  Chamada --> [Circuit Breaker CLOSED?]
                    |
                   SIM --> [Retry Policy: max 3 tentativas]
                    |           |
                    |          SUCESSO --> retorna resultado
                    |           |
                    |          FALHA (3x) --> registra falha no CB
                    |
                   NAO (OPEN) --> [Fallback] --> retorna alternativa
```

**Configuracao tipica combinada (Resilience4j):**

```yaml
resilience4j:
  retry:
    instances:
      brokerApi:
        max-attempts: 3
        wait-duration: 500ms
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
```

### 4.3 Bulkhead Pattern

**O que faz**: Isola recursos (threads, conexoes) por servico/funcionalidade, impedindo que uma falha em um componente consuma todos os recursos do sistema.

**Analogia**: Assim como compartimentos estanques (bulkheads) em um navio impedem que agua invada todo o casco se um compartimento for comprometido.

```
SEM Bulkhead:                          COM Bulkhead:

+-------------------+                  +-------------------+
| Thread Pool (100) |                  | Servico A (30)    |
|                   |                  +-------------------+
| A A A A A A A A   |                  | Servico B (30)    |
| B B B B B B B B   |                  +-------------------+
| C C C C C C C C   |                  | Servico C (20)    |
|                   |                  +-------------------+
| Se B travar:      |                  | Reserva (20)      |
| TODAS as threads  |                  +-------------------+
| ficam bloqueadas! |
+-------------------+                  Se B travar: apenas
                                       30 threads afetadas!
```

**Tipos de Bulkhead:**

- **Semaphore-based**: Limita chamadas concorrentes (leve, sem threads extras)
- **ThreadPool-based**: Executa chamadas em pool separado (isolamento total)

### 4.4 Timeout Pattern

**O que faz**: Define um tempo maximo de espera para qualquer chamada externa.

**Regra de ouro de Nygard**: "Timeouts devem diminuir a medida que voce vai mais fundo na cadeia de servicos."

```
Cliente --> Servico A (timeout: 10s) --> Servico B (timeout: 5s) --> Servico C (timeout: 2s)
```

Se Servico C demora mais que 2s, B recebe timeout. Se B demora mais que 5s, A recebe timeout. Isso impede que latencia se acumule.

### 4.5 Fallback Pattern

**O que faz**: Fornece uma resposta alternativa quando a chamada principal falha ou o circuit breaker esta aberto.

**Estrategias de Fallback:**

| Estrategia | Descricao | Exemplo (Trading Bot) |
|------------|-----------|----------------------|
| Cache | Retornar ultimo valor valido | Ultimo preco conhecido |
| Default | Retornar valor padrao | Posicao zero (seguro) |
| Degraded | Funcionalidade reduzida | Somente consultas, sem ordens |
| Alternative Service | Servico backup | API alternativa da corretora |
| Queue | Enfileirar para processamento posterior | Fila de ordens pendentes |
| Abort | Parar operacao de forma segura | Pausar trading |

### 4.6 Rate Limiter Pattern

**O que faz**: Limita o numero de chamadas por periodo de tempo, protegendo contra sobrecarga e respeitando limites de API.

**Relacao com Circuit Breaker**: O Rate Limiter atua ANTES do Circuit Breaker, prevenindo que excesso de chamadas cause falhas que disparariam o circuit breaker.

### 4.7 Combinacao Recomendada (Pipeline de Resiliencia)

A ordem recomendada de composicao dos patterns:

```
Request
  |
  v
[Rate Limiter]        -- Limita taxa de chamadas
  |
  v
[Timeout]             -- Define tempo maximo
  |
  v
[Circuit Breaker]     -- Monitora e bloqueia se necessario
  |
  v
[Retry]               -- Tenta novamente (se CB esta closed)
  |
  v
[Bulkhead]            -- Isola recursos
  |
  v
[Chamada Real]        -- Executa a operacao
  |
  v
[Fallback]            -- Se tudo falhar, plano B
```

**Estudo estatistico**: Pesquisas indicam que a combinacao de Circuit Breaker reduziu taxas de erro em **58%**, Bulkhead melhorou disponibilidade em **10%**, e Retry aumentou taxa de sucesso em **21%** (fonte: IEEE Chicago Section / Microservices Design Patterns for Cloud Architecture).

---

## 5. Implementacoes e Bibliotecas

### 5.1 Tabela Comparativa

| Biblioteca | Linguagem | Status | Destaques |
|-----------|-----------|--------|-----------|
| **Resilience4j** | Java | Ativo | Padrao atual para Java, leve, funcional |
| **Polly** | .NET (C#) | Ativo | Padrao para .NET, fluent API, v8+ com pipeline |
| **Hystrix** | Java | **Deprecated** | Netflix, pioneiro, substituido pelo Resilience4j |
| **pybreaker** | Python | Ativo | Simples, sincrono, listeners |
| **aiobreaker** | Python | Ativo | Asyncio nativo, baseado no pybreaker |
| **circuitbreaker** | Python | Ativo | Minimalista, decorator-based |
| **Sentinel** | Java | Ativo | Alibaba, flow control + circuit breaker |
| **Istio** | Service Mesh | Ativo | Infraestrutura, transparente para app |
| **Envoy** | Proxy | Ativo | Outlier detection, connection pool |
| **purgatory** | Python | Ativo | Sync + Async, context manager |

### 5.2 Resilience4j (Java) -- Referencia Principal

Resilience4j e a biblioteca de resiliencia mais utilizada no ecossistema Java/Spring Boot. Substitui o Hystrix (Netflix) que foi deprecated.

**Caracteristicas:**
- Leve: sem dependencias externas alem do Vavr
- Funcional: baseada em decorators (Function, Supplier, Runnable)
- Modular: cada pattern e um modulo independente
- Integracao nativa com Spring Boot, Micrometer, Prometheus

**Modulos principais:**
- `resilience4j-circuitbreaker` -- Circuit Breaker
- `resilience4j-retry` -- Retry
- `resilience4j-bulkhead` -- Bulkhead (semaphore e threadpool)
- `resilience4j-ratelimiter` -- Rate Limiter
- `resilience4j-timelimiter` -- Time Limiter
- `resilience4j-cache` -- Cache

**Exemplo programatico:**

```java
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)
    .slowCallRateThreshold(80)
    .slowCallDurationThreshold(Duration.ofSeconds(5))
    .slidingWindowType(SlidingWindowType.COUNT_BASED)
    .slidingWindowSize(10)
    .minimumNumberOfCalls(5)
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .permittedNumberOfCallsInHalfOpenState(3)
    .automaticTransitionFromOpenToHalfOpenEnabled(true)
    .recordExceptions(IOException.class, TimeoutException.class)
    .ignoreExceptions(BusinessException.class)
    .build();

CircuitBreaker circuitBreaker = CircuitBreaker.of("brokerApi", config);

// Decorar uma funcao
Supplier<String> decoratedSupplier = CircuitBreaker
    .decorateSupplier(circuitBreaker, () -> brokerService.getBalance());

// Executar com fallback
Try<String> result = Try.ofSupplier(decoratedSupplier)
    .recover(CallNotPermittedException.class, e -> "Cached balance: $10,000")
    .recover(Exception.class, e -> "Service unavailable");
```

### 5.3 Polly (.NET)

Polly e a biblioteca padrao de resiliencia para o ecossistema .NET.

**Tipos de Circuit Breaker no Polly:**
- **Standard**: Conta falhas consecutivas
- **Advanced**: Mede taxa de falhas em janela de amostragem (similar ao Resilience4j)

```csharp
// Polly v8+ com ResiliencePipeline
var pipeline = new ResiliencePipelineBuilder<HttpResponseMessage>()
    .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
    {
        MaxRetryAttempts = 3,
        Delay = TimeSpan.FromMilliseconds(500),
        BackoffType = DelayBackoffType.Exponential
    })
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions<HttpResponseMessage>
    {
        FailureRatio = 0.5,
        SamplingDuration = TimeSpan.FromSeconds(10),
        MinimumThroughput = 8,
        BreakDuration = TimeSpan.FromSeconds(30)
    })
    .AddTimeout(TimeSpan.FromSeconds(10))
    .Build();
```

### 5.4 Hystrix (Netflix) -- Historico

Hystrix foi o **pioneiro** em circuit breakers para microservicos, criado pela Netflix para proteger seus servicos de streaming. **Deprecated desde 2018**, mas seu legado influenciou todas as bibliotecas modernas.

**Contribuicoes do Hystrix:**
- Popularizou o Circuit Breaker em producao de larga escala
- Introduziu o conceito de **Command Pattern** para resiliencia
- Dashboard em tempo real (Hystrix Dashboard + Turbine)
- Isolamento por thread pool (bulkhead)
- Fallback chains

**Por que foi deprecated:**
- Arquitetura complexa (baseada em RxJava)
- Alto consumo de recursos (thread pools por comando)
- Netflix migrou para abordagens mais leves e reativas

### 5.5 Alibaba Sentinel

Sentinel e a solucao de resiliencia da Alibaba, mais abrangente que apenas circuit breaking.

**Diferenciais:**
- Flow control (controle de fluxo por QPS ou threads)
- Circuit breaking por tres estrategias:
  - **Slow Request Ratio**: % de chamadas lentas
  - **Error Ratio**: % de erros
  - **Error Count**: contagem absoluta de erros
- Dashboard web em tempo real
- Integracao com Spring Cloud Alibaba, Dubbo, gRPC
- Regras dinamicas (armazenadas em Nacos, ZooKeeper, Apollo)

```java
// Sentinel - Regra de Circuit Breaking
DegradeRule rule = new DegradeRule("brokerApi")
    .setGrade(CircuitBreakerStrategy.SLOW_REQUEST_RATIO)
    .setCount(0.8)          // 80% slow request ratio
    .setTimeWindow(10)       // 10 segundos em OPEN
    .setMinRequestAmount(5)  // minimo 5 chamadas
    .setStatIntervalMs(1000) // janela de 1 segundo
    .setSlowRatioThreshold(3000); // 3s = lento
```

### 5.6 Istio / Envoy -- Circuit Breaking em Service Mesh

No mundo de Service Mesh, o circuit breaking acontece na **camada de infraestrutura**, transparente para a aplicacao.

**Istio usa dois mecanismos:**
1. **Connection Pool Settings**: Limita conexoes e requisicoes pendentes
2. **Outlier Detection**: Detecta e ejeta hosts com problema

```yaml
# Istio DestinationRule com Circuit Breaking
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: broker-api-circuit-breaker
spec:
  host: broker-api.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100          # max conexoes TCP
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 10  # max requisicoes pendentes
        http2MaxRequests: 100        # max requisicoes ativas
        maxRequestsPerConnection: 10 # max por conexao
        maxRetries: 3                # max retries
    outlierDetection:
      consecutive5xxErrors: 5        # 5 erros 5xx consecutivos
      interval: 10s                  # verifica a cada 10s
      baseEjectionTime: 30s          # tempo de ejecao base
      maxEjectionPercent: 50         # max 50% dos pods ejetados
      minHealthPercent: 50           # min 50% saudaveis
```

**Vantagem do Service Mesh**: A aplicacao nao precisa de nenhuma biblioteca ou codigo especial; o circuit breaking e configurado declarativamente na infraestrutura.

---

## 6. Circuit Breaker Distribuido

### 6.1 O Problema

Em um cenario de microservicos com multiplas instancias (replicas), cada instancia mantem seu proprio circuit breaker **local**. Isso cria um problema:

```
                    +-- Instancia A (CB: CLOSED, 2 falhas)
                    |
Load Balancer ----> +-- Instancia B (CB: CLOSED, 1 falha)
                    |
                    +-- Instancia C (CB: OPEN, 5 falhas)  <-- So C detectou!
                    |
                    +-- Instancia D (CB: CLOSED, 0 falhas)

Servico Downstream: FALHANDO!

Problema: A, B e D continuam enviando requests para o servico que esta falhando,
          porque seus circuit breakers locais ainda nao atingiram o threshold.
```

### 6.2 Solucao: Circuit Breaker Compartilhado via Redis

A solucao mais comum e compartilhar o estado do circuit breaker em um store distribuido como **Redis**.

```
                    +-- Instancia A --+
                    |                 |
Load Balancer ----> +-- Instancia B --+--> [Redis] <-- Estado compartilhado
                    |                 |    do Circuit Breaker
                    +-- Instancia C --+
                    |                 |
                    +-- Instancia D --+

Quando qualquer instancia registra uma falha,
TODAS as instancias veem o mesmo estado.
```

**Implementacao conceitual em Python:**

```python
import redis
import time
import json
from enum import Enum
from typing import Optional, Callable

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class DistributedCircuitBreaker:
    """
    Circuit Breaker distribuido usando Redis como backend.
    Todas as instancias compartilham o mesmo estado.
    """

    def __init__(
        self,
        name: str,
        redis_client: redis.Redis,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        timeout_duration: int = 30,  # segundos
        half_open_max_calls: int = 3
    ):
        self.name = name
        self.redis = redis_client
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout_duration = timeout_duration
        self.half_open_max_calls = half_open_max_calls
        self._key_prefix = f"circuit_breaker:{name}"

    @property
    def _state_key(self) -> str:
        return f"{self._key_prefix}:state"

    @property
    def _failure_count_key(self) -> str:
        return f"{self._key_prefix}:failure_count"

    @property
    def _success_count_key(self) -> str:
        return f"{self._key_prefix}:success_count"

    @property
    def _last_failure_time_key(self) -> str:
        return f"{self._key_prefix}:last_failure_time"

    @property
    def _half_open_calls_key(self) -> str:
        return f"{self._key_prefix}:half_open_calls"

    def get_state(self) -> CircuitState:
        """Obtem o estado atual do circuit breaker do Redis."""
        state = self.redis.get(self._state_key)
        if state is None:
            return CircuitState.CLOSED
        return CircuitState(state.decode())

    def _set_state(self, state: CircuitState):
        """Define o estado no Redis."""
        self.redis.set(self._state_key, state.value)

    def _should_transition_to_half_open(self) -> bool:
        """Verifica se o timeout expirou e deve ir para HALF_OPEN."""
        last_failure = self.redis.get(self._last_failure_time_key)
        if last_failure is None:
            return False
        elapsed = time.time() - float(last_failure)
        return elapsed >= self.timeout_duration

    def can_execute(self) -> bool:
        """Verifica se a chamada pode prosseguir."""
        state = self.get_state()

        if state == CircuitState.CLOSED:
            return True

        if state == CircuitState.OPEN:
            if self._should_transition_to_half_open():
                self._set_state(CircuitState.HALF_OPEN)
                self.redis.set(self._half_open_calls_key, 0)
                self.redis.set(self._success_count_key, 0)
                return True
            return False  # Ainda em OPEN, bloquear

        if state == CircuitState.HALF_OPEN:
            calls = int(self.redis.get(self._half_open_calls_key) or 0)
            return calls < self.half_open_max_calls

        return False

    def record_success(self):
        """Registra uma chamada bem-sucedida."""
        state = self.get_state()

        if state == CircuitState.HALF_OPEN:
            self.redis.incr(self._half_open_calls_key)
            successes = self.redis.incr(self._success_count_key)
            if int(successes) >= self.success_threshold:
                self._set_state(CircuitState.CLOSED)
                self.redis.set(self._failure_count_key, 0)
                self.redis.set(self._success_count_key, 0)

        elif state == CircuitState.CLOSED:
            # Reset failure count em sucesso (opcional, depende da estrategia)
            pass

    def record_failure(self):
        """Registra uma falha."""
        state = self.get_state()

        if state == CircuitState.HALF_OPEN:
            # Qualquer falha em HALF_OPEN volta para OPEN
            self._set_state(CircuitState.OPEN)
            self.redis.set(self._last_failure_time_key, time.time())
            return

        # Em CLOSED: incrementa contador de falhas
        failures = self.redis.incr(self._failure_count_key)
        self.redis.set(self._last_failure_time_key, time.time())

        if int(failures) >= self.failure_threshold:
            self._set_state(CircuitState.OPEN)

    def execute(self, func: Callable, fallback: Optional[Callable] = None):
        """Executa uma funcao protegida pelo circuit breaker."""
        if not self.can_execute():
            if fallback:
                return fallback()
            raise CircuitBreakerOpenError(
                f"Circuit breaker '{self.name}' is OPEN"
            )

        try:
            result = func()
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            if fallback:
                return fallback()
            raise

class CircuitBreakerOpenError(Exception):
    pass
```

### 6.3 Consideracoes do Circuit Breaker Distribuido

| Aspecto | Local | Distribuido |
|---------|-------|-------------|
| Latencia | Nenhuma (in-memory) | +1-5ms (Redis round-trip) |
| Consistencia | Perfeita (por instancia) | Eventual (race conditions) |
| Complexidade | Baixa | Media-Alta |
| Visibilidade | Isolada | Global |
| Decisao agregada | Nao | Sim |
| Dependencia extra | Nenhuma | Redis (mais um ponto de falha) |

**Quando usar distribuido:**
- Servicos com muitas replicas e trafego distribuido
- Quando a deteccao rapida e mais importante que a latencia adicional
- Quando se quer uma visao global do estado dos servicos

**Quando usar local:**
- Servicos com poucas instancias
- Quando latencia extra e inaceitavel
- Quando cada instancia tem trafego suficiente para detectar problemas sozinha

---

## 7. Monitoramento e Observabilidade

### 7.1 Metricas Essenciais

O monitoramento do Circuit Breaker e **critico**. Um circuit breaker sem observabilidade e como um disjuntor sem indicador de estado -- voce nao sabe se esta protegendo ou causando problemas.

**Metricas que devem ser coletadas:**

| Metrica | Descricao | Alerta Quando |
|---------|-----------|---------------|
| `circuit_breaker_state` | Estado atual (0=closed, 1=open, 2=half-open) | Muda para OPEN |
| `circuit_breaker_failure_rate` | Taxa de falha (%) | > threshold |
| `circuit_breaker_slow_call_rate` | Taxa de chamadas lentas (%) | > threshold |
| `circuit_breaker_calls_total` | Total de chamadas (sucesso/falha/rejeitada) | Queda abrupta |
| `circuit_breaker_not_permitted_calls` | Chamadas bloqueadas pelo CB | Qualquer valor > 0 |
| `circuit_breaker_state_transitions` | Contador de transicoes de estado | Frequencia alta |
| `circuit_breaker_call_duration` | Latencia das chamadas | p99 > slow_call_threshold |

### 7.2 Integracao com Prometheus (Resilience4j)

O Resilience4j exporta metricas automaticamente via Micrometer para Prometheus.

**Metricas exportadas:**

```
# Estado do circuit breaker (gauge)
resilience4j_circuitbreaker_state{name="brokerApi"} 0.0

# Chamadas por resultado (counter)
resilience4j_circuitbreaker_calls_seconds_count{
  kind="successful", name="brokerApi"
} 1523.0

resilience4j_circuitbreaker_calls_seconds_count{
  kind="failed", name="brokerApi"
} 42.0

resilience4j_circuitbreaker_calls_seconds_count{
  kind="not_permitted", name="brokerApi"
} 8.0

# Taxa de falha (gauge)
resilience4j_circuitbreaker_failure_rate{name="brokerApi"} 12.5

# Chamadas lentas (gauge)
resilience4j_circuitbreaker_slow_call_rate{name="brokerApi"} 5.0

# Chamadas em buffer (gauge)
resilience4j_circuitbreaker_buffered_calls{
  kind="successful", name="brokerApi"
} 8.0

resilience4j_circuitbreaker_buffered_calls{
  kind="failed", name="brokerApi"
} 2.0
```

### 7.3 Dashboard Grafana -- Queries Recomendadas

```
=== DASHBOARD: CIRCUIT BREAKER HEALTH ===

+--------------------------------------------------+
| PAINEL 1: Estado Atual (Stat/Gauge)               |
|                                                    |
| Query: resilience4j_circuitbreaker_state           |
|        {name="brokerApi"}                          |
|                                                    |
| Mapeamento: 0=CLOSED(verde), 1=OPEN(vermelho),    |
|             2=HALF_OPEN(amarelo)                   |
+--------------------------------------------------+

+--------------------------------------------------+
| PAINEL 2: Taxa de Falha (Time Series)              |
|                                                    |
| Query: resilience4j_circuitbreaker_failure_rate    |
|        {name="brokerApi"}                          |
|                                                    |
| Threshold line: failureRateThreshold (50%)         |
+--------------------------------------------------+

+--------------------------------------------------+
| PAINEL 3: Chamadas por Resultado (Stacked Bar)     |
|                                                    |
| Query: rate(resilience4j_circuitbreaker_calls      |
|        _seconds_count{name="brokerApi"}[5m])       |
|                                                    |
| Series: successful(verde), failed(vermelho),       |
|         not_permitted(cinza)                        |
+--------------------------------------------------+

+--------------------------------------------------+
| PAINEL 4: Latencia p50/p95/p99 (Time Series)      |
|                                                    |
| Query: histogram_quantile(0.99,                    |
|   rate(resilience4j_circuitbreaker_calls           |
|   _seconds_bucket{name="brokerApi"}[5m]))          |
+--------------------------------------------------+

+--------------------------------------------------+
| PAINEL 5: Transicoes de Estado (Annotations)       |
|                                                    |
| Query: changes(resilience4j_circuitbreaker_state   |
|        {name="brokerApi"}[1m]) > 0                 |
|                                                    |
| Mostrar como anotacoes no grafico de taxa de falha |
+--------------------------------------------------+
```

### 7.4 Alertas Recomendados

```yaml
# Prometheus alerting rules
groups:
  - name: circuit_breaker_alerts
    rules:
      # Alerta: Circuit Breaker abriu
      - alert: CircuitBreakerOpen
        expr: resilience4j_circuitbreaker_state{} == 1
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Circuit Breaker {{ $labels.name }} OPEN"
          description: >
            O circuit breaker {{ $labels.name }} abriu, indicando que
            o servico downstream esta falhando. Chamadas estao sendo
            bloqueadas. Verificar o servico imediatamente.

      # Alerta: Taxa de falha alta (mas CB ainda fechado)
      - alert: CircuitBreakerHighFailureRate
        expr: resilience4j_circuitbreaker_failure_rate{} > 30
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Alta taxa de falha no CB {{ $labels.name }}: {{ $value }}%"
          description: >
            A taxa de falha esta em {{ $value }}%, se aproximando do
            threshold. O circuit breaker pode abrir em breve.

      # Alerta: Circuit Breaker oscilando (flapping)
      - alert: CircuitBreakerFlapping
        expr: changes(resilience4j_circuitbreaker_state{}[10m]) > 4
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Circuit Breaker {{ $labels.name }} oscilando"
          description: >
            O CB trocou de estado {{ $value }} vezes nos ultimos 10min.
            Isso indica que o servico esta instavel ou o CB esta
            mal configurado.

      # Alerta: Muitas chamadas bloqueadas
      - alert: CircuitBreakerBlockingCalls
        expr: >
          rate(resilience4j_circuitbreaker_calls_seconds_count
          {kind="not_permitted"}[5m]) > 0.1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "CB {{ $labels.name }} bloqueando chamadas"
```

---

## 8. Anti-Patterns e Erros Comuns

### 8.1 Catalogo de Anti-Patterns

#### Anti-Pattern 1: Circuit Breaker para Tudo

**Problema**: Envolver TODAS as chamadas (inclusive locais, em-memoria) em circuit breakers.

**Por que e ruim**: Circuit breakers adicionam overhead (metricas, contadores, lock). Chamadas locais nao precisam de protecao contra falhas de rede.

**Regra**: Use circuit breakers apenas para chamadas a **servicos externos** ou **recursos remotos** (APIs, bancos de dados, filas).

```
ERRADO:                              CORRETO:
@circuit_breaker                     def calculate_risk(data):
def calculate_risk(data):                # Logica local, sem CB
    return data.price * data.qty         return data.price * data.qty

@circuit_breaker                     @circuit_breaker
def get_price_from_api():            def get_price_from_api():
    return api.get("/price")             return api.get("/price")
```

#### Anti-Pattern 2: Threshold Unico para Tudo

**Problema**: Usar a mesma configuracao de circuit breaker para todos os servicos.

**Por que e ruim**: Servicos diferentes tem perfis de falha diferentes. A API de trading precisa de threshold baixo (5%) porque falhas sao criticas, enquanto um servico de notificacao pode tolerar 30%.

```
ERRADO:                              CORRETO:
# Mesmo config para tudo             # Config por servico
cb = CircuitBreaker(fail_max=5)      trading_cb = CircuitBreaker(
                                         fail_max=3,
                                         reset_timeout=10
                                     )
                                     notification_cb = CircuitBreaker(
                                         fail_max=10,
                                         reset_timeout=60
                                     )
```

#### Anti-Pattern 3: Sem Fallback

**Problema**: O circuit breaker abre e simplesmente retorna um erro generico.

**Por que e ruim**: Trocar "timeout de 30s" por "erro em 1ms" nao resolve o problema do usuario. E necessario ter uma alternativa funcional.

```
ERRADO:                              CORRETO:
try:                                 try:
    result = cb.call(api.get)            result = cb.call(api.get)
except CircuitBreakerError:          except CircuitBreakerError:
    raise ServiceUnavailable()           result = cache.get_last()
                                         if not result:
                                             result = safe_default()
                                         log.warning("Using fallback")
```

#### Anti-Pattern 4: Threshold Muito Baixo (Trigger-Happy)

**Problema**: Configurar o circuit breaker para abrir com poucas falhas (ex: 2 falhas em janela de 3 chamadas).

**Por que e ruim**: Falhas transitorias sao normais. Um threshold muito baixo causa "false trips" -- o circuit breaker abre desnecessariamente, causando mais indisponibilidade do que previne.

**Dados**: 80% das organizacoes enfrentam aumento de downtime devido a misconfiguracao de thresholds (MoldStud, 2025).

**Regra de ouro (AKF Partners)**: Comece com **5 falhas em 10 segundos** com timeout de **30 segundos** como ponto de partida conservador.

#### Anti-Pattern 5: Threshold Muito Alto (Ignoring Problems)

**Problema**: Configurar threshold tao alto (ex: 95% failure rate) que o circuit breaker nunca abre na pratica.

**Por que e ruim**: O servico downstream ja esta morto, mas o circuit breaker continua enviando requests, consumindo recursos e aumentando a latencia.

#### Anti-Pattern 6: Ignorar Chamadas Lentas (Slow Calls)

**Problema**: Configurar apenas `failureRateThreshold` e ignorar `slowCallRateThreshold`.

**Por que e ruim**: Um servico pode nao estar retornando erros, mas respondendo em 30 segundos ao inves de 200ms. Isso e tao danoso quanto uma falha -- threads ficam bloqueadas, pools esgotam.

#### Anti-Pattern 7: Timeout Chain Invertido

**Problema**: Configurar timeouts que crescem a medida que voce desce na cadeia de servicos.

```
ERRADO:
A (timeout: 2s) --> B (timeout: 5s) --> C (timeout: 10s)
  ^-- A desiste antes de B responder!

CORRETO:
A (timeout: 15s) --> B (timeout: 10s) --> C (timeout: 5s)
  ^-- A espera tempo suficiente para B+C responderem
```

#### Anti-Pattern 8: Circuit Breaker Sem Monitoramento

**Problema**: Implementar circuit breaker mas nao monitorar seus estados e transicoes.

**Por que e ruim**: Sem monitoramento, voce nao sabe:
- Quando o circuit breaker abre/fecha
- Se esta oscilando (flapping)
- Se os thresholds estao adequados
- Se o fallback esta sendo acionado com frequencia

**Dados**: Apenas **30%** das equipes utilizam ferramentas efetivas de observabilidade para rastrear mudancas de estado do circuit breaker (MoldStud, 2025).

#### Anti-Pattern 9: Circuit Breaker em Serie (Chamadas Encadeadas)

**Problema**: Fazer chamadas em serie dentro de um circuit breaker, onde cada chamada depende da anterior.

**Por que e ruim**: Se a primeira chamada falha, as demais falham em cascata, mas todas contam como uma unica falha no circuit breaker. A granularidade e inadequada.

**Solucao**: Cada chamada externa deve ter seu proprio circuit breaker.

#### Anti-Pattern 10: Nao Distinguir Tipos de Erro

**Problema**: Tratar todos os erros igualmente no circuit breaker.

**Por que e ruim**: Um erro `404 Not Found` (recurso nao existe) e diferente de um `503 Service Unavailable` (servico fora do ar). O primeiro e um erro de negocio; o segundo e uma falha de infraestrutura.

```python
# Configurar quais excecoes contam como "falha"
broker_cb = pybreaker.CircuitBreaker(
    fail_max=5,
    exclude=[
        ValueError,           # Erro de validacao - nao e falha
        OrderNotFoundException,  # Recurso nao encontrado - nao e falha
    ]
    # Apenas IOException, TimeoutError, ConnectionError contam
)
```

### 8.2 Checklist de Validacao

```
[ ] Cada servico externo tem seu proprio circuit breaker?
[ ] Os thresholds sao especificos por servico/criticidade?
[ ] Existe fallback para quando o circuit breaker abre?
[ ] O fallback foi TESTADO?
[ ] Slow call threshold esta configurado (nao apenas failure rate)?
[ ] As metricas do CB estao sendo exportadas e visualizadas?
[ ] Existem alertas para OPEN state e flapping?
[ ] Os tipos de erro estao corretamente classificados (falha vs negocio)?
[ ] Os timeouts da cadeia de servicos estao na ordem correta?
[ ] O circuit breaker foi testado em cenario de falha (chaos engineering)?
```

---

## 9. Aplicacao ao Trading Bot

### 9.1 Contexto do BOT Assessor

O BOT Assessor e um trading bot que interage com:
- **API da Corretora** (envio de ordens, consulta de posicoes, saldo)
- **Market Data Feed** (precos em tempo real, book de ofertas)
- **Servicos internos** (calculo de risco, sinais, estrategias)

Cada um destes pontos de integracao e um candidato para Circuit Breaker.

### 9.2 Arquitetura de Circuit Breakers para o Bot

```
+==================================================================+
|                    BOT ASSESSOR - CIRCUIT BREAKERS                |
+==================================================================+

                        +-------------------+
                        |   STRATEGY ENGINE  |
                        |   (Logica Local)  |
                        +--------+----------+
                                 |
                    +------------+------------+
                    |            |            |
              +-----+-----+ +---+---+ +------+------+
              | ORDER      | | MARKET| | ACCOUNT     |
              | EXECUTION  | | DATA  | | MANAGEMENT  |
              +-----+-----+ +---+---+ +------+------+
                    |            |            |
              [CB-ORDERS]  [CB-MARKET] [CB-ACCOUNT]
                    |            |            |
              +-----+-----+ +---+---+ +------+------+
              | API        | | API   | | API         |
              | /orders    | | /quotes| | /balance   |
              | /cancel    | | /book  | | /positions |
              +------------+ +--------+ +-------------+
                    |            |            |
              ======+============+============+=======
              |        BROKER API (EXTERNAL)          |
              +=======================================+
```

### 9.3 Configuracao Recomendada por Circuit Breaker

#### CB-ORDERS (Execucao de Ordens) -- CRITICIDADE MAXIMA

```python
import pybreaker
from datetime import timedelta

class OrderCircuitBreakerConfig:
    """
    Circuit Breaker para execucao de ordens.
    CRITICO: falhas aqui podem causar prejuizo financeiro direto.
    """
    FAILURE_THRESHOLD = 3       # Abre com APENAS 3 falhas (conservador)
    RESET_TIMEOUT = 60          # Espera 60s antes de testar (dar tempo)
    HALF_OPEN_MAX_CALLS = 1     # Apenas 1 chamada de teste
    SLOW_CALL_THRESHOLD_MS = 5000  # 5 segundos = lento para ordem

    # Acoes quando o CB abre:
    FALLBACK_ACTIONS = [
        "CANCEL_PENDING_ORDERS",    # Cancela ordens pendentes
        "PAUSE_NEW_ORDERS",          # Pausa novas ordens
        "ALERT_OPERATOR",            # Notifica operador
        "LOG_OPEN_POSITIONS",        # Registra posicoes abertas
    ]

order_breaker = pybreaker.CircuitBreaker(
    name="broker_orders",
    fail_max=OrderCircuitBreakerConfig.FAILURE_THRESHOLD,
    reset_timeout=OrderCircuitBreakerConfig.RESET_TIMEOUT,
    exclude=[
        OrderAlreadyExistsError,     # Erro de negocio, nao infraestrutura
        InsufficientBalanceError,    # Erro de negocio
        InvalidSymbolError,          # Erro de negocio
    ],
    listeners=[TradingCircuitBreakerMonitor()]
)
```

#### CB-MARKET (Market Data) -- CRITICIDADE ALTA

```python
class MarketDataCircuitBreakerConfig:
    """
    Circuit Breaker para dados de mercado.
    IMPORTANTE mas tem fallback natural (cache de precos recentes).
    """
    FAILURE_THRESHOLD = 5        # Um pouco mais tolerante
    RESET_TIMEOUT = 15           # Testa mais rapido (dados sao efemeros)
    HALF_OPEN_MAX_CALLS = 3      # Mais chamadas de teste
    SLOW_CALL_THRESHOLD_MS = 2000  # 2 segundos = lento para market data

    FALLBACK_ACTIONS = [
        "USE_CACHED_PRICES",         # Usar ultimo preco conhecido
        "WIDEN_SPREAD_TOLERANCE",    # Aumentar tolerancia de spread
        "REDUCE_POSITION_SIZE",      # Reduzir tamanho de posicoes
        "SWITCH_TO_WEBSOCKET",       # Tentar WebSocket se REST falhar
    ]

market_data_breaker = pybreaker.CircuitBreaker(
    name="market_data",
    fail_max=MarketDataCircuitBreakerConfig.FAILURE_THRESHOLD,
    reset_timeout=MarketDataCircuitBreakerConfig.RESET_TIMEOUT,
    listeners=[TradingCircuitBreakerMonitor()]
)
```

#### CB-ACCOUNT (Gestao de Conta) -- CRITICIDADE MEDIA

```python
class AccountCircuitBreakerConfig:
    """
    Circuit Breaker para consultas de conta (saldo, posicoes).
    Menos critico pois pode usar cache de curta duracao.
    """
    FAILURE_THRESHOLD = 5
    RESET_TIMEOUT = 30
    HALF_OPEN_MAX_CALLS = 2
    SLOW_CALL_THRESHOLD_MS = 10000  # 10 segundos (menos urgente)

    FALLBACK_ACTIONS = [
        "USE_CACHED_BALANCE",        # Saldo cacheado
        "BLOCK_NEW_ORDERS",          # Nao abrir novas posicoes
        "MAINTAIN_EXISTING",         # Manter posicoes existentes
    ]

account_breaker = pybreaker.CircuitBreaker(
    name="account_management",
    fail_max=AccountCircuitBreakerConfig.FAILURE_THRESHOLD,
    reset_timeout=AccountCircuitBreakerConfig.RESET_TIMEOUT,
    listeners=[TradingCircuitBreakerMonitor()]
)
```

### 9.4 Estrategia de Fallback para Trading Bot

```
+=================================================================+
|            FALLBACK STRATEGY DECISION TREE                       |
+=================================================================+

  CB-ORDERS abre?
  |
  +-- SIM --> [1] Pausar envio de NOVAS ordens
  |           [2] Cancelar ordens PENDENTES (se possivel)
  |           [3] Registrar posicoes abertas em log/arquivo
  |           [4] Alertar operador (Telegram/Email/SMS)
  |           [5] Iniciar timer: se > 5min OPEN --> modo seguro
  |
  CB-MARKET abre?
  |
  +-- SIM --> [1] Usar ultimo preco valido do cache
  |           [2] Se cache > 30s: PARAR de abrir novas posicoes
  |           [3] Se cache > 60s: fechar posicoes no proximo tick
  |           [4] Alertar operador
  |
  CB-ACCOUNT abre?
  |
  +-- SIM --> [1] Usar saldo/posicoes cacheados
              [2] Bloquear novas ordens (seguranca)
              [3] Manter posicoes existentes
              [4] Quando CB fechar: reconciliar estado
```

### 9.5 Implementacao Completa para o Bot

```python
import pybreaker
import logging
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger("trading.circuit_breaker")

# --------------------------------------------------------------------------
# Monitoramento
# --------------------------------------------------------------------------

class TradingCircuitBreakerMonitor(pybreaker.CircuitBreakerListener):
    """
    Listener que monitora transicoes do Circuit Breaker
    e executa acoes de seguranca para o trading bot.
    """

    def __init__(self, alert_service=None, metrics_collector=None):
        self.alert_service = alert_service
        self.metrics = metrics_collector

    def state_change(self, cb, old_state, new_state):
        logger.critical(
            f"[CIRCUIT BREAKER] {cb.name}: "
            f"{old_state.name} -> {new_state.name}"
        )

        # Exportar metrica
        if self.metrics:
            self.metrics.gauge(
                "circuit_breaker_state",
                self._state_to_int(new_state),
                tags={"name": cb.name}
            )

        # Alertar se abriu
        if new_state.name == "open":
            self._on_circuit_open(cb)
        elif new_state.name == "closed" and old_state.name != "closed":
            self._on_circuit_closed(cb)

    def failure(self, cb, exc):
        logger.error(
            f"[CIRCUIT BREAKER] {cb.name}: failure - {type(exc).__name__}: {exc}"
        )
        if self.metrics:
            self.metrics.increment(
                "circuit_breaker_failures_total",
                tags={"name": cb.name, "exception": type(exc).__name__}
            )

    def success(self, cb):
        if self.metrics:
            self.metrics.increment(
                "circuit_breaker_successes_total",
                tags={"name": cb.name}
            )

    def _on_circuit_open(self, cb):
        """Acoes de emergencia quando o circuit breaker abre."""
        if self.alert_service:
            self.alert_service.send_critical(
                f"CIRCUIT BREAKER OPEN: {cb.name}\n"
                f"O bot pode estar sem acesso a: {cb.name}\n"
                f"Fallback ativado. Verificar imediatamente."
            )

    def _on_circuit_closed(self, cb):
        """Notifica recuperacao."""
        if self.alert_service:
            self.alert_service.send_info(
                f"CIRCUIT BREAKER RECOVERED: {cb.name}\n"
                f"Servico recuperado. Operacao normal retomada."
            )

    @staticmethod
    def _state_to_int(state) -> int:
        mapping = {"closed": 0, "open": 1, "half-open": 2}
        return mapping.get(state.name, -1)


# --------------------------------------------------------------------------
# Trading Bot com Circuit Breaker
# --------------------------------------------------------------------------

@dataclass
class TradingBotCircuitBreakers:
    """
    Gerencia todos os Circuit Breakers do trading bot.
    """

    # Cache para fallback
    _price_cache: Dict[str, Dict] = field(default_factory=dict)
    _balance_cache: Optional[float] = None
    _positions_cache: list = field(default_factory=list)

    def __post_init__(self):
        monitor = TradingCircuitBreakerMonitor()

        self.order_cb = pybreaker.CircuitBreaker(
            name="broker_orders",
            fail_max=3,
            reset_timeout=60,
            listeners=[monitor]
        )

        self.market_cb = pybreaker.CircuitBreaker(
            name="market_data",
            fail_max=5,
            reset_timeout=15,
            listeners=[monitor]
        )

        self.account_cb = pybreaker.CircuitBreaker(
            name="account_mgmt",
            fail_max=5,
            reset_timeout=30,
            listeners=[monitor]
        )

    # ----- Market Data com Fallback -----

    def get_price(self, symbol: str, broker_api) -> Optional[Dict]:
        """
        Obtem preco com circuit breaker e fallback para cache.
        """
        try:
            price_data = self.market_cb.call(
                broker_api.get_quote, symbol
            )
            # Atualizar cache em caso de sucesso
            self._price_cache[symbol] = {
                "data": price_data,
                "timestamp": time.time()
            }
            return price_data

        except pybreaker.CircuitBreakerError:
            logger.warning(
                f"Market data CB OPEN. Using cache for {symbol}"
            )
            return self._get_cached_price(symbol)

        except Exception as e:
            logger.error(f"Market data error: {e}")
            return self._get_cached_price(symbol)

    def _get_cached_price(self, symbol: str) -> Optional[Dict]:
        """Retorna preco do cache se ainda valido."""
        cached = self._price_cache.get(symbol)
        if cached is None:
            logger.error(f"No cached price for {symbol}")
            return None

        age = time.time() - cached["timestamp"]
        if age > 60:  # Cache mais de 60s = muito antigo
            logger.warning(
                f"Cache for {symbol} is {age:.0f}s old - STALE"
            )
        return cached["data"]

    # ----- Order Execution com Fallback -----

    def send_order(self, order: Dict, broker_api) -> Optional[Dict]:
        """
        Envia ordem com circuit breaker.
        Fallback: NAO envia ordem (seguranca).
        """
        try:
            result = self.order_cb.call(
                broker_api.place_order, order
            )
            return result

        except pybreaker.CircuitBreakerError:
            logger.critical(
                f"Order CB OPEN! Cannot send order: {order}. "
                f"PAUSING TRADING."
            )
            return None  # NAO envia ordem - seguranca

        except Exception as e:
            logger.error(f"Order execution error: {e}")
            return None

    # ----- Account Management com Fallback -----

    def get_balance(self, broker_api) -> Optional[float]:
        """
        Consulta saldo com circuit breaker e fallback para cache.
        """
        try:
            balance = self.account_cb.call(broker_api.get_balance)
            self._balance_cache = balance
            return balance

        except pybreaker.CircuitBreakerError:
            logger.warning("Account CB OPEN. Using cached balance.")
            return self._balance_cache

        except Exception as e:
            logger.error(f"Account error: {e}")
            return self._balance_cache

    # ----- Status Geral -----

    def get_health_status(self) -> Dict[str, str]:
        """Retorna status de saude de todos os circuit breakers."""
        return {
            "orders": self.order_cb.current_state,
            "market_data": self.market_cb.current_state,
            "account": self.account_cb.current_state,
            "overall": self._calculate_overall_health()
        }

    def _calculate_overall_health(self) -> str:
        states = [
            self.order_cb.current_state,
            self.market_cb.current_state,
            self.account_cb.current_state,
        ]
        if all(s == "closed" for s in states):
            return "HEALTHY"
        elif self.order_cb.current_state == "open":
            return "CRITICAL - ORDER CB OPEN"
        elif any(s == "open" for s in states):
            return "DEGRADED"
        else:
            return "RECOVERING"

    def should_trade(self) -> bool:
        """
        Decisao central: o bot deve continuar operando?

        Regras:
        - Se CB de ordens esta OPEN: NAO operar
        - Se CB de market data esta OPEN e cache > 60s: NAO operar
        - Se CB de conta esta OPEN: operar com cautela (posicoes menores)
        """
        if self.order_cb.current_state == "open":
            return False

        if self.market_cb.current_state == "open":
            # Verificar idade do cache
            if not self._price_cache:
                return False
            oldest_cache = min(
                c["timestamp"] for c in self._price_cache.values()
            )
            if time.time() - oldest_cache > 60:
                return False

        return True
```

### 9.6 Cenarios de Uso no Trading Bot

```
CENARIO 1: API da corretora cai durante o pregao
+------------------------------------------------------------+
| 1. Bot envia ordem --> timeout 5s --> CB conta falha        |
| 2. Mais 2 falhas --> CB-ORDERS abre                        |
| 3. Bot para de enviar ordens (fail-fast)                   |
| 4. Operador recebe alerta no Telegram                      |
| 5. Apos 60s, CB tenta HALF-OPEN                            |
| 6. 1 chamada de teste --> sucesso                           |
| 7. CB fecha --> trading retomado                            |
+------------------------------------------------------------+

CENARIO 2: Market data com latencia alta
+------------------------------------------------------------+
| 1. Precos chegando em 3s (normal: 200ms)                   |
| 2. CB-MARKET detecta slow calls > threshold                |
| 3. CB-MARKET abre --> bot usa cache de precos              |
| 4. Bot continua operando com precos "stale"                |
| 5. Se cache > 60s: bot para de abrir novas posicoes        |
| 6. Apos 15s, CB testa --> latencia normal                   |
| 7. CB fecha --> dados em tempo real retomados              |
+------------------------------------------------------------+

CENARIO 3: Rate limit da API excedido
+------------------------------------------------------------+
| 1. Bot faz muitas chamadas --> 429 Too Many Requests       |
| 2. Rate Limiter reduz taxa de chamadas                     |
| 3. Se erros 429 persistem --> CB-ORDERS abre               |
| 4. Bot pausa ordens por 60s (wait_duration)                |
| 5. HALF-OPEN: 1 chamada teste com rate limitado            |
| 6. Sucesso --> CB fecha, opera com taxa reduzida           |
+------------------------------------------------------------+

CENARIO 4: Falha total (todos os CBs abertos)
+------------------------------------------------------------+
| 1. Provavel problema de rede/infraestrutura                |
| 2. TODOS os CBs abrem simultaneamente                       |
| 3. Bot entra em MODO SEGURO:                                |
|    - Nenhuma ordem nova                                     |
|    - Registra estado completo em disco                      |
|    - Alerta URGENTE ao operador                             |
|    - Tenta reconexao periodica via HALF-OPEN               |
| 4. Quando CBs fecharem: reconcilia estado antes de operar  |
+------------------------------------------------------------+
```

### 9.7 Analogia com Circuit Breakers do Mercado Financeiro

Curiosamente, o conceito de Circuit Breaker existe tambem no proprio mercado financeiro, com a mesma finalidade: **prevenir falhas em cascata**.

| Aspecto | Mercado (SEC/B3) | Trading Bot |
|---------|-------------------|-------------|
| Trigger | Queda de 7%/13%/20% no indice | N falhas em janela de tempo |
| Acao | Halt de 15min / dia inteiro | Pausa de ordens / modo seguro |
| Objetivo | Permitir "digestao" de informacoes | Permitir recuperacao do servico |
| Reset | Automatico apos periodo | Automatico via HALF-OPEN |
| Niveis | Level 1, 2, 3 | Thresholds por servico |

Os circuit breakers do mercado foram criados apos o crash de **1987 (Black Monday)** e foram acionados notavelmente em **Marco de 2020** (COVID-19) -- 4 vezes em 10 dias.

---

## 10. Livros Fundamentais e Bibliografia

### 10.1 Leituras Obrigatorias (Tier 1)

| # | Livro | Autor(es) | Ano | Editora | Relevancia |
|---|-------|-----------|-----|---------|------------|
| 1 | **Release It! Design and Deploy Production-Ready Software** (2nd Ed.) | Michael T. Nygard | 2018 | Pragmatic Bookshelf | Obra fundacional. Cap. 4: Stability Antipatterns. Cap. 5: Stability Patterns (Circuit Breaker, Timeouts, Bulkheads). |
| 2 | **Building Microservices: Designing Fine-Grained Systems** (2nd Ed.) | Sam Newman | 2021 | O'Reilly | Cap. sobre resiliencia: timeouts, retries, bulkheads, circuit breakers, isolation, idempotency. |
| 3 | **Microservices Patterns: With Examples in Java** | Chris Richardson | 2018 | Manning | 44 patterns catalogados. Circuit Breaker como pattern de reliability. Exemplos com Java. |

### 10.2 Leituras Complementares (Tier 2)

| # | Livro | Autor(es) | Ano | Editora | Relevancia |
|---|-------|-----------|-----|---------|------------|
| 4 | **Designing Distributed Systems** | Brendan Burns | 2018 | O'Reilly | Patterns para sistemas distribuidos, incluindo resiliencia e tolerancia a falhas. |
| 5 | **Cloud Design Patterns** (Microsoft) | Microsoft Patterns & Practices | 2014+ | Microsoft Press | Catalogo oficial de patterns Azure, incluindo Circuit Breaker, Retry, Bulkhead. |
| 6 | **Site Reliability Engineering** | Betsy Beyer et al. (Google) | 2016 | O'Reilly | Praticas de SRE do Google. Error budgets, cascading failures, graceful degradation. |
| 7 | **Designing Data-Intensive Applications** | Martin Kleppmann | 2017 | O'Reilly | Fundamentos de sistemas distribuidos, falhas, tolerancia, consistencia. |

### 10.3 Artigos e Referencias Online (Tier 3)

| # | Titulo | Autor | Ano | URL |
|---|--------|-------|-----|-----|
| 8 | "CircuitBreaker" (bliki) | Martin Fowler | 2014 | https://martinfowler.com/bliki/CircuitBreaker.html |
| 9 | "Circuit Breaker Pattern" | Microsoft Azure Docs | 2024 | https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker |
| 10 | Resilience4j Documentation | Resilience4j Team | 2024 | https://resilience4j.readme.io/docs/circuitbreaker |
| 11 | "Circuit Breaker Pattern" | AWS Prescriptive Guidance | 2024 | https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html |
| 12 | "The Circuit Breaker Pattern - Dos and Don'ts" | AKF Partners | 2024 | https://akfpartners.com/growth-blog/the-circuit-breaker-pattern-dos-and-donts |
| 13 | "Pattern: Circuit Breaker" | Chris Richardson (microservices.io) | 2024 | https://microservices.io/patterns/reliability/circuit-breaker.html |
| 14 | "Resilience Design Patterns: Retry, Fallback, Timeout, Circuit Breaker" | codecentric | 2024 | https://www.codecentric.de/en/knowledge-hub/blog/resilience-design-patterns-retry-fallback-timeout-circuit-breaker |
| 15 | "Hystrix vs. Sentinel: A Tale of Two Circuit Breakers" | Alibaba Cloud | 2023 | https://www.alibabacloud.com/blog/hystrix-vs--sentinel-a-tale-of-two-circuit-breakers-part-1_594755 |
| 16 | "Circuit Breaker in Microservices: State of the Art and Future Prospects" (Paper) | ResearchGate | 2021 | https://www.researchgate.net/publication/350081823 |
| 17 | Polly Documentation - Circuit Breaker | Polly Team | 2024 | https://www.pollydocs.org/strategies/circuit-breaker.html |
| 18 | Alibaba Sentinel - Circuit Breaking | Alibaba | 2024 | https://github.com/alibaba/Sentinel/wiki/Circuit-Breaking |
| 19 | Istio Circuit Breaking | Istio Docs | 2024 | https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/ |
| 20 | "Microservices Design Patterns for Cloud Architecture" | IEEE Chicago Section | 2024 | https://ieeechicago.org/microservices-design-patterns-for-cloud-architecture/ |

---

## 11. Catalogo de Fontes

### Fontes Utilizadas nesta Pesquisa

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 1 | Release It! Second Edition | Michael T. Nygard | 2018 | Livro | https://pragprog.com/titles/mnee2/release-it-second-edition/ |
| 2 | CircuitBreaker (bliki) | Martin Fowler | 2014 | Artigo | https://martinfowler.com/bliki/CircuitBreaker.html |
| 3 | Circuit Breaker Pattern - Azure | Microsoft | 2024 | Documentacao | https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker |
| 4 | Resilience4j CircuitBreaker Docs | Resilience4j Team | 2024 | Documentacao | https://resilience4j.readme.io/docs/circuitbreaker |
| 5 | Circuit Breaker - AWS Prescriptive Guidance | AWS | 2024 | Documentacao | https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html |
| 6 | Building Microservices, 2nd Ed. | Sam Newman | 2021 | Livro | https://samnewman.io/books/building_microservices_2nd_edition/ |
| 7 | Microservices Patterns | Chris Richardson | 2018 | Livro | https://microservices.io/book |
| 8 | Pattern: Circuit Breaker | Chris Richardson | 2024 | Artigo | https://microservices.io/patterns/reliability/circuit-breaker.html |
| 9 | Polly - Circuit Breaker Strategy | Polly Team | 2024 | Documentacao | https://www.pollydocs.org/strategies/circuit-breaker.html |
| 10 | Alibaba Sentinel GitHub | Alibaba | 2024 | Repositorio | https://github.com/alibaba/Sentinel |
| 11 | Sentinel - Circuit Breaking Wiki | Alibaba | 2024 | Documentacao | https://github.com/alibaba/Sentinel/wiki/Circuit-Breaking |
| 12 | Istio Circuit Breaking | Istio | 2024 | Documentacao | https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/ |
| 13 | PyBreaker GitHub | Daniel Fernandes Martins | 2024 | Repositorio | https://github.com/danielfm/pybreaker |
| 14 | aiobreaker (PyPI) | Alexander Lyon | 2024 | Biblioteca | https://pypi.org/project/aiobreaker/ |
| 15 | circuitbreaker (PyPI) | Fabian Fuelling | 2024 | Biblioteca | https://pypi.org/project/circuitbreaker/ |
| 16 | Polly GitHub | App-vNext | 2024 | Repositorio | https://github.com/App-vNext/Polly |
| 17 | Circuit Breaker Dos and Don'ts | AKF Partners | 2024 | Artigo | https://akfpartners.com/growth-blog/the-circuit-breaker-pattern-dos-and-donts |
| 18 | Circuit Breaker Pattern - Baeldung | Baeldung | 2024 | Tutorial | https://www.baeldung.com/cs/microservices-circuit-breaker-pattern |
| 19 | Common Mistakes in Circuit Breaker | MoldStud | 2025 | Artigo | https://moldstud.com/articles/p-top-common-pitfalls-when-implementing-circuit-breaker-pattern-in-microservices |
| 20 | Resilience Design Patterns | codecentric | 2024 | Artigo | https://www.codecentric.de/en/knowledge-hub/blog/resilience-design-patterns-retry-fallback-timeout-circuit-breaker |
| 21 | Grafana Dashboard - Resilience4j CB | Grafana Labs | 2024 | Dashboard | https://grafana.com/grafana/dashboards/21307-circuit-breaker/ |
| 22 | Hystrix vs Sentinel (Part 1 & 2) | Alibaba Cloud | 2023 | Artigo | https://www.alibabacloud.com/blog/hystrix-vs--sentinel-a-tale-of-two-circuit-breakers-part-1_594755 |
| 23 | CB in Microservices (Paper) | ResearchGate | 2021 | Paper Academico | https://www.researchgate.net/publication/350081823 |
| 24 | Microservices Design Patterns for Cloud Architecture | IEEE Chicago | 2024 | Artigo Academico | https://ieeechicago.org/microservices-design-patterns-for-cloud-architecture/ |
| 25 | Stock Market Circuit Breakers | SEC / Investor.gov | 2024 | Documentacao | https://www.investor.gov/introduction-investing/investing-basics/glossary/stock-market-circuit-breakers |
| 26 | Circuit Breaker - Wikipedia | Wikipedia | 2024 | Enciclopedia | https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern |
| 27 | Distributed CB with Redis (Node.js) | Minhaj (Medium) | 2024 | Tutorial | https://medium.com/@mdminhajgdr/building-a-distributed-circuit-breaker-in-node-js-with-redis-ed40852101cc |
| 28 | CB - Itau Tecnologia | Itau Tech | 2023 | Artigo (PT-BR) | https://medium.com/@itautecnologia/compreendendo-o-conceito-de-circuit-breaker-e-sua-aplica%C3%A7%C3%A3o-em-arquitetura-de-microsservi%C3%A7os-108dc2d1be2c |
| 29 | CB - LuizaLabs | Henrique Braga | 2022 | Artigo (PT-BR) | https://medium.com/luizalabs/circuit-breaker-lidando-com-falhas-em-micro-servi%C3%A7os-911f53d097ba |
| 30 | Padroes de Resiliencia | Zup Innovation | 2023 | Artigo (PT-BR) | https://zup.com.br/blog/padroes-de-resiliencia-para-microsservicos/ |

---

## Apendice A: Glossario

| Termo | Definicao |
|-------|-----------|
| **Cascading Failure** | Falha que se propaga de um servico para outros, causando colapso sistemico |
| **Fail-Fast** | Principio de falhar imediatamente quando se detecta que uma operacao nao pode ter sucesso |
| **Fallback** | Resposta alternativa quando a operacao principal falha |
| **Flapping** | Oscilacao rapida entre estados OPEN e CLOSED, indicando instabilidade |
| **Half-Open** | Estado intermediario onde o circuit breaker testa se o servico se recuperou |
| **Outlier Detection** | Mecanismo (Istio/Envoy) que detecta e ejeta hosts com problemas |
| **Sliding Window** | Janela movel (por contagem ou tempo) usada para calcular metricas |
| **Threshold** | Limite que, quando excedido, dispara a transicao de estado |
| **Trip** | Acao de "desarmar" o circuit breaker (transicionar de CLOSED para OPEN) |
| **Wait Duration** | Tempo que o circuit breaker permanece em OPEN antes de ir para HALF-OPEN |

---

## Apendice B: Decisao Rapida -- Quando Usar Circuit Breaker

```
Voce esta fazendo uma chamada a um servico EXTERNO?
|
+-- NAO --> Nao precisa de Circuit Breaker
|
+-- SIM --> A falha deste servico pode causar impacto significativo?
            |
            +-- NAO --> Considere apenas Retry + Timeout
            |
            +-- SIM --> A falha pode se propagar (cascading)?
                        |
                        +-- NAO --> Retry + Timeout + Fallback pode bastar
                        |
                        +-- SIM --> USE CIRCUIT BREAKER
                                   |
                                   +-- Multiplas instancias? --> Considere CB Distribuido
                                   +-- Service Mesh? --> Considere Istio/Envoy
                                   +-- Monitoramento? --> Configure Prometheus + Grafana
```

---

> **Nota final**: Este documento compila conhecimento de 30+ fontes academicas, tecnicas e praticas sobre o Circuit Breaker Pattern. Para o BOT Assessor, a recomendacao e implementar circuit breakers individuais por servico externo (API de ordens, market data, conta), com monitoramento ativo e estrategias de fallback especificas para trading -- priorizando seguranca (parar de operar) sobre disponibilidade (continuar operando com dados obsoletos).
