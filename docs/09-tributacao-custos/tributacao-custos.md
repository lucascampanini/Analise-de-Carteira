# Tributacao e Custos Operacionais para Bot de Investimentos no Brasil

## Pesquisa Abrangente - Nivel PhD

**Autor:** Pesquisa compilada para o projeto BOT Assessor
**Data:** Fevereiro de 2026
**Escopo:** Tributacao completa de ativos financeiros, custos operacionais da B3, otimizacao fiscal e automacao para bot de investimentos

---

## Sumario

1. [Imposto de Renda sobre Renda Variavel](#1-imposto-de-renda-sobre-renda-variavel)
2. [Day Trade vs Swing Trade](#2-day-trade-vs-swing-trade)
3. [Tributacao por Tipo de Ativo](#3-tributacao-por-tipo-de-ativo)
4. [Operacoes com Opcoes](#4-operacoes-com-opcoes)
5. [Custos da B3](#5-custos-da-b3)
6. [Custos de Corretagem e RLP](#6-custos-de-corretagem-e-rlp)
7. [Pessoa Juridica - Trading como PJ](#7-pessoa-juridica---trading-como-pj)
8. [Fundos de Investimento](#8-fundos-de-investimento)
9. [Criptomoedas](#9-criptomoedas)
10. [Otimizacao Fiscal](#10-otimizacao-fiscal)
11. [Automacao Fiscal](#11-automacao-fiscal)
12. [Implicacoes para o Bot](#12-implicacoes-para-o-bot)
13. [Referencias](#13-referencias)

---

## Contexto Regulatorio Atual (Fevereiro 2026)

### Status da MP 1.303/2025

A Medida Provisoria 1.303/2025, publicada em 11 de junho de 2025, propunha unificar a tributacao de aplicacoes financeiras em uma aliquota unica de 17,5% (18% na versao final da Comissao Mista) a partir de janeiro de 2026. No entanto, **a MP foi retirada de pauta pela Camara dos Deputados em 08/10/2025 (251 votos a favor da retirada x 193 contra) e caducou**, ou seja, perdeu sua validade sem ser convertida em lei.

**Consequencia:** As regras anteriores permanecem integralmente vigentes em 2026 para tributacao de investimentos. O sistema regressivo de aliquotas para renda fixa, as isencoes de LCI/LCA/CRI/CRA e a isencao de dividendos de FIIs foram mantidos.

### Lei 15.270/2025 (Vigente)

Sancionada em 26/11/2025, esta lei **esta em vigor** e introduz:
- **Tributacao de dividendos**: IRRF de 10% sobre lucros/dividendos distribuidos acima de R$ 50.000/mes por fonte pagadora para PF, a partir de 01/01/2026
- **Imposto Minimo**: Mecanismo de tributacao minima anual para IRPF de alta renda
- **Transicao**: Lucros referentes a resultados apurados ate 2025 ficam isentos, desde que a distribuicao seja aprovada pelo orgao societario ate 31/12/2025

---

## 1. Imposto de Renda sobre Renda Variavel

### 1.1 Aliquotas Vigentes (2026)

| Tipo de Operacao | Aliquota IR | IRRF (Retencao na Fonte) | Isencao |
|---|---|---|---|
| **Swing Trade** (operacoes comuns) | 15% sobre lucro liquido | 0,005% sobre valor de venda | Vendas ate R$ 20.000/mes (PF, apenas acoes a vista) |
| **Day Trade** | 20% sobre lucro liquido | 1% sobre lucro da operacao | Nenhuma isencao |

### 1.2 Base de Calculo

A base de calculo do IR e o **lucro liquido** da operacao, definido como:

```
Lucro Liquido = Preco de Venda - Preco de Compra - Custos Operacionais
```

**Custos dedutiveis:**
- Corretagem
- Emolumentos da B3
- Taxa de liquidacao
- Taxa de registro
- ISS sobre corretagem
- IRRF retido na fonte (deduzido do imposto a pagar)

### 1.3 Isencao de R$ 20.000/mes para Pessoa Fisica

**Regras detalhadas:**
- Aplica-se **exclusivamente** a operacoes no mercado a vista de **acoes**
- O limite e sobre o **valor total de vendas** no mes (nao sobre o lucro)
- Se as vendas totais no mes **excederem** R$ 20.000, todo o lucro do mes e tributado a 15%
- **NAO se aplica** a: day trade, opcoes, futuros, ETFs, FIIs, BDRs
- A isencao e por CPF, independentemente do numero de corretoras

**Exemplo de calculo:**

```
Cenario 1 - Isento:
  Vendas no mes: R$ 18.000
  Lucro: R$ 3.000
  IR devido: R$ 0 (vendas < R$ 20.000)

Cenario 2 - Tributado:
  Vendas no mes: R$ 25.000
  Lucro: R$ 5.000
  IR devido: R$ 5.000 x 15% = R$ 750
  IRRF retido: R$ 25.000 x 0,005% = R$ 1,25
  DARF a pagar: R$ 750 - R$ 1,25 = R$ 748,75
```

### 1.4 Prejuizo Acumulado e Compensacao de Perdas

**Regras fundamentais:**

| Regra | Descricao |
|---|---|
| **Separacao obrigatoria** | Prejuizos de day trade so compensam lucros de day trade; prejuizos de swing trade so compensam lucros de swing trade |
| **Sem prazo de validade** | Prejuizos acumulados podem ser carregados indefinidamente para meses/anos futuros |
| **Compensacao total** | Nao ha limite percentual para compensacao (diferente do Lucro Real PJ que tem trava de 30%) |
| **Mercados cruzados** | Perdas em acoes (swing) podem compensar ganhos em opcoes (swing), futuros (swing), etc., desde que ambos sejam swing trade |
| **Registro obrigatorio** | Prejuizos devem ser declarados no IRPF anual para serem compensados futuramente |

**Exemplo de compensacao:**

```
Janeiro/2026:
  Day Trade: Prejuizo de R$ 5.000
  Swing Trade: Lucro de R$ 3.000 (vendas > R$ 20k)

Fevereiro/2026:
  Day Trade: Lucro de R$ 8.000
  Swing Trade: Prejuizo de R$ 2.000

Calculo Fevereiro:
  Day Trade: R$ 8.000 - R$ 5.000 (prejuizo jan) = R$ 3.000 x 20% = R$ 600
  Swing Trade: Sem IR (prejuizo de R$ 2.000 acumula para proximo mes)

  Prejuizo acumulado Swing Trade: R$ 2.000 (carrega para marco)
```

---

## 2. Day Trade vs Swing Trade

### 2.1 Definicao Fiscal

| Criterio | Day Trade | Swing Trade |
|---|---|---|
| **Definicao** | Compra e venda do mesmo ativo, na mesma quantidade, no mesmo dia, pela mesma pessoa, na mesma corretora | Qualquer operacao que nao se enquadre como day trade |
| **Prazo** | Abertura e fechamento no mesmo pregao | Mais de um pregao |
| **Aliquota IR** | 20% | 15% |
| **IRRF** | 1% sobre o lucro liquido | 0,005% sobre o valor de alienacao |
| **Isencao R$ 20k** | NAO se aplica | SIM (apenas acoes a vista) |
| **Codigo DARF** | 6015 | 6015 |
| **Apuracao** | Mensal | Mensal |
| **Compensacao de prejuizo** | Apenas com day trade | Apenas com swing trade (operacoes comuns) |

### 2.2 IRRF - Imposto Retido na Fonte

**Day Trade (1% sobre lucro):**
- Retido automaticamente pela corretora
- Funciona como **antecipacao** do IR devido
- Pode ser compensado no calculo mensal do DARF
- Se IRRF <= R$ 1,00, nao ha retencao
- Se houver prejuizo no dia, nao ha retencao

**Swing Trade (0,005% sobre valor de venda):**
- Retido pela corretora sobre o valor total da alienacao (nao sobre o lucro)
- Valor extremamente pequeno (R$ 0,50 para cada R$ 10.000 vendidos)
- Tambem funciona como antecipacao, deduzido do DARF mensal
- Conhecido como "dedo-duro" - informa a Receita que houve operacao

### 2.3 DARF Mensal

**Prazo de pagamento:** Ultimo dia util do mes seguinte ao da apuracao do ganho

**Exemplo:** Lucro em janeiro/2026 -> DARF vence no ultimo dia util de fevereiro/2026

**Codigo:** 6015 (para ambos: day trade e swing trade de PF)

**Multa por atraso:**
- 0,33% ao dia sobre o valor do imposto, limitado a 20%
- Acrescido de juros pela taxa Selic acumulada

**Geracao do DARF:** Via programa Sicalc da Receita Federal ou diretamente no e-CAC

### 2.4 Declaracao Anual (IRPF)

Na declaracao anual, o investidor deve informar:

| Ficha | Informacao |
|---|---|
| **Bens e Direitos** | Posicao em 31/12 de cada ativo (custo de aquisicao) |
| **Renda Variavel - Operacoes Comuns/Day Trade** | Lucros, prejuizos e IR pago mes a mes |
| **Rendimentos Isentos** | Ganhos em meses com vendas <= R$ 20.000 |
| **Rendimentos Sujeitos a Tributacao Exclusiva** | IRRF retido |

---

## 3. Tributacao por Tipo de Ativo

### 3.1 Tabela Comparativa Geral

| Ativo | Aliquota Swing | Aliquota Day Trade | Isencao R$ 20k | IRRF Swing | IRRF Day Trade | Compensacao |
|---|---|---|---|---|---|---|
| **Acoes** | 15% | 20% | SIM | 0,005% | 1% | Entre mesma modalidade |
| **FIIs** | 20% (ganho capital) | 20% | NAO | 0,005% | 1% | Com FIIs e acoes (swing) |
| **ETFs Renda Variavel** | 15% | 20% | NAO | 0,005% | 1% | Entre mesma modalidade |
| **BDRs** | 15% | 20% | NAO | 0,005% | 1% | Entre mesma modalidade |
| **Opcoes** | 15% | 20% | NAO | 0,005% | 1% | Entre mesma modalidade |
| **Futuros (Mini-indice/Mini-dolar)** | 15% | 20% | NAO | 0,005% | 1% | Entre mesma modalidade |
| **Ouro (ativo financeiro)** | 15% | 20% | SIM (ate R$ 20k) | 0,005% | 1% | Entre mesma modalidade |

### 3.2 Acoes

**Regras principais:**
- Aliquota: 15% (swing), 20% (day trade)
- Isencao para vendas mensais ate R$ 20.000 (apenas acoes a vista em bolsa)
- Preco medio de aquisicao deve ser calculado por ativo (metodo FIFO nao e usado; usa-se custo medio ponderado)
- Bonificacoes, desdobramentos e grupamentos alteram o preco medio
- Dividendos: isentos de IR (ate 2025; a partir de 2026, tributados em 10% se > R$ 50k/mes por fonte pagadora - Lei 15.270/2025)
- JCP (Juros sobre Capital Proprio): 15% retido na fonte (tributacao definitiva)

### 3.3 Fundos de Investimento Imobiliario (FIIs)

**Rendimentos (dividendos de FIIs):**

| Regra | Detalhe |
|---|---|
| **Isencao PF** | Rendimentos distribuidos sao isentos de IR para PF |
| **Requisito 1** | Fundo com no minimo 100 cotistas |
| **Requisito 2** | Cotas negociadas em bolsa ou mercado de balcao organizado |
| **Requisito 3** | Investidor detenha no maximo 10% das cotas |
| **Requisito 4** | Investidor receba no maximo 10% dos rendimentos totais |
| **Requisito 5** | Grupo de cotistas PF vinculados nao ultrapasse 30% do total |

**Ganho de capital na venda de cotas:**
- Aliquota: **20%** sobre o lucro
- NAO ha isencao de R$ 20.000/mes
- IRRF: 0,005% (dedo-duro)
- Prejuizo com FIIs pode compensar lucro com FIIs e vice-versa (swing trade)

**Nota sobre MP 1.303 (caducou):** A MP propunha tributar rendimentos de FIIs em 5% para novas cotas a partir de 2026 e reduzir o ganho de capital para 17,5%. Como a MP caducou, **as regras atuais foram mantidas integralmente**.

### 3.4 ETFs (Exchange Traded Funds)

**ETFs de Renda Variavel (ex: BOVA11, IVVB11):**
- Aliquota: 15% (swing), 20% (day trade)
- **NAO ha isencao de R$ 20.000/mes**
- Dividendos de ETFs: tributados conforme tabela progressiva de IR (ate 27,5%)
- Prejuizos compensam lucros na mesma modalidade

**ETFs de Renda Fixa (ex: IMAB11, IRFM11):**
- Aliquota: 15% sobre ganho de capital (independente do prazo)
- Come-cotas: NAO ha (vantagem tributaria sobre fundos de RF tradicionais)
- Sem IOF

### 3.5 BDRs (Brazilian Depositary Receipts)

- Aliquota: 15% (swing), 20% (day trade)
- **NAO ha isencao de R$ 20.000/mes**
- Dividendos recebidos: tributados conforme tabela progressiva (carnê-leão), com possibilidade de compensar imposto pago no exterior (acordo de bitributacao)
- Operacoes em reais, na B3

### 3.6 Futuros (Mini-indice WIN / Mini-dolar WDO)

**Base de calculo:** Resultado positivo da soma dos ajustes diarios entre a data de abertura e a de encerramento do contrato.

| Item | Detalhe |
|---|---|
| **Aliquota Swing** | 15% |
| **Aliquota Day Trade** | 20% |
| **Isencao** | NAO ha |
| **IRRF Day Trade** | 1% sobre lucro liquido do dia |
| **Base de calculo** | Soma dos ajustes diarios |
| **Compensacao** | Perdas em futuros compensam ganhos em a vista, opcoes, termo (mesma modalidade) |

**Calculo do resultado em minicontratos:**

```
Mini-indice (WIN):
  Valor do ponto: R$ 0,20
  Resultado = (Pontos de saida - Pontos de entrada) x R$ 0,20 x Numero de contratos

Mini-dolar (WDO):
  Valor do ponto: R$ 10,00
  Resultado = (Pontos de saida - Pontos de entrada) x R$ 10,00 x Numero de contratos

Exemplo Day Trade WIN:
  Compra: 128.000 pontos, 5 contratos
  Venda: 128.500 pontos
  Lucro: (128.500 - 128.000) x R$ 0,20 x 5 = R$ 500
  IR: R$ 500 x 20% = R$ 100
  IRRF: R$ 500 x 1% = R$ 5
  DARF: R$ 100 - R$ 5 = R$ 95
```

### 3.7 Renda Fixa

Apos a queda da MP 1.303, **mantem-se a tabela regressiva**:

| Prazo de Aplicacao | Aliquota IR |
|---|---|
| Ate 180 dias | 22,5% |
| De 181 a 360 dias | 20,0% |
| De 361 a 720 dias | 17,5% |
| Acima de 720 dias | 15,0% |

**Produtos isentos para PF:**
- LCI (Letra de Credito Imobiliario)
- LCA (Letra de Credito do Agronegocio)
- CRI (Certificado de Recebiveis Imobiliarios)
- CRA (Certificado de Recebiveis do Agronegocio)
- Debentures incentivadas (Lei 12.431)
- Poupanca

**IOF:** Incide em resgates com menos de 30 dias (tabela regressiva de 96% a 0%)

---

## 4. Operacoes com Opcoes

### 4.1 Regras Gerais de Tributacao

| Situacao | Tratamento Fiscal |
|---|---|
| **Compra e venda antes do vencimento** | Lucro = Preco de venda - Preco de compra - Custos. Aliquota: 15% (swing) ou 20% (day trade) |
| **Opcao vira po (expira sem exercicio)** | Titular: prejuizo = premio pago. Lancador: lucro = premio recebido |
| **Exercicio de Call (titular)** | Premio pago e adicionado ao custo de aquisicao da acao |
| **Exercicio de Call (lancador)** | Premio recebido e adicionado ao preco de venda da acao |
| **Exercicio de Put (titular)** | Premio pago e deduzido do preco de venda da acao |
| **Exercicio de Put (lancador)** | Premio recebido e deduzido do custo de aquisicao da acao |

### 4.2 Isencao e IRRF

- **NAO ha isencao de R$ 20.000/mes** para opcoes (isencao exclusiva do mercado a vista de acoes)
- IRRF: 0,005% (swing) e 1% sobre lucro (day trade)
- Apuracao e recolhimento: mensal, via DARF 6015

### 4.3 Operacoes Estruturadas

As operacoes estruturadas com opcoes possuem tratamento tributario especifico:

**Lancamento Coberto (Covered Call / Financiamento):**
```
Cenario: Possui 1.000 acoes PETR4 a R$ 35,00 e lanca 1.000 calls strike R$ 37,00 por R$ 1,50

Se NAO exercido (opcao vira po):
  Lucro do lancador: 1.000 x R$ 1,50 = R$ 1.500
  IR: R$ 1.500 x 15% = R$ 225

Se exercido:
  Venda das acoes: 1.000 x R$ 37,00 = R$ 37.000
  Custo aquisicao: 1.000 x R$ 35,00 = R$ 35.000
  Premio recebido: R$ 1.500
  Lucro total: R$ 37.000 - R$ 35.000 + R$ 1.500 = R$ 3.500
  IR: R$ 3.500 x 15% = R$ 525
```

**Trava de Alta (Bull Call Spread):**
```
Compra call strike 30 por R$ 3,00 (1.000 opcoes)
Vende call strike 32 por R$ 1,50 (1.000 opcoes)
Custo: (R$ 3,00 - R$ 1,50) x 1.000 = R$ 1.500

Se ambas exercidas:
  Ganho: (R$ 32 - R$ 30) x 1.000 = R$ 2.000
  Lucro: R$ 2.000 - R$ 1.500 = R$ 500
  IR: R$ 500 x 15% = R$ 75
```

**Straddle / Strangle:**
- Tributacao individual de cada perna (call e put)
- Se uma vira po, gera prejuizo; se a outra e exercida, gera lucro/prejuizo
- Compensacao segue as regras gerais (mesma modalidade)

**Collar (Protecao):**
- Combina compra de put protetiva + venda de call coberta
- Cada perna tributada individualmente
- No exercicio, premios ajustam o custo/preco de venda das acoes

### 4.4 Compensacao de Perdas em Opcoes

- Prejuizos em opcoes (swing trade) podem compensar lucros em acoes, futuros, termo (swing trade)
- Prejuizos em opcoes (day trade) so compensam lucros de day trade
- Premio pago por opcao que virou po = prejuizo compensavel
- Sem prazo de validade para compensacao

---

## 5. Custos da B3

### 5.1 Tarifas de Acoes e Fundos (Mercado a Vista)

#### Operacoes Normais (Swing Trade)

Baseado no ADTV (Volume Medio Diario Negociado) mensal do investidor:

| Faixa ADTV | Negociacao | Liquidacao (CCP) | Registro (TTA) | **Total** |
|---|---|---|---|---|
| R$ 0 a R$ 3 milhoes | 0,00500% | 0,02240% | 0,00260% | **0,03000%** |
| Acima de R$ 3 milhoes | 0,00375% | 0,01615% | 0,00260% | **0,02250%** |

#### Operacoes Day Trade

| Faixa ADTV Day Trade | Negociacao | Liquidacao (CCP) | Registro (TTA) | **Total** |
|---|---|---|---|---|
| R$ 0 a R$ 200 mil | 0,00500% | 0,01540% | 0,00260% | **0,02300%** |
| R$ 200 mil a R$ 1 milhao | 0,00475% | 0,01450% | 0,00260% | **0,02185%** |
| R$ 1 milhao a R$ 5 milhoes | 0,00400% | 0,01265% | 0,00260% | **0,01925%** |
| R$ 5 milhoes a R$ 25 milhoes | 0,00375% | 0,01175% | 0,00260% | **0,01810%** |
| R$ 25 milhoes a R$ 50 milhoes | 0,00350% | 0,01090% | 0,00260% | **0,01700%** |
| R$ 50 milhoes a R$ 250 milhoes | 0,00325% | 0,01000% | 0,00260% | **0,01585%** |
| R$ 250 milhoes a R$ 750 milhoes | 0,00300% | 0,00960% | 0,00260% | **0,01520%** |
| Acima de R$ 750 milhoes | 0,00250% | 0,00900% | 0,00260% | **0,01410%** |

#### Leiloes de Abertura/Fechamento
- Taxa de negociacao: 0,007% (se nao classificada como day trade)

### 5.2 Tarifas de Derivativos (Futuros e Opcoes)

**Minicontratos Futuros (WIN, WDO):**

As tarifas de minicontratos sao cobradas **por contrato** e variam conforme o tipo:

| Contrato | Tipo | Tarifa Aproximada por Contrato (Normal) | Tarifa Day Trade |
|---|---|---|---|
| **WIN** (Mini-indice) | Futuro | ~R$ 0,32/contrato | ~R$ 0,16/contrato |
| **WDO** (Mini-dolar) | Futuro | ~R$ 0,82/contrato | ~R$ 0,41/contrato |
| **IND** (Indice cheio) | Futuro | ~R$ 1,60/contrato | ~R$ 0,80/contrato |
| **DOL** (Dolar cheio) | Futuro | ~R$ 4,09/contrato | ~R$ 2,05/contrato |

*Nota: Valores aproximados. Consultar tabela oficial da B3 para valores exatos e atualizados.*

**Opcoes sobre Acoes:**
- Emolumentos: calculados como percentual do volume financeiro
- Taxa de registro: cobrada por contrato
- Variam conforme o tipo de operacao (compra/venda, exercicio)

### 5.3 ISS (Imposto Sobre Servicos)

- Incide sobre a corretagem cobrada pela corretora
- Aliquota: varia de 2% a 5% dependendo do municipio
- Em Sao Paulo: 5%
- Ja incluso nas tarifas da B3 (PIS/COFINS de 9,25% + ISS)

### 5.4 Exemplo Completo de Custos

```
Operacao Day Trade em acoes (investidor varejo, ADTV < R$ 200k):

Compra: 1.000 acoes VALE3 a R$ 60,00 = R$ 60.000
Venda:  1.000 acoes VALE3 a R$ 61,00 = R$ 61.000

Custos B3 (compra + venda):
  Total negociado: R$ 121.000
  Taxa B3 (0,023%): R$ 121.000 x 0,023% = R$ 27,83

Corretagem: R$ 0 (corretagem zero via RLP)

ISS sobre corretagem: R$ 0

Lucro bruto: R$ 1.000
Lucro liquido: R$ 1.000 - R$ 27,83 = R$ 972,17

IR (20% day trade): R$ 972,17 x 20% = R$ 194,43
IRRF (1% sobre lucro): R$ 972,17 x 1% = R$ 9,72
DARF a pagar: R$ 194,43 - R$ 9,72 = R$ 184,71

Custo total: R$ 27,83 + R$ 194,43 = R$ 222,26 (22,2% do lucro bruto)
Lucro final liquido: R$ 1.000 - R$ 222,26 = R$ 777,74
```

---

## 6. Custos de Corretagem e RLP

### 6.1 Corretagem Zero

A maioria das grandes corretoras brasileiras oferece **corretagem zero** para operacoes de varejo em renda variavel:

| Corretora | Corretagem Acoes | Corretagem Futuros | Condicao |
|---|---|---|---|
| Clear (XP) | Zero | Zero | Adesao ao RLP |
| Rico (XP) | Zero | Zero | Adesao ao RLP |
| XP Investimentos | Zero (home broker) | Zero | Adesao ao RLP |
| Inter | Zero | Zero | Adesao ao RLP |
| Nubank / NuInvest | Zero | Zero | Adesao ao RLP |
| Toro | Zero | Zero | Adesao ao RLP |
| Genial | Zero | Zero | Adesao ao RLP |
| Agora (Bradesco) | Zero | Zero | Adesao ao RLP |
| BTG Pactual | Zero (acoes) | Variavel | Parcial |

### 6.2 RLP (Retail Liquidity Provider)

**O que e:**
O RLP e um mecanismo aprovado pela CVM e B3 que permite que a corretora (ou participante contratado) seja a **contraparte** das ordens de compra e venda de seus clientes de varejo em minicontratos (WIN e WDO) e acoes.

**Como funciona:**
1. Cliente envia ordem de compra/venda
2. A corretora pode oferecer contrapartida antes de enviar ao livro de ofertas
3. Se a corretora oferece preco igual ou melhor, a ordem e executada contra a corretora
4. Se nao, a ordem vai para o livro de ofertas normalmente

**Vantagens:**
- Corretagem zero para o investidor
- Maior liquidez
- Execucao potencialmente mais rapida

**Riscos e custos ocultos:**

| Custo Oculto | Descricao |
|---|---|
| **Spread** | A corretora pode executar a ordem a um preco ligeiramente menos favoravel (dentro do spread bid-ask) |
| **Conflito de interesses** | A corretora e contraparte do cliente, podendo ter incentivos contrarios |
| **Float** | Corretora rentabiliza o dinheiro parado na conta do investidor |
| **Rebate** | Comissoes recebidas pela distribuicao de produtos |
| **Zeragem compulsoria** | Cobranca por contrato em caso de zeragem por risco |
| **Slippage** | Possivel execucao a precos menos favoraveis em alta volatilidade |

**Regulamentacao atualizada (Nov/2025):**
Em 30/09/2025 foram estabelecidas novas diretrizes para o RLP (vigencia a partir de 03/11/2025), com foco em maior **transparencia** e melhor gestao de **riscos**.

### 6.3 Custos para o Bot

Para um bot automatizado, os custos relevantes sao:

```
Custos fixos por operacao:
  - Taxas B3: 0,023% a 0,030% do volume (varia com ADTV)
  - Corretagem: R$ 0 (com RLP)

Custos variaveis:
  - Spread bid-ask: variavel (0,01% a 0,10% dependendo da liquidez)
  - Slippage: variavel (impacto de mercado em ordens grandes)
  - IR: 15% ou 20% sobre lucro liquido

Para 1.000 operacoes/mes de R$ 10.000 cada (day trade):
  Volume total: R$ 10.000.000
  Taxas B3: R$ 10.000.000 x 0,023% = R$ 2.300
  Spread estimado (0,03%): R$ 3.000
  Total custos operacionais: ~R$ 5.300/mes (sem IR)
```

---

## 7. Pessoa Juridica - Trading como PJ

### 7.1 Comparativo PF vs PJ

| Aspecto | Pessoa Fisica | Lucro Presumido | Lucro Real | Simples Nacional |
|---|---|---|---|---|
| **Aliquota sobre ganhos em bolsa** | 15% (swing) / 20% (DT) | ~24% a 34% (IRPJ + CSLL + adicional) | ~34% (IRPJ + CSLL) | Mesmas regras da PF (15%/20%) |
| **Isencao R$ 20k/mes** | SIM (acoes a vista) | NAO | NAO | NAO |
| **Compensacao de prejuizos** | Ilimitada, sem prazo | N/A (nao ha base negativa) | Limitada a 30% do lucro/periodo | Mesmas regras PF |
| **Dividendos recebidos** | Isentos (ate R$50k/mes a partir 2026) | Isentos entre PJs | Isentos entre PJs | Isentos |
| **FIIs - rendimentos** | Isentos (com requisitos) | Tributados | Tributados | Tributados |
| **Complexidade** | Baixa | Media | Alta | Media |

### 7.2 Lucro Presumido

**Tributacao sobre investimentos:**
- IRPJ: 15% sobre o resultado financeiro
- CSLL: 9% sobre o resultado financeiro
- Adicional IRPJ: 10% sobre lucro que exceder R$ 60.000/trimestre
- **Carga total: 24% a 34%**

**Vantagens:**
- Possibilidade de deduzir despesas operacionais (infraestrutura, dados de mercado, etc.)
- Planejamento sucessorio facilitado
- Separacao patrimonial

**Desvantagens:**
- Carga tributaria geralmente maior que PF
- Perda da isencao de R$ 20k/mes
- Perda da isencao de rendimentos de FIIs
- Custos de manutencao (contabilidade, DCTF, ECD, ECF)

### 7.3 Lucro Real

**Tributacao:**
- IRPJ: 15% + adicional de 10% (lucro > R$ 20k/mes)
- CSLL: 9%
- **Carga efetiva: ~34%**

**Vantagem principal:** Compensacao de prejuizos fiscais (limitada a 30% do lucro do periodo)

**Quando faz sentido:**
- Operacoes de altissimo volume
- Muitas despesas operacionais dedutiveis
- Estrutura corporativa complexa
- Estrategias com alto indice de perdas compensaveis

### 7.4 Simples Nacional

**Restricoes importantes:**
- A Lei Complementar 123/2006, art. 3, par. 4, inciso VII, proibe empresas do Simples de **participar do capital** de outra PJ
- Investimentos especulativos em bolsa podem ser tratados como aplicacao financeira
- Tributacao segue as mesmas regras de PF (15%/20%)
- **NAO e indicado** para atividade de trading como objeto social

### 7.5 Holding Patrimonial

**CNAE:** 6462-0/00 (Holding de instituicoes nao financeiras)

| Aspecto | Detalhe |
|---|---|
| **Regime tributario** | Lucro Presumido ou Lucro Real (NAO pode ser Simples) |
| **Vantagem imobiliaria** | Aluguel: 11,33% (PJ) vs ate 27,5% (PF) |
| **Vantagem ganho de capital imoveis** | 5,93% (PJ) vs 15% (PF) |
| **Investimentos financeiros** | Geralmente DESVANTAJOSO vs PF |
| **Uso recomendado** | Gestao patrimonial ampla (imoveis + investimentos), nao apenas trading |

### 7.6 Recomendacao para o Bot

Para um bot de investimentos automatizado operando para **pessoa fisica**:
- A tributacao como PF e geralmente **mais vantajosa** para operacoes em bolsa
- A isencao de R$ 20k/mes e significativa para swing trade
- A isencao de rendimentos de FIIs e relevante
- A compensacao ilimitada de prejuizos (sem trava de 30%) e uma grande vantagem

**Excecao:** Se o volume operacional justificar a abertura de PJ para deduzir custos significativos de infraestrutura, dados e desenvolvimento.

---

## 8. Fundos de Investimento

### 8.1 Come-Cotas

**Mecanismo:** Antecipacao semestral de IR que ocorre nos meses de **maio e novembro** (ultimos dias uteis).

| Tipo de Fundo | Aliquota Come-Cotas | Aliquota no Resgate |
|---|---|---|
| **Fundo de Curto Prazo** (carteira < 365 dias) | 20% | 22,5% (ate 180d) ou 20% (acima 180d) |
| **Fundo de Longo Prazo** (carteira > 365 dias) | 15% | Tabela regressiva: 22,5% a 15% |
| **Fundo de Acoes** (min 67% em acoes) | NAO tem come-cotas | 15% no resgate |
| **ETFs** | NAO tem come-cotas | 15% (RV) ou 15% (RF) |
| **FIIs** | NAO tem come-cotas | 20% (ganho capital) |

**Impacto do come-cotas:**
- Reduz a quantidade de cotas do investidor semestralmente
- Diminui o efeito de juros compostos no longo prazo
- No resgate, o IR ja pago via come-cotas e compensado

### 8.2 IOF (Imposto sobre Operacoes Financeiras)

Incide em resgates de fundos com menos de 30 dias:

| Dia | IOF | Dia | IOF | Dia | IOF |
|---|---|---|---|---|---|
| 1 | 96% | 11 | 63% | 21 | 30% |
| 2 | 93% | 12 | 60% | 22 | 26% |
| 3 | 90% | 13 | 56% | 23 | 23% |
| 4 | 86% | 14 | 53% | 24 | 20% |
| 5 | 83% | 15 | 50% | 25 | 16% |
| 6 | 80% | 16 | 46% | 26 | 13% |
| 7 | 76% | 17 | 43% | 27 | 10% |
| 8 | 73% | 18 | 40% | 28 | 6% |
| 9 | 70% | 19 | 36% | 29 | 3% |
| 10 | 66% | 20 | 33% | 30 | 0% |

### 8.3 Fundos Exclusivos

**Lei 14.754/2023:** A partir de 2024, fundos exclusivos (para investidores qualificados com patrimonio acima de R$ 10 milhoes) passaram a ter come-cotas, eliminando parte do diferimento tributario que tinham.

**Tributacao:**
- Come-cotas semestral: 15% (longo prazo) ou 20% (curto prazo)
- Estoque de rendimentos acumulados ate 2023: tributados a 15% (ou 8% para pagamento antecipado em 4 parcelas)

### 8.4 FIP (Fundo de Investimento em Participacoes)

- PF com menos de 40% das cotas: aliquota de **15%** sobre ganhos
- PF com 40% ou mais: aliquota de **25%**
- Sem come-cotas
- Estrutura utilizada para private equity e venture capital

### 8.5 FIM (Fundo de Investimento Multimercado)

- Come-cotas: 15% (longo prazo) semestral
- Resgate: tabela regressiva de 22,5% a 15%
- Compensacao: perdas em fundos podem compensar ganhos em outros fundos da mesma classificacao tributaria

---

## 9. Criptomoedas

### 9.1 Tributacao Atual (2026)

Com a queda da MP 1.303, **mantem-se as regras anteriores:**

| Faixa de Alienacao Mensal | Aliquota |
|---|---|
| Ate R$ 35.000 em vendas/mes | **Isento** |
| Lucro ate R$ 5 milhoes | 15% |
| Lucro de R$ 5M a R$ 10M | 17,5% |
| Lucro de R$ 10M a R$ 30M | 20% |
| Lucro acima de R$ 30M | 22,5% |

**Nota:** A MP 1.303 propunha aliquota unica de 17,5% e eliminacao da isencao. Como caducou, a isencao de R$ 35k/mes e as aliquotas progressivas foram mantidas.

### 9.2 IN RFB 1.888/2019 e DeCripto

**IN RFB 1.888/2019 (vigente ate 30/06/2026):**
- Obrigatoriedade de declarar operacoes com criptoativos
- Exchanges brasileiras: reportam automaticamente a Receita
- Exchanges estrangeiras: investidor declara se operacoes mensais > R$ 30.000

**IN RFB 2.291/2025 - DeCripto (vigente a partir de 01/07/2026):**
- Substitui a IN 1.888/2019
- Nova Declaracao de Criptoativos (DeCripto)
- Limite atualizado: R$ 35.000/mes (antes R$ 30.000)
- Padrão internacional CARF (Crypto-Asset Reporting Framework) da OCDE
- Novas operacoes declaraveis: staking, mineracao, airdrops, emprestimos lastreados
- Envio mensal via e-CAC a partir de julho/2026

### 9.3 Calculo do IR em Criptomoedas

```
Exemplo:
  Compra de 1 BTC por R$ 500.000 em janeiro
  Venda de 0,5 BTC por R$ 300.000 em fevereiro

  Custo medio: R$ 500.000 / 1 = R$ 500.000/BTC
  Custo de 0,5 BTC: R$ 250.000
  Lucro: R$ 300.000 - R$ 250.000 = R$ 50.000
  Vendas no mes: R$ 300.000 (acima de R$ 35.000)

  IR: R$ 50.000 x 15% = R$ 7.500
  DARF codigo: 4600
  Prazo: ultimo dia util do mes seguinte
```

### 9.4 Operacoes entre Criptomoedas

A **permuta** entre criptoativos (ex: trocar BTC por ETH) **e fato gerador de IR** se houver lucro. O valor de mercado no momento da troca e utilizado como referencia.

---

## 10. Otimizacao Fiscal

### 10.1 Tax Loss Harvesting no Brasil

**Conceito:** Realizar prejuizos estrategicamente para compensar ganhos tributaveis.

**Regras brasileiras que viabilizam a estrategia:**

| Regra | Aplicacao |
|---|---|
| Prejuizos nao expiram | Acumular prejuizos para uso futuro ilimitado |
| Compensacao mensal | Usar prejuizo acumulado no mes seguinte |
| Sem wash sale rule formal | No Brasil, nao existe regra explicita de "wash sale" como nos EUA |
| Separacao DT/ST | Gerenciar dois "baldes" de prejuizo separadamente |

**Estrategia para o bot:**

```python
# Pseudocodigo de Tax Loss Harvesting
def verificar_tax_loss_harvesting(portfolio, prejuizo_acumulado_swing, prejuizo_acumulado_dt):
    for posicao in portfolio:
        if posicao.lucro_nao_realizado < 0:
            # Posicao com prejuizo latente
            if estrategia_deseja_manter(posicao):
                # Vender para realizar prejuizo, recomprar apos (sem wash sale rule)
                vender(posicao)
                aguardar(1_dia)  # Prudencia, embora nao obrigatorio
                recomprar(posicao)
                prejuizo_acumulado_swing += abs(posicao.lucro_nao_realizado)

    # Verificar se ha lucros a realizar compensados pelo prejuizo
    for posicao in portfolio:
        if posicao.lucro_nao_realizado > 0:
            if prejuizo_acumulado_swing >= posicao.lucro_nao_realizado:
                # Realizar lucro isento de IR (compensado pelo prejuizo)
                vender(posicao)
```

### 10.2 Gestao da Isencao de R$ 20.000/mes

**Estrategia para o bot (swing trade em acoes):**

```python
def gerenciar_isencao_20k(vendas_mes_atual, ordem_pendente):
    limite_isencao = 20000
    vendas_projetadas = vendas_mes_atual + ordem_pendente.valor_venda

    if vendas_projetadas > limite_isencao:
        # Verificar se vale a pena esperar o proximo mes
        lucro_potencial = ordem_pendente.lucro_estimado
        ir_a_pagar = lucro_potencial * 0.15

        if ir_a_pagar > custo_de_esperar:
            # Adiar venda para proximo mes
            return "ADIAR"
        else:
            return "EXECUTAR"
    else:
        return "EXECUTAR"  # Dentro da isencao
```

### 10.3 Timing de Realizacao de Ganhos

**Estrategias legais:**

1. **Fracionar vendas entre meses:** Manter vendas de acoes abaixo de R$ 20k/mes
2. **Realizar prejuizos antes de lucros:** Vender posicoes perdedoras antes de vender posicoes vencedoras no mesmo mes
3. **Separar operacoes DT e ST:** Manter registros separados para maximizar compensacoes
4. **Antecipar prejuizos em dezembro:** Realizar perdas latentes para declarar no IRPF anual
5. **Postergar lucros em acoes:** Se vendas do mes estao proximas de R$ 20k, adiar para o proximo mes

### 10.4 Planejamento Tributario Legal

**ATENCAO:** Planejamento tributario (elisao fiscal) e legal. Sonegacao (evasao fiscal) e crime. O bot deve operar estritamente dentro da legalidade.

**Estrategias permitidas:**
- Escolha do momento de venda para otimizar tributacao
- Uso da isencao de R$ 20k/mes
- Compensacao de prejuizos acumulados
- Escolha entre PF e PJ conforme perfil
- Tax loss harvesting (sem manipulacao artificial)

**Praticas proibidas:**
- Simular operacoes para gerar prejuizo artificial
- Omitir operacoes da Receita Federal
- Usar laranjas ou contas de terceiros
- Manipular precos para alterar base de calculo

---

## 11. Automacao Fiscal

### 11.1 Ferramentas Disponiveis

| Ferramenta | Tipo | Funcionalidades | Custo | API/Integracao |
|---|---|---|---|---|
| **ReVar** (Receita + B3) | Oficial/Gratuita | Calculo de IR de RV com dados pre-preenchidos da B3 | Gratuito | Nao (interface web) |
| **Grana Capital** | Fintech/Paga | IR de acoes, FIIs, BDRs, ETFs, opcoes, futuros, DARF automatico | A partir de R$ 19,90/mes | Integracao via B3 |
| **Bussola do Investidor** | Plataforma/Freemium | Calculadora de IR, historico, DARF | Gratuito (basico) | Limitada |
| **MyCapital** | Fintech/Paga | Calculo automatico com dados da B3 (a partir de 2020) | Pago | Integracao B3 |
| **Akeloo** | Fintech/Paga | B3, Cripto, EUA, DARF, declaracao | Pago | Integracao B3 |
| **myProfit** | Fintech/Paga | Apuracao mensal, DARF, relatorios | Pago | Integracao B3 |
| **IRPFBolsa** | Software/Pago | Calculo de IR, gerenciamento de carteira | Pago | Manual (upload de notas) |

### 11.2 APIs Disponiveis

**B3 - Area do Investidor (APIs oficiais):**

A B3 disponibiliza APIs para integracao tecnologica:

| API | Funcionalidade | Acesso |
|---|---|---|
| **Extratos de Movimentacao** | Historico de operacoes do investidor | Via parceiros autorizados |
| **Posicao de Custodia** | Posicao atual em ativos | Via parceiros autorizados |
| **Eventos Corporativos** | Dividendos, bonificacoes, desdobramentos | Publico/parceiros |
| **Dados de Mercado** | Cotacoes e informacoes de ativos | Comercial |

**brapi.dev:**
- API gratuita/paga de dados da bolsa brasileira
- Cotacoes, historico, dividendos
- Nao calcula IR diretamente

**Projeto open-source (GitHub - guilhermecgs/ir):**
- Calculo automatico de IR a partir de dados do CEI (Canal Eletronico do Investidor)
- Python, web scraping
- Acoes, FIIs, ETFs

### 11.3 Arquitetura de Automacao Fiscal para o Bot

```
+------------------+     +-------------------+     +------------------+
|   BOT DE TRADING |     |  MODULO FISCAL    |     |   SAIDAS         |
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
| Ordem executada  +---->+ Registrar operacao|     | DARF mensal      |
|                  |     | Calcular PM       +---->+ (codigo 6015)    |
| Dados da B3/     +---->+ Classificar DT/ST |     |                  |
| corretora        |     | Deduzir custos    |     | Relatorio mensal |
|                  |     | Verificar isencao +---->+ de operacoes     |
| Configuracao     +---->+ Compensar prejuizo|     |                  |
| (PF/PJ, limites) |     | Calcular IR       |     | Dados para IRPF  |
|                  |     | Gerar DARF        +---->+ anual            |
+------------------+     +-------------------+     +------------------+
                                |
                                v
                    +-------------------+
                    | BASE DE DADOS     |
                    +-------------------+
                    | - Operacoes       |
                    | - Preco medio     |
                    | - Prejuizo acum.  |
                    |   (DT e ST separ.)|
                    | - IR pago         |
                    | - IRRF retido     |
                    +-------------------+
```

### 11.4 Dados Necessarios para Calculo Automatico

| Dado | Fonte | Uso |
|---|---|---|
| Data/hora da operacao | Nota de corretagem / API corretora | Classificar DT vs ST |
| Ativo negociado | Nota de corretagem | Identificar tipo (acao, FII, ETF, etc.) |
| Quantidade | Nota de corretagem | Calcular preco medio |
| Preco unitario | Nota de corretagem | Calcular lucro/prejuizo |
| Taxas B3 | Nota de corretagem | Deduzir da base de calculo |
| Corretagem | Nota de corretagem | Deduzir da base de calculo |
| ISS | Nota de corretagem | Deduzir da base de calculo |
| IRRF | Nota de corretagem | Compensar no DARF |
| Eventos corporativos | B3 / API de dados | Ajustar preco medio |

---

## 12. Implicacoes para o Bot

### 12.1 Funcionalidades Obrigatorias do Modulo Fiscal

O bot de investimentos **deve** implementar:

1. **Registro de todas as operacoes** com dados completos (data, hora, ativo, quantidade, preco, custos)
2. **Classificacao automatica** Day Trade vs Swing Trade
3. **Calculo de preco medio** ponderado por ativo (metodo custo medio)
4. **Apuracao mensal de IR** separada para DT e ST
5. **Controle de prejuizo acumulado** (dois saldos: DT e ST)
6. **Verificacao de isencao** de R$ 20k/mes (apenas acoes a vista, swing trade)
7. **Geracao de DARF** quando houver IR a pagar
8. **Relatorios para IRPF anual** (todas as fichas necessarias)

### 12.2 Logica de Decisao Fiscal

```python
class ModuloFiscal:
    def __init__(self):
        self.prejuizo_acum_dt = 0.0
        self.prejuizo_acum_st = 0.0
        self.vendas_mes_acoes_vista = 0.0
        self.lucro_mes_dt = 0.0
        self.lucro_mes_st = 0.0
        self.irrf_mes = 0.0
        self.operacoes_mes = []
        self.precos_medios = {}  # {ticker: preco_medio}

    def registrar_operacao(self, op):
        """Registra operacao e atualiza preco medio."""
        self.operacoes_mes.append(op)

        if op.tipo == 'COMPRA':
            self.atualizar_preco_medio(op)
        elif op.tipo == 'VENDA':
            lucro = self.calcular_lucro(op)

            if op.is_day_trade:
                self.lucro_mes_dt += lucro
                self.irrf_mes += max(lucro * 0.01, 0)  # 1% sobre lucro DT
            else:
                self.lucro_mes_st += lucro
                if op.ativo_tipo == 'ACAO':
                    self.vendas_mes_acoes_vista += op.valor_total
                self.irrf_mes += op.valor_total * 0.00005  # 0,005%

    def apurar_ir_mensal(self):
        """Apuracao mensal de IR."""
        resultado = {}

        # Day Trade
        base_dt = self.lucro_mes_dt - self.prejuizo_acum_dt
        if base_dt > 0:
            resultado['ir_dt'] = base_dt * 0.20
            self.prejuizo_acum_dt = 0
        else:
            self.prejuizo_acum_dt = abs(base_dt)
            resultado['ir_dt'] = 0

        # Swing Trade
        # Verificar isencao para acoes a vista
        isento_acoes = self.vendas_mes_acoes_vista <= 20000

        lucro_st_tributavel = self.lucro_mes_st
        if isento_acoes:
            lucro_st_tributavel -= self.lucro_acoes_vista_mes  # Remove lucro isento

        base_st = lucro_st_tributavel - self.prejuizo_acum_st
        if base_st > 0:
            resultado['ir_st'] = base_st * 0.15
            self.prejuizo_acum_st = 0
        else:
            self.prejuizo_acum_st = abs(base_st)
            resultado['ir_st'] = 0

        # Total
        ir_total = resultado['ir_dt'] + resultado['ir_st']
        darf = max(ir_total - self.irrf_mes, 0)

        resultado['ir_total'] = ir_total
        resultado['irrf_compensado'] = min(self.irrf_mes, ir_total)
        resultado['darf_a_pagar'] = darf

        return resultado
```

### 12.3 Tabela de Decisao para o Bot

| Situacao | Acao do Bot | Motivo |
|---|---|---|
| Vendas de acoes no mes proximo de R$ 20k | Considerar adiar venda para proximo mes | Preservar isencao |
| Prejuizo acumulado alto (ST) | Priorizar realizacao de lucros ST | Compensar sem IR |
| Prejuizo acumulado alto (DT) | Priorizar realizacao de lucros DT | Compensar sem IR |
| Posicao com prejuizo latente | Considerar tax loss harvesting | Gerar prejuizo compensavel |
| Final de ano (dezembro) | Revisar posicoes para otimizacao fiscal | Preparar para IRPF |
| Lucro DT no dia | Calcular IRRF de 1% | Controle de fluxo de caixa |
| Operacao em FII | NAO considerar isencao R$ 20k | Regra diferente de acoes |
| Operacao em ETF | NAO considerar isencao R$ 20k | Regra diferente de acoes |
| Operacao em opcoes | NAO considerar isencao R$ 20k | Regra diferente de acoes |

### 12.4 Estimativa de Impacto Fiscal nos Retornos

```
Cenario: Bot com retorno bruto de 2% ao mes

Swing Trade (sem isencao):
  Retorno bruto: 2,00%
  Custos B3: -0,03%
  IR (15%): -0,30%
  Retorno liquido: ~1,67%
  Impacto fiscal: -16,5% do retorno bruto

Day Trade:
  Retorno bruto: 2,00%
  Custos B3: -0,023%
  IR (20%): -0,40%
  Retorno liquido: ~1,58%
  Impacto fiscal: -21,2% do retorno bruto

Swing Trade (com isencao R$ 20k):
  Retorno bruto: 2,00%
  Custos B3: -0,03%
  IR: 0% (vendas < R$ 20k)
  Retorno liquido: ~1,97%
  Impacto fiscal: -1,5% do retorno bruto (apenas custos B3)
```

---

## 13. Referencias

### Fontes Oficiais e Legislacao

| # | Titulo | Tipo | URL |
|---|---|---|---|
| 1 | Lei 15.270/2025 - Tributacao de Dividendos e IRPF Minimo | Legislacao Federal | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm |
| 2 | MPV 1303/2025 - Tramitacao no Congresso Nacional | Legislacao Federal | https://www.congressonacional.leg.br/materias/medidas-provisorias/-/mpv/169059 |
| 3 | MP sobre tributacao de investimentos e retirada de pauta - Camara dos Deputados | Portal Oficial | https://www.camara.leg.br/noticias/1209479-MP-SOBRE-TRIBUTACAO-DE-INVESTIMENTOS-E-RETIRADA-DE-PAUTA-E-PERDE-A-VALIDADE |
| 4 | Tarifas de Acoes e Fundos de Investimento - B3 | Portal B3 | https://www.b3.com.br/pt_br/produtos-e-servicos/tarifas/listados-a-vista-e-derivativos/renda-variavel/tarifas-de-acoes-e-fundos-de-investimento/a-vista/ |
| 5 | IN RFB 1.888/2019 - Declaracao de Criptoativos | Instrucao Normativa RFB | https://www.legisweb.com.br/legislacao/?id=377332 |
| 6 | Receita Federal atualiza regulamentacao de criptoativos (DeCripto) | Ministerio da Fazenda | https://www.gov.br/fazenda/pt-br/assuntos/noticias/2025/novembro/receita-federal-atualiza-regulamentacao-de-criptoativos-para-adapta-la-ao-padrao-internacional |
| 7 | Declarar operacoes com criptoativos - Gov.br | Portal Gov.br | https://www.gov.br/pt-br/servicos/declarar-operacoes-com-criptoativos |
| 8 | Receita Federal e B3 anunciam calculadora ReVar | Receita Federal | https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2024/dezembro/receita-federal-e-b3-anunciam-ferramenta-inedita-para-calcular-imposto-de-renda |
| 9 | APIs da Area do Investidor - B3 | Portal B3 | https://www.b3.com.br/pt_br/produtos-e-servicos/central-depositaria/canal-com-investidores/integracoes-da-area-do-investidor-apis/ |
| 10 | B3 Developers - APIs | Portal B3 | https://developers.b3.com.br/apis |
| 11 | Oferta RLP - Regras e Parametros - B3 | Portal B3 | https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/regras-e-parametros-de-negociacao/oferta-retail-liquidity-provider-rlp/ |
| 12 | Lei 14.754/2023 - Tributacao de Fundos Exclusivos | Legislacao Federal | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14754.htm |

### Analises e Guias Especializados

| # | Titulo | Autor/Fonte | Ano | Tipo | URL |
|---|---|---|---|---|---|
| 13 | Brazil publishes Provisional Measure affecting financial and capital markets taxation | EY Global | 2025 | Tax Alert | https://www.ey.com/en_gl/technical/tax-alerts/brazil-publishes-provisional-measure-affecting-financial-and-capital-markets-taxation |
| 14 | Brazil enacts Law 15,270/2025 - Dividends taxation | Trench Rossi Watanabe | 2025 | Legal Alert | https://www.trenchrossi.com/en/legal-alerts/brazil-enacts-law-15270-2025-which-taxes-dividends-and-amend-personal-income-tax-rules/ |
| 15 | Expiration of MP 1,303: How Will Financial Investments Be Taxed Now? | LBM Advogados | 2025 | Artigo Juridico | https://lbm-legal.com.br/en/information/expiration-of-mp-1303-how-will-financial-investments-be-taxed-now/ |
| 16 | Implodindo a pinguela fiscal: a queda da MP 1303/2025 | IBRE/FGV | 2025 | Analise Economica | https://portalibre.fgv.br/noticias/implodindo-pinguela-fiscal-queda-da-mp-13032025 |
| 17 | Tributacao sobre renda variavel: PF e PJ | ADVISER Auditores | 2025 | Guia Tributario | https://adviserbr.com.br/blog/tributacao-sobre-renda-variavel-pf-pj/ |
| 18 | Saiba como tributar ganhos em acoes na PF e PJ | Exatus Assessoria | 2025 | Guia Tributario | https://exatusassessoria.com.br/saiba-como-tributar-ganhos-em-acoes-na-pessoa-fisica-e-juridica/ |
| 19 | Tributacao de opcoes: como funciona e como declarar | Suno Research | 2025 | Guia Educacional | https://www.suno.com.br/artigos/tributacao-de-opcoes/ |
| 20 | Compensacao de Prejuizos em Bolsa de Valores - Guia Completo | Contador Jose Aparecido | 2025 | Guia Contabil | https://contadorjoseaparecido.com/compensacao-de-prejuizos-em-bolsa-de-valores-o-guia-completo-para-o-investidor-que-nao-quer-pagar-imposto-indevido-e-evitar-multas-da-receita-federal/ |
| 21 | Compensacao de Prejuizos - A arte de pagar menos impostos | InfoMoney | 2025 | Artigo | https://www.infomoney.com.br/colunistas/aqui-nao-leao/compensacao-de-prejuizos-a-arte-de-pagar-menos-impostos/ |
| 22 | MP 1.303 cai no Congresso: como fica a tributacao | InfoMoney | 2025 | Artigo | https://www.infomoney.com.br/minhas-financas/mp-1-303-cai-no-congresso-veja-como-fica-a-tributacao-dos-investimentos-agora/ |
| 23 | Com derrubada de MP, veja como fica a tributacao dos investimentos | Bora Investir (B3) | 2025 | Artigo | https://borainvestir.b3.com.br/noticias/camara-retira-de-pauta-mp-alternativa-ao-iof-que-perde-validade/ |

### Ferramentas e Plataformas

| # | Titulo | Tipo | URL |
|---|---|---|---|
| 24 | Grana Capital - Calculadora de IR automatizada | Fintech | https://grana.capital/ |
| 25 | Bussola do Investidor - Calculadora de IR | Plataforma | https://www.bussoladoinvestidor.com.br/calculadora-de-ir/ |
| 26 | MyCapital - Calculadora de IR sobre renda variavel | Fintech | https://www.mycapital.com.br/ |
| 27 | Akeloo - Calculadora de IR para B3, Cripto e EUA | Fintech | https://akeloo.com.br/ |
| 28 | myProfit - Apuracao de IR | Fintech | https://lp.myprofitweb.com/ |
| 29 | IRPFBolsa - Gerenciamento de carteira e calculo de IR | Software | https://www.irpfbolsa.com.br/ |
| 30 | brapi - API de acoes da bolsa brasileira | API | https://brapi.dev/ |
| 31 | GitHub - guilhermecgs/ir - Calculo automatico de IR (open source) | Open Source | https://github.com/guilhermecgs/ir |

### Portais Educacionais

| # | Titulo | Fonte | URL |
|---|---|---|---|
| 32 | Como declarar acoes no Imposto de Renda 2025 | InfoMoney | https://www.infomoney.com.br/guias/declarar-acoes-imposto-de-renda-ir/ |
| 33 | Tributacao em Renda Variavel | NuInvest | https://www.nuinvest.com.br/tributacao-de-renda-variavel.html |
| 34 | Day Trade no Imposto de Renda: como declarar | XP Investimentos | https://conteudos.xpi.com.br/aprenda-a-investir/relatorios/day-trade-no-imposto-de-renda/ |
| 35 | Como declarar Day Trade no IR | Bora Investir (B3) | https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/day-trade/como-declarar-day-trade-no-imposto-de-renda-confira-com-o-bora/ |
| 36 | Tributacao de ETF e BDR | Bora Investir (B3) | https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/etfs/tributacao-etf-e-bdr/ |
| 37 | Fundos de Investimento: tributacao e impostos | Tax Group | https://www.taxgroup.com.br/intelligence/fundos-de-investimento-como-funciona-a-tributacao-e-quais-impostos-incidem/ |
| 38 | DeCripto: novo modelo de reporte de criptoativos | Mattos Filho | https://www.mattosfilho.com.br/unico/decripto-receita-federal-ocde/ |

---

## Apendice A: Codigos DARF Relevantes

| Codigo | Descricao |
|---|---|
| **6015** | Ganhos liquidos em operacoes em bolsa (PF) - Acoes, opcoes, futuros, DT e ST |
| **4600** | Ganhos de capital na alienacao de ativos (cripto, imoveis, etc.) |
| **6800** | Ganhos de capital em moeda estrangeira |
| **8523** | Fundos de investimento - Renda Variavel (uso menos comum para PF) |
| **3317** | Fundos de investimento - Renda Fixa/Multimercado (come-cotas) |

## Apendice B: Calendario Fiscal do Investidor

| Mes | Obrigacao |
|---|---|
| **Todo mes** | Apurar IR de renda variavel; Pagar DARF ate ultimo dia util do mes seguinte |
| **Janeiro** | Calcular IR de dezembro (DARF vence final de janeiro) |
| **Maio** | Come-cotas de fundos (ultimo dia util) |
| **Marco-Abril** | Entrega da Declaracao IRPF (ano anterior) |
| **Novembro** | Come-cotas de fundos (ultimo dia util) |
| **Dezembro** | Ultima chance de tax loss harvesting para o ano; Ajustar posicoes para IRPF |

## Apendice C: Checklist de Implementacao para o Bot

- [ ] Registrar todas as operacoes com timestamp completo (para classificacao DT/ST)
- [ ] Calcular preco medio ponderado por ativo (considerando desdobramentos, bonificacoes)
- [ ] Separar apuracao de DT e ST com saldos de prejuizo independentes
- [ ] Implementar verificacao de isencao R$ 20k/mes (apenas acoes a vista, swing trade)
- [ ] Calcular IRRF retido (0,005% swing / 1% DT)
- [ ] Gerar DARF mensal com codigo 6015
- [ ] Implementar tax loss harvesting automatizado
- [ ] Gerenciar isencao mensal de R$ 20k (adiar vendas quando proximo do limite)
- [ ] Tratar eventos corporativos (dividendos, JCP, bonificacoes, desdobramentos, grupamentos)
- [ ] Gerar relatorios para declaracao IRPF anual
- [ ] Calcular custos totais por operacao (B3 + corretagem + IR)
- [ ] Registrar separadamente: rendimentos isentos de FIIs, dividendos de acoes, JCP
- [ ] Monitorar limite de R$ 50k/mes para tributacao de dividendos (Lei 15.270/2025)
- [ ] Armazenar dados historicos por no minimo 5 anos (prazo prescricional da Receita)
- [ ] Implementar alertas de DARF proximo do vencimento

---

*Documento compilado em fevereiro de 2026. As regras tributarias podem ser alteradas por nova legislacao. Recomenda-se consultar um contador ou advogado tributarista para casos especificos. Este documento nao constitui aconselhamento fiscal ou juridico.*
