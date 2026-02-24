# Guia Avancado de Prompt Engineering
## Tecnicas de Estado da Arte (2022-2026)

> **Documento de Referencia** | Atualizado: Fevereiro 2026
> Baseado em pesquisa extensiva de papers academicos, documentacao oficial da Anthropic, guias da industria e blogs especializados.

---

## Indice

1. [Chain of Thought (CoT)](#1-chain-of-thought-cot)
2. [ReAct (Reasoning + Acting)](#2-react-reasoning--acting)
3. [Reflection / Self-Reflection](#3-reflection--self-reflection)
4. [Tree of Thoughts (ToT)](#4-tree-of-thoughts-tot)
5. [Meta-Prompting](#5-meta-prompting)
6. [Structured Output](#6-structured-output)
7. [Few-Shot Learning](#7-few-shot-learning)
8. [Role Prompting](#8-role-prompting)
9. [Prompt Chaining](#9-prompt-chaining)
10. [Constitutional AI / Self-Critique](#10-constitutional-ai--self-critique)
11. [Retrieval Augmented Generation (RAG)](#11-retrieval-augmented-generation-rag)
12. [Tecnicas Especificas para Claude (Anthropic)](#12-tecnicas-especificas-para-claude-anthropic)
13. [Agentic Prompting](#13-agentic-prompting)
14. [Prompt Templates](#14-prompt-templates)
15. [State of the Art 2025-2026](#15-state-of-the-art-2025-2026)
16. [Comparacao entre Tecnicas](#16-comparacao-entre-tecnicas)
17. [Referencias Completas](#17-referencias-completas)

---

## 1. Chain of Thought (CoT)

### Origem e Fundamentacao

O **Chain of Thought (CoT)** foi formalizado por **Wei et al. (2022)** no paper "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models". A tecnica consiste em guiar o modelo a explicitar seu raciocinio passo a passo antes de chegar a uma resposta final, mimetizando o processo de raciocinio humano.

### Variantes Principais

#### 1.1 Zero-Shot CoT

A forma mais simples: basta adicionar uma frase gatilho ao final do prompt.

**Frases gatilho eficazes:**
- "Let's think step by step" (a original, Kojima et al. 2022)
- "Explain your reasoning before answering"
- "Walk through this problem methodically"
- "Vamos pensar passo a passo"

```
Prompt: Quantos numeros primos existem entre 1 e 20?
Let's think step by step.
```

**Quando usar:** Problemas que requerem raciocinio logico mas onde voce nao tem exemplos formatados para few-shot. Funciona melhor em modelos grandes (>100B parametros).

#### 1.2 Few-Shot CoT

Fornece exemplos que demonstram o padrao de raciocinio esperado. A pesquisa mostra que **qualidade supera quantidade**: 2-3 exemplos bem estruturados superam 10 exemplos mediocres.

```
Pergunta: Se um trem viaja a 60km/h por 2.5 horas, qual a distancia percorrida?
Raciocinio: Velocidade = 60km/h. Tempo = 2.5h. Distancia = velocidade x tempo = 60 x 2.5 = 150km.
Resposta: 150km.

Pergunta: [sua pergunta aqui]
Raciocinio:
```

**Principio-chave:** A consistencia nos padroes de raciocinio e mais importante que detalhes especificos dos exemplos.

#### 1.3 Auto-CoT (Zhang et al. 2022)

Automatiza a geracao de exemplos de CoT usando o proprio modelo. O processo:
1. Agrupa questoes por similaridade (clustering)
2. Seleciona uma questao representativa de cada cluster
3. Gera demonstracoes de CoT com zero-shot para cada questao selecionada

#### 1.4 Self-Consistency (Wang et al. 2022)

Extensao que melhora a confiabilidade do CoT:
1. Gera multiplas respostas independentes com CoT
2. Seleciona a resposta mais consistente (voto majoritario)
3. Aumenta significativamente a precisao em tarefas de raciocinio

### Quando Usar CoT

| Cenario | Recomendacao |
|---------|-------------|
| Matematica e logica | Altamente recomendado |
| Raciocinio em multiplas etapas | Altamente recomendado |
| Problemas com conhecimento interno | Recomendado |
| Tarefas simples de classificacao | Desnecessario (overhead sem ganho) |
| Tarefas que precisam de dados externos | Prefira ReAct |

### Multimodal CoT (2024+)

Pesquisadores da Meta e AWS introduziram CoT multimodal, que combina dados linguisticos e visuais. O modelo explicita seu raciocinio sobre imagens e texto simultaneamente, abrindo novas possibilidades para tarefas de compreensao visual.

---

## 2. ReAct (Reasoning + Acting)

### Origem e Fundamentacao

**ReAct** foi proposto por **Yao et al. (2022)**, publicado no ICLR 2023, no paper "ReAct: Synergizing Reasoning and Acting in Language Models". A tecnica combina raciocinio interno com acoes externas em um ciclo interleaved.

### O Ciclo ReAct

O ReAct opera em um loop de tres componentes:

```
Thought (Pensamento) -> Action (Acao) -> Observation (Observacao) -> Thought -> ...
```

- **Thought**: Decomposicao interna do problema, planejamento, atualizacao de hipoteses
- **Action**: Chamadas a APIs externas, ferramentas, bases de dados, ambientes
- **Observation**: Analise dos resultados das acoes para informar o proximo pensamento

### Exemplo Pratico

```
Pergunta: Qual e a capital do pais que ganhou a Copa do Mundo de 2022?

Thought 1: Preciso descobrir qual pais ganhou a Copa do Mundo de 2022.
Action 1: Search["Copa do Mundo FIFA 2022 campeao"]
Observation 1: A Argentina venceu a Copa do Mundo de 2022 no Catar.

Thought 2: A Argentina ganhou. Agora preciso encontrar a capital da Argentina.
Action 2: Search["capital da Argentina"]
Observation 2: Buenos Aires e a capital da Argentina.

Thought 3: Tenho a resposta. A capital do pais campeao e Buenos Aires.
Resposta: Buenos Aires.
```

### Resultados Comprovados

- **HotpotQA** (question answering): Supera CoT ao interagir com API da Wikipedia, eliminando alucinacoes
- **Fever** (verificacao de fatos): Melhora significativa sobre baselines sem raciocinio
- **ALFWorld**: +34% de taxa de sucesso absoluta sobre imitacao e RL
- **WebShop**: +10% de taxa de sucesso sobre metodos tradicionais

### Quando Usar ReAct

| Cenario | Recomendacao |
|---------|-------------|
| Tarefas que precisam de info externa | Ideal |
| Interacao com ferramentas/APIs | Ideal |
| Verificacao de fatos | Altamente recomendado |
| Navegacao em ambientes | Altamente recomendado |
| Problemas puramente logicos/internos | Prefira CoT |
| Tarefas simples sem necessidade de busca | Desnecessario |

### Combinando ReAct + CoT

A melhor abordagem para muitas tarefas e combinar ReAct com CoT, aproveitando conhecimento interno (CoT) e informacao externa (ReAct). Isso mitiga alucinacoes e previne propagacao de erros ao atualizar planos continuamente com novas informacoes.

---

## 3. Reflection / Self-Reflection

### Origem e Fundamentacao

**Reflexion** foi proposto por **Shinn et al. (2023)** no paper "Reflexion: Language Agents with Verbal Reinforcement Learning". A tecnica usa feedback linguistico em vez de atualizacao de pesos para melhorar o desempenho de agentes.

### Arquitetura do Reflexion

O framework possui tres componentes:

1. **Actor (Ator)**: Gera texto e acoes baseado em observacoes do estado. Produz trajetorias de acoes.

2. **Evaluator (Avaliador)**: Pontua as saidas do Ator, tomando como entrada a trajetoria gerada (memoria de curto prazo) e retornando um score de recompensa.

3. **Self-Reflection (Auto-Reflexao)**: Gera dicas de reforco verbal para ajudar o Ator a melhorar. Reflexoes sao armazenadas em memoria para gerar feedback especifico e relevante em tentativas futuras.

### Padrao Critic-Actor

```
Tentativa 1:
  Actor: [gera resposta]
  Evaluator: [pontua - score baixo]
  Self-Reflection: "A resposta falhou porque nao considerei X.
                    Na proxima tentativa, devo primeiro verificar Y."

Tentativa 2:
  Actor: [gera resposta melhorada, usando reflexao anterior]
  Evaluator: [pontua - score mais alto]
  ...
```

### Iterative Refinement

O processo de refinamento iterativo segue este fluxo:

1. Geracao da resposta inicial
2. Auto-avaliacao critica (identificar falhas)
3. Geracao de reflexao verbal (o que melhorar)
4. Armazenamento da reflexao em memoria episodica
5. Nova tentativa incorporando reflexoes
6. Repetir ate atingir qualidade satisfatoria

### Aplicacoes em 2024-2025

- **Seguranca**: Injecao de prompt de auto-reflexao ("Let's check if the generated text is harmful") permite que o modelo avalie sua propria saida e regenere se necessario
- **Metacognicao**: Metodo dual-loop onde o LLM critica seu proprio processo de raciocinio contra respostas de referencia (extrospeccao)
- **Banco de reflexoes**: Reflexoes acumuladas formam um banco que melhora performance em tarefas similares futuras

### Quando Usar Reflection

| Cenario | Recomendacao |
|---------|-------------|
| Tarefas onde erros podem ser detectados | Ideal |
| Geracao de codigo (testes automaticos) | Altamente recomendado |
| Tarefas iterativas com feedback | Altamente recomendado |
| Respostas que precisam de alta qualidade | Recomendado |
| Tarefas simples de resposta unica | Overhead desnecessario |

---

## 4. Tree of Thoughts (ToT)

### Origem e Fundamentacao

**Tree of Thoughts** foi proposto por **Yao et al. (2023)** no paper "Tree of Thoughts: Deliberate Problem Solving with Large Language Models", publicado no NeurIPS 2023. E uma generalizacao do CoT que permite explorar multiplos caminhos de raciocinio simultaneamente.

### Como Funciona

O ToT mantem uma **arvore de pensamentos**, onde cada "pensamento" e uma sequencia coerente de linguagem que serve como passo intermediario na resolucao de um problema.

#### Componentes-chave:

1. **Decomposicao em pensamentos**: Divide o problema em unidades de raciocinio
2. **Geracao de pensamentos**: Dois metodos:
   - **Sampling**: Gera varios pensamentos independentemente (mesmo prompt)
   - **Proposing**: Gera pensamentos sequencialmente (prompt de proposta)
3. **Avaliacao**: O modelo auto-avalia o progresso de cada caminho
4. **Busca**: Algoritmos de busca sistematica:
   - **BFS (Breadth-First Search)**: Explora largura primeiro, mantendo os melhores candidatos
   - **DFS (Depth-First Search)**: Explora profundidade primeiro, com backtracking

### Exemplo Visual

```
                    [Problema]
                   /    |     \
              [T1a]  [T1b]  [T1c]    <- Primeiro nivel de pensamentos
              / \      |      |
          [T2a] [T2b] [T2c] [T2d]   <- Segundo nivel
           |           |
        [T3a]       [T3b]           <- Terceiro nivel
           |
       [Solucao]                     <- Solucao encontrada
```

### Resultados Impressionantes

| Tarefa | CoT | ToT | Melhoria |
|--------|-----|-----|----------|
| Game of 24 | 4% | 74% | +70pp |
| Crossword puzzles | 1% | 20% | +19pp |
| Escrita criativa | Baseline | Significativamente melhor | Qualitativa |

### ToT vs CoT: Quando Usar Cada

| Aspecto | CoT | ToT |
|---------|-----|-----|
| Estrutura | Linear | Ramificada |
| Custo computacional | Baixo | Alto |
| Backtracking | Nao | Sim |
| Exploracao de alternativas | Nao | Sim |
| Problemas simples | Ideal | Overkill |
| Problemas de planejamento | Limitado | Ideal |
| Puzzles complexos | Limitado | Ideal |

**Regra pratica:** Use ToT apenas quando CoT falha, especialmente em tarefas que requerem planejamento nao-trivial, busca, ou exploracao de multiplas possibilidades.

---

## 5. Meta-Prompting

### Conceito

**Meta-Prompting** e a tecnica de usar prompts para gerar ou melhorar outros prompts. Em vez de pedir diretamente uma resposta, voce primeiro solicita ao modelo que crie um prompt ideal para a tarefa, e depois usa esse prompt otimizado para obter o resultado final.

### Abordagens Principais

#### 5.1 Prompt que Gera Prompts

```
Voce e um especialista em prompt engineering. Dado o seguinte objetivo:
[OBJETIVO]

Crie o prompt mais eficaz possivel para atingir esse objetivo.
Considere: clareza, especificidade, exemplos, formato de saida, restricoes.

Prompt otimizado:
```

#### 5.2 Self-Improving Prompts

O modelo analisa e melhora iterativamente seus proprios prompts:

```
1. Gere uma resposta para: [TAREFA]
2. Avalie a qualidade da resposta (1-10)
3. Identifique pontos fracos
4. Reescreva o prompt para corrigir os pontos fracos
5. Repita ate score >= 8
```

#### 5.3 Automatic Prompt Optimization (APO)

Frameworks que automatizam a otimizacao:

- **DSPy (Declarative Self-improving Python)**: Abordagem modular e declarativa que otimiza pipelines inteiros de prompts em tempo de compilacao, fazendo bootstrap de exemplos few-shot a partir de dados
- **TextGrad**: Publicado na Nature em 2025, excelente para refinamento em nivel de instancia em tarefas dificeis como programacao e Q&A cientifico

**Recomendacao hibrida**: DSPy para sistemas robustos e escalaveis; TextGrad para refinamento de instancias individuais.

### Exemplo Pratico de Meta-Prompting

```
<meta_prompt>
Analise a seguinte tarefa e crie um prompt otimizado:

Tarefa: Extrair entidades nomeadas de textos juridicos brasileiros
Requisitos: Alta precisao, formato JSON, categorias especificas

Considere:
1. Qual role/persona seria mais eficaz?
2. Quantos exemplos few-shot sao necessarios?
3. Qual formato de saida e ideal?
4. Quais restricoes devem ser explicitadas?
5. Quais edge cases devem ser cobertos?

Gere o prompt otimizado dentro de tags <optimized_prompt>.
</meta_prompt>
```

### Quando Usar Meta-Prompting

| Cenario | Recomendacao |
|---------|-------------|
| Otimizacao de prompts em producao | Altamente recomendado |
| Tarefas repetitivas em escala | Ideal |
| Quando nao sabe como formular o prompt | Bom ponto de partida |
| Tarefas simples e unicas | Overhead desnecessario |

---

## 6. Structured Output

### Fundamentacao

Structured Output refere-se a tecnicas para forcar o modelo a produzir saida em formatos estruturados e parseavaeis por maquina, como JSON, XML ou YAML.

### Abordagens Principais

#### 6.1 XML Tags (Especialmente eficaz com Claude)

Claude foi treinado para interpretar e responder a conteudo delimitado por tags de forma confiavel.

```xml
<instructions>
Analise o texto abaixo e extraia as informacoes solicitadas.
</instructions>

<input_text>
Maria da Silva, CPF 123.456.789-00, nascida em 15/03/1985,
residente em Sao Paulo/SP.
</input_text>

<output_format>
Responda dentro das seguintes tags:
<nome>nome completo</nome>
<cpf>numero do CPF</cpf>
<nascimento>data de nascimento</nascimento>
<cidade>cidade</cidade>
<estado>estado</estado>
</output_format>
```

**Beneficios das XML tags:**
- Separacao clara entre instrucoes, contexto e exemplos
- Reducao de erros de interpretacao
- Facil pos-processamento (parse XML)
- Flexibilidade para adicionar/remover secoes
- Pode ser combinado com CoT (`<thinking>`, `<answer>`)

#### 6.2 JSON Mode / Schema Enforcement

```
Responda APENAS com um objeto JSON valido no seguinte formato:
{
  "nome": "string",
  "idade": "number",
  "habilidades": ["string"],
  "experiencia": {
    "anos": "number",
    "area": "string"
  }
}

Nao inclua nenhum texto antes ou depois do JSON.
```

**APIs com suporte nativo:**
- OpenAI: Structured Outputs (enforce schema rigoroso)
- Anthropic: Tool use com schema JSON, Structured Outputs
- Google: Response schema em Gemini

#### 6.3 Constrained Decoding

Para modelos self-hosted, a decodificacao restrita garante que apenas tokens validos para o formato desejado sejam gerados. Frameworks como **Outlines** e **LMQL** implementam isso via gramaticas formais (CFG/regex).

### Tres Metodos de Implementacao

1. **APIs nativas**: Especifique schemas diretamente na chamada API (mais facil)
2. **Instrucoes no prompt**: Descreva o formato desejado com exemplos (mais flexivel)
3. **Constrained decoding**: Enforce em nivel de token durante geracao (mais confiavel para self-hosted)

### Quando Usar Structured Output

| Cenario | Formato Recomendado |
|---------|-------------------|
| Integracao com sistemas | JSON com schema |
| Prompts complexos para Claude | XML tags |
| Extracao de dados | JSON ou XML |
| Classificacao | JSON com enum |
| Geracao de documentos | Markdown estruturado |

---

## 7. Few-Shot Learning

### Conceito

Few-Shot Learning em prompting consiste em fornecer exemplos no prompt para guiar o modelo sobre o formato, estilo e conteudo esperados da resposta.

### Estrategias de Selecao de Exemplos

#### 7.1 Selecao Estatica

Exemplos fixos, cuidadosamente escolhidos:

```
Classifique o sentimento como POSITIVO, NEGATIVO ou NEUTRO.

Texto: "Adorei o atendimento, super recomendo!"
Sentimento: POSITIVO

Texto: "Produto chegou quebrado, pessima experiencia."
Sentimento: NEGATIVO

Texto: "O produto e ok, nada de especial."
Sentimento: NEUTRO

Texto: "[novo texto para classificar]"
Sentimento:
```

#### 7.2 Dynamic Few-Shot (Selecao Dinamica)

Seleciona exemplos dinamicamente com base na similaridade com a entrada atual:

1. **Embedding-based**: Usa embeddings para encontrar exemplos mais similares no banco
2. **TF-IDF vectors**: Selecao baseada em similaridade de termos
3. **Random sampling**: Amostragem aleatoria (baseline)

**Implementacao tipica:**
```python
# Pseudo-codigo para dynamic few-shot
exemplos_banco = vector_store.search(query=input_usuario, top_k=3)
prompt = construir_prompt(instrucoes, exemplos_banco, input_usuario)
resposta = llm.generate(prompt)
```

Bibliotecas como **scikit-llm** implementam busca de vizinhos mais proximos para recuperar exemplos alinhados com a consulta do usuario.

#### 7.3 Chain-of-Thought Exemplos

Combina few-shot com CoT, mostrando o raciocinio nos exemplos:

```
Pergunta: Se tenho 3 cestas com 7 macas cada, e dou 5 macas, quantas restam?
Raciocinio: 3 cestas x 7 macas = 21 macas no total. 21 - 5 = 16 macas restam.
Resposta: 16

Pergunta: [nova pergunta]
Raciocinio:
```

### Descoberta Importante: Over-Prompting (2025)

Pesquisa de 2025 revelou o fenomeno de **over-prompting**: exemplos excessivos podem paradoxalmente degradar o desempenho em certos LLMs. A sabedoria convencional de "mais exemplos = melhor" nem sempre se aplica.

**Recomendacoes:**
- Comece com 2-3 exemplos de alta qualidade
- Teste com mais exemplos, mas monitore a performance
- Priorize consistencia de formato sobre quantidade
- Para modelos grandes, 3-5 exemplos geralmente sao suficientes

### Quando Usar Few-Shot

| Cenario | Recomendacao |
|---------|-------------|
| Formato de saida especifico | Altamente recomendado |
| Classificacao com categorias definidas | Altamente recomendado |
| Estilo de escrita especifico | Recomendado |
| Raciocinio complexo | Combine com CoT |
| Tarefa muito simples | Zero-shot pode bastar |

---

## 8. Role Prompting

### Conceito

Role Prompting (ou Persona Prompting) consiste em atribuir um papel, persona ou expertise ao modelo para influenciar o estilo, vocabulario e abordagem da resposta.

### Eficacia: O Que a Pesquisa Diz

Pesquisas de 2024-2025 mostram resultados **mistos**:

- **Tarefas fatuais**: Personas em system prompts NAO melhoram performance de forma consistente. Em muitos casos, nao ha melhoria, e as vezes ha efeito negativo.
- **Tarefas abertas/criativas**: Persona prompting e eficaz para escrita criativa, brainstorming e geracao de conteudo.
- **Tarefas subjetivas de NLP**: Melhorias pequenas mas significativas na simulacao de perspectivas humanas.

### Melhores Praticas

1. **Atribua o papel diretamente**: "You are an X" e mais eficaz que "Imagine you are an X"
2. **Papeis interpessoais > profissionais**: Papeis nao-profissionais (professor, mentor) funcionam melhor que papeis ocupacionais puros (engenheiro) em muitos contextos
3. **Seja especifico e detalhado**: Personas genericas ("um especialista") sao menos eficazes que personas detalhadas
4. **Use ExpertPrompting**: Descreva o expert ideal antes da tarefa

### Exemplos Praticos

**Eficaz (especifico e direto):**
```
<role>
Voce e um advogado tributarista brasileiro com 20 anos de experiencia em
planejamento tributario para empresas do Simples Nacional. Voce conhece
profundamente a Lei Complementar 123/2006 e suas atualizacoes.
</role>

<task>
Analise o seguinte cenario fiscal e recomende a melhor estrategia tributaria.
</task>
```

**Menos eficaz (vago):**
```
Imagine que voce e um especialista em impostos. Me ajude com uma questao fiscal.
```

### System Prompts Eficazes

Para Claude especificamente, o system prompt deve:

1. Definir a identidade e escopo do assistente
2. Estabelecer restricoes de comportamento
3. Especificar formato de resposta esperado
4. Incluir exemplos de interacao desejada

```
<system_prompt>
Voce e um analista financeiro senior especializado em valuation de startups
brasileiras. Seus principios:
- Sempre baseie analises em dados concretos
- Cite metodologias especificas (DCF, multiplos, etc.)
- Apresente resultados em formato estruturado
- Alerte para riscos e incertezas
- Use terminologia tecnica com explicacoes quando necessario
</system_prompt>
```

### Quando Usar Role Prompting

| Cenario | Recomendacao |
|---------|-------------|
| Escrita criativa | Altamente recomendado |
| Analise de dominio especifico | Recomendado (com detalhes) |
| Tarefas fatuais de classificacao | Pouco impacto |
| Simulacao de perspectivas | Eficaz |
| Programacao tecnica | Moderadamente util |

---

## 9. Prompt Chaining

### Conceito

Prompt Chaining decompoee tarefas complexas em uma cadeia de subtarefas onde a saida de um prompt serve como entrada para o proximo. Cada subtarefa isola um objetivo unico, reduzindo a carga cognitiva no modelo.

### Beneficios

- **Isolamento de falhas**: Erros sao localizados e detectaveis
- **Debug preciso**: Cada etapa pode ser testada independentemente
- **Qualidade superior**: Cada prompt e otimizado para uma tarefa especifica
- **Custo reduzido**: Pesquisa de 2025 mostra que pipelines multi-hop com modelos menores podem superar GPT-4o em 9% a 1/25 do custo

### Padroes de Chaining

#### 9.1 Pipeline Sequencial

```
[Input] -> [Prompt 1: Extrair dados] -> [Prompt 2: Analisar] -> [Prompt 3: Formatar] -> [Output]
```

**Exemplo pratico:**

```
# Prompt 1: Extrair informacoes do documento
Extraia todas as entidades nomeadas do texto a seguir.
Formato: JSON com categorias (pessoa, empresa, local, data).
Texto: {documento}

# Prompt 2: Enriquecer com contexto (recebe output do Prompt 1)
Dado as seguintes entidades extraidas:
{output_prompt_1}
Para cada entidade, adicione contexto relevante e relacoes entre elas.

# Prompt 3: Gerar relatorio (recebe output do Prompt 2)
Com base nas entidades e relacoes identificadas:
{output_prompt_2}
Gere um relatorio executivo de no maximo 500 palavras.
```

#### 9.2 Pipeline com Validacao (Gate)

```
[Input] -> [Prompt 1: Gerar] -> [Prompt 2: Validar] -> Se OK -> [Output]
                                                      -> Se NAO OK -> [Prompt 1 revisado]
```

#### 9.3 Pipeline Paralelo

```
[Input] -> [Prompt A: Perspectiva 1] \
        -> [Prompt B: Perspectiva 2]  -> [Prompt C: Sintetizar] -> [Output]
        -> [Prompt C: Perspectiva 3] /
```

### Multi-Hop Pipelines (2025)

Sistemas modulares onde cada "hop" aplica um LLM especifico com templates de prompt customizados. Resultados de 2025 mostram que esta abordagem supera GPT-4o em benchmarks como TREC Deep Learning enquanto custa uma fracao do preco.

### Quando Usar Prompt Chaining

| Cenario | Recomendacao |
|---------|-------------|
| Tarefas complexas multi-etapa | Ideal |
| Necessidade de auditoria por etapa | Ideal |
| Processamento de documentos longos | Altamente recomendado |
| Otimizacao de custo | Recomendado |
| Tarefa simples de resposta direta | Desnecessario |

---

## 10. Constitutional AI / Self-Critique

### Origem e Fundamentacao

**Constitutional AI** foi proposto pela **Anthropic** (Bai et al. 2022) no paper "Constitutional AI: Harmlessness from AI Feedback". O modelo e treinado para avaliar e corrigir suas proprias saidas com base em uma "constituicao" de principios.

### Processo em Duas Fases

#### Fase 1: Supervised Learning (SL)

1. O modelo gera uma resposta
2. E apresentado com um principio constitucional aleatorio
3. Critica sua propria saida com base nesse principio
4. Revisa a resposta para alinhar com o principio
5. O modelo e fine-tuned nas respostas revisadas

#### Fase 2: Reinforcement Learning from AI Feedback (RLAIF)

1. Um modelo de preferencia e treinado nos pares (original, revisado)
2. Este modelo substitui anotadores humanos para reforcar comportamento alinhado

### Aplicacao em Prompting: Self-Critique

Mesmo sem fine-tuning, voce pode aplicar os principios do Constitutional AI via prompting:

```
<task>
Responda a seguinte pergunta: {pergunta}
</task>

<self_critique>
Agora avalie sua resposta considerando:
1. A informacao e factualmente correta?
2. A resposta pode ser interpretada como prejudicial ou enviesada?
3. Existem perspectivas alternativas nao consideradas?
4. A resposta e completa e suficiente?

Se identificou problemas, gere uma versao revisada.
</self_critique>

<final_response>
Forneca sua resposta final revisada.
</final_response>
```

### Principios Eficazes (2025)

Pesquisa de 2025 mostra que:
- **Principios positivos e comportamentais** alinham melhor com preferencias humanas que principios negativos ou baseados em tracos
- Eficacia varia significativamente entre modelos
- Processos de raciocinio explicito geram resultados superiores
- Modelos menores requerem mais orientacao (system prompt, few-shot)

### Quando Usar Self-Critique

| Cenario | Recomendacao |
|---------|-------------|
| Conteudo sensivel ou regulado | Altamente recomendado |
| Respostas de alto risco | Altamente recomendado |
| Melhoria iterativa de qualidade | Recomendado |
| Tarefas de baixo risco | Overhead desnecessario |

---

## 11. Retrieval Augmented Generation (RAG)

### Conceito

**RAG** combina a capacidade generativa de LLMs com recuperacao de informacao de fontes externas, permitindo respostas atualizadas e fundamentadas em dados especificos.

### Arquitetura Basica

```
[Query do Usuario]
       |
       v
[Embedding da Query]
       |
       v
[Busca em Vector Store] -> [Documentos Relevantes]
       |                          |
       v                          v
[Construcao do Prompt com Contexto Recuperado]
       |
       v
[LLM Gera Resposta Baseada no Contexto]
```

### Estrategias de Chunking (2025)

A escolha da estrategia de chunking e critica para a qualidade do RAG:

#### 11.1 Fixed-Size Chunking
- Blocos de tamanho fixo (ex: 512 tokens)
- Simples, mas pode cortar informacoes no meio

#### 11.2 Recursive Character Splitting
- Divide recursivamente por separadores (\n\n, \n, ., espaco)
- Equilibrio entre simplicidade e qualidade
- **Performance consistente em benchmarks** (2025)

#### 11.3 Semantic Chunking
- Agrupa por similaridade semantica
- Usa embeddings para detectar mudancas de topico
- Maior recall mas mais custoso computacionalmente

#### 11.4 Domain-Aware Chunking
- Diferentes tipos de documento requerem diferentes estrategias:
  - **Patentes**: 1000-1500 tokens (preservar claims completos)
  - **Chat logs**: 200-400 tokens (manter contexto conversacional)
  - **Codigo-fonte**: Por funcao/classe

#### 11.5 Contextual Retrieval vs Late Chunking

| Aspecto | Contextual Retrieval | Late Chunking |
|---------|---------------------|---------------|
| Coerencia semantica | Superior | Inferior |
| Custo computacional | Alto | Baixo |
| Eficiencia | Menor | Maior |
| Relevancia | Alta | Moderada |

### Estrategias de Recuperacao

1. **Keyword search** (BM25): Rapido, bom para termos especificos
2. **Semantic search** (embeddings): Captura similaridade de significado
3. **Hybrid search**: Combina keyword + semantic (recomendado para empresas)
4. **Re-ranking**: Aplica modelo de re-ranking nos resultados iniciais
5. **Query expansion**: Expande a query para melhorar recall

### Long RAG (2025)

Processa unidades de recuperacao maiores (secoes inteiras ou documentos), melhorando eficiencia, preservando contexto e reduzindo custos computacionais.

### Melhores Praticas RAG (2025)

1. **Comece com hybrid search** e adicione complexidade conforme necessario
2. **Teste diferentes tamanhos de chunk** para seu dominio
3. **Use overlap entre chunks** (10-20%) para preservar contexto
4. **Implemente re-ranking** para melhorar precisao
5. **Monitore metricas**: precision, recall, faithfulness
6. **Considere Long RAG** para documentos coesos

### Quando Usar RAG

| Cenario | Recomendacao |
|---------|-------------|
| Perguntas sobre dados privados/internos | Essencial |
| Informacoes atualizadas (apos training cutoff) | Essencial |
| Respostas que precisam de fundamentacao | Altamente recomendado |
| Reducao de alucinacoes | Altamente recomendado |
| Tarefas de conhecimento geral | Pode ser desnecessario |

---

## 12. Tecnicas Especificas para Claude (Anthropic)

### 12.1 XML Tags -- A Tecnica Mais Eficaz para Claude

Claude foi especificamente treinado para interpretar XML tags, tornando esta a tecnica mais impactante para prompts complexos.

**Estrutura recomendada:**

```xml
<system>
Voce e um assistente especializado em [dominio].
</system>

<instructions>
[Instrucoes claras e especificas]
</instructions>

<context>
[Informacoes de contexto relevantes]
</context>

<examples>
<example>
<input>Exemplo de entrada 1</input>
<output>Exemplo de saida 1</output>
</example>
<example>
<input>Exemplo de entrada 2</input>
<output>Exemplo de saida 2</output>
</example>
</examples>

<formatting>
[Regras de formatacao da saida]
</formatting>

<input>
[A entrada real do usuario]
</input>
```

### 12.2 Extended Thinking / Adaptive Thinking

#### Extended Thinking (Modelos anteriores)

Permite que Claude "pense" internamente antes de responder, usando um budget de tokens dedicado ao raciocinio.

```python
# Extended thinking (modelos anteriores ao Opus 4.6)
client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=64000,
    thinking={"type": "enabled", "budget_tokens": 32000},
    messages=[{"role": "user", "content": "..."}],
)
```

**Melhores praticas para budget_tokens:**
- Minimo: 1.024 tokens
- Comece no minimo e aumente incrementalmente
- Para budgets acima de 32K, use processamento em lote
- Teste diferentes configuracoes para encontrar o equilibrio entre qualidade e performance

#### Adaptive Thinking (Claude Opus 4.6 -- Recomendado)

Claude decide dinamicamente quando e quanto pensar, baseado na complexidade da query e no parametro `effort`.

```python
# Adaptive thinking (Claude Opus 4.6)
client.messages.create(
    model="claude-opus-4-6",
    max_tokens=64000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},  # max, high, medium, low
    messages=[{"role": "user", "content": "..."}],
)
```

**Niveis de effort:**
- `max`: Maximo pensamento, ideal para problemas complexos
- `high`: Pensamento profundo, bom equilibrio
- `medium`: Pensamento moderado, para tarefas de complexidade media
- `low`: Minimo pensamento, para tarefas simples (otimiza velocidade/custo)

**Avaliações internas da Anthropic mostram que adaptive thinking supera extended thinking com budget fixo.**

#### Guiando o Comportamento de Pensamento

```
Apos receber resultados de ferramentas, reflita cuidadosamente sobre
sua qualidade e determine os proximos passos otimos antes de prosseguir.
Use seu pensamento para planejar e iterar com base nessas novas
informacoes, e entao execute a melhor proxima acao.
```

Para reduzir pensamento excessivo:
```
Extended thinking adiciona latencia e deve ser usado apenas quando
melhorara significativamente a qualidade da resposta -- tipicamente
para problemas que requerem raciocinio em multiplas etapas.
Na duvida, responda diretamente.
```

### 12.3 Prefill (Modelos anteriores ao Opus 4.6)

Tecnica de preencher o inicio da resposta do assistente para direcionar o formato:

```python
# Funciona em modelos anteriores ao Opus 4.6
messages = [
    {"role": "user", "content": "Liste os 5 maiores paises..."},
    {"role": "assistant", "content": "{"}  # Forca saida JSON
]
```

**IMPORTANTE**: A partir do Claude Opus 4.6, prefill no ultimo turno do assistente foi descontinuado. Alternativas:

- **Para formato JSON/YAML**: Use Structured Outputs ou instrucoes explicitas
- **Para eliminar preambulos**: Instrua no system prompt: "Responda diretamente sem preambulo."
- **Para continuacoes**: Mova para a mensagem do usuario: "Sua resposta anterior foi interrompida e terminou com `[texto]`. Continue de onde parou."
- **Para consistencia de papel**: Use XML tags ou instrucoes no system prompt

### 12.4 System Prompts Otimizados para Claude

O Claude Opus 4.5 e Opus 4.6 sao **mais responsivos ao system prompt** que modelos anteriores. Isso significa:

- Reducao de linguagem agressiva: Troque "CRITICAL: You MUST use this tool when..." por "Use this tool when..."
- Instrucoes normais funcionam melhor que instrucoes enfaticas
- Overtriggering e mais comum que undertriggering

**Template de system prompt eficaz para Claude:**

```xml
<identity>
Voce e [descricao do assistente]. Criado para [proposito].
</identity>

<capabilities>
- [Capacidade 1]
- [Capacidade 2]
</capabilities>

<constraints>
- [Restricao 1]
- [Restricao 2]
</constraints>

<output_format>
[Formato esperado de resposta]
</output_format>

<examples>
[Exemplos de interacao ideal]
</examples>
```

### 12.5 Controle de Formato de Saida

Tecnicas eficazes para Claude:

1. **Diga o que fazer, nao o que nao fazer**
   - Em vez de: "Nao use markdown"
   - Use: "Sua resposta deve ser composta de paragrafos fluidos em prosa."

2. **Use XML como indicador de formato**
   - "Escreva as secoes de prosa em tags `<prose_section>`."

3. **Combine estilo do prompt com estilo desejado da saida**
   - Se nao quer markdown, remova markdown do proprio prompt

4. **Para minimizar markdown excessivo:**

```xml
<avoid_excessive_markdown>
Ao escrever relatorios ou conteudo longo, escreva em prosa clara e fluida
usando paragrafos completos. Reserve markdown apenas para `codigo inline`,
blocos de codigo, e titulos simples. Evite **negrito** e *italico**.
NAO use listas ordenadas ou nao-ordenadas a menos que os itens sejam
genuinamente discretos ou o usuario solicite explicitamente.
</avoid_excessive_markdown>
```

### 12.6 Tool Use e Parallel Tool Calling

Claude Opus 4.6 tem excelente capacidade de execucao paralela de ferramentas:

```xml
<use_parallel_tool_calls>
Se voce pretende chamar multiplas ferramentas e nao ha dependencias entre
as chamadas, faca todas as chamadas independentes em paralelo.
Priorize chamadas simultaneas sempre que as acoes possam ser executadas
em paralelo. Porem, se chamadas dependem de resultados anteriores,
NAO as execute em paralelo.
</use_parallel_tool_calls>
```

### 12.7 Sensibilidade a Palavra "Think"

Com extended thinking desabilitado, Claude Opus 4.5 e sensivel a palavra "think" e variantes. Recomendacao: substitua por "consider", "evaluate", "assess" quando nao quiser ativar raciocinio estendido.

### 12.8 Gerenciamento de Contexto Longo

Para workflows que transcendem uma unica janela de contexto:

1. **Use a primeira janela para setup**: Crie framework, testes, scripts de inicializacao
2. **Mantenha estado estruturado**: Use `tests.json`, `progress.txt`
3. **Aproveite git para rastreamento**: Logs e checkpoints restauraveis
4. **Crie scripts de qualidade de vida**: `init.sh` para servidores, testes, linters

```
Sua janela de contexto sera compactada automaticamente ao se aproximar
do limite, permitindo que voce continue trabalhando indefinidamente.
Portanto, nao interrompa tarefas prematuramente por preocupacoes com
budget de tokens. Ao se aproximar do limite, salve progresso e estado
na memoria antes que a janela seja renovada.
```

---

## 13. Agentic Prompting

### Conceito

Agentic Prompting refere-se a tecnicas para fazer LLMs operarem como agentes autonomos que planejam, executam acoes, usam ferramentas e perseguem objetivos de forma proativa.

### Evolucao 2025-2026

A transicao fundamental em 2025-2026 e de **respostas unicas para resultados autonomos**:

- **Antes**: Usuario define O QUE e COMO
- **Agora**: Usuario define O QUE, agente descobre O COMO

**Marcos em 2025:**
- Claude 4: Suporte nativo a tool invocation, file access, extended memory, long-horizon reasoning
- Gemini 2.5: Contexto grande, multimodal nativo, tool usage integrado
- Gartner: Aumento de 1.445% em consultas sobre sistemas multi-agente (Q1 2024 a Q2 2025)

### Componentes de um Prompt Agentico

#### 13.1 Planejamento

```xml
<planning>
Antes de executar qualquer acao:
1. Analise o objetivo principal
2. Decomponha em sub-objetivos
3. Identifique dependencias entre sub-objetivos
4. Crie um plano de execucao ordenado
5. Identifique pontos de verificacao

Apresente o plano antes de executar.
</planning>
```

#### 13.2 Tool Use

```xml
<tool_use_guidelines>
Ferramentas disponiveis:
- search(query): Busca informacoes na web
- read_file(path): Le conteudo de arquivo
- write_file(path, content): Escreve em arquivo
- execute_code(code): Executa codigo Python
- ask_user(question): Faz pergunta ao usuario

Principios:
- Use ferramentas quando informacao nao esta disponivel no contexto
- Prefira acao direta sobre sugestoes
- Valide resultados de ferramentas antes de prosseguir
- Combine chamadas paralelas quando possivel
</tool_use_guidelines>
```

#### 13.3 Multi-Step Reasoning com Estado

```xml
<state_management>
Mantenha um registro de estado durante a execucao:
- Tarefas completadas
- Tarefas pendentes
- Informacoes coletadas
- Decisoes tomadas e justificativas
- Problemas encontrados e resolucoes

Atualize o estado apos cada acao significativa.
</state_management>
```

### Orquestracao Multi-Agente (2025-2026)

A tendencia e substituir agentes unicos por **equipes de agentes especializados**:

```
[Agente Orquestrador]
      |
      +-- [Agente de Pesquisa]
      +-- [Agente de Codigo]
      +-- [Agente de Revisao]
      +-- [Agente de Teste]
```

**Melhores praticas para sub-agentes (Claude Opus 4.6):**

```
Use sub-agentes quando tarefas podem rodar em paralelo, requerem contexto
isolado, ou envolvem workstreams independentes. Para tarefas simples,
operacoes sequenciais, ou edicoes de arquivo unico, trabalhe diretamente
em vez de delegar.
```

### Equilibrio entre Autonomia e Seguranca

```xml
<safety_guidelines>
Considere a reversibilidade e impacto potencial de suas acoes.
Voce e encorajado a tomar acoes locais e reversiveis (editar arquivos,
rodar testes), mas para acoes dificeis de reverter, que afetam sistemas
compartilhados, ou que podem ser destrutivas, pergunte ao usuario antes.

Exemplos que requerem confirmacao:
- Operacoes destrutivas: deletar arquivos, drop de tabelas
- Dificeis de reverter: git push --force, git reset --hard
- Visiveis para outros: push de codigo, comentarios em PRs, envio de mensagens
</safety_guidelines>
```

### Quando Usar Agentic Prompting

| Cenario | Recomendacao |
|---------|-------------|
| Tarefas multi-etapa autonomas | Ideal |
| Desenvolvimento de software | Altamente recomendado |
| Pesquisa e analise complexa | Altamente recomendado |
| Automacao de workflows | Recomendado |
| Pergunta simples factual | Desnecessario |

---

## 14. Prompt Templates

### Conceito

Prompt Templates sao frameworks reutilizaveis com placeholders (variaveis) que permitem parametrizar prompts para diferentes entradas mantendo estrutura e instrucoes consistentes.

### Evolucao em 2025

Em 2025, templates evoluiram de "hack de produtividade" para **componente central em stacks de IA empresarial**:

- **Design orientado a templates**: Componentes de prompt padronizados e modulares
- **Automacao com toolchains**: Pipelines de teste e deploy de prompts
- **Orquestracao em nivel de sistema**: Composicao de prompts como modulos de software
- **CI/CD para prompts**: Testes automaticos e deploy em ambientes

### Componentes de um Template

```
[ROLE DEFINITION]
Voce e {role} com expertise em {domain}.

[CONTEXT]
{context_variable}

[INSTRUCTIONS]
{task_instructions}

[INPUT]
{user_input}

[OUTPUT FORMAT]
{output_format_specification}

[CONSTRAINTS]
{constraints_list}

[EXAMPLES]
{few_shot_examples}
```

### Exemplo de Template Composavel

```xml
<!-- template_base.xml -->
<system>
{system_prompt}
</system>

<instructions>
{instructions}
</instructions>

<!-- template_analise.xml (extends template_base) -->
<context>
Documento para analise:
{document}
</context>

<analysis_criteria>
{criteria}
</analysis_criteria>

<output_format>
Formato da analise:
{format}
</output_format>
```

### Frameworks para Templates (2025)

1. **LangChain**: PromptTemplate com variaveis, composicao, e formatacao
2. **Langfuse**: Composicao de prompts -- referenciar prompts dentro de outros prompts
3. **PromptLayer**: Versionamento, tracking e observabilidade
4. **DSPy**: Templates como modulos compilaveis e otimizaveis

### Melhores Praticas

1. **Trate prompts como dependencias de software**: Versionamento, testes, deploy
2. **Modularize**: Separe instrucoes, contexto, exemplos e formato
3. **Parameterize**: Use variaveis para partes que mudam
4. **Documente**: Registre proposito, variaveis esperadas e exemplos de uso
5. **Teste**: Crie suites de teste para validar templates
6. **Versione**: Use controle de versao (git) para gerenciar evolucao

### Template Pronto: Analise de Documentos

```xml
<system>
Voce e um analista de documentos especializado em {domain}.
Sua tarefa e analisar documentos de forma estruturada e detalhada.
</system>

<instructions>
Analise o documento fornecido considerando os seguintes criterios:
{analysis_criteria}

Para cada criterio, forneca:
1. Avaliacao (1-10)
2. Evidencias do texto
3. Recomendacoes de melhoria
</instructions>

<document>
{document_text}
</document>

<output_format>
Responda em JSON com a seguinte estrutura:
{
  "resumo_executivo": "string",
  "criterios": [
    {
      "nome": "string",
      "avaliacao": "number (1-10)",
      "evidencias": ["string"],
      "recomendacoes": ["string"]
    }
  ],
  "conclusao": "string",
  "score_geral": "number (1-10)"
}
</output_format>
```

---

## 15. State of the Art 2025-2026

### Tendencias Principais

#### 15.1 Reasoning Models e Test-Time Compute

O grande avanaco de 2025 foi a emergencia de **modelos de raciocinio** (O3, DeepSeek-R1) que investem mais computacao em tempo de inferencia:

- **Test-Time Compute Scaling**: Mais computacao na geracao = melhores resultados
- **Self-Consistency + Self-Refinement**: Multiplas iteracoes durante inferencia
- **Meta-prompting alinhado**: Etapas de raciocinio estruturado durante inferencia

#### 15.2 Prompt Scaffolding

Pratica de envolver inputs do usuario em templates estruturados e protegidos que limitam o comportamento do modelo -- uma abordagem de prompting defensivo onde voce diz ao modelo como pensar, responder e recusar requisicoes inadequadas.

#### 15.3 Prompt Compression

Reducao do comprimento do prompt preservando intencao, estrutura e eficacia. Critico em aplicacoes de contexto longo com documentos extensos ou historico de interacoes.

#### 15.4 Combinacao de Tecnicas

A tendencia e combinar multiplas abordagens:
- ReAct + Recursive Self-Improvement
- Multi-Perspective Simulation + Calibrated Confidence Prompting
- CoT + Self-Consistency + RAG

#### 15.5 Adaptive Prompting

Sistemas de IA ajudam a refinar seus proprios prompts em tempo real. Modelos avancados sugerem melhorias ou ajustam prompts dinamicamente com base no contexto.

#### 15.6 Prompt Workflows

A evolucao de prompts individuais para **workflows de prompts**: automatizacao e encadeamento onde a saida de um alimenta outro, criando pipelines multi-etapa.

#### 15.7 Multi-Agent Systems

Gartner preve que **40% das aplicacoes empresariais** integrarao agentes de IA ate o final de 2026 (vs <5% em 2025). A tendencia e orquestracao de equipes de agentes especializados em vez de agentes unicos genericos.

#### 15.8 Agentic Search e Long-Horizon Reasoning

Claude Opus 4.6 demonstra capacidades excepcionais de pesquisa agentica e raciocinio de horizonte longo, mantendo orientacao ao longo de sessoes estendidas com progresso incremental.

### Papers Mais Citados (2022-2025)

| Paper | Autores | Ano | Contribuicao |
|-------|---------|-----|-------------|
| Chain-of-Thought Prompting | Wei et al. | 2022 | Raciocinio passo a passo |
| ReAct | Yao et al. | 2022 | Raciocinio + Acao |
| Tree of Thoughts | Yao et al. | 2023 | Exploracao de multiplos caminhos |
| Reflexion | Shinn et al. | 2023 | Reflexao verbal e auto-melhoria |
| Constitutional AI | Bai et al. | 2022 | Auto-avaliacao por principios |
| Self-Consistency | Wang et al. | 2022 | Multiplos caminhos + voto majoritario |
| DSPy | Khattab et al. | 2023 | Otimizacao automatica de prompts |
| TextGrad | Yuksekgonul et al. | 2025 | Otimizacao via gradientes textuais |

---

## 16. Comparacao entre Tecnicas

### Tabela Comparativa Geral

| Tecnica | Complexidade | Custo | Melhoria Tipica | Melhor Para |
|---------|-------------|-------|-----------------|-------------|
| Zero-Shot CoT | Baixa | Baixo | Moderada | Raciocinio basico |
| Few-Shot CoT | Media | Medio | Alta | Raciocinio + formato |
| ReAct | Media-Alta | Medio-Alto | Alta | Tarefas com ferramentas |
| Reflexion | Alta | Alto | Muito Alta | Auto-melhoria iterativa |
| Tree of Thoughts | Alta | Muito Alto | Muito Alta* | Puzzles, planejamento |
| Meta-Prompting | Media | Medio | Variavel | Otimizacao de prompts |
| Structured Output | Baixa | Baixo | Alta (parseabilidade) | Integracao com sistemas |
| Few-Shot | Baixa-Media | Baixo | Moderada-Alta | Formato e estilo |
| Role Prompting | Baixa | Baixo | Variavel | Tarefas criativas |
| Prompt Chaining | Media | Medio | Alta | Tarefas multi-etapa |
| Constitutional AI | Media-Alta | Medio | Moderada | Seguranca e alinhamento |
| RAG | Alta | Alto | Muito Alta | Dados atualizados/privados |
| Agentic | Muito Alta | Muito Alto | Muito Alta | Automacao complexa |

*ToT mostra melhorias dramaticas em tarefas especificas (4% -> 74% no Game of 24) mas e overkill para muitas tarefas.

### Arvore de Decisao: Qual Tecnica Usar?

```
A tarefa e simples e direta?
  SIM -> Zero-shot (possivelmente com role prompting)
  NAO -> Continue...

A tarefa requer raciocinio em etapas?
  SIM -> A tarefa precisa de informacao externa?
    SIM -> ReAct (possivelmente + CoT)
    NAO -> A tarefa tem multiplas solucoes possiveis?
      SIM -> Tree of Thoughts
      NAO -> Chain of Thought
  NAO -> Continue...

A tarefa requer formato especifico de saida?
  SIM -> Structured Output (XML/JSON) + Few-Shot
  NAO -> Continue...

A tarefa e complexa e multi-etapa?
  SIM -> Prompt Chaining + tecnica apropriada em cada etapa
  NAO -> Continue...

A tarefa precisa de dados atualizados/privados?
  SIM -> RAG + tecnica de raciocinio apropriada
  NAO -> Continue...

A tarefa precisa de alta qualidade com auto-correcao?
  SIM -> Reflexion / Self-Critique
  NAO -> Few-shot ou Zero-shot com instrucoes claras

A tarefa precisa de autonomia e uso de ferramentas?
  SIM -> Agentic Prompting (ReAct + Planning + Tool Use)
  NAO -> Tecnica mais simples possivel
```

### Combinacoes Eficazes

| Combinacao | Caso de Uso |
|-----------|-------------|
| CoT + Self-Consistency | Raciocinio confiavel sem ferramentas |
| ReAct + CoT | Raciocinio com acesso a informacao externa |
| Few-Shot + Structured Output | Extracao de dados com formato consistente |
| RAG + CoT | Perguntas complexas sobre dados especificos |
| Prompt Chaining + Self-Critique | Pipeline de alta qualidade com validacao |
| Role + Few-Shot + XML Tags | Prompt completo e estruturado para Claude |
| Agentic + Reflexion + Tool Use | Agente autonomo que aprende com erros |
| Meta-Prompting + Few-Shot | Otimizacao automatica de templates |

---

## 17. Referencias Completas

### Papers Academicos

| # | Titulo | Autores | Ano | URL | Tipo |
|---|--------|---------|-----|-----|------|
| 1 | Chain-of-Thought Prompting Elicits Reasoning in Large Language Models | Wei et al. | 2022 | https://arxiv.org/abs/2201.11903 | Paper (NeurIPS) |
| 2 | ReAct: Synergizing Reasoning and Acting in Language Models | Yao, Zhao et al. | 2022 | https://arxiv.org/abs/2210.03629 | Paper (ICLR 2023) |
| 3 | Tree of Thoughts: Deliberate Problem Solving with Large Language Models | Yao et al. | 2023 | https://arxiv.org/abs/2305.10601 | Paper (NeurIPS 2023) |
| 4 | Reflexion: Language Agents with Verbal Reinforcement Learning | Shinn et al. | 2023 | https://arxiv.org/abs/2303.11366 | Paper (NeurIPS 2023) |
| 5 | Constitutional AI: Harmlessness from AI Feedback | Bai et al. | 2022 | https://arxiv.org/abs/2212.08073 | Paper (Anthropic) |
| 6 | Self-Reflection in LLM Agents: Effects on Problem-Solving Performance | - | 2024 | https://arxiv.org/abs/2405.06682 | Paper |
| 7 | Enhancing RAG: A Study of Best Practices | - | 2025 | https://arxiv.org/abs/2501.07391 | Paper |
| 8 | Evaluating Advanced Chunking for RAG | - | 2025 | https://arxiv.org/abs/2504.19754 | Paper |
| 9 | Exploring ReAct Prompting for Task-Oriented Dialogue | - | 2025 | https://arxiv.org/abs/2412.01262 | Paper (IWSDS 2025) |
| 10 | Self-reflection enhances LLMs towards substantial academic response | - | 2025 | https://www.nature.com/articles/s44387-025-00045-3 | Paper (Nature) |

### Documentacao Oficial

| # | Titulo | Fonte | Ano | URL | Tipo |
|---|--------|-------|-----|-----|------|
| 11 | Prompt Engineering Overview | Anthropic | 2025 | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview | Docs Oficial |
| 12 | Prompting Best Practices (Claude 4) | Anthropic | 2025 | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices | Docs Oficial |
| 13 | Use XML Tags to Structure Prompts | Anthropic | 2025 | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags | Docs Oficial |
| 14 | Prefill Claude's Response | Anthropic | 2025 | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prefill-claudes-response | Docs Oficial |
| 15 | Extended Thinking | Anthropic | 2025 | https://platform.claude.com/docs/en/build-with-claude/extended-thinking | Docs Oficial |
| 16 | Adaptive Thinking | Anthropic | 2026 | https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking | Docs Oficial |
| 17 | Constitutional AI Research | Anthropic | 2023 | https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback | Blog Oficial |

### Guias e Blogs

| # | Titulo | Fonte | Ano | URL | Tipo |
|---|--------|-------|-----|-----|------|
| 18 | Prompt Engineering Guide | DAIR.AI | 2024 | https://www.promptingguide.ai/techniques | Guia Referencia |
| 19 | The 2026 Guide to Prompt Engineering | IBM | 2026 | https://www.ibm.com/think/prompt-engineering | Guia Industria |
| 20 | Chain of Thought Prompting: A Comprehensive Guide | orq.ai | 2025 | https://orq.ai/blog/what-is-chain-of-thought-prompting | Blog Tecnico |
| 21 | 8 Chain-of-Thought Techniques | Galileo | 2025 | https://galileo.ai/blog/chain-of-thought-prompting-techniques | Blog Tecnico |
| 22 | Tree of Thoughts Prompting | Cameron R. Wolfe | 2023 | https://cameronrwolfe.substack.com/p/tree-of-thoughts-prompting | Blog Academico |
| 23 | What is Tree of Thoughts Prompting? | IBM | 2025 | https://www.ibm.com/think/topics/tree-of-thoughts | Guia Industria |
| 24 | A Complete Guide to Meta Prompting | PromptHub | 2025 | https://www.prompthub.us/blog/a-complete-guide-to-meta-prompting | Blog Tecnico |
| 25 | Automatic Prompt Optimization | Cameron R. Wolfe | 2024 | https://cameronrwolfe.substack.com/p/automatic-prompt-optimization | Blog Academico |
| 26 | Prompt Chaining for AI Engineers | Maxim | 2025 | https://www.getmaxim.ai/articles/prompt-chaining-for-ai-engineers-a-practical-guide-to-improving-llm-output-quality/ | Guia Pratico |
| 27 | RAG in 2025: 7 Proven Strategies | Morphik | 2025 | https://www.morphik.ai/blog/retrieval-augmented-generation-strategies | Blog Tecnico |
| 28 | Chunking Strategies for RAG | Adnan Masood | 2025 | https://medium.com/@adnanmasood/chunking-strategies-for-retrieval-augmented-generation-rag-a-comprehensive-guide-5522c4ea2a90 | Blog Tecnico |
| 29 | Role-Prompting: Does Adding Personas Make a Difference? | PromptHub | 2025 | https://www.prompthub.us/blog/role-prompting-does-adding-personas-to-your-prompts-really-make-a-difference | Blog Pesquisa |
| 30 | Agentic LLMs in 2025 | Data Science Dojo | 2025 | https://datasciencedojo.com/blog/agentic-llm-in-2025/ | Blog Tecnico |
| 31 | 7 Agentic AI Trends to Watch in 2026 | ML Mastery | 2026 | https://machinelearningmastery.com/7-agentic-ai-trends-to-watch-in-2026/ | Blog Industria |
| 32 | Claude Prompt Engineering: 25 Practices Tested | DreamHost | 2025 | https://www.dreamhost.com/blog/claude-prompt-engineering/ | Blog Pratico |
| 33 | AI Prompt Engineering in 2025: What Works | Lenny's Newsletter | 2025 | https://www.lennysnewsletter.com/p/ai-prompt-engineering-in-2025-sander-schulhoff | Blog Industria |
| 34 | Prompt Engineering Techniques on AWS Bedrock | AWS | 2024 | https://aws.amazon.com/blogs/machine-learning/prompt-engineering-techniques-and-best-practices-learn-by-doing-with-anthropics-claude-3-on-amazon-bedrock/ | Tutorial |
| 35 | The Ultimate Guide to Prompt Engineering (Lakera) | Lakera | 2026 | https://www.lakera.ai/blog/prompt-engineering-guide | Guia Industria |
| 36 | From Templates to Toolchains: Prompt Engineering Trends 2025 | Refonte | 2025 | https://www.refontelearning.com/blog/from-templates-to-toolchains-prompt-engineering-trends-2025-explained | Blog Industria |
| 37 | Engenharia de Prompts: Guia Definitivo 2025 | Quiker | 2025 | https://quiker.com.br/engenharia-de-prompts-guia-completo/ | Guia PT-BR |
| 38 | Prompt Composability | Langfuse | 2025 | https://langfuse.com/changelog/2025-03-12-prompt-composability | Docs Ferramenta |

---

## Apendice A: Checklist Rapido de Prompt Engineering

Antes de submeter um prompt, verifique:

- [ ] **Clareza**: As instrucoes sao claras e sem ambiguidade?
- [ ] **Estrutura**: O prompt usa XML tags ou separadores claros?
- [ ] **Contexto**: Informacoes necessarias estao incluidas?
- [ ] **Exemplos**: Ha exemplos suficientes (2-3 de qualidade)?
- [ ] **Formato de saida**: O formato desejado esta especificado?
- [ ] **Restricoes**: Limites e restricoes estao explicitos?
- [ ] **Tecnica adequada**: A tecnica escolhida e apropriada para a tarefa?
- [ ] **Custo vs beneficio**: A complexidade do prompt justifica o ganho?

## Apendice B: Template Universal para Claude

```xml
<system>
Voce e {role}. {background_e_expertise}.

Seus principios:
- {principio_1}
- {principio_2}
- {principio_3}
</system>

<instructions>
{instrucoes_detalhadas}

Formato de resposta:
{especificacao_do_formato}
</instructions>

<context>
{informacoes_de_contexto}
</context>

<examples>
<example>
<input>{exemplo_entrada_1}</input>
<ideal_output>{exemplo_saida_1}</ideal_output>
</example>
<example>
<input>{exemplo_entrada_2}</input>
<ideal_output>{exemplo_saida_2}</ideal_output>
</example>
</examples>

<constraints>
- {restricao_1}
- {restricao_2}
- {restricao_3}
</constraints>

<input>
{entrada_do_usuario}
</input>
```

---

> **Nota**: Este documento e uma referencia viva. As tecnicas de prompt engineering evoluem rapidamente.
> Recomenda-se revisao periodica e atualizacao conforme novas pesquisas e versoes de modelos sao publicadas.
>
> Ultima atualizacao: Fevereiro 2026
> Compilado a partir de 38+ fontes (papers, documentacao oficial, blogs e guias da industria)
