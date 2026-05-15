'use client';
// Parser de notas de corretagem Sinacor para browser (pdfjs-dist).
// Produz ParsedNotaResult — contrato neutro consumido pelo pipeline de apuração.
//
// Estratégia de extração:
//   1. Agrupa itens de texto por coordenada Y (±2 unidades) → linhas visuais reais
//   2. Encontra âncoras de seção (Negócios Realizados, Resumo Financeiro)
//   3. Extrai campos via regex; usa último valor BRL da linha nos campos financeiros
//      para ignorar os "base R$ X" que aparecem antes do valor real do IRRF
//
// Valores ficam em reais (float do PDF) — conversão para centavos ocorre ao salvar
// no Firestore (reaisParaCentavos em utils/money.ts).

import { loadPDF } from './pdfjs-loader';
import { classifyAsset, extrairAtivoObjeto } from '../asset-classifier';
import { AssetClass, SegmentoNota, TipoOperacao } from '../types/asset-types';
import type {
  ExtractionQuality,
  OperacaoParsed,
  ParsedNotaResult,
  ResumoFinanceiroParsed,
} from '../types/parsed-nota';
import { PAT, CORRETORAS_NOME } from './sinacor-patterns';

const PARSER_VERSAO = 'pdfjs-dist@5.7.284';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseBRL(s: string): number {
  // "3.852,00" → 3852.00 ; "38,52" → 38.52
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function extractLastBRL(line: string): number {
  // Pega o valor mais à direita da linha — ignora "base R$ X,XX" no IRRF
  const matches = [...line.matchAll(PAT.qualquerBRL)];
  return matches.length ? parseBRL(matches[matches.length - 1][0]) : 0;
}

function toISODate(dataBR: string): string {
  const [dd, mm, yyyy] = dataBR.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

function toAnoMes(dataBR: string): string {
  const [, mm, yyyy] = dataBR.split('/');
  return `${yyyy}-${mm}`;
}

function isTextItem(item: unknown): item is { str: string; transform: number[] } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'str' in item &&
    'transform' in item
  );
}

// ─── Extração de linhas por Y ────────────────────────────────────────────────

// Agrupa itens pdfjs por coordenada Y (±2 unidades) → preserva layout em colunas.
// PDFs Sinacor são colunados e o joinamento plano perde a ordem das colunas.
async function extractLinesFromPDF(
  data: ArrayBuffer,
  password?: string,
): Promise<string[]> {
  const { pdf } = await loadPDF(data, { password });
  const allLines: string[] = [];

  console.log('[pdfjs] numPages:', pdf.numPages);

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const textItems = content.items.filter((it) => 'str' in it) as Array<{ str: string }>;
    const nonEmpty = textItems.filter((it) => it.str.trim());
    console.log(`[pdfjs] page ${pageNum}: ${textItems.length} itens totais, ${nonEmpty.length} com texto. Primeiros:`, nonEmpty.slice(0, 5).map((i) => i.str));
    // Estrutura real do 1º item para verificar se transform existe
    if (content.items.length > 0) console.log('[pdfjs] primeiro item keys:', Object.keys(content.items[0] as object), 'isTextItem:', isTextItem(content.items[0]));

    const lineMap = new Map<number, Array<{ x: number; str: string }>>();
    let processados = 0;

    for (const item of content.items) {
      if (!isTextItem(item) || !item.str.trim()) continue;
      processados++;
      const x = item.transform[4];
      const rawY = item.transform[5];

      // Encontra ou cria grupo Y (tolerância ±2 unidades = mesma linha visual)
      let groupY = rawY;
      for (const ky of lineMap.keys()) {
        if (Math.abs(ky - rawY) <= 2) { groupY = ky; break; }
      }
      if (!lineMap.has(groupY)) lineMap.set(groupY, []);
      lineMap.get(groupY)!.push({ x, str: item.str });
    }

    // Y decrescente = ordem top-to-bottom (em PDF, Y cresce de baixo para cima)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const line = lineMap
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
        .trim();
      if (line) allLines.push(line);
    }

    console.log(`[pdfjs] page ${pageNum}: processados=${processados}, allLines agora=${allLines.length}`);
    page.cleanup();
  }

  await pdf.destroy();
  return allLines;
}

// ─── Parsing por seção ───────────────────────────────────────────────────────

function parseHeader(lines: string[]): {
  dataPregaoBR: string;
  nrNota: string;
  corretora: string;
  cnpjCorretora: string;
  cpfCliente: string | undefined;
} {
  // Busca nos primeiros 30 itens — cabeçalho sempre no início
  const headerText = lines.slice(0, 30).join(' ');

  const dataBR = headerText.match(PAT.dataPregao)?.[1] ?? '';
  const nrNota = headerText.match(PAT.nrNota)?.[1] ?? '';
  const cnpj = headerText.match(PAT.cnpj)?.[1] ?? '';
  const cpf = headerText.match(PAT.cpf)?.[1];
  const corretora = cnpj
    ? (CORRETORAS_NOME[cnpj] ?? `Corretora CNPJ ${cnpj}`)
    : 'Desconhecida';

  return { dataPregaoBR: dataBR, nrNota, corretora, cnpjCorretora: cnpj, cpfCliente: cpf };
}

function parseOperationLine(line: string): OperacaoParsed | null {
  if (!PAT.operacaoInicio.test(line)) return null;

  const m = line.match(PAT.operacao);
  if (!m) return null;

  const [, cv, tipoMercadoRaw, middle, qtyStr, precoStr, , valorStr] = m;
  const tipoMercado = tipoMercadoRaw.trim();

  // Primeiro token do middle é sempre o ticker (descritores como "PN", "N1" vêm depois)
  const firstToken = middle.trim().split(/\s+/)[0].toUpperCase();
  if (!PAT.tickerB3.test(firstToken)) return null;

  const ticker = firstToken;
  const classeAtivo = classifyAsset(ticker, tipoMercado);
  const quantidade = parseInt(qtyStr, 10);
  const precoUnitario = parseBRL(precoStr);
  const valorBruto = parseBRL(valorStr);

  // Ativo-objeto de opções: extrai base + dígitos do código (PETR4A150→PETR4, BOVA11C8500→BOVA11)
  const tickerAtivo = classeAtivo === AssetClass.OPCAO ? extrairAtivoObjeto(ticker) : undefined;

  // Campo Obs: "#" é marcador day-trade em algumas corretoras (Clear/XP)
  const tokens = middle.trim().split(/\s+/);
  const observacao = tokens.find((t) => /^[#*]$/.test(t));

  return {
    tipo: cv === 'C' ? TipoOperacao.COMPRA : TipoOperacao.VENDA,
    ticker,
    tickerAtivo,
    classeAtivo,
    quantidade,
    precoUnitario,
    valorBruto,
    isDayTrade: false, // corrigido em detectarDayTrade()
    tipoMercado,
    observacao,
  };
}

function parseOperacoes(lines: string[]): OperacaoParsed[] {
  const ops: OperacaoParsed[] = [];
  let inTable = false;

  for (const line of lines) {
    if (!inTable) {
      if (PAT.negociosRealizados.test(line) || PAT.cabecalhoTabela.test(line)) {
        inTable = true;
      }
      continue;
    }
    // Interrompe ao entrar em qualquer seção de Resumo
    if (PAT.resumoNegócios.test(line) || PAT.resumoFinanceiro.test(line)) break;
    // Pula linhas de cabeçalho repetidas em notas multi-página
    if (PAT.cabecalhoTabela.test(line)) continue;

    const op = parseOperationLine(line);
    if (op) ops.push(op);
  }

  return ops;
}

function parseResumoFinanceiro(lines: string[]): ResumoFinanceiroParsed {
  let inSection = false;
  const sec: string[] = [];

  for (const line of lines) {
    if (!inSection) {
      if (PAT.resumoFinanceiro.test(line)) inSection = true;
      continue;
    }
    sec.push(line);
  }

  const first = (pat: RegExp): number => {
    const l = sec.find((s) => pat.test(s));
    return l ? extractLastBRL(l) : 0;
  };

  const taxaOperacional = first(PAT.linhaCorretagem);
  const emolumentos = first(PAT.linhaEmolumentos);
  const taxaLiquidacao = first(PAT.linhaTaxaLiq);
  const taxaRegistro = first(PAT.linhaTaxaReg);
  const iss = first(PAT.linhaISS);
  const irrfNormal = first(PAT.linhaIRRFNormal);
  const irrfDayTrade = first(PAT.linhaIRRFDT);

  let liquidoParaCliente = 0;
  const liqLine = sec.find((l) => PAT.linhaValorLiquido.test(l));
  if (liqLine) {
    const valor = extractLastBRL(liqLine);
    // "D" = débito (cliente paga), "C" = crédito (cliente recebe)
    const trimmed = liqLine.trimEnd();
    const dc = trimmed.endsWith(' D') ? 'D' : trimmed.endsWith(' C') ? 'C' : 'D';
    liquidoParaCliente = dc === 'D' ? -valor : valor;
  }

  const totalCustosDedutiveis =
    taxaOperacional + emolumentos + taxaLiquidacao + taxaRegistro + iss;

  return {
    taxaOperacional,
    emolumentos,
    taxaLiquidacao,
    taxaRegistro,
    iss,
    irrfNormal,
    irrfDayTrade,
    liquidoParaCliente,
    totalCustosDedutiveis,
  };
}

// Ticker aparece como C e V na mesma nota → todas as ops desse ticker são DT
function detectarDayTrade(ops: OperacaoParsed[]): void {
  const compras = new Set(
    ops.filter((o) => o.tipo === TipoOperacao.COMPRA).map((o) => o.ticker),
  );
  const vendas = new Set(
    ops.filter((o) => o.tipo === TipoOperacao.VENDA).map((o) => o.ticker),
  );
  for (const op of ops) {
    if (compras.has(op.ticker) && vendas.has(op.ticker)) op.isDayTrade = true;
  }
}

function detectarSegmento(ops: OperacaoParsed[]): SegmentoNota {
  return ops.some((o) => o.classeAtivo === AssetClass.FUTURO)
    ? SegmentoNota.BMF
    : SegmentoNota.BOVESPA;
}

// ─── BMF / Futuros ───────────────────────────────────────────────────────────

/**
 * Extrai o resultado líquido do ajuste diário de uma nota BMF.
 * Retorna ajusteLiquido (+ = crédito, - = débito) e irrfAjuste retido.
 */
function parseAjusteDiario(lines: string[]): { ajusteLiquido: number; irrfAjuste: number } {
  let inSection = false;
  let ajusteLiquido = 0;
  let irrfAjuste = 0;

  for (const line of lines) {
    if (!inSection) {
      if (PAT.bmfAjusteSecao.test(line)) inSection = true;
      continue;
    }

    if (PAT.bmfAjusteResultado.test(line)) {
      const valor = extractLastBRL(line);
      const trimmed = line.trimEnd();
      const dc = trimmed.endsWith(' D') ? 'D' : 'C';
      ajusteLiquido = dc === 'D' ? -valor : valor;
    }

    if (PAT.bmfAjusteIRRF.test(line)) {
      irrfAjuste = extractLastBRL(line);
    }
  }

  return { ajusteLiquido, irrfAjuste };
}

function computeQualidade(
  hasDate: boolean,
  hasNota: boolean,
  ops: OperacaoParsed[],
  camposFaltando: string[],
  ajusteDiario?: number,
): ExtractionQuality {
  // Nota com conteúdo = tem operações OU tem ajuste diário (nota BMF)
  const hasContent = ops.length > 0 || ajusteDiario !== undefined;
  if (!hasContent) {
    return (hasDate || hasNota ? 'BAIXA' : 'IMAGEM') as ExtractionQuality;
  }
  if (!hasDate || !hasNota) return 'BAIXA' as ExtractionQuality;
  if (camposFaltando.length === 0) return 'ALTA' as ExtractionQuality;
  return 'MEDIA' as ExtractionQuality;
}

function makeEmptyResult(
  qualidade: ExtractionQuality,
  avisos: string[],
): ParsedNotaResult {
  const emptyResumo: ResumoFinanceiroParsed = {
    taxaOperacional: 0, emolumentos: 0, taxaLiquidacao: 0, taxaRegistro: 0,
    iss: 0, irrfNormal: 0, irrfDayTrade: 0,
    liquidoParaCliente: 0, totalCustosDedutiveis: 0,
  };
  return {
    nrNota: '', dataPregao: '', anoMes: '', corretora: '', cnpjCorretora: '',
    segmento: SegmentoNota.BOVESPA, operacoes: [], resumo: emptyResumo,
    parser: { tipo: 'js-pdfjs', versao: PARSER_VERSAO, timestamp: new Date().toISOString(), confianca: 0 },
    qualidade,
    camposFaltando: ['dataPregao', 'nrNota', 'cnpjCorretora', 'operacoes', 'resumoFinanceiro'],
    avisos,
  };
}

// ─── Entrypoint público ───────────────────────────────────────────────────────

export interface ParseSinacorOpts {
  /** Senha do PDF (primeiros 3 dígitos do CPF do cliente para notas XP) */
  password?: string;
}

/**
 * Extrai operações, taxas e metadados de uma nota Sinacor em ArrayBuffer.
 * Retorna ParsedNotaResult com qualidade e campos faltando para UI de revisão.
 * Valores em reais (float) — converter para centavos ao salvar no Firestore.
 */
export async function parseSinacorNota(
  pdfData: ArrayBuffer,
  opts: ParseSinacorOpts = {},
): Promise<ParsedNotaResult> {
  const lines = await extractLinesFromPDF(pdfData, opts.password);
  const fullText = lines.join('\n');
  console.log('[pdfjs] lines=' + lines.length + ' fullText=' + fullText.trim().length);
  console.log('[pdfjs] lines 0-19:\n' + lines.slice(0, 20).map((l, i) => i + ': ' + l).join('\n'));

  if (fullText.trim().length < 100) {
    return makeEmptyResult('IMAGEM' as ExtractionQuality, ['PDF digitalizado — sem texto extraível']);
  }

  const header = parseHeader(lines);
  const operacoes = parseOperacoes(lines);
  detectarDayTrade(operacoes);
  const resumo = parseResumoFinanceiro(lines);

  // BMF/Futuros: extrai ajuste diário quando a nota não tem operações Bovespa padrão
  // ou quando o segmento é BMF (ticker FUTURO nas ops).
  const segmento = detectarSegmento(operacoes);
  let ajusteDiarioEmReais: number | undefined;

  if (segmento === SegmentoNota.BMF || operacoes.some((o) => o.classeAtivo === AssetClass.FUTURO)) {
    const { ajusteLiquido, irrfAjuste } = parseAjusteDiario(lines);
    if (ajusteLiquido !== 0 || irrfAjuste !== 0) {
      ajusteDiarioEmReais = ajusteLiquido;
      // Injeta IRRF do ajuste em irrfDayTrade — apuração capta automaticamente
      if (resumo.irrfDayTrade === 0 && irrfAjuste > 0) {
        resumo.irrfDayTrade = irrfAjuste;
      }
    }
  }

  const camposFaltando: string[] = [];
  if (!header.dataPregaoBR)   camposFaltando.push('dataPregao');
  if (!header.nrNota)         camposFaltando.push('nrNota');
  if (!header.cnpjCorretora)  camposFaltando.push('cnpjCorretora');
  // Nota BMF com ajuste é válida mesmo sem operações individuais
  if (operacoes.length === 0 && ajusteDiarioEmReais === undefined) {
    camposFaltando.push('operacoes');
  }
  if (resumo.taxaOperacional === 0 && resumo.emolumentos === 0) {
    camposFaltando.push('resumoFinanceiro');
  }

  const avisos: string[] = [];
  for (const op of operacoes) {
    if (op.classeAtivo === AssetClass.DESCONHECIDO) {
      avisos.push(`Ticker não classificado: ${op.ticker}`);
    }
    if (op.classeAtivo === AssetClass.OPCAO && op.tickerAtivo) {
      // Avisa apenas quando o ativo-objeto não tem dígito (ex: KLBN sem sufixo numérico)
      // — o assessor precisa confirmar se é KLBN3, KLBN4, etc.
      if (!/\d/.test(op.tickerAtivo)) {
        avisos.push(`Opção ${op.ticker}: ativo-objeto "${op.tickerAtivo}" está sem sufixo — confirme o ticker (ex: ${op.tickerAtivo}3 ou ${op.tickerAtivo}4)`);
      }
    }
  }

  // Exercício de opção: ativo entra pelo strike, mas o prêmio pago NÃO aparece nesta nota.
  // O PM das ações adquiridas ficará subavaliado — assessor deve corrigir manualmente.
  const temExercicio = lines.some((l) => PAT.exercicioOpcao.test(l));
  if (temExercicio) {
    avisos.push(
      'Exercício de opção detectado: o PM das ações adquiridas via exercício de call pode '
      + 'não incluir o prêmio pago — ajuste o PM manualmente em posicoes_ir se necessário',
    );
  }

  if (segmento === SegmentoNota.BMF && ajusteDiarioEmReais === undefined) {
    avisos.push('Nota BMF: seção de ajuste diário não encontrada — verifique o PDF');
  }

  const qualidade = computeQualidade(
    Boolean(header.dataPregaoBR),
    Boolean(header.nrNota),
    operacoes,
    camposFaltando,
    ajusteDiarioEmReais,
  );

  // Confiança cai 15% por campo crítico faltando (mínimo 0)
  const confianca = Math.max(0, 1 - camposFaltando.length * 0.15);

  return {
    nrNota: header.nrNota,
    dataPregao: header.dataPregaoBR ? toISODate(header.dataPregaoBR) : '',
    anoMes: header.dataPregaoBR ? toAnoMes(header.dataPregaoBR) : '',
    corretora: header.corretora,
    cnpjCorretora: header.cnpjCorretora,
    segmento,
    cpfCliente: header.cpfCliente,
    operacoes,
    ...(ajusteDiarioEmReais !== undefined ? { ajusteDiarioEmReais } : {}),
    resumo,
    parser: {
      tipo: 'js-pdfjs',
      versao: PARSER_VERSAO,
      timestamp: new Date().toISOString(),
      confianca,
    },
    qualidade,
    camposFaltando,
    avisos,
  };
}
