# Idempotencia em Sistemas Distribuidos

> **Documento de Referencia Definitiva (Nivel PhD)**
> Analise profunda sobre idempotencia: fundamentos matematicos, padroes de implementacao,
> aplicacao em APIs, mensageria, databases e trading bots.

---

## Sumario

1. [Fundamentos Matematicos e Conceituais](#1-fundamentos-matematicos-e-conceituais)
2. [Idempotencia em HTTP e APIs REST](#2-idempotencia-em-http-e-apis-rest)
3. [Idempotency Keys -- O Padrao Popularizado pela Stripe](#3-idempotency-keys----o-padrao-popularizado-pela-stripe)
4. [IETF Draft -- Padronizacao do Header Idempotency-Key](#4-ietf-draft----padronizacao-do-header-idempotency-key)
5. [Implementacao em APIs -- Codigo e Arquitetura](#5-implementacao-em-apis----codigo-e-arquitetura)
6. [Idempotencia em Mensageria](#6-idempotencia-em-mensageria)
7. [Outbox Pattern](#7-outbox-pattern)
8. [Inbox Pattern](#8-inbox-pattern)
9. [Idempotencia em Databases](#9-idempotencia-em-databases)
10. [Anti-Patterns e Erros Comuns](#10-anti-patterns-e-erros-comuns)
11. [Aplicacao ao Trading Bot](#11-aplicacao-ao-trading-bot)
12. [Livros Fundamentais e Referencias Academicas](#12-livros-fundamentais-e-referencias-academicas)
13. [Catalogo Completo de Fontes](#13-catalogo-completo-de-fontes)

---

## 1. Fundamentos Matematicos e Conceituais

### 1.1 Definicao Matematica Formal

Em algebra e matematica, uma operacao **f** e **idempotente** se e somente se:

```
f(f(x)) = f(x)    para todo x no dominio de f
```

Mais formalmente, para uma operacao binaria em um conjunto D:

```
f(x, ..., x) = x    para todo x pertencente a D
```

**Exemplos classicos:**

| Operacao             | Expressao          | Idempotente? | Justificativa                          |
|----------------------|--------------------|--------------|----------------------------------------|
| Valor absoluto       | abs(abs(-5)) = 5   | Sim          | abs(abs(x)) = abs(x)                  |
| Multiplicacao por 0  | 0 * (0 * x) = 0    | Sim          | Resultado sempre 0                     |
| Multiplicacao por 1  | 1 * (1 * x) = x    | Sim          | Resultado sempre x                     |
| Funcao identidade    | id(id(x)) = x      | Sim          | f(x) = x para todo x                  |
| Incremento (+1)      | (x+1)+1 != x+1     | Nao          | Cada aplicacao muda o resultado        |
| Projecao (sets)      | union(S,S) = S     | Sim          | Uniao de um set consigo mesmo          |
| DELETE /resource/42  | Resultado: 404/200 | Sim          | Recurso permanece deletado             |
| POST /orders         | Cria novo recurso  | Nao          | Cada chamada cria recurso diferente    |

### 1.2 Propriedades Formais

```
Idempotencia FORTE:   f(x) aplicada N vezes = f(x) aplicada 1 vez
                      O estado do sistema e identico apos 1 ou N execucoes.

Idempotencia FRACA:   O resultado retornado pode variar (ex: timestamp diferente),
                      mas o EFEITO COLATERAL no sistema e identico.
```

**Distincao critica:** Em sistemas distribuidos, idempotencia refere-se primariamente
ao **efeito no estado do sistema**, nao necessariamente a resposta retornada.
Um DELETE pode retornar 200 na primeira vez e 404 nas subsequentes,
mas o estado do sistema (recurso deletado) permanece identico.

### 1.3 Por Que Idempotencia Importa em Sistemas Distribuidos

Em sistemas distribuidos, tres realidades fundamentais tornam idempotencia essencial:

```
FALACIA #1: A rede e confiavel
  --> Pacotes se perdem, conexoes caem, timeouts acontecem

FALACIA #2: A latencia e zero
  --> Retries sao inevitaveis quando respostas demoram

FALACIA #3: A rede e segura e homogenea
  --> Mensagens podem ser duplicadas, reordenadas ou corrompidas
```

**Diagrama -- O Problema Fundamental:**

```
  Cliente                    Rede                    Servidor
     |                        |                        |
     |------- Request 1 ----->|------> Request 1 ----->|
     |                        |                        |--- Processa
     |                        |<---- Response 1 -------|    (estado alterado)
     |                        X  (pacote perdido!)     |
     |                        |                        |
     |  (timeout! vou tentar  |                        |
     |   de novo...)          |                        |
     |                        |                        |
     |------- Request 1 ----->|------> Request 1 ----->|
     |                        |                        |--- Processa NOVAMENTE!
     |                        |                        |    SEM IDEMPOTENCIA:
     |                        |                        |    estado corrompido!
     |                        |                        |    COM IDEMPOTENCIA:
     |<------ Response 1 -----|<---- Response 1 -------|    mesmo resultado!
     |                        |                        |
```

### 1.4 Semanticas de Entrega

| Semantica        | Descricao                                          | Requer Idempotencia? |
|------------------|----------------------------------------------------|----------------------|
| At-most-once     | Mensagem entregue 0 ou 1 vez. Pode perder.         | Nao                  |
| At-least-once    | Mensagem entregue 1 ou mais vezes. Pode duplicar.  | **SIM**              |
| Exactly-once     | Mensagem entregue exatamente 1 vez. Ideal.          | Depende da impl.    |

**Insight fundamental (Kleppmann, DDIA Cap. 11):**

> "Exactly-once semantics" na pratica e implementada como "at-least-once delivery"
> combinada com "idempotent processing" no consumer. Nenhum componente individual
> garante exactly-once -- e uma propriedade **end-to-end** do sistema.

---

## 2. Idempotencia em HTTP e APIs REST

### 2.1 Classificacao dos Metodos HTTP

A RFC 7231 (Secao 4.2.2) define formalmente quais metodos HTTP sao idempotentes:

```
+----------+-------------+------+------------------------------------------+
| Metodo   | Idempotente | Safe | Comportamento                            |
+----------+-------------+------+------------------------------------------+
| GET      |     Sim     | Sim  | Leitura. Nenhum efeito colateral.        |
| HEAD     |     Sim     | Sim  | Como GET, sem body na resposta.          |
| OPTIONS  |     Sim     | Sim  | Descobre capacidades do servidor.        |
| PUT      |     Sim     | Nao  | Substitui recurso inteiro. Mesmo         |
|          |             |      | resultado se repetido.                   |
| DELETE   |     Sim     | Nao  | Remove recurso. Segunda chamada pode     |
|          |             |      | retornar 404, mas estado e o mesmo.      |
| POST     |    *NAO*    | Nao  | Cria recurso ou acao. Cada chamada       |
|          |             |      | pode criar novo recurso.                 |
| PATCH    |    *NAO*    | Nao  | Modificacao parcial. Depende da          |
|          |             |      | implementacao (pode ser idempotente).    |
+----------+-------------+------+------------------------------------------+
```

### 2.2 O Desafio do POST Idempotente

POST e o metodo mais problematico porque por definicao nao e idempotente.
Porem, muitas operacoes criticas usam POST: criar pagamentos, enviar ordens, etc.

**Solucao: Idempotency Key no header**

```
POST /v1/payments HTTP/1.1
Host: api.stripe.com
Idempotency-Key: order_abc123_payment_attempt_1
Content-Type: application/json

{
  "amount": 2000,
  "currency": "usd",
  "customer": "cus_abc123"
}
```

Isso transforma um POST nao-idempotente em uma operacao idempotente:
a chave garante que mesmo se o request for enviado 5 vezes,
o pagamento sera processado apenas 1 vez.

---

## 3. Idempotency Keys -- O Padrao Popularizado pela Stripe

### 3.1 Origem e Conceito

A Stripe popularizou o padrao de **Idempotency Keys** em sua API de pagamentos.
O conceito e simples mas poderoso: o cliente gera um identificador unico para cada
operacao e o envia como header. O servidor usa essa chave para detectar e descartar
retries duplicados.

### 3.2 Anatomia do Padrao

```
  +------------------+                      +------------------+
  |     Cliente      |                      |     Servidor     |
  |                  |                      |                  |
  | 1. Gera UUID v4  |                      |                  |
  |    como idem-key |                      |                  |
  |                  |   POST /payments     |                  |
  | 2. Envia request |--------------------->| 3. Verifica se   |
  |    com header    |  Idempotency-Key:    |    idem-key ja   |
  |    Idempotency-  |  "abc-123-def-456"   |    existe no DB  |
  |    Key           |                      |                  |
  |                  |                      | 4a. NAO existe:  |
  |                  |                      |   - Salva a key  |
  |                  |                      |   - Processa     |
  |                  |                      |   - Salva result |
  |                  |                      |   - Retorna 201  |
  |                  |<---------------------|                  |
  |                  |   201 Created        |                  |
  |                  |                      | 4b. JA existe:   |
  |                  |                      |   - Busca result |
  |                  |                      |     armazenado   |
  |                  |                      |   - Retorna      |
  |                  |<---------------------|     cached       |
  |                  |   201 Created        |                  |
  |                  |   (mesmo resultado)  |                  |
  +------------------+                      +------------------+
```

### 3.3 Geracao de Idempotency Keys

| Estrategia               | Exemplo                              | Pros                           | Contras                          |
|--------------------------|--------------------------------------|--------------------------------|----------------------------------|
| UUID v4                  | `550e8400-e29b-41d4-a716-446655440000` | Simples, sem colisao         | Nao carrega semantica de negocio |
| Hash do payload          | `SHA256(request_body)`               | Deterministica                 | Payloads diferentes = key dif.   |
| Composicao de negocio    | `order_123_payment_1`                | Semantica clara                | Precisa de logica no cliente     |
| Cliente ID + Operacao    | `cus_abc_create_order_20240115`      | Evita duplicatas por cliente   | Mais complexa de gerar           |
| ULID                     | `01ARZ3NDEKTSV4RRFFQ69G5FAV`        | Ordenavel + unico              | Menos adotado que UUID           |

**Recomendacao da Stripe:** UUID v4 com pelo menos 128 bits de entropia.

### 3.4 Armazenamento e Lifecycle

```sql
CREATE TABLE idempotency_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    user_id         BIGINT NOT NULL,
    request_method  VARCHAR(10) NOT NULL,
    request_path    VARCHAR(500) NOT NULL,
    request_params  JSONB,
    response_code   INT,
    response_body   JSONB,
    recovery_point  VARCHAR(50) NOT NULL DEFAULT 'started',
    locked_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indice unico por usuario + key
    CONSTRAINT uq_user_idempotency_key
        UNIQUE (user_id, idempotency_key)
);

-- TTL: Remover keys apos 24 horas (Stripe usa 24h)
-- Pode ser implementado via pg_cron ou reaper process
CREATE INDEX idx_idem_keys_created_at
    ON idempotency_keys (created_at)
    WHERE response_code IS NOT NULL;
```

### 3.5 Tratamento de Race Conditions

```
  Thread A                  Database                Thread B
     |                        |                        |
     |-- INSERT idem_key ---->|                        |
     |                        |<-- INSERT idem_key ----|
     |                        |                        |
     |<-- SUCCESS ------------|                        |
     |                        |-- CONFLICT! ---------->|
     |                        |   (UNIQUE violation)   |
     |-- BEGIN processing     |                        |
     |                        |   Thread B aguarda     |
     |-- COMMIT + response -->|   ou retorna cached    |
     |                        |                        |
     |                        |-- Retorna response --->|
     |                        |   armazenada por A     |
```

**Estrategia de locking (Brandur/Stripe):**

```python
# Pseudocodigo baseado na implementacao de Brandur
def process_idempotent_request(idempotency_key, params):
    # Fase 1: Tentar inserir ou buscar key existente
    key_record = db.execute("""
        INSERT INTO idempotency_keys (idempotency_key, request_params, locked_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (idempotency_key) DO UPDATE
            SET locked_at = NOW()
        RETURNING *
    """, [idempotency_key, params])

    # Fase 2: Se ja completou, retorna resultado cached
    if key_record.response_code is not None:
        # Verifica se params sao identicos (previne misuse)
        if key_record.request_params != params:
            raise Error("Idempotency key reused with different parameters")
        return CachedResponse(key_record.response_code, key_record.response_body)

    # Fase 3: Processar a operacao
    try:
        result = execute_business_logic(params)

        # Fase 4: Salvar resultado
        db.execute("""
            UPDATE idempotency_keys
            SET response_code = %s, response_body = %s,
                recovery_point = 'finished', locked_at = NULL
            WHERE idempotency_key = %s
        """, [result.code, result.body, idempotency_key])

        return result

    except Exception as e:
        # Fase 5: Em caso de erro, salvar estado de recovery
        db.execute("""
            UPDATE idempotency_keys
            SET recovery_point = %s, locked_at = NULL
            WHERE idempotency_key = %s
        """, [get_recovery_point(e), idempotency_key])
        raise
```

### 3.6 Recovery Points (Fases Atomicas)

A implementacao de Brandur (inspirada na Stripe) divide o processamento em
**fases atomicas** com pontos de recuperacao:

```
                    +-------------+
                    |   started   |
                    +------+------+
                           |
                    +------v------+
                    | ride_created |  <-- Ride salva no DB (atomico)
                    +------+------+
                           |
                    +------v------+
                    | charge_      |  <-- Chamada a API Stripe
                    | created      |      (ponto sem retorno)
                    +------+------+
                           |
                    +------v------+
                    |  finished   |  <-- Response cacheada
                    +-------------+
```

Se o processo falha entre fases, o retry resume a partir do ultimo
`recovery_point` salvo, sem re-executar fases ja completadas.

---

## 4. IETF Draft -- Padronizacao do Header Idempotency-Key

### 4.1 Status do Draft

O **IETF HTTPAPI Working Group** esta padronizando o header `Idempotency-Key`
atraves do draft `draft-ietf-httpapi-idempotency-key-header` (versao 07, outubro 2025).

### 4.2 Especificacao

```
Header:      Idempotency-Key
Tipo:        Item Structured Header (RFC 8941)
Valor:       String (max 255 caracteres)
Aplicacao:   Requests nao-idempotentes (POST, PATCH)
Registro:    IANA "Hypertext Transfer Protocol (HTTP) Field Name Registry"
```

**Formato do header:**

```http
Idempotency-Key: "8e03978e-40d5-43e8-bc93-6894a57f9324"
```

### 4.3 Requisitos do Draft

1. A chave **DEVE** ser unica por operacao
2. A chave **NAO DEVE** ser reutilizada com payload diferente
3. O servidor **DEVE** retornar o mesmo resultado para a mesma chave
4. O servidor **PODE** rejeitar requests sem chave (para endpoints que a exigem)
5. O servidor **DEVE** retornar `409 Conflict` se a chave for usada com params diferentes
6. O servidor **PODE** retornar `422 Unprocessable Entity` se a chave estiver expirada

---

## 5. Implementacao em APIs -- Codigo e Arquitetura

### 5.1 Middleware de Idempotencia (Pseudocodigo Python)

```python
class IdempotencyMiddleware:
    """
    Middleware que intercepta requests POST/PATCH e aplica
    logica de idempotencia usando o header Idempotency-Key.
    """

    def __init__(self, store: IdempotencyStore, ttl_hours: int = 24):
        self.store = store  # Redis ou PostgreSQL
        self.ttl = timedelta(hours=ttl_hours)

    async def process_request(self, request: Request) -> Response:
        # Apenas para metodos nao-idempotentes
        if request.method in ('GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'):
            return await self.next(request)

        # Extrair Idempotency-Key
        idem_key = request.headers.get('Idempotency-Key')
        if idem_key is None:
            return Response(400, {"error": "Idempotency-Key header required"})

        # Validar formato
        if len(idem_key) > 255:
            return Response(400, {"error": "Idempotency-Key too long"})

        # Construir chave unica: user_id + idem_key + endpoint
        cache_key = f"idem:{request.user_id}:{idem_key}"

        # Tentar adquirir lock (prevenir race condition)
        lock = await self.store.acquire_lock(cache_key, timeout=30)
        if not lock:
            return Response(409, {"error": "Concurrent request in progress"})

        try:
            # Verificar se ja existe resultado cached
            cached = await self.store.get(cache_key)
            if cached is not None:
                # Validar que os parametros sao os mesmos
                if cached.request_fingerprint != fingerprint(request):
                    return Response(422, {
                        "error": "Idempotency key already used with different params"
                    })
                return Response(cached.status_code, cached.body)

            # Processar request normalmente
            response = await self.next(request)

            # Armazenar resultado (sucesso ou erro de negocio)
            await self.store.set(cache_key, {
                "request_fingerprint": fingerprint(request),
                "status_code": response.status_code,
                "body": response.body,
                "created_at": datetime.utcnow()
            }, ttl=self.ttl)

            return response

        finally:
            await self.store.release_lock(cache_key)
```

### 5.2 Diagrama de Sequencia -- Request Idempotente Completo

```
  Cliente          API Gateway      Idempotency       Business        Database
     |                 |             Store              Logic             |
     |                 |             (Redis/PG)           |               |
     |-- POST -------->|                |                 |               |
     |  Idem-Key: X    |                |                 |               |
     |                 |-- GET key X -->|                 |               |
     |                 |                |                 |               |
     |                 |<-- NOT FOUND --|                 |               |
     |                 |                |                 |               |
     |                 |-- LOCK key X ->|                 |               |
     |                 |<-- LOCKED -----|                 |               |
     |                 |                |                 |               |
     |                 |------ process ----------------->|               |
     |                 |                |                 |-- INSERT ---->|
     |                 |                |                 |<-- OK --------|
     |                 |<----- result -------------------|               |
     |                 |                |                 |               |
     |                 |-- SET key X -->|                 |               |
     |                 |   {code, body} |                 |               |
     |                 |<-- OK ---------|                 |               |
     |                 |                |                 |               |
     |                 |-- UNLOCK X --->|                 |               |
     |<-- 201 ---------|                |                 |               |
     |                 |                |                 |               |
     |                 |                |                 |               |
     |== RETRY (rede caiu antes) ====================================== |
     |                 |                |                 |               |
     |-- POST -------->|                |                 |               |
     |  Idem-Key: X    |                |                 |               |
     |                 |-- GET key X -->|                 |               |
     |                 |<-- FOUND! -----|                 |               |
     |                 |   {201, body}  |                 |               |
     |                 |                |                 |               |
     |<-- 201 ---------|  (cached!)    |                 |               |
     |                 |                |                 |               |
```

### 5.3 Pagamentos Idempotentes (Caso Stripe)

```python
# Exemplo: Criar pagamento idempotente
import stripe
import uuid

def create_payment_idempotent(amount, currency, customer_id):
    """
    Cria um pagamento na Stripe com idempotency key.
    Se a rede falhar e o retry acontecer com a mesma key,
    a Stripe retorna o resultado original sem cobrar novamente.
    """
    idempotency_key = str(uuid.uuid4())

    try:
        payment = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            customer=customer_id,
            idempotency_key=idempotency_key,  # Chave crucial!
        )
        return payment

    except stripe.error.APIConnectionError:
        # Rede falhou -- SEGURO re-tentar com MESMA key
        payment = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            customer=customer_id,
            idempotency_key=idempotency_key,  # MESMA key!
        )
        return payment
```

**Comportamento da Stripe:**
- A Stripe armazena o resultado (incluindo erros 500) por 24 horas
- Se a mesma key for usada com parametros diferentes: erro 400
- GET e DELETE nao precisam de idempotency key (ja sao idempotentes)
- As client libraries da Stripe geram keys automaticamente e fazem retry com backoff exponencial

---

## 6. Idempotencia em Mensageria

### 6.1 O Problema da Duplicacao de Mensagens

Em sistemas de mensageria (Kafka, RabbitMQ, SQS), mensagens podem ser
entregues mais de uma vez por diversas razoes:

```
  Producer              Broker               Consumer
     |                    |                     |
     |-- Publish msg ---->|                     |
     |                    |-- Deliver msg ----->|
     |                    |                     |-- Process
     |                    |                     |-- ACK
     |                    |<---- ACK -----------|
     |                    X  (ACK perdido!)     |
     |                    |                     |
     |                    |-- Re-deliver msg -->|  (DUPLICATA!)
     |                    |                     |-- Process AGAIN!
     |                    |                     |   SEM idempotencia:
     |                    |                     |   efeito duplicado!
```

### 6.2 Idempotent Producer (Kafka)

O Kafka implementa um **Idempotent Producer** nativo desde a versao 0.11.0:

```
Mecanismo:
1. Ao conectar, o Producer recebe um Producer ID (PID) do Broker
2. Para cada mensagem, o Producer incrementa um Sequence Number
3. O Broker rastreia o par (PID, Sequence Number) por particao
4. Se o Producer re-envia com o mesmo par: Broker reconhece duplicata
   e descarta silenciosamente (deduplicacao no broker)

Configuracao:
  enable.idempotence = true
  acks = all
  retries = Integer.MAX_VALUE
  max.in.flight.requests.per.connection = 5  (ou menos)
```

### 6.3 Idempotent Consumer Pattern

```python
class IdempotentConsumer:
    """
    Consumer que rastreia message IDs processados para evitar
    processamento duplicado. Implementa o padrao "Idempotent Receiver"
    descrito por Hohpe (Enterprise Integration Patterns) e
    Joshi/Fowler (Patterns of Distributed Systems).
    """

    def __init__(self, db, message_handler):
        self.db = db
        self.handler = message_handler

    async def consume(self, message):
        message_id = message.headers['message-id']

        # Verificar se ja processou (dentro de uma transacao)
        async with self.db.transaction() as tx:
            # Tentar inserir na tabela de mensagens processadas
            already_processed = await tx.execute("""
                INSERT INTO processed_messages (message_id, received_at)
                VALUES ($1, NOW())
                ON CONFLICT (message_id) DO NOTHING
                RETURNING message_id
            """, message_id)

            if already_processed is None:
                # Ja processou -- skip (idempotente!)
                logger.info(f"Duplicate message {message_id}, skipping")
                return

            # Processar mensagem (dentro da mesma transacao!)
            await self.handler.process(message, tx)

        # ACK somente apos commit bem-sucedido
        await message.ack()
```

### 6.4 Estrategias de Deduplicacao

```
+-------------------------------------------------------------------+
|                   ESTRATEGIA DE DEDUPLICACAO                       |
+-------------------------------------------------------------------+
|                                                                    |
|  1. MESSAGE ID TRACKING (mais comum)                               |
|     - Armazena IDs processados em tabela/cache                     |
|     - Verifica antes de processar                                  |
|     - TTL para limpeza automatica                                  |
|                                                                    |
|  2. NATURAL IDEMPOTENCY (operacoes naturalmente idempotentes)      |
|     - SET campo = valor (nao ADD campo + valor)                    |
|     - UPSERT ao inves de INSERT                                    |
|     - "Definir saldo = 100" ao inves de "Adicionar 50"             |
|                                                                    |
|  3. BUSINESS KEY DEDUP (baseada em logica de negocio)              |
|     - Unique constraint no banco: (order_id, payment_id)           |
|     - Se ja existe, nao processa                                   |
|                                                                    |
|  4. VERSIONING/CONDITIONAL (baseada em versao)                     |
|     - Processar somente se version > last_processed_version        |
|     - Ignorar mensagens com versao antiga                          |
|                                                                    |
+-------------------------------------------------------------------+
```

### 6.5 Exactly-Once Processing no Kafka (Transacional)

```
  Producer                     Kafka Broker                 Consumer
     |                              |                          |
     |-- beginTransaction() ------->|                          |
     |                              |                          |
     |-- send(topic_A, msg_1) ----->|                          |
     |-- send(topic_B, msg_2) ----->|                          |
     |-- sendOffsetsToTx() -------->|  (commit offsets do      |
     |                              |   consumer atomicamente  |
     |                              |   com as mensagens)      |
     |-- commitTransaction() ------>|                          |
     |                              |                          |
     |                              |-- Deliver msg_1 -------->|
     |                              |-- Deliver msg_2 -------->|
     |                              |                          |
     |  Se commitTransaction falha: |                          |
     |  TUDO e revertido            |                          |
     |  (msgs + offsets)            |                          |
```

**Configuracao para exactly-once:**

```properties
# Producer
enable.idempotence=true
transactional.id=my-transactional-id

# Consumer
isolation.level=read_committed
enable.auto.commit=false
```

---

## 7. Outbox Pattern

### 7.1 O Problema do Dual Write

O **dual write** e o anti-pattern mais perigoso em microservicos:

```
  Servico A
     |
     |-- 1. Escreve no Database -----> [Database]  (SUCESSO)
     |
     |-- 2. Publica no Broker -------> [Kafka]     (FALHA!)
     |
     RESULTADO: Database atualizado, mas evento NAO publicado!
                Outros servicos ficam inconsistentes.

  Ou pior:
     |-- 1. Publica no Broker -------> [Kafka]     (SUCESSO)
     |
     |-- 2. Escreve no Database -----> [Database]  (FALHA!)
     |
     RESULTADO: Evento publicado, mas Database NAO atualizado!
```

### 7.2 Solucao: Transactional Outbox

```
  Servico                Database                    Message Relay        Kafka
     |                      |                            |                  |
     |== BEGIN TX =========>|                            |                  |
     |                      |                            |                  |
     |-- INSERT order ----->|  orders table              |                  |
     |                      |                            |                  |
     |-- INSERT event ----->|  outbox table              |                  |
     |                      |  (MESMA transacao!)        |                  |
     |                      |                            |                  |
     |== COMMIT TX ========>|                            |                  |
     |                      |                            |                  |
     |                      |  (Event na outbox)         |                  |
     |                      |                            |                  |
     |                      |<--- Poll ou CDC -----------|                  |
     |                      |                            |                  |
     |                      |--- Retorna eventos ------->|                  |
     |                      |                            |                  |
     |                      |                            |-- Publish ------>|
     |                      |                            |                  |
     |                      |                            |<-- ACK ----------|
     |                      |                            |                  |
     |                      |<-- Mark as published ------|                  |
     |                      |                            |                  |
```

### 7.3 Tabela Outbox

```sql
CREATE TABLE outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(100) NOT NULL,  -- 'Order', 'Payment'
    aggregate_id    VARCHAR(100) NOT NULL,  -- 'order_123'
    event_type      VARCHAR(100) NOT NULL,  -- 'OrderCreated'
    payload         JSONB NOT NULL,         -- Dados do evento
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,            -- NULL = nao publicado
    retry_count     INT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    -- 'PENDING', 'PUBLISHED', 'FAILED'
);

CREATE INDEX idx_outbox_pending
    ON outbox_events (created_at)
    WHERE status = 'PENDING';
```

### 7.4 Dois Mecanismos de Relay

#### 7.4.1 Polling Publisher

```python
class PollingPublisher:
    """
    Periodicamente busca eventos pendentes na outbox
    e publica no broker.
    """

    async def poll_and_publish(self):
        while True:
            events = await self.db.execute("""
                SELECT * FROM outbox_events
                WHERE status = 'PENDING'
                ORDER BY created_at ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED  -- Evita contencao
            """)

            for event in events:
                try:
                    await self.broker.publish(
                        topic=f"{event.aggregate_type}.events",
                        key=event.aggregate_id,
                        value=event.payload,
                        headers={"event-id": str(event.id)}
                    )

                    await self.db.execute("""
                        UPDATE outbox_events
                        SET status = 'PUBLISHED', published_at = NOW()
                        WHERE id = $1
                    """, event.id)

                except Exception:
                    await self.db.execute("""
                        UPDATE outbox_events
                        SET retry_count = retry_count + 1,
                            status = CASE
                                WHEN retry_count >= 5 THEN 'FAILED'
                                ELSE 'PENDING'
                            END
                        WHERE id = $1
                    """, event.id)

            await asyncio.sleep(1)  # Poll interval
```

#### 7.4.2 Log Tailing (CDC) com Debezium

```
  Database WAL/Binlog          Debezium             Kafka
        |                        |                    |
        |-- WAL entry ---------->|                    |
        |   (INSERT na outbox)   |                    |
        |                        |-- Transform ------>|
        |                        |   (Outbox Event    |
        |                        |    Router SMT)     |
        |                        |                    |
        |                        |   Evento publicado |
        |                        |   no topico correto|
        |                        |                    |
```

**Vantagens do CDC sobre Polling:**
- Latencia muito menor (near-realtime vs intervalo de polling)
- Sem necessidade de queries periodicas no banco (menos carga)
- Ordem garantida pelo WAL
- Nao requer coluna `status` na outbox

**Configuracao Debezium com Outbox Event Router:**

```json
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.dbname": "orders_db",
    "table.include.list": "public.outbox_events",
    "transforms": "outbox",
    "transforms.outbox.type":
      "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.route.topic.replacement":
      "${routedByValue}.events"
  }
}
```

### 7.5 Garantia: At-Least-Once + Idempotent Consumer

O Outbox Pattern garante **at-least-once delivery**. O Message Relay pode
publicar a mesma mensagem mais de uma vez (ex: crash apos publicar mas antes
de marcar como publicada). Por isso, o **consumer DEVE ser idempotente**.

```
  OUTBOX (at-least-once)  +  CONSUMER IDEMPOTENTE  =  EXACTLY-ONCE EFFECT
```

---

## 8. Inbox Pattern

### 8.1 Conceito

O **Inbox Pattern** e o complemento do Outbox no lado do consumer.
Funciona como uma "caixa de entrada" que garante deduplicacao e
processamento atomico no servico receptor.

### 8.2 Diagrama de Funcionamento

```
  Kafka              Consumer Service                    Database
    |                      |                                |
    |-- Deliver msg ------>|                                |
    |                      |                                |
    |                      |== BEGIN TX ===================>|
    |                      |                                |
    |                      |-- INSERT INTO inbox ---------->|
    |                      |   ON CONFLICT DO NOTHING       |
    |                      |                                |
    |                      |   Se inseriu (nova msg):       |
    |                      |   |-- Process business ------->|
    |                      |   |   logic                    |
    |                      |   |-- UPDATE business -------->|
    |                      |   |   tables                   |
    |                      |                                |
    |                      |   Se NAO inseriu (duplicata):  |
    |                      |   |-- Skip processing          |
    |                      |                                |
    |                      |== COMMIT TX ==================>|
    |                      |                                |
    |<----- ACK -----------|                                |
    |                      |                                |
```

### 8.3 Tabela Inbox

```sql
CREATE TABLE inbox_messages (
    message_id      VARCHAR(255) PRIMARY KEY,
    source_service  VARCHAR(100) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice para limpeza por TTL
CREATE INDEX idx_inbox_cleanup
    ON inbox_messages (created_at);

-- Job de limpeza: remover mensagens processadas ha mais de 7 dias
-- Executar via pg_cron ou processo externo
-- DELETE FROM inbox_messages WHERE created_at < NOW() - INTERVAL '7 days';
```

### 8.4 Implementacao Completa

```python
class InboxConsumer:
    """
    Consumer com Inbox Pattern para deduplicacao atomica.
    Combina com Outbox Pattern do producer para garantia
    end-to-end de exactly-once processing.
    """

    def __init__(self, db, handlers: dict):
        self.db = db
        self.handlers = handlers  # {event_type: handler_fn}

    async def consume(self, message):
        message_id = message.headers.get('event-id') or message.key
        event_type = message.headers.get('event-type')

        async with self.db.transaction() as tx:
            # Tentar registrar na inbox (atomico com processamento)
            inserted = await tx.execute("""
                INSERT INTO inbox_messages
                    (message_id, source_service, event_type, payload)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (message_id) DO NOTHING
                RETURNING message_id
            """, message_id, message.topic, event_type, message.value)

            if inserted is None:
                # Mensagem duplicada -- pular processamento
                logger.info(f"Duplicate message {message_id}, skipping")
                await message.ack()
                return

            # Processar mensagem (dentro da mesma transacao!)
            handler = self.handlers.get(event_type)
            if handler:
                await handler(message.value, tx)
            else:
                logger.warning(f"No handler for event type: {event_type}")

        # ACK apos commit bem-sucedido
        await message.ack()
```

### 8.5 Outbox + Inbox = Garantia End-to-End

```
  Servico A                                          Servico B
  +------------------+                              +------------------+
  |                  |                              |                  |
  | Business Logic   |                              | Business Logic   |
  |       |          |                              |       ^          |
  |       v          |                              |       |          |
  | +----------+     |        Kafka                | +----------+     |
  | |  OUTBOX  |-----|-----> [Topic] --------------|-->| INBOX   |     |
  | +----------+     |                              | +----------+     |
  |                  |                              |                  |
  | Database A       |                              | Database B       |
  | (transacao       |                              | (transacao       |
  |  atomica com     |                              |  atomica com     |
  |  business data)  |                              |  business data)  |
  +------------------+                              +------------------+

  GARANTIAS:
  - Outbox: evento SEMPRE publicado se business op commitou
  - Kafka: at-least-once delivery ao consumer
  - Inbox: deduplicacao no consumer (idempotente)
  - Resultado: exactly-once SEMANTICS end-to-end
```

---

## 9. Idempotencia em Databases

### 9.1 UPSERT (INSERT ON CONFLICT)

O UPSERT e a operacao de banco mais fundamentalmente idempotente:

```sql
-- PostgreSQL: INSERT ON CONFLICT
INSERT INTO prices (symbol, price, updated_at)
VALUES ('BTCUSDT', 42500.00, NOW())
ON CONFLICT (symbol)
DO UPDATE SET
    price = EXCLUDED.price,
    updated_at = EXCLUDED.updated_at;

-- MySQL: INSERT ON DUPLICATE KEY UPDATE
INSERT INTO prices (symbol, price, updated_at)
VALUES ('BTCUSDT', 42500.00, NOW())
ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    updated_at = VALUES(updated_at);

-- SQL Server: MERGE
MERGE INTO prices AS target
USING (SELECT 'BTCUSDT' AS symbol, 42500.00 AS price) AS source
ON target.symbol = source.symbol
WHEN MATCHED THEN
    UPDATE SET price = source.price, updated_at = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (symbol, price, updated_at)
    VALUES (source.symbol, source.price, GETDATE());
```

### 9.2 Conditional Updates (Idempotente por Design)

```sql
-- ANTI-PATTERN: Incremento (NAO idempotente!)
UPDATE accounts SET balance = balance + 100 WHERE id = 1;
-- Se executado 2x: saldo aumenta 200!

-- PATTERN CORRETO: Update condicional (idempotente)
UPDATE accounts
SET balance = 1100
WHERE id = 1 AND balance = 1000;
-- Se executado 2x: segunda vez nao faz nada (WHERE falha)

-- PATTERN: Update com version check (optimistic locking)
UPDATE accounts
SET balance = 1100, version = 2
WHERE id = 1 AND version = 1;
-- Se executado 2x: segunda vez afeta 0 rows (version ja e 2)
```

### 9.3 Optimistic Locking com Versioning

```python
class OptimisticLockingRepository:
    """
    Implementa optimistic locking com campo version.
    Garante que updates concorrentes nao sobrescrevem um ao outro
    e que retries sao seguros.
    """

    async def update_order(self, order_id, new_status, expected_version):
        result = await self.db.execute("""
            UPDATE orders
            SET status = $1,
                version = version + 1,
                updated_at = NOW()
            WHERE id = $2 AND version = $3
            RETURNING id, version
        """, new_status, order_id, expected_version)

        if result is None:
            # Duas possibilidades:
            # 1. Order nao existe
            # 2. Version mudou (concurrent update)
            current = await self.db.execute(
                "SELECT version FROM orders WHERE id = $1", order_id
            )
            if current is None:
                raise OrderNotFoundError(order_id)
            else:
                raise OptimisticLockingError(
                    f"Expected version {expected_version}, "
                    f"found {current.version}"
                )

        return result
```

### 9.4 Tabela de Resumo

```
+---------------------------+---------------+----------------------------------+
| Tecnica                   | Idempotente?  | Quando usar                      |
+---------------------------+---------------+----------------------------------+
| INSERT                    | Nao           | Nunca sozinho para idempotencia  |
| INSERT ON CONFLICT        | Sim           | Criar-ou-atualizar               |
| UPDATE SET x = value      | Sim           | Definir valor absoluto           |
| UPDATE SET x = x + delta  | NAO!          | NUNCA para ops idempotentes      |
| DELETE WHERE id = X       | Sim           | Remocao (segunda vez = 0 rows)   |
| SELECT ... FOR UPDATE     | N/A           | Lock pessimista (auxiliar)       |
| UPDATE ... WHERE v = N    | Sim           | Optimistic locking               |
+---------------------------+---------------+----------------------------------+
```

---

## 10. Anti-Patterns e Erros Comuns

### 10.1 Anti-Pattern #1: Retry sem Idempotencia

```
ERRADO:
  def create_payment(amount):
      payment = db.insert("INSERT INTO payments (amount) VALUES (?)", amount)
      return payment
  # Se chamado 2x: DOIS pagamentos criados!

CORRETO:
  def create_payment(amount, idempotency_key):
      existing = db.query("SELECT * FROM payments WHERE idem_key = ?",
                          idempotency_key)
      if existing:
          return existing  # Retorna resultado anterior
      payment = db.insert(
          "INSERT INTO payments (amount, idem_key) VALUES (?, ?)",
          amount, idempotency_key
      )
      return payment
```

### 10.2 Anti-Pattern #2: Idempotency Key com Escopo Errado

```
ERRADO: Key global sem escopo de usuario
  Key: "create_order_12345"
  --> Dois usuarios diferentes poderiam colidir!

CORRETO: Key com escopo de usuario
  Key: "user_789:create_order_12345"
  --> Isolamento por usuario garantido

ERRADO: Key baseada em timestamp
  Key: "payment_2024-01-15T10:30:00"
  --> Dois requests no mesmo segundo = colisao!

CORRETO: Key baseada em UUID ou operacao de negocio
  Key: "550e8400-e29b-41d4-a716-446655440000"
  Key: "order_abc123_payment_attempt_1"
```

### 10.3 Anti-Pattern #3: Idempotencia Parcial

```
ERRADO: Banco idempotente mas side-effects nao

  async def process_order(order_id, idem_key):
      # Banco: idempotente (ON CONFLICT)
      db.execute("""
          INSERT INTO orders (id, status) VALUES (?, 'confirmed')
          ON CONFLICT (id) DO NOTHING
      """, order_id)

      # Email: NAO idempotente!
      send_email(customer, "Seu pedido foi confirmado!")
      # Se retry acontecer: cliente recebe 2 emails!

CORRETO: Todos os side-effects sao idempotentes

  async def process_order(order_id, idem_key):
      # Verificar se ja processou COMPLETAMENTE
      existing = db.query(
          "SELECT * FROM processed_operations WHERE idem_key = ?",
          idem_key
      )
      if existing:
          return existing.result  # Tudo ja foi feito

      # Processar
      db.execute("INSERT INTO orders ...")
      send_email(customer, "Pedido confirmado!")

      # Registrar que TUDO foi feito
      db.execute(
          "INSERT INTO processed_operations (idem_key) VALUES (?)",
          idem_key
      )
```

### 10.4 Anti-Pattern #4: Race Condition na Verificacao

```
ERRADO: Check-then-act sem locking

  Thread A                                Thread B
     |                                       |
     |-- SELECT * FROM idem WHERE key=X      |
     |<-- NOT FOUND                          |
     |                                       |-- SELECT * FROM idem WHERE key=X
     |                                       |<-- NOT FOUND
     |-- INSERT + process                    |
     |                                       |-- INSERT + process
     |                                       |   DUPLICATA!

CORRETO: Operacao atomica (INSERT ON CONFLICT ou lock)

  Thread A                                Thread B
     |                                       |
     |-- INSERT INTO idem (key)              |
     |   ON CONFLICT DO NOTHING              |
     |   RETURNING key                       |
     |<-- RETURNED (inseriu)                 |
     |                                       |-- INSERT INTO idem (key)
     |-- Process                             |   ON CONFLICT DO NOTHING
     |                                       |   RETURNING key
     |                                       |<-- NOT RETURNED (conflito)
     |                                       |-- Skip (duplicata)
```

### 10.5 Anti-Pattern #5: TTL Muito Curto na Idempotency Key

```
ERRADO:
  TTL = 5 minutos
  --> Se o cliente faz retry apos 10 minutos (ex: usuario clicou de novo),
      a key ja expirou e o sistema processa como nova operacao!

CORRETO:
  TTL = 24 horas (padrao Stripe)
  --> Cobre a vasta maioria dos cenarios de retry
  --> Balanco entre seguranca e uso de storage
```

### 10.6 Anti-Pattern #6: Confundir Idempotencia com Cache

```
IDEMPOTENCIA != CACHE

Cache:
  - Objetivo: performance
  - Pode ser invalidado a qualquer momento
  - Pode retornar dados stale
  - Nao garante corretude

Idempotencia:
  - Objetivo: corretude e seguranca
  - DEVE persistir pelo TTL definido
  - Resultado DEVE ser identico ao original
  - Garante que a operacao nao e duplicada
```

---

## 11. Aplicacao ao Trading Bot

### 11.1 Cenarios Criticos de Idempotencia no Bot

```
+-----------------------------------------------------------------------+
|                    CENARIOS DE RISCO NO TRADING BOT                    |
+-----------------------------------------------------------------------+
|                                                                        |
|  1. ENVIO DE ORDENS DUPLICADAS                                         |
|     - Bot envia BUY order, rede cai, bot re-envia                      |
|     - Resultado sem idempotencia: 2 ordens de compra!                  |
|     - Impacto: posicao dobrada, risco financeiro                       |
|                                                                        |
|  2. PROCESSAMENTO DUPLICADO DE MARKET DATA                             |
|     - Mesmo candle/tick processado 2x pelo strategy engine             |
|     - Resultado sem idempotencia: 2 sinais de trade                    |
|     - Impacto: ordens fantasma baseadas em dados stale                 |
|                                                                        |
|  3. CONFIRMACAO DE EXECUCAO DUPLICADA                                  |
|     - Exchange confirma fill, ACK se perde, exchange re-envia          |
|     - Resultado sem idempotencia: posicao calculada errada              |
|     - Impacto: reconciliacao impossivel, risco desconhecido            |
|                                                                        |
|  4. EVENTOS DE RISCO DUPLICADOS                                        |
|     - Stop-loss disparado 2x por evento de preco duplicado             |
|     - Resultado: vende posicao e depois vende short                    |
|     - Impacto: posicao invertida involuntariamente                     |
|                                                                        |
+-----------------------------------------------------------------------+
```

### 11.2 Arquitetura de Idempotencia para o Bot

```
  Market Data Feed        Strategy Engine         Order Manager
       |                       |                       |
       |                       |                       |
   [WebSocket]            [Event Bus]            [Exchange API]
       |                       |                       |
       v                       v                       v
  +----------+          +------------+          +-------------+
  | Dedup    |          | Signal     |          | Order       |
  | Filter   |          | Dedup      |          | Idempotency |
  | (by      |          | (by        |          | (by         |
  |  event   |          |  signal    |          |  client     |
  |  ID +    |          |  hash +    |          |  order      |
  |  symbol  |          |  timestamp)|          |  ID)        |
  |  +time)  |          |            |          |             |
  +----------+          +------------+          +-------------+
       |                       |                       |
       v                       v                       v
  Processed             Signal                  Order sent
  only once             generated               only once
                        only once
```

### 11.3 Envio de Ordens Idempotente

```python
class IdempotentOrderManager:
    """
    Garante que cada intencao de ordem resulta em no maximo
    UMA ordem enviada a exchange, independente de retries.
    """

    def __init__(self, exchange_client, db):
        self.exchange = exchange_client
        self.db = db

    async def place_order(self, signal: TradeSignal) -> Order:
        # 1. Gerar client_order_id deterministica baseada no sinal
        #    (mesma signal = mesma order ID = idempotente)
        client_order_id = self._generate_order_id(signal)

        # 2. Verificar se ja enviou esta ordem
        existing = await self.db.query("""
            SELECT * FROM orders
            WHERE client_order_id = $1
        """, client_order_id)

        if existing:
            # Ja enviou -- verificar status na exchange
            if existing.status in ('PENDING', 'UNKNOWN'):
                return await self._reconcile_order(existing)
            return existing  # Ja confirmada ou rejeitada

        # 3. Registrar intencao (prevenir race condition)
        await self.db.execute("""
            INSERT INTO orders (client_order_id, symbol, side, qty, price, status)
            VALUES ($1, $2, $3, $4, $5, 'PENDING')
            ON CONFLICT (client_order_id) DO NOTHING
        """, client_order_id, signal.symbol, signal.side,
             signal.quantity, signal.price)

        # 4. Enviar a exchange com client_order_id
        try:
            exchange_response = await self.exchange.create_order(
                symbol=signal.symbol,
                side=signal.side,
                quantity=signal.quantity,
                price=signal.price,
                client_order_id=client_order_id,  # A exchange usa isto
                                                   # para deduplicar!
            )

            # 5. Atualizar status
            await self.db.execute("""
                UPDATE orders
                SET status = $1, exchange_order_id = $2
                WHERE client_order_id = $3
            """, exchange_response.status,
                 exchange_response.order_id,
                 client_order_id)

            return exchange_response

        except NetworkError:
            # Rede falhou -- NAO sabemos se a ordem foi aceita
            # SEGURO tentar novamente com o MESMO client_order_id
            # A exchange vai deduplicar!
            logger.warning(
                f"Network error placing order {client_order_id}, "
                f"will retry with same ID"
            )
            raise  # Retry automatico com backoff

    def _generate_order_id(self, signal: TradeSignal) -> str:
        """
        Gera um client_order_id deterministico baseado no sinal.
        Mesmo sinal = mesma ID = idempotente.
        """
        # Componentes que definem unicamente uma intencao de trade
        components = f"{signal.strategy_id}:{signal.symbol}:" \
                     f"{signal.side}:{signal.timestamp}:" \
                     f"{signal.price}:{signal.quantity}"
        return f"bot_{hashlib.sha256(components.encode()).hexdigest()[:16]}"
```

### 11.4 Processamento Idempotente de Market Data

```python
class IdempotentMarketDataProcessor:
    """
    Processa eventos de market data de forma idempotente.
    Mesmo candle/tick processado N vezes produz o mesmo resultado.
    """

    def __init__(self, strategy_engine, dedup_cache):
        self.engine = strategy_engine
        self.seen = dedup_cache  # Redis SET com TTL

    async def process_candle(self, candle: Candle):
        # Gerar ID unico para o candle
        candle_id = f"{candle.symbol}:{candle.interval}:{candle.open_time}"

        # Verificar se ja processou (O(1) no Redis)
        if await self.seen.exists(candle_id):
            logger.debug(f"Duplicate candle {candle_id}, skipping")
            return

        # Marcar como processado ANTES de processar
        # (previne race condition entre threads)
        was_new = await self.seen.set_if_not_exists(
            candle_id,
            ttl=timedelta(hours=2)  # TTL > 2x intervalo do candle
        )

        if not was_new:
            return  # Outro thread ja pegou

        # Processar (idempotente: mesmo candle = mesmo sinal)
        signal = await self.engine.evaluate(candle)
        if signal:
            await self.order_manager.place_order(signal)
```

### 11.5 Reconciliacao de Ordens

```python
class OrderReconciler:
    """
    Reconcilia ordens locais com a exchange periodicamente.
    Trata o caso onde ordens foram enviadas mas confirmacao se perdeu.
    """

    async def reconcile(self):
        # Buscar ordens pendentes ha mais de N segundos
        pending_orders = await self.db.query("""
            SELECT * FROM orders
            WHERE status = 'PENDING'
            AND created_at < NOW() - INTERVAL '30 seconds'
        """)

        for order in pending_orders:
            try:
                # Consultar exchange pelo client_order_id
                exchange_order = await self.exchange.get_order(
                    client_order_id=order.client_order_id
                )

                if exchange_order:
                    # Ordem existe na exchange -- atualizar status local
                    await self.db.execute("""
                        UPDATE orders
                        SET status = $1,
                            exchange_order_id = $2,
                            filled_qty = $3,
                            avg_price = $4
                        WHERE client_order_id = $5
                    """, exchange_order.status,
                         exchange_order.order_id,
                         exchange_order.filled_qty,
                         exchange_order.avg_price,
                         order.client_order_id)
                else:
                    # Ordem NAO existe na exchange
                    # Rede falhou antes de chegar la
                    # Marcar como FAILED para re-avaliar
                    await self.db.execute("""
                        UPDATE orders
                        SET status = 'NOT_FOUND_ON_EXCHANGE'
                        WHERE client_order_id = $1
                    """, order.client_order_id)

            except Exception as e:
                logger.error(
                    f"Reconciliation failed for {order.client_order_id}: {e}"
                )
```

### 11.6 Diagrama Completo -- Fluxo Idempotente do Bot

```
  Exchange         WebSocket        Bot Core          Database        Exchange
  (Data Feed)      Handler          (Strategy)                        (Orders)
     |                |                |                 |                |
     |-- Candle ----->|                |                 |                |
     |                |                |                 |                |
     |                |-- Dedup ------>|                 |                |
     |                |   check        |                 |                |
     |                |   (Redis)      |                 |                |
     |                |                |                 |                |
     |                |   [NEW]        |                 |                |
     |                |-- Process ---->|                 |                |
     |                |                |                 |                |
     |                |                |-- Evaluate ---->|                |
     |                |                |   strategy      |                |
     |                |                |                 |                |
     |                |                |<-- Signal ------|                |
     |                |                |   BUY BTCUSDT   |                |
     |                |                |                 |                |
     |                |                |-- Gen idem ---->|                |
     |                |                |   order ID      |                |
     |                |                |                 |                |
     |                |                |-- INSERT ------>|                |
     |                |                |   order         |                |
     |                |                |   (ON CONFLICT  |                |
     |                |                |    DO NOTHING)  |                |
     |                |                |                 |                |
     |                |                |-- Place order --|--------------->|
     |                |                |   (client_      |                |
     |                |                |    order_id)    |                |
     |                |                |                 |                |
     |                |                |<-- Confirm -----|<---------------|
     |                |                |                 |                |
     |                |                |-- UPDATE ------>|                |
     |                |                |   status =      |                |
     |                |                |   FILLED        |                |
     |                |                |                 |                |
     |  [Se rede falhar em qualquer ponto:]              |                |
     |  [Retry com MESMO client_order_id]                |                |
     |  [Exchange deduplicara]                           |                |
     |  [DB com ON CONFLICT garante idempotencia]        |                |
```

---

## 12. Livros Fundamentais e Referencias Academicas

### 12.1 Livros Essenciais ("Biblias" do Tema)

#### 1. Designing Data-Intensive Applications (DDIA)
- **Autor:** Martin Kleppmann
- **Ano:** 2017 (1a ed.), 2025 (2a ed.)
- **Editora:** O'Reilly Media
- **Capitulos relevantes:**
  - Cap. 11: Stream Processing -- Exactly-once semantics, idempotent processing
  - Cap. 9: Consistency and Consensus -- Linearizability, ordering
  - Cap. 12: The Future of Data Systems -- End-to-end correctness
- **Contribuicao:** Formaliza que "exactly-once" e uma propriedade end-to-end
  que combina at-least-once delivery com processamento idempotente.
  Argumenta que async event log + idempotent writes e mais robusto
  que transacoes distribuidas.

#### 2. Enterprise Integration Patterns (EIP)
- **Autores:** Gregor Hohpe, Bobby Woolf
- **Ano:** 2003
- **Editora:** Addison-Wesley
- **Pattern relevante:** Idempotent Receiver (Cap. 10)
- **Contribuicao:** Define o padrao Idempotent Receiver como um dos
  65 patterns fundamentais de integracao. Estabelece que idempotencia
  pode ser alcancada via deduplicacao explicita (rastreio de message IDs)
  ou via semantica da mensagem (operacoes naturalmente idempotentes).

#### 3. Microservices Patterns
- **Autor:** Chris Richardson
- **Ano:** 2018
- **Editora:** Manning Publications
- **Patterns relevantes:**
  - Transactional Outbox Pattern
  - Idempotent Consumer Pattern
  - Polling Publisher
  - Transaction Log Tailing
- **Contribuicao:** Formaliza os patterns Outbox e Inbox no contexto de
  microservicos. Disponibiliza o catalogo em microservices.io.

#### 4. Building Event-Driven Microservices
- **Autor:** Adam Bellemare
- **Ano:** 2020
- **Editora:** O'Reilly Media
- **Contribuicao:** Aborda idempotencia no contexto de event sourcing e
  CQRS. Detalha como event-driven architectures dependem fundamentalmente
  de consumers idempotentes para garantir corretude.

#### 5. Patterns of Distributed Systems
- **Autor:** Unmesh Joshi (serie editada por Martin Fowler)
- **Ano:** 2023
- **Editora:** Addison-Wesley (Fowler Signature Series)
- **Pattern relevante:** Cap. 15: Idempotent Receiver
- **Contribuicao:** Formaliza o Idempotent Receiver como pattern de
  sistemas distribuidos (nao apenas messaging). Detalha implementacao
  com idempotency keys, deduplication windows, e upsert operations.

### 12.2 Papers e Artigos Academicos

| Titulo | Autor(es) | Ano | Tipo |
|--------|-----------|-----|------|
| Idempotence is not a Medical Condition | Pat Helland | 2012 | Paper (ACM Queue) |
| Life Beyond Distributed Transactions | Pat Helland | 2016 | Paper (ACM) |
| Implementing Stripe-like Idempotency Keys in Postgres | Brandur Leach | 2017 | Technical Article |
| Designing robust APIs with idempotency | Stripe Engineering | 2017 | Engineering Blog |

---

## 13. Catalogo Completo de Fontes

### Fontes Primarias (Artigos Tecnicos e Documentacao)

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 1 | Designing robust and predictable APIs with idempotency | Stripe Engineering | 2017 | Blog Tecnico | https://stripe.com/blog/idempotency |
| 2 | Implementing Stripe-like Idempotency Keys in Postgres | Brandur Leach | 2017 | Artigo Tecnico | https://brandur.org/idempotency-keys |
| 3 | Idempotent Requests - Stripe API Reference | Stripe | 2024 | Documentacao API | https://docs.stripe.com/api/idempotent_requests |
| 4 | The Idempotency-Key HTTP Header Field (Draft 07) | Ietf-wg-httpapi | 2025 | IETF Draft | https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ |
| 5 | Working with the new Idempotency Keys RFC | HTTP Toolkit | 2024 | Blog Tecnico | https://httptoolkit.com/blog/idempotency-keys/ |
| 6 | Transactional Outbox Pattern | Chris Richardson | 2018 | Pattern Catalog | https://microservices.io/patterns/data/transactional-outbox.html |
| 7 | Idempotent Consumer Pattern | Chris Richardson | 2018 | Pattern Catalog | https://microservices.io/patterns/communication-style/idempotent-consumer.html |
| 8 | Idempotent Receiver | Unmesh Joshi / Martin Fowler | 2023 | Pattern Catalog | https://martinfowler.com/articles/patterns-of-distributed-systems/idempotent-receiver.html |
| 9 | Idempotent Receiver - Enterprise Integration Patterns | Gregor Hohpe | 2003 | Pattern Catalog | https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html |
| 10 | Reliable Microservices Data Exchange With the Outbox Pattern | Debezium / Gunnar Morling | 2019 | Blog Tecnico | https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/ |
| 11 | Outbox Event Router - Debezium Documentation | Debezium | 2024 | Documentacao | https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html |
| 12 | Exactly-once Semantics is Possible: Here's How Kafka Does it | Confluent / Neha Narkhede | 2017 | Blog Tecnico | https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/ |
| 13 | Message Delivery Guarantees for Apache Kafka | Confluent | 2024 | Documentacao | https://docs.confluent.io/kafka/design/delivery-semantics.html |
| 14 | Mastering Idempotency: Building Reliable APIs | ByteByteGo / Alex Xu | 2024 | Newsletter | https://blog.bytebytego.com/p/mastering-idempotency-building-reliable |
| 15 | The Art of REST API Design: Idempotency | ByteByteGo / Alex Xu | 2024 | Newsletter | https://blog.bytebytego.com/p/the-art-of-rest-api-design-idempotency |
| 16 | What is Idempotency in Distributed Systems? | AlgoMaster.io | 2024 | Tutorial | https://blog.algomaster.io/p/idempotency-in-distributed-systems |
| 17 | Idempotence - Wikipedia | Wikipedia | 2024 | Enciclopedia | https://en.wikipedia.org/wiki/Idempotence |
| 18 | Idempotent Pipelines and Fault Isolation in Stock Trading Bot | Vocal Media | 2024 | Artigo | https://vocal.media/education/idempotent-pipelines-and-fault-isolation-in-stock-trading-bot |
| 19 | Idempotency's role in financial services | CockroachDB | 2024 | Blog Tecnico | https://www.cockroachlabs.com/blog/idempotency-in-finance/ |
| 20 | Idempotency and ordering in event-driven systems | CockroachDB | 2024 | Blog Tecnico | https://www.cockroachlabs.com/blog/idempotency-and-ordering-in-event-driven-systems/ |

### Fontes em Portugues

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|--------|-----------|-----|------|-----|
| 21 | Idempotencia em Sistemas Distribuidos | iMasters | 2024 | Artigo | https://imasters.com.br/c-sharp/idempotencia-em-sistemas-distribuidos-garantindo-consistencia-em-apis-e-mensageria |
| 22 | O conceito de idempotencia e a aplicacao na pratica | Jean Meira / Livelo | 2023 | Blog | https://medium.com/livelo/o-conceito-de-idempot%C3%AAncia-e-a-aplica%C3%A7%C3%A3o-na-pr%C3%A1tica-8c957b84751b |
| 23 | System Design - Padroes de Resiliencia | Matheus Fidelis | 2024 | Blog | https://fidelissauro.dev/resiliencia/ |
| 24 | Idempotencia: O Segredo para Sistemas Confiaveis | DEV Community | 2024 | Artigo | https://dev.to/ikauedev/idempotencia-o-segredo-para-sistemas-confiaveis-3561 |

### Livros

| # | Titulo | Autor(es) | Ano | Editora | ISBN |
|---|--------|-----------|-----|---------|------|
| 25 | Designing Data-Intensive Applications | Martin Kleppmann | 2017 | O'Reilly | 978-1449373320 |
| 26 | Enterprise Integration Patterns | Gregor Hohpe, Bobby Woolf | 2003 | Addison-Wesley | 978-0321200686 |
| 27 | Microservices Patterns | Chris Richardson | 2018 | Manning | 978-1617294549 |
| 28 | Building Event-Driven Microservices | Adam Bellemare | 2020 | O'Reilly | 978-1492057895 |
| 29 | Patterns of Distributed Systems | Unmesh Joshi | 2023 | Addison-Wesley | 978-0138221980 |

---

## Apendice A: Checklist de Idempotencia para o Trading Bot

```
CHECKLIST DE IDEMPOTENCIA
=========================

[ ] 1. ORDER PLACEMENT
    [ ] Client order ID gerado deterministicamente (hash do signal)
    [ ] INSERT ON CONFLICT na tabela local de ordens
    [ ] Exchange recebe client_order_id para deduplicacao
    [ ] Retry com backoff exponencial usa MESMA client_order_id

[ ] 2. MARKET DATA PROCESSING
    [ ] Candle ID = symbol + interval + open_time
    [ ] Dedup cache (Redis SET) com TTL > 2x intervalo
    [ ] SET_IF_NOT_EXISTS atomico (previne race condition)

[ ] 3. SIGNAL GENERATION
    [ ] Signal ID = hash(strategy + symbol + timestamp + params)
    [ ] Verificacao de duplicata antes de enviar ao order manager
    [ ] Mesma signal nao gera segunda ordem

[ ] 4. EXECUTION CONFIRMATION
    [ ] Fill events deduplicados por trade ID da exchange
    [ ] UPDATE condicional (status transition validation)
    [ ] Reconciliacao periodica com exchange

[ ] 5. RISK MANAGEMENT
    [ ] Stop-loss avaliado contra posicao REAL (nao calculada)
    [ ] Eventos de risco deduplicados por event ID
    [ ] Position sizing baseado em posicao reconciliada

[ ] 6. DATABASE OPERATIONS
    [ ] Upsert para atualizacoes de preco
    [ ] Optimistic locking para updates de posicao
    [ ] Conditional updates (WHERE version = expected)

[ ] 7. MESSAGING (se aplicavel)
    [ ] Outbox pattern para eventos internos
    [ ] Inbox pattern para consumo de eventos
    [ ] Message ID tracking com TTL
```

---

## Apendice B: Formula Resumo

```
+===================================================================+
|                                                                     |
|   IDEMPOTENCIA = "fazer a mesma coisa N vezes                       |
|                   com o mesmo resultado de fazer 1 vez"             |
|                                                                     |
|   f(f(x)) = f(x)                                                   |
|                                                                     |
|   ESTRATEGIA UNIVERSAL:                                             |
|   1. Atribuir ID unico a cada operacao                              |
|   2. Verificar se ID ja foi processado (atomicamente)               |
|   3. Se sim: retornar resultado anterior                            |
|   4. Se nao: processar e armazenar resultado                       |
|                                                                     |
|   NO TRADING BOT:                                                   |
|   Outbox + Inbox + Idempotent Consumer + Client Order ID            |
|   = EXACTLY-ONCE SEMANTICS end-to-end                               |
|   = ZERO ordens duplicadas                                          |
|   = ZERO processamento duplicado de market data                     |
|                                                                     |
+===================================================================+
```

---

> **Documento compilado em Fevereiro de 2026.**
> **Fontes verificadas e catalogadas: 29 referencias entre livros, papers, drafts IETF,**
> **documentacao oficial, artigos tecnicos e pattern catalogs.**
