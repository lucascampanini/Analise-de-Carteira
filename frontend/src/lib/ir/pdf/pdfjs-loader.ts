'use client';
// Inicialização centralizada do pdfjs-dist.
// DEVE ser importado apenas em Client Components (browser).
//
// IMPORTANTE — worker via new URL():
//   O webpack precisa emitir o worker como asset para que o protocolo de
//   mensagens entre main-thread (bundlado) e worker seja compatível.
//   Usar um arquivo "cru" de public/ quebra a comunicação quando o webpack
//   transforma o código principal do pdfjs — os itens de texto voltam vazios.
//
// cMapUrl e standardFontDataUrl continuam sendo servidos de public/ pois são
// arquivos estáticos que o pdfjs-dist carrega por fetch, não via Worker.

import type { PDFDocumentProxy } from 'pdfjs-dist';

// Singleton — inicializa apenas uma vez por sessão do browser
let initialized = false;

async function initPdfjs() {
  if (initialized) return;

  const lib = await import('pdfjs-dist');

  // new URL(..., import.meta.url) → webpack emite o worker no output e
  // garante que a versão/protocolo seja idêntica à do bundle principal.
  // Isso elimina o mismatch entre "pdfjs bundlado" e "worker cru de public/".
  lib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

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
    cMapUrl: `${basePath}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${basePath}/standard_fonts/`,
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

export function isPDFImagem(textoExtraido: string): boolean {
  return textoExtraido.trim().length < 100;
}

export function avaliarQualidadeExtracao(texto: string): number {
  if (texto.trim().length < 100) return 0;
  if (texto.length < 500) return 0.3;
  const temTicker = /[A-Z]{4}\d{1,2}/.test(texto);
  const temData = /\d{2}\/\d{2}\/\d{4}/.test(texto);
  const temValor = /\d+[.,]\d{2}/.test(texto);
  return (temTicker ? 0.4 : 0) + (temData ? 0.3 : 0) + (temValor ? 0.3 : 0);
}
