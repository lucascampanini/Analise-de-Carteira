# Estrutura do Mercado Financeiro Brasileiro

## Documento de Referencia para Bot de Investimentos Automatizado

**Versao:** 1.0
**Data:** 2026-02-07
**Escopo:** Pesquisa abrangente sobre a estrutura, microestrutura, participantes, indices, sazonalidades e particularidades do mercado financeiro brasileiro (B3), com foco em implicacoes praticas para desenvolvimento de sistemas de trading automatizado.

---

## Sumario

1. [Estrutura da B3](#1-estrutura-da-b3)
2. [Ativos Negociados](#2-ativos-negociados)
3. [Microestrutura de Mercado](#3-microestrutura-de-mercado)
4. [Participantes do Mercado](#4-participantes-do-mercado)
5. [Indices Principais](#5-indices-principais)
6. [Ciclos e Sazonalidade](#6-ciclos-e-sazonalidade)
7. [Liquidez e Spreads](#7-liquidez-e-spreads)
8. [Comparacao Internacional](#8-comparacao-internacional)
9. [Regulacao para Trading Algoritmico](#9-regulacao-para-trading-algoritmico)
10. [Implicacoes Praticas para o Bot](#10-implicacoes-praticas-para-o-bot)
11. [Fontes e Referencias](#11-fontes-e-referencias)

---

## 1. Estrutura da B3

### 1.1 Origem e Formacao

A B3 (Brasil, Bolsa, Balcao) e a unica bolsa de valores, mercadorias e futuros em operacao no Brasil e a maior da America Latina em termos de capitalizacao de mercado. Sua formacao atual resulta de duas fusoes historicas:

- **2008:** Fusao da Bolsa de Valores de Sao Paulo (Bovespa, fundada em 1890) com a Bolsa de Mercadorias e Futuros (BM&F, fundada em 1917), originando a BM&FBOVESPA.
- **2017 (22 de marco):** Fusao da BM&FBOVESPA com a Central de Custodia e Liquidacao Financeira de Titulos (CETIP), aprovada pela CVM e pelo CADE, criando a B3.

### 1.2 Segmentos Operacionais

Apos a unificacao, a B3 adotou uma nova nomenclatura para seus segmentos:

| Segmento Atual | Denominacao Anterior | Funcao Principal |
|---|---|---|
| **Listado** | Ambiente de Bolsa (BM&FBOVESPA) | Negociacao, compensacao, liquidacao, gerenciamento de riscos, depositaria, emprestimo de acoes e instrumentos de renda variavel e FICCs (Fixed Income, Currency and Commodities) |
| **Balcao** | CETIP UTVM | Negociacao, registro, depositaria, compensacao e liquidacao de titulos privados (CDB, LCI, LCA, debentures, CRI, CRA) |
| **Infraestrutura para Financiamento** | CETIP UFIN | Registro e controle de gravames, transmissao e disponibilizacao de informacoes para registro |

### 1.3 Segmentos de Listagem (Governanca Corporativa)

A B3 mantem segmentos diferenciados de listagem com niveis crescentes de governanca:

- **Basico:** Requisitos minimos da legislacao brasileira.
- **Nivel 1:** Maior transparencia e dispersao acionaria.
- **Nivel 2:** Nivel 1 + tag along de 100%, arbitragem e outras protecoes.
- **Novo Mercado:** Segmento mais prestigioso e exigente; somente acoes ordinarias (ON); utilizado na grande maioria dos IPOs no Brasil.

### 1.4 Horarios de Negociacao (Grade Horaria Vigente - Nov/2025)

Os horarios da B3 sao ajustados periodicamente, principalmente em funcao do horario de verao nos EUA, Alemanha e Inglaterra. A grade horaria a seguir reflete as alteracoes implementadas a partir de 3 de novembro de 2025 (Oficio Circular 040/2025-VNC e 043/2025-VNC):

#### Mercado a Vista (Acoes)

| Etapa | Horario |
|---|---|
| Pre-abertura (leilao de abertura) | 09:30 - 10:00 |
| Sessao continua de negociacao | 10:00 - 17:55 |
| Call de fechamento | 17:55 - 18:00 |
| After-market* | Suspenso (exceto em vencimento de opcoes) |

*A partir de novembro de 2025, a B3 suspendeu a sessao regular de after-market, mantendo-a apenas nas datas de vencimento de opcoes sobre acoes.*

**Regras do After-Market (quando vigente):**
- Apenas ativos que compuseram o Ibovespa ou IBrX-100 naquele dia.
- Oscilacao maxima de 2% sobre o preco de fechamento.
- Limite financeiro de R$ 900.000 por CPF.

#### Mercado de Derivativos

| Produto | Horario |
|---|---|
| Futuro de Dolar (DOL/WDO) | 09:00 - 18:30 |
| Futuro de Indice (IND/WIN) | 09:00 - 18:25 |
| Opcoes sobre acoes | 10:00 - 17:55 |
| Mercado a Termo | 10:00 - 18:25 |

#### Datas Especiais

- **Quarta-feira de Cinzas:** Sessao reduzida das 13:00 as 17:55, com pre-abertura das 12:45 as 13:00.
- **Feriados internacionais:** Verificar calendario oficial da B3, pois os derivativos podem ter horarios ajustados.

### 1.5 Leiloes (Auctions)

Os leiloes sao mecanismos criticos para formacao de preco justo:

- **Leilao de Abertura (Opening Auction):** Periodo de 15 minutos antes do inicio do pregao. O sistema registra ordens de compra e venda sem executar negocios, determinando o preco de abertura pelo algoritmo de maximizacao de volume.
- **Leilao de Fechamento (Closing Auction / Call de Fechamento):** 5 minutos antes do encerramento. Determina o preco oficial de fechamento, utilizado como referencia para fundos, indices e ajustes.
- **Leiloes por Volatilidade:** Acionados automaticamente quando um ativo oscila alem de parametros predefinidos (tunnel de preco). Duram entre 5 e 15 minutos.
- **Leiloes de IPO/Follow-on:** Mecanismos especiais para ofertas publicas.

### 1.6 Circuit Breaker

O circuit breaker e o mecanismo de interrupcao emergencial de negociacoes, acionado quando o Ibovespa atinge quedas significativas em relacao ao fechamento anterior:

| Nivel | Queda | Paralisacao |
|---|---|---|
| 1o Nivel | 10% | 30 minutos |
| 2o Nivel | 15% | 60 minutos |
| 3o Nivel | 20% | Prazo indeterminado (definido pela B3) |

**Observacao historica:** O circuit breaker foi acionado em situacoes criticas como a crise de 2008, o "Joesley Day" (2017) e a pandemia de COVID-19 (marco/2020), quando foi acionado 6 vezes em 8 dias uteis.

### 1.7 Plataformas de Negociacao

- **PUMA Trading System:** Plataforma eletronica principal da B3 para negociacao de acoes, derivativos e renda fixa em bolsa. Baseada na arquitetura do CME Globex (parceria com CME Group). Oferece alta velocidade e eficiencia.
- **CetipNet / Cetip|Trader:** Subsistemas para negociacao eletronica de titulos de renda fixa no mercado de balcao (debentures, CRA, CRI, titulos publicos).

---

## 2. Ativos Negociados

### 2.1 Acoes (Equities)

A B3 possui aproximadamente **357-400 empresas listadas** (dez/2025), com acoes negociadas no mercado a vista. Os tipos incluem:

- **ON (Ordinarias):** Conferem direito a voto. Sufixo "3" (ex: VALE3, PETR3).
- **PN (Preferenciais):** Prioridade em dividendos, sem voto. Sufixo "4" (ex: PETR4, ITUB4).
- **Units:** Pacotes de acoes ON + PN. Sufixo "11" (ex: KLBN11, TAEE11).

**Acoes mais negociadas (2025):**
1. VALE3 (Vale)
2. PETR4 (Petrobras PN)
3. ITUB4 (Itau Unibanco)
4. BBDC4 (Bradesco)
5. BBAS3 (Banco do Brasil)
6. WEGE3 (WEG)
7. ELET3 (Eletrobras)
8. EMBR3 (Embraer)

**Volume medio diario de negociacao (ações, nov/2025):** R$ 28,036 bilhoes no mercado a vista.

### 2.2 Opcoes (Options)

Contratos que conferem ao titular o direito (nao a obrigacao) de comprar (call) ou vender (put) um ativo a um preco predeterminado.

**Caracteristicas na B3:**
- **Estilo:** Americanas (exercicio a qualquer momento) ou Europeias (exercicio apenas no vencimento).
- **Vencimento mensal:** Terceira sexta-feira de cada mes (desde maio/2021).
- **Opcoes semanais:** Vencimentos todas as sextas-feiras (exceto a 3a sexta), disponiveis para ativos liquidos e indices.
- **Opcoes diarias sobre Ibovespa:** A B3 passou a oferecer vencimentos diarios para opcoes semanais de Ibovespa.

**Ativos com maior liquidez em opcoes:** PETR4, BBAS3, VALE3, ITUB4, BOVA11.

**Nomenclatura:** O codigo da opcao segue o padrao XXXXMYY, onde XXXX = ticker do ativo, M = mes/tipo (A-L para calls, M-X para puts), YY = strike codificado.

### 2.3 Contratos Futuros

#### Mini-Indice (WIN)

| Especificacao | Valor |
|---|---|
| Codigo | WIN (mini) / IND (cheio) |
| Objeto | Ibovespa |
| Valor por ponto | R$ 0,20 (mini) / R$ 1,00 (cheio) |
| Variacao minima | 5 pontos de indice |
| Tick value | R$ 1,00 (mini) |
| Vencimento | Meses pares (fev, abr, jun, ago, out, dez) |
| Data de vencimento | Quarta-feira mais proxima do dia 15 |
| Margem day trade | A partir de R$ 100 |
| Margem posicao | A partir de R$ 2.000 |
| Horario de negociacao | 09:00 - 18:25 |

#### Mini-Dolar (WDO)

| Especificacao | Valor |
|---|---|
| Codigo | WDO (mini) / DOL (cheio) |
| Objeto | Taxa de cambio USD/BRL |
| Tamanho do contrato | US$ 10.000 (mini = 1/5 do cheio) |
| Valor por ponto | R$ 10,00 |
| Variacao minima | 0,5 ponto |
| Tick value | R$ 5,00 |
| Vencimento | Todos os meses |
| Data de vencimento | 1o dia util do mes de vencimento |
| Margem day trade | A partir de R$ 150 |
| Margem posicao | A partir de R$ 3.000 |
| Horario de negociacao | 09:00 - 18:30 |

**Ajuste diario:** Todos os contratos futuros na B3 possuem ajuste diario (mark-to-market), onde lucros e prejuizos sao calculados e creditados/debitados automaticamente no dia util seguinte.

### 2.4 ETFs (Exchange-Traded Funds)

Fundos de indice negociados em bolsa como acoes:

| ETF | Indice Referencia | Observacao |
|---|---|---|
| BOVA11 | Ibovespa | Mais liquido ETF brasileiro |
| BOVV11 | Ibovespa | Alternativa ao BOVA11 |
| IVVB11 | S&P 500 | Exposicao ao mercado americano |
| SMAL11 | SMLL (Small Caps) | Empresas de menor capitalizacao |
| XFIX11 | IFIX | Fundos imobiliarios |

A B3 permite desde 2025 a listagem de ETFs de FIIs e infraestrutura com distribuicao de dividendos, ampliando o universo de produtos.

### 2.5 BDRs (Brazilian Depositary Receipts)

Certificados que representam acoes de empresas estrangeiras negociadas na B3:

- **Abertura ao varejo (2020):** Desde outubro de 2020, investidores pessoa fisica podem negociar BDRs sem restricao de investidor qualificado.
- **Crescimento:** O numero de investidores em BDRs cresceu 8x desde 2020, atingindo 996 mil em outubro de 2025.
- **Volume medio diario:** Aproximadamente R$ 985 milhoes (2025).
- **Principais BDRs:** Apple (AAPL34), Amazon (AMZO34), Google (GOGL34), Microsoft (MSFT34), Tesla (TSLA34).

### 2.6 FIIs (Fundos de Investimento Imobiliario)

- **Quantidade listada:** Centenas de FIIs ativos na B3.
- **Volume diario combinado:** Aproximadamente R$ 300 milhoes/dia (2025).
- **Top 5 mais negociados (2025):** Volume combinado de ~R$ 45 milhoes/dia.
- **Distribuicao de rendimentos:** Obrigatoriamente mensal (95% do lucro caixa semestral).
- **Isencao fiscal:** Rendimentos distribuidos sao isentos de IR para pessoa fisica (desde que o FII tenha no minimo 50 cotistas e o investidor detenha menos de 10% das cotas).

### 2.7 Renda Fixa

#### Tesouro Direto

Plataforma criada em 2002 pelo Tesouro Nacional em parceria com a B3 para democratizar o acesso a titulos publicos federais:

- **Tesouro Selic (LFT):** Pos-fixado, indexado a taxa Selic.
- **Tesouro IPCA+ (NTN-B/NTN-B Principal):** Hibrido, indexado a inflacao (IPCA) + taxa prefixada.
- **Tesouro Prefixado (LTN/NTN-F):** Taxa fixa determinada na compra.
- **Horario de negociacao:** Dias uteis, das 09:30 as 18:00 (com interrupcoes para reprecificacao).
- **Liquidez:** D+1 para resgate (garantida pelo Tesouro Nacional).

#### Titulos Privados (Mercado de Balcao B3)

| Titulo | Emissor | Caracteristica | Cobertura FGC |
|---|---|---|---|
| **CDB** | Bancos | Pode ser pre, pos ou hibrido | Sim (ate R$ 250k) |
| **LCI** | Bancos | Lastro imobiliario, isenta de IR PF | Sim (ate R$ 250k) |
| **LCA** | Bancos | Lastro agronegocio, isenta de IR PF | Sim (ate R$ 250k) |
| **Debentures** | Empresas | Pode ser incentivada (isenta IR) | Nao |
| **CRI** | Securitizadoras | Credito imobiliario, isenta IR PF | Nao |
| **CRA** | Securitizadoras | Credito agronegocio, isenta IR PF | Nao |

**Estoque total de produtos de captacao bancaria na B3 (jun/2025):** R$ 5,7 trilhoes, crescimento de 15% no semestre.

---

## 3. Microestrutura de Mercado

### 3.1 Book de Ofertas (Order Book)

O book de ofertas e o registro em tempo real de todas as intencoes de compra (bid) e venda (ask) para cada ativo, organizado por nivel de preco:

- **Profundidade (depth):** Quantidade de ordens em cada nivel de preco. Alta profundidade = menor impacto de mercado para ordens grandes.
- **Spread bid-ask:** Diferenca entre a melhor oferta de compra (bid) e a melhor oferta de venda (ask). Quanto menor, mais liquido e o ativo.
- **Dados de nivel:** A B3 oferece dados de market data em diferentes niveis: Level 1 (melhor bid/ask), Level 2 (profundidade completa), MBO (Market by Order - cada ordem individual).

### 3.2 Matching Engine (Motor de Casamento)

O PUMA Trading System utiliza o algoritmo de **prioridade preco/tempo (price-time priority)**:

1. Ofertas de compra com precos mais altos tem prioridade sobre ofertas com precos mais baixos.
2. Ofertas de venda com precos mais baixos tem prioridade sobre ofertas com precos mais altos.
3. Em caso de empate de preco, a oferta registrada primeiro (mais antiga) tem prioridade.

**Implicacao pratica:** Em um mercado com price-time priority, a velocidade de entrada da ordem importa significativamente, especialmente para estrategias de market making e HFT.

### 3.3 Tipos de Ordem

A B3 suporta os seguintes tipos de oferta principais:

| Tipo | Descricao | Uso Tipico |
|---|---|---|
| **Limitada** | Execucao no preco especificado ou melhor | Controle de preco; maioria das ordens |
| **A Mercado** | Execucao imediata ao melhor preco disponivel | Execucao urgente; risco de slippage |
| **Stop** | Registrada no book quando o preco de disparo e atingido, com preco limite | Protecao de perdas; entrada em rompimentos |
| **Stop a Mercado** | Idem ao stop, mas sem preco limite | Saida emergencial |
| **MOC (Market on Close)** | Executada no leilao de fechamento | Fundos indexados; rebalanceamento |
| **MOA (Market on Auction)** | Executada em qualquer leilao | Participacao em leiloes de abertura |

**Restricoes para varejo:** Ofertas de investidores de varejo (RLP - Retail Liquidity Provider) sao limitadas aos tipos limitada, stop e a mercado, com validade exclusivamente para o dia.

**Validades de ordem:**
- Dia (Day): Valida apenas para o pregao corrente.
- Validade determinada (GTC com data): Valida ate uma data especifica.
- Executa ou Cancela (FOK - Fill or Kill): Executada integralmente ou cancelada.
- Executa e Cancela (IOC - Immediate or Cancel): Execucao parcial permitida, saldo cancelado.

### 3.4 Latencia

A latencia e um dos fatores mais criticos para trading algoritmico. Evolucao recente da B3:

| Periodo | Latencia do Matching Engine | Observacao |
|---|---|---|
| Ate 2023 | ~1.200 microsegundos (1,2 ms) | Baseline anterior |
| 2025 | ~350 microsegundos (0,35 ms) | Reducao de 70% |
| Meta 2026 | < 300 microsegundos | Objetivo estrategico da B3 |

**Comparacao internacional:**
- NYSE: ~20-50 microsegundos
- CME: ~1-5 microsegundos (para FPGA co-located)
- B3: ~350 microsegundos (e significativamente mais lenta que as bolsas americanas)

### 3.5 Infraestrutura de Acesso (DMA e Colocation)

A B3 oferece quatro modelos de Direct Market Access (DMA):

| Modelo | Descricao | Latencia Relativa |
|---|---|---|
| **DMA 1 (Tradicional)** | Acesso via home broker da corretora | Alta |
| **DMA 2 (Via provedor)** | Acesso via sistema de terceiro homologado | Media |
| **DMA 3 (Conexao direta)** | Conexao direta do cliente ao PUMA via corretora | Baixa |
| **DMA 4 (Colocation)** | Servidor instalado no data center da B3 | Minima |

**Data Center da B3:** Localizado em Santana de Parnaiba/SP (R. Ricardo Prudente de Aquino, 85). Infraestrutura de ultima geracao com conectividade de ultra-baixa latencia.

**Colocation (DMA 4):**
- Permite instalar servidores no mesmo ambiente fisico do PUMA Trading System.
- Latencia de rede equalizada para todos os participantes na mesma modalidade.
- Ideal para estrategias de HFT e market making.
- Conectividade internacional: links de ultra-baixa latencia com bolsas de Londres, Bangkok, Singapura e Toquio (via BSO e outros provedores).

### 3.6 Protocolos Tecnicos

| Protocolo | Funcao | Formato |
|---|---|---|
| **EntryPoint (B3 BOE)** | Entrada de ordens | FIX Performance Session Layer (FIXP) + SBE (Simple Binary Encoding) |
| **UMDF (FIX/FAST)** | Market Data Feed | FIX 5.0 + FAST compressao, via UDP multicast |
| **Binary UMDF (SBE)** | Market Data Feed (baixa latencia) | Simple Binary Encoding, menor latencia que FIX/FAST |

**Implicacao pratica:** Para um bot de investimentos, a escolha entre FIX/FAST e Binary SBE impacta diretamente a latencia de recepcao de dados de mercado. O formato SBE binario e preferivel para estrategias sensíveis a latencia.

---

## 4. Participantes do Mercado

### 4.1 Composicao por Tipo de Investidor (2025)

A distribuicao do volume negociado no mercado a vista de acoes da B3 em 2025:

| Categoria | Participacao no Volume | Volume Estimado (2025) |
|---|---|---|
| **Investidores Estrangeiros** | ~58,7% (recorde historico) | R$ 2,8 trilhoes |
| **Investidores Institucionais** | ~24,6% | R$ 1,7 trilhao |
| **Pessoa Fisica** | ~12,4% | R$ 517,3 bilhoes |
| **Instituicoes Financeiras** | ~4,3% | - |

**Observacoes:**
- Em janeiro de 2026, o fluxo estrangeiro atingiu R$ 26,31 bilhoes em um unico mes, superando todo o saldo de 2025 (R$ 25,47 bi).
- A participacao de estrangeiros atingiu ~60,2% no inicio de 2026.
- Apesar da queda percentual, a PF bateu recorde absoluto em volume em 2025.

### 4.2 Numero de Investidores

| Metrica | Valor (nov-dez/2025) |
|---|---|
| CPFs unicos em renda variavel | 5.426.294 |
| Novos CPFs em 2025 | 205.949 (+4%) |
| Investidores em BDRs | 996.000 |

### 4.3 Market Makers

Market makers sao participantes que se comprometem a manter ofertas de compra e venda continuamente para determinados ativos, garantindo liquidez. Na B3:

- Programas formais de market making existem para acoes, opcoes, ETFs e derivativos.
- O market maker deve cumprir obrigacoes de presenca, spread maximo e quantidade minima.
- Em troca, recebe beneficios como reducao de taxas de negociacao.

### 4.4 HFT (High-Frequency Trading)

A B3 mantem o **HFT Program** com incentivos especificos:

- **Requisitos:** Cadastro via Participante de Negociacao Plena (PNP) ou Participante de Liquidacao (PL). Volume diario minimo (ADV) e percentual minimo de day trades.
- **Beneficios:** Taxas reduzidas proporcional ao volume.
- **Composicao do volume HFT (global):** 48% casas proprietarias dedicadas, 46% bancos de investimento, 6% hedge funds.
- **Estrategias tipicas:** Market making, arbitragem, momentum de curtissimo prazo, statistical arbitrage.

**Implicacao pratica:** Um bot de investimentos que nao opera em colocation (DMA 4) nao deve tentar competir com HFTs em estrategias de latencia. E preferivel focar em estrategias de medio prazo, analise fundamentalista quantitativa ou sinais de maior periodicidade.

### 4.5 Investidores Estrangeiros

- Devem estar registrados na CVM e ter representante legal no Brasil.
- Operam via contas 2689 (antiga Resolucao 2.689 do CMN, hoje Resolucao CVM 13).
- Concentram operacoes em blue chips (VALE3, PETR4, ITUB4, BBDC4).
- Sao o principal driver de fluxo e direcao do mercado brasileiro.
- Sensiveis a: taxa de juros americana, dolar, risco-pais (CDS), cenario fiscal brasileiro.

---

## 5. Indices Principais

### 5.1 Ibovespa (IBOV)

O principal indicador de desempenho do mercado acionario brasileiro:

- **Composicao:** Carteira teorica de acoes e units que representam ~85% do numero de negocios e do volume financeiro do mercado.
- **Numero de ativos (jan/2026):** 85 ativos de 79 empresas.
- **Rebalanceamento:** Quadrimestral - janeiro, maio e setembro. A previa e divulgada no 1o dia util do mes anterior.
- **Criterios de inclusao:** Indice de negociabilidade (IN), presenca minima em pregoes, nao ser penny stock, nao estar em recuperacao judicial.
- **Ponderacao:** Por valor de mercado das acoes em free float, com limite maximo de 20% por ativo.
- **Metodologia:** Disponivel no documento oficial da B3 ("Metodologia do Indice Bovespa").

### 5.2 IBrX-100

- **Composicao:** 100 acoes e units com maior indice de negociabilidade.
- **Diferenca do Ibovespa:** Abrange mais ativos, ponderado por capitalizacao de mercado (free float).
- **Rebalanceamento:** Quadrimestral (janeiro, maio, setembro).
- **Variante:** IBrX-50 (apenas 50 mais liquidas).

### 5.3 IFIX (Indice de Fundos Imobiliarios)

- **Composicao:** Fundos imobiliarios mais liquidos da B3.
- **Ponderacao:** Por valor de mercado das cotas em circulacao.
- **Rebalanceamento:** Quadrimestral (janeiro, maio, setembro).
- **Criterios:** Presenca minima em pregoes, volume minimo, nao estar em situacao especial.
- **Importancia:** Referencia para ETFs como XFIX11.

### 5.4 SMLL (Indice Small Cap)

- **Composicao:** Acoes classificadas fora dos 85% de maior valor de mercado (ou seja, acoes de empresas menores).
- **Rebalanceamento:** Quadrimestral (janeiro, maio, setembro).
- **Caracteristicas:** Maior volatilidade, menor liquidez, maior potencial de alpha para estrategias ativas.

### 5.5 Outros Indices Relevantes

| Indice | Descricao |
|---|---|
| IDIV | Indice de Dividendos |
| ICON | Indice de Consumo |
| IFNC | Indice do Setor Financeiro |
| IMAT | Indice de Materiais Basicos |
| IMOB | Indice Imobiliario |
| IEEX | Indice de Energia Eletrica |
| ISE | Indice de Sustentabilidade Empresarial |

A B3 possui quase **70 indices** diferentes, cobrindo setores, fatores e estrategias variadas.

### 5.6 Implicacoes para o Bot

- **Efeito rebalanceamento:** Nos dias de rebalanceamento, ha pressao compradora nos ativos incluidos e vendedora nos excluidos. A previa (divulgada ~1 mes antes) ja gera movimentacao antecipada.
- **Tracking de indices:** ETFs e fundos indexados geram fluxo previsivel no call de fechamento dos dias de rebalanceamento.
- **Composicao como filtro:** Usar a composicao do Ibovespa/IBrX como universo de ativos liquidos para o bot.

---

## 6. Ciclos e Sazonalidade

### 6.1 Calendario de Vencimentos

#### Opcoes sobre Acoes
- **Vencimento mensal:** Terceira sexta-feira de cada mes.
- **Opcoes semanais:** Toda sexta-feira (exceto 3a sexta do mes).
- **Opcoes diarias (Ibovespa):** Vencimento diario para opcoes semanais de Ibovespa.
- **Letra de serie (calls):** A=jan, B=fev, ..., L=dez.
- **Letra de serie (puts):** M=jan, N=fev, ..., X=dez.

#### Futuros de Indice (IND/WIN)
- **Meses de vencimento:** Pares (fev, abr, jun, ago, out, dez).
- **Data:** Quarta-feira mais proxima do dia 15 do mes de vencimento.
- **Codigo mensal:** G=fev, J=abr, M=jun, Q=ago, V=out, Z=dez.

#### Futuros de Dolar (DOL/WDO)
- **Meses de vencimento:** Todos os meses.
- **Data:** 1o dia util do mes de vencimento.
- **Rollover:** A transicao de contratos (rolagem) tipicamente comeca dias antes do vencimento, com queda de liquidez no contrato vencendo e aumento no proximo.

### 6.2 "Witch Days" Brasileiros

Os dias de vencimento simultaneo (equivalente ao "triple witching" americano) ocorrem quando coincidem:
- Vencimento de opcoes sobre acoes (3a sexta-feira)
- Vencimento de futuros de indice (quarta-feira proxima ao dia 15, meses pares)
- Vencimento de opcoes sobre indice

**Impacto:** Aumento significativo de volume e volatilidade. No dia de vencimento de opcoes sobre acoes, observa-se manipulacao de precos proxima ao preco de exercicio das series mais liquidas.

### 6.3 Sazonalidade de Dividendos

- **Concentracao:** O segundo semestre historicamente concentra os maiores pagamentos de dividendos no Brasil.
- **Data-ex:** O preco da acao sofre ajuste para baixo no valor do dividendo/JCP na data-ex. Isso impacta estrategias de opcoes e posicoes alavancadas.
- **Empresas com dividendos elevados (2025):** Petroleo (PETR4), bancos (BBAS3, ITUB4), utilities (TAEE11, CMIG4).

### 6.4 Efeito Janeiro

No mercado brasileiro, o "efeito janeiro" (retornos positivos anormais em janeiro) apresenta evidencia mista:
- O Ibovespa teve em janeiro de 2026 sua maior valorizacao mensal desde 2006, mas isso parece estar mais relacionado ao fluxo estrangeiro recorde do que a uma anomalia de calendario sistematica.
- Estudos academicos brasileiros nao encontram evidencia robusta e consistente do efeito janeiro no Brasil.

### 6.5 "Sell in May and Go Away"

Analise da B3 sobre o mercado brasileiro desde 1995:
- **Retorno medio abril-novembro:** 4%
- **Retorno medio maio-outubro:** 3%
- **Conclusao:** A diferenca e pequena e ambos os periodos apresentam media positiva. A estrategia nao demonstra eficacia significativa no mercado brasileiro.
- **Explicacao alternativa:** Periodos de menor liquidez (ferias de operadores) podem explicar parte da volatilidade sazonal.

### 6.6 Outros Padroes Sazonais

- **Rali de Natal (Santa Rally):** Tendencia de alta em dezembro, possivelmente explicada por ajuste de posicoes de fundos (window dressing) e otimismo de final de ano.
- **Efeito virada de mes:** Tendencia de retornos positivos nos ultimos dias do mes e primeiros dias do mes seguinte (fluxo de pagamentos e aplicacoes).
- **Periodos de balancos:** Concentracao de volatilidade nas "earnings seasons" (resultados trimestrais), tipicamente em fev-mar (4T), maio (1T), ago (2T), nov (3T).

---

## 7. Liquidez e Spreads

### 7.1 Classificacao de Liquidez

| Categoria | Exemplos | Spread Tipico | Volume Diario |
|---|---|---|---|
| **Ultra-liquido** | VALE3, PETR4, ITUB4 | 1-2 centavos | > R$ 1 bilhao |
| **Blue chips** | BBDC4, WEGE3, BBAS3 | 2-5 centavos | R$ 200M - R$ 1B |
| **Mid caps** | RENT3, CYRE3, PRIO3 | 5-15 centavos | R$ 50M - R$ 200M |
| **Small caps** | Diversas | 15+ centavos | < R$ 50M |
| **Micro caps** | Diversas | > R$ 0,50 | < R$ 5M |

### 7.2 Horarios de Maior Liquidez

A liquidez intradiaria segue um padrao tipico em formato "U":

- **10:00 - 10:30:** Alta liquidez (abertura, execucao de ordens acumuladas no pre-market).
- **10:30 - 14:00:** Liquidez moderada (periodo de consolidacao).
- **14:00 - 15:00:** Aumento gradual (abertura do mercado americano, alinhamento de fluxo).
- **15:00 - 17:55:** Alta liquidez (sobreposicao com mercado americano, fluxo institucional, ajustes de posicao, call de fechamento).

**Observacao critica:** A abertura do mercado americano (10:30 hora de NY = 11:30 ou 12:30 BRT dependendo do horario de verao) e um dos momentos de maior impacto no mercado brasileiro, especialmente para ativos correlacionados como commodities (VALE3, PETR4).

### 7.3 Impacto de Mercado (Market Impact)

O impacto de mercado e o custo implicito de executar uma ordem grande, causando movimentacao adversa de preco:

- **Acoes ultra-liquidas:** Ordens de ate R$ 1M podem ser executadas com impacto minimo.
- **Mid caps:** Ordens acima de R$ 100k ja podem causar impacto perceptivel.
- **Small caps:** Qualquer ordem acima de R$ 10-50k pode mover o preco significativamente.

**Estrategias de mitigacao (para o bot):**
- TWAP (Time-Weighted Average Price): Dividir a ordem em partes iguais ao longo do tempo.
- VWAP (Volume-Weighted Average Price): Dividir proporcionalmente ao volume historico intradiario.
- Iceberg orders: Mostrar apenas parte da ordem no book.
- Limitar operacoes a ativos com volume diario minimo de 10-20x o tamanho da ordem pretendida.

### 7.4 Custos de Transacao

#### Taxas da B3

| Componente | Operacao Normal (PF) | Day Trade (PF) |
|---|---|---|
| **Emolumentos (negociacao)** | 0,003048% | 0,003048% |
| **Taxa de liquidacao** | 0,0275% | 0,0200% |
| **Total B3** | ~0,0306% | ~0,0231% |

#### Outros Custos

| Custo | Valor Tipico |
|---|---|
| **Corretagem** | R$ 0 a R$ 10 por ordem (varia por corretora; muitas oferecem taxa zero para acoes) |
| **ISS** | Ate 5% sobre a corretagem |
| **IR sobre ganho de capital** | 15% (operacoes normais) / 20% (day trade) |
| **IR sobre FIIs** | 20% sobre ganho de capital na venda |

**Observacao para day trade em minicontratos:** Taxas de emolumentos e registro sao cobradas por contrato, nao sobre o volume financeiro.

---

## 8. Comparacao Internacional

### 8.1 B3 vs NYSE vs NASDAQ

| Caracteristica | B3 | NYSE | NASDAQ |
|---|---|---|---|
| **Modelo** | Eletronico puro | Hibrido (DMM + eletronico) | Eletronico puro |
| **Matching** | Price-time priority | DMM + price-time priority | Price-time priority (multiplos market makers) |
| **Latencia matching** | ~350 us | ~20-50 us | ~20-40 us |
| **Capitalização mercado** | ~US$ 800B - 1T | ~US$ 28T | ~US$ 25T |
| **Empresas listadas** | ~400 | ~2.400 | ~3.300 |
| **Horario pregao** | 6h55 (10:00-17:55 BRT) | 6h30 (09:30-16:00 ET) | 6h30 |
| **Circuit breaker** | 10/15/20% (Ibovespa) | 7/13/20% (S&P 500) | Idem NYSE |
| **Market makers/ativo** | Variavel (programa especifico) | 1 DMM por ativo | ~14 market makers/ativo |
| **Fragmentacao** | Monopolio (unica bolsa) | Alta (NYSE, BATS, IEX, etc.) | Alta (13+ venues) |
| **Liquidacao** | D+2 | D+1 (desde 2024) | D+1 |
| **Moeda** | BRL | USD | USD |

### 8.2 Particularidades do Mercado Brasileiro

1. **Monopolio de bolsa:** Diferente dos EUA (com 13+ venues), a B3 e a unica bolsa de valores do Brasil, eliminando questoes de roteamento de ordens (smart order routing) mas tambem eliminando competicao em taxas.

2. **Risco cambial:** Qualquer investimento estrangeiro no Brasil esta exposto a variacao do BRL. Isso cria oportunidades de arbitragem cambial e hedging.

3. **Taxa de juros elevada:** A taxa Selic brasileira (historicamente entre 2% e 14,25%+) impacta significativamente o custo de oportunidade e a atratividade relativa da renda variavel vs. renda fixa.

4. **Tributacao peculiar:** Day trade tem aliquota diferente (20% vs 15%). FIIs tem isencao de rendimentos. Ha isencao de R$ 20.000 mensais em vendas de acoes para PF.

5. **Concentracao:** O mercado brasileiro e altamente concentrado: poucos ativos (VALE3, PETR4, ITUB4, BBDC4) respondem por parcela desproporcional do volume.

6. **Derivativos robustos:** O mercado de derivativos brasileiro (herdado da BM&F) e sofisticado e liquido, especialmente em futuros de indices e cambio.

7. **Correlacao com EUA:** O mercado brasileiro apresenta forte correlacao com indices americanos, especialmente durante o horario de sobreposicao.

8. **Horario de verao assimetrico:** A diferenca de fuso entre Brasil e EUA muda ao longo do ano (o Brasil aboliu o horario de verao em 2019, mas os EUA mantem), impactando horarios de negociacao.

9. **Regulacao centralizada:** CVM + Banco Central supervisionam todo o mercado, diferente da estrutura SEC+CFTC+FINRA dos EUA.

10. **Liquidacao D+2:** Enquanto os EUA migraram para D+1 em 2024, o Brasil mantem D+2, o que impacta gestao de caixa e estrategias de curto prazo.

---

## 9. Regulacao para Trading Algoritmico

### 9.1 Marco Regulatorio da CVM

A Comissao de Valores Mobiliarios (CVM) reconhece e regula sistemas automatizados de investimento. A regulacao atual distingue:

#### Robo-Advisor (Consultoria/Gestao)
- **Robo Consultor:** Recomenda carteiras com base no perfil do investidor. Requer registro como consultoria de valores mobiliarios (Resolucao CVM 19/21, Instrucao CVM 592).
- **Robo Gestor:** Gere carteiras de forma automatizada. Requer registro como administrador de carteiras, categoria gestor (Instrucao CVM 558).
- **Suitability:** Deve seguir Instrucao CVM 539 para adequacao ao perfil do investidor.

#### Robo-Trader (Execucao de Ordens)
- **Robo de Ordens:** Envia e cancela ordens automaticamente. Nao requer registro proprio na CVM, mas deve operar via corretora autorizada.
- **Responsabilidade:** A corretora e responsavel pelas operacoes enviadas atraves de seu acesso ao mercado.

### 9.2 Regras da B3 para Algo Trading

- **Identificacao:** Ordens algoritmicas devem ser identificadas como tal no sistema.
- **Controles de risco:** Limites de preco, quantidade e financeiro devem ser implementados.
- **Kill switch:** Capacidade de cancelar todas as ordens pendentes imediatamente.
- **Testes:** Algoritmos devem ser testados em ambiente de certificacao antes de entrar em producao.

### 9.3 Implicacao Pratica

Para o bot de investimentos em desenvolvimento:
- Se o bot apenas executa ordens com base em sinais (robo-trader), nao precisa de registro na CVM, mas deve operar via corretora.
- Se o bot oferece recomendacoes a terceiros (robo-advisor), requer registro e conformidade com as resolucoes da CVM.
- Em ambos os casos, deve implementar controles de risco robustos e trilha de auditoria.

---

## 10. Implicacoes Praticas para o Bot

### 10.1 Universo de Ativos Recomendado

Para um bot de alto nivel, o universo de ativos deve ser cuidadosamente selecionado:

- **Core (alta liquidez):** Componentes do Ibovespa (85 ativos) - spread baixo, execucao rapida, dados abundantes.
- **Derivativos (day trade):** WIN (mini-indice), WDO (mini-dolar) - altissima liquidez, operacao intradiaria.
- **Opcoes:** Foco nos 5-10 ativos mais liquidos (PETR4, VALE3, BBAS3, ITUB4, BOVA11).
- **Evitar:** Small/micro caps com volume < R$ 5M/dia (risco de liquidez, spreads altos, manipulacao).

### 10.2 Horarios Otimos de Operacao

| Periodo | Recomendacao |
|---|---|
| 09:00 - 10:00 | Operar derivativos (futuros ja negociam); nao operar acoes (pre-abertura) |
| 10:00 - 10:15 | Cautela na abertura (alta volatilidade, leilao) |
| 10:15 - 11:30 | Boa liquidez; executar ordens acumuladas |
| 11:30 - 14:00 | Liquidez moderada; cuidado com slippage em mid/small caps |
| 14:00 - 17:55 | Melhor periodo para execucao; sobreposicao com EUA |
| 17:55 - 18:00 | Call de fechamento - MOC/MOA para rebalanceamento |

### 10.3 Gestao de Risco Especifica para B3

1. **Circuit breaker:** O bot deve detectar e suspender operacoes automaticamente quando o Ibovespa cair > 8% (antes do trigger de 10%).
2. **Leiloes de volatilidade:** Monitorar entradas em leilao para nao enviar ordens que ficarao presas.
3. **Vencimento de opcoes/futuros:** Aumentar cautela e reduzir exposicao nos dias de vencimento (3a sexta do mes, quarta proxima ao 15 em meses pares).
4. **Ajuste diario de futuros:** Provisionar margem suficiente para debitos de ajuste diario.
5. **Risco cambial:** Para ativos dolarizados (VALE3, PETR4), monitorar correlacao BRL/USD.
6. **Horario de verao EUA:** Manter tabela atualizada de mudancas de horario que afetam derivativos.

### 10.4 Infraestrutura Tecnica Recomendada

| Componente | Recomendacao |
|---|---|
| **Acesso ao mercado** | DMA 3 (minimo) ou DMA 4 (colocation) para estrategias sensiveis a latencia |
| **Market data** | Binary UMDF (SBE) para menor latencia; UMDF FIX/FAST para estrategias de media frequencia |
| **Entrada de ordens** | EntryPoint (B3 BOE) via FIX/SBE |
| **Dados historicos** | B3 Market Data, CVM dados abertos, Yahoo Finance, Bloomberg |
| **Ambiente de teste** | Ambiente de certificacao da B3 (obrigatorio antes de producao) |

### 10.5 Estrategias Viáveis por Nível de Infraestrutura

| Infraestrutura | Estrategias Viaveis | Estrategias Inviáveis |
|---|---|---|
| **Home Broker (DMA 1)** | Swing trade, position trade, dividendos | Day trade de alta frequencia, scalping |
| **DMA 2/3** | Day trade, mean reversion, momentum diario, opcoes | HFT, market making puro |
| **DMA 4 (Colocation)** | HFT, market making, arbitragem, todas as anteriores | - |

---

## 11. Fontes e Referencias

### Fontes Institucionais (B3)

1. **B3 - Tipos de Ofertas.** B3 S.A., 2024. Disponivel em: [https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/regras-e-parametros-de-negociacao/tipos-de-ofertas/](https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/regras-e-parametros-de-negociacao/tipos-de-ofertas/). Tipo: Site institucional (B3).

2. **B3 - Regulamentos e Manuais de Negociacao.** B3 S.A., 2024. Disponivel em: [https://www.b3.com.br/pt_br/regulacao/estrutura-normativa/regulamentos-e-manuais/negociacao.htm](https://www.b3.com.br/pt_br/regulacao/estrutura-normativa/regulamentos-e-manuais/negociacao.htm). Tipo: Documentacao regulatoria.

3. **B3 - Horario de Negociacao Derivativos.** B3 S.A., 2025. Disponivel em: [https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/horario-de-negociacao/derivativos/](https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/horario-de-negociacao/derivativos/). Tipo: Site institucional (B3).

4. **B3 - Caracteristicas e Regras do Mercado de Acoes.** B3 S.A., 2024. Disponivel em: [https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/mercado-de-acoes/caracteristicas-e-regras.htm](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/mercado-de-acoes/caracteristicas-e-regras.htm). Tipo: Site institucional (B3).

5. **B3 - Tarifas de Acoes e Fundos de Investimento.** B3 S.A., 2025. Disponivel em: [https://www.b3.com.br/pt_br/produtos-e-servicos/tarifas/listados-a-vista-e-derivativos/renda-variavel/tarifas-de-acoes-e-fundos-de-investimento/a-vista/](https://www.b3.com.br/pt_br/produtos-e-servicos/tarifas/listados-a-vista-e-derivativos/renda-variavel/tarifas-de-acoes-e-fundos-de-investimento/a-vista/). Tipo: Site institucional (B3).

6. **B3 - Metodologia do Indice Bovespa (Ibovespa).** B3 S.A., 2024. Disponivel em: [https://www.b3.com.br/data/files/9C/15/76/F6/3F6947102255C247AC094EA8/IBOV-Metodologia-pt-br__Novo_.pdf](https://www.b3.com.br/data/files/9C/15/76/F6/3F6947102255C247AC094EA8/IBOV-Metodologia-pt-br__Novo_.pdf). Tipo: Documento tecnico oficial (PDF).

7. **B3 - HFT Program.** B3 S.A., 2024. Disponivel em: [https://www.b3.com.br/en_us/products-and-services/fee-schedules/listed-equities-and-derivatives/programas-de-incentivo/hft-program/](https://www.b3.com.br/en_us/products-and-services/fee-schedules/listed-equities-and-derivatives/programas-de-incentivo/hft-program/). Tipo: Site institucional (B3).

8. **B3 - Co-Location Self Assessment & FAQ.** B3 S.A., 2024. Disponivel em: [https://www.b3.com.br/data/files/19/07/C1/D6/F1A75710DFA44257AC094EA8/Self%20Assessment_PT_Version1.2.pdf](https://www.b3.com.br/data/files/19/07/C1/D6/F1A75710DFA44257AC094EA8/Self%20Assessment_PT_Version1.2.pdf). Tipo: Documento tecnico oficial (PDF).

9. **B3 - UMDF Binary Market Data Specification.** B3 S.A., 2024. Disponivel em: [https://www.b3.com.br/data/files/A3/F1/3A/ED/A46A1810C493CD08AC094EA8/Binary%20UMDF%20-%20Message%20Specification%20Guidelines%20-%20v.1.4.1.pdf](https://www.b3.com.br/data/files/A3/F1/3A/ED/A46A1810C493CD08AC094EA8/Binary%20UMDF%20-%20Message%20Specification%20Guidelines%20-%20v.1.4.1.pdf). Tipo: Especificacao tecnica (PDF).

10. **B3 - Calendario de Vencimentos de Opcoes.** B3 S.A., 2025. Disponivel em: [https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/calendario-de-negociacao/vencimentos/calendario-de-vencimentos-de-opcoes-sobre-acoes-e-indices/](https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/calendario-de-negociacao/vencimentos/calendario-de-vencimentos-de-opcoes-sobre-acoes-e-indices/). Tipo: Site institucional (B3).

### Fontes Jornalisticas e de Mercado

11. **"A supremacia dos estrangeiros na B3: Participacao atinge recorde historico em 2025."** Money Times, 2025. Disponivel em: [https://www.moneytimes.com.br/a-supremacia-dos-estrangeiros-participacao-no-volume-da-b3-atinge-nivel-recorde-em-2025-jals/](https://www.moneytimes.com.br/a-supremacia-dos-estrangeiros-participacao-no-volume-da-b3-atinge-nivel-recorde-em-2025-jals/). Tipo: Artigo jornalistico.

12. **"Investidor pessoa fisica bate marca bilionaria e movimenta R$ 517,3 bilhoes em acoes em 2025."** Times Brasil (CNBC), 2025. Disponivel em: [https://timesbrasil.com.br/investimentos/investidores-pessoas-fisicas-crescem-na-b3/](https://timesbrasil.com.br/investimentos/investidores-pessoas-fisicas-crescem-na-b3/). Tipo: Artigo jornalistico.

13. **"B3 reduz latencia em 70% e acelera execucao de ordens no mercado."** Canal Executivo, 2025. Disponivel em: [https://canalexecutivoblog.wordpress.com/2025/06/12/b3-reduz-latencia-em-70-e-acelera-execucao-de-ordens-no-mercado/](https://canalexecutivoblog.wordpress.com/2025/06/12/b3-reduz-latencia-em-70-e-acelera-execucao-de-ordens-no-mercado/). Tipo: Artigo jornalistico.

14. **"Estrangeiros aplicam R$ 26,8 bilhoes na bolsa em 2025."** Quantum Finance, 2025. Disponivel em: [https://quantumfinance.com.br/investimento-estrangeiro-2025/](https://quantumfinance.com.br/investimento-estrangeiro-2025/). Tipo: Relatorio/analise de mercado.

15. **"Sell in May and Go Away? Melhor Repensar Essa Estrategia."** Bora Investir (B3), 2025. Disponivel em: [https://borainvestir.b3.com.br/objetivos-financeiros/investir-melhor/sell-in-may-and-go-away-melhor-repensar-essa-estrategia/](https://borainvestir.b3.com.br/objetivos-financeiros/investir-melhor/sell-in-may-and-go-away-melhor-repensar-essa-estrategia/). Tipo: Artigo educacional (B3).

16. **"B3 altera horarios de negociacao a partir do final de outubro."** Bora Investir (B3), 2025. Disponivel em: [https://borainvestir.b3.com.br/noticias/b3-altera-horarios-de-negociacao-a-partir-do-final-de-outubro/](https://borainvestir.b3.com.br/noticias/b3-altera-horarios-de-negociacao-a-partir-do-final-de-outubro/). Tipo: Noticia institucional.

17. **"Investidores institucionais movimentam quase R$ 1 trilhao em acoes na B3 em 2025."** Diario do Comercio, 2025. Disponivel em: [https://diariodocomercio.com.br/financas/investidores-institucionais-movimentam-quase-r-1-tri-b3/](https://diariodocomercio.com.br/financas/investidores-institucionais-movimentam-quase-r-1-tri-b3/). Tipo: Artigo jornalistico.

### Fontes Academicas e Tecnicas

18. **"Integracao das camaras de negociacao e pos-negociacao (BM&F/BOVESPA/CETIP/B3) e os reflexos sobre o funding no mercado de capitais brasileiro."** UFRGS (Universidade Federal do Rio Grande do Sul), 2022. Disponivel em: [https://lume.ufrgs.br/handle/10183/252084](https://lume.ufrgs.br/handle/10183/252084). Tipo: Tese/dissertacao academica.

19. **"Microestrutura do mercado cambial brasileiro."** Andre Ventura Fernandes, ANBIMA, 2007. Disponivel em: [https://www.anbima.com.br/data/files/45/11/4C/C6/24E3A5104FEB5B9568A80AC2/Tese-Andre-Ventura-Fernandes-2007.pdf](https://www.anbima.com.br/data/files/45/11/4C/C6/24E3A5104FEB5B9568A80AC2/Tese-Andre-Ventura-Fernandes-2007.pdf). Tipo: Tese academica (PDF).

20. **"O que e microestrutura de mercado."** UNICAMP, 2023. Disponivel em: [https://prp.unicamp.br/inscricao-congresso/resumos/2023P22416A11057O1822.pdf](https://prp.unicamp.br/inscricao-congresso/resumos/2023P22416A11057O1822.pdf). Tipo: Resumo de congresso academico.

21. **"mt5se: An Open Source Framework for Building Autonomous Trading Robots."** ArXiv, 2021. Disponivel em: [https://arxiv.org/pdf/2101.08169](https://arxiv.org/pdf/2101.08169). Tipo: Artigo academico (pre-print).

### Fontes Regulatorias (CVM)

22. **"Robos de Investimentos."** Portal do Investidor (CVM/Governo Federal), 2024. Disponivel em: [https://www.gov.br/investidor/pt-br/investir/como-investir/profissionais-do-mercado/robos-de-investimentos](https://www.gov.br/investidor/pt-br/investir/como-investir/profissionais-do-mercado/robos-de-investimentos). Tipo: Site governamental/regulatorio.

23. **"Resolucao CVM 19."** Comissao de Valores Mobiliarios, 2021. Disponivel em: [https://conteudo.cvm.gov.br/legislacao/resolucoes/resol019.html](https://conteudo.cvm.gov.br/legislacao/resolucoes/resol019.html). Tipo: Legislacao/resolucao.

24. **"As 3 Leis dos Robos de Investimento."** BSBC Advogados, 2023. Disponivel em: [https://bsbcadvogados.com.br/en/publications/as-3-leis-dos-robos-de-investimento/](https://bsbcadvogados.com.br/en/publications/as-3-leis-dos-robos-de-investimento/). Tipo: Artigo juridico.

### Fontes Tecnicas e de Infraestrutura

25. **"B3, Low Latency and the Search for Alpha."** BSO Network Solutions, 2024. Disponivel em: [https://www.bso.co/all-insights/b3-stock-exchange-low-latency-connectivity](https://www.bso.co/all-insights/b3-stock-exchange-low-latency-connectivity). Tipo: Artigo tecnico (provedor de infraestrutura).

26. **"The Rise of PUMA B3: How New Developments Are Reshaping Trading in Brazil."** OnixS, 2024. Disponivel em: [https://www.onixs.biz/insights/the-rise-of-puma-b3-how-new-developments-are-reshaping-trading-in-brazil](https://www.onixs.biz/insights/the-rise-of-puma-b3-how-new-developments-are-reshaping-trading-in-brazil). Tipo: Artigo tecnico (provedor de software).

27. **"New B3 Binary UMDF Market Data feed and B3 Binary Order Entry platform interfaces."** OnixS, 2024. Disponivel em: [https://www.onixs.biz/insights/new-b3-binary-umdf-market-data-feed-and-b3-binary-order-entry-platform-interfaces.-what-you-need-to-know](https://www.onixs.biz/insights/new-b3-binary-umdf-market-data-feed-and-b3-binary-order-entry-platform-interfaces.-what-you-need-to-know). Tipo: Artigo tecnico.

28. **"Conheca os modelos de acesso direto ao mercado - BM&FBOVESPA: DMA 1, 2, 3 e 4."** Cedro Technologies, 2024. Disponivel em: [https://www.cedrotech.com/blog/conheca-os-modelos-de-acesso-direto-ao-mercado-bmfbovespa-dma-1-2-3-e-4](https://www.cedrotech.com/blog/conheca-os-modelos-de-acesso-direto-ao-mercado-bmfbovespa-dma-1-2-3-e-4). Tipo: Artigo tecnico (provedor de tecnologia).

### Fontes Educacionais e de Analise

29. **"Microestrutura de mercado: como entender a dinamica da liquidez?"** Toro Investimentos Blog, 2024. Disponivel em: [https://blog.toroinvestimentos.com.br/trading/microestrutura-de-mercado/](https://blog.toroinvestimentos.com.br/trading/microestrutura-de-mercado/). Tipo: Artigo educacional.

30. **"Conheça os 10 principais indices da bolsa do Brasil."** Bora Investir (B3), 2025. Disponivel em: [https://borainvestir.b3.com.br/tipos-de-investimentos/indices-da-bolsa/](https://borainvestir.b3.com.br/tipos-de-investimentos/indices-da-bolsa/). Tipo: Artigo educacional (B3).

31. **"Ibovespa e SMLL: previa do rebalanceamento de janeiro de 2026."** XP Investimentos, 2025. Disponivel em: [https://conteudos.xpi.com.br/acoes/relatorios/ibovespa-e-smll-previa-do-rebalanceamento-de-janeiro-de-2026/](https://conteudos.xpi.com.br/acoes/relatorios/ibovespa-e-smll-previa-do-rebalanceamento-de-janeiro-de-2026/). Tipo: Relatorio de analise.

32. **B3 (bolsa de valores) - Wikipedia.** Wikipedia, 2025. Disponivel em: [https://pt.wikipedia.org/wiki/B3_(bolsa_de_valores)](https://pt.wikipedia.org/wiki/B3_(bolsa_de_valores)). Tipo: Enciclopedia (referencia geral).

---

*Documento elaborado em 07/02/2026. Dados e regulamentacoes estao sujeitos a alteracoes. Consultar sempre as fontes primarias (B3, CVM) para informacoes atualizadas antes de implementar estrategias automatizadas.*
