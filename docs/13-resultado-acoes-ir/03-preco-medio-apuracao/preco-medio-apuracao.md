# Preço Médio Ponderado e Apuração de Resultado em Ações
## Metodologia Completa conforme Regras da Receita Federal do Brasil

> **Pesquisa de nível PhD** — Metodologia jurídico-contábil e algoritmo de implementação  
> **Data:** Maio 2026  
> **Objetivo do sistema:** Ferramenta integrada ao CRM do assessor XP que importa notas Sinacor, apura preço médio, calcula IR e gera relatório ao cliente  
> **Fontes:** 14 referências documentadas (RFB, IN SRF 84/2001, IN RFB 1.022, legislação e doutrina técnica)

---

## Sumário

1. [Base Legal — Por que Custo Médio e não FIFO](#1-base-legal)
2. [Definição Formal e Fórmula Matemática](#2-formula-matematica)
3. [Custos de Transação que Integram o PM](#3-custos-transacao)
4. [Regras de Rateio de Custos na Nota de Corretagem](#4-rateio-custos)
5. [Impacto de Eventos Corporativos no PM](#5-eventos-corporativos)
6. [Cálculo de Resultado na Venda](#6-calculo-resultado)
7. [Distinção Day Trade — PM Intradiário](#7-day-trade)
8. [Casos Especiais: Herança, Doação, IPO, Subscrição](#8-casos-especiais)
9. [Algoritmo Completo em Pseudocódigo](#9-algoritmo)
10. [Exemplos Numéricos Completos](#10-exemplos-numericos)
11. [Edge Cases e Armadilhas de Implementação](#11-edge-cases)
12. [Referências](#12-referencias)

---

## 1. Base Legal — Por que Custo Médio e não FIFO

### 1.1 Norma Primária

A metodologia de **custo médio ponderado** como única forma válida de apurar o custo de aquisição de ações é determinada pela:

- **Instrução Normativa SRF nº 84, de 11 de outubro de 2001** — Art. 16, §§ 3º ao 5º: estabelece que o custo de aquisição de participações societárias alienadas é "apurado pela média ponderada dos custos unitários, por espécie, desses títulos."
- **Lei nº 8.981/1995** e **Lei nº 9.249/1995** — base para tributação de ganhos de capital em renda variável.
- **Instrução Normativa RFB nº 1.022/2010** — disciplina a apuração do imposto sobre a renda na fonte nas operações realizadas em bolsas de valores.

### 1.2 Proibição do FIFO

A Receita Federal do Brasil **não aceita** os métodos FIFO (primeiro a entrar, primeiro a sair) nem LIFO (último a entrar, primeiro a sair) para apuração do custo de ações. O único método reconhecido é o **custo médio ponderado móvel** (também chamado de preço médio ponderado — PM).

**Consequência prática:** Não importa em que ordem as ações foram compradas. Todas as compras do mesmo ticker formam um único pool com custo médio único. Quando ocorre uma venda parcial, o custo de saída é sempre o PM do momento da venda.

### 1.3 Texto Literal da IN SRF 84/2001 — Art. 16

> **§ 3º** — Para efeito de apuração do ganho de capital na alienação de participações societárias, o custo de aquisição das ações ou quotas é apurado pela média ponderada dos custos unitários, por espécie, desses títulos.  
> **§ 4º** — O custo médio ponderado de cada ação ou quota é igual ao resultado da divisão do valor total de aquisição das ações ou quotas em estoque pela quantidade total das ações ou quotas em estoque, inclusive as recebidas a título de bonificação.  
> **§ 5º** — A cada aquisição ou baixa devem ser ajustadas as quantidades em estoque e os valores totais e médios ponderados, por espécie, das ações ou quotas.

---

## 2. Definição Formal e Fórmula Matemática

### 2.1 Fórmula Principal — Atualização na Compra

```
PM_novo = (qtd_anterior × PM_anterior + qtd_comprada × custo_unitário_total) 
          ÷ (qtd_anterior + qtd_comprada)
```

Onde:
- `PM_anterior` = preço médio ponderado antes da compra (R$/ação)
- `qtd_anterior` = quantidade de ações em carteira antes da compra
- `qtd_comprada` = quantidade de ações adquiridas na operação
- `custo_unitário_total` = (valor_financeiro_bruto + custos_transação_compra) ÷ qtd_comprada
- `PM_novo` = novo preço médio após incorporar a compra

### 2.2 Fórmula do Custo Unitário Total de Compra

```
custo_unitário_total = (preço_unitário × qtd_comprada + corretagem_rateada 
                        + emolumentos + taxa_liquidação + taxa_registro + ISS) 
                       ÷ qtd_comprada
```

### 2.3 Estado do Estoque após Compra

```
qtd_estoque_novo    = qtd_anterior + qtd_comprada
custo_total_estoque = qtd_anterior × PM_anterior + qtd_comprada × custo_unitário_total
PM_novo             = custo_total_estoque ÷ qtd_estoque_novo
```

### 2.4 Estado do Estoque após Venda Parcial

```
qtd_estoque_novo    = qtd_anterior - qtd_vendida
custo_total_estoque = qtd_estoque_novo × PM_anterior   # PM NÃO muda na venda
PM_novo             = PM_anterior                       # inalterado
```

**Regra fundamental:** A venda **não altera** o preço médio das ações remanescentes. O PM só se altera quando há nova compra do mesmo ativo.

### 2.5 Cálculo do Resultado Bruto na Venda

```
resultado_bruto = valor_venda_líquido - (qtd_vendida × PM)

onde:
  valor_venda_líquido = (preço_venda × qtd_vendida) - custos_transação_venda
  custos_transação_venda = corretagem_rateada + emolumentos + taxa_liquidação + taxa_registro + ISS

resultado_bruto > 0  → ganho de capital → IR devido
resultado_bruto < 0  → prejuízo → compensável em meses futuros
```

---

## 3. Custos de Transação que Integram o PM

### 3.1 Custos na Compra (Adicionados ao PM)

Todos os custos **necessários à realização da compra** integram o custo de aquisição para fins fiscais:

| Custo | Tipo | Base | Integra PM? |
|-------|------|------|-------------|
| Corretagem | Taxa da corretora | Negociado | **Sim** |
| Emolumentos (taxa de negociação) | Taxa B3 | 0,0300% sobre valor (swing) | **Sim** |
| Taxa de liquidação | Taxa B3 | 0,0250% sobre valor (swing) | **Sim** |
| Taxa de registro | Taxa B3 | Variável conforme ativo | **Sim** |
| ISS | Imposto municipal | Sobre corretagem | **Sim** |
| Taxa de custódia | Taxa B3/corretora | Mensal ou por operação | **Situacional*** |

*Taxa de custódia: integra o PM quando vinculada diretamente à operação de compra. Cobranças mensais de custódia são mais difíceis de alocar e a prática comum é tratá-las como despesas dedutíveis do ganho na venda quando corretamente documentadas.

### 3.2 Custos na Venda (Deduzidos do Valor de Venda)

Os mesmos tipos de custo incidem na venda e **reduzem o valor de alienação** (aumentam o prejuízo ou diminuem o ganho):

```
valor_venda_líquido = (preço × qtd) - corretagem_venda - emolumentos_venda 
                     - taxa_liquidação_venda - taxa_registro_venda - ISS_venda
```

### 3.3 Base Legal para Dedução de Custos

A IN RFB 1.022/2010, Art. 45, § 3º-A, permite a dedução de "custos e despesas incorridos, necessários à realização das operações" tanto na formação do custo de aquisição quanto na apuração do valor de alienação.

A Receita Federal confirma: "Investimentos em ações devem ser sempre declarados pelo seu custo de aquisição, que é o preço de compra multiplicado pelo número de ações, mais os custos do investimento, como as taxas de corretagem e os emolumentos."

### 3.4 O que NÃO Integra o PM

| Item | Motivo |
|------|--------|
| Dividendos recebidos | Rendimento isento; não altera custo de aquisição |
| JCP recebido | Tributado na fonte (15% ou 20%); não altera PM do acionista |
| Rendimentos de aluguel de ações | Receita separada; não afeta PM da posição-mãe |
| IRRF (imposto retido na fonte) | Crédito fiscal; não integra custo |

---

## 4. Regras de Rateio de Custos na Nota de Corretagem

### 4.1 Base Legal — IN RFB 1.022/2010

O Art. 45, § 3º-A da IN RFB 1.022/2010 estabelece que quando há múltiplos ativos na mesma nota de corretagem, os custos devem ser **rateados proporcionalmente ao valor financeiro de cada operação**.

### 4.2 Fórmula de Rateio Proporcional

```
percentual_ativo_i = valor_financeiro_i ÷ valor_financeiro_total_da_nota

custo_rateado_i    = custo_total_nota × percentual_ativo_i
```

### 4.3 Exemplo de Rateio

Nota com duas compras no mesmo dia:
- PETR4: 100 ações × R$ 38,00 = R$ 3.800,00 (63,87%)
- VALE3: 50 ações × R$ 43,00 = R$ 2.150,00 (36,13%)
- Total financeiro: R$ 5.950,00

Custos totais da nota:
- Corretagem: R$ 10,00
- Emolumentos + liquidação: R$ 1,785 (0,030% × 5.950)
- Total custos: R$ 11,785

Rateio:
- Custo PETR4: R$ 11,785 × 63,87% = **R$ 7,53**
- Custo VALE3: R$ 11,785 × 36,13% = **R$ 4,26**

PM resultante:
- PETR4: (3.800 + 7,53) / 100 = **R$ 38,0753**
- VALE3: (2.150 + 4,26) / 50 = **R$ 43,0852**

### 4.4 Corretagem Zero / Fixa por Nota

Quando a corretora cobra corretagem fixa por nota (não por ativo):
- A corretagem é rateada pela mesma metodologia proporcional ao valor financeiro.
- Quando corretagem = R$ 0 (corretoras digitais), o rateio se aplica apenas às taxas B3 (emolumentos, liquidação, registro).

### 4.5 Compras e Vendas na Mesma Nota

Notas Sinacor podem conter compras e vendas no mesmo dia (e.g., operações de swing e day trade misturadas). A metodologia correta:
1. Segregar operações de compra e de venda por ativo.
2. Identificar se há casamento compra+venda mesmo dia no mesmo ativo (day trade).
3. Ratear custos separadamente para compras e para vendas.
4. Aplicar o custo rateado ao cálculo correto (compra: adiciona ao PM; venda: reduz valor de alienação).

---

## 5. Impacto de Eventos Corporativos no PM

### 5.1 Tabela de Impacto por Evento

| Evento | Qtd em carteira | PM por ação | Custo total | Observação |
|--------|----------------|-------------|-------------|------------|
| **Split (desdobramento)** | Multiplica por fator | Divide por fator | Inalterado | Efeito neutro no custo total |
| **Inplit (grupamento)** | Divide por fator | Multiplica por fator | Inalterado | Efeito neutro no custo total |
| **Bonificação** | Aumenta pela qtd bonificada | Recalculado | Aumenta pelo custo atribuído | Custo das novas ações = valor capitalizado |
| **Dividendo em dinheiro** | Inalterado | Inalterado | Inalterado | Renda isenta; não afeta PM |
| **JCP em dinheiro** | Inalterado | Inalterado | Inalterado | Tributado na fonte; não afeta PM |
| **Subscrição exercida** | Aumenta pela qtd subscrita | Recalculado | Aumenta pelo valor pago | PM = novo custo médio ponderado |
| **Direitos de subscrição não exercidos** | Inalterado | Inalterado | Inalterado | Se vendidos: ganho = venda - custo zero |
| **Direitos de subscrição vendidos** | Inalterado | Inalterado | Inalterado | Venda de direitos é tributável a 15%; fora da isenção R$20k |
| **Incorporação / Fusão (troca de ticker)** | Conforme proporção | Recalculado pela proporção | Transferido para novo ticker | Custo histórico preservado |
| **Spin-off** | Dividida proporcionalmente | Rateio do custo original | Soma preservada | Rateio proporcional ao valor justo de cada parte |

### 5.2 Desdobramento (Split)

**Regra:** O PM é dividido pelo fator de desdobramento; a quantidade é multiplicada pelo mesmo fator. O custo total da posição permanece idêntico.

```
# Split fator N:1 (cada ação vira N ações)
qtd_nova = qtd_antiga × N
PM_novo  = PM_antigo ÷ N
custo_total = qtd_nova × PM_novo = qtd_antiga × PM_antigo  # invariante
```

**Declaração fiscal:** Não gera ganho de capital. O investidor apenas atualiza quantidade e PM na declaração.

### 5.3 Grupamento (Inplit)

**Regra:** O PM é multiplicado pelo fator de grupamento; a quantidade é dividida.

```
# Grupamento fator 1:N (N ações viram 1)
qtd_nova = qtd_antiga ÷ N
PM_novo  = PM_antigo × N
custo_total = invariante
```

**Frações residuais:** Ações fracionárias resultantes de grupamento são vendidas pela B3 automaticamente. O ganho de capital sobre essas frações é tributável normalmente.

### 5.4 Bonificação

**Regra (IN SRF 84/2001, Art. 16, § 2º):** As ações bonificadas têm como custo de aquisição o "valor do lucro ou reserva capitalizado que corresponder ao acionista", conforme divulgado em fato relevante pela companhia.

```
custo_ações_bonificadas = qtd_bonificada × custo_unitário_divulgado_pela_empresa

PM_novo = (qtd_antiga × PM_antigo + custo_ações_bonificadas) 
          ÷ (qtd_antiga + qtd_bonificada)
```

**Declaração fiscal:**
- O valor da bonificação é lançado como "Rendimentos Isentos e Não Tributáveis" (código 18 no IRPF).
- O novo PM deve ser atualizado em "Bens e Direitos" (código 01 — Ações).

**Nota crítica:** Se a empresa atribuir custo zero às ações bonificadas (hipótese rara e contestável), o custo do acionista não aumenta e o PM antigo é diluído apenas pela quantidade. O valor correto é sempre o informado no fato relevante ou comunicado à CVM.

### 5.5 Subscrição de Ações

A subscrição tem três variações com tratamentos distintos:

**Caso A — Direitos recebidos por já possuir ações (não comprados no mercado):**
```
# Direito tem custo de aquisição zero
custo_ações_novas = qtd_subscrita × preço_emissão  # apenas o preço pago

PM_novo = (qtd_existente × PM_antigo + custo_ações_novas)
          ÷ (qtd_existente + qtd_subscrita)
```

**Caso B — Direitos adquiridos no mercado secundário:**
```
# Direito tem custo de aquisição = preço pago pelo direito
custo_ações_novas = qtd_subscrita × (preço_emissão + custo_unitário_do_direito)

PM_novo = (qtd_existente × PM_antigo + custo_ações_novas)
          ÷ (qtd_existente + qtd_subscrita)
```

**Caso C — Direitos não exercidos e vendidos:**
```
# Venda de direitos = alienação com custo de aquisição zero (se recebidos como provento)
ganho = valor_venda_líquido - 0
IR = ganho × 15%  # NÃO se aplica isenção R$20k/mês
```

### 5.6 Dividendos e JCP — Por que não Afetam o PM

- **Dividendos:** Distribuição de lucros já tributados na empresa. Para o acionista, são rendimentos isentos de IR (Lei 9.249/1995, Art. 10). Não alteram a quantidade de ações nem o custo de aquisição. O PM permanece inalterado.

- **JCP (Juros sobre Capital Próprio):** São tributados na fonte com retenção de 15% (para PF e PJ não imunes). O investidor recebe o valor líquido. Assim como dividendos, não alteram o PM nem a quantidade de ações em carteira.

---

## 6. Cálculo de Resultado na Venda

### 6.1 Fórmula Completa

```
resultado_bruto = valor_alienação - custo_aquisição_alienado

onde:
  valor_alienação      = (preço_venda × qtd_vendida) - custos_venda
  custo_aquisição_alienado = qtd_vendida × PM_na_data_da_venda
```

### 6.2 Resultado Acumulado Mensal

O IR de renda variável é apurado mensalmente, sobre o **resultado líquido do mês**:

```
resultado_mensal_swing = Σ resultado_bruto(operações_swing_do_mês)
                        - prejuízo_swing_acumulado_meses_anteriores

resultado_mensal_daytrade = Σ resultado_bruto(operações_daytrade_do_mês)
                           - prejuízo_daytrade_acumulado_meses_anteriores
```

### 6.3 Alíquotas e Isenção

| Tipo de operação | Alíquota IR | Isenção mensal | IRRF na fonte |
|-----------------|-------------|----------------|---------------|
| Swing trade — ações | 15% | Vendas ≤ R$ 20.000/mês | 0,005% na venda |
| Day trade — ações | 20% | **Nenhuma** | 1% sobre ganho |
| FIIs — swing | 20% | **Nenhuma** | 0,005% |
| ETFs — swing | 15% | **Nenhuma** | 0,005% |

**Atenção:** A isenção de R$ 20.000/mês se aplica somente ao **total de vendas no mercado à vista de ações** (não inclui FIIs, ETFs, opções, futuros, ou operações a termo). Se o total de vendas no mês exceder R$ 20.000, **todo o ganho é tributável** (não apenas o excedente).

### 6.4 DARF e Prazos

```
IR_a_pagar = resultado_mensal_positivo × alíquota - IRRF_retido_no_mês

prazo = último dia útil do mês seguinte ao da operação
código_DARF = 6015  # pessoa física — renda variável
```

---

## 7. Distinção Day Trade — PM Intradiário

### 7.1 Definição Fiscal

Day trade é a operação em que o mesmo ativo é comprado e vendido (ou vendido e recomprado) no **mesmo pregão**, pelo mesmo investidor, na mesma corretora. Cada corretora apura individualmente.

### 7.2 Como o PM do Day Trade é Calculado

O PM do day trade é calculado **separadamente** do PM swing trade:

```
# No início do pregão:
PM_daytrade_compra  = média ponderada das compras intradiárias do ativo
PM_daytrade_venda   = (usado se houver short intradiário)

resultado_daytrade  = valor_venda_intradiária - (qtd × PM_daytrade_compra)
                     - custos_intradiários
```

**Regra crítica:** As operações de day trade **não afetam o PM swing** do investidor. Se o investidor possui 500 ações em carteira (swing) e no mesmo dia compra e vende mais 100 (day trade), o PM das 500 ações permanece inalterado.

### 7.3 Algoritmo de Identificação Day Trade

```
para cada ativo no pregão:
  compras_do_dia  = lista de compras ordenadas por horário
  vendas_do_dia   = lista de vendas ordenadas por horário

  qtd_day_trade   = min(total_comprado_no_dia, total_vendido_no_dia)

  se qtd_day_trade > 0:
    # as primeiras compras do dia (até qtd_day_trade) são day trade
    # as vendas correspondentes são day trade
    calcular PM_DT apenas com compras intradiárias até qtd_day_trade
    resultado_DT = venda_DT - (qtd_DT × PM_DT) - custos_DT

  # estoque residual vai para swing
  qtd_swing_adicionada = total_comprado_no_dia - qtd_day_trade
  se qtd_swing_adicionada > 0:
    atualizar PM_swing normal
```

### 7.4 Compensação de Prejuízos — Regra de Segregação Obrigatória

Prejuízos de day trade **somente compensam** ganhos de day trade (nunca swing). Prejuízos swing **somente compensam** ganhos swing. Essa segregação é obrigatória conforme a legislação vigente e deve ser mantida em controle separado.

```
# Controle de prejuízo acumulado — dois saldos independentes
saldo_prejuízo_swing    += max(0, -resultado_mensal_swing)
saldo_prejuízo_daytrade += max(0, -resultado_mensal_daytrade)
```

---

## 8. Casos Especiais: Herança, Doação, IPO, Subscrição

### 8.1 Ações Recebidas por Herança

**Base legal:** Legislação do IR estabelece que, na transferência causa mortis, o custo de aquisição para o herdeiro é o **valor pelo qual os bens foram transferidos**.

Há duas modalidades de transferência:

**Modalidade 1 — Custo histórico (pelo valor declarado pelo falecido):**
```
PM_herdeiro = PM_que_constava_na_declaração_do_falecido
```
- Nenhum ganho de capital é apurado no momento da herança.
- O herdeiro herda o custo histórico e pagará IR quando vender.

**Modalidade 2 — Valor de mercado na data do óbito:**
```
PM_herdeiro = preço_de_mercado_na_data_do_óbito
```
- O espólio apura ganho de capital = (valor_mercado - custo_histórico) e recolhe 15%.
- O herdeiro tem custo atualizado e menor IR futuro na venda.

A escolha é do espólio/doador e impacta diretamente o PM do beneficiário.

### 8.2 Ações Recebidas por Doação

Regras análogas à herança:
- Se transferidas pelo custo histórico: PM_donatário = PM_doador (diferimento do ganho).
- Se transferidas a valor de mercado: ganho de capital apurado pelo doador com recolhimento de 15%.

**ITCMD estadual:** A base de cálculo do ITCMD (imposto estadual) deve ser consistente com o valor declarado no IRPF, o que influencia indiretamente a escolha da modalidade.

### 8.3 Ações de IPO (Oferta Pública Inicial)

```
PM_inicial = preço_da_oferta + custos_operacionais_de_aquisição

# Normalmente não há nota de corretagem no IPO
# Custos de corretagem em IPOs podem ser zero (oferta via B3)
# PM_inicial = preço_de_emissão_da_oferta
```

Em IPOs, o investidor recebe as ações diretamente da empresa sem passagem pela mesa de operações com nota de corretagem tradicional. O custo é o preço de oferta × quantidade alocada, sem custos adicionais de corretagem na maioria dos casos.

### 8.4 Ações por Exercício de Opções de Compra (Call)

```
PM_ações_adquiridas_via_opção = (prêmio_pago_pela_opção + preço_de_exercício 
                                 + custos_do_exercício) ÷ qtd_ações

# O prêmio pago integra o custo das ações adquiridas
```

### 8.5 Stock Options (Planos de Remuneração)

Em planos de stock options (opções concedidas por empregadores):
```
PM_ações = preço_de_exercício + prêmio_de_opção_pago (se houver)
```
O ganho no exercício pode ser tributado como rendimento do trabalho (questão em debate na jurisprudência) ou como ganho de capital, dependendo da estrutura do plano.

---

## 9. Algoritmo Completo em Pseudocódigo

```
ESTRUTURA Posicao:
  ticker: string
  qtd: decimal
  pm: decimal              # preço médio ponderado (R$/ação)
  custo_total: decimal     # qtd × pm
  tipo: [SWING, DAYTRADE]

ESTRUTURA Operacao:
  data: date
  ticker: string
  tipo_operacao: [COMPRA, VENDA]
  qtd: decimal
  preco_unitario: decimal
  corretagem_rateada: decimal
  emolumentos: decimal
  taxa_liquidacao: decimal
  taxa_registro: decimal
  iss: decimal
  is_daytrade: boolean

FUNÇÃO calcular_custo_total_operacao(op: Operacao) -> decimal:
  custo_transacao = op.corretagem_rateada + op.emolumentos 
                  + op.taxa_liquidacao + op.taxa_registro + op.iss
  SE op.tipo_operacao == COMPRA:
    RETORNAR op.preco_unitario × op.qtd + custo_transacao
  SENÃO:  # VENDA
    RETORNAR op.preco_unitario × op.qtd - custo_transacao

FUNÇÃO atualizar_pm_compra(posicao: Posicao, operacao: Operacao) -> Posicao:
  custo_compra = calcular_custo_total_operacao(operacao)
  custo_unitário = custo_compra ÷ operacao.qtd
  
  novo_custo_total = posicao.custo_total + custo_compra
  nova_qtd = posicao.qtd + operacao.qtd
  novo_pm = novo_custo_total ÷ nova_qtd
  
  RETORNAR Posicao(qtd=nova_qtd, pm=novo_pm, custo_total=novo_custo_total)

FUNÇÃO calcular_resultado_venda(posicao: Posicao, operacao: Operacao) -> (decimal, Posicao):
  SE operacao.qtd > posicao.qtd:
    LANÇAR ERRO("Venda maior que estoque disponível")
  
  valor_alienacao = calcular_custo_total_operacao(operacao)  # preco × qtd - custos
  custo_alienado = operacao.qtd × posicao.pm
  resultado = valor_alienacao - custo_alienado
  
  # PM NÃO muda na venda; apenas quantidade e custo_total ajustam
  nova_qtd = posicao.qtd - operacao.qtd
  novo_custo_total = nova_qtd × posicao.pm
  posicao_atualizada = Posicao(qtd=nova_qtd, pm=posicao.pm, 
                                custo_total=novo_custo_total)
  
  RETORNAR (resultado, posicao_atualizada)

FUNÇÃO identificar_daytrade(operacoes_do_dia: Lista[Operacao]) -> Lista[Operacao]:
  por_ticker = agrupar(operacoes_do_dia, key=ticker)
  
  PARA CADA ticker, ops EM por_ticker:
    compras  = [op PARA op EM ops SE op.tipo == COMPRA]
    vendas   = [op PARA op EM ops SE op.tipo == VENDA]
    qtd_DT   = min(soma(compras.qtd), soma(vendas.qtd))
    
    SE qtd_DT > 0:
      marcar primeiras compras (até qtd_DT) como is_daytrade = True
      marcar primeiras vendas  (até qtd_DT) como is_daytrade = True
  
  RETORNAR operacoes_do_dia

FUNÇÃO ajustar_split(posicao: Posicao, fator: decimal) -> Posicao:
  # fator > 1 para split; fator < 1 para inplit (ex: 1/3 para grupamento 1:3)
  nova_qtd = posicao.qtd × fator
  novo_pm  = posicao.pm ÷ fator
  RETORNAR Posicao(qtd=nova_qtd, pm=novo_pm, custo_total=posicao.custo_total)

FUNÇÃO ajustar_bonificacao(posicao: Posicao, qtd_bonif: decimal, 
                            custo_unitario_bonif: decimal) -> Posicao:
  custo_bonif = qtd_bonif × custo_unitario_bonif
  nova_qtd = posicao.qtd + qtd_bonif
  novo_custo_total = posicao.custo_total + custo_bonif
  novo_pm = novo_custo_total ÷ nova_qtd
  RETORNAR Posicao(qtd=nova_qtd, pm=novo_pm, custo_total=novo_custo_total)

FUNÇÃO ratear_custos_nota(operacoes: Lista[Operacao], custo_total_nota: decimal):
  valor_total = soma(op.preco_unitario × op.qtd PARA op EM operacoes)
  
  PARA CADA op EM operacoes:
    percentual = (op.preco_unitario × op.qtd) ÷ valor_total
    op.corretagem_rateada = custo_total_nota × percentual
    # Emolumentos e taxas B3 são individuais por operação (calculados sobre valor)

FUNÇÃO apurar_ir_mensal(resultados: Lista[(data, resultado, is_daytrade)],
                         saldo_prejuizo_swing: decimal,
                         saldo_prejuizo_daytrade: decimal) -> (decimal, decimal, decimal):
  ganho_swing = soma(r PARA (d,r,dt) EM resultados SE r > 0 E NOT dt)
  perda_swing = soma(r PARA (d,r,dt) EM resultados SE r < 0 E NOT dt)
  
  ganho_daytrade = soma(r PARA (d,r,dt) EM resultados SE r > 0 E dt)
  perda_daytrade = soma(r PARA (d,r,dt) EM resultados SE r < 0 E dt)
  
  # Atualizar saldos de prejuízo
  saldo_prejuizo_swing    = max(0, saldo_prejuizo_swing    - ganho_swing)    + abs(perda_swing)
  saldo_prejuizo_daytrade = max(0, saldo_prejuizo_daytrade - ganho_daytrade) + abs(perda_daytrade)
  
  base_swing    = max(0, ganho_swing - saldo_prejuizo_swing_anterior)
  base_daytrade = max(0, ganho_daytrade - saldo_prejuizo_daytrade_anterior)
  
  # Verificar isenção swing (total vendas ≤ R$20k no mês — apenas ações à vista)
  SE total_vendas_swing_ações_do_mês ≤ 20000:
    ir_swing = 0
  SENÃO:
    ir_swing = base_swing × 0.15
  
  ir_daytrade = base_daytrade × 0.20
  
  RETORNAR (ir_swing, ir_daytrade, saldo_prejuizo_swing_novo, saldo_prejuizo_daytrade_novo)
```

---

## 10. Exemplos Numéricos Completos

### Exemplo 1 — Sequência Básica de Compras e Venda Parcial

**Cenário:** Investidor compra PETR4 em três operações e depois vende parte.

```
Operação 1 (jan/26): Compra 100 ações × R$ 35,00 = R$ 3.500,00
Custos: corretagem R$ 10,00 + emolumentos R$ 1,05 = R$ 11,05
Custo total: R$ 3.511,05
PM após op.1 = 3.511,05 ÷ 100 = R$ 35,1105

Operação 2 (fev/26): Compra 200 ações × R$ 38,00 = R$ 7.600,00
Custos: R$ 10,00 + R$ 2,28 = R$ 12,28
Custo total: R$ 7.612,28
PM após op.2 = (3.511,05 + 7.612,28) ÷ 300 = 11.123,33 ÷ 300 = R$ 37,0778

Operação 3 (mar/26): Compra 150 ações × R$ 36,50 = R$ 5.475,00
Custos: R$ 10,00 + R$ 1,64 = R$ 11,64
Custo total: R$ 5.486,64
PM após op.3 = (11.123,33 + 5.486,64) ÷ 450 = 16.609,97 ÷ 450 = R$ 36,9111

Estoque: 450 ações @ PM R$ 36,9111

Operação 4 (abr/26): Venda de 200 ações × R$ 42,00 = R$ 8.400,00
Custos venda: R$ 10,00 + R$ 2,52 = R$ 12,52
Valor alienação líquido = 8.400,00 - 12,52 = R$ 8.387,48
Custo das 200 ações = 200 × R$ 36,9111 = R$ 7.382,22
Resultado = R$ 8.387,48 - R$ 7.382,22 = R$ 1.005,26 (GANHO)

PM após venda: R$ 36,9111 (INALTERADO)
Estoque remanescente: 250 ações @ R$ 36,9111
Custo total remanescente: 250 × 36,9111 = R$ 9.227,78

IR (se vendas totais do mês > R$20k): R$ 1.005,26 × 15% = R$ 150,79
IRRF retido na fonte: R$ 8.400 × 0,005% = R$ 0,42
DARF a recolher: R$ 150,79 - R$ 0,42 = R$ 150,37
```

---

### Exemplo 2 — Bonificação com Recálculo de PM

**Cenário:** Klabin (KLBN11) realiza bonificação de 10% com custo unitário atribuído de R$ 18,00.

```
Estado antes da bonificação:
  Estoque: 1.000 units KLBN11 @ PM R$ 22,50
  Custo total: R$ 22.500,00

Bonificação:
  Qtd bonificada: 1.000 × 10% = 100 units
  Custo por unit bonificada (divulgado em fato relevante): R$ 18,00
  Custo total das bonificadas: 100 × R$ 18,00 = R$ 1.800,00

PM_novo = (22.500,00 + 1.800,00) ÷ (1.000 + 100)
PM_novo = 24.300,00 ÷ 1.100 = R$ 22,0909

Estado após bonificação:
  Estoque: 1.100 units KLBN11 @ PM R$ 22,0909
  Custo total: R$ 24.300,00

Declaração IRPF:
  Rendimentos isentos código 18: R$ 1.800,00 (bonificação recebida)
  Bens e Direitos código 01: 1.100 units × R$ 22,0909 = R$ 24.300,00
```

---

### Exemplo 3 — Desdobramento (Split) + Venda Posterior

**Cenário:** Investidor tem WEG (WEGE3) quando a empresa faz split 1:3. Depois vende metade.

```
Antes do split:
  Estoque: 100 ações WEGE3 @ PM R$ 120,00
  Custo total: R$ 12.000,00

Split 1:3 (cada ação se torna 3):
  Qtd_nova = 100 × 3 = 300 ações
  PM_novo  = R$ 120,00 ÷ 3 = R$ 40,00
  Custo total: R$ 12.000,00 (inalterado — efeito econômico zero)

Venda de 150 ações a R$ 45,00:
  Valor venda bruto: 150 × R$ 45,00 = R$ 6.750,00
  Custos venda: corretagem R$ 10 + emolumentos R$ 2,025 = R$ 12,025
  Valor alienação líquido: R$ 6.750,00 - R$ 12,025 = R$ 6.737,975
  Custo das 150 ações: 150 × R$ 40,00 = R$ 6.000,00
  Resultado: R$ 6.737,975 - R$ 6.000,00 = R$ 737,975 (GANHO)

IR (vendas > R$20k no mês): R$ 737,975 × 15% ≈ R$ 110,70

Estado final: 150 ações WEGE3 @ PM R$ 40,00 (inalterado pela venda)
```

---

### Exemplo 4 — Day Trade Isolado vs. Posição Swing Pré-Existente

**Cenário:** Investidor tem 500 VALE3 (swing) e opera day trade com mais 200 no mesmo dia.

```
Posição swing pré-existente:
  500 ações VALE3 @ PM R$ 68,00
  Custo total: R$ 34.000,00

Operações do dia:
  09:15 — Compra 200 VALE3 × R$ 69,50 = R$ 13.900 (custos: R$ 8,34)
  14:30 — Venda 200 VALE3 × R$ 71,00 = R$ 14.200 (custos: R$ 8,52)

Identificação: compra 200 + venda 200 no mesmo dia → 200 ações = day trade

APURAÇÃO DAY TRADE:
  PM_DT = (13.900 + 8,34) ÷ 200 = R$ 69,5417
  Valor venda DT = 14.200 - 8,52 = R$ 14.191,48
  Resultado DT = 14.191,48 - (200 × 69,5417) = 14.191,48 - 13.908,34 = R$ 283,14
  IR DT = R$ 283,14 × 20% = R$ 56,63
  IRRF DT retido = R$ 283,14 × 1% = R$ 2,83
  DARF DT = R$ 56,63 - R$ 2,83 = R$ 53,80

POSIÇÃO SWING: INALTERADA
  500 ações VALE3 @ PM R$ 68,00 (day trade não afeta!)
```

---

### Exemplo 5 — Subscrição + Múltiplas Compras + Venda Total

**Cenário:** Sequência completa com ITSA4.

```
Jan/26: Compra 500 ações × R$ 10,00 = R$ 5.000,00 + custos R$ 6,50
  PM = 5.006,50 ÷ 500 = R$ 10,013

Mar/26: Compra 300 ações × R$ 11,20 = R$ 3.360,00 + custos R$ 5,08
  Custo total = 5.006,50 + 3.365,08 = R$ 8.371,58
  PM = 8.371,58 ÷ 800 = R$ 10,4645

Mai/26: Empresa lança subscrição 1:5 (1 ação nova p/ cada 5 existentes)
  Direitos recebidos (sem custo de aquisição): 800 ÷ 5 = 160 ações
  Preço de emissão (exercício): R$ 9,50/ação
  Investidor exerce todos os direitos:
  
  Custo das 160 novas ações = 160 × R$ 9,50 = R$ 1.520,00 + custos operação R$ 2,00

  PM_novo = (8.371,58 + 1.522,00) ÷ (800 + 160)
           = 9.893,58 ÷ 960 = R$ 10,3058

Jun/26: Venda total de 960 ações × R$ 13,50 = R$ 12.960,00
  Custos venda: R$ 10,00 + R$ 3,888 = R$ 13,888
  Valor alienação = R$ 12.960,00 - R$ 13,888 = R$ 12.946,112
  Custo total = 960 × R$ 10,3058 = R$ 9.893,57
  Resultado = R$ 12.946,112 - R$ 9.893,57 = R$ 3.052,54 (GANHO)

Total de vendas em jun = R$ 12.960 > R$ 20.000? NÃO (isenção se única venda do mês)
→ SE vendas totais do mês de ações ≤ R$20k: IR = ZERO (isento)
→ SE vendas totais do mês > R$20k: IR = R$3.052,54 × 15% = R$457,88
```

---

### Exemplo 6 — Rateio de Corretagem em Nota com Dois Ativos + Compra e Venda

**Cenário:** Nota com compra de BBAS3 e compra de BBDC4 no mesmo dia.

```
Nota de corretagem — 15/mai/26:
  Compra 200 BBAS3 × R$ 47,00 = R$ 9.400,00
  Compra 100 BBDC4 × R$ 16,50 = R$ 1.650,00
  Total financeiro compras: R$ 11.050,00

Custos da nota:
  Corretagem fixa: R$ 10,00
  Emolumentos (0,0300% × 11.050): R$ 3,315
  Taxa liquidação já incluída nos emolumentos (0,0250% × 11.050): R$ 2,7625
  Total custos: R$ 13,315 + R$ 2,7625 = aproximado R$ 16,075

Rateio proporcional ao valor financeiro:
  % BBAS3 = 9.400 ÷ 11.050 = 85,07%
  % BBDC4 = 1.650 ÷ 11.050 = 14,93%

Custos BBAS3: R$ 16,075 × 85,07% = R$ 13,683
Custos BBDC4: R$ 16,075 × 14,93% = R$ 2,400

PM BBAS3 (se posição zerada antes):
  (9.400 + 13,683) ÷ 200 = R$ 47,068

PM BBDC4 (se posição zerada antes):
  (1.650 + 2,400) ÷ 100 = R$ 16,524
```

---

## 11. Edge Cases e Armadilhas de Implementação

### 11.1 Estoque Zerado Seguido de Nova Compra

Quando o investidor vende toda a posição, o PM deve ser zerado. A próxima compra inicia um novo histórico:

```
SE qtd_estoque == 0:
  PM = 0
  custo_total = 0
# A próxima compra é tratada como primeira compra (pm_anterior = 0)
```

**Armadilha:** Sistemas que mantêm o PM antigo após zeragem do estoque calcularão incorretamente o resultado de operações futuras.

### 11.2 Precisão Numérica — Risco de Arredondamento

Trabalhar com preço médio requer alta precisão decimal. Usar `float` Python ou `FLOAT` SQL pode gerar erros acumulativos. Recomendação:

```python
from decimal import Decimal, ROUND_HALF_UP

pm = Decimal('36.9111')  # sempre usar Decimal, nunca float
```

### 11.3 Ações com Ticker Alterado

Fusões, incorporações e mudanças de razão social podem alterar o ticker. O sistema deve:
1. Registrar o evento de "troca de ticker" com a proporção de conversão.
2. Transferir o saldo (quantidade e custo total) para o novo ticker.
3. Recalcular PM se houver frações (tratadas como split parcial).

### 11.4 Frações de Ações em Desdobramentos

Quando o split resulta em frações (ex: 100 ações em split 1:1,5 = 150 ações exatas — ok; mas 99 ações em split 1:1,5 = 148,5 ações), a bolsa converte frações em lotes fracionários vendidos automaticamente:
- A fração vendida gera ganho de capital tributável.
- O PM deve ser ajustado subtraindo a fração antes de vendê-la.

### 11.5 Operações Transferidas de Outra Corretora

Quando o investidor transfere custódia (TED em espécie ou transferência de posição):
- **Transferência de posição** (sem venda): O custo histórico é transferido. O PM deve ser inserido manualmente baseado no extrato da corretora de origem.
- **Dificuldade prática:** Corretoras nem sempre fornecem o PM histórico correto. O investidor é responsável pela comprovação.

### 11.6 IRRF como Antecipação — Não Integra PM

O IRRF (0,005% sobre vendas swing ou 1% sobre ganho day trade) é antecipação do IR mensal. **Nunca** deve ser deduzido do valor de alienação para cálculo de resultado — ele é deduzido do DARF no momento do recolhimento.

```
# ERRADO:
valor_alienação = preço × qtd - custos - IRRF

# CORRETO:
valor_alienação = preço × qtd - custos_operacionais
# IRRF é creditado na apuração mensal do DARF
```

### 11.7 Vendas Isentas e PM Histórico

Mesmo em meses com vendas totais ≤ R$ 20.000 (isenção), o PM deve ser atualizado e o resultado calculado. O resultado isento deve ser registrado para fins de controle e declaração (campo "Rendimentos Isentos" no IRPF).

### 11.8 Operações Realizadas em Conta Conjunta

O ganho de capital é individual. Em conta conjunta, a apuração deve ser feita proporcionalmente à participação de cada titular. O PM deve ser mantido por CPF, não por conta.

### 11.9 BDRs e Ativos Internacionais via B3

BDRs (Brazilian Depositary Receipts) seguem as mesmas regras de PM que ações nacionais quando negociados em bolsa. Alíquota: 15% para ganhos ≤ R$ 5 milhões; 22,5% acima. A isenção de R$ 20k não se aplica.

### 11.10 Dividendos em Ações (Stock Dividends)

Quando uma empresa paga dividendos em ações (ao invés de dinheiro), o tratamento fiscal é análogo à bonificação: as novas ações recebem custo = valor informado pela companhia, e o PM é recalculado.

---

## 12. Referências

1. **Instrução Normativa SRF nº 84, de 11 de outubro de 2001** — Dispõe sobre a apuração e tributação de ganhos de capital das pessoas físicas. Art. 16, §§ 2º-5º: base legal do custo médio ponderado para ações. Disponível em: [https://www.normaslegais.com.br/legislacao/tributario/insrf84.htm](https://www.normaslegais.com.br/legislacao/tributario/insrf84.htm)

2. **Instrução Normativa RFB nº 1.022, de 5 de abril de 2010** — Tributação sobre a renda nas operações de renda variável em bolsas. Art. 45, § 3º-A: rateio proporcional de custos. Disponível em: [http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=14802](http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=14802)

3. **Receita Federal do Brasil — Ganho Líquido em Bolsa de Valores** — Portal oficial com definição de ganho líquido, custo médio ponderado e exemplos. Disponível em: [https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/ganho-liquido](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/ganho-liquido)

4. **IRPFbolsa — Manual do Sistema** — Documentação técnica sobre metodologia de cálculo, identificação de day trade, rateio de custos e tratamento de eventos corporativos. Disponível em: [https://www.irpfbolsa.com.br/novo/manual/](https://www.irpfbolsa.com.br/novo/manual/)

5. **NuInvest — Tributação de Renda Variável** — Guia prático sobre alíquotas, isenção de R$20k, IRRF, compensação de prejuízos e fórmulas de ganho líquido. Disponível em: [https://www.nuinvest.com.br/tributacao-de-renda-variavel.html](https://www.nuinvest.com.br/tributacao-de-renda-variavel.html)

6. **InfoMoney — Base de Cálculo do IR sobre Ganho de Capital com Ações** — Análise da metodologia do preço médio ponderado e tratamento de vendas parciais. Disponível em: [https://www.infomoney.com.br/mercados/como-e-definida-a-base-de-calculo-para-recolhimento-de-ir-sobre-ganho-de-capital-com-acoes/](https://www.infomoney.com.br/mercados/como-e-definida-a-base-de-calculo-para-recolhimento-de-ir-sobre-ganho-de-capital-com-acoes/)

7. **InfoMoney — Declarar Ações: Valor da Compra ou da Nota de Corretagem?** — Clarificação sobre inclusão de corretagem e emolumentos no custo de aquisição declarado. Disponível em: [https://www.infomoney.com.br/minhas-financas/declarar-acao-devo-informar-valor-pago-na-compra-ou-da-nota-de-corretagem-no-ir/](https://www.infomoney.com.br/minhas-financas/declarar-acao-devo-informar-valor-pago-na-compra-ou-da-nota-de-corretagem-no-ir/)

8. **Bastter.com — Dúvida Divisão dos Custos da Nota de Corretagem** — Discussão técnica sobre rateio proporcional ao valor financeiro com base na IN RFB 1.022, Art. 45 § 3º-A. Disponível em: [https://bastter.com/mercado/forum/752677/duvida-divisao-dos-custos-da-nota-de-corretagem](https://bastter.com/mercado/forum/752677/duvida-divisao-dos-custos-da-nota-de-corretagem)

9. **Governo Federal — Desdobramento (Split) e Grupamento (Inplit)** — Portal do Investidor: definição e impacto de splits/inplits no preço médio. Disponível em: [https://www.gov.br/investidor/pt-br/investir/tipos-de-investimentos/acoes/desdobramento-split-e-grupamento-inplit](https://www.gov.br/investidor/pt-br/investir/tipos-de-investimentos/acoes/desdobramento-split-e-grupamento-inplit)

10. **Seu Dinheiro — Como Declarar Desdobramentos e Grupamentos de Ações** — Metodologia de ajuste de PM e declaração fiscal de splits e inplits. Disponível em: [https://www.seudinheiro.com/2021/imposto-de-renda/imposto-de-renda-como-declarar-desdobramentos-e-grupamentos-de-acoes/](https://www.seudinheiro.com/2021/imposto-de-renda/imposto-de-renda-como-declarar-desdobramentos-e-grupamentos-de-acoes/)

11. **XP Educação — Como Calcular o Preço Médio de Ações** — Exemplos numéricos práticos com múltiplas compras, inclusão de custos operacionais. Disponível em: [https://blog.xpeducacao.com.br/como-calcular-preco-medio-de-acoes/](https://blog.xpeducacao.com.br/como-calcular-preco-medio-de-acoes/)

12. **Associated News Brazil — Como Declarar Subscrição de Ações no IR** — Tratamento fiscal de subscrição: custo de aquisição de direitos exercidos e vendidos. Disponível em: [https://associatednews.com.br/imposto-de-renda/como-declarar-subscricao-de-acoes-no-imposto-de-renda/](https://associatednews.com.br/imposto-de-renda/como-declarar-subscricao-de-acoes-no-imposto-de-renda/)

13. **Portal Tributário — DIRPF: Bens de Doação ou Herança** — Modalidades de transferência (custo histórico vs. valor de mercado) e impacto no PM do beneficiário. Disponível em: [https://www.portaltributario.com.br/artigos/diprf_herancadoacoes.htm](https://www.portaltributario.com.br/artigos/diprf_herancadoacoes.htm)

14. **Akeloo — Direito de Subscrição de Ações: Como Afeta o IR** — Análise do impacto do exercício de subscrição no preço médio e tributação de direitos vendidos. Disponível em: [https://akeloo.com.br/blog/direito-de-subscricao-de-acoes/](https://akeloo.com.br/blog/direito-de-subscricao-de-acoes/)

15. **C6 Bank — Como Declarar Bonificação de Ações no IR** — Recálculo de PM em bonificação, valor atribuído pela empresa e lançamento no IRPF. Disponível em: [https://www.c6bank.com.br/blog/bonificacao](https://www.c6bank.com.br/blog/bonificacao)

---

*Documento elaborado para o sistema de CRM de assessor de investimentos XP — módulo de apuração de IR e preço médio sobre notas Sinacor. Versão 1.0 — Maio 2026.*
