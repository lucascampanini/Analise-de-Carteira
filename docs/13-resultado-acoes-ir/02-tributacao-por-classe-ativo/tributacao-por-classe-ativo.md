# Tributação por Classe de Ativo — Renda Variável além de Ações à Vista

> Pesquisa completa para expansão do módulo de IR do CRM de assessores XP.  
> Contexto: Next.js 14 + Firebase Firestore, parser de notas Sinacor, cálculo mensal de DARF.  
> **Data:** Maio 2026  
> **Fontes:** 20+ referências (RFB, XP, InfoMoney, Suno, B3, NuInvest)

---

## Sumário

1. [Contexto e Escopo](#1-contexto-e-escopo)
2. [FIIs — Fundos de Investimento Imobiliário](#2-fiis--fundos-de-investimento-imobiliário)
3. [ETFs — Exchange-Traded Funds](#3-etfs--exchange-traded-funds)
4. [BDRs — Brazilian Depositary Receipts](#4-bdrs--brazilian-depositary-receipts)
5. [Opções (Calls e Puts)](#5-opções-calls-e-puts)
6. [Contratos Futuros](#6-contratos-futuros)
7. [Regras de Compensação de Prejuízos entre Classes](#7-regras-de-compensação-de-prejuízos-entre-classes)
8. [Identificação de Classe pelo Ticker — Padrão B3 e SINACOR](#8-identificação-de-classe-pelo-ticker--padrão-b3-e-sinacor)
9. [Impacto no Modelo de Dados Firestore](#9-impacto-no-modelo-de-dados-firestore)
10. [Código TypeScript — Classificador de Ativos](#10-código-typescript--classificador-de-ativos)
11. [Tabela Consolidada — Todas as Classes](#11-tabela-consolidada--todas-as-classes)
12. [Referências](#12-referências)

---

## 1. Contexto e Escopo

### 1.1 Problema

O modelo atual do CRM cobre apenas **ações à vista** com as seguintes regras:

| Operação | Alíquota | Isenção |
|----------|----------|---------|
| Swing Trade (ação PF) | 15% | Sim, se vendas ≤ R$ 20.000/mês |
| Day Trade (ação) | 20% | Não |

Essa cobertura é **incompleta**. Um assessor XP típico tem clientes com posições em FIIs, ETFs, BDRs, opções e eventualmente futuros — todos com regras distintas de alíquota, isenção, IRRF e código DARF.

### 1.2 Base Legal

- **Lei 11.033/2004**: isenção de rendimentos de FIIs, regras de renda variável
- **Lei 11.312/2006**: regras de ETFs
- **Lei 14.286/2021 e IN RFB 2.180/2024**: BDRs
- **IN RFB 1.585/2015**: regras detalhadas de mercado de capitais (opções, futuros, fundos)
- **Decreto-Lei 1.598/1977 e RIR/2018**: custo médio ponderado, ganho de capital
- **Lei 15.270/2025**: novas regras FIIs/Fiagros (vigentes em 2026)

### 1.3 O que NÃO mudou com a Reforma Tributária (2026)

A Lei 15.270/2025 (Reforma do IR) introduziu tributação adicional sobre rendas altas (acima de R$ 50.000/mês), mas **não alterou** as alíquotas de renda variável para a grande maioria dos investidores PF. As regras descritas neste documento refletem o regime vigente em **maio de 2026** para contribuintes não sujeitos ao imposto mínimo adicional.

---

## 2. FIIs — Fundos de Investimento Imobiliário

### 2.1 Natureza do Ativo

FIIs são fundos de investimento com cotas negociadas em bolsa (B3). Distribuem rendimentos mensais (provenientes de aluguéis, juros de CRI/CRA, ganhos de capital internos ao fundo) e podem ter valorização/desvalorização das cotas.

Para o assessor/investidor PF existem **dois eventos tributáveis distintos**:

| Evento | Tributação |
|--------|-----------|
| Rendimentos distribuídos (dividendos) | **Isento** (com condições) |
| Ganho de capital na venda de cotas | **20%** (sem isenção) |

### 2.2 Rendimentos Distribuídos — Isenção para PF

#### 2.2.1 Regra Geral (Lei 11.033/2004, Art. 3º, III)

Os rendimentos distribuídos por FIIs são **isentos de IR para PF** desde que atendidas **cumulativamente** as seguintes condições:

1. O fundo tem **mais de 100 cotistas** (alterado pela Lei 15.270/2025; antes eram 50)
2. As cotas são negociadas **exclusivamente em bolsa de valores ou mercado de balcão organizado**
3. O cotista PF detém **menos de 10% das cotas** do fundo

> **Atenção prática:** A esmagadora maioria dos FIIs listados na B3 (HGLG11, KNRI11, MXRF11 etc.) cumpre essas condições. O assessor deve alertar clientes que detêm participação relevante em FIIs menores.

#### 2.2.2 O que NÃO é isento

- Rendimentos de FIIs que **não atendam** às condições acima → tributados pela tabela progressiva (7,5% a 27,5%)
- Rendimentos de fundos **fechados** sem negociação em bolsa

#### 2.2.3 Onde declarar na DIRPF

Rendimentos isentos vão para a ficha **"Rendimentos Isentos e Não Tributáveis"**, linha 26 ("Outros"). Devem ser declarados mesmo sendo isentos.

### 2.3 Ganho de Capital na Venda de Cotas

| Item | Regra |
|------|-------|
| Alíquota | **20%** (flat, não há tabela progressiva) |
| Isenção R$ 20.000/mês | **Não se aplica** |
| Day Trade em FII | **20%** (mesmo percentual, sem distinção) |
| Base de cálculo | Preço de venda − custo médio ponderado (PM) − custos operacionais |
| Código DARF | **6015** |
| Prazo pagamento | Último dia útil do mês seguinte à venda |
| IRRF "dedo-duro" | **0,005%** sobre o valor da venda (operação comum) |
| IRRF Day Trade | **1%** sobre o ganho do dia |

> **Por que 20% e não 15%?** O ganho de capital em FII é tratado como "renda variável especial", seguindo as mesmas regras de day trade de ações. Não é possível aplicar a alíquota de 15% de swing trade de ações — a lei é expressa.

### 2.4 Preço Médio de FII

O custo médio ponderado (PM) de cotas de FII segue **as mesmas regras de ações**:

```
PM_novo = (PM_antigo × qtd_anterior + preço_compra × qtd_nova + custos) / (qtd_anterior + qtd_nova)
```

- Emolumentos e taxas de corretagem **integram o custo de aquisição**
- Bonificações de cotas alteram o PM (novo PM = custo total / nova quantidade)
- Grupamentos e desdobramentos ajustam PM proporcionalmente

### 2.5 Compensação de Prejuízos em FII

- Prejuízo em FII **só compensa lucro em FII** (e Fiagro, que segue as mesmas regras)
- **Não** compensa lucros em ações, ETFs ou qualquer outra classe
- Não há prazo de prescrição: o prejuízo acumulado pode ser carregado indefinidamente

### 2.6 Identificação na Nota SINACOR

Na nota de corretagem SINACOR, FIIs aparecem com:

- **Campo "Especificação do Título"**: nome do fundo (ex: `CI HGLG11`, `CI KNRI11`)
- **Campo "Tipo Mercado"**: `VISTA` (cotas de FII são negociadas como ações à vista)
- **Ticker**: sempre 4 letras + sufixo **11** (ex: HGLG11, MXRF11, XPLG11)
- **Prefixo "CI"**: "Cota de Fundo de Investimento" — identificador na descrição do título

> **Atenção:** ETFs também terminam em 11 e também aparecem como "VISTA". A distinção programática exige consulta a uma lista de referência (ver Seção 8).

### 2.7 Fiagros — Fundos de Investimento nas Cadeias Agroindustriais

Fiagros seguem **exatamente as mesmas regras de FIIs** (Lei 14.130/2021, confirmado pela Lei 15.270/2025):

- Rendimentos isentos (mesmas condições)
- Ganho de capital: 20%
- Prejuízo de Fiagro compensa FII e vice-versa
- Tickers terminam em 11 (ex: HCTR11 tem natureza de Fiagro-CRI)

---

## 3. ETFs — Exchange-Traded Funds

### 3.1 Tipos de ETF no Brasil

Existem duas categorias principais com tributações **completamente distintas**:

| Categoria | Exemplos | Tributação |
|-----------|----------|------------|
| ETF de Renda Variável | BOVA11, SMAL11, IVVB11, DIVO11 | 15% ST / 20% DT, sem isenção |
| ETF de Renda Fixa | IRFM11, IMA-B11, FIXA11 | Tabela regressiva (como fundo de RF) |

### 3.2 ETFs de Renda Variável

#### 3.2.1 Regras Principais

| Item | Regra |
|------|-------|
| Alíquota Swing Trade | **15%** |
| Alíquota Day Trade | **20%** |
| Isenção R$ 20.000/mês | **Não se aplica** |
| IRRF "dedo-duro" | **0,005%** sobre valor de venda (ST) |
| IRRF Day Trade | **1%** sobre ganho |
| Código DARF | **6015** |
| Prazo pagamento | Último dia útil do mês seguinte |

#### 3.2.2 Base de Cálculo

```
Ganho líquido = Preço venda × qtd − (PM × qtd) − emolumentos − corretagem
```

O PM de ETFs segue **custo médio ponderado**, igual a ações e FIIs.

#### 3.2.3 Dividendos de ETFs de RV

ETFs de renda variável **não distribuem dividendos** da mesma forma que ações — os proventos recebidos dos ativos da carteira são **reinvestidos automaticamente** no patrimônio do fundo, sendo incorporados ao PM das cotas. Portanto:

- Não há evento tributável na distribuição de proventos (não há distribuição)
- O impacto tributário só ocorre na venda das cotas

> **Exceção (2025+):** A B3 autorizou ETFs de FIIs com distribuição de dividendos (ex: XFII11). Esses ativos têm regime híbrido — verificar tratamento específico.

### 3.3 ETFs de Renda Fixa

#### 3.3.1 Regras Principais

Os ETFs de renda fixa replicam índices de títulos públicos (IMA-B, IRF-M, IDA) ou privados. São tributados **como fundos de renda fixa**, não como renda variável:

| Item | Regra |
|------|-------|
| Tributação | Tabela regressiva conforme prazo médio da carteira (PMRC) |
| IRRF | Retido na fonte no momento do resgate/venda |
| Come-cotas | Pode haver antecipação semestral (maio e novembro) |
| DARF manual | **Não necessário** — IR já retido na fonte |
| Código | IR retido automaticamente pela corretora |

#### 3.3.2 Tabela Regressiva — ETF de RF

A alíquota depende do **Prazo Médio de Repactuação da Carteira (PMRC)**:

| PMRC do ETF | Alíquota |
|-------------|----------|
| Até 180 dias | **25%** |
| 181 a 720 dias | **20%** |
| Acima de 720 dias | **15%** |

> **Exemplo prático:** IRFM11 (IMA-B 5) tem PMRC longo → alíquota de 15%. O investidor não precisa gerar DARF; a corretora retém automaticamente.

#### 3.3.3 Identificação de ETF de RF vs RV

Não há distinção pelo ticker. É necessário consultar a categoria do fundo:

- ETFs de RF têm "Renda Fixa" na categoria no site da B3
- Lista de ETFs de RF: IRFM11, IMA-B11, FIXA11, IMAB11, DEBB11

### 3.4 Compensação de Prejuízos em ETF de RV

- Prejuízo em ETF de RV **pode compensar lucro em ações** (mesma alíquota 15%)
- Prejuízo em ETF de RV (ST) **não compensa** lucro em Day Trade
- Prejuízo em ETF de RV **não compensa** lucro em FII (alíquotas diferentes)

### 3.5 Identificação na Nota SINACOR

- **Campo "Tipo Mercado"**: `VISTA` (igual a ações e FIIs)
- **Campo "Especificação"**: nome do ETF (ex: `CI BOVA11`, `BOVA11 ETF`)
- **Ticker**: 4 letras + sufixo **11** (BOVA11, SMAL11, IVVB11)
- A nota **não distingue** ETF de FII automaticamente — necessária lista de referência

---

## 4. BDRs — Brazilian Depositary Receipts

### 4.1 O que são BDRs

BDRs são certificados negociados na B3 que representam ações de empresas estrangeiras. Permitem ao investidor brasileiro ter exposição a Apple (AAPL34), Amazon (AMZO34), Microsoft (MSFT34) sem abrir conta no exterior.

### 4.2 Tipos e Sufixos

| Tipo | Sufixo | Exemplos |
|------|--------|----------|
| Não Patrocinado (Nível I) | **34** | AAPL34, AMZO34, TSLA34 |
| Não Patrocinado (Nível I) alternativo | **35** | GOGL35, MELI35 |
| Patrocinado Nível II | **32** | — |
| Patrocinado Nível III | **33** | — |
| ETF BDR | **39** | IVVB11 é tecnicamente ETF, não BDR |

> **Nota:** Os sufixos 32 e 33 são raros no mercado atual. A grande maioria dos BDRs acessíveis ao investidor PF termina em **34**.

### 4.3 Tributação na Venda de BDRs

| Item | Regra |
|------|-------|
| Alíquota Swing Trade | **15%** |
| Alíquota Day Trade | **20%** |
| Isenção R$ 20.000/mês | **Não se aplica** |
| IRRF "dedo-duro" (ST) | **0,005%** sobre valor de venda |
| IRRF Day Trade | **1%** sobre ganho |
| Código DARF | **6015** |
| Prazo pagamento | Último dia útil do mês seguinte |
| Base de cálculo | PM em BRL (cotado em R$) |

> **Atenção (desmistificação):** As alíquotas de 15% a 22,5% citadas em algumas fontes referem-se ao **ganho de capital no exterior** (ações compradas diretamente em corretora estrangeira, declaradas via GCAP). BDRs negociados na B3 por PF brasileiro **seguem as mesmas regras de ações brasileiras** (15% ST / 20% DT, sem a isenção de R$ 20k).

### 4.4 Dividendos de BDRs

Este é o ponto mais complexo e distinto das ações nacionais:

| Situação | Tributação |
|----------|-----------|
| Dividendos de BDR recebidos por PF | **Tabela progressiva** (7,5% a 27,5%) |
| Dividendos de ações brasileiras | **Isentos** para PF |

Os dividendos de BDRs são tratados como **rendimentos do trabalho/exterior**, não como dividendos nacionais. A corretora deposita o valor líquido após retenção do imposto no país de origem (ex: 15% de withholding tax nos EUA para dividendos americanos). O investidor brasileiro deve ainda complementar o imposto conforme a tabela progressiva brasileira.

**Fluxo de tributação de dividendos BDR:**

```
Dividendo bruto (USD) 
  → Conversão para BRL (PTAX do dia)
  → Desconto imposto retido no exterior (ex: 15% nos EUA)
  → Declarar como "Rendimentos Recebidos de Fontes no Exterior"
  → Aplicar tabela progressiva brasileira
  → Compensar imposto retido no exterior (para evitar bitributação)
```

### 4.5 Preço Médio de BDR

- PM é calculado em **BRL** (os BDRs são cotados em reais na B3)
- Variação cambial do ativo objeto (ação estrangeira) **não gera evento tributável separado** — está embutida na variação de preço do BDR em R$
- PM segue custo médio ponderado idêntico a ações

### 4.6 Compensação de Prejuízos em BDR

- Prejuízo em BDR (ST) **pode compensar lucro em ações** (mesma alíquota 15%)
- Prejuízo em BDR (ST) **pode compensar lucro em ETF de RV** (mesma alíquota 15%)
- Prejuízo em BDR **não compensa** FII (alíquotas diferentes)

### 4.7 Identificação na Nota SINACOR

- **Campo "Tipo Mercado"**: `VISTA`
- **Campo "Especificação"**: nome da empresa + `DRN` (ex: `APPLE INC DRN`, `AMAZON.COM DRN`)
- **Ticker**: 4 letras + sufixo **34** (majoritário)
- O sufixo numérico e a sigla `DRN` na especificação são os identificadores mais confiáveis

---

## 5. Opções (Calls e Puts)

### 5.1 Natureza e Funcionamento

O mercado de opções envolve contratos que dão ao comprador o **direito** (não obrigação) de comprar (call) ou vender (put) um ativo objeto a um preço pré-determinado (strike) até uma data de vencimento. O vendedor (lançador) assume a **obrigação** em troca do prêmio.

Existem quatro posições possíveis:

| Posição | Quem é | O que paga/recebe |
|---------|--------|------------------|
| Comprador de call (titular) | Compra direito de comprar | Paga prêmio |
| Vendedor de call (lançador) | Obrigado a vender se exercido | Recebe prêmio |
| Comprador de put (titular) | Compra direito de vender | Paga prêmio |
| Vendedor de put (lançador) | Obrigado a comprar se exercido | Recebe prêmio |

### 5.2 Alíquotas e Isenção

| Operação | Alíquota | Isenção R$ 20k |
|----------|----------|----------------|
| Swing Trade (opções) | **15%** | **Não se aplica** |
| Day Trade (opções) | **20%** | **Não se aplica** |

> **Isenção de R$ 20k**: A isenção é exclusiva de **ações à vista negociadas no mercado à vista** por PF. Opções são derivativos — **excluídos expressamente** da isenção, independentemente do volume mensal.

### 5.3 IRRF em Opções

| Momento | Alíquota IRRF |
|---------|--------------|
| Negociação de opções (compra ou venda do prêmio) | **0,005%** sobre o resultado positivo líquido de prêmios no mês |
| Day trade em opções | **1%** sobre o ganho do dia |

O IRRF de 0,005% incide sobre a **soma algébrica dos prêmios pagos e recebidos no mês**, quando positiva. Aparece discriminado na nota de corretagem.

### 5.4 Cenários Tributários Detalhados

#### 5.4.1 Opção Não Exercida ("Vira Pó")

| Lado | Tratamento IR |
|------|--------------|
| Titular (pagou prêmio) | Prêmio pago = **custo/prejuízo** no mês do vencimento |
| Lançador (recebeu prêmio) | Prêmio recebido = **ganho líquido** no mês do vencimento |

**Exemplo:**
- Investidor comprou PETR4L300 por R$ 0,50 (100 opções = R$ 50,00)
- Opção vence sem valor → prejuízo de R$ 50,00 no mês do vencimento
- Esse prejuízo pode compensar ganhos de ações ou outros derivativos (ST)

#### 5.4.2 Exercício de Call (Opção de Compra)

**Para o titular (comprador da call):**

```
Custo de aquisição da ação = Strike exercido + Prêmio pago + custos
```

- O prêmio **não é lucro nem prejuízo** no exercício — integra o PM das ações adquiridas
- Resultado tributável só ocorre na venda posterior das ações

**Para o lançador (vendedor da call):**

```
Ganho líquido = Preço de exercício + Prêmio recebido − PM da ação entregue
```

- Se foi **lançamento coberto** (tinha as ações): PM da ação é o custo médio ponderado calculado normalmente
- Se foi **lançamento descoberto** (não tinha as ações): compra as ações no mercado para entregar

#### 5.4.3 Exercício de Put (Opção de Venda)

**Para o titular (comprador da put):**

```
Resultado = Preço de venda das ações (strike) − PM das ações − Prêmio pago da put
```

O prêmio pago **reduz o ganho de capital** na venda das ações.

**Para o lançador (vendedor da put):**

```
PM das ações adquiridas = Strike − Prêmio recebido
```

O prêmio recebido **reduz o custo das ações** que o lançador é obrigado a comprar.

#### 5.4.4 Encerramento Antecipado (Reversão)

- Titular que vende a opção antes do vencimento: resultado = prêmio recebido − prêmio pago
- Lançador que compra de volta a opção: resultado = prêmio recebido − prêmio pago para encerrar

O resultado é apurado **no mês da reversão** e entra na base de cálculo do IR.

#### 5.4.5 Lançamento Coberto — Estratégia Mais Comum

O lançamento coberto (financiamento) consiste em:
1. Ter ações em carteira
2. Lançar call sobre essas ações para receber prêmio

| Cenário | Resultado |
|---------|-----------|
| Opção vira pó | Prêmio recebido = ganho líquido tributado em 15% |
| Opção exercida | Ganho = Strike + Prêmio − PM ações; tributado em 15% (ST) |

**Exemplo numérico:**
```
Comprou PETR4 ao PM de R$ 35,00 (1.000 ações)
Lançou PETR4L380 recebendo R$ 1,50/ação (R$ 1.500 de prêmio)
Strike = R$ 38,00

Cenário A — Vira pó (PETR4 < R$ 38,00 no vencimento):
  Ganho = R$ 1.500 (prêmio) → IR: R$ 1.500 × 15% = R$ 225

Cenário B — Exercida (PETR4 > R$ 38,00):
  Ganho = (R$ 38,00 + R$ 1,50 − R$ 35,00) × 1.000 = R$ 4.500
  IR: R$ 4.500 × 15% = R$ 675
```

### 5.5 Código DARF e Prazo

| Item | Valor |
|------|-------|
| Código DARF | **6015** |
| Prazo | Último dia útil do mês seguinte |
| Apuração | Mensal (soma todos os ganhos e perdas do mês) |

### 5.6 Identificação na Nota SINACOR

- **Campo "Tipo Mercado"**: `OPCAO DE COMPRA` ou `OPCAO DE VENDA`
- **Campo "Especificação"**: nome do ativo objeto + código da opção (ex: `PETR4 OPCAO L380`)
- **Ticker de opção**: estrutura `XXXX` + letra do mês + número do strike

**Decodificação do ticker de opção:**

```
PETR4 L 300
│     │ └── Strike (aproximado): R$ 30,00
│     └──── Tipo e Vencimento:
│            A-L = Call (A=jan, B=fev, C=mar, D=abr, E=mai, F=jun,
│                        G=jul, H=ago, I=set, J=out, K=nov, L=dez)
│            M-X = Put  (M=jan, N=fev, O=mar, P=abr, Q=mai, R=jun,
│                        S=jul, T=ago, U=set, V=out, W=nov, X=dez)
└────────── Ativo objeto: PETR4
```

> **Atenção:** O número no ticker é o strike **aproximado**. Após pagamento de dividendos, o strike pode sofrer ajuste e o número no código pode não refletir o strike exato. A nota de corretagem contém o preço de exercício real.

---

## 6. Contratos Futuros

### 6.1 Mercados Futuros na B3

Principais contratos operados por investidores PF:

| Contrato | Ticker | Ativo Objeto | Tamanho |
|----------|--------|-------------|---------|
| Futuro de Ibovespa | IND | Ibovespa | R$ 1,00 × pontos |
| Mini Ibovespa | WIN | Ibovespa | R$ 0,20 × pontos |
| Futuro de Dólar | DOL | USD/BRL | USD 50.000 |
| Mini Dólar | WDO | USD/BRL | USD 10.000 |
| Futuro de DI | DI1 | Taxa de juros | R$ 100.000 |
| Futuro de Boi Gordo | BGI | Boi gordo | 330 arrobas |
| Futuro de Café | ICF | Café arábica | 100 sacas |
| Futuro de Milho | CCM | Milho | 450 sacas |

### 6.2 Mecanismo de Ajuste Diário

O mercado futuro **não tem preço de entrada e saída** da mesma forma que ações. O resultado é liquidado **diariamente** via ajuste diário:

```
Ajuste do dia = (Preço ajuste hoje − Preço ajuste ontem) × Qtd contratos × Multiplicador

Resultado positivo → crédito na conta do investidor
Resultado negativo → débito na conta do investidor
```

O IR incide sobre o **resultado positivo acumulado dos ajustes diários** no período, não sobre cada ajuste individualmente.

### 6.3 Tributação — Regras Específicas

#### 6.3.1 Alíquotas

| Tipo de Operação | Alíquota |
|-----------------|----------|
| Swing Trade (posição overnight) | **15%** |
| Day Trade (encerrado no mesmo dia) | **20%** |
| Hedger (operações de hedge documentadas) | **15%** (mesmo se DT) |

> **Hedger vs Especulador:** A distinção existe na legislação (IN RFB 1.585/2015, Art. 63), mas na prática é raramente aplicada para PF. Para ser reconhecido como hedger, o investidor deve demonstrar que a operação protege posição existente em ativo relacionado. A imensa maioria dos traders PF é classificada como especulador.

#### 6.3.2 Isenção

**Não há isenção de R$ 20.000/mês** para futuros. Todo ganho positivo é tributado.

#### 6.3.3 IRRF em Futuros

| Momento | Alíquota IRRF |
|---------|--------------|
| Encerramento/vencimento da posição (ST) | **0,005%** sobre a soma algébrica positiva dos ajustes diários |
| Day Trade em futuros | **1%** sobre o ganho do dia |

O IRRF de 0,005% é calculado sobre o **resultado líquido acumulado** dos ajustes, não sobre cada ajuste diário.

### 6.4 Base de Cálculo

```
Resultado tributável = Soma dos ajustes diários positivos + Prêmios de opções sobre futuros
                     − Custos (corretagem, emolumentos, taxas BM&F)
```

O resultado pode ser **positivo ou negativo** mês a mês. Resultados negativos (prejuízo) podem ser compensados em meses futuros.

### 6.5 Documentação — Notas de Ajuste vs Notas de Corretagem

Para contratos futuros, o investidor recebe **dois tipos de documentos**:

| Documento | Conteúdo |
|-----------|----------|
| **Nota de Corretagem (BM&F)** | Registro das operações de abertura/encerramento, com IRRF retido |
| **Extrato de Ajuste Diário** | Créditos e débitos diários de ajuste (não é nota de corretagem) |

> **Para o IR:** O que importa é a **nota de corretagem BM&F** (não o extrato de ajuste diário). A nota contém o IRRF retido e o resultado da operação para fins fiscais.

A nota BM&F tem formato diferente da nota Bovespa — inclui campos como "Resultado do Ajuste" em vez de "Negócios Realizados".

### 6.6 Código DARF e Prazo

| Item | Valor |
|------|-------|
| Código DARF | **6015** |
| Prazo | Último dia útil do mês seguinte |
| Apuração | Mensal |

### 6.7 Identificação na Nota SINACOR (BM&F)

- As notas de contratos futuros são do segmento **BM&F** (mercados de derivativos), distintas das notas Bovespa
- **Campo "Mercado"**: `FUTURO`
- **Campo "Especificação"**: código do contrato + vencimento (ex: `WINK26` = WIN vencimento maio/2026)

**Decodificação do ticker de futuro:**

```
WIN K 26
│   │ └── Ano: 2026
│   └──── Mês de vencimento:
│          F=jan, G=fev, H=mar, J=abr, K=mai, M=jun,
│          N=jul, Q=ago, U=set, V=out, X=nov, Z=dez
└────── Contrato: WIN (Mini Ibovespa)
```

---

## 7. Regras de Compensação de Prejuízos entre Classes

### 7.1 Mapa de Compensações Permitidas

A Receita Federal exige segregação rigorosa. O diagrama abaixo mostra o que compensa o quê:

```
GRUPO A (alíquota 15% — Swing Trade)
┌─────────────────────────────────────────────────┐
│  Ações à vista (ST)                             │
│  ETFs de RV (ST)                                │◄──► Podem compensar entre si
│  BDRs (ST)                                      │
│  Opções (ST)                                    │
│  Futuros (ST, especulador)                      │
└─────────────────────────────────────────────────┘

GRUPO B (alíquota 20% — Day Trade)
┌─────────────────────────────────────────────────┐
│  Ações DT                                       │
│  ETFs de RV DT                                  │◄──► Podem compensar entre si
│  BDRs DT                                        │     MAS NÃO com Grupo A
│  Opções DT                                      │
│  Futuros DT                                     │
│  FIIs (DT e ST — sempre 20%)                    │
└─────────────────────────────────────────────────┘

GRUPO C (FII/Fiagro — isolado)
┌─────────────────────────────────────────────────┐
│  FIIs (ganho de capital)                        │◄──► Só entre FII e Fiagro
│  Fiagros (ganho de capital)                     │
└─────────────────────────────────────────────────┘
```

> **Ponto crítico para o sistema:** FII tem alíquota de 20% MAS seu prejuízo NÃO compensa Day Trade de ações (Grupo B). FII é um grupo isolado. Isso acontece porque a lei trata FII especificamente — seu resultado sempre vai para o código 6015 como categoria separada.

### 7.2 Regras Práticas

| Cenário | Pode compensar? |
|---------|----------------|
| Prejuízo ação ST × Lucro ETF ST | ✅ Sim |
| Prejuízo BDR ST × Lucro ação ST | ✅ Sim |
| Prejuízo opção ST × Lucro ação ST | ✅ Sim |
| Prejuízo futuro ST × Lucro ação ST | ✅ Sim |
| Prejuízo FII × Lucro ação ST | ❌ Não |
| Prejuízo FII × Lucro FII | ✅ Sim |
| Prejuízo ação ST × Lucro ação DT | ❌ Não (grupos diferentes) |
| Prejuízo ETF RF × Lucro ação ST | ❌ Não (ETF RF segue regime próprio) |

### 7.3 Prazo de Prescrição

**Não existe prazo de prescrição** para compensação de prejuízos em renda variável. O investidor pode carregar um prejuízo de 2015 para compensar com um lucro em 2030. A segregação por grupo deve ser mantida.

---

## 8. Identificação de Classe pelo Ticker — Padrão B3 e SINACOR

### 8.1 Padrão Geral de Tickers B3

```
XXXX[YY]
│    └── Sufixo numérico (2 dígitos) ou letra + número
└─────── 4 letras (código da empresa/fundo)
```

### 8.2 Sufixos e Classes

| Sufixo | Classe Principal | Exemplos |
|--------|-----------------|----------|
| 3 | Ação ON | PETR3, VALE3 |
| 4 | Ação PN | PETR4, ITUB4 |
| 5 | Ação PNA | GGBR5 |
| 6 | Ação PNB | — |
| 11 | FII, ETF, Unit | HGLG11, BOVA11, SANB11 |
| 32 | BDR Patrocinado Nível II | — |
| 33 | BDR Patrocinado Nível III | — |
| 34 | BDR Não Patrocinado | AAPL34, AMZO34 |
| 35 | BDR Não Patrocinado alternativo | GOGL35 |
| A-X + número | Opção de ação | PETR4L300, VALE3R350 |

> **O problema do sufixo 11:** Pode ser FII, ETF ou Unit (ex: SANB11 é Unit do Santander). A distinção exige uma lista de referência ou consulta à API da B3.

### 8.3 Campos SINACOR para Identificação

A nota de corretagem SINACOR contém os seguintes campos relevantes para classificação:

| Campo SINACOR | Valores Possíveis | Interpretação |
|---------------|------------------|---------------|
| `Tipo Mercado` | `VISTA` | Ação, FII, ETF, BDR, Unit |
| `Tipo Mercado` | `FRACIONARIO` | Fração de ação |
| `Tipo Mercado` | `OPCAO DE COMPRA` | Call |
| `Tipo Mercado` | `OPCAO DE VENDA` | Put |
| `Tipo Mercado` | `FUTURO` | Contrato futuro BM&F |
| `Tipo Mercado` | `TERMO` | Contrato a termo |
| `Especificação` | Contém `DRN` | BDR |
| `Especificação` | Contém `CI` | FII ou ETF (cota de fundo) |
| `Especificação` | Nome de empresa estrangeira | BDR |
| `Especificação` | `OPCAO` + ativo | Confirmação de opção |

### 8.4 Algoritmo de Classificação

O algoritmo ideal combina **campo "Tipo Mercado"** (primário) com **ticker** e **especificação** (secundários):

```
1. Se "Tipo Mercado" = "OPCAO DE COMPRA" → OPCAO_CALL
2. Se "Tipo Mercado" = "OPCAO DE VENDA" → OPCAO_PUT
3. Se "Tipo Mercado" = "FUTURO" → FUTURO
4. Se "Tipo Mercado" = "TERMO" → TERMO
5. Se "Tipo Mercado" in ("VISTA", "FRACIONARIO"):
   a. Se sufixo ticker em (32, 33, 34, 35) → BDR
   b. Se especificação contém "DRN" → BDR
   c. Se ticker em lista_etfs_rf → ETF_RF
   d. Se ticker em lista_etfs_rv → ETF_RV
   e. Se ticker em lista_fiis → FII
   f. Se sufixo ticker = 11 → classificação ambígua (consultar lista)
   g. Senão → ACAO
```

---

## 10. Código TypeScript — Classificador de Ativos

### 10.1 Tipos e Enums

```typescript
// src/lib/ir/asset-classifier.ts

export enum AssetClass {
  ACAO = 'ACAO',
  FII = 'FII',
  FIAGRO = 'FIAGRO',
  ETF_RV = 'ETF_RV',
  ETF_RF = 'ETF_RF',
  BDR = 'BDR',
  OPCAO_CALL = 'OPCAO_CALL',
  OPCAO_PUT = 'OPCAO_PUT',
  FUTURO = 'FUTURO',
  TERMO = 'TERMO',
  UNIT = 'UNIT',
  DESCONHECIDO = 'DESCONHECIDO',
}

export enum OperationType {
  SWING_TRADE = 'SWING_TRADE',
  DAY_TRADE = 'DAY_TRADE',
}

export interface TaxRule {
  aliquotaST: number;       // Alíquota swing trade (decimal, ex: 0.15)
  aliquotaDT: number;       // Alíquota day trade
  temIsencao20k: boolean;   // Se entra no saldo de vendas para isenção
  irrf: number;             // IRRF dedo-duro ST (decimal)
  irrfDT: number;           // IRRF day trade
  codigoDARF: string;
  compensaComGrupo: string; // 'A_ST' | 'B_DT' | 'FII' | 'ETF_RF'
}

export interface ParsedNegocio {
  ticker: string;
  especificacao: string;    // Campo "Especificação do Título" da nota SINACOR
  tipoMercado: string;      // Campo "Tipo Mercado" da nota SINACOR
  operacao: 'C' | 'V';      // Compra ou Venda
  preco: number;
  quantidade: number;
  valorTotal: number;
  dataNegocio: Date;
}
```

### 10.2 Listas de Referência

```typescript
// src/lib/ir/asset-lists.ts
// Listas devem ser atualizadas periodicamente via B3 API ou manutenção

/**
 * ETFs de Renda Fixa listados na B3.
 * Tributados como fundo de RF (tabela regressiva, IRRF na fonte).
 * Fonte: B3 ETFs Listados — https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/etf/
 */
export const ETF_RF_TICKERS = new Set([
  'IRFM11', // iShares IRF-M 1+ Títulos Públicos
  'IMA-B11', // — (verificar nome exato)
  'IMAB11',  // iShares IMA-B Títulos Públicos
  'FIXA11',  // Trend RF Simples
  'DEBB11',  // iShares Debentures
  'RPFI11',  // — verificar
]);

/**
 * ETFs de Renda Variável listados na B3 (principais).
 * Tributados como RV: 15% ST / 20% DT, sem isenção de R$20k.
 */
export const ETF_RV_TICKERS = new Set([
  'BOVA11', 'SMAL11', 'IVVB11', 'DIVO11', 'GOVE11',
  'FIND11', 'FNAM11', 'ISUS11', 'SPXI11', 'HASH11',
  'GOLD11', 'MATB11', 'ECOO11', 'IFNC11', 'IFIX11',
  'BOVB11', 'BOVV11', 'XFII11', 'BBSD11', 'TECK11',
  // ... atualizar via B3 ETFs Listados
]);

/**
 * Fiagros — seguem regras idênticas a FIIs.
 */
export const FIAGRO_TICKERS = new Set([
  'HCTR11', 'MCCI11', 'RRCD11', 'KNCA11', 'GCRA11',
  // ... atualizar via CVM/B3
]);

/**
 * Units — ações compostas de ON+PN. Seguem regras de ações (15% ST, isenção 20k).
 * Sufixo 11, mas NÃO são FII nem ETF.
 */
export const UNIT_TICKERS = new Set([
  'SANB11', 'ITSA11', // Santander, Itaúsa (verificar se há units)
  // Na prática, units são raras. Exemplos: KLBN11, TAEE11, EGIE11
  'KLBN11', 'TAEE11', 'EGIE11', 'CSMG11', 'SUZB11',
]);
```

### 10.3 Classificador Principal

```typescript
// src/lib/ir/asset-classifier.ts (continuação)

/**
 * Regex para identificar ticker de opção:
 * 4 letras de ativo + 1 letra de mês/tipo + número de strike
 * Exemplos: PETR4L300, VALE3R350, ITUB4A250
 */
const OPCAO_REGEX = /^[A-Z]{4}\d?[A-X]\d+$/;

/**
 * Regex para ticker de futuro BM&F:
 * 3 letras + 1 letra de mês + 2 dígitos de ano
 * Exemplos: WINQ26, WDOU26, DI1Z26, BGIJ26
 */
const FUTURO_REGEX = /^[A-Z]{2,4}[FGHJKMNQUVXZ]\d{2}$/;

/**
 * Letras de mês para CALL (A=jan ... L=dez)
 */
const CALL_MONTH_LETTERS = new Set('ABCDEFGHIJKL'.split(''));

/**
 * Letras de mês para PUT (M=jan ... X=dez)
 */
const PUT_MONTH_LETTERS = new Set('MNOPQRSTUVWX'.split(''));

/**
 * Classifica a classe de ativo a partir dos dados de um negócio da nota SINACOR.
 * Prioridade: campo tipoMercado > especificacao > ticker.
 */
export function classifyAsset(negocio: ParsedNegocio): AssetClass {
  const ticker = negocio.ticker.toUpperCase().trim();
  const tipoMercado = negocio.tipoMercado.toUpperCase().trim();
  const especificacao = negocio.especificacao.toUpperCase().trim();

  // 1. Classificação pelo campo "Tipo Mercado" (mais confiável)
  if (tipoMercado.includes('OPCAO DE COMPRA') || tipoMercado === 'OPCAO COMPRA') {
    return AssetClass.OPCAO_CALL;
  }
  if (tipoMercado.includes('OPCAO DE VENDA') || tipoMercado === 'OPCAO VENDA') {
    return AssetClass.OPCAO_PUT;
  }
  if (tipoMercado === 'FUTURO') {
    return AssetClass.FUTURO;
  }
  if (tipoMercado === 'TERMO') {
    return AssetClass.TERMO;
  }

  // 2. Para tipo "VISTA" e "FRACIONARIO" — classificar pelo ticker e especificação
  if (tipoMercado === 'VISTA' || tipoMercado === 'FRACIONARIO') {
    // 2a. BDR — sufixo 32, 33, 34, 35 ou contém "DRN" na especificação
    const suffixMatch = ticker.match(/(\d+)$/);
    const suffix = suffixMatch ? parseInt(suffixMatch[1]) : 0;
    if ([32, 33, 34, 35].includes(suffix) || especificacao.includes('DRN')) {
      return AssetClass.BDR;
    }

    // 2b. Sufixo 11 — pode ser ETF RF, ETF RV, FII, Fiagro ou Unit
    if (suffix === 11) {
      if (ETF_RF_TICKERS.has(ticker)) return AssetClass.ETF_RF;
      if (ETF_RV_TICKERS.has(ticker)) return AssetClass.ETF_RV;
      if (FIAGRO_TICKERS.has(ticker)) return AssetClass.FIAGRO;
      if (UNIT_TICKERS.has(ticker)) return AssetClass.ACAO; // Units tratadas como ações
      // Fallback: se especificação contém "CI" e não está nas listas → provável FII
      if (especificacao.startsWith('CI ') || especificacao.includes(' CI')) {
        return AssetClass.FII;
      }
      // Ambíguo — retornar FII como default conservador (20% vs 15%)
      // O assessor deve confirmar manualmente
      console.warn(`[AssetClassifier] Ticker ${ticker} com sufixo 11 não identificado nas listas. Assumindo FII.`);
      return AssetClass.FII;
    }

    // 2c. Ação — sufixos 3, 4, 5, 6, 7, 8
    if ([3, 4, 5, 6, 7, 8].includes(suffix)) {
      return AssetClass.ACAO;
    }

    // 2d. Fallback por regex de opção (caso tipoMercado não identificado)
    if (OPCAO_REGEX.test(ticker)) {
      const opcaoLetra = ticker[4]; // Quinta posição (após 4 letras do ativo)
      if (CALL_MONTH_LETTERS.has(opcaoLetra)) return AssetClass.OPCAO_CALL;
      if (PUT_MONTH_LETTERS.has(opcaoLetra)) return AssetClass.OPCAO_PUT;
    }
  }

  // 3. Fallback por regex de futuro
  if (FUTURO_REGEX.test(ticker)) {
    return AssetClass.FUTURO;
  }

  return AssetClass.DESCONHECIDO;
}

/**
 * Retorna as regras tributárias para uma classe de ativo.
 */
export function getTaxRule(assetClass: AssetClass): TaxRule {
  const rules: Record<AssetClass, TaxRule> = {
    [AssetClass.ACAO]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: true,
      irrf: 0.00005,      // 0,005%
      irrfDT: 0.01,       // 1%
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.FII]: {
      aliquotaST: 0.20,   // FII sempre 20%, mesmo em ST
      aliquotaDT: 0.20,
      temIsencao20k: false,
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'FII',
    },
    [AssetClass.FIAGRO]: {
      aliquotaST: 0.20,
      aliquotaDT: 0.20,
      temIsencao20k: false,
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'FII', // Fiagro compensa com FII
    },
    [AssetClass.ETF_RV]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: false,  // ETF não tem isenção de 20k
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.ETF_RF]: {
      aliquotaST: 0,       // Retido na fonte — não gera DARF manual
      aliquotaDT: 0,
      temIsencao20k: false,
      irrf: 0,             // IRRF calculado automaticamente pela corretora
      irrfDT: 0,
      codigoDARF: 'N/A',   // Sem DARF — retido na fonte
      compensaComGrupo: 'ETF_RF',
    },
    [AssetClass.BDR]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: false,  // BDR não tem isenção de 20k
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.OPCAO_CALL]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: false,  // Opções não têm isenção de 20k
      irrf: 0.00005,         // Sobre resultado líquido de prêmios no mês
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.OPCAO_PUT]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: false,
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.FUTURO]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: false,
      irrf: 0.00005,         // Sobre soma algébrica positiva dos ajustes
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.TERMO]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: false,
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.UNIT]: {
      aliquotaST: 0.15,
      aliquotaDT: 0.20,
      temIsencao20k: true,   // Units de empresas brasileiras têm isenção 20k
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
    [AssetClass.DESCONHECIDO]: {
      aliquotaST: 0.15,      // Conservador — assumir alíquota mínima
      aliquotaDT: 0.20,
      temIsencao20k: false,  // Conservador — não assumir isenção
      irrf: 0.00005,
      irrfDT: 0.01,
      codigoDARF: '6015',
      compensaComGrupo: 'A_ST',
    },
  };

  return rules[assetClass];
}
```

### 10.4 Cálculo da Isenção de R$ 20.000

```typescript
// src/lib/ir/exemption-calculator.ts

/**
 * Calcula o saldo de vendas que entra na conta da isenção de R$ 20.000/mês.
 * Apenas ACAO e UNIT de empresas brasileiras entram na conta.
 * 
 * Regra: se totalVendasAçõesMes <= 20000, ganhos de ações ST são ISENTOS.
 * FII, ETF, BDR, Opções, Futuros NÃO entram nesse saldo.
 */
export function calcularSaldoVendasParaIsencao(
  negocios: Array<{ assetClass: AssetClass; operacao: 'C' | 'V'; valorTotal: number; isDayTrade: boolean }>
): number {
  return negocios
    .filter(n =>
      n.operacao === 'V' &&
      !n.isDayTrade &&
      (n.assetClass === AssetClass.ACAO || n.assetClass === AssetClass.UNIT)
    )
    .reduce((sum, n) => sum + n.valorTotal, 0);
}

/**
 * Verifica se os ganhos de ações ST do mês são isentos.
 */
export function isGanhoAcaoIsento(
  totalVendasAcoesST: number,
  ganhoLiquido: number
): boolean {
  // Isenção: vendas de ações à vista (ST) no mês ≤ R$ 20.000
  // Se isento, o ganho líquido = 0 para fins de DARF
  // Mas AINDA ASSIM deve ser declarado na DIRPF como rendimento isento
  return totalVendasAcoesST <= 20000;
}

/**
 * Apura o IR devido no mês para um determinado grupo de compensação.
 */
export interface ApuracaoMensal {
  grupo: string;
  ganhosBrutos: number;
  prejuizosAcumulados: number;
  ganhoLiquido: number;       // ganhosBrutos - prejuizosAcumulados
  irDevido: number;
  irrfRetido: number;
  irrfACompensar: number;
  darfAPagar: number;
  prejuizoACarregar: number;  // Para compensar em meses futuros
}

export function apurarIRMensal(
  grupo: string,
  ganhosBrutos: number,
  prejuizosAcumulados: number,
  aliquota: number,
  irrfRetido: number,
  isIsento: boolean
): ApuracaoMensal {
  const ganhoLiquido = Math.max(0, ganhosBrutos - prejuizosAcumulados);
  const prejuizoGerado = Math.max(0, prejuizosAcumulados - ganhosBrutos);

  const irDevido = isIsento ? 0 : ganhoLiquido * aliquota;
  const darfAPagar = Math.max(0, irDevido - irrfRetido);
  const irrfACompensar = Math.max(0, irrfRetido - irDevido);

  return {
    grupo,
    ganhosBrutos,
    prejuizosAcumulados,
    ganhoLiquido,
    irDevido,
    irrfRetido,
    irrfACompensar,
    darfAPagar,
    prejuizoACarregar: prejuizoGerado,
  };
}
```

### 10.5 Decodificador de Ticker de Opção

```typescript
// src/lib/ir/option-decoder.ts

const CALL_MONTHS: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6,
  G: 7, H: 8, I: 9, J: 10, K: 11, L: 12,
};

const PUT_MONTHS: Record<string, number> = {
  M: 1, N: 2, O: 3, P: 4, Q: 5, R: 6,
  S: 7, T: 8, U: 9, V: 10, W: 11, X: 12,
};

export interface DecodedOption {
  ativoObjeto: string;    // Ex: PETR4
  tipo: 'CALL' | 'PUT';
  mesVencimento: number;
  strikeAproximado: number; // Valor aproximado — pode diferir do real
}

/**
 * Decodifica um ticker de opção B3.
 * Ex: PETR4L300 → { ativoObjeto: 'PETR4', tipo: 'CALL', mesVencimento: 12, strikeAproximado: 30.0 }
 * 
 * ATENÇÃO: O strike no ticker é aproximado. Após dividendos, pode haver ajuste.
 * Sempre confirmar o strike real na nota de corretagem.
 */
export function decodeOptionTicker(ticker: string): DecodedOption | null {
  // Opções sobre ações: 4 letras de ativo + letra de mês + número de strike
  // Ex: PETR4 L 300 (sem espaços no ticker real: PETR4L300)
  // Ativo pode ter 4 ou 5 chars (ex: PETR4 = 5 chars, VALE3 = 5 chars)

  if (ticker.length < 6) return null;

  // Encontrar a posição da letra de vencimento (5ª posição para ativos com código 5 chars)
  // Padrão mais comum: 4 letras empresa + 1 número PN/ON + 1 letra mês + número strike
  // Ex: P-E-T-R-4-L-3-0-0 → ativo=PETR4, mês=L, strike=300
  
  let monthLetterIndex = -1;
  let ativoObjeto = '';

  // Tentar 5 chars de ativo (ex: PETR4)
  if (ticker.length >= 6) {
    const candidate = ticker[5];
    if (CALL_MONTHS[candidate] !== undefined || PUT_MONTHS[candidate] !== undefined) {
      ativoObjeto = ticker.substring(0, 5);
      monthLetterIndex = 5;
    }
  }

  // Tentar 4 chars de ativo (ex: BOVA para ETF options, raro)
  if (monthLetterIndex === -1 && ticker.length >= 5) {
    const candidate = ticker[4];
    if (CALL_MONTHS[candidate] !== undefined || PUT_MONTHS[candidate] !== undefined) {
      ativoObjeto = ticker.substring(0, 4);
      monthLetterIndex = 4;
    }
  }

  if (monthLetterIndex === -1) return null;

  const monthLetter = ticker[monthLetterIndex];
  const strikeStr = ticker.substring(monthLetterIndex + 1);
  const strikeRaw = parseInt(strikeStr);

  if (isNaN(strikeRaw)) return null;

  // Strike: dividir por 100 se > 999 (convenção histórica da B3 para strikes altos)
  // Ex: 300 → R$ 30,00; 3000 → R$ 30,00 ou R$ 3.000,00 (depende do ativo)
  // Por segurança, retornar o valor bruto e deixar a camada de aplicação interpretar
  const strikeAproximado = strikeRaw;

  const callMonth = CALL_MONTHS[monthLetter];
  const putMonth = PUT_MONTHS[monthLetter];

  return {
    ativoObjeto,
    tipo: callMonth !== undefined ? 'CALL' : 'PUT',
    mesVencimento: callMonth ?? putMonth!,
    strikeAproximado,
  };
}
```

---

## 9. Impacto no Modelo de Dados Firestore

### 9.1 Campos Adicionais em `notas_corretagem`

A coleção atual de notas deve ser expandida para suportar todas as classes:

```typescript
// Firestore: /assessores/{assessorId}/clientes/{clienteId}/notas_corretagem/{notaId}

interface NotaCorretagem {
  // Campos existentes
  dataNotaNegociacao: Timestamp;
  numeroNota: string;
  corretora: string;
  
  // Campos adicionais necessários
  segmento: 'BOVESPA' | 'BMF';  // Bovespa = ações/FII/ETF/BDR | BM&F = futuros/derivativos
  totalVendasAcoesST: number;   // Soma vendas de ações+units ST (para cálculo da isenção)
  totalVendasFiiST: number;     // Soma vendas de FII ST (para verificação 20%)
  totalVendasEtfRvST: number;   // Vendas de ETF RV ST
  totalVendasBdrST: number;     // Vendas de BDR ST
  
  negocios: NegocioNota[];      // Array de negócios da nota
  
  // Resumo tributário da nota
  irrfRetidoST: number;         // Total IRRF dedo-duro (0,005%) retido
  irrfRetidoDT: number;         // Total IRRF DT (1%) retido
  taxasOperacionais: number;    // Corretagem + emolumentos + taxas (custo dedutível)
}

interface NegocioNota {
  // Campos existentes
  ticker: string;
  operacao: 'C' | 'V';
  quantidade: number;
  preco: number;
  valorTotal: number;
  
  // Campos adicionais
  assetClass: AssetClass;         // Classificação automática
  tipoMercadoSinacor: string;     // Valor raw do campo "Tipo Mercado" da nota
  especificacaoSinacor: string;   // Valor raw do campo "Especificação" da nota
  isDayTrade: boolean;            // True se compra e venda no mesmo dia
  
  // Campos específicos por classe
  // Para opções:
  opcaoAtivObjeto?: string;       // Ex: PETR4
  opcaoTipo?: 'CALL' | 'PUT';
  opcaoStrike?: number;
  opcaoMesVencimento?: number;
  premioUnitario?: number;        // Prêmio por opção
  
  // Para futuros:
  futuroContrato?: string;        // Ex: WIN, WDO, DI1
  futuroVencimento?: string;      // Ex: 'K26' (mai/2026)
  ajusteDiario?: number;          // Para conciliação com extrato de ajuste
}
```

### 9.2 Campos em `posicoes_ir`

A coleção de posições para controle de PM deve ser expandida:

```typescript
// Firestore: /assessores/{assessorId}/clientes/{clienteId}/posicoes_ir/{ticker}

interface PosicaoIR {
  ticker: string;
  assetClass: AssetClass;
  
  // Campos existentes (ações)
  quantidadeTotal: number;
  precoMedioST: number;           // PM para swing trade
  custoTotalST: number;           // Custo total ST
  
  // Campos adicionais
  precoMedioDT: number;           // PM day trade (zerado ao fim do dia)
  
  // Específico para FII/ETF
  rendimentosIsentosAcumulados: number;  // Para relatório anual
  
  // Específico para opções (posição em aberto)
  opcaoPosicao?: {
    tipo: 'TITULAR_CALL' | 'TITULAR_PUT' | 'LANCADOR_CALL' | 'LANCADOR_PUT';
    quantidade: number;
    premioMedio: number;          // Custo/receita média do prêmio
    ativoObjeto: string;
    strike: number;
    dataVencimento: Timestamp;
  };
  
  // Acumulados de prejuízo para compensação
  prejuizoAcumuladoST: number;    // Grupo A (ações+ETF+BDR+opcoes+futuros ST)
  prejuizoAcumuladoDT: number;    // Grupo B (DT)
  prejuizoAcumuladoFII: number;   // Grupo FII (só compensa FII/Fiagro)
  
  ultimaAtualizacao: Timestamp;
}
```

### 9.3 Campos em `apuracoes_ir_mensais`

Nova coleção para controle mensal por grupo:

```typescript
// Firestore: /assessores/{assessorId}/clientes/{clienteId}/apuracoes_ir_mensais/{anoMes}

interface ApuracaoIRMensal {
  anoMes: string;                 // Ex: '2026-05'
  
  // Grupo A — Swing Trade (15%)
  grupoAST: {
    vendas: number;               // Total de vendas (ações + ETF + BDR + opcoes ST)
    vendasAcoesST: number;        // Só ações+units (para cálculo da isenção)
    isIsento: boolean;            // vendasAcoesST <= 20000 E só há lucro em ações
    ganhosBrutos: number;
    custos: number;
    prejuizoCompensado: number;
    ganhoLiquido: number;
    irDevido: number;
    irrfRetido: number;
    darfAPagar: number;
    prejuizoACarregar: number;
  };
  
  // Grupo B — Day Trade (20%)
  grupoBDT: {
    ganhosBrutos: number;
    custos: number;
    prejuizoCompensado: number;
    ganhoLiquido: number;
    irDevido: number;
    irrfRetido: number;
    darfAPagar: number;
    prejuizoACarregar: number;
  };
  
  // Grupo FII (20%, isolado)
  grupoFII: {
    vendasFii: number;
    ganhosBrutos: number;
    custos: number;
    rendimentosIsentos: number;   // Registrar para DIRPF
    prejuizoCompensado: number;
    ganhoLiquido: number;
    irDevido: number;
    irrfRetido: number;
    darfAPagar: number;
    prejuizoACarregar: number;
  };
  
  // Totais
  totalDARFAPagar: number;
  dataLimiteDARF: Timestamp;      // Último dia útil do mês seguinte
  statusDARF: 'PENDENTE' | 'PAGO' | 'ISENTO' | 'SEM_GANHO';
  
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}
```

---

## 11. Tabela Consolidada — Todas as Classes

| Classe | Alíquota ST | Alíquota DT | Isenção R$ 20k | IRRF ST | IRRF DT | DARF | Compensação | Obs. |
|--------|-------------|-------------|----------------|---------|---------|------|-------------|------|
| Ação PF (à vista) | 15% | 20% | ✅ Sim | 0,005% | 1% | 6015 | Grupo A (ST) | Isenção só se vendas ≤ R$ 20k/mês |
| FII | 20% | 20% | ❌ Não | 0,005% | 1% | 6015 | Grupo FII | Rendimentos mensais isentos (condições) |
| Fiagro | 20% | 20% | ❌ Não | 0,005% | 1% | 6015 | Grupo FII | Idêntico a FII |
| ETF de RV | 15% | 20% | ❌ Não | 0,005% | 1% | 6015 | Grupo A (ST) | Sem isenção de 20k |
| ETF de RF | Tabela regressiva | Tabela regressiva | ❌ Não | Retido na fonte | — | N/A | ETF RF | Sem DARF manual; come-cotas |
| BDR | 15% | 20% | ❌ Não | 0,005% | 1% | 6015 | Grupo A (ST) | Dividendos: tabela progressiva |
| Opção (call/put) | 15% | 20% | ❌ Não | 0,005%* | 1% | 6015 | Grupo A (ST) | *Sobre resultado líquido de prêmios |
| Futuro (especulador) | 15% | 20% | ❌ Não | 0,005%** | 1% | 6015 | Grupo A (ST) | **Sobre ajustes diários acumulados |
| Futuro (hedger) | 15% | 15% | ❌ Não | 0,005% | 0,005% | 6015 | Grupo A (ST) | Hedge deve ser documentado |
| Termo | 15% | 20% | ❌ Não | 0,005% | 1% | 6015 | Grupo A (ST) | Liquidação no vencimento |
| Unit (empresa BR) | 15% | 20% | ✅ Sim | 0,005% | 1% | 6015 | Grupo A (ST) | Entra na conta dos R$ 20k |

### Identificação pelo Ticker (Sufixos B3)

| Sufixo | Classe | Exemplos |
|--------|--------|---------|
| 3 | Ação ON | PETR3, VALE3 |
| 4 | Ação PN | PETR4, ITUB4 |
| 11 | FII, ETF, Unit | HGLG11, BOVA11, SANB11 |
| 34 | BDR (maioria) | AAPL34, AMZO34, TSLA34 |
| 35 | BDR alternativo | GOGL35 |
| 32 | BDR Patrocinado II | Raro |
| 33 | BDR Patrocinado III | Raro |
| X + número | Opção | PETR4L300, VALE3R350 |
| WIN/WDO/IND/DOL + letra + ano | Futuro | WINQ26, WDOU26 |

### Campos SINACOR para Classificação

| Campo SINACOR | Valor | Classe |
|---------------|-------|--------|
| Tipo Mercado | `VISTA` | Ação, FII, ETF, BDR, Unit |
| Tipo Mercado | `FRACIONARIO` | Fração de ação |
| Tipo Mercado | `OPCAO DE COMPRA` | Call |
| Tipo Mercado | `OPCAO DE VENDA` | Put |
| Tipo Mercado | `FUTURO` | Contrato futuro |
| Tipo Mercado | `TERMO` | Contrato a termo |
| Especificação | Contém `DRN` | BDR |
| Especificação | Começa com `CI ` | FII ou ETF (cota de fundo) |
| Ticker | Sufixo 34/35 | BDR |

---

## 12. Referências

### Legislação e Normas

1. **Lei 11.033/2004** — Isenção de rendimentos de FIIs, tributação de renda variável  
   https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11033.htm

2. **Lei 15.270/2025** — Novos requisitos FIIs (100 cotistas), reforma do IR 2026  
   https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm

3. **IN RFB 1.585/2015** — Regras detalhadas de tributação de fundos e derivativos  
   https://www.legisweb.com.br/legislacao/?id=302887

4. **Receita Federal — Isenções Renda Variável**  
   https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/isencoes

5. **Receita Federal — Compensações Renda Variável**  
   https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/compensacoes

### FIIs

6. **InfoMoney — FIIs no Imposto de Renda 2026**  
   https://www.infomoney.com.br/guias/fundos-imobiliarios-fiis-imposto-de-renda-ir/

7. **XP Investimentos — Como declarar FIIs no IR**  
   https://conteudos.xpi.com.br/aprenda-a-investir/relatorios/como-declarar-fundos-imobiliarios-no-imposto-de-renda/

8. **B3 — FIIs e Fiagros vão perder isenção?**  
   https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/fundos-investimento/fiis-e-fiagros-vao-perder-isencao-entenda-o-que-muda-no-ir/

9. **Agência Brasil — Fazenda esclarece mudanças em FIIs e Fiagros**  
   https://agenciabrasil.ebc.com.br/economia/noticia/2025-06/fazenda-esclarece-mudancas-em-fundos-imobiliarios-e-fiagros

10. **Portas — FIIs no IR 2026: Reforma Tributária**  
    https://portas.com.br/imposto-de-renda/tributacao-de-fiis-na-reforma-tributaria/

### ETFs

11. **InfoMoney — Como declarar ETFs no IR 2026**  
    https://www.infomoney.com.br/guias/declarar-etf-imposto-de-renda-ir/

12. **XP — Como declarar ETFs no IR**  
    https://conteudos.xpi.com.br/aprenda-a-investir/relatorios/entenda-como-declarar-etfs-no-imposto-de-renda/

13. **B3 — Como ficam impostos para ETFs/BDRs?**  
    https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/etfs/tributacao-etf-e-bdr/

14. **Suno — Tributação de ETF 2025**  
    https://www.suno.com.br/guias/tributacao-de-etf-2025/

### BDRs

15. **InfoMoney — BDRs no IR 2026**  
    https://www.infomoney.com.br/guias/bdr-imposto-de-renda-ir/

16. **B3 — BDRs Patrocinados Níveis I, II e III**  
    https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/brazilian-depositary-receipts-bdrs-patrocinados-niveis-i-ii-e-iii.htm

17. **NuInvest — Códigos de BDRs**  
    https://ajuda.nuinvest.com.br/hc/pt-br/articles/4401940834587

18. **Seu Dinheiro — Como declarar BDR no IR 2026**  
    https://www.seudinheiro.com/2026/financas-pessoais/como-declarar-bdr-no-imposto-de-renda-2026-julw/

### Opções

19. **InfoMoney — Como declarar opções no IR 2026**  
    https://www.infomoney.com.br/guias/opcoes-de-acoes-imposto-de-renda-ir/

20. **Suno — Tributação de opções**  
    https://www.suno.com.br/artigos/tributacao-de-opcoes/

21. **B3 — Formação do Código de Liquidação das Opções**  
    https://www.b3.com.br/data/files/4B/F3/C4/10/519AC7109A21A9C78C094EA8/Formacao%20do%20Codigo%20de%20Liquidacao%20das%20Opcoes.pdf

22. **Nelogica — Nomenclatura das Opções**  
    https://ajuda.nelogica.com.br/hc/pt-br/articles/360050136171-Nomenclatura-das-op%C3%A7%C3%B5es

23. **ADVFN — Tributação no exercício de opções de compra**  
    https://br.advfn.com/investimentos/opcoes/ir-exercicio-opcao-compra

### Futuros

24. **ADVFN — IR Contratos Futuros**  
    https://br.advfn.com/investimentos/futuros/imposto-de-renda

25. **Leoa — IR sobre mercado futuro**  
    https://www.leoa.com.br/blog/imposto-de-renda-mercado-futuro

26. **XP — Como apurar IR sobre operações no mercado futuro**  
    https://atendimento.xpi.com.br/artigo/1518-como-apurar-e-recolher-o-imposto-de-renda-sobre-operacoes-no-mercado-futuro

27. **NuInvest — Tributação em Renda Variável**  
    https://www.nuinvest.com.br/tributacao-de-renda-variavel.html

28. **Nelogica Blog — Contratos futuros: códigos, vencimentos**  
    https://blog.nelogica.com.br/como-funcionam-os-codigos-e-vencimentos-dos-contratos-futuros/

### Compensação e SINACOR

29. **Seu Dinheiro — Compensação de prejuízos para todos**  
    https://www.seudinheiro.com/2025/bolsa-dolar/compensacao-de-prejuizos-para-todos-o-que-muda-no-mecanismo-julw/

30. **B3 — Como ficam impostos para ETFs/BDRs (compensação)**  
    https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/etfs/tributacao-etf-e-bdr/

31. **Medium — Sinacor: Tabelas, Colunas e Detalhes**  
    https://medium.com/@rodrigopscampos/sinacor-tabelas-colunas-e-detalhes-importantes-conhecer-d1d8597e3d8d

32. **SmarttBot — O que é o formato SINACOR**  
    https://ajuda.smarttbot.com/hc/pt-br/articles/14838979851415-O-que-%C3%A9-o-formato-SINACOR

33. **Mycapital — Formato nota corretagem SINACOR**  
    https://mycapital.movidesk.com/kb/article/121298/como-e-uma-nota-de-corretagem-no-padrao-sinacor-e-onde-posso-con

---

*Documento gerado em maio/2026. Verificar atualizações na legislação periodicamente, especialmente após publicação de novas INs da RFB ou alterações no regime de FIIs/Fiagros decorrentes da Reforma Tributária.*
