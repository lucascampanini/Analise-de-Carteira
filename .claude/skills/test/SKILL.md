---
name: test
description: Executa testes do projeto com coverage e analise. Use para rodar testes unitarios, integracao ou E2E.
argument-hint: [unit|integration|e2e|all] [path]
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash
---

# Executar Testes - BOT Assessor

Execute os testes conforme solicitado: `$ARGUMENTS`

## Mapeamento de Argumentos

- `unit` ou sem argumento: `pytest tests/unit/ -v --tb=short`
- `integration`: `pytest tests/integration/ -v --tb=short`
- `e2e`: `pytest tests/e2e/ -v --tb=short`
- `all`: `pytest tests/ -v --tb=short`
- `coverage`: `pytest tests/ --cov=src --cov-branch --cov-report=term-missing`
- Se um path especifico for passado, execute pytest nesse path

## Apos Execucao

1. Analise os resultados
2. Se houver falhas, identifique a causa raiz
3. Verifique se os testes seguem as regras:
   - Padrao AAA (Arrange, Act, Assert)
   - UMA acao por teste
   - Domain: sem mocks, logica pura
   - Application: com Fakes (InMemoryRepository)
   - Naming: test_<contexto>_<acao>_<resultado>
4. Reporte coverage se solicitado (minimo 80% branch para domain)
5. Sugira testes faltantes se houver gaps obvios
