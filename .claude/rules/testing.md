# Regras de Testes - BOT Assessor

## Piramide de Testes
- MUITOS testes unitarios (rapidos, isolados)
- ALGUNS testes de integracao (adapters com infra real)
- POUCOS testes E2E (ciclo completo)

## Testes Unitarios
- Padrao AAA: Arrange, Act, Assert
- UMA unica acao (Act) por teste
- Testar COMPORTAMENTO, nunca implementacao interna
- NUNCA testar metodos privados diretamente
- Naming descritivo: `test_order_rejects_quantity_exceeding_position_limit`
- Usar pytest fixtures (nunca setup/teardown classico)
- Usar Test Data Builders e Object Mothers

### Por Camada
- **Domain**: sem mocks, sem I/O, logica pura. Instanciar objetos reais
- **Application**: com Fakes (InMemoryRepository, FakeMarketDataProvider)
- **Adapters**: Testcontainers com PostgreSQL, Redis, Kafka reais

## Test Doubles (Escola Detroit/Classica)
- Objetos reais quando possivel
- Stubs para queries (incoming interactions)
- Mocks APENAS para verificar commands de saida observaveis
- Fakes (InMemory) para repositories e external services
- NUNCA over-mocking

## Coverage
- Minimo 80% branch coverage para domain
- Mutation testing (mutmut) para medir efetividade real
- Coverage NAO e objetivo, e mecanismo de seguranca

## TDD
- Preferido para logica de dominio e regras de negocio
- Red > Green > Refactor
- Escrever teste ANTES da implementacao

## Testes de Integracao
- Testcontainers para PostgreSQL, Redis, Kafka, QuestDB
- Testar adapters contra infraestrutura real
- Isolamento: cada teste em transacao com rollback

## Testes E2E
- Simular ciclo completo: sinal > risco > ordem > execucao > portfolio > P&L
- Idempotentes e independentes
- Executar em CI com docker compose

## Anti-Patterns PROIBIDOS
- Testes que dependem de ordem de execucao
- Testes com multiplas acoes (Act)
- Testes sem assertions
- Testes que acessam I/O diretamente (sao integracao, nao unitario)
- Perseguir 100% coverage
- Testar frameworks de terceiros

## Ferramentas
- pytest (framework principal)
- pytest-cov (coverage)
- pytest-asyncio (async tests)
- Hypothesis (property-based testing para calculos financeiros)
- Testcontainers (integracao)
- mutmut (mutation testing)
- Factory Boy ou Test Data Builders customizados
