# Regulamentacao e Compliance para Trading Algoritmico no Brasil

**Documento de Pesquisa Aprofundada**
**Ultima atualizacao:** Fevereiro de 2026
**Classificacao:** Pesquisa academica / nivel PhD

---

## Sumario Executivo

Este documento apresenta uma analise abrangente e aprofundada do arcabouco regulatorio brasileiro aplicavel ao trading algoritmico e bots de investimento. O ecossistema regulatorio brasileiro e composto por multiplas camadas institucionais -- CVM (Comissao de Valores Mobiliarios), Banco Central do Brasil (Bacen), B3 (Brasil, Bolsa, Balcao), BSM (Supervisao de Mercados) e COAF (Conselho de Controle de Atividades Financeiras) -- que, em conjunto, definem as regras para operacao de algoritmos no mercado de capitais nacional.

A regulamentacao brasileira, embora menos prescritiva que a europeia (MiFID II) em relacao a trading algoritmico especificamente, possui um arcabouco robusto de normas sobre intermediacao, prevencao a manipulacao de mercado, compliance antilavagem e protecao de dados que impactam diretamente o desenvolvimento e operacao de bots de investimento.

---

## Indice

1. [CVM - Comissao de Valores Mobiliarios](#1-cvm---comissao-de-valores-mobiliarios)
2. [Banco Central do Brasil (Bacen)](#2-banco-central-do-brasil-bacen)
3. [B3 - Regras Operacionais](#3-b3---regras-operacionais)
4. [Trading Algoritmico - Requisitos Especificos](#4-trading-algoritmico---requisitos-especificos)
5. [Compliance - KYC, AML e LGPD](#5-compliance---kyc-aml-e-lgpd)
6. [Manipulacao de Mercado](#6-manipulacao-de-mercado)
7. [Limites e Restricoes Operacionais](#7-limites-e-restricoes-operacionais)
8. [Pessoa Fisica vs Pessoa Juridica](#8-pessoa-fisica-vs-pessoa-juridica)
9. [Sandbox Regulatorio](#9-sandbox-regulatorio)
10. [Comparacao Internacional](#10-comparacao-internacional)
11. [Implicacoes Praticas para o Bot](#11-implicacoes-praticas-para-o-bot)
12. [Referencias Bibliograficas](#12-referencias-bibliograficas)

---

## 1. CVM - Comissao de Valores Mobiliarios

### 1.1 Arcabouco Legal Fundamental

A CVM foi criada pela **Lei n. 6.385/1976**, que disciplina o mercado de capitais e atribui a autarquia poderes amplos de regulamentacao, fiscalizacao e sancao. A CVM tem jurisdicao para:

- Estabelecer regras para negociacao de valores mobiliarios em bolsas de valores
- Investigar atos ilegais e praticas nao equitativas de participantes do mercado
- Aplicar penalidades previstas no artigo 11 da Lei, sem prejuizo de responsabilidade civil ou criminal
- Suspender a negociacao de determinados valores mobiliarios
- Suspender ou cancelar registros de participantes

A **Lei n. 6.404/1976** (Lei das Sociedades por Acoes) complementa o arcabouco, especialmente nos artigos 155 (dever de lealdade) e 157 (dever de informar), ambos relevantes para prevencao de insider trading e front running.

### 1.2 Resolucao CVM n. 35/2021 - Intermediacao de Valores Mobiliarios

A Resolucao CVM n. 35, de 26 de maio de 2021, e a norma central que rege a intermediacao de operacoes com valores mobiliarios em mercados regulamentados. Esta resolucao:

- **Revogou** as Instrucoes CVM n. 51/1986, 333/2000, 505/2011, 526/2012, 581/2016, 612/2019 e 618/2020
- **Consolidou** normas e procedimentos para intermediacao
- Estabeleceu que a intermediacao em mercados regulamentados e **exclusiva** de instituicoes autorizadas a atuar como participantes do sistema de distribuicao
- Determinou que intermediarios devem adotar e implementar **regras, procedimentos e controles internos** adequados e eficazes

**Implicacao para o Bot:** Qualquer bot de trading deve operar atraves de um intermediario autorizado (corretora). O bot nao pode acessar diretamente o mercado sem essa intermediacao, e deve respeitar os controles internos e regras da corretora utilizada.

### 1.3 Instrucao CVM n. 612/2019 (Revogada, incorporada na RCVM 35)

A ICVM 612 alterou e acrescentou dispositivos a ICVM 505/2011, sendo particularmente relevante para trading eletronico. Entre as alteracoes:

- A periodicidade do relatorio de controles internos passou a ser **anual** (antes era semestral)
- Permitiu que pessoas vinculadas negociassem valores mobiliarios por meio de outros intermediarios, com criterios especificos
- Reforco nos controles de acesso eletronico

### 1.4 Resolucao CVM n. 135/2022 - Mercados Regulamentados

A Resolucao CVM 135, de 10 de junho de 2022, modernizou o marco regulatorio dos mercados organizados de valores mobiliarios, substituindo a Instrucao CVM n. 461/2007. Principais pontos:

- Disciplina o funcionamento de **mercados regulamentados** de valores mobiliarios
- Define regras para constituicao, organizacao e funcionamento de administradores de mercados organizados
- Distingue entre **mercado de bolsa** e **mercado de balcao organizado** com base em criterios como:
  - Existencia de ambiente para registro de operacoes previamente executadas
  - Regras de formacao de precos
  - Possibilidade de participacao direta sem intermediario
  - Volume negociado
  - Publico-alvo investidor
- Entrou em vigor em 1 de setembro de 2022

### 1.5 Instrucao CVM n. 8/1979 - Praticas Nao Equitativas

A ICVM 8/79, embora antiga, permanece como fundamento legal central para combate a manipulacao de mercado. Define e proibe:

- **Alinea "a":** Condicoes artificiais de demanda, oferta ou preco de valores mobiliarios (base legal para enquadrar spoofing e layering)
- **Alinea "b":** Manipulacao de precos
- **Alinea "c":** Operacoes fraudulentas (base para enquadrar churning)
- **Alinea "d":** Praticas nao equitativas

### 1.6 Lei n. 13.506/2017 - Penalidades

A Lei 13.506/2017 representou uma reforma significativa no sistema sancionador do mercado de capitais:

**Teto de multas:** Aumentou de R$ 500 mil para **R$ 50 milhoes**

**Bases alternativas de calculo:**
- Ate **200%** do valor da emissao ou operacao irregular (antes era 50%)
- Ate **3 vezes** o valor da vantagem economica obtida ou perda evitada
- Ate **2 vezes** o valor do dano causado aos investidores (criterio novo)

**Tipos de penalidades (isoladas ou cumulativas):**
1. Advertencia publica (publicacao da condenacao com nome do penalizado)
2. Multa
3. Proibicao temporaria de prestar servicos ou praticar atividades (ate 20 anos)
4. Inabilitacao para cargos que exijam autorizacao (ate 20 anos)
5. Cancelamento de autorizacao para operacao

**Sistema de dosimetria** (Resolucao CVM n. 45/2021, regulamentando a ICVM 607/2019):
1. Fixacao da pena-base
2. Aplicacao de agravantes e atenuantes
3. Verificacao de causas de reducao de pena

**Prescricao:** 8 anos a partir da pratica do ilicito ou, em caso de infracao permanente ou continuada, a partir de quando cessou.

---

## 2. Banco Central do Brasil (Bacen)

### 2.1 Politica Monetaria e Taxa SELIC

O Bacen conduz a politica monetaria brasileira com foco no sistema de metas de inflacao. A taxa SELIC e o principal instrumento:

**Trajetoria em 2024:**
- Janeiro-Maio 2024: Continuidade do ciclo de reducao iniciado em agosto/2023 (de 13,75% para 10,50%)
- Setembro 2024: Inicio de novo ciclo de alta (10,75%)
- Novembro 2024: 11,25%
- Dezembro 2024: 12,25%

**Implicacao para o Bot:** Variacoes na SELIC afetam diretamente:
- Custo de oportunidade do capital alocado em renda variavel
- Precificacao de derivativos (especialmente contratos de DI futuro)
- Atratividade relativa entre renda fixa e variavel
- Volatilidade de mercado (decisoes do COPOM sao eventos de alto impacto)

O bot deve incorporar dados macroeconomicos e calendario do COPOM como variaveis de decisao.

### 2.2 Regulamentacao Cambial

O Bacen regula o mercado de cambio e suas operacoes. Para bots que operem ativos atrelados a moedas estrangeiras (dolar futuro, mini-dolar, ETFs internacionais):

- Necessidade de observar limites de exposicao cambial
- Regras especificas para investidores nao-residentes
- Regulamentacao do uso de ativos virtuais em operacoes cambiais (em desenvolvimento para 2025-2026)

### 2.3 Agenda Regulatoria 2025-2026

O Bacen definiu prioridades que impactam trading algoritmico:

- **Regulamentacao de ativos virtuais** em operacoes de cambio e capitais internacionais
- **Estudos sobre riscos da IA** no sistema financeiro, com objetivo de desenvolver diretrizes para uso seguro e eficiente
- Acompanhamento de inovacoes em fintechs e sistemas de pagamento

### 2.4 Circular Bacen n. 3.978/2020

Disciplina a politica, os procedimentos e os controles internos de prevencao a lavagem de dinheiro e ao financiamento do terrorismo para instituicoes autorizadas pelo Bacen. Complementa a Resolucao CVM 50 no ambito do sistema financeiro.

---

## 3. B3 - Regras Operacionais

### 3.1 Modelos de Acesso Direto ao Mercado (DMA)

A B3 oferece quatro modelos de acesso direto, cada um com nivel crescente de sofisticacao e menor latencia:

#### DMA 1 - Modelo Tradicional
- Roteamento de ofertas pela **infraestrutura fisica da corretora**
- Clientes acessam via home brokers e plataformas da corretora
- Corretora realiza **avaliacao eletronica de risco pre-negociacao** (risk check)
- **Menor custo**, mas maior latencia
- Adequado para bots de baixa/media frequencia

#### DMA 2 - Via Provedor Autorizado
- Ofertas roteadas por **provedor autorizado pela B3**
- Elimina a infraestrutura da corretora no caminho de dados
- Cliente utiliza sistemas proprietarios ou de terceiros
- Latencia intermediaria

#### DMA 3 - Conexao Direta
- Acesso **direto ao mercado** sem infraestrutura intermediaria
- Cliente arca com custos de conexao (links) e sessoes de negociacao (FIX)
- Para investidores sofisticados com infraestrutura propria
- Requer maior investimento em tecnologia

#### DMA 4 - Colocation
- Participante contrata **espaco fisico no Data Center da B3**
- Instala servidores proprios adjacentes a infraestrutura da B3
- **Latencia minima** (microsegundos)
- Duas variantes:
  - **Co-location Corretora:** corretora contrata espaco para uso de clientes
  - **Co-location Investidor:** investidor contrata diretamente com a B3
- Essencial para estrategias de HFT
- Custo mais elevado (infraestrutura + colocation + conectividade)

### 3.2 Programa HFT (High-Frequency Trading)

A B3 possui um programa formal de incentivo a HFT com regras detalhadas:

**Registro e Elegibilidade:**
- Apenas corretoras classificadas como **PNP (Participante de Negociacao Pleno)** ou **PL (Participante de Liquidacao)** podem solicitar inclusao
- Participantes de Negociacao simples (PN) **nao podem** inscrever investidores
- Inscricao via chamado no Servico de Atendimento da B3, com Termo de Adesao assinado
- **Todas as contas** do investidor com a corretora sao inscritas, incluindo futuras

**Requisitos Minimos por Familia de Ativos (vigentes desde outubro/2023):**

| Familia de Ativos | Estrategia (%) | ADV Minimo |
|---|---|---|
| Dolar | 90% | 2.800 std / 14.000 mini |
| Ibovespa | 90% | 1.500 std / 7.500 mini |
| Micro Ibovespa B3 BR+ | 90% | 7.500 contratos |
| S&P 500 | 80% | 100 std / 2.000 micro |
| Boi Gordo | 80% | 50 contratos |
| Cafe | 80% | 25 contratos |
| Milho | 80% | 150 contratos |
| Bitcoin | 90% | 3.000 contratos |
| Ether | 90% | 1.000 contratos |
| Solana | 90% | 1.000 contratos |

**Calculo de Estrategia HFT:**
- Estrategia = min(quantidade comprada, quantidade vendida) x 2 / quantidade total negociada
- Engloba day trades e arbitragem entre contratos da mesma familia
- Avaliado mensalmente com base no volume do mes anterior

**Incentivos Tarifarios:**
- Investidores HFT recebem **reducao adicional de 70%** sobre taxas de day trade em familias sem tabela diferenciada
- Tabelas diferenciadas aplicaveis a: Ibovespa, Micro Ibovespa, Dolar, S&P 500, Criptomoedas

### 3.3 Cancel on Disconnect e Cancel on Behalf

**Cancel on Disconnect:** Mecanismo que cancela automaticamente todas as ordens pendentes quando a conexao FIX com a B3 e interrompida. Funcionalidade critica de seguranca para algoritmos.

**Cancel on Behalf:** Funcionalidade que otimiza o processo de cancelamento, permitindo:
- Cancelar ordens assim que geradas e bloquear ofertas "in-flight"
- Uma sessao FIX cancelar ordens de **outras sessoes** pertencentes a mesma corretora e mesmo cliente final
- Fundamental para HFT que opera com multiplas sessoes de negociacao

### 3.4 Formador de Mercado (Market Maker)

A B3 possui programa formal de formadores de mercado:
- Obrigacao de manter ofertas continuamente em ambos os lados do livro
- Beneficios tarifarios em troca da provisao de liquidez
- Requisitos de spread maximo e tamanho minimo de oferta
- Diferentes programas por classe de ativo

### 3.5 Tuneis de Negociacao

A B3 adota tres tipos de tuneis para protecao de mercado:

1. **Tunel de Rejeicao:** Rejeita automaticamente ofertas com precos muito distantes do mercado
2. **Tunel de Leilao:** Aciona leilao quando ofertas ultrapassam determinada faixa
3. **Tunel de Protecao:** Prorroga encerramento de leilao quando parametros adicionais sao atingidos

**Implicacao para o Bot:** O bot deve respeitar os tuneis de negociacao, evitando enviar ordens com precos fora da faixa aceitavel, o que resultaria em rejeicao automatica ou acionamento indesejado de leiloes.

---

## 4. Trading Algoritmico - Requisitos Especificos

### 4.1 Definicao e Classificacao

No Brasil, trading algoritmico nao possui uma definicao normativa tao detalhada quanto na Europa (MiFID II). Entretanto, a CVM e a B3 reconhecem e regulam operacoes automatizadas atraves de:

- Regras de acesso eletronico (DMA)
- Programa HFT com registro obrigatorio
- Obrigacoes de controles de risco pre-negociacao
- Monitoramento pela BSM

### 4.2 BSM - B3 Supervisao de Mercados

A BSM e a entidade autorreguladora responsavel pela supervisao dos mercados organizados administrados pela B3. Criada em agosto de 2007, possui governanca composta por:

- **Conselho de Autorregulacao**
- **Diretor de Autorregulacao**
- **Departamento de Autorregulacao**
- **Camara Consultiva de Participantes de Mercado**

**Funcoes Principais:**

1. **Monitoramento de Mercado:** Supervisao de 100% das ofertas e operacoes realizadas nos mercados organizados, buscando identificar indicios de atipicidades
2. **Orientacao ao Mercado:** Fornecimento de orientacoes sobre requisitos de compliance operacional
3. **Auditoria de Participantes:** Verificacao de aderencia as regras e controles internos
4. **Mecanismo de Ressarcimento de Prejuizos (MRP):** Protecao a investidores

**Guia de Alertas BSM (versao 2.0 - setembro/2024):**
- Contém melhores praticas para desenvolvimento e parametrizacao de sistemas de monitoramento
- Identificacao de indicios de praticas abusivas: money pass, layering, spoofing, insider trading, front running
- Publica benchmarks de indicadores relacionados a praticas abusivas

**Mecanismos de Enforcement:**
- PAD (Processos Administrativos Disciplinares)
- Cartas de Alerta
- Termos de compromisso
- Encaminhamento de achados a CVM

### 4.3 Obrigacoes de Registro e Identificacao

Para operar algoritmos na B3:

1. **Identificacao de Algoritmo:** Cada algoritmo deve ser identificavel no sistema da B3
2. **Registro HFT:** Investidores HFT devem ser formalmente registrados
3. **Termo de Adesao:** Assinatura de termos especificos junto a B3
4. **Rastreabilidade:** Todas as ordens devem ser rastreavei ao algoritmo/estrategia de origem

### 4.4 Controles de Risco Pre-Negociacao

As corretoras devem implementar controles de risco antes do envio de ordens ao mercado:

- **Limites de posicao** por ativo e por carteira
- **Limites de perda** (loss limits) diarios
- **Controle de quantidade** maxima por ordem
- **Verificacao de margem** disponivel
- **Kill switch:** Capacidade de interromper toda a operacao algoritmca imediatamente

---

## 5. Compliance - KYC, AML e LGPD

### 5.1 Resolucao CVM n. 50/2021 - Prevencao a Lavagem de Dinheiro

A Resolucao CVM 50 e o marco regulatorio central para PLD/FTP no mercado de capitais, substituindo a ICVM 617/2019. Seus pilares sao:

**Abordagem Baseada em Risco (ABR):**
- Analise personalizada de transacoes com medidas de prevencao proporcionais aos riscos
- Obrigacao de elaboracao periodica de **avaliacao interna de risco**
- Reformulacao continua de regras, procedimentos e controles internos
- Conscientizacao obrigatoria da alta administracao

**Politica de PLD/FTP (conteudo minimo obrigatorio):**
- Governanca para cumprimento das obrigacoes
- Descricao da estrutura dos orgaos da alta administracao
- Definicao de papeis e atribuicao de responsabilidades em cada nivel hierarquico
- Processo de abordagem baseada em risco

**Know Your Customer (KYC):**
- Identificacao e cadastro de clientes com diligencias continuas
- Coleta de informacoes complementares e atualizadas
- Identificacao de **beneficiarios finais** (ultimate beneficial owners)
- Monitoramento continuo de operacoes

**Comunicacao ao COAF:**
- Operacoes suspeitas devem ser comunicadas ao COAF em **24 horas** da conclusao da operacao
- Comunicacao via **SISCOAF** (plataforma eletronica do COAF)
- Obrigacao de "declaracao negativa" anual ate 31 de janeiro do ano seguinte, caso nao haja operacoes suspeitas

### 5.2 KYC - Know Your Customer

O KYC no mercado de capitais brasileiro envolve tres dimensoes:

1. **KYC (Know Your Customer):** Identificacao e verificacao de clientes
2. **KYP (Know Your Partner):** Conhecimento de parceiros comerciais e contrapartes
3. **KYE (Know Your Employee):** Verificacao de colaboradores

**Obrigacoes especificas (RCVM 50):**
- Cadastro completo com documentos de identificacao
- Verificacao de fonte de renda e patrimonio
- Classificacao de risco do cliente
- Atualizacao cadastral periodica
- Monitoramento de transacoes incomuns

### 5.3 AML - Anti-Money Laundering

**Lei n. 9.613/1998 (Lei de Lavagem de Dinheiro):**
- Define crimes de lavagem de dinheiro
- Estabelece obrigacoes para setores regulados (art. 9)
- Inclui bolsas de valores, bolsas de mercadorias e futuros, e sistemas de negociacao organizados como obrigados
- Obrigacao de manter registro de transacoes por **5 anos**

**Lei n. 13.260/2016 (Lei Antiterrorismo):**
- Complementa o arcabouco de prevencao ao financiamento do terrorismo

**Circular Bacen n. 3.978/2020 + Carta Circular 4.001/2020:**
- Disciplina PLD/FTP para instituicoes autorizadas pelo Bacen
- Complementa a RCVM 50 no ambito bancario

**Guia ANBIMA de PLD/FTP:**
- Diretrizes setoriais para fundos de investimento e gestoras

### 5.4 LGPD - Lei Geral de Protecao de Dados (Lei n. 13.709/2018)

A LGPD entrou em vigor em setembro de 2020 e impacta significativamente o tratamento de dados no mercado financeiro:

**Bases legais relevantes para trading algoritmico (art. 7):**
1. **Cumprimento de obrigacao legal ou regulatoria** (ex: KYC, PLD)
2. **Execucao de contrato** (ex: relacao com corretora)
3. **Interesse legitimo** do controlador (ex: prevencao a fraudes)
4. **Consentimento** do titular

**Dados financeiros e a LGPD:**
- Dados financeiros **nao** sao explicitamente classificados como "dados sensiveis" pela LGPD
- Entretanto, interpretacao contextual sugere que informacoes como score de credito, historico de pagamento e comportamento de gastos podem requerer **protecao reforçada**
- A coleta de dados para KYC tem base legal em "cumprimento de obrigacao legal"

**Obrigacoes do Controlador:**
- Medidas tecnicas e administrativas para proteger dados pessoais
- Transparencia sobre tratamento de dados
- Registro de operacoes de tratamento
- Nomeacao de Encarregado de Protecao de Dados (DPO)
- Comunicacao de incidentes de seguranca a ANPD e aos titulares

**Obrigacoes do Operador:**
- Responsabilidade solidaria por danos causados em caso de descumprimento
- Seguir instrucoes licitas do controlador
- Implementar medidas de seguranca da informacao

**Implicacao para o Bot:** O bot que processa dados de clientes (nomes, CPFs, historico de operacoes) deve estar em conformidade com a LGPD. Isso inclui: minimizacao de dados, anonimizacao quando possivel, registros de tratamento, e politica de privacidade.

---

## 6. Manipulacao de Mercado

### 6.1 Definicoes e Tipificacao

A legislacao brasileira define e proibe diversas formas de manipulacao de mercado, com fundamento principal na **ICVM 8/79** e na **Lei 6.385/76**:

#### 6.1.1 Spoofing
- **Definicao:** Insercao de ordens artificiais de compra e venda, sem intencao de execucao, destinadas a criar liquidez artificial e enganar outros participantes do mercado
- **Base legal:** ICVM 8/79, alinea "a" (condicoes artificiais de demanda, oferta ou preco)
- **Caracteristicas:**
  - Ordens inseridas em volumes superiores aos padroes historicos
  - Cancelamento apos manipular acoes de outros investidores
  - Criacao de razoes falsas de oferta/demanda
  - Perpetrador lucra com variacoes de preco induzidas artificialmente
  - Cancelamento em milesimos de segundo

#### 6.1.2 Layering
- **Definicao:** Tecnica sofisticada que emprega multiplos niveis de preco com ofertas artificiais coordenadas, nenhuma destinada a execucao
- **Base legal:** ICVM 8/79, alinea "a"
- **Caracteristicas:**
  - Ordens artificiais "em camadas" em faixas de preco
  - Atividade coordenada (pode constituir fraude)
  - Pode se estender por multiplos pregoes
  - Cria percepcao falsa de profundidade de mercado

#### 6.1.3 Front Running
- **Definicao:** Obtencao ilicita de informacao antecipada sobre operacoes pendentes para beneficiar-se de movimentos de preco antes da divulgacao publica
- **Base legal:** Lei 6.404/76, arts. 155 e 157; ICVM 8/79
- **Caso notavel:** Trader do Credit Suisse condenado pela CVM por usar conta de familiar para lucrar com operacoes (2012-2014)

#### 6.1.4 Wash Trading
- **Definicao:** Operacoes em que o mesmo comitente aparece nos dois lados da operacao (compra e venda), criando volume artificial
- **Base legal:** ICVM 8/79, alineas "a" e "b"

#### 6.1.5 Churning
- **Definicao:** Execucao excessiva de transacoes para gerar comissoes de corretagem, sem atender ao interesse do investidor
- **Base legal:** ICVM 8/79, alinea "c" (operacoes fraudulentas)
- **Caracteristicas:**
  - Operacoes sem autorizacao adequada do investidor
  - Priorizacao de receita de corretagem sobre interesse do cliente

### 6.2 Penalidades Aplicadas - Casos Reais

#### Caso 1: PAS CVM 19957.005977/2016-18 (Primeiro caso de spoofing no Brasil)
- **Condenados:** Jose Joaquim Paifer e Paiffer Management Ltda.
- **Penalidade:** R$ 684.000,00 (pessoa fisica) + R$ 1.710.000,00 (pessoa juridica)
- **Criterio:** Dobro da vantagem economica obtida

#### Caso 2: PAS CVM SEI 19957.010831/2019-37
- **Condenados:** Moisely Martins da Silva e Alexandre Cony dos Santos Junior
- **Violacao:** Manipulacao de precos por operacoes de mesmo comitente + spoofing (jan-mar/2017)
- **Penalidade:** R$ 757.661,47 cada (decisao unanime)
- **Base legal:** ICVM 8, incisos I e II, "b"

#### Caso 3: Rafael Damiati Ferreira Alves
- **Violacao:** Manipulacao de precos mediante spoofing (maio/2015 a agosto/2017)
- **Penalidade:** R$ 403.352,61

### 6.3 Crime de Manipulacao (Esfera Penal)

A **Lei n. 13.506/2017** tipifica como **crime** realizar operacoes simuladas ou manobras fraudulentas destinadas a elevar, manter ou baixar cotacao, preco ou volume:

- **Pena:** Reclusao de **1 a 8 anos**
- **Multa:** Ate **3 vezes** o montante da vantagem ilicita

**Implicacao para o Bot:** O bot NUNCA deve ser programado para realizar praticas que possam ser enquadradas como manipulacao de mercado. Isso inclui: envio de ordens sem intencao de execucao, criacao de volume artificial, ou uso de informacoes privilegiadas. As penalidades sao severas, incluindo prisao.

---

## 7. Limites e Restricoes Operacionais

### 7.1 Circuit Breaker

O circuit breaker da B3 e um mecanismo de protecao que interrompe as negociacoes quando ha queda acentuada no Ibovespa:

| Queda do Ibovespa | Interrupcao | Duracao |
|---|---|---|
| **10%** em relacao ao fechamento anterior | Estagio 1 | **30 minutos** |
| **15%** em relacao ao fechamento anterior | Estagio 2 | **1 hora** |
| **20%** em relacao ao fechamento anterior | Estagio 3 | **Tempo indeterminado** |

**Restricoes temporais:**
- O circuit breaker **nao pode** ser ativado nos ultimos 30 minutos do pregao
- Se acionado na ultima hora do pregao, o horario de fechamento e estendido em ate 30 minutos

**Implicacao para o Bot:** O bot deve detectar acionamento de circuit breaker e suspender operacoes automaticamente. Deve tambem ter logica para gerenciar posicoes abertas durante periodos de interrupcao.

### 7.2 Limites de Posicao

A B3 define limites de posicao em aberto conforme formula:

```
Limite = max[(4 x P2) x Q; 4 x L2]
```

Onde P2 e L2 sao definidos por cliente ou grupo de clientes.

**Margem adicional por violacao:**
Caso o limite de concentracao seja violado, calcula-se margem adicional com base no valor teorico maximo de margem do instrumento e nas quantidades excedentes.

### 7.3 Margem e Garantias

**Requisitos gerais:**
- **100%** da margem definida pela B3 deve ser depositada
- Aporte de garantias em **D+1 ate 13h**, conforme estabelecido pela B3
- Modelo de margem com nivel de confianca minimo de **99%**

**Tipos de garantias aceitas:**
- Titulos publicos federais
- Acoes (com haircut)
- Ouro
- Certificados de Deposito Bancario (CDB)
- Fiancas bancarias
- Cartas de credito

### 7.4 Limites de Mensagens

A B3 estabelece limites de mensagens por segundo para evitar sobrecarga dos sistemas (quote stuffing). Embora os valores especificos sejam definidos em documentacao tecnica da B3 e possam variar por tipo de conexao e programa:

- Limites sao aplicados por sessao FIX
- Excesso de mensagens pode resultar em throttling ou desconexao
- Investidores HFT possuem limites diferenciados

---

## 8. Pessoa Fisica vs Pessoa Juridica

### 8.1 Tributacao

#### Pessoa Fisica (PF)
- **Swing trade:** Aliquota de **15%** sobre o lucro
  - Isencao para vendas ate **R$ 20.000/mes** em acoes
  - DARF com codigo **6015**
- **Day trade:** Aliquota de **20%** sobre o lucro (sem isencao)
  - Retencao na fonte de **1%** (imposto "dedo-duro")
  - Demais 19% via DARF ate o ultimo dia util do mes seguinte
- **Compensacao de prejuizos:** Day trade so compensa com day trade; swing trade so compensa com swing trade
- **Declaracao:** Obrigatoria no IRPF anual

#### Pessoa Juridica (PJ)
- **Codigo DARF:** 3317
- **Regime tributario:** Depende do enquadramento (Simples Nacional, Lucro Presumido ou Lucro Real)
- **Vantagens potenciais:**
  - Possibilidade de deduzir custos operacionais (infraestrutura, software, dados)
  - Compensacao de prejuizos mais flexivel
  - Planejamento tributario mais sofisticado

### 8.2 Estruturas Juridicas para Trading

#### Fundo de Investimento
- **Regulamentacao:** Resolucao CVM n. 175/2022 (Marco Regulatorio dos Fundos)
- **Estrutura:** Condominio especial (art. 1.368-C do Codigo Civil)
- **Vantagem:** Tributacao diferenciada (come-cotas), segregacao patrimonial
- **Requisito:** Administrador fiduciario e gestor registrados na CVM

#### Gestora de Recursos (Asset Management)
- **Regulamentacao:** Resolucao CVM n. 21/2021 (substituiu ICVM 558/2015)
- **Categorias de registro:**
  - Administrador Fiduciario
  - Gestor de Recursos
  - Administrador Fiduciario + Gestor de Recursos
- **Requisitos para registro:**
  - Diretor estatutario responsavel pelo cumprimento de regras e controles
  - Diretor estatutario responsavel pela gestao de risco (categoria Gestor)
  - Recursos humanos e computacionais adequados
  - Socios controladores com requisitos de idoneidade
  - Capital minimo conforme norma
  - Politica escrita de gestao de riscos
  - Prazo de analise pela CVM: **60 dias corridos**

#### SLW (Sociedade Limitada com atuacao no mercado)
- Alternativa para operacao proprietaria (prop trading)
- Registro como participante junto a corretora
- Menor complexidade regulatoria que fundo/gestora

### 8.3 Comparativo Regulatorio PF vs PJ

| Aspecto | Pessoa Fisica | Pessoa Juridica |
|---|---|---|
| Tributacao Day Trade | 20% s/ lucro | Variavel (regime tributario) |
| Tributacao Swing Trade | 15% s/ lucro | Variavel (regime tributario) |
| Isencao R$ 20k | Sim (swing trade acoes) | Nao |
| Deducao de custos | Limitada | Ampla |
| Compensacao prejuizos | Restrita (mesma modalidade) | Mais flexivel |
| Complexidade regulatoria | Baixa | Media a Alta |
| Custo de manutencao | Baixo | Medio a Alto |
| Escalabilidade | Limitada | Alta |
| Acesso a DMA 3/4 | Possivel, mas raro | Mais acessivel |

---

## 9. Sandbox Regulatorio

### 9.1 Conceito e Marco Legal

O sandbox regulatorio da CVM e um **ambiente experimental** onde participantes admitidos recebem autorizacoes temporarias e condicionadas para desenvolver inovacoes em atividades regulamentadas no mercado de capitais.

**Principal vantagem:** Possibilidade de receber **dispensas ou flexibilizacoes** nos requisitos regulatorios ordinariamente aplicaveis, o que pode ser crucial para viabilizar modelos de negocio inovadores que teriam dificuldade em superar barreiras regulatorias convencionais.

### 9.2 Primeira Edicao

Participantes admitidos na primeira edicao, com autorizacao para operar ate 2026:
- **Estar**
- **Vortx QR**
- **BEE4**

### 9.3 Segunda Edicao (2024)

A CVM planejou um segundo sandbox regulatorio para 2024, com foco especial em:
- Tokenizacao de ativos
- Novos modelos de distribuicao
- Inovacoes em infraestrutura de mercado

### 9.4 LAB - Laboratorio de Inovacao Financeira

Iniciativa conjunta da CVM e FENASBAC (Federacao Nacional de Associacoes dos Servidores do Banco Central):

- Aprimoramento de iniciativas de inovacao
- Grupos de trabalho (GTs) para estudar temas especificos
- 4. GT Lab estudou criacao de sandbox para fintechs de seguros e previdencia

### 9.5 LEAP - Laboratorio de Experimentacao, Aprendizado e Prototipagem (2025)

**Nova iniciativa lancada em 2025:**
- Coordenada pelo **NEXUS**, ecossistema de inovacao aberta da CVM e FENASBAC
- Hospedado no LAB (Laboratorio de Inovacao Financeira)
- **Ambiente gratuito** voltado ao desenvolvimento de solucoes tecnologicas
- Foco em projetos de inovacao em **estagio inicial**
- Criacao de **prototipos funcionais** relacionados a atividades reguladas pela CVM

**Implicacao para o Bot:** O sandbox regulatorio pode ser uma via para testar modelos inovadores de trading algoritmico com flexibilizacao regulatoria. Entretanto, o processo de admissao e competitivo e as autorizacoes sao temporarias.

---

## 10. Comparacao Internacional

### 10.1 MiFID II (Europa)

A **Markets in Financial Instruments Directive II** e a referencia global mais detalhada para regulamentacao de trading algoritmico:

**Definicao (Art. 4(1)(40)):** Trading algoritmico e definido como operacoes onde "algoritmos computacionais determinam automaticamente parametros individuais de ordens" com intervencao humana limitada.

**High-Frequency Trading (HFT) - Definicao:**
- Infraestrutura destinada a minimizar latencias de rede
- Facilidades para entrada algoritmica de ordens (colocation, proximity hosting, acesso eletronico direto de alta velocidade)
- Determinacao pelo sistema de iniciacao, geracao, roteamento ou execucao de ordens sem intervencao humana
- Altas taxas intradiarias de mensagens

**Obrigacoes mandatorias do Art. 17:**
1. Autorizacao como firma de investimento com notificacao a autoridade competente (NCA) **antes** de iniciar trading algoritmico
2. Testes rigorosos em ambientes de desenvolvimento, producao e testes de venues
3. Arranjos de continuidade de negocios para garantir operacao durante falhas
4. Controles **pre-trade e pos-trade** prevenindo ordens erroneas e negociacao desordenada
5. Conformidade com regime de tick size
6. Record keeping abrangente com trilhas de auditoria

**Requisitos de timestamp:**
- HFT: Granularidade de **microssegundos** sincronizada com UTC
- Outros algoritmos: Granularidade de **milissegundos** sincronizada com UTC

**Aplicacao extraterritorial:** MiFID II se aplica a **todas** as operacoes em venues europeus, independentemente da localizacao do trader.

**MiFID III/MiFIR Review (Marco 2024):**
- Emendas de Nivel 1 ao MiFIR e MiFID II entraram em vigor
- Supervisao regulatoria estendida a trading algoritmico e HFT
- Requisito de reportar mais detalhes sobre estrategias e fluxos de ordens

### 10.2 SEC / FINRA (Estados Unidos)

#### SEC Rule 15c3-5 (Market Access Rule)
- Adotada em 3 de novembro de 2010
- Exige que broker-dealers implementem **controles de gestao de risco** e procedimentos de supervisao
- Controles devem ser "razoavelmente desenhados" para limitar exposicao financeira

**Controles pre-trade obrigatorios:**
- **Price collars:** Prevencao de ordens com precos excessivamente distantes do mercado
- **Quantity limits:** Restricao de tamanho de ordens e posicoes cumulativas
- **Order rate throttling:** Limite de mensagens por periodo
- **Capital utilization limits:** Prevencao de alavancagem excessiva
- **Duplicate order prevention:** Sistemas anti-duplicacao
- **Restricted security validation:** Checagem de ativos restritos

**Kill switch:** Broker-dealers devem estabelecer paradas de ordens automaticas (kill switches) para algoritmos, clientes e a firma como um todo, acionadas por incidentes de credito, compliance e tecnologia.

**Sincronizacao de relogio:** Dentro de **50 milissegundos** do NIST atomic time (SEC Rule 613 - Consolidated Audit Trail).

#### FINRA
- **Rule 3110:** Obrigacoes de supervisao
- **Rule 4511:** Obrigacoes de manutencao de registros
- **Pattern Day Trader:** Saldo minimo de **US$ 25.000** para day traders com 4+ day trades em 5 dias uteis

#### Regulation SCI (Systems Compliance and Integrity)
- Manutencao de sistemas tecnologicos robustos
- Capacidade, integridade, resiliencia, disponibilidade e seguranca adequadas

### 10.3 Quadro Comparativo

| Aspecto | Brasil (CVM/B3) | Europa (MiFID II) | EUA (SEC/FINRA) |
|---|---|---|---|
| Definicao formal de algo trading | Implicita | Explicita (Art. 4) | Implicita |
| Registro de algoritmos | Via programa HFT da B3 | Obrigatorio com NCA | Via Market Access Rule |
| Controles pre-trade | Obrigatorios (corretora) | Obrigatorios (firma) | Obrigatorios (broker-dealer) |
| Kill switch | Recomendado | Obrigatorio | Obrigatorio |
| Testes obrigatorios | Nao especificado | Sim (multiplas fases) | Implicito na 15c3-5 |
| Timestamp | Nao especificado | Micro/milissegundos | 50ms NIST |
| Penalidade maxima | R$ 50 milhoes | Variavel por jurisdicao | Variavel (milhoes USD) |
| Spoofing | Crime (1-8 anos) | Proibido (MAR) | Crime (Dodd-Frank) |
| Sandbox | Sim (CVM) | Variavel por pais | Nao formalizado |

### 10.4 Lacunas da Regulamentacao Brasileira

Comparada a MiFID II e SEC, a regulamentacao brasileira apresenta lacunas em:

1. **Ausencia de definicao normativa explicita** de trading algoritmico
2. **Falta de requisitos detalhados de testes** antes da implantacao de algoritmos
3. **Ausencia de padrao de timestamp** mandatorio para ordens algoritmicas
4. **Kill switch nao formalmente mandatorio** (embora fortemente recomendado e praticado)
5. **Requisitos de record keeping para algoritmos** menos detalhados
6. **Ausencia de requisito de source code repository** ou versionamento mandatorio

Entretanto, a regulamentacao brasileira e **eficaz** na pratica devido a:
- Supervisao robusta da BSM (100% das operacoes)
- Controles de risco pre-negociacao implementados pelas corretoras
- Penalidades significativas (ate R$ 50 milhoes ou 3x vantagem ilicita)
- Programa HFT estruturado da B3

---

## 11. Implicacoes Praticas para o Bot

### 11.1 Requisitos Regulatorios Minimos

Para operar legalmente no Brasil, um bot de trading deve:

1. **Operar exclusivamente atraves de corretora autorizada** pela CVM (RCVM 35)
2. **Utilizar DMA apropriado** ao tipo de estrategia (DMA 1 para baixa frequencia; DMA 3/4 para HFT)
3. **Identificar-se adequadamente** junto a B3 (registro HFT se aplicavel)
4. **Respeitar limites de posicao, margem e mensagens** definidos pela B3
5. **Nao executar praticas de manipulacao** (spoofing, layering, wash trading)
6. **Manter registros** de todas as operacoes por no minimo 5 anos (PLD)
7. **Cumprir obrigacoes de KYC/AML** via corretora

### 11.2 Controles de Risco Obrigatorios no Bot

```
CONTROLES PRE-TRADE (OBRIGATORIOS):
[x] Limite maximo de posicao por ativo
[x] Limite maximo de perda diaria (loss limit)
[x] Limite de tamanho de ordem individual
[x] Verificacao de margem disponivel antes de cada ordem
[x] Price collar (rejeicao de ordens fora do tunel)
[x] Rate limiting (controle de frequencia de ordens)

CONTROLES DE SEGURANCA (FORTEMENTE RECOMENDADOS):
[x] Kill switch (interrupcao total imediata)
[x] Circuit breaker proprio (pausa em condicoes adversas)
[x] Cancel-on-disconnect (cancelar ordens se perder conexao)
[x] Monitoramento de P&L em tempo real
[x] Alertas automaticos para anomalias
[x] Log completo de todas as decisoes e ordens

CONTROLES POS-TRADE:
[x] Reconciliacao de posicoes
[x] Analise de execucao (slippage, market impact)
[x] Relatorio de compliance diario
[x] Arquivamento de logs por 5+ anos
```

### 11.3 Checklist de Compliance

**Antes do lancamento:**
- [ ] Validar que a corretora suporta acesso via API e DMA
- [ ] Assinar termos e contratos com a corretora
- [ ] Registrar algoritmo junto a B3 (se HFT)
- [ ] Implementar todos os controles pre-trade
- [ ] Testar em ambiente de homologacao da B3
- [ ] Documentar estrategia e parametros do algoritmo
- [ ] Validar conformidade com LGPD (dados processados)
- [ ] Definir politica de retencao de dados e logs

**Durante a operacao:**
- [ ] Monitorar limites de posicao e margem continuamente
- [ ] Gerar relatorios diarios de operacoes
- [ ] Manter logs de todas as ordens (enviadas, executadas, canceladas, rejeitadas)
- [ ] Monitorar alertas da BSM e comunicados da B3
- [ ] Recolher DARF de IR mensalmente (se lucro)
- [ ] Atualizar cadastro junto a corretora periodicamente

**Periodicamente:**
- [ ] Revisar e atualizar parametros do algoritmo
- [ ] Realizar backtesting com dados recentes
- [ ] Auditar conformidade regulatoria
- [ ] Atualizar documentacao de estrategia
- [ ] Verificar alteracoes normativas (CVM, B3)

### 11.4 Riscos Regulatorios Criticos

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Enquadramento como spoofing | Media | Critico | Nao cancelar ordens sistematicamente sem execucao |
| Violacao de limite de posicao | Media | Alto | Controle de posicao em tempo real |
| Falha em controle de risco | Baixa | Critico | Kill switch + circuit breaker proprio |
| Nao conformidade LGPD | Media | Alto | Auditoria de dados + DPO |
| Perda de conexao sem cancel | Baixa | Alto | Cancel-on-disconnect habilitado |
| Operacao em circuit breaker | Baixa | Medio | Deteccao automatica de interrupcao |

---

## 12. Referencias Bibliograficas

### Legislacao e Normas

1. **Lei n. 6.385/1976** - Dispoe sobre o mercado de valores mobiliarios e cria a CVM.
   - Tipo: Lei Federal
   - URL: https://www.planalto.gov.br/ccivil_03/leis/l6385.htm
   - Ano: 1976 (com alteracoes)

2. **Lei n. 13.506/2017** - Dispoe sobre o processo administrativo sancionador na esfera de atuacao do Bacen e da CVM.
   - Tipo: Lei Federal
   - URL: https://www.jusbrasil.com.br/doutrina/secao/1introducao-12-a-lei-n-13506-2017-e-os-desafios-na-transicao-para-a-nova-dosimetria-da-pena-estudo-dos-julgamentos-da-cvm-em-2021/2072381317
   - Ano: 2017

3. **Lei n. 13.709/2018 (LGPD)** - Lei Geral de Protecao de Dados Pessoais.
   - Tipo: Lei Federal
   - URL: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
   - Ano: 2018

4. **Lei n. 9.613/1998** - Dispoe sobre crimes de lavagem de dinheiro e cria o COAF.
   - Tipo: Lei Federal
   - Ano: 1998

5. **Resolucao CVM n. 35/2021** - Normas e procedimentos para intermediacao de valores mobiliarios.
   - Autor: CVM
   - Tipo: Resolucao
   - URL: https://conteudo.cvm.gov.br/legislacao/resolucoes/resol035.html
   - Ano: 2021

6. **Resolucao CVM n. 50/2021** - Prevencao a lavagem de dinheiro no mercado de capitais.
   - Autor: CVM
   - Tipo: Resolucao
   - URL: https://conteudo.cvm.gov.br/legislacao/resolucoes/resol050.html
   - Ano: 2021

7. **Resolucao CVM n. 135/2022** - Funcionamento dos mercados regulamentados de valores mobiliarios.
   - Autor: CVM
   - Tipo: Resolucao
   - URL: https://conteudo.cvm.gov.br/legislacao/resolucoes/resol135.html
   - Ano: 2022

8. **Resolucao CVM n. 21/2021** - Administracao profissional de carteiras de valores mobiliarios.
   - Autor: CVM
   - Tipo: Resolucao
   - URL: https://conteudo.cvm.gov.br/legislacao/resolucoes/resol021.html
   - Ano: 2021

9. **Instrucao CVM n. 8/1979** - Define e proibe praticas nao equitativas no mercado.
   - Autor: CVM
   - Tipo: Instrucao Normativa
   - URL: https://conteudo.cvm.gov.br/legislacao/instrucoes.html
   - Ano: 1979

### Documentos Institucionais e Guias

10. **Guia de Alertas BSM - Versao 2.0** - Melhores praticas para monitoramento de praticas abusivas.
    - Autor: BSM Supervisao de Mercados
    - Tipo: Guia tecnico
    - URL: https://www.bsmsupervisao.com.br/documents/d/guest/guia-de-alertas-2024
    - Ano: Setembro/2024

11. **Catalogo de Normas BSM - V. 1.5** - Compilacao das normas da BSM.
    - Autor: BSM Supervisao de Mercados
    - Tipo: Catalogo normativo
    - URL: https://www.bsmsupervisao.com.br/documents/d/guest/catalogo-de-normas-bsm-2024
    - Ano: Julho/2024

12. **Manual de Administracao de Risco da Camara B3** - Regras de margem, garantias e limites.
    - Autor: B3
    - Tipo: Manual tecnico
    - URL: https://www.b3.com.br/data/files/49/26/69/20/ED41E810066AFDD8AC094EA8/Manual%20de%20Administracao%20de%20Risco%20da%20Camara%20B3.pdf
    - Ano: 2024

13. **Politica Comercial de Programa HFT** - Tarifas e requisitos para investidores HFT.
    - Autor: B3
    - Tipo: Politica comercial
    - URL: https://www.b3.com.br/pt_br/produtos-e-servicos/tarifas/listados-a-vista-e-derivativos/programas-de-incentivo/tarifas-de-programa-hft/
    - Ano: 2023 (vigente)

### Artigos e Analises

14. **Controles internos e Compliance: Manipulacao de mercado (Spoofing, Layering, Churning, Front Running)** - Analise detalhada de praticas abusivas.
    - Autor: IPLD (Instituto de Prevencao a Lavagem de Dinheiro)
    - Tipo: Artigo tecnico
    - URL: https://ipld.com.br/artigos/controles-internos-e-compliance-manipulacao-de-mercado-em-caso-de-spoofing-layering-churning-front-running/
    - Ano: 2024

15. **Regulatory Compliance When Operating Trading Algorithms** - Guia abrangente de compliance para trading algoritmico.
    - Autor: Breaking Alpha Insights
    - Tipo: Artigo tecnico (ingles)
    - URL: https://breakingalpha.io/insights/regulatory-compliance-trading-algorithms
    - Ano: 2024

16. **MiFID II - Article 17: Algorithmic Trading** - Texto do artigo 17 da MiFID II com comentarios.
    - Autor: ESMA (European Securities and Markets Authority)
    - Tipo: Regulamentacao
    - URL: https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-17-algorithmic-trading
    - Ano: 2018 (com atualizacoes 2024)

17. **SEC Rule 15c3-5 Small Entity Compliance Guide** - Guia de conformidade para a Market Access Rule.
    - Autor: SEC (Securities and Exchange Commission)
    - Tipo: Guia regulatorio
    - URL: https://www.sec.gov/files/rules/final/2010/34-63241-secg.htm
    - Ano: 2010

18. **Market Access Rule - FINRA Examination and Risk Monitoring Program** - Orientacoes sobre controles de acesso ao mercado.
    - Autor: FINRA
    - Tipo: Guia regulatorio
    - URL: https://www.finra.org/rules-guidance/guidance/reports/2022-finras-examination-and-risk-monitoring-program/market-access-rule
    - Ano: 2022

19. **O Spoofing no Mercado de Capitais Brasileiro: Uma Perspectiva de Direito e Economia**
    - Tipo: Artigo academico
    - URL: https://www.redalyc.org/journal/6338/633875004005/html/
    - Ano: 2023

20. **CVM condena e aplica multas a acusados de manipulacao de precos e spoofing** - Decisao da CVM em caso de spoofing.
    - Autor: CVM
    - Tipo: Noticia institucional
    - URL: https://www.gov.br/cvm/pt-br/assuntos/noticias/2023/cvm-condena-e-aplica-multas-a-acusados-de-manipulacao-de-precos-spoofing-e-irregularidades-informacionais-ao-mercado
    - Ano: 2023

### Fontes sobre Sandbox e Inovacao

21. **Sandbox Regulatorio - CVM** - Pagina oficial do sandbox.
    - Autor: CVM
    - Tipo: Pagina institucional
    - URL: https://conteudo.cvm.gov.br/legislacao/sandbox_regulatorio.html
    - Ano: 2024

22. **LEAP - Laboratorio de Experimentacao, Aprendizado e Prototipagem**
    - Autor: CVM / FENASBAC
    - Tipo: Programa institucional
    - URL: http://labinovacaofinanceira.com/fintech/
    - Ano: 2025

### Fontes sobre Tributacao e Estruturas

23. **Tributacao no Mercado Financeiro e de Capitais** - Guia oficial da B3.
    - Autor: B3
    - Tipo: Documento tecnico
    - URL: https://atendimento.b3.com.br/sys_attachment.do?sys_id=9f2f5d101b312d106b982fc13b4bcb67
    - Ano: 2024

24. **Bolsa de Valores - Receita Federal** - Orientacoes oficiais para tributacao em renda variavel.
    - Autor: Receita Federal do Brasil
    - Tipo: Pagina institucional
    - URL: https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1
    - Ano: 2025

### Fontes sobre LGPD e Dados Financeiros

25. **KYC e KYP e Protecao de Dados: Desafios a partir da LGPD**
    - Autor: Consultoria em Compliance
    - Tipo: Artigo tecnico
    - URL: https://www.consultoriaemcompliance.com/post/kyc-kyp-e-protecao-de-dados
    - Ano: 2024

26. **KYC/PLD Compliance in Brazil: Regulatory Framework and How to Comply**
    - Autor: Tecalis
    - Tipo: Artigo tecnico (ingles)
    - URL: https://www.tecalis.com/blog/kyc-brazil-pld-regulatory-framework-aml-coaf-cpf
    - Ano: 2024

---

## Glossario

| Sigla | Significado |
|---|---|
| ABR | Abordagem Baseada em Risco |
| ADV | Average Daily Volume (Volume Medio Diario) |
| AML | Anti-Money Laundering |
| ANBIMA | Associacao Brasileira das Entidades dos Mercados Financeiro e de Capitais |
| B3 | Brasil, Bolsa, Balcao |
| Bacen/BCB | Banco Central do Brasil |
| BSM | B3 Supervisao de Mercados |
| COAF | Conselho de Controle de Atividades Financeiras |
| COPOM | Comite de Politica Monetaria |
| CVM | Comissao de Valores Mobiliarios |
| DARF | Documento de Arrecadacao de Receitas Federais |
| DMA | Direct Market Access |
| DPO | Data Protection Officer (Encarregado de Protecao de Dados) |
| ESMA | European Securities and Markets Authority |
| FINRA | Financial Industry Regulatory Authority |
| FIX | Financial Information eXchange (protocolo) |
| HFT | High-Frequency Trading |
| ICVM | Instrucao da Comissao de Valores Mobiliarios |
| KYC | Know Your Customer |
| KYE | Know Your Employee |
| KYP | Know Your Partner |
| LGPD | Lei Geral de Protecao de Dados Pessoais |
| MiFID | Markets in Financial Instruments Directive |
| MRP | Mecanismo de Ressarcimento de Prejuizos |
| NCA | National Competent Authority |
| PAD | Processo Administrativo Disciplinar |
| PAS | Processo Administrativo Sancionador |
| PL | Participante de Liquidacao |
| PLD/FTP | Prevencao a Lavagem de Dinheiro e Financiamento do Terrorismo |
| PN | Participante de Negociacao |
| PNP | Participante de Negociacao Pleno |
| RCVM | Resolucao da Comissao de Valores Mobiliarios |
| SEC | Securities and Exchange Commission |
| SELIC | Sistema Especial de Liquidacao e de Custodia |
| SISCOAF | Sistema de Informacoes do COAF |
| TCA | Transaction Cost Analysis |
| VWAP | Volume-Weighted Average Price |
| WORM | Write-Once-Read-Many |

---

**Nota:** Este documento tem carater informativo e de pesquisa academica. Nao constitui aconselhamento juridico. Para decisoes regulatorias especificas, consulte advogados especializados em mercado de capitais e as fontes primarias das normas citadas. A regulamentacao e dinamica e sujeita a alteracoes -- recomenda-se monitoramento continuo dos sites da CVM (gov.br/cvm), B3 (b3.com.br) e BSM (bsmsupervisao.com.br).
