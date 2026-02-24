# Containers e Google Cloud Run

## Documento de Referência para Infraestrutura de Bot de Investimentos Automatizado

**Versão:** 1.0
**Data:** 07/02/2026
**Escopo:** Melhores práticas para containerização com Docker e deploy em Google Cloud Run, com foco em aplicações de trading automatizado no mercado financeiro brasileiro.
**Classificação:** Infraestrutura / DevOps — nível avançado

---

## Sumário

1. [Containerização com Docker](#1-containerização-com-docker)
   - 1.1 [Seleção de Imagem Base](#11-seleção-de-imagem-base)
   - 1.2 [Multi-Stage Builds](#12-multi-stage-builds)
   - 1.3 [Otimização de Camadas e Cache](#13-otimização-de-camadas-e-cache)
   - 1.4 [Segurança do Container](#14-segurança-do-container)
   - 1.5 [Health Checks](#15-health-checks)
   - 1.6 [Gerenciamento de Secrets](#16-gerenciamento-de-secrets)
   - 1.7 [.dockerignore](#17-dockerignore)
   - 1.8 [Otimização de Tamanho da Imagem](#18-otimização-de-tamanho-da-imagem)
2. [Google Cloud Run — Configuração e Deploy](#2-google-cloud-run--configuração-e-deploy)
   - 2.1 [Configuração de Recursos](#21-configuração-de-recursos)
   - 2.2 [Otimização de Cold Start](#22-otimização-de-cold-start)
   - 2.3 [Auto-Scaling](#23-auto-scaling)
   - 2.4 [Variáveis de Ambiente e Secrets](#24-variáveis-de-ambiente-e-secrets)
   - 2.5 [CI/CD com Cloud Build e Artifact Registry](#25-cicd-com-cloud-build-e-artifact-registry)
   - 2.6 [Comandos gcloud Essenciais](#26-comandos-gcloud-essenciais)
3. [Rede e Conectividade](#3-rede-e-conectividade)
   - 3.1 [VPC Connector](#31-vpc-connector)
   - 3.2 [Direct VPC Egress](#32-direct-vpc-egress)
   - 3.3 [Cloud NAT e IP Estático](#33-cloud-nat-e-ip-estático)
4. [Monitoramento e Observabilidade](#4-monitoramento-e-observabilidade)
   - 4.1 [Cloud Logging](#41-cloud-logging)
   - 4.2 [Cloud Monitoring e Alertas](#42-cloud-monitoring-e-alertas)
   - 4.3 [Logging Estruturado em Python](#43-logging-estruturado-em-python)
5. [Armazenamento Persistente](#5-armazenamento-persistente)
   - 5.1 [Opções de Storage](#51-opções-de-storage)
   - 5.2 [Cloud Storage (GCS)](#52-cloud-storage-gcs)
   - 5.3 [Firestore](#53-firestore)
   - 5.4 [Cloud SQL](#54-cloud-sql)
   - 5.5 [Memorystore](#55-memorystore)
   - 5.6 [Volumes FUSE (Cloud Storage FUSE)](#56-volumes-fuse-cloud-storage-fuse)
6. [Cloud Run Jobs vs Services](#6-cloud-run-jobs-vs-services)
7. [Considerações Específicas para Trading Bots](#7-considerações-específicas-para-trading-bots)
   - 7.1 [Baixa Latência](#71-baixa-latência)
   - 7.2 [Agendamento com Cloud Scheduler](#72-agendamento-com-cloud-scheduler)
   - 7.3 [Conexões WebSocket](#73-conexões-websocket)
   - 7.4 [Graceful Shutdown](#74-graceful-shutdown)
   - 7.5 [Recuperação de Estado](#75-recuperação-de-estado)
8. [Segurança e IAM](#8-segurança-e-iam)
   - 8.1 [Service Accounts Dedicadas](#81-service-accounts-dedicadas)
   - 8.2 [Princípio de Least Privilege](#82-princípio-de-least-privilege)
   - 8.3 [Autenticação e Workload Identity](#83-autenticação-e-workload-identity)
9. [Otimização de Custos](#9-otimização-de-custos)
   - 9.1 [Billing Modes](#91-billing-modes)
   - 9.2 [Free Tier](#92-free-tier)
   - 9.3 [Estratégias de Economia](#93-estratégias-de-economia)
10. [Referências](#10-referências)

---

## 1. Containerização com Docker

A containerização é o pilar fundamental para garantir reprodutibilidade, isolamento e portabilidade da aplicação de trading. Um container bem construído reduz riscos operacionais, facilita deploys consistentes e minimiza superfície de ataque — requisitos críticos quando a aplicação lida com operações financeiras automatizadas.

### 1.1 Seleção de Imagem Base

A escolha da imagem base impacta diretamente tamanho, segurança e tempo de build. Para aplicações Python de trading, as principais opções são:

| Imagem Base | Tamanho Aprox. | Prós | Contras | Recomendação |
|---|---|---|---|---|
| `python:3.12-slim` | ~150 MB | Equilíbrio entre tamanho e compatibilidade, inclui `apt` para dependências nativas | Maior que Alpine | **Recomendada para trading bots** |
| `python:3.12-alpine` | ~50 MB | Menor tamanho, menor superfície de ataque | Usa musl libc — incompatibilidades com numpy, pandas, scipy; builds lentos | Evitar se usar libs científicas |
| `python:3.12` | ~900 MB | Máxima compatibilidade, inclui ferramentas de build | Muito grande para produção | Apenas como estágio de build |
| `gcr.io/distroless/python3` | ~30 MB | Imagem mínima do Google, sem shell, altíssima segurança | Difícil de depurar, sem package manager | Estágio final em multi-stage avançado |

**Implicação para o Bot:** Para aplicações que utilizam `pandas`, `numpy`, `ccxt`, `ta-lib` e outras bibliotecas com extensões C, a imagem `python:3.12-slim` oferece o melhor equilíbrio. A variante Alpine pode causar falhas silenciosas em cálculos numéricos por conta da implementação `musl` de funções matemáticas.

### 1.2 Multi-Stage Builds

Multi-stage builds permitem separar o ambiente de compilação do ambiente de execução, resultando em imagens de produção significativamente menores e mais seguras.

```dockerfile
# ============================
# Estágio 1: Build (compilação)
# ============================
FROM python:3.12-slim AS builder

WORKDIR /app

# Instalar dependências de sistema para compilação
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ============================
# Estágio 2: Runtime (produção)
# ============================
FROM python:3.12-slim AS runtime

WORKDIR /app

# Criar usuário não-root
RUN groupadd -r botuser && useradd -r -g botuser -d /app -s /sbin/nologin botuser

# Copiar apenas os pacotes instalados do estágio de build
COPY --from=builder /install /usr/local

# Copiar código da aplicação
COPY --chown=botuser:botuser . .

# Configurar usuário não-root
USER botuser

# Variáveis de ambiente
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')" || exit 1

# Porta padrão do Cloud Run
EXPOSE 8080

# Comando de inicialização
CMD ["python", "main.py"]
```

**Observação:** O estágio de build (`builder`) contém compiladores e headers que não são copiados para a imagem final, reduzindo o tamanho em até 60%.

### 1.3 Otimização de Camadas e Cache

O Docker utiliza cache de camadas — cada instrução `RUN`, `COPY` ou `ADD` cria uma camada. A ordem das instruções impacta diretamente a velocidade de rebuild.

**Princípios fundamentais:**

1. **Instruções que mudam com menos frequência devem vir primeiro** — dependências do sistema antes de dependências Python, dependências Python antes do código-fonte.
2. **Separar `requirements.txt` do código** — Copiar e instalar dependências antes de copiar o código da aplicação. Assim, mudanças no código não invalidam o cache das dependências.
3. **Consolidar comandos `RUN`** — Múltiplos `RUN` criam múltiplas camadas; encadear com `&&` reduz camadas intermediárias.

```dockerfile
# BOM: requirements.txt é copiado e instalado separadamente
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# RUIM: qualquer mudança no código invalida o cache de pip install
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
```

**Dica avançada:** Utilizar `--mount=type=cache` para cache persistente de pip entre builds:

```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

### 1.4 Segurança do Container

Containers em produção que operam com ativos financeiros exigem postura de segurança rigorosa.

**Práticas obrigatórias:**

- **Executar como non-root:** Nunca rodar a aplicação como `root`. Criar um usuário dedicado com `useradd` e alternar com `USER`.
- **Read-only filesystem:** Utilizar a flag `--read-only` no runtime quando possível, montando volumes para diretórios que precisam de escrita (logs, tmp).
- **Minimal packages:** Instalar apenas o estritamente necessário. Remover caches e listas de pacotes após instalação.
- **Sem secrets no build:** Nunca usar `ENV` ou `COPY` para injetar API keys, senhas ou certificados na imagem. Utilizar variáveis de ambiente em runtime ou Secret Manager.
- **Scan de vulnerabilidades:** Integrar ferramentas como `trivy`, `snyk` ou o scanner nativo do Artifact Registry no pipeline de CI/CD.

```dockerfile
# Exemplo de hardening avançado
FROM python:3.12-slim AS runtime

# Remover pacotes desnecessários e limpar caches
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && apt-get purge -y --auto-remove \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Criar usuário não-root com home directory restrito
RUN groupadd -r botuser && \
    useradd -r -g botuser -d /app -s /usr/sbin/nologin botuser && \
    mkdir -p /app/tmp && \
    chown -R botuser:botuser /app

WORKDIR /app
USER botuser

# Read-only FS: apenas /app/tmp é gravável
VOLUME ["/app/tmp"]
```

### 1.5 Health Checks

Health checks são essenciais para que o orquestrador (Docker, Cloud Run, Kubernetes) saiba se a aplicação está saudável e pronta para receber tráfego.

```python
# health.py — endpoint de health check
from flask import Flask, jsonify
import ccxt

app = Flask(__name__)

@app.route("/health")
def health():
    """Verifica saúde da aplicação e conectividade com exchange."""
    checks = {
        "status": "healthy",
        "exchange_connected": False,
        "database_connected": False
    }
    try:
        exchange = ccxt.binance()
        exchange.load_markets()
        checks["exchange_connected"] = True
    except Exception:
        checks["status"] = "degraded"

    status_code = 200 if checks["status"] == "healthy" else 503
    return jsonify(checks), status_code
```

**Importante:** No Cloud Run, o health check é baseado na resposta HTTP na porta configurada. O serviço deve responder em `/` ou em um path configurado no startup probe.

### 1.6 Gerenciamento de Secrets

**Nunca armazenar secrets na imagem Docker.** Secrets devem ser injetados em runtime.

| Método | Segurança | Complexidade | Recomendação |
|---|---|---|---|
| Variáveis de ambiente | Média | Baixa | Aceitável para configs não sensíveis |
| Google Secret Manager | Alta | Média | **Recomendado para API keys e credenciais** |
| Mounted volumes | Média | Média | Alternativa para certificados |
| Workload Identity | Muito Alta | Alta | Ideal para autenticação entre serviços GCP |

```python
# Acessando secret do Google Secret Manager em Python
from google.cloud import secretmanager

def get_secret(project_id: str, secret_id: str, version: str = "latest") -> str:
    """Recupera um secret do Google Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# Uso
api_key = get_secret("meu-projeto", "exchange-api-key")
api_secret = get_secret("meu-projeto", "exchange-api-secret")
```

### 1.7 .dockerignore

O `.dockerignore` previne que arquivos desnecessários sejam copiados para o contexto de build, reduzindo tempo e tamanho.

```dockerignore
# Controle de versão
.git
.gitignore

# Ambientes virtuais
venv/
.venv/
env/

# Cache Python
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/

# Configurações de IDE
.vscode/
.idea/
*.swp
*.swo

# Documentação (não necessária em produção)
docs/
*.md
LICENSE

# Testes
tests/
test_*.py
pytest.ini
.coverage
htmlcov/

# Docker
Dockerfile
docker-compose*.yml
.dockerignore

# Dados locais e secrets
*.env
.env.*
data/
logs/
*.log
credentials/
*.pem
*.key

# Notebooks
*.ipynb
.ipynb_checkpoints/
```

### 1.8 Otimização de Tamanho da Imagem

| Técnica | Redução Estimada | Descrição |
|---|---|---|
| Multi-stage build | 40–60% | Separar build de runtime |
| `--no-cache-dir` em pip | 10–20% | Não armazenar cache de download do pip |
| `--no-install-recommends` em apt | 5–15% | Instalar apenas dependências diretas |
| Remover `apt` lists | 5–10% | `rm -rf /var/lib/apt/lists/*` após instalar pacotes |
| `.dockerignore` | Variável | Excluir arquivos não necessários do contexto |
| Imagem slim | 70–80% | Usar `slim` ao invés da imagem completa |

**Meta prática:** Para um bot de trading Python com `pandas`, `numpy` e `ccxt`, uma imagem otimizada deve ficar entre **200–350 MB**.

---

## 2. Google Cloud Run — Configuração e Deploy

O Google Cloud Run é uma plataforma serverless que executa containers stateless. Para trading bots, oferece vantagens como auto-scaling, faturamento por uso e integração nativa com outros serviços GCP.

### 2.1 Configuração de Recursos

| Parâmetro | Valores Possíveis | Recomendação para Trading Bot | Observação |
|---|---|---|---|
| CPU | 1, 2, 4, 8 vCPUs | 2 vCPUs | Suficiente para cálculos com pandas/numpy |
| Memória | 128 MiB – 32 GiB | 1–2 GiB | Depende do volume de dados em memória |
| Concorrência | 1–1000 | 1–10 | Bots geralmente processam uma operação por vez |
| Timeout de requisição | 1s – 3600s | 300s (5 min) | Para operações de trading longas |
| Execution environment | Gen1, Gen2 | **Gen2** | Melhor performance de rede e CPU |
| CPU allocation | Request-based, Always-on | **Always-on** para bots ativos | CPU alocada mesmo sem requisições |

```bash
gcloud run deploy bot-assessor \
    --image us-docker.pkg.dev/MEU-PROJETO/repo/bot-assessor:latest \
    --region southamerica-east1 \
    --cpu 2 \
    --memory 2Gi \
    --concurrency 1 \
    --timeout 300 \
    --min-instances 1 \
    --max-instances 3 \
    --cpu-boost \
    --execution-environment gen2 \
    --no-cpu-throttling \
    --service-account bot-sa@MEU-PROJETO.iam.gserviceaccount.com
```

### 2.2 Otimização de Cold Start

Cold start é o tempo necessário para instanciar um novo container quando não há instâncias disponíveis. Para trading bots, cold starts podem causar perda de oportunidades de mercado.

**Estratégias de mitigação:**

1. **Mínimo de instâncias (`--min-instances 1`)** — Mantém pelo menos uma instância "quente" permanentemente. Gera custo contínuo, mas elimina cold starts.
2. **CPU Boost (`--cpu-boost`)** — Aloca CPU adicional temporariamente durante o startup. Reduz tempo de cold start em até 50%.
3. **Otimizar imports Python** — Lazy loading de módulos pesados:

```python
# RUIM: carrega tudo no startup
import pandas as pd
import numpy as np
import tensorflow as tf
from ccxt import binance

# BOM: lazy loading de módulos pesados
def get_exchange():
    import ccxt
    return ccxt.binance({
        "apiKey": get_secret("meu-projeto", "api-key"),
        "secret": get_secret("meu-projeto", "api-secret"),
    })
```

4. **Reduzir tamanho da imagem** — Imagens menores fazem pull mais rápido.
5. **Startup probes** — Configurar probes para que o Cloud Run aguarde a aplicação estar pronta antes de enviar tráfego.

**Benchmark típico de cold start (Python com Flask, imagem ~300 MB):**

| Configuração | Cold Start |
|---|---|
| Sem otimização | 8–15s |
| Com `--cpu-boost` | 4–8s |
| Com `--min-instances 1` | ~0s (instância já quente) |
| Com lazy loading + cpu-boost | 3–5s |

### 2.3 Auto-Scaling

O Cloud Run escala automaticamente de 0 a N instâncias baseado em métricas de requisições.

```
┌──────────────────────────────────────────────────────────────┐
│                    Auto-Scaling Cloud Run                     │
│                                                              │
│  Requisições ─────►  ┌───────────┐                          │
│                       │ Instância │  ← min-instances = 1     │
│  Carga aumenta ──►   │ Instância │                          │
│                       │ Instância │  ← max-instances = 3     │
│                       └───────────┘                          │
│  Carga diminui ──►   ┌───────────┐                          │
│                       │ Instância │  ← scale down gradual    │
│                       └───────────┘                          │
│                                                              │
│  Sem tráfego ────►   (0 instâncias, se min-instances = 0)   │
└──────────────────────────────────────────────────────────────┘
```

**Parâmetros relevantes:**

- `--min-instances`: Número mínimo de instâncias ativas (0 para scale-to-zero).
- `--max-instances`: Limite máximo para controle de custos.
- `--concurrency`: Número máximo de requisições simultâneas por instância. Valores baixos (1–5) forçam mais instâncias e isolam melhor as operações.

**Implicação para o Bot:** Para bots de trading, recomenda-se `--min-instances 1` e `--concurrency 1` para garantir que cada operação de trading tenha recursos dedicados e sem contenção.

### 2.4 Variáveis de Ambiente e Secrets

```bash
# Variáveis de ambiente simples (não sensíveis)
gcloud run services update bot-assessor \
    --set-env-vars "EXCHANGE=binance,TRADING_PAIR=BTC/BRL,LOG_LEVEL=INFO"

# Secrets do Secret Manager montados como variáveis de ambiente
gcloud run services update bot-assessor \
    --set-secrets "API_KEY=exchange-api-key:latest,API_SECRET=exchange-api-secret:latest"

# Secrets montados como arquivo
gcloud run services update bot-assessor \
    --set-secrets "/secrets/credentials.json=service-credentials:latest"
```

### 2.5 CI/CD com Cloud Build e Artifact Registry

Pipeline automatizado que constrói, testa e deploya a cada push no repositório.

```yaml
# cloudbuild.yaml
steps:
  # Etapa 1: Rodar testes
  - name: 'python:3.12-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt
        pip install pytest
        pytest tests/ -v --tb=short

  # Etapa 2: Build da imagem Docker
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-docker.pkg.dev/$PROJECT_ID/bot-repo/bot-assessor:$SHORT_SHA'
      - '-t'
      - 'us-docker.pkg.dev/$PROJECT_ID/bot-repo/bot-assessor:latest'
      - '.'

  # Etapa 3: Push para Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'us-docker.pkg.dev/$PROJECT_ID/bot-repo/bot-assessor'

  # Etapa 4: Deploy no Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'bot-assessor'
      - '--image'
      - 'us-docker.pkg.dev/$PROJECT_ID/bot-repo/bot-assessor:$SHORT_SHA'
      - '--region'
      - 'southamerica-east1'
      - '--cpu'
      - '2'
      - '--memory'
      - '2Gi'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '3'
      - '--no-cpu-throttling'
      - '--service-account'
      - 'bot-sa@$PROJECT_ID.iam.gserviceaccount.com'

# Configuração do trigger
options:
  logging: CLOUD_LOGGING_ONLY

images:
  - 'us-docker.pkg.dev/$PROJECT_ID/bot-repo/bot-assessor:$SHORT_SHA'
  - 'us-docker.pkg.dev/$PROJECT_ID/bot-repo/bot-assessor:latest'
```

**Configurar o trigger no Cloud Build:**

```bash
# Criar repositório no Artifact Registry
gcloud artifacts repositories create bot-repo \
    --repository-format=docker \
    --location=us \
    --description="Repositório de imagens do Bot Assessor"

# Conectar repositório Git e criar trigger
gcloud builds triggers create github \
    --repo-name=bot-assessor \
    --repo-owner=MEU-USUARIO \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml \
    --description="Deploy automático ao mergear na main"
```

### 2.6 Comandos gcloud Essenciais

```bash
# ===== Deploy e Gerenciamento =====

# Deploy de um serviço
gcloud run deploy SERVICO --image IMAGEM --region REGIAO

# Listar serviços
gcloud run services list

# Descrever um serviço (configuração completa)
gcloud run services describe bot-assessor --region southamerica-east1

# Atualizar configuração sem novo deploy
gcloud run services update bot-assessor --memory 4Gi --cpu 4

# Definir tráfego entre revisões (canary deploy)
gcloud run services update-traffic bot-assessor \
    --to-revisions=bot-assessor-v2=10,bot-assessor-v1=90

# ===== Logs e Debugging =====

# Ver logs em tempo real
gcloud run services logs read bot-assessor --region southamerica-east1 --tail

# Ver logs com filtro de severidade
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit 50

# ===== Jobs =====

# Criar e executar um job
gcloud run jobs create bot-backtest \
    --image us-docker.pkg.dev/MEU-PROJETO/bot-repo/bot-assessor:latest \
    --tasks 1 \
    --max-retries 3 \
    --task-timeout 3600

gcloud run jobs execute bot-backtest

# ===== Revisões =====

# Listar revisões
gcloud run revisions list --service bot-assessor

# Deletar revisões antigas
gcloud run revisions delete bot-assessor-00001 --quiet
```

---

## 3. Rede e Conectividade

A conectividade de rede é crítica para trading bots, que precisam acessar APIs de exchanges com baixa latência e, em alguns casos, exigem IP estático para whitelisting.

### 3.1 VPC Connector

O Serverless VPC Access Connector permite que serviços Cloud Run acessem recursos em uma VPC (Virtual Private Cloud), como instâncias Cloud SQL, Memorystore (Redis) ou VMs internas.

```bash
# Criar VPC connector
gcloud compute networks vpc-access connectors create bot-connector \
    --region southamerica-east1 \
    --network default \
    --range 10.8.0.0/28 \
    --min-instances 2 \
    --max-instances 3 \
    --machine-type e2-micro

# Associar ao serviço Cloud Run
gcloud run services update bot-assessor \
    --vpc-connector bot-connector \
    --vpc-egress all-traffic
```

### 3.2 Direct VPC Egress

Alternativa mais recente ao VPC Connector, o Direct VPC Egress coloca as instâncias do Cloud Run diretamente na subnet da VPC, sem necessidade de um connector intermediário.

```bash
# Configurar Direct VPC Egress
gcloud run services update bot-assessor \
    --network default \
    --subnet default \
    --vpc-egress all-traffic \
    --region southamerica-east1
```

**Vantagens sobre VPC Connector:**
- Menor latência (sem hop intermediário)
- Sem custo adicional do connector
- Suporta maior throughput

### 3.3 Cloud NAT e IP Estático

Muitas exchanges exigem IP estático cadastrado para permitir acesso via API. O Cloud NAT permite rotear tráfego de saída do Cloud Run por IPs estáticos reservados.

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Arquitetura de IP Estático                         │
│                                                                     │
│  Cloud Run ──► VPC (Direct Egress) ──► Cloud NAT ──► IP Estático   │
│                                              │                      │
│                                              ▼                      │
│                                     Exchange API                    │
│                                   (IP whitelisted)                  │
└─────────────────────────────────────────────────────────────────────┘
```

```bash
# 1. Reservar IP estático
gcloud compute addresses create bot-static-ip \
    --region southamerica-east1

# Verificar o IP alocado
gcloud compute addresses describe bot-static-ip \
    --region southamerica-east1 --format="value(address)"

# 2. Criar Cloud Router
gcloud compute routers create bot-router \
    --network default \
    --region southamerica-east1

# 3. Criar Cloud NAT com IP estático
gcloud compute routers nats create bot-nat \
    --router bot-router \
    --region southamerica-east1 \
    --nat-all-subnet-ip-ranges \
    --nat-external-ip-pool bot-static-ip

# 4. Configurar Cloud Run com Direct VPC Egress
gcloud run services update bot-assessor \
    --network default \
    --subnet default \
    --vpc-egress all-traffic
```

**Importante:** O IP estático obtido deve ser cadastrado na exchange (Binance, Bybit, etc.) nas configurações de API para whitelisting.

---

## 4. Monitoramento e Observabilidade

Para um bot de trading em produção, monitoramento não é opcional — é requisito de segurança operacional. Uma operação de mercado mal monitorada pode resultar em perdas financeiras significativas.

### 4.1 Cloud Logging

O Cloud Run envia automaticamente stdout e stderr para o Cloud Logging. Logs estruturados em formato JSON são automaticamente parseados e indexados.

```bash
# Consultar logs do serviço
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="bot-assessor"' \
    --limit 100 \
    --format json

# Filtrar por severidade
gcloud logging read 'resource.type="cloud_run_revision" AND severity="ERROR"' --limit 50

# Filtrar por campo personalizado (log estruturado)
gcloud logging read 'resource.type="cloud_run_revision" AND jsonPayload.trading_pair="BTC/BRL"' --limit 20
```

### 4.2 Cloud Monitoring e Alertas

Configurar alertas para métricas críticas do bot:

| Métrica | Condição de Alerta | Canal | Prioridade |
|---|---|---|---|
| Taxa de erros (5xx) | > 5% por 5 min | SMS + Email | Crítica |
| Latência P99 | > 5s por 10 min | Email | Alta |
| Uso de memória | > 80% | Email | Média |
| Contagem de instâncias | = 0 (scale-to-zero inesperado) | SMS | Crítica |
| Tempo sem operação | > 30 min (horário de mercado) | SMS + Email | Crítica |

```bash
# Criar política de alerta via gcloud
gcloud alpha monitoring policies create \
    --display-name="Bot Assessor - Taxa de Erros Alta" \
    --condition-display-name="Erros 5xx > 5%" \
    --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"' \
    --condition-threshold-value=5 \
    --condition-threshold-duration=300s \
    --notification-channels=CANAL_ID
```

### 4.3 Logging Estruturado em Python

Logs estruturados em JSON permitem consultas avançadas no Cloud Logging e facilitam a criação de dashboards e alertas.

```python
import json
import logging
import sys
from datetime import datetime, timezone


class CloudRunJsonFormatter(logging.Formatter):
    """Formatter que produz JSON compatível com Cloud Logging."""

    SEVERITY_MAP = {
        logging.DEBUG: "DEBUG",
        logging.INFO: "INFO",
        logging.WARNING: "WARNING",
        logging.ERROR: "ERROR",
        logging.CRITICAL: "CRITICAL",
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "severity": self.SEVERITY_MAP.get(record.levelno, "DEFAULT"),
            "message": record.getMessage(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "logger": record.name,
            "module": record.module,
        }

        # Adicionar campos extras (ex: trading_pair, order_id)
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)

        # Adicionar stack trace em caso de exceção
        if record.exc_info:
            log_entry["stack_trace"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging() -> logging.Logger:
    """Configura logging estruturado para Cloud Run."""
    logger = logging.getLogger("bot-assessor")
    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(CloudRunJsonFormatter())
    logger.addHandler(handler)

    return logger


# Uso
logger = setup_logging()

logger.info(
    "Ordem executada com sucesso",
    extra={"extra_fields": {
        "trading_pair": "BTC/BRL",
        "side": "buy",
        "amount": 0.001,
        "price": 350000.00,
        "order_id": "abc123",
    }}
)
```

---

## 5. Armazenamento Persistente

Containers no Cloud Run são **stateless e efêmeros** — qualquer dado gravado no filesystem local é perdido quando a instância é reciclada. Para persistência, é necessário utilizar serviços externos.

### 5.1 Opções de Storage

| Serviço | Tipo | Latência | Custo | Caso de Uso para Trading |
|---|---|---|---|---|
| **Cloud Storage (GCS)** | Object Storage | 50–200ms | Muito baixo | Backups, CSVs históricos, modelos ML |
| **Firestore** | NoSQL Document | 10–50ms | Baixo | Estado do bot, configurações, logs de trades |
| **Cloud SQL** | SQL (PostgreSQL/MySQL) | 5–20ms | Médio-Alto | Histórico completo de ordens, analytics |
| **Memorystore (Redis)** | In-Memory Cache | < 1ms | Médio | Cache de preços, rate limiting, locks |
| **Cloud Storage FUSE** | Filesystem Mount | 100–500ms | Baixo | Arquivos grandes, datasets |

### 5.2 Cloud Storage (GCS)

```python
from google.cloud import storage

def upload_trade_log(bucket_name: str, data: dict, filename: str) -> str:
    """Salva log de trade no Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(f"trades/{filename}")
    blob.upload_from_string(
        json.dumps(data, ensure_ascii=False, indent=2),
        content_type="application/json"
    )
    return f"gs://{bucket_name}/trades/{filename}"
```

### 5.3 Firestore

```python
from google.cloud import firestore

db = firestore.Client()

def save_bot_state(bot_id: str, state: dict) -> None:
    """Persiste estado do bot no Firestore."""
    doc_ref = db.collection("bot_states").document(bot_id)
    doc_ref.set({
        **state,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

def load_bot_state(bot_id: str) -> dict | None:
    """Recupera estado do bot do Firestore."""
    doc = db.collection("bot_states").document(bot_id).get()
    return doc.to_dict() if doc.exists else None
```

### 5.4 Cloud SQL

Para histórico completo de operações e análises mais complexas, Cloud SQL com PostgreSQL é a opção mais robusta.

```bash
# Criar instância Cloud SQL (PostgreSQL)
gcloud sql instances create bot-db \
    --database-version POSTGRES_15 \
    --tier db-f1-micro \
    --region southamerica-east1 \
    --storage-size 10GB \
    --storage-auto-increase

# Criar banco de dados
gcloud sql databases create trading --instance bot-db
```

```python
# Conexão via Cloud SQL Auth Proxy (recomendado)
import sqlalchemy

def create_engine():
    """Cria engine SQLAlchemy para Cloud SQL via Unix socket."""
    db_user = get_secret("meu-projeto", "db-user")
    db_pass = get_secret("meu-projeto", "db-pass")
    db_name = "trading"
    instance_connection = "meu-projeto:southamerica-east1:bot-db"

    return sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL.create(
            drivername="postgresql+pg8000",
            username=db_user,
            password=db_pass,
            database=db_name,
            query={"unix_sock": f"/cloudsql/{instance_connection}/.s.PGSQL.5432"}
        ),
        pool_size=5,
        max_overflow=2,
        pool_timeout=30,
        pool_recycle=1800,
    )
```

### 5.5 Memorystore

Redis gerenciado para cache de baixa latência.

```bash
# Criar instância Redis
gcloud redis instances create bot-cache \
    --size 1 \
    --region southamerica-east1 \
    --tier basic \
    --redis-version redis_7_0
```

```python
import redis

def get_redis_client() -> redis.Redis:
    """Conecta ao Memorystore Redis."""
    return redis.Redis(
        host="10.0.0.3",  # IP interno do Memorystore
        port=6379,
        decode_responses=True,
    )

# Cache de preços com TTL
cache = get_redis_client()
cache.setex("price:BTC/BRL", 30, "350000.00")  # TTL de 30 segundos
```

### 5.6 Volumes FUSE (Cloud Storage FUSE)

O Cloud Run suporta montagem de buckets GCS como volume FUSE, permitindo acesso via filesystem convencional.

```bash
gcloud run services update bot-assessor \
    --add-volume name=gcs-data,type=cloud-storage,bucket=meu-bucket-dados \
    --add-volume-mount volume=gcs-data,mount-path=/data
```

**Observação:** A latência de acesso via FUSE é significativamente maior que a API nativa do GCS. Recomendado para leitura de datasets grandes, não para operações de trading em tempo real.

---

## 6. Cloud Run Jobs vs Services

O Cloud Run oferece dois modelos de execução que atendem cenários distintos de trading.

| Característica | Cloud Run Service | Cloud Run Job |
|---|---|---|
| **Modelo** | HTTP server always-on ou scale-to-zero | Execução batch com início e fim |
| **Trigger** | Requisições HTTP, Pub/Sub, Scheduler | Manual, Scheduler, Workflows |
| **Duração máxima** | Até 60 min por request (timeout) | Até 24h por task |
| **Scaling** | Automático por requisição | Paralelismo por tasks |
| **Billing** | Por tempo de CPU alocada | Por tempo de execução |
| **Estado** | Stateless entre requisições | Stateless entre execuções |
| **Caso de uso (trading)** | Bot ativo monitorando mercado, API de consulta de posição, webhook de sinais | Backtesting, geração de relatórios, treinamento de modelos ML, reconciliação de operações |

**Quando usar cada um:**

- **Service** para: monitoramento contínuo de preços, execução de ordens em tempo real, recebimento de webhooks de exchanges, API de consulta de portfolio.
- **Job** para: backtesting de estratégias, processamento batch de dados históricos, treinamento/retreinamento de modelos ML, geração de relatórios diários, reconciliação de operações com a exchange.

```bash
# Exemplo: Job para backtesting executado diariamente
gcloud run jobs create daily-backtest \
    --image us-docker.pkg.dev/MEU-PROJETO/bot-repo/bot-assessor:latest \
    --tasks 1 \
    --max-retries 2 \
    --task-timeout 7200 \
    --cpu 4 \
    --memory 8Gi \
    --set-env-vars "MODE=backtest,DAYS=30" \
    --region southamerica-east1

# Agendar com Cloud Scheduler (todos os dias às 6h BRT)
gcloud scheduler jobs create http daily-backtest-trigger \
    --location southamerica-east1 \
    --schedule "0 6 * * *" \
    --time-zone "America/Sao_Paulo" \
    --uri "https://southamerica-east1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/MEU-PROJETO/jobs/daily-backtest:run" \
    --http-method POST \
    --oauth-service-account-email bot-sa@MEU-PROJETO.iam.gserviceaccount.com
```

---

## 7. Considerações Específicas para Trading Bots

### 7.1 Baixa Latência

Para operações de trading, cada milissegundo pode impactar o resultado. Estratégias para minimizar latência no Cloud Run:

1. **Região próxima à exchange:** Usar `southamerica-east1` (São Paulo) para exchanges brasileiras. Para Binance (servidores na Ásia), considerar `asia-southeast1` (Singapura) ou `asia-northeast1` (Tóquio).
2. **Gen2 execution environment:** Oferece stack de rede otimizada.
3. **`--no-cpu-throttling`:** Garante CPU alocada mesmo entre requisições.
4. **Connection pooling:** Reutilizar conexões HTTP com a exchange.
5. **`--min-instances 1`:** Eliminar cold starts completamente.

```python
import ccxt
from functools import lru_cache

@lru_cache(maxsize=1)
def get_exchange() -> ccxt.Exchange:
    """Retorna instância singleton da exchange com connection pool."""
    return ccxt.binance({
        "apiKey": get_secret("meu-projeto", "api-key"),
        "secret": get_secret("meu-projeto", "api-secret"),
        "enableRateLimit": True,
        "options": {
            "defaultType": "spot",
            "recvWindow": 5000,
        },
    })
```

### 7.2 Agendamento com Cloud Scheduler

O Cloud Scheduler permite agendar execuções periódicas do bot com precisão de minuto.

```bash
# Verificar mercado a cada 5 minutos durante o pregão (10h-17h BRT)
gcloud scheduler jobs create http check-market \
    --location southamerica-east1 \
    --schedule "*/5 10-17 * * 1-5" \
    --time-zone "America/Sao_Paulo" \
    --uri "https://bot-assessor-HASH.run.app/check" \
    --http-method POST \
    --oidc-service-account-email bot-sa@MEU-PROJETO.iam.gserviceaccount.com \
    --headers "Content-Type=application/json" \
    --message-body '{"pair": "BTC/BRL", "strategy": "mean_reversion"}'

# Rebalanceamento de portfolio semanal (segunda às 10h)
gcloud scheduler jobs create http weekly-rebalance \
    --location southamerica-east1 \
    --schedule "0 10 * * 1" \
    --time-zone "America/Sao_Paulo" \
    --uri "https://bot-assessor-HASH.run.app/rebalance" \
    --http-method POST \
    --oidc-service-account-email bot-sa@MEU-PROJETO.iam.gserviceaccount.com
```

### 7.3 Conexões WebSocket

O Cloud Run suporta WebSocket a partir do Gen2, permitindo conexões persistentes com exchanges para receber dados de mercado em tempo real.

```python
import asyncio
import signal
import ccxt.pro as ccxtpro


async def watch_orderbook(exchange_id: str, symbol: str):
    """Monitora orderbook via WebSocket."""
    exchange = getattr(ccxtpro, exchange_id)({
        "apiKey": get_secret("meu-projeto", "api-key"),
        "secret": get_secret("meu-projeto", "api-secret"),
    })

    try:
        while True:
            orderbook = await exchange.watch_order_book(symbol)
            best_bid = orderbook["bids"][0][0] if orderbook["bids"] else None
            best_ask = orderbook["asks"][0][0] if orderbook["asks"] else None
            spread = (best_ask - best_bid) / best_bid * 100 if best_bid and best_ask else None

            logger.info("Orderbook atualizado", extra={"extra_fields": {
                "symbol": symbol,
                "best_bid": best_bid,
                "best_ask": best_ask,
                "spread_pct": round(spread, 4) if spread else None,
            }})
    finally:
        await exchange.close()
```

**Limitações no Cloud Run:**
- Timeout máximo de WebSocket: 60 minutos (configurável até 3600s no Gen2).
- Após o timeout, a conexão é encerrada e deve ser reestabelecida.
- Implementar lógica de reconexão automática é obrigatório.

### 7.4 Graceful Shutdown

O Cloud Run envia `SIGTERM` antes de encerrar uma instância. O bot deve capturar esse sinal para finalizar operações em andamento de forma segura.

```python
import signal
import sys

class GracefulShutdown:
    """Gerencia shutdown graceful para o trading bot."""

    def __init__(self):
        self.should_exit = False
        signal.signal(signal.SIGTERM, self._handle_sigterm)
        signal.signal(signal.SIGINT, self._handle_sigterm)

    def _handle_sigterm(self, signum, frame):
        logger.warning("Sinal de shutdown recebido", extra={"extra_fields": {
            "signal": signal.Signals(signum).name,
        }})
        self.should_exit = True

    async def shutdown(self, exchange):
        """Procedimento de shutdown seguro."""
        logger.info("Iniciando shutdown graceful...")

        # 1. Parar de aceitar novas operações
        # 2. Aguardar operações em andamento finalizarem
        # 3. Cancelar ordens abertas pendentes (opcional, depende da estratégia)
        open_orders = await exchange.fetch_open_orders()
        for order in open_orders:
            logger.info(f"Cancelando ordem {order['id']}...")
            await exchange.cancel_order(order["id"], order["symbol"])

        # 4. Persistir estado atual
        save_bot_state("bot-assessor", {
            "last_shutdown": datetime.now(timezone.utc).isoformat(),
            "reason": "SIGTERM",
            "open_positions": await exchange.fetch_positions(),
        })

        # 5. Fechar conexões
        await exchange.close()
        logger.info("Shutdown concluído com sucesso")


# Uso no loop principal
shutdown_handler = GracefulShutdown()

while not shutdown_handler.should_exit:
    await process_trading_cycle()
    await asyncio.sleep(1)

await shutdown_handler.shutdown(exchange)
```

**Observação:** O Cloud Run concede até 10 segundos (padrão) entre o `SIGTERM` e o `SIGKILL`. Esse valor pode ser configurado com `--termination-grace-period` para até 3600 segundos.

### 7.5 Recuperação de Estado

Devido à natureza efêmera dos containers, o bot deve ser capaz de recuperar seu estado ao reiniciar.

```python
async def startup_recovery(bot_id: str, exchange):
    """Recupera estado do bot após restart."""
    logger.info("Iniciando recuperação de estado...")

    # 1. Recuperar último estado salvo
    state = load_bot_state(bot_id)
    if not state:
        logger.info("Nenhum estado anterior encontrado. Iniciando do zero.")
        return

    logger.info(f"Estado recuperado. Último shutdown: {state.get('last_shutdown')}")

    # 2. Reconciliar posições abertas com a exchange
    saved_positions = state.get("open_positions", [])
    current_positions = await exchange.fetch_positions()

    for saved_pos in saved_positions:
        matching = [p for p in current_positions if p["symbol"] == saved_pos["symbol"]]
        if matching:
            logger.info(f"Posição {saved_pos['symbol']} confirmada na exchange")
        else:
            logger.warning(f"Posição {saved_pos['symbol']} não encontrada na exchange — pode ter sido liquidada")

    # 3. Verificar ordens que podem ter sido executadas durante o downtime
    recent_trades = await exchange.fetch_my_trades(limit=50)
    logger.info(f"{len(recent_trades)} trades recentes encontrados para reconciliação")
```

---

## 8. Segurança e IAM

### 8.1 Service Accounts Dedicadas

Cada serviço Cloud Run deve utilizar uma service account dedicada, nunca a service account padrão do Compute Engine.

```bash
# Criar service account dedicada para o bot
gcloud iam service-accounts create bot-sa \
    --display-name="Bot Assessor Service Account" \
    --description="SA dedicada para o serviço Cloud Run do Bot Assessor"
```

### 8.2 Princípio de Least Privilege

Conceder apenas as permissões estritamente necessárias para o funcionamento do bot.

```bash
# Permissões para acessar Secret Manager
gcloud projects add-iam-policy-binding MEU-PROJETO \
    --member="serviceAccount:bot-sa@MEU-PROJETO.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Permissões para Cloud Storage (leitura/escrita)
gcloud projects add-iam-policy-binding MEU-PROJETO \
    --member="serviceAccount:bot-sa@MEU-PROJETO.iam.gserviceaccount.com" \
    --role="roles/storage.objectUser"

# Permissões para Firestore
gcloud projects add-iam-policy-binding MEU-PROJETO \
    --member="serviceAccount:bot-sa@MEU-PROJETO.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

# Permissões para Cloud SQL
gcloud projects add-iam-policy-binding MEU-PROJETO \
    --member="serviceAccount:bot-sa@MEU-PROJETO.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# Permissões para Cloud Logging (escrita)
gcloud projects add-iam-policy-binding MEU-PROJETO \
    --member="serviceAccount:bot-sa@MEU-PROJETO.iam.gserviceaccount.com" \
    --role="roles/logging.logWriter"
```

**Roles que NÃO devem ser atribuídas à service account do bot:**
- `roles/owner` — acesso total ao projeto
- `roles/editor` — acesso amplo de edição
- `roles/iam.serviceAccountAdmin` — pode criar/modificar service accounts
- `roles/run.admin` — pode modificar serviços Cloud Run

### 8.3 Autenticação e Workload Identity

```
┌──────────────────────────────────────────────────────────────────────┐
│              Modelo de Autenticação Recomendado                      │
│                                                                      │
│  ┌──────────────┐    Workload     ┌───────────────────┐             │
│  │  Cloud Run   │ ──Identity───►  │  Secret Manager   │             │
│  │  (bot-sa)    │                 │  (API keys)       │             │
│  └──────┬───────┘                 └───────────────────┘             │
│         │                                                            │
│         │  OIDC Token                                                │
│         ▼                                                            │
│  ┌──────────────┐                 ┌───────────────────┐             │
│  │  Cloud       │                 │  Cloud SQL        │             │
│  │  Scheduler   │                 │  (via Auth Proxy) │             │
│  └──────────────┘                 └───────────────────┘             │
│                                                                      │
│  Princípio: Nenhuma credencial estática no código ou na imagem.     │
│  Toda autenticação via IAM e Workload Identity.                     │
└──────────────────────────────────────────────────────────────────────┘
```

**Workload Identity Federation** (para acessar serviços fora do GCP):

```bash
# Criar pool de identidade
gcloud iam workload-identity-pools create "exchange-pool" \
    --location="global" \
    --display-name="Exchange API Pool"

# Criar provider (exemplo com GitHub Actions para CI/CD)
gcloud iam workload-identity-pools providers create-oidc "github" \
    --location="global" \
    --workload-identity-pool="exchange-pool" \
    --display-name="GitHub Actions" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"
```

---

## 9. Otimização de Custos

### 9.1 Billing Modes

O Cloud Run oferece dois modelos de cobrança:

| Modo | Cobrança | CPU Idle | Uso Ideal |
|---|---|---|---|
| **Request-based** (padrão) | CPU cobrada apenas durante requisições | CPU throttled entre requests | APIs com tráfego intermitente |
| **Instance-based** (always-on) | CPU cobrada enquanto instância existir | CPU disponível entre requests | **Bots de trading ativos** |

```bash
# Request-based (padrão)
gcloud run services update bot-assessor --cpu-throttling

# Instance-based (always-on) — recomendado para trading
gcloud run services update bot-assessor --no-cpu-throttling
```

### 9.2 Free Tier

O Cloud Run oferece um free tier mensal generoso (valores de referência, verificar tabela atualizada):

| Recurso | Free Tier Mensal |
|---|---|
| CPU | 180.000 vCPU-segundos |
| Memória | 360.000 GiB-segundos |
| Requisições | 2 milhões |
| Rede (egress) | 1 GB para América do Norte |

**Estimativa para um bot com 1 instância always-on (2 vCPU, 2 GiB):**
- CPU: 2 vCPU × 2.592.000s/mês = 5.184.000 vCPU-s → **excede o free tier**
- Memória: 2 GiB × 2.592.000s/mês = 5.184.000 GiB-s → **excede o free tier**
- Custo estimado: ~US$ 70–120/mês (dependendo da região e configuração)

### 9.3 Estratégias de Economia

1. **Scale-to-zero quando possível:** Se o bot opera apenas durante o horário de pregão (10h–17h BRT), configurar `--min-instances 0` e usar Cloud Scheduler para ativar/desativar.

```bash
# Ativar bot no início do pregão
gcloud scheduler jobs create http start-bot \
    --schedule "0 10 * * 1-5" \
    --time-zone "America/Sao_Paulo" \
    --uri "https://bot-assessor-HASH.run.app/start" \
    --http-method POST \
    --oidc-service-account-email bot-sa@MEU-PROJETO.iam.gserviceaccount.com

# Desativar bot no fim do pregão
gcloud scheduler jobs create http stop-bot \
    --schedule "0 18 * * 1-5" \
    --time-zone "America/Sao_Paulo" \
    --uri "https://bot-assessor-HASH.run.app/stop" \
    --http-method POST \
    --oidc-service-account-email bot-sa@MEU-PROJETO.iam.gserviceaccount.com
```

2. **Rightsizing:** Monitorar uso real de CPU e memória e ajustar para o mínimo necessário.
3. **Committed Use Discounts (CUDs):** Para uso previsível e contínuo, contratos de 1 ou 3 anos oferecem descontos de 17% a 40%.
4. **Região mais barata:** `us-central1` é a região mais barata, mas a latência para exchanges brasileiras será maior. Para cripto (exchanges globais), a diferença pode ser aceitável.
5. **Cloud Run Jobs para batch:** Usar Jobs (cobrados apenas pelo tempo de execução) para tarefas como backtesting, em vez de manter um Service rodando.

---

## 10. Referências

### Documentação Oficial do Google Cloud

1. **"Cloud Run documentation"** Google Cloud. Disponível em: https://cloud.google.com/run/docs. Tipo: Documentação técnica oficial.

2. **"Cloud Run pricing"** Google Cloud. Disponível em: https://cloud.google.com/run/pricing. Tipo: Tabela de preços.

3. **"Configuring minimum instances"** Google Cloud. Disponível em: https://cloud.google.com/run/docs/configuring/min-instances. Tipo: Guia de configuração.

4. **"Using Secret Manager"** Google Cloud. Disponível em: https://cloud.google.com/run/docs/configuring/secrets. Tipo: Guia de integração.

5. **"Cloud Run VPC networking"** Google Cloud. Disponível em: https://cloud.google.com/run/docs/configuring/vpc-connectors. Tipo: Guia de rede.

6. **"Cloud Run jobs overview"** Google Cloud. Disponível em: https://cloud.google.com/run/docs/create-jobs. Tipo: Documentação técnica.

7. **"Cloud Build documentation"** Google Cloud. Disponível em: https://cloud.google.com/build/docs. Tipo: Documentação de CI/CD.

8. **"Artifact Registry documentation"** Google Cloud. Disponível em: https://cloud.google.com/artifact-registry/docs. Tipo: Documentação de registry.

9. **"Cloud Logging for Cloud Run"** Google Cloud. Disponível em: https://cloud.google.com/run/docs/logging. Tipo: Guia de observabilidade.

10. **"Cloud NAT overview"** Google Cloud. Disponível em: https://cloud.google.com/nat/docs/overview. Tipo: Documentação de rede.

### Docker

11. **"Dockerfile best practices"** Docker Inc. Disponível em: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/. Tipo: Guia de melhores práticas.

12. **"Multi-stage builds"** Docker Inc. Disponível em: https://docs.docker.com/build/building/multi-stage/. Tipo: Documentação técnica.

13. **"Docker security best practices"** Docker Inc. Disponível em: https://docs.docker.com/develop/security-best-practices/. Tipo: Guia de segurança.

### Python e Trading

14. **"ccxt — CryptoCurrency eXchange Trading Library"** ccxt. Disponível em: https://docs.ccxt.com/. Tipo: Documentação de biblioteca.

15. **"Structured logging in Python"** Google Cloud. Disponível em: https://cloud.google.com/logging/docs/setup/python. Tipo: Guia de integração.

### Segurança

16. **"IAM best practices"** Google Cloud. Disponível em: https://cloud.google.com/iam/docs/using-iam-securely. Tipo: Guia de segurança.

17. **"Workload Identity Federation"** Google Cloud. Disponível em: https://cloud.google.com/iam/docs/workload-identity-federation. Tipo: Documentação de autenticação.

18. **"Container security best practices"** Google Cloud. Disponível em: https://cloud.google.com/architecture/best-practices-for-building-containers. Tipo: Guia de arquitetura.

---

*Documento elaborado como referência técnica para o projeto Bot Assessor. O conteúdo reflete melhores práticas atualizadas para Fevereiro de 2026 e deve ser revisado periodicamente conforme evolução dos serviços Google Cloud e das práticas de containerização.*
