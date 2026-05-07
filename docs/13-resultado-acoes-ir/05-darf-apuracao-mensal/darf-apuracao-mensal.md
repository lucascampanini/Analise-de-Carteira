# DARF e Apuração Mensal de IR em Renda Variável

> Pesquisa PhD — Tributação de Investimentos e Obrigações Acessórias
>
> **Data:** Maio 2026
> **Aplicação:** Ferramenta CRM XP para cálculo mensal de IR sobre ações, geração de DARF e histórico fiscal do cliente
> **Fontes:** 15+ referências documentadas

---

## Sumário

1. [Fundamentos Legais e Código DARF](#1-fundamentos-legais-e-código-darf)
2. [Tabela de Códigos DARF por Tipo de Ativo](#2-tabela-de-códigos-darf-por-tipo-de-ativo)
3. [Fórmula Completa de Apuração Mensal](#3-fórmula-completa-de-apuração-mensal)
4. [Regras de Isenção e Casos Especiais](#4-regras-de-isenção-e-casos-especiais)
5. [Apuração Separada: Swing Trade vs Day Trade](#5-apuração-separada-swing-trade-vs-day-trade)
6. [Calendário Fiscal e Penalidades por Atraso](#6-calendário-fiscal-e-penalidades-por-atraso)
7. [Valor Mínimo DARF e Carry-Forward](#7-valor-mínimo-darf-e-carry-forward)
8. [Fluxograma de Decisão: Gerar DARF ou Registrar Carry-Forward](#8-fluxograma-de-decisão-gerar-darf-ou-registrar-carry-forward)
9. [Fórmula de Multa e Juros por Atraso com Exemplo Numérico](#9-fórmula-de-multa-e-juros-por-atraso-com-exemplo-numérico)
10. [Exemplos Numéricos Completos](#10-exemplos-numéricos-completos)
11. [DARF Retroativo: Regularização e Parcelamento](#11-darf-retroativo-regularização-e-parcelamento)
12. [Integração com DIRPF — Declaração Anual](#12-integração-com-dirpf--declaração-anual)
13. [Implicações para a Ferramenta CRM](#13-implicações-para-a-ferramenta-crm)
14. [Referências](#14-referências)

---

## 1. Fundamentos Legais e Código DARF

### 1.1 Base Legal

A tributação de ganhos líquidos em renda variável é regulada principalmente por:

- **Lei nº 8.981/1995** — Base original da tributação de operações em bolsa de valores
- **Lei nº 11.033/2004** — Estabelece a isenção de IR para alienações de ações até R$ 20.000/mês no mercado à vista; fixa alíquotas de 15% (operações comuns) e 20% (day trade) para ganhos líquidos em bolsa; código 6015 para pessoa física
- **Lei nº 8.383/1991 (art. 68)** — Veda a emissão de DARF para valores inferiores a R$ 10,00
- **Instrução Normativa RFB aplicável** — Detalha procedimentos de apuração, compensação e preenchimento da DIRPF

### 1.2 O Código DARF 6015

O **código de receita 6015** — denominado "Ganhos Líquidos em Operações em Bolsa" — é o código universal para recolhimento de IR sobre renda variável por **pessoa física**.

**Características do código 6015:**
- Utilizado para ações, FIIs, ETFs, opções, futuros, BDRs e ouro ativo financeiro
- Abrange tanto operações comuns (swing trade) quanto day trade no mesmo documento, desde que o contribuinte calcule e discrimine cada modalidade
- O período de apuração é o mês de competência (ex.: "04/2026" para operações de abril)
- Vencimento: último dia útil do mês subsequente ao da apuração
- Para **pessoa jurídica** o código equivalente é **3317**

> **Nota crítica para o CRM:** Não há necessidade de emitir DARFs separados para swing trade e day trade no mesmo mês — ambos podem constar no mesmo DARF 6015, desde que o valor total seja a soma dos impostos devidos em cada modalidade. O controle separado é obrigação contábil do contribuinte, não exigência de documentos distintos.

---

## 2. Tabela de Códigos DARF por Tipo de Ativo

| Tipo de Operação / Ativo | Modalidade | Alíquota | Isenção Mensal | IRRF na Fonte | Código DARF (PF) |
|--------------------------|------------|----------|---------------|---------------|------------------|
| Ações (mercado à vista) | Swing Trade | 15% | Sim — vendas ≤ R$ 20.000/mês | 0,005% sobre alienações | **6015** |
| Ações (mercado à vista) | Day Trade | 20% | Não | 1% sobre lucro diário | **6015** |
| FIIs (cotas em bolsa) | Swing Trade | 20% | Não | 0,005% sobre alienações | **6015** |
| FIIs (cotas em bolsa) | Day Trade | 20% | Não | 1% sobre lucro diário | **6015** |
| ETFs de ações (nacionais) | Swing Trade | 15% | Não | 0,005% sobre alienações | **6015** |
| ETFs de ações (nacionais) | Day Trade | 20% | Não | 1% sobre lucro diário | **6015** |
| BDRs | Swing Trade | 15% | Não | 0,005% sobre alienações | **6015** |
| BDRs | Day Trade | 20% | Não | 1% sobre lucro diário | **6015** |
| Opções (mercado de opções) | Swing Trade | 15% | Não | 0,005% sobre prêmio | **6015** |
| Opções | Day Trade | 20% | Não | 1% sobre lucro diário | **6015** |
| Futuros / Mini Contratos (WIN, WDO) | Swing Trade | 15% | Não | 0,005% | **6015** |
| Futuros / Mini Contratos | Day Trade | 20% | Não | 1% sobre resultado | **6015** |
| Ouro (ativo financeiro) | Swing Trade | 15% | Sim — vendas ≤ R$ 20.000/mês | 0,005% | **6015** |
| ETFs de Renda Fixa | — | Tabela regressiva (15% a 25%) | Não | Retido na fonte pelo fundo | Recolhido na fonte |
| Fundos de ações | Resgate | 15% | Não | Retido na fonte (come-cotas) | Recolhido na fonte |

**Observações importantes:**
- FIIs têm uma dupla tributação: os **rendimentos distribuídos** (dividendos) são **isentos de IR para PF** (quando cumpridos os requisitos da Lei 11.196/2005); já o **ganho de capital** na venda das cotas é tributado a 20%, sem isenção
- ETFs de renda fixa são tributados na fonte pela tabela regressiva (22,5% até 180 dias; 20% de 181 a 360 dias; 17,5% de 361 a 720 dias; 15% acima de 720 dias) e não exigem DARF mensal do investidor
- Opções: o momento de reconhecimento do ganho depende da operação — na revenda do prêmio (antes do vencimento), no exercício, ou na data de vencimento sem negociação

---

## 3. Fórmula Completa de Apuração Mensal

### 3.1 Visão Geral — Passo a Passo

```
╔══════════════════════════════════════════════════════════════════╗
║         APURAÇÃO MENSAL DE IR — RENDA VARIÁVEL (PASSO A PASSO)  ║
╚══════════════════════════════════════════════════════════════════╝

PASSO 1 — RESULTADO BRUTO DA MODALIDADE
────────────────────────────────────────────────────────────────────
   Resultado Bruto (ST) = Σ [ (Preço Venda × Qtd) - (PM × Qtd) - Custos ]
   Resultado Bruto (DT) = Σ [ (Preço Venda × Qtd) - (PM do dia × Qtd) - Custos ]

   PM = Preço Médio ponderado de aquisição (custo histórico incluindo
        corretagem e emolumentos)
   Custos = Corretagem + Emolumentos B3 + Taxa de liquidação + ISS

   ⚠ ST e DT são apurados em "silos" SEPARADOS e NUNCA se cruzam

PASSO 2 — VERIFICAÇÃO DE ISENÇÃO (apenas para ST com ações)
────────────────────────────────────────────────────────────────────
   Total Vendas Mês (ST Ações) = Σ preços de venda das ações vendidas no mês

   SE Total Vendas ≤ R$ 20.000:
      → Resultado isento. Não há DARF de ST de ações.
      → Registrar resultado positivo como "isento" na DIRPF.
      → Continuar apuração de DT se houver.

   SE Total Vendas > R$ 20.000:
      → Nenhuma isenção. Todo o lucro líquido é tributável.
      → Ir para Passo 3.

PASSO 3 — COMPENSAÇÃO DE PREJUÍZO ACUMULADO
────────────────────────────────────────────────────────────────────
   Base Tributável (ST) = Resultado Bruto (ST) - Carry-Forward Prejuízo (ST)
   Base Tributável (DT) = Resultado Bruto (DT) - Carry-Forward Prejuízo (DT)

   SE resultado for negativo: Base Tributável = 0
      → Acumular o saldo devedor para o mês seguinte (novo carry-forward)
      → Não há DARF neste mês para esta modalidade

   SE resultado for positivo: continuar Passo 4

PASSO 4 — CÁLCULO DO IR BRUTO
────────────────────────────────────────────────────────────────────
   IR Bruto (ST) = Base Tributável (ST) × 15%   [ou 20% para FIIs, ETFs de ações]
   IR Bruto (DT) = Base Tributável (DT) × 20%

PASSO 5 — DEDUÇÃO DO IRRF RETIDO NA FONTE ("DEDO-DURO")
────────────────────────────────────────────────────────────────────
   IRRF ST = 0,005% × Total Bruto de Alienações ST no mês
   IRRF DT = 1% × Resultado Positivo DT (dia a dia, retido pela corretora)

   IR Líquido (ST) = IR Bruto (ST) - IRRF (ST) acumulado no mês
   IR Líquido (DT) = IR Bruto (DT) - IRRF (DT) acumulado no mês

   SE IR Líquido < 0: o saldo de IRRF excedente é carry-forward fiscal
   (pode compensar nos meses seguintes até dezembro do mesmo ano)

PASSO 6 — VERIFICAÇÃO DO VALOR MÍNIMO
────────────────────────────────────────────────────────────────────
   IR Total Mês = IR Líquido (ST) + IR Líquido (DT)

   SE IR Total < R$ 10,00:
      → NÃO emitir DARF
      → Acumular para o mês seguinte (carry-forward fiscal de IR)

   SE IR Total ≥ R$ 10,00:
      → Emitir DARF 6015 com o valor calculado
      → Prazo: último dia útil do mês seguinte

PASSO 7 — EMISSÃO E PAGAMENTO DO DARF 6015
────────────────────────────────────────────────────────────────────
   Campos obrigatórios do DARF:
   • Período de apuração: MM/AAAA (mês competência)
   • CPF do contribuinte
   • Código da receita: 6015
   • Data de vencimento: último dia útil do mês seguinte
   • Valor principal: IR Total Mês calculado no Passo 5
   • (Se em atraso: Multa + Juros Selic calculados pelo SICALC)
```

### 3.2 Fórmula Consolidada

```
IR_a_Pagar = MAX(0,
    [Resultado_Bruto_ST - CarryForward_Prejuízo_ST] × Alíquota_ST
  + [Resultado_Bruto_DT - CarryForward_Prejuízo_DT] × 20%
  - IRRF_ST_acumulado_mês
  - IRRF_DT_acumulado_mês
  + CarryForward_IR_mínimo_meses_anteriores
)
```

**Onde:**
- `Alíquota_ST` = 15% para ações, BDRs, opções, futuros; 20% para FIIs e ETFs de ações
- `CarryForward_Prejuízo_ST` = saldo negativo acumulado de meses anteriores na modalidade ST
- `CarryForward_IR_mínimo` = IR apurado em meses anteriores não recolhido por ser < R$ 10

---

## 4. Regras de Isenção e Casos Especiais

### 4.1 A Isenção dos R$ 20.000 para Ações

**Base legal:** Art. 3º, §2º, inciso I da Lei 11.033/2004

A isenção se aplica quando **o valor total das alienações** (vendas) de ações no mercado à vista em determinado mês, para uma mesma pessoa física, for **igual ou inferior a R$ 20.000,00**.

Pontos críticos para implementação no CRM:

1. **O limite é sobre o valor VENDIDO, não sobre o lucro.** Se o investidor vendeu R$ 18.000 em ações com lucro de R$ 5.000, está isento. Se vendeu R$ 21.000 com lucro de R$ 500, é tributável.

2. **A isenção é binária, não proporcional.** Se ultrapassar R$ 20.000 em vendas, TODO o lucro do mês é tributado, não apenas o excedente.

3. **O limite é global para todas as corretoras.** O investidor que opera em múltiplas corretoras deve somar todas as vendas de ações do mês para verificar o limite.

4. **Ativos excluídos da isenção:** Day trade, FIIs, ETFs, BDRs, opções, futuros — para esses ativos, qualquer lucro é tributável independente do volume.

5. **Ouro como ativo financeiro** também se beneficia da isenção de R$ 20.000, mas com limite calculado separadamente das ações.

### 4.2 FIIs — Distinção entre Rendimentos e Ganho de Capital

| Tipo de Receita | Tributação | Observação |
|-----------------|------------|------------|
| Rendimentos distribuídos (dividendos) | Isentos de IR (PF) | Condicionado: fundo com + de 50 cotistas, PF com < 10% das cotas, e fundo negociado exclusivamente em bolsa |
| Ganho de capital na venda das cotas | 20% | Sem isenção, qualquer valor |

### 4.3 Opções — Momento de Reconhecimento do Ganho

| Situação | Momento de Apuração |
|----------|---------------------|
| Revenda do prêmio (antes do vencimento) | Data da operação de venda |
| Exercício da opção de compra (call) | Data do exercício |
| Exercício da opção de venda (put) | Data do exercício |
| Opção vence sem ser exercida | Data do vencimento |
| Day trade em opções | No próprio dia |

---

## 5. Apuração Separada: Swing Trade vs Day Trade

Este é um dos pontos mais críticos para a ferramenta do CRM. As duas modalidades **jamais se cruzam** para fins de compensação:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOIS POOLS COMPLETAMENTE SEPARADOS           │
├────────────────────────────┬────────────────────────────────────┤
│     SWING TRADE (ST)       │        DAY TRADE (DT)              │
│                            │                                    │
│ • Alíquota: 15% (ações)    │ • Alíquota: 20% (todos os ativos)  │
│             20% (FIIs/ETF) │ • Sem isenção de R$20k             │
│ • Isenção R$20k (ações)    │ • IRRF: 1% sobre lucro do dia      │
│ • IRRF: 0,005% sobre venda │ • Prejuízo compensado APENAS com   │
│ • Prejuízo compensado APENAS│   ganhos DT futuros               │
│   com ganhos ST futuros    │                                    │
│ • Pool separado por tipo   │ • Pool único (qualquer ativo DT)   │
│   de ativo (ações vs FIIs) │                                    │
└────────────────────────────┴────────────────────────────────────┘
```

**Exceção relevante para opções e futuros:** Prejuízos em operações comuns (ST) de opções e futuros podem compensar ganhos de QUALQUER ativo em operações comuns — ações, FIIs, ETFs, opções, futuros. Já o pool de ações ST e o pool de FIIs ST são distintos para fins de isenção, mas se cruzam para compensação de prejuízos na mesma modalidade (ST).

**Cenário típico misto:** Investidor que operou ST com ações abaixo de R$ 20k (isento) E teve day trade lucrativo no mesmo mês:
- ST com ações: isento, sem DARF
- DT: tributado a 20%, gera DARF normalmente
- Emite-se UM DARF 6015 com o valor do IR de DT

---

## 6. Calendário Fiscal e Penalidades por Atraso

### 6.1 Prazo de Recolhimento

**Regra geral:** O DARF 6015 deve ser pago até o **último dia útil do mês subsequente** ao mês de competência.

| Mês de Apuração | Prazo de Pagamento |
|-----------------|-------------------|
| Janeiro | Último dia útil de Fevereiro |
| Fevereiro | Último dia útil de Março |
| Março | Último dia útil de Abril |
| Abril | Último dia útil de Maio |
| Maio | Último dia útil de Junho |
| Junho | Último dia útil de Julho |
| Julho | Último dia útil de Agosto |
| Agosto | Último dia útil de Setembro |
| Setembro | Último dia útil de Outubro |
| Outubro | Último dia útil de Novembro |
| Novembro | Último dia útil de Dezembro |
| Dezembro | Último dia útil de Janeiro do ano seguinte |

> Para 2026: se o último dia útil do mês cair em feriado nacional ou bancário, o vencimento recua para o dia útil imediatamente anterior.

### 6.2 Penalidades por Atraso

O atraso gera **dois tipos de encargo**:

#### Multa de Mora (espontânea)
- **0,33% por dia** de atraso
- **Teto:** 20% do valor principal
- Começa a contar a partir do **1º dia útil após o vencimento**
- Exemplo: 61 dias de atraso → 61 × 0,33% = 20,13% → limitado a 20%

#### Juros de Mora (Selic)
- Taxa Selic acumulada mensalmente
- Contagem: a partir do **1º dia do mês seguinte** ao vencimento
- No mês do pagamento: acrescenta-se 1% fixo
- **Fórmula:**
  ```
  Juros = Σ Selic_mensal (mês_após_vencimento até mês_anterior_ao_pagamento) + 1%
  ```

#### Multa de Ofício (lançamento fiscal)
- Aplica-se quando a Receita Federal autua o contribuinte que **não regularizou espontaneamente**
- **75% do valor principal** (caso básico)
- **150%** em caso de sonegação, fraude ou conluio
- Não se confunde com a multa de mora; a multa de ofício **substitui** a multa de mora quando há autuação fiscal

> **Denúncia Espontânea:** Regularizar o DARF antes de ser notificado pela Receita Federal afasta a multa de ofício, mantendo apenas multa de mora (máx. 20%) + juros Selic. Fundamento: art. 138 do CTN.

---

## 7. Valor Mínimo DARF e Carry-Forward

### 7.1 A Regra do Mínimo de R$ 10,00

**Base legal:** Art. 68 da Lei nº 8.383/1991:
> *"É vedada a utilização de Documento de Arrecadação de Receitas Federais para o pagamento de tributos e contribuições de valor inferior a R$ 10,00 (dez reais)."*

### 7.2 Procedimento quando IR Apurado < R$ 10,00

O valor apurado mas não recolhido **deve ser somado às competências subsequentes** até que o total atinja ou ultrapasse R$ 10,00, quando então é gerado o DARF acumulado.

**Pontos de atenção:**
- O carry-forward de IR não gera multa nem juros — trata-se de diferimento permitido em lei
- O valor acumulado deve ser registrado internamente (controle do contribuinte)
- Quando emitir o DARF acumulado, o período de apuração informado deve ser o do **mês mais antigo** do período acumulado, ou alternativamente o mês corrente da emissão
- Na DIRPF anual, o valor total recolhido durante o ano deve ser informado ficha a ficha (vide seção 12)

**Exemplo prático de carry-forward:**
```
Janeiro: IR apurado = R$ 4,50 → acumular (total acumulado: R$ 4,50)
Fevereiro: IR apurado = R$ 3,20 → acumular (total acumulado: R$ 7,70)
Março: IR apurado = R$ 6,80 → total acumulado = R$ 14,50 → EMITIR DARF
         Competência do DARF: março/2026 (ou indicar acumulado)
         Valor: R$ 14,50
         Prazo: último dia útil de abril/2026
```

---

## 8. Fluxograma de Decisão: Gerar DARF ou Registrar Carry-Forward

```
                    INÍCIO DO MÊS (APURAÇÃO M)
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     [Há operações ST?]               [Há operações DT?]
              │                               │
       SIM    │                       SIM     │
              ▼                               ▼
   ┌──────────────────┐          ┌──────────────────────┐
   │ Calcular Resultado│         │ Calcular Resultado DT │
   │ Bruto ST por ativo│         │ Bruto (day a day)     │
   └────────┬─────────┘          └──────────┬───────────┘
            │                               │
   ┌────────▼─────────┐          ┌──────────▼───────────┐
   │ Ações ST:        │          │ Base DT =             │
   │ Vendas ≤ R$20k?  │          │ ResultadoBruto_DT -   │
   │    ─────────     │          │ CarryForward_Prej_DT  │
   │ SIM → ISENTO     │          └──────────┬───────────┘
   │ NÃO → Tributável │                     │
   └────────┬─────────┘          ┌──────────▼───────────┐
            │                   │ Base DT > 0?           │
   ┌────────▼─────────┐         └──────────┬───────────┘
   │ Base ST =         │               SIM  │  NÃO → Acumular
   │ ResultBruto_ST -  │                    │    prejuízo DT
   │ CarryForward_Prej_ST                   │
   └────────┬─────────┘         ┌──────────▼───────────┐
            │                   │ IR_DT = Base × 20%    │
   ┌────────▼─────────┐         │ - IRRF_DT_do_mês      │
   │ Base ST > 0?      │         └──────────┬───────────┘
   └────────┬─────────┘                     │
       SIM  │  NÃO → Acumular               │
            │    prejuízo ST                │
   ┌────────▼─────────┐                     │
   │ IR_ST =           │                     │
   │ Base × Alíquota   │                     │
   │ - IRRF_ST_do_mês  │                     │
   └────────┬─────────┘                     │
            │                               │
            └─────────────┬─────────────────┘
                          │
              ┌───────────▼──────────────┐
              │ IR_Total = IR_ST + IR_DT  │
              │ + CarryForward_IR_Mínimo  │
              └───────────┬──────────────┘
                          │
              ┌───────────▼──────────────┐
              │  IR_Total ≥ R$ 10,00?    │
              └───────────┬──────────────┘
                   SIM    │    NÃO
                          │      └──── REGISTRAR carry-forward IR
              ┌───────────▼──────────────┐     (somar ao mês seguinte)
              │  EMITIR DARF 6015         │
              │  Valor = IR_Total         │
              │  Prazo: último dia útil   │
              │  do mês seguinte          │
              └──────────────────────────┘
```

---

## 9. Fórmula de Multa e Juros por Atraso com Exemplo Numérico

### 9.1 Fórmulas

```
DARF_com_acréscimos = Principal + Multa_mora + Juros_mora

Multa_mora = MIN(Principal × 0,0033 × Dias_atraso ; Principal × 0,20)

Juros_mora = Principal × [Σ Selic_mensal(mês_M+1 até mês_P-1) + 0,01]
```

**Onde:**
- `Dias_atraso` = dias corridos a partir do 1º dia útil após o vencimento
- `mês_M+1` = primeiro mês após o vencimento do DARF
- `mês_P` = mês do pagamento
- `Σ Selic_mensal` = soma das taxas Selic mensais divulgadas pelo BCB
- `0,01` = 1% referente ao mês do pagamento (fixo)

> **Forma prática:** O SICALC (https://sicalc.receita.fazenda.gov.br) calcula automaticamente todos os acréscimos. O contribuinte informa apenas o código (6015), CPF, período e valor principal — o sistema retorna o DARF com multa e juros atualizados.

### 9.2 Exemplo Numérico Completo

**Cenário:** Investidor apurou R$ 2.500,00 de IR em janeiro/2026. Vencimento era 27/02/2026 (último dia útil de fevereiro). Pagou em atraso no dia 15/05/2026.

**Dados:**
- Principal: R$ 2.500,00
- Vencimento: 27/02/2026
- Data de pagamento: 15/05/2026
- Dias de atraso (27/02 a 15/05): 77 dias corridos
- Selic março/2026: 1,04% (hipotético)
- Selic abril/2026: 1,01% (hipotético)

**Cálculo da Multa de Mora:**
```
Multa = R$ 2.500,00 × 0,0033 × 77 dias = R$ 635,25
Limite: R$ 2.500,00 × 20% = R$ 500,00
Multa aplicada = R$ 500,00 (limitado ao teto de 20%)
```

**Cálculo dos Juros de Mora:**
```
Meses contados: março/2026 e abril/2026 (meses após o vencimento
                até antes do mês de pagamento)
Juros = R$ 2.500,00 × (1,04% + 1,01% + 1%)
       = R$ 2.500,00 × 3,05%
       = R$ 76,25
```

**Total a Pagar:**
```
DARF total = R$ 2.500,00 + R$ 500,00 + R$ 76,25 = R$ 3.076,25
```

> Custo do atraso: R$ 576,25 sobre um imposto de R$ 2.500 — um acréscimo de 23,05%.

---

## 10. Exemplos Numéricos Completos

### Exemplo 1 — Mês com Lucro (Swing Trade de Ações, Tributável)

**Perfil:** Investidor com carteira de ações na B3; sem prejuízo acumulado; sem DT.

**Operações em março/2026:**
- Venda de PETR4: 500 ações × R$ 38,00 = R$ 19.000 (PM: R$ 32,00)
- Venda de VALE3: 200 ações × R$ 75,00 = R$ 15.000 (PM: R$ 70,00)
- Corretagem e emolumentos totais: R$ 45,00

**Apuração:**
```
Total Vendas Mês = R$ 19.000 + R$ 15.000 = R$ 34.000
Como R$ 34.000 > R$ 20.000 → NÃO há isenção

Resultado Bruto PETR4 = (38 - 32) × 500 = R$ 3.000
Resultado Bruto VALE3 = (75 - 70) × 200 = R$ 1.000
Resultado Bruto Total ST = R$ 4.000

Custos dedutíveis = R$ 45,00
Resultado Líquido ST = R$ 4.000 - R$ 45 = R$ 3.955

Carry-Forward Prejuízo ST = R$ 0 (sem acumulado)
Base Tributável = R$ 3.955

IR Bruto ST = R$ 3.955 × 15% = R$ 593,25

IRRF Retido (dedo-duro) = R$ 34.000 × 0,005% = R$ 1,70
IR Líquido = R$ 593,25 - R$ 1,70 = R$ 591,55

IR a Recolher = R$ 591,55 (≥ R$ 10 → EMITIR DARF)
DARF 6015 — Competência: 03/2026 — Prazo: 30/04/2026
```

### Exemplo 2 — Mês com Prejuízo (Puro Carry-Forward)

**Perfil:** Investidor com operações ST de ações em abril/2026.

**Operações em abril/2026:**
- Venda de MGLU3: 1.000 ações × R$ 5,00 = R$ 5.000 (PM: R$ 8,00)
- Venda de COGN3: 500 ações × R$ 3,00 = R$ 1.500 (PM: R$ 4,50)

**Apuração:**
```
Total Vendas Mês = R$ 6.500
Como R$ 6.500 < R$ 20.000 → há isenção potencial

Mas há PREJUÍZO → não há IR a pagar de qualquer forma

Resultado MGLU3 = (5 - 8) × 1.000 = -R$ 3.000
Resultado COGN3 = (3 - 4,50) × 500 = -R$ 750
Resultado ST Total = -R$ 3.750

Ação: Registrar -R$ 3.750 como Carry-Forward Prejuízo ST
      para compensação em meses futuros.

NÃO emitir DARF — não há imposto a pagar.
Informar o prejuízo na ficha "Renda Variável" da DIRPF.
```

### Exemplo 3 — Mês Misto (ST Isento + Day Trade Lucrativo)

**Perfil:** Investidor que opera swing trade e day trade; sem prejuízo acumulado.

**Operações em maio/2026:**

*Swing Trade de Ações:*
- Venda de WEGE3: 300 ações × R$ 45 = R$ 13.500 (PM: R$ 40)
- Total vendas ST = R$ 13.500 (< R$ 20.000 → ISENTO)
- Lucro ST = R$ 1.500 → isento, sem DARF de ST

*Day Trade:*
- Compra e venda de PETR4 no mesmo dia: 1.000 ações com lucro bruto de R$ 1.800
- Corretagem e emolumentos DT: R$ 28,00
- IRRF DT retido pela corretora no dia = R$ 1.800 × 1% = R$ 18,00

**Apuração DT:**
```
Resultado Bruto DT = R$ 1.800
Custos DT = R$ 28,00
Resultado Líquido DT = R$ 1.800 - R$ 28 = R$ 1.772
Carry-Forward Prejuízo DT = R$ 0
Base Tributável DT = R$ 1.772

IR Bruto DT = R$ 1.772 × 20% = R$ 354,40
IRRF DT retido = R$ 18,00
IR Líquido DT = R$ 354,40 - R$ 18,00 = R$ 336,40
```

**DARF:**
```
IR a Recolher = R$ 336,40 (apenas DT)
DARF 6015 — Competência: 05/2026 — Prazo: último dia útil de junho/2026

O resultado ST isento (R$ 1.500) será declarado como rendimento isento
na ficha correspondente da DIRPF 2027 (ano-base 2026).
```

---

## 11. DARF Retroativo: Regularização e Parcelamento

### 11.1 Regularização Espontânea (Antes de Autuação)

O caminho mais vantajoso para regularizar DARFs em atraso antes de qualquer notificação fiscal:

1. **Recalcular o IR** que deveria ter sido recolhido em cada competência em atraso
2. **Acessar o SICALC** (https://sicalc.receita.fazenda.gov.br) informando:
   - Código 6015
   - CPF
   - Período de apuração (mês/ano original)
   - Valor original do imposto (sem os acréscimos — o SICALC os calcula)
3. **O sistema gera automaticamente** o DARF com multa de mora (máx. 20%) e juros Selic
4. **Pagar** via internet banking, Pix (se habilitado) ou agência bancária

**Vantagem:** A denúncia espontânea (art. 138 CTN) afasta a multa de ofício (75-150%) e mantém apenas encargos legais normais.

### 11.2 Parcelamento de DARFs em Atraso

Quando o montante total em atraso é significativo, o contribuinte pode optar pelo parcelamento:

**Parcelamento Ordinário (Receita Federal — e-CAC):**
- Acesso: Portal e-CAC → "Pagamentos e Parcelamentos"
- Prazo máximo: **60 parcelas mensais**
- Correção: Taxa Selic acumulada sobre o saldo devedor
- Parcela mínima: R$ 200,00
- Sem desconto sobre principal, multa ou juros já incorridos
- O parcelamento constitui **confissão irretratável** do débito

**Transação Tributária (PGFN — Dívida Ativa):**
- Aplicável quando o débito já foi inscrito em Dívida Ativa da União
- Portal: https://www.regularize.pgfn.gov.br
- Pode oferecer descontos de até 70% sobre multas, juros e encargos
- Prazos superiores: até 133 meses para PF
- Entrada de 6% do valor total em até 12 vezes
- O débito de renda variável pode ser objeto de transação

> **Alerta:** Débitos de IR sobre renda variável entram em Dívida Ativa após inscrição, gerando bloqueio no CPF, impossibilidade de obtenção de certidão negativa e restrições a financiamentos imobiliários.

---

## 12. Integração com DIRPF — Declaração Anual

A DIRPF (Declaração de Imposto de Renda Pessoa Física) captura o histórico fiscal anual das operações de renda variável em fichas específicas. A ferramenta CRM deve gerar os dados no formato exigido pelo programa da Receita Federal.

### 12.1 Fichas Relevantes da DIRPF

#### Ficha 1 — Bens e Direitos (Posição em 31/12)

| Ativo | Grupo | Código | Valor a Informar |
|-------|-------|--------|-----------------|
| Ações | 03 | 01 | Custo médio de aquisição em 31/12 |
| FIIs | 07 | 03 | Custo médio de aquisição em 31/12 |
| ETFs de ações | 07 | 09 | Custo médio de aquisição em 31/12 |
| BDRs | 04 | 04 | Custo médio de aquisição em 31/12 |
| Opções em aberto | 07 | 01 | Prêmio pago/recebido |

> Importante: reportar sempre pelo **custo histórico** (preço médio de aquisição), nunca pelo valor de mercado.

#### Ficha 2 — Rendimentos Isentos e Não Tributáveis

| Código | Conteúdo |
|--------|----------|
| 09 | Lucros e dividendos recebidos (ações, FIIs quando cumpridos requisitos) |
| 20 | Ganhos com ações ST cujas vendas mensais ficaram ≤ R$ 20.000 |

#### Ficha 3 — Rendimentos Sujeitos à Tributação Exclusiva/Definitiva

| Código | Conteúdo |
|--------|----------|
| 10 | Juros Sobre Capital Próprio (JCP) — retido 15% na fonte |

#### Ficha 4 — Renda Variável (A mais importante para o CRM)

Esta ficha tem sub-abas:

**Aba "Operações Comuns / Day-Trade":**
- Preencher mês a mês (janeiro a dezembro)
- Informar: Mercado à vista, Mercado a termo, Mercado de opções, Mercado futuro, FIIs
- Para cada mês: resultado positivo ou negativo, imposto retido na fonte, imposto pago
- O programa calcula automaticamente se há IR adicional ou restituição

**Aba "Operações em Bolsa com Ouro":**
- Separado das demais ações

**Campos por mês (para cada sub-mercado):**
```
Mês: [MM/AAAA]
Resultado (Operações Comuns): R$ ___  [positivo=lucro; negativo=prejuízo]
Resultado (Day Trade): R$ ___
Imposto retido na fonte (Comuns): R$ ___  [IRRF 0,005%]
Imposto retido na fonte (Day Trade): R$ ___  [IRRF 1%]
Imposto pago (DARF emitido): R$ ___
```

#### Ficha 5 — Imposto Pago/Retido

Consolidação anual do imposto pago via DARF (código 6015) e do IRRF retido pela corretora. Este campo é automaticamente preenchido pelo programa da Receita quando o contribuinte preenche a ficha de Renda Variável.

### 12.2 Regra Prática para o CRM

O CRM deve gerar, para cada cliente, ao final do ano:

1. **Relatório mensal consolidado** com resultado ST, resultado DT, IRRF retido, IR pago via DARF e carry-forward de prejuízo
2. **Planilha para DIRPF** com os 12 meses preenchidos no formato exigido pela ficha Renda Variável
3. **Saldo de prejuízo a compensar** para levar ao próximo ano-calendário
4. **Total de IRRF retido** pela corretora no ano (constante no Informe de Rendimentos da corretora)

---

## 13. Implicações para a Ferramenta CRM

Com base em toda a análise, a ferramenta de apuração mensal no CRM do assessor XP deve implementar os seguintes módulos:

### 13.1 Motor de Apuração Mensal

```python
# Pseudocódigo da lógica de apuração
def apurar_mes(cliente_id, mes, ano):
    operacoes = buscar_operacoes(cliente_id, mes, ano)
    carry_forward = buscar_carry_forward(cliente_id, mes - 1, ano)

    resultado_st = calcular_resultado_bruto(operacoes, modalidade="ST")
    resultado_dt = calcular_resultado_bruto(operacoes, modalidade="DT")

    # Verificar isenção ST ações
    total_vendas_acoes_st = somar_vendas_acoes(operacoes, modalidade="ST")
    st_isento = total_vendas_acoes_st <= 20_000

    # Calcular base tributável
    base_st = max(0, resultado_st - carry_forward.prejuizo_st) if not st_isento else 0
    base_dt = max(0, resultado_dt - carry_forward.prejuizo_dt)

    # Calcular IR bruto
    ir_st = calcular_ir_st(base_st, tipo_ativo)  # 15% ações, 20% FIIs
    ir_dt = base_dt * 0.20

    # Deduzir IRRF
    irrf_st = calcular_irrf_st(operacoes)   # 0,005% sobre vendas
    irrf_dt = calcular_irrf_dt(operacoes)   # 1% sobre lucro DT

    # IR líquido
    ir_liquido = max(0, ir_st - irrf_st) + max(0, ir_dt - irrf_dt)
    ir_liquido += carry_forward.ir_minimo  # acumular meses anteriores < R$10

    # Decisão DARF
    if ir_liquido >= 10:
        emitir_darf(cliente_id, ir_liquido, mes, ano)
        novo_carry_forward_ir_minimo = 0
    else:
        novo_carry_forward_ir_minimo = ir_liquido

    # Atualizar carry-forward prejuízo
    novo_carry_forward_st = max(0, carry_forward.prejuizo_st - resultado_st) if resultado_st < 0 else carry_forward.prejuizo_st - min(carry_forward.prejuizo_st, resultado_st)
    # [lógica análoga para DT]

    salvar_resultado_mes(cliente_id, mes, ano, {
        "resultado_st": resultado_st,
        "resultado_dt": resultado_dt,
        "ir_pago": ir_liquido if ir_liquido >= 10 else 0,
        "carry_forward_st": novo_carry_forward_st,
        "carry_forward_dt": novo_carry_forward_dt,
        "carry_forward_ir_minimo": novo_carry_forward_ir_minimo,
        "st_isento": st_isento,
    })
```

### 13.2 Alertas e Notificações para o Assessor

| Situação | Alerta |
|----------|--------|
| IR apurado ≥ R$ 10 | "DARF 6015 de R$ X.XX gerado — vencimento DD/MM/AAAA" |
| IR < R$ 10 | "IR de R$ X.XX acumulado — será somado ao próximo mês" |
| Prazo DARF em 5 dias úteis | "Lembrete: DARF de CLIENTE vence em 5 dias úteis" |
| DARF não pago após vencimento | "Alerta: DARF em atraso — multa de R$ X.XX já acumulada" |
| Vendas ST próximas de R$ 20k | "Atenção: vendas em R$ 18.500 — próximo do limite de isenção de R$ 20k" |
| Mês com grande prejuízo | "Prejuízo de R$ X.XX registrado — carry-forward atualizado" |

---

## 14. Referências

1. **Lei nº 11.033/2004** — Tributação do mercado financeiro e de capitais; isenção de R$ 20.000 e alíquotas de IR para renda variável. Disponível em: https://www2.camara.leg.br/legin/fed/lei/2004/lei-11033-21-dezembro-2004-535177-publicacaooriginal-22704-pl.html

2. **Lei nº 8.383/1991, art. 68** — Vedação de DARF inferior a R$ 10,00. Disponível em legislação federal.

3. **Receita Federal do Brasil — Isenções em Renda Variável** — Orientações oficiais sobre a regra dos R$ 20.000 para ações. https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/isencoes

4. **SICALC — Glossário e Cálculo de Multa** — Definições oficiais de multa de mora, juros de mora e multa de ofício. https://sicalc.receita.fazenda.gov.br/sicalc/glossario

5. **darf6015.com.br — Guia IR Ações 2026** — Tabela comparativa ST vs DT, fórmula de apuração, IRRF. https://www.darf6015.com.br/

6. **InfoMoney — DARF em Atraso Renda Variável** — Procedimentos de geração de DARF retroativo e penalidades. https://www.infomoney.com.br/minhas-financas/deixou-de-pagar-o-ir-sobre-renda-variavel-em-2025-veja-como-gerar-darf/

7. **NuInvest — Tributação em Renda Variável** — Tabela por tipo de ativo, IRRF, compensação de perdas. https://www.nuinvest.com.br/tributacao-de-renda-variavel.html

8. **Digital Comum — Declarar Ações IR 2026** — Regra R$ 20k, DARF mensal, exemplos numéricos, fichas DIRPF. https://digitalcomum.com.br/declarar-acoes-ir-2026/

9. **Seu Dinheiro — ETFs no IR 2026** — Tributação de ETFs de ações vs renda fixa, código DARF, isenção. https://www.seudinheiro.com/2026/financas-pessoais/como-declarar-etf-no-imposto-de-renda-2026-julw/

10. **Seu Dinheiro — Opções no IR 2026** — Titular, lançador, momentos de reconhecimento de ganho, alíquotas. https://www.seudinheiro.com/2026/financas-pessoais/como-declarar-opcoes-de-no-imposto-de-renda-2026-julw/

11. **iDinheiro — Como Calcular DARF em Atraso** — Fórmula de multa e juros, uso do SICALC. https://www.idinheiro.com.br/investimentos/como-calcular-darf-em-atraso/

12. **Blindagem Fiscal — Parcelamento de Dívida Fiscal PF 2026** — Parcelamento ordinário (e-CAC, 60x) vs Transação PGFN (Regularize, até 133x). https://blindagemfiscal.com.br/blog/parcelamento-divida-receita-federal-pessoa-fisica-irpf-o-guia-definitivo-2026/

13. **Adriano Freire — Como Declarar Ações e FIIs no IR 2026** — Alíquotas, custo médio, isenção FIIs, bens e direitos. https://www.adrianofreire.com.br/blog/como-declarar-acoes-fiis-ir-2026

14. **Nelogica — Cálculo IR e Geração de DARFs** — Detalhe técnico do cálculo do IR sobre lucros e emissão de DARFs em plataformas de trading. https://ajuda.nelogica.com.br/hc/pt-br/articles/360052124371

15. **Receita Federal — Notícia: Ferramenta B3-RFB para Cálculo de IR** — Anúncio (dez/2024) de ferramenta conjunta B3 + Receita Federal para pré-preenchimento de dados de renda variável. https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2024/dezembro/receita-federal-e-b3-anunciam-ferramenta-inedita-para-calcular-imposto-de-renda

---

*Documento elaborado com base em pesquisa de fontes primárias (Receita Federal, legislação federal) e fontes secundárias especializadas em tributação de renda variável. Data de referência: maio de 2026. Verificar atualizações normativas antes de implementação.*
