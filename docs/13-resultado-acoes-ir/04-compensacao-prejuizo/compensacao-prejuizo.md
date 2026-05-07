# Compensação de Prejuízos em Renda Variável — Guia Completo para Implementação

> **Escopo:** Regras avançadas de carry-forward de prejuízo em operações de renda variável (B3), com foco em edge cases críticos para sistemas automatizados de apuração de IR.
>
> **Contexto de uso:** Ferramenta de cálculo de IR integrada ao CRM de assessores XP (Next.js 14 + Firebase Firestore), modelo `saldo_prejuizo` com dois saldos segregados (ST e DT).
>
> **Data de referência:** Maio de 2026
> **Base legal principal:** Lei 8.981/1995 (arts. 72–75), IN RFB nº 1.585/2015, IN RFB nº 2.055/2021, Lei 11.033/2004 (FIIs), IN RFB nº 1.888/2019 (criptoativos)

---

## Sumário

1. [Regra Básica de Segregação ST × DT](#1-regra-básica-de-segregação-st--dt)
2. [Mapa de Classes de Ativos — "Cestas" de Compensação](#2-mapa-de-classes-de-ativos--cestas-de-compensação)
3. [Interação com a Isenção de R$ 20.000](#3-interação-com-a-isenção-de-r-20000)
4. [Compensação Parcial no Mesmo Mês](#4-compensação-parcial-no-mesmo-mês)
5. [Compensação Retroativa e Reprocessamento em Cascata](#5-compensação-retroativa-e-reprocessamento-em-cascata)
6. [Carry-Forward — Edge Cases de Estado](#6-carry-forward--edge-cases-de-estado)
7. [Múltiplas Corretoras — Agregação por CPF](#7-múltiplas-corretoras--agregação-por-cpf)
8. [DIRPF Anual — Integração com a Declaração](#8-dirpf-anual--integração-com-a-declaração)
9. [Edge Cases que Quebram Sistemas Automatizados](#9-edge-cases-que-quebram-sistemas-automatizados)
10. [Modelo de Dados Recomendado — TypeScript/Firestore](#10-modelo-de-dados-recomendado--typescriptfirestore)
11. [Algoritmo de Apuração Mensal — Pseudocódigo](#11-algoritmo-de-apuração-mensal--pseudocódigo)
12. [Checklist de Conformidade para o Sistema](#12-checklist-de-conformidade-para-o-sistema)
13. [Referências](#13-referências)

---

## 1. Regra Básica de Segregação ST × DT

### 1.1 Princípio Fundamental

A regra de compensação de prejuízos em renda variável exige **segregação total e absoluta** entre duas modalidades operacionais:

| Modalidade | Definição | Alíquota | Pode compensar |
|---|---|---|---|
| **Operações Comuns (ST)** | Compra e venda em dias diferentes ("swing trade") | 15% | Apenas resultado ST |
| **Day Trade (DT)** | Compra e venda no mesmo dia, mesmo ativo, mesma corretora | 20% | Apenas resultado DT |

**Não existe cruzamento entre as modalidades.** Um prejuízo de R$ 1.000 em DT não reduz o ganho de R$ 1.000 em ST do mesmo mês — ambos são tratados de forma completamente independente.

### 1.2 Base Legal

- **Lei 8.981/1995, art. 72**: institui o imposto sobre ganhos líquidos em operações de renda variável, calculados mensalmente.
- **Lei 8.981/1995, art. 75, § 1º**: determina que os prejuízos de operações em bolsa podem ser compensados nos meses subsequentes.
- **IN RFB nº 1.585/2015, art. 56**: regulamenta os ganhos líquidos e a forma de compensação; estabelece que a compensação de prejuízo deve ocorrer dentro da mesma natureza de operação.
- **IN RFB nº 2.055/2021**: atualiza regras gerais de compensação tributária.
- **Perguntas e Respostas IRPF — Receita Federal (Q&A anual)**: confirma a segregação ST × DT e a inexistência de prazo de expiração.

### 1.3 Sem Prazo de Expiração

**Confirmado:** Não existe prazo de validade para o saldo de prejuízo acumulado em renda variável. Um prejuízo ocorrido em janeiro de 2020, devidamente declarado em cada DIRPF anual, pode ser compensado com ganhos obtidos em 2026 ou em qualquer ano futuro.

**Condição sine qua non:** o saldo deve ser informado todos os anos na DIRPF, na ficha "Renda Variável", campo "Resultado negativo até o mês anterior" (no demonstrativo mensal) e "Resultado negativo no ano-anterior" (no campo de carry-forward interanual). Se o investidor omitir o saldo em uma declaração, o prejuízo "deixa de existir" para fins fiscais futuros e só pode ser recuperado via declaração retificadora (ver seção 5).

---

## 2. Mapa de Classes de Ativos — "Cestas" de Compensação

### 2.1 Visão Geral das Cestas

O sistema deve tratar cada cesta como um grupo isolado de compensação. Prejuízos de uma cesta **jamais** compensam ganhos de outra cesta.

```
CESTA A — "Bolsa Geral" (ST 15% / DT 20%)
  ├── Ações (ON, PN, Units) — Mercado à vista B3
  ├── ETFs de ações (BOVA11, IVVB11, etc.)
  ├── BDRs (AAPL34, AMZO34, etc.)
  ├── Opções (calls e puts sobre ações)
  ├── Contratos futuros (IBOV, WIN, IND, WDO, DOL, DI1)
  └── Mercado a Termo (ações)

CESTA B — "FII/Fiagro" (ST 20% / DT 20%) [veja nota 2026]
  ├── FIIs (KNRI11, HGLG11, etc.)
  └── Fiagros (AGRI11, RURA11, etc.)

CESTA C — "Criptoativos" (15% acima de R$35k/mês — exchange nacional)
  ├── Bitcoin (BTC)
  ├── Ethereum (ETH)
  └── Demais criptoativos negociados em exchange nacional

CESTA D — "Investimentos no Exterior" (Lei 14.754/2023)
  └── Ativos em exchanges/corretoras estrangeiras (regime anual)
```

> **Nota sobre FII em 2026:** A MP 1.303/2025, que pretendia alterar substancialmente a tributação de FIIs (reduzindo o ganho de capital para 17,5% e tributando dividendos), **caducou em outubro de 2025** por não ter sido votada no prazo constitucional. Portanto, as regras vigentes em 2026 para FIIs permanecem: dividendos isentos (com requisitos da Lei 11.033/2004) e ganho de capital tributado a **20%** para PF.

### 2.2 Detalhamento por Classe de Ativo

#### 2.2.1 Ações

- Integram a Cesta A (Bolsa Geral).
- Isenção de R$ 20.000 em vendas mensais (somente ações à vista — ver seção 3).
- Prejuízo de ação compensa ganho de ETF, BDR, opção ou futuro (desde que mesma modalidade ST ou DT).

#### 2.2.2 ETFs de Ações

- Integram a Cesta A.
- **Não têm isenção de R$ 20.000** — todo ganho é tributável, independente do valor vendido.
- O IRRF é retido na fonte (0,005% do valor da venda para ST; 1% para DT) mesmo que o investidor fique abaixo de qualquer limite.
- Prejuízo de ETF compensa ganho em ações, BDRs, opções e futuros (mesma modalidade).

#### 2.2.3 BDRs

- Integram a Cesta A.
- **Não têm isenção de R$ 20.000**.
- Alíquota: 15% ST / 20% DT (mesmas alíquotas da Cesta A).
- Prejuízo de BDR compensa ganho em ações, ETFs, opções e futuros.

#### 2.2.4 Opções

- Integram a Cesta A.
- Tanto a compra/venda de opções (prêmio) quanto o exercício são tributados dentro da Cesta A.
- **Ponto crítico:** Na venda/exercício de opções, o resultado (ganho ou prejuízo) entra na mesma cesta das ações. Prejuízo em opções compensa ganho em ações e vice-versa.
- Sem isenção de R$ 20.000.

#### 2.2.5 Contratos Futuros (WIN, IND, WDO, DOL, DI1)

- Integram a Cesta A.
- Alíquota: 15% ST / 20% DT.
- A IN RFB 1.585/2015 confirma que futuros compõem o mesmo grupo de compensação das ações para fins de IR.
- **Atenção:** contratos futuros ajustados diariamente (ajuste diário) — cada ajuste positivo ou negativo compõe o resultado do mês.

#### 2.2.6 FIIs (Fundos de Investimento Imobiliário)

- Integram a Cesta B — **completamente separados** da Cesta A.
- Ganho de capital na venda de cotas: 20%.
- Rendimentos distribuídos: isentos para PF (requisitos: fundo com > 50 cotistas, PF < 10% das cotas, cotas negociadas em bolsa).
- **Prejuízo de FII compensa somente ganho em FII ou Fiagro.**
- Prejuízo de FII não compensa ganho em ações, ETF, BDR ou opções.

#### 2.2.7 Fiagros (Fundos do Agronegócio)

- Integram a Cesta B junto com FIIs.
- Prejudica/compensa na mesma cesta: perdas de Fiagro compensam ganhos de FII e vice-versa.
- Ganho de capital: 20%.

#### 2.2.8 Criptoativos (Exchanges Nacionais)

- Cesta C — completamente isolada.
- Regime: isenção para ganhos até R$ 35.000/mês; 15% acima disso (IN RFB 1.888/2019).
- **Prejuízo em cripto não compensa ganho em ações e vice-versa.**
- Para exchanges nacionais: não há mecanismo de carry-forward de prejuízo explicitamente regulamentado (a IN 1.888 não prevê compensação intertemporal para exchanges nacionais da mesma forma que o regime de bolsa).
- Para exchanges internacionais: a partir de jan/2024 (Lei 14.754/2023), há compensação anual dentro do mesmo regime.

### 2.3 Tabela de Compensação Cruzada

```
          | Ação | ETF | BDR | Opção | Futuro | FII | Fiagro | Cripto
----------|------|-----|-----|-------|--------|-----|--------|-------
Ação      |  ✓   |  ✓  |  ✓  |   ✓   |   ✓    |  ✗  |   ✗    |   ✗
ETF       |  ✓   |  ✓  |  ✓  |   ✓   |   ✓    |  ✗  |   ✗    |   ✗
BDR       |  ✓   |  ✓  |  ✓  |   ✓   |   ✓    |  ✗  |   ✗    |   ✗
Opção     |  ✓   |  ✓  |  ✓  |   ✓   |   ✓    |  ✗  |   ✗    |   ✗
Futuro    |  ✓   |  ✓  |  ✓  |   ✓   |   ✓    |  ✗  |   ✗    |   ✗
FII       |  ✗   |  ✗  |  ✗  |   ✗   |   ✗    |  ✓  |   ✓    |   ✗
Fiagro    |  ✗   |  ✗  |  ✗  |   ✗   |   ✗    |  ✓  |   ✓    |   ✗
Cripto    |  ✗   |  ✗  |  ✗  |   ✗   |   ✗    |  ✗  |   ✗    |   ✓

Legenda: ✓ = pode compensar (dentro da mesma modalidade ST ou DT)
         ✗ = NUNCA pode compensar (cestas diferentes)
```

---

## 3. Interação com a Isenção de R$ 20.000

### 3.1 Regra da Isenção — Definição Precisa

A isenção de R$ 20.000 mensais se aplica **exclusivamente** a:

- Ações negociadas no mercado à vista na B3 (operações comuns/ST)
- Ouro como ativo financeiro (negociado na B3)

**Não se aplica a:** ETFs, BDRs, opções, futuros, FIIs, Fiagros, criptoativos, day trade de qualquer ativo.

**O critério é o valor total de vendas no mês, não o lucro.** Se o investidor vendeu R$ 19.999 em ações no mês e obteve R$ 5.000 de lucro, há isenção. Se vendeu R$ 20.001, não há isenção e o IR incide sobre o lucro inteiro.

### 3.2 Cenário: Mês Isento + Prejuízo no Mesmo Mês

**Pergunta crítica:** Se o investidor tem vendas de ações ≤ R$ 20.000 (isento) mas realiza vendas com prejuízo, o que acontece com o saldo de prejuízo?

**Resposta:** O prejuízo **entra normalmente para o carry-forward** (saldo ST). A isenção e o carry-forward são mecanismos independentes.

**Exemplo:**

```
Mês: Janeiro/2026
Vendas de ações: R$ 18.000 (< R$ 20k → mês isento)
Resultado das operações: -R$ 2.000 (prejuízo)

Comportamento correto:
- IR do mês = R$ 0 (isento)
- saldo_prejuizo_st += R$ 2.000
- O saldo de R$ 2.000 é carregado para fevereiro

Comportamento ERRADO (não implementar):
- "Mês isento, logo não há resultado tributável, logo não há prejuízo"
- Isso zeraria o carry-forward indevidamente
```

### 3.3 Cenário: Mês Isento + Saldo de Prejuízo Anterior

**Pergunta:** Se o mês é isento (vendas ≤ R$ 20k), pode-se usar o saldo de prejuízo anterior para "zerar" o ganho?

**Resposta:** A isenção já elimina o imposto. Usar o saldo de prejuízo neste caso é **desnecessário e incorreto** — o saldo deve ser preservado integralmente para meses futuros tributáveis.

**Exemplo:**

```
Situação:
- saldo_prejuizo_st_anterior = R$ 3.000
- Mês: vendas de ações = R$ 15.000, ganho = R$ 1.000 (isento)

Comportamento correto:
- IR do mês = R$ 0 (isento pela regra dos R$ 20k)
- saldo_prejuizo_st_anterior permanece = R$ 3.000 (NÃO reduz)
- O ganho de R$ 1.000 não "consome" o saldo porque não há IR a pagar

Lógica: a isenção NÃO "usa" o saldo de prejuízo.
O saldo só é consumido quando há IR efetivamente a pagar.
```

### 3.4 Cenário: Ganho ST com Saldo de Prejuízo — Mês Potencialmente Isento

**Pergunta:** O investidor tem R$ 5.000 de ganho em ações, vendas totais de R$ 15.000 (isento), e R$ 8.000 de saldo de prejuízo ST. Como tratar?

**Resposta:**

```
Passo 1: Verificar isenção
  vendas_totais_acoes = R$ 15.000 → isento = true

Passo 2: Como isento = true, IR = R$ 0
  Saldo de prejuízo NÃO é consumido

Passo 3: carry-forward
  saldo_prejuizo_st permanece = R$ 8.000

Resultado: DARF = R$ 0, saldo continua intacto
```

### 3.5 Cenário: Limite de R$ 20k Rompido por Margem Mínima

**Este é o maior edge case da isenção.**

```
Vendas no mês:
  PETR4: R$ 19.950 (lucro R$ 2.000)
  VALE3: R$ 100   (lucro R$ 50)
  Total vendas: R$ 20.050 → ACIMA do limite → SEM isenção

IR a pagar = R$ 2.050 × 15% = R$ 307,50
DARF OBRIGATÓRIO.

Se as vendas fossem R$ 20.000 exatos:
  O limite é ESTRITO: R$ 20.000 ou menos = isento.
  R$ 20.001 = NÃO isento (sobre o ganho TOTAL, não apenas o excesso).
```

**Implementação crítica:** O sistema deve calcular o total de vendas de ações (somente ações, não ETF/BDR/opções) antes de decidir pela isenção. Um centavo acima de R$ 20.000 elimina toda a isenção do mês.

### 3.6 ETF no Mesmo Mês que Ações — Não Contamina o Limite

Vendas de ETFs, BDRs, opções e outros ativos **não entram no cálculo do limite de R$ 20.000** para a isenção de ações. Os dois regimes são independentes:

```
Exemplo:
  Vendas de BOVA11 (ETF): R$ 50.000 → sempre tributado (15%), sem isenção
  Vendas de ações: R$ 18.000 → isento (< R$ 20k)

O montante do ETF NÃO soma ao limite de isenção das ações.
```

---

## 4. Compensação Parcial no Mesmo Mês

### 4.1 Regra Geral

A compensação do saldo de prejuízo acumulado ocorre antes do cálculo do IR. A base de cálculo é sempre o **ganho líquido do mês menos o saldo de prejuízo disponível** (respeitando a modalidade).

```
base_calculo_st = max(0, ganho_bruto_st_mes - saldo_prejuizo_st)
novo_saldo_st = max(0, saldo_prejuizo_st - ganho_bruto_st_mes)
```

### 4.2 Exemplo: Compensação Parcial

```
saldo_prejuizo_st_anterior = R$ 5.000
ganho_bruto_st_mes = R$ 3.000

base_calculo = max(0, 3.000 - 5.000) = R$ 0
novo_saldo = max(0, 5.000 - 3.000) = R$ 2.000

IR = R$ 0
DARF = não emitir
novo saldo_prejuizo_st = R$ 2.000
```

### 4.3 Exemplo: Compensação Total com Saldo Residual para IR

```
saldo_prejuizo_st_anterior = R$ 1.000
ganho_bruto_st_mes = R$ 4.000

base_calculo = max(0, 4.000 - 1.000) = R$ 3.000
novo_saldo = max(0, 1.000 - 4.000) = R$ 0

IR = R$ 3.000 × 15% = R$ 450
DARF = R$ 450 (se ≥ R$ 10)
novo saldo_prejuizo_st = R$ 0
```

### 4.4 Interação com IRRF Retido ("Dedo-Duro")

O IRRF retido pela corretora (0,005% ST / 1% DT sobre o valor da venda) é deduzido do IR apurado do mês:

```
IR_apurado_st = base_calculo_st × 0,15
IR_a_pagar_st = max(0, IR_apurado_st - irrf_retido_st_mes)

Se IR_a_pagar_st > 0 → emitir DARF (se ≥ R$ 10)
Se IR_a_pagar_st < 0 → IRRF pago em excesso; compensar no próximo mês
```

**Importante:** O excesso de IRRF não compensa saldo de prejuízo. É um crédito fiscal separado que reduz o IR calculado nos meses seguintes (ou na DIRPF anual). O carry-forward de IRRF e o carry-forward de prejuízo são campos distintos no modelo de dados.

### 4.5 Mês com Ganho Isento (ações ≤ R$ 20k) E IRRF Retido

Neste caso, o IRRF foi retido mesmo sendo isento (a corretora retém automaticamente sem considerar o limite mensal):

```
Exemplo:
  Vendas de ações: R$ 15.000 → isento
  Lucro: R$ 800
  IRRF retido pela corretora: R$ 15.000 × 0,005% = R$ 0,75

  IR do mês: R$ 0 (isento)
  IRRF de R$ 0,75 virou crédito a compensar nos meses seguintes

  Na DIRPF anual, esse IRRF é declarado em "Imposto pago/retido" e
  pode gerar restituição se não houver IR a compensar no ano.
```

---

## 5. Compensação Retroativa e Reprocessamento em Cascata

### 5.1 O Problema do Processamento Fora de Ordem

Em um sistema CRM, o assessor pode importar notas de corretagem fora de sequência cronológica. Exemplos:

- Importa notas de março/2026 → processa
- Importa notas de janeiro/2026 retroativamente
- Agora todos os cálculos de fevereiro e março estão incorretos

**O sistema DEVE suportar reprocessamento retroativo em cascata.**

### 5.2 Limite de Retroatividade

**Não existe limite de retroatividade para compensar o prejuízo em si** — um prejuízo de 2020 pode compensar ganho de 2026, desde que declarado.

**Porém, existe limite para retificar declarações:** A declaração retificadora tem prazo de **5 anos contados do primeiro dia do ano seguinte ao fato gerador**. Exemplo:

| Prejuízo em | Pode retificar até |
|---|---|
| 2020 | 31/12/2025 |
| 2021 | 31/12/2026 |
| 2022 | 31/12/2027 |
| 2023 | 31/12/2028 |
| 2024 | 31/12/2029 |
| 2025 | 31/12/2030 |

**Implicação para o sistema:** Para notas importadas retroativamente de anos que ainda estão dentro do prazo de retificação, o sistema deve recalcular e sinalizar que o cliente precisa entregar uma declaração retificadora.

### 5.3 Algoritmo de Reprocessamento em Cascata (Firestore)

O modelo Firestore deve suportar a seguinte lógica quando uma nota é inserida fora de ordem:

```typescript
async function reprocessarAPartirDe(
  clienteId: string,
  anoMesInicio: string // formato "YYYY-MM"
): Promise<void> {
  // 1. Busca todos os registros mensais a partir do mês afetado
  const mesesAfetados = await getMesesAPartirDe(clienteId, anoMesInicio);

  // 2. Obtém o saldo de prejuízo imediatamente ANTES do mês de início
  const saldoAnterior = await getSaldoPrejuizoAte(clienteId, getMesAnterior(anoMesInicio));

  let saldoSt = saldoAnterior.st;
  let saldoDt = saldoAnterior.dt;
  let irrf_acumulado_st = saldoAnterior.irrfSt;
  let irrf_acumulado_dt = saldoAnterior.irrfDt;

  // 3. Reprocessa cada mês em ordem cronológica
  for (const mes of mesesAfetados.sort()) {
    const notas = await getNotasDoMes(clienteId, mes);
    const resultado = calcularResultadoMensal(notas, saldoSt, saldoDt, irrf_acumulado_st, irrf_acumulado_dt);

    // 4. Atualiza o registro do mês no Firestore (upsert)
    await upsertApuracaoMensal(clienteId, mes, resultado);

    // 5. Propaga os saldos para o próximo mês
    saldoSt = resultado.saldo_prejuizo_st_final;
    saldoDt = resultado.saldo_prejuizo_dt_final;
    irrf_acumulado_st = resultado.irrf_a_compensar_st;
    irrf_acumulado_dt = resultado.irrf_a_compensar_dt;
  }
}
```

**Atenção ao Firestore:** Use batch writes para garantir atomicidade. Nunca atualize múltiplos documentos mensais em escritas separadas (risco de estado inconsistente se uma falhar).

### 5.4 Estrutura de Dados Recomendada para Cascata

O Firestore deve ter uma flag indicando que o mês está "dirty" (precisa reprocessar):

```typescript
interface ApuracaoMensal {
  anoMes: string;           // "2026-01"
  dirty: boolean;           // true = aguardando reprocessamento
  saldoPrejuizoStInicio: number;  // saldo recebido do mês anterior
  saldoPrejuizoDtInicio: number;
  // ... demais campos
}
```

Quando uma nota é inserida, marcar o mês como `dirty = true` e todos os meses posteriores na mesma cadeia. Um job (ou trigger Firestore Function) executa o reprocessamento em ordem.

---

## 6. Carry-Forward — Edge Cases de Estado

### 6.1 DARF Mínimo de R$ 10 e Acumulação

A Receita Federal não aceita DARF com valor inferior a R$ 10. O valor deve ser acumulado até atingir o mínimo.

**Regra:** O IR calculado abaixo de R$ 10 **não é perdido**. Deve ser somado ao IR do mês seguinte.

```typescript
interface SaldoAcumulado {
  ir_st_pendente: number;  // IR < R$10 que não virou DARF
  ir_dt_pendente: number;
  // Esses valores devem ser somados ao IR calculado no próximo mês
}

// Lógica de emissão de DARF:
function calcularDarf(irCalculado: number, irPendente: number): {
  emitirDarf: boolean;
  valorDarf: number;
  novoSaldoPendente: number;
} {
  const totalDevido = irCalculado + irPendente;
  if (totalDevido >= 10) {
    return { emitirDarf: true, valorDarf: totalDevido, novoSaldoPendente: 0 };
  }
  return { emitirDarf: false, valorDarf: 0, novoSaldoPendente: totalDevido };
}
```

**Interação com carry-forward de prejuízo:** O IR pendente (< R$ 10) e o saldo de prejuízo são campos independentes. O prejuízo já foi compensado no cálculo; o IR residual é apenas o valor que não pode virar DARF ainda. Não confundir os dois.

**Sem multa ou juros** enquanto o valor total não atinge R$ 10. A acumulação é prevista em lei.

### 6.2 IRRF Retido a Maior — Carry-Forward Intra-Ano vs. DIRPF

O IRRF pago em excesso tem tratamento diferente do saldo de prejuízo:

| Aspecto | Saldo Prejuízo | IRRF Excesso |
|---|---|---|
| Carry-forward entre meses | Sim, indefinido | Sim, dentro do mesmo ano |
| Carry-forward entre anos | Sim (via DIRPF) | **Não diretamente** — entra na DIRPF como "imposto pago" |
| Vira restituição? | Não (é dedução de base) | Sim (na DIRPF anual) |
| Código na DIRPF | Campo "Resultado negativo" | Campo "IRRF" em Renda Variável |

**Importante para a implementação:** O IRRF acumulado ao longo do ano que não foi totalmente compensado nos DARFs mensais é informado na DIRPF como imposto pago/retido na fonte. A Receita cruza com o valor declarado e, se houver excesso em relação ao IR total do ano, gera restituição. O sistema **não deve** transportar IRRF de um ano para o outro no modelo `saldo_prejudico` — ele é "zerado" na virada do ano e vai para a DIRPF.

### 6.3 Encerramento de Conta / Migração de Corretora

O saldo de prejuízo **migra com o investidor** (CPF), não com a corretora. O carry-forward é da pessoa, não da conta.

Quando o cliente encerra a conta na corretora XP e migra para outra:
- O saldo de prejuízo acumulado permanece válido.
- O assessor deve registrar manualmente (ou via importação de relatório de posição da nova corretora) que o saldo continua existindo.
- O sistema CRM deve suportar a entrada manual do saldo inicial quando não há histórico de notas.

**Portabilidade de ativos (transferência de custódia):** Quando o investidor transfere ações de uma corretora para outra via STVM (Solicitação de Transferência de Valores Mobiliários), **não há evento de venda** — portanto, não há ganho/prejuízo tributável na transferência. O preço médio deve ser mantido.

### 6.4 Resultado Exatamente Zero

**Edge case:** Compra e venda do mesmo ativo pelo mesmo preço médio, com custos operacionais (corretagem, emolumentos):

```
Exemplo:
  Compra: 100 ações de PETR4 a R$ 30,00 = R$ 3.000
  Venda: 100 ações de PETR4 a R$ 30,00 = R$ 3.000
  Corretagem (ida + volta): R$ 10,00
  Emolumentos B3: R$ 0,45
  Total custos: R$ 10,45

  Resultado: R$ 3.000 - R$ 3.000 - R$ 10,45 = -R$ 10,45 (PREJUÍZO)
  saldo_prejuizo_st += R$ 10,45
```

O sistema **nunca deve tratar custos operacionais como zero**. Toda operação tem custos que afetam o resultado. Um resultado "zero" sem custos é suspeito e deve ser validado.

---

## 7. Múltiplas Corretoras — Agregação por CPF

### 7.1 Princípio Fundamental

A apuração de IR em renda variável é feita **por CPF**, não por corretora. O investidor que opera em XP, Clear, BTG e Inter simultaneamente deve:

1. Somar todos os ganhos de todas as corretoras para o mês.
2. Somar todos os prejuízos de todas as corretoras para o mês.
3. Calcular o resultado líquido consolidado.
4. Aplicar a compensação do saldo de prejuízo acumulado.
5. Recolher um único DARF (ou pagar zero).

**Confirmado pela Receita Federal:** É possível compensar ganhos apurados via Corretora A com perdas apuradas via Corretora B, desde que seja a mesma modalidade operacional (ST com ST, DT com DT).

### 7.2 Cenário Prático

```
Mês: Fevereiro/2026

XP Investimentos:
  ST: ganho R$ 2.000 (ações)
  DT: prejuízo R$ 500

Clear Corretora:
  ST: prejuízo R$ 800 (ETF)
  DT: ganho R$ 1.200

BTG Pactual:
  ST: ganho R$ 300 (BDR)

Agregação por CPF:
  Resultado ST = R$ 2.000 + (-R$ 800) + R$ 300 = R$ 1.500
  Resultado DT = (-R$ 500) + R$ 1.200 = R$ 700

Aplicando saldo anterior (hipotético):
  saldo_prejuizo_st_anterior = R$ 400
  saldo_prejuizo_dt_anterior = R$ 1.000

  base_calculo_st = max(0, 1.500 - 400) = R$ 1.100
  base_calculo_dt = max(0, 700 - 1.000) = R$ 0

  IR_ST = R$ 1.100 × 15% = R$ 165
  IR_DT = R$ 0

  novo saldo_st = R$ 0
  novo saldo_dt = max(0, 1.000 - 700) = R$ 300

DARF ST (código 6015): R$ 165
DARF DT (código 6015 / campo DT): R$ 0
```

### 7.3 Implementação: Modelo Multi-Corretora no Firestore

```typescript
// Coleção: clientes/{clienteId}/corretoras/{corretoraId}/notas/{notaId}
interface NotaCorretagem {
  corretoraId: string;
  data: Timestamp;
  operacoes: Operacao[];
  modalidade: 'ST' | 'DT';
}

// Coleção: clientes/{clienteId}/apuracoes/{anoMes}
interface ApuracaoMensal {
  anoMes: string;           // "2026-02"
  
  // Resultados brutos agregados (todas as corretoras)
  resultado_bruto_st: number;
  resultado_bruto_dt: number;
  resultado_bruto_fii: number;    // Cesta B separada
  resultado_bruto_fii_dt: number; // DT de FII também separado
  
  // Saldo de prejuízo recebido do mês anterior
  saldo_prejuizo_st_inicio: number;
  saldo_prejuizo_dt_inicio: number;
  saldo_prejuizo_fii_inicio: number;
  
  // Após compensação
  base_calculo_st: number;
  base_calculo_dt: number;
  base_calculo_fii: number;
  
  // Saldo de prejuízo ao final do mês (leva para o próximo)
  saldo_prejuizo_st_fim: number;
  saldo_prejuizo_dt_fim: number;
  saldo_prejuizo_fii_fim: number;
  
  // IRRF retido (agregado de todas as corretoras)
  irrf_retido_st: number;
  irrf_retido_dt: number;
  irrf_a_compensar_st: number;  // carry-forward intra-ano
  
  // IR e DARF
  ir_calculado_st: number;
  ir_calculado_dt: number;
  ir_calculado_fii: number;
  ir_pendente_st: number;   // < R$10, acumula
  ir_pendente_dt: number;
  darf_emitido_st: number;
  darf_emitido_dt: number;
  darf_emitido_fii: number;
  
  // Isenção
  vendas_acoes_st: number;  // Para verificar limite R$20k
  isento_mes: boolean;
  
  // Metadados
  dirty: boolean;
  reprocessado_em: Timestamp | null;
  corretoras_incluidas: string[];
}
```

### 7.4 IRRF por Corretora vs. IRRF Agregado

Cada corretora retém o IRRF ("dedo-duro") individualmente sobre suas operações. O investidor não pode compensar o IRRF retido pela XP com o IR devido à Clear. Todo IRRF retido no mês, de qualquer corretora, é somado e deduzido do IR total do mês:

```
irrf_total_mes = irrf_retido_xp + irrf_retido_clear + irrf_retido_btg

ir_a_pagar = max(0, ir_calculado_total - irrf_total_mes)
```

---

## 8. DIRPF Anual — Integração com a Declaração

### 8.1 Onde o Saldo de Prejuízo Aparece na DIRPF

Na declaração anual do IRPF, o investidor preenche a ficha **"Renda Variável"** com o demonstrativo mês a mês. O saldo de prejuízo aparece em dois campos:

1. **"Resultado negativo até o mês anterior"** — no início de cada mês (janeiro recebe o saldo de dezembro do ano anterior).
2. **"Resultado negativo do mês"** — se o mês encerrou com prejuízo.

O programa IRPF (PGDRIRPF) transporta automaticamente o saldo entre os meses dentro do mesmo ano-calendário. Para transportar entre anos, o valor do campo "Resultado negativo" de dezembro fica registrado e é importado automaticamente no preenchimento do ano seguinte (se o declarante importar a declaração anterior).

### 8.2 Campos Separados por Modalidade e por Cesta

A ficha de Renda Variável na DIRPF tem colunas separadas:

```
Mercado à Vista / Opções / Futuros:
  - Operações Comuns (ST)
  - Day Trade (DT)

Fundos de Investimento Imobiliário:
  - Operações Comuns (ST)  [FII]
  - Day Trade (DT)         [FII - raro mas possível]

Fundos de Investimento em Participações: (outra aba)
```

O sistema deve exportar os dados mensais no formato correto para cada ficha.

### 8.3 IRRF na DIRPF

O IRRF retido durante o ano é informado na coluna "Imposto Retido na Fonte" de cada mês na ficha Renda Variável. O programa IRPF soma automaticamente e cruza com o IR calculado anual. Se sobrar IRRF, gera saldo a restituir.

**Atenção:** O IRRF **não pode** ser transportado de um ano para o outro via carry-forward do sistema — ele vai para a DIRPF do ano em que foi retido e, se não compensado nos DARFs mensais, pode gerar restituição via ajuste anual.

### 8.4 Rendimentos Isentos de FII na DIRPF

Os rendimentos distribuídos por FIIs (isentos) são declarados na ficha **"Rendimentos Isentos e Não Tributáveis"**, com o código específico "73 — Rendimentos de fundos de investimento imobiliário". Eles **não** entram na ficha Renda Variável e **não** afetam nenhum saldo de prejuízo.

### 8.5 Código de Declaração de Ganhos com Isenção (R$ 20k)

Os ganhos em meses com isenção de R$ 20.000 devem ser informados na ficha **"Rendimentos Isentos e Não Tributáveis"**, com o código **"20 — Ganhos líquidos em operações no mercado à vista de ações negociadas em bolsa de valores, com alienação inferior a R$ 20.000 por mês"**.

Mesmo isento, o ganho deve ser declarado. O sistema deve identificar esses meses e gerar o valor correto para preencher esse código.

---

## 9. Edge Cases que Quebram Sistemas Automatizados

### 9.1 Nota Cancelada ou Retificada pela Corretora

A corretora pode emitir uma nota retificada (com sufixo "R" ou "C" no número da nota) para corrigir erros operacionais. O sistema deve:

```typescript
// Estados possíveis de uma nota
type StatusNota = 'ATIVA' | 'CANCELADA' | 'RETIFICADA' | 'RETIFICADORA';

// Regra de negócio:
// - CANCELADA: remover do cálculo (como se não existisse)
// - RETIFICADA: substituída pela nota RETIFICADORA — ignorar na apuração
// - RETIFICADORA: usar esta em vez da nota original (referencia noteOriginalId)

interface NotaCorretagem {
  id: string;
  status: StatusNota;
  notaOriginalId?: string;   // se RETIFICADORA, aponta para a nota que substitui
  // ...
}
```

**Erro comum:** processar tanto a nota original quanto a nota retificadora, duplicando as operações.

**Validação recomendada:** Antes de processar, verificar se existe uma nota retificadora para a nota em questão. Se existir, ignorar a original.

### 9.2 Operação com Preço Zero ou Quantidade Zero

Notas com preço unitário = 0 ou quantidade = 0 são inválidas e devem ser rejeitadas com log de erro:

```typescript
function validarOperacao(op: Operacao): ValidationResult {
  if (op.precoUnitario <= 0) {
    return { valid: false, erro: 'PRECO_INVALIDO', detalhe: `Preço unitário zerado ou negativo: ${op.precoUnitario}` };
  }
  if (op.quantidade <= 0) {
    return { valid: false, erro: 'QUANTIDADE_INVALIDA', detalhe: `Quantidade zerada: ${op.quantidade}` };
  }
  if (op.valorTotal !== op.precoUnitario * op.quantidade) {
    // Tolerância de R$0,01 para arredondamento
    const diferenca = Math.abs(op.valorTotal - op.precoUnitario * op.quantidade);
    if (diferenca > 0.01) {
      return { valid: false, erro: 'VALOR_INCONSISTENTE' };
    }
  }
  return { valid: true };
}
```

### 9.3 Precisão Numérica — Armadilhas de Float

Nunca use `float` (número de ponto flutuante nativo do JavaScript) para cálculos monetários:

```typescript
// ERRADO — pode gerar erros de arredondamento
const resultado = 1.1 + 2.2; // 3.3000000000000003

// CORRETO — usar inteiros representando centavos
// ou biblioteca como decimal.js ou big.js
import Decimal from 'decimal.js';

const resultado = new Decimal('1.10').plus('2.20'); // 3.30 (exato)

// Para Firestore: armazenar sempre em centavos (inteiro) ou como string
// Exemplo: R$ 1.500,75 → armazenar como 150075 (centavos)
```

**Regra para o sistema:** Todos os valores monetários devem ser armazenados como inteiros de centavos no Firestore. A conversão para exibição (dividir por 100) ocorre apenas na camada de apresentação.

### 9.4 Resultado Exatamente Igual ao Limite de Isenção (R$ 20.000,00)

O limite de isenção é inclusivo: vendas de **até R$ 20.000,00** são isentas. R$ 20.000,01 não é isento.

```typescript
function verificarIsencao(totalVendasAcoesSt: number): boolean {
  // totalVendasAcoesSt em centavos
  return totalVendasAcoesSt <= 2_000_000; // 2.000.000 centavos = R$ 20.000,00
}
```

**Não usar `< 20000` (sem o sinal de igual)** — seria bugado para o caso exato de R$ 20.000,00.

### 9.5 Day Trade Parcial — Mesmo Ativo, Mesma Corretora, Dia

Se o investidor comprou 200 ações de PETR4 de manhã e vendeu 100 no mesmo dia e 100 no dia seguinte:

- 100 ações vendidas no mesmo dia → DT (para essas 100 unidades)
- 100 ações vendidas no dia seguinte → ST (para essas 100 unidades)

O custo de aquisição para DT é a fração correspondente às 100 ações vendidas no DT.

**Implementação:**

```typescript
// A nota indica se é DT ou ST por operação
// Algumas notas de corretagem já identificam DT com marcação "D"
// O sistema deve reconhecer isso e separar na apuração

interface Operacao {
  modalidade: 'ST' | 'DT';  // A corretora identifica na nota
  // ...
}
```

### 9.6 Importação Duplicada de Notas

Se o assessor importar a mesma nota duas vezes (por exemplo, usando dois formatos diferentes de exportação da mesma corretora), o sistema deve detectar e rejeitar duplicatas:

```typescript
// Usar hash da nota como chave de idempotência
interface NotaCorretagem {
  id: string;            // hash SHA-256 dos campos imutáveis da nota
  numero_nota: string;   // número original da nota
  data: string;
  corretoraId: string;
  // ...
}

// Antes de inserir: verificar se já existe nota com mesmo número + data + corretora
```

### 9.7 Mês com Zero Operações

Se o cliente não opera em um mês, o sistema deve criar um registro de apuração com todos os valores zerados e transportar os saldos:

```
Janeiro/2026: saldo_st = R$ 3.000 (carry-forward)
Fevereiro/2026: sem operações

Registro fevereiro/2026:
  resultado_bruto_st = 0
  saldo_prejuizo_st_inicio = R$ 3.000
  saldo_prejuizo_st_fim = R$ 3.000  (propagado sem alteração)
  ir_calculado_st = 0
  darf_emitido_st = 0
```

**Não pular meses vazios.** O sistema precisa do registro de cada mês para propagar o saldo corretamente e para facilitar a geração do demonstrativo da DIRPF.

### 9.8 Operações em Lote com Preços Médios Diferentes

Compra de 100 ações de PETR4 em três operações no mesmo dia (DT):

```
Compra 1: 40 ações × R$ 29,90 = R$ 1.196,00
Compra 2: 30 ações × R$ 30,00 = R$ 900,00
Compra 3: 30 ações × R$ 30,10 = R$ 903,00

Preço médio = (1.196 + 900 + 903) / 100 = R$ 29,99/ação

Venda única de 100 ações: R$ 30,50 = R$ 3.050,00
Resultado DT = 3.050 - 2.999 = R$ 51,00 (bruto, antes dos custos)
```

O sistema deve calcular o preço médio ponderado para lotes do mesmo ativo na mesma nota/dia.

### 9.9 Cruzamento DT × ST Dentro do Mês

O investidor pode ter DT em alguns dias e ST em outros do mesmo mês. Cada modalidade é apurada independentemente e os saldos nunca se misturam:

```
Janeiro/2026:
  Dia 05: day trade com VALE3 → resultado DT = -R$ 200
  Dia 12: swing trade de PETR4 (comprou dia 10, vendeu dia 12) → resultado ST = +R$ 500
  Dia 20: day trade com IBOV futuro → resultado DT = +R$ 300

  Resultado ST do mês = R$ 500
  Resultado DT do mês = -R$ 200 + R$ 300 = +R$ 100 (líquido DT)

  Aplicando saldos anteriores (hipotético saldo_dt = R$ 0):
    base_st = R$ 500 - saldo_st_anterior
    base_dt = R$ 100 (sem saldo anterior)
```

### 9.10 Venda de Fração de Posição com Custo Médio

Quando o investidor vende parte da posição, o custo médio permanece o mesmo para as ações restantes. O sistema deve implementar custo médio ponderado e não FIFO:

```typescript
function calcularResultadoVenda(
  precoMedioAtual: number,  // PM ponderado de toda a posição
  quantidadeVendida: number,
  precoVenda: number,
  custos: number            // corretagem + emolumentos
): number {
  const custoTotal = precoMedioAtual * quantidadeVendida;
  const receitaLiquida = precoVenda * quantidadeVendida - custos;
  return receitaLiquida - custoTotal;
}

// O preço médio NÃO muda após uma venda (apenas após novas compras)
```

---

## 10. Modelo de Dados Recomendado — TypeScript/Firestore

### 10.1 Schema Completo

```typescript
// Coleção raiz: clientes/{clienteId}/apuracoes/{anoMes}

interface ApuracaoMensalCompleta {
  // Identificação
  clienteId: string;
  anoMes: string;            // "2026-02" (YYYY-MM)
  versao: number;            // incrementa a cada reprocessamento

  // ─── CESTA A: Bolsa Geral (Ações, ETF, BDR, Opções, Futuros) ────────────
  
  // Entrada (saldo do mês anterior)
  cesta_a_st_saldo_inicio: number;    // centavos
  cesta_a_dt_saldo_inicio: number;

  // Operações do mês
  cesta_a_st_vendas_acoes: number;    // total de vendas de AÇÕES (para limite R$20k)
  cesta_a_st_isento: boolean;         // vendas_acoes <= R$ 20.000
  cesta_a_st_resultado_bruto: number; // ganho/perda bruto ST (pode ser negativo)
  cesta_a_dt_resultado_bruto: number;

  // IRRF retido (dedo-duro)
  cesta_a_st_irrf_retido: number;
  cesta_a_dt_irrf_retido: number;
  cesta_a_st_irrf_acumulado: number;  // carry-forward intra-ano
  cesta_a_dt_irrf_acumulado: number;

  // Cálculo
  cesta_a_st_base_calculo: number;    // max(0, resultado_bruto - saldo_inicio)
  cesta_a_dt_base_calculo: number;
  cesta_a_st_ir_calculado: number;    // base × 15%
  cesta_a_dt_ir_calculado: number;    // base × 20%
  cesta_a_st_ir_a_pagar: number;      // max(0, ir_calculado - irrf_retido - irrf_acumulado)
  cesta_a_dt_ir_a_pagar: number;

  // DARF
  cesta_a_st_ir_pendente: number;     // < R$10, acumula próximo mês
  cesta_a_dt_ir_pendente: number;
  cesta_a_st_darf: number;            // valor do DARF emitido (0 se não emitiu)
  cesta_a_dt_darf: number;
  cesta_a_st_data_vencimento_darf: string | null;  // último dia útil do mês seguinte
  
  // Saída (saldo para o próximo mês)
  cesta_a_st_saldo_fim: number;
  cesta_a_dt_saldo_fim: number;

  // ─── CESTA B: FII / Fiagro ────────────────────────────────────────────────

  cesta_b_st_saldo_inicio: number;
  cesta_b_dt_saldo_inicio: number;
  cesta_b_st_resultado_bruto: number;
  cesta_b_dt_resultado_bruto: number;
  cesta_b_st_irrf_retido: number;
  cesta_b_dt_irrf_retido: number;
  cesta_b_st_base_calculo: number;
  cesta_b_dt_base_calculo: number;
  cesta_b_st_ir_calculado: number;    // base × 20%
  cesta_b_dt_ir_calculado: number;    // base × 20%
  cesta_b_st_ir_a_pagar: number;
  cesta_b_st_darf: number;
  cesta_b_st_saldo_fim: number;
  cesta_b_dt_saldo_fim: number;

  // ─── CESTA C: Criptoativos ────────────────────────────────────────────────

  cesta_c_vendas_mes: number;         // total de vendas de cripto no mês
  cesta_c_ganho_bruto: number;
  cesta_c_isento: boolean;            // vendas <= R$ 35.000
  cesta_c_ir_calculado: number;       // (vendas > 35k) ? ganho × 15% : 0
  cesta_c_darf: number;

  // ─── Metadados ────────────────────────────────────────────────────────────

  corretoras_incluidas: string[];
  notas_processadas: string[];        // IDs das notas incluídas
  dirty: boolean;
  criado_em: Timestamp;
  reprocessado_em: Timestamp | null;
  processado_por: string;             // uid do usuário/sistema
}
```

### 10.2 Documento de Saldo Corrente (Snapshot)

Para evitar recalcular toda a cadeia para saber o saldo atual:

```typescript
// Coleção: clientes/{clienteId}/saldo_atual
interface SaldoAtual {
  ultimo_mes_processado: string;  // "2026-04"
  
  cesta_a_st: number;   // saldo de prejuízo ST atual (centavos)
  cesta_a_dt: number;
  cesta_b_st: number;   // FII
  cesta_b_dt: number;
  
  cesta_a_st_irrf_pendente: number;   // IRRF não compensado ainda
  cesta_a_dt_irrf_pendente: number;
  
  cesta_a_st_ir_pendente: number;     // IR < R$10 acumulado
  cesta_a_dt_ir_pendente: number;
  
  atualizado_em: Timestamp;
}
```

---

## 11. Algoritmo de Apuração Mensal — Pseudocódigo

```typescript
async function apurarMes(
  clienteId: string,
  anoMes: string
): Promise<ApuracaoMensalCompleta> {
  
  // 1. Buscar saldos do mês anterior
  const saldoAnterior = await getSaldoFimMes(clienteId, getMesAnterior(anoMes));
  
  // 2. Buscar todas as notas do mês (todas as corretoras)
  const notas = await getNotasAtivas(clienteId, anoMes);
  
  // 3. Separar por cesta e modalidade
  const ops = classificarOperacoes(notas);
  // ops.cesta_a_st, ops.cesta_a_dt, ops.cesta_b_st, ops.cesta_b_dt, ops.cesta_c
  
  // 4. Calcular resultados brutos
  const resultado_a_st = calcularResultadoBruto(ops.cesta_a_st);
  const resultado_a_dt = calcularResultadoBruto(ops.cesta_a_dt);
  const resultado_b_st = calcularResultadoBruto(ops.cesta_b_st);
  const resultado_b_dt = calcularResultadoBruto(ops.cesta_b_dt);
  
  // 5. Verificar isenção R$20k (apenas ações à vista, ST)
  const vendas_acoes_st = calcularTotalVendasAcoes(ops.cesta_a_st);
  const isento_mes = vendas_acoes_st <= 2_000_000; // centavos
  
  // 6. Calcular base de cálculo ST (Cesta A)
  let base_a_st: number;
  let novo_saldo_a_st: number;
  
  if (isento_mes && resultado_a_st > 0) {
    // Ganho, mas isento → não usa saldo de prejuízo, não gera IR
    base_a_st = 0;
    novo_saldo_a_st = saldoAnterior.cesta_a_st; // saldo preservado
  } else if (resultado_a_st < 0) {
    // Prejuízo no mês → acumula
    base_a_st = 0;
    novo_saldo_a_st = saldoAnterior.cesta_a_st + Math.abs(resultado_a_st);
  } else {
    // Ganho tributável → compensar com saldo
    base_a_st = Math.max(0, resultado_a_st - saldoAnterior.cesta_a_st);
    novo_saldo_a_st = Math.max(0, saldoAnterior.cesta_a_st - resultado_a_st);
  }
  
  // 7. Repetir para DT (Cesta A), Cesta B ST e DT
  // [lógica análoga ao passo 6 para cada combinação]
  
  // 8. Calcular IR
  const ir_calculado_a_st = base_a_st * 0.15;
  const ir_calculado_a_dt = base_a_dt * 0.20;
  const ir_calculado_b_st = base_b_st * 0.20;
  
  // 9. Deduzir IRRF
  const irrf_a_st = calcularIrrfRetido(ops.cesta_a_st);
  const irrf_a_dt = calcularIrrfRetido(ops.cesta_a_dt);
  
  // Total IRRF disponível = retido este mês + acumulado de meses anteriores
  const irrf_total_a_st = irrf_a_st + saldoAnterior.cesta_a_st_irrf_pendente;
  
  const ir_a_pagar_a_st = Math.max(0, ir_calculado_a_st - irrf_total_a_st);
  
  // IRRF não usado neste mês → carry-forward (mas NÃO passa de ano)
  const irrf_sobra_a_st = Math.max(0, irrf_total_a_st - ir_calculado_a_st);
  
  // 10. Verificar DARF mínimo
  const total_pendente_st = ir_a_pagar_a_st + saldoAnterior.cesta_a_st_ir_pendente;
  let darf_a_st = 0;
  let novo_ir_pendente_a_st = 0;
  
  if (total_pendente_st >= 1_000) { // R$10,00 em centavos
    darf_a_st = total_pendente_st;
  } else {
    novo_ir_pendente_a_st = total_pendente_st; // acumula para o próximo mês
  }
  
  // 11. Montar e salvar apuração
  const apuracao: ApuracaoMensalCompleta = {
    clienteId, anoMes,
    cesta_a_st_saldo_inicio: saldoAnterior.cesta_a_st,
    cesta_a_st_saldo_fim: novo_saldo_a_st,
    cesta_a_st_isento: isento_mes,
    cesta_a_st_base_calculo: base_a_st,
    cesta_a_st_ir_calculado: ir_calculado_a_st,
    cesta_a_st_ir_a_pagar: ir_a_pagar_a_st,
    cesta_a_st_darf: darf_a_st,
    cesta_a_st_ir_pendente: novo_ir_pendente_a_st,
    cesta_a_st_irrf_acumulado: irrf_sobra_a_st,
    // [demais campos...]
    dirty: false,
    reprocessado_em: Timestamp.now(),
  };
  
  await db.collection(`clientes/${clienteId}/apuracoes`).doc(anoMes).set(apuracao);
  await atualizarSaldoAtual(clienteId, apuracao);
  
  return apuracao;
}
```

---

## 12. Checklist de Conformidade para o Sistema

### 12.1 Regras de Segregação

- [ ] ST e DT nunca se cruzam em nenhum cálculo
- [ ] FII/Fiagro são tratados na Cesta B (separada de ações/ETF/BDR/opções/futuros)
- [ ] Criptoativos são tratados na Cesta C (separada de tudo)
- [ ] O modelo de dados tem campos distintos para cada combinação (cesta × modalidade)

### 12.2 Isenção de R$ 20.000

- [ ] O limite considera apenas vendas de **ações à vista** (não ETF, não BDR, não opções)
- [ ] O sistema usa `<=` (inclusivo) no teste do limite
- [ ] Mês isento não consome saldo de prejuízo
- [ ] Mês isento com prejuízo acumula o prejuízo normalmente
- [ ] O ganho isento é registrado para o campo DIRPF (código "20")

### 12.3 Carry-Forward

- [ ] Saldo de prejuízo não tem prazo de expiração
- [ ] Saldo de prejuízo é propagado mês a mês sem interrupção
- [ ] Meses sem operações propagam o saldo sem alteração
- [ ] IRRF não é transportado entre anos-calendário
- [ ] IR pendente (< R$ 10) é acumulado e somado no próximo mês

### 12.4 Múltiplas Corretoras

- [ ] Todos os ganhos/perdas de todas as corretoras são agregados por CPF antes do cálculo
- [ ] IRRF de todas as corretoras é somado antes da dedução
- [ ] O sistema suporta notas de diferentes corretoras para o mesmo cliente/mês

### 12.5 Reprocessamento

- [ ] Inserção retroativa de nota dispara reprocessamento em cascata
- [ ] Reprocessamento respeita ordem cronológica
- [ ] Firestore usa batch writes para garantir atomicidade
- [ ] Campo `dirty` sinaliza meses que precisam reprocessar
- [ ] Saldo do mês anterior é sempre lido do registro do mês anterior (não do snapshot)

### 12.6 Validações de Integridade

- [ ] Notas duplicadas são detectadas e rejeitadas (hash de idempotência)
- [ ] Notas retificadas substituem as originais (não somam)
- [ ] Preço unitário e quantidade nunca podem ser zero ou negativos
- [ ] Valores monetários são armazenados como inteiros de centavos (sem float)
- [ ] Total de venda = preço × quantidade ± tolerância de R$ 0,01

### 12.7 DIRPF — Geração de Relatório

- [ ] Sistema gera o demonstrativo mês a mês para cada cesta/modalidade
- [ ] Saldo de prejuízo de dezembro é registrado para carry-forward ao próximo ano
- [ ] IRRF anual acumulado é exportado como "imposto retido na fonte"
- [ ] Ganhos isentos são classificados no código correto (código "20" para ações ST ≤ R$20k)
- [ ] Rendimentos de FII isentos são exportados para a ficha "Rendimentos Isentos" (código "73")

---

## 13. Referências

### Fontes Legais e Normativas

1. **Lei 8.981/1995** — Arts. 72–75: tributação de ganhos em renda variável e compensação de prejuízos. Disponível em: [L8981 - Planalto](https://www.planalto.gov.br/ccivil_03/leis/l8981.htm)

2. **IN RFB nº 1.585/2015** — Regulamenta a tributação de ganhos líquidos em renda variável e as regras de compensação de prejuízos.

3. **IN RFB nº 2.055/2021** — Dispõe sobre restituição, ressarcimento, reembolso e compensação tributária perante a RFB. Disponível em: [LegisWeb IN 2055/2021](https://www.legisweb.com.br/legislacao/?id=423957)

4. **Lei 11.033/2004** — Regime tributário de FIIs para pessoas físicas (isenção de dividendos, condições).

5. **IN RFB nº 1.888/2019** — Institui a obrigação de prestar informações sobre operações com criptoativos.

6. **Lei 14.754/2023** — Tributação de aplicações financeiras no exterior; regime de compensação anual de cripto em exchanges estrangeiras.

7. **MP 1.303/2025** — Proposta de alteração da tributação de FIIs; **caducou em outubro de 2025**. Regras de FII permanecem as da Lei 11.033/2004.

### Fontes de Referência Consultadas

8. [Análise completa da compensação de prejuízo na bolsa — IR 2026 (Jovem Pan)](https://jovempan.com.br/noticias/economia/analise-completa-da-compensacao-de-prejuizo-na-bolsa-e-normas-para-o-imposto-de-renda-2026.html)

9. [Compensação de prejuízo na bolsa — NSC Total](https://www.nsctotal.com.br/noticias/compensacao-prejuizo-bolsa-regras-calculo-imposto-de-renda-2026)

10. [Compensações — Receita Federal (gov.br)](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/compensacoes)

11. [Como declarar BDRs no IR 2026 — B3 BorainvestIR](https://borainvestir.b3.com.br/noticias/imposto-de-renda/renda-variavel-imposto-de-renda/como-declarar-bdrs-no-imposto-de-renda-2026-veja-guia-completo-para-nao-cometer-erros/)

12. [Como ficam impostos para ETFs/BDRs — B3](https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/etfs/tributacao-etf-e-bdr/)

13. [Lucros e prejuízos em corretoras diferentes se somam — InfoMoney](https://www.infomoney.com.br/minhas-financas/imposto-de-renda-lucros-e-prejuizos-com-acoes-negociadas-em-corretoras-diferentes-se-somam/)

14. [Posso compensar prejuízo de opções com lucro de ações? (artigo técnico)](https://impostoderendarestituicao.com.br/irpf/posso-compensar-prejuizo-de-opcoes-com-lucro-de-acoes/)

15. [Compensação de prejuízo para todos — Seu Dinheiro (análise da mudança)](https://www.seudinheiro.com/2025/bolsa-dolar/compensacao-de-prejuizos-para-todos-o-que-muda-no-mecanismo-julw/)

16. [DARF menor que R$10 — ImpostoDeRendaRestituicao](https://impostoderendarestituicao.com.br/darf-inferior-a-10-reais/)

17. [Como restituir o IRRF em operações de renda variável](https://impostoderendarestituicao.com.br/como-restituir-o-irrf-em-operacoes-de-renda-variavel/)

18. [Compensação de prejuízo em criptoativos — DeclarandoBitcoin](https://www.declarandobitcoin.com.br/post/como-funciona-a-compensa%C3%A7%C3%A3o-de-preju%C3%ADzos-em-criptoativos)

19. [Como compensar prejuízo na bolsa com lucro de criptoativos — InfoMoney](https://www.infomoney.com.br/minhas-financas/imposto-de-renda-posso-compensar-prejuizo-na-bolsa-com-lucro-de-criptoativos/)

20. [Compensação de prejuízo de períodos anteriores — Sencon](https://www.sencon.com.br/blog/compensacao-de-prejuizo-de-periodos-anteriores)

21. [MP 1.303 cai no Congresso — InfoMoney](https://www.infomoney.com.br/minhas-financas/mp-1-303-cai-no-congresso-veja-como-fica-a-tributacao-dos-investimentos-agora/)

22. [Isenção de IR em operações em bolsa — Tributo Devido](https://tributodevido.com.br/isencao-de-ir-em-operacoes-em-bolsa/)

23. [Tributação em Renda Variável — NuInvest](https://www.nuinvest.com.br/tributacao-de-renda-variavel.html)

24. [Day trade no Imposto de Renda 2026 — XP Investimentos](https://conteudos.xpi.com.br/aprenda-a-investir/relatorios/day-trade-no-imposto-de-renda/)

25. [Renda Variável IR 2026: guia completo — Rico/Riconnect](https://riconnect.rico.com.vc/blog/renda-variavel-imposto-de-renda/)

---

*Documento gerado em maio de 2026. As regras descritas refletem a legislação vigente após a caducidade da MP 1.303/2025 (outubro/2025). Alterações legislativas futuras podem modificar as regras de FIIs, alíquotas e mecanismos de compensação. Recomenda-se revisão anual do documento.*
