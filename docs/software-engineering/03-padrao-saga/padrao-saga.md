# Padrao SAGA — Referencia Definitiva

> **Nivel**: PhD-level reference
> **Ultima atualizacao**: 2026-02-07
> **Contexto**: Documentacao tecnica para o BOT Assessor — sistema de trading automatizado

---

## Indice

1. [Conceitos Fundamentais e Origem](#1-conceitos-fundamentais-e-origem)
2. [2PC vs Saga — Por Que Sagas Existem](#2-2pc-vs-saga--por-que-sagas-existem)
3. [Choreography Saga](#3-choreography-saga)
4. [Orchestration Saga](#4-orchestration-saga)
5. [Compensating Transactions](#5-compensating-transactions)
6. [Saga State Machine](#6-saga-state-machine)
7. [Implementacao — Componentes Internos](#7-implementacao--componentes-internos)
8. [Countermeasures — Lidando com Falta de Isolamento](#8-countermeasures--lidando-com-falta-de-isolamento)
9. [Anti-Patterns e Limites](#9-anti-patterns-e-limites)
10. [Saga para Trading e Fintech](#10-saga-para-trading-e-fintech)
11. [Aplicacao ao BOT Assessor](#11-aplicacao-ao-bot-assessor)
12. [Frameworks e Ferramentas](#12-frameworks-e-ferramentas)
13. [Referencias Bibliograficas Completas](#13-referencias-bibliograficas-completas)

---

## 1. Conceitos Fundamentais e Origem

### 1.1 O Paper Original (1987)

O padrao Saga foi introduzido por **Hector Garcia-Molina** e **Kenneth Salem** no paper
"SAGAS", publicado nos Proceedings of the 1987 ACM SIGMOD International Conference on
Management of Data (paginas 249-259).

**Problema original**: Long-Lived Transactions (LLTs) — transacoes que duram minutos, horas
ou dias em um banco de dados relacional. Essas transacoes mantem locks por periodos
prolongados, degradando a performance e a concorrencia do sistema.

**Solucao proposta**: Decompor uma LLT em uma sequencia de sub-transacoes menores (T1, T2,
..., Tn), cada uma sendo uma transacao ACID curta. Para cada Ti, existe uma transacao
compensatoria Ci que desfaz semanticamente o efeito de Ti.

**Definicao formal do paper**:

```
Uma SAGA e uma sequencia de transacoes T1, T2, ..., Tn
com transacoes compensatorias correspondentes C1, C2, ..., Cn-1

A execucao garante que:
- OU a sequencia completa T1, T2, ..., Tn e executada (sucesso)
- OU uma sequencia T1, T2, ..., Tj, Cj, ..., C2, C1 e executada (compensacao)
```

> **Nota critica**: O paper original foi escrito para um UNICO banco de dados relacional,
> nao para sistemas distribuidos. A adaptacao para microsservicos veio posteriormente.

### 1.2 Evolucao do Conceito

```
1987: Paper original (Garcia-Molina & Salem)
      |-- Contexto: banco de dados unico, LLTs
      |
2000s: SOA (Service-Oriented Architecture)
      |-- WS-BusinessActivity, WS-Coordination
      |
2015+: Microsservicos
      |-- Chris Richardson adapta Sagas para microsservicos
      |-- Cada servico tem seu proprio banco de dados
      |-- Transacoes distribuidas sao inevitaveis
      |
2018:  "Microservices Patterns" (Richardson) — Cap. 4
      |-- Formalizacao de Choreography e Orchestration
      |-- Countermeasures para isolamento
      |
2020+: Frameworks modernos
       |-- Temporal.io, Axon, MassTransit, NServiceBus
       |-- Saga como padrao de primeira classe
```

### 1.3 O Problema Fundamental

Em arquitetura de microsservicos com **Database per Service**, uma operacao de negocio
frequentemente precisa atualizar dados em multiplos servicos. Exemplo:

```
Criar Ordem de Compra:
  1. OrderService   -> criar registro da ordem
  2. RiskService    -> validar limites de risco
  3. MarginService  -> reservar margem
  4. BrokerService  -> enviar ordem a exchange
  5. PositionService -> atualizar posicoes
```

Cada servico tem seu proprio banco. Nao existe uma transacao ACID unica que abranja todos.
Se o passo 4 falhar, os passos 1-3 ja foram commitados em seus respectivos bancos e
precisam ser **compensados**.

---

## 2. 2PC vs Saga — Por Que Sagas Existem

### 2.1 Two-Phase Commit (2PC)

O 2PC e um protocolo de consenso distribuido:

```
                    Coordinator
                   /     |     \
                  v      v      v
               Node A  Node B  Node C

Fase 1 (PREPARE):
  Coordinator -> "Prepare to commit?" -> Todos os nodes
  Nodes       -> "Yes/No" -> Coordinator

Fase 2 (COMMIT/ABORT):
  Se TODOS responderam "Yes":
    Coordinator -> "COMMIT" -> Todos os nodes
  Se QUALQUER UM respondeu "No":
    Coordinator -> "ABORT" -> Todos os nodes
```

### 2.2 Problemas do 2PC em Microsservicos

| Aspecto              | 2PC                              | Saga                              |
|----------------------|----------------------------------|-----------------------------------|
| **Consistencia**     | Forte (ACID)                     | Eventual                          |
| **Bloqueio**         | Sincrono — locks mantidos        | Assincrono — sem locks globais    |
| **Escalabilidade**   | Baixa (locks distribuidos)       | Alta (transacoes locais)          |
| **Disponibilidade**  | Se 1 node cai, todos bloqueiam   | Servicos independentes            |
| **Latencia**         | Alta (2 roundtrips + locks)      | Menor (execucao sequencial local) |
| **Acoplamento**      | Forte (todos devem participar)   | Fraco (eventos/comandos)          |
| **Deadlock**         | Possivel entre transacoes        | Nao se aplica                     |
| **Complexidade**     | Protocolo simples, falha complexa| Compensacoes complexas            |
| **Ponto de Falha**   | Coordinator e SPOF               | Depende da variante               |

### 2.3 Por Que 2PC Nao Funciona em Microsservicos

1. **Bloqueio**: O 2PC mantem locks durante toda a transacao. Com chamadas RPC lentas e
   integracao com servicos externos (exchanges, APIs de pagamento), esses locks se tornam
   gargalos criticos.

2. **SPOF**: O coordinator e um ponto unico de falha. Se ele cai entre a fase 1 e 2, todos
   os participantes ficam em estado incerto (in-doubt transactions).

3. **Heterogeneidade**: Muitos datastores modernos (NoSQL, message brokers, APIs externas)
   nao suportam o protocolo XA/2PC.

4. **CAP Theorem**: Em sistemas distribuidos, 2PC sacrifica Availability para obter
   Consistency. Em trading, disponibilidade e frequentemente mais critica.

---

## 3. Choreography Saga

### 3.1 Conceito

Na Choreography Saga, **nao existe um coordenador central**. Cada servico:
1. Executa sua transacao local
2. Publica um evento de dominio
3. Outros servicos reagem a esses eventos

E uma abordagem **event-driven** e **descentralizada**.

### 3.2 Diagrama de Sequencia — Fluxo de Sucesso

```
OrderSvc       RiskSvc       MarginSvc      BrokerSvc      PositionSvc
   |               |              |              |              |
   |--OrderCreated--->             |              |              |
   |               |              |              |              |
   |           [valida risco]     |              |              |
   |               |              |              |              |
   |               |--RiskApproved-->            |              |
   |               |              |              |              |
   |               |         [reserva margem]    |              |
   |               |              |              |              |
   |               |              |--MarginReserved-->          |
   |               |              |              |              |
   |               |              |         [envia ordem]       |
   |               |              |              |              |
   |               |              |              |--OrderFilled-->
   |               |              |              |              |
   |               |              |              |        [atualiza pos]
   |               |              |              |              |
   |<--OrderCompleted--------------------------------------|
```

### 3.3 Diagrama de Sequencia — Fluxo de Compensacao

```
OrderSvc       RiskSvc       MarginSvc      BrokerSvc
   |               |              |              |
   |--OrderCreated--->             |              |
   |               |              |              |
   |           [valida risco]     |              |
   |               |              |              |
   |               |--RiskApproved-->            |
   |               |              |              |
   |               |         [reserva margem]    |
   |               |              |              |
   |               |              |--MarginReserved-->
   |               |              |              |
   |               |              |         [FALHA ao enviar]
   |               |              |              |
   |               |              |<--BrokerFailed--|
   |               |              |              |
   |               |         [libera margem]     |
   |               |              |              |
   |               |<--MarginReleased--|         |
   |               |              |              |
   |           [reverte risco]    |              |
   |               |              |              |
   |<--RiskReverted--|            |              |
   |               |              |              |
   |  [cancela ordem]            |              |
   |               |              |              |
   |--OrderCancelled-->           |              |
```

### 3.4 Pros e Contras

**Vantagens**:
- **Baixo acoplamento**: Cada servico so conhece seus proprios eventos
- **Sem SPOF**: Nao existe coordenador central
- **Escalabilidade**: Servicos sao independentes
- **Simplicidade**: Para sagas com 2-3 passos

**Desvantagens**:
- **Dificil de rastrear**: O fluxo esta espalhado por multiplos servicos
- **Dependencias ciclicas**: Risco de event loops
- **Debugging complexo**: Correlacionar eventos entre servicos e desafiador
- **Ordenacao**: Sem garantia de ordem de processamento
- **Visibilidade**: Nao existe uma visao unica do estado da saga

### 3.5 Quando Usar

- Sagas simples com **ate 3 servicos**
- Cenarios onde **acoplamento minimo** e prioridade
- Fluxos que **naturalmente se organizam por eventos**
- Quando alguma **perda de dados e toleravel** (eventual consistency)
- Equipes independentes que controlam seus proprios servicos

---

## 4. Orchestration Saga

### 4.1 Conceito

Na Orchestration Saga, um **orquestrador central** (Saga Execution Coordinator - SEC)
controla todo o fluxo:
1. Sabe a sequencia de passos
2. Envia comandos explicitamente para cada servico
3. Recebe respostas
4. Decide proximo passo ou compensacao
5. Persiste o estado da saga

### 4.2 Diagrama de Sequencia — Fluxo de Sucesso

```
Client        Orchestrator       RiskSvc      MarginSvc     BrokerSvc    PositionSvc
  |               |                  |             |             |             |
  |--CreateOrder-->                  |             |             |             |
  |               |                  |             |             |             |
  |               |--ValidateRisk--->|             |             |             |
  |               |                  |             |             |             |
  |               |<--RiskOK---------|             |             |             |
  |               |                  |             |             |             |
  |               |--ReserveMargin----------->|    |             |             |
  |               |                  |             |             |             |
  |               |<--MarginReserved----------|    |             |             |
  |               |                  |             |             |             |
  |               |--SubmitOrder------------------------->|      |             |
  |               |                  |             |             |             |
  |               |<--OrderFilled-------------------------|      |             |
  |               |                  |             |             |             |
  |               |--UpdatePosition-------------------------------------->|    |
  |               |                  |             |             |             |
  |               |<--PositionUpdated------------------------------------|    |
  |               |                  |             |             |             |
  |<--OrderComplete|                 |             |             |             |
```

### 4.3 Diagrama de Sequencia — Fluxo de Compensacao

```
Client        Orchestrator       RiskSvc      MarginSvc     BrokerSvc
  |               |                  |             |             |
  |--CreateOrder-->                  |             |             |
  |               |                  |             |             |
  |               |--ValidateRisk--->|             |             |
  |               |<--RiskOK---------|             |             |
  |               |                  |             |             |
  |               |--ReserveMargin----------->|    |             |
  |               |<--MarginReserved----------|    |             |
  |               |                  |             |             |
  |               |--SubmitOrder------------------------->|      |
  |               |<--BROKER_ERROR------------------------|      |
  |               |                  |             |             |
  |               |  [COMPENSACAO INICIA]          |             |
  |               |                  |             |             |
  |               |--ReleaseMargin----------->|    |             |
  |               |<--MarginReleased----------|    |             |
  |               |                  |             |             |
  |               |--RevertRisk----->|             |             |
  |               |<--RiskReverted---|             |             |
  |               |                  |             |             |
  |<--OrderFailed--|                 |             |             |
```

### 4.4 Pros e Contras

**Vantagens**:
- **Visibilidade total**: O orquestrador conhece o estado completo da saga
- **Fluxos complexos**: Suporta branches, conditions, parallel steps
- **Debugging**: Um unico ponto para rastrear toda a saga
- **Separacao de responsabilidades**: Logica de coordenacao isolada
- **Testabilidade**: Facil testar o orquestrador isoladamente
- **Sem dependencias ciclicas**: Fluxo e unidirecional

**Desvantagens**:
- **Complexidade adicional**: O orquestrador e um componente a mais
- **SPOF potencial**: Se o orquestrador cair (mitigavel com persistencia)
- **Risco de God Object**: Orquestrador pode acumular logica demais
- **Fan-out**: Padrao anti-pattern se o orchestrador fizer chamadas sincronas em leque

### 4.5 Quando Usar

- Sagas com **4+ servicos**
- Fluxos com **logica condicional complexa**
- Necessidade de **monitoramento centralizado**
- Quando **compensacoes sao criticas** e precisam ser garantidas
- **Trading/Fintech**: Quase sempre orchestration por conta da criticidade

---

## 5. Compensating Transactions

### 5.1 Conceito Fundamental

Uma compensating transaction **NAO e um UNDO**. E uma **acao semantica** que produz o
efeito logico oposto da transacao original, considerando que o mundo pode ter mudado
desde a execucao original.

```
UNDO (banco de dados):
  DELETE FROM orders WHERE id = 123;
  -- Restaura o estado exato anterior

COMPENSACAO (semantica):
  INSERT INTO orders (id, status) VALUES (123, 'CANCELLED');
  INSERT INTO order_events (order_id, type) VALUES (123, 'CANCELLATION');
  -- O mundo mudou: outros sistemas podem ter lido a ordem
  -- A compensacao REGISTRA a reversao, nao apaga o historico
```

### 5.2 Tres Tipos de Transacoes em uma Saga

Chris Richardson define tres categorias (Microservices Patterns, Cap. 4):

```
+------------------+-------------------+------------------+
|   COMPENSABLE    |      PIVOT        |    RETRYABLE     |
|   TRANSACTIONS   |    TRANSACTION    |   TRANSACTIONS   |
+------------------+-------------------+------------------+
|                  |                   |                  |
| T1, T2, ..., Tj  |       Tj+1       | Tj+2, ..., Tn    |
|                  |                   |                  |
| Podem ser        | Ponto de nao      | DEVEM completar  |
| compensadas      | retorno           | (com retries)    |
|                  |                   |                  |
| Se falhar apos   | Se falhar,        | Se falharem,     |
| o pivot, as      | compensa tudo     | sao retentadas   |
| anteriores sao   | anterior          | ate sucesso      |
| compensadas      |                   |                  |
+------------------+-------------------+------------------+

Exemplo na Saga de Ordem de Trading:
  T1: Criar Ordem (COMPENSABLE -> C1: Cancelar Ordem)
  T2: Validar Risco (COMPENSABLE -> C2: Reverter Validacao)
  T3: Reservar Margem (COMPENSABLE -> C3: Liberar Margem)
  T4: Enviar a Exchange (PIVOT -- ponto de nao retorno)
  T5: Confirmar Preenchimento (RETRYABLE)
  T6: Atualizar Posicao (RETRYABLE)
```

### 5.3 Forward Recovery vs Backward Recovery

```
BACKWARD RECOVERY (Compensacao):
===================================
T1 -> T2 -> T3 -> T4 [FALHA]
                   |
                   v
              C3 <- C2 <- C1

Executa compensacoes na ordem REVERSA
dos passos ja completados.

FORWARD RECOVERY (Retentativa):
===================================
T1 -> T2 -> T3 -> T4 [FALHA]
                   |
                   v
              T4 [retry] -> T4 [retry] -> T4 [sucesso] -> T5

Retenta o passo que falhou ate que tenha sucesso.
Usado para RETRYABLE TRANSACTIONS apos o pivot.
```

**Quando usar cada um**:

| Estrategia           | Quando Usar                                      |
|----------------------|--------------------------------------------------|
| **Backward Recovery** | Antes do pivot; falha de regra de negocio         |
| **Forward Recovery**  | Apos o pivot; falha transiente (rede, timeout)    |
| **Hibrido**           | Mais comum — forward para transient, backward para business |

### 5.4 Requisitos das Compensacoes

1. **Idempotencia**: A compensacao DEVE produzir o mesmo resultado se executada N vezes.
   Essencial porque retries sao inevitaveis em sistemas distribuidos.

   ```python
   # ERRADO — nao idempotente
   async def release_margin(order_id: str, amount: Decimal):
       await margin_service.credit(amount)  # credita de novo a cada retry!

   # CORRETO — idempotente
   async def release_margin(order_id: str, amount: Decimal):
       existing = await margin_service.get_reservation(order_id)
       if existing and existing.status == "RESERVED":
           await margin_service.release_reservation(order_id)
           # Usa order_id como idempotency key
   ```

2. **Comutatividade**: Quando possivel, compensacoes devem ser comutativas (ordem de
   execucao nao importa). Exemplo: credit() e debit() sao comutativos.

3. **Completude**: TODA transacao compensavel DEVE ter sua compensacao definida. Saga sem
   compensacao para algum passo e um BUG.

4. **Resiliencia**: Compensacoes tambem podem falhar. O sistema precisa de retry +
   dead letter queue para compensacoes que falharam.

---

## 6. Saga State Machine

### 6.1 Estados da Saga

Uma Saga pode ser modelada como uma state machine finita:

```
                          +----------+
                          |  STARTED |
                          +-----+----+
                                |
                     [executa passo 1]
                                |
                          +-----v----+
                    +-----|  RUNNING  |-----+
                    |     +-----+----+     |
                    |           |           |
              [passo falha]    |     [todos passos OK]
                    |           |           |
              +-----v----+     |     +-----v--------+
              |COMPENSATING|    |     |  COMPLETING  |
              +-----+----+     |     +-----+--------+
                    |           |           |
         [todas comp OK]       |     [retryable OK]
                    |           |           |
              +-----v----+     |     +-----v----+
              |  FAILED   |    |     | COMPLETED |
              +----------+     |     +----------+
                               |
                         +-----v----+
                         |  TIMED   |
                         |   OUT    |
                         +----------+
```

### 6.2 Definicao Formal dos Estados

```
STARTED       -> Saga criada, nenhum passo executado ainda
RUNNING       -> Pelo menos um passo executado, saga em progresso
COMPENSATING  -> Um passo falhou, compensacoes em execucao
COMPLETING    -> Pivot transaction concluida, executando retryable steps
COMPLETED     -> Todos os passos concluidos com sucesso
FAILED        -> Compensacoes concluidas (rollback semantico completo)
TIMED_OUT     -> Saga excedeu deadline; requer intervencao manual
STUCK         -> Compensacao falhou; requer intervencao manual (DLQ)
```

### 6.3 Persistencia do Estado

O estado da saga DEVE ser persistido de forma duravel. Se o orquestrador cair e
reiniciar, ele precisa saber em que ponto cada saga estava.

```python
@dataclass
class SagaState:
    saga_id: str
    saga_type: str
    status: SagaStatus        # STARTED, RUNNING, COMPENSATING, etc.
    current_step: int
    steps: list[SagaStepState]
    created_at: datetime
    updated_at: datetime
    deadline: datetime         # timeout da saga
    payload: dict              # dados do negocio
    error: str | None
    retry_count: int

@dataclass
class SagaStepState:
    step_name: str
    status: StepStatus         # PENDING, EXECUTING, COMPLETED, FAILED, COMPENSATED
    started_at: datetime | None
    completed_at: datetime | None
    error: str | None
    compensation_status: CompensationStatus  # NOT_NEEDED, PENDING, COMPLETED, FAILED
    retry_count: int
```

### 6.4 Saga Log

O **Saga Log** e o registro persistente de todos os eventos da saga. Inspirado em
write-ahead logs de bancos de dados:

```
saga_log:
  saga_id: "saga-order-12345"
  entries:
    - seq: 1, type: SAGA_STARTED, timestamp: "2026-02-07T10:00:00Z"
    - seq: 2, type: STEP_STARTED, step: "validate_risk", timestamp: "..."
    - seq: 3, type: STEP_COMPLETED, step: "validate_risk", timestamp: "..."
    - seq: 4, type: STEP_STARTED, step: "reserve_margin", timestamp: "..."
    - seq: 5, type: STEP_COMPLETED, step: "reserve_margin", timestamp: "..."
    - seq: 6, type: STEP_STARTED, step: "submit_order", timestamp: "..."
    - seq: 7, type: STEP_FAILED, step: "submit_order", error: "BROKER_TIMEOUT"
    - seq: 8, type: COMPENSATION_STARTED, step: "reserve_margin", timestamp: "..."
    - seq: 9, type: COMPENSATION_COMPLETED, step: "reserve_margin", timestamp: "..."
    - seq: 10, type: COMPENSATION_STARTED, step: "validate_risk", timestamp: "..."
    - seq: 11, type: COMPENSATION_COMPLETED, step: "validate_risk", timestamp: "..."
    - seq: 12, type: SAGA_FAILED, timestamp: "2026-02-07T10:00:05Z"
```

### 6.5 Timeout e Dead Letter

**Timeout**: Toda saga DEVE ter um deadline. Se a saga nao completar dentro do prazo,
ela entra em estado TIMED_OUT e inicia compensacao ou vai para intervencao manual.

```python
SAGA_TIMEOUTS = {
    "order_execution": timedelta(seconds=30),   # Ordem de mercado: rapida
    "order_limit":     timedelta(minutes=5),     # Ordem limitada: mais tempo
    "settlement":      timedelta(hours=24),      # Liquidacao: longo prazo
    "transfer":        timedelta(minutes=10),    # Transferencia: medio prazo
}
```

**Dead Letter Queue (DLQ)**: Quando uma saga ou compensacao falha apos todas as
retentativas, a mensagem vai para a DLQ para intervencao manual ou analise.

```
Fluxo com DLQ:
  Saga Step Falha -> Retry 1 -> Retry 2 -> Retry 3 -> DLQ
                                                        |
                                                        v
                                                  [Alerta operacional]
                                                  [Intervencao manual]
                                                  [Investigacao]
```

---

## 7. Implementacao — Componentes Internos

### 7.1 Arquitetura de uma Saga Orchestration

```
+------------------------------------------------------------------+
|                    SAGA ORCHESTRATOR                              |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  |  Saga Definition |  |   Saga Engine    |  |  Saga Store    |  |
|  |                  |  |                  |  |  (Persistence) |  |
|  |  - Steps[]       |  |  - Execute step  |  |  - State       |  |
|  |  - Compensations |  |  - Handle reply  |  |  - Log         |  |
|  |  - Timeout       |  |  - Compensate    |  |  - Deadlines   |  |
|  |  - Retry policy  |  |  - Timeout check |  |                |  |
|  +------------------+  +------------------+  +----------------+  |
|                                                                  |
+------------------+-----------------------------------+-----------+
                   |                                   |
            [Commands]                           [Events/Replies]
                   |                                   |
         +---------v---------+               +---------v---------+
         |   Message Broker  |               |   Message Broker  |
         |  (Command Queue)  |               |  (Reply Queue)    |
         +---------+---------+               +---------+---------+
                   |                                   ^
         +---------v---------+               +---------+---------+
         |  Service A        |-------------->|  Service A        |
         |  (execute action) |   (publish)   |  (reply)          |
         +-------------------+               +-------------------+
```

### 7.2 Saga Definition — Definindo os Passos

```python
class SagaStep:
    """Define um passo da saga com sua acao e compensacao."""
    name: str
    action: Callable           # funcao que executa o passo
    compensation: Callable     # funcao que compensa o passo
    retry_policy: RetryPolicy  # politica de retry para este passo
    timeout: timedelta         # timeout individual do passo
    is_pivot: bool = False     # True se for o pivot transaction

class SagaDefinition:
    """Define a saga completa."""
    saga_type: str
    steps: list[SagaStep]
    global_timeout: timedelta
    on_complete: Callable      # callback de sucesso
    on_failure: Callable       # callback de falha

# Exemplo: Saga de Execucao de Ordem
order_execution_saga = SagaDefinition(
    saga_type="order_execution",
    global_timeout=timedelta(seconds=30),
    steps=[
        SagaStep(
            name="validate_risk",
            action=risk_service.validate,
            compensation=risk_service.revert_validation,
            retry_policy=RetryPolicy(max_retries=3, backoff="exponential"),
            timeout=timedelta(seconds=5),
        ),
        SagaStep(
            name="reserve_margin",
            action=margin_service.reserve,
            compensation=margin_service.release,
            retry_policy=RetryPolicy(max_retries=3, backoff="exponential"),
            timeout=timedelta(seconds=5),
        ),
        SagaStep(
            name="submit_to_exchange",
            action=broker_gateway.submit_order,
            compensation=broker_gateway.cancel_order,  # so se a exchange permitir
            retry_policy=RetryPolicy(max_retries=2, backoff="exponential"),
            timeout=timedelta(seconds=10),
            is_pivot=True,  # PONTO DE NAO RETORNO
        ),
        SagaStep(
            name="update_position",
            action=position_service.update,
            compensation=None,  # retryable — nao precisa compensacao
            retry_policy=RetryPolicy(max_retries=10, backoff="exponential"),
            timeout=timedelta(seconds=5),
        ),
    ],
    on_complete=notify_order_completed,
    on_failure=notify_order_failed,
)
```

### 7.3 Retry Policies

```python
@dataclass
class RetryPolicy:
    max_retries: int = 3
    initial_delay: float = 0.1          # segundos
    max_delay: float = 30.0             # segundos
    backoff_multiplier: float = 2.0     # exponential backoff
    jitter: bool = True                  # randomize delay
    retryable_errors: set[type] = field(
        default_factory=lambda: {
            TimeoutError,
            ConnectionError,
            TransientError,
        }
    )
    non_retryable_errors: set[type] = field(
        default_factory=lambda: {
            BusinessRuleViolation,
            ValidationError,
            InsufficientMarginError,
        }
    )

def calculate_delay(policy: RetryPolicy, attempt: int) -> float:
    """Calcula delay com exponential backoff + jitter."""
    delay = min(
        policy.initial_delay * (policy.backoff_multiplier ** attempt),
        policy.max_delay,
    )
    if policy.jitter:
        delay = delay * (0.5 + random.random() * 0.5)
    return delay
```

**Regra critica**: NUNCA retente operacoes nao-idempotentes. Cobrar um cartao de credito
duas vezes por causa de um timeout nao e um "erro transiente" — e um problema grave.

### 7.4 Circuit Breaker dentro de Sagas

O Circuit Breaker protege a saga contra servicos degradados:

```
Circuit Breaker States:
  CLOSED    -> Tudo normal, requests fluem
  OPEN      -> Servico degradado, fail-fast sem chamar
  HALF_OPEN -> Teste cauteloso se o servico se recuperou

Integracao com Saga:
  Saga Step -> Circuit Breaker -> Servico Externo
                    |
                    |-- CLOSED: executa normalmente
                    |-- OPEN: retorna erro imediatamente
                    |        -> saga decide: retry later ou compensar
                    |-- HALF_OPEN: permite 1 request de teste
```

```python
class CircuitBreakerConfig:
    failure_threshold: int = 5       # falhas para abrir
    success_threshold: int = 3       # sucessos para fechar
    timeout: timedelta = timedelta(seconds=60)  # tempo em OPEN

# Na saga, o circuit breaker influencia a decisao:
async def execute_step_with_circuit_breaker(step, payload):
    breaker = get_circuit_breaker(step.service_name)

    if breaker.state == CircuitState.OPEN:
        if step.is_pivot:
            # Pivot nao pode esperar — compensa imediatamente
            raise ServiceUnavailableError(f"{step.service_name} unavailable")
        else:
            # Non-pivot — pode agendar retry para depois
            raise RetryLaterError(delay=breaker.timeout_remaining)

    try:
        result = await breaker.call(step.action, payload)
        return result
    except Exception as e:
        breaker.record_failure()
        raise
```

### 7.5 Dead Letter Queue (DLQ)

Quando tudo falha — retries esgotados, circuit breaker aberto, compensacao falhou — a
mensagem vai para a DLQ:

```python
@dataclass
class DeadLetterMessage:
    original_message: dict          # mensagem original
    saga_id: str
    step_name: str
    error: str
    retry_count: int
    first_attempt: datetime
    last_attempt: datetime
    context: dict                   # estado da saga no momento da falha

async def send_to_dlq(saga_state: SagaState, step: SagaStep, error: Exception):
    dlq_message = DeadLetterMessage(
        original_message=saga_state.payload,
        saga_id=saga_state.saga_id,
        step_name=step.name,
        error=str(error),
        retry_count=step.retry_count,
        first_attempt=step.first_attempt,
        last_attempt=datetime.utcnow(),
        context={
            "saga_status": saga_state.status,
            "completed_steps": [s.name for s in saga_state.steps if s.completed],
            "pending_compensations": [s.name for s in saga_state.steps if s.needs_compensation],
        },
    )
    await dead_letter_queue.publish(dlq_message)
    await alert_service.send_critical_alert(
        f"Saga {saga_state.saga_id} stuck: {step.name} failed after {step.retry_count} retries"
    )
```

---

## 8. Countermeasures — Lidando com Falta de Isolamento

As Sagas **NAO possuem isolamento** (o "I" do ACID). Isso significa que execucoes
concorrentes de sagas podem causar anomalias. Chris Richardson (Microservices Patterns,
Cap. 4) define as seguintes **countermeasures**:

### 8.1 Anomalias Possiveis

| Anomalia           | Descricao                                                      |
|--------------------|----------------------------------------------------------------|
| **Lost Updates**   | Uma saga sobrescreve mudancas feitas por outra saga            |
| **Dirty Reads**    | Uma saga le dados nao commitados de outra saga                 |
| **Fuzzy Reads**    | Uma saga le dados diferentes em momentos diferentes            |

### 8.2 Countermeasures

#### Semantic Lock
Uma transacao compensavel seta um **flag** indicando que a atualizacao esta em andamento.
Outros consumidores verificam este flag antes de agir.

```python
# Ao criar ordem:
order.status = "APPROVAL_PENDING"  # Semantic lock — indica que esta em saga

# Outros servicos verificam:
if order.status.endswith("_PENDING"):
    # Nao tomar acao — saga em andamento
    raise SagaInProgressError("Order is being processed by a saga")

# Ao completar saga:
order.status = "APPROVED"  # Lock liberado

# Ao compensar:
order.status = "REJECTED"  # Lock liberado com estado final
```

#### Commutative Updates
Projetar operacoes para serem executaveis em qualquer ordem.

```python
# credit() e debit() sao comutativos:
# credit(100) + debit(50) = debit(50) + credit(100)
# Resultado: +50 em ambos os casos

# Isso elimina lost updates porque a ordem de execucao nao importa
```

#### Pessimistic View
Reordenar os passos da saga para minimizar risco de negocio. Colocar as atualizacoes
de dados em retryable transactions (apos o pivot) para eliminar dirty reads.

#### Reread Value
Antes de sobrescrever um dado, rele-lo para verificar que nao mudou desde a ultima
leitura. Similar a **optimistic locking**.

```python
async def update_position(order_id: str, new_position: Position):
    current = await position_store.get(order_id)
    if current.version != expected_version:
        raise StaleDataError("Position was modified by another saga")
    await position_store.update(order_id, new_position, version=current.version + 1)
```

#### Version File
Manter um log de operacoes para garantir que operacoes sao aplicadas na ordem correta.

#### By Value (Risk-Based)
Escolher o mecanismo de concorrencia baseado no risco de negocio:
- **Baixo risco**: Saga com eventual consistency
- **Alto risco**: Distributed transaction (2PC) ou mecanismo mais forte

---

## 9. Anti-Patterns e Limites

### 9.1 Anti-Pattern: Saga Hell

**Sintoma**: Sagas em todo lugar, qualquer operacao trivial e uma saga.

**Causa**: Servicos organizados em torno de **entidades** em vez de **use cases/bounded
contexts**. Cada operacao de negocio precisa atualizar 5+ servicos.

**Solucao**: Redesenhar boundaries dos servicos usando DDD. Se voce precisa de sagas
para tudo, seus servicos estao mal definidos.

> "If you need the Saga pattern basically everywhere, you should revisit your service
> design." — Uwe Friedrichsen

### 9.2 Anti-Pattern: Saga Sem Compensacao

**Sintoma**: Passos da saga nao tem transacoes compensatorias definidas.

**Consequencia**: Se um passo falha, o sistema fica em estado inconsistente permanente.

**Regra**: TODA transacao compensavel DEVE ter uma compensacao. Sem excecoes.

### 9.3 Anti-Pattern: Sagas Muito Longas

**Sintoma**: Saga com 10+ passos, duracao de horas ou dias.

**Problemas**:
- Probabilidade de falha aumenta exponencialmente com o numero de passos
- Estado inconsistente por longos periodos
- Compensacoes complexas e frageis
- Dificil de debugar e monitorar

**Solucao**: Dividir em sub-sagas menores ou reconsiderar o design dos servicos.

### 9.4 Anti-Pattern: Calls in Series (Fan-Out Sincrono)

**Sintoma**: Orquestrador faz chamadas sincronas sequenciais a multiplos servicos.

**Problemas**:
- Latencia = soma de todas as latencias
- Disponibilidade = produto das disponibilidades (0.99^5 = 0.95)
- Se um servico cai, toda a cadeia falha

**Solucao**: Usar comunicacao assincrona (message broker) para os passos da saga.

### 9.5 Anti-Pattern: Compensacao para Erros Tecnicos

**Sintoma**: Usar compensacao da saga para lidar com falhas tecnicas (rede, timeout, crash).

**Problema**: A saga so deve compensar por **erros de regra de negocio**. Erros tecnicos
devem ser tratados na camada de infraestrutura com **retry + circuit breaker + DLQ**.

> "The Saga pattern can only be used to logically roll back transactions due to business
> errors. If you naively apply the Saga pattern also to respond to technical errors, you
> will eventually end up with an inconsistent database -- guaranteed." — Uwe Friedrichsen

```
CORRETO:
  Erro tecnico (timeout, rede) -> Retry com backoff -> Circuit breaker -> DLQ
  Erro de negocio (margem insuficiente) -> Compensacao da saga

ERRADO:
  Qualquer erro -> Compensacao da saga
```

### 9.6 Anti-Pattern: Falta de Idempotencia

**Sintoma**: Steps ou compensacoes nao sao idempotentes.

**Consequencia**: Retries causam efeitos colaterais duplicados (cobrar duas vezes, reservar
margem duplicada, enviar ordem duplicada).

### 9.7 Anti-Pattern: God Orchestrator

**Sintoma**: Orquestrador acumula logica de negocio alem da coordenacao.

**Solucao**: O orquestrador deve apenas coordenar. A logica de negocio fica nos servicos.

### 9.8 Limites Fundamentais do Padrao Saga

1. **Sem isolamento ACID**: Dados intermediarios sao visiveis a outras transacoes
2. **Complexidade de compensacao**: Nem toda operacao tem uma compensacao natural
3. **Consistencia eventual**: O sistema esta temporariamente inconsistente entre passos
4. **Observabilidade**: Rastrear o estado de sagas concorrentes e complexo
5. **Operacoes irreversiveis**: Emails enviados, SMS, notificacoes push nao podem ser
   "descompensados" — precisam de acoes corretivas (enviar email de retificacao)

---

## 10. Saga para Trading e Fintech

### 10.1 Saga de Execucao de Ordem

A saga mais critica em um sistema de trading. Cada passo deve ser atomico dentro de
seu servico, com compensacao bem definida.

```
SAGA: ORDER_EXECUTION
=====================

Passo 1: VALIDATE_ORDER (Compensable)
  Acao:        Validar dados da ordem (simbolo, quantidade, tipo)
  Compensacao: Marcar ordem como REJECTED
  Timeout:     2s

Passo 2: CHECK_RISK (Compensable)
  Acao:        Verificar limites de risco, exposicao, concentracao
  Compensacao: Reverter reserva de risco
  Timeout:     3s

Passo 3: RESERVE_MARGIN (Compensable)
  Acao:        Reservar margem/colateral necessario
  Compensacao: Liberar margem reservada
  Timeout:     3s

Passo 4: SUBMIT_TO_EXCHANGE (Pivot)
  Acao:        Enviar ordem a exchange/broker
  Compensacao: Cancelar ordem na exchange (se possivel)
  Timeout:     10s
  NOTA:        PONTO DE NAO RETORNO — apos confirmacao

Passo 5: CONFIRM_FILL (Retryable)
  Acao:        Confirmar preenchimento da ordem
  Compensacao: N/A (retryable — deve completar)
  Timeout:     15s

Passo 6: UPDATE_POSITION (Retryable)
  Acao:        Atualizar posicao no portfolio
  Compensacao: N/A (retryable — deve completar)
  Timeout:     5s

Passo 7: NOTIFY_CLIENT (Retryable)
  Acao:        Notificar cliente do resultado
  Compensacao: N/A (retryable — deve completar)
  Timeout:     3s
```

### 10.2 Diagrama ASCII Completo — Saga de Ordem

```
Client         Orchestrator      RiskSvc      MarginSvc     Exchange      PosSvc
  |                 |               |              |            |            |
  |--PlaceOrder---->|               |              |            |            |
  |                 |               |              |            |            |
  |            [saga_id=X]          |              |            |            |
  |            [status=STARTED]     |              |            |            |
  |                 |               |              |            |            |
  |                 |--CheckRisk--->|              |            |            |
  |                 |               |              |            |            |
  |                 |   [risk validates exposure,  |            |            |
  |                 |    concentration, limits]    |            |            |
  |                 |               |              |            |            |
  |                 |<--RiskOK------|              |            |            |
  |                 |               |              |            |            |
  |                 |--ReserveMargin----------->|  |            |            |
  |                 |               |              |            |            |
  |                 |   [margin service locks     |            |            |
  |                 |    collateral for order]     |            |            |
  |                 |               |              |            |            |
  |                 |<--MarginReserved----------|  |            |            |
  |                 |               |              |            |            |
  |                 |--SubmitOrder---------------------------->|            |
  |                 |               |              |            |            |
  |                 |   [=== PIVOT TRANSACTION ===]            |            |
  |                 |   [ordem enviada a exchange]             |            |
  |                 |               |              |            |            |
  |                 |<--OrderFilled-----------------------------|            |
  |                 |               |              |            |            |
  |                 |   [=== RETRYABLE STEPS ===]  |            |            |
  |                 |               |              |            |            |
  |                 |--UpdatePosition------------------------------------------->|
  |                 |               |              |            |            |
  |                 |<--PositionUpdated-------------------------------------------|
  |                 |               |              |            |            |
  |            [status=COMPLETED]   |              |            |            |
  |                 |               |              |            |            |
  |<--OrderResult---|               |              |            |            |
```

### 10.3 Saga de Liquidacao (Settlement)

```
SAGA: SETTLEMENT
================

Contexto: Apos o trade ser executado, a liquidacao acontece em D+1 ou D+2.
Esta e uma saga de longa duracao.

Passo 1: VALIDATE_TRADE_DETAILS (Compensable)
  Acao:        Validar dados do trade (contraparte, preco, quantidade)
  Compensacao: Marcar trade como SETTLEMENT_REJECTED
  Timeout:     1 min

Passo 2: MATCH_WITH_COUNTERPARTY (Compensable)
  Acao:        Confirmar match com contraparte (clearing house)
  Compensacao: Notificar break de matching
  Timeout:     30 min

Passo 3: CALCULATE_OBLIGATIONS (Compensable)
  Acao:        Calcular obrigacoes de entrega (cash, securities)
  Compensacao: Reverter calculo
  Timeout:     5 min

Passo 4: RESERVE_SECURITIES (Compensable)
  Acao:        Reservar securities/cash para entrega
  Compensacao: Liberar securities/cash
  Timeout:     1 hora

Passo 5: EXECUTE_DVP (Pivot)
  Acao:        Delivery vs Payment — entrega atomica
  Compensacao: Buy-in / Sell-out (se permitido)
  Timeout:     4 horas

Passo 6: CONFIRM_SETTLEMENT (Retryable)
  Acao:        Confirmar liquidacao com depositaria
  Compensacao: N/A
  Timeout:     1 hora

Passo 7: UPDATE_BOOKS (Retryable)
  Acao:        Atualizar livros contabeis
  Compensacao: N/A
  Timeout:     30 min
```

### 10.4 Saga de Transferencia de Fundos

```
SAGA: FUND_TRANSFER
===================

Passo 1: VALIDATE_TRANSFER (Compensable)
  Acao:        Validar dados (conta origem, destino, valor, moeda)
  Compensacao: Cancelar transferencia
  Timeout:     3s

Passo 2: CHECK_COMPLIANCE (Compensable)
  Acao:        AML/KYC checks, sanctions screening
  Compensacao: Reverter flag de compliance
  Timeout:     10s

Passo 3: DEBIT_SOURCE (Compensable)
  Acao:        Debitar conta de origem
  Compensacao: Creditar de volta a conta de origem
  Timeout:     5s

Passo 4: CREDIT_DESTINATION (Pivot + Retryable)
  Acao:        Creditar conta de destino
  Compensacao: Debitar conta de destino (se possivel)
  Timeout:     5s
  NOTA:        Se debito ja ocorreu, o credito DEVE completar (forward recovery)

Passo 5: NOTIFY_PARTIES (Retryable)
  Acao:        Notificar ambas as partes
  Compensacao: N/A
  Timeout:     3s
```

### 10.5 Consideracoes Especificas para Trading

1. **Latencia**: Em HFT (High-Frequency Trading), sagas com message broker adicionam
   latencia inaceitavel. Use sagas apenas para fluxos de media/baixa frequencia.

2. **Ordem parcialmente preenchida**: A exchange pode preencher parcialmente uma ordem.
   A saga precisa lidar com PARTIAL_FILL como um estado intermediario.

3. **Market hours**: Algumas compensacoes so podem ser executadas durante horario de
   mercado. A saga precisa agendar compensacoes para o proximo horario de pregao.

4. **Regulacao**: Trades executados devem ser reportados a reguladores. Compensacao nao
   "apaga" o trade — gera um novo trade de reversao (que tambem precisa ser reportado).

5. **Reconciliacao**: Apos cada saga de trading, um processo de reconciliacao deve
   verificar que os estados internos estao consistentes com a exchange.

---

## 11. Aplicacao ao BOT Assessor

### 11.1 Onde o BOT Assessor Usa Sagas

O BOT Assessor, como sistema de trading automatizado, tem os seguintes fluxos que
se beneficiam do padrao Saga:

```
1. SAGA: Execucao de Ordem
   Sinal do algoritmo -> Validacao de risco -> Reserva de margem ->
   Envio a exchange -> Confirmacao -> Atualizacao de posicao

2. SAGA: Ajuste de Posicao (Rebalanceamento)
   Calculo de ajuste -> Validacao de limites -> Execucao de trades ->
   Atualizacao de portfolio

3. SAGA: Stop-Loss / Take-Profit
   Trigger de preco -> Validacao de condicoes -> Envio de ordem de saida ->
   Atualizacao de posicao -> Calculo de P&L

4. SAGA: Onboarding de Nova Estrategia
   Validacao de parametros -> Alocacao de capital -> Ativacao de monitoramento ->
   Confirmacao
```

### 11.2 Recomendacao de Abordagem

Para o BOT Assessor, **Orchestration Saga** e a abordagem recomendada porque:

1. **Criticidade**: Operacoes financeiras exigem visibilidade total do fluxo
2. **Complexidade**: Fluxos de trading tem logica condicional (partial fills, rejeicoes)
3. **Auditoria**: O saga log funciona como trail de auditoria regulatoria
4. **Compensacao critica**: Margem e posicoes DEVEM ser consistentes
5. **Monitoramento**: Precisa saber em tempo real o estado de cada saga

### 11.3 Exemplo de Implementacao para o BOT

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Optional
import asyncio
import uuid


class SagaStatus(Enum):
    STARTED = "STARTED"
    RUNNING = "RUNNING"
    COMPENSATING = "COMPENSATING"
    COMPLETING = "COMPLETING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"


class StepStatus(Enum):
    PENDING = "PENDING"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    COMPENSATING = "COMPENSATING"
    COMPENSATED = "COMPENSATED"
    SKIPPED = "SKIPPED"


@dataclass
class SagaStepResult:
    success: bool
    data: Any = None
    error: str | None = None


@dataclass
class SagaStepDef:
    name: str
    action: Callable
    compensation: Optional[Callable] = None
    max_retries: int = 3
    timeout_seconds: float = 10.0
    is_pivot: bool = False


@dataclass
class SagaContext:
    saga_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: SagaStatus = SagaStatus.STARTED
    current_step_index: int = 0
    step_results: dict = field(default_factory=dict)
    completed_steps: list[str] = field(default_factory=list)
    payload: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    error: str | None = None


class SagaOrchestrator:
    """
    Orchestrator central para execucao de Sagas.

    Responsabilidades:
    - Executar passos na ordem definida
    - Gerenciar retries com backoff exponencial
    - Executar compensacoes na ordem reversa em caso de falha
    - Persistir estado da saga (via saga_store)
    - Enviar para DLQ em caso de falha irrecuperavel
    """

    def __init__(self, steps: list[SagaStepDef], saga_store, dlq, logger):
        self.steps = steps
        self.saga_store = saga_store
        self.dlq = dlq
        self.logger = logger

    async def execute(self, payload: dict) -> SagaContext:
        ctx = SagaContext(payload=payload)
        ctx.status = SagaStatus.RUNNING
        await self.saga_store.save(ctx)

        try:
            # Forward execution
            for i, step in enumerate(self.steps):
                ctx.current_step_index = i
                result = await self._execute_step(step, ctx)

                if result.success:
                    ctx.step_results[step.name] = result.data
                    ctx.completed_steps.append(step.name)
                    await self.saga_store.save(ctx)
                else:
                    ctx.error = result.error
                    self.logger.error(
                        f"Saga {ctx.saga_id}: Step '{step.name}' failed: {result.error}"
                    )
                    # Iniciar compensacao
                    await self._compensate(ctx)
                    return ctx

            ctx.status = SagaStatus.COMPLETED
            await self.saga_store.save(ctx)
            return ctx

        except asyncio.TimeoutError:
            ctx.status = SagaStatus.TIMED_OUT
            ctx.error = "Saga timed out"
            await self._compensate(ctx)
            return ctx

    async def _execute_step(self, step: SagaStepDef, ctx: SagaContext) -> SagaStepResult:
        for attempt in range(step.max_retries + 1):
            try:
                result = await asyncio.wait_for(
                    step.action(ctx.payload, ctx.step_results),
                    timeout=step.timeout_seconds,
                )
                return SagaStepResult(success=True, data=result)
            except BusinessError as e:
                # Erro de negocio — NAO retenta, compensa
                return SagaStepResult(success=False, error=str(e))
            except Exception as e:
                # Erro tecnico — retenta
                if attempt < step.max_retries:
                    delay = min(0.1 * (2 ** attempt), 30.0)
                    self.logger.warning(
                        f"Saga {ctx.saga_id}: Step '{step.name}' "
                        f"attempt {attempt + 1} failed: {e}. Retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                else:
                    return SagaStepResult(success=False, error=str(e))

    async def _compensate(self, ctx: SagaContext):
        ctx.status = SagaStatus.COMPENSATING
        await self.saga_store.save(ctx)

        # Compensar na ordem REVERSA
        for step_name in reversed(ctx.completed_steps):
            step_def = next(s for s in self.steps if s.name == step_name)
            if step_def.compensation is None:
                continue

            try:
                await step_def.compensation(ctx.payload, ctx.step_results)
                self.logger.info(
                    f"Saga {ctx.saga_id}: Compensated '{step_name}'"
                )
            except Exception as e:
                self.logger.critical(
                    f"Saga {ctx.saga_id}: Compensation FAILED for '{step_name}': {e}"
                )
                # Compensacao falhou — vai para DLQ
                await self.dlq.send({
                    "saga_id": ctx.saga_id,
                    "step_name": step_name,
                    "error": str(e),
                    "context": ctx.__dict__,
                })

        ctx.status = SagaStatus.FAILED
        await self.saga_store.save(ctx)


# === USO NO BOT ASSESSOR ===

class BusinessError(Exception):
    """Erros de regra de negocio — nao retentaveis."""
    pass


async def validate_risk(payload, results):
    """Valida limites de risco para a ordem."""
    order = payload["order"]
    # ... validacao de exposicao, concentracao, limites
    if exposure_exceeds_limit:
        raise BusinessError("Exposure limit exceeded")
    return {"risk_approved": True, "risk_score": 0.15}


async def compensate_risk(payload, results):
    """Reverte a reserva de risco."""
    order = payload["order"]
    # ... libera a reserva de risco
    pass


async def reserve_margin(payload, results):
    """Reserva margem para a ordem."""
    order = payload["order"]
    # ... calcula e reserva margem necessaria
    return {"margin_reserved": 1500.00, "reservation_id": "res-123"}


async def release_margin(payload, results):
    """Libera margem reservada (compensacao)."""
    reservation_id = results.get("reserve_margin", {}).get("reservation_id")
    if reservation_id:
        # ... libera a reserva usando o ID (idempotente)
        pass


async def submit_to_exchange(payload, results):
    """Envia ordem a exchange — PIVOT TRANSACTION."""
    order = payload["order"]
    # ... envia via FIX protocol ou API
    return {"exchange_order_id": "EX-456", "status": "FILLED", "fill_price": 150.25}


async def update_position(payload, results):
    """Atualiza posicao — RETRYABLE."""
    fill = results.get("submit_to_exchange", {})
    # ... atualiza posicao no portfolio
    return {"position_updated": True}


# Definicao da Saga
order_saga_steps = [
    SagaStepDef(
        name="validate_risk",
        action=validate_risk,
        compensation=compensate_risk,
        max_retries=2,
        timeout_seconds=5.0,
    ),
    SagaStepDef(
        name="reserve_margin",
        action=reserve_margin,
        compensation=release_margin,
        max_retries=3,
        timeout_seconds=5.0,
    ),
    SagaStepDef(
        name="submit_to_exchange",
        action=submit_to_exchange,
        compensation=None,  # Pivot — apos sucesso, nao compensa
        max_retries=2,
        timeout_seconds=10.0,
        is_pivot=True,
    ),
    SagaStepDef(
        name="update_position",
        action=update_position,
        compensation=None,  # Retryable — deve completar
        max_retries=10,
        timeout_seconds=5.0,
    ),
]
```

### 11.4 Checklist de Implementacao para o BOT

```
[ ] Cada passo da saga tem compensacao definida (exceto retryable)
[ ] Todas as operacoes sao idempotentes (idempotency keys)
[ ] Retry policy definida por passo (com backoff exponencial + jitter)
[ ] Circuit breaker configurado para servicos externos (exchange API)
[ ] Saga state persistido em armazenamento duravel
[ ] Saga log completo para auditoria
[ ] Timeouts definidos por passo e para saga global
[ ] Dead letter queue configurada para falhas irrecuperaveis
[ ] Alertas configurados para sagas STUCK e TIMED_OUT
[ ] Semantic locks implementados (status *_PENDING)
[ ] Metricas de observabilidade: duracao da saga, taxa de sucesso/falha
[ ] Testes: saga completa, falha em cada passo, compensacao, timeout
[ ] Reconciliacao pos-saga com estado da exchange
```

---

## 12. Frameworks e Ferramentas

### 12.1 Comparativo de Frameworks

| Framework          | Linguagem   | Tipo              | Saga Support     | Notas                           |
|--------------------|-------------|-------------------|------------------|---------------------------------|
| **Temporal.io**    | Multi       | Workflow Engine    | Orchestration    | Mais completo; auto-retry, state mgmt |
| **Axon Framework** | Java/Kotlin | CQRS+ES Framework | Ambos            | Integrado com Event Sourcing    |
| **MassTransit**    | .NET        | Message Bus       | State Machine    | Automatonymous integrado        |
| **NServiceBus**    | .NET        | Message Bus       | Orchestration    | Enterprise; timeouts nativos    |
| **Eventuate Tram** | Java        | CQRS+ES Framework | Ambos            | Chris Richardson; reference impl|
| **Cadence**        | Multi       | Workflow Engine    | Orchestration    | Predecessor do Temporal         |
| **Rebus**          | .NET        | Message Bus       | Saga support     | Leve; RabbitMQ integration      |
| **Camunda**        | Java        | BPM Engine        | Orchestration    | BPMN visual; enterprise         |

### 12.2 Temporal.io — Deep Dive

O Temporal e o framework mais moderno e completo para implementacao de Sagas:

- **Durabilidade automatica**: O estado do workflow e persistido automaticamente
- **Retry automatico**: Configuracao declarativa de retry policies
- **Compensacao**: O desenvolvedor registra compensacoes antes de executar cada passo
- **Visibilidade**: UI nativa para visualizar workflows em execucao
- **Multi-linguagem**: SDKs para Go, Java, TypeScript, Python, .NET

```python
# Saga com Temporal (Python SDK - conceitual)
@workflow.defn
class OrderSagaWorkflow:
    @workflow.run
    async def run(self, order: OrderRequest) -> OrderResult:
        compensations = []

        try:
            # Step 1: Validate risk
            risk_result = await workflow.execute_activity(
                validate_risk, order,
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=RetryPolicy(maximum_attempts=3),
            )
            compensations.append(("compensate_risk", order))

            # Step 2: Reserve margin
            margin_result = await workflow.execute_activity(
                reserve_margin, order,
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=RetryPolicy(maximum_attempts=3),
            )
            compensations.append(("release_margin", margin_result))

            # Step 3: Submit to exchange (pivot)
            fill_result = await workflow.execute_activity(
                submit_to_exchange, order,
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(maximum_attempts=2),
            )
            # Apos pivot, nao adiciona compensacao

            # Step 4: Update position (retryable)
            await workflow.execute_activity(
                update_position, fill_result,
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=RetryPolicy(maximum_attempts=10),
            )

            return OrderResult(status="COMPLETED", fill=fill_result)

        except Exception as e:
            # Compensar na ordem reversa
            for comp_name, comp_input in reversed(compensations):
                try:
                    await workflow.execute_activity(
                        comp_name, comp_input,
                        start_to_close_timeout=timedelta(seconds=10),
                    )
                except Exception as comp_error:
                    workflow.logger.error(f"Compensation failed: {comp_error}")

            return OrderResult(status="FAILED", error=str(e))
```

### 12.3 MassTransit (.NET) — State Machine Saga

```
MassTransit modela Sagas como State Machines (Automatonymous):

  States: Submitted, RiskValidated, MarginReserved, OrderSent, Completed, Failed

  Events: OrderSubmitted, RiskApproved, RiskRejected, MarginReserved,
          MarginFailed, OrderFilled, OrderRejected

  Transitions:
    Initially(Submitted)
      When(OrderSubmitted) -> TransitionTo(RiskValidating)
    During(RiskValidating)
      When(RiskApproved) -> TransitionTo(ReservingMargin)
      When(RiskRejected) -> TransitionTo(Failed)
    During(ReservingMargin)
      When(MarginReserved) -> TransitionTo(SubmittingOrder)
      When(MarginFailed) -> compensate -> TransitionTo(Failed)
    ...
```

---

## 13. Referencias Bibliograficas Completas

### 13.1 Paper Academico Original

| # | Titulo | Autores | Ano | Tipo | URL |
|---|--------|---------|-----|------|-----|
| 1 | "SAGAS" | Hector Garcia-Molina, Kenneth Salem | 1987 | Paper academico (ACM SIGMOD) | [Cornell CS](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf) |
| 2 | "Enhancing Saga Pattern for Distributed Transactions within a Microservices Architecture" | Varios | 2022 | Paper academico (MDPI) | [MDPI Applied Sciences](https://www.mdpi.com/2076-3417/12/12/6242) |

### 13.2 Livros Fundamentais

| # | Titulo | Autores | Ano | Tipo | Relevancia |
|---|--------|---------|-----|------|------------|
| 3 | "Microservices Patterns: With examples in Java" | Chris Richardson | 2018 | Livro (Manning) | Cap. 4: Managing transactions with sagas — referencia definitiva |
| 4 | "Designing Data-Intensive Applications" | Martin Kleppmann | 2017 (2nd ed. 2024) | Livro (O'Reilly) | Cap. 7 e 9: Transactions, consistency, distributed systems |
| 5 | "Enterprise Integration Patterns" | Gregor Hohpe, Bobby Woolf | 2003 | Livro (Addison-Wesley) | Process Manager pattern — base para Saga orchestration |
| 6 | "Building Microservices" (2nd ed.) | Sam Newman | 2021 | Livro (O'Reilly) | Cap. sobre sagas e consistencia em microsservicos |

### 13.3 Documentacao Oficial de Cloud Providers

| # | Titulo | Autor/Org | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 7 | "Saga Design Pattern" | Microsoft Azure Architecture Center | 2024 | Documentacao tecnica | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) |
| 8 | "Saga patterns" | AWS Prescriptive Guidance | 2024 | Documentacao tecnica | [AWS Docs](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html) |

### 13.4 Artigos Tecnicos e Blog Posts

| # | Titulo | Autor/Org | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 9 | "Pattern: Saga" | Chris Richardson (microservices.io) | 2018+ | Pattern catalog | [microservices.io](https://microservices.io/patterns/data/saga.html) |
| 10 | "Saga Pattern Made Easy" | Temporal.io | 2024 | Blog tecnico | [Temporal Blog](https://temporal.io/blog/saga-pattern-made-easy) |
| 11 | "Compensating Actions: Part of a Complete Breakfast with Sagas" | Temporal.io | 2024 | Blog tecnico | [Temporal Blog](https://temporal.io/blog/compensating-actions-part-of-a-complete-breakfast-with-sagas) |
| 12 | "The limits of the Saga pattern" | Uwe Friedrichsen | 2023 | Blog tecnico | [ufried.com](https://www.ufried.com/blog/limits_of_saga_pattern/) |
| 13 | "The Saga is Antipattern" | Sergiy Yevtushenko | 2023 | Blog tecnico (contraponto) | [DEV Community](https://dev.to/siy/the-saga-is-antipattern-1354) |
| 14 | "Microservices Saga Pattern" | AKF Partners | 2023 | Blog tecnico | [AKF Partners](https://akfpartners.com/growth-blog/microservices-saga-pattern) |
| 15 | "Saga Pattern Demystified: Orchestration vs Choreography" | ByteByteGo | 2024 | Newsletter | [ByteByteGo](https://blog.bytebytego.com/p/saga-pattern-demystified-orchestration) |
| 16 | "Saga Pattern in Distributed Transactions - With Examples in Go" | Rost Glukhov | 2025 | Blog tecnico | [glukhov.org](https://www.glukhov.org/post/2025/11/saga-transactions-in-microservices/) |
| 17 | "Solving Distributed Transactions with the Saga Pattern and Temporal" | Sulyz Andrei | 2026 | Blog tecnico | [Medium/Skyro-tech](https://medium.com/skyro-tech/solving-distributed-transactions-with-the-saga-pattern-and-temporal-27ccba602833) |

### 13.5 Frameworks e Documentacao de Ferramentas

| # | Titulo | Org | Tipo | URL |
|---|--------|-----|------|-----|
| 18 | MassTransit Saga Documentation | MassTransit | Docs | [masstransit.io](https://masstransit.io/documentation/patterns/saga) |
| 19 | NServiceBus Sagas Documentation | Particular Software | Docs | [particular.net](https://docs.particular.net/nservicebus/sagas/) |
| 20 | Temporal Saga Mastery Guide | Temporal Technologies | Blog | [temporal.io](https://temporal.io/blog/mastering-saga-patterns-for-distributed-transactions-in-microservices) |

### 13.6 Fontes em Portugues

| # | Titulo | Autor/Org | Tipo | URL |
|---|--------|-----------|------|-----|
| 21 | "Consistencia de Dados em Microsservicos usando-se Sagas" | Engenharia de Software Moderna | Artigo academico BR | [engsoftmoderna.info](https://engsoftmoderna.info/artigos/sagas.html) |
| 22 | "Saga Pattern" | Matheus Fidelis | Blog tecnico BR | [fidelissauro.dev](https://fidelissauro.dev/saga-pattern/) |
| 23 | "Usando Saga para garantir consistencia" | Sidharta Rezende | Blog tecnico BR | [Medium](https://sidhartarezende.medium.com/usando-saga-para-garantir-consist%C3%AAncia-de-dados-em-ambientes-distribu%C3%ADdos-2edad93798c7) |
| 24 | "Saga: O heroi da consistencia em sistemas distribuidos" | Unhacked | Blog tecnico BR | [DEV Community](https://dev.to/unhacked/saga-o-heroi-da-consistencia-em-sistemas-distribuidos-a6p) |

---

## Apendice A — Glossario

| Termo | Definicao |
|-------|-----------|
| **Saga** | Sequencia de transacoes locais com compensacoes, coordenadas para manter consistencia eventual |
| **Compensating Transaction** | Acao semantica que reverte o efeito logico de uma transacao anterior |
| **Pivot Transaction** | Ponto de nao retorno na saga; apos sucesso, retryable steps devem completar |
| **Retryable Transaction** | Transacao que segue o pivot e DEVE completar (com retries) |
| **Compensable Transaction** | Transacao que pode ser desfeita por uma compensating transaction |
| **Semantic Lock** | Flag de aplicacao indicando que dados estao sendo processados por uma saga |
| **Saga Log** | Registro persistente de todos os eventos/transicoes de uma saga |
| **SEC** | Saga Execution Coordinator — o orchestrator |
| **DLQ** | Dead Letter Queue — fila para mensagens que falharam apos todas retentativas |
| **Forward Recovery** | Retentativa do passo que falhou ate sucesso |
| **Backward Recovery** | Execucao de compensacoes na ordem reversa |
| **2PC** | Two-Phase Commit — protocolo de consenso distribuido com bloqueio |
| **Eventual Consistency** | Garantia de que, na ausencia de novas atualizacoes, todos os nos convergem para o mesmo estado |

---

## Apendice B — Decision Tree: Qual Padrao Usar?

```
Precisa atualizar dados em multiplos servicos?
  |
  +-- NAO --> Transacao local ACID e suficiente
  |
  +-- SIM --> Os servicos suportam XA/2PC?
               |
               +-- SIM e poucos servicos (<3) --> Considere 2PC
               |
               +-- NAO ou muitos servicos --> Use SAGA
                    |
                    +-- Fluxo simples (2-3 passos)?
                    |    |
                    |    +-- SIM --> Choreography Saga
                    |    +-- NAO --> Orchestration Saga
                    |
                    +-- Precisa de visibilidade total do fluxo?
                    |    |
                    |    +-- SIM --> Orchestration Saga
                    |
                    +-- E financeiro/regulado?
                         |
                         +-- SIM --> Orchestration Saga (com saga log)
```

---

*Documento gerado em 2026-02-07 como parte da documentacao tecnica do BOT Assessor.*
*Baseado em 24+ fontes academicas, livros, documentacao oficial e artigos tecnicos.*
