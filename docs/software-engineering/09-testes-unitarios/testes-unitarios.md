# Testes Unitarios: Guia Definitivo -- Principios, Padroes e Praticas para Bot de Investimentos

> **Documento de Referencia Tecnica -- Nivel PhD**
> Ultima atualizacao: Fevereiro 2026
> Escopo: Framework abrangente de testes unitarios aplicado ao desenvolvimento de um bot de investimentos automatizado, cobrindo desde fundamentos teoricos ate anti-patterns e metricas de qualidade

---

## Sumario Executivo

Testes unitarios sao a base sobre a qual todo software confiavel e construido. Para um bot de investimentos que opera no mercado financeiro brasileiro -- onde erros de codigo podem significar perdas financeiras reais e imediatas -- a disciplina de testes unitarios nao e opcional: e uma questao de sobrevivencia do sistema.

Este documento apresenta um estudo profundo e abrangente sobre testes unitarios, fundamentado nas obras de referencia da area: "Unit Testing: Principles, Practices, and Patterns" (Vladimir Khorikov, 2020 -- considerada a "biblia" moderna do tema), "Test-Driven Development By Example" (Kent Beck, 2003), "The Art of Unit Testing" (Roy Osherove, 3a ed., 2024), "Growing Object-Oriented Software, Guided by Tests" (Freeman & Pryce, 2009), "Working Effectively with Legacy Code" (Michael Feathers, 2004) e "xUnit Test Patterns" (Gerard Meszaros, 2007).

O documento cobre conceitos fundamentais (FIRST, AAA, Given-When-Then), test doubles (mocks, stubs, spies, fakes, dummies), estrategias de o-que-testar, naming e organizacao, TDD/BDD, frameworks, anti-patterns, metricas de qualidade e, finalmente, aplicacao pratica ao bot de investimentos.

**Principios-Chave deste Framework de Testes:**

1. **Protecao contra regressoes** -- Testes devem detectar bugs introduzidos por mudancas no codigo
2. **Resistencia a refatoracao** -- Testes nao devem quebrar quando a implementacao interna muda (sem mudar comportamento)
3. **Feedback rapido** -- Testes unitarios devem executar em milissegundos
4. **Manutenibilidade** -- Testes sao codigo de producao; devem ser legiveis e faceis de manter

---

## Indice

1. [Conceitos Fundamentais](#1-conceitos-fundamentais)
2. [Test Doubles](#2-test-doubles)
3. [O Que Testar e O Que Nao Testar](#3-o-que-testar-e-o-que-nao-testar)
4. [Naming e Organizacao](#4-naming-e-organizacao)
5. [TDD -- Test-Driven Development](#5-tdd----test-driven-development)
6. [BDD -- Behavior-Driven Development](#6-bdd----behavior-driven-development)
7. [Frameworks e Ferramentas](#7-frameworks-e-ferramentas)
8. [Anti-Patterns de Testes Unitarios](#8-anti-patterns-de-testes-unitarios)
9. [Metricas de Qualidade de Testes](#9-metricas-de-qualidade-de-testes)
10. [Piramide de Testes](#10-piramide-de-testes)
11. [Testes Unitarios para o Bot de Investimentos](#11-testes-unitarios-para-o-bot-de-investimentos)
12. [Livros Fundamentais -- As "Biblias"](#12-livros-fundamentais----as-biblias)
13. [Referencias](#13-referencias)

---

## 1. Conceitos Fundamentais

### 1.1 Definicao de Teste Unitario

Um teste unitario e um teste automatizado que verifica o comportamento de uma pequena porcao de codigo (uma "unidade"), executa rapidamente e o faz de forma isolada de outros testes.

A definicao exata de "unidade" varia entre duas escolas de pensamento:

| Aspecto | Escola Classica (Detroit) | Escola Mockista (London) |
|---------|--------------------------|--------------------------|
| **Unidade** | Uma unidade de comportamento | Uma classe |
| **Isolamento** | Testes isolados entre si | SUT isolado de colaboradores |
| **Test Doubles** | Apenas para dependencias compartilhadas | Para todas as dependencias mutaveis |
| **Expoentes** | Kent Beck, Martin Fowler | Steve Freeman, Nat Pryce |

**Segundo Vladimir Khorikov** (a referencia mais moderna e abrangente), um teste unitario deve satisfazer tres propriedades:

1. Verifica uma pequena porcao de codigo (uma unidade de comportamento)
2. Executa rapidamente (milissegundos)
3. Faz isso de forma isolada de outros testes (nao de outras classes)

Khorikov se alinha mais com a escola classica, argumentando que testar unidades de comportamento (nao classes individuais) produz testes mais resistentes a refatoracao.

### 1.2 Principios FIRST

Os principios FIRST, popularizados por Robert C. Martin em "Clean Code" e por Tim Ottinger e Brett Schuchert, definem as cinco propriedades que todo teste unitario deve ter:

**F -- Fast (Rapido)**

```
Testes unitarios devem executar em milissegundos.
Um suite de 1000 testes deve completar em segundos, nao minutos.
Se o suite completo leva mais de 10 segundos, desenvolvedores param de roda-lo.
```

Implicacoes praticas:
- Sem I/O (disco, rede, banco de dados)
- Sem sleeps ou waits
- Sem dependencias externas lentas
- Meta: < 1ms por teste, < 10s para o suite completo

**I -- Isolated/Independent (Isolado/Independente)**

```
Cada teste deve ser autocontido.
A ordem de execucao nao deve importar.
Um teste nao pode depender do resultado de outro.
Cada teste configura seu proprio estado e limpa apos si.
```

Implicacoes praticas:
- Sem estado compartilhado mutavel entre testes
- Sem dependencia de ordem de execucao
- Cada teste pode ser executado individualmente
- Paralelizacao segura

**R -- Repeatable (Repetivel)**

```
O mesmo teste deve produzir o mesmo resultado toda vez que e executado.
Em qualquer ambiente (dev, CI, producao).
Independente de data, hora, timezone, ou estado externo.
```

Implicacoes praticas:
- Sem dependencia de hora atual (injetar relogio)
- Sem dependencia de dados aleatorios nao-deterministicos (usar seeds)
- Sem dependencia de servicos externos
- Sem dependencia de estado de banco de dados

**S -- Self-Validating (Auto-Verificavel)**

```
O teste deve automaticamente determinar se passou ou falhou.
Sem inspecao manual de logs ou outputs.
O resultado e binario: PASS ou FAIL.
```

Implicacoes praticas:
- Assertions claras e especificas
- Sem `print()` para verificacao manual
- Mensagens de erro descritivas quando falha
- Um teste, uma razao para falhar

**T -- Timely (Oportuno)**

```
Testes devem ser escritos no momento certo.
Idealmente, antes ou junto com o codigo de producao (TDD).
Nao semanas depois, quando o contexto ja foi esquecido.
```

Implicacoes praticas:
- Testes escritos durante o desenvolvimento, nao depois
- TDD como disciplina ideal
- Testes como parte da Definition of Done
- Nao acumular divida tecnica de testes

### 1.3 Padrao AAA (Arrange, Act, Assert)

O padrao AAA e a estrutura mais amplamente adotada para organizar o corpo de um teste unitario. Ele divide cada teste em tres secoes claramente delimitadas:

```python
def test_calculo_retorno_percentual():
    # Arrange (Preparacao)
    preco_entrada = 100.00
    preco_saida = 110.00

    # Act (Acao)
    retorno = calcular_retorno_percentual(preco_entrada, preco_saida)

    # Assert (Verificacao)
    assert retorno == 10.0
```

**Regras do padrao AAA (segundo Khorikov):**

1. **Uma unica secao Act** -- Se voce tem multiplas acoes, provavelmente esta testando multiplos comportamentos. Divida em testes separados.

2. **Arrange pode ser a maior secao** -- E aceitavel que a preparacao seja extensa. Use metodos auxiliares, Test Data Builders ou Object Mothers para reduzir o boilerplate.

3. **Assert deve ser minimalista** -- Idealmente uma unica assertion logica (que pode envolver multiplas assertions fisicas para verificar um unico conceito).

4. **Evite secoes Act com if** -- Se o Act tem condicionais, voce esta testando multiplos cenarios em um unico teste.

5. **Sem comentarios de secao quando obvio** -- Em testes simples, a estrutura AAA e evidente sem comentarios. Em testes complexos, os comentarios `# Arrange`, `# Act`, `# Assert` melhoram a legibilidade.

### 1.4 Given-When-Then

O padrao Given-When-Then e a alternativa originada do BDD (Behavior-Driven Development), proposta por Dan North. E semanticamente equivalente ao AAA, mas com foco na linguagem do dominio:

```
Given (Dado que)  -> Arrange  -> Contexto/Pre-condicao
When  (Quando)    -> Act      -> Acao/Estimulo
Then  (Entao)     -> Assert   -> Resultado esperado
```

```python
def test_dado_posicao_em_lucro_quando_stop_gain_atingido_entao_fecha_posicao():
    # Given: uma posicao comprada a R$100 com stop gain em R$110
    posicao = Posicao(ativo="PETR4", preco_entrada=100.0, stop_gain=110.0)

    # When: o preco atinge R$110
    sinal = posicao.verificar_saida(preco_atual=110.0)

    # Then: deve gerar sinal de venda
    assert sinal == SinalSaida.STOP_GAIN
```

A vantagem do Given-When-Then e que facilita a comunicacao com stakeholders nao-tecnicos e se integra naturalmente com ferramentas BDD como Cucumber/Gherkin.

### 1.5 Os Quatro Pilares de um Bom Teste (Khorikov)

Vladimir Khorikov define quatro pilares que determinam a qualidade de um teste unitario:

```
                    Pilar 1                    Pilar 2
            Protecao contra          Resistencia a
              Regressoes              Refatoracao
                  |                        |
                  |    TESTE DE ALTA       |
                  |     QUALIDADE          |
                  |                        |
            Pilar 3                    Pilar 4
           Feedback                Manutenibilidade
             Rapido
```

**Pilar 1: Protecao contra regressoes**
- Quantidade de codigo executado durante o teste
- Complexidade do codigo (logica de dominio > codigo trivial)
- Significancia do dominio (codigo critico > codigo periferico)

**Pilar 2: Resistencia a refatoracao**
- O teste nao quebra quando voce refatora sem mudar comportamento?
- Mede a ausencia de falsos positivos
- O pilar mais importante e mais negligenciado

**Pilar 3: Feedback rapido**
- Velocidade de execucao
- Testes unitarios: milissegundos
- Testes de integracao: segundos
- Testes E2E: minutos

**Pilar 4: Manutenibilidade**
- Facilidade de entender o teste
- Facilidade de executar o teste
- Tamanho do teste, clareza, dependencias externas

**Trade-off fundamental:** Nao e possivel maximizar os tres primeiros pilares simultaneamente. Testes unitarios maximizam Pilar 2 e 3, sacrificando parte do Pilar 1. Testes de integracao maximizam Pilar 1, sacrificando Pilar 3.

---

## 2. Test Doubles

### 2.1 Taxonomia de Gerard Meszaros

Gerard Meszaros, em "xUnit Test Patterns" (2007), definiu a taxonomia canonica de test doubles. Martin Fowler popularizou essa taxonomia em seu influente artigo "Mocks Aren't Stubs" (2007).

Um **test double** e um termo generico para qualquer objeto que substitui um objeto de producao durante testes. Existem cinco tipos:

```
                        Test Doubles
                             |
            +----------------+----------------+
            |                |                |
         Dummy            Stubs            Mocks
                            |                |
                          Fakes            Spies
```

### 2.2 Dummy

Um dummy e um objeto que e passado mas nunca realmente usado. Serve apenas para preencher parametros obrigatorios.

```python
class DummyLogger:
    """Nunca e realmente chamado -- apenas satisfaz a interface."""
    def log(self, message):
        pass

def test_processar_ordem():
    # O logger e necessario na assinatura, mas irrelevante para este teste
    logger = DummyLogger()
    processador = ProcessadorOrdem(logger=logger)

    resultado = processador.processar(Ordem(ativo="VALE3", quantidade=100))

    assert resultado.status == "executada"
```

### 2.3 Stub

Um stub fornece respostas pre-programadas para chamadas feitas durante o teste. Nao verifica como foi chamado -- apenas retorna dados "enlatados".

```python
class StubCotacaoService:
    """Retorna cotacoes pre-definidas, sem acessar API real."""
    def obter_cotacao(self, ativo):
        cotacoes = {
            "PETR4": 28.50,
            "VALE3": 68.20,
            "ITUB4": 32.10,
        }
        return cotacoes.get(ativo, 0.0)

def test_calcular_valor_portfolio():
    cotacao_service = StubCotacaoService()
    portfolio = Portfolio(cotacao_service=cotacao_service)
    portfolio.adicionar_posicao("PETR4", quantidade=100)
    portfolio.adicionar_posicao("VALE3", quantidade=50)

    valor_total = portfolio.calcular_valor()

    # 100 * 28.50 + 50 * 68.20 = 2850 + 3410 = 6260
    assert valor_total == 6260.0
```

### 2.4 Spy

Um spy e um stub que tambem registra informacoes sobre como foi chamado. Permite verificar interacoes apos o fato.

```python
class SpyNotificacaoService:
    def __init__(self):
        self.notificacoes_enviadas = []

    def enviar(self, mensagem, destinatario):
        self.notificacoes_enviadas.append({
            "mensagem": mensagem,
            "destinatario": destinatario,
        })

def test_alerta_de_risco_envia_notificacao():
    notificacao = SpyNotificacaoService()
    monitor = MonitorRisco(notificacao_service=notificacao)

    monitor.verificar_drawdown(drawdown_atual=0.15, limite=0.10)

    assert len(notificacao.notificacoes_enviadas) == 1
    assert "drawdown" in notificacao.notificacoes_enviadas[0]["mensagem"].lower()
```

### 2.5 Mock

Um mock e um objeto pre-programado com expectativas sobre quais chamadas deve receber. A diferenca crucial do spy: o mock verifica as expectativas como parte do teste (behavior verification).

```python
from unittest.mock import Mock

def test_ordem_enviada_para_broker():
    broker_mock = Mock()
    executor = ExecutorOrdem(broker=broker_mock)
    ordem = Ordem(ativo="PETR4", tipo="COMPRA", quantidade=100, preco=28.50)

    executor.executar(ordem)

    # Verificacao de comportamento -- o mock verifica que foi chamado corretamente
    broker_mock.enviar_ordem.assert_called_once_with(
        ativo="PETR4",
        lado="BUY",
        quantidade=100,
        preco=28.50
    )
```

### 2.6 Fake

Um fake e uma implementacao funcional, mas simplificada, de uma dependencia. Diferente de stubs (respostas enlatadas), fakes tem logica interna real.

```python
class FakeRepositorioPosicoes:
    """Implementacao in-memory que funciona como um repositorio real."""
    def __init__(self):
        self._posicoes = {}

    def salvar(self, posicao):
        self._posicoes[posicao.id] = posicao

    def buscar_por_id(self, id):
        return self._posicoes.get(id)

    def buscar_por_ativo(self, ativo):
        return [p for p in self._posicoes.values() if p.ativo == ativo]

    def listar_todas(self):
        return list(self._posicoes.values())

def test_gerenciador_posicoes_abre_e_recupera():
    repo = FakeRepositorioPosicoes()
    gerenciador = GerenciadorPosicoes(repositorio=repo)

    gerenciador.abrir_posicao("PETR4", 100, 28.50)

    posicoes = gerenciador.listar_posicoes_ativas()
    assert len(posicoes) == 1
    assert posicoes[0].ativo == "PETR4"
```

### 2.7 Mocks vs Stubs: A Distincao Crucial

Martin Fowler, em "Mocks Aren't Stubs", estabelece a distincao fundamental:

```
+------------------+----------------------------+----------------------------+
|                  | STUBS                      | MOCKS                      |
+------------------+----------------------------+----------------------------+
| Tipo de          | State Verification         | Behavior Verification      |
| Verificacao      | (verifica o estado final)  | (verifica as interacoes)   |
+------------------+----------------------------+----------------------------+
| Direcao          | Incoming (dados que        | Outgoing (comandos que     |
|                  | o SUT recebe)              | o SUT envia)               |
+------------------+----------------------------+----------------------------+
| Pergunta         | "O resultado esta          | "O SUT chamou o metodo     |
|                  | correto?"                  | correto no colaborador?"   |
+------------------+----------------------------+----------------------------+
| Acoplamento      | Baixo (testa o que)        | Alto (testa o como)        |
+------------------+----------------------------+----------------------------+
| Resistencia a    | Alta                       | Baixa                      |
| Refatoracao      |                            |                            |
+------------------+----------------------------+----------------------------+
```

**Regra de ouro (Khorikov):** Use stubs para incoming interactions (queries) e mocks apenas para outgoing interactions (commands) que sao observaveis externamente pelo cliente do sistema.

### 2.8 Classicist vs Mockist (Detroit vs London)

As duas escolas fundamentais de TDD divergem sobre o uso de test doubles:

**Escola Classica (Detroit) -- Kent Beck, Martin Fowler, Vladimir Khorikov:**
- Usa objetos reais sempre que possivel
- Doubles apenas para dependencias problematicas (I/O, rede, banco, API externa)
- Testes verificam estado (state verification)
- Unidade = unidade de comportamento (pode envolver multiplas classes)
- Maior protecao contra regressoes
- Testes mais robustos a refatoracao

**Escola Mockista (London) -- Steve Freeman, Nat Pryce:**
- Usa mocks para todos os colaboradores
- Testes verificam interacoes (behavior verification)
- Unidade = classe individual
- Cada classe testada em completo isolamento
- Design emergente: mocks forcam boas interfaces
- Feedback mais preciso sobre qual classe falhou

**Consenso moderno (pos-Khorikov):** A abordagem classica e geralmente preferida para logica de dominio. Mocks sao reservados para dependencias "out-of-process" (bancos de dados, APIs externas, message brokers). Essa posicao e amplamente aceita na comunidade apos a publicacao de "Unit Testing: Principles, Practices, and Patterns" em 2020.

---

## 3. O Que Testar e O Que Nao Testar

### 3.1 Behavior Testing vs Implementation Testing

Esta e talvez a licao mais importante de toda a literatura sobre testes unitarios:

```
  CERTO: Testar COMPORTAMENTO         ERRADO: Testar IMPLEMENTACAO
  (O que o codigo faz)                (Como o codigo faz)

  - Resultado de um calculo           - Ordem de chamadas internas
  - Estado apos uma operacao          - Metodos privados
  - Efeitos colaterais observaveis    - Estrutura interna de dados
  - Excecoes em cenarios invalidos    - Detalhes de algoritmo
  - Contrato da API publica           - Numero de iteracoes
```

**Exemplo concreto (trading bot):**

```python
# BOM: Testa comportamento -- qual sinal a estrategia gera
def test_media_movel_gera_sinal_compra_quando_curta_cruza_acima_longa():
    candles = gerar_candles_cruzamento_alta()
    estrategia = EstrategiaMediaMovel(curta=9, longa=21)

    sinal = estrategia.avaliar(candles)

    assert sinal == Sinal.COMPRA

# RUIM: Testa implementacao -- como o calculo e feito internamente
def test_media_movel_calcula_soma_e_divide():
    estrategia = EstrategiaMediaMovel(curta=9, longa=21)

    # Isso acopla o teste a implementacao interna
    assert estrategia._soma_precos == 450.0
    assert estrategia._contador == 9
```

### 3.2 O Que Testar

**Testar com alta prioridade:**

1. **Logica de dominio** -- Calculos de risco, sinais de estrategia, validacao de ordens, regras de portfolio
2. **Casos de borda (edge cases)** -- Divisao por zero, listas vazias, valores nulos, overflow, underflow
3. **Regras de negocio criticas** -- Limites de posicao, stop loss, calculo de PnL
4. **Tratamento de erros** -- Excecoes, fallbacks, circuit breakers
5. **Contratos de API publica** -- Interfaces que outros modulos consomem

**Testar com prioridade media:**

6. **Conversoes e formatacoes** -- Datas, moedas, percentuais
7. **Mapeamentos e transformacoes** -- DTOs, serialization, parsing
8. **Configuracoes** -- Validacao de parametros de configuracao

### 3.3 O Que NAO Testar

**Nao testar:**

1. **Metodos triviais** -- Getters/setters simples sem logica
2. **Codigo gerado** -- ORM models auto-gerados, protobuf stubs
3. **Frameworks de terceiros** -- Nao teste se o Django ORM funciona; teste sua logica que usa o ORM
4. **Metodos privados** -- Teste-os indiretamente via API publica (se precisam de teste direto, considere extrair uma classe)
5. **Construtores triviais** -- Exceto se contiverem validacao significativa
6. **Codigo de infraestrutura puro** -- Configuracao de logging, wiring de DI

### 3.4 Code Coverage e Suas Limitacoes

Code coverage mede quanto do codigo e executado durante os testes. Existem varios tipos:

**Line Coverage (Cobertura de Linha):**
```
Linhas executadas / Total de linhas * 100

Mais basica e mais comum. Pode ser enganosa:
uma linha pode ser "coberta" sem nenhuma assertion verificando seu resultado.
```

**Branch Coverage (Cobertura de Branch):**
```
Branches executados / Total de branches * 100

Mais rigorosa que line coverage.
Garante que cada if/else, cada case, foi exercitado.
```

**Path Coverage (Cobertura de Caminho):**
```
Caminhos executados / Total de caminhos possiveis * 100

A mais rigorosa. Combinacao de todos os branches.
Impraticavel para codigo complexo (explosao combinatorial).
```

**Limitacoes criticas do code coverage:**

```
COVERAGE ALTO != TESTES BONS

Voce pode ter 100% de coverage com 0% de assertions:

def test_com_coverage_mas_sem_valor():
    resultado = calcular_risco_portfolio(posicoes)  # Executa o codigo
    # Nenhum assert! O teste sempre passa, mesmo se o resultado estiver errado.

Isso gera uma falsa sensacao de seguranca.
```

**Metricas recomendadas:**
- Coverage como gate minimo: 70-80% de branch coverage para logica de dominio
- Coverage como indicador, nao como objetivo
- Nunca perseguir 100% -- retorno decrescente apos ~80%
- Complementar com mutation testing

### 3.5 Mutation Testing

Mutation testing e a tecnica que realmente mede a efetividade dos testes, nao apenas a cobertura de execucao.

**Como funciona:**

```
1. O framework cria "mutantes" do codigo:
   - Troca `>` por `>=`
   - Troca `+` por `-`
   - Remove uma linha
   - Troca `true` por `false`
   - Substitui um retorno por null/zero

2. Executa os testes contra cada mutante

3. Se os testes FALHAM -> mutante "morto" (BOM: testes detectaram a mudanca)
   Se os testes PASSAM -> mutante "sobreviveu" (RUIM: testes nao detectaram)

4. Mutation Score = Mutantes Mortos / Total de Mutantes * 100
```

**Ferramentas por linguagem:**

| Linguagem | Ferramenta | Maturidade |
|-----------|-----------|------------|
| Java | PIT (pitest.org) | Referencia, muito maduro |
| Python | mutmut, cosmic-ray | Bom, em evolucao |
| JavaScript | Stryker | Muito bom |
| C# | Stryker.NET | Bom |
| Go | go-mutesting | Basico |

**Relacao Coverage vs Mutation Score:**

```
E possivel ter:
- 100% Code Coverage + 0% Mutation Score (sem assertions)
- 80% Code Coverage + 95% Mutation Score (testes focados e efetivos)

Mutation Score e SEMPRE mais confiavel que Code Coverage.
Code Coverage mede execucao; Mutation Testing mede deteccao de bugs.
```

**Limitacao pratica:** Mutation testing e computacionalmente caro (executa o suite de testes N vezes, onde N = numero de mutantes). Para bases grandes, deve ser executado incrementalmente ou em CI noturno, nao em cada commit.

---

## 4. Naming e Organizacao

### 4.1 Convencoes de Naming para Testes

O nome de um teste e sua documentacao mais importante. Deve comunicar claramente: o que esta sendo testado, em que condicao, e qual o resultado esperado.

**Convencao 1: MethodName_StateUnderTest_ExpectedBehavior (Roy Osherove)**

```python
def test_calcular_retorno_preco_positivo_retorna_percentual_correto():
    ...

def test_validar_ordem_quantidade_zero_lanca_excecao():
    ...

def test_calcular_sharpe_retornos_constantes_retorna_zero():
    ...
```

Vantagem: muito precisa. Desvantagem: acoplada ao nome do metodo (quebra se renomear).

**Convencao 2: Should_ExpectedBehavior_When_Condition**

```python
def test_should_generate_buy_signal_when_short_ma_crosses_above_long_ma():
    ...

def test_should_reject_order_when_position_limit_exceeded():
    ...
```

Vantagem: foco no comportamento. Desvantagem: nomes longos.

**Convencao 3: Given_When_Then (BDD-style)**

```python
def test_given_bullish_crossover_when_evaluating_signal_then_returns_buy():
    ...

def test_given_max_drawdown_exceeded_when_checking_risk_then_halts_trading():
    ...
```

Vantagem: alinhada com BDD, excelente legibilidade. Desvantagem: nomes muito longos.

**Convencao 4: Descricao em linguagem natural (Khorikov)**

Khorikov recomenda usar descricoes simples em linguagem natural, sem prefixos rigidos:

```python
def test_retorno_percentual_calculado_corretamente_para_posicao_comprada():
    ...

def test_posicao_fechada_quando_stop_loss_atingido():
    ...

def test_alerta_enviado_quando_drawdown_excede_limite():
    ...
```

**Recomendacao para o bot:** Usar a Convencao 4 (Khorikov) para testes em portugues, ou Convencao 2 (Should/When) para testes em ingles. O mais importante e consistencia dentro do projeto.

### 4.2 Organizacao de Test Suites

**Estrutura de diretorios recomendada (Python/pytest):**

```
bot-investimentos/
|-- src/
|   |-- domain/
|   |   |-- strategies/
|   |   |   |-- moving_average.py
|   |   |   |-- rsi_strategy.py
|   |   |-- risk/
|   |   |   |-- position_sizer.py
|   |   |   |-- drawdown_monitor.py
|   |   |-- portfolio/
|   |       |-- portfolio.py
|   |       |-- position.py
|   |-- infrastructure/
|       |-- broker/
|       |-- data_feed/
|
|-- tests/
|   |-- unit/                          # Testes unitarios
|   |   |-- domain/
|   |   |   |-- strategies/
|   |   |   |   |-- test_moving_average.py
|   |   |   |   |-- test_rsi_strategy.py
|   |   |   |-- risk/
|   |   |   |   |-- test_position_sizer.py
|   |   |   |   |-- test_drawdown_monitor.py
|   |   |   |-- portfolio/
|   |   |       |-- test_portfolio.py
|   |   |       |-- test_position.py
|   |   |-- conftest.py                # Fixtures compartilhadas
|   |
|   |-- integration/                   # Testes de integracao
|   |   |-- test_broker_connection.py
|   |   |-- test_data_feed.py
|   |
|   |-- e2e/                           # Testes end-to-end
|   |   |-- test_full_trading_cycle.py
|   |
|   |-- fixtures/                      # Test data builders / factories
|   |   |-- candle_builder.py
|   |   |-- order_builder.py
|   |   |-- portfolio_builder.py
|   |
|   |-- conftest.py                    # Fixtures globais
```

**Regras de organizacao:**

1. **Espelhar a estrutura do src/** -- Cada modulo de producao tem um correspondente em tests/
2. **Separar por tipo de teste** -- unit/, integration/, e2e/
3. **Fixtures compartilhadas em conftest.py** -- Fixtures usadas por multiplos testes ficam no conftest.py mais proximo
4. **Um arquivo de teste por modulo** -- `test_moving_average.py` testa `moving_average.py`
5. **Testes agrupados por comportamento dentro do arquivo** -- Classes ou secoes para agrupar cenarios relacionados

### 4.3 Setup e Teardown

**Implicit Setup (setUp/tearDown):**

```python
class TestPortfolio:
    def setup_method(self):
        """Executado antes de CADA teste."""
        self.portfolio = Portfolio()
        self.portfolio.adicionar_posicao("PETR4", 100, 28.50)

    def teardown_method(self):
        """Executado apos CADA teste."""
        self.portfolio = None

    def test_valor_total_calculado_corretamente(self):
        assert self.portfolio.valor_total() == 2850.0
```

**Pytest Fixtures (preferido):**

```python
@pytest.fixture
def portfolio_com_posicao_petr4():
    """Cria portfolio com posicao em PETR4."""
    portfolio = Portfolio()
    portfolio.adicionar_posicao("PETR4", 100, 28.50)
    return portfolio

def test_valor_total(portfolio_com_posicao_petr4):
    assert portfolio_com_posicao_petr4.valor_total() == 2850.0
```

Fixtures do pytest sao superiores ao setup/teardown classico porque:
- Sao explicitas (cada teste declara o que precisa)
- Sao composiveis (fixtures podem depender de outras fixtures)
- Sao reutilizaveis (via conftest.py)
- Suportam scoping (function, class, module, session)

### 4.4 Test Data Builders

O padrao Test Data Builder, proposto por Nat Pryce (co-autor do GOOS), resolve o problema de criar objetos de teste complexos sem poluir os testes com detalhes irrelevantes.

```python
class CandleBuilder:
    """Builder para criar candles com defaults sensiveis."""

    def __init__(self):
        self._timestamp = datetime(2026, 1, 15, 10, 0, 0)
        self._open = 100.0
        self._high = 105.0
        self._low = 95.0
        self._close = 102.0
        self._volume = 1_000_000

    def with_close(self, close):
        self._close = close
        return self

    def with_timestamp(self, timestamp):
        self._timestamp = timestamp
        return self

    def with_volume(self, volume):
        self._volume = volume
        return self

    def bullish(self):
        """Cria um candle de alta."""
        self._open = 95.0
        self._close = 105.0
        return self

    def bearish(self):
        """Cria um candle de baixa."""
        self._open = 105.0
        self._close = 95.0
        return self

    def build(self):
        return Candle(
            timestamp=self._timestamp,
            open=self._open,
            high=self._high,
            low=self._low,
            close=self._close,
            volume=self._volume,
        )

# Uso no teste -- apenas os detalhes relevantes sao mencionados
def test_estrategia_detecta_candle_de_alta():
    candle = CandleBuilder().bullish().with_volume(2_000_000).build()

    assert estrategia.classificar(candle) == "bullish"
```

### 4.5 Object Mother

O padrao Object Mother, documentado por Martin Fowler, e uma factory que cria objetos pre-configurados para testes:

```python
class PortfolioMother:
    """Factory de portfolios pre-configurados para testes."""

    @staticmethod
    def vazio():
        return Portfolio()

    @staticmethod
    def com_posicao_unica():
        p = Portfolio()
        p.adicionar_posicao("PETR4", 100, 28.50)
        return p

    @staticmethod
    def diversificado():
        p = Portfolio()
        p.adicionar_posicao("PETR4", 100, 28.50)
        p.adicionar_posicao("VALE3", 50, 68.20)
        p.adicionar_posicao("ITUB4", 200, 32.10)
        p.adicionar_posicao("BBDC4", 150, 15.80)
        return p

    @staticmethod
    def em_drawdown():
        """Portfolio com perda significativa para testes de risco."""
        p = Portfolio()
        p.adicionar_posicao("PETR4", 100, 35.00)  # Comprou a 35
        p.atualizar_preco("PETR4", 28.00)          # Agora vale 28
        return p
```

**Builder vs Object Mother:** Use Object Mother para cenarios fixos e recorrentes. Use Builder quando precisar de variacao fina nos atributos. A combinacao ideal e um Object Mother que retorna Builders:

```python
class OrdemMother:
    @staticmethod
    def compra_petr4():
        return OrdemBuilder().compra().ativo("PETR4").quantidade(100).preco(28.50)

    # Retorna um builder que pode ser customizado antes de .build()
```

---

## 5. TDD -- Test-Driven Development

### 5.1 Origem e Filosofia

Test-Driven Development (TDD) foi formalizado por Kent Beck no final dos anos 1990 como parte do Extreme Programming (XP). O livro fundador e "Test-Driven Development: By Example" (Kent Beck, 2003), que continua sendo a referencia primaria.

A filosofia central do TDD e:

> "Clean code that works -- now. This is the goal of Test-Driven Development." -- Kent Beck

TDD inverte o fluxo tradicional: ao inves de escrever codigo e depois testar, voce escreve o teste primeiro e depois escreve o minimo de codigo para faze-lo passar.

### 5.2 O Ciclo Red-Green-Refactor

O ciclo TDD consiste em tres fases executadas em iteracoes muito curtas (minutos):

```
        +----------+
        |   RED    |  Escreva um teste que FALHA
        |  (fail)  |  (por uma razao que voce previu)
        +-----+----+
              |
              v
        +----------+
        |  GREEN   |  Escreva o MINIMO de codigo
        |  (pass)  |  para fazer o teste PASSAR
        +-----+----+
              |
              v
        +----------+
        | REFACTOR |  Melhore o design do codigo
        | (clean)  |  SEM mudar comportamento
        +-----+----+
              |
              +----> volta para RED
```

**Fase RED -- Escreva um teste que falha:**
- O teste define o comportamento desejado
- Rode o teste e confirme que ele FALHA
- Confirme que falha pela razao CERTA (nao por erro de compilacao)
- O teste deve ser o mais simples possivel

**Fase GREEN -- Faca o teste passar:**
- Escreva o minimo absoluto de codigo para passar
- E aceitavel "pecados" temporarios: valores hardcoded, ifs feios
- "Fake it till you make it"
- NAO otimize, NAO generalize, NAO limpe

**Fase REFACTOR -- Melhore o design:**
- Remova duplicacao
- Melhore nomes
- Extraia metodos/classes
- Aplique padroes de design
- Os testes devem continuar passando
- Refatore TAMBEM os testes

### 5.3 As Tres Leis do TDD (Robert C. Martin)

Uncle Bob formalizou tres regras estritas:

```
1. Nao escreva NENHUM codigo de producao ate ter um teste que falha.

2. Nao escreva MAIS do que o suficiente de um teste para falhar
   (e nao compilar e falhar).

3. Nao escreva MAIS codigo de producao do que o suficiente
   para fazer o teste atualmente falhando passar.
```

Seguir essas regras estritamente resulta em ciclos de 30 segundos a 2 minutos.

### 5.4 TDD Aplicado ao Bot de Investimentos

**Exemplo: Desenvolvendo um calculador de Sharpe Ratio com TDD**

```python
# CICLO 1 -- RED: teste mais simples possivel
def test_sharpe_ratio_retornos_vazios():
    assert calcular_sharpe_ratio([]) == 0.0
    # FAIL: NameError: name 'calcular_sharpe_ratio' is not defined

# CICLO 1 -- GREEN: implementacao minima
def calcular_sharpe_ratio(retornos):
    return 0.0
    # PASS

# CICLO 2 -- RED: proximo comportamento
def test_sharpe_ratio_retornos_constantes():
    # Retornos constantes -> desvio padrao 0 -> Sharpe indefinido -> 0
    assert calcular_sharpe_ratio([0.01, 0.01, 0.01]) == 0.0
    # PASS (ja funciona com a implementacao atual)

# CICLO 3 -- RED: caso real
def test_sharpe_ratio_retornos_variados():
    retornos = [0.02, -0.01, 0.03, -0.005, 0.015]
    resultado = calcular_sharpe_ratio(retornos)
    assert resultado == pytest.approx(1.78, abs=0.1)
    # FAIL: retorna 0.0

# CICLO 3 -- GREEN: implementacao real
import statistics
import math

def calcular_sharpe_ratio(retornos, risk_free_rate=0.0, periodos_anuais=252):
    if len(retornos) < 2:
        return 0.0
    media = statistics.mean(retornos)
    desvio = statistics.stdev(retornos)
    if desvio == 0:
        return 0.0
    sharpe = (media - risk_free_rate) / desvio
    return sharpe * math.sqrt(periodos_anuais)
    # PASS

# CICLO 4 -- REFACTOR: melhorar nomes, extrair constantes, etc.
```

### 5.5 Beneficios do TDD

Baseado em evidencias empiricas e na literatura:

1. **Design melhor** -- Testes primeiro forcam interfaces mais limpas e menor acoplamento
2. **Menos bugs** -- Estudos da Microsoft e IBM mostram 40-90% menos defeitos (Nagappan et al., 2008)
3. **Documentacao viva** -- Testes servem como especificacao executavel
4. **Confianca para refatorar** -- Suite de testes como rede de seguranca
5. **Progresso incremental** -- Problemas complexos decompostos em passos pequenos
6. **Feedback imediato** -- Bugs detectados em segundos, nao dias

### 5.6 Criticas ao TDD

O TDD nao e consenso universal. Criticas fundamentadas incluem:

1. **Overhead inicial** -- Desenvolvimento inicialmente mais lento (15-35% segundo estudos)
2. **Curva de aprendizado** -- Requer pratica para fazer bem; TDD mal feito e pior que nao fazer
3. **Nao adequado para tudo** -- Codigo exploratario, prototipacao rapida, UI
4. **Design pode ficar "test-shaped"** -- Codigo organizado para testabilidade, nao para o dominio
5. **False sense of security** -- Suite de testes extenso nao garante que os testes sao bons
6. **Kent Beck (2023):** "TDD is great for what it does. It doesn't do everything."

### 5.7 TDD vs Test-After

| Aspecto | TDD (Test-First) | Test-After |
|---------|------------------|------------|
| **Design** | Testes influenciam o design | Design ja decidido |
| **Cobertura** | Naturalmente alta | Depende de disciplina |
| **Foco** | Comportamento | Implementacao |
| **Refatoracao** | Continua, segura | Arriscada sem testes |
| **Custo** | Maior upfront, menor total | Menor upfront, maior total |
| **Realidade** | Requer disciplina constante | Mais comum na pratica |

**Posicao pragmatica:** TDD e ideal para logica de dominio complexa (calculos de risco, estrategias de trading). Test-After e aceitavel para codigo de infraestrutura, glue code, e CRUD simples.

---

## 6. BDD -- Behavior-Driven Development

### 6.1 Origem e Filosofia

BDD (Behavior-Driven Development) foi criado por Dan North em 2003 como uma evolucao do TDD. A motivacao principal era resolver confusoes que desenvolvedores tinham com TDD: o que testar, como nomear testes, e o que constitui uma "unidade".

BDD foca em comportamento do sistema descrito em linguagem do dominio, nao em detalhes tecnicos.

### 6.2 Gherkin: A Linguagem de Especificacao

Gherkin e a linguagem estruturada usada para escrever cenarios BDD, executaveis por ferramentas como Cucumber, SpecFlow, Behave (Python), e pytest-bdd.

```gherkin
Feature: Gerenciamento de Risco do Portfolio
  Como um bot de investimentos
  Eu quero monitorar o drawdown do portfolio
  Para proteger o capital do investidor

  Scenario: Halt trading quando drawdown excede limite
    Given um portfolio com valor inicial de R$ 100.000
    And o limite de drawdown configurado em 10%
    When o valor do portfolio cai para R$ 89.000
    Then o bot deve parar de abrir novas posicoes
    And deve enviar alerta de drawdown ao operador

  Scenario: Retomar trading apos recuperacao parcial
    Given o bot parou por drawdown excedido
    And o valor do portfolio era R$ 89.000
    When o portfolio recupera para R$ 93.000
    And o operador autoriza a retomada
    Then o bot deve voltar a operar normalmente

  Scenario Outline: Calculo de position sizing por risco
    Given um portfolio com capital de R$ <capital>
    And risco maximo por trade de <risco_pct>%
    And stop loss de <stop_pct>% do preco de entrada
    When calculo o tamanho maximo da posicao
    Then o valor maximo da posicao deve ser R$ <valor_posicao>

    Examples:
      | capital   | risco_pct | stop_pct | valor_posicao |
      | 100000    | 1.0       | 2.0      | 50000         |
      | 100000    | 2.0       | 5.0      | 40000         |
      | 50000     | 1.0       | 3.0      | 16666         |
```

### 6.3 Step Definitions em Python (pytest-bdd)

```python
from pytest_bdd import given, when, then, parsers, scenario

@scenario('risk_management.feature', 'Halt trading quando drawdown excede limite')
def test_halt_trading():
    pass

@given(parsers.parse('um portfolio com valor inicial de R$ {valor:d}'))
def portfolio_inicial(valor):
    return Portfolio(valor_inicial=valor)

@given(parsers.parse('o limite de drawdown configurado em {limite:d}%'))
def configurar_limite(portfolio_inicial, limite):
    portfolio_inicial.configurar_drawdown_limite(limite / 100)
    return portfolio_inicial

@when(parsers.parse('o valor do portfolio cai para R$ {valor:d}'))
def portfolio_cai(portfolio_inicial, valor):
    portfolio_inicial.atualizar_valor(valor)

@then('o bot deve parar de abrir novas posicoes')
def verifica_halt(portfolio_inicial):
    assert portfolio_inicial.trading_habilitado == False
```

### 6.4 BDD vs TDD

| Aspecto | TDD | BDD |
|---------|-----|-----|
| **Foco** | Implementacao correta | Comportamento correto |
| **Linguagem** | Tecnica (codigo) | Dominio (Gherkin) |
| **Audiencia** | Desenvolvedores | Dev + Product + QA |
| **Granularidade** | Unitaria | Feature/Cenario |
| **Naming** | test_metodo_condicao | Given/When/Then |
| **Ferramentas** | pytest, JUnit | Cucumber, Behave |

Na pratica, BDD e TDD sao complementares: BDD define o "que" no nivel de features, TDD implementa o "como" no nivel de unidades.

---

## 7. Frameworks e Ferramentas

### 7.1 pytest (Python) -- Recomendado para o Bot

pytest e o framework de testes padrao para Python moderno. E o mais relevante para nosso bot de investimentos.

**Recursos essenciais:**

```python
# Fixtures com scoping
@pytest.fixture(scope="module")
def dados_historicos():
    """Carregado uma vez por modulo de teste."""
    return carregar_dados("PETR4", "2025-01-01", "2025-12-31")

# Parametrizacao
@pytest.mark.parametrize("ativo,esperado", [
    ("PETR4", True),
    ("VALE3", True),
    ("XXXX11", False),
])
def test_validar_ativo(ativo, esperado):
    assert validar_ativo(ativo) == esperado

# Marcadores para categorizar testes
@pytest.mark.slow
def test_backtest_estrategia_completa():
    ...

@pytest.mark.integration
def test_conexao_broker():
    ...

# Verificacao de excecoes
def test_ordem_invalida_lanca_excecao():
    with pytest.raises(OrdemInvalidaError, match="quantidade deve ser positiva"):
        Ordem(ativo="PETR4", quantidade=-100)

# Approximate matching para floats
def test_retorno_percentual():
    assert calcular_retorno(100, 110) == pytest.approx(10.0, rel=1e-6)
```

**Configuracao recomendada (pyproject.toml):**

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
markers = [
    "slow: testes que demoram mais de 1s",
    "integration: testes de integracao",
    "e2e: testes end-to-end",
]
addopts = [
    "--strict-markers",
    "--tb=short",
    "-v",
]
```

### 7.2 JUnit 5 (Java)

O framework padrao para Java, referencia historica da familia xUnit:

```java
@DisplayName("Calculador de Risco")
class CalculadorRiscoTest {

    @Test
    @DisplayName("deve calcular VaR parametrico corretamente")
    void deveCalcularVarParametrico() {
        var retornos = List.of(0.02, -0.01, 0.03, -0.005, 0.015);
        var var95 = CalculadorRisco.calcularVaR(retornos, 0.95);

        assertEquals(-0.0135, var95, 0.001);
    }

    @ParameterizedTest
    @CsvSource({
        "100000, 0.01, 0.02, 50000",
        "100000, 0.02, 0.05, 40000",
    })
    void deveCalcularPositionSizing(
            double capital, double risco, double stop, double esperado) {
        var tamanho = CalculadorRisco.positionSize(capital, risco, stop);
        assertEquals(esperado, tamanho, 0.01);
    }
}
```

### 7.3 xUnit/NUnit (.NET)

```csharp
public class PortfolioTests
{
    [Fact]
    public void ValorTotal_ComDuasPosicoes_RetornaSomaCorreta()
    {
        // Arrange
        var portfolio = new Portfolio();
        portfolio.AdicionarPosicao("PETR4", 100, 28.50m);
        portfolio.AdicionarPosicao("VALE3", 50, 68.20m);

        // Act
        var total = portfolio.CalcularValorTotal();

        // Assert
        Assert.Equal(6260.0m, total);
    }

    [Theory]
    [InlineData(100, 110, 10.0)]
    [InlineData(100, 90, -10.0)]
    [InlineData(100, 100, 0.0)]
    public void RetornoPercentual_DevolvePorcentagemCorreta(
        decimal entrada, decimal saida, decimal esperado)
    {
        var retorno = Calculadora.RetornoPercentual(entrada, saida);
        Assert.Equal(esperado, retorno);
    }
}
```

### 7.4 Jest (JavaScript/TypeScript)

```javascript
describe('TradingStrategy', () => {
    describe('movingAverageCrossover', () => {
        it('should generate BUY signal when short MA crosses above long MA', () => {
            const candles = generateBullishCrossover();
            const strategy = new MovingAverageCrossover({ short: 9, long: 21 });

            const signal = strategy.evaluate(candles);

            expect(signal).toBe('BUY');
        });

        it('should generate no signal during flat market', () => {
            const candles = generateFlatMarket();
            const strategy = new MovingAverageCrossover({ short: 9, long: 21 });

            const signal = strategy.evaluate(candles);

            expect(signal).toBeNull();
        });
    });
});
```

### 7.5 Go Testing

```go
func TestCalcularRetorno(t *testing.T) {
    tests := []struct {
        name     string
        entrada  float64
        saida    float64
        esperado float64
    }{
        {"lucro de 10%", 100.0, 110.0, 10.0},
        {"prejuizo de 10%", 100.0, 90.0, -10.0},
        {"sem variacao", 100.0, 100.0, 0.0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            resultado := CalcularRetorno(tt.entrada, tt.saida)
            if math.Abs(resultado-tt.esperado) > 0.001 {
                t.Errorf("esperado %f, obtido %f", tt.esperado, resultado)
            }
        })
    }
}
```

### 7.6 Property-Based Testing

Property-based testing, originado com QuickCheck (Haskell, 1999) e popularizado em Python pela biblioteca Hypothesis, e uma abordagem complementar ao teste baseado em exemplos.

**Filosofia:** Em vez de especificar exemplos concretos (input X -> output Y), voce especifica propriedades que devem ser verdadeiras para QUALQUER input valido. O framework gera centenas de inputs aleatorios e verifica se a propriedade se mantem.

```python
from hypothesis import given, settings
from hypothesis import strategies as st

# Propriedade: retorno percentual e antisimetrico
@given(
    preco_entrada=st.floats(min_value=0.01, max_value=10000.0),
    preco_saida=st.floats(min_value=0.01, max_value=10000.0),
)
def test_retorno_ida_e_volta_resulta_em_original(preco_entrada, preco_saida):
    """Se compro a P1 e vendo a P2, e depois compro a P2 e vendo a P1,
    o retorno composto deve ser zero."""
    retorno1 = calcular_retorno(preco_entrada, preco_saida)
    retorno2 = calcular_retorno(preco_saida, preco_entrada)
    retorno_composto = (1 + retorno1/100) * (1 + retorno2/100) - 1
    assert abs(retorno_composto) < 1e-9

# Propriedade: Sharpe ratio e invariante a escala de retornos constantes
@given(
    retorno=st.floats(min_value=-0.5, max_value=0.5),
    n=st.integers(min_value=10, max_value=100),
)
def test_sharpe_ratio_retornos_constantes_e_zero(retorno, n):
    """Retornos constantes -> desvio padrao 0 -> Sharpe indefinido/zero."""
    retornos = [retorno] * n
    assert calcular_sharpe_ratio(retornos) == 0.0

# Propriedade: position size nunca excede o capital total
@given(
    capital=st.floats(min_value=1000, max_value=10_000_000),
    risco_pct=st.floats(min_value=0.001, max_value=0.10),
    stop_pct=st.floats(min_value=0.001, max_value=0.50),
)
def test_position_size_nunca_excede_capital(capital, risco_pct, stop_pct):
    tamanho = calcular_position_size(capital, risco_pct, stop_pct)
    assert 0 <= tamanho <= capital
```

**Vantagens do property-based testing:**
- Descobre edge cases que voce nao pensou
- Shrinking: quando encontra um bug, minimiza o input para o caso mais simples que reproduz o bug
- Complementa (nao substitui) testes baseados em exemplos
- Especialmente valioso para funcoes matematicas e financeiras

### 7.7 Snapshot Testing

Snapshot testing (popularizado pelo Jest) salva o output de uma funcao e compara com outputs futuros. Util para detectar mudancas inesperadas.

```python
# Com pytest-snapshot ou syrupy
def test_relatorio_portfolio(snapshot):
    portfolio = PortfolioMother.diversificado()
    relatorio = portfolio.gerar_relatorio()

    assert relatorio == snapshot
    # Na primeira execucao, salva o snapshot
    # Nas seguintes, compara com o salvo
```

**Cuidados:** Snapshots podem se tornar "rubber stamp tests" -- desenvolvedores atualizam snapshots automaticamente sem verificar se a mudanca e correta. Use com moderacao e sempre revise diferencas em code review.

---

## 8. Anti-Patterns de Testes Unitarios

### 8.1 Catalogo de Anti-Patterns

Baseado nas obras de Khorikov, Osherove, Meszaros, e no influente catalogo de Kostis Kapelonis ("Software Testing Anti-patterns"):

**Anti-Pattern 1: The Liar (O Mentiroso)**

Teste que sempre passa, independente do comportamento do codigo.

```python
# ANTI-PATTERN: teste sem assertion
def test_calcular_risco():
    resultado = calcular_var(retornos, 0.95)
    # Nenhum assert! Sempre passa.

# ANTI-PATTERN: assertion trivial
def test_calcular_risco_v2():
    resultado = calcular_var(retornos, 0.95)
    assert True  # Sempre passa.
```

**Anti-Pattern 2: The Inspector (O Inspetor)**

Teste que viola encapsulamento para verificar detalhes internos.

```python
# ANTI-PATTERN: acessando atributos privados
def test_media_movel_inspector():
    strategy = EstrategiaMediaMovel(periodo=20)
    strategy.atualizar(candles)

    # Verificando estado interno -- vai quebrar em qualquer refatoracao
    assert strategy._buffer_precos == [28.5, 29.0, 27.8, ...]
    assert strategy._indice_atual == 20
    assert strategy._soma_parcial == 571.3
```

**Anti-Pattern 3: Excessive Setup (Setup Excessivo)**

Teste que precisa de dezenas de linhas de setup antes do Act.

```python
# ANTI-PATTERN: setup gigantesco
def test_gerar_sinal_com_setup_excessivo():
    config = Config()
    config.set("ma_curta", 9)
    config.set("ma_longa", 21)
    config.set("rsi_periodo", 14)
    config.set("rsi_oversold", 30)
    config.set("rsi_overbought", 70)
    config.set("volume_min", 100000)
    # ... mais 20 linhas de configuracao ...

    broker = MockBroker()
    data_feed = MockDataFeed()
    risk_manager = RiskManager(config)
    # ... mais objetos ...

    strategy = Strategy(config, broker, data_feed, risk_manager)
    sinal = strategy.avaliar()

    assert sinal == Sinal.COMPRA

# CORRECAO: usar Test Data Builder
def test_gerar_sinal_refatorado():
    strategy = StrategyBuilder().media_movel(9, 21).com_candles_alta().build()
    assert strategy.avaliar() == Sinal.COMPRA
```

**Anti-Pattern 4: Over-Mocking (Excesso de Mocks)**

Teste com tantos mocks que testa os mocks, nao o codigo.

```python
# ANTI-PATTERN: over-mocking
def test_over_mocked():
    mock_repo = Mock()
    mock_calculador = Mock()
    mock_validador = Mock()
    mock_notificador = Mock()
    mock_logger = Mock()

    mock_validador.validar.return_value = True
    mock_calculador.calcular_risco.return_value = 0.05
    mock_repo.buscar_portfolio.return_value = PortfolioMock()

    service = TradingService(mock_repo, mock_calculador, mock_validador,
                             mock_notificador, mock_logger)
    service.executar_ordem(OrdemMock())

    # Verificando chamadas a mocks -- testa o "como", nao o "que"
    mock_validador.validar.assert_called_once()
    mock_calculador.calcular_risco.assert_called_once()
    mock_repo.salvar.assert_called_once()
    mock_notificador.notificar.assert_called_once()
    # Este teste nao verifica NADA sobre o resultado real!
```

**Anti-Pattern 5: Fragile Tests (Testes Frageis)**

Testes que quebram com qualquer mudanca interna, mesmo sem mudanca de comportamento.

```python
# ANTI-PATTERN: acoplado a implementacao
def test_fragile():
    mock_api = Mock()
    strategy = Strategy(api=mock_api)

    strategy.analisar("PETR4")

    # Se o metodo interno mudar de "buscar_dados" para "obter_dados",
    # ou se a ordem das chamadas mudar, o teste quebra
    mock_api.buscar_dados.assert_called_with("PETR4")
    mock_api.processar.assert_called_once()
    assert mock_api.buscar_dados.call_count == 3  # Numero magico
```

**Anti-Pattern 6: Test Interdependency (Testes Interdependentes)**

Testes que dependem da ordem de execucao ou do resultado de outros testes.

```python
# ANTI-PATTERN: testes dependentes
class TestPortfolioInterdependente:
    portfolio = None  # Estado compartilhado!

    def test_1_criar_portfolio(self):
        TestPortfolioInterdependente.portfolio = Portfolio()
        assert self.portfolio is not None

    def test_2_adicionar_posicao(self):
        # Depende de test_1 ter executado antes!
        self.portfolio.adicionar("PETR4", 100)
        assert len(self.portfolio.posicoes) == 1

    def test_3_calcular_valor(self):
        # Depende de test_1 E test_2!
        valor = self.portfolio.valor_total()
        assert valor > 0
```

**Anti-Pattern 7: Flaky Tests (Testes Esporadicos)**

Testes que as vezes passam e as vezes falham, sem mudanca de codigo.

Causas comuns:
- Dependencia de hora atual (`datetime.now()`)
- Dependencia de ordem de elementos em sets/dicts
- Race conditions em testes concorrentes
- Dependencia de servicos externos
- Dados aleatorios sem seed fixa
- Timeouts agressivos

```python
# ANTI-PATTERN: flaky por depender de hora
def test_flaky_hora():
    ordem = Ordem(ativo="PETR4", timestamp=datetime.now())
    assert ordem.esta_dentro_horario_pregao()
    # Falha as 3 da manha, passa as 11 da manha!

# CORRECAO: injetar o relogio
def test_corrigido_hora():
    relogio = MockRelogio(hora=datetime(2026, 1, 15, 11, 0, 0))
    ordem = Ordem(ativo="PETR4", timestamp=relogio.agora())
    assert ordem.esta_dentro_horario_pregao()
```

**Anti-Pattern 8: Testing Private Methods (Testar Metodos Privados)**

```python
# ANTI-PATTERN: testando metodo privado
def test_metodo_privado():
    strategy = EstrategiaRSI()

    # Acessando metodo privado diretamente
    resultado = strategy._calcular_ganho_medio([1.5, 2.0, 0.5])
    assert resultado == 1.333

# CORRECAO: testar via API publica
def test_via_api_publica():
    strategy = EstrategiaRSI(periodo=14)
    candles = gerar_candles_com_tendencia_alta()

    rsi = strategy.calcular(candles)

    assert rsi > 70  # RSI alto em tendencia de alta
```

**Anti-Pattern 9: 100% Coverage Obsession**

```
A busca por 100% de cobertura leva a:
- Testes triviais sem valor (testar getters)
- Testes frageis acoplados a implementacao
- Falsa sensacao de seguranca
- Custo de manutencao desproporcional

Meta realista:
- 70-80% line coverage para o projeto
- 90%+ para logica de dominio critica
- 0% para codigo trivial/gerado
- Complementar com mutation testing
```

**Anti-Pattern 10: The Giant (O Gigante)**

Teste com centenas de linhas que testa multiplos comportamentos.

```python
# ANTI-PATTERN: teste gigante
def test_todo_o_fluxo_de_trading():
    # 150 linhas testando: validacao, calculo de risco, execucao,
    # notificacao, logging, persistencia...
    # Quando falha, ninguem sabe o que quebrou.

# CORRECAO: um teste por comportamento
def test_validacao_rejeita_quantidade_negativa(): ...
def test_calculo_risco_position_sizing_correto(): ...
def test_execucao_envia_ordem_ao_broker(): ...
def test_notificacao_enviada_apos_execucao(): ...
```

### 8.2 Resumo de Anti-Patterns

| Anti-Pattern | Problema | Solucao |
|-------------|----------|---------|
| The Liar | Sem assertions | Assertions explicitas |
| The Inspector | Viola encapsulamento | Testar API publica |
| Excessive Setup | Setup complexo demais | Test Data Builders |
| Over-Mocking | Testa mocks, nao codigo | Preferir objetos reais |
| Fragile Tests | Quebra com refatoracao | Testar comportamento |
| Interdependency | Testes acoplados | Testes independentes |
| Flaky Tests | Resultado nao-deterministico | Controlar dependencias |
| Testing Private | Acoplamento interno | Testar via interface publica |
| 100% Coverage | Custo > beneficio | Focar em valor |
| The Giant | Teste enorme | Um teste por comportamento |

---

## 9. Metricas de Qualidade de Testes

### 9.1 Code Coverage vs Mutation Score

```
+----------------------+--------------------+--------------------+
| Metrica              | Code Coverage      | Mutation Score     |
+----------------------+--------------------+--------------------+
| Mede                 | Codigo EXECUTADO   | Bugs DETECTADOS    |
| Escala               | 0-100%             | 0-100%             |
| Custo computacional  | Baixo              | Alto               |
| Confiabilidade       | Media              | Alta               |
| Falsos positivos     | Muitos             | Poucos             |
| Ferramenta Python    | pytest-cov         | mutmut             |
| Uso recomendado      | Gate minimo        | Qualidade real     |
+----------------------+--------------------+--------------------+
```

**Interpretacao:**

```
                        Mutation Score
                     Baixo          Alto
                 +-----------+-----------+
Code     Alto    | PERIGO!   | EXCELENTE |
Coverage         | Testes sem| Testes    |
                 | assertions| efetivos  |
                 +-----------+-----------+
         Baixo   | PESSIMO   | IMPOSSIVEL|
                 | Sem testes| (*)       |
                 +-----------+-----------+

(*) Mutation score alto com coverage baixo e matematicamente
    improvavel -- voce precisa executar o codigo para matar mutantes.
```

### 9.2 Test Effectiveness

Test Effectiveness mede a capacidade dos testes de encontrar bugs reais:

```
Test Effectiveness = Bugs encontrados por testes / Total de bugs * 100

Onde "Total de bugs" inclui bugs encontrados em producao.

Benchmark:
- < 50%: suite de testes deficiente
- 50-70%: adequado
- 70-85%: bom
- > 85%: excelente
```

### 9.3 Assertion Density

```
Assertion Density = Numero de assertions / Numero de testes

Benchmarks:
- < 1.0: testes provavelmente incompletos (The Liar)
- 1.0-2.0: tipico e saudavel
- 2.0-5.0: aceitavel se verificando um unico conceito logico
- > 5.0: testes provavelmente testando muitos comportamentos

Nota: esta metrica pode ser manipulada. Use como indicador, nao como meta.
```

### 9.4 Test-to-Code Ratio

```
Test-to-Code Ratio = Linhas de teste / Linhas de codigo de producao

Benchmarks da industria:
- 0.5:1 a 1:1 para codigo com baixa criticidade
- 1:1 a 2:1 para codigo de dominio
- 2:1 a 3:1 para codigo financeiro/critico
- Ate 5:1 para bibliotecas publicas amplamente usadas

Para o bot de investimentos:
- Logica de estrategia: 2:1 a 3:1
- Calculos de risco: 3:1 a 4:1
- Infraestrutura: 0.5:1 a 1:1
```

### 9.5 Metricas Derivadas

**MTFR (Mean Time to First Red):**
Tempo medio ate o primeiro teste falhar apos introducao de um bug. Quanto menor, melhor. Idealmente < 5 minutos (execucao em CI).

**Flakiness Rate:**
```
Flakiness = Execucoes com resultado inconsistente / Total de execucoes * 100

Meta: < 0.1%
Aceitavel: < 1%
Problemático: > 5%
```

**Test Execution Time:**
```
Para testes unitarios:
- Individual: < 100ms (idealmente < 10ms)
- Suite completo: < 60s (idealmente < 10s)
- Se exceder, provavelmente ha testes de integracao misturados
```

---

## 10. Piramide de Testes

### 10.1 O Modelo de Mike Cohn

A Piramide de Testes foi popularizada por Mike Cohn em "Succeeding with Agile" (2009). Define a proporcao ideal entre diferentes tipos de testes:

```
                    /\
                   /  \
                  / E2E \         Poucos (5-10%)
                 /  Tests \       Lentos, frageis, caros
                /----------\
               /             \
              / Integration    \   Moderados (15-25%)
             /    Tests         \  Medios em velocidade e custo
            /--------------------\
           /                      \
          /     Unit Tests          \  Muitos (65-80%)
         /        (BASE)             \  Rapidos, estaveis, baratos
        /------------------------------\
```

### 10.2 Caracteristicas de Cada Camada

| Camada | Quantidade | Velocidade | Custo | Estabilidade | Foco |
|--------|-----------|-----------|-------|-------------|------|
| **Unit** | Muitos (centenas-milhares) | Milissegundos | Baixo | Alta | Logica isolada |
| **Integration** | Moderados (dezenas-centenas) | Segundos | Medio | Media | Interacao entre componentes |
| **E2E** | Poucos (dezenas) | Minutos | Alto | Baixa | Fluxo completo |

### 10.3 Aplicacao ao Bot de Investimentos

```
Piramide de Testes do Bot:

                        /\
                       /  \
                      / E2E \
                     / Ciclo  \         5-10 testes E2E
                    / completo \        (signal -> order -> execution)
                   / de trading \
                  /---------------\
                 /                  \
                / Integration Tests  \   30-50 testes integracao
               / Broker API, DB,      \  (data feed real, persistencia)
              /  Data Feed, Portfolio   \
             /---------------------------\
            /                              \
           /       Unit Tests               \  200-500+ testes unitarios
          /  Estrategias, Risco, Calculos,   \
         /  Validacoes, Portfolio, Ordens      \
        /------------------------------------------\
```

### 10.4 Criticas Modernas a Piramide

A piramide de testes original tem sido questionada na comunidade:

**Testing Trophy (Kent C. Dodds):**
Propoe mais testes de integracao e menos unitarios, argumentando que integracao oferece mais confianca com custo aceitavel.

**Testing Diamond (Google):**
Para sistemas grandes, Google encontrou que a camada de integracao deveria ser a maior.

**Testing Honeycomb (Spotify):**
Para microsservicos, foco em testes de integracao com contratos.

**Posicao para o bot:** A piramide classica continua sendo a melhor abordagem para nosso caso. Calculos financeiros, estrategias de trading e logica de risco sao pre-eminentemente logica de dominio pura, que se beneficia enormemente de testes unitarios rapidos e numerosos. A camada de integracao testa conexoes com broker e data feeds. E2E verifica fluxos completos de trading.

---

## 11. Testes Unitarios para o Bot de Investimentos

### 11.1 Estrategia de Testes por Camada

```
+----------------------------+----------------------------------+-------------------+
| Modulo                     | O que testar (unitario)          | Test Doubles      |
+----------------------------+----------------------------------+-------------------+
| Strategy Engine            | Sinais gerados para cada cenario | Stubs de candles  |
| Risk Management            | Position sizing, VaR, drawdown   | Stubs de precos   |
| Order Validation           | Regras de validacao de ordens    | Nenhum (puro)     |
| Portfolio Calculator       | PnL, valor, exposicao            | Fake de repo      |
| Signal Aggregator          | Combinacao de sinais              | Stubs de sinais   |
| Broker Adapter             | Mapeamento de ordens              | Mock de API       |
| Data Feed Normalizer       | Normalizacao de dados             | Stubs de dados    |
+----------------------------+----------------------------------+-------------------+
```

### 11.2 Testando Strategy Signals Isolados

```python
class TestEstrategiaMediaMovel:
    """Testes para estrategia de cruzamento de medias moveis."""

    def test_sinal_compra_quando_ma_curta_cruza_acima_ma_longa(self):
        """Golden cross: MA(9) cruza acima de MA(21) -> COMPRA."""
        candles = CandleSeriesBuilder() \
            .tendencia_baixa(n=21) \
            .reversao_alta(n=10) \
            .build()

        strategy = EstrategiaMediaMovel(curta=9, longa=21)
        sinal = strategy.avaliar(candles)

        assert sinal.tipo == TipoSinal.COMPRA
        assert sinal.confianca > 0.5

    def test_sinal_venda_quando_ma_curta_cruza_abaixo_ma_longa(self):
        """Death cross: MA(9) cruza abaixo de MA(21) -> VENDA."""
        candles = CandleSeriesBuilder() \
            .tendencia_alta(n=21) \
            .reversao_baixa(n=10) \
            .build()

        strategy = EstrategiaMediaMovel(curta=9, longa=21)
        sinal = strategy.avaliar(candles)

        assert sinal.tipo == TipoSinal.VENDA

    def test_sem_sinal_quando_medias_paralelas(self):
        """Sem cruzamento -> sem sinal."""
        candles = CandleSeriesBuilder() \
            .mercado_lateral(n=50) \
            .build()

        strategy = EstrategiaMediaMovel(curta=9, longa=21)
        sinal = strategy.avaliar(candles)

        assert sinal.tipo == TipoSinal.NEUTRO

    def test_requer_minimo_de_candles(self):
        """Com poucos candles, deve retornar NEUTRO (dados insuficientes)."""
        candles = CandleSeriesBuilder().n_candles(5).build()

        strategy = EstrategiaMediaMovel(curta=9, longa=21)
        sinal = strategy.avaliar(candles)

        assert sinal.tipo == TipoSinal.NEUTRO

class TestEstrategiaRSI:
    """Testes para estrategia baseada em RSI."""

    @pytest.mark.parametrize("rsi_valor,sinal_esperado", [
        (25, TipoSinal.COMPRA),      # Oversold
        (50, TipoSinal.NEUTRO),      # Neutro
        (75, TipoSinal.VENDA),       # Overbought
    ])
    def test_sinais_por_nivel_rsi(self, rsi_valor, sinal_esperado):
        candles = CandleSeriesBuilder().com_rsi_aproximado(rsi_valor).build()
        strategy = EstrategiaRSI(periodo=14, oversold=30, overbought=70)

        sinal = strategy.avaliar(candles)

        assert sinal.tipo == sinal_esperado
```

### 11.3 Testando Risk Calculations

```python
class TestPositionSizer:
    """Testes para calculo de position sizing baseado em risco."""

    def test_position_size_basico(self):
        """Risco de 1% do capital com stop de 2% -> posicao = 50% do capital."""
        sizer = PositionSizer(capital=100_000, risco_max_por_trade=0.01)

        tamanho = sizer.calcular(preco=28.50, stop_loss=27.93)

        # Risco por acao = 28.50 - 27.93 = 0.57 (2%)
        # Risco total = 100_000 * 0.01 = 1_000
        # Quantidade = 1_000 / 0.57 = 1754 acoes
        # Valor = 1754 * 28.50 = 49_989
        assert tamanho.quantidade == 1754
        assert tamanho.valor_total == pytest.approx(49_989, rel=0.01)

    def test_position_size_limitada_por_capital(self):
        """Position size nao pode exceder o capital disponivel."""
        sizer = PositionSizer(capital=10_000, risco_max_por_trade=0.05)

        tamanho = sizer.calcular(preco=28.50, stop_loss=28.49)

        # Stop loss muito apertado resultaria em posicao enorme
        # Deve ser limitada pelo capital
        assert tamanho.valor_total <= 10_000

    def test_position_size_zero_quando_stop_igual_preco(self):
        """Stop loss igual ao preco de entrada -> risco por acao = 0 -> posicao = 0."""
        sizer = PositionSizer(capital=100_000, risco_max_por_trade=0.01)

        tamanho = sizer.calcular(preco=28.50, stop_loss=28.50)

        assert tamanho.quantidade == 0

class TestCalculadorVaR:
    """Testes para Value at Risk."""

    def test_var_parametrico_95(self):
        """VaR 95% com distribuicao normal conhecida."""
        # Retornos com media = 0.001 e std = 0.02
        retornos = gerar_retornos_normais(media=0.001, std=0.02, n=1000, seed=42)

        var_95 = CalculadorVaR.parametrico(retornos, confianca=0.95)

        # VaR 95% ~ media - 1.645 * std = 0.001 - 1.645 * 0.02 = -0.0319
        assert var_95 == pytest.approx(-0.032, abs=0.005)

    def test_var_historico(self):
        """VaR historico = percentil da distribuicao empirica."""
        retornos = [-0.05, -0.03, -0.02, -0.01, 0.0, 0.01, 0.02, 0.03, 0.04, 0.05]

        var_95 = CalculadorVaR.historico(retornos, confianca=0.95)

        # Percentil 5% dos retornos
        assert var_95 == pytest.approx(-0.045, abs=0.01)

    def test_var_retornos_vazios_lanca_excecao(self):
        with pytest.raises(DadosInsuficientesError):
            CalculadorVaR.parametrico([], confianca=0.95)

class TestDrawdownMonitor:
    """Testes para monitoramento de drawdown."""

    def test_drawdown_calculado_corretamente(self):
        """Drawdown = (pico - atual) / pico."""
        monitor = DrawdownMonitor()

        monitor.atualizar(100_000)  # Pico
        monitor.atualizar(95_000)   # Queda

        assert monitor.drawdown_atual == pytest.approx(0.05)  # 5%

    def test_alerta_quando_drawdown_excede_limite(self):
        """Deve gerar alerta quando drawdown excede o limite configurado."""
        monitor = DrawdownMonitor(limite=0.10)

        monitor.atualizar(100_000)
        monitor.atualizar(89_000)  # 11% de drawdown

        assert monitor.em_alerta == True
        assert monitor.drawdown_atual == pytest.approx(0.11)

    def test_pico_atualizado_com_novo_maximo(self):
        """O pico deve ser atualizado quando portfolio atinge novo maximo."""
        monitor = DrawdownMonitor()

        monitor.atualizar(100_000)
        monitor.atualizar(95_000)   # Queda
        monitor.atualizar(105_000)  # Novo maximo
        monitor.atualizar(100_000)  # Queda do novo pico

        assert monitor.pico == 105_000
        assert monitor.drawdown_atual == pytest.approx(0.0476, abs=0.001)
```

### 11.4 Testando Order Validation

```python
class TestValidadorOrdem:
    """Testes para validacao de ordens antes do envio ao broker."""

    def test_ordem_valida_passa(self):
        ordem = Ordem(ativo="PETR4", tipo="COMPRA", quantidade=100, preco=28.50)
        validador = ValidadorOrdem(regras_padrao())

        resultado = validador.validar(ordem)

        assert resultado.valida == True

    def test_rejeita_quantidade_zero(self):
        ordem = Ordem(ativo="PETR4", tipo="COMPRA", quantidade=0, preco=28.50)
        validador = ValidadorOrdem(regras_padrao())

        resultado = validador.validar(ordem)

        assert resultado.valida == False
        assert "quantidade" in resultado.motivo.lower()

    def test_rejeita_quantidade_negativa(self):
        ordem = Ordem(ativo="PETR4", tipo="COMPRA", quantidade=-100, preco=28.50)
        validador = ValidadorOrdem(regras_padrao())

        resultado = validador.validar(ordem)

        assert resultado.valida == False

    def test_rejeita_preco_negativo(self):
        ordem = Ordem(ativo="PETR4", tipo="COMPRA", quantidade=100, preco=-28.50)
        validador = ValidadorOrdem(regras_padrao())

        resultado = validador.validar(ordem)

        assert resultado.valida == False

    def test_rejeita_ativo_invalido(self):
        ordem = Ordem(ativo="XXXX99", tipo="COMPRA", quantidade=100, preco=10.0)
        validador = ValidadorOrdem(regras_padrao())

        resultado = validador.validar(ordem)

        assert resultado.valida == False

    def test_rejeita_ordem_fora_do_horario_pregao(self):
        relogio = MockRelogio(hora=datetime(2026, 1, 15, 3, 0, 0))  # 3 AM
        ordem = Ordem(ativo="PETR4", tipo="COMPRA", quantidade=100, preco=28.50)
        validador = ValidadorOrdem(regras_padrao(), relogio=relogio)

        resultado = validador.validar(ordem)

        assert resultado.valida == False
        assert "horario" in resultado.motivo.lower()

    @pytest.mark.parametrize("tipo", ["COMPRA", "VENDA", "STOP_COMPRA", "STOP_VENDA"])
    def test_aceita_todos_tipos_validos(self, tipo):
        ordem = Ordem(ativo="PETR4", tipo=tipo, quantidade=100, preco=28.50)
        validador = ValidadorOrdem(regras_padrao())

        resultado = validador.validar(ordem)

        assert resultado.valida == True
```

### 11.5 Testando Portfolio Calculations

```python
class TestPortfolio:
    """Testes para calculos do portfolio."""

    def test_pnl_posicao_em_lucro(self):
        """PnL de posicao comprada com preco subindo."""
        portfolio = Portfolio()
        portfolio.abrir_posicao("PETR4", 100, preco_entrada=28.50)

        pnl = portfolio.calcular_pnl("PETR4", preco_atual=30.00)

        # (30.00 - 28.50) * 100 = 150.00
        assert pnl == pytest.approx(150.0)

    def test_pnl_posicao_em_prejuizo(self):
        portfolio = Portfolio()
        portfolio.abrir_posicao("PETR4", 100, preco_entrada=28.50)

        pnl = portfolio.calcular_pnl("PETR4", preco_atual=26.00)

        # (26.00 - 28.50) * 100 = -250.00
        assert pnl == pytest.approx(-250.0)

    def test_exposicao_total(self):
        """Exposicao total = soma do valor de todas as posicoes."""
        portfolio = Portfolio()
        portfolio.abrir_posicao("PETR4", 100, preco_entrada=28.50)
        portfolio.abrir_posicao("VALE3", 50, preco_entrada=68.20)

        exposicao = portfolio.exposicao_total(
            precos={"PETR4": 28.50, "VALE3": 68.20}
        )

        # 100 * 28.50 + 50 * 68.20 = 2850 + 3410 = 6260
        assert exposicao == pytest.approx(6260.0)

    def test_retorno_percentual_portfolio(self):
        portfolio = Portfolio(capital_inicial=100_000)
        portfolio.abrir_posicao("PETR4", 1000, preco_entrada=28.50)

        retorno = portfolio.retorno_percentual(
            precos={"PETR4": 30.00}
        )

        # PnL = (30 - 28.50) * 1000 = 1500
        # Retorno = 1500 / 100000 = 1.5%
        assert retorno == pytest.approx(1.5)

class TestPortfolioPropertyBased:
    """Testes property-based para invariantes do portfolio."""

    @given(
        quantidade=st.integers(min_value=1, max_value=10000),
        preco_entrada=st.floats(min_value=0.01, max_value=1000),
        preco_atual=st.floats(min_value=0.01, max_value=1000),
    )
    def test_pnl_consistente_com_retorno(self, quantidade, preco_entrada, preco_atual):
        """PnL absoluto e retorno percentual devem ser consistentes."""
        portfolio = Portfolio(capital_inicial=quantidade * preco_entrada)
        portfolio.abrir_posicao("TEST", quantidade, preco_entrada)

        pnl = portfolio.calcular_pnl("TEST", preco_atual)
        retorno = portfolio.retorno_percentual({"TEST": preco_atual})

        pnl_esperado = (preco_atual - preco_entrada) * quantidade
        retorno_esperado = pnl_esperado / (quantidade * preco_entrada) * 100

        assert pnl == pytest.approx(pnl_esperado, rel=1e-6)
        assert retorno == pytest.approx(retorno_esperado, rel=1e-6)
```

### 11.6 Mock de Market Data

```python
class FakeDataFeed:
    """Fake de feed de dados de mercado para testes."""

    def __init__(self, dados: dict[str, list[Candle]]):
        self._dados = dados
        self._subscricoes = []

    def obter_candles(self, ativo, periodo, n):
        if ativo not in self._dados:
            raise AtivoNaoEncontradoError(ativo)
        return self._dados[ativo][:n]

    def obter_cotacao_atual(self, ativo):
        if ativo not in self._dados:
            raise AtivoNaoEncontradoError(ativo)
        return self._dados[ativo][-1].close

    def subscrever(self, ativo, callback):
        self._subscricoes.append((ativo, callback))

    def simular_tick(self, ativo, preco):
        """Para testes: simula chegada de novo tick."""
        for sub_ativo, callback in self._subscricoes:
            if sub_ativo == ativo:
                callback(Tick(ativo=ativo, preco=preco, timestamp=datetime.now()))

# Uso em testes
@pytest.fixture
def data_feed_petr4():
    """Data feed com dados historicos de PETR4 para testes."""
    candles = CandleSeriesBuilder() \
        .ativo("PETR4") \
        .periodo("1d") \
        .tendencia_alta(n=50, preco_inicio=25.0, preco_fim=30.0) \
        .build()

    return FakeDataFeed(dados={"PETR4": candles})

def test_estrategia_com_dados_simulados(data_feed_petr4):
    strategy = EstrategiaMediaMovel(curta=9, longa=21)
    candles = data_feed_petr4.obter_candles("PETR4", "1d", 50)

    sinal = strategy.avaliar(candles)

    # Tendencia de alta com dados suficientes -> deve gerar sinal de compra
    assert sinal.tipo == TipoSinal.COMPRA
```

### 11.7 Fixture Recomendada para o Bot (conftest.py)

```python
# tests/conftest.py

import pytest
from datetime import datetime, timedelta

@pytest.fixture
def relogio_pregao():
    """Relogio fixo em horario de pregao (10:30 AM)."""
    return MockRelogio(hora=datetime(2026, 1, 15, 10, 30, 0))

@pytest.fixture
def relogio_fora_pregao():
    """Relogio fixo fora do horario de pregao (3:00 AM)."""
    return MockRelogio(hora=datetime(2026, 1, 15, 3, 0, 0))

@pytest.fixture
def candles_alta_petr4():
    """50 candles de PETR4 em tendencia de alta."""
    return CandleSeriesBuilder() \
        .ativo("PETR4") \
        .tendencia_alta(n=50, preco_inicio=25.0, preco_fim=32.0) \
        .build()

@pytest.fixture
def candles_baixa_petr4():
    """50 candles de PETR4 em tendencia de baixa."""
    return CandleSeriesBuilder() \
        .ativo("PETR4") \
        .tendencia_baixa(n=50, preco_inicio=32.0, preco_fim=25.0) \
        .build()

@pytest.fixture
def candles_lateral():
    """50 candles em mercado lateral."""
    return CandleSeriesBuilder() \
        .mercado_lateral(n=50, preco_medio=28.0, amplitude=1.0) \
        .build()

@pytest.fixture
def portfolio_vazio():
    return Portfolio(capital_inicial=100_000)

@pytest.fixture
def portfolio_diversificado():
    return PortfolioMother.diversificado()

@pytest.fixture
def fake_data_feed():
    """Data feed fake com dados para os ativos mais comuns."""
    return FakeDataFeed(dados={
        "PETR4": CandleSeriesBuilder().ativo("PETR4").n_candles(100).build(),
        "VALE3": CandleSeriesBuilder().ativo("VALE3").n_candles(100).build(),
        "ITUB4": CandleSeriesBuilder().ativo("ITUB4").n_candles(100).build(),
    })

@pytest.fixture
def fake_broker():
    """Broker fake que registra ordens sem executar."""
    return FakeBroker()
```

---

## 12. Livros Fundamentais -- As "Biblias"

### 12.1 "Unit Testing: Principles, Practices, and Patterns" (Vladimir Khorikov, 2020)

**A BIBLIA MODERNA DO TEMA**

- **Editora:** Manning Publications
- **Paginas:** 304
- **Linguagem dos exemplos:** C# (aplicavel a qualquer linguagem)
- **ISBN:** 978-1617296277

**Contribuicoes fundamentais:**
- Os quatro pilares de um bom teste unitario
- Escola Classica vs Escola London (com posicao clara pela classica)
- Distinicao entre mocks (para comandos) e stubs (para queries)
- Categorizacao de dependencias (managed vs unmanaged)
- Anti-patterns catalogo extenso
- Abordagem pragmatica e moderna

**Por que e a biblia:** E o livro mais completo, moderno e opinionado sobre o tema. Vai alem de "como escrever testes" para responder "quais testes escrever e por que". A comunidade convergiu significativamente em torno de suas recomendacoes apos 2020.

### 12.2 "Test-Driven Development: By Example" (Kent Beck, 2003)

**O LIVRO FUNDADOR DO TDD**

- **Editora:** Addison-Wesley
- **Paginas:** 240
- **ISBN:** 978-0321146533

**Contribuicoes fundamentais:**
- Formalizacao do ciclo Red-Green-Refactor
- Demonstracao passo-a-passo de TDD com dois exemplos completos
- Filosofia "clean code that works"
- Catalogo de patterns de TDD
- Influencia seminal em toda a comunidade de desenvolvimento

**Por que e essencial:** Apesar de 2003, os principios fundamentais nao mudaram. E a fonte primaria para entender a filosofia e a pratica do TDD. Leitura obrigatoria para qualquer desenvolvedor serio.

### 12.3 "The Art of Unit Testing" (Roy Osherove, 3a ed., 2024)

**O GUIA PRATICO MAIS ACESSIVEL**

- **Editora:** Manning Publications
- **Co-autor da 3a ed.:** Vladimir Khorikov
- **Linguagem dos exemplos:** JavaScript/TypeScript
- **ISBN:** 978-1617297489

**Contribuicoes fundamentais:**
- Tres pilares de bons testes: trustworthy, maintainable, readable
- Naming conventions (MethodName_StateUnderTest_ExpectedBehavior)
- Estrategias praticas para lidar com legacy code
- Integracao com equipe e organizacao

**Por que e essencial:** Mais acessivel que Khorikov, excelente para quem esta comecando. A terceira edicao, com co-autoria de Khorikov, incorpora insights modernos.

### 12.4 "Growing Object-Oriented Software, Guided by Tests" (Freeman & Pryce, 2009)

**A REFERENCIA DA ESCOLA LONDON/MOCKIST**

- **Editora:** Addison-Wesley
- **Paginas:** 384
- **ISBN:** 978-0321503626
- **Apelido:** GOOS

**Contribuicoes fundamentais:**
- Double-loop TDD (Acceptance TDD + Unit TDD)
- Abordagem outside-in para design
- Mocks como ferramenta de design (nao apenas de teste)
- Exemplo completo de desenvolvimento guiado por testes (auction sniper)
- Test Data Builders pattern

**Por que e essencial:** Mesmo que se prefira a escola classica, entender a escola mockist e fundamental. O GOOS mostra como TDD pode guiar o design de software de forma elegante.

### 12.5 "Working Effectively with Legacy Code" (Michael Feathers, 2004)

**O GUIA DE SOBREVIVENCIA**

- **Editora:** Prentice Hall
- **Paginas:** 456
- **ISBN:** 978-0131177055

**Contribuicoes fundamentais:**
- Definicao: "Legacy code is simply code without tests"
- Conceito de Seam (ponto onde comportamento pode ser alterado sem editar o codigo)
- Characterization Tests (testes que documentam comportamento existente)
- Tecnicas para adicionar testes a codigo legado: Sprout Method/Class, Wrap Method/Class
- Estrategias para quebrar dependencias

**Por que e essencial:** Na realidade, a maioria dos desenvolvedores trabalha com codigo existente. Feathers e a referencia para adicionar testes a codigo que nao foi projetado para ser testavel.

### 12.6 "xUnit Test Patterns: Refactoring Test Code" (Gerard Meszaros, 2007)

**A ENCICLOPEDIA DE PADROES**

- **Editora:** Addison-Wesley
- **Paginas:** 883
- **ISBN:** 978-0131495050

**Contribuicoes fundamentais:**
- 68 patterns para testes automatizados
- 18 test smells catalogados
- Taxonomia canonica de test doubles (Dummy, Stub, Spy, Mock, Fake)
- Principios de organizacao de testes
- Estrategias de fixture management

**Por que e essencial:** E a enciclopedia do tema. Nao e um livro para ler de capa a capa, mas para consultar quando encontrar um problema especifico de teste. A taxonomia de test doubles se tornou o vocabulario padrao da industria.

### 12.7 Outros Livros Notaveis

| Livro | Autor | Ano | Foco |
|-------|-------|-----|------|
| Clean Code (Cap. 9: Unit Tests) | Robert C. Martin | 2008 | Principios FIRST, TDD |
| The Pragmatic Programmer (Sec. Testing) | Hunt & Thomas | 2019 | Filosofia de testes |
| Refactoring (2a ed.) | Martin Fowler | 2018 | Refactoring + testes |
| Continuous Delivery | Humble & Farley | 2010 | Pipeline de testes |
| Software Engineering at Google | Winters et al. | 2020 | Testing at scale |

---

## 13. Referencias

### Livros

| # | Titulo | Autor(es) | Ano | Editora | Tipo |
|---|--------|-----------|-----|---------|------|
| 1 | Unit Testing: Principles, Practices, and Patterns | Vladimir Khorikov | 2020 | Manning | Livro |
| 2 | Test-Driven Development: By Example | Kent Beck | 2003 | Addison-Wesley | Livro |
| 3 | The Art of Unit Testing, 3rd Edition | Roy Osherove, Vladimir Khorikov | 2024 | Manning | Livro |
| 4 | Growing Object-Oriented Software, Guided by Tests | Steve Freeman, Nat Pryce | 2009 | Addison-Wesley | Livro |
| 5 | Working Effectively with Legacy Code | Michael Feathers | 2004 | Prentice Hall | Livro |
| 6 | xUnit Test Patterns: Refactoring Test Code | Gerard Meszaros | 2007 | Addison-Wesley | Livro |
| 7 | Clean Code (Chapter 9: Unit Tests) | Robert C. Martin | 2008 | Prentice Hall | Livro |
| 8 | Software Engineering at Google | Winters, Manshreck, Wright | 2020 | O'Reilly | Livro |

### Artigos e Recursos Online

| # | Titulo | Autor(es) | Ano | URL | Tipo |
|---|--------|-----------|-----|-----|------|
| 9 | Mocks Aren't Stubs | Martin Fowler | 2007 | [martinfowler.com/articles/mocksArentStubs.html](https://martinfowler.com/articles/mocksArentStubs.html) | Artigo |
| 10 | Test Double | Martin Fowler | 2006 | [martinfowler.com/bliki/TestDouble.html](https://martinfowler.com/bliki/TestDouble.html) | Artigo |
| 11 | Test Pyramid | Martin Fowler | 2012 | [martinfowler.com/bliki/TestPyramid.html](https://martinfowler.com/bliki/TestPyramid.html) | Artigo |
| 12 | The Practical Test Pyramid | Ham Vocke | 2018 | [martinfowler.com/articles/practical-test-pyramid.html](https://martinfowler.com/articles/practical-test-pyramid.html) | Artigo |
| 13 | Test-Driven Development | Martin Fowler | 2023 | [martinfowler.com/bliki/TestDrivenDevelopment.html](https://martinfowler.com/bliki/TestDrivenDevelopment.html) | Artigo |
| 14 | Canon TDD | Kent Beck | 2023 | [tidyfirst.substack.com/p/canon-tdd](https://tidyfirst.substack.com/p/canon-tdd) | Artigo |
| 15 | Object Mother | Martin Fowler | 2006 | [martinfowler.com/bliki/ObjectMother.html](https://martinfowler.com/bliki/ObjectMother.html) | Artigo |
| 16 | Test Data Builders: an alternative to the Object Mother pattern | Nat Pryce | 2007 | [natpryce.com/articles/000714.html](http://www.natpryce.com/articles/000714.html) | Artigo |
| 17 | Software Testing Anti-patterns | Kostis Kapelonis | 2018 | [blog.codepipes.com/testing/software-testing-antipatterns.html](https://blog.codepipes.com/testing/software-testing-antipatterns.html) | Artigo |
| 18 | Unit Testing Anti-Patterns -- Full List | Yegor Bugayenko | 2018 | [yegor256.com/2018/12/11/unit-testing-anti-patterns.html](https://www.yegor256.com/2018/12/11/unit-testing-anti-patterns.html) | Artigo |
| 19 | The Cycles of TDD | Robert C. Martin | 2014 | [blog.cleancoder.com/uncle-bob/2014/12/17/TheCyclesOfTDD.html](http://blog.cleancoder.com/uncle-bob/2014/12/17/TheCyclesOfTDD.html) | Artigo |
| 20 | Unit Tests Are FIRST | Tim Ottinger, Jeff Langr | 2020 | [medium.com/pragmatic-programmers](https://medium.com/pragmatic-programmers/unit-tests-are-first-fast-isolated-repeatable-self-verifying-and-timely-a83e8070698e) | Artigo |
| 21 | 7 Popular Unit Test Naming Conventions | Ajitesh Kumar | 2014 | [dzone.com/articles/7-popular-unit-test-naming](https://dzone.com/articles/7-popular-unit-test-naming) | Artigo |
| 22 | Naming standards for unit tests | Roy Osherove | 2005 | [osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html](https://osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html) | Artigo |

### Ferramentas e Frameworks

| # | Ferramenta | Linguagem | URL | Tipo |
|---|-----------|-----------|-----|------|
| 23 | pytest | Python | [docs.pytest.org](https://docs.pytest.org/en/stable/) | Framework |
| 24 | Hypothesis | Python | [hypothesis.works](https://hypothesis.works/) | Property-based |
| 25 | mutmut | Python | [github.com/boxed/mutmut](https://github.com/boxed/mutmut) | Mutation testing |
| 26 | JUnit 5 | Java | [junit.org/junit5](https://junit.org/junit5/) | Framework |
| 27 | PIT (pitest) | Java | [pitest.org](https://pitest.org/) | Mutation testing |
| 28 | Jest | JavaScript | [jestjs.io](https://jestjs.io/) | Framework |
| 29 | Stryker | JS/.NET | [stryker-mutator.io](https://stryker-mutator.io/) | Mutation testing |
| 30 | xUnit.net | .NET | [xunit.net](https://xunit.net/) | Framework |
| 31 | Cucumber | Multi | [cucumber.io](https://cucumber.io/) | BDD |
| 32 | pytest-bdd | Python | [github.com/pytest-dev/pytest-bdd](https://github.com/pytest-dev/pytest-bdd) | BDD |

### Artigos Academicos

| # | Titulo | Autor(es) | Ano | Publicacao | Tipo |
|---|--------|-----------|-----|-----------|------|
| 33 | Realizing quality improvement through test driven development | Nagappan, Maximilien, Bhat, Williams | 2008 | Empirical Software Engineering | Academico |
| 34 | Code Coverage vs Mutation Testing | Valentina Jemuovic | 2024 | [journal.optivem.com](https://journal.optivem.com/p/code-coverage-vs-mutation-testing) | Artigo |
| 35 | Measuring Quality and Quantity of Unit Tests in Python Projects | Krystian Safjan | 2024 | [safjan.com](https://safjan.com/measuring-quality-and-quantity-of-unit-tests-in-python-projects-advanced-strategies/) | Artigo |

### Recursos em Portugues

| # | Titulo | Autor(es) | URL | Tipo |
|---|--------|-----------|-----|------|
| 36 | Teste unitario e o padrao AAA | Eliezer Silva | [dio.me/articles](https://www.dio.me/articles/teste-unitario-e-o-padrao-aaaarrange-act-assert) | Artigo |
| 37 | Boas praticas de Testes Unitarios: AAA | Hyago | [hyago.dev](https://hyago.dev/boas-praticas-de-testes-unitarios-arrange-act-assert/) | Artigo |
| 38 | Go + Testes Unitarios (Padroes, Nomenclatura, AAA) | John Fercher | [medium.com/@johnfercher](https://johnfercher.medium.com/go-testes-unit%C3%A1rios-f44d2e9399e6) | Artigo |
| 39 | Testes Unitarios: do Mock ao AAA | Marcio Monzon | [medium.com](https://medium.com/@marcio.pcmonzon/testes-unit%C3%A1rios-do-mock-ao-arrange-act-assert-2c5f29bd304c) | Artigo |
| 40 | Testes Unitarios Para Iniciantes | Carlos Schults | [carlosschults.net](https://carlosschults.net/en/unit-testing-for-beginners-part2/) | Artigo |

---

## Apendice A: Checklist de Testes para o Bot

```
CHECKLIST DE TESTES UNITARIOS -- BOT DE INVESTIMENTOS

[ ] ESTRATEGIAS
    [ ] Sinal de compra em cenario de alta
    [ ] Sinal de venda em cenario de baixa
    [ ] Sinal neutro em mercado lateral
    [ ] Comportamento com dados insuficientes
    [ ] Comportamento com dados invalidos/nulos
    [ ] Parametros de configuracao validados
    [ ] Cada indicador tecnico individualmente testado

[ ] GESTAO DE RISCO
    [ ] Position sizing correto para diferentes cenarios
    [ ] Position sizing limitado pelo capital
    [ ] VaR parametrico e historico
    [ ] Drawdown calculado corretamente
    [ ] Alerta de drawdown acionado no limite
    [ ] Stop loss/gain calculados corretamente
    [ ] Risco maximo por trade respeitado
    [ ] Risco total do portfolio respeitado

[ ] VALIDACAO DE ORDENS
    [ ] Ordens validas aceitas
    [ ] Quantidade zero/negativa rejeitada
    [ ] Preco negativo rejeitado
    [ ] Ativo invalido rejeitado
    [ ] Ordem fora do horario rejeitada
    [ ] Tipos de ordem validos aceitos
    [ ] Limite de posicao respeitado

[ ] PORTFOLIO
    [ ] PnL calculado corretamente (lucro e prejuizo)
    [ ] Valor total do portfolio correto
    [ ] Retorno percentual correto
    [ ] Exposicao total correta
    [ ] Multiplas posicoes no mesmo ativo
    [ ] Abertura e fechamento de posicoes
    [ ] Historico de operacoes mantido

[ ] CALCULOS FINANCEIROS
    [ ] Sharpe Ratio
    [ ] Sortino Ratio
    [ ] Maximum Drawdown
    [ ] Win Rate
    [ ] Average Win / Average Loss
    [ ] Retorno acumulado
    [ ] Volatilidade

[ ] EDGE CASES
    [ ] Listas vazias
    [ ] Divisao por zero
    [ ] Valores extremos (muito grandes/pequenos)
    [ ] Datas invalidas
    [ ] Conexao perdida (mock)
    [ ] Dados faltantes (gaps)
    [ ] Overflow numerico
```

---

## Apendice B: Configuracao Recomendada do pytest

```toml
# pyproject.toml

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
markers = [
    "slow: testes que demoram mais de 1s",
    "integration: testes de integracao (requerem servicos externos)",
    "e2e: testes end-to-end (ciclo completo de trading)",
    "property: testes property-based (Hypothesis)",
]
addopts = [
    "--strict-markers",
    "--tb=short",
    "-v",
    "--cov=src",
    "--cov-report=term-missing",
    "--cov-fail-under=75",
]
filterwarnings = [
    "error",
    "ignore::DeprecationWarning",
]

[tool.coverage.run]
branch = true
source = ["src"]
omit = [
    "src/**/migrations/*",
    "src/**/config.py",
    "src/**/__init__.py",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

---

> **Nota Final:** Este documento deve ser tratado como referencia viva. A medida que o bot evolui, novos cenarios de teste devem ser adicionados ao checklist, e as estrategias de teste devem ser revisadas. A disciplina de testes unitarios nao e um custo: e um investimento que se paga exponencialmente em reducao de bugs, confianca para refatorar, e velocidade de desenvolvimento a longo prazo. Para um bot que opera com dinheiro real no mercado financeiro, essa disciplina e absolutamente inegociavel.
