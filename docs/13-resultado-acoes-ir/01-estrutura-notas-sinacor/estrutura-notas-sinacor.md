# Estrutura das Notas de Corretagem no Padrão SINACOR

> Pesquisa técnica aprofundada sobre o padrão SINACOR de notas de corretagem da B3, variações entre corretoras e estratégias de parsing programático para importação de PDFs no browser via pdfjs-dist.
>
> **Data:** Maio 2026
> **Aplicação:** Ferramenta de IR para CRM de assessores XP (Next.js 14 + Firebase Firestore)
> **Foco:** Parsing de PDFs via pdfjs-dist no browser, extração de operações, cálculo de preço médio e IRRF

---

## Sumário

1. [O que é SINACOR](#1-o-que-é-sinacor)
2. [Arquitetura do Sistema SINACOR](#2-arquitetura-do-sistema-sinacor)
3. [Estrutura Padrão da Nota de Corretagem](#3-estrutura-padrão-da-nota-de-corretagem)
   - 3.1 [Dois Tipos de Nota: Bovespa vs BM&F](#31-dois-tipos-de-nota-bovespa-vs-bmf)
   - 3.2 [Seções Obrigatórias (Nota Bovespa)](#32-seções-obrigatórias-nota-bovespa)
   - 3.3 [Campos do Cabeçalho](#33-campos-do-cabeçalho)
   - 3.4 [Campos da Tabela de Negócios Realizados](#34-campos-da-tabela-de-negócios-realizados)
   - 3.5 [Resumo dos Negócios](#35-resumo-dos-negócios)
   - 3.6 [Resumo Financeiro (Clearing)](#36-resumo-financeiro-clearing)
   - 3.7 [Rodapé e Dados do Investidor](#37-rodapé-e-dados-do-investidor)
4. [Variações por Corretora](#4-variações-por-corretora)
   - 4.1 [Grupo XP (XP, Rico, Clear, Modal)](#41-grupo-xp-xp-rico-clear-modal)
   - 4.2 [BTG Pactual Digital](#42-btg-pactual-digital)
   - 4.3 [NuInvest (ex-Easynvest)](#43-nuinvest-ex-easynvest)
   - 4.4 [Banco Inter Corretora](#44-banco-inter-corretora)
   - 4.5 [Toro Investimentos / Santander Corretora](#45-toro-investimentos--santander-corretora)
   - 4.6 [Itaú Corretora (Íon)](#46-itaú-corretora-íon)
   - 4.7 [CM Capital e Necton](#47-cm-capital-e-necton)
   - 4.8 [Tabela Comparativa Geral](#48-tabela-comparativa-geral)
5. [Identificação Programática de Corretoras por CNPJ](#5-identificação-programática-de-corretoras-por-cnpj)
6. [Campos Críticos para Parsing: Patterns e Regex](#6-campos-críticos-para-parsing-patterns-e-regex)
   - 6.1 [Regex por Campo — Nota Bovespa](#61-regex-por-campo--nota-bovespa)
   - 6.2 [Regex por Campo — Nota BM&F](#62-regex-por-campo--nota-bmf)
   - 6.3 [Algoritmo de Parsing Completo em JavaScript](#63-algoritmo-de-parsing-completo-em-javascript)
7. [Casos Especiais de Layout](#7-casos-especiais-de-layout)
   - 7.1 [Notas com Opções](#71-notas-com-opções)
   - 7.2 [Notas com Mercado a Termo](#72-notas-com-mercado-a-termo)
   - 7.3 [Notas com FIIs](#73-notas-com-fiis)
   - 7.4 [Notas com Day Trade Explícito](#74-notas-com-day-trade-explícito)
   - 7.5 [Notas com Múltiplas Páginas](#75-notas-com-múltiplas-páginas)
   - 7.6 [Notas Mistas: Bovespa + BM&F no Mesmo Dia](#76-notas-mistas-bovespa--bmf-no-mesmo-dia)
8. [Biblioteca correpy: Análise Técnica](#8-biblioteca-correpy-análise-técnica)
   - 8.1 [Visão Geral e Histórico](#81-visão-geral-e-histórico)
   - 8.2 [Corretoras Suportadas](#82-corretoras-suportadas)
   - 8.3 [Uso e Integração](#83-uso-e-integração)
   - 8.4 [Limitações e Alternativas](#84-limitações-e-alternativas)
9. [Outros Parsers e Ferramentas Open Source](#9-outros-parsers-e-ferramentas-open-source)
10. [Notas Protegidas por Senha](#10-notas-protegidas-por-senha)
    - 10.1 [Padrão de Senha por Corretora](#101-padrão-de-senha-por-corretora)
    - 10.2 [Tratamento no pdfjs-dist](#102-tratamento-no-pdfjs-dist)
11. [Encoding e Caracteres Especiais no pdfjs-dist](#11-encoding-e-caracteres-especiais-no-pdfjs-dist)
    - 11.1 [Problemas Comuns](#111-problemas-comuns)
    - 11.2 [Configuração Correta de CMap](#112-configuração-correta-de-cmap)
    - 11.3 [Estratégias de Fallback](#113-estratégias-de-fallback)
12. [Frequência de Mudanças de Layout e Detecção](#12-frequência-de-mudanças-de-layout-e-detecção)
    - 12.1 [Histórico de Mudanças Conhecidas](#121-histórico-de-mudanças-conhecidas)
    - 12.2 [Estratégia de Detecção por Fingerprint](#122-estratégia-de-detecção-por-fingerprint)
    - 12.3 [Versionamento de Parsers](#123-versionamento-de-parsers)
13. [Arquitetura Recomendada para o CRM](#13-arquitetura-recomendada-para-o-crm)
    - 13.1 [Pipeline de Importação no Browser](#131-pipeline-de-importação-no-browser)
    - 13.2 [Modelo de Dados no Firestore](#132-modelo-de-dados-no-firestore)
    - 13.3 [Cálculo de Preço Médio Ponderado](#133-cálculo-de-preço-médio-ponderado)
    - 13.4 [Apuração de IRRF Mensal](#134-apuração-de-irrf-mensal)
14. [Checklist de Campos por Tipo de Operação](#14-checklist-de-campos-por-tipo-de-operação)
15. [Referências](#15-referências)

---

## 1. O que é SINACOR

SINACOR é a sigla para **Sistema Integrado de Administração de Corretoras**. Trata-se do sistema de backoffice homologado pela B3 (Brasil, Bolsa, Balcão) que conecta investidores e corretoras ao ecossistema da bolsa brasileira. Desenvolvido originalmente pela Bovespa e evoluído pela B3 após a fusão com a BM&F em 2008, o sistema está presente em aproximadamente **95% das corretoras** brasileiras autorizadas a operar.

O SINACOR controla:
- Movimentações de bolsa (ordens, execuções, cancelamentos)
- Conta corrente do cliente na corretora
- Custódia de ativos (posições abertas)
- Geração de notas de corretagem (relatórios de liquidação)
- Gestão de margens e garantias

A **nota de corretagem** é o documento de liquidação gerado diariamente pelo SINACOR para cada cliente que realizou operações. Ela funciona como um extrato de todas as transações do pregão, com detalhe de custos e resultado financeiro líquido.

**Por que o padrão importa para parsing:** Como o SINACOR é o sistema gerador, todas as corretoras que o utilizam seguem uma estrutura base comum. Entretanto, cada corretora pode personalizar margens, fontes, logos e até reorganizar levemente campos — o que exige estratégias robustas de detecção e parsing.

---

## 2. Arquitetura do Sistema SINACOR

O SINACOR utiliza banco de dados Oracle com um schema proprietário. Algumas informações relevantes para quem precisa entender a origem dos dados nas notas:

- O schema pertence ao owner chamado `bovwin`, `sinawin` ou `corwin` (variações históricas)
- O sistema possui **2.340 tabelas** organizadas por prefixo de módulo
- Tabelas relevantes para notas de corretagem:
  - `TSC` — Cadastro do cliente (nome, CPF, conta)
  - `TCC` — Conta corrente (saldo, projeções)
  - Tabelas de ordens e execuções (prefixo `OE`, `NE`)
  - Tabelas de nota de corretagem (prefixo `NC`)

O sistema gera PDFs no formato SINACOR a partir dessas tabelas, seguindo templates definidos pela B3. As corretoras têm liberdade para customizar apresentação visual (logo, cores, fonte), mas os **campos de dados são obrigatórios** e padronizados pelo regulador.

---

## 3. Estrutura Padrão da Nota de Corretagem

### 3.1 Dois Tipos de Nota: Bovespa vs BM&F

A B3 opera dois segmentos com estruturas de nota distintas:

| Característica | Nota Bovespa (Ações/RV) | Nota BM&F (Futuros/Derivativos) |
|---|---|---|
| Ativos | Ações, FIIs, ETFs, BDRs, Opções, Termo, Debentures | WIN, WDO, DOL, IND, contratos futuros |
| Campo de preço | "Preço" (valor por ação) | "Preço/Ajuste" (valor do contrato) |
| Campo de prazo | "Prazo" (para termo) | "Vencimento" |
| Custos extras | Taxa de liquidação, emolumentos | Taxa operacional, taxa de registro BM&F, taxa BM&F (EMOL+F.GAR) |
| Ajuste diário | Não | Sim (crédito/débito de margem) |
| IRRF day trade | 1% sobre lucro | 1% sobre ajuste positivo |
| IRRF swing | 0,005% sobre valor operado | 0,005% sobre valor do contrato |

**Para o contexto deste projeto (CRM de assessores XP focado em ações):** a Nota Bovespa é o formato principal. A Nota BM&F é menos comum em carteiras de clientes assessorados mas deve ser suportada para completude.

### 3.2 Seções Obrigatórias (Nota Bovespa)

Uma nota de corretagem SINACOR no formato Bovespa possui, obrigatoriamente, as seguintes seções em ordem vertical na página:

```
┌─────────────────────────────────────────────────────────────┐
│  1. CABEÇALHO DA CORRETORA                                  │
│     (Logo, Nome, CNPJ, endereço, contatos)                  │
├─────────────────────────────────────────────────────────────┤
│  2. CABEÇALHO DA NOTA                                        │
│     (Nr. nota, Folha, Data pregão, Cod. cliente, Conta)     │
├─────────────────────────────────────────────────────────────┤
│  3. NEGÓCIOS REALIZADOS                                      │
│     (Tabela: Q | C/V | Tipo Mercado | Prazo | Especificação │
│      | Obs | Qtd | Preço/Ajuste | Valor operação | D/C)     │
├─────────────────────────────────────────────────────────────┤
│  4. RESUMO DOS NEGÓCIOS                                      │
│     (Subtotais por tipo: RV à Vista, Opções, Termo, RF)     │
├─────────────────────────────────────────────────────────────┤
│  5. CLEARING (RESUMO FINANCEIRO — CBLC)                     │
│     (Valor líquido ops | Taxa liquidação | Taxa registro    │
│      | Total CBLC)                                          │
├─────────────────────────────────────────────────────────────┤
│  6. BOLSA (CUSTOS B3)                                        │
│     (Emolumentos | Taxa corretagem | ISS | IRRF | Total)    │
├─────────────────────────────────────────────────────────────┤
│  7. TOTAL LÍQUIDO                                            │
│     (Resultado final D/C)                                   │
├─────────────────────────────────────────────────────────────┤
│  8. DADOS DO INVESTIDOR                                      │
│     (Nome, CPF/CNPJ, Conta corrente)                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Campos do Cabeçalho

O cabeçalho de uma nota de corretagem SINACOR contém dois blocos distintos:

**Bloco A — Identificação da Corretora:**
- Nome completo da corretora
- CNPJ da corretora
- Endereço físico
- Telefone / e-mail de atendimento
- Logo (imagem, não texto)

**Bloco B — Dados da Nota:**
| Campo | Descrição | Exemplo |
|---|---|---|
| `Nr. nota` | Número sequencial da nota (8 dígitos) | `00000010` |
| `Folha` | Número da página atual e total | `1` ou `1/3` |
| `Data pregão` | Data da sessão de negociação | `18/06/2020` |
| `Cod. cliente` | Código do cliente na corretora | `123456` |
| `Conta` | Número da conta (pode ser separado ou junto ao cód. cliente) | Variável |

**Padrão de extração do cabeçalho:**
```
Nr. nota: \d{6,10}
Data pregão: \d{2}/\d{2}/\d{4}
Folha: \d+
```

### 3.4 Campos da Tabela de Negócios Realizados

Esta é a seção mais crítica para o parsing. Cada linha da tabela representa uma operação executada no pregão.

**Colunas obrigatórias:**

| Coluna | Abreviação | Conteúdo | Exemplo |
|---|---|---|---|
| Negociação | `Q` ou `Neg.` | Indicador de lote (1=lote padrão, F=fracionário) | `1` ou `F` |
| C/V | `C/V` | Compra ou Venda | `C` ou `V` |
| Tipo Mercado | Variável | Tipo do mercado onde foi executado | `VISTA`, `OPCAO DE COMPRA`, `TERMO` |
| Prazo | `Prazo` | Dias corridos para vencimento (Termo) ou vazio | `` ou `30` |
| Especificação do Título | Variável | Ticker + descrição do ativo | `PETR4` |
| Obs | `Obs` | Observações especiais (D=day trade, # = grupo de liquidação) | `D`, `#` ou vazio |
| Quantidade | `Qtde` | Número de ativos negociados | `100` |
| Preço / Ajuste | `Preço/Ajuste` | Valor unitário do ativo | `28,40` |
| Valor da Operação | `Valor Oper.` | Quantidade × Preço | `2.840,00` |
| D/C | `D/C` | Débito ou Crédito | `D` ou `C` |

**Observações sobre o campo "Especificação do Título":**
- Para **ações à vista**: contém apenas o ticker (ex: `PETR4`, `VALE3`, `ITUB4`)
- Para **opções**: contém o código da opção completo (ex: `PETRA172`, `PETRB172`) — o ticker subjacente precisa ser extraído dos primeiros 4-5 caracteres
- Para **FIIs**: ticker com 11 dígitos (ex: `MXRF11`, `KNRI11`)
- Para **BDRs**: ticker com sufixo 34 (ex: `AAPL34`, `MSFT34`)
- Para **ETFs**: ticker padrão (ex: `BOVA11`, `IVVB11`)
- Para **termo**: ticker + sufixo `T` pode aparecer (ex: `PETR4T`)

**Valores do campo "Tipo Mercado":**
```
"VISTA"                  → Mercado à vista (ações, FIIs, ETFs, BDRs)
"OPCAO DE COMPRA"        → Opção de compra (CALL)
"OPCAO DE VENDA"         → Opção de venda (PUT)
"EXERC DE OPCOES"        → Exercício de opção
"TERMO"                  → Mercado a Termo
"LEILAO"                 → Leilão de abertura/fechamento
"FRACIONARIO"            → Mercado fracionário (lotes menores)
```

**Regex para linha de operação:**
```javascript
// Padrão para linha da tabela de negócios
const linhaOperacaoRegex = /^(\d|F)\s+(C|V)\s+(VISTA|OPCAO DE COMPRA|OPCAO DE VENDA|TERMO|EXERC DE OPCOES|FRACIONARIO|LEILAO)\s+(\d+)?\s+([A-Z0-9]+[^0-9].*?)\s+(D|#|\d)?\s+(\d[\d.]*)\s+([\d.,]+)\s+([\d.,]+)\s+(D|C)$/m
```

### 3.5 Resumo dos Negócios

Seção que agrupa os totais por tipo de mercado. Localizada logo abaixo da tabela de negócios realizados.

**Campos presentes:**
| Campo | Descrição |
|---|---|
| `Mercado` | Tipo de mercado (RV à Vista, Opções, Termo, etc.) |
| `Debêntures` | Total de debêntures negociadas |
| `Vendas à vista` | Total de vendas no mercado à vista |
| `Compras à vista` | Total de compras no mercado à vista |
| `Opções - compras` | Total de compras de opções |
| `Opções - vendas` | Total de vendas de opções |
| `Operações à termo` | Total de operações a termo |
| `Valor das oper. c/ títulos públicos e priv.` | Renda fixa negociada |

**Regex para o resumo dos negócios:**
```javascript
const vendasVistaRegex = /Vendas\s*à\s*vista\s+([\d.,]+)/i
const comprasVistaRegex = /Compras\s*à\s*vista\s+([\d.,]+)/i
```

### 3.6 Resumo Financeiro (Clearing)

Esta seção apresenta a apuração financeira final. É dividida em dois grupos:

**Grupo CLEARING (custos de liquidação — CBLC):**
| Campo | Descrição | Taxa |
|---|---|---|
| `Valor líquido das operações` | Compras − Vendas do dia (D/C) | — |
| `Taxa de liquidação` | Cobrada pela CBLC | PF: 0,0275% normal / 0,018% day trade |
| `Taxa de Registro` | Cobrada pelo sistema de liquidação | Variável |
| `Total CBLC` | Soma dos custos de clearing | — |

**Grupo BOLSA (custos de negociação — B3):**
| Campo | Descrição | Taxa |
|---|---|---|
| `Emolumentos` | Taxa de negociação da B3 | 0,0050% sobre valor bruto |
| `Taxa de corretagem` | Cobrada pela corretora | Variável (zero em muitas) |
| `Taxa de custódia` | Guarda de ativos | Variável |
| `ISS` | Imposto sobre serviços (incide sobre corretagem) | 2% a 5% sobre corretagem |
| `IRRF Day Trade` | IR retido na fonte em day trade | 1% sobre lucro líquido do DT |
| `IRRF Swing Trade` | IR retido "dedo-duro" | 0,005% sobre valor total vendido |
| `Outros` | Taxas adicionais específicas | Variável |
| `Total Bolsa` | Soma dos custos de bolsa | — |

**Total Líquido:**
| Campo | Descrição |
|---|---|
| `Líquido para` | Data D+2 de liquidação |
| `Valor líquido` | Total a débitar ou creditar na conta |
| `D/C` | Débito (compras > vendas) ou Crédito (vendas > compras) |

**Regex para campos financeiros:**
```javascript
// Valor líquido das operações
const valorLiquidoOpsRegex = /Valor\s*l[íi]quido\s*das\s*opera[çc][õo]es\s+([\d.,]+)\s+(D|C)/i

// IRRF day trade
const irrfDayTradeRegex = /I\.?R\.?R\.?F\.?\s*Day\s*Trade\s+([\d.,]+)/i

// IRRF swing trade (0,005%)
const irrfSwingRegex = /I\.?R\.?R\.?F\.?\s*(s\.?\s*trade|normal|opera[çc][õo]es)\s+([\d.,]+)/i

// Total líquido
const totalLiquidoRegex = /L[íi]quido\s+para\s+\d{2}\/\d{2}\/\d{4}\s+([\d.,]+)\s+(D|C)/i
```

### 3.7 Rodapé e Dados do Investidor

No rodapé (ou segunda seção inferior) da nota:
- **Nome do investidor** (completo, como cadastrado na corretora)
- **CPF ou CNPJ** do investidor
- **Número da conta corrente** na corretora
- **Assinatura digital** (em algumas corretoras)
- **Observações legais** (texto padrão sobre responsabilidade)
- **Código de barras** ou QR code para autenticação (em algumas corretoras)

---

## 4. Variações por Corretora

### 4.1 Grupo XP (XP, Rico, Clear, Modal)

O Grupo XP Inc. é o maior grupo de corretagem independente do Brasil. As marcas XP, Rico, Clear e Modal (adquirida em 2021) operam sob a mesma entidade jurídica para execução: **XP Investimentos CCTVM S.A.**.

**CNPJ executor:** `02.332.886/0001-04`

**Dois modelos de nota disponíveis:**
1. **Modelo B3 (padrão SINACOR):** Compatível com calculadoras de IR, ferramentas fiscais e importação em sistemas de terceiros. Este é o modelo que deve ser usado para parsing.
2. **Modelo XP:** Formato proprietário com mais detalhes (corretagem detalhada por operação, etc.), mas **não compatível com a Receita Federal** e difícil de parsear por não seguir o padrão SINACOR.

**Características do layout (Modelo B3):**
- Cabeçalho: Logo XP + "XP Investimentos CCTVM S.A." + CNPJ
- Para clientes Rico e Clear: o cabeçalho ainda mostra "XP Investimentos" (não "Rico" ou "Clear") — isso é relevante para identificação de corretora
- Seção "Negócios realizados" segue padrão SINACOR exato
- Campo "Nr. nota" sempre com 8 dígitos com zeros à esquerda
- Data no formato `dd/mm/aaaa`
- Valores no formato brasileiro `1.234,56` (ponto para milhar, vírgula para decimal)
- IRRF aparece na seção "Bolsa" como linha separada
- Notas de day trade: campo "Obs" com "D" em cada operação DT

**Notas de múltiplas páginas (XP/Clear):**
- Quando há muitas operações, a nota pode ter 2 ou mais páginas
- O cabeçalho da corretora repete em todas as páginas
- "Folha" indica o número atual e a seção "Negócios Realizados" continua nas páginas seguintes
- O "Resumo dos Negócios" e "Resumo Financeiro" aparecem APENAS na última página
- Estratégia de parsing: concatenar o texto de todas as páginas antes de aplicar regex ao resumo financeiro

**Particularidade da Clear (pós-migração 2023):**
- Em 2023, a Clear migrou sua plataforma para o sistema da XP
- Após a migração, as notas da Clear passaram a ter o mesmo layout exato que as notas da XP
- Antes de 2023, havia algumas diferenças visuais (logo Clear, campos levemente distintos)
- PDFs históricos anteriores a 2023 podem ter layout diferente

**Particularidade da Modal:**
- A Modal foi adquirida pela XP em 2021 e gradualmente migrada
- Notas emitidas pela Modal antes da migração completa ainda circulam em carteiras históricas
- CNPJ Modal: `00.942.750/0001-62`
- Layout Modal pré-XP era similar ao SINACOR padrão mas com algumas diferenças de fonte e espaçamento

### 4.2 BTG Pactual Digital

O BTG Pactual Digital é a plataforma digital do maior banco de investimento da América Latina.

**CNPJ:** `30.306.294/0001-45` (BTG Pactual Digital S.A. CTVM)

**Características do layout:**
- Segue o padrão SINACOR mas com maior personalização visual
- Logo BTG proeminente no cabeçalho (logo com fundo escuro)
- Nome da seção pode variar levemente: "Resumo Financeiro" ao invés de apenas "Clearing"
- O BTG é conhecido por ter **demorado a disponibilizar notas** no padrão SINACOR via app (há reclamações históricas de clientes de 2022-2023 sobre isso)
- As notas estão disponíveis no app BTG Trader
- Campo de IRRF: apresentado como "I.R.R.F." (com pontos entre as letras)

**Diferença do Grupo XP:**
- O BTG não oferece o "modelo BTG" alternativo — apenas o padrão B3/SINACOR
- Pode omitir o campo `Taxa de corretagem` quando ela é zero (linha ausente, não zerada)
- Taxas operacionais do BTG são cobradas diferentemente: modelo "ticket" por ordem

### 4.3 NuInvest (ex-Easynvest)

A NuInvest é a corretora do Nubank, adquirida em 2020 quando ainda se chamava Easynvest.

**CNPJ:** `62.169.875/0001-79` (Nu Invest Corretora de Valores S.A.)

**Características do layout:**
- Layout muito próximo ao padrão SINACOR canônico
- Cabeçalho com logo do Nubank/NuInvest
- Notas disponíveis tanto no app Nubank quanto no site NuInvest
- Enviadas por e-mail automaticamente no dia seguinte à operação
- O padrão SINACOR da NuInvest é emitido pela corretora (Nu Invest), não pelo Nubank banco
- Para usuários que acessam via app Nubank: as notas aparecem em "Configurações > Documentos > Notas de Negociação"

**Especificidade da NuInvest:**
- A corretagem é zero para ações → campo "Taxa de corretagem" pode estar ausente ou zerado
- Emolumentos B3 são passados integralmente ao cliente
- O formato das notas do NuInvest seguiu a herança da Easynvest, que já era um formato SINACOR limpo

### 4.4 Banco Inter Corretora

O Inter Corretora opera como parte do ecossistema do Banco Inter.

**CNPJ:** `13.486.793/0001-42` (Banco Inter S.A. — a corretora opera pelo banco)

**Características do layout:**
- Nota de corretagem no padrão SINACOR
- **Observação importante sobre tamanho de página:** As notas do Inter precisam ser configuradas para o tamanho "Carta" ou "US Letter" ao exportar — o sistema pode gerar em tamanho diferente dependendo da versão
- O Inter oferece a nota diretamente no app e no internet banking
- Cabeçalho com logo do Banco Inter (laranja)
- Corretagem zero para ações → campo ausente ou zerado

### 4.5 Toro Investimentos / Santander Corretora

A Toro é a corretora digital do Banco Santander Brasil.

**CNPJ Santander Corretora:** `01.522.368/0001-82`

**Características do layout:**
- Dois modelos: "Comprovante" (formato proprietário) e "padrão Sinacor"
- O usuário deve selecionar explicitamente o padrão Sinacor em "Notas de Operações"
- Layout muito próximo ao padrão canônico
- Cabeçalho com logo Toro/Santander

### 4.6 Itaú Corretora (Íon)

A Íon é a plataforma de investimentos do Itaú Unibanco.

**CNPJ Itaú Corretora:** `61.194.353/0001-64`

**Características do layout:**
- Segue o padrão SINACOR
- Acesso via "Minha Conta > Imposto de Renda" na plataforma Íon
- Layout com a identidade visual do Itaú
- Menos reclamações de variação de layout em comparação com corretoras menores

### 4.7 CM Capital e Necton

Corretoras menores focadas em traders ativos.

**CM Capital CNPJ:** `02.685.483/0001-30`
**Necton CNPJ:** `52.904.364/0001-08`

**CM Capital:**
- Oferece notas Bovespa e BM&F separadas
- Especializada em contratos futuros → notas BM&F são mais comuns
- Layout SINACOR padrão

**Necton:**
- Suportada pelo COIR (MarceloPCF) como uma das corretoras oficialmente testadas
- Layout SINACOR padrão com pequenas variações de fonte
- Emolumentos destacados separadamente

### 4.8 Tabela Comparativa Geral

| Corretora | CNPJ Principal | Layout Base | Senha PDF | Modelo Proprietário | Multi-página | Nota BM&F separada |
|---|---|---|---|---|---|---|
| XP Investimentos | 02.332.886/0001-04 | SINACOR padrão | Sim (ver seção 10) | Sim ("Modelo XP") | Sim | Sim |
| Clear Corretora | 02.332.886/0001-04 | SINACOR = XP (pós-2023) | Sim | Não | Sim | Sim |
| Rico Investimentos | 02.332.886/0001-04 | SINACOR = XP | Sim | Não | Sim | Sim |
| Modal (ex-Modal) | 00.942.750/0001-62 | SINACOR similar | Não confirmado | Não | Sim | Sim |
| BTG Pactual Digital | 30.306.294/0001-45 | SINACOR + visual BTG | Não | Não | Sim | Sim |
| NuInvest | 62.169.875/0001-79 | SINACOR limpo | Não | Não | Sim | Não (foco RV) |
| Banco Inter | 13.486.793/0001-42 | SINACOR (cfg tamanho) | Não | Não | Sim | Não |
| Toro/Santander | 01.522.368/0001-82 | SINACOR (selecionar) | Não | Sim ("Comprovante") | Sim | Não |
| Itaú/Íon | 61.194.353/0001-64 | SINACOR | Não | Não | Sim | Não |
| Necton | 52.904.364/0001-08 | SINACOR | Não | Não | Sim | Sim |
| CM Capital | 02.685.483/0001-30 | SINACOR | Não | Não | Sim | Sim |

---

## 5. Identificação Programática de Corretoras por CNPJ

A estratégia mais confiável para identificar qual corretora emitiu a nota é extrair o CNPJ do cabeçalho. O CNPJ segue o padrão `XX.XXX.XXX/XXXX-XX`.

```javascript
// Mapa de CNPJs conhecidos para corretoras
const CNPJ_CORRETORA_MAP = {
  '02.332.886/0001-04': { nome: 'XP Investimentos', grupo: 'XP_INC', subMarcas: ['XP', 'Clear', 'Rico', 'Modal'] },
  '00.942.750/0001-62': { nome: 'Modal DTVM', grupo: 'XP_INC', subMarcas: ['Modal'] },
  '30.306.294/0001-45': { nome: 'BTG Pactual Digital', grupo: 'BTG', subMarcas: ['BTG'] },
  '62.169.875/0001-79': { nome: 'Nu Invest Corretora', grupo: 'NUBANK', subMarcas: ['NuInvest'] },
  '13.486.793/0001-42': { nome: 'Banco Inter', grupo: 'INTER', subMarcas: ['Inter'] },
  '01.522.368/0001-82': { nome: 'Toro / Santander Corretora', grupo: 'SANTANDER', subMarcas: ['Toro', 'Santander'] },
  '61.194.353/0001-64': { nome: 'Itaú Corretora de Valores', grupo: 'ITAU', subMarcas: ['Íon', 'Itaú'] },
  '52.904.364/0001-08': { nome: 'Necton Investimentos', grupo: 'NECTON', subMarcas: ['Necton'] },
  '02.685.483/0001-30': { nome: 'CM Capital', grupo: 'CM_CAPITAL', subMarcas: ['CM Capital'] },
  '43.815.158/0001-22': { nome: 'Genial Investimentos', grupo: 'GENIAL', subMarcas: ['Genial'] },
  '02.588.002/0001-86': { nome: 'Órama DTVM', grupo: 'ORAMA', subMarcas: ['Órama'] },
}

// Extrair CNPJ do texto da nota
function extrairCNPJCorretora(textoNota) {
  // CNPJs no cabeçalho aparecem próximos ao nome da corretora
  const cnpjRegex = /CNPJ[:\s]+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i
  const match = textoNota.match(cnpjRegex)
  if (match) {
    return match[1]
  }
  // Fallback: encontrar qualquer CNPJ no início do documento (primeiros 500 chars)
  const cnpjGeralRegex = /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/
  const matchGeral = textoNota.substring(0, 500).match(cnpjGeralRegex)
  return matchGeral ? matchGeral[1] : null
}

// Identificar corretora a partir do CNPJ extraído
function identificarCorretora(textoNota) {
  const cnpj = extrairCNPJCorretora(textoNota)
  if (!cnpj) {
    // Fallback por nome no cabeçalho
    if (/XP Investimentos/i.test(textoNota.substring(0, 300))) return CNPJ_CORRETORA_MAP['02.332.886/0001-04']
    if (/BTG Pactual/i.test(textoNota.substring(0, 300))) return CNPJ_CORRETORA_MAP['30.306.294/0001-45']
    if (/NuInvest|Nu Invest/i.test(textoNota.substring(0, 300))) return CNPJ_CORRETORA_MAP['62.169.875/0001-79']
    return null
  }
  return CNPJ_CORRETORA_MAP[cnpj] || { nome: 'Corretora Desconhecida', grupo: 'DESCONHECIDA', cnpj }
}
```

**Nota importante sobre o Grupo XP:** Como XP, Clear e Rico compartilham o mesmo CNPJ, a sub-marca pode ser identificada pelo nome no cabeçalho:
- "XP INVESTIMENTOS CCTVM S.A." → determinar pela sub-marca mencionada no documento
- O texto "Clear" ou logo da Clear no cabeçalho indica conta Clear
- O texto "Rico" indica conta Rico
- Sem menção específica = conta XP principal

---

## 6. Campos Críticos para Parsing: Patterns e Regex

### 6.1 Regex por Campo — Nota Bovespa

```javascript
// ============================================================
// PATTERNS PARA NOTA DE CORRETAGEM BOVESPA (SINACOR)
// Compatível com: XP, Clear, Rico, BTG, NuInvest, Inter
// ============================================================

const SINACOR_BOVESPA_PATTERNS = {
  
  // CABEÇALHO
  numeroNota: /Nr\.?\s*nota\s*[:\s]+(\d+)/i,
  folha: /Folha\s*[:\s]+(\d+)/i,
  dataPregao: /Data\s+preg[ãa]o\s*[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  codigoCliente: /C[oó]d\.?\s*[Cc]liente\s*[:\s]+(\d+)/i,
  cnpjCorretora: /CNPJ[:\s]+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
  
  // LINHA DE OPERAÇÃO (exemplo de linha completa):
  // "1 C VISTA  PETR4 ON  D 100 28,40 2.840,00 D"
  linhaOperacao: /^(\d|F)\s+(C|V)\s+(VISTA|OPCAO DE COMPRA|OPCAO DE VENDA|EXERC DE OPCOES|TERMO|FRACIONARIO|LEILAO)\s*(\d+)?\s+(.+?)\s+(D|#|\d|\s)?\s+(\d[\d.]*)\s+([\d.,]+)\s+([\d.,]+)\s+(D|C)\s*$/gm,
  
  // Extração individual dos campos de uma linha de operação
  operacaoCVField: /^(C|V)\s/,
  operacaoTipoMercado: /(VISTA|OPCAO DE COMPRA|OPCAO DE VENDA|EXERC DE OPCOES|TERMO|FRACIONARIO|LEILAO)/i,
  operacaoTicker: /([A-Z]{4}\d{1,2}[A-Z]?(?:F|\d{2,3})?)\s/,  // PETR4, MXRF11, PETRA172
  operacaoObs: /\s(D|#)\s/,  // D=day trade, #=liquidação especial
  operacaoQuantidade: /(\d[\d.]*)\s+[\d.,]+\s+[\d.,]+\s+[DC]$/,
  operacaoPreco: /\s([\d.,]+)\s+([\d.,]+)\s+[DC]$/,
  operacaoValor: /\s([\d.,]+)\s+[DC]$/,
  operacaoDC: /(D|C)$/,
  
  // RESUMO DOS NEGÓCIOS
  vendasVista: /Vendas?\s*[àa]\s*vista\s+([\d.,]+)/i,
  comprasVista: /Compras?\s*[àa]\s*vista\s+([\d.,]+)/i,
  opcoesCompras: /Op[çc][õo]es?\s*[-–]\s*compras?\s+([\d.,]+)/i,
  opcoesVendas: /Op[çc][õo]es?\s*[-–]\s*vendas?\s+([\d.,]+)/i,
  operacoesTermo: /Opera[çc][õo]es?\s*[àa]\s*[Tt]ermo\s+([\d.,]+)/i,
  
  // RESUMO FINANCEIRO (CLEARING)
  valorLiquidoOperacoes: /Valor\s+l[íi]quido\s+das\s+opera[çc][õo]es\s+([\d.,]+)\s+(D|C)/i,
  taxaLiquidacao: /Taxa\s+de\s+[Ll]iquida[çc][ãa]o\s+([\d.,]+)/i,
  taxaRegistro: /Taxa\s+de\s+[Rr]egistro\s+([\d.,]+)/i,
  totalCBLC: /Total\s+CBLC\s+([\d.,]+)\s+(D|C)/i,
  
  // CUSTOS BOLSA
  emolumentos: /Emolumentos\s+([\d.,]+)/i,
  taxaCorretagem: /Taxa\s+de\s+[Cc]orretagem\s+([\d.,]+)/i,
  impostoISS: /I\.?S\.?S\.?\s+([\d.,]+)/i,
  
  // IRRF
  irrfDayTrade: /I\.?R\.?R\.?F\.?\s+Day\s+Trade\s+([\d.,]+)/i,
  irrfOperacoes: /I\.?R\.?R\.?F\.?\s+(?!Day\s+Trade)([\d.,]+)/i,
  irrfNormal: /I\.?R\.?R\.?F\.?\s+(?:s\/|\s)?(?:Normal|Opera[çc][õo]es|Oper\.)\s+([\d.,]+)/i,
  
  // TOTAL LÍQUIDO
  totalLiquido: /L[íi]quido\s+para\s+\d{2}\/\d{2}\/\d{4}\s+([\d.,]+)\s+(D|C)/i,
  
  // DADOS DO INVESTIDOR
  nomeInvestidor: /Nome\s*:\s*(.+?)(?:\n|CPF|CNPJ)/i,
  cpfInvestidor: /CPF\s*:\s*([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i,
  cnpjInvestidor: /CNPJ\s*:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
}
```

### 6.2 Regex por Campo — Nota BM&F

```javascript
const SINACOR_BMF_PATTERNS = {
  
  // CABEÇALHO (similar Bovespa)
  numeroNota: /Nr\.?\s*nota\s*[:\s]+(\d+)/i,
  dataPregao: /Data\s+preg[ãa]o\s*[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  
  // LINHA DE OPERAÇÃO BM&F
  // Exemplo: "C WIN WIN MAR/25 82450 10 D"
  // Mercado Futuro: indicador | C/V | Produto | Vencimento | Preço Ajuste | Qtd Contratos | D/C
  linhaOperacaoBMF: /^(C|V)\s+([A-Z]{3,6})\s+([A-Z]+\d{2})\s+([\d.,]+)\s+(\d+)\s+(D|C)$/gm,
  
  // Ajuste diário
  ajusteDiario: /Ajuste\s+(?:Diário|de\s+Posi[çc][ãa]o)\s+([\d.,]+)\s+(D|C)/i,
  
  // Taxa operacional BM&F
  taxaOperacional: /Taxa\s+[Oo]peracional\s+([\d.,]+)/i,
  
  // Emolumentos BM&F
  emolumentosBMF: /(?:Taxa\s+)?BM&F\s+\(EMOL\+F\.GAR\)\s+([\d.,]+)/i,
  
  // Taxa de Registro BM&F
  taxaRegistroBMF: /Taxa\s+Registro\s+BM&F\s+([\d.,]+)/i,
  
  // IRRF BM&F
  irrfBMF: /I\.?R\.?R\.?F\.?\s+([\d.,]+)/i,
  
  // Total BM&F
  totalBMF: /Total\s+(?:BM&F|Futuro)\s+([\d.,]+)\s+(D|C)/i,
}
```

### 6.3 Algoritmo de Parsing Completo em JavaScript

```javascript
// ============================================================
// Parser de Nota SINACOR para uso com pdfjs-dist no browser
// Compatível com Next.js 14 (App Router)
// ============================================================

import * as pdfjsLib from 'pdfjs-dist'

// IMPORTANTE: configurar o worker e o CMap (ver seção 11)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

/**
 * Extrai texto de todas as páginas de um PDF
 */
async function extrairTextoPDF(arrayBuffer, password = null) {
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: password || undefined,
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    // Importante para PDFs com fontes não-padrão (comum em corretoras)
    standardFontDataUrl: '/standard_fonts/',
  })
  
  const pdf = await loadingTask.promise
  let textoCompleto = ''
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    
    // Reconstruir texto preservando espaços e quebras de linha
    const pageText = textContent.items
      .map(item => {
        // item.str é o texto; item.transform[5] é a posição Y
        // Detectar quebra de linha por variação de Y
        return item.str
      })
      .join(' ')
    
    textoCompleto += pageText + '\n'
  }
  
  return textoCompleto
}

/**
 * Normalizar valor monetário brasileiro para número float
 */
function parseBRLValue(str) {
  if (!str) return 0
  // Remove pontos de milhar e troca vírgula por ponto
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

/**
 * Parser principal de nota SINACOR
 */
async function parsearNotaSINACOR(pdfArrayBuffer, senhaOpcional = null) {
  const texto = await extrairTextoPDF(pdfArrayBuffer, senhaOpcional)
  
  // 1. Identificar corretora
  const corretora = identificarCorretora(texto)
  
  // 2. Detectar tipo de nota (Bovespa ou BM&F)
  const tipoNota = detectarTipoNota(texto)
  
  // 3. Extrair cabeçalho
  const cabecalho = extrairCabecalho(texto)
  
  // 4. Extrair operações
  const operacoes = tipoNota === 'BOVESPA' 
    ? extrairOperacoesBovespa(texto)
    : extrairOperacoesBMF(texto)
  
  // 5. Extrair resumo financeiro
  const resumoFinanceiro = extrairResumoFinanceiro(texto)
  
  return {
    corretora,
    tipoNota,
    cabecalho,
    operacoes,
    resumoFinanceiro,
    textoOriginal: texto,  // Manter para debug/auditoria
  }
}

function detectarTipoNota(texto) {
  // Notas BM&F têm referências a "ajuste", "contrato futuro", "WIN", "WDO"
  if (/ajuste\s+di[aá]rio|mercado\s+futuro|WIN|WDO|DOL|IND/i.test(texto)) {
    return 'BMF'
  }
  return 'BOVESPA'
}

function extrairCabecalho(texto) {
  const P = SINACOR_BOVESPA_PATTERNS
  
  const numeroNotaMatch = texto.match(P.numeroNota)
  const dataPregaoMatch = texto.match(P.dataPregao)
  const folhaMatch = texto.match(P.folha)
  const cnpjMatch = texto.match(P.cnpjCorretora)
  
  return {
    numeroNota: numeroNotaMatch?.[1]?.trim(),
    dataPregao: dataPregaoMatch?.[1]?.trim(),  // dd/mm/aaaa
    folha: folhaMatch?.[1]?.trim(),
    cnpjCorretora: cnpjMatch?.[1]?.trim(),
  }
}

function extrairOperacoesBovespa(texto) {
  const operacoes = []
  
  // Encontrar o bloco de negócios realizados
  const inicioNegociosRegex = /[Nn]eg[oó]cios\s+[Rr]ealizados/
  const fimNegociosRegex = /[Rr]esumo\s+dos\s+[Nn]eg[oó]cios/
  
  const inicioMatch = inicioNegociosRegex.exec(texto)
  const fimMatch = fimNegociosRegex.exec(texto)
  
  if (!inicioMatch || !fimMatch) return operacoes
  
  const blocoNegocioss = texto.substring(inicioMatch.index, fimMatch.index)
  
  // Processar linha a linha
  const linhas = blocoNegocioss.split('\n')
  
  for (const linha of linhas) {
    const linhaTrimmed = linha.trim()
    if (!linhaTrimmed) continue
    
    // Detectar se a linha contém uma operação
    // A linha começa com "1" ou "F" (indicador de lote)
    if (!/^(\d|F)\s+(C|V)/i.test(linhaTrimmed)) continue
    
    const operacao = parsearLinhaOperacao(linhaTrimmed)
    if (operacao) operacoes.push(operacao)
  }
  
  return operacoes
}

function parsearLinhaOperacao(linha) {
  // Split por whitespace preservando grupos
  const partes = linha.trim().split(/\s+/)
  
  if (partes.length < 6) return null
  
  const idx = {
    lote: 0,        // "1" ou "F"
    cv: 1,          // "C" ou "V"
    tipoMercado: 2, // "VISTA", "OPCAO DE COMPRA", etc.
    // os campos após tipoMercado variam conforme o tipo de mercado
  }
  
  const tipoMercado = parsearTipoMercado(partes, idx.tipoMercado)
  
  // Após identificar o tipo de mercado, extrair os campos restantes
  const restoLinha = partes.slice(idx.tipoMercado + tipoMercado.tokens).join(' ')
  
  // Valores sempre ficam no final: qtd preço valor D/C
  const valoresRegex = /([\d.]+)\s+([\d.,]+)\s+([\d.,]+)\s+(D|C)$/
  const valoresMatch = restoLinha.match(valoresRegex)
  
  if (!valoresMatch) return null
  
  const quantidade = parseInt(valoresMatch[1].replace('.', ''), 10)
  const preco = parseBRLValue(valoresMatch[2])
  const valorOperacao = parseBRLValue(valoresMatch[3])
  const dc = valoresMatch[4]
  
  // O ticker é o texto entre tipoMercado e os valores
  const textoAntesDosValores = restoLinha.replace(valoresRegex, '').trim()
  const ticker = extrairTicker(textoAntesDosValores, tipoMercado.tipo)
  
  // Detectar day trade pela presença de "D" antes da quantidade
  const isDayTrade = /\sD\s/.test(linha) && !linha.startsWith('D')
  
  return {
    lote: partes[idx.lote],
    cv: partes[idx.cv],       // "C" | "V"
    tipoMercado: tipoMercado.tipo,
    ticker,
    isDayTrade,
    quantidade,
    preco,
    valorOperacao,
    dc,                        // "D" | "C"
  }
}

function parsearTipoMercado(partes, startIdx) {
  const tipos = [
    { pattern: /^OPCAO\s+DE\s+COMPRA$/i, tipo: 'OPCAO_COMPRA', tokens: 3 },
    { pattern: /^OPCAO\s+DE\s+VENDA$/i,  tipo: 'OPCAO_VENDA',  tokens: 3 },
    { pattern: /^EXERC\s+DE\s+OPCOES$/i, tipo: 'EXERC_OPCAO',  tokens: 3 },
    { pattern: /^VISTA$/i,               tipo: 'VISTA',        tokens: 1 },
    { pattern: /^TERMO$/i,               tipo: 'TERMO',        tokens: 1 },
    { pattern: /^FRACIONARIO$/i,         tipo: 'FRACIONARIO',  tokens: 1 },
    { pattern: /^LEILAO$/i,              tipo: 'LEILAO',       tokens: 1 },
  ]
  
  // Tentar match de 3 tokens primeiro (para "OPCAO DE COMPRA")
  const tresTokens = partes.slice(startIdx, startIdx + 3).join(' ')
  const doisTokens = partes.slice(startIdx, startIdx + 2).join(' ')
  const umToken = partes[startIdx]
  
  for (const { pattern, tipo, tokens } of tipos) {
    if (tokens === 3 && pattern.test(tresTokens)) return { tipo, tokens }
    if (tokens === 1 && pattern.test(umToken)) return { tipo, tokens }
  }
  
  return { tipo: 'DESCONHECIDO', tokens: 1 }
}

function extrairTicker(especificacao, tipoMercado) {
  // Para mercado VISTA: PETR4, VALE3, MXRF11, BOVA11, AAPL34
  if (tipoMercado === 'VISTA' || tipoMercado === 'FRACIONARIO') {
    const match = especificacao.match(/^([A-Z]{4}\d{1,2}[A-Z]?)\s/)
    return match?.[1] || especificacao.split(' ')[0]
  }
  
  // Para opções: PETRA172, VALEB172 → ticker base é os primeiros 4-5 chars
  if (tipoMercado === 'OPCAO_COMPRA' || tipoMercado === 'OPCAO_VENDA' || tipoMercado === 'EXERC_OPCAO') {
    const codigoOpcao = especificacao.split(' ')[0]
    return codigoOpcao  // Retornar o código completo da opção
  }
  
  // Para termo: PETR4T ou PETR4
  if (tipoMercado === 'TERMO') {
    const match = especificacao.match(/^([A-Z]{4}\d{1,2}[A-Z]?T?)\s/)
    return match?.[1] || especificacao.split(' ')[0]
  }
  
  return especificacao.split(' ')[0]
}

function extrairResumoFinanceiro(texto) {
  const P = SINACOR_BOVESPA_PATTERNS
  
  const extrairValor = (regex) => {
    const match = texto.match(regex)
    return match ? parseBRLValue(match[1]) : 0
  }
  
  const extrairValorDC = (regex) => {
    const match = texto.match(regex)
    if (!match) return { valor: 0, dc: null }
    return { valor: parseBRLValue(match[1]), dc: match[2] }
  }
  
  const valorLiquido = extrairValorDC(P.valorLiquidoOperacoes)
  const totalLiquido = extrairValorDC(P.totalLiquido)
  
  return {
    clearing: {
      valorLiquidoOperacoes: valorLiquido.valor,
      valorLiquidoDC: valorLiquido.dc,
      taxaLiquidacao: extrairValor(P.taxaLiquidacao),
      taxaRegistro: extrairValor(P.taxaRegistro),
    },
    bolsa: {
      emolumentos: extrairValor(P.emolumentos),
      taxaCorretagem: extrairValor(P.taxaCorretagem),
      iss: extrairValor(P.impostoISS),
      irrfDayTrade: extrairValor(P.irrfDayTrade),
      irrfNormal: extrairValor(P.irrfOperacoes),
    },
    totalLiquido: totalLiquido.valor,
    totalLiquidoDC: totalLiquido.dc,
  }
}
```

---

## 7. Casos Especiais de Layout

### 7.1 Notas com Opções

**Características específicas:**
- O campo "Tipo Mercado" contém `OPCAO DE COMPRA` ou `OPCAO DE VENDA` (3 palavras, não 1)
- O ticker é o código completo da opção, ex: `PETRA172` (PETR4 + A=call + 17=strike + 2=vencimento)
- O campo "Especificação do Título" pode incluir o nome por extenso logo após o ticker
- Existe uma seção "Obs. (*)" ao final da nota explicando os códigos de opções
- O resumo dos negócios terá as linhas `Opções - compras` e `Opções - vendas` preenchidas

**Como identificar exercício de opção:**
```javascript
const isExercicio = /EXERC DE OPCOES/i.test(linhaTrimmed)
```

**Parsing do código de opção:**
```javascript
// Estrutura do código de opção B3:
// PETR4A172 = PETR4 + A (call) + 17 (strike index) + 2 (vencimento)
// PETRA172  = PETR + A (call) + 172 (strike/vencimento)
function parsearCodigoOpcao(codigo) {
  // Ticker do ativo subjacente: primeiros 4 chars
  const ativoBase = codigo.substring(0, 4)
  // Tipo: A-L = call, M-X = put
  const tipoChar = codigo[4]
  const isCall = tipoChar >= 'A' && tipoChar <= 'L'
  const isPut = tipoChar >= 'M' && tipoChar <= 'X'
  return { ativoBase, codigo, tipo: isCall ? 'CALL' : isPut ? 'PUT' : 'DESCONHECIDO' }
}
```

### 7.2 Notas com Mercado a Termo

**Características específicas:**
- O campo "Tipo Mercado" é `TERMO`
- O campo "Prazo" é preenchido com o número de dias corridos até o vencimento
- O ticker pode ter sufixo "T" na especificação (ex: `PETR4T`)
- O preço a termo é o preço acordado na criação do contrato (não o preço de mercado)
- No resumo dos negócios, a linha `Operações à termo` é preenchida

**Detecção:**
```javascript
const isTermo = /^\s*TERMO\s+\d+\s/i.test(linhaTrimmed)
const prazoTermo = linhaTrimmed.match(/TERMO\s+(\d+)\s/)
```

### 7.3 Notas com FIIs

**Características específicas:**
- O tipo de mercado é `VISTA` (igual a ações)
- O ticker segue o padrão: 4 letras + 11 (ex: `MXRF11`, `KNRI11`, `HGLG11`)
- **Não há separação visual entre FIIs e ações** na tabela — ambos aparecem como "VISTA"
- Para distinguir FIIs de ações no parsing, é necessário verificar se o último dígito é 11
- FIIs são **isentos de IRRF** nas distribuições de rendimentos, mas não na venda com lucro
- A tributação de ganho de capital em FIIs (20%) é diferente de ações (15%) — o campo IRRF na nota pode não refletir isso corretamente para FIIs

**Detecção de ticker de FII:**
```javascript
function isFII(ticker) {
  return /^[A-Z]{4}11$/.test(ticker)
}

function classifyTicker(ticker) {
  if (/^[A-Z]{4}11$/.test(ticker)) return 'FII'
  if (/^[A-Z]{4}34$/.test(ticker)) return 'BDR'
  if (/^(BOVA|SMAL|IVVB|XFIX|HASH)\d{2}$/.test(ticker)) return 'ETF'
  if (/^[A-Z]{4}\d{1,2}$/.test(ticker)) return 'ACAO'
  return 'DESCONHECIDO'
}
```

### 7.4 Notas com Day Trade Explícito

**Day trade** ocorre quando a mesma quantidade do mesmo ativo é comprada e vendida no mesmo pregão.

**Identificação na nota:**
- O campo "Obs." de cada linha de operação contém a letra `D` quando a operação é day trade
- **Nem todas as corretoras usam o campo "D" consistentemente** — algumas marcam apenas as vendas do DT, outras todas as operações do par
- Na seção financeira, existe uma linha específica: `I.R.R.F. Day Trade` com o IR retido (1% do lucro)

**Estratégia de detecção:**
```javascript
// Método 1: campo Obs com "D"
const obsColumn = /\s+(D)\s+\d+\s+[\d.,]+/.test(linhaOp)

// Método 2: verificar se IRRF Day Trade está preenchido na nota
const temDayTrade = irrfDayTrade > 0

// Método 3: cruzar compras e vendas do mesmo ticker no mesmo dia
function detectarDayTrade(operacoes) {
  const porTicker = {}
  for (const op of operacoes) {
    if (!porTicker[op.ticker]) porTicker[op.ticker] = { compras: 0, vendas: 0 }
    if (op.cv === 'C') porTicker[op.ticker].compras += op.quantidade
    if (op.cv === 'V') porTicker[op.ticker].vendas += op.quantidade
  }
  
  return Object.entries(porTicker)
    .filter(([_, v]) => v.compras > 0 && v.vendas > 0)
    .map(([ticker, v]) => ({
      ticker,
      quantidadeDT: Math.min(v.compras, v.vendas),
    }))
}
```

**IRRF Day Trade:**
- Taxa: 1% sobre o lucro líquido do day trade
- O lucro é: valor vendas DT − valor compras DT − custos proporcionais
- O IRRF fica como "antecipação" a ser descontado do IR mensal de 20% a pagar

### 7.5 Notas com Múltiplas Páginas

Quando o investidor realiza muitas operações em um único pregão, a nota pode ter 2 ou mais páginas.

**Estrutura de nota multi-página:**
- **Página 1 a N-1:** Cabeçalho da corretora + cabeçalho da nota + tabela de negócios (parcial)
- **Página N (última):** Continuação da tabela + Resumo dos Negócios + Resumo Financeiro completo

**Estratégia de parsing:**
```javascript
async function parsearNotaMultiPagina(pdf) {
  let textoCompleto = ''
  let todasOperacoes = []
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const textoPage = textContent.items.map(i => i.str).join(' ')
    textoCompleto += '\n' + textoPage
  }
  
  // Parsear TUDO concatenado — o resumo financeiro na última página funciona
  return parsearNotaSINACOR(textoCompleto)
}
```

**Atenção:** A concatenação simples de texto de páginas pode criar "linhas falsas" onde o fim de uma página se une ao início da próxima. Estratégias para mitigar:
1. Inserir `\n\n` entre páginas
2. Usar a posição Y dos itens de texto para detectar quebras de linha reais
3. Identificar a última ocorrência do cabeçalho e truncar antes

### 7.6 Notas Mistas: Bovespa + BM&F no Mesmo Dia

Quando o cliente opera ações (Bovespa) e futuros (BM&F) no mesmo dia, são geradas **duas notas separadas** — uma Bovespa e uma BM&F. Não existem notas mistas no padrão SINACOR.

Para o sistema de IR do CRM, ambas devem ser importadas e processadas separadamente.

---

## 8. Biblioteca correpy: Análise Técnica

### 8.1 Visão Geral e Histórico

**correpy** (Corretagem Python) é uma biblioteca Python open-source criada por **Thiago Salvatore** para parsear notas de corretagem no padrão B3/SINACOR e retornar os dados em JSON estruturado.

- **Repositório:** `github.com/thiagosalvatore/correpy`
- **PyPI:** `pypi.org/project/correpy/`
- **Licença:** MIT
- **Linguagem:** Python 3.8+
- **Dependência principal:** `pdfminer.six` (para extração de texto do PDF)
- **Status (maio/2026):** O projeto tem atividade no GitHub mas o ritmo de atualizações é baixo — commits esporádicos. A biblioteca funciona para os casos suportados mas pode não ter suporte imediato para mudanças de layout recentes.

### 8.2 Corretoras Suportadas

Com base no código-fonte e documentação do correpy, as corretoras com suporte oficial ou testado são:

| Corretora | Status | Observação |
|---|---|---|
| XP Investimentos | Suportada | Modelo B3 |
| Rico Investimentos | Suportada | Mesmo layout XP |
| Clear Corretora | Suportada | Mesmo CNPJ XP |
| BTG Pactual Digital | Suportada | Layout BTG |
| Genial Investimentos | Suportada | — |
| Inter (Banco Inter) | Suportada parcialmente | — |
| Modal DTVM | Status incerto | Migrado para XP |
| NuInvest | Não confirmado | Similar SINACOR padrão |
| Necton | Confirmado pelo COIR | — |

**Limitação importante:** O correpy é uma biblioteca Python — não pode ser usada diretamente no browser (ambiente pdfjs-dist/JavaScript). Para o projeto CRM com Next.js 14, o correpy só seria utilizável em uma rota de API (Node.js com spawn de processo Python ou via API endpoint separado), o que adiciona complexidade.

### 8.3 Uso e Integração

```python
# Instalação
pip install correpy

# Uso básico
from io import BytesIO
from correpy.parsers.brokerage_notes.parser_factory import ParserFactory

# Nota sem senha
with open('nota.pdf', 'rb') as f:
    pdf_bytes = BytesIO(f.read())

parser = ParserFactory.get_parser(pdf_bytes)
notas = parser.parse()

# Acesso aos dados
for nota in notas:
    print(f"Data: {nota.reference_date}")
    print(f"Corretora: {nota.settlement_fee}")
    for transacao in nota.transactions:
        print(f"  {transacao.buy_or_sell} {transacao.ticker} x{transacao.amount} @ R${transacao.unit_price}")

# Nota com senha
parser = ParserFactory.get_parser(pdf_bytes, password="12345")
```

**Estrutura de retorno:**
```python
BrokerageNote(
    reference_date=datetime.date,
    settlement_fee=float,        # Taxa de liquidação
    registration_fee=float,      # Taxa de registro
    term_or_options=float,       # Valor em termos/opções
    variable_income=float,       # Valor em RV
    forward_contracts=float,     # Contratos a termo
    debentures=float,            # Debêntures
    transactions=[
        Transaction(
            buy_or_sell=str,     # "BUY" ou "SELL"
            market_type=str,
            ticker=str,
            amount=int,
            unit_price=float,
            total_price=float,
        )
    ]
)
```

### 8.4 Limitações e Alternativas

**Limitações do correpy:**
1. Python-only — não funciona no browser
2. Atualização lenta — mudanças de layout das corretoras podem quebrar o parser
3. Suporte a corretoras limitado — não cobre todas as corretoras do mercado
4. Sensível à estrutura exata do PDF — versões diferentes do mesmo template podem falhar

**Alternativas para o projeto CRM (JavaScript/browser):**
1. **Parser custom em JS com pdfjs-dist** (recomendado para este projeto)
2. **API route em Next.js que chama correpy via Python subprocess** (adiciona latência)
3. **COIR** (Excel/Python — não serve para browser)
4. **SinacorPdfParser** (GitHub: davidboto — foca em BM&F, testado com Clear e Rico)
5. **leitordenotas.github.io** (web app open-source, pode ser referência de implementação)

---

## 9. Outros Parsers e Ferramentas Open Source

### COIR (MarceloPCF)

- **Repositório:** `github.com/MarceloPCF/COIR`
- **Site:** `marcelopcf.github.io/COIR/`
- **Linguagem:** Python + Microsoft Excel
- **Corretoras suportadas:** XP, Clear, Rico, Necton, BTG
- **Mercados:** À Vista (Normal e DayTrade), Futuros, Commodities, Derivativos (Opções)
- **Origem:** 2021, necessidade de automatizar extração manual
- **Limitação:** Requer Excel instalado — não serve para web

### SinacorPdfParser (davidboto)

- **Repositório:** `github.com/davidboto/SinacorPdfParser`
- **Linguagem:** Python
- **Foco:** Operações BM&F
- **Corretoras testadas:** Clear e Rico
- **Observação:** Assume que todos os arquivos pertencem à mesma corretora — sem auto-detecção

### parsing_xpi_notas_corretagem (felipemaion)

- **Repositório:** `github.com/felipemaion/parsing_xpi_notas_corretagem`
- **Linguagem:** Python
- **Foco:** XP Investimentos exclusivamente
- **Abordagem:** Converte PDF para texto e aplica regras de extração

### leitordenotas.github.io

- **Repositório:** `github.com/leitordenotas/leitordenotas.github.io`
- **Tecnologia:** Web app (JavaScript no browser)
- **Formato:** SINACOR padrão
- **Relevância:** Prova de conceito de que é possível parsear notas diretamente no browser

### ir_investidor (barbolo)

- **Repositório:** `github.com/barbolo/ir_investidor`
- **Linguagem:** Python
- **Foco:** Cálculo automático de IR para investidor
- **Relevância:** Implementa a lógica de apuração de IR mensal a partir de notas

### Tabela Comparativa de Ferramentas

| Ferramenta | Linguagem | Browser? | Corretoras | Mercados | Manutenção |
|---|---|---|---|---|---|
| correpy | Python | Não | 6+ | Bovespa | Baixa |
| COIR | Python+Excel | Não | 5 | Bovespa+BM&F | Média |
| SinacorPdfParser | Python | Não | 2 (Clear/Rico) | BM&F | Baixa |
| parsing_xpi | Python | Não | 1 (XP) | Bovespa | Baixa |
| leitordenotas | JavaScript | Sim | Múltiplas | Bovespa | Incerta |
| ir_investidor | Python | Não | Múltiplas | Bovespa | Baixa |

---

## 10. Notas Protegidas por Senha

### 10.1 Padrão de Senha por Corretora

A proteção por senha em PDFs de notas de corretagem varia significativamente entre as corretoras:

| Corretora | Usa senha? | Padrão da senha | Observação |
|---|---|---|---|
| XP Investimentos (Modelo B3) | Às vezes | Primeiros 3 dígitos do CPF | Nem todas as notas são protegidas |
| XP Investimentos (Modelo XP) | Sim | CPF completo sem pontuação | — |
| Clear Corretora | Às vezes | Primeiros 3 dígitos do CPF | Similar ao XP |
| Rico Investimentos | Às vezes | Primeiros 3 dígitos do CPF | Similar ao XP |
| BTG Pactual Digital | Não (geralmente) | — | Notas sem senha na maioria dos casos |
| NuInvest | Não | — | Sem proteção por senha |
| Banco Inter | Não | — | Sem proteção por senha |

**Importante sobre o padrão XP/Clear/Rico:**
- A senha é frequentemente os **primeiros 3 dígitos do CPF** do investidor
- Exemplo: CPF `123.456.789-00` → senha `123`
- Isso é confirmado em ferramentas de terceiros (IRPFbolsa manual menciona este padrão)
- Não é uma regra absolutamente fixa — pode mudar conforme configuração da corretora

**Estratégia para o sistema CRM:**
1. Tentar abrir o PDF sem senha primeiro
2. Se falhar (erro de senha), solicitar a senha ao usuário
3. Oferecer hint: "Geralmente são os primeiros 3 dígitos do CPF do cliente"
4. Armazenar a senha nunca — apenas usá-la em tempo de processamento no browser

### 10.2 Tratamento no pdfjs-dist

```javascript
async function abrirPDFComSenha(arrayBuffer, senhaCallback) {
  let password = null
  
  while (true) {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: password,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      })
      
      // Interceptar requisição de senha
      loadingTask.onPassword = (updatePassword, reason) => {
        // reason === pdfjsLib.PasswordResponses.NEED_PASSWORD (1)
        // reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD (2)
        const novaSenha = senhaCallback(reason)
        if (novaSenha === null) {
          loadingTask.destroy()
          throw new Error('PDF protegido por senha — usuário cancelou')
        }
        updatePassword(novaSenha)
      }
      
      const pdf = await loadingTask.promise
      return pdf
      
    } catch (error) {
      if (error.name === 'PasswordException') {
        // Senha incorreta — pedir novamente
        password = await senhaCallback('INCORRECT')
        if (!password) throw new Error('Senha não fornecida')
      } else {
        throw error
      }
    }
  }
}

// Exemplo de uso com React (componente simplificado)
async function importarNota(file) {
  const arrayBuffer = await file.arrayBuffer()
  
  const pdf = await abrirPDFComSenha(arrayBuffer, (reason) => {
    if (reason === 'INCORRECT') {
      return prompt('Senha incorreta. Tente novamente (geralmente primeiros 3 dígitos do CPF):')
    }
    return prompt('Este PDF está protegido. Informe a senha (geralmente primeiros 3 dígitos do CPF):')
  })
  
  return pdf
}
```

---

## 11. Encoding e Caracteres Especiais no pdfjs-dist

### 11.1 Problemas Comuns

O pdfjs-dist (Mozilla PDF.js) pode ter dificuldades com PDFs de corretoras brasileiras pelos seguintes motivos:

**1. Fontes com CMap ausente ou incorreto:**
- PDFs gerados pelo SINACOR frequentemente usam fontes customizadas sem mapeamento Unicode completo
- O pdfjs não consegue mapear glifos para caracteres Unicode corretamente
- Resultado: texto extraído com caracteres errados, ausentes ou ilegíveis

**2. Acentuação brasileira:**
- Caracteres como `ã`, `ç`, `é`, `ê`, `ó`, `ô`, `á`, `ú` podem aparecer como `?`, espaço ou sequência estranha
- Campos como "Obrigações" → "Obriga??es", "Prégio" → "Prgio"

**3. Fonte não-padrão (Type1 ou TrueType sem ToUnicode):**
- PDFs antigos do SINACOR usam Type1 ou Type3 fonts sem tabela ToUnicode
- O pdfjs cai em heurísticas de mapeamento que podem falhar para o português

**4. PDFs digitalizados (imagem):**
- Notas antigas podem ser PDFs de imagem (scanned)
- pdfjs não consegue extrair texto de PDFs-imagem — é necessário OCR

**5. Diferença entre versões de pdfjs-dist:**
- Algumas versões (antes da 2.x) têm bugs específicos de encoding
- Recomendado: usar sempre a versão mais recente do pdfjs-dist

### 11.2 Configuração Correta de CMap

```javascript
// next.config.js — copiar os arquivos de cmap para /public
// Esta configuração é OBRIGATÓRIA para PDFs com fontes especiais

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/pdfjs-dist/cmaps/',
            to: 'static/cmaps/',
          },
          {
            from: 'node_modules/pdfjs-dist/standard_fonts/',
            to: 'static/standard_fonts/',
          },
        ],
      })
    )
    return config
  },
}

// Configuração ao inicializar pdfjs
const loadingTask = pdfjsLib.getDocument({
  data: arrayBuffer,
  // Caminho dos cmaps — CRÍTICO para PDFs com fontes especiais
  cMapUrl: '/_next/static/cmaps/',
  cMapPacked: true,
  // Fontes padrão — para PDFs sem fontes embutidas
  standardFontDataUrl: '/_next/static/standard_fonts/',
})
```

**Alternativa usando CDN (mais simples, depende de internet):**
```javascript
const loadingTask = pdfjsLib.getDocument({
  data: arrayBuffer,
  cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
  cMapPacked: true,
})
```

### 11.3 Estratégias de Fallback

```javascript
// Estratégia de sanitização de texto extraído
function sanitizarTextoSINACOR(texto) {
  return texto
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    // Corrigir sequências de encoding quebrado comuns
    .replace(/([A-Za-z])\?([a-z])/g, '$1ã$2')  // "opera??es" → "operações"
    .replace(/\?([a-z])/g, 'ç$1')               // "?ão" → "ção"
    // Remover caracteres de controle
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalizar Unicode
    .normalize('NFC')
}

// Detecção de PDF-imagem (sem texto extraível)
function isPDFImagem(texto) {
  // Se menos de 100 caracteres foram extraídos de um PDF com várias páginas,
  // provavelmente é um PDF de imagem
  return texto.trim().length < 100
}

// Verificação de qualidade do texto extraído
function avaliarQualidadeExtracao(texto) {
  const temCamposEssenciais = {
    dataPregao: /\d{2}\/\d{2}\/\d{4}/.test(texto),
    temCV: /\s(C|V)\s/.test(texto),
    temValorMonetario: /R?\$?\s*[\d.,]+/.test(texto),
    temTipoMercado: /VISTA|OPCAO|TERMO/i.test(texto),
  }
  
  const score = Object.values(temCamposEssenciais).filter(Boolean).length
  
  return {
    score,  // 0-4
    qualidade: score >= 3 ? 'BOA' : score >= 2 ? 'MÉDIA' : 'RUIM',
    detalhes: temCamposEssenciais,
  }
}
```

---

## 12. Frequência de Mudanças de Layout e Detecção

### 12.1 Histórico de Mudanças Conhecidas

| Período | Corretora | Tipo de Mudança | Impacto no Parsing |
|---|---|---|---|
| 2021 | Modal DTVM | Aquisição pela XP | Gradual migração de layout |
| 2023 | Clear Corretora | Migração completa para sistema XP | Notas antigas (pré-2023) têm layout diferente |
| 2023 | Grupo XP | Atualização visual (logo/cores) | Sem impacto no conteúdo/campos |
| 2024 | BTG | Melhoria no app BTG Trader | Notas mais facilmente acessíveis |
| Recorrente | Todas | Ajuste de taxas B3 (emolumentos) | Apenas valores, não estrutura |

**Frequência típica de mudanças de layout:**
- **Mudanças estruturais** (afetam parsing): raramente (1-2x por ano no mercado)
- **Mudanças visuais** (não afetam parsing): frequentes (branding, logos)
- **Mudanças de valores de taxas**: regulares (B3 publica tabela anual)

**Gatilhos comuns para mudanças:**
1. Fusões e aquisições de corretoras
2. Migração para nova versão do SINACOR
3. Exigências regulatórias da CVM/B3
4. Modernização de sistemas de TI

### 12.2 Estratégia de Detecção por Fingerprint

```javascript
// Fingerprint de layout para detectar versão da nota
function extrairFingerprint(texto) {
  return {
    // Hash dos campos de cabeçalho (sem valores dinâmicos)
    temNrNota: /Nr\.?\s*nota/i.test(texto),
    temDataPregao: /Data\s+preg[ãa]o/i.test(texto),
    temFolha: /Folha/i.test(texto),
    // Seções presentes
    temNegociosRealizados: /[Nn]eg[oó]cios\s+[Rr]ealizados/i.test(texto),
    temResumoNegociosSingular: /[Rr]esumo\s+do\s+[Nn]eg[oó]cio\b/i.test(texto),    // singular
    temResumoNegociosPlural: /[Rr]esumo\s+dos\s+[Nn]eg[oó]cios\b/i.test(texto),   // plural
    temClearing: /clearing/i.test(texto),
    temTotalCBLC: /Total\s+CBLC/i.test(texto),
    temEmolumentos: /emolumentos/i.test(texto),
    // Versão do padrão
    usaCVColuna: /\bC\/V\b/.test(texto),
    usaNegociacaoColuna: /\bNeg\.?\s*\b/.test(texto),
    // Encoding
    temAcentos: /[ãçéêóôáú]/i.test(texto),
  }
}

// Mapa de fingerprints conhecidos
const FINGERPRINTS_CONHECIDOS = {
  'XP_BOVESPA_2022_PLUS': {
    temNrNota: true,
    temDataPregao: true,
    temFolha: true,
    temNegociosRealizados: true,
    temResumoNegociosPlural: true,
    temClearing: true,
    temTotalCBLC: true,
    temEmolumentos: true,
    usaCVColuna: true,
  },
  'SINACOR_LEGADO_PRE2022': {
    temNrNota: true,
    temDataPregao: true,
    temFolha: true,
    temNegociosRealizados: true,
    temResumoNegociosSingular: true,  // Singular é indicador de versão mais antiga
    temClearing: false,
    temTotalCBLC: true,
    temEmolumentos: true,
  }
}

function detectarVersaoLayout(texto) {
  const fp = extrairFingerprint(texto)
  
  // Score de similaridade com cada fingerprint conhecido
  let melhorMatch = null
  let melhorScore = 0
  
  for (const [nome, fpConhecido] of Object.entries(FINGERPRINTS_CONHECIDOS)) {
    const campos = Object.keys(fpConhecido)
    const matches = campos.filter(k => fp[k] === fpConhecido[k]).length
    const score = matches / campos.length
    
    if (score > melhorScore) {
      melhorScore = score
      melhorMatch = nome
    }
  }
  
  return { versao: melhorMatch, confianca: melhorScore, fingerprint: fp }
}
```

### 12.3 Versionamento de Parsers

Para lidar com mudanças de layout ao longo do tempo:

```javascript
// Estratégia de versioning do parser
const PARSER_VERSIONS = {
  'v1': {
    detectar: (texto) => !texto.includes('clearing') && texto.includes('Total CBLC'),
    parsear: parsearV1,
    descricao: 'Layout SINACOR legado (pré-2020)',
  },
  'v2': {
    detectar: (texto) => texto.includes('clearing') && texto.includes('Total CBLC'),
    parsear: parsearV2,
    descricao: 'Layout SINACOR moderno (2020+)',
  },
  'v3': {
    detectar: (texto) => /Resumo\s+Financeiro/i.test(texto) && /Total\s+CBLC/i.test(texto),
    parsear: parsearV3,
    descricao: 'Layout BTG/variantes 2022+',
  },
}

function selecionarParser(texto) {
  for (const [versao, config] of Object.entries(PARSER_VERSIONS)) {
    if (config.detectar(texto)) {
      return { versao, parser: config.parsear, descricao: config.descricao }
    }
  }
  // Fallback: versão mais recente
  return { versao: 'latest', parser: parsearV2, descricao: 'Fallback para parser v2' }
}
```

---

## 13. Arquitetura Recomendada para o CRM

### 13.1 Pipeline de Importação no Browser

```typescript
// Pipeline completo para importação de nota de corretagem no browser
// Next.js 14 (App Router) + TypeScript

interface NotaImportada {
  id: string                    // UUID gerado localmente
  clienteId: string
  corretora: string
  cnpjCorretora: string
  dataPregao: Date
  numeroNota: string
  tipoNota: 'BOVESPA' | 'BMF'
  operacoes: Operacao[]
  resumoFinanceiro: ResumoFinanceiro
  hashPDF: string               // SHA-256 do PDF original (para deduplicação)
  importadoEm: Date
  status: 'PROCESSANDO' | 'SUCESSO' | 'ERRO' | 'REVISAO_MANUAL'
  erros?: string[]
}

interface Operacao {
  cv: 'C' | 'V'
  ticker: string
  tipoMercado: 'VISTA' | 'OPCAO_COMPRA' | 'OPCAO_VENDA' | 'TERMO' | 'FRACIONARIO' | 'EXERC_OPCAO'
  tipoAtivo: 'ACAO' | 'FII' | 'ETF' | 'BDR' | 'OPCAO' | 'DESCONHECIDO'
  quantidade: number
  preco: number                 // Preço unitário
  valorBruto: number            // quantidade × preco
  isDayTrade: boolean
  obs?: string
}

interface ResumoFinanceiro {
  taxaLiquidacao: number
  taxaRegistro: number
  emolumentos: number
  taxaCorretagem: number
  iss: number
  irrfDayTrade: number
  irrfNormal: number
  totalLiquido: number
  totalLiquidoDC: 'D' | 'C'
}

// Função principal do pipeline
async function importarNotaCorretagem(
  file: File,
  clienteId: string,
  onProgress?: (step: string) => void
): Promise<NotaImportada> {
  
  onProgress?.('Lendo arquivo PDF...')
  const arrayBuffer = await file.arrayBuffer()
  
  // 1. Deduplicação por hash
  const hashPDF = await calcularSHA256(arrayBuffer)
  const jaImportada = await verificarDuplicata(clienteId, hashPDF)
  if (jaImportada) throw new Error('Esta nota já foi importada anteriormente.')
  
  // 2. Detectar senha
  onProgress?.('Verificando proteção por senha...')
  let pdf: PDFDocumentProxy
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer, cMapUrl: '/cmaps/', cMapPacked: true }).promise
  } catch (e) {
    if (e.name === 'PasswordException') {
      const senha = await solicitarSenhaUsuario()
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer, password: senha, cMapUrl: '/cmaps/', cMapPacked: true }).promise
    } else {
      throw e
    }
  }
  
  // 3. Extrair texto
  onProgress?.('Extraindo texto do PDF...')
  const texto = await extrairTextoCompleto(pdf)
  
  // 4. Verificar qualidade
  const qualidade = avaliarQualidadeExtracao(texto)
  if (qualidade.qualidade === 'RUIM') {
    throw new Error('Não foi possível extrair texto do PDF. O arquivo pode ser uma imagem digitalizada.')
  }
  
  // 5. Parsear nota
  onProgress?.('Processando operações...')
  const notaParsed = await parsearNotaSINACOR(arrayBuffer)
  
  // 6. Enriquecer com metadados
  onProgress?.('Salvando no sistema...')
  const notaImportada: NotaImportada = {
    id: crypto.randomUUID(),
    clienteId,
    corretora: notaParsed.corretora?.nome || 'Desconhecida',
    cnpjCorretora: notaParsed.cabecalho.cnpjCorretora || '',
    dataPregao: parseDataBR(notaParsed.cabecalho.dataPregao),
    numeroNota: notaParsed.cabecalho.numeroNota || '',
    tipoNota: notaParsed.tipoNota,
    operacoes: notaParsed.operacoes,
    resumoFinanceiro: notaParsed.resumoFinanceiro,
    hashPDF,
    importadoEm: new Date(),
    status: 'SUCESSO',
  }
  
  return notaImportada
}
```

### 13.2 Modelo de Dados no Firestore

```typescript
// Estrutura no Firestore para persistência das notas

// Coleção: clientes/{clienteId}/notas/{notaId}
interface NotaFirestore {
  id: string
  clienteId: string
  corretora: string
  cnpjCorretora: string
  dataPregao: Timestamp
  numeroNota: string
  tipoNota: 'BOVESPA' | 'BMF'
  hashPDF: string
  importadoEm: Timestamp
  status: string
  
  // Resumo financeiro (campos planos para queries)
  irrfDayTrade: number
  irrfNormal: number
  totalLiquido: number
  totalLiquidoDC: string
}

// Subcoleção: clientes/{clienteId}/notas/{notaId}/operacoes/{opId}
interface OperacaoFirestore {
  cv: string           // 'C' | 'V'
  ticker: string
  tipoMercado: string
  tipoAtivo: string
  quantidade: number
  preco: number
  valorBruto: number
  isDayTrade: boolean
  dataPregao: Timestamp  // Desnormalizado para facilitar queries
  clienteId: string      // Desnormalizado
  notaId: string         // Referência à nota pai
}

// Posições agregadas: clientes/{clienteId}/posicoes/{ticker}
interface PosicaoFirestore {
  ticker: string
  tipoAtivo: string
  quantidade: number
  precoMedioAtual: number
  custoTotal: number
  ultimaAtualizacao: Timestamp
}
```

**Índices recomendados no Firestore:**
```
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "operacoes",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "clienteId", "order": "ASCENDING" },
        { "fieldPath": "ticker", "order": "ASCENDING" },
        { "fieldPath": "dataPregao", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "operacoes",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "clienteId", "order": "ASCENDING" },
        { "fieldPath": "dataPregao", "order": "ASCENDING" },
        { "fieldPath": "isDayTrade", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 13.3 Cálculo de Preço Médio Ponderado

O preço médio ponderado (PM) é calculado **por ticker**, acumulando todas as compras:

```typescript
// Regra da Receita Federal: Preço Médio Ponderado (não FIFO, não LIFO)
// PM = (PM_anterior × Qtd_anterior + Preco_compra × Qtd_compra) / (Qtd_anterior + Qtd_compra)

interface PosicaoAcumulada {
  ticker: string
  quantidade: number
  precoMedio: number
  custoTotal: number      // quantidade × precoMedio
}

function atualizarPosicao(
  posicaoAtual: PosicaoAcumulada | null,
  operacao: Operacao,
): PosicaoAcumulada {
  
  const posicao = posicaoAtual ?? {
    ticker: operacao.ticker,
    quantidade: 0,
    precoMedio: 0,
    custoTotal: 0,
  }
  
  if (operacao.cv === 'C') {
    // COMPRA: atualiza PM ponderado
    const novaQuantidade = posicao.quantidade + operacao.quantidade
    const novoCustoTotal = posicao.custoTotal + operacao.valorBruto
    
    return {
      ticker: posicao.ticker,
      quantidade: novaQuantidade,
      precoMedio: novaQuantidade > 0 ? novoCustoTotal / novaQuantidade : 0,
      custoTotal: novoCustoTotal,
    }
    
  } else {
    // VENDA: quantidade diminui, PM NÃO muda (regra da RFB)
    const novaQuantidade = posicao.quantidade - operacao.quantidade
    
    if (novaQuantidade < 0) {
      // Venda a descoberto — posição negativa (shorting)
      // Para assessores XP com clientes PF padrão, isso raramente ocorre
      console.warn(`Posição negativa para ${operacao.ticker} — venda maior que posição`)
    }
    
    return {
      ticker: posicao.ticker,
      quantidade: Math.max(0, novaQuantidade),
      precoMedio: posicao.precoMedio,         // PM NÃO muda na venda
      custoTotal: Math.max(0, novaQuantidade) * posicao.precoMedio,
    }
  }
}

// Day trade: PM é específico do DT (compra e venda no mesmo dia, mesmo PM)
function calcularResultadoDayTrade(operacoesDT: Operacao[]): number {
  const comprasDT = operacoesDT.filter(op => op.cv === 'C' && op.isDayTrade)
  const vendasDT = operacoesDT.filter(op => op.cv === 'V' && op.isDayTrade)
  
  const valorCompras = comprasDT.reduce((acc, op) => acc + op.valorBruto, 0)
  const valorVendas = vendasDT.reduce((acc, op) => acc + op.valorBruto, 0)
  
  return valorVendas - valorCompras  // Positivo = lucro, negativo = prejuízo
}
```

### 13.4 Apuração de IRRF Mensal

```typescript
// Apuração de IR mensal por tipo de operação
// Base legal: artigos 21 e 22 da Lei 8.981/1995 + IN RFB 1.585/2015

interface ApuracaoMensal {
  mes: string              // 'YYYY-MM'
  clienteId: string
  
  // Swing Trade (Ações à Vista)
  swingTrade: {
    lucroAcoes: number           // Lucro líquido em ações (exceto DT)
    isentoAcoes: boolean         // True se PF vendeu ≤ R$20.000 no mês em ações
    irrfRetidoNota: number       // IRRF retido nas notas (0,005% "dedo-duro")
    irDevido: number             // 15% sobre lucro (se não isento e > 0)
    irAPagar: number             // irDevido − irrfRetidoNota (se > 0)
    irARestituir: number         // irrfRetidoNota − irDevido (se IRRF > IR devido)
    prejuizoAcumular: number     // Prejuízo para compensar nos próximos meses
  }
  
  // Day Trade
  dayTrade: {
    lucroDayTrade: number        // Lucro líquido day trade
    irrfRetidoNota: number       // IRRF 1% retido nas notas
    irDevido: number             // 20% sobre lucro day trade
    irAPagar: number             // irDevido − irrfRetidoNota
  }
  
  // FIIs
  fii: {
    lucroFII: number             // Lucro em venda de FIIs
    irrfRetidoNota: number
    irDevido: number             // 20% sobre lucro FII
    irAPagar: number
  }
  
  totalIRAPagar: number          // Soma de todos os IRs a pagar
  dataDARF: string               // Último dia útil do mês seguinte
}

function apurarIRMensal(
  operacoesDoMes: Operacao[],
  posicoesPreviasAoMes: Map<string, PosicaoAcumulada>,
  irrf: { dayTrade: number; normal: number },
  vendasTotaisAcoesMes: number,  // Para verificar isenção dos R$20k
  prejuizosAcumuladosAnteriores: { swing: number; dayTrade: number },
): ApuracaoMensal {
  
  // Separar operações
  const opsDayTrade = operacoesDoMes.filter(op => op.isDayTrade)
  const opsSwing = operacoesDoMes.filter(op => !op.isDayTrade)
  
  // Calcular resultado de swing trade
  let lucroSwingAcoes = 0
  for (const venda of opsSwing.filter(op => op.cv === 'V')) {
    const posicao = posicoesPreviasAoMes.get(venda.ticker)
    if (!posicao) continue
    
    const custoVendido = posicao.precoMedio * venda.quantidade
    const resultadoVenda = venda.valorBruto - custoVendido
    
    if (['ACAO', 'FII', 'ETF', 'BDR'].includes(venda.tipoAtivo)) {
      lucroSwingAcoes += resultadoVenda
    }
  }
  
  // Compensar prejuízos anteriores
  const lucroSwingLiquido = Math.max(0, lucroSwingAcoes + prejuizosAcumuladosAnteriores.swing)
  const novoPrejuizo = lucroSwingAcoes < 0 ? lucroSwingAcoes : 0
  
  // Verificar isenção R$20.000/mês para PF em ações
  const LIMITE_ISENCAO_ACOES = 20000
  const isentoAcoes = vendasTotaisAcoesMes <= LIMITE_ISENCAO_ACOES
  
  // IR swing trade
  const irSwingDevido = isentoAcoes ? 0 : lucroSwingLiquido * 0.15
  const irSwingAPagar = Math.max(0, irSwingDevido - irrf.normal)
  
  // Day trade
  const lucroDT = calcularResultadoDayTrade(opsDayTrade)
  const lucroDTLiquido = Math.max(0, lucroDT + prejuizosAcumuladosAnteriores.dayTrade)
  const irDTDevido = lucroDTLiquido * 0.20
  const irDTAPagar = Math.max(0, irDTDevido - irrf.dayTrade)
  
  const mesStr = new Date().toISOString().substring(0, 7)
  
  return {
    mes: mesStr,
    clienteId: '',  // Preencher externamente
    swingTrade: {
      lucroAcoes: lucroSwingAcoes,
      isentoAcoes,
      irrfRetidoNota: irrf.normal,
      irDevido: irSwingDevido,
      irAPagar: irSwingAPagar,
      irARestituir: Math.max(0, irrf.normal - irSwingDevido),
      prejuizoAcumular: novoPrejuizo,
    },
    dayTrade: {
      lucroDayTrade: lucroDT,
      irrfRetidoNota: irrf.dayTrade,
      irDevido: irDTDevido,
      irAPagar: irDTAPagar,
    },
    fii: { lucroFII: 0, irrfRetidoNota: 0, irDevido: 0, irAPagar: 0 },  // Implementar separado
    totalIRAPagar: irSwingAPagar + irDTAPagar,
    dataDARF: calcularDataDARF(mesStr),
  }
}

function calcularDataDARF(mes: string): string {
  // DARF de IR: último dia útil do mês seguinte
  const [ano, mesNum] = mes.split('-').map(Number)
  const proximoMes = mesNum === 12 ? 1 : mesNum + 1
  const anoProximoMes = mesNum === 12 ? ano + 1 : ano
  // Último dia do próximo mês
  const ultimoDia = new Date(anoProximoMes, proximoMes, 0)
  // Ajustar para último dia útil (simplificado — sem calendário de feriados)
  while (ultimoDia.getDay() === 0 || ultimoDia.getDay() === 6) {
    ultimoDia.setDate(ultimoDia.getDate() - 1)
  }
  return ultimoDia.toISOString().substring(0, 10)
}
```

---

## 14. Checklist de Campos por Tipo de Operação

### Ação à Vista (Swing Trade)

| Campo | Obrigatório | Fonte | Exemplo |
|---|---|---|---|
| Data do pregão | Sim | Cabeçalho da nota | `18/06/2020` |
| Ticker | Sim | Especificação do título | `PETR4` |
| C/V | Sim | Coluna C/V | `C` |
| Quantidade | Sim | Coluna Qtd | `100` |
| Preço unitário | Sim | Coluna Preço | `28,40` |
| Valor bruto | Sim | Coluna Valor Op. | `2.840,00` |
| Day trade? | Sim | Campo Obs = 'D' | `D` ou vazio |
| IRRF 0,005% | Se venda | Resumo financeiro | `0,14` |
| Taxa liquidação | Sim | Resumo clearing | `0,78` |
| Emolumentos | Sim | Resumo bolsa | `0,14` |

### Opção

| Campo | Obrigatório | Fonte | Exemplo |
|---|---|---|---|
| Código da opção | Sim | Especificação | `PETRA172` |
| Tipo | Sim | Tipo Mercado | `OPCAO DE COMPRA` |
| Ativo subjacente | Derivado | Primeiros 4 chars | `PETR` |
| C/V | Sim | Coluna C/V | `C` |
| Quantidade | Sim | Coluna Qtd | `5` |
| Prêmio (preço) | Sim | Coluna Preço | `0,54` |
| Valor total | Sim | Coluna Valor Op. | `270,00` |

### Mercado a Termo

| Campo | Obrigatório | Fonte | Exemplo |
|---|---|---|---|
| Ticker | Sim | Especificação | `PETR4T` |
| Prazo (dias) | Sim | Coluna Prazo | `30` |
| Preço acordado | Sim | Coluna Preço | `29,50` |
| C/V | Sim | Coluna C/V | `C` |
| Quantidade | Sim | Coluna Qtd | `100` |

### Day Trade

| Campo | Obrigatório | Fonte | Exemplo |
|---|---|---|---|
| Ticker | Sim | Especificação | `PETR4` |
| C/V (par) | Sim | C + V mesmo ticker | — |
| Quantidade DT | Sim | Min(compras, vendas) | `100` |
| Resultado DT | Sim | Vendas - Compras | `+150,00` |
| IRRF DT 1% | Se lucro | Resumo financeiro | `1,50` |
| Obs = 'D' | Indicativo | Campo Obs | `D` |

---

## 15. Referências

### Documentação Oficial
- [B3 — Sobre o SINACOR](https://www.b3.com.br/pt_br/solucoes/plataformas/middle-e-backoffice/o-que-e-sinacor/sobre-o-sinacor/)
- [B3 — Ampliação do Código do Investidor](https://clientes.b3.com.br/c/document_library/get_file?groupId=20119&uuid=aeae496d-1241-5780-f6d2-33c9a35bf20f)
- [XP Investimentos — Nota de Corretagem Bovespa (PDF)](https://portal-rs.xpi.com.br/arquivos/Nova%20-%20Conhe%C3%A7a%20a%20nota%20de%20corretagem%20Bovespa%20vnova.pdf)
- [XP — Diferença entre Modelo B3 e XP](https://atendimento.xpi.com.br/artigo/2635-qual-a-diferenca-entre-modelo-b3-e-xp)
- [XP — Como interpretar uma nota de negociação](https://atendimento.xpi.com.br/artigo/2631-como-interpretar-uma-nota-de-negociacao-bovespa-acoes-opcoes-fiis-etc)
- [Monte Bravo — Como interpretar Nota BM&F](https://montebravo.zendesk.com/hc/pt-br/articles/25752198494359)
- [NuInvest — Esclarecendo as Notas de Corretagem](https://ajuda.nuinvest.com.br/hc/pt-br/articles/16373622212635)
- [Nelogica — Entendendo as Notas de Corretagem](https://ajuda.nelogica.com.br/hc/pt-br/articles/360058189452)
- [CM Capital — Informações sobre Notas BM&F](https://ajuda.cmcapital.com.br/hc/pt-br/articles/28944605162519)

### Repositórios Open Source
- [correpy (thiagosalvatore)](https://github.com/thiagosalvatore/correpy) — Parser Python principal para SINACOR
- [COIR (MarceloPCF)](https://github.com/MarceloPCF/COIR) — Sistema Excel+Python para XP/Clear/Rico/Necton/BTG
- [SinacorPdfParser (davidboto)](https://github.com/davidboto/SinacorPdfParser) — Parser focado em BM&F (Clear/Rico)
- [parsing_xpi_notas_corretagem (felipemaion)](https://github.com/felipemaion/parsing_xpi_notas_corretagem) — Parser específico XP
- [leitordenotas (leitordenotas)](https://github.com/leitordenotas/leitordenotas.github.io) — Leitor web open-source
- [ir_investidor (barbolo)](https://github.com/barbolo/ir_investidor) — Cálculo automático de IR

### Artigos e Blogs Técnicos
- [Rodrigo Campos — Sinacor: Tabelas, Colunas e Detalhes](https://medium.com/@rodrigopscampos/sinacor-tabelas-colunas-e-detalhes-importantes-conhecer-d1d8597e3d8d)
- [Fulljoin — Extraindo dados de notas de corretagem com R](https://www.fulljoin.com.br/posts/2020-06-17-leitura-de-notas-de-corretagem/)
- [Hugo Pires — Extracting Data From Brokerage Notes Using Python](https://medium.com/analytics-vidhya/extracting-data-from-brokerage-notes-using-python-dc30b561299)
- [DEV Community — Resolvendo Erros de Encoding no pdfjs](https://dev.to/metalefs/resolvendo-erros-de-encoding-e-texto-ilegivel-no-pdfjs-quando-o-ocr-salva-33f3)
- [Mozilla PDF.js — Issues de encoding](https://github.com/mozilla/pdf.js/issues/9692)

### Ferramentas de IR Relacionadas
- [IRPFbolsa — Manual](https://www.irpfbolsa.com.br/novo/manual/)
- [COIR — Site oficial](https://marcelopcf.github.io/COIR/)
- [Mycapital — Importando Notas SINACOR](https://mycapital.movidesk.com/kb/article/121298)
- [SmarttBot — O que é SINACOR?](https://ajuda.smarttbot.com/hc/pt-br/articles/14838979851415)

### Regulamentação Fiscal (IR em Renda Variável)
- [XP — Day trade no Imposto de Renda](https://conteudos.xpi.com.br/aprenda-a-investir/relatorios/day-trade-no-imposto-de-renda/)
- [Nelogica — Cálculo de IR e DARF](https://ajuda.nelogica.com.br/hc/pt-br/articles/360052124371)
- [InfoMoney — Imposto "Dedo-Duro"](https://www.infomoney.com.br/minhas-financas/imposto-dedo-duro-entenda-o-tributo-que-incide-em-acoes-fiis-e-outros-investimentos-e-fuja-da-malha-fina/)
- [B3 — Como declarar os investimentos no IR](https://borainvestir.b3.com.br/noticias/imposto-de-renda/como-declarar-os-investimentos-no-imposto-de-renda/)

---

*Documento gerado em maio de 2026 para o projeto de CRM de assessores SVN Investimentos | XP. Todos os valores de taxas devem ser verificados nas tabelas oficiais vigentes da B3 antes de uso em produção.*
