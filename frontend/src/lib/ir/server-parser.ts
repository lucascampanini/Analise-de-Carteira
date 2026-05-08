'use client';
// Wrapper para chamar a Cloud Function parse_sinacor_nota (Python/correpy).
// Usado como fallback quando o parser browser retorna qualidade IMAGEM ou BAIXA.
//
// Requer plano Blaze no Firebase e a função deployada:
//   firebase deploy --only functions

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { SegmentoNota, TipoOperacao, AssetClass } from './types/asset-types';
import { ExtractionQuality } from './types/parsed-nota';
import type { ParsedNotaResult, OperacaoParsed, ResumoFinanceiroParsed } from './types/parsed-nota';

// ─── Tipo bruto da resposta da função Python ──────────────────────────────────
// Espelho do dict retornado por main.py (valores em reais, nomes TypeScript-compatíveis)

interface ServerResponse {
  nrNota: string;
  dataPregao: string;
  anoMes: string;
  corretora: string;
  cnpjCorretora: string;
  segmento: string;
  cpfCliente?: string;
  operacoes: {
    tipo: string;
    ticker: string;
    classeAtivo: string;
    quantidade: number;
    precoUnitario: number;
    valorBruto: number;
    isDayTrade: boolean;
    tipoMercado?: string;
  }[];
  resumo: {
    taxaOperacional: number;
    emolumentos: number;
    taxaLiquidacao: number;
    taxaRegistro: number;
    iss: number;
    irrfNormal: number;
    irrfDayTrade: number;
    liquidoParaCliente: number;
    totalCustosDedutiveis: number;
  };
  parser: {
    tipo: string;
    versao: string;
    timestamp: string;
    confianca: number;
  };
  qualidade: string;
  camposFaltando: string[];
  avisos: string[];
  _vendasAcoesST?: number; // campo extra do Python, não faz parte do ParsedNotaResult
}

// ─── Chamada principal ────────────────────────────────────────────────────────

/**
 * Envia o PDF para a Cloud Function Python e retorna ParsedNotaResult.
 * Lança erro se a função falhar (senha errada, PDF inválido, etc.).
 */
export async function parseSinacorNotaServer(
  pdfBuffer: ArrayBuffer,
  password?: string,
): Promise<ParsedNotaResult> {
  if (!functions) throw new Error('Firebase Functions não inicializado (SSR?)');

  // ArrayBuffer → base64
  const bytes = new Uint8Array(pdfBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const pdfBase64 = btoa(binary);

  const callable = httpsCallable<
    { pdfBase64: string; password?: string },
    ServerResponse
  >(functions, 'parse_sinacor_nota');

  const result = await callable({ pdfBase64, password: password || undefined });
  const d = result.data;

  // Mapeia operações para OperacaoParsed
  const operacoes: OperacaoParsed[] = d.operacoes.map((op) => ({
    tipo:          op.tipo as TipoOperacao,
    ticker:        op.ticker,
    classeAtivo:   op.classeAtivo as AssetClass,
    quantidade:    op.quantidade,
    precoUnitario: op.precoUnitario,
    valorBruto:    op.valorBruto,
    isDayTrade:    op.isDayTrade,
    tipoMercado:   op.tipoMercado,
  }));

  const resumo: ResumoFinanceiroParsed = {
    taxaOperacional:      d.resumo.taxaOperacional,
    emolumentos:          d.resumo.emolumentos,
    taxaLiquidacao:       d.resumo.taxaLiquidacao,
    taxaRegistro:         d.resumo.taxaRegistro,
    iss:                  d.resumo.iss,
    irrfNormal:           d.resumo.irrfNormal,
    irrfDayTrade:         d.resumo.irrfDayTrade,
    liquidoParaCliente:   d.resumo.liquidoParaCliente,
    totalCustosDedutiveis: d.resumo.totalCustosDedutiveis,
  };

  return {
    nrNota:        d.nrNota,
    dataPregao:    d.dataPregao,
    anoMes:        d.anoMes,
    corretora:     d.corretora,
    cnpjCorretora: d.cnpjCorretora,
    segmento:      (d.segmento === 'BMF' ? SegmentoNota.BMF : SegmentoNota.BOVESPA),
    cpfCliente:    d.cpfCliente,
    operacoes,
    resumo,
    parser: {
      tipo:      d.parser.tipo as ParsedNotaResult['parser']['tipo'],
      versao:    d.parser.versao,
      timestamp: new Date().toISOString(), // frontend preenche o timestamp real
      confianca: d.parser.confianca,
    },
    qualidade:      d.qualidade as ExtractionQuality,
    camposFaltando: d.camposFaltando,
    avisos:         d.avisos,
  };
}

// ─── Helper: deve tentar servidor? ───────────────────────────────────────────

export function deveriaUsarServidorParser(qualidade: ExtractionQuality): boolean {
  return qualidade === ExtractionQuality.IMAGEM || qualidade === ExtractionQuality.BAIXA;
}
