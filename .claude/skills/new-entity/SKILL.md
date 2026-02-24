---
name: new-entity
description: Cria uma nova Domain Entity ou Value Object seguindo DDD e Arquitetura Hexagonal do projeto.
argument-hint: [entity|vo] [NomeClasse]
disable-model-invocation: true
user-invocable: true
---

# Criar Nova Entidade/Value Object - BOT Assessor

Crie um novo artefato de dominio conforme solicitado: `$ARGUMENTS`

## Regras OBRIGATORIAS

### Se Entity:
1. Criar em `src/domain/entities/`
2. Rich Domain Model (comportamento dentro da entidade)
3. Aggregate Root se for raiz do aggregate
4. Metodos que expressam acoes de dominio (Ubiquitous Language)
5. Validacao de invariantes no construtor
6. Domain Events emitidos quando estado muda
7. Referenciar outros Aggregates APENAS por ID
8. NÃO usar `@dataclass` para entidades com identidade mutavel

### Se Value Object:
1. Criar em `src/domain/value_objects/`
2. `@dataclass(frozen=True)` OBRIGATORIO
3. Validacao no `__post_init__`
4. Equality por valor (nao por identidade)
5. Imutavel - operacoes retornam novo VO

### Para Ambos:
1. Type hints completos
2. Docstring Google style
3. Sem imports de application, adapters ou config
4. Nomes em ingles, seguindo Ubiquitous Language financeira
5. Se relevante: ON/PN/Units, WIN/WDO, DT/ST, etc.

## Arquivos a Criar

1. `src/domain/entities/<nome>.py` ou `src/domain/value_objects/<nome>.py`
2. `tests/unit/domain/test_<nome>.py` (TDD - teste ANTES da implementacao)
3. Atualizar `__init__.py` se existir

## Template de Teste (escrever PRIMEIRO)

```python
import pytest
from src.domain.entities.<nome> import <NomeClasse>

class Test<NomeClasse>:
    def test_<contexto>_<acao>_<resultado_esperado>(self):
        # Arrange
        ...
        # Act
        ...
        # Assert
        ...
```
