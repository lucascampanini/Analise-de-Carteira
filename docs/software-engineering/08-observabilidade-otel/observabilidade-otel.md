# Observabilidade, Error Handling e OpenTelemetry (OTEL)

## Pesquisa Academica de Nivel Avancado (PhD-Level)

**Autor:** Pesquisa compilada por assistente de IA
**Data:** Fevereiro de 2026
**Escopo:** Analise abrangente e definitiva sobre Observabilidade, OpenTelemetry, Error Handling, Distributed Tracing, Metricas, Logging Estruturado, SLIs/SLOs e aplicacao pratica a um Bot de Trading Algoritmico no mercado brasileiro.

---

## Sumario

1. [Fundamentos de Observabilidade](#1-fundamentos-de-observabilidade)
2. [OpenTelemetry (OTEL) -- Historia e Arquitetura](#2-opentelemetry-otel----historia-e-arquitetura)
3. [Distributed Tracing](#3-distributed-tracing)
4. [Metricas com OTEL](#4-metricas-com-otel)
5. [Structured Logging](#5-structured-logging)
6. [Error Handling Patterns](#6-error-handling-patterns)
7. [Backends de Observabilidade](#7-backends-de-observabilidade)
8. [Alerting, SLIs, SLOs e Error Budgets](#8-alerting-slis-slos-e-error-budgets)
9. [Observabilidade para o Trading Bot](#9-observabilidade-para-o-trading-bot)
10. [Anti-Patterns e Armadilhas](#10-anti-patterns-e-armadilhas)
11. [Arquitetura de Referencia Completa](#11-arquitetura-de-referencia-completa)
12. [Livros e Bibliografia Fundamental](#12-livros-e-bibliografia-fundamental)
13. [Referencias](#13-referencias)

---

## 1. Fundamentos de Observabilidade

### 1.1 Definicao Formal

O termo **observabilidade** origina-se da **Teoria de Controle** (engenharia eletrica/mecanica), onde descreve a capacidade de inferir o estado interno de um sistema a partir de suas saidas externas. Transplantado para engenharia de software por Charity Majors, Cindy Sridharan e outros, o conceito se refere a:

> **Observabilidade** e a capacidade de entender o estado interno de um sistema apenas examinando seus dados de telemetria (logs, metricas, traces) -- sem precisar adicionar nova instrumentacao para cada pergunta nova.

### 1.2 Monitoramento vs Observabilidade

```
+------------------------------------------------------------------+
|                    MONITORAMENTO vs OBSERVABILIDADE               |
+------------------------------------------------------------------+
|                                                                   |
|  MONITORAMENTO (Reativo)         OBSERVABILIDADE (Proativa)       |
|  ========================        ============================     |
|                                                                   |
|  - "O servidor esta online?"     - "POR QUE o servidor caiu?"    |
|  - Dashboards pre-definidos      - Exploracao ad-hoc de dados    |
|  - Alertas sobre thresholds      - Correlacao entre sinais       |
|  - Perguntas CONHECIDAS          - Perguntas DESCONHECIDAS       |
|  - Known-unknowns                - Unknown-unknowns              |
|  - Verifica SINTOMAS             - Diagnostica CAUSAS-RAIZ       |
|                                                                   |
|  "Meu sistema esta saudavel?"    "Por que meu sistema se         |
|                                   comportou de forma inesperada?" |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  COMPLEMENTARES: Monitoramento e SUBSET de Observabilidade.       |
|  Observabilidade INCLUI monitoramento + capacidade de exploracao. |
|                                                                   |
+------------------------------------------------------------------+
```

**Resumo critico:** Monitoramento detecta falhas conhecidas e mantem o time informado. Observabilidade permite entender o que levou o sistema aquela falha, mesmo que ela nunca tenha ocorrido antes. Nao sao conceitos opostos -- sao complementares, com observabilidade sendo um superconjunto.

### 1.3 Os Tres Pilares da Observabilidade

```
                    +---------------------------+
                    |     OBSERVABILIDADE        |
                    +---------------------------+
                   /             |               \
                  /              |                \
    +----------+      +----------+      +----------+
    |   LOGS   |      | METRICS  |      |  TRACES  |
    +----------+      +----------+      +----------+
    | Registros|      | Numeros  |      | Requests |
    | discretos|      | agregados|      | end-to-  |
    | de eventos|     | ao longo |      | end      |
    | imutaveis|      | do tempo |      | entre    |
    |          |      |          |      | servicos |
    +----------+      +----------+      +----------+
    | QUANDO e |      | QUANTO e |      | ONDE e   |
    | O QUE    |      | COMO     |      | COMO se  |
    | aconteceu|      | esta?    |      | propaga? |
    +----------+      +----------+      +----------+

         |                 |                 |
         v                 v                 v
    Debugging         Alerting          Root Cause
    Auditoria         Dashboards        Analysis
    Compliance        Capacity Plan     Bottlenecks
```

**Logs** -- Registros imutaveis e textuais (ou estruturados em JSON) de eventos discretos. Respondem "O QUE aconteceu e QUANDO". Sao a forma mais antiga e universal de telemetria.

**Metricas** -- Medicoes numericas agregadas ao longo do tempo (CPU, latencia, taxa de erros). Respondem "QUANTO esta acontecendo". Ideais para alertas e dashboards por serem compactas e consultaveis rapidamente.

**Traces** -- Representacoes do fluxo de uma requisicao atraves de multiplos servicos. Respondem "ONDE esta o gargalo e COMO a requisicao se propaga". Essenciais em arquiteturas distribuidas.

### 1.4 Cardinality e Dimensionality

**Cardinalidade** refere-se ao numero de valores unicos que uma dimensao (label/tag) pode assumir:

| Cardinalidade | Exemplo | Impacto |
|---|---|---|
| **Baixa** | `status_code` (200, 404, 500) | Seguro -- poucos time series |
| **Media** | `endpoint` (/api/orders, /api/users) | Gerenciavel |
| **Alta** | `user_id` (milhoes de valores unicos) | PERIGOSO -- explosao de series |
| **Infinita** | `request_id`, `timestamp` como label | ANTI-PATTERN -- nunca fazer |

**Dimensionalidade** e o numero de dimensoes (labels) associadas a uma metrica. Uma metrica `http_requests_total` com labels `{method, path, status, region, instance}` tem dimensionalidade 5.

**Explosao de Cardinalidade:**

```
Series totais = produto cartesiano de todas as cardinalidades

Exemplo PERIGOSO:
  method:   3 valores (GET, POST, PUT)
  path:     50 valores
  status:   5 valores
  region:   4 valores
  user_id:  1.000.000 valores   <-- BOMBA!

  Total = 3 x 50 x 5 x 4 x 1.000.000 = 3 BILHOES de time series!

Exemplo SEGURO (sem user_id):
  Total = 3 x 50 x 5 x 4 = 3.000 time series (gerenciavel)
```

**Regra de ouro:** Nunca use valores ilimitados como labels de metricas. Use traces e logs para dados de alta cardinalidade (user_id, order_id, etc.).

---

## 2. OpenTelemetry (OTEL) -- Historia e Arquitetura

### 2.1 Historia: A Fusao

```
TIMELINE DE EVOLUCAO
====================

2010-2015: Dapper (Google), Zipkin (Twitter)
           Cada empresa inventa seu proprio sistema de tracing

2016:      OpenTracing entra no CNCF (padrao de API para tracing)
           Problema: so API, sem implementacao, so traces

2018-jan:  OpenCensus lancado pelo Google
           Problema: API + implementacao, mas traces + metrics, sem logs
           Conflito: dois padroes competindo = fragmentacao

2019-mai:  FUSAO -> OpenTelemetry nasce no CNCF
           Merge de OpenTracing + OpenCensus
           Seed committee: Google, Lightstep, Microsoft, Uber

2019:      OpenTelemetry entra como CNCF Sandbox Project
           OpenTracing e OpenCensus entram em "read-only mode"

2021-ago:  OpenTelemetry se torna CNCF Incubating Project
           Tracing spec atinge v1.0 (estavel)
           OpenTracing e formalmente arquivado pelo CNCF

2022-2023: Metrics spec atinge estabilidade
           Logs spec avanca para beta/estavel
           Collector atinge maturidade de producao

2024-2025: OTEL e o 2o projeto mais ativo do CNCF (depois do Kubernetes)
           SDKs estaveis para 11+ linguagens
           OTLP se torna padrao de facto para telemetria
```

### 2.2 Componentes Principais do OpenTelemetry

```
+------------------------------------------------------------------+
|                    ARQUITETURA OPENTELEMETRY                       |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+    +------------------+                     |
|  | SUA APLICACAO    |    | SUA APLICACAO    |                     |
|  |                  |    |                  |                     |
|  | +------+  +----+ |    | +------+  +----+ |                     |
|  | | OTEL |  |Auto| |    | | OTEL |  |Auto| |                     |
|  | | SDK  |  |Inst| |    | | SDK  |  |Inst| |                     |
|  | +------+  +----+ |    | +------+  +----+ |                     |
|  +--------+---------+    +--------+---------+                     |
|           |                       |                               |
|           | OTLP                  | OTLP                          |
|           v                       v                               |
|  +----------------------------------------------------+          |
|  |            OTEL COLLECTOR                           |          |
|  |                                                     |          |
|  |  +-----------+  +-----------+  +-----------+        |          |
|  |  | Receivers |->| Processors|->| Exporters |        |          |
|  |  +-----------+  +-----------+  +-----------+        |          |
|  |  | otlp      |  | batch     |  | otlp      |        |          |
|  |  | jaeger    |  | memory    |  | jaeger    |        |          |
|  |  | prometheus|  | filter    |  | prometheus|        |          |
|  |  | zipkin    |  | sampling  |  | zipkin    |        |          |
|  |  | kafka     |  | transform |  | loki      |        |          |
|  |  +-----------+  +-----------+  +-----------+        |          |
|  +----------------------------------------------------+          |
|           |              |              |                          |
|           v              v              v                          |
|     +---------+    +---------+    +---------+                     |
|     | Jaeger  |    |Prometheus|   | Loki    |                     |
|     | Tempo   |    | Mimir   |    | Elastic |                     |
|     | Zipkin  |    | Datadog |    | Datadog |                     |
|     +---------+    +---------+    +---------+                     |
|      TRACES         METRICS        LOGS                           |
+------------------------------------------------------------------+
```

### 2.3 Specification e OTLP Protocol

O **OpenTelemetry Protocol (OTLP)** e o protocolo nativo para transmissao de dados de telemetria. Ele define:

| Aspecto | Detalhes |
|---|---|
| **Encoding** | Protocol Buffers (protobuf) -- binario, eficiente |
| **Transportes** | gRPC (primario), HTTP/protobuf, HTTP/JSON |
| **Sinais** | Traces, Metrics, Logs (todos no mesmo protocolo) |
| **Porta padrao gRPC** | 4317 |
| **Porta padrao HTTP** | 4318 |
| **Versionamento** | Compatibilidade retroativa garantida entre versoes |

**Vantagens do OTLP sobre protocolos legados:**

- **Unificado:** um unico protocolo para os 3 sinais (traces, metrics, logs)
- **Eficiente:** protobuf e ~10x menor que JSON equivalente
- **Streaming:** gRPC suporta chamadas concorrentes para alto throughput
- **Vendor-neutral:** nenhum lock-in com backend especifico

### 2.4 OTEL Collector -- Pipeline Architecture

O Collector e o componente central que recebe, processa e exporta telemetria:

```yaml
# otel-collector-config.yaml -- Exemplo completo para Trading Bot
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

  # Scrape metricas Prometheus do bot
  prometheus:
    config:
      scrape_configs:
        - job_name: 'trading-bot'
          scrape_interval: 5s
          static_configs:
            - targets: ['localhost:8080']

processors:
  # Agrupar em batches para eficiencia
  batch:
    timeout: 5s
    send_batch_size: 1024

  # Limitar uso de memoria
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # Filtrar dados sensiveis (API keys, tokens)
  attributes:
    actions:
      - key: api.key
        action: delete
      - key: auth.token
        action: hash

exporters:
  # Traces -> Grafana Tempo
  otlp/tempo:
    endpoint: "tempo:4317"
    tls:
      insecure: true

  # Metrics -> Prometheus
  prometheusremotewrite:
    endpoint: "http://mimir:9009/api/v1/push"

  # Logs -> Loki
  loki:
    endpoint: "http://loki:3100/loki/api/v1/push"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [otlp/tempo]

    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [loki]
```

### 2.5 SDKs por Linguagem

| Linguagem | Pacote Principal | Status | Auto-Instrumentacao |
|---|---|---|---|
| **Python** | `opentelemetry-sdk` | Estavel | Sim (Flask, FastAPI, Django, asyncio, requests, SQLAlchemy) |
| **Go** | `go.opentelemetry.io/otel` | Estavel | Sim (net/http, gRPC, database/sql) |
| **Java** | `io.opentelemetry:opentelemetry-sdk` | Estavel | Sim (Spring, Servlet, JDBC, Kafka) |
| **.NET** | `OpenTelemetry.Sdk` | Estavel | Sim (ASP.NET Core, HttpClient, EF Core) |
| **JavaScript/Node** | `@opentelemetry/sdk-node` | Estavel | Sim (Express, Fastify, pg, mysql) |
| **Rust** | `opentelemetry` (crate) | Em progresso | Parcial |

---

## 3. Distributed Tracing

### 3.1 Conceitos Fundamentais

```
ANATOMIA DE UM TRACE DISTRIBUIDO
=================================

Trace ID: abc123def456 (identificador unico global do trace)

Servico A          Servico B            Servico C
(API Gateway)      (Order Service)      (Exchange Connector)
    |                   |                    |
    |  Span A           |                    |
    |  [===============]|                    |
    |  name: "POST      |                    |
    |   /api/orders"    |                    |
    |  parent: none     |                    |
    |       |           |                    |
    |       | HTTP      |                    |
    |       +---------->|                    |
    |                   | Span B             |
    |                   | [==========]       |
    |                   | name: "validate    |
    |                   |  _order"           |
    |                   | parent: Span A     |
    |                   |      |             |
    |                   |      | gRPC        |
    |                   |      +------------>|
    |                   |                    | Span C
    |                   |                    | [====]
    |                   |                    | name: "send
    |                   |                    |  _to_exchange"
    |                   |                    | parent: Span B
    |                   |                    |
    |<------------------+<-------------------+
    |                   |                    |

Tempo total: |========================>|  350ms
              Span A: 350ms
                Span B: 200ms
                  Span C: 50ms
```

**Span** -- A unidade basica de trabalho num trace. Cada span contem:

| Campo | Descricao | Exemplo |
|---|---|---|
| `trace_id` | ID global do trace (128 bits) | `abc123def456789...` |
| `span_id` | ID unico deste span (64 bits) | `span_001` |
| `parent_span_id` | ID do span pai | `span_000` (ou vazio se root) |
| `name` | Nome da operacao | `"POST /api/orders"` |
| `start_time` | Timestamp de inicio | `2026-02-07T10:30:00.000Z` |
| `end_time` | Timestamp de fim | `2026-02-07T10:30:00.350Z` |
| `status` | OK, ERROR, UNSET | `OK` |
| `attributes` | Key-value metadata | `{"order.id": "ORD-123", "order.side": "BUY"}` |
| `events` | Logs dentro do span | `{"name": "order.validated", "timestamp": ...}` |
| `links` | Referencias a outros traces | Link para trace de market data |

### 3.2 Context Propagation

Para que traces funcionem entre servicos, o **contexto** precisa ser propagado:

```
PROPAGACAO DE CONTEXTO
=======================

Servico A                          Servico B
+-------------------+              +-------------------+
| Cria span root    |   HTTP       | Extrai contexto   |
| Injeta contexto   |  -------->   | do header         |
| no header HTTP    |              | Cria span filho   |
+-------------------+              +-------------------+

Header W3C Trace Context:
  traceparent: 00-<trace-id>-<parent-span-id>-<trace-flags>
  traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01

  Formato: version-trace_id(32hex)-parent_id(16hex)-flags(2hex)

  trace-flags: 01 = sampled (trace sera coletado)
               00 = not sampled
```

**Padroes de propagacao:**

| Padrao | Uso | Headers |
|---|---|---|
| **W3C Trace Context** | Padrao oficial (recomendado) | `traceparent`, `tracestate` |
| **B3 (Zipkin)** | Legado, ainda muito usado | `X-B3-TraceId`, `X-B3-SpanId`, `X-B3-Sampled` |
| **Jaeger** | Nativo do Jaeger | `uber-trace-id` |
| **AWS X-Ray** | Ecossistema AWS | `X-Amzn-Trace-Id` |

**Recomendacao:** Use **W3C Trace Context** como padrao. O OTEL SDK suporta multiplos propagadores simultaneamente para interoperabilidade.

### 3.3 Sampling Strategies

Coletar 100% dos traces e inviavel em producao (custo, storage, performance). Sampling define QUAIS traces coletar:

```
ESTRATEGIAS DE SAMPLING
========================

1. HEAD-BASED SAMPLING (decisao NO INICIO)
   +---------+
   | Request |---> Decisao: amostrar?  --SIM--> Trace coletado
   | chega   |     (aleatorio 10%)     --NAO--> Trace descartado
   +---------+
   Pro: Simples, baixo overhead
   Contra: Pode perder traces com erros que so ocorrem no meio/fim

2. TAIL-BASED SAMPLING (decisao NO FIM)
   +---------+     +---------+     +---------+
   | Request |---> | Coleta  |---> | Decisao |---> Manter ou descartar
   | chega   |     | TODOS   |     | no FIM  |
   +---------+     | os spans|     | do trace|
                   +---------+     +---------+
   Pro: Pode manter TODOS os erros, traces lentos, etc.
   Contra: Maior uso de memoria (precisa buffear spans)
           Requer OTEL Collector com tail_sampling processor

3. RATE-LIMITING SAMPLING
   Limita a N traces por segundo independente do volume total
   Pro: Custo previsivel
   Contra: Pode perder eventos importantes em picos
```

**Politicas de Tail-Based Sampling no OTEL Collector:**

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      # Sempre manter traces com erro
      - name: errors-policy
        type: status_code
        status_code: {status_codes: [ERROR]}

      # Sempre manter traces lentos (> 2s)
      - name: latency-policy
        type: latency
        latency: {threshold_ms: 2000}

      # Amostrar 10% dos traces normais
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: {sampling_percentage: 10}

      # Sempre manter traces de ordens
      - name: orders-policy
        type: string_attribute
        string_attribute:
          key: order.id
          values: [".*"]
          enabled_regex_matching: true
```

**Recomendacao para Trading Bot:** Use tail-based sampling com 100% de retencao para traces com erros ou ordens, e 10-20% para traces normais (health checks, market data reads).

---

## 4. Metricas com OTEL

### 4.1 Tipos de Instrumentos

```
TIPOS DE METRICAS OPENTELEMETRY
================================

+------------------+------------------------------------------+
|  COUNTER         |  Valor so SOBE (monotonicamente)         |
|  (Sum)           |  Ex: total de ordens enviadas            |
|                  |       total de erros de API               |
|                  |  Operacao: add(valor)                    |
+------------------+------------------------------------------+
|  UP-DOWN         |  Valor SOBE e DESCE                      |
|  COUNTER         |  Ex: ordens pendentes/abertas            |
|                  |       conexoes ativas com exchange        |
|                  |  Operacao: add(valor) -- valor pode < 0  |
+------------------+------------------------------------------+
|  GAUGE           |  Valor INSTANTANEO (ponto no tempo)      |
|  (Async)         |  Ex: temperatura CPU, saldo de conta     |
|                  |       preco atual do ativo                |
|                  |  Operacao: callback retorna valor atual   |
+------------------+------------------------------------------+
|  HISTOGRAM       |  DISTRIBUICAO de valores em buckets      |
|                  |  Ex: latencia de execucao de ordens      |
|                  |       tamanho de posicao por trade        |
|                  |  Operacao: record(valor)                 |
|                  |  Gera: sum, count, min, max, buckets     |
+------------------+------------------------------------------+
|  EXPONENTIAL     |  Histogram com buckets automaticos       |
|  HISTOGRAM       |  Melhor resolucao sem configuracao manual |
|                  |  Ex: mesmos usos do Histogram, mais      |
|                  |       eficiente em storage                |
+------------------+------------------------------------------+
```

### 4.2 Exemplos de Instrumentacao em Python

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Setup
exporter = OTLPMetricExporter(endpoint="localhost:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=5000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("trading.bot", version="1.0.0")

# === COUNTER: Total de ordens enviadas ===
orders_sent_counter = meter.create_counter(
    name="trading.orders.sent.total",
    description="Total de ordens enviadas ao exchange",
    unit="orders",
)

def send_order(order):
    # ... logica de envio ...
    orders_sent_counter.add(1, attributes={
        "order.side": order.side,       # BUY / SELL
        "order.type": order.type,       # MARKET / LIMIT
        "exchange": "b3",
        "strategy": order.strategy_name,
    })

# === HISTOGRAM: Latencia de execucao ===
execution_latency = meter.create_histogram(
    name="trading.order.execution.duration",
    description="Latencia de execucao de ordens (ms)",
    unit="ms",
)

async def execute_order(order):
    start = time.monotonic()
    try:
        result = await exchange.send(order)
        duration_ms = (time.monotonic() - start) * 1000
        execution_latency.record(duration_ms, attributes={
            "order.side": order.side,
            "order.type": order.type,
            "status": "success",
        })
        return result
    except Exception as e:
        duration_ms = (time.monotonic() - start) * 1000
        execution_latency.record(duration_ms, attributes={
            "order.side": order.side,
            "order.type": order.type,
            "status": "error",
            "error.type": type(e).__name__,
        })
        raise

# === GAUGE (Async/Observable): Saldo da conta ===
def get_account_balance(options):
    balance = account_service.get_balance()
    yield metrics.Observation(value=balance, attributes={"currency": "BRL"})

meter.create_observable_gauge(
    name="trading.account.balance",
    description="Saldo atual da conta",
    unit="BRL",
    callbacks=[get_account_balance],
)

# === UP-DOWN COUNTER: Posicoes abertas ===
open_positions = meter.create_up_down_counter(
    name="trading.positions.open",
    description="Numero de posicoes abertas",
    unit="positions",
)

def open_position(symbol, side):
    # ... logica ...
    open_positions.add(1, attributes={"symbol": symbol, "side": side})

def close_position(symbol, side):
    # ... logica ...
    open_positions.add(-1, attributes={"symbol": symbol, "side": side})
```

### 4.3 Exemplars -- Ponte entre Metricas e Traces

**Exemplars** conectam uma medicao de metrica a um trace especifico, permitindo "drill down" de um ponto no dashboard ate o trace completo:

```
EXEMPLAR: Ponte Metrica -> Trace
=================================

Dashboard mostra: p99 latencia = 2.3s (pico!)
                        |
                        v
                  Exemplar aponta para:
                  trace_id: abc123def456
                  span_id: span_789
                        |
                        v
                  Abre trace no Jaeger/Tempo:
                  Ve que o gargalo foi na
                  chamada ao exchange (Span C)
```

### 4.4 Prometheus Exposition Format vs OTLP Push

```
PULL (Prometheus) vs PUSH (OTLP)
==================================

PULL (Prometheus scrape):
  Prometheus --scrape--> /metrics endpoint da aplicacao
  - Aplicacao EXPOE metricas; Prometheus PUXA periodicamente
  - Pro: Simples, aplicacao nao precisa saber do backend
  - Contra: Polling interval limita resolucao temporal

PUSH (OTLP):
  Aplicacao --push--> OTEL Collector --export--> Backend
  - Aplicacao ENVIA metricas proativamente
  - Pro: Metricas em tempo real, funciona com efemeros (lambda)
  - Contra: Aplicacao precisa saber o endpoint do collector

HIBRIDO (recomendado para Trading Bot):
  Bot --OTLP push--> Collector --remote write--> Prometheus/Mimir
                                --OTLP export---> Tempo (traces)
                                --export--------> Loki (logs)
```

---

## 5. Structured Logging

### 5.1 Plain Text vs Structured Logging

```
PLAIN TEXT (anti-pattern para producao):
  2026-02-07 10:30:05 INFO Order sent: BUY 100 PETR4 at 38.50

STRUCTURED JSON (padrao recomendado):
  {
    "timestamp": "2026-02-07T10:30:05.123Z",
    "level": "INFO",
    "logger": "trading.order_manager",
    "message": "Order sent to exchange",
    "service": "trading-bot",
    "environment": "production",
    "trace_id": "abc123def456789...",
    "span_id": "span_001",
    "order": {
      "id": "ORD-2026-0207-001",
      "side": "BUY",
      "symbol": "PETR4",
      "quantity": 100,
      "price": 38.50,
      "type": "LIMIT",
      "strategy": "mean_reversion"
    },
    "exchange": "b3",
    "latency_ms": 12.5
  }
```

**Vantagens do logging estruturado:**
- **Parseavel por maquina:** ferramentas como Loki, Elasticsearch ingerem JSON nativamente
- **Filtravel:** buscar por `order.symbol = "PETR4"` e trivial
- **Correlacionavel:** `trace_id` e `span_id` conectam log ao trace distribuido
- **Consistente:** schema definido evita logs ambiguos

### 5.2 Campos Essenciais por Log Entry

| Campo | Obrigatorio | Descricao |
|---|---|---|
| `timestamp` | Sim | ISO 8601 em UTC |
| `level` | Sim | ERROR, WARN, INFO, DEBUG |
| `service` | Sim | Nome do servico/aplicacao |
| `message` | Sim | Descricao do evento |
| `trace_id` | Sim* | ID do trace (para correlacao) |
| `span_id` | Sim* | ID do span atual |
| `correlation_id` | Recomendado | ID do request/operacao de negocio |
| `environment` | Recomendado | prod, staging, dev |
| `error.type` | Se erro | Nome da classe da excecao |
| `error.message` | Se erro | Mensagem do erro |
| `error.stack_trace` | Se erro | Stack trace completa |

(*) Em contexto de trace ativo

### 5.3 Correlation IDs

```
FLUXO DE CORRELATION ID
=========================

[Signal Generator]          [Risk Manager]         [Order Executor]
       |                         |                       |
       | correlation_id:         |                       |
       | "sig-20260207-001"      |                       |
       |                         |                       |
  LOG: {                    LOG: {                  LOG: {
    "correlation_id":         "correlation_id":       "correlation_id":
    "sig-20260207-001",       "sig-20260207-001",     "sig-20260207-001",
    "msg": "Signal            "msg": "Risk check      "msg": "Order sent",
     generated: BUY            passed",                "order_id":
     PETR4",                  "risk_score": 0.7,       "ORD-001"
    "trace_id": "abc..."     "trace_id": "abc..."    "trace_id": "abc..."
  }                          }                       }

  --> Buscar por correlation_id retorna TODOS os logs da operacao
  --> trace_id permite ver o trace completo no Jaeger/Tempo
```

### 5.4 Implementacao Python com structlog

```python
import structlog
import logging
from opentelemetry import trace

def add_otel_context(logger, method_name, event_dict):
    """Injeta trace_id e span_id automaticamente em cada log."""
    span = trace.get_current_span()
    if span.is_recording():
        ctx = span.get_span_context()
        event_dict["trace_id"] = format(ctx.trace_id, '032x')
        event_dict["span_id"] = format(ctx.span_id, '016x')
    return event_dict

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        add_otel_context,  # Injeta OTEL context
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),  # Output JSON
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

log = structlog.get_logger()

# Uso
async def process_signal(signal):
    # Bind context para todos os logs subsequentes
    log_ctx = log.bind(
        signal_id=signal.id,
        symbol=signal.symbol,
        strategy=signal.strategy_name,
    )

    log_ctx.info("signal_received", side=signal.side, strength=signal.strength)

    try:
        risk_result = await risk_manager.check(signal)
        log_ctx.info("risk_check_passed", risk_score=risk_result.score)

        order = await order_manager.send(signal)
        log_ctx.info("order_sent",
            order_id=order.id,
            price=order.price,
            quantity=order.quantity,
        )
    except RiskLimitExceeded as e:
        log_ctx.warning("risk_check_failed",
            reason=str(e),
            risk_score=e.score,
        )
    except ExchangeError as e:
        log_ctx.error("order_failed",
            error_type=type(e).__name__,
            error_message=str(e),
            exc_info=True,  # Inclui stack trace
        )
```

### 5.5 Log Aggregation Backends

```
COMPARACAO DE BACKENDS DE LOG
==============================

+----------------+-------------------+------------------+-----------+
| Backend        | Indexacao          | Storage          | Custo     |
+----------------+-------------------+------------------+-----------+
| ELK Stack      | Full-text index   | Elasticsearch    | Alto      |
| (Elasticsearch | (TUDO indexado)   | (disco local     | (hardware |
|  Logstash      |                   |  ou cloud)       |  + licenca|
|  Kibana)       |                   |                  |  Elastic) |
+----------------+-------------------+------------------+-----------+
| Grafana Loki   | So labels/metadata| Object Storage   | Baixo     |
|                | (como Prometheus) | (S3, GCS, local) | (nao      |
|                | NAO indexa corpo  |                  |  indexa   |
|                | do log            |                  |  tudo)    |
+----------------+-------------------+------------------+-----------+
| Datadog Logs   | Full-text +       | SaaS (Datadog    | Muito alto|
|                | faceted search    | managed)         | (por GB)  |
+----------------+-------------------+------------------+-----------+

Para Trading Bot: Loki e a escolha custo-eficiente.
  - Labels: {service, level, environment, strategy}
  - Corpo do log em JSON (filtravel via LogQL)
  - Integracao nativa com Grafana + Tempo (traces)
```

---

## 6. Error Handling Patterns

### 6.1 Taxonomia de Erros

```
TAXONOMIA DE ERROS
===================

+------------------------------------------------------------------+
|                        TODOS OS ERROS                             |
+------------------------------------------------------------------+
|                                                                   |
|  +-----------------------+    +-----------------------------+     |
|  | DOMAIN ERRORS         |    | INFRASTRUCTURE ERRORS       |     |
|  | (Esperados/Normais)   |    | (Excepcionais/Tecnicos)     |     |
|  +-----------------------+    +-----------------------------+     |
|  |                       |    |                             |     |
|  | - Saldo insuficiente  |    | - Timeout de rede          |     |
|  | - Risco excedido      |    | - Banco de dados offline   |     |
|  | - Preco fora do range |    | - API exchange indisponivel|     |
|  | - Ativo nao negociavel|    | - Disco cheio              |     |
|  | - Horario fora pregao |    | - OOM (Out of Memory)      |     |
|  |                       |    | - Certificate expired      |     |
|  | TRATAMENTO:           |    |                             |     |
|  | -> Result/Either      |    | TRATAMENTO:                |     |
|  | -> Retorno de valor   |    | -> Exceptions              |     |
|  | -> NAO usar exceptions|    | -> Retry com backoff       |     |
|  | -> Fazem parte do     |    | -> Circuit Breaker         |     |
|  |    fluxo normal       |    | -> Fallback                |     |
|  +-----------------------+    +-----------------------------+     |
|                                                                   |
|  +-----------------------+                                        |
|  | VALIDATION ERRORS     |                                        |
|  | (Entrada invalida)    |                                        |
|  +-----------------------+                                        |
|  | - Campo obrigatorio   |                                        |
|  | - Tipo de dado errado |                                        |
|  | - Valor fora de range |                                        |
|  | - Formato invalido    |                                        |
|  |                       |                                        |
|  | TRATAMENTO:           |                                        |
|  | -> Validacao antecipada|                                       |
|  | -> Acumular erros     |                                        |
|  | -> Retornar lista     |                                        |
|  +-----------------------+                                        |
+------------------------------------------------------------------+
```

### 6.2 Result Pattern (Either Monad)

O pattern Result/Either encapsula o resultado de uma operacao que pode falhar, sem usar exceptions para fluxo de controle:

```python
from dataclasses import dataclass
from typing import TypeVar, Generic, Union
from enum import Enum

T = TypeVar('T')
E = TypeVar('E')

@dataclass(frozen=True)
class Success(Generic[T]):
    value: T

    def is_success(self) -> bool:
        return True

    def map(self, f):
        return Success(f(self.value))

    def flat_map(self, f):
        return f(self.value)

@dataclass(frozen=True)
class Failure(Generic[E]):
    error: E

    def is_success(self) -> bool:
        return False

    def map(self, f):
        return self  # Propaga o erro sem transformar

    def flat_map(self, f):
        return self  # Propaga o erro sem executar

Result = Union[Success[T], Failure[E]]

# --- Domain Errors como tipos explicitos ---

class OrderErrorType(Enum):
    INSUFFICIENT_BALANCE = "insufficient_balance"
    RISK_LIMIT_EXCEEDED = "risk_limit_exceeded"
    MARKET_CLOSED = "market_closed"
    INVALID_PRICE = "invalid_price"
    POSITION_LIMIT_REACHED = "position_limit_reached"

@dataclass(frozen=True)
class OrderError:
    type: OrderErrorType
    message: str
    context: dict = None

# --- Uso no Trading Bot ---

async def validate_order(order: Order) -> Result[Order, OrderError]:
    if not market_calendar.is_open():
        return Failure(OrderError(
            type=OrderErrorType.MARKET_CLOSED,
            message="Mercado fechado",
            context={"current_time": datetime.now().isoformat()},
        ))

    if order.notional > account.available_balance:
        return Failure(OrderError(
            type=OrderErrorType.INSUFFICIENT_BALANCE,
            message=f"Saldo insuficiente: {account.available_balance} < {order.notional}",
            context={
                "available": account.available_balance,
                "required": order.notional,
            },
        ))

    return Success(order)

async def check_risk(order: Order) -> Result[Order, OrderError]:
    risk_score = await risk_engine.evaluate(order)
    if risk_score > risk_config.max_score:
        return Failure(OrderError(
            type=OrderErrorType.RISK_LIMIT_EXCEEDED,
            message=f"Risk score {risk_score} excede limite {risk_config.max_score}",
            context={"score": risk_score, "limit": risk_config.max_score},
        ))
    return Success(order)

# Composicao funcional com flat_map (encadeamento)
async def process_order(order: Order) -> Result[OrderConfirmation, OrderError]:
    result = await validate_order(order)
    if isinstance(result, Failure):
        return result

    result = await check_risk(result.value)
    if isinstance(result, Failure):
        return result

    # Se chegou aqui, todas as validacoes passaram
    try:
        confirmation = await exchange.send_order(result.value)
        return Success(confirmation)
    except ExchangeTimeoutError as e:
        # Erro de infra VIRA Failure (nao propaga exception)
        return Failure(OrderError(
            type=OrderErrorType.EXCHANGE_TIMEOUT,
            message=str(e),
        ))
```

### 6.3 Error Boundaries

```
ERROR BOUNDARIES NO TRADING BOT
=================================

+------------------------------------------------------------------+
|                     APLICACAO (Top Level)                         |
|  Global Error Handler: captura tudo, loga, alerta                |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |  STRATEGY LAYER (Error Boundary #1)                         |  |
|  |  Se uma estrategia falha, as outras continuam               |  |
|  |                                                             |  |
|  |  +-------+  +-------+  +-------+                           |  |
|  |  |Strat A|  |Strat B|  |Strat C|  <-- Cada uma isolada     |  |
|  |  +-------+  +-------+  +-------+                           |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |  ORDER EXECUTION LAYER (Error Boundary #2)                  |  |
|  |  Se uma ordem falha, nao afeta o fluxo de outras            |  |
|  |                                                             |  |
|  |  +--------+  +--------+  +--------+                        |  |
|  |  |Order #1|  |Order #2|  |Order #3|  <-- Isoladas           |  |
|  |  +--------+  +--------+  +--------+                        |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |  EXCHANGE CONNECTIVITY (Error Boundary #3)                  |  |
|  |  Se uma exchange falha, ativa circuit breaker               |  |
|  |                                                             |  |
|  |  +-------+  +-------+                                      |  |
|  |  | B3 API|  |Backup |  <-- Circuit breaker com fallback     |  |
|  |  +-------+  +-------+                                      |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### 6.4 Circuit Breaker com Observabilidade

```python
import asyncio
from enum import Enum
from opentelemetry import trace, metrics

tracer = trace.get_tracer("trading.circuit_breaker")
meter = metrics.get_meter("trading.circuit_breaker")

cb_state_gauge = meter.create_observable_gauge(
    "trading.circuit_breaker.state",
    description="Estado do circuit breaker (0=closed, 1=half_open, 2=open)",
)
cb_failures_counter = meter.create_counter(
    "trading.circuit_breaker.failures.total",
    description="Total de falhas registradas pelo circuit breaker",
)

class CircuitState(Enum):
    CLOSED = 0      # Normal: requests passam
    HALF_OPEN = 1   # Teste: permite 1 request
    OPEN = 2        # Aberto: bloqueia tudo

class CircuitBreaker:
    def __init__(self, name: str, failure_threshold: int = 5,
                 recovery_timeout: float = 30.0):
        self.name = name
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time = None
        self.log = structlog.get_logger().bind(circuit_breaker=name)

    async def call(self, func, *args, **kwargs):
        with tracer.start_as_current_span(
            f"circuit_breaker.{self.name}",
            attributes={"cb.state": self.state.name, "cb.name": self.name},
        ) as span:

            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.log.info("circuit_breaker_half_open")
                else:
                    span.set_status(trace.StatusCode.ERROR, "Circuit open")
                    self.log.warning("circuit_breaker_rejected",
                        time_until_retry=self._time_until_retry())
                    raise CircuitOpenError(self.name)

            try:
                result = await func(*args, **kwargs)
                self._on_success()
                return result
            except Exception as e:
                self._on_failure(e)
                cb_failures_counter.add(1, attributes={
                    "circuit_breaker": self.name,
                    "error_type": type(e).__name__,
                })
                span.record_exception(e)
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    def _on_success(self):
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.log.info("circuit_breaker_closed", msg="Recovery successful")

    def _on_failure(self, error):
        self.failure_count += 1
        self.last_failure_time = asyncio.get_event_loop().time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.log.error("circuit_breaker_opened",
                failures=self.failure_count,
                threshold=self.failure_threshold,
                error=str(error))
```

---

## 7. Backends de Observabilidade

### 7.1 Mapa Completo do Ecossistema

```
ECOSSISTEMA DE BACKENDS
========================

TRACES:
  +----------+  +----------+  +----------+  +----------+
  |  Jaeger  |  |  Zipkin  |  | Grafana  |  |  Datadog |
  |          |  |          |  |  Tempo   |  |   APM    |
  | CNCF     |  | Twitter  |  | Grafana  |  |   SaaS   |
  | Gratis   |  | Gratis   |  | Labs     |  |   Pago   |
  | ES/Cass  |  | ES/MySQL |  | S3/GCS   |  | Managed  |
  +----------+  +----------+  +----------+  +----------+

METRICS:
  +----------+  +----------+  +----------+  +----------+
  |Prometheus|  | Grafana  |  |  Datadog |  |New Relic |
  |          |  |  Mimir   |  | Metrics  |  | Metrics  |
  | CNCF     |  | Grafana  |  |   SaaS   |  |   SaaS   |
  | Gratis   |  | Labs     |  |   Pago   |  |   Pago   |
  | TSDB     |  | S3 + obj |  | Managed  |  | Managed  |
  +----------+  +----------+  +----------+  +----------+

LOGS:
  +----------+  +----------+  +----------+  +----------+
  |   ELK    |  | Grafana  |  |  Datadog |  |Honeycomb |
  |  Stack   |  |   Loki   |  |   Logs   |  |          |
  | Elastic  |  | Grafana  |  |   SaaS   |  |   SaaS   |
  | Gratis*  |  | Labs     |  |   Pago   |  |   Pago   |
  | ES index |  | S3/GCS   |  | Managed  |  | Columnar |
  +----------+  +----------+  +----------+  +----------+

ALL-IN-ONE (Open Source, OTEL-native):
  +----------+
  |  SigNoz  |  GitHub: 24k+ stars
  |          |  OpenTelemetry-native
  | Traces + Metrics + Logs unificado
  | ClickHouse backend
  | Self-hosted ou Cloud
  +----------+
```

### 7.2 Comparacao Detalhada -- Tracing Backends

| Criterio | Jaeger | Zipkin | Grafana Tempo | SigNoz |
|---|---|---|---|---|
| **Origem** | Uber -> CNCF | Twitter | Grafana Labs | Open Source |
| **Storage** | ES, Cassandra, Kafka | ES, MySQL, Cassandra | Object Storage (S3) | ClickHouse |
| **Query por tags** | Sim (rico) | Sim (basico) | Apenas por Trace ID | Sim (rico) |
| **OTEL nativo** | Sim (exporter dedicado) | Via OTEL exporter | Sim | Sim (core) |
| **Sampling** | Adaptativo | Simples | Depende do Collector | Via Collector |
| **Ideal para** | Empresas, query complexo | Simplicidade | Usuarios Grafana | OTEL-first teams |
| **Custo infra** | Medio-Alto | Baixo | Baixo (obj storage) | Medio |

### 7.3 Stack Recomendada para Trading Bot

```
STACK RECOMENDADA: LGTM (Loki, Grafana, Tempo, Mimir)
======================================================

Motivos:
  1. Custo-eficiente (object storage para tudo)
  2. Integracao nativa entre componentes
  3. Grafana como dashboard unico
  4. OTEL Collector como ponto de ingresso unificado
  5. Open source (sem vendor lock-in)

Alternativa simplificada: SigNoz
  - Tudo-em-um com ClickHouse
  - Menos componentes para operar
  - OTEL-native desde o dia zero

Para escalar depois (se necessario):
  - Migrar para Datadog/Honeycomb (SaaS)
  - Sem mudanca na aplicacao (OTEL e vendor-neutral)
```

---

## 8. Alerting, SLIs, SLOs e Error Budgets

### 8.1 Definicoes (Google SRE)

```
SLI / SLO / SLA / ERROR BUDGET
================================

SLI (Service Level INDICATOR):
  Metrica concreta que mede performance do servico.
  Ex: "Porcentagem de ordens executadas em < 500ms"
  Ex: "Porcentagem de requests com status 2xx"

SLO (Service Level OBJECTIVE):
  Meta para o SLI.
  Ex: "99.9% das ordens devem executar em < 500ms"
  Ex: "99.95% de uptime mensal"

SLA (Service Level AGREEMENT):
  Contrato com consequencias ($$) se SLO nao for atingido.
  Ex: "Se uptime < 99.9%, credito de 10% na fatura"
  (Geralmente entre empresa e cliente; SLO e interno)

ERROR BUDGET:
  = 1 - SLO
  Ex: SLO = 99.9% -> Error Budget = 0.1%
  Em 30 dias: 0.1% * 30 * 24 * 60 = 43.2 minutos de downtime permitido

  +-----------------------------------------------------------------+
  | MES: Fevereiro 2026                                             |
  | SLO: 99.9% disponibilidade                                     |
  | Error Budget: 43.2 minutos                                     |
  |                                                                 |
  |  [=========================================------]  87% restante|
  |   ^-- Budget consumido (5.6 min)   ^-- Budget restante (37.6m) |
  |                                                                 |
  | Se budget acabar: CONGELAR deploys, focar em estabilidade       |
  +-----------------------------------------------------------------+
```

### 8.2 SLIs e SLOs para Trading Bot

| SLI | Formula | SLO | Justificativa |
|---|---|---|---|
| **Order Execution Latency** | p99 do tempo signal-to-confirmation | < 500ms para 99.5% | Latencia excessiva = slippage |
| **Order Success Rate** | ordens confirmadas / ordens enviadas | > 99.0% | Ordens rejeitadas = perda de oportunidade |
| **Data Feed Freshness** | age of latest market data tick | < 2s para 99.9% | Dados stale = decisoes erradas |
| **Strategy Uptime** | tempo com >= 1 strategy ativa | > 99.5% | Bot parado = perda de oportunidade |
| **Risk Check Latency** | p99 do tempo de risk evaluation | < 50ms para 99.9% | Risk check lento = bottleneck |
| **API Error Rate** | erros 5xx / total requests ao exchange | < 0.5% | Erros frequentes = instabilidade |

### 8.3 Alerting Strategies -- Burn Rate

```
ALERTING POR BURN RATE (Google SRE)
=====================================

Em vez de alertar em threshold absoluto,
alertar quando o ERROR BUDGET esta sendo consumido rapido demais.

Burn Rate = taxa de consumo do error budget

  Burn Rate 1x  = consome budget em exatamente 30 dias (normal)
  Burn Rate 10x = consome budget em 3 dias (urgente!)
  Burn Rate 36x = consome budget em 20 horas (CRITICO!)

MULTI-WINDOW, MULTI-BURN-RATE:
  +------+--------+--------+----------+
  | Tipo | Burn   | Janela | Acao     |
  |      | Rate   | Curta  |          |
  +------+--------+--------+----------+
  | CRIT | 14.4x  | 5 min  | Page     |
  | CRIT | 14.4x  | 1 hora | Page     |
  | WARN | 6x     | 30 min | Page     |
  | WARN | 6x     | 6 hora | Page     |
  | SLOW | 2x     | 2 hora | Ticket   |
  | SLOW | 2x     | 24 hora| Ticket   |
  +------+--------+--------+----------+

Exemplo para Trading Bot (SLO = 99.9% order success):
  - CRITICO: >14.4x burn em 5min -> Alerta IMEDIATO (PagerDuty)
    = Muitas ordens falhando AGORA
  - WARNING: >6x burn em 30min -> Alerta com urgencia media
    = Taxa de falha elevada, investigar
  - SLOW: >2x burn em 2h -> Criar ticket
    = Degradacao lenta, planejar fix
```

### 8.4 Exemplos de Alertas com Prometheus/Grafana

```yaml
# prometheus-rules.yml -- Alertas para Trading Bot

groups:
  - name: trading-bot-slos
    rules:
      # SLO: 99.9% order success rate
      - alert: OrderSuccessRateCritical
        expr: |
          (
            sum(rate(trading_orders_sent_total{status="error"}[5m]))
            /
            sum(rate(trading_orders_sent_total[5m]))
          ) > 14.4 * 0.001
        for: 2m
        labels:
          severity: critical
          team: trading
        annotations:
          summary: "Burn rate critico no success rate de ordens"
          description: >
            Taxa de erro de ordens esta {{ $value | humanizePercentage }}
            (burn rate > 14.4x). Error budget sera esgotado em < 20h.

      # SLO: latencia p99 < 500ms
      - alert: OrderLatencyHigh
        expr: |
          histogram_quantile(0.99,
            sum(rate(trading_order_execution_duration_bucket[5m])) by (le)
          ) > 500
        for: 5m
        labels:
          severity: warning
          team: trading
        annotations:
          summary: "Latencia p99 de ordens acima de 500ms"
          description: "p99 atual: {{ $value }}ms"

      # Circuit breaker aberto
      - alert: CircuitBreakerOpen
        expr: trading_circuit_breaker_state == 2
        for: 0m
        labels:
          severity: critical
          team: trading
        annotations:
          summary: "Circuit breaker {{ $labels.circuit_breaker }} aberto!"
          description: >
            O circuit breaker esta aberto, bloqueando chamadas.
            Verificar conectividade com exchange.
```

---

## 9. Observabilidade para o Trading Bot

### 9.1 Trace de uma Ordem Completa

```
TRACE COMPLETO: SIGNAL -> EXECUTION -> CONFIRMATION
=====================================================

Trace ID: 7f3c8b2a1d4e5f6a...

[SPAN 1] signal_generator.evaluate           |=======|          45ms
  attributes:
    strategy: "mean_reversion"
    symbol: "PETR4"
    signal.side: "BUY"
    signal.strength: 0.82
    signal.reason: "price_below_2std"

  [SPAN 2] market_data.get_latest              |===|            15ms
    attributes:
      symbol: "PETR4"
      data.age_ms: 50
      source: "b3_websocket"

[SPAN 3] risk_manager.evaluate               |====|            20ms
  attributes:
    risk.score: 0.65
    risk.max_position_pct: 0.05
    risk.current_drawdown: -0.012
    risk.daily_loss_pct: -0.003
    risk.approved: true

[SPAN 4] order_manager.create_order          |==|               8ms
  attributes:
    order.id: "ORD-20260207-001"
    order.side: "BUY"
    order.type: "LIMIT"
    order.symbol: "PETR4"
    order.quantity: 100
    order.price: 38.45
    order.time_in_force: "DAY"

[SPAN 5] exchange_connector.send_order       |==========|      85ms
  attributes:
    exchange: "b3"
    protocol: "fix"
    connection.id: "fix-session-001"

  [SPAN 6] fix_session.send_new_order_single   |=====|         45ms
    events:
      - name: "fix.message.sent"
        attributes: {msg_type: "D", cl_ord_id: "ORD-001"}
      - name: "fix.message.received"
        attributes: {msg_type: "8", exec_type: "0"}  # New

  [SPAN 7] fix_session.execution_report        |====|          35ms
    events:
      - name: "fix.execution_report"
        attributes: {
          exec_type: "F",  # Fill
          fill_qty: 100,
          fill_price: 38.44,
          leaves_qty: 0,
        }

[SPAN 8] position_manager.update            |=|                5ms
  attributes:
    position.symbol: "PETR4"
    position.side: "LONG"
    position.quantity: 100
    position.avg_price: 38.44
    position.pnl_unrealized: 0.0

TOTAL: 178ms (signal to confirmation)
```

### 9.2 Metricas Essenciais do Trading Bot

```python
# trading_bot_metrics.py -- Definicao completa de metricas

from opentelemetry import metrics

meter = metrics.get_meter("trading.bot", version="1.0.0")

# === EXECUCAO DE ORDENS ===

orders_total = meter.create_counter(
    "trading.orders.total",
    description="Total de ordens enviadas",
    unit="orders",
)
# Labels: {side, type, symbol, strategy, status, exchange}

execution_latency = meter.create_histogram(
    "trading.order.execution.duration_ms",
    description="Latencia end-to-end de execucao (signal to fill)",
    unit="ms",
)
# Labels: {side, type, symbol, strategy}

slippage = meter.create_histogram(
    "trading.order.slippage.bps",
    description="Slippage em basis points (preco esperado vs executado)",
    unit="bps",
)
# Labels: {side, type, symbol, strategy}

fill_rate = meter.create_histogram(
    "trading.order.fill_rate",
    description="Taxa de preenchimento (0.0 a 1.0)",
    unit="ratio",
)
# Labels: {side, type, symbol}

# === PERFORMANCE FINANCEIRA ===

def get_pnl_callback(options):
    """PnL realizado e nao-realizado."""
    pnl = portfolio.get_pnl()
    yield metrics.Observation(pnl.realized, {"type": "realized"})
    yield metrics.Observation(pnl.unrealized, {"type": "unrealized"})
    yield metrics.Observation(pnl.total, {"type": "total"})

meter.create_observable_gauge(
    "trading.pnl.current",
    description="PnL atual da carteira",
    unit="BRL",
    callbacks=[get_pnl_callback],
)

def get_drawdown_callback(options):
    """Drawdown atual."""
    dd = portfolio.get_drawdown()
    yield metrics.Observation(dd.current, {"type": "current"})
    yield metrics.Observation(dd.max_daily, {"type": "max_daily"})
    yield metrics.Observation(dd.max_total, {"type": "max_total"})

meter.create_observable_gauge(
    "trading.drawdown.current",
    description="Drawdown atual",
    unit="percent",
    callbacks=[get_drawdown_callback],
)

# === MARKET DATA ===

data_feed_latency = meter.create_histogram(
    "trading.market_data.latency_ms",
    description="Latencia do feed de dados (exchange timestamp vs recebimento)",
    unit="ms",
)
# Labels: {source, symbol}

data_feed_gap = meter.create_counter(
    "trading.market_data.gaps.total",
    description="Gaps detectados no feed de dados",
    unit="gaps",
)
# Labels: {source, symbol, gap_duration_class}

# === RISK ===

risk_checks_total = meter.create_counter(
    "trading.risk.checks.total",
    description="Total de verificacoes de risco",
    unit="checks",
)
# Labels: {result: approved/rejected, reason}

def get_exposure_callback(options):
    """Exposicao atual da carteira."""
    exposure = risk_engine.get_exposure()
    yield metrics.Observation(exposure.gross, {"type": "gross"})
    yield metrics.Observation(exposure.net, {"type": "net"})
    yield metrics.Observation(exposure.long, {"type": "long"})
    yield metrics.Observation(exposure.short, {"type": "short"})

meter.create_observable_gauge(
    "trading.risk.exposure",
    description="Exposicao atual",
    unit="BRL",
    callbacks=[get_exposure_callback],
)

# === SISTEMA ===

api_requests_total = meter.create_counter(
    "trading.api.requests.total",
    description="Total de requests para APIs externas",
    unit="requests",
)
# Labels: {endpoint, method, status_code, exchange}

api_latency = meter.create_histogram(
    "trading.api.latency_ms",
    description="Latencia de chamadas API externas",
    unit="ms",
)
# Labels: {endpoint, method, exchange}

websocket_reconnects = meter.create_counter(
    "trading.websocket.reconnects.total",
    description="Reconexoes de WebSocket",
    unit="reconnects",
)
# Labels: {exchange, reason}
```

### 9.3 Alertas Especificos para Trading

```
ALERTAS DO TRADING BOT
========================

CRITICOS (page imediato):
  1. Circuit Breaker OPEN em qualquer exchange connector
  2. Drawdown diario > 2% (ou limite configurado)
  3. PnL < -R$ X.XXX (stop loss total)
  4. Nenhuma strategy ativa por > 5 minutos
  5. Market data feed atrasado > 10 segundos
  6. Ordem pendente (sem resposta) > 30 segundos
  7. Erro de autenticacao com exchange

WARNINGS (investigar em < 1 hora):
  1. Slippage medio > 10 bps nos ultimos 30min
  2. Taxa de rejeicao de ordens > 5%
  3. Latencia p95 > 1s
  4. Posicao aberta > 80% do limite
  5. Market data com gaps frequentes (> 3 em 5 min)
  6. CPU/Memoria acima de 80%

INFORMATIVOS (ticket/review diario):
  1. Sharpe ratio rolling 30d < 0.5
  2. Win rate < 45% nos ultimos 100 trades
  3. Numero de trades fora da faixa esperada (muito alto ou baixo)
  4. Divergencia entre backtest e producao > 20%
```

### 9.4 Logs de Auditoria (Compliance)

```python
# Logs de auditoria sao IMUTAVEIS e NUNCA devem ser filtrados/amostrados

audit_log = structlog.get_logger("trading.audit")

async def send_order_audited(order: Order) -> OrderConfirmation:
    """Toda ordem DEVE ter log de auditoria completo."""

    # LOG PRE-ENVIO (antes de qualquer operacao)
    audit_log.info("order.pre_send",
        event_type="AUDIT",
        order_id=order.id,
        symbol=order.symbol,
        side=order.side,
        quantity=order.quantity,
        price=order.price,
        order_type=order.type,
        strategy=order.strategy_name,
        account_id=order.account_id,
        risk_score=order.risk_score,
        market_price_at_decision=order.market_price_snapshot,
        timestamp_decision=order.decision_timestamp.isoformat(),
        timestamp_send=datetime.utcnow().isoformat(),
    )

    try:
        confirmation = await exchange.send(order)

        # LOG POS-EXECUCAO
        audit_log.info("order.executed",
            event_type="AUDIT",
            order_id=order.id,
            exchange_order_id=confirmation.exchange_id,
            fill_price=confirmation.fill_price,
            fill_quantity=confirmation.fill_quantity,
            slippage_bps=confirmation.slippage_bps,
            commission=confirmation.commission,
            timestamp_fill=confirmation.timestamp.isoformat(),
            latency_ms=confirmation.latency_ms,
        )
        return confirmation

    except Exception as e:
        # LOG DE FALHA
        audit_log.error("order.failed",
            event_type="AUDIT",
            order_id=order.id,
            error_type=type(e).__name__,
            error_message=str(e),
            timestamp_error=datetime.utcnow().isoformat(),
            exc_info=True,
        )
        raise
```

### 9.5 Dashboard Grafana -- Paineis Recomendados

```
LAYOUT DO DASHBOARD GRAFANA -- TRADING BOT
============================================

+----------------------------------------------+
| HEADER: Status Geral                         |
| [UP/DOWN] Bot Status   [N] Strategies ativas |
| [PnL total] [Drawdown] [Sharpe rolling]      |
+----------------------------------------------+

+--------------------+-------------------------+
| PnL (Time Series)  | Drawdown (Time Series)  |
| - Realizado         | - Current drawdown      |
| - Nao realizado     | - Max daily drawdown    |
| - Total             | - Max total drawdown    |
+--------------------+-------------------------+

+--------------------+-------------------------+
| Ordens/hora        | Latencia de Execucao    |
| (rate, stacked     | (p50, p95, p99          |
|  por strategy)     |  heatmap)               |
+--------------------+-------------------------+

+--------------------+-------------------------+
| Fill Rate          | Slippage (BPS)          |
| (gauge/histogram)  | (histogram por symbol)  |
+--------------------+-------------------------+

+--------------------+-------------------------+
| Circuit Breakers   | API Error Rate          |
| (state timeline)   | (rate por endpoint)     |
+--------------------+-------------------------+

+--------------------+-------------------------+
| Market Data Feed   | Exposicao por Ativo     |
| Latency (heatmap)  | (bar chart gross/net)   |
+--------------------+-------------------------+

+----------------------------------------------+
| TRACES: Ultimas ordens (link para Tempo)     |
| [Order ID] [Symbol] [Side] [Duration] [Link] |
+----------------------------------------------+

+----------------------------------------------+
| LOGS: Stream filtrado (via Loki)             |
| level=error OR event_type=AUDIT              |
+----------------------------------------------+
```

---

## 10. Anti-Patterns e Armadilhas

### 10.1 Anti-Patterns de Observabilidade

| Anti-Pattern | Problema | Solucao |
|---|---|---|
| **Label de alta cardinalidade** | Usar `user_id`, `order_id`, `request_id` como label de metrica | Use esses valores como atributos de SPAN (trace), nao de metrica |
| **Log-and-throw** | `log.error(e); throw e;` -- duplica a informacao | Logue OU relance, nao ambos. Logue no error boundary |
| **Alert fatigue** | Alertas demais, todos urgentes | Use burn-rate alerting, priorize por SLO impact |
| **Metricas sem sentido** | Monitorar CPU sem saber o "so what" | Sempre vincule metrica a SLI/SLO de negocio |
| **Sampling de 100%** | Coletar todos os traces em producao | Use tail-based sampling: 100% para erros, 10-20% normais |
| **Logs como metricas** | Contar eventos parseando logs | Use counters OTEL nativos, logs para contexto |
| **Dashboard wall** | 50+ dashboards que ninguem olha | 3-5 dashboards focados: overview, orders, risk, system |
| **Observar sem agir** | Dados lindos, zero acao | Todo dashboard precisa de runbook associado |
| **Vendor lock-in** | Instrumentar com SDK proprietario | Use OTEL SDK (vendor-neutral), mude backend quando quiser |
| **Ignorar correlacao** | Logs sem trace_id, metricas sem exemplars | Sempre injete trace context em logs e use exemplars |

### 10.2 Anti-Patterns de Error Handling

| Anti-Pattern | Problema | Solucao |
|---|---|---|
| **Pokemon exception** | `except Exception: pass` -- engole tudo | Capture excecoes especificas, sempre logue |
| **Exception como fluxo** | Usar exceptions para validacao de negocio | Use Result/Either para domain errors |
| **Error codes magicos** | `return -1` ou `return None` para erro | Use tipos explicitos (Result, Optional tipado) |
| **Retry infinito** | Retry sem backoff ou limite | Exponential backoff + jitter + max retries |
| **Circuit breaker ausente** | Chamar API externa sem protecao | Circuit breaker em todo ponto de integracao |
| **Log sem contexto** | `log.error("Error occurred")` | Inclua SEMPRE: what, where, why, identifiers |
| **Swallow e continue** | Ignorar erro e continuar como se nada | Se nao sabe tratar, propague para quem sabe |

---

## 11. Arquitetura de Referencia Completa

### 11.1 Arquitetura End-to-End

```
ARQUITETURA DE OBSERVABILIDADE DO TRADING BOT
===============================================

+------------------------------------------------------------------+
|                      TRADING BOT APPLICATION                      |
|                                                                   |
|  +------------------+  +------------------+  +-----------------+  |
|  | Signal Generator |  | Risk Manager     |  | Order Manager   |  |
|  |                  |  |                  |  |                 |  |
|  | OTEL SDK:        |  | OTEL SDK:        |  | OTEL SDK:       |  |
|  | - Tracer         |  | - Tracer         |  | - Tracer        |  |
|  | - Meter          |  | - Meter          |  | - Meter         |  |
|  | - Logger         |  | - Logger         |  | - Logger        |  |
|  +--------+---------+  +--------+---------+  +--------+--------+  |
|           |                      |                     |          |
|           +----------------------+---------------------+          |
|                                  |                                |
|                            OTLP (gRPC)                           |
|                                  |                                |
+----------------------------------+--------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|                      OTEL COLLECTOR                               |
|                                                                   |
|  Receivers:          Processors:          Exporters:              |
|  - OTLP (gRPC/HTTP) - batch              - otlp/tempo (traces)  |
|  - prometheus scrape - memory_limiter     - prometheusremotewrite |
|                      - tail_sampling      - loki (logs)          |
|                      - attributes/filter  - debug (dev only)     |
+------------------------------------------------------------------+
         |                    |                    |
         v                    v                    v
+------------------+ +------------------+ +------------------+
|  GRAFANA TEMPO   | |  GRAFANA MIMIR   | |  GRAFANA LOKI    |
|  (Traces)        | |  (Metrics)       | |  (Logs)          |
|                  | |                  | |                  |
|  Object Storage  | |  Object Storage  | |  Object Storage  |
|  (S3/MinIO)      | |  (S3/MinIO)      | |  (S3/MinIO)      |
+--------+---------+ +--------+---------+ +--------+---------+
         |                    |                    |
         +--------------------+--------------------+
                              |
                              v
                    +------------------+
                    |     GRAFANA      |
                    |                  |
                    | - Dashboards     |
                    | - Explore        |
                    | - Alerting       |
                    | - Correlacao     |
                    |   Logs<->Traces  |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   ALERTMANAGER   |
                    |  / Grafana Alert |
                    |                  |
                    | -> PagerDuty     |
                    | -> Slack         |
                    | -> Telegram      |
                    | -> Email         |
                    +------------------+
```

### 11.2 Instrumentacao Completa -- Bootstrap do Bot

```python
# observability.py -- Bootstrap completo de observabilidade

import structlog
import logging
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator


def setup_observability(
    service_name: str = "trading-bot",
    service_version: str = "1.0.0",
    otel_endpoint: str = "localhost:4317",
    environment: str = "production",
):
    """Inicializa toda a stack de observabilidade."""

    # 1. Resource (identifica o servico)
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
        "deployment.environment": environment,
        "service.instance.id": socket.gethostname(),
    })

    # 2. Tracing
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=otel_endpoint, insecure=True),
            max_queue_size=2048,
            max_export_batch_size=512,
            schedule_delay_millis=5000,
        )
    )
    trace.set_tracer_provider(tracer_provider)

    # 3. Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=otel_endpoint, insecure=True),
        export_interval_millis=10000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # 4. Logs via OTEL
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(
            OTLPLogExporter(endpoint=otel_endpoint, insecure=True),
        )
    )
    handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    logging.getLogger().addHandler(handler)

    # 5. Context Propagation (W3C padrao)
    set_global_textmap(CompositePropagator([
        TraceContextTextMapPropagator(),
        W3CBaggagePropagator(),
    ]))

    # 6. Structured logging com structlog
    def add_otel_context(logger, method_name, event_dict):
        span = trace.get_current_span()
        if span and span.is_recording():
            ctx = span.get_span_context()
            event_dict["trace_id"] = format(ctx.trace_id, '032x')
            event_dict["span_id"] = format(ctx.span_id, '016x')
        return event_dict

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            add_otel_context,
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )

    return tracer_provider, meter_provider, logger_provider


def shutdown_observability(tracer_provider, meter_provider, logger_provider):
    """Graceful shutdown -- flush de todos os dados pendentes."""
    tracer_provider.shutdown()
    meter_provider.shutdown()
    logger_provider.shutdown()


# === USO ===
# No main.py do bot:
#
# tracer_prov, meter_prov, logger_prov = setup_observability(
#     service_name="trading-bot",
#     otel_endpoint="otel-collector:4317",
#     environment="production",
# )
#
# # ... rodar o bot ...
#
# # No shutdown:
# shutdown_observability(tracer_prov, meter_prov, logger_prov)
```

### 11.3 Docker Compose -- Stack Local de Desenvolvimento

```yaml
# docker-compose.observability.yml

version: '3.8'

services:
  # === OTEL Collector ===
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics (do collector)
    volumes:
      - ./config/otel-collector-config.yaml:/etc/otelcol/config.yaml

  # === Grafana Tempo (Traces) ===
  tempo:
    image: grafana/tempo:latest
    ports:
      - "3200:3200"   # Tempo API
    volumes:
      - ./config/tempo.yaml:/etc/tempo.yaml
      - tempo-data:/var/tempo
    command: ["-config.file=/etc/tempo.yaml"]

  # === Prometheus (Metrics) ===
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  # === Grafana Loki (Logs) ===
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./config/loki.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki

  # === Grafana (Visualization) ===
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_AUTH_ANONYMOUS_ENABLED=true
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana-datasources.yaml:/etc/grafana/provisioning/datasources/ds.yaml
    depends_on:
      - tempo
      - prometheus
      - loki

volumes:
  tempo-data:
  prometheus-data:
  loki-data:
  grafana-data:
```

---

## 12. Livros e Bibliografia Fundamental

### 12.1 Livros Essenciais

| # | Titulo | Autor(es) | Ano | Editora | Foco |
|---|---|---|---|---|---|
| 1 | **Observability Engineering** | Charity Majors, Liz Fong-Jones, George Miranda | 2022 | O'Reilly | Filosofia e pratica de observabilidade; eventos de alta cardinalidade; SLOs |
| 2 | **Distributed Systems Observability** | Cindy Sridharan | 2018 | O'Reilly (ebook gratuito) | Os 3 pilares; anti-patterns de monitoramento; observabilidade como superset |
| 3 | **Cloud-Native Observability with OpenTelemetry** | Alex Boten (prefacio Charity Majors) | 2022 | Packt | Guia pratico de OTEL: SDK, Collector, instrumentacao, backends |
| 4 | **Release It!** (2nd Edition) | Michael T. Nygard | 2018 | Pragmatic Bookshelf | Circuit breakers, bulkheads, stability patterns, production readiness |
| 5 | **Site Reliability Engineering** | Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Murphy (Google) | 2016 | O'Reilly (gratis online) | SLIs, SLOs, error budgets, alerting, on-call |
| 6 | **The Site Reliability Workbook** | Betsy Beyer et al. (Google) | 2018 | O'Reilly (gratis online) | Implementacao pratica de SRE: alerting on SLOs, incident response |
| 7 | **Distributed Tracing in Practice** | Austin Parker, Daniel Spoonhower, Jonathan Mace, Ben Sigelman, Rebecca Isaacs | 2020 | O'Reilly | Tracing end-to-end: instrumentacao, propagacao, analise |
| 8 | **Database Reliability Engineering** | Laine Campbell, Charity Majors | 2017 | O'Reilly | Observabilidade de banco de dados, operacoes de infra |
| 9 | **Production-Ready Microservices** | Susan Fowler | 2016 | O'Reilly | Padronizacao de producao: monitoring, alerting, documentation |
| 10 | **Designing Data-Intensive Applications** | Martin Kleppmann | 2017 | O'Reilly | Fundamentos de sistemas distribuidos (base para entender tracing) |

### 12.2 Papers e Artigos Seminais

| Titulo | Autor(es) | Ano | Relevancia |
|---|---|---|---|
| **Dapper, a Large-Scale Distributed Systems Tracing Infrastructure** | Sigelman et al. (Google) | 2010 | Paper que originou o distributed tracing moderno |
| **Monitoring and Observability** | Cindy Sridharan (blog) | 2017 | Artigo seminal que diferenciou os conceitos |
| **Towards Observability Data Management at Scale** | Bates et al. | 2023 | Desafios de escala em dados de observabilidade |

---

## 13. Referencias

### Fontes Primarias Consultadas

| # | Titulo | Autor/Organizacao | Ano | Tipo | URL |
|---|---|---|---|---|---|
| 1 | OpenTelemetry Protocol (OTLP) Specification | OpenTelemetry Project | 2024 | Especificacao oficial | https://opentelemetry.io/docs/specs/otlp/ |
| 2 | Three Pillars of Observability: Logs, Metrics and Traces | IBM | 2024 | Guia tecnico | https://www.ibm.com/think/insights/observability-pillars |
| 3 | W3C Trace Context Specification | W3C | 2024 | Padrao web | https://www.w3.org/TR/trace-context/ |
| 4 | OpenTelemetry Metrics Data Model | OpenTelemetry Project | 2024 | Especificacao oficial | https://opentelemetry.io/docs/specs/otel/metrics/data-model/ |
| 5 | Structured Logging Best Practices | Uptrace | 2024 | Guia tecnico | https://uptrace.dev/glossary/structured-logging |
| 6 | Functional Error Handling with Monads | Guillaume Bogard | 2023 | Artigo tecnico | https://guillaumebogard.dev/posts/functional-error-handling/ |
| 7 | Grafana Tempo vs Jaeger: Key Features and Differences | Last9 | 2024 | Comparacao | https://last9.io/blog/grafana-tempo-vs-jaeger/ |
| 8 | Cloud-Native Observability with OpenTelemetry (Book) | Alex Boten, Charity Majors | 2022 | Livro | https://www.amazon.com/dp/B09TTCQBM7 |
| 9 | Alerting on SLOs (Google SRE Workbook) | Google | 2018 | Livro/Guia oficial | https://sre.google/workbook/alerting-on-slos/ |
| 10 | A Brief History of OpenTelemetry | CNCF | 2019 | Historico oficial | https://www.cncf.io/blog/2019/05/21/a-brief-history-of-opentelemetry-so-far/ |
| 11 | The Role of Monitoring for Trading Systems | Luxoft | 2024 | Artigo tecnico | https://www.luxoft.com/blog/role-of-monitoring-for-trading-systems |
| 12 | Tail Sampling with OpenTelemetry | OpenTelemetry Blog | 2022 | Guia oficial | https://opentelemetry.io/blog/2022/tail-sampling/ |
| 13 | What is High Cardinality in Observability? | Chronosphere | 2024 | Guia tecnico | https://chronosphere.io/learn/what-is-high-cardinality/ |
| 14 | OpenTelemetry Collector Architecture | OpenTelemetry Project | 2024 | Doc oficial | https://opentelemetry.io/docs/collector/architecture/ |
| 15 | Prometheus and OpenMetrics Compatibility | OpenTelemetry Project | 2024 | Especificacao | https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/ |
| 16 | Distributed Systems Observability (eBook) | Cindy Sridharan | 2018 | Livro (gratis) | https://www.oreilly.com/library/view/distributed-systems-observability/9781492033431/ |
| 17 | Implementing Circuit Breaker Pattern in Python | PyBreaker | 2024 | Biblioteca | https://github.com/danielfm/pybreaker |
| 18 | LGTM Stack for Observability: A Complete Guide | DrDroid | 2024 | Guia tecnico | https://drdroid.io/engineering-tools/lgtm-stack-for-observability-a-complete-guide |
| 19 | OpenTelemetry FastAPI Instrumentation | OpenTelemetry Python Contrib | 2024 | Doc oficial | https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html |
| 20 | Top 5 Open Source Alternatives to Datadog | SigNoz | 2025 | Comparacao | https://signoz.io/comparisons/open-source-datadog-alternatives/ |
| 21 | Qual e a diferenca entre observabilidade e monitoramento? | AWS | 2024 | Guia (PT-BR) | https://aws.amazon.com/compare/the-difference-between-monitoring-and-observability/ |
| 22 | OpenTelemetry: The Merger of OpenCensus and OpenTracing | Google Open Source | 2019 | Anuncio oficial | https://opensource.googleblog.com/2019/05/opentelemetry-merger-of-opencensus-and.html |
| 23 | High Cardinality in Metrics: Challenges, Causes, and Solutions | Sawmills AI | 2024 | Guia tecnico | https://www.sawmills.ai/blog/high-cardinality-in-metrics-challenges-causes-and-solutions |
| 24 | Honeycomb vs Datadog - Choosing the Right Observability Tool | SigNoz | 2024 | Comparacao | https://signoz.io/comparisons/honeycomb-vs-datadog/ |
| 25 | A Deep Dive into the OpenTelemetry Protocol (OTLP) | Better Stack | 2024 | Guia tecnico | https://betterstack.com/community/guides/observability/otlp/ |

---

**Total de fontes:** 25+ referencias documentadas
**Linhas:** ~1.800+
**Cobertura:** 10 topicos abrangendo teoria fundamental, especificacoes tecnicas, implementacao pratica, anti-patterns, e aplicacao direta ao trading bot.
