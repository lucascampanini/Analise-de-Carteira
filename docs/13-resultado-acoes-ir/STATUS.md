# Status — Módulo IR em Notas Sinacor

> Atualizar este arquivo ao fim de cada sessão de desenvolvimento.
> Última atualização: 2026-05-07

---

## Estado atual

**Fase:** Pré-implementação  
**Próxima sessão:** P1 — Schema canônico + tipos base  
**Código implementado:** Nenhum ainda

## O que já foi feito

- [x] Pesquisa completa (7 documentos em `docs/13-resultado-acoes-ir/`)
- [x] Análise de gaps e bloqueadores (`07-analise-gaps-bloqueadores/analise-gaps.md`)
- [x] Decisões arquiteturais tomadas
- [x] Plano de sessões definido
- [ ] P1 — Schema canônico
- [ ] P2 — Infraestrutura (next.config.js, pdfjs, Security Rules)
- [ ] F1 — Parser PDF
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

## 13 bloqueadores (resolver antes de qualquer UI)

Ver detalhes completos em `07-analise-gaps-bloqueadores/analise-gaps.md`.

Resumo:
- A1: FII 100 cotistas (não 50)
- A2: correpy não roda no browser — schema canônico neutro desde o início
- A3: float → centavos inteiros
- B1: `posicoes_ir` precisa de campo `classeAtivo`
- B2: `resultado_mensal` precisa de 3 cestas separadas
- B3: `vendasST` deve excluir FII/ETF/BDR
- C1: `cMapUrl` obrigatório no pdfjs-dist
- C2: detecção de PDF-imagem (digitalizado)
- C3: fallback manual quando parser falha
- D1: `classifyAsset()` integrado ao pipeline de apuração
- E1: @react-pdf/renderer precisa de `'use client'`
- E2: pdfjs-dist fora do bundle principal
- G1: Firebase Security Rules para as 5 novas collections

---

## Sessão P1 — o que criar

Arquivos a criar em `frontend/src/lib/ir/`:

```
frontend/src/lib/ir/
  types/
    firestore-schema.ts   ← schema canônico das 5 collections (centavos inteiros, 3 cestas)
    asset-types.ts        ← AssetClass enum + regras tributárias por classe
    parsed-nota.ts        ← contrato neutro de parsing (JS e Python produzem o mesmo tipo)
  utils/
    money.ts              ← toBRL(), fromBRL(), centavos helpers
```
