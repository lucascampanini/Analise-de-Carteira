'use client';
// Inicialização centralizada do pdfjs-dist.
// DEVE ser importado apenas em Client Components (browser).
//
// Configurações obrigatórias para PDFs de notas Sinacor:
// - cMapUrl: resolve corrupção de acentos (ã, ç, é) em fontes Type1/Type3
// - standardFontDataUrl: resolve PDFs sem fontes embutidas
// - workerSrc: Web Worker em arquivo separado (não bloqueia a UI)
//
// Fonte: docs/13-resultado-acoes-ir/07-analise-gaps-bloqueadores/ gaps C1 e E2
// Fonte: docs/13-resultado-acoes-ir/01-estrutura-notas-sinacor/ seção 11.2

import type { PDFDocumentProxy } from 'pdfjs-dist';

// Singleton — inicializa apenas uma vez por sessão do browser
let initialized = false;

async function initPdfjs() {
  if (initialized) return;

  const lib = await import('pdfjs-dist');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  // Worker copiado para public/ pelo script scripts/copy-pdfjs-assets.mjs
  lib.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;

  initialized = true;
}

export interface LoadPDFOptions {
  password?: string;
}

export interface LoadPDFResult {
  pdf: PDFDocumentProxy;
  numPages: number;
}

/**
 * Carrega um PDF e retorna o proxy do documento.
 * Configura cMapUrl e standardFontDataUrl obrigatórios para notas Sinacor.
 *
 * Se o PDF for protegido por senha e nenhuma senha for fornecida,
 * lança PasswordException — o caller deve pedir a senha ao usuário.
 */
export async function loadPDF(
  data: ArrayBuffer,
  options: LoadPDFOptions = {},
): Promise<LoadPDFResult> {
  await initPdfjs();

  const { getDocument } = await import('pdfjs-dist');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  const loadingTask = getDocument({
    data,
    password: options.password,
    // OBRIGATÓRIO: sem cMapUrl, acentos em PDFs Sinacor aparecem corrompidos
    cMapUrl: `${basePath}/cmaps/`,
    cMapPacked: true,
    // Fontes padrão para PDFs sem fontes embutidas
    standardFontDataUrl: `${basePath}/standard_fonts/`,
    // Desabilita range requests — notas Sinacor são pequenas (< 500KB)
    disableRange: true,
    disableStream: true,
  });

  const pdf = await loadingTask.promise;
  return { pdf, numPages: pdf.numPages };
}

/**
 * Extrai todo o texto de um PDF como string única.
 * Retorna string vazia se o PDF for uma imagem digitalizada.
 */
export async function extractTextFromPDF(data: ArrayBuffer, password?: string): Promise<string> {
  const { pdf } = await loadPDF(data, { password });
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item): item is import('pdfjs-dist/types/src/display/api').TextItem =>
        'str' in item
      )
      .map((item) => item.str)
      .join(' ');
    parts.push(pageText);
    page.cleanup();
  }

  await pdf.destroy();
  return parts.join('\n');
}

/**
 * Detecta se o PDF é uma imagem digitalizada (sem texto extraível).
 * PDFs-imagem não podem ser processados automaticamente.
 *
 * Fonte: docs/13-resultado-acoes-ir/07-analise-gaps-bloqueadores/ gap C2
 */
export function isPDFImagem(textoExtraido: string): boolean {
  return textoExtraido.trim().length < 100;
}

/**
 * Avalia a qualidade da extração de texto do PDF (0–1).
 * Usado para decidir se exige revisão manual do assessor.
 */
export function avaliarQualidadeExtracao(texto: string): number {
  if (texto.trim().length < 100) return 0;       // PDF-imagem
  if (texto.length < 500) return 0.3;             // texto insuficiente
  const temTicker = /[A-Z]{4}\d{1,2}/.test(texto);
  const temData = /\d{2}\/\d{2}\/\d{4}/.test(texto);
  const temValor = /\d+[.,]\d{2}/.test(texto);
  const score = (temTicker ? 0.4 : 0) + (temData ? 0.3 : 0) + (temValor ? 0.3 : 0);
  return score;
}
