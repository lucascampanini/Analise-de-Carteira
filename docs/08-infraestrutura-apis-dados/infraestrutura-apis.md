# Infraestrutura, APIs e Fontes de Dados para Bot de Investimentos no Mercado Brasileiro

## Pesquisa Acadêmica de Nível Avançado (PhD-Level)

**Autor:** Pesquisa compilada por assistente de IA
**Data:** Fevereiro de 2026
**Escopo:** Análise abrangente de toda a cadeia de infraestrutura tecnológica, APIs, protocolos e fontes de dados necessários para construção e operação de um bot de investimentos de alto nível no mercado financeiro brasileiro.

---

## Sumário

1. [Corretoras com API no Brasil](#1-corretoras-com-api-no-brasil)
2. [APIs de Market Data Profissional](#2-apis-de-market-data-profissional)
3. [APIs Gratuitas e Open Source](#3-apis-gratuitas-e-open-source)
4. [Dados Fundamentalistas](#4-dados-fundamentalistas)
5. [Dados Macroeconômicos](#5-dados-macroeconômicos)
6. [Protocolos de Conexão](#6-protocolos-de-conexão)
7. [Infraestrutura Técnica e Colocation](#7-infraestrutura-técnica-e-colocation)
8. [Armazenamento de Dados](#8-armazenamento-de-dados)
9. [Ferramentas e Frameworks](#9-ferramentas-e-frameworks)
10. [Web Scraping e Dados Alternativos](#10-web-scraping-e-dados-alternativos)
11. [Arquitetura Recomendada](#11-arquitetura-recomendada)
12. [Tabela Comparativa de Custos](#12-tabela-comparativa-de-custos)
13. [Referências](#13-referências)

---

## 1. Corretoras com API no Brasil

### 1.1 Visão Geral do Ecossistema

O mercado brasileiro de APIs de trading é substancialmente diferente dos mercados norte-americanos (onde plataformas como Interactive Brokers e Alpaca dominam). No Brasil, o acesso programático a ordens na B3 é intermediado por um ecossistema mais fragmentado, onde corretoras dependem de provedores de tecnologia terceirizados (principalmente Cedro Technologies e Nelogica/Profit) para oferecer conectividade API a seus clientes.

### 1.2 Cedro Technologies (Plataforma Anywhere)

A Cedro Technologies é o principal provedor de tecnologia de acesso via API ao mercado brasileiro. Sua plataforma **Anywhere** fornece conectividade com a B3 através de múltiplas corretoras credenciadas.

**Protocolos disponíveis:**

| Protocolo | Formato | Modo de Entrega | Caso de Uso |
|-----------|---------|-----------------|-------------|
| **REST** | JSON/XML | Request-Response | Consultas pontuais, envio de ordens |
| **WebSocket** | JSON Streaming | Push contínuo | Market data em tempo real, book de ofertas |
| **FIX 4.4** | Tags FIX | Sessão persistente | Order routing de alta performance, DMA |

**Funcionalidades principais:**
- API de cotações REST (JSON/XML) com dados em tempo real ou delayed
- API de dados históricos da B3 (intraday e diário)
- API de roteamento de ordens via FIX Protocol (BM&F e Bovespa)
- API de envio de ordens e trading eletrônico via WebSocket
- Serviços pós-trade: posição diária, custódia, extratos, conta-corrente
- Market Data Cloud com dados de B3, câmbio, derivativos, indicadores, commodities agrícolas

**Corretoras credenciadas:** XP Investimentos, Genial, Guide, Mirae, Ativa e outras.

**Custos:** Não divulgados publicamente. Modelo de precificação por contrato, com período de testes gratuito de 7 dias. Contato comercial: comercial@cedrotech.com, +55 11 3014 0200.

**Prós:**
- Ecossistema mais completo de APIs para B3 disponível no mercado
- Múltiplos protocolos (REST, WebSocket, FIX)
- Suporte a múltiplas corretoras
- Gateway MetaTrader 5 para B3

**Contras:**
- Preços não transparentes (necessário negociação)
- Dependência de terceiro entre corretora e desenvolvedor
- Documentação historicamente limitada (tem melhorado)

### 1.3 Nelogica / Profit Pro (ProfitDLL)

A Nelogica é a empresa por trás das plataformas Profit (Profit One, Profit Plus, Profit Pro, Profit Ultra), amplamente utilizadas por traders brasileiros. A integração programática ocorre via **ProfitDLL**.

**Ecossistema ProfitDLL:**

| Modo | Funcionalidade | Linguagens Suportadas |
|------|---------------|----------------------|
| **Market Data** | Cotações, book, trades, dados históricos | Delphi, C, Python |
| **Routing + Market Data** | Envio e gerenciamento de ordens + cotações | Delphi, C, Python |

**Funcionalidades principais:**
- Requisição de até 90 dias de dados históricos tick-by-tick de qualquer ativo da B3
- Criação de dashboards personalizados para análise de players
- Módulo de Automação de Estratégias com linguagem NTSL (Nelogica Trading System Language)
- Editor de Estratégias para codificação, teste e simulação

**Custos:**
- Automação gratuita no Profit Ultra e Profit Pro para contas simuladas
- Módulo pago para operações em conta real
- Período de teste gratuito de 7 dias para conta real

**Prós:**
- Integração nativa com a plataforma mais popular entre traders brasileiros
- Acesso a dados tick-by-tick históricos (90 dias)
- DLL bem documentada para Delphi, C e Python
- Linguagem NTSL própria para estratégias

**Contras:**
- Limitado ao ecossistema Profit/Nelogica
- Sem API REST ou WebSocket padrão (depende da DLL)
- Histórico limitado a 90 dias para tick data
- Curva de aprendizado da NTSL

### 1.4 BTG Pactual

O BTG Pactual é considerado a corretora líder para day trading em 2026, com plataforma robusta e estável mesmo em momentos de alta volatilidade. O BTG possui portal de desenvolvedores com APIs empresariais.

**Portal de Desenvolvedores:** https://empresas.btgpactual.com/developers

**Características:**
- APIs REST para serviços bancários e de investimentos
- Foco em integrações B2B e empresariais
- Plataforma proprietária de trading

**Prós:**
- Marca sólida e infraestrutura robusta
- Portal de desenvolvedores dedicado
- Liquidez e profundidade de mercado

**Contras:**
- APIs focadas em banking/empresas, não em trading algorítmico direto
- Acesso a APIs de trading geralmente via parceiros tecnológicos (Cedro, Nelogica)
- Voltado para clientes institucionais

### 1.5 XP Investimentos

A XP Investimentos, maior corretora do Brasil, oferece acesso programático primariamente via parceiros tecnológicos.

**Vias de acesso API:**
- Via Cedro Technologies (plataforma Anywhere) - REST, WebSocket, FIX
- Via Nelogica/Profit - ProfitDLL
- API proprietária limitada para parceiros selecionados

**Prós:**
- Maior liquidez e base de clientes
- Múltiplas vias de acesso tecnológico

**Contras:**
- Sem API aberta direta para desenvolvedores independentes
- Dependência de intermediários tecnológicos

### 1.6 Clear Corretora

A Clear (do grupo XP) é voltada para traders ativos e oferece acesso via plataformas:

- Profit Pro/Ultra (via Nelogica)
- MetaTrader 5 (via Cedro Technologies)
- Plataforma proprietária Clear Trader

**Prós:**
- Zero corretagem para ações e opções
- Acesso a Profit e MetaTrader 5

**Contras:**
- Sem API direta publicada
- Funcionalidade dependente das plataformas parceiras

### 1.7 Inter Invest, Modal e NuInvest

Estas corretoras de varejo (Inter, Modal/XP e NuInvest/Nubank) **não oferecem APIs de trading programático** documentadas publicamente para clientes individuais em 2026. São plataformas focadas em:

- Experiência mobile
- Zero taxa para operações básicas
- Público iniciante/intermediário

**Limitação crítica:** Para trading algorítmico, estas plataformas não são viáveis. Seu uso está restrito a consulta de carteira e dados básicos via apps.

---

## 2. APIs de Market Data Profissional

### 2.1 B3 Market Data (UMDF)

A B3 distribui dados de mercado via plataforma **UMDF (Unified Market Data Feed)**, o canal oficial de dados para todos os participantes do mercado.

**Níveis de profundidade:**

| Nível | Descrição | Conteúdo |
|-------|-----------|----------|
| **L1 (Top of Book)** | Melhor oferta de compra e venda | Best bid/ask, último preço, volume |
| **L2 (Full Book)** | Book completo de ofertas | Todas as ofertas no book, profundidade total |

**Formatos de dados:**

| Protocolo | Encoding | Latência | Status |
|-----------|----------|----------|--------|
| **FIX/FAST** | Texto FIX + compressão FAST | Maior | Legado (sendo descontinuado) |
| **Binary UMDF (SBE)** | Simple Binary Encoding | Menor | Atual e recomendado |

**Segmentos disponíveis:**
- EQUITIES AND OPTIONS (ações, opções, BDRs, ETFs, FIIs)
- FUTURES AND FX (futuros, moedas, commodities)

**Modos de distribuição:**
- **Real-time:** Dados instantâneos (requer contrato e taxas)
- **Delayed (15 minutos):** Dados com atraso de 15 minutos (custo reduzido)

**Custos:** Precificação por contrato, não divulgada publicamente. Exige cadastro como distribuidor autorizado junto à B3. Custos típicos variam de R$ 500/mês (delayed, uso interno) a R$ 50.000+/mês (real-time, redistribuição).

**Prós:**
- Fonte oficial e definitiva de dados do mercado brasileiro
- Menor latência possível (direto da bolsa)
- Dados completos (L1 e L2)
- Novo protocolo binário com latência reduzida

**Contras:**
- Custos elevados para acesso direto
- Complexidade de integração (especialmente protocolo binário)
- Exige infraestrutura dedicada para recebimento
- Necessidade de licenciamento como distribuidor

### 2.2 Bloomberg Terminal e APIs

O Bloomberg Terminal é o padrão ouro para dados financeiros profissionais globais, incluindo cobertura completa do mercado brasileiro.

**APIs disponíveis:**

| API | Descrição | Acesso |
|-----|-----------|--------|
| **BLPAPI** | API core do Bloomberg | C++, Java, .NET, Python |
| **B-PIPE** | API servidor para empresas | Server-side, alta performance |
| **Enterprise Access Point** | API RESTful moderna | REST, JSON, autoatendimento |

**Custos:**
- Terminal Bloomberg: ~USD 20.000/usuário/ano (~R$ 120.000/ano)
- B-PIPE Enterprise: USD 50.000-200.000+/ano dependendo do uso
- Data License: Precificação por dataset, tipicamente USD 30.000+/ano

**Cobertura Brasil:**
- Ações, opções, futuros, renda fixa, câmbio
- Dados fundamentalistas completos
- Dados macroeconômicos
- Notícias em português
- Analytics e modelos proprietários

**Prós:**
- Cobertura mais abrangente do mundo
- Qualidade de dados excepcional
- APIs robustas e bem documentadas
- Integração com Python, R, Excel

**Contras:**
- Custo proibitivo para traders individuais e pequenas empresas
- Lock-in de fornecedor
- Latência não competitiva para HFT

### 2.3 LSEG Workspace (ex-Refinitiv Eikon)

O Refinitiv Eikon foi descontinuado em 30 de junho de 2025, sendo substituído pelo **LSEG Workspace**.

**APIs disponíveis:**
- Refinitiv Data Platform APIs (REST)
- Streaming API (WebSocket) para dados em tempo real
- Python SDK (refinitiv-data)
- R SDK (RefinitivR)

**Cobertura Brasil:** Dados completos da B3 via acordo de distribuição, incluindo equities, derivativos e renda fixa. Contato Brasil: +55 11 47009629.

**Custos:** USD 15.000-25.000/usuário/ano (estimativa), precificação sob consulta.

**Prós:**
- Alternativa mais acessível que Bloomberg
- APIs modernas (REST + WebSocket)
- Boa cobertura de dados brasileiros
- Integração com Python

**Contras:**
- Transição Eikon -> Workspace pode causar instabilidade
- Custo ainda elevado para uso individual
- Qualidade de dados para Brasil inferior ao Bloomberg em alguns segmentos

### 2.4 CMA (Safras & Mercado / CMA Data Feed)

A CMA é uma empresa brasileira com mais de 35 anos de experiência fornecendo market data da B3 para a comunidade de trading.

**Características:**
- Conectividade direta com datacenter da B3
- Infraestrutura "CMA Redes Digitais" instalada dentro do datacenter da exchange
- Plataforma CMA Series 4
- API para integração com diferentes tecnologias
- Roteamento de ordens em tempo real para Bovespa e BM&F

**Custos:** Aproximadamente 50% menor que ofertas concorrentes internacionais para conectividade B3 (segundo a própria CMA). Precificação sob consulta.

**Prós:**
- Especialista no mercado brasileiro
- Infraestrutura dentro do datacenter da B3 (baixa latência)
- Custos competitivos vs. provedores internacionais

**Contras:**
- Foco regional (limitado a América Latina)
- Documentação e suporte a desenvolvedores limitados
- Ecossistema menor

### 2.5 Cedro Technologies - Market Data Cloud

Além do trading, a Cedro oferece Market Data como serviço separado.

**Dados disponíveis:**
- B3 (BM&FBOVESPA) - ações, derivativos, futuros
- Câmbio (moedas)
- Indicadores econômicos
- Commodities agrícolas

**Formatos:** REST (JSON/XML), WebSocket (streaming JSON)

**Custos:** Teste gratuito por 7 dias. Planos sob consulta.

---

## 3. APIs Gratuitas e Open Source

### 3.1 brapi.dev

A **brapi.dev** é a API REST brasileira mais popular para dados do mercado de ações da B3, específica para o mercado nacional.

**Dados disponíveis:**
- Cotações em tempo real (ações, FIIs, BDRs, ETFs)
- Histórico de preços OHLCV
- Dividendos e proventos
- Balanço Patrimonial (BP)
- Demonstração de Resultados (DRE)
- Demonstração de Fluxo de Caixa (DFC)
- Demonstração de Valor Adicionado (DVA)
- Indicadores fundamentalistas: P/L, P/VP, ROE, margens, EV/EBITDA
- +400 ativos cobertos

**Planos e preços (2026):**

| Plano | Preço | Recursos |
|-------|-------|----------|
| **Free** | R$ 0 | Cotações básicas, ativos populares (PETR4, VALE3, ITUB4), queries limitadas |
| **Startup** | ~R$ 49-79/mês | Histórico de 1 ano, dividendos (último ano), fundamentalista anual (5 anos) |
| **Pro** | ~R$ 149-299/mês | Dados completos desde 2009 (BP, DRE, DFC, DVA trimestral/anual), histórico 10+ anos, todos indicadores |

*Nota: Desconto de até 2 meses em assinaturas anuais.*

**Prós:**
- API mais especializada para B3 disponível gratuitamente
- Documentação em português, excelente
- Fácil integração (REST + JSON)
- Plano gratuito funcional para prototipagem
- Dados fundamentalistas completos no plano Pro

**Contras:**
- Não é fonte oficial (dados podem ter atraso/imprecisões)
- Limites de requests no plano gratuito
- Sem dados de book de ofertas (L2)
- Sem dados tick-by-tick
- Cobertura limitada a B3

### 3.2 Yahoo Finance (via yfinance)

O Yahoo Finance continua sendo uma fonte popular de dados de mercado via a biblioteca Python `yfinance`, incluindo ativos brasileiros (sufixo `.SA`).

**Exemplo:** `PETR4.SA`, `VALE3.SA`, `ITUB4.SA`

**Dados disponíveis:**
- Cotações históricas OHLCV
- Dividendos e splits
- Dados fundamentalistas básicos
- Dados intraday (1m, 5m, 15m, 1h) - limitados a 30 dias

**Custos:** Gratuito (não oficial, pode ser bloqueado)

**Prós:**
- Gratuito e sem necessidade de cadastro
- Biblioteca Python (`yfinance`) muito popular e bem mantida
- Boa cobertura de ativos brasileiros

**Contras:**
- Sem SLA ou garantia de disponibilidade
- Yahoo pode bloquear/limitar acesso a qualquer momento
- Dados podem ter inconsistências para ativos brasileiros
- Sem dados de volume de contratos futuros confiáveis
- Dados fundamentalistas limitados para empresas brasileiras

### 3.3 Alpha Vantage

Plataforma global de APIs financeiras com plano gratuito.

**Dados disponíveis:**
- Cotações históricas e intraday
- +50 indicadores técnicos
- Dados fundamentalistas
- Forex e criptomoedas

**Custos:**
- Free: 25 requests/dia
- Premium: USD 49.99/mês (75 req/min)
- Enterprise: Sob consulta

**Limitação Brasil:** Cobertura de ações brasileiras incompleta. Muitos ativos da B3 não estão disponíveis ou possuem dados com falhas.

**Prós:**
- API bem documentada
- Múltiplos endpoints (ações, forex, crypto, indicadores técnicos)

**Contras:**
- Cobertura muito limitada para B3
- Rate limits restritivos no plano gratuito
- Dados de qualidade inferior para mercado brasileiro

### 3.4 Dados de Mercado (dadosdemercado.com.br)

API brasileira que oferece dados financeiros organizados.

**Dados disponíveis:**
- Ações e FIIs
- Indicadores financeiros, de risco, técnicos e de mercado
- Fundos de investimento
- Tesouro Direto
- Dados macroeconômicos

**Prós:**
- Foco no mercado brasileiro
- Cobertura diversificada (ações, fundos, tesouro, macro)

**Contras:**
- Documentação e planos menos maduros que brapi.dev

### 3.5 APIs do Banco Central do Brasil (SGS)

O **Sistema Gerenciador de Séries Temporais (SGS)** do Banco Central é a fonte mais confiável para dados econômico-financeiros oficiais do Brasil.

**URL:** https://www3.bcb.gov.br/sgspub/

**Dados disponíveis (milhares de séries):**
- Taxa Selic (meta e efetiva)
- IPCA, IGP-M, IGP-DI e outros índices de inflação
- Câmbio (PTAX, comercial, turismo)
- Crédito e inadimplência
- Balanço de pagamentos
- Reservas internacionais
- Taxas de juros de mercado
- Agregados monetários

**Acesso:**
- API REST com retorno em JSON
- Sem necessidade de autenticação
- Sem limite de requests documentado (uso razoável)

**Prós:**
- Fonte oficial e definitiva para dados macroeconômicos
- Completamente gratuito
- Dados desde décadas atrás
- Atualização automática

**Contras:**
- Interface API simples (sem filtros sofisticados)
- Documentação poderia ser melhor
- Sem SDK oficial (existem wrappers comunitários em Python e R)

### 3.6 IPEADATA

O Instituto de Pesquisa Econômica Aplicada mantém base de dados econômicos ampla.

**URL:** https://www.ipeadata.gov.br/

**Dados disponíveis:**
- Séries macroeconômicas
- Dados regionais
- Séries históricas longas (algumas desde 1900)
- Dados sociais e demográficos

**Acesso:** API REST, download de CSV, interface web.

**Prós:**
- Séries históricas muito longas
- Dados regionais únicos
- Gratuito

**Contras:**
- Interface datada
- API com funcionalidade limitada

---

## 4. Dados Fundamentalistas

### 4.1 CVM - Portal de Dados Abertos (dados.cvm.gov.br)

O **Portal de Dados Abertos da CVM** é a fonte oficial e definitiva para dados financeiros de empresas de capital aberto no Brasil.

**URL:** https://dados.cvm.gov.br/

**Datasets disponíveis:**

| Dataset | Sigla | Conteúdo | Frequência |
|---------|-------|----------|------------|
| Formulário Cadastral | FCA | Dados cadastrais da empresa | Eventual |
| Formulário de Referência | FRE | Informações detalhadas, governança | Anual |
| Informações Trimestrais | ITR | Demonstrações financeiras trimestrais (BP, DRE, DFC) | Trimestral |
| Demonstrações Financeiras Padronizadas | DFP | Demonstrações financeiras anuais completas | Anual |

**Acesso:**
- Download direto de CSVs por ano/período
- FTP da CVM para acesso programático
- ENET (https://www.rad.cvm.gov.br/enet/) para consulta de documentos
- Download múltiplo via https://conteudo.cvm.gov.br/menu/regulados/companhias/download_multiplo/

**Prós:**
- Fonte oficial regulatória (dados auditados)
- Completamente gratuito
- Dados padronizados (XBRL/CSV)
- Histórico extenso
- Download de 10 anos de dados de todas as companhias em menos de 10 minutos via FTP

**Contras:**
- Formato de dados exige parsing e tratamento significativo
- Sem API REST moderna (download de arquivos)
- Inconsistências entre formatos ao longo dos anos
- Dados não estão "prontos para uso" (requerem ETL)

### 4.2 ENET (Sistema Empresas.NET)

O **ENET** é o sistema da CVM/B3 para envio e consulta de documentos de companhias abertas.

**URL:** https://www.rad.cvm.gov.br/ENET/frmConsultaExternaCVM.aspx

**Funcionalidades:**
- Consulta de todos os documentos enviados por companhias abertas
- Fatos relevantes
- Comunicados ao mercado
- ITR, DFP, FCA, FRE em formato original

### 4.3 Fundamentus (www.fundamentus.com.br)

O Fundamentus é um dos sites mais populares para análise fundamentalista de ações brasileiras.

**Dados disponíveis:**
- Indicadores fundamentalistas (P/L, P/VP, PSR, DY, EV/EBITDA, etc.)
- Balanço patrimonial resumido
- Demonstração de resultados
- Dados de mercado (cotação, volume, market cap)

**Acesso:** Sem API oficial. Dados acessados via **web scraping**.

**Projetos de scraping (GitHub):**
- `phoemur/fundamentus` - API Python para análise fundamentalista da BOVESPA
- `feliperafael/fundamentus-data-scraping` - Extração de indicadores, BP e DRE
- `Iuryck/Fundamentus_API` - API não-oficial usando requests e BeautifulSoup
- `Lucas12j/Web_Scraping_Fundamentus` - Scraping organizado do IBOV
- `fundamentus-unofficial-api` (npm) - Versão JavaScript

**Prós:**
- Dados fundamentalistas concisos e atualizados
- Comunidade ativa de scrapers
- Gratuito

**Contras:**
- Sem API oficial (scraping pode quebrar a qualquer momento)
- Termos de uso podem proibir scraping
- Dados sem garantia de precisão

### 4.4 StatusInvest (statusinvest.com.br)

Plataforma popular de análise de investimentos com dados fundamentalistas detalhados.

**Dados disponíveis:**
- Ações, FIIs, BDRs, ETFs, Tesouro Direto
- Indicadores fundamentalistas completos
- Histórico de dividendos
- Comparadores de ativos

**Acesso:** Sem API oficial documentada. Endpoints internos podem ser explorados via engenharia reversa, mas sem garantia de estabilidade.

### 4.5 Economatica (TC Economatica)

A Economatica é referência no mercado profissional de dados financeiros da América Latina, fornecendo dados desde 1986.

**Dados disponíveis:**
- Demonstrações financeiras de empresas de capital aberto (desde 1986)
- +200 indicadores econômicos globais
- Cobertura de todas as empresas da B3
- Fundos de investimento
- Bolsas de México, EUA, Chile, Peru, Argentina, Colômbia
- +350 alertas e +200 notícias proprietárias diariamente

**Uso acadêmico:** Amplamente utilizada em pesquisas acadêmicas e publicações de universidades da América Latina, EUA e Europa.

**Custos:** Precificação por contrato (tipicamente R$ 2.000-10.000/mês para terminal profissional). Sem API REST moderna documentada publicamente.

**Prós:**
- Dados históricos mais longos disponíveis (desde 1986)
- Qualidade de dados excepcional para mercados latam
- Reconhecida pela comunidade acadêmica

**Contras:**
- Custo elevado
- Interface e exportação de dados datados
- Sem API moderna para integração programática
- Focada em uso via terminal/Excel

### 4.6 Quantum Axis

Plataforma profissional de dados financeiros para gestores e analistas.

**Dados disponíveis:**
- Dados de mercado em tempo real
- Dados fundamentalistas
- Fundos de investimento
- Risk analytics

**Custos:** Precificação institucional sob consulta.

---

## 5. Dados Macroeconômicos

### 5.1 BCB - Sistema de Expectativas de Mercado (Focus)

O **Relatório Focus** é a principal referência para expectativas de mercado sobre indicadores macroeconômicos no Brasil.

**URL:** https://dadosabertos.bcb.gov.br/dataset/expectativas-mercado

**API:** Protocolo OData (Open Data Protocol)
- Swagger: https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/swagger-ui2
- Formato: JSON via REST
- Autenticação: Nenhuma

**Dados disponíveis:**
- Expectativas para IPCA, IGP-M, IGP-DI
- Expectativas para PIB e produção industrial
- Expectativas para câmbio (USD/BRL)
- Expectativas para taxa Selic
- Expectativas para variáveis fiscais
- Expectativas para indicadores do setor externo
- Frequência: Diária (compilação semanal publicada toda segunda-feira)

**Instituições participantes:** Bancos, gestoras de ativos, distribuidoras, corretoras, consultorias, empresas do setor real.

**Prós:**
- Fonte oficial e gratuita
- API OData moderna com Swagger
- Dados de consenso de mercado (essenciais para estratégias macro)
- Atualização frequente

**Contras:**
- Apenas expectativas (não dados realizados)
- Protocolo OData pode ser menos familiar que REST puro

### 5.2 IBGE SIDRA

O **Sistema IBGE de Recuperação Automática (SIDRA)** é a base de dados do IBGE.

**URL:** https://sidra.ibge.gov.br/

**API:** REST com retorno em JSON

**Dados disponíveis:**
- PIB e contas nacionais
- IPCA, INPC e outros índices de preços
- PMC (Pesquisa Mensal de Comércio)
- PIM (Pesquisa Industrial Mensal)
- PNAD (mercado de trabalho)
- Censo demográfico
- Produção agrícola

**Wrapper Python:** Biblioteca `sidrapy` para acesso facilitado.

**Prós:**
- Dados oficiais do IBGE
- API REST moderna
- Gratuito e sem limites
- Cobertura regional detalhada

**Contras:**
- Estrutura de tabelas pode ser confusa
- Dados com defasagem natural (publicação mensal/trimestral)

### 5.3 Tesouro Transparente

O Tesouro Nacional disponibiliza dados via APIs abertas.

**URL:** https://www.tesourotransparente.gov.br/

**APIs disponíveis:**
- API do Tesouro Direto (preços, taxas, volumes)
- SICONFI - API de dados fiscais
- APIs do Tesouro Nacional (https://www.gov.br/tesouronacional/pt-br/central-de-conteudo/apis)

**Dados disponíveis:**
- Preços e taxas diárias de títulos do Tesouro Direto
- Volume de vendas por título (defasagem de 2 dias úteis)
- Resgates (antecipados, vencimento, cupons)
- Dados fiscais (receitas, despesas, dívida pública)

**Formato:** JSON, sem necessidade de autenticação, sem remuneração pelo uso.

**Prós:**
- Dados oficiais e gratuitos
- API REST moderna em JSON
- Sem autenticação necessária
- Dados essenciais para estratégias de renda fixa

**Contras:**
- Cobertura limitada a títulos públicos e dados fiscais
- Defasagem de 2 dias úteis nos dados de volume

### 5.4 Pacotes Python e R para Dados Macroeconômicos

| Pacote | Linguagem | Fontes Cobertas |
|--------|-----------|-----------------|
| `python-bcb` | Python | BCB SGS, Focus, PTAX |
| `sgs` | Python | BCB SGS |
| `ipeadatapy` | Python | IPEADATA |
| `sidrapy` | Python | IBGE SIDRA |
| `GetBCBData` | R | BCB SGS |
| `rbcb` | R | BCB (múltiplas fontes) |
| `BETS` | R | BCB, IBGE, IPEA (Brazilian Economic Time Series) |

---

## 6. Protocolos de Conexão

### 6.1 FIX Protocol 4.4

O **FIX (Financial Information eXchange) Protocol** é o protocolo de comunicação eletrônica padrão da indústria financeira global, usado desde 1992.

**Versão na B3:** FIX 4.4 (principal) com extensões proprietárias.

**Características:**

| Aspecto | Detalhe |
|---------|---------|
| Formato | Texto (tags key=value separadas por SOH) |
| Transporte | TCP/IP |
| Latência | ~80 microsegundos via matching engine |
| Sessão | Persistente com heartbeat |
| Sequenciamento | Números de sequência com gap fill |
| Criptografia | TLS/SSL |

**Mensagens principais:**
- `NewOrderSingle (D)` - Envio de nova ordem
- `ExecutionReport (8)` - Confirmação/rejeição de ordem
- `OrderCancelRequest (F)` - Cancelamento
- `MarketDataRequest (V)` - Requisição de dados de mercado
- `MarketDataSnapshotFullRefresh (W)` - Snapshot de mercado

**Prós:**
- Padrão global da indústria
- Amplamente documentado
- Múltiplas implementações open source (QuickFIX, QuickFIX/n, QuickFIX/J)
- Suportado por todas as corretoras e bolsas

**Contras:**
- Protocolo texto (maior overhead que binários)
- Latência superior aos protocolos binários nativos
- Complexidade de implementação
- ~80μs de latência vs. ~25μs de protocolos binários

### 6.2 B3 Binary Gateway (SBE)

O novo protocolo binário da B3 para order entry, baseado em **Simple Binary Encoding (SBE)**.

**Características:**

| Aspecto | Detalhe |
|---------|---------|
| Formato | Binário (SBE) |
| Latência | <25 microsegundos (colocation) |
| Capacidade | Maior que FIX |
| Mensagens | Simplificadas vs. FIX |

**Vantagens sobre FIX:**
- Menor tempo de round-trip (RTT) para processamento de ordens
- Maior capacidade do sistema para processar ordens e trades
- Simplificação do protocolo (menos mensagens trocadas)
- Redução de latência de encoding/decoding

**SDKs disponíveis:**
- OnixS B3 Binary Order Entry SDK (C++, .NET)
- Implementações proprietárias de cada vendor

### 6.3 UMDF Binary (Market Data)

O protocolo binário para market data da B3.

**Características:**
- Simple Binary Encoding (SBE) para encoding de mensagens
- Menor latência vs. FIX/FAST para market data
- Suporte a L1 (top of book) e L2 (full depth)
- Segmentos: Equities/Options e Futures/FX

**SDKs disponíveis:**
- OnixS B3 Binary UMDF SBE Market Data Handler (C++, .NET)
- B2BITS BM&FBovespa FIX/FAST Market Data Adaptor

### 6.4 OUCH Protocol

Protocolo proprietário desenvolvido pela Nasdaq, usado em algumas bolsas globais.

**Características:**
- Protocolo binário de altíssima performance
- Latência de execução < 25 microsegundos
- Mais simples que FIX (menos campos, menos overhead)
- Foco exclusivo em order entry (sem market data)

**Relevância para B3:** A B3 não usa OUCH nativamente, mas seu Binary Gateway SBE tem filosofia similar. Usado como referência de benchmark.

### 6.5 Modelos de DMA na B3

A B3 oferece **4 modelos de Direct Market Access (DMA)**:

| Modelo | Descrição | Latência | Custo | Requisitos |
|--------|-----------|----------|-------|------------|
| **DMA 1 - Tradicional** | Via broker (sponsored access) | Alta (ms) | Baixo | Conta em corretora |
| **DMA 2 - Via Provedor** | Via DMA Provider | Média (sub-ms) | Médio | Contrato com provedor |
| **DMA 3 - Conexão Direta** | Conexão direta à B3 | Baixa (μs) | Alto | Infraestrutura dedicada |
| **DMA 4 - Colocation** | Servidor no datacenter B3 | Ultra-baixa (μs) | Muito alto | Colocation + certificação |

---

## 7. Infraestrutura Técnica e Colocation

### 7.1 Equinix SP3 - Colocation da B3

O datacenter **Equinix SP3** em São Paulo é onde o matching engine da B3 está hospedado, sendo o ponto de menor latência possível para trading no mercado brasileiro.

**Especificações do Equinix SP3:**
- Localização: São Paulo, Brasil
- Capacidade: 13.3 MW
- Classificação: IBX (International Business Exchange)
- Conectividade: Múltiplos carriers, IX.br

**Latência (colocation no SP3):**
- Order-to-execution via Binary Gateway: < 25 microsegundos
- Order-to-execution via FIX: ~80 microsegundos
- Market data feed (UMDF Binary): microsegundos de propagação

**Provedores de Colocation e Conectividade:**

| Provedor | Serviço | Diferencial |
|----------|---------|-------------|
| **Equinix** | Colocation direta no SP3 | Proximidade física ao matching engine |
| **TNS** | Managed hosting + market data | Layer 1 connectivity, clearing e settlement |
| **RTM** | Plataforma DMA + colocation | Integração de mercados globais ao Brasil |
| **BSO** | Conectividade ultra-low-latency | Menor latência registrada como vendor na B3 |
| **Avelacom** | Rota Brasil-EUA low-latency | Conectividade cross-border para arb |

**Custos estimados de colocation (SP3):**
- Rack completo: R$ 15.000-40.000/mês
- Meio rack: R$ 8.000-20.000/mês
- Cross-connect à B3: R$ 2.000-5.000/mês
- Conectividade internet: R$ 3.000-10.000/mês
- **Total estimado:** R$ 30.000-80.000/mês

### 7.2 Cloud vs. Bare Metal para Trading

#### Bare Metal (Dedicado)

**Vantagens:**
- Eliminação completa de overhead de virtualização
- Acesso direto a CPU, RAM, NVMe, NICs 10+ Gbps
- Throughput consistente e latência previsível
- Zero interferência de outros tenants (no "noisy neighbor")
- Sem CPU steal, sem jitter de hypervisor
- Controle total sobre kernel, drivers, tuning

**Desvantagens:**
- Custo inicial elevado (hardware + hosting)
- Manutenção de hardware sob responsabilidade própria
- Escalabilidade limitada

#### Cloud (AWS/Azure/GCP)

**Vantagens:**
- Escalabilidade elástica
- Sem preocupação com hardware
- Pay-as-you-go
- Serviços gerenciados (banco de dados, mensageria, etc.)
- AWS região São Paulo (sa-east-1) disponível

**Desvantagens:**
- Pacotes se movem por NIC virtual + hypervisor (hops extras)
- Jitter e tail latency imprevisíveis
- CPU steal em instâncias compartilhadas
- Custo a longo prazo pode ser superior
- Brokerages na nuvem já foram arbitradas por latência de price feeds

**Tendência 2025-2026:** Relatório de 2025 indica que 69% das empresas estão considerando mover workloads de volta para ambientes privados (cloud repatriation), especialmente para cargas de trabalho sensíveis a latência.

#### Recomendação por Caso de Uso

| Caso de Uso | Recomendação | Justificativa |
|-------------|-------------|---------------|
| HFT / Ultra-low latency | Colocation (Equinix SP3) | Cada microsegundo importa |
| Day trading automatizado | Bare metal (São Paulo) | Latência previsível, custo razoável |
| Swing trading / Position | Cloud (AWS sa-east-1) | Latência de ms é aceitável, escalável |
| Backtesting / Research | Cloud (spot instances) | Custo otimizado, cargas intermitentes |
| Data pipeline / ETL | Cloud + Object Storage | Escalável, econômico para volume |

### 7.3 Arquitetura de Rede Low-Latency

**Otimizações de rede para trading:**
- **Kernel bypass:** DPDK, Solarflare OpenOnload para bypass do kernel TCP/IP stack
- **FPGA:** Placas FPGA para processamento de mensagens FIX/SBE em hardware
- **NIC tuning:** RSS (Receive Side Scaling), interrupt coalescing, pinning de IRQ
- **CPU pinning:** Isolamento de cores para threads críticas de trading
- **Huge pages:** Uso de huge pages para reduzir TLB misses
- **NUMA awareness:** Alinhamento de memória com topologia NUMA

---

## 8. Armazenamento de Dados

### 8.1 Time-Series Databases - Comparativo

Para armazenamento de dados de mercado (tick data, OHLCV, indicadores), time-series databases são essenciais.

#### QuestDB

**Características:**
- Open source (Apache License 2.0)
- Projetado do zero para máxima performance
- Linguagem SQL (facilitando adoção)
- ASOF JOIN nativo (essencial para dados financeiros)
- Suporte nativo a Parquet e Iceberg

**Performance (benchmarks):**
- 12-36x mais rápido que InfluxDB 3 Core para ingestão
- 43-418x mais rápido para queries analíticas complexas
- 6.5x throughput de ingestão superior ao TimescaleDB

**Prós:**
- Performance excepcional para ingestão e queries
- ASOF JOIN (critical para join por timestamp mais próximo em dados financeiros)
- SQL nativo
- Suporte a Parquet/Iceberg para data lake

**Contras:**
- Ecossistema menor que PostgreSQL
- Menos integrações que TimescaleDB
- Comunidade menor

#### TimescaleDB

**Características:**
- Extensão do PostgreSQL (não standalone)
- Compatibilidade total com ecossistema PostgreSQL
- Hypertables para particionamento automático por tempo
- Continuous aggregates para materialização de queries

**Performance:**
- Mais lento que QuestDB para ingestão e queries puras
- Compensa com ecossistema PostgreSQL completo

**Prós:**
- Compatibilidade total com PostgreSQL (SQL, drivers, ferramentas, ORMs)
- Facilidade de adoção para times que já usam PostgreSQL
- Ecossistema maduro
- Backups, replicação e HA do PostgreSQL

**Contras:**
- **Não suporta ASOF JOIN** (limitação significativa para dados financeiros)
- Performance inferior a QuestDB para cargas de trabalho puras de time-series
- Overhead do PostgreSQL para operações simples

#### InfluxDB 3.0

**Características:**
- Redesign completo lançado em abril 2025
- InfluxDB 3 Core (gratuito) com limitações: 72h de retenção, 5 databases
- Versão Enterprise sem limitações

**Prós:**
- Ecossistema maduro e bem documentado
- Telegraf para ingestão de múltiplas fontes
- Linguagem Flux para queries

**Contras:**
- Core gratuito severamente limitado (72h retenção)
- Performance inferior a QuestDB
- Linguagem Flux tem curva de aprendizado
- Lock-in de fornecedor

#### Comparativo Resumido

| Critério | QuestDB | TimescaleDB | InfluxDB 3 |
|----------|---------|-------------|------------|
| **Ingestão** | Excelente | Boa | Boa |
| **Queries analíticas** | Excelente | Boa | Mediana |
| **ASOF JOIN** | Sim | Nao | Nao |
| **SQL** | Sim | Sim (PostgreSQL) | Nao (Flux/SQL) |
| **Ecossistema** | Crescendo | Maduro (PG) | Maduro |
| **Custo** | Open source | Open source + pago | Core limitado + pago |
| **Para dados financeiros** | Recomendado | Alternativa solida | Nao recomendado |

### 8.2 Formatos de Armazenamento: Parquet, Arrow, Iceberg

#### Apache Parquet

Formato colunar para armazenamento em disco, padrão para data lakes modernos.

**Características:**
- Compressão colunar eficiente (Snappy, Gzip, Zstd)
- Predicate pushdown para queries eficientes
- Suporte a schema evolution
- Criptografia colunar (compliance com LGPD/regulação)

**Best practices para dados financeiros:**
- Particionamento por data (year/month/day)
- Compressão Snappy para leitura rápida, Zstd para melhor compressão
- Arquivos de 100MB-1GB para balanço entre performance e overhead de metadados
- Ideal para dados históricos e backtesting

#### Apache Arrow

Formato colunar para processamento em memória.

**Características:**
- Zero-copy sharing entre Spark, Dremio, DuckDB
- Interoperabilidade entre engines de processamento
- Low-latency experience para queries analíticas
- Base para ecossistema lakehouse moderno

#### Apache Iceberg

Table format para data lakes, sobre Parquet.

**Características:**
- ACID transactions sobre object storage
- Time travel (versionamento de dados)
- Schema evolution
- Partition evolution

#### Arquitetura Recomendada de Data Lake

```
Dados tick-by-tick → QuestDB (hot, real-time, últimos 30-90 dias)
                  ↓ (export periódico)
              Parquet files (warm, particionados por data)
                  ↓ (catalogados via)
              Apache Iceberg (cold, histórico completo)
                  ↓ (acessados por)
              DuckDB / Spark / Python (backtesting, research)
```

---

## 9. Ferramentas e Frameworks

### 9.1 MetaTrader 5 (MT5) para B3

O MetaTrader 5 tem conectividade com a B3 via gateway da Cedro Technologies.

**Características:**
- Disponível via corretoras credenciadas pela B3
- Suporte a robôs de trading (Expert Advisors)
- Linguagem MQL5 para programação de estratégias
- Integração com Python via biblioteca `MetaTrader5`

**Horário de operação B3:** 09:00-18:00

**Ativos disponíveis:**
- Mini-índice (WIN)
- Mini-dólar (WDO)
- Ações
- Opções

**Prós:**
- Plataforma madura e estável
- Grande comunidade (MQL5.com)
- Integração Python nativa
- Backtesting integrado
- Extenso marketplace de robôs e indicadores

**Contras:**
- Gateway via terceiro (Cedro) pode ter latência adicional
- MQL5 é linguagem proprietária
- Menos flexível que frameworks Python puros
- Limitações de dados históricos

### 9.2 Profit Chart API / ProfitDLL (Nelogica)

Descrito na seção 1.3. Resumo:
- DLL nativa para Delphi, C, Python
- Dados tick-by-tick até 90 dias
- Market Data + Order Routing
- Linguagem NTSL para estratégias
- Integração nativa com plataforma mais popular do Brasil

### 9.3 Backtrader

Framework Python open source para backtesting.

**Características:**
- Interface limpa e Pythonic
- Execução local (sem dependência de cloud)
- Integração com brokers para live trading (IB, OANDA, Alpaca)
- Múltiplos data feeds simultâneos
- Analyzers, observers, sizers customizáveis

**Adaptação para Brasil:**
- Necessário custom data feed para B3
- Dados via brapi.dev, Yahoo Finance (.SA), ou CSV da CVM
- Sem integração nativa com corretoras brasileiras
- Custos de transação brasileiros (emolumentos, corretagem) devem ser configurados manualmente

**Prós:**
- Open source e bem mantido
- Flexibilidade total
- Comunidade ativa
- Bom para swing/position trading

**Contras:**
- Sem integração nativa com B3
- Performance limitada para grandes datasets
- Sem suporte nativo a order book replay

### 9.4 QuantConnect (Lean Engine)

Plataforma cloud-based de trading algorítmico baseada no engine open source Lean.

**Características:**
- Engine Lean é open source (C#)
- Cloud IDE com backtesting
- Suporte a equities, futures, forex, crypto
- Live trading via IntBrokers, OANDA, GDAX
- Datasets integrados

**Adaptação para Brasil:**
- Sem dados nativos da B3
- Necessário custom data feed
- Lean pode ser rodado localmente com dados brasileiros
- Sem integração direta com corretoras brasileiras

**Prós:**
- Engine sofisticado e escalável
- Cloud IDE com backtesting rápido
- Open source (Lean pode ser modificado)
- Comunidade ativa de quants

**Contras:**
- Ecossistema focado em mercados norte-americanos
- Integração com Brasil requer trabalho significativo
- C# como linguagem principal (menos popular que Python no Brasil)

### 9.5 Zipline / Zipline-Reloaded

Framework de backtesting originalmente desenvolvido pela Quantopian.

**Status:** Zipline original descontinuou live trading em 2017. **Zipline-Reloaded** é o fork mantido pela comunidade.

**Adaptação para Brasil:**
- Necessário implementar `BundleIngest` para dados da B3
- Sem calendário de trading brasileiro nativo (implementável via `exchange_calendars`)
- Sem integração com corretoras brasileiras

**Prós:**
- Popularizado pela Quantopian
- Integração com Pyfolio para análise de performance
- Modelo de dados robusto

**Contras:**
- Projeto original descontinuado
- Fork community pode ter instabilidades
- Configuração trabalhosa para mercado brasileiro

### 9.6 Comparativo de Frameworks

| Framework | Linguagem | B3 Nativa | Live Trading BR | Backtesting | Comunidade |
|-----------|-----------|-----------|-----------------|-------------|------------|
| **MetaTrader 5** | MQL5/Python | Sim (via Cedro) | Sim | Integrado | Grande |
| **Profit/NTSL** | NTSL/Python | Sim (nativo) | Sim | Integrado | Grande (BR) |
| **Backtrader** | Python | Nao | Nao | Excelente | Grande |
| **QuantConnect** | C#/Python | Nao | Nao | Excelente | Grande |
| **Zipline** | Python | Nao | Nao | Bom | Declinando |

---

## 10. Web Scraping e Dados Alternativos

### 10.1 Aspectos Legais do Web Scraping no Brasil

#### LGPD e Web Scraping

A Lei Geral de Protecao de Dados (LGPD) tem impacto direto sobre atividades de web scraping no Brasil:

**Posicionamento da ANPD (2024-2025):**
- A ANPD afirmou expressamente (Radar Tecnológico n. 3, novembro 2024) que web scraping é uma forma de **tratamento de dados pessoais** sujeita à LGPD
- "Dados pessoais de acesso público nao dispensam o cumprimento das normas de protecao de dados"
- Coleta deve considerar a mesma **finalidade** que levou à divulgacao dos dados
- O assunto entrou na **Agenda Regulatória da ANPD para 2025**, com pelo menos 3 acoes de fiscalizacao planejadas

**Principios que devem ser observados:**
1. **Finalidade:** Coleta deve ter propósito legítimo e informado
2. **Necessidade:** Coletar apenas dados estritamente necessários
3. **Transparencia:** Informar sobre o tratamento dos dados
4. **Nao discriminacao:** Nao usar dados para fins discriminatórios

**Recomendacoes práticas para compliance:**
- Preferir APIs oficiais sobre web scraping sempre que possível
- Para dados financeiros públicos (CVM, BCB, IBGE), usar portais de dados abertos
- Evitar scraping de dados pessoais (nomes de gestores, etc.)
- Respeitar `robots.txt` e termos de uso dos sites
- Documentar a base legal para cada coleta de dados

#### Marco Civil da Internet

Além da LGPD, o Marco Civil da Internet pode ser aplicável, especialmente quanto a:
- Respeito aos termos de uso dos sites
- Proibicao de acesso nao autorizado
- Direitos autorais sobre bases de dados

### 10.2 Fontes para Web Scraping

#### B3 (www.b3.com.br)

**Dados scrapáveis:**
- Cotacoes históricas (www.b3.com.br/pt_br/market-data-e-indices/)
- Boletins diários
- Dados de derivativos (opcoes, futuros)
- Composicao de índices (IBOV, IFIX, SMLL)
- Eventos corporativos

**Recomendacao:** Preferir os canais oficiais da B3 (Market Data Platform, arquivos CSV downloadáveis) ao scraping direto.

#### CVM (dados.cvm.gov.br)

**Melhor prática:** Usar o portal de dados abertos da CVM (dados.cvm.gov.br) e FTP oficial em vez de scraping do ENET. O FTP da CVM é confiável e rápido (10 anos de dados de todas as companhias em menos de 10 minutos).

#### Fundamentus / StatusInvest

**Técnicas de scraping:**
- BeautifulSoup + Requests (Python)
- Selenium para conteúdo dinâmico
- APIs nao-oficiais disponíveis no GitHub

**Risco:** Sites podem mudar estrutura HTML a qualquer momento, quebrando scrapers.

#### InfoMoney e Valor Economico

**Dados de interesse:**
- Notícias e análises
- Recomendacoes de analistas
- Dados de consenso de mercado

**Aspectos legais:**
- Conteúdo protegido por direitos autorais
- Muitos artigos sao paywall
- Scraping de notícias para NLP/sentiment analysis é área cinzenta
- Recomendado usar feeds RSS quando disponíveis

### 10.3 Dados Alternativos e NLP

#### Sentiment Analysis para Mercado Brasileiro

**Estado da arte:**
- Apenas 3 estudos (de 100+ revisados) usam dados do mercado brasileiro para sentiment analysis, indicando grande lacuna de pesquisa e oportunidade
- Modelos pre-treinados em ingles (FinBERT) precisam de adaptacao para português

**Ferramentas:**
- **FinBERT:** Pre-trained NLP model para sentiment de texto financeiro (ingles)
- **BERTimbau:** BERT pre-treinado em português (base para fine-tuning financeiro)
- **Transformers (HuggingFace):** Framework para carregar e fine-tunar modelos

**Fontes de dados para sentiment:**
- Twitter/X (posts sobre acoes, mercado)
- Fóruns de investimento (Bastter, Club FII)
- Notícias (InfoMoney, Valor Economico, Bloomberg Brasil)
- Comunicados de empresas via CVM/ENET

**Dados alternativos relevantes para Brasil:**
- Dados de tráfego de shoppings (consumo)
- Dados de transacoes via PIX (atividade economica)
- Imagens de satélite de portos e terminais (exportacoes)
- Dados de emprego via CAGED
- Índice de Confianca do Consumidor (FGV)

---

## 11. Arquitetura Recomendada

### 11.1 Arquitetura para Bot de Investimentos de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE DADOS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │  Market Data │  │  Fundamental │  │    Macroeconômico        │   │
│  │             │  │              │  │                           │   │
│  │ - Cedro WS  │  │ - CVM Dados  │  │ - BCB SGS               │   │
│  │ - brapi.dev │  │   Abertos    │  │ - Focus API              │   │
│  │ - B3 UMDF   │  │ - brapi.dev  │  │ - IBGE SIDRA            │   │
│  │ - MT5 API   │  │ - Fundamentus│  │ - Tesouro Transparente  │   │
│  │             │  │              │  │ - IPEADATA               │   │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬─────────────┘   │
│         │                │                        │                 │
├─────────┼────────────────┼────────────────────────┼─────────────────┤
│         ▼                ▼                        ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               DATA INGESTION LAYER                           │   │
│  │                                                               │   │
│  │  - Apache Kafka / Redis Streams (real-time)                  │   │
│  │  - Celery / Airflow (batch ETL)                              │   │
│  │  - Custom collectors (scrapers, API pollers)                 │   │
│  └──────────────────────┬────────────────────────────────────────┘   │
│                         │                                           │
├─────────────────────────┼───────────────────────────────────────────┤
│                         ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               STORAGE LAYER                                   │   │
│  │                                                               │   │
│  │  HOT:  QuestDB (tick data real-time, últimos 90 dias)        │   │
│  │  WARM: PostgreSQL + TimescaleDB (OHLCV diário, indicadores) │   │
│  │  COLD: Parquet/Iceberg no S3 (histórico completo)           │   │
│  │  CACHE: Redis (cotações atuais, book snapshot)               │   │
│  └──────────────────────┬────────────────────────────────────────┘   │
│                         │                                           │
├─────────────────────────┼───────────────────────────────────────────┤
│                         ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               ANALYTICS & STRATEGY LAYER                      │   │
│  │                                                               │   │
│  │  - Backtrader / Custom engine (backtesting)                  │   │
│  │  - Pandas / Polars (análise de dados)                        │   │
│  │  - scikit-learn / PyTorch (ML models)                        │   │
│  │  - FinBERT / BERTimbau (NLP sentiment)                       │   │
│  │  - TA-Lib / pandas-ta (indicadores técnicos)                │   │
│  └──────────────────────┬────────────────────────────────────────┘   │
│                         │                                           │
├─────────────────────────┼───────────────────────────────────────────┤
│                         ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               EXECUTION LAYER                                 │   │
│  │                                                               │   │
│  │  - Cedro FIX 4.4 / REST / WebSocket (order routing)         │   │
│  │  - ProfitDLL (via Nelogica)                                  │   │
│  │  - MT5 API (via Cedro gateway)                               │   │
│  │  - Risk management engine (pré-trade checks)                │   │
│  │  - Order management system (OMS)                             │   │
│  └──────────────────────┬────────────────────────────────────────┘   │
│                         │                                           │
├─────────────────────────┼───────────────────────────────────────────┤
│                         ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               MONITORING & OPERATIONS                         │   │
│  │                                                               │   │
│  │  - Grafana (dashboards de performance e risco)               │   │
│  │  - Prometheus (métricas de sistema)                          │   │
│  │  - ELK Stack (logs centralizados)                            │   │
│  │  - PagerDuty/Alertmanager (alertas)                          │   │
│  │  - Telegram/Discord Bot (notificações de trades)            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Stack Tecnológico Recomendado por Perfil

#### Perfil 1: Trader Individual / Pequena Operação

| Componente | Recomendação | Custo Mensal |
|------------|-------------|--------------|
| Market Data | brapi.dev Pro + Yahoo Finance | R$ 150-300 |
| Fundamentalista | CVM Dados Abertos + brapi.dev | R$ 0 (incluído acima) |
| Macro | BCB SGS + IBGE SIDRA | R$ 0 |
| Execução | MT5 via Clear/XP (Cedro) | R$ 0-200 |
| Backtesting | Backtrader (local) | R$ 0 |
| Database | PostgreSQL + QuestDB (local) | R$ 0 |
| Infraestrutura | PC local + VPS básica | R$ 100-300 |
| **Total** | | **R$ 250-800/mês** |

#### Perfil 2: Operação Profissional / Gestora Pequena

| Componente | Recomendação | Custo Mensal |
|------------|-------------|--------------|
| Market Data | Cedro REST/WebSocket | R$ 1.000-3.000 |
| Fundamentalista | CVM + brapi.dev + Economatica | R$ 3.000-8.000 |
| Macro | BCB + IBGE + Focus | R$ 0 |
| Execução | Cedro FIX 4.4 via corretora | R$ 2.000-5.000 |
| Backtesting | QuantConnect Lean (local) | R$ 0 |
| Database | QuestDB + TimescaleDB (cloud) | R$ 500-2.000 |
| Infraestrutura | AWS/Azure (São Paulo) | R$ 2.000-5.000 |
| Monitoring | Grafana Cloud | R$ 200-500 |
| **Total** | | **R$ 8.700-23.500/mês** |

#### Perfil 3: Operação Institucional / HFT

| Componente | Recomendação | Custo Mensal |
|------------|-------------|--------------|
| Market Data | B3 UMDF Binary (direto) | R$ 10.000-50.000 |
| Fundamentalista | Bloomberg / LSEG | R$ 10.000-20.000 |
| Macro | Bloomberg + BCB | R$ 0 (incl. Bloomberg) |
| Execução | B3 Binary Gateway (DMA 4) | R$ 5.000-15.000 |
| Backtesting | Engine proprietário | R$ 0 (desenvolvimento interno) |
| Database | QuestDB + kdb+ | R$ 5.000-20.000 |
| Infraestrutura | Colocation Equinix SP3 | R$ 30.000-80.000 |
| Conectividade | TNS / BSO | R$ 5.000-15.000 |
| **Total** | | **R$ 65.000-200.000/mês** |

---

## 12. Tabela Comparativa de Custos

### 12.1 APIs de Market Data

| Fonte | Tipo | Latência | Custo Mensal (R$) | Ideal Para |
|-------|------|----------|-------------------|------------|
| B3 UMDF Binary | Oficial | Microsegundos | 10.000-50.000 | HFT, institucional |
| Bloomberg B-PIPE | Premium | Milissegundos | 10.000-20.000 | Institucional |
| LSEG Workspace | Premium | Milissegundos | 8.000-15.000 | Profissional |
| Cedro WebSocket | Profissional | Milissegundos | 1.000-3.000 | Profissional |
| CMA Data Feed | Profissional | Milissegundos | 1.000-5.000 | Profissional |
| brapi.dev Pro | Varejo | Segundos | 150-300 | Varejo, prototipagem |
| Yahoo Finance | Gratuito | Minutos | 0 | Hobby, backtesting |
| Alpha Vantage Free | Gratuito | Minutos | 0 | Prototipagem |

### 12.2 Dados Fundamentalistas

| Fonte | Custo | Qualidade | Facilidade de Uso | Histórico |
|-------|-------|-----------|-------------------|-----------|
| Bloomberg | R$ 10.000+/mês | Excelente | Alta | Desde 1980s |
| Economatica | R$ 2.000-10.000/mês | Excelente | Média | Desde 1986 |
| CVM Dados Abertos | Gratuito | Oficial/Bruto | Baixa (requer ETL) | Desde 2010 |
| brapi.dev Pro | R$ 150-300/mês | Boa | Alta | Desde 2009 |
| Fundamentus (scraping) | Gratuito | Boa | Média (scraping) | Últimos anos |
| StatusInvest (scraping) | Gratuito | Boa | Média (scraping) | Últimos anos |

### 12.3 Dados Macroeconômicos

| Fonte | Custo | Dados | API | Formato |
|-------|-------|-------|-----|---------|
| BCB SGS | Gratuito | Séries econômicas (milhares) | REST/JSON | JSON |
| BCB Focus | Gratuito | Expectativas de mercado | OData/REST | JSON |
| IBGE SIDRA | Gratuito | PIB, inflação, emprego | REST | JSON |
| IPEADATA | Gratuito | Séries macro/regionais | REST | JSON/CSV |
| Tesouro Transparente | Gratuito | Títulos públicos, fiscal | REST | JSON |

---

## 13. Referências

### Fontes Primárias - Provedores de Tecnologia

1. **Cedro Technologies** - API Trading e Market Data para B3.
   URL: https://www.cedrotech.com/apis/api-trading/
   Tipo: Documentação oficial de produto. Acesso: 2026.

2. **Cedro Technologies** - Roteamento de Ordens via API (B3/BM&F) em FIX.
   URL: https://www.cedrotech.com/blog/roteamento-de-ordens-via-api-b3-bmf-e-bovespa/
   Tipo: Artigo técnico do provedor. Acesso: 2026.

3. **Nelogica** - Ecossistema ProfitDLL e primeiros passos.
   URL: https://ajuda.nelogica.com.br/hc/pt-br/articles/22396517026203-Ecossistema-ProfitDLL-e-primeiros-passos
   Tipo: Documentação oficial de produto. Acesso: 2026.

4. **Nelogica** - API de dados da B3: Sua estratégia no piloto automático.
   URL: https://blog.nelogica.com.br/api-de-dados-da-b3/
   Tipo: Blog técnico do provedor. Acesso: 2026.

5. **BTG Pactual** - Portal de Desenvolvedores (Integrações e APIs).
   URL: https://empresas.btgpactual.com/developers
   Tipo: Portal de desenvolvedores. Acesso: 2026.

### Fontes Primárias - Bolsa e Reguladores

6. **B3** - UMDF (Unified Market Data Feed).
   URL: https://www.b3.com.br/en_us/solutions/platforms/puma-trading-system/for-developers-and-vendors/umdf-unified-market-data-feed/
   Tipo: Documentação oficial da bolsa. Acesso: 2026.

7. **B3** - Direct Market Access (DMA).
   URL: https://www.b3.com.br/en_us/non-resident-investor/how-to-get-connected-bm-fbovespa/direct-market-access-dma.htm
   Tipo: Documentação oficial da bolsa. Acesso: 2026.

8. **B3** - Binary Trading Gateway.
   URL: https://clientes.b3.com.br/en/w/binary-trading-gateway
   Tipo: Documentação técnica oficial. Acesso: 2026.

9. **CVM** - Portal de Dados Abertos.
   URL: https://dados.cvm.gov.br/
   Tipo: Portal oficial de dados governamentais. Acesso: 2026.

10. **CVM** - Cias Abertas: ITR (Informações Trimestrais).
    URL: https://dados.cvm.gov.br/dataset/cia_aberta-doc-itr
    Tipo: Dataset oficial. Acesso: 2026.

### Fontes Primárias - Dados Macroeconômicos

11. **Banco Central do Brasil** - Expectativas de Mercado (Focus) - API Endpoint OData.
    URL: https://dadosabertos.bcb.gov.br/dataset/expectativas-mercado/resource/7130de18-9052-452c-a8eb-a7dae25d1e2a
    Tipo: Documentação oficial de API. Acesso: 2026.

12. **Banco Central do Brasil** - Expectativas de Mercado - Swagger.
    URL: https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/swagger-ui2
    Tipo: Documentação de API (Swagger). Acesso: 2026.

13. **Tesouro Nacional** - APIs do Tesouro Nacional.
    URL: https://www.gov.br/tesouronacional/pt-br/central-de-conteudo/apis
    Tipo: Portal oficial de APIs governamentais. Acesso: 2026.

14. **IPEADATA** - Base de dados econômicos do IPEA.
    URL: https://www.ipeadata.gov.br/
    Tipo: Portal oficial de dados governamentais. Acesso: 2026.

### Fontes - APIs e Dados de Mercado

15. **brapi.dev** - API de ações da bolsa de valores brasileira.
    URL: https://brapi.dev/
    Tipo: Plataforma de API comercial. Acesso: 2026.

16. **brapi.dev** - Planos e Preços.
    URL: https://brapi.dev/pricing
    Tipo: Página de preços. Acesso: 2026.

17. **Dados de Mercado** - Documentação da API.
    URL: https://www.dadosdemercado.com.br/api/docs
    Tipo: Documentação de API. Acesso: 2026.

18. **Alpha Vantage** - Free Stock APIs in JSON & Excel.
    URL: https://www.alphavantage.co/
    Tipo: Plataforma de API. Acesso: 2026.

### Fontes - Infraestrutura e Colocation

19. **Equinix** - SP3 Data Center (São Paulo).
    URL: https://www.equinix.com/data-centers/americas-colocation/brazil-colocation/sao-paulo-data-centers/sp3
    Tipo: Página do datacenter. Acesso: 2026.

20. **TNS** - Colocation Services at Brazil's Largest Stock Exchange.
    BusinessWire, 2023.
    URL: https://www.businesswire.com/news/home/20231128373647/en/TNS-Establishes-Colocation-Services-at-Brazils-Largest-Stock-Exchange
    Tipo: Comunicado de imprensa. Acesso: 2026.

21. **BSO** - B3, Low Latency and the Search for Alpha.
    URL: https://www.bso.co/all-insights/b3-stock-exchange-low-latency-connectivity
    Tipo: Artigo de insight do provedor. Acesso: 2026.

22. **Avelacom** - Brazil-U.S. Low-Latency Route.
    Markets Media, 2024.
    URL: https://www.marketsmedia.com/avelacom-launches-brazil-u-s-low-latency-route/
    Tipo: Artigo jornalístico. Acesso: 2026.

### Fontes - Protocolos e SDKs

23. **OnixS** - B3 Binary UMDF SBE Market Data Handler SDK.
    URL: https://www.onixs.biz/b3-binary-umdf-sbe-feed-market-data-handler.html
    Tipo: Documentação de produto (SDK). Acesso: 2026.

24. **OnixS** - New B3 Binary UMDF Market Data and Order Entry.
    URL: https://www.onixs.biz/insights/new-b3-binary-umdf-market-data-feed-and-b3-binary-order-entry-platform-interfaces.-what-you-need-to-know
    Tipo: Artigo técnico. Acesso: 2026.

25. **Trading Technologies** - B3 Binary Protocol updates.
    URL: https://tradingtechnologies.com/support-updates/b3-binary-protocol-eurex-eex-t7-13-1-api-upgrade-and-more/
    Tipo: Atualização técnica de suporte. Acesso: 2026.

### Fontes - Time-Series Databases

26. **QuestDB** - Comparing InfluxDB, TimescaleDB, and QuestDB.
    URL: https://questdb.com/blog/comparing-influxdb-timescaledb-questdb-time-series-databases/
    Tipo: Artigo técnico comparativo. Acesso: 2026.

27. **RisingWave** - QuestDB vs TimescaleDB vs InfluxDB: Choosing the Best.
    URL: https://risingwave.com/blog/questdb-vs-timescaledb-vs-influxdb-choosing-the-best-for-time-series-data-processing/
    Tipo: Artigo técnico comparativo. Acesso: 2026.

28. **Timestored** - QuestDB 2025 - for Tick Data.
    URL: https://www.timestored.com/data/questdb-for-tick-data-2025
    Tipo: Análise técnica. Acesso: 2026.

### Fontes - Formatos de Dados

29. **Airbyte** - Understanding the Parquet Data Format: Benefits and Best Practices.
    URL: https://airbyte.com/data-engineering-resources/parquet-data-format
    Tipo: Artigo técnico educacional. Acesso: 2026.

30. **InfluxData** - Apache Arrow, Parquet, and Flight are a Game Changer.
    URL: https://www.influxdata.com/blog/apache-arrow-parquet-flight-and-their-ecosystem-are-a-game-changer-for-olap/
    Tipo: Artigo técnico. Acesso: 2026.

### Fontes - Frameworks e Backtesting

31. **Cedro Technologies** - MetaTrader no Brasil (BM&FBOVESPA).
    URL: https://www.cedrotech.com/blog/metatrader-no-brasil-bmfbovespa
    Tipo: Artigo técnico do provedor. Acesso: 2026.

32. **Asimov Academy** - Como baixar dados da B3 com MetaTrader5 e Python.
    URL: https://hub.asimov.academy/blog/como-baixar-dados-da-b3-com-metatrader-5-e-python/
    Tipo: Tutorial educacional. Acesso: 2026.

33. **AlgoTrading101** - Backtrader for Backtesting (Python) - A Complete Guide.
    URL: https://algotrading101.com/learn/backtrader-for-backtesting/
    Tipo: Tutorial educacional. Acesso: 2026.

### Fontes - Web Scraping e Aspectos Legais

34. **Assis e Mendes Advogados** - Web scraping e LGPD: riscos jurídicos do uso de dados públicos.
    URL: https://assisemendes.com.br/web-scraping-e-lgpd-riscos-juridicos-do-uso-de-dados-publicos/
    Tipo: Artigo jurídico. Acesso: 2026.

35. **Migalhas** - Os desafios jurídicos do web scraping.
    URL: https://www.migalhas.com.br/coluna/dados-publicos/378258/os-desafios-juridicos-do-web-scraping
    Tipo: Artigo jurídico. Acesso: 2026.

36. **Jus.com.br** - Web scraping e rastreio de dados à luz da LGPD.
    URL: https://jus.com.br/artigos/87950/web-sscraping-na-lei-geral-protecao-de-dados-pessoais
    Tipo: Artigo acadêmico jurídico. Acesso: 2026.

### Fontes - Sentiment Analysis e Dados Alternativos

37. **Tandfonline** - Analyzing the Brazilian Financial Market through Portuguese Sentiment Analysis in Social Media.
    Computational Intelligence, 2019.
    URL: https://www.tandfonline.com/doi/full/10.1080/08839514.2019.1673037
    Tipo: Artigo acadêmico peer-reviewed. Ano: 2019.

38. **ProsusAI** - FinBERT: Financial Sentiment Analysis with BERT.
    GitHub.
    URL: https://github.com/ProsusAI/finBERT
    Tipo: Repositório open source. Acesso: 2026.

39. **Datacenters.com** - Why Financial Firms Are Choosing Bare Metal for Low-Latency Trading.
    URL: https://www.datacenters.com/news/financial-services-are-quietly-choosing-bare-metal-for-low-latency-trading
    Tipo: Artigo de análise da indústria. Acesso: 2026.

40. **Servers.com** - Hosting Trading Infrastructure: Cloud vs Bare Metal vs Hybrid.
    URL: https://www.servers.com/news/blog/when-it-comes-to-hosting-trading-should-you-choose-dedicated-servers-or-the-cloud
    Tipo: Artigo técnico comparativo. Acesso: 2026.

### Fontes - Provedores de Dados Premium

41. **Bloomberg Brasil** - Serviço Bloomberg Professional.
    URL: https://www.bloomberg.com.br/
    Tipo: Página oficial do provedor. Acesso: 2026.

42. **LSEG** - Workspace (ex-Refinitiv Eikon).
    URL: https://www.lseg.com/en/data-analytics/products/workspace
    Tipo: Página oficial do produto. Acesso: 2026.

43. **Economatica** - Terminal.
    URL: https://www.economatica.com/terminal
    Tipo: Página oficial do produto. Acesso: 2026.

44. **CMA / Safras** - Data Feed.
    URL: https://pagina.safras.com.br/datafeed
    Tipo: Página oficial do produto. Acesso: 2026.

### Projetos Open Source (GitHub)

45. **phoemur/fundamentus** - API Python para análise fundamentalista BOVESPA.
    URL: https://github.com/phoemur/fundamentus
    Tipo: Repositório open source.

46. **feliperafael/fundamentus-data-scraping** - Extração de indicadores fundamentalistas.
    URL: https://github.com/feliperafael/fundamentus-data-scraping
    Tipo: Repositório open source.

47. **Iuryck/Fundamentus_API** - API não-oficial para Fundamentus (requests + bs4).
    URL: https://github.com/Iuryck/Fundamentus_API
    Tipo: Repositório open source.

---

## Apêndice A: Glossário de Termos Técnicos

| Termo | Definição |
|-------|-----------|
| **DMA** | Direct Market Access - acesso direto ao matching engine da bolsa |
| **FIX** | Financial Information eXchange - protocolo padrão de comunicação financeira |
| **SBE** | Simple Binary Encoding - formato binário de baixa latência |
| **UMDF** | Unified Market Data Feed - canal de dados de mercado da B3 |
| **L1/L2** | Level 1 (top of book) / Level 2 (full depth) |
| **OHLCV** | Open, High, Low, Close, Volume - dados de candles |
| **OMS** | Order Management System - sistema de gestão de ordens |
| **ASOF JOIN** | Join por timestamp mais próximo (essencial para dados financeiros) |
| **PTAX** | Taxa de câmbio referencial do Banco Central |
| **Selic** | Taxa básica de juros da economia brasileira |
| **ITR** | Informações Trimestrais (CVM) |
| **DFP** | Demonstrações Financeiras Padronizadas (CVM) |
| **FCA** | Formulário Cadastral (CVM) |
| **NTSL** | Nelogica Trading System Language |

## Apêndice B: Checklist de Implementação

### Fase 1: Prototipagem (Semanas 1-4)
- [ ] Configurar ambiente Python com bibliotecas essenciais
- [ ] Criar conta gratuita na brapi.dev e testar endpoints
- [ ] Configurar coleta de dados do BCB SGS e Focus
- [ ] Implementar coleta de dados da CVM (ITR/DFP)
- [ ] Configurar PostgreSQL local para armazenamento
- [ ] Implementar primeiro backtest com Backtrader

### Fase 2: Desenvolvimento (Semanas 5-12)
- [ ] Integrar com Cedro Technologies (teste de 7 dias)
- [ ] Configurar QuestDB para dados tick-by-tick
- [ ] Implementar pipeline de ingestão (Kafka ou Redis)
- [ ] Desenvolver estratégias e modelos de ML
- [ ] Implementar risk management engine
- [ ] Configurar Grafana para monitoramento

### Fase 3: Produção (Semanas 13-20)
- [ ] Contratar API de market data (Cedro ou equivalente)
- [ ] Configurar VPS/bare metal em São Paulo
- [ ] Implementar OMS com circuit breakers
- [ ] Paper trading por mínimo 4 semanas
- [ ] Migrar para produção com capital real (gradual)
- [ ] Configurar alertas e notificações

---

*Documento atualizado em Fevereiro de 2026. Os preços e funcionalidades descritos podem ter sofrido alterações desde a última verificação. Recomenda-se contato direto com os provedores para informações atualizadas de precificação.*
