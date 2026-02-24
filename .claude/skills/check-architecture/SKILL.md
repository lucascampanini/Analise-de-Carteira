---
name: check-architecture
description: Verifica se o projeto respeita todas as regras arquiteturais (Hexagonal, DDD, CQRS, Dependency Rule). Detecta violacoes automaticamente.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# Verificacao Arquitetural - BOT Assessor

Analise toda a codebase e reporte violacoes das regras arquiteturais.

## Verificacoes Obrigatorias

### 1. Dependency Rule
Busque imports que violem a regra de dependencia:
- `src/domain/` NAO pode importar de `application`, `adapters`, `config`
- `src/application/` NAO pode importar de `adapters`, `config`
- `src/adapters/` pode importar de `domain` e `application`
- `src/config/` pode importar de tudo

**Como verificar**: Grep por `from src.adapters` e `from src.config` dentro de `src/domain/` e `src/application/`

### 2. Domain Purity
- Domain entities NAO usam ORM decorators (@Column, Base, etc)
- Domain NAO faz I/O (requests, file operations, DB queries)
- Domain NAO usa frameworks (FastAPI, SQLAlchemy, etc)

### 3. CQRS Compliance
- Commands tem `idempotency_key`
- Commands handlers retornam None/Result
- Queries NAO modificam estado
- Um handler por Command/Query

### 4. Adapter Isolation
- ORM Models em `adapters/outbound/persistence/sqlalchemy/models/` (NAO no domain)
- Mappers existem entre ORM Models e Domain Entities
- Anticorruption Layer para APIs externas

### 5. DI Compliance
- Constructor Injection (NAO Service Locator)
- Dependencias sao Protocols/ABCs (NAO classes concretas)
- Composition Root APENAS em `config/container.py`

### 6. Compliance B3
- Kill switch implementado
- Controles pre-trade existem
- Circuit breakers configurados
- Horarios validados antes de enviar ordens

## Formato de Output

```
## Resultado da Verificacao Arquitetural

### Violacoes Criticas (X encontradas)
- [DEPENDENCY_RULE] arquivo:linha - descricao
- [DOMAIN_PURITY] arquivo:linha - descricao

### Avisos (X encontrados)
- [CQRS] arquivo:linha - descricao

### Conformidade
- [OK] Dependency Rule: X arquivos verificados
- [OK] Domain Purity: sem I/O detectado
...

### Score: X/100
```
