---
name: review
description: Revisa codigo seguindo TODAS as regras do projeto (Hexagonal, DDD, CQRS, compliance B3). Use apos modificacoes ou antes de commits.
argument-hint: [file-or-directory]
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# Review de Codigo - BOT Assessor

Revise o codigo em `$ARGUMENTS` seguindo rigorosamente as regras do projeto.

## Checklist Obrigatorio

### 1. Arquitetura Hexagonal
- [ ] Dependency Rule respeitada (Domain NAO importa application/adapters/config)
- [ ] Logica de negocio APENAS no Domain Layer
- [ ] Adapters NAO contem logica de negocio
- [ ] ORM models separados de Domain Entities (mappers existem)
- [ ] Interfaces/Protocols definidos no Domain/Application, implementacoes nos Adapters

### 2. DDD
- [ ] Rich Domain Model (entidades com comportamento, NAO anemicas)
- [ ] Value Objects imutaveis (@dataclass(frozen=True))
- [ ] Aggregate Root como unico ponto de acesso
- [ ] Referencia entre Aggregates por ID apenas
- [ ] Domain Events no passado e imutaveis
- [ ] Ubiquitous Language respeitada (nomes do dominio financeiro)

### 3. CQRS
- [ ] Commands com idempotency_key
- [ ] Commands sao void (retornam None ou Result)
- [ ] Queries side-effect free
- [ ] Um handler por Command/Query

### 4. Testes
- [ ] Padrao AAA com UMA acao por teste
- [ ] Domain testado sem mocks
- [ ] Application testado com Fakes
- [ ] Nome descritivo: test_<contexto>_<acao>_<resultado_esperado>

### 5. Compliance B3 (CRITICO)
- [ ] Nenhum padrao de spoofing/layering/wash trading
- [ ] Kill switch presente
- [ ] Controles pre-trade implementados
- [ ] Horarios de negociacao respeitados
- [ ] Rate limiting de ordens

### 6. Seguranca e Qualidade
- [ ] Type hints em todas funcoes
- [ ] Sem secrets hardcoded
- [ ] Result Pattern para erros de dominio
- [ ] Logs estruturados (structlog) com trace_id
- [ ] Sem labels de alta cardinalidade em metricas

## Formato de Output

Classifique cada achado:
- **CRITICO** (deve corrigir - violacao de compliance, seguranca ou arquitetura)
- **AVISO** (deveria corrigir - viola boas praticas)
- **SUGESTAO** (considerar melhorar)

Para cada issue, indique:
1. Arquivo e linha
2. Regra violada (referencia ao doc)
3. O que esta errado
4. Como corrigir (com exemplo de codigo)
