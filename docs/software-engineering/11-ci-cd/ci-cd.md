# CI/CD -- Continuous Integration / Continuous Delivery / Continuous Deployment

> **Documento de Referencia Definitiva (Nivel PhD)**
> Ultima atualizacao: 2026-02-07
> Aplicacao: BOT Assessor -- Trading Bot

---

## Indice

1. [Conceitos Fundamentais](#1-conceitos-fundamentais)
2. [Continuous Integration (CI)](#2-continuous-integration-ci)
3. [Continuous Delivery (CD)](#3-continuous-delivery-cd)
4. [Continuous Deployment](#4-continuous-deployment)
5. [Design de Pipeline](#5-design-de-pipeline)
6. [Ferramentas -- Comparacao Detalhada](#6-ferramentas--comparacao-detalhada)
7. [GitOps](#7-gitops)
8. [Seguranca em CI/CD](#8-seguranca-em-cicd)
9. [DORA Metrics](#9-dora-metrics)
10. [CI/CD para o Trading Bot](#10-cicd-para-o-trading-bot)
11. [Anti-Patterns](#11-anti-patterns)
12. [Exemplos Praticos -- GitHub Actions](#12-exemplos-praticos--github-actions)
13. [Livros Fundamentais](#13-livros-fundamentais)
14. [Referencias](#14-referencias)

---

## 1. Conceitos Fundamentais

### 1.1 Definicoes -- CI vs CD (Delivery) vs CD (Deployment)

Martin Fowler define Continuous Integration como:

> "Continuous Integration is a software development practice where each member of a team
> merges their changes into a codebase together with their colleagues changes at least
> daily, and each of these integrations is verified by an automated build (including test)
> to detect integration errors as quickly as possible."
> -- Martin Fowler, 2006 (revisado 2024)

As tres praticas formam um **espectro de automacao** crescente:

```
+---------------------------------------------------------------------+
|                    ESPECTRO DE AUTOMACAO CI/CD                       |
+---------------------------------------------------------------------+
|                                                                     |
|  CI                    CD (Delivery)          CD (Deployment)       |
|  +-----------------+   +-----------------+   +-----------------+   |
|  | Build automatico|   | Pipeline completo|   | Deploy automatico|  |
|  | Testes auto     |-->| Staging auto     |-->| Producao auto    |  |
|  | Merge frequente |   | Release-ready    |   | Sem intervencao  |  |
|  | Feedback rapido |   | Manual gate prod |   | Feature flags    |  |
|  +-----------------+   +-----------------+   +-----------------+   |
|                                                                     |
|  AUTOMACAO:  Parcial        Alta                Total               |
|  RISCO:      Baixo          Medio               Requer maturidade   |
|  FREQUENCIA: A cada commit  Sob demanda         A cada commit       |
+---------------------------------------------------------------------+
```

**Continuous Integration (CI):** Desenvolvedores integram codigo na branch principal
pelo menos uma vez por dia. Cada integracao dispara build e testes automatizados. O
objetivo e detectar erros de integracao o mais rapido possivel.

**Continuous Delivery (CD - Delivery):** Extensao da CI onde o software e
continuamente mantido em estado deployavel. Todo commit que passa no pipeline e um
release candidate. O deploy em producao requer aprovacao manual (manual gate), mas pode
acontecer a qualquer momento com um clique.

**Continuous Deployment (CD - Deployment):** Todo commit que passa por todos os
estagios automatizados e implantado diretamente em producao sem intervencao humana. Apenas
um teste falhando impede o deploy. Requer alto nivel de maturidade em testes, monitoramento
e rollback automatico.

### 1.2 Trunk-Based Development vs Feature Branches

```
TRUNK-BASED DEVELOPMENT              FEATURE BRANCHES (Long-Lived)
============================          ============================

main ----*--*--*--*--*---->           main ----*-----------*---->
          |  |  |  |  |                        \         /
          |  |  |  |  |              feature-A  *--*--*-/
          v  v  v  v  v                              \
     (integracoes frequentes,         feature-B  *--*--*--*--*
      small commits,                                 |
      CI em cada merge)              (merge infrequente, merge conflicts,
                                      "integration hell")
```

**Trunk-Based Development** e a pratica recomendada para CI/CD:
- Commits pequenos e frequentes na branch principal (trunk/main)
- Branches de vida curta (horas, no maximo 1-2 dias)
- Feature flags para codigo incompleto
- Reduz merge conflicts drasticamente
- Feedback loop rapido

**Feature Branches de longa duracao** geram **Integration Hell**:
- Branches divergem significativamente ao longo de dias/semanas
- Merge conflicts complexos e dolorosos
- Bugs de integracao descobertos tarde demais
- Contradiz os principios de CI (integrar continuamente)
- Dificulta colaboracao entre desenvolvedores

> "Feature-based development has long development cycles and messy integrations, with
> large-scale integrations substantially extending the time to approve and ship new
> changes." -- Atlassian

### 1.3 Integration Hell

Integration Hell e a situacao onde integrar diferentes partes do codigo se torna um
processo doloroso, demorado e propenso a erros. Ocorre tipicamente quando:

1. **Merges infrequentes** -- codigo diverge por semanas
2. **Ausencia de testes automatizados** -- bugs descobertos apenas no merge
3. **Build manual** -- ninguem sabe se o codigo "funciona junto"
4. **Comunicacao insuficiente** -- desenvolvedores trabalham isolados

CI foi criada explicitamente para eliminar o Integration Hell.

---

## 2. Continuous Integration (CI)

### 2.1 Principios Fundamentais (Martin Fowler)

Os principios canonicos definidos por Martin Fowler:

1. **Repositorio central unico** -- todo codigo-fonte, scripts de build, configs e
   testes em um sistema de controle de versao
2. **Automatize o build** -- build reproduzivel com um unico comando
3. **Build auto-testavel** -- testes executam automaticamente como parte do build
4. **Commit diario** -- cada desenvolvedor integra pelo menos uma vez ao dia
5. **Cada commit dispara build** -- CI server monitora e executa builds
6. **Build rapido** -- idealmente < 10 minutos (XP recomenda)
7. **Teste em clone de producao** -- ambiente de teste deve espelhar producao
8. **Artefatos acessiveis** -- qualquer pessoa pode obter o executavel mais recente
9. **Visibilidade** -- todos veem o estado do build
10. **Deploy automatizado** -- deploy de um clique

### 2.2 Praticas Essenciais

```
CICLO DE CI -- FLUXO COMPLETO
===============================

  Developer        VCS (Git)         CI Server          Team
  =========        =========         =========          ====
      |                |                 |                |
      |-- git push --->|                 |                |
      |                |-- webhook ----->|                |
      |                |                 |-- checkout     |
      |                |                 |-- build        |
      |                |                 |-- unit tests   |
      |                |                 |-- lint         |
      |                |                 |-- SAST scan    |
      |                |                 |                |
      |                |                 |-- [PASS] ----->| (green badge)
      |                |                 |                |
      |                |                 |-- [FAIL] ----->| (red alert!)
      |                |                 |                |
      |<-- feedback ---|-----------------|                |
      |   (< 10 min)   |                 |                |
```

**Commit Often (Commit Frequente):**
- Commits pequenos e focados (single responsibility)
- Pelo menos 1x por dia, idealmente varias vezes
- Reduz risco e facilita bisect/debug

**Automated Build:**
- Build determinista e reproduzivel
- Sem dependencias externas nao versionadas
- Build-once: mesmo artefato promovido entre estagios

**Automated Tests:**
- Piramide de testes: muitos unitarios, poucos E2E
- Testes devem ser rapidos (< 10 min para o commit stage)
- Testes flakey sao veneno -- corrigi-los e prioridade

**Fast Feedback:**
- Pipeline de commit deve completar em < 10 minutos
- Notificacao imediata em caso de falha
- Developer deve saber o resultado antes de iniciar nova tarefa

**Broken Build = Prioridade Maxima:**
- Ninguem faz commit enquanto o build esta quebrado
- Quem quebrou o build deve corrigir imediatamente
- Se nao conseguir corrigir em 10 min, reverter o commit

### 2.3 CI Server -- Responsabilidades

O CI Server (Jenkins, GitHub Actions, GitLab CI, etc.) e responsavel por:

| Responsabilidade | Descricao |
|---|---|
| Monitorar VCS | Detectar novos commits via webhook ou polling |
| Checkout | Obter a versao mais recente do codigo |
| Build | Compilar/construir o projeto |
| Testes | Executar suites de teste automatizadas |
| Analise | Lint, SAST, quality gates |
| Artefatos | Armazenar builds e resultados de testes |
| Notificacao | Alertar equipe sobre sucesso/falha |
| Historico | Manter registro de todos os builds |

---

## 3. Continuous Delivery (CD)

### 3.1 O Deployment Pipeline

O conceito central de Continuous Delivery (do livro de Jez Humble e David Farley, 2010)
e o **Deployment Pipeline** -- uma sequencia automatizada de estagios que todo commit
deve percorrer antes de ser considerado production-ready.

```
DEPLOYMENT PIPELINE (Jez Humble & David Farley)
=================================================

+----------+    +------------+    +----------+    +--------+    +------------+
|  COMMIT  |--->| ACCEPTANCE |--->| CAPACITY |--->| MANUAL |--->| PRODUCTION |
|  STAGE   |    |   STAGE    |    |  STAGE   |    | STAGE  |    |   STAGE    |
+----------+    +------------+    +----------+    +--------+    +------------+
     |               |                |               |               |
  - Build         - Functional     - Performance   - UAT           - Deploy
  - Unit tests      tests          - Load tests    - Exploratory   - Smoke
  - Lint          - Integration    - Stress tests    testing         tests
  - SAST            tests          - Soak tests    - Approval      - Monitor
  - Package       - Contract                         gate
                    tests
     |               |                |               |               |
  ~5 min          ~30 min          ~1-2 hours      Humano         ~5 min

  CONFIANCA: Baixa -----------------------------------------> Alta
  VELOCIDADE: Rapido ----------------------------------------> Lento
  ESCOPO: Unitario ------------------------------------------> Sistema
```

### 3.2 Principios de Continuous Delivery

1. **Todo commit e um release candidate** -- qualquer commit que passa no pipeline
   pode ser deployado em producao
2. **Build once, deploy everywhere** -- o mesmo artefato (binario, container image)
   e promovido entre ambientes, nunca reconstruido
3. **Ambientes identicos** -- Dev, Staging, Production devem ser o mais identicos
   possivel (Infrastructure as Code)
4. **Deploy como rotina** -- deploy deve ser um evento rotineiro, nao um "big bang"
5. **Feedback loop continuo** -- metricas de producao alimentam decisoes
6. **Manual gate para producao** -- humano decide QUANDO fazer deploy, nao SE funciona

### 3.3 Release on Demand

Continuous Delivery desacopla **deploy** de **release**:

```
+---------------------------+     +---------------------------+
|         DEPLOY            |     |         RELEASE           |
+---------------------------+     +---------------------------+
| Colocar codigo no server  |     | Disponibilizar feature    |
| Ato tecnico               |     | ao usuario final          |
| Automatizado              |     | Decisao de negocio        |
| Pode ser frequente        |     | Pode usar feature flags   |
| Baixo risco (se bem feito)|     | Controlada, gradual       |
+---------------------------+     +---------------------------+

Deploy != Release

Voce pode deployar codigo em producao sem que nenhum usuario veja
a mudanca (usando feature flags, dark launches, etc.)
```

---

## 4. Continuous Deployment

### 4.1 Conceito

Continuous Deployment e a evolucao maxima: **todo commit que passa por todos os
estagios automatizados do pipeline e automaticamente deployado em producao.** Nao ha
manual gate. A unica coisa que impede um commit de ir para producao e um teste falhando.

Requer:
- Suite de testes extremamente robusta e abrangente
- Monitoramento em tempo real
- Rollback automatico
- Feature flags maduros
- Cultura de qualidade no time inteiro

### 4.2 Estrategias de Deploy

#### Blue-Green Deployment

```
                    Load Balancer
                         |
              +----------+----------+
              |                     |
         +----v----+          +----v----+
         |  BLUE   |          |  GREEN  |
         | (v1.2)  |          | (v1.3)  |
         | ATIVO   |          | STANDBY |
         +---------+          +---------+

Passo 1: Deploy v1.3 no GREEN (usuarios ainda no BLUE)
Passo 2: Smoke tests no GREEN
Passo 3: Switch load balancer: BLUE -> GREEN
Passo 4: GREEN agora e ATIVO
Passo 5: Se problemas, rollback instantaneo: GREEN -> BLUE

Vantagens: Zero downtime, rollback instantaneo
Desvantagens: Requer 2x infraestrutura, migracao de DB complexa
```

#### Canary Release

```
                    Load Balancer
                         |
              +----------+----------+
              |                     |
         +----v----+          +----v----+
         | STABLE  |          | CANARY  |
         |  (95%)  |          |  (5%)   |
         |  v1.2   |          |  v1.3   |
         +---------+          +---------+

Passo 1: Deploy v1.3 em um subconjunto (canary) -- 5% do trafego
Passo 2: Monitorar metricas (error rate, latencia, business KPIs)
Passo 3: Se metricas OK, aumentar gradualmente: 5% -> 25% -> 50% -> 100%
Passo 4: Se metricas ruins, rollback automatico: canary -> 0%

Vantagens: Risco minimo, feedback real de producao
Desvantagens: Complexidade de roteamento, observabilidade obrigatoria
```

#### Rolling Update

```
Cluster com 4 instancias:

Passo 1:  [v1.2] [v1.2] [v1.2] [v1.2]   <- todas v1.2
Passo 2:  [v1.3] [v1.2] [v1.2] [v1.2]   <- 1 atualizada
Passo 3:  [v1.3] [v1.3] [v1.2] [v1.2]   <- 2 atualizadas
Passo 4:  [v1.3] [v1.3] [v1.3] [v1.2]   <- 3 atualizadas
Passo 5:  [v1.3] [v1.3] [v1.3] [v1.3]   <- todas v1.3

Vantagens: Sem infraestrutura extra, suportado nativamente pelo Kubernetes
Desvantagens: Rollback mais lento, versoes coexistem temporariamente
```

#### Feature Flags

```python
# Feature flags permitem deploy sem release
# Codigo deployado, mas feature escondida atras de flag

class TradingEngine:
    def execute_order(self, order: Order) -> OrderResult:
        if feature_flags.is_enabled("new_risk_model", user=order.trader):
            # Nova logica -- ativa apenas para traders selecionados
            return self._execute_with_new_risk_model(order)
        else:
            # Logica atual -- padrao para todos
            return self._execute_with_current_risk_model(order)

# Feature flags podem ser combinados com canary:
# 1. Deploy codigo com flag desligada (safe)
# 2. Ligar flag para 5% dos usuarios (canary)
# 3. Monitorar metricas
# 4. Gradualmente aumentar para 100%
# 5. Remover flag e codigo legado (cleanup)
```

Feature flags sao **especialmente criticos para trading bots**:
- Ativar/desativar estrategias sem redeploy
- A/B testing de parametros de trading
- Kill switch para emergencias de mercado
- Rollout gradual de novos modelos

---

## 5. Design de Pipeline

### 5.1 Estagios do Pipeline Moderno

```
PIPELINE CI/CD MODERNO -- ESTAGIOS COMPLETOS
==============================================

+-------+   +-------+   +----------+   +---------+   +----------+
| BUILD |-->| TEST  |-->| SECURITY |-->| STAGING |-->| INT.TEST |
+-------+   +-------+   +----------+   +---------+   +----------+
    |            |            |              |              |
 - Compile    - Unit       - SAST         - Deploy       - Integration
 - Deps       - Lint       - DAST           staging      - Contract
 - Docker     - Type       - SCA          - Smoke        - E2E
   build        check     - Secrets         tests        - Performance
 - Artifacts  - Coverage    scan          - Config         (amostra)
                           - SBOM           verify
                           - License
                                                              |
                                                              v
                                               +----------------------------+
                                               | DEPLOY PRODUCTION          |
                                               +----------------------------+
                                               | - Approval gate (opcional) |
                                               | - Blue-green / Canary      |
                                               | - Smoke tests              |
                                               | - Health checks            |
                                               | - Rollback automatico      |
                                               | - Notificacao              |
                                               +----------------------------+
```

### 5.2 Paralelismo

O paralelismo e fundamental para manter o pipeline rapido:

```
PIPELINE SEQUENCIAL (LENTO - Anti-pattern):
============================================
Build -> Lint -> Unit -> SAST -> SCA -> Integration -> Deploy
 3min    2min   5min    4min   2min      10min         3min
                                                    TOTAL: 29 min

PIPELINE PARALELO (RAPIDO - Best practice):
============================================
              +-- Lint (2 min) ----+
              |                    |
Build (3min) -+-- Unit (5 min) ---+--> Integration (10 min) --> Deploy (3 min)
              |                    |
              +-- SAST (4 min) ---+
              |                    |
              +-- SCA  (2 min) ---+
                                                    TOTAL: 21 min
                                                    (-28% tempo)
```

### 5.3 Caching

Estrategias de cache que reduzem drasticamente o tempo de pipeline:

| Tipo de Cache | O que cachear | Impacto |
|---|---|---|
| **Dependencias** | `node_modules/`, `.venv/`, `.m2/` | -60% tempo de install |
| **Docker layers** | Layers intermediarias do Dockerfile | -90% tempo de build |
| **Build artifacts** | Binarios compilados, wheel files | -50% tempo de build |
| **Test results** | Resultados de testes anteriores | Smart test selection |
| **Lock files** | Cache key baseada em lock file hash | Invalidacao precisa |

### 5.4 Artefatos

```
GERENCIAMENTO DE ARTEFATOS
============================

Build Stage:
  |
  +--> Docker Image: ghcr.io/org/bot:sha-abc123
  +--> SBOM: sbom-sha-abc123.json
  +--> Test Report: junit-results.xml
  +--> Coverage: coverage-report.html
  +--> Security: sast-report.sarif
  |
  v
Artifact Registry (imutavel, versionado, assinado)

Regra: BUILD ONCE, DEPLOY EVERYWHERE
- O mesmo artefato e promovido: Dev -> Staging -> Production
- Nunca reconstrua para ambientes diferentes
- Diferencas de ambiente = variaveis de configuracao, nao builds
```

---

## 6. Ferramentas -- Comparacao Detalhada

### 6.1 Tabela Comparativa

| Caracteristica | GitHub Actions | GitLab CI | Jenkins | CircleCI | ArgoCD | Tekton |
|---|---|---|---|---|---|---|
| **Tipo** | CI/CD SaaS | CI/CD SaaS/Self | CI/CD Self-hosted | CI/CD SaaS | CD GitOps | CI K8s-native |
| **Hospedagem** | Cloud/Self | Cloud/Self | Self-hosted | Cloud/Self | K8s | K8s |
| **Config** | YAML | YAML | Groovy/YAML | YAML | YAML/Helm | YAML CRDs |
| **Marketplace** | Extenso | Bom | 1800+ plugins | Orbs | Limitado | Catalog |
| **K8s nativo** | Nao | Parcial | Via plugin | Nao | Sim | Sim |
| **GitOps** | Via tools | Built-in | Via plugin | Via tools | Core | Via Argo |
| **Security** | Dependabot,SARIF | SAST/DAST/SCA | Via plugins | Contextos | RBAC | RBAC |
| **Custo (free)** | 2000 min/mes | 400 min/mes | Gratis (OSS) | 6000 min/mes | Gratis (OSS) | Gratis (OSS) |
| **Curva aprendizado** | Baixa | Media | Alta | Baixa | Media | Alta |
| **Ideal para** | GitHub repos | GitLab repos | Enterprise custom | Startups | K8s deploy | K8s CI |

### 6.2 GitHub Actions -- Em Detalhe

**Vantagens:**
- Integracao nativa com GitHub (PRs, Issues, Releases)
- Marketplace massivo com Actions pre-construidas
- Matrix builds para testar multiplas versoes
- Runners self-hosted para workloads especiais
- Secrets management integrado
- OIDC para cloud auth sem secrets estaticos

**Desvantagens:**
- Vendor lock-in com GitHub
- Debugging de workflows pode ser difícil
- Custo em repos privados com uso intensivo
- Sem dashboard unificado de deploys

### 6.3 GitLab CI -- Em Detalhe

**Vantagens:**
- Plataforma all-in-one (VCS + CI/CD + Registry + Security)
- Security scanning built-in (SAST, DAST, SCA, Container Scanning)
- Auto DevOps para setup automatico
- Ambientes e review apps nativos
- Compliance frameworks

**Desvantagens:**
- Pode ser pesado para projetos simples
- Runners precisam de manutencao
- UI pode ser complexa

### 6.4 Jenkins -- Em Detalhe

**Vantagens:**
- Maximo controle e customizacao
- 1800+ plugins para qualquer integracao
- Gratis e open-source
- Pode rodar em qualquer infraestrutura
- Comunidade massiva

**Desvantagens:**
- Manutencao significativa (servidor, plugins, updates)
- Seguranca depende de configuracao manual
- UI datada
- Jenkinsfile pode se tornar complexo
- "Plugin hell" -- dependencias entre plugins

### 6.5 Kubernetes-Native: ArgoCD + Tekton

**ArgoCD** (Continuous Deployment para K8s):
- GitOps-native: Git como single source of truth
- Sincronizacao automatica do cluster com o Git
- UI web rica para visualizacao de aplicacoes
- Suporte a Helm, Kustomize, plain YAML
- Health checks e auto-healing
- Rollback com um clique

**Tekton** (CI para K8s):
- Pipelines como Kubernetes CRDs
- Reusabilidade via TaskRun e PipelineRun
- Catalog de tasks pre-construidas
- Escala nativamente no cluster
- Event-driven via Tekton Triggers

**Combinacao recomendada:** Tekton para CI + ArgoCD para CD

---

## 7. GitOps

### 7.1 Principios do GitOps

GitOps e um paradigma operacional que usa Git como **single source of truth** para
infraestrutura declarativa e aplicacoes.

```
GITOPS -- FLUXO PULL-BASED
=============================

Developer          Git Repo            GitOps Operator       K8s Cluster
=========          ========            ===============       ===========
    |                  |                     |                    |
    |-- git push ----->|                     |                    |
    |  (manifests)     |                     |                    |
    |                  |<---- poll/watch ----|                    |
    |                  |                     |                    |
    |                  |---- diff detected ->|                    |
    |                  |                     |                    |
    |                  |                     |-- reconcile ------>|
    |                  |                     |   (apply changes)  |
    |                  |                     |                    |
    |                  |                     |<-- status ---------|
    |                  |                     |                    |
    |                  |<-- status update ---|                    |
    |                  |                     |                    |

PUSH-BASED (tradicional):     PULL-BASED (GitOps):
CI server tem credenciais     Operator no cluster puxa mudancas
de acesso ao cluster          Cluster nao expoe credenciais
Risco de seguranca maior      Principio de menor privilegio
```

### 7.2 Os Quatro Principios do GitOps

1. **Declarativo** -- todo sistema desejado e descrito declarativamente
2. **Versionado e imutavel** -- estado desejado armazenado em Git (auditavel)
3. **Puxado automaticamente** -- agentes aprovam mudancas automaticamente
4. **Reconciliacao continua** -- agentes observam e corrigem drift

### 7.3 ArgoCD vs Flux

| Aspecto | ArgoCD | Flux |
|---|---|---|
| **UI** | Web UI rica e completa | CLI-first, UI via add-on |
| **Multi-tenant** | Forte suporte | Suporte basico |
| **Multi-cluster** | Nativo | Via Flux + provider |
| **Complexidade** | Mais recursos = mais complexo | Leve e modular |
| **Helm** | Suporte nativo | Helm Controller |
| **Comunidade** | CNCF Graduated | CNCF Graduated |
| **Ideal para** | Equipes grandes, visibilidade | Equipes menores, simplicidade |

---

## 8. Seguranca em CI/CD

### 8.1 Shift-Left Security

```
SHIFT-LEFT: SEGURANCA EM CADA ESTAGIO
========================================

        Custo de correcao
        ^
        |
   100x |                                          * Producao
        |
    50x |                              * Staging
        |
    10x |                  * Testes
        |
     5x |        * Build
        |
     1x | * IDE
        |
        +--------------------------------------------> Tempo
          Code    Build    Test    Stage    Prod

Quanto mais cedo detectar, mais barato corrigir.
Shift-left = mover seguranca para a ESQUERDA (mais cedo no pipeline).
```

### 8.2 Tipos de Scanning

**SAST (Static Application Security Testing):**
- Analisa codigo-fonte sem executar
- Detecta SQL injection, XSS, buffer overflow
- Ferramentas: Semgrep, SonarQube, CodeQL, Bandit (Python)
- Executa no commit stage (rapido)

**DAST (Dynamic Application Security Testing):**
- Testa a aplicacao em execucao
- Simula ataques reais (black-box)
- Ferramentas: OWASP ZAP, Burp Suite, Nuclei
- Executa no staging stage

**SCA (Software Composition Analysis):**
- Analisa dependencias por vulnerabilidades conhecidas (CVEs)
- Verifica licencas de dependencias
- Ferramentas: Dependabot, Snyk, Trivy, Safety (Python)
- Executa no commit stage

**Container Scanning:**
- Analisa imagens Docker por vulnerabilidades
- Ferramentas: Trivy, Grype, Clair
- Executa apos o docker build

### 8.3 Secrets Management

```
HIERARQUIA DE SECRETS MANAGEMENT
===================================

NUNCA:
  x Hardcoded no codigo
  x Commitado no Git (.env, credentials.json)
  x Variavel de ambiente em plaintext no CI

BASICO:
  ~ Secrets do CI/CD (GitHub Secrets, GitLab Variables)
  ~ Encriptados, mas gerenciamento limitado

RECOMENDADO:
  + HashiCorp Vault / AWS Secrets Manager / Azure Key Vault
  + Rotacao automatica de secrets
  + Audit log de acessos
  + OIDC para autenticacao sem secrets estaticos

AVANCADO:
  ++ SOPS para secrets encriptados no Git
  ++ Sealed Secrets para Kubernetes
  ++ External Secrets Operator
  ++ Workload Identity (GCP) / IRSA (AWS)
```

**HashiCorp Vault:**
- Secrets engine com multiplos backends
- Dynamic secrets (credenciais temporarias)
- PKI para certificados
- Transit engine para encrypt/decrypt
- Audit logging completo

**AWS Secrets Manager:**
- Rotacao automatica integrada com RDS
- Integracao nativa com servicos AWS
- Versionamento de secrets
- Cross-account access

### 8.4 Supply Chain Security

**SLSA (Supply-chain Levels for Software Artifacts):**

```
SLSA LEVELS (Pronuncia-se "salsa")
=====================================

Level 0: Nenhuma garantia
Level 1: Provenance existe (documentacao do build)
Level 2: Provenance assinada, build em servico hospedado
Level 3: Build isolado, source verificada
Level 4: Dependencias verificadas, build hermetico (mais rigoroso)

Cada level aumenta confianca na integridade do artefato.
```

**Sigstore:**
- Assinatura de artefatos sem gerenciar chaves
- cosign: assinar container images
- Rekor: log de transparencia
- Fulcio: CA efemero baseado em OIDC

**SBOM (Software Bill of Materials):**
- Lista completa de componentes do software
- Formatos: SPDX, CycloneDX
- Ferramentas: Syft, Trivy
- Obrigatorio em contratos governamentais (EO 14028)

### 8.5 Signed Commits

```bash
# Configurar GPG para commits assinados
git config --global commit.gpgsign true
git config --global user.signingkey <KEY_ID>

# Verificar commit assinado
git log --show-signature

# GitHub: habilitar "Vigilant mode"
# Todos os commits nao-assinados mostram "Unverified"
```

---

## 9. DORA Metrics

### 9.1 As Quatro Metricas Chave

As metricas DORA (DevOps Research and Assessment), criadas por Nicole Forsgren, Jez
Humble e Gene Kim, sao o padrao da industria para medir performance de entrega de
software.

```
DORA METRICS -- AS 4 METRICAS CHAVE
======================================

+---------------------------+  +---------------------------+
|     VELOCIDADE (Throughput)  |  |   ESTABILIDADE (Stability)  |
+---------------------------+  +---------------------------+
|                           |  |                           |
| Deployment Frequency      |  | Change Failure Rate       |
| Com que frequencia voce   |  | Qual % dos deploys causa  |
| faz deploy em producao?   |  | falha que requer fix?     |
|                           |  |                           |
| Lead Time for Changes     |  | Time to Restore Service   |
| Quanto tempo do commit    |  | Quanto tempo para         |
| ate rodar em producao?    |  | restaurar o servico apos  |
|                           |  | uma falha?                |
+---------------------------+  +---------------------------+
```

### 9.2 Classificacao de Performance

| Metrica | Elite | High | Medium | Low |
|---|---|---|---|---|
| **Deployment Frequency** | On-demand (multiplas/dia) | 1x/semana a 1x/mes | 1x/mes a 1x/6meses | < 1x/6meses |
| **Lead Time for Changes** | < 1 hora | 1 dia a 1 semana | 1 semana a 1 mes | 1 a 6 meses |
| **Change Failure Rate** | 0-15% | 16-30% | 16-30% | > 46% |
| **Time to Restore** | < 1 hora | < 1 dia | 1 dia a 1 semana | > 6 meses |

### 9.3 Insight Fundamental do Accelerate

> "High performers do NOT trade speed for stability. They achieve BOTH."
> -- Nicole Forsgren, Jez Humble, Gene Kim (Accelerate, 2018)

As metricas DORA demonstraram estatisticamente que:
- Velocidade e estabilidade NAO sao trade-offs
- Organizacoes Elite sao melhores em AMBAS as dimensoes
- CI/CD e o habilitador tecnico principal
- Trunk-based development correlaciona com alta performance
- Automacao de testes e o preditor mais forte

### 9.4 Aplicacao ao Trading Bot

| Metrica | Target para o Bot | Como Medir |
|---|---|---|
| **Deployment Frequency** | 1-5x por semana | Deploys em producao / semana |
| **Lead Time** | < 4 horas | Commit timestamp -> deploy timestamp |
| **Change Failure Rate** | < 5% | Deploys com rollback / total deploys |
| **Time to Restore** | < 30 minutos | Alerta -> servico restaurado |

---

## 10. CI/CD para o Trading Bot

### 10.1 Pipeline Completo do Trading Bot

```
PIPELINE CI/CD DO TRADING BOT -- VISAO COMPLETA
=================================================

                    +------------------+
                    |   git push /     |
                    |   Pull Request   |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   LINT & FORMAT  |  <-- ruff, black, isort, mypy
                    +--------+---------+
                             |
                    +--------v---------+
                    |   UNIT TESTS     |  <-- pytest (< 5 min)
                    |   + Coverage     |      coverage >= 80%
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     | INTEGRATION|  |  SECURITY   |  |  TYPE CHECK |
     | TESTS      |  |  SCAN       |  |  (mypy)     |
     | (API mocks)|  | SAST+SCA   |  |             |
     +--------+---+  +------+------+  +----+--------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v---------+
                    | BACKTEST         |  <-- Regressao de estrategias
                    | REGRESSION       |      Comparar com baseline
                    | (Dados hist.)    |      Sharpe >= threshold
                    +--------+---------+      Max drawdown <= limit
                             |
                    +--------v---------+
                    | BUILD DOCKER     |  <-- Multi-stage build
                    | IMAGE            |      Scan com Trivy
                    +--------+---------+
                             |
                    +--------v---------+
                    | DEPLOY STAGING   |  <-- Ambiente identico a prod
                    | + SMOKE TESTS    |      Health checks
                    +--------+---------+
                             |
                    +--------v---------+
                    | PAPER TRADING    |  <-- Validacao com dados reais
                    | VALIDATION       |      Sem dinheiro real
                    | (4-24 horas)     |      Metricas de performance
                    +--------+---------+
                             |
                    +--------v---------+
                    | APPROVAL GATE    |  <-- Revisao humana obrigatoria
                    | (Manual)         |      Checklist de deploy
                    +--------+---------+
                             |
                    +--------v---------+
                    | DEPLOY PRODUCTION|  <-- Blue-green deployment
                    | (com feature     |      Rollback automatico
                    |  flags)          |      Monitoring ativo
                    +--------+---------+
                             |
                    +--------v---------+
                    | POST-DEPLOY      |  <-- Health checks continuos
                    | MONITORING       |      Alertas de anomalia
                    | + AUTO-ROLLBACK  |      Circuit breaker
                    +------------------+
```

### 10.2 Detalhamento de Cada Estagio

#### Stage 1: Lint & Format (Gate de Qualidade de Codigo)

```yaml
# Ferramentas para Python trading bot:
# - ruff: linter ultrarapido (substitui flake8, isort, pyflakes)
# - black: formatador opinativo
# - mypy: type checking estatico
# - bandit: security linting para Python

lint:
  tools:
    - ruff check .
    - ruff format --check .
    - mypy src/ --strict
    - bandit -r src/ -ll
  gate: TODOS devem passar (zero tolerance)
  tempo: ~1-2 minutos
```

#### Stage 2: Unit Tests + Coverage

```python
# Testes unitarios para trading bot devem cobrir:

# 1. Logica de estrategia (isolada de API/exchange)
class TestMovingAverageCrossover:
    def test_golden_cross_generates_buy_signal(self):
        """SMA(50) cruza acima de SMA(200) -> BUY"""
        strategy = MovingAverageCrossover(fast=50, slow=200)
        signal = strategy.evaluate(prices_with_golden_cross)
        assert signal == Signal.BUY

    def test_death_cross_generates_sell_signal(self):
        """SMA(50) cruza abaixo de SMA(200) -> SELL"""
        strategy = MovingAverageCrossover(fast=50, slow=200)
        signal = strategy.evaluate(prices_with_death_cross)
        assert signal == Signal.SELL

# 2. Risk management
class TestRiskManager:
    def test_position_size_respects_max_risk(self):
        rm = RiskManager(max_risk_per_trade=0.02)  # 2%
        size = rm.calculate_position_size(
            capital=100000, entry=50000, stop_loss=49000
        )
        assert size * (50000 - 49000) <= 100000 * 0.02

# 3. Order validation
class TestOrderValidator:
    def test_rejects_order_exceeding_daily_limit(self):
        validator = OrderValidator(daily_limit=10)
        for _ in range(10):
            validator.validate(mock_order())  # OK
        with pytest.raises(DailyLimitExceeded):
            validator.validate(mock_order())  # 11th -> reject

# Coverage gate: >= 80% (idealmente 90% para logica de trading)
```

#### Stage 3: Integration Tests

```python
# Integration tests com mocks de exchange API
class TestExchangeIntegration:
    @pytest.fixture
    def mock_exchange(self):
        """Mock da API da exchange com respostas realistas"""
        with responses.RequestsMock() as rsps:
            rsps.add(
                responses.GET,
                "https://api.exchange.com/v1/ticker",
                json={"price": "50000.00", "volume": "1234.56"},
            )
            yield rsps

    def test_fetch_price_returns_decimal(self, mock_exchange):
        client = ExchangeClient(api_key="test")
        price = client.get_price("BTC/USDT")
        assert isinstance(price, Decimal)
        assert price == Decimal("50000.00")
```

#### Stage 4: Backtest Regression

```python
# Backtest regression: garantir que mudancas nao degradam performance

class TestBacktestRegression:
    """
    Executa backtests com dados historicos fixos e compara
    com baseline de metricas.
    """

    BASELINE_METRICS = {
        "sharpe_ratio": 1.5,
        "max_drawdown": -0.15,  # -15%
        "win_rate": 0.55,       # 55%
        "profit_factor": 1.8,
        "total_return": 0.25,   # 25%
    }
    TOLERANCE = 0.10  # 10% de degradacao permitida

    def test_strategy_meets_baseline(self, historical_data):
        engine = BacktestEngine(data=historical_data)
        results = engine.run(strategy=MovingAverageCrossover())

        for metric, baseline in self.BASELINE_METRICS.items():
            actual = getattr(results, metric)
            threshold = baseline * (1 - self.TOLERANCE)
            assert actual >= threshold, (
                f"{metric}: {actual:.4f} < threshold {threshold:.4f} "
                f"(baseline: {baseline:.4f})"
            )
```

#### Stage 5: Paper Trading Validation

```
PAPER TRADING VALIDATION
==========================

Proposito: Validar com dados de mercado REAIS, mas sem capital real.

Duracao: 4-24 horas (dependendo da frequencia da estrategia)

Metricas monitoradas:
  - Execucao de ordens (latencia, slippage simulado)
  - Sinais gerados vs esperado
  - Error rate da API
  - Memory leaks / resource usage
  - Consistencia com backtest

Criterios de aprovacao:
  - Zero erros criticos
  - Latencia media < 100ms
  - Sinais coerentes com backtest (+/- 20%)
  - Sem memory leaks (RSS estavel)

Se falhar: Pipeline para. Deploy bloqueado.
```

#### Stage 6: Approval Gate + Deploy Production

```
APPROVAL GATE -- CHECKLIST
=============================

[ ] Unit tests passaram (100%)
[ ] Integration tests passaram
[ ] Backtest regression: metricas dentro do threshold
[ ] Security scan: zero vulnerabilidades criticas/altas
[ ] Paper trading: validacao positiva
[ ] Changelog revisado
[ ] Rollback plan documentado
[ ] Equipe notificada

Aprovadores: Pelo menos 1 senior developer + 1 risk manager
```

### 10.3 Rollback Automatico para Trading Bot

```python
# Rollback automatico baseado em metricas de producao

class ProductionMonitor:
    """
    Monitora metricas criticas pos-deploy e aciona rollback
    automatico se thresholds forem violados.
    """

    ROLLBACK_TRIGGERS = {
        "error_rate": 0.05,          # > 5% de erros
        "latency_p99_ms": 5000,      # > 5s de latencia P99
        "drawdown_since_deploy": -0.03,  # > 3% drawdown desde deploy
        "consecutive_losses": 10,     # 10 perdas seguidas
        "api_failure_rate": 0.10,    # > 10% falhas de API
    }

    async def watch(self, deployment_id: str):
        """Monitora por 1 hora apos deploy."""
        start = datetime.now()
        while (datetime.now() - start) < timedelta(hours=1):
            metrics = await self.collect_metrics()

            for metric, threshold in self.ROLLBACK_TRIGGERS.items():
                if self._violates_threshold(metrics[metric], threshold):
                    logger.critical(
                        f"ROLLBACK TRIGGERED: {metric}="
                        f"{metrics[metric]} > {threshold}"
                    )
                    await self.execute_rollback(deployment_id)
                    await self.notify_team(metric, metrics[metric])
                    return RollbackResult.TRIGGERED

            await asyncio.sleep(30)  # Check a cada 30s

        return RollbackResult.NOT_NEEDED
```

### 10.4 Feature Flags para Estrategias de Trading

```python
# Sistema de feature flags para controlar estrategias

from dataclasses import dataclass
from enum import Enum

class StrategyStatus(Enum):
    DISABLED = "disabled"
    PAPER_ONLY = "paper_only"
    CANARY = "canary"        # 10% do capital
    PRODUCTION = "production"  # 100% do capital

@dataclass
class StrategyConfig:
    name: str
    status: StrategyStatus
    capital_allocation: float  # 0.0 a 1.0
    max_position_size: float
    pairs: list[str]

# Configuracao via feature flags (pode mudar sem redeploy)
STRATEGY_FLAGS = {
    "momentum_v2": StrategyConfig(
        name="Momentum V2",
        status=StrategyStatus.CANARY,
        capital_allocation=0.10,  # 10% do capital
        max_position_size=0.05,
        pairs=["BTC/USDT"],
    ),
    "mean_reversion_v1": StrategyConfig(
        name="Mean Reversion V1",
        status=StrategyStatus.PRODUCTION,
        capital_allocation=0.40,
        max_position_size=0.10,
        pairs=["BTC/USDT", "ETH/USDT"],
    ),
    "ml_signal_v3": StrategyConfig(
        name="ML Signal V3",
        status=StrategyStatus.PAPER_ONLY,  # Ainda em teste
        capital_allocation=0.0,
        max_position_size=0.0,
        pairs=["BTC/USDT"],
    ),
}
```

---

## 11. Anti-Patterns

### 11.1 Anti-Patterns de CI

| Anti-Pattern | Problema | Solucao |
|---|---|---|
| **Infrequent commits** | Merge conflicts, integration hell | Commit pelo menos 1x/dia |
| **Broken build ignorado** | Falsa sensacao de seguranca | Build quebrado = prioridade #1 |
| **Testes lentos** | Developers evitam rodar testes | Pipeline < 10 min (commit stage) |
| **Testes flakey** | Resultados nao-confiaveis | Fix ou delete testes instáveis |
| **Build nao reproduzivel** | "Funciona na minha maquina" | Docker, lock files, pinned deps |
| **Sem testes** | CI sem valor | Coverage gate obrigatorio |

### 11.2 Anti-Patterns de CD

| Anti-Pattern | Problema | Solucao |
|---|---|---|
| **Snowflake servers** | Ambientes diferentes = bugs | Infrastructure as Code |
| **Manual deploy** | Lento, propenso a erro | Automacao completa |
| **Big bang releases** | Muito mudou, difícil debug | Deploys pequenos e frequentes |
| **Sem rollback plan** | Panico quando falha | Rollback automatico testado |
| **Hardcoded secrets** | Vazamento de credenciais | Vault / Secrets Manager |
| **Build per environment** | Artefatos inconsistentes | Build once, deploy everywhere |

### 11.3 Anti-Patterns de Pipeline

| Anti-Pattern | Problema | Solucao |
|---|---|---|
| **Pipeline monolitico** | Um teste flakey bloqueia tudo | Stages independentes, paralelos |
| **Sem cache** | Pipeline lento (30+ min) | Cache de deps, Docker layers |
| **Over-testing em CI** | E2E em todo commit | Piramide de testes, E2E em staging |
| **Sem monitoramento** | Falhas silenciosas | Alertas, dashboards, DORA metrics |
| **YAML duplicado** | Manutencao impossivel | Templates, reusable workflows |
| **Sem security scan** | Vulnerabilidades em producao | Shift-left, SAST/SCA no commit |

### 11.4 Anti-Patterns Especificos de Trading Bot

| Anti-Pattern | Problema | Solucao |
|---|---|---|
| **Deploy em horario de mercado volatil** | Risco de perda durante estabilizacao | Deploy windows em baixa volatilidade |
| **Sem paper trading validation** | Estrategia falha em producao | Paper trading obrigatorio pre-deploy |
| **Backtest sem dados out-of-sample** | Overfitting | Walk-forward validation |
| **Sem kill switch** | Perda descontrolada | Circuit breaker com auto-rollback |
| **Feature flag cleanup** | Divida tecnica acumula | TTL em flags, remocao programada |
| **Sem approval gate** | Deploy automatico de estrategia ruim | Revisao humana para producao |

---

## 12. Exemplos Praticos -- GitHub Actions

### 12.1 Pipeline CI Completo para Trading Bot

```yaml
# .github/workflows/ci.yml
name: Trading Bot CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write

env:
  PYTHON_VERSION: "3.12"
  POETRY_VERSION: "1.8"

jobs:
  # ============================================================
  # Stage 1: Lint & Format (Gate de qualidade)
  # ============================================================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-

      - name: Install dependencies
        run: |
          pip install ruff mypy bandit

      - name: Ruff lint
        run: ruff check . --output-format=github

      - name: Ruff format check
        run: ruff format --check .

      - name: MyPy type check
        run: mypy src/ --strict --ignore-missing-imports

      - name: Bandit security lint
        run: bandit -r src/ -ll -f json -o bandit-report.json || true

      - name: Upload Bandit report
        uses: actions/upload-artifact@v4
        with:
          name: bandit-report
          path: bandit-report.json

  # ============================================================
  # Stage 2: Unit Tests + Coverage
  # ============================================================
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/pip
            .venv
          key: ${{ runner.os }}-venv-${{ hashFiles('**/poetry.lock', '**/requirements*.txt') }}

      - name: Install dependencies
        run: |
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio

      - name: Run unit tests with coverage
        run: |
          source .venv/bin/activate
          pytest tests/unit/ \
            --cov=src \
            --cov-report=xml:coverage.xml \
            --cov-report=html:coverage-html \
            --cov-fail-under=80 \
            --junitxml=junit-results.xml \
            -v

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: |
            coverage.xml
            coverage-html/

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: junit-results.xml

  # ============================================================
  # Stage 3: Integration Tests (paralelo com Security)
  # ============================================================
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: trading_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/pip
            .venv
          key: ${{ runner.os }}-venv-${{ hashFiles('**/poetry.lock', '**/requirements*.txt') }}

      - name: Install dependencies
        run: |
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt
          pip install pytest pytest-asyncio

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/trading_test
          REDIS_URL: redis://localhost:6379
        run: |
          source .venv/bin/activate
          pytest tests/integration/ -v --timeout=120

  # ============================================================
  # Stage 3b: Security Scan (paralelo com Integration)
  # ============================================================
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner (dependencies)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Check for critical vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL'
          exit-code: '1'

  # ============================================================
  # Stage 4: Backtest Regression
  # ============================================================
  backtest-regression:
    name: Backtest Regression
    runs-on: ubuntu-latest
    needs: [integration-tests, security-scan]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/pip
            .venv
          key: ${{ runner.os }}-venv-${{ hashFiles('**/poetry.lock', '**/requirements*.txt') }}

      - name: Cache historical data
        uses: actions/cache@v4
        with:
          path: data/historical/
          key: backtest-data-${{ hashFiles('data/historical/*.parquet') }}

      - name: Install dependencies
        run: |
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt

      - name: Run backtest regression suite
        run: |
          source .venv/bin/activate
          pytest tests/backtest/ \
            --backtest-data=data/historical/ \
            --baseline=tests/backtest/baseline_metrics.json \
            --tolerance=0.10 \
            -v

      - name: Upload backtest results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: backtest-results
          path: tests/backtest/results/

  # ============================================================
  # Stage 5: Build Docker Image
  # ============================================================
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: [backtest-regression]
    if: github.ref == 'refs/heads/main'
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
      image_digest: ${{ steps.build-push.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push
        id: build-push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan Docker image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
          format: 'sarif'
          output: 'trivy-image.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload image scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-image.sarif'
```

### 12.2 Pipeline CD -- Deploy Staging + Production

```yaml
# .github/workflows/cd.yml
name: Trading Bot CD

on:
  workflow_run:
    workflows: ["Trading Bot CI"]
    types: [completed]
    branches: [main]

permissions:
  contents: read
  id-token: write  # OIDC para cloud auth

jobs:
  # ============================================================
  # Stage 6: Deploy Staging + Smoke Tests
  # ============================================================
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    environment:
      name: staging
      url: https://staging.tradingbot.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_STAGING }}
          aws-region: us-east-1

      - name: Deploy to staging
        run: |
          # Usando Helm ou kubectl
          helm upgrade --install trading-bot ./helm/trading-bot \
            --namespace staging \
            --set image.tag=sha-${{ github.sha }} \
            --set environment=staging \
            --set paperTrading=true \
            --wait --timeout=300s

      - name: Run smoke tests
        run: |
          # Verificar health endpoint
          for i in {1..30}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              https://staging.tradingbot.example.com/health)
            if [ "$STATUS" = "200" ]; then
              echo "Smoke test passed!"
              exit 0
            fi
            echo "Attempt $i: Status $STATUS, retrying..."
            sleep 10
          done
          echo "Smoke test FAILED"
          exit 1

  # ============================================================
  # Stage 7: Paper Trading Validation
  # ============================================================
  paper-trading-validation:
    name: Paper Trading Validation
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    timeout-minutes: 1440  # 24 horas max
    steps:
      - uses: actions/checkout@v4

      - name: Wait for paper trading period
        run: |
          echo "Starting paper trading validation..."
          echo "Monitoring for 4 hours minimum..."
          sleep 14400  # 4 horas

      - name: Check paper trading metrics
        run: |
          python scripts/check_paper_trading_metrics.py \
            --environment staging \
            --min-trades 10 \
            --max-error-rate 0.01 \
            --max-latency-p99-ms 5000

  # ============================================================
  # Stage 8: Deploy Production (com Approval Gate)
  # ============================================================
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [paper-trading-validation]
    environment:
      name: production
      url: https://tradingbot.example.com
    # GitHub Environments com "Required reviewers" = Approval Gate
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_PRODUCTION }}
          aws-region: us-east-1

      - name: Deploy with blue-green strategy
        run: |
          # Blue-green via Helm
          helm upgrade --install trading-bot ./helm/trading-bot \
            --namespace production \
            --set image.tag=sha-${{ github.sha }} \
            --set environment=production \
            --set paperTrading=false \
            --set blueGreen.enabled=true \
            --wait --timeout=600s

      - name: Post-deploy health check
        run: |
          python scripts/post_deploy_health_check.py \
            --environment production \
            --duration-minutes 15 \
            --rollback-on-failure

      - name: Notify team
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deploy ${{ job.status }}: trading-bot sha-${{ github.sha }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Trading Bot Deploy*\nStatus: ${{ job.status }}\nVersion: `sha-${{ github.sha }}`\nEnvironment: production"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 12.3 Reusable Workflow -- Backtest

```yaml
# .github/workflows/reusable-backtest.yml
name: Reusable Backtest

on:
  workflow_call:
    inputs:
      strategy:
        required: true
        type: string
      data-range:
        required: false
        type: string
        default: "2020-01-01:2025-12-31"
      tolerance:
        required: false
        type: number
        default: 0.10

jobs:
  backtest:
    name: Backtest ${{ inputs.strategy }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Run backtest
        run: |
          python -m trading_bot.backtest \
            --strategy ${{ inputs.strategy }} \
            --data-range "${{ inputs.data-range }}" \
            --tolerance ${{ inputs.tolerance }} \
            --output results/${{ inputs.strategy }}.json

      - name: Validate results against baseline
        run: |
          python scripts/validate_backtest.py \
            --results results/${{ inputs.strategy }}.json \
            --baseline baselines/${{ inputs.strategy }}.json

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: backtest-${{ inputs.strategy }}
          path: results/
```

---

## 13. Livros Fundamentais

### 13.1 A Biblia: "Continuous Delivery" (2010)

| Campo | Detalhe |
|---|---|
| **Titulo** | Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation |
| **Autores** | Jez Humble, David Farley |
| **Editora** | Addison-Wesley (Signature Series de Martin Fowler) |
| **Ano** | 2010 |
| **Premio** | Jolt Excellence Award 2011 |
| **ISBN** | 978-0321601919 |

**Por que e a Biblia:** Definiu o conceito de Deployment Pipeline, os principios de
Continuous Delivery, e as praticas tecnicas que permitem releases frequentes e confiaveis.
Toda organizacao que implementa CI/CD se baseia direta ou indiretamente neste livro.

**Estrutura:**
- Parte I: Foundations (principios)
- Parte II: Deployment Pipeline (o framework tecnico)
- Parte III: Delivery Ecosystem (infra, dados, configuracao)

### 13.2 "Accelerate" (2018)

| Campo | Detalhe |
|---|---|
| **Titulo** | Accelerate: The Science of Lean Software and DevOps |
| **Autores** | Nicole Forsgren PhD, Jez Humble, Gene Kim |
| **Editora** | IT Revolution |
| **Ano** | 2018 |
| **Premio** | Shingo Publication Award |
| **ISBN** | 978-1942788331 |

**Contribuicao:** Prova cientifica (4 anos de pesquisa DORA, metodos estatisticos
rigorosos) de que CI/CD, trunk-based development, e automacao de testes predizem alta
performance organizacional. Definiu as DORA Metrics.

### 13.3 "The DevOps Handbook" (2016)

| Campo | Detalhe |
|---|---|
| **Titulo** | The DevOps Handbook: How to Create World-Class Agility, Reliability, and Security in Technology Organizations |
| **Autores** | Gene Kim, Jez Humble, Patrick Debois, John Willis |
| **Editora** | IT Revolution |
| **Ano** | 2016 (2nd ed. 2021) |
| **ISBN** | 978-1942788003 |

**Contribuicao:** Manual pratico de DevOps. Cobre as "Three Ways" (Flow, Feedback,
Continuous Learning), integracao de seguranca, e case studies de Netflix, Amazon, Etsy,
Facebook. Ponto de referencia para transformacao DevOps.

### 13.4 "Release It!" (2007, 2nd ed. 2018)

| Campo | Detalhe |
|---|---|
| **Titulo** | Release It!: Design and Deploy Production-Ready Software |
| **Autor** | Michael T. Nygard |
| **Editora** | Pragmatic Bookshelf |
| **Ano** | 2007 (1st), 2018 (2nd) |
| **ISBN** | 978-1680502398 (2nd ed.) |

**Contribuicao:** Foco em resiliencia e estabilidade em producao. Introduziu padroes
como Circuit Breaker, Bulkhead, Timeout. Essencial para quem opera sistemas criticos
(como trading bots).

### 13.5 "Infrastructure as Code" (2016, 2nd ed. 2021)

| Campo | Detalhe |
|---|---|
| **Titulo** | Infrastructure as Code: Dynamic Systems for the Cloud Age |
| **Autor** | Kief Morris |
| **Editora** | O'Reilly |
| **Ano** | 2016 (1st), 2021 (2nd) |
| **ISBN** | 978-1098114671 (2nd ed.) |

**Contribuicao:** Referencia definitiva para gerenciar infraestrutura como codigo.
Cobre Terraform, Ansible, e principios de infraestrutura imutavel. Fundamental para
ambientes CD reproduziveis.

### 13.6 Leitura Complementar

| Livro | Autor(es) | Ano | Foco |
|---|---|---|---|
| The Phoenix Project | Gene Kim, Kevin Behr, George Spafford | 2013 | DevOps como romance (narrativa) |
| Site Reliability Engineering | Betsy Beyer et al. (Google) | 2016 | SRE, monitoramento, SLOs |
| Team Topologies | Matthew Skelton, Manuel Pais | 2019 | Organizacao de equipes para flow |
| Continuous Integration | Paul Duvall, Steve Matyas, Andrew Glover | 2007 | CI detalhado (com prefacio de Fowler) |

---

## 14. Referencias

### Fontes Primarias

| # | Titulo | Autor(es) | Ano | Tipo | URL |
|---|---|---|---|---|---|
| 1 | Continuous Integration | Martin Fowler | 2006/2024 | Artigo web | https://martinfowler.com/articles/continuousIntegration.html |
| 2 | Continuous Delivery (bliki) | Martin Fowler | 2013 | Artigo web | https://martinfowler.com/bliki/ContinuousDelivery.html |
| 3 | Continuous Delivery (livro) | Jez Humble, David Farley | 2010 | Livro | https://www.amazon.com/Continuous-Delivery-Deployment-Automation-Addison-Wesley/dp/0321601912 |
| 4 | Accelerate | Nicole Forsgren, Jez Humble, Gene Kim | 2018 | Livro | https://itrevolution.com/product/accelerate/ |
| 5 | The DevOps Handbook | Gene Kim, Jez Humble, Patrick Debois, John Willis | 2016 | Livro | https://www.amazon.com/DevOps-Handbook-World-Class-Reliability-Organizations/dp/1942788002 |
| 6 | DORA Metrics - Four Keys | DORA (Google) | 2023 | Guia | https://dora.dev/guides/dora-metrics-four-keys/ |
| 7 | CI vs CD vs CD | Atlassian | 2024 | Artigo web | https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment |
| 8 | Trunk-Based Development | Atlassian | 2024 | Artigo web | https://www.atlassian.com/continuous-delivery/continuous-integration/trunk-based-development |
| 9 | SLSA Framework | OpenSSF | 2024 | Framework | https://openssf.org/projects/slsa/ |
| 10 | Secrets Management Cheat Sheet | OWASP | 2024 | Guia | https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html |
| 11 | Deployment Pipeline Anti-patterns | Jez Humble | 2010 | Artigo web | https://continuousdelivery.com/2010/09/deployment-pipeline-anti-patterns/ |
| 12 | Supply Chain Security 2025 | Faith Forge Labs | 2025 | Artigo web | https://faithforgelabs.com/blog_supplychain_security_2025.php |

### Ferramentas e Documentacao

| # | Ferramenta | URL |
|---|---|---|
| 13 | GitHub Actions Documentation | https://docs.github.com/en/actions |
| 14 | GitLab CI/CD Documentation | https://docs.gitlab.com/ee/ci/ |
| 15 | ArgoCD | https://github.com/argoproj/argo-cd |
| 16 | Flux CD | https://fluxcd.io/ |
| 17 | Tekton | https://tekton.dev/ |
| 18 | Sigstore / cosign | https://www.sigstore.dev/ |
| 19 | Trivy (security scanner) | https://trivy.dev/ |
| 20 | HashiCorp Vault | https://developer.hashicorp.com/vault |

### Artigos e Comparacoes

| # | Titulo | Fonte | URL |
|---|---|---|---|
| 21 | Jenkins vs GitHub Actions vs GitLab CI | DEV Community | https://dev.to/574n13y/jenkins-vs-github-actions-vs-gitlab-ci-2k35 |
| 22 | Flux CD vs Argo CD | Spacelift | https://spacelift.io/blog/flux-vs-argo-cd |
| 23 | CI/CD Pipeline Best Practices 2025 | JetBrains | https://www.jetbrains.com/teamcity/ci-cd-guide/ci-cd-best-practices/ |
| 24 | Blue-Green and Canary Deployments | Harness | https://www.harness.io/blog/blue-green-canary-deployment-strategies |
| 25 | CI/CD Anti-Patterns | EM360Tech | https://em360tech.com/tech-articles/cicd-anti-patterns-whats-slowing-down-your-pipeline |
| 26 | Cloud Native CI/CD with Tekton and ArgoCD on AWS | AWS | https://aws.amazon.com/blogs/containers/cloud-native-ci-cd-with-tekton-and-argocd-on-aws/ |
| 27 | Anti-patterns for CI | AWS Well-Architected | https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/anti-patterns-for-continuous-integration.html |
| 28 | DORA Metrics | Atlassian | https://www.atlassian.com/devops/frameworks/dora-metrics |

---

## Apendice A: Glossario

| Termo | Definicao |
|---|---|
| **Artifact** | Resultado imutavel de um build (binario, container image, package) |
| **Build** | Processo de compilar/construir o software a partir do codigo-fonte |
| **Canary** | Deploy gradual para subconjunto de usuarios/trafego |
| **CI Server** | Servico que automatiza build e testes a cada commit |
| **CRD** | Custom Resource Definition (Kubernetes) |
| **DAST** | Dynamic Application Security Testing |
| **Deployment Pipeline** | Sequencia automatizada de estagios do commit ao deploy |
| **Feature Flag** | Toggle que habilita/desabilita funcionalidades sem redeploy |
| **GitOps** | Paradigma que usa Git como fonte de verdade para infraestrutura |
| **Green Build** | Build que passou em todos os testes |
| **Integration Hell** | Dificuldade extrema ao integrar codigo de diferentes desenvolvedores |
| **Manual Gate** | Ponto no pipeline que requer aprovacao humana |
| **OIDC** | OpenID Connect -- protocolo de autenticacao (elimina secrets estaticos) |
| **Red Build** | Build que falhou em algum teste |
| **Rollback** | Reverter para versao anterior em caso de falha |
| **SARIF** | Static Analysis Results Interchange Format |
| **SAST** | Static Application Security Testing |
| **SBOM** | Software Bill of Materials |
| **SCA** | Software Composition Analysis |
| **SLSA** | Supply-chain Levels for Software Artifacts |
| **Trunk** | Branch principal (main/master) do repositorio |

---

## Apendice B: Checklist de Maturidade CI/CD

Use este checklist para avaliar o nivel de maturidade do CI/CD do projeto:

### Nivel 1 -- Basico (CI)

- [ ] Repositorio Git com branch principal protegida
- [ ] Build automatizado a cada commit
- [ ] Testes unitarios executam automaticamente
- [ ] Linter configurado (ruff/eslint)
- [ ] Notificacao de build quebrado

### Nivel 2 -- Intermediario (CI + CD Delivery)

- [ ] Testes de integracao automatizados
- [ ] Security scanning (SAST + SCA)
- [ ] Docker build automatizado
- [ ] Deploy automatico em staging
- [ ] Smoke tests em staging
- [ ] Coverage gate (>= 80%)
- [ ] Environments configurados (staging/production)

### Nivel 3 -- Avancado (CD Completo)

- [ ] Deployment pipeline completo (build -> test -> scan -> stage -> prod)
- [ ] Approval gate para producao
- [ ] Blue-green ou canary deployment
- [ ] Rollback automatico
- [ ] Feature flags implementados
- [ ] DORA metrics monitoradas
- [ ] SBOM gerado a cada build
- [ ] Signed artifacts (Sigstore/cosign)

### Nivel 4 -- Elite (Trading Bot Specific)

- [ ] Backtest regression no pipeline
- [ ] Paper trading validation automatizada
- [ ] Kill switch / circuit breaker
- [ ] Feature flags para estrategias
- [ ] Auto-rollback baseado em metricas de trading
- [ ] Deploy windows baseados em volatilidade de mercado
- [ ] Monitoramento pos-deploy com alertas de anomalia
- [ ] Walk-forward validation para novas estrategias
- [ ] Audit trail completo de todas as mudancas

---

*Documento compilado com base em pesquisa abrangente de fontes primarias, livros
fundamentais, documentacao oficial de ferramentas, e melhores praticas da industria.
Todas as fontes estao referenciadas na Secao 14.*
