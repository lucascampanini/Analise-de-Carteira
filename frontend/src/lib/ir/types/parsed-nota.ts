// Contrato neutro de parsing — saída normalizada independente do parser usado.
// Tanto o parser JS (pdfjs-dist, browser) quanto o Python (correpy, Firebase Function)
// devem produzir exatamente este tipo antes de salvar no Firestore.
//
// Fonte: docs/13-resultado-acoes-ir/07-analise-gaps-bloqueadores/ gap A2
// Fonte: docs/13-resultado-acoes-ir/01-estrutura-notas-sinacor/

import { AssetClass, SegmentoNota, TipoOperacao } from './asset-types';

export type ParserTipo = 'js-pdfjs' | 'python-correpy' | 'manual';

export interface ParserMeta {
  tipo: ParserTipo;
  versao: string;        // ex: "pdfjs-dist@5.7.284" ou "correpy@1.2.0"
  timestamp: string;     // ISO 8601 — momento do parsing
  confianca: number;     // 0-1: qualidade da extração (1 = extraído sem ambiguidade)
}

// Qualidade da extração — usada para decidir se exige revisão manual
export enum ExtractionQuality {
  ALTA    = 'ALTA',    // >= 0.9: todos os campos críticos extraídos com certeza
  MEDIA   = 'MEDIA',  // >= 0.7: campos extraídos mas com possível ambiguidade
  BAIXA   = 'BAIXA',  // >= 0.4: vários campos faltando ou incertos
  IMAGEM  = 'IMAGEM', // < 0.1: PDF digitalizado (imagem), sem extração possível
}

// Uma operação extraída do PDF — valores em reais (float) do PDF original.
// A conversão para centavos ocorre ao salvar no Firestore (via reaisParaCentavos).
export interface OperacaoParsed {
  tipo: TipoOperacao;            // 'C' (compra) ou 'V' (venda)
  ticker: string;                // ex: "PETR4", "KNRI11", "PETR4L300" (opção)
  tickerAtivo?: string;          // para opções: ticker do ativo objeto ex: "PETR4"
  classeAtivo: AssetClass;       // classificado pelo assetClassifier
  quantidade: number;            // inteiro (ações são inteiras)
  precoUnitario: number;         // reais com decimais (ex: 38.52)
  valorBruto: number;            // quantidade * precoUnitario
  isDayTrade: boolean;           // true se mesmo ticker C+V no mesmo pregão
  // Campos opcionais — podem falhar em notas de formato não-padrão
  tipoMercado?: string;          // ex: "VISTA", "OPCAO DE COMPRA", "FUTURO"
  observacao?: string;           // campo "Obs." da nota (ex: "D" = day trade explícito)
}

// Resumo financeiro extraído da seção "Resumo Financeiro" da nota
export interface ResumoFinanceiroParsed {
  taxaOperacional: number;       // corretagem (reais)
  emolumentos: number;           // taxa B3 (reais)
  taxaLiquidacao: number;        // taxa de liquidação B3 (reais)
  taxaRegistro: number;          // taxa de registro B3 (reais)
  iss: number;                   // ISS sobre corretagem (reais)
  irrfNormal: number;            // IRRF 0,005% sobre vendas ST (reais)
  irrfDayTrade: number;          // IRRF 1% sobre resultado DT (reais)
  liquidoParaCliente: number;    // positivo = crédito; negativo = débito
  totalCustosDedutiveis: number; // taxaOperacional + emolumentos + taxaLiquidacao + taxaRegistro + iss
}

// Resultado completo de um parsing de nota — contrato neutro
export interface ParsedNotaResult {
  // Metadados da nota
  nrNota: string;                // número da nota (ex: "12345")
  dataPregao: string;            // ISO date "YYYY-MM-DD" — sempre em BRT
  anoMes: string;                // "YYYY-MM" — para queries mensais no Firestore
  corretora: string;             // ex: "XP Investimentos CCTVM S.A."
  cnpjCorretora: string;         // ex: "02.332.886/0001-04"
  segmento: SegmentoNota;        // BOVESPA ou BMF
  cpfCliente?: string;           // extraído do rodapé (usado para validação)

  // Operações realizadas no pregão (Bovespa) — vazio para notas BMF puras
  operacoes: OperacaoParsed[];

  // BMF/Futuros — resultado líquido do ajuste diário (crédito = +, débito = -)
  // Preenchido quando segmento === BMF. É a fonte de P&L para futuros,
  // pois contratos são marcados a mercado diariamente (não via compra/venda).
  ajusteDiarioEmReais?: number;

  // Resumo financeiro
  resumo: ResumoFinanceiroParsed;

  // Metadados do parsing
  parser: ParserMeta;
  qualidade: ExtractionQuality;
  camposFaltando: string[];      // lista de campos não extraídos (para UI de revisão)
  avisos: string[];              // alertas não-críticos (ex: "ticker ambíguo: KLBN11")
}

// Campos que o assessor pode corrigir manualmente na UI de revisão
export interface CampoCorrigivel {
  campo: keyof ParsedNotaResult | string;
  valorExtraido: unknown;
  valorCorrigido?: unknown;
  motivo?: string;
}

// Payload enviado à API após revisão manual pelo assessor
export interface NotaConfirmada {
  parsed: ParsedNotaResult;
  correcoes: CampoCorrigivel[];
  confirmadoPor: string;         // uid do assessor
  confirmadoEm: string;          // ISO 8601
}
