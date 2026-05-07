# Implementação Técnica — Ferramenta de Cálculo de IR sobre Ações
## Integrada ao CRM Next.js 14 + Firebase

> **Data:** Maio 2026
> **Escopo:** Implementação técnica completa para cálculo de IR sobre ações no contexto de CRM de assessores XP
> **Stack alvo:** Next.js 14, TypeScript, Tailwind CSS, Firebase Firestore, Firebase Functions v2
> **Fontes:** 15+ referências técnicas documentadas

---

## 1. Visão Geral da Arquitetura do Módulo

O módulo de IR sobre Ações é um subsistema autossuficiente que se conecta ao CRM existente via Firestore como camada de dados compartilhada. A arquitetura segue o princípio de **processamento em camadas progressivas**: ingestão de PDF → parsing estruturado → cálculo fiscal → persistência → relatório.

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS 14 FRONTEND                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ UploadNota   │  │ DashboardIR  │  │  RelatórioPDF    │  │
│  │ Component    │  │ Component    │  │  (react-pdf)     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐  │
│  │              irCalculator (lib/ir/)                   │  │
│  │  pmCalculator  |  apuracaoMensal  |  darfGenerator    │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │
              ┌───────────────▼───────────────┐
              │      FIREBASE ECOSYSTEM        │
              │  Firestore  │  Functions v2    │
              │  (Dados)    │  (PDF Parse)     │
              └───────────────────────────────┘
```

**Decisão de arquitetura crítica:** O parsing de PDF e o cálculo de IR ficam em **camadas separadas**. O parsing é delegado a uma Firebase Function v2 (Python runtime via Cloud Run) usando pdfplumber + correpy, enquanto a lógica de cálculo fiscal roda em TypeScript no frontend — eliminando round-trips desnecessários para cálculos de preco médio e apuração mensal.

---

## 2. Parsing de PDF de Nota de Corretagem

### 2.1 Comparação de Bibliotecas

#### JavaScript/TypeScript (Browser)

| Biblioteca | Extração de Tabelas | Browser Support | Tamanho Bundle | Nota |
|-----------|-------------------|-----------------|----------------|------|
| **pdfjs-dist v5.7** | Manual (coordenadas) | Nativo (Web Worker) | ~3MB | Mantida pela Mozilla; requer reconstrução de tabelas por posição |
| **pdf.js-extract** | Semi-automática | Sim (via pdfjs) | ~3.2MB | Wrapper de pdfjs que agrupa items por posição Y |
| **pdf-parse** (mehmet-kozan) | Tabelas automáticas | Sim (pure TS) | ~500KB | Pura TypeScript; executa no browser; mais leve |
| **pdfreader** | Detecção automática de colunas | Node apenas | — | Bom para tabular data; sem suporte browser |
| **LibPDF** | Completa | Node 18+, Bun, Browser | ~2MB | API moderna TypeScript; sem polyfills |

**Veredicto para browser (Next.js):** `pdfjs-dist` é a escolha mais segura por ser a referência canônica da Mozilla e suportar Web Workers nativamente — essencial para não bloquear a UI durante parsing de notas com múltiplas páginas. A versão 5.7.284 (publicada em 2026) tem tipos TypeScript próprios.

#### Python (Firebase Function / Cloud Run)

| Biblioteca | Acurácia Tabelas Financeiras | Velocidade | Nota Sinacor |
|-----------|------------------------------|------------|--------------|
| **pdfplumber** | 94% (clean), 78% (messy) | Média | Excelente — usa posicionamento interno de caracteres |
| **Camelot** | 88% (clean), 61% (messy) | Lenta | Bom para tabelas com bordas; requer Ghostscript |
| **PyMuPDF (fitz)** | 82% (clean), 48% (messy) | 0.8s/100 páginas | Rápido mas sem detecção semântica de tabelas |
| **Tabula-py** | 91% (clean), 52% (messy) | Média | Requer JVM; impraticável em serverless |
| **correpy** | N/A (domínio-específico) | Rápida | Parseia Sinacor nativamente — **recomendado como base** |

**Veredicto Python:** A biblioteca **correpy** (github.com/thiagosalvatore/correpy) é especializada no formato Sinacor B3 e retorna um objeto `BrokerageNote` estruturado com todos os campos já mapeados (ticker, quantidade, preço, taxas, IRRF). Para robustez, combine correpy com pdfplumber como fallback para formatos não-padrão.

**Acurácia combinada:** pdfplumber + validação LLM atinge ~92% em documentos financeiros complexos (referência: bswen.com benchmark em 50 PDFs financeiros, Março/2026).

### 2.2 Estrutura da Nota Sinacor

Uma nota de corretagem no padrão Sinacor (B3) contém três seções principais que o parser deve extrair:

```
NOTA DE CORRETAGEM — SINACOR B3
├── Cabeçalho
│   ├── Nr. nota: 12345
│   ├── Data pregão: DD/MM/YYYY
│   └── Nome corretora / CNPJ
├── Negócios Realizados (tabela principal)
│   ├── Q (C/V)        — tipo: Compra ou Venda
│   ├── Mercado        — ex: "BOVESPA"
│   ├── Prazo          — vazio ou data para opções
│   ├── Especificação do título — ex: "PETR4 ON"
│   ├── Obs. (*)       — flags especiais
│   ├── Quantidade     — ex: 100
│   ├── Preço/Ajuste   — ex: 38,52
│   └── Valor Operação (D/C) — ex: 3.852,00 D
└── Resumo Financeiro
    ├── Taxa operacional
    ├── Emolumentos
    ├── Taxa de liquidação
    ├── IRRF (Day Trade ou Normal)
    └── Líquido para (D/C)
```

### 2.3 Parser com pdfjs-dist no Browser (TypeScript)

```typescript
// lib/pdf/notaParser.ts
import * as pdfjsLib from 'pdfjs-dist';

// IMPORTANTE: configurar worker para não bloquear main thread
// Em Next.js 14 App Router, usar dynamic import com { ssr: false }
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
}

export interface OperacaoRaw {
  tipo: 'C' | 'V';            // Compra ou Venda
  ticker: string;             // ex: "PETR4"
  quantidade: number;
  preco: number;              // preço unitário
  valorTotal: number;         // bruto da operação
  isDayTrade: boolean;        // mesmo ticker C+V no mesmo pregão
}

export interface NotaCorretagem {
  nrNota: string;
  dataPregao: Date;
  corretora: string;
  operacoes: OperacaoRaw[];
  taxaOperacional: number;
  emolumentos: number;
  taxaLiquidacao: number;
  irrfNormal: number;         // 0.005% sobre vendas ST
  irrfDayTrade: number;       // 1% sobre resultado líquido DT
  liquidoParaCliente: number;
}

/**
 * Extrai todos os text items de uma página PDF com suas coordenadas.
 * Essencial para reconstruir tabelas por proximidade espacial.
 */
async function extractPageItems(page: pdfjsLib.PDFPageProxy): Promise<TextItem[]> {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1.0 });

  return textContent.items
    .filter((item): item is pdfjsLib.TextItem => 'str' in item && item.str.trim() !== '')
    .map((item) => {
      // Transformar coordenadas PDF (bottom-left origin) para top-left
      const transform = pdfjsLib.Util.transform(
        pdfjsLib.Util.transform(viewport.transform, item.transform),
        [1, 0, 0, -1, 0, 0]
      );
      return {
        str: item.str.trim(),
        x: Math.round(transform[4]),
        y: Math.round(Math.abs(transform[5])),
        width: item.width,
        height: item.height,
        fontName: item.fontName,
      };
    });
}

/**
 * Agrupa text items em linhas por proximidade vertical (tolerância: 3px).
 * Fundamental para reconstruir linhas de tabela.
 */
function groupItemsIntoRows(items: TextItem[], yTolerance = 3): TextItem[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [];
  let currentY = -1;

  for (const item of sorted) {
    if (currentY === -1 || Math.abs(item.y - currentY) <= yTolerance) {
      currentRow.push(item);
      currentY = currentY === -1 ? item.y : Math.min(currentY, item.y);
    } else {
      if (currentRow.length > 0) rows.push(currentRow.sort((a, b) => a.x - b.x));
      currentRow = [item];
      currentY = item.y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow.sort((a, b) => a.x - b.x));

  return rows;
}

/**
 * Parseia o ticker da especificação do título Sinacor.
 * Exemplos: "PETR4 ON NM", "VALE3 ON EJ N2", "MGLU3 ON"
 */
function parseTicker(especificacao: string): string {
  const match = especificacao.match(/^([A-Z]{4}\d{1,2}[A-Z]?)\b/);
  return match ? match[1] : especificacao.split(' ')[0];
}

/**
 * Parseia valor monetário brasileiro para number.
 * "3.852,00 D" → -3852.00 (débito = saída de caixa para compras)
 * "3.852,00 C" → +3852.00
 */
function parseBRLValue(str: string): number {
  const isDebit = str.trim().endsWith('D');
  const cleaned = str.replace(/[^\d,]/g, '').replace(',', '.');
  const value = parseFloat(cleaned) || 0;
  return isDebit ? -value : value;
}

/**
 * Parseia uma nota de corretagem Sinacor a partir de um ArrayBuffer de PDF.
 * Usa pdfjs-dist com posicionamento espacial para reconstruir tabelas.
 */
export async function parseNotaCorretagem(pdfBuffer: ArrayBuffer): Promise<NotaCorretagem> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;

  const allItems: TextItem[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const items = await extractPageItems(page);
    allItems.push(...items);
  }

  const rows = groupItemsIntoRows(allItems);

  // Extrair metadados do cabeçalho
  const nrNotaRow = rows.find(r => r.some(i => i.str.includes('Nr. nota')));
  const nrNota = nrNotaRow
    ? nrNotaRow.find(i => /^\d+$/.test(i.str))?.str ?? ''
    : '';

  const dataPregaoRow = rows.find(r => r.some(i => i.str.includes('Data pregão')));
  const dataPregaoStr = dataPregaoRow
    ? dataPregaoRow.find(i => /\d{2}\/\d{2}\/\d{4}/.test(i.str))?.str ?? ''
    : '';
  const [day, month, year] = dataPregaoStr.split('/').map(Number);
  const dataPregao = new Date(year, month - 1, day);

  // Detectar seção de negócios (entre header e resumo financeiro)
  const headerIdx = rows.findIndex(r =>
    r.some(i => i.str.includes('Especificação do título'))
  );
  const resumoIdx = rows.findIndex(r =>
    r.some(i => i.str.includes('Resumo Financeiro') || i.str.includes('Resumo dos Negócios'))
  );

  const operacoesRaw: OperacaoRaw[] = [];
  const tickersByCVType: Record<string, Set<string>> = { C: new Set(), V: new Set() };

  if (headerIdx !== -1 && resumoIdx !== -1) {
    const operacoesRows = rows.slice(headerIdx + 1, resumoIdx);

    for (const row of operacoesRows) {
      const rowText = row.map(i => i.str).join(' ');
      // Linha de operação: começa com C ou V seguido de código de mercado
      const tipoMatch = rowText.match(/^([CV])\s+(?:BOVESPA|B3)/i);
      if (!tipoMatch) continue;

      const tipo = tipoMatch[1] as 'C' | 'V';
      // Ticker está após "BOVESPA" ou "B3"
      const especIdx = row.findIndex(i => /^[A-Z]{4}\d/.test(i.str));
      if (especIdx === -1) continue;

      const ticker = parseTicker(row[especIdx].str);
      const quantStr = row.find(i => /^\d+$/.test(i.str) && parseInt(i.str) < 1_000_000)?.str ?? '0';
      const quantidade = parseInt(quantStr);
      // Preço: número com vírgula decimal, ex "38,52"
      const precoStr = row.find(i => /^\d{1,6},\d{2}$/.test(i.str))?.str ?? '0,00';
      const preco = parseFloat(precoStr.replace(',', '.'));
      const valorTotal = quantidade * preco;

      tickersByCVType[tipo].add(ticker);
      operacoesRaw.push({ tipo, ticker, quantidade, preco, valorTotal, isDayTrade: false });
    }
  }

  // Detectar day trade: mesmo ticker aparece em C e V no mesmo pregão
  for (const op of operacoesRaw) {
    const outroTipo = op.tipo === 'C' ? 'V' : 'C';
    if (tickersByCVType[outroTipo].has(op.ticker)) {
      op.isDayTrade = true;
    }
  }

  // Extrair resumo financeiro
  const findResumoValue = (label: string): number => {
    const row = rows.find(r => r.some(i => i.str.toLowerCase().includes(label.toLowerCase())));
    if (!row) return 0;
    const valueItem = row.filter(i => /[\d,]+/.test(i.str)).pop();
    return valueItem ? parseBRLValue(valueItem.str) : 0;
  };

  return {
    nrNota,
    dataPregao,
    corretora: 'XP Investimentos', // extrair do header
    operacoes: operacoesRaw,
    taxaOperacional: Math.abs(findResumoValue('Taxa operacional')),
    emolumentos: Math.abs(findResumoValue('Emolumentos')),
    taxaLiquidacao: Math.abs(findResumoValue('Taxa de liquidação')),
    irrfNormal: Math.abs(findResumoValue('I.R.R.F')),
    irrfDayTrade: Math.abs(findResumoValue('I.R.R.F Day')),
    liquidoParaCliente: findResumoValue('Líquido para'),
  };
}
```

### 2.4 Abordagem Alternativa: Firebase Function (Python + correpy)

Para máxima precisão, o parsing pode ser delegado a uma Firebase Function v2 em Python:

```python
# functions/parse_nota/main.py
import functions_framework
from correpy.parsers.brokerage_notes.parser_factory import ParserFactory
from io import BytesIO
import json
from decimal import Decimal

@functions_framework.http
def parse_nota_corretagem(request):
    """Firebase Function v2 HTTP: recebe PDF base64, retorna JSON estruturado."""
    if request.method != 'POST':
        return ('Method Not Allowed', 405)

    data = request.get_json()
    pdf_bytes = base64.b64decode(data['pdfBase64'])
    pdf_stream = BytesIO(pdf_bytes)

    parser = ParserFactory.get_parser(pdf_stream)
    nota = parser.parse_brokerage_note()

    # Serializar Decimal para float (JSON-safe)
    def decimal_to_float(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    result = {
        'nrNota': nota.reference_id,
        'dataPregao': nota.settlement_date.isoformat() if nota.settlement_date else None,
        'operacoes': [
            {
                'tipo': op.buy_sell.value,
                'ticker': op.security.ticker,
                'quantidade': int(op.amount),
                'preco': float(op.unit_price),
                'valorTotal': float(op.unit_price * op.amount),
            }
            for op in nota.transactions
        ],
        'irrfNormal': float(nota.source_withheld_tax or 0),
        'taxaLiquidacao': float(nota.settlement_fee or 0),
        'emolumentos': float(nota.emoluments or 0),
    }

    return (json.dumps(result, default=decimal_to_float), 200, {'Content-Type': 'application/json'})
```

---

## 3. Modelo de Dados Firestore

O módulo utiliza **5 collections** no Firestore, todas organizadas sob o path `usuarios/{uid}/` para isolamento por assessor/cliente.

### 3.1 Collection: `notas_corretagem`

Registro imutável de cada nota importada. Nunca atualizado após criação.

```typescript
// types/firestore.ts

/** Path: usuarios/{uid}/clientes/{clienteId}/notas_corretagem/{notaId} */
interface NotaCorretagemDoc {
  id: string;                    // gerado pelo Firestore
  clienteId: string;             // referência ao cliente
  uid: string;                   // assessor owner

  // Metadados da nota
  nrNota: string;                // "12345"
  dataPregao: Timestamp;         // data do pregão
  corretora: string;             // "XP Investimentos"
  cnpjCorretora?: string;        // "02.332.886/0001-04"
  anoMes: string;                // "2026-04" — para queries mensais

  // Operações realizadas no pregão
  operacoes: OperacaoFirestore[];

  // Resumo financeiro (valores em reais)
  resumoFinanceiro: {
    taxaOperacional: number;
    emolumentos: number;
    taxaLiquidacao: number;
    irrfNormal: number;          // IRRF 0.005% sobre vendas ST
    irrfDayTrade: number;        // IRRF 1% sobre resultado DT líquido
    liquidoParaCliente: number;  // positivo = crédito, negativo = débito
  };

  // Controle
  status: 'processando' | 'processado' | 'erro';
  erroMsg?: string;
  importadoEm: Timestamp;
  pdfStoragePath: string;        // caminho no Firebase Storage
}

interface OperacaoFirestore {
  tipo: 'C' | 'V';
  ticker: string;                // "PETR4"
  quantidade: number;            // 100
  preco: number;                 // 38.52 (float, centavos evitados por precisão)
  valorBruto: number;            // 3852.00
  isDayTrade: boolean;
  custoRateado?: number;         // parcela de taxas rateadas proporcionalmente
}
```

**Exemplo de documento:**
```json
{
  "id": "nota_20260415_12345",
  "clienteId": "cliente_abc123",
  "uid": "assessor_xyz",
  "nrNota": "12345",
  "dataPregao": "2026-04-15T00:00:00Z",
  "corretora": "XP Investimentos",
  "anoMes": "2026-04",
  "operacoes": [
    {
      "tipo": "C",
      "ticker": "PETR4",
      "quantidade": 100,
      "preco": 38.52,
      "valorBruto": 3852.00,
      "isDayTrade": false,
      "custoRateado": 5.20
    },
    {
      "tipo": "V",
      "ticker": "VALE3",
      "quantidade": 50,
      "preco": 68.10,
      "valorBruto": 3405.00,
      "isDayTrade": false,
      "custoRateado": 4.60
    }
  ],
  "resumoFinanceiro": {
    "taxaOperacional": 18.50,
    "emolumentos": 0.78,
    "taxaLiquidacao": 5.45,
    "irrfNormal": 0.17,
    "irrfDayTrade": 0.00,
    "liquidoParaCliente": -461.90
  },
  "status": "processado",
  "importadoEm": "2026-05-01T14:30:00Z",
  "pdfStoragePath": "clientes/cliente_abc123/notas/nota_12345.pdf"
}
```

### 3.2 Collection: `posicoes_ir`

Estado atual do preço médio ponderado por ticker. **Mutable** — atualizado a cada nota processada.

```typescript
/** Path: usuarios/{uid}/clientes/{clienteId}/posicoes_ir/{ticker} */
interface PosicaoIRDoc {
  ticker: string;              // "PETR4" — também é o document ID
  clienteId: string;
  uid: string;

  // Estado atual da posição
  quantidade: number;          // qtd atual em custódia
  pm: number;                  // preço médio ponderado atual (R$)
  custoTotal: number;          // quantidade * pm (custo fiscal total)

  // Histórico resumido para auditoria
  ultimaAtualizacao: Timestamp;
  ultimaNotaId: string;        // rastreabilidade

  // Flags
  possuiDayTradeAberto: boolean; // se há posição DT não zerada (raro)
}
```

**Exemplo:**
```json
{
  "ticker": "PETR4",
  "clienteId": "cliente_abc123",
  "quantidade": 300,
  "pm": 37.85,
  "custoTotal": 11355.00,
  "ultimaAtualizacao": "2026-04-15T18:00:00Z",
  "ultimaNotaId": "nota_20260415_12345",
  "possuiDayTradeAberto": false
}
```

### 3.3 Collection: `resultado_mensal`

Apuração fiscal consolidada por mês. Calculado ao processar todas as notas do mês.

```typescript
/** Path: usuarios/{uid}/clientes/{clienteId}/resultado_mensal/{anoMes} */
interface ResultadoMensalDoc {
  anoMes: string;              // "2026-04" — document ID
  clienteId: string;
  uid: string;

  // Resultados brutos
  vendasST: number;            // total de vendas swing trade no mês (para isenção)
  ganhoLiquidoST: number;      // ganho líquido ST (após custos): pode ser negativo
  ganhoLiquidoDT: number;      // ganho líquido DT: pode ser negativo

  // Compensação de prejuízos (antes da tributação)
  prejuizoCompensadoST: number; // quanto do saldo_prejuizo foi usado neste mês (ST)
  prejuizoCompensadoDT: number; // idem para DT

  // Base de cálculo após compensação
  baseCalculoST: number;       // max(0, ganhoLiquidoST - prejuizoCompensadoST)
  baseCalculoDT: number;       // max(0, ganhoLiquidoDT - prejudizoCompensadoDT)

  // Isenção ST
  isentoST: boolean;           // vendasST <= 20000
  ganhoIsentoST: number;       // se isentoST: baseCalculoST (isento), else 0

  // IR a pagar
  aliquotaST: number;          // 0.15 (15%)
  aliquotaDT: number;          // 0.20 (20%)
  irBrutoST: number;           // baseCalculoST * 0.15 (se não isento)
  irBrutoDT: number;           // baseCalculoDT * 0.20

  // IRRF deduzível (retenção na fonte das notas do mês)
  irrfST: number;              // soma irrfNormal de todas as notas do mês
  irrfDT: number;              // soma irrfDayTrade de todas as notas do mês

  // DARF a pagar
  darfST: number;              // max(0, irBrutoST - irrfST)
  darfDT: number;              // max(0, irBrutoDT - irrfDT)

  // Metadata
  statusDarf: 'nao_gerado' | 'gerado' | 'pago';
  notasProcessadas: string[];  // IDs das notas incluídas
  calculadoEm: Timestamp;
}
```

**Exemplo:**
```json
{
  "anoMes": "2026-04",
  "vendasST": 45000.00,
  "ganhoLiquidoST": 3200.00,
  "ganhoLiquidoDT": -500.00,
  "prejuizoCompensadoST": 800.00,
  "prejuizoCompensadoDT": 0,
  "baseCalculoST": 2400.00,
  "baseCalculoDT": 0,
  "isentoST": false,
  "ganhoIsentoST": 0,
  "irBrutoST": 360.00,
  "irBrutoDT": 0,
  "irrfST": 2.25,
  "irrfDT": 0,
  "darfST": 357.75,
  "darfDT": 0,
  "statusDarf": "gerado",
  "notasProcessadas": ["nota_20260401_11111", "nota_20260415_12345"],
  "calculadoEm": "2026-05-01T20:00:00Z"
}
```

### 3.4 Collection: `saldo_prejuizo`

Carry-forward de prejuízos acumulados. Um documento por tipo (ST/DT).

```typescript
/** Path: usuarios/{uid}/clientes/{clienteId}/saldo_prejuizo/{tipo} */
interface SaldoPrejuizoDoc {
  tipo: 'ST' | 'DT';          // document ID
  clienteId: string;
  uid: string;
  saldo: number;               // saldo acumulado de prejuízo (sempre >= 0)
  ultimaAtualizacao: Timestamp;
  historico: {                 // últimos 24 meses para rastreabilidade
    anoMes: string;
    variacao: number;          // negativo = prejuízo adicionado; positivo = compensado
    saldoApos: number;
  }[];
}
```

**Exemplo:**
```json
{
  "tipo": "ST",
  "saldo": 1250.00,
  "historico": [
    { "anoMes": "2026-01", "variacao": -2000.00, "saldoApos": 2000.00 },
    { "anoMes": "2026-02", "variacao": 750.00, "saldoApos": 1250.00 }
  ]
}
```

### 3.5 Collection: `eventos_corporativos`

Cache local de splits e grupamentos para ajuste automático de preço médio.

```typescript
/** Path: usuarios/{uid}/eventos_corporativos/{ticker}_{data} */
interface EventoCorporativoDoc {
  ticker: string;
  tipo: 'SPLIT' | 'GRUPAMENTO' | 'BONIFICACAO';
  dataEvento: Timestamp;
  fator: number;               // split 1:4 → fator = 4; grupamento 4:1 → fator = 0.25
  fonte: 'brapi' | 'manual';
  importadoEm: Timestamp;
}
```

---

## 4. Algoritmos de Cálculo Fiscal em TypeScript

### 4.1 Algoritmo de Preço Médio Ponderado

O Brasil exige **preço médio ponderado** (Instrução Normativa RFB). FIFO é proibido para ações.

```typescript
// lib/ir/pmCalculator.ts

/**
 * Representa o estado atual de uma posição em carteira para fins de PM.
 */
export interface EstadoPosicao {
  ticker: string;
  quantidade: number;    // 0 se zerada
  pm: number;            // preço médio ponderado (R$)
  custoTotal: number;    // quantidade * pm
}

/**
 * Resultado de processar uma operação sobre uma posição.
 */
export interface ResultadoOperacao {
  novoEstado: EstadoPosicao;
  ganhoCapital?: number;   // presente apenas em vendas (pode ser negativo = prejuízo)
  tipoOperacao: 'compra' | 'venda';
}

/**
 * Processa uma COMPRA sobre uma posição existente.
 *
 * Fórmula do novo PM:
 *   PM_novo = (custoTotal_anterior + valorCompra_total) / qtd_total_nova
 *
 * A venda NÃO altera o PM — apenas a quantidade.
 *
 * @param posicaoAtual - estado atual da posição (ou posição zerada)
 * @param quantidade - quantidade comprada
 * @param preco - preço unitário da compra
 * @param custoRateado - parcela de taxas (corretagem, emolumentos) rateadas nesta compra
 */
export function processarCompra(
  posicaoAtual: EstadoPosicao,
  quantidade: number,
  preco: number,
  custoRateado: number = 0
): ResultadoOperacao {
  // Custo total desta compra incluindo taxas rateadas
  const valorCompra = quantidade * preco + custoRateado;

  // Novo custo total acumulado
  const novoCustoTotal = posicaoAtual.custoTotal + valorCompra;

  // Nova quantidade total
  const novaQuantidade = posicaoAtual.quantidade + quantidade;

  // Novo PM: média ponderada considerando posição anterior + nova compra
  // Precisão: usar arredondamento a 10 casas decimais intermediário
  const novoPM = novaQuantidade > 0
    ? Math.round((novoCustoTotal / novaQuantidade) * 1e10) / 1e10
    : 0;

  return {
    novoEstado: {
      ticker: posicaoAtual.ticker,
      quantidade: novaQuantidade,
      pm: novoPM,
      custoTotal: novoCustoTotal,
    },
    tipoOperacao: 'compra',
  };
}

/**
 * Processa uma VENDA sobre uma posição existente.
 *
 * Regras:
 * 1. PM não se altera com a venda
 * 2. Custo total reduz proporcionalmente: custoTotal -= qtdVendida * PM_atual
 * 3. Ganho de capital = valorVenda - custoFiscal (pode ser negativo = prejuízo)
 * 4. Venda a descoberto (short selling) não é suportada neste módulo
 *
 * @param posicaoAtual - estado atual da posição
 * @param quantidade - quantidade vendida
 * @param preco - preço unitário da venda
 * @param custoRateado - parcela de taxas rateadas nesta venda (dedutível do ganho)
 */
export function processarVenda(
  posicaoAtual: EstadoPosicao,
  quantidade: number,
  preco: number,
  custoRateado: number = 0
): ResultadoOperacao {
  if (quantidade > posicaoAtual.quantidade) {
    throw new Error(
      `Venda de ${quantidade} unidades de ${posicaoAtual.ticker} excede posição de ${posicaoAtual.quantidade}`
    );
  }

  // Custo fiscal das ações vendidas (com base no PM atual)
  const custoFiscal = quantidade * posicaoAtual.pm;

  // Receita bruta da venda
  const receitaVenda = quantidade * preco;

  // Ganho de capital = receita - custo fiscal - custos operacionais
  // Negativo = prejuízo, que vai para carry-forward
  const ganhoCapital = receitaVenda - custoFiscal - custoRateado;

  // Atualizar posição: PM permanece igual, apenas quantidade e custo total reduzem
  const novaQuantidade = posicaoAtual.quantidade - quantidade;
  const novoCustoTotal = posicaoAtual.custoTotal - custoFiscal;

  return {
    novoEstado: {
      ticker: posicaoAtual.ticker,
      quantidade: novaQuantidade,
      pm: novaQuantidade > 0 ? posicaoAtual.pm : 0, // zera PM se posição zerada
      custoTotal: Math.max(0, novoCustoTotal),        // evitar floating point negativo residual
    },
    ganhoCapital,
    tipoOperacao: 'venda',
  };
}

/**
 * Ajusta PM e quantidade por evento corporativo (split/grupamento).
 *
 * Split 1:4 (fator=4): qtd *= 4; pm /= 4; custoTotal inalterado
 * Grupamento 4:1 (fator=0.25): qtd *= 0.25; pm /= 0.25; custoTotal inalterado
 *
 * @param posicao - posição a ajustar
 * @param fator - multiplicador de quantidade (split > 1, grupamento < 1)
 */
export function ajustarEventoCorporativo(
  posicao: EstadoPosicao,
  fator: number
): EstadoPosicao {
  const novaQuantidade = Math.round(posicao.quantidade * fator);
  const novoPM = posicao.pm / fator;
  // custo total permanece inalterado — apenas quantidade e PM mudam

  return {
    ...posicao,
    quantidade: novaQuantidade,
    pm: Math.round(novoPM * 1e10) / 1e10,
    // custoTotal inalterado
  };
}

/**
 * Processa um lote de operações de uma nota de corretagem, na ordem cronológica.
 * Retorna o novo estado de todas as posições afetadas e os ganhos/prejuízos gerados.
 *
 * @param posicoes - mapa de estado atual de todas as posições do cliente
 * @param operacoes - operações da nota, ordenadas por horário (compras antes de vendas
 *                    para day trade quando no mesmo ticker e pregão)
 */
export interface ResultadoLote {
  novasPosicoes: Map<string, EstadoPosicao>;
  ganhosST: Map<string, number>;  // ticker → ganho/prejuízo ST
  ganhosDT: Map<string, number>;  // ticker → resultado líquido DT
}

export function processarLoteOperacoes(
  posicoes: Map<string, EstadoPosicao>,
  operacoes: OperacaoFirestore[],
  custosTotaisNota: number
): ResultadoLote {
  const novasPosicoes = new Map(posicoes);
  const ganhosST = new Map<string, number>();
  const ganhosDT = new Map<string, number>();

  // Ratear custos proporcionalmente ao valor financeiro de cada operação
  const totalFinanceiro = operacoes.reduce((sum, op) => sum + op.valorBruto, 0);
  const getRateio = (op: OperacaoFirestore) =>
    totalFinanceiro > 0 ? (op.valorBruto / totalFinanceiro) * custosTotaisNota : 0;

  // Processar compras primeiro (day trade requer posição disponível)
  const compras = operacoes.filter(op => op.tipo === 'C');
  const vendas = operacoes.filter(op => op.tipo === 'V');

  for (const op of [...compras, ...vendas]) {
    const posicaoAtual = novasPosicoes.get(op.ticker) ?? {
      ticker: op.ticker,
      quantidade: 0,
      pm: 0,
      custoTotal: 0,
    };

    const custoRateado = getRateio(op);

    if (op.tipo === 'C') {
      const resultado = processarCompra(posicaoAtual, op.quantidade, op.preco, custoRateado);
      novasPosicoes.set(op.ticker, resultado.novoEstado);
    } else {
      const resultado = processarVenda(posicaoAtual, op.quantidade, op.preco, custoRateado);
      novasPosicoes.set(op.ticker, resultado.novoEstado);

      const mapa = op.isDayTrade ? ganhosDT : ganhosST;
      mapa.set(op.ticker, (mapa.get(op.ticker) ?? 0) + (resultado.ganhoCapital ?? 0));
    }
  }

  return { novasPosicoes, ganhosST, ganhosDT };
}
```

### 4.2 Algoritmo de Apuração Mensal

```typescript
// lib/ir/apuracaoMensal.ts

import type { SaldoPrejuizoDoc, ResultadoMensalDoc } from '../types/firestore';

export interface EntradaApuracao {
  anoMes: string;              // "2026-04"
  clienteId: string;
  uid: string;
  ganhosST: number;            // soma de ganhos líquidos ST do mês (pode ser negativo)
  ganhosDT: number;            // soma de ganhos líquidos DT do mês (pode ser negativo)
  vendasST: number;            // total de vendas ST em reais (para isenção R$20k)
  irrfST: number;              // total IRRF retido nas notas (swing)
  irrfDT: number;              // total IRRF retido nas notas (day trade)
  notasProcessadas: string[];
  saldoPrejuizoST: number;     // saldo de prejuízo ST acumulado ANTES deste mês
  saldoPrejuizoDT: number;     // saldo de prejuízo DT acumulado ANTES deste mês
}

export interface ResultadoApuracao {
  resultado: ResultadoMensalDoc;
  novoSaldoPrejuizoST: number; // saldo atualizado para persistir
  novoSaldoPrejuizoDT: number;
}

/**
 * Apura o IR mensal sobre ações conforme legislação brasileira.
 *
 * Regras aplicadas:
 * 1. ISENÇÃO ST: se vendasST <= R$20.000 no mês → ganho ST isento (código 20 DIRPF)
 * 2. COMPENSAÇÃO PREJUÍZO: prejuízo ST compensa APENAS ST; DT compensa APENAS DT
 * 3. CARRY-FORWARD: sem prazo de expiração para compensar prejuízos
 * 4. ALÍQUOTAS: ST = 15%; DT = 20%
 * 5. IRRF: dedutível do IR mensal apurado; excesso vira crédito no próximo mês
 * 6. DARF: código 6015; pagar até último dia útil do mês seguinte
 * 7. DARF mínimo: R$10,00 (abaixo disso, acumula para o próximo mês)
 */
export function apurarMensal(entrada: EntradaApuracao): ResultadoApuracao {
  const ALIQUOTA_ST = 0.15;
  const ALIQUOTA_DT = 0.20;
  const LIMITE_ISENCAO_ST = 20_000;
  const DARF_MINIMO = 10;

  // ─── SWING TRADE ────────────────────────────────────────────────────────────

  // Passo 1: verificar isenção mensal
  const isentoST = entrada.vendasST <= LIMITE_ISENCAO_ST;
  const ganhoIsentoST = isentoST ? Math.max(0, entrada.ganhosST) : 0;

  // Passo 2: se não isento e há ganho, compensar prejuízo acumulado
  let prejuizoCompensadoST = 0;
  let novoSaldoPrejuizoST = entrada.saldoPrejuizoST;

  if (!isentoST) {
    if (entrada.ganhosST > 0 && entrada.saldoPrejuizoST > 0) {
      // Compensar até o valor do ganho disponível
      prejuizoCompensadoST = Math.min(entrada.ganhosST, entrada.saldoPrejuizoST);
      novoSaldoPrejuizoST = entrada.saldoPrejuizoST - prejuizoCompensadoST;
    } else if (entrada.ganhosST < 0) {
      // Prejuízo do mês vai para carry-forward
      novoSaldoPrejuizoST = entrada.saldoPrejuizoST + Math.abs(entrada.ganhosST);
    }
  }

  // Passo 3: base de cálculo após isenção e compensação
  const baseCalculoST = isentoST
    ? 0
    : Math.max(0, entrada.ganhosST - prejuizoCompensadoST);

  // Passo 4: IR bruto ST
  const irBrutoST = baseCalculoST * ALIQUOTA_ST;

  // Passo 5: DARF ST = IR bruto - IRRF (nunca negativo; excesso de IRRF vira crédito)
  // Nota: excesso de IRRF pode ser compensado no próximo mês ou na DIRPF anual
  const darfBrutoST = Math.max(0, irBrutoST - entrada.irrfST);
  const darfST = darfBrutoST < DARF_MINIMO ? 0 : darfBrutoST; // acumula se < R$10

  // ─── DAY TRADE ──────────────────────────────────────────────────────────────

  // Day Trade NÃO tem isenção de R$20k
  let prejuizoCompensadoDT = 0;
  let novoSaldoPrejuizoDT = entrada.saldoPrejuizoDT;

  if (entrada.ganhosDT > 0 && entrada.saldoPrejuizoDT > 0) {
    prejuizoCompensadoDT = Math.min(entrada.ganhosDT, entrada.saldoPrejuizoDT);
    novoSaldoPrejuizoDT = entrada.saldoPrejuizoDT - prejuizoCompensadoDT;
  } else if (entrada.ganhosDT < 0) {
    novoSaldoPrejuizoDT = entrada.saldoPrejuizoDT + Math.abs(entrada.ganhosDT);
  }

  const baseCalculoDT = Math.max(0, entrada.ganhosDT - prejuizoCompensadoDT);
  const irBrutoDT = baseCalculoDT * ALIQUOTA_DT;
  const darfBrutoDT = Math.max(0, irBrutoDT - entrada.irrfDT);
  const darfDT = darfBrutoDT < DARF_MINIMO ? 0 : darfBrutoDT;

  // ─── MONTAR RESULTADO ────────────────────────────────────────────────────────

  const resultado: ResultadoMensalDoc = {
    anoMes: entrada.anoMes,
    clienteId: entrada.clienteId,
    uid: entrada.uid,
    vendasST: entrada.vendasST,
    ganhoLiquidoST: entrada.ganhosST,
    ganhoLiquidoDT: entrada.ganhosDT,
    prejuizoCompensadoST,
    prejuizoCompensadoDT,
    baseCalculoST,
    baseCalculoDT,
    isentoST,
    ganhoIsentoST,
    aliquotaST: ALIQUOTA_ST,
    aliquotaDT: ALIQUOTA_DT,
    irBrutoST,
    irBrutoDT,
    irrfST: entrada.irrfST,
    irrfDT: entrada.irrfDT,
    darfST,
    darfDT,
    statusDarf: (darfST + darfDT) > 0 ? 'nao_gerado' : 'nao_gerado',
    notasProcessadas: entrada.notasProcessadas,
    calculadoEm: new Date() as unknown as Timestamp, // usar serverTimestamp() no Firestore
  };

  return { resultado, novoSaldoPrejuizoST, novoSaldoPrejuizoDT };
}

/**
 * Gera o código de barras / linha digitável simplificado para DARF.
 * Na prática, o usuário deve usar o SICALC da Receita Federal para emissão oficial.
 *
 * Código DARF para ações: 6015
 * Prazo: último dia útil do mês seguinte ao fato gerador
 */
export function gerarInfoDarf(anoMes: string, valorST: number, valorDT: number) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const mesVencimento = mes === 12 ? 1 : mes + 1;
  const anoVencimento = mes === 12 ? ano + 1 : ano;

  return {
    codigo: '6015',
    periodoApuracao: `${String(mes).padStart(2, '0')}/${ano}`,
    // Vencimento: último dia útil — simplificado como dia 28 (conservador)
    vencimento: `28/${String(mesVencimento).padStart(2, '0')}/${anoVencimento}`,
    valorPrincipalST: valorST.toFixed(2),
    valorPrincipalDT: valorDT.toFixed(2),
    valorTotal: (valorST + valorDT).toFixed(2),
    linkSicalc: `https://sicalc.receita.fazenda.gov.br/sicalc/rapido/contribuinte`,
    observacao: 'Use o SICALC da Receita Federal para emissão oficial do DARF com código de barras',
  };
}
```

### 4.3 Rateio de Custos Operacionais

```typescript
// lib/ir/rateioCustom.ts

/**
 * Distribui os custos operacionais da nota proporcionalmente ao valor financeiro
 * de cada operação (compras E vendas recebem rateio).
 *
 * A Receita Federal permite deduzir da base de cálculo:
 * - Taxa operacional (corretagem)
 * - Emolumentos B3
 * - Taxa de liquidação
 * - Registro B3
 *
 * IRRF NÃO é custo — é imposto pago (dedutível do IR apurado, não do ganho bruto).
 *
 * @returns mapa de operacaoIndex → valor do custo rateado
 */
export function ratearCustosNota(
  operacoes: OperacaoFirestore[],
  custosTotal: number // taxaOperacional + emolumentos + taxaLiquidacao
): Map<number, number> {
  const totalFinanceiro = operacoes.reduce((sum, op) => sum + op.valorBruto, 0);
  const resultado = new Map<number, number>();

  if (totalFinanceiro === 0) {
    operacoes.forEach((_, idx) => resultado.set(idx, 0));
    return resultado;
  }

  let acumulado = 0;
  operacoes.forEach((op, idx) => {
    if (idx === operacoes.length - 1) {
      // Última operação recebe o restante para evitar arredondamento acumulado
      resultado.set(idx, Math.round((custosTotal - acumulado) * 100) / 100);
    } else {
      const rateio = Math.round((op.valorBruto / totalFinanceiro) * custosTotal * 100) / 100;
      resultado.set(idx, rateio);
      acumulado += rateio;
    }
  });

  return resultado;
}
```

---

## 5. Estrutura de Componentes React

```
src/
└── app/
    └── (crm)/
        └── clientes/
            └── [clienteId]/
                └── ir/
                    ├── page.tsx                    # Rota principal do módulo IR
                    ├── layout.tsx                  # Layout com navegação IR
                    │
                    ├── components/
                    │   ├── UploadNotaModal/
                    │   │   ├── index.tsx           # Modal de upload com drag-and-drop
                    │   │   ├── PdfPreview.tsx      # Preview da nota antes de importar
                    │   │   └── ParseProgress.tsx   # Status do parsing em tempo real
                    │   │
                    │   ├── DashboardIR/
                    │   │   ├── index.tsx           # Dashboard mensal de IR
                    │   │   ├── ResumoMensal.tsx    # Card com IR a pagar do mês atual
                    │   │   ├── GraficoHistorico.tsx # Gráfico ST vs DT ao longo do ano
                    │   │   └── AlertaIsencao.tsx   # Banner de aviso de isenção R$20k
                    │   │
                    │   ├── TabelaPosicoes/
                    │   │   ├── index.tsx           # Tabela de posições com PM atual
                    │   │   └── ColunaTicker.tsx    # Célula com link para cotação
                    │   │
                    │   ├── ApuracaoMensal/
                    │   │   ├── index.tsx           # Detalhamento mensal (accordion)
                    │   │   ├── CardDarf.tsx        # DARF com info de pagamento
                    │   │   └── CompensacaoPrejuizo.tsx # Visualização de carry-forward
                    │   │
                    │   └── RelatorioIR/
                    │       ├── index.tsx           # Trigger + Preview do PDF
                    │       ├── RelatorioDocument.tsx # @react-pdf/renderer Document
                    │       └── sections/
                    │           ├── CapaRelatorio.tsx
                    │           ├── ResumoAnual.tsx
                    │           ├── DetalhesMensais.tsx
                    │           ├── TabelaPosicoes.tsx
                    │           └── InstrucoesDarf.tsx
                    │
                    └── hooks/
                        ├── useNotasCorretagem.ts   # Query Firestore real-time
                        ├── usePosicoesIR.ts        # Estado atual de PM por ticker
                        ├── useResultadoMensal.ts   # Apuração do mês corrente
                        └── useSaldoPrejuizo.ts     # Carry-forward acumulado
```

### 5.1 Hook de Upload e Parsing

```typescript
// hooks/useUploadNota.ts
'use client';

import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { parseNotaCorretagem } from '@/lib/pdf/notaParser';
import { processarLoteOperacoes } from '@/lib/ir/pmCalculator';
import { apurarMensal } from '@/lib/ir/apuracaoMensal';

export type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'calculating' | 'saving' | 'done' | 'error';

export function useUploadNota(clienteId: string) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);

  const processarNota = useCallback(async (file: File) => {
    try {
      setStatus('uploading');
      setErro(null);

      // 1. Upload do PDF para Firebase Storage
      const storageRef = ref(storage, `clientes/${clienteId}/notas/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const pdfUrl = await getDownloadURL(storageRef);
      setProgresso(20);

      // 2. Parse do PDF no browser (Web Worker via pdfjs-dist)
      setStatus('parsing');
      const pdfBuffer = await file.arrayBuffer();
      const nota = await parseNotaCorretagem(pdfBuffer);
      setProgresso(50);

      // 3. Calcular PM e ganhos
      setStatus('calculating');
      // ... buscar posições atuais do Firestore e calcular
      setProgresso(75);

      // 4. Persistir tudo em batch no Firestore
      setStatus('saving');
      await addDoc(collection(db, `usuarios/${nota.uid}/clientes/${clienteId}/notas_corretagem`), {
        ...nota,
        pdfStoragePath: pdfUrl,
        status: 'processado',
        importadoEm: serverTimestamp(),
      });
      setProgresso(100);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setErro(e instanceof Error ? e.message : 'Erro desconhecido');
    }
  }, [clienteId]);

  return { processarNota, status, erro, progresso };
}
```

---

## 6. Geração de Relatório PDF

### 6.1 Comparação: @react-pdf/renderer vs jsPDF

| Critério | @react-pdf/renderer | jsPDF + html2canvas |
|---------|--------------------|--------------------|
| **Paradigma** | Declarativo (JSX/React) | Imperativo (API de baixo nível) |
| **Tabelas** | Manual (View + Text) | Automático via `autoTable` plugin |
| **Gráficos** | Limitado (canvas externo) | html2canvas captura qualquer elemento |
| **Server-side** | `renderToBuffer()` no Node.js | Browser apenas (sem SSR nativo) |
| **Fidelidade tipográfica** | Alta — usa PDFKit internamente | Média — depende de renderização DOM |
| **Bundle size** | ~1.5MB | ~300KB (core) + plugins |
| **Downloads semanais** | ~500k (crescendo) | ~4M |
| **Recomendação** | Relatórios profissionais com layout complexo | Exports simples de tabelas |

**Decisão:** `@react-pdf/renderer` para o relatório final do cliente — gera PDFs de nível profissional com controle de tipografia, cores e layout via componentes React reutilizáveis.

### 6.2 Componente de Relatório

```typescript
// components/RelatorioIR/RelatorioDocument.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Paleta SVN Investimentos
const CORES = {
  paperWhite: '#FFF8F3',
  carbonBlack: '#221B19',
  bluSkies: '#CFE3DA',
  rubyRed: '#AC3631',
  leatherBrown: '#772B21',
  texto: '#3D3530',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: CORES.paperWhite,
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: CORES.carbonBlack,
    padding: 20,
    marginBottom: 20,
    borderRadius: 4,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Times-Roman',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Times-Roman',
    color: CORES.carbonBlack,
    marginBottom: 8,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: CORES.bluSkies,
    paddingBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDD',
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: CORES.bluSkies,
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cell: {
    fontSize: 9,
    color: CORES.texto,
    flex: 1,
  },
  alertBox: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 3,
    borderLeftColor: CORES.rubyRed,
    padding: 8,
    marginVertical: 8,
    borderRadius: 2,
  },
});

interface Props {
  cliente: { nome: string; cpf: string };
  anoReferencia: number;
  resultadosMensais: ResultadoMensalDoc[];
  posicoes: PosicaoIRDoc[];
  saldoPrejuizo: { ST: number; DT: number };
}

export function RelatorioIRDocument({ cliente, anoReferencia, resultadosMensais, posicoes, saldoPrejuizo }: Props) {
  const totalDarfST = resultadosMensais.reduce((s, r) => s + r.darfST, 0);
  const totalDarfDT = resultadosMensais.reduce((s, r) => s + r.darfDT, 0);

  return (
    <Document title={`Relatório IR ${anoReferencia} - ${cliente.nome}`}>
      <Page size="A4" style={styles.page}>

        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.headerText}>SVN Investimentos | XP</Text>
          <Text style={{ color: '#CCC', fontSize: 10, marginTop: 4 }}>
            Relatório de Imposto de Renda sobre Ações — {anoReferencia}
          </Text>
        </View>

        {/* Dados do cliente */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <Text style={{ ...styles.cell, fontSize: 11, fontWeight: 'bold' }}>Cliente: {cliente.nome}</Text>
          <Text style={{ ...styles.cell, fontSize: 11 }}>CPF: {cliente.cpf}</Text>
        </View>

        {/* Resumo anual */}
        <Text style={styles.sectionTitle}>Resumo Anual</Text>
        <View style={styles.tableHeader}>
          {['Tipo', 'IR Total (R$)', 'IRRF Retido (R$)', 'DARF a Pagar (R$)'].map(h => (
            <Text key={h} style={{ ...styles.cell, fontWeight: 'bold', fontSize: 9 }}>{h}</Text>
          ))}
        </View>
        {[
          { tipo: 'Swing Trade (15%)', ir: resultadosMensais.reduce((s, r) => s + r.irBrutoST, 0), irrf: resultadosMensais.reduce((s, r) => s + r.irrfST, 0), darf: totalDarfST },
          { tipo: 'Day Trade (20%)', ir: resultadosMensais.reduce((s, r) => s + r.irBrutoDT, 0), irrf: resultadosMensais.reduce((s, r) => s + r.irrfDT, 0), darf: totalDarfDT },
        ].map(row => (
          <View key={row.tipo} style={styles.tableRow}>
            <Text style={styles.cell}>{row.tipo}</Text>
            <Text style={styles.cell}>R$ {row.ir.toFixed(2)}</Text>
            <Text style={styles.cell}>R$ {row.irrf.toFixed(2)}</Text>
            <Text style={{ ...styles.cell, color: row.darf > 0 ? CORES.rubyRed : '#2D6A4F', fontWeight: 'bold' }}>
              R$ {row.darf.toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Aviso de saldo de prejuízo */}
        {(saldoPrejuizo.ST > 0 || saldoPrejuizo.DT > 0) && (
          <View style={styles.alertBox}>
            <Text style={{ fontSize: 9, color: CORES.carbonBlack }}>
              Saldo de prejuízo a compensar em meses futuros:
              {saldoPrejuizo.ST > 0 ? ` Swing Trade R$ ${saldoPrejuizo.ST.toFixed(2)}` : ''}
              {saldoPrejuizo.DT > 0 ? ` | Day Trade R$ ${saldoPrejuizo.DT.toFixed(2)}` : ''}
            </Text>
          </View>
        )}

      </Page>
    </Document>
  );
}
```

---

## 7. Eventos Corporativos: API para Splits e Grupamentos

A brapi.dev fornece eventos corporativos via o campo `stockDividends` do endpoint principal:

```
GET https://brapi.dev/api/quote/{ticker}?dividends=true&token={token}
```

Resposta relevante (campo `stockDividends`):
```json
{
  "results": [{
    "symbol": "PETR4",
    "dividendsData": {
      "stockDividends": [
        {
          "date": "2024-08-12",
          "type": "DESDOBRAMENTO",
          "value": 4.0,
          "approvalDate": "2024-07-15"
        }
      ]
    }
  }]
}
```

```typescript
// lib/ir/eventosCorpora.ts

export interface EventoCorporativo {
  ticker: string;
  tipo: 'SPLIT' | 'GRUPAMENTO' | 'BONIFICACAO';
  data: Date;
  fator: number; // split 1:4 → 4.0; grupamento 4:1 → 0.25
}

export async function buscarEventosCorporativos(
  ticker: string,
  token: string
): Promise<EventoCorporativo[]> {
  const url = `https://brapi.dev/api/quote/${ticker}?dividends=true&token=${token}`;
  const resp = await fetch(url);
  const data = await resp.json();

  const stockDividends = data?.results?.[0]?.dividendsData?.stockDividends ?? [];

  return stockDividends
    .filter((ev: any) => ['DESDOBRAMENTO', 'GRUPAMENTO'].includes(ev.type?.toUpperCase()))
    .map((ev: any) => ({
      ticker,
      tipo: ev.type.toUpperCase() === 'DESDOBRAMENTO' ? 'SPLIT' : 'GRUPAMENTO',
      data: new Date(ev.date),
      fator: ev.type.toUpperCase() === 'DESDOBRAMENTO' ? ev.value : 1 / ev.value,
    }));
}
```

---

## 8. Guia de Implementação Faseada

### Fase 1 — MVP: Upload e Cálculo Manual (2 semanas)

**Entregáveis:**
- Componente `UploadNotaModal` com drag-and-drop de PDF
- Parsing básico via pdfjs-dist (extração de texto raw)
- Formulário de confirmação/correção manual dos campos extraídos
- Cálculo de PM em TypeScript (biblioteca `pmCalculator.ts`)
- Persistência em Firestore (`notas_corretagem`, `posicoes_ir`)
- Dashboard simples com posições e PM atual

**Prioridade:** Formular a UX de upload + confirmação manual. O parsing automatizado ainda é falível — o assessor deve validar os dados antes de confirmar.

### Fase 2 — Apuração Fiscal (1 semana)

**Entregáveis:**
- Algoritmo `apuracaoMensal.ts` completo
- Collection `resultado_mensal` e `saldo_prejuizo`
- Cards de resumo mensal com IR a pagar
- Alerta visual de isenção R$20k
- Informações de DARF (código 6015, vencimento)

### Fase 3 — Relatório PDF (1 semana)

**Entregáveis:**
- `@react-pdf/renderer` integrado ao Next.js 14 App Router
- `RelatorioIRDocument` com identidade visual SVN
- Download do relatório via `pdf.blob()` + `URL.createObjectURL()`
- Seções: resumo anual, detalhe mensal, posições atuais, instruções DARF

### Fase 4 — Parsing Automático Avançado (2 semanas)

**Entregáveis:**
- Firebase Function v2 (Python runtime) com correpy + pdfplumber
- Detecção automática de day trade
- Rateio preciso de custos por operação
- Fallback para parsing manual quando confidence < 90%

### Fase 5 — Eventos Corporativos (1 semana)

**Entregáveis:**
- Integração com brapi.dev `stockDividends`
- Detecção automática de splits na timeline de operações
- Ajuste retroativo de PM com confirmação do assessor
- Collection `eventos_corporativos` como cache

---

## 9. Pontos de Atenção Técnica

### 9.1 Precisão Numérica

JavaScript usa `float64` (IEEE 754), o que gera erros em operações monetárias:
```
0.1 + 0.2 === 0.30000000000000004
```

**Solução:** Trabalhar em **centavos inteiros** (`Math.round(valor * 100)`) ou usar a biblioteca `decimal.js` para operações críticas de PM.

### 9.2 Day Trade — Identificação Correta

Uma operação é day trade quando há compra E venda do **mesmo ticker** no **mesmo pregão** (mesma `dataPregao`). O algoritmo deve:
1. Agrupar operações por pregão
2. Identificar tickers com ambos C e V
3. Para o resultado DT: considerar apenas a quantidade cruzada (min(qtd_compra, qtd_venda))

### 9.3 Concorrência no Firestore

Ao processar múltiplas notas do mesmo mês, usar **transações Firestore** para atualizar `posicoes_ir` e `resultado_mensal` atomicamente:

```typescript
await runTransaction(db, async (transaction) => {
  const posicaoRef = doc(db, `usuarios/${uid}/clientes/${clienteId}/posicoes_ir/${ticker}`);
  const posicaoSnap = await transaction.get(posicaoRef);
  // ... calcular novo PM
  transaction.set(posicaoRef, novaPosicao);
});
```

### 9.4 Notas Protegidas por Senha

A correpy suporta PDFs com senha (`parser = ParserFactory.get_parser(pdf_stream, password="senha")`). No browser, pdfjs-dist também aceita `{ data: buffer, password: "senha" }`. Implementar campo de senha opcional no modal de upload.

---

## 10. Repositórios Open Source de Referência

| Repositório | Estrelas | Linguagem | Relevância |
|------------|---------|-----------|-----------|
| [correpy](https://github.com/thiagosalvatore/correpy) | ~200 | Python | Parser Sinacor especializado — usar como base Python |
| [irpf-investidor](https://github.com/staticdev/irpf-investidor) | ~300 | Python | Cálculo IR ações/ETFs/FIIs sem DT |
| [guilhermecgs/ir](https://github.com/guilhermecgs/ir) | ~175 | Python | Cálculo IR com compensação de prejuízo |
| [femdias/Notas-de-Corretagem-Clear-pdf-to-pandas](https://github.com/femdias/Notas-de-Carteira-Clear-pdf-to-pandas) | ~50 | Python | Parsing nota Clear → DataFrame |
| [barbixxxa/organizze](https://github.com/barbixxxa/organizze) | ~30 | Python | pdfplumber em nota de corretagem |
| [cei-crawler](https://github.com/Menighin/cei-crawler) | ~288 | JavaScript | Crawler CEI B3 — referência de dados |

---

## 11. Referências

1. **pdfjs-dist npm package** — https://www.npmjs.com/package/pdfjs-dist (Mozilla, v5.7.284, 2026)
2. **correpy GitHub** — https://github.com/thiagosalvatore/correpy — Parser Sinacor B3 em Python
3. **irpf-investidor GitHub** — https://github.com/staticdev/irpf-investidor — Calculadora IR ações Python
4. **guilhermecgs/ir GitHub** — https://github.com/guilhermecgs/ir — IR automático com CEI
5. **Extracting Data from Brokerage Notes** — https://medium.com/analytics-vidhya/extracting-data-from-brokerage-notes-using-python-dc30b561299 (Analytics Vidhya)
6. **pdfplumber vs PyMuPDF vs Tabula para PDFs financeiros** — https://docs.bswen.com/blog/2026-03-16-pdfplumber-vs-pymupdf/ (bswen.com, Março/2026)
7. **A Comparative Study of PDF Parsing Tools** — https://arxiv.org/html/2410.09871v1 (arXiv, Outubro/2024)
8. **react-pdf vs @react-pdf/renderer vs jsPDF 2026** — https://www.pkgpulse.com/blog/react-pdf-vs-react-pdf-renderer-vs-jspdf-pdf-in-react-2026 (PkgPulse)
9. **How to Extract Text from PDF in JavaScript** — https://www.nutrient.io/blog/how-to-extract-text-from-a-pdf-using-javascript/ (Nutrient, 2026)
10. **Retenções de IR — Receita Federal** — https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/retencoes
11. **Como declarar ações IR 2026** — https://digitalcomum.com.br/declarar-acoes-ir-2026/ (Digital Comum, 2026)
12. **brapi.dev Documentação** — https://brapi.dev/docs/acoes — Endpoint `/api/quote/{tickers}?dividends=true`
13. **Cloud Firestore Data Model** — https://firebase.google.com/docs/firestore/data-model (Firebase Docs)
14. **pdfjs-dist Web Worker em Next.js 14** — https://lazypandatech.com/blog/NextJs/38/How-to-use-PDF.js-in-React-Next.js-Application/ (LazyPanda Tech)
15. **Preço Médio de Ações — Bússola do Investidor** — https://www.bussoladoinvestidor.com.br/calculo-do-preco-medio-de-acoes/ (metodologia RFB)
