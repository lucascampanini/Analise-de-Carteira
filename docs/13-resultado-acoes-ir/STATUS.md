# Status — Módulo IR em Notas Sinacor

> Atualizar este arquivo ao fim de cada sessão de desenvolvimento.
> Última atualização: 2026-05-07

---

## Estado atual

**Fase:** Implementação — F2 (Upload modal)
**Próxima sessão:** F2 — Upload modal multi-arquivo + fila de processamento
**Código implementado:** P1 + P2 + F1 completos (commit dbf31c7)

## O que já foi feito

- [x] Pesquisa completa (7 documentos em `docs/13-resultado-acoes-ir/`)
- [x] Análise de gaps e bloqueadores (`07-analise-gaps-bloqueadores/analise-gaps.md`)
- [x] Decisões arquiteturais tomadas
- [x] Plano de sessões definido
- [x] P1 — Schema canônico (commit 3739a06 — 2026-05-07)
- [x] P2 — Infraestrutura (commit 2f62fb3 — 2026-05-07)
- [x] F1 — Parser PDF (commit dbf31c7 — 2026-05-08)
- [ ] F2 — Upload modal multi-arquivo
- [ ] F3 — PM Calculator
- [ ] F4 — Apuração mensal
- [ ] F5 — Dashboard + hooks
- [ ] F6 — Relatório PDF
- [ ] F7 — Parser Python (Firebase Function)
- [ ] F8 — Eventos corporativos

---

## Decisões críticas já tomadas

| Decisão | Escolha |
|---|---|
| Precisão monetária | **Centavos inteiros** (`precoEmCentavos: number`) — nunca float |
| Parser browser | pdfjs-dist com `cMapUrl` obrigatório + `dynamic import ssr:false` |
| Parser servidor | correpy (Python) via Firebase Function v2 — requer plano Blaze |
| Relatório PDF | @react-pdf/renderer com `'use client'` + `dynamic import ssr:false` |
| Upload | Multi-arquivo em lote, ordenado cronologicamente pelo sistema |
| Cestas IR | 3 cestas: A (ações/ETF/BDR, 15%), B (FII, 20%), C (cripto, fora do MVP) |
| FII isenção | 100 cotistas (Lei 15.270/2025) — não mais 50 |
| MP 1.303/2025 | CADUCOU — não aplicar |
| classifyAsset | Listas de referência estáticas para sufixo "11"; tipoMercado da nota como primário |

## Bloqueadores resolvidos em P1 + P2

- [x] A1: FII 100 cotistas — `MIN_COTISTAS_FII_ISENCAO = 100` em asset-types.ts
- [x] A2: correpy browser — ParsedNotaResult neutro; parserMeta rastreia qual parser gerou
- [x] A3: float → centavos — todos os campos do schema terminam em `EmCentavos`
- [x] B1: `posicoes_ir` com `classeAtivo` — campo presente no PosicaoIRDoc
- [x] B2: 3 cestas separadas — ApuracaoMensalDoc tem cestaA_ST/A_DT/B_ST/B_DT
- [x] B3: `vendasAcoesSTemCentavos` separado do total — campo dedicado no schema
- [x] C1: `cMapUrl` — pdfjs-loader.ts configura na inicialização
- [x] C2: detecção PDF-imagem — `isPDFImagem()` em pdfjs-loader.ts
- [x] C3: fallback manual — ExtractionQuality.BAIXA → campo manualReviewRequired
- [x] D1: `classifyAsset()` — asset-classifier.ts integrado ao pipeline
- [x] E2: pdfjs-dist lazy — `'use client'` + singleton com dynamic import
- [x] G1: Security Rules — firestore.rules atualizado para as 5 coleções IR

Pendente:
- [ ] E1: @react-pdf/renderer com `'use client'` — resolver em F6

---

## Sessão F2 — o que criar (próxima)

Objetivo: upload modal multi-arquivo para notas Sinacor + fila de processamento.
O assessor arrastar N PDFs, o sistema ordena por dataPregao e processa em sequência.

```
frontend/src/app/(crm)/ir/[clienteId]/
  page.tsx                ← rota de entrada (importa UploadNotasModal lazy)

frontend/src/components/ir/
  UploadNotasModal.tsx    ← modal drag-drop, aceita múltiplos PDFs
  NotaQueueItem.tsx       ← item da fila: arquivo, status, quality badge, erros
  NotaRevisaoForm.tsx     ← formulário de correção manual (campos faltando)
```

### Fluxo do modal

1. Usuário arrasta N arquivos PDF (ou clica para selecionar)
2. Sistema valida extensão (.pdf) e tamanho (< 10MB cada)
3. Para cada arquivo, `parseSinacorNota(arrayBuffer)` → ParsedNotaResult
   - PDF protegido: pede senha (3 dígitos do CPF) → retry com password
   - ExtractionQuality.IMAGEM → bloqueia importação desse arquivo
   - BAIXA ou campos faltando → abre NotaRevisaoForm para correção manual
4. Após revisão, salva no Firestore:
   - `notas_corretagem/{nrNota}` — documento completo
   - Ordem de processamento: ordenar por dataPregao ASC antes de salvar
5. Feedback visual: barra de progresso por arquivo + resumo final

### Atenção ao implementar F2

- Importar `parseSinacorNota` com `dynamic(() => import(...), { ssr: false })`
  pois pdfjs-dist não funciona em SSR (next.config tem output: "export")
- Usar `URL.createObjectURL` para preview do PDF se necessário
- O campo `password` da nota XP = primeiros 3 dígitos do CPF do cliente
  (exibir hint na UI: "Senha: primeiros 3 dígitos do CPF")
- Detectar nota duplicada: consultar Firestore por nrNota antes de salvar
- Ordenar fila por dataPregao para garantir PM calculado na ordem correta (F3)

---

## Sessão F1 — concluída (commit dbf31c7)

Objetivo: parser de notas Sinacor em TypeScript (browser, pdfjs-dist).
Foco: extrair `ParsedNotaResult` de um PDF de nota XP/Clear/Rico.

```
frontend/src/lib/ir/
  pdf/
    nota-parser.ts        ← parseSinacorNota(pdfData, opts?) → ParsedNotaResult
    sinacor-patterns.ts   ← regex e constantes de extração (separado para testabilidade)
```

### Estrutura de `nota-parser.ts`

```typescript
export async function parseSinacorNota(
  pdfData: ArrayBuffer,
  opts?: { password?: string; codigoCliente?: string }
): Promise<ParsedNotaResult>
```

Internamente:
1. `extractTextFromPDF(pdfData, password)` → texto raw (já implementado em pdfjs-loader.ts)
2. Detectar PDF-imagem → retornar com ExtractionQuality.IMAGEM
3. Extrair cabeçalho: dataPregao, numeroNota, codigoCliente, cnpjCorretora, nomeCorretora
4. Extrair tabela de operações: linhas "C/V Tipo Mercado Prazo Título Obs. Quantidade Preço/Ajuste D/C Valor Operação"
5. Para cada operação: `classifyAsset(ticker, tipoMercado)` → AssetClass
6. Extrair rodapé: taxas (corretagem, emolumentos, ISS, IRRF, clearing)
7. Calcular `valorLiquidoEmReais` = valor bruto − taxas totais
8. Calcular `ExtractionQuality` com `avaliarQualidadeExtracao()`
9. Retornar `ParsedNotaResult` completo

### Padrões regex chave (notas Sinacor XP)

- Data pregão: `Folha\s+\d+\s+de\s+\d+.*?Data pregão\s+(\d{2}/\d{2}/\d{4})`
- Número nota: `Nr\. nota\s+(\d+)`
- Linha de operação: `(C|V)\s+(VISTA|FRACIONARIO|OPCAO(?:\s+DE\s+(?:COMPRA|VENDA))?|FUTURO|TERMO)\s+(\w+)\s+.*?(\d[\d.]*)\s+(\d[\d.,]+)\s+(C|D)\s+(\d[\d.,]+)`
- IRRF: `I\.R\.R\.F\. s/ operações.*?(\d[\d.,]+)`
- Corretagem: `Corretagem\s+(\d[\d.,]+)`

### Atenção ao implementar F1

- Usar `disableRange: true, disableStream: true` (já configurado no loader)
- PDF protegido por senha: senha = primeiros 3 dígitos do CPF do cliente
- Testar com PDF real — a estrutura da nota pode variar levemente entre XP/Clear/Rico
- ExtractionQuality.MEDIA ou BAIXA → setar `manualReviewRequired: true`
- **NÃO** converter para centavos nesta camada — ParsedNotaResult usa reais (float)
  A conversão acontece ao salvar no Firestore (camada de use case)

---

## Sessão P2 — concluída (commit 2f62fb3)

Arquivos criados/modificados:

```
frontend/
  next.config.ts              ← alias canvas:false para pdfjs no browser
  package.json                ← pdfjs-dist@^5.7.284; predev/prebuild scripts
  scripts/
    copy-pdfjs-assets.mjs    ← copia cmaps/, standard_fonts/, pdf.worker para public/
  src/lib/ir/
    pdf/
      pdfjs-loader.ts        ← init singleton; loadPDF; extractTextFromPDF; isPDFImagem
    asset-classifier.ts      ← classifyAsset(ticker, tipoMercado?) → AssetClass
firestore.rules               ← Security Rules para notas_corretagem, posicoes_ir,
                                  apuracoes_ir, saldo_prejuizo, eventos_corporativos
```

## Sessão P1 — concluída (commit 3739a06)

```
frontend/src/lib/ir/
  types/
    firestore-schema.ts   ← schema canônico das 5 collections (centavos inteiros, 3 cestas)
    asset-types.ts        ← AssetClass enum + regras tributárias por classe
    parsed-nota.ts        ← contrato neutro de parsing (JS e Python produzem o mesmo tipo)
  utils/
    money.ts              ← toBRL(), fromBRL(), centavos helpers
```
