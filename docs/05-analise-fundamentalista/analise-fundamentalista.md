# Analise Fundamentalista Automatizada para o Mercado Brasileiro

## Pesquisa Abrangente para Bot de Investimentos de Alto Nivel

---

## Sumario

1. [Modelos de Valuation](#1-modelos-de-valuation)
2. [Multiplos e Screening Quantitativo](#2-multiplos-e-screening-quantitativo)
3. [Analise de Demonstracoes Financeiras](#3-analise-de-demonstracoes-financeiras)
4. [Modelos Quantitativos Fundamentalistas](#4-modelos-quantitativos-fundamentalistas)
5. [Analise Setorial](#5-analise-setorial)
6. [Integracao de Dados Macroeconomicos](#6-integracao-de-dados-macroeconomicos)
7. [Fontes de Dados Fundamentalistas](#7-fontes-de-dados-fundamentalistas)
8. [NLP para Analise de Relatorios](#8-nlp-para-analise-de-relatorios)
9. [Consensus e Earnings Surprise](#9-consensus-e-earnings-surprise)
10. [Value Investing Quantitativo](#10-value-investing-quantitativo)
11. [Arquitetura de Automacao](#11-arquitetura-de-automacao-proposta)
12. [Referencias Completas](#12-referencias-completas)

---

## 1. Modelos de Valuation

### 1.1 DCF (Discounted Cash Flow) Adaptado ao Brasil

O Fluxo de Caixa Descontado e o modelo mais robusto para valuation intrinseco, mas sua aplicacao no Brasil exige ajustes criticos para capturar o risco-pais e a volatilidade inerente a mercados emergentes.

#### 1.1.1 Taxa de Desconto com Risco-Pais

A formula adaptada do CAPM para o Brasil segue a estrutura:

```
Ke = Rf + Beta * ERP_maduro + CRP_Brasil
```

Onde:
- **Rf** = Taxa livre de risco (US Treasury 10Y, tipicamente 4.0-4.5% em 2025)
- **Beta** = Beta alavancado do ativo em relacao ao mercado
- **ERP_maduro** = Equity Risk Premium de mercado maduro (~4.5-5.5%, conforme Damodaran 2025)
- **CRP_Brasil** = Country Risk Premium do Brasil

**Calculo do CRP (metodologia Damodaran):**

```
CRP = Default Spread_soberano * (Sigma_equity / Sigma_bond)
```

Damodaran estima o CRP multiplicando o spread de default soberano pela volatilidade relativa do mercado de acoes em relacao ao mercado de titulos. Para o Brasil, historicamente o CRP tem se situado entre 2.5% e 5.5%, dependendo do momento economico e politico. Em janeiro de 2026, Damodaran atualizou os dados de risco-pais, disponibilizados em sua pagina da NYU Stern.

**Alternativa: CAPM Local**

Alguns praticantes preferem usar o CAPM local:

```
Ke = SELIC + Beta_local * (E[Rm_Ibovespa] - SELIC)
```

Esta abordagem tem a vantagem de capturar diretamente o custo de oportunidade em reais, mas sofre com a instabilidade historica da SELIC e com a dificuldade de estimar o premio de risco do Ibovespa de forma confiavel. Pesquisa do Banco Central do Brasil (Working Paper 527) documentou que o premio de risco de acoes no Brasil entre 1968 e 2019 tem media aritmetica de 20.1% ao ano, com desvio padrao de 67% -- uma volatilidade extrema que torna projecoes delicadas.

#### 1.1.2 Projecao de Fluxos de Caixa

Para automacao, o bot deve implementar:

1. **Projecao de receitas**: baseada em crescimento historico, guidance da empresa, dados setoriais e consenso de mercado
2. **Margens operacionais**: convergencia para margens setoriais de longo prazo
3. **CAPEX e Capital de Giro**: modelagem baseada em percentual da receita com ajustes ciclicos
4. **Taxa de crescimento terminal (g)**: limitada ao crescimento nominal do PIB brasileiro (tipicamente 6-8% nominal, ou 2-3% real + inflacao)
5. **Perpetuidade**: Gordon Growth aplicado ao FCFF ou FCFE terminal

```python
# Pseudocodigo para DCF automatizado
def dcf_brazil(empresa):
    # Coletar dados financeiros historicos (5-10 anos)
    historico = coletar_dados_cvm(empresa.cvm_code)

    # Projetar fluxos de caixa (5-10 anos)
    fcf_projetado = projetar_fluxos(historico, premissas_setoriais)

    # Calcular WACC com CRP
    ke = rf_usd + beta * erp_maduro + crp_brasil
    kd = custo_divida_pos_ir(empresa)
    wacc = ke * (E/(D+E)) + kd * (D/(D+E))

    # Descontar fluxos + valor terminal
    valor_presente = sum(fcf_t / (1 + wacc)**t for t in range(1, n+1))
    valor_terminal = fcf_terminal * (1 + g) / (wacc - g)
    valor_terminal_presente = valor_terminal / (1 + wacc)**n

    enterprise_value = valor_presente + valor_terminal_presente
    equity_value = enterprise_value - divida_liquida
    preco_justo = equity_value / acoes_em_circulacao

    return preco_justo
```

#### 1.1.3 Sensibilidade e Monte Carlo

Para um bot de alto nivel, e essencial implementar:

- **Analise de sensibilidade**: variando WACC (+/- 1-2pp) e g (+/- 0.5-1pp) para gerar faixa de preco justo
- **Simulacao de Monte Carlo**: distribuicoes probabilisticas para cada premissa, gerando distribuicao de precos justos com intervalos de confianca

### 1.2 Dividend Discount Model (DDM) e Gordon Growth

O DDM e particularmente relevante no Brasil por conta da forte cultura de dividendos, impulsionada pela obrigatoriedade legal de distribuicao minima de 25% do lucro liquido ajustado (Lei das S.A.).

**Modelo de Gordon:**

```
P0 = D1 / (Ke - g)
```

Onde:
- D1 = dividendo esperado para o proximo periodo
- Ke = custo de capital proprio (CAPM ajustado)
- g = taxa de crescimento sustentavel dos dividendos

**Desafios no Brasil:**
- Taxas de juros altas (SELIC a 15% em 2025) tornam o denominador (Ke - g) muito sensivel
- Politicas de dividendos erraticas em muitas empresas
- JCP (Juros sobre Capital Proprio) como beneficio fiscal deve ser incluido no yield total
- Modelo mais adequado para utilities, bancos e empresas maduras

**Modelo Multi-Estagio:**
Para empresas em crescimento, usar DDM de 2 ou 3 estagios:
1. **Estagio 1 (3-5 anos)**: crescimento acelerado baseado em guidance
2. **Estagio 2 (5-10 anos)**: convergencia gradual para crescimento sustentavel
3. **Estagio 3 (perpetuidade)**: crescimento igual ao PIB nominal

### 1.3 Sum-of-the-Parts (SOTP)

O SOTP e critico para conglomerados brasileiros e empresas diversificadas. Consiste em avaliar cada segmento de negocio separadamente e somar os valores, subtraindo a divida corporativa.

**Aplicacoes no Brasil:**
- **Petrobras (PETR4)**: segmentos de E&P, Refino, Gas & Energia, cada um com drivers e multiplos distintos. Analise da Alpha Spread sugere valor intrinseco de ~R$55/acao via multiplos relativos, indicando subavaliacao
- **Holdings e Conglomerados**: Itausa (ITSA4), J&F, Cosan (CSAN3)
- **Empresas com ativos nao-operacionais**: terrenos, participacoes societarias

**Desconto de Holding:**
No Brasil, holdings tipicamente negociam com desconto de 10-30% sobre o NAV (Net Asset Value), devido a:
- Ineficiencia tributaria na estrutura
- Custos de holding (overhead)
- Falta de transparencia
- Liquidez reduzida

```python
def sotp_valuation(empresa):
    segmentos = obter_segmentos(empresa)
    valor_total = 0
    for seg in segmentos:
        # Avaliar cada segmento por multiplo setorial
        ev_ebitda_setor = obter_multiplo_setorial(seg.setor)
        valor_seg = seg.ebitda * ev_ebitda_setor
        valor_total += valor_seg

    # Ajustes
    valor_total -= empresa.divida_liquida
    valor_total += empresa.caixa_excedente
    valor_total += empresa.participacoes_avaliadas_separadamente

    # Aplicar desconto de holding se aplicavel
    if empresa.is_holding:
        valor_total *= (1 - DESCONTO_HOLDING)

    return valor_total / empresa.acoes_circulacao
```

---

## 2. Multiplos e Screening Quantitativo

### 2.1 Multiplos Fundamentais -- Definicoes e Benchmarks Brasileiros

O screening por multiplos e a abordagem mais eficiente para triagem inicial em um universo de mais de 400 empresas listadas na B3.

#### 2.1.1 Price-to-Earnings (P/L ou P/E)

```
P/E = Preco por Acao / Lucro por Acao (LPA)
```

**Benchmarks Brasil:**
- Ibovespa historico: 8x-14x (media de ~10x-12x, significativamente abaixo do S&P 500 que negocia a 18x-22x)
- Bancos: 5x-9x
- Utilities: 6x-10x
- Varejo: 10x-25x (alta dispersao)
- Tecnologia: 15x-40x+

**Consideracoes para automacao:**
- Usar P/E forward (baseado em estimativas de lucro futuro) quando disponivel
- Excluir empresas com P/E negativo ou >100 (distorcoes)
- Ajustar para itens nao-recorrentes

#### 2.1.2 Price-to-Book (P/VPA ou P/B)

```
P/B = Preco por Acao / Valor Patrimonial por Acao
```

**Benchmarks Brasil:**
- Ibovespa: 1.2x-2.0x
- Bancos: 0.8x-2.5x (ROE e driver principal)
- Utilities: 0.8x-1.5x
- Commodities: 1.0x-2.0x
- Varejo: 1.5x-5.0x

**Regra de Graham adaptada**: P/B < 1.5 E P/E < 15, ou P/B * P/E < 22.5

#### 2.1.3 EV/EBITDA

```
EV/EBITDA = (Market Cap + Divida Liquida) / EBITDA
```

**Benchmarks Brasil (dados Economatica/XP 2024):**
- Ibovespa agregado: 5x-8x
- Bancos: N/A (metrica nao aplicavel)
- Utilities/Energia: 5x-8x
- Commodities/Mineracao: 3x-6x
- Varejo: 6x-12x
- Tecnologia: 8x-15x+
- Saude: 7x-12x
- Construcao: 5x-9x

A XP Investimentos publica semanalmente uma tabela de multiplos atualizada para acoes sob cobertura.

#### 2.1.4 Outros Multiplos Relevantes

| Multiplo | Formula | Uso Principal |
|----------|---------|---------------|
| **P/Sales** | Market Cap / Receita Liquida | Empresas pre-lucro, alto crescimento |
| **EV/Receita** | EV / Receita Liquida | Comparacao setorial sem efeito de margens |
| **Dividend Yield** | DPA / Preco | Renda, utilities, bancos |
| **P/FCF** | Preco / FCF por acao | Qualidade real de geracao de caixa |
| **EV/FCF** | EV / FCF | Valuation conservador |

#### 2.1.5 Metricas de Rentabilidade

| Metrica | Formula | Benchmark Brasil |
|---------|---------|------------------|
| **ROE** | Lucro Liquido / PL | >15% e bom; >20% e excelente |
| **ROIC** | NOPAT / Capital Investido | >WACC indica criacao de valor |
| **Margem Liquida** | LL / Receita | Varia muito por setor |
| **Margem EBITDA** | EBITDA / Receita | 20-30% e robusto para industria |

O ROE e o indicador mais usado na analise fundamentalista brasileira para medir rentabilidade. Porem, como ressaltado pela literatura, o ROE ignora o capital de terceiros, podendo mascarar empresas altamente alavancadas. O ROIC e mais completo por considerar o capital total investido, incluindo divida.

### 2.2 Sistema de Screening Automatizado

```python
class FundamentalScreener:
    """
    Sistema de screening multi-criterio para acoes brasileiras.
    """

    def __init__(self, universo='ibovespa'):
        self.dados = carregar_dados_fundamentalistas(universo)

    def screen_value(self):
        """Filtro de valor classico"""
        return self.dados[
            (self.dados['P/E'] > 0) & (self.dados['P/E'] < 12) &
            (self.dados['P/B'] < 1.5) &
            (self.dados['EV/EBITDA'] < 7) &
            (self.dados['dividend_yield'] > 0.04) &
            (self.dados['ROE'] > 0.12)
        ]

    def screen_quality(self):
        """Filtro de qualidade"""
        return self.dados[
            (self.dados['ROE'] > 0.15) &
            (self.dados['ROIC'] > 0.12) &
            (self.dados['margem_liquida'] > 0.10) &
            (self.dados['divida_liquida_ebitda'] < 2.5) &
            (self.dados['crescimento_receita_5y'] > 0.05)
        ]

    def screen_growth(self):
        """Filtro de crescimento"""
        return self.dados[
            (self.dados['crescimento_receita_3y'] > 0.15) &
            (self.dados['crescimento_lucro_3y'] > 0.20) &
            (self.dados['margem_ebitda'] > 0.15) &
            (self.dados['ROE'] > 0.12)
        ]

    def composite_score(self, pesos=None):
        """
        Score composto multi-fator com normalizacao z-score.
        Combina value, quality e momentum.
        """
        if pesos is None:
            pesos = {'value': 0.4, 'quality': 0.35, 'momentum': 0.25}

        # Normalizar cada metrica em z-score
        z_pe = -zscore(self.dados['P/E'])          # Menor = melhor
        z_pb = -zscore(self.dados['P/B'])           # Menor = melhor
        z_ev_ebitda = -zscore(self.dados['EV/EBITDA'])  # Menor = melhor
        z_roe = zscore(self.dados['ROE'])           # Maior = melhor
        z_roic = zscore(self.dados['ROIC'])         # Maior = melhor
        z_dy = zscore(self.dados['dividend_yield']) # Maior = melhor

        value_score = (z_pe + z_pb + z_ev_ebitda + z_dy) / 4
        quality_score = (z_roe + z_roic) / 2

        composite = (pesos['value'] * value_score +
                     pesos['quality'] * quality_score)

        return composite.sort_values(ascending=False)
```

---

## 3. Analise de Demonstracoes Financeiras

### 3.1 Estrutura Regulatoria Brasileira

Desde 2010, o Brasil adotou plenamente as normas IFRS atraves do Comite de Pronunciamentos Contabeis (CPC), criado em 2005 para sistematizar e centralizar o processo de normatizacao contabil e promover a convergencia internacional. As empresas listadas na B3 devem submeter a CVM:

| Documento | Periodicidade | Prazo | Conteudo |
|-----------|---------------|-------|----------|
| **DFP** (Demonstracoes Financeiras Padronizadas) | Anual | 3 meses apos encerramento | BP, DRE, DFC, DMPL, DVA, Notas |
| **ITR** (Informacoes Trimestrais) | Trimestral | 45 dias apos encerramento | BP, DRE, DFC resumidos |
| **Formulario de Referencia** | Anual + atualizacoes | Variavel | Governanca, riscos, remuneracao |
| **Fatos Relevantes** | Conforme ocorrencia | Imediato | Eventos materiais |

### 3.2 Automatizacao da Leitura de ITR/DFP

O Portal de Dados Abertos da CVM (dados.cvm.gov.br) disponibiliza os dados de DFP e ITR em formato estruturado (CSV dentro de arquivos ZIP), permitindo processamento automatizado.

**Pipeline de coleta:**

```python
import requests
import zipfile
import pandas as pd
from io import BytesIO

class CVMDataCollector:
    """
    Coletor automatizado de dados CVM.
    Fonte: Portal Dados Abertos CVM (dados.cvm.gov.br)
    """

    BASE_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC"

    def coletar_dfp(self, ano):
        """Coleta DFP (Demonstracoes Financeiras Padronizadas)"""
        url = f"{self.BASE_URL}/DFP/DADOS/dfp_cia_aberta_{ano}.zip"
        response = requests.get(url)

        with zipfile.ZipFile(BytesIO(response.content)) as z:
            # Extrair diferentes demonstracoes
            bp = pd.read_csv(z.open(f'dfp_cia_aberta_BPA_con_{ano}.csv'),
                            sep=';', encoding='latin1')
            dre = pd.read_csv(z.open(f'dfp_cia_aberta_DRE_con_{ano}.csv'),
                             sep=';', encoding='latin1')
            dfc = pd.read_csv(z.open(f'dfp_cia_aberta_DFC_MD_con_{ano}.csv'),
                             sep=';', encoding='latin1')

        return {'balanco': bp, 'dre': dre, 'fluxo_caixa': dfc}

    def coletar_itr(self, ano):
        """Coleta ITR (Informacoes Trimestrais)"""
        url = f"{self.BASE_URL}/ITR/DADOS/itr_cia_aberta_{ano}.zip"
        # Processamento similar ao DFP
        pass

    def padronizar_contas(self, df):
        """
        Padroniza as contas contabeis para formato uniforme.
        As contas seguem o plano de contas CVM com codigos hierarquicos.
        """
        mapeamento = {
            '1': 'Ativo Total',
            '1.01': 'Ativo Circulante',
            '1.02': 'Ativo Nao Circulante',
            '2': 'Passivo Total',
            '2.01': 'Passivo Circulante',
            '2.03': 'Patrimonio Liquido',
            '3.01': 'Receita Liquida',
            '3.03': 'Resultado Bruto',
            '3.05': 'EBIT',
            '3.11': 'Lucro Liquido',
        }
        return df
```

**Bibliotecas Python especializadas:**

- **brFinance**: Biblioteca Python para acesso a dados periodicos de empresas brasileiras (B3/CVM). Fornece metodos para obter codigos CVM, categorias de busca e demonstracoes financeiras em DataFrames
- **BrazilianMarketDataCollector**: Extrai dados financeiros de CVM, B3 e outras fontes, produzindo DataFrames com 177 colunas de 355 empresas
- **BRValue-py**: Biblioteca para analise fundamentalista, projecoes e valuation de companhias abertas brasileiras, com calculo de P/L, Margem Liquida, ROE, ROIC

### 3.3 Indicadores de Qualidade dos Lucros (Accruals)

A qualidade dos lucros e um conceito central para detectar manipulacao contabil e prever sustentabilidade dos resultados. Pesquisa publicada na Revista Contabilidade & Financas (SciELO) demonstrou que accruals discricionarios (DAs) e nao-discricionarios (NDAs) calculados apos a adocao do IFRS no Brasil sao positivos e estatisticamente significativos para prever fluxos de caixa futuros.

**Metricas de Qualidade:**

```python
def calcular_accruals(empresa):
    """
    Calcula accruals totais e componentes.
    Accruals altos relativament ao lucro indicam menor qualidade.
    """
    # Accruals totais (metodo do balanco)
    delta_ac = empresa.ativo_circulante - empresa.ativo_circulante_ant
    delta_pc = empresa.passivo_circulante - empresa.passivo_circulante_ant
    delta_caixa = empresa.caixa - empresa.caixa_ant
    delta_divida_cp = empresa.divida_cp - empresa.divida_cp_ant
    depreciacao = empresa.depreciacao

    accruals_totais = (delta_ac - delta_caixa) - \
                      (delta_pc - delta_divida_cp) - depreciacao

    # Ratio accruals/ativo total (quanto menor, melhor)
    accrual_ratio = accruals_totais / empresa.ativo_total_medio

    # Cash Flow Ratio (quanto mais proximo de 1, melhor qualidade)
    cfr = empresa.fluxo_caixa_operacional / empresa.lucro_liquido

    return {
        'accruals_totais': accruals_totais,
        'accrual_ratio': accrual_ratio,
        'cash_flow_ratio': cfr,
        'qualidade': 'ALTA' if cfr > 0.8 else 'MEDIA' if cfr > 0.5 else 'BAIXA'
    }
```

**Achados importantes sobre IFRS no Brasil:**
- A transicao para IFRS teve efeito restritivo sobre gerenciamento de resultados no Brasil apos sua implementacao completa
- Porem, a adocao do IFRS 15 (Receita de Contratos com Clientes) diminuiu a qualidade dos accruals e aumentou o gerenciamento de resultados em setores especificos
- A qualidade da informacao contabil nao melhorou significativamente ao comparar periodos antes e apos IFRS

---

## 4. Modelos Quantitativos Fundamentalistas

### 4.1 Piotroski F-Score no Brasil

O F-Score de Piotroski e um sistema binario de pontuacao com 9 variaveis que capturam lucratividade, alavancagem/liquidez e eficiencia operacional.

**As 9 Variaveis:**

| # | Criterio | Categoria | Pontuacao |
|---|----------|-----------|-----------|
| 1 | ROA > 0 | Lucratividade | 1 se positivo |
| 2 | FCO > 0 | Lucratividade | 1 se positivo |
| 3 | Delta ROA > 0 | Lucratividade | 1 se crescente |
| 4 | FCO > Lucro Liquido | Lucratividade | 1 se verdadeiro |
| 5 | Delta Alavancagem < 0 | Alavancagem | 1 se diminuiu |
| 6 | Delta Liquidez Corrente > 0 | Liquidez | 1 se aumentou |
| 7 | Sem emissao de acoes | Alavancagem | 1 se nao emitiu |
| 8 | Delta Margem Bruta > 0 | Eficiencia | 1 se crescente |
| 9 | Delta Giro do Ativo > 0 | Eficiencia | 1 se crescente |

**Score**: 0-9 (>=7 e "forte"; <=3 e "fraco")

**Evidencia Academica no Brasil:**

Galdi e Lopes (2008) implementaram a estrategia de investimento de Piotroski no mercado brasileiro de 1994 a 2004 e encontraram que um portfolio de alto F-Score, quando aplicado a acoes de valor, gerou retornos anormais de **26.7% ao ano**. Pesquisa subsequente de Souza Domingues et al. (2022) replicou os resultados no Brasil, embora o efeito nao seja tao forte quanto nos EUA.

Estudos internacionais confirmam que o FSCORE permanece um forte preditor de retornos futuros e lucratividade futura em mercados internacionais no periodo 2000-2018, com empresas de alto FSCORE superando as de baixo FSCORE em cerca de **10% ao ano** em paises desenvolvidos e emergentes.

```python
def piotroski_f_score(empresa, empresa_anterior):
    """
    Calcula o Piotroski F-Score (0-9).
    Score >= 7: empresa financeiramente forte
    Score <= 3: empresa financeiramente fraca
    """
    score = 0

    # 1. ROA positivo
    roa = empresa.lucro_liquido / empresa.ativo_total
    score += 1 if roa > 0 else 0

    # 2. Fluxo de caixa operacional positivo
    score += 1 if empresa.fco > 0 else 0

    # 3. ROA crescente
    roa_ant = empresa_anterior.lucro_liquido / empresa_anterior.ativo_total
    score += 1 if roa > roa_ant else 0

    # 4. Qualidade dos lucros (FCO > LL)
    score += 1 if empresa.fco > empresa.lucro_liquido else 0

    # 5. Reducao de alavancagem
    alav = empresa.divida_lp / empresa.ativo_total
    alav_ant = empresa_anterior.divida_lp / empresa_anterior.ativo_total
    score += 1 if alav < alav_ant else 0

    # 6. Melhora na liquidez corrente
    lc = empresa.ativo_circulante / empresa.passivo_circulante
    lc_ant = empresa_anterior.ativo_circulante / empresa_anterior.passivo_circulante
    score += 1 if lc > lc_ant else 0

    # 7. Sem diluicao (emissao de acoes)
    score += 1 if empresa.acoes_total <= empresa_anterior.acoes_total else 0

    # 8. Melhora na margem bruta
    mb = empresa.lucro_bruto / empresa.receita_liquida
    mb_ant = empresa_anterior.lucro_bruto / empresa_anterior.receita_liquida
    score += 1 if mb > mb_ant else 0

    # 9. Melhora no giro do ativo
    ga = empresa.receita_liquida / empresa.ativo_total
    ga_ant = empresa_anterior.receita_liquida / empresa_anterior.ativo_total
    score += 1 if ga > ga_ant else 0

    return score
```

### 4.2 Altman Z-Score Adaptado para Mercados Emergentes

O Z-Score original foi desenvolvido para empresas industriais americanas. Para mercados emergentes como o Brasil, Altman desenvolveu o modelo Z''-Score (1995):

```
Z'' = 3.25 + 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4
```

Onde:
- **X1** = Capital de Giro / Ativo Total
- **X2** = Lucros Retidos / Ativo Total
- **X3** = EBIT / Ativo Total
- **X4** = Patrimonio Liquido / Passivo Total

**Zonas de Discriminacao:**
- Z'' > 2.6: Zona "segura"
- 1.1 < Z'' < 2.6: Zona "cinza"
- Z'' < 1.1: Zona de "stress financeiro"

O modelo EMS (Emerging Market Score) de Altman incorpora as caracteristicas de credito particulares de empresas de mercados emergentes, e os resultados foram particularmente robustos para paises como Brasil e Argentina nos anos 1990, bem como em paises do Sudeste Asiatico pre e pos-crise de 1997.

```python
def altman_z_score_emergente(empresa):
    """
    Calcula o Z''-Score de Altman para mercados emergentes.
    Adequado para empresas brasileiras (nao-financeiras).
    """
    x1 = (empresa.ativo_circulante - empresa.passivo_circulante) / empresa.ativo_total
    x2 = empresa.lucros_retidos / empresa.ativo_total
    x3 = empresa.ebit / empresa.ativo_total
    x4 = empresa.patrimonio_liquido / empresa.passivo_total

    z = 3.25 + 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4

    if z > 2.6:
        classificacao = 'SEGURA'
    elif z > 1.1:
        classificacao = 'ZONA_CINZA'
    else:
        classificacao = 'STRESS_FINANCEIRO'

    return {'z_score': z, 'classificacao': classificacao}
```

### 4.3 Beneish M-Score (Deteccao de Manipulacao)

O M-Score de Beneish identifica empresas que potencialmente manipulam seus resultados financeiros. E composto por 8 variaveis:

```
M = -4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI
    + 0.115*DEPI - 0.172*SGAI + 4.679*TATA - 0.327*LVGI
```

Onde:
- **DSRI** = Days Sales in Receivables Index (indice de dias a receber)
- **GMI** = Gross Margin Index (indice de margem bruta)
- **AQI** = Asset Quality Index (indice de qualidade dos ativos)
- **SGI** = Sales Growth Index (indice de crescimento de vendas)
- **DEPI** = Depreciation Index (indice de depreciacao)
- **SGAI** = SG&A Index (indice de despesas gerais e administrativas)
- **TATA** = Total Accruals to Total Assets
- **LVGI** = Leverage Index (indice de alavancagem)

**Interpretacao:** M > -1.78 indica provavel manipulacao

Pesquisas sugerem que o framework Beneish-Altman pode ser transferivel para mercados emergentes que empregam regimes de divulgacao comparaveis, embora convencoes contabeis setoriais e ambientes regulatorios possam afetar o desempenho dos modelos, necessitando recalibracoes.

### 4.4 Magic Formula de Greenblatt no Brasil

A "Formula Magica" de Joel Greenblatt classifica acoes por dois criterios combinados:

1. **Earnings Yield** = EBIT / Enterprise Value (quanto a empresa e barata)
2. **Return on Capital** = EBIT / (Capital de Giro Liquido + Ativos Fixos Liquidos) (quao boa e a empresa)

**Evidencia no Brasil:**
Um estudo de 2016 encontrou possivel confirmacao da formula de Greenblatt no mercado brasileiro, mas alertou que "nao foi possivel assegurar com alto nivel de certeza que a estrategia e geradora de alpha, e que os resultados nao se devem a aleatoriedade."

Internacionalmente, de 2003 a 2015, a aplicacao da formula nos EUA resultou em retorno medio anualizado de 11.4%, superando o S&P 500 (8.7%). Estudos em outros mercados (Noruega, Hong Kong) encontraram outperformance de 6-15%.

```python
def magic_formula(universo_acoes):
    """
    Implementa a Magic Formula de Greenblatt.
    Ranking combinado de Earnings Yield + Return on Capital.
    """
    dados = []
    for acao in universo_acoes:
        # Excluir financeiras e utilities (conforme Greenblatt)
        if acao.setor in ['Financeiro', 'Utilities']:
            continue

        # Earnings Yield
        ev = acao.market_cap + acao.divida_liquida
        earnings_yield = acao.ebit / ev if ev > 0 else 0

        # Return on Capital
        capital_tangivel = acao.capital_giro_liquido + acao.ativo_fixo_liquido
        roc = acao.ebit / capital_tangivel if capital_tangivel > 0 else 0

        dados.append({
            'ticker': acao.ticker,
            'earnings_yield': earnings_yield,
            'roc': roc
        })

    df = pd.DataFrame(dados)

    # Ranking combinado (menor soma = melhor)
    df['rank_ey'] = df['earnings_yield'].rank(ascending=False)
    df['rank_roc'] = df['roc'].rank(ascending=False)
    df['rank_combinado'] = df['rank_ey'] + df['rank_roc']

    return df.sort_values('rank_combinado').head(30)
```

---

## 5. Analise Setorial

### 5.1 Particularidades dos Setores Brasileiros

O mercado brasileiro tem caracteristicas setoriais unicas que exigem abordagens diferenciadas de valuation e analise.

#### 5.1.1 Bancos e Instituicoes Financeiras

**Metricas especificas:**
- **P/B (P/VPA)**: metrica-chave, vinculada ao ROE
- **ROE**: benchmark >15%; grandes bancos brasileiros (Itau, Bradesco, BB) consistentemente entre 15-22%
- **Indice de Basileia**: regulacao BACEN, minimo de 10.5% (acima do minimo de Basileia III)
- **Indice de Inadimplencia (NPL)**: critico para avaliar qualidade da carteira
- **NIM (Net Interest Margin)**: spread bancario, historicamente alto no Brasil (5-8%)
- **Indice de Eficiencia**: despesas administrativas / receitas (menor = mais eficiente)
- **Indice de Cobertura**: provisoes / creditos em atraso

**Nao usar**: EV/EBITDA (nao aplicavel a bancos), Divida Liquida/EBITDA

**Modelo de valuation preferido**: DDM (Dividend Discount Model) ou Excess Return Model

#### 5.1.2 Utilities (Energia Eletrica, Saneamento, Gas)

**Metricas especificas:**
- **EV/EBITDA**: metrica primaria (5x-8x, dependendo se geracao, transmissao ou distribuicao)
- **Dividend Yield**: tipicamente alto (6-10%), pois sao empresas maduras com fluxos previsiveis
- **RAP (Receita Anual Permitida)**: para transmissoras, e o driver principal de receita regulada
- **Margem EBITDA regulatoria**: comparar com permitido pelo regulador (ANEEL)
- **Alavancagem**: Divida Liquida/EBITDA tipicamente 2.5x-4.0x
- **Concessoes**: prazo remanescente e risco de renovacao

**Drivers:**
- Revisoes tarifarias da ANEEL
- Crescimento do consumo de energia
- Custos de geracao (GSF para hidreletricas, PLD)
- Investimentos em transmissao (leiloes)

#### 5.1.3 Commodities (Mineracao, Petroleo, Agro, Papel & Celulose)

**Metricas especificas:**
- **EV/EBITDA**: interpretar com cautela (EBITDA e ciclico)
- **EV/Reservas**: para mineradoras e petroleiras
- **Custo C1/C2/C3**: custos de producao por unidade
- **Preco de breakeven**: preco da commodity que cobre custos + CAPEX
- **FCF Yield**: em diferentes cenarios de preco da commodity

**Dependencia Petrobras/Vale:**
- Petrobras e Vale representam ~25-30% do Ibovespa
- Performance do indice e fortemente correlacionada com precos de petroleo Brent e minerio de ferro
- O bot deve monitorar: Brent (USD/bbl), minerio de ferro (USD/ton 62% Fe), dolar/real

**Drivers:**
- Precos internacionais das commodities
- Cambio USD/BRL
- Demanda chinesa (principal destino)
- Custos de producao e logistica

#### 5.1.4 Varejo

**Metricas especificas:**
- **Vendas Mesmas Lojas (SSS)**: crescimento organico
- **P/E forward**: dado o carater ciclico
- **EV/EBITDA**: 6x-12x dependendo do segmento
- **Margem bruta**: diferencia entre food (20-25%) e non-food (40-60%)
- **Ciclo de capital de giro**: dias de estoque + dias a receber - dias a pagar
- **ROIC**: retorno sobre capital investido em lojas
- **Receita por m2**: eficiencia do espaco

**Drivers:**
- Renda disponivel, emprego, confianca do consumidor
- SELIC (impacta credito ao consumo e custo de capital de giro)
- Inflacao (IPCA) e poder de repasse
- Transformacao digital (e-commerce vs. lojas fisicas)

#### 5.1.5 Construcao Civil e Incorporacao

**Metricas especificas:**
- **P/B**: indicador-chave (landbank a valor de mercado vs. contabil)
- **VSO (Velocidade sobre Oferta)**: vendas / estoque
- **Margem bruta de incorporacao**: tipicamente 30-40%
- **Lancamentos e vendas contratadas**: indicadores antecedentes
- **Queima de caixa / geracao de caixa**: ciclo longo (2-5 anos do lancamento a entrega)
- **Distrato**: cancelamentos sobre vendas

**Drivers:**
- SELIC (impacto direto no financiamento imobiliario)
- Subsidios governamentais (Minha Casa Minha Vida / FGTS)
- Renda e emprego
- Custos de construcao (INCC)

### 5.2 Tabela Resumo de Multiplos por Setor

| Setor | P/E Tipico | EV/EBITDA Tipico | P/B Tipico | DY Tipico | ROE Tipico | Metrica-Chave |
|-------|-----------|-----------------|-----------|----------|-----------|---------------|
| Bancos | 5-9x | N/A | 0.8-2.5x | 4-8% | 15-22% | ROE, P/B |
| Utilities | 6-10x | 5-8x | 0.8-1.5x | 6-10% | 10-18% | EV/EBITDA, DY |
| Mineracao | 4-8x | 3-6x | 1.0-2.0x | 5-12% | 15-35%* | EV/Reservas |
| Petroleo | 3-7x | 3-5x | 0.8-1.5x | 5-15% | 20-40%* | EV/boe, FCF Yield |
| Varejo | 10-25x | 6-12x | 1.5-5.0x | 1-4% | 10-25% | SSS, P/E fwd |
| Construcao | 6-12x | 5-9x | 0.8-1.5x | 2-6% | 10-18% | P/B, VSO |
| Tecnologia | 15-40x+ | 8-15x+ | 3-10x | 0-2% | 15-30% | EV/Receita |
| Saude | 12-25x | 7-12x | 2-5x | 1-3% | 12-20% | EV/EBITDA |

*Altamente ciclico, depende do preco da commodity

---

## 6. Integracao de Dados Macroeconomicos

### 6.1 Variaveis Macro Criticas para o Mercado Brasileiro

Pesquisa publicada analisando o mercado brasileiro de janeiro de 2011 a dezembro de 2022, utilizando modelos VAR (Vector Autoregression) com correcao de erro vetorial (VEC), examinou como choques na SELIC, IPCA e outras variaveis macroeconomicas impactam o Ibovespa.

#### 6.1.1 SELIC (Taxa Basica de Juros)

A SELIC e a variavel macro mais relevante para o mercado de acoes brasileiro.

**Impacto no valuation:**
- Aumento da SELIC eleva o custo de capital (WACC), reduzindo o valor presente dos fluxos de caixa
- Setores mais sensiiveis: varejo, construcao civil, tecnologia (longa duration)
- Setores beneficiados: bancos (aumento de spread), seguradoras (rendimento do float)

**Dado surpreendente**: Pesquisa academica encontrou que um choque na SELIC "nao teve influencia no indice Ibovespa" de forma direta, sugerindo que o mercado antecipa mudancas na SELIC (eficiencia informacional), e o efeito se da mais pela trajetoria esperada futura do que pelo nivel corrente.

**Para o bot:**
```python
# Monitorar curva de juros futuros (DI Futuro)
# A curva DI e mais informativa que a SELIC corrente
def obter_curva_di():
    """
    Curva DI Futuro - principal indicador de expectativa de juros.
    Fonte: B3 via API ou web scraping.
    """
    vertices = ['DI1F26', 'DI1F27', 'DI1F28', 'DI1F29', 'DI1F30']
    # Coleta via API B3 ou provedores de dados
    pass
```

#### 6.1.2 IPCA (Indice de Precos ao Consumidor Amplo)

**Impactos:**
- IPCA exerceu influencia negativa sobre o Ibovespa, porem com menor intensidade comparada ao cambio
- Inflacao alta corroi margens de empresas sem poder de repasse
- Setores com repasse contratual (utilities com tarifas indexadas ao IGPM/IPCA) sao mais resilientes
- IPCA acima da meta do BACEN sinaliza aumento futuro de SELIC

**Para o bot:**
```python
# Integrar dados do BACEN SGS (Sistema Gerenciador de Series Temporais)
import requests

def obter_ipca():
    url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json"
    return requests.get(url).json()

def obter_selic():
    url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json"
    return requests.get(url).json()

def obter_expectativas_focus():
    """
    Relatorio Focus do BACEN - expectativas de mercado para:
    IPCA, SELIC, PIB, Cambio
    """
    url = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/"
    # API REST com filtros por indicador e data
    pass
```

#### 6.1.3 Cambio (USD/BRL)

O cambio e o fator macro de maior impacto no Ibovespa, conforme evidencias empiricas.

**Impactos diferenciados:**
- **Exportadoras** (Vale, Petrobras, Suzano, JBS): desvalorizacao do real e positiva (receitas em USD, custos em BRL)
- **Importadoras/Dependentes de importacao**: desvalorizacao e negativa
- **Divida em dolar**: risco para empresas com divida denominada em USD sem hedge

#### 6.1.4 PIB e Ciclo Economico

**Indicadores antecedentes a monitorar:**
- PMI Industrial e de Servicos
- Producao Industrial (IBGE)
- Vendas no Varejo (IBGE)
- CAGED (emprego formal)
- Indice de Confianca do Consumidor (FGV)
- ICC (Indice de Confianca da Construcao)

#### 6.1.5 Commodities

| Commodity | Acao Proxy | Fonte de Dados |
|-----------|-----------|----------------|
| Petroleo Brent | PETR4 | ICE, Bloomberg |
| Minerio de Ferro 62% | VALE3 | SGX, Platts |
| Celulose (BHKP) | SUZB3 | FOEX |
| Boi Gordo | JBSS3, MRFG3 | B3 (BGI) |
| Milho/Soja | SLC Agricola | CBOT |
| Ouro | Aura Minerals | COMEX |

### 6.2 Modelo de Integracao Macro-Fundamentalista

```python
class MacroFundamentalModel:
    """
    Integra dados macroeconomicos com analise fundamentalista.
    Ajusta premissas de valuation baseado no cenario macro.
    """

    def __init__(self):
        self.macro = self._coletar_dados_macro()

    def ajustar_wacc(self, empresa, cenario_macro):
        """
        Ajusta WACC baseado em cenario macroeconomico.
        """
        # CRP ajustado pelo CDS soberano atual
        cds_5y = cenario_macro['cds_brasil_5y']
        crp = self._calcular_crp(cds_5y)

        # Rf ajustado pela curva Treasury
        rf = cenario_macro['us_treasury_10y']

        # ERP (Equity Risk Premium)
        erp = cenario_macro.get('erp_damodaran', 0.055)

        ke = rf + empresa.beta * erp + crp

        return ke

    def classificar_regime_macro(self):
        """
        Classifica o regime macroeconomico atual.
        Diferentes regimes favorecem diferentes setores.
        """
        selic = self.macro['selic']
        ipca = self.macro['ipca_12m']
        pib = self.macro['pib_yoy']
        cambio_tendencia = self.macro['usd_brl_tendencia']

        if selic > 12 and ipca > 5:
            return 'CONTRACAO_MONETARIA'  # Favorece: bancos, exportadoras
        elif selic < 8 and pib > 2:
            return 'EXPANSAO'  # Favorece: varejo, construcao, small caps
        elif pib < 0:
            return 'RECESSAO'  # Favorece: utilities, defensivas, dividendos
        else:
            return 'NEUTRO'

    def sensibilidade_setorial(self, setor):
        """
        Retorna sensibilidade do setor a variaveis macro.
        Beta macro setorial.
        """
        sensibilidades = {
            'bancos': {'selic': +0.8, 'pib': +0.5, 'cambio': -0.2},
            'varejo': {'selic': -0.9, 'pib': +0.8, 'cambio': -0.3},
            'construcao': {'selic': -0.95, 'pib': +0.7, 'cambio': -0.1},
            'mineracao': {'selic': -0.1, 'pib': +0.3, 'cambio': +0.9},
            'petroleo': {'selic': -0.1, 'pib': +0.2, 'cambio': +0.8},
            'utilities': {'selic': -0.3, 'pib': +0.2, 'cambio': -0.1},
            'tecnologia': {'selic': -0.7, 'pib': +0.6, 'cambio': -0.4},
        }
        return sensibilidades.get(setor, {})
```

---

## 7. Fontes de Dados Fundamentalistas

### 7.1 Fontes Oficiais e Regulatorias

#### 7.1.1 CVM -- Portal de Dados Abertos

| Aspecto | Detalhe |
|---------|---------|
| **URL** | https://dados.cvm.gov.br/ |
| **Dados** | DFP, ITR, Formulario de Referencia, Fatos Relevantes |
| **Formato** | CSV (dentro de ZIP), estruturado |
| **Custo** | Gratuito |
| **Frequencia** | Atualizado conforme publicacao das empresas |
| **Acesso** | Download direto HTTP, sem autenticacao |

O Portal Dados Abertos CVM e a fonte primaria e mais confiavel para dados financeiros de empresas abertas brasileiras. Disponibiliza DFP e ITR em formato CSV estruturado, com plano de contas padronizado.

#### 7.1.2 B3 (Bolsa de Valores)

| Aspecto | Detalhe |
|---------|---------|
| **URL** | https://www.b3.com.br/pt_br/market-data-e-indices/ |
| **Dados** | Cotacoes, indices, derivativos, dados corporativos |
| **Formato** | CSV, APIs REST |
| **Custo** | Dados basicos gratuitos; dados em tempo real requerem contrato |
| **Destaque** | Indice de Commodities Brasil (ICB B3), indices setoriais |

#### 7.1.3 Banco Central do Brasil (BACEN)

| Aspecto | Detalhe |
|---------|---------|
| **URL** | https://www.bcb.gov.br/ |
| **APIs** | SGS (Series Temporais), PTAX, Focus |
| **Dados** | SELIC, IPCA, PIB, Cambio, Expectativas de Mercado |
| **Formato** | JSON, CSV |
| **Custo** | Gratuito |

### 7.2 Plataformas de Dados Fundamentalistas

#### 7.2.1 Economatica

| Aspecto | Detalhe |
|---------|---------|
| **URL** | https://www.economatica.com/ |
| **Tipo** | Plataforma institucional premium |
| **Cobertura** | 26.300+ empresas, incluindo dados historicos extensos |
| **Dados** | DFs, indicadores, multiplos, indices setoriais, dados de mercado |
| **Destaque** | Publica regularmente estudos sobre multiplos setoriais e resultados da B3 |
| **Acesso** | Assinatura paga (institucional) |

Referencia academica e institucional no Brasil. Publica trimestralmente panoramas de resultados financeiros da B3 e analises de multiplos setoriais de mercado.

#### 7.2.2 Quantum Finance

| Aspecto | Detalhe |
|---------|---------|
| **URL** | https://quantumfinance.com.br/ |
| **Tipo** | Plataforma institucional com IA |
| **Cobertura** | 1.700+ empresas brasileiras listadas na CVM |
| **Tecnologia** | Atom Expert System (AES) com inteligencia artificial |
| **Dados** | DFs, indicadores, precos, dividendos, acionistas, free float |
| **Acesso** | Web, mobile, API, data links |
| **Custo** | Assinatura paga (institucional) |

#### 7.2.3 StatusInvest

| Aspecto | Detalhe |
|---------|---------|
| **URL** | https://statusinvest.com.br/ |
| **Tipo** | Plataforma gratuita para investidores |
| **Dados** | Indicadores fundamentalistas, cotacoes, dividendos, DFs simplificados |
| **Cobertura** | Acoes, FIIs, ETFs, BDRs da B3 |
| **Acesso** | Web, gratuito (com funcionalidades premium) |
| **API** | Nao oficial; web scraping possivel (projetos GitHub disponiveis) |

#### 7.2.4 Fundamentus

| Aspecto | Detalhe |
|---------|---------|
| **URL** | https://www.fundamentus.com.br/ |
| **Tipo** | Plataforma gratuita classica |
| **Dados** | Indicadores fundamentalistas, balanco patrimonial, DRE |
| **Acesso** | Web, gratuito |
| **API Python** | Biblioteca "fundamentus" disponivel no GitHub para scraping |

### 7.3 APIs e Bibliotecas Python

| Biblioteca/API | Fonte | Dados | GitHub |
|----------------|-------|-------|--------|
| **brFinance** | CVM/B3 | DFP, ITR, dados periodicos | eudesrodrigo/brFinance |
| **BrazilianMarketDataCollector** | CVM, B3, Yahoo, Alpha Vantage | 177 colunas, 355 empresas | gustavomoers/BrazilianMarketDataCollector |
| **BRValue-py** | CVM | Valuation, P/L, ROE, ROIC | luiz-EL/BRValue-py |
| **fundamentus (Python)** | fundamentus.com.br | Indicadores em JSON | phoemur/fundamentus |
| **StatusInvest Scraping** | statusinvest.com.br | Indicadores, FIIs | TBertuzzi/StatusInvestScraping |
| **stocks-info-br** | fundamentus + investidor10 | Indicadores combinados | LucazzP/stocks-info-br |
| **yfinance** | Yahoo Finance | Precos, DFs (cobertura BR limitada) | ranaroussi/yfinance |

### 7.4 Fontes Complementares

| Fonte | URL | Tipo de Dado |
|-------|-----|-------------|
| **XP Investimentos** | conteudos.xpi.com.br | Tabela de multiplos semanal |
| **Kroll** | kroll.com | Multiplos industriais America Latina (trimestral) |
| **Damodaran** | pages.stern.nyu.edu/~adamodar | CRP, ERP, betas setoriais, custo de capital |
| **IBGE** | ibge.gov.br | PMI, producao industrial, vendas varejo, IPCA |
| **FGV** | portalibre.fgv.br | Indices de confianca, IGP-M, INCC |
| **brapi.dev** | brapi.dev | API de dados de acoes brasileiras |
| **Preco Justo AI** | precojusto.ai | Valuation automatizado com IA (8 modelos) |

---

## 8. NLP para Analise de Relatorios

### 8.1 Panorama de NLP Financeiro no Brasil

O processamento de linguagem natural (NLP) aplicado ao mercado financeiro brasileiro apresenta desafios e oportunidades unicos, principalmente pela necessidade de modelos treinados em portugues brasileiro com vocabulario financeiro especifico.

### 8.2 FinBERT-PT-BR

O FinBERT-PT-BR e um modelo de NLP pre-treinado especificamente para analisar sentimento de textos financeiros em portugues brasileiro. Disponivel no Hugging Face (lucas-leme/FinBERT-PT-BR), o modelo foi treinado em dois estagios principais: modelagem de linguagem e modelagem de sentimento.

**Caracteristicas:**
- Baseado no BERT, adaptado para dominio financeiro em portugues
- Classifica textos em 3 categorias: positivo, negativo, neutro
- Treinado com corpus de textos financeiros brasileiros
- Melhoria de 14 pontos percentuais sobre o estado-da-arte anterior

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

class FinancialSentimentBR:
    """
    Analise de sentimento financeiro em portugues brasileiro
    usando FinBERT-PT-BR.
    """

    def __init__(self):
        self.model_name = "lucas-leme/FinBERT-PT-BR"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name
        )

    def analisar_sentimento(self, texto):
        """
        Analisa sentimento de texto financeiro.
        Retorna: positivo, negativo ou neutro com probabilidades.
        """
        inputs = self.tokenizer(texto, return_tensors="pt",
                                truncation=True, max_length=512)
        outputs = self.model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)

        labels = ['negativo', 'neutro', 'positivo']
        sentimento = labels[probs.argmax().item()]
        confianca = probs.max().item()

        return {
            'sentimento': sentimento,
            'confianca': confianca,
            'probabilidades': {
                label: prob.item()
                for label, prob in zip(labels, probs[0])
            }
        }
```

### 8.3 Processamento de Fatos Relevantes

Fatos Relevantes sao documentos obrigatorios publicados via sistema ENET da CVM quando ocorrem eventos materiais. Representam uma fonte rica de informacao para sinais de trading.

**Pipeline de processamento:**

```python
class FatosRelevantesProcessor:
    """
    Processa Fatos Relevantes da CVM automaticamente.
    """

    def __init__(self, sentiment_model):
        self.sentiment = sentiment_model
        self.keywords_positivas = [
            'aquisicao', 'fusao', 'dividend', 'lucro recorde',
            'expansao', 'aprovacao', 'contrato', 'parceria'
        ]
        self.keywords_negativas = [
            'inadimplencia', 'recuperacao judicial', 'fraude',
            'multa', 'investigacao', 'renuncia', 'perda'
        ]

    def processar(self, fato_relevante):
        """
        Processa um fato relevante e extrai sinais.
        """
        texto = fato_relevante['texto']
        empresa = fato_relevante['empresa']

        # 1. Classificacao de sentimento
        sentimento = self.sentiment.analisar_sentimento(texto)

        # 2. Extracao de entidades e valores
        entidades = self._extrair_entidades(texto)
        valores = self._extrair_valores_monetarios(texto)

        # 3. Classificacao por tipo de evento
        tipo_evento = self._classificar_evento(texto)

        # 4. Avaliacao de materialidade
        materialidade = self._avaliar_materialidade(valores, empresa)

        return {
            'empresa': empresa,
            'sentimento': sentimento,
            'tipo_evento': tipo_evento,
            'materialidade': materialidade,
            'valores_extraidos': valores,
            'sinal': self._gerar_sinal(sentimento, materialidade)
        }

    def _classificar_evento(self, texto):
        categorias = {
            'M&A': ['aquisicao', 'fusao', 'incorporacao', 'cisao'],
            'DIVIDENDOS': ['dividendo', 'jcp', 'juros sobre capital'],
            'GOVERNANCA': ['conselho', 'diretoria', 'assembleia'],
            'FINANCEIRO': ['emissao', 'debenture', 'captacao'],
            'OPERACIONAL': ['contrato', 'expansao', 'inauguracao'],
            'REGULATORIO': ['aneel', 'anvisa', 'cade', 'cvm'],
            'LITIGIO': ['processo', 'acao judicial', 'multa', 'condenacao']
        }

        for cat, keywords in categorias.items():
            if any(kw in texto.lower() for kw in keywords):
                return cat
        return 'OUTROS'
```

### 8.4 Vocabulario Financeiro em Portugues

Pesquisa publicada na Redalyc investigou a associacao entre variaveis de mercado (retornos anormais, volume e volatilidade) e noticias negativas divulgadas por empresas brasileiras listadas. O estudo desenvolveu listas de palavras em portugues para medir o tom de textos financeiros -- com listas de palavras negativas, positivas, litigiosas, de incerteza e modais -- construidas a partir de um corpus de mais de 8 milhoes de palavras.

**Achado importante:** Os resultados indicaram uma associacao muito fraca entre o tom dos relatorios anuais e variaveis do mercado de acoes no Brasil, sugerindo que o mercado brasileiro pode ser menos eficiente na incorporacao de informacoes textuais, ou que a qualidade do disclosure textual e inferior.

### 8.5 Processamento de Earnings Calls

Para empresas brasileiras que realizam conference calls (tipicamente em portugues e ingles), o bot pode:

1. **Transcrever** chamadas usando Whisper (OpenAI) ou servicos de transcricao
2. **Analisar sentimento** com FinBERT-PT-BR para secoes em portugues e FinBERT para ingles
3. **Extrair metricas mencionadas** (guidance, projecoes, targets)
4. **Comparar tom** com trimestres anteriores (deterioracao ou melhora)
5. **Identificar linguagem evasiva** ou mudancas de narrativa

---

## 9. Consensus e Earnings Surprise

### 9.1 Estimativas de Consenso no Brasil

O consenso de mercado e a media (ou mediana) das estimativas de analistas para metricas-chave como lucro por acao (LPA/EPS), receita e EBITDA. No Brasil, a cobertura de analistas e mais concentrada nas large caps do Ibovespa.

**Fontes de consenso:**
- **Bloomberg**: consenso global, cobertura ampla de brasileiras
- **Refinitiv (LSEG)**: base extensa de estimativas
- **FactSet**: analise de earnings calls com NLP
- **Relatorio Focus (BACEN)**: consenso macroeconomico (IPCA, SELIC, PIB, cambio)
- **XP Investimentos**: tabela de estimativas para cobertura

### 9.2 Post-Earnings-Announcement Drift (PEAD)

O PEAD e uma anomalia bem documentada: apos a divulgacao de resultados, os precos das acoes continuam a se mover na direcao da surpresa de lucros por um periodo estendido, contrariando a hipotese de eficiencia de mercado.

**Mecanismo:**
- Surpresa positiva (EPS real > EPS estimado): preco tende a subir apos divulgacao
- Surpresa negativa (EPS real < EPS estimado): preco tende a cair apos divulgacao
- O drift pode durar 60-120 dias, oferecendo oportunidade de trading

**Standardized Unexpected Earnings (SUE):**

```
SUE = (EPS_real - EPS_estimado) / Desvio_Padrao_estimativas
```

### 9.3 Implementacao para o Bot

```python
class EarningsSurpriseEngine:
    """
    Motor de analise de surpresas de resultados.
    """

    def __init__(self, consensus_provider):
        self.consensus = consensus_provider

    def calcular_surpresa(self, empresa, metrica='lucro_liquido'):
        """
        Calcula a surpresa de resultados vs. consenso.
        """
        resultado_real = obter_resultado_real(empresa, metrica)
        estimativa_consenso = self.consensus.obter_estimativa(
            empresa, metrica
        )

        if estimativa_consenso == 0:
            return None

        surpresa_pct = (resultado_real - estimativa_consenso) / \
                       abs(estimativa_consenso) * 100

        # Classificacao da surpresa
        if abs(surpresa_pct) < 2:
            classificacao = 'INLINE'
        elif surpresa_pct > 10:
            classificacao = 'FORTE_POSITIVA'
        elif surpresa_pct > 2:
            classificacao = 'POSITIVA'
        elif surpresa_pct < -10:
            classificacao = 'FORTE_NEGATIVA'
        else:
            classificacao = 'NEGATIVA'

        return {
            'empresa': empresa,
            'metrica': metrica,
            'real': resultado_real,
            'consenso': estimativa_consenso,
            'surpresa_pct': surpresa_pct,
            'classificacao': classificacao,
            'sinal_pead': self._sinal_pead(classificacao)
        }

    def _sinal_pead(self, classificacao):
        """
        Gera sinal de PEAD baseado na surpresa.
        Drift tipicamente dura 60-120 dias.
        """
        sinais = {
            'FORTE_POSITIVA': {'acao': 'COMPRAR', 'confianca': 0.8},
            'POSITIVA': {'acao': 'COMPRAR', 'confianca': 0.6},
            'INLINE': {'acao': 'NEUTRO', 'confianca': 0.5},
            'NEGATIVA': {'acao': 'VENDER', 'confianca': 0.6},
            'FORTE_NEGATIVA': {'acao': 'VENDER', 'confianca': 0.8},
        }
        return sinais.get(classificacao)

    def monitorar_calendario(self):
        """
        Monitora calendario de divulgacao de resultados.
        Posicionar ANTES da divulgacao baseado em sinais.
        """
        calendario = obter_calendario_resultados_b3()
        hoje = datetime.now()
        proximos = [
            e for e in calendario
            if 0 < (e['data'] - hoje).days <= 14
        ]
        return proximos
```

### 9.4 Particularidades Brasileiras

- **Menor cobertura de analistas**: small e mid caps tem pouca ou nenhuma cobertura
- **Janela de divulgacao concentrada**: resultados trimestrais concentrados em 2-3 semanas
- **JCP e dividendos**: devem ser incluidos na analise de distribuicao
- **Normas CPC**: reconciliacoes entre lucro contabil e gerencial podem causar confusao
- **Calendario**: resultados do 4T tipicamente divulgados em marco; 1T em maio; 2T em agosto; 3T em novembro

---

## 10. Value Investing Quantitativo

### 10.1 Evidencias Academicas do Value Premium no Brasil

A literatura academica brasileira e internacional documentou extensivamente a existencia de um premio de valor no mercado de acoes brasileiro.

#### 10.1.1 Estudos Fundamentais

**Araujo et al. (2021) -- "Long-term stock returns in Brazil"** (BCB Working Paper 525):
- Periodo: 1968-2019
- Retorno real medio aritmetico do mercado brasileiro: **21.3% ao ano**
- Premio de risco de acoes: **20.1% ao ano**
- Desvio padrao anual: **67%** (volatilidade extrema)

**Revista Contabilidade & Financas (SciELO) -- "Analysis of value portfolios":**
- Portfolios criados com criterios adaptados de Graham consistentemente superaram o indice de mercado em termos de Sharpe ratio
- Resultados contradizem a hipotese de mercados eficientes

**Value and Growth Stocks in Brazil (USP/SciELO):**
- Acoes de valor superaram acoes de crescimento, desafiando a Hipotese de Mercados Eficientes
- Achado consistente tanto com pesquisas internacionais quanto com pesquisas domesticas

#### 10.1.2 Estrategia de Benjamin Graham Adaptada

Pesquisa publicada na REPeC (Revista de Educacao e Pesquisa em Contabilidade) testou a estrategia de value investing com criterios adaptados de Graham no mercado brasileiro e encontrou:
- Portfolios com **10 ativos** exibiram retornos anormais significativos
- Portfolios com 20 e 30 ativos nao exibiram retornos anormais significativos
- Sugere que a concentracao e importante na estrategia de valor

#### 10.1.3 AlphaX -- AI-Based Value Investing (2025)

Pesquisa recente (ArXiv, 2025) propoe uma estrategia de value investing baseada em IA para o mercado brasileiro:
- Coleta dados da B3 e CVM
- Utiliza demonstracoes financeiras completas (receita, despesas operacionais, lucro bruto, EBIT, lucro liquido, ativos, passivos)
- Abordagem quantitativa com machine learning

### 10.2 Estrategias Value Quantitativas

#### 10.2.1 Deep Value

Deep value envolve comprar acoes com desconto extremo em relacao ao valor intrinseco. Asness, Liew, Pedersen e Thapar (AQR) documentaram que deep value historicamente gera retornos superiores, embora com maior volatilidade e drawdowns.

**Criterios de Deep Value para o Brasil:**
- P/B < 0.7 (abaixo do valor patrimonial)
- EV/EBITDA < 4x
- Divida controlada (D.L./EBITDA < 3x)
- Empresa lucrativa (lucro operacional positivo nos ultimos 12 meses)

#### 10.2.2 Quality-Value Combination

A combinacao de fatores de qualidade com valor tem se mostrado superior a cada fator isolado:

```python
class QualityValueStrategy:
    """
    Estrategia Quality-Value combinada para o mercado brasileiro.
    """

    def selecionar_portfolio(self, universo):
        """
        Seleciona acoes que sao simultaneamente baratas E de qualidade.
        """
        # Filtros de Value
        value_filter = (
            (universo['P/E'] > 0) & (universo['P/E'] < 12) &
            (universo['P/B'] < 2.0) &
            (universo['EV/EBITDA'] < 8)
        )

        # Filtros de Quality
        quality_filter = (
            (universo['ROE'] > 0.15) &
            (universo['ROIC'] > 0.12) &
            (universo['margem_liquida'] > 0.08) &
            (universo['f_score'] >= 6) &
            (universo['divida_liquida_ebitda'] < 2.5)
        )

        # Combinar
        candidatos = universo[value_filter & quality_filter]

        # Rankear por score composto
        candidatos['value_score'] = (
            -candidatos['P/E'].rank(pct=True) +
            -candidatos['P/B'].rank(pct=True) +
            -candidatos['EV/EBITDA'].rank(pct=True) +
            candidatos['dividend_yield'].rank(pct=True)
        ) / 4

        candidatos['quality_score'] = (
            candidatos['ROE'].rank(pct=True) +
            candidatos['ROIC'].rank(pct=True) +
            candidatos['f_score'].rank(pct=True) +
            candidatos['margem_liquida'].rank(pct=True)
        ) / 4

        candidatos['composite'] = (
            0.5 * candidatos['value_score'] +
            0.5 * candidatos['quality_score']
        )

        # Selecionar top 15-20 acoes
        return candidatos.nlargest(15, 'composite')

    def rebalancear(self, portfolio_atual, novo_portfolio):
        """
        Rebalanceia trimestralmente com custos de transacao.
        """
        # Calcular turnover
        saidas = set(portfolio_atual) - set(novo_portfolio)
        entradas = set(novo_portfolio) - set(portfolio_atual)

        # Considerar custos (corretagem + slippage + imposto)
        custo_estimado = len(saidas | entradas) * 0.005  # ~0.5% por trade

        # So rebalancear se beneficio > custo
        return {
            'trades': {'comprar': entradas, 'vender': saidas},
            'custo_estimado': custo_estimado
        }
```

#### 10.2.3 Small Cap Value no Brasil

Pesquisa publicada na ScienceDirect examinou se small caps geram retornos acima da media no mercado brasileiro. Resultados:
- Acoes de baixa capitalizacao tem potencial de retornos superiores a media do mercado
- Porem, liquidez reduzida e um risco significativo
- O "premio de tamanho" (size anomaly) persiste mesmo apos controlar para beta de mercado, efeito valor, momentum e liquidez

**Cuidados para implementacao:**
- Filtrar por liquidez minima (volume diario medio > R$ 500k)
- Considerar spread bid-ask (pode ser 1-3% em small caps iliquidas)
- Limitar exposicao individual a 5-7% do portfolio
- Rebalanceamento trimestral ou semestral para reduzir custos

### 10.3 Score Integrado de Value Investing

```python
class ValueInvestingScore:
    """
    Score integrado que combina multiplos modelos de value investing.
    """

    def calcular_score_completo(self, empresa):
        """
        Calcula score integrado de 0-100 combinando:
        - Graham criteria
        - Greenblatt Magic Formula
        - Piotroski F-Score
        - Altman Z-Score (seguranca financeira)
        - Beneish M-Score (ausencia de manipulacao)
        - Metricas de qualidade
        """
        scores = {}

        # 1. Graham Score (0-20)
        scores['graham'] = self._graham_score(empresa)

        # 2. Magic Formula Rank (0-20)
        scores['magic_formula'] = self._magic_formula_rank(empresa)

        # 3. F-Score (0-18, normalizado de 0-9 * 2)
        scores['f_score'] = piotroski_f_score(empresa, empresa.anterior) * 2

        # 4. Z-Score Safety (0-15)
        z = altman_z_score_emergente(empresa)
        scores['z_score'] = min(15, max(0, (z['z_score'] - 1.1) / (2.6 - 1.1) * 15))

        # 5. M-Score Clean (0-12)
        m = beneish_m_score(empresa)
        scores['m_score'] = 12 if m < -1.78 else 0  # Binario: limpo ou suspeito

        # 6. Quality Premium (0-15)
        scores['quality'] = self._quality_premium(empresa)

        total = sum(scores.values())

        # Classificacao
        if total >= 75:
            classificacao = 'STRONG_BUY'
        elif total >= 60:
            classificacao = 'BUY'
        elif total >= 40:
            classificacao = 'HOLD'
        elif total >= 25:
            classificacao = 'SELL'
        else:
            classificacao = 'STRONG_SELL'

        return {
            'score_total': total,
            'classificacao': classificacao,
            'detalhamento': scores,
            'max_possivel': 100
        }
```

---

## 11. Arquitetura de Automacao Proposta

### 11.1 Pipeline Completo

```
[Coleta de Dados] --> [Processamento] --> [Analise] --> [Sinais] --> [Execucao]
      |                     |                |             |             |
   CVM/B3/BACEN      Padronizacao      Valuation      Ranking      Portfolio
   APIs externas      Limpeza          Multiplos      Scoring      Rebalanceamento
   Web scraping       Validacao        NLP            Filtros      Gestao de risco
```

### 11.2 Modulos do Bot

```python
# Arquitetura modular para o bot fundamentalista
modulos = {
    'coleta': {
        'cvm_collector': 'Coleta DFP/ITR do Portal Dados Abertos CVM',
        'b3_collector': 'Cotacoes, indices, dados corporativos da B3',
        'macro_collector': 'SELIC, IPCA, PIB, cambio do BACEN SGS/Focus',
        'commodity_collector': 'Precos de commodities (Brent, ferro, celulose)',
        'news_collector': 'Fatos relevantes CVM + noticias financeiras',
    },
    'processamento': {
        'financial_parser': 'Padroniza DFs para formato uniforme',
        'indicator_calculator': 'Calcula 50+ indicadores fundamentalistas',
        'quality_checker': 'Accruals, Beneish M-Score, validacao de dados',
    },
    'analise': {
        'dcf_engine': 'DCF automatizado com CRP e Monte Carlo',
        'multiples_engine': 'Valuation por multiplos com peers setoriais',
        'scoring_engine': 'F-Score, Z-Score, Magic Formula, Graham',
        'nlp_engine': 'FinBERT-PT-BR para sentimento de fatos/noticias',
        'macro_engine': 'Regime macro e sensibilidade setorial',
    },
    'sinais': {
        'screener': 'Screening multi-criterio configuravel',
        'ranker': 'Ranking composto Value + Quality + Momentum',
        'alert_system': 'Alertas de oportunidade e risco',
        'consensus_tracker': 'Monitoramento de surpresas de resultados',
    },
    'portfolio': {
        'optimizer': 'Otimizacao de portfolio com restricoes',
        'rebalancer': 'Rebalanceamento periodico com custos',
        'risk_manager': 'Limites de exposicao e stop-loss fundamentalista',
    }
}
```

### 11.3 Frequencia de Atualizacao

| Componente | Frequencia | Justificativa |
|-----------|------------|---------------|
| Cotacoes | Intradiario (5-15 min) | Calculo de multiplos atualizados |
| Indicadores fundamentalistas | Diario | Recalculo com novo preco |
| DFP/ITR | Trimestral/Anual | Conforme divulgacao |
| Dados macro | Diario | SELIC, IPCA, cambio |
| NLP fatos relevantes | Tempo real | Alertas imediatos |
| Rebalanceamento | Trimestral | Balancar custos vs. alpha |
| Valuation DCF | Trimestral + ad hoc | Apos novos resultados ou evento material |

---

## 12. Referencias Completas

### Artigos Academicos e Working Papers

1. **Araujo, E. et al.** (2021). "Long-term stock returns in Brazil: Volatile equity returns for U.S.-like investors." *International Journal of Finance & Economics*, Wiley. BCB Working Paper 525. URL: https://www.bcb.gov.br/pec/wps/ingl/wps525.pdf - Tipo: Working Paper / Artigo Academico.

2. **Galdi, F. & Lopes, A.** (2008). "An Emerging Markets Analysis of the Piotroski F-Score." *ResearchGate*. URL: https://www.researchgate.net/publication/251354092_An_Emerging_Markets_Analysis_of_the_Piotroski_F_Score - Tipo: Artigo Academico. Retorno anormal de 26.7% ao ano para portfolio de alto F-Score no Brasil (1994-2004).

3. **Hyde, C.E.** (2020). "Piotroski's FSCORE: international evidence." *Journal of Asset Management*, Springer. URL: https://link.springer.com/article/10.1057/s41260-020-00157-2 - Tipo: Artigo Academico. FSCORE como preditor de retornos em mercados internacionais (2000-2018).

4. **Damodaran, A.** (2025). "Country Risk: Determinants, Measures and Implications -- The 2025 Edition." SSRN. URL: https://papers.ssrn.com/sol3/Delivery.cfm/5354459.pdf?abstractid=5354459 - Tipo: Working Paper Anual. Referencia para CRP, atualizado em janeiro 2026.

5. **Damodaran, A.** (2025). "Equity Risk Premiums (ERP): Determinants, Estimation, and Implications -- The 2025 Edition." SSRN. URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5168609 - Tipo: Working Paper Anual.

6. **Altman, E.** (2020). "A fifty-year retrospective on credit risk models, the Altman Z-score models." URL: https://mebfaber.com/wp-content/uploads/2020/11/Altman_Z_score_models_final.pdf - Tipo: Retrospectiva Academica. Inclui modelo Z''-Score para mercados emergentes.

7. **SciELO Brazil** -- "Predictive ability of accruals before and after IFRS in the Brazilian stock market." *Revista Contabilidade & Financas*. URL: https://www.scielo.br/j/rcf/a/XcV3K3R9CX3rdN8v4Y4yXFJ/ - Tipo: Artigo Academico. Accruals discricionarios e nao-discricionarios pos-IFRS no Brasil.

8. **Jabbour, E. et al.** -- "The effect of IFRS on earnings management in Brazilian non-financial public companies." *ScienceDirect*. URL: https://www.sciencedirect.com/science/article/abs/pii/S1566014114000405 - Tipo: Artigo Academico. Efeito restritivo do IFRS sobre gerenciamento de resultados no Brasil.

9. **SciELO Brazil** -- "Analysis of value portfolios in the Brazilian market." *Revista Contabilidade & Financas*. URL: https://www.scielo.br/j/rcf/a/xNKjmWngqp9qVDYs3mQNPBG/?lang=en - Tipo: Artigo Academico. Portfolios de valor superam Ibovespa em Sharpe ratio.

10. **SciELO Brazil** -- "Value and growth stocks in Brazil: risks and returns." *Revista Contabilidade & Financas*. URL: https://revistas.usp.br/rcf/article/download/34334/37066 - Tipo: Artigo Academico. Acoes de valor superam acoes de crescimento no mercado brasileiro.

11. **Redalyc** -- "Sentiment Analysis in Annual Reports from Brazilian Companies Listed at BM&FBovespa." URL: https://www.redalyc.org/journal/3372/337246237005/html/ - Tipo: Artigo Academico. Desenvolvimento de vocabulario financeiro em portugues (8M+ palavras); associacao fraca entre tom e retornos.

12. **ArXiv** (2025) -- "AlphaX: An AI-Based Value Investing Strategy for the Brazilian Stock Market." URL: https://arxiv.org/html/2508.13429 - Tipo: Pre-print. Estrategia de value investing baseada em IA com dados B3/CVM.

13. **REPeC** -- "Value Investing in Brazil: A Novel Application of Benjamin Graham." URL: https://www.repec.org.br/repec/article/download/3346/1871/11899 - Tipo: Artigo Academico. Criterios de Graham adaptados geram alpha com portfolios concentrados (10 ativos).

14. **SciELO Brazil** -- "Value investing: a new SCORE model." *Revista Brasileira de Gestao de Negocios*. URL: https://www.scielo.br/j/rbgn/a/KPHZYWrd6pGbq5zXYWc3MSK/?lang=en - Tipo: Artigo Academico. Novo modelo de score para value investing.

### Fontes de Dados e Plataformas

15. **CVM** -- Portal Dados Abertos. URL: https://dados.cvm.gov.br/ - Tipo: Base de Dados Oficial. Dados de DFP, ITR e Formularios de Referencia.

16. **CVM** -- DFP Dataset. URL: https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp - Tipo: Dataset. Demonstracoes Financeiras Padronizadas em CSV/ZIP.

17. **CVM** -- ITR Dataset. URL: https://dados.cvm.gov.br/dataset/cia_aberta-doc-itr - Tipo: Dataset. Informacoes Trimestrais em CSV/ZIP.

18. **Damodaran, A.** -- Country Default Spreads and Risk Premiums (atualizado Jan/2026). URL: https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/ctryprem.html - Tipo: Base de Dados. CRP para todos os paises.

19. **Economatica** -- Plataforma de investimento. URL: https://www.economatica.com/ - Tipo: Plataforma Institucional. 26.300+ empresas, multiplos setoriais.

20. **Quantum Finance** -- Plataforma com IA. URL: https://quantumfinance.com.br/ - Tipo: Plataforma Institucional. 1.700+ empresas brasileiras, tecnologia AES.

21. **StatusInvest** -- Plataforma de investimentos. URL: https://statusinvest.com.br/ - Tipo: Plataforma Gratuita/Freemium. Indicadores fundamentalistas B3.

22. **Fundamentus** -- Analise fundamentalista. URL: https://www.fundamentus.com.br/ - Tipo: Plataforma Gratuita. Indicadores fundamentalistas historicos.

23. **Kroll** -- "Multiplos da Industria na America Latina -- 3o trimestre 2024." URL: https://www.kroll.com/en/publications/valuation/industry-multiples-in-latin-america-q3-2024 - Tipo: Relatorio Trimestral. Benchmarks de EV/EBITDA por industria.

24. **XP Investimentos** -- "Tabela de Multiplos." URL: https://conteudos.xpi.com.br/acoes/relatorios/tabela-de-multiplos-xp/ - Tipo: Relatorio Semanal. Multiplos atualizados para acoes sob cobertura.

### Bibliotecas e Ferramentas

25. **brFinance** -- Biblioteca Python para dados CVM/B3. URL: https://github.com/eudesrodrigo/brFinance - Tipo: Biblioteca Open Source.

26. **BrazilianMarketDataCollector** -- Coletor de dados financeiros brasileiros. URL: https://github.com/gustavomoers/BrazilianMarketDataCollector - Tipo: Biblioteca Open Source. 177 colunas, 355 empresas.

27. **BRValue-py** -- Analise fundamentalista e valuation. URL: https://github.com/luiz-EL/BRValue-py - Tipo: Biblioteca Open Source.

28. **fundamentus (Python)** -- API para scraping do Fundamentus. URL: https://github.com/phoemur/fundamentus - Tipo: Biblioteca Open Source.

29. **FinBERT-PT-BR** -- Modelo de sentimento financeiro em portugues. URL: https://huggingface.co/lucas-leme/FinBERT-PT-BR - Tipo: Modelo de NLP (Hugging Face). Treinado em corpus financeiro brasileiro.

30. **FinBERT** (original) -- Financial Sentiment Analysis. URL: https://huggingface.co/ProsusAI/finbert - Tipo: Modelo de NLP. Araci (2019), ArXiv 1908.10063.

### Pesquisa Macroeconomica

31. **SCIRP** -- "Macroeconomic Determinants of the Brazilian Stock Market: An Autoregressive Distributed Lag Approach." URL: https://www.scirp.org/journal/paperinformation?paperid=137237 - Tipo: Artigo Academico. VAR/VEC com SELIC, IPCA e Ibovespa (2011-2022).

32. **MDPI** -- "Influence of Macroeconomic Variables on the Brazilian Stock Market." URL: https://www.mdpi.com/1911-8074/18/8/451 - Tipo: Artigo Academico.

33. **BCB** -- "Is the Equity Risk Premium Compressed in Brazil?" Working Paper 527. URL: https://www.bcb.gov.br/pec/wps/ingl/wps527.pdf - Tipo: Working Paper. Premio de risco comprimido vs. historico.

34. **Repositorio UFU** -- "Automatizacao da Analise Fundamentalista." URL: https://repositorio.ufu.br/bitstream/123456789/36480/1/Automatiza%C3%A7%C3%A3oAn%C3%A1liseFundamentalista.pdf - Tipo: Dissertacao/TCC. Automatizacao de analise fundamentalista no mercado brasileiro.

35. **Preco Justo AI** -- Plataforma de valuation automatizado. URL: https://precojusto.ai/ - Tipo: Plataforma. 8 modelos de valuation (Graham, Barsi, Formula Magica) em 500+ empresas B3.

---

## Consideracoes Finais

### Implicacoes para Automacao

1. **Viabilidade**: A automatizacao da analise fundamentalista no Brasil e plenamente viavel. Os dados estao disponiveis (CVM, B3, BACEN), existem bibliotecas Python maduras, e modelos de NLP em portugues ja estao treinados.

2. **Vantagem competitiva**: A maioria dos investidores brasileiros ainda utiliza analise manual. Um bot fundamentalista automatizado com processamento de 400+ empresas simultaneamente, com atualizacao diaria de multiplos e trimestral de valuation, representa uma vantagem significativa.

3. **Desafios criticos**:
   - **Qualidade dos dados**: Dados CVM podem conter inconsistencias; e necessario validacao robusta
   - **Particularidades contabeis**: JCP, revalorizacao de ativos, contingencias fiscais exigem tratamento especial
   - **Liquidez**: Muitas acoes na B3 tem liquidez insuficiente para operacao automatizada
   - **Eventos idiossincraticos**: Risco politico, intervencao estatal (Petrobras), mudancas regulatorias

4. **Combinacao de modelos**: A evidencia sugere que nenhum modelo isolado e consistentemente superior. A abordagem otima e um ensemble que combine:
   - DCF para estimativas de valor intrinseco
   - Multiplos para validacao relativa
   - F-Score e Z-Score para filtro de qualidade e seguranca
   - Magic Formula e screening composto para geracao de ideias
   - NLP para sinais de sentimento e alertas
   - Macro para timing setorial e ajuste de premissas

5. **Rebalanceamento**: Evidencias indicam que rebalanceamento trimestral e o ponto otimo entre captura de alpha e minimizacao de custos de transacao no mercado brasileiro.

6. **Concentracao vs. diversificacao**: Pesquisa brasileira sugere que portfolios concentrados (10-15 acoes) de value investing geram mais alpha que portfolios diversificados (20-30 acoes), contrariando a sabedoria convencional de diversificacao.

---

*Documento elaborado como base de conhecimento para desenvolvimento de bot de investimentos fundamentalista automatizado para o mercado brasileiro. Todas as fontes foram verificadas e datam de publicacoes entre 2008 e 2026.*

*Ultima atualizacao: Fevereiro 2026*
