'use client';
// Classificação de ativos para fins de IR.
// Fonte: docs/13-resultado-acoes-ir/02-tributacao-por-classe-ativo/

import { AssetClass } from './types/asset-types';

// Sufixo "11" é ambíguo — pode ser FII, FIAGRO, ETF_RV, ETF_RF ou UNIT.
// Estas listas resolvem a ambiguidade sem consultar API externa.

const ETF_RF_TICKERS = new Set([
  'TPFT11', 'B5P211', 'FIXA11', 'IDA0B11', 'IDIV11', 'IMAB11', 'IRFM11',
  'LBCD11', 'LBCI11', 'LFT011', 'NTNB11', 'RMIF11', 'SELIC11', 'TEOA11',
  'TEOB11', 'TFOF11', 'TPLT11', 'XFIX11',
]);

const ETF_RV_TICKERS = new Set([
  'BOVA11', 'BOVV11', 'BRAX11', 'DIVO11', 'ECOO11', 'FIND11', 'GOVE11',
  'HASH11', 'IBSD11', 'IVVB11', 'MATB11', 'MILA11', 'MOBI11', 'NASD11',
  'NFLX11', 'QBTC11', 'SMALL11', 'SMAC11', 'SMAL11', 'SPXI11', 'STNC11',
  'TECK11', 'USTK11', 'XINA11',
]);

const FIAGRO_TICKERS = new Set([
  'AFIA11', 'AFHI11', 'ARAX11', 'DEVA11', 'EGAF11', 'FACT11', 'FATN11',
  'FRMO11', 'GCRA11', 'HAAG11', 'HCTR11', 'JGPX11', 'KNCA11', 'MGAG11',
  'MICT11', 'PLCA11', 'RECA11', 'RZAG11', 'SFIG11', 'SSAG11', 'VCJR11',
  'VGIA11', 'XPCA11', 'XPCI11',
]);

// UNITs com sufixo 11 (B3 lista explicitamente)
const UNIT_TICKERS_11 = new Set([
  'ALUP11', 'CGAS11', 'ENGI11', 'TIET11', 'TAEE11', 'TRPL11', 'SANB11',
]);

// BDRs terminam em 34, 35, 32, 33 por convenção B3
const BDR_SUFFIXES = new Set(['34', '35', '32', '33']);

// Futuros mais comuns na B3
const FUTURES_PREFIXES = new Set([
  'WIN', 'WDO', 'IND', 'DOL', 'BGI', 'DI1', 'DAP', 'DDI', 'FRC',
  'ICF', 'ISP', 'OC1', 'OZ1', 'CCM', 'ETH', 'EUR', 'GBP', 'JPY',
]);

// Opções: 4 letras de ativo + opcional dígito + letra de vencimento A-X/L
const OPCAO_PATTERN = /^[A-Z]{4}\d{0,2}[A-X]\d+$/;

// Extrai sufixo numérico final do ticker (ex: "PETR4" → "4", "MXRF11" → "11")
function numericSuffix(ticker: string): string {
  const m = ticker.match(/(\d+)$/);
  return m ? m[1] : '';
}

export type TipoMercado =
  | 'VISTA'
  | 'FRACIONARIO'
  | 'OPCAO_COMPRA'
  | 'OPCAO_VENDA'
  | 'FUTURO'
  | 'TERMO'
  | string;

/**
 * Classifica um ativo em AssetClass para fins de IR.
 *
 * tipoMercado vem diretamente da nota Sinacor (coluna "C/V Tipo Mercado").
 * Quando disponível, é o classificador primário — reduz ambiguidade.
 *
 * Ordem de precedência:
 * 1. tipoMercado → OPCAO, FUTURO, TERMO
 * 2. Sufixo BDR (34/35/32/33)
 * 3. Sufixo "F" ou "11" com fracionário → trata como ação
 * 4. Listas de referência para "11" (ETF_RF > ETF_RV > FIAGRO > UNIT_11)
 * 5. Sufixo "11" restante → FII (maioria dos "11" são FIIs)
 * 6. Padrão de opção
 * 7. Padrão de futuro
 * 8. Sufixo 3/4/5/6 → ACAO
 * 9. DESCONHECIDO
 */
export function classifyAsset(ticker: string, tipoMercado?: TipoMercado): AssetClass {
  const t = ticker.toUpperCase().trim();

  // 1. tipoMercado como classificador primário
  if (tipoMercado) {
    const tm = tipoMercado.toUpperCase();
    if (tm.includes('OPCAO') || tm.includes('OPÇÃO') || tm === 'OPCAO_COMPRA' || tm === 'OPCAO_VENDA') {
      return AssetClass.OPCAO;
    }
    if (tm.includes('FUTURO') || tm === 'FUTURO') {
      return AssetClass.FUTURO;
    }
    if (tm.includes('TERMO')) {
      // Termos seguem a mesma cesta do ativo-objeto (ACAO para ações)
      return classifyByTicker(t);
    }
  }

  return classifyByTicker(t);
}

function classifyByTicker(t: string): AssetClass {
  // 2. BDR: sufixo 34/35/32/33
  const suffix = numericSuffix(t);
  if (BDR_SUFFIXES.has(suffix)) {
    return AssetClass.BDR;
  }

  // 3. Fracionário ("[...F]") — trata como mesmo ativo do lote cheio
  if (t.endsWith('F') && t.length >= 5) {
    return classifyByTicker(t.slice(0, -1));
  }

  // 4 & 5. Sufixo "11" — desambiguar com listas de referência
  if (suffix === '11') {
    if (ETF_RF_TICKERS.has(t)) return AssetClass.ETF_RF;
    if (ETF_RV_TICKERS.has(t)) return AssetClass.ETF_RV;
    if (FIAGRO_TICKERS.has(t)) return AssetClass.FIAGRO;
    if (UNIT_TICKERS_11.has(t)) return AssetClass.UNIT;
    // "11" restante → FII (maioria dos fundos imobiliários)
    return AssetClass.FII;
  }

  // UNIT: sufixo 11 já tratado acima; outras UNITs têm sufixo UNIT3 ou 1
  // não há padrão B3 confiável sem lookup — deixar cair em ACAO abaixo

  // 6. Padrão de opção (PETR4A150, VALE3B12000, etc.)
  if (OPCAO_PATTERN.test(t)) {
    return AssetClass.OPCAO;
  }

  // 7. Futuros (WINJ25, WDOH25, DI1F26…)
  const prefix3 = t.slice(0, 3);
  const prefix2 = t.slice(0, 2);
  if (FUTURES_PREFIXES.has(prefix3) || FUTURES_PREFIXES.has(prefix2)) {
    return AssetClass.FUTURO;
  }

  // 8. Sufixos comuns de ações ON/PN/Units (3, 4, 5, 6) → ACAO
  if (['3', '4', '5', '6'].includes(suffix)) {
    return AssetClass.ACAO;
  }

  // 9. Sufixo 1 → pode ser UNITs (SANB11 já tratado, mas SANB1 seria Unit sem "1")
  //    Sem lookup de API, classificar como ACAO (mesma cesta tributária)
  if (suffix === '1' || suffix === '2') {
    return AssetClass.ACAO;
  }

  return AssetClass.DESCONHECIDO;
}
