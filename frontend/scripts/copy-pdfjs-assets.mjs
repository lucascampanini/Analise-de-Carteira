// Copia cmaps, standard_fonts e o worker do pdfjs-dist para public/.
// Executado automaticamente antes de `dev` e `build` via scripts no package.json.
// Necessário porque o Next.js com output:"export" serve arquivos de /public/.
//
// Fonte: docs/13-resultado-acoes-ir/07-analise-gaps-bloqueadores/ gap C1

import { cpSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const pdfjsDir = dirname(require.resolve('pdfjs-dist/package.json'));
const publicDir = resolve(__dirname, '../public');

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// 1. CMaps — necessários para PDFs com fontes Type1/Type3 (notas Sinacor)
//    Sem eles, acentos (ã, ç, é) aparecem corrompidos silenciosamente
const cmapsDst = resolve(publicDir, 'cmaps');
ensureDir(cmapsDst);
cpSync(resolve(pdfjsDir, 'cmaps'), cmapsDst, { recursive: true });
console.log('✓ pdfjs cmaps copiados para public/cmaps/');

// 2. Standard fonts — necessárias para PDFs sem fontes embutidas
const fontsDst = resolve(publicDir, 'standard_fonts');
ensureDir(fontsDst);
cpSync(resolve(pdfjsDir, 'standard_fonts'), fontsDst, { recursive: true });
console.log('✓ pdfjs standard_fonts copiados para public/standard_fonts/');

// 3. PDF Worker — arquivo separado que roda em Web Worker (não bloqueia a UI)
const workerSrc = resolve(pdfjsDir, 'build', 'pdf.worker.min.mjs');
const workerDst = resolve(publicDir, 'pdf.worker.min.mjs');
copyFileSync(workerSrc, workerDst);
console.log('✓ pdf.worker.min.mjs copiado para public/pdf.worker.min.mjs');
