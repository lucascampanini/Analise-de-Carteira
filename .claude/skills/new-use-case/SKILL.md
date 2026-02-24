---
name: new-use-case
description: Cria um novo Use Case (Command ou Query) seguindo CQRS e Arquitetura Hexagonal do projeto.
argument-hint: [command|query] [NomeUseCase]
disable-model-invocation: true
user-invocable: true
---

# Criar Novo Use Case - BOT Assessor

Crie um novo Use Case conforme solicitado: `$ARGUMENTS`

## Regras OBRIGATORIAS

### Se Command:
1. DTO em `src/application/commands/<nome>_command.py`
   - `@dataclass(frozen=True)`
   - Campo `idempotency_key: str` OBRIGATORIO
   - Campos que representam a intencao (nao dados brutos)
2. Handler em `src/application/handlers/command_handlers/<nome>_handler.py`
   - Retorna `None` ou `Result` (void)
   - Orquestra chamadas ao domain
   - NAO contem logica de negocio (isso fica no domain)
   - Recebe dependencias por Constructor Injection (Protocols/ABCs)
3. Port (se necessario) em `src/application/ports/outbound/`
   - Protocol ou ABC
   - Define o que o handler precisa da infra

### Se Query:
1. DTO em `src/application/queries/<nome>_query.py`
   - `@dataclass(frozen=True)`
   - Criterios de busca
2. Handler em `src/application/handlers/query_handlers/<nome>_handler.py`
   - Side-effect free
   - Retorna dados (DTO de resposta)
   - Pode ler diretamente do banco (sem obrigatoriedade de passar pelo domain)

### Para Ambos:
1. Um handler por Command/Query (NUNCA compartilhar)
2. Pipeline Behaviors: Validation > Logging > Authorization > Transaction
3. Application imports APENAS domain
4. Type hints completos
5. Docstring Google style

## Arquivos a Criar

1. DTO do Command/Query
2. Handler
3. Port outbound (se necessario)
4. Response DTO (se Query)
5. `tests/unit/application/test_<nome>_handler.py` (com Fakes)

## Template de Teste Handler (escrever PRIMEIRO)

```python
import pytest
from src.application.commands.<nome>_command import <Nome>Command
from src.application.handlers.command_handlers.<nome>_handler import <Nome>Handler
from tests.fixtures.fakes import InMemory<Repo>Repository

class Test<Nome>Handler:
    def test_<contexto>_<acao>_<resultado>(self):
        # Arrange
        repo = InMemory<Repo>Repository()
        handler = <Nome>Handler(repo)
        command = <Nome>Command(idempotency_key="test-key-1", ...)
        # Act
        handler.handle(command)
        # Assert
        ...
```
