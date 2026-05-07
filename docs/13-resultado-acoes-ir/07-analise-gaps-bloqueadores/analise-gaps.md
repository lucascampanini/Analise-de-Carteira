# Análise de Gaps e Bloqueadores — Ferramenta de IR sobre Ações no CRM

> **Data:** Maio de 2026  
> **Autor:** Engenharia — análise crítica pré-implementação  
> **Escopo:** Ferramenta integrada ao CRM de assessores XP (Next.js 14 + Firebase Firestore)  
> **Baseado em:** Documentos 01 a 06 da pasta `docs/13-resultado-acoes-ir/`

---

## Legenda

- **BLOQUEADOR** — Vai quebrar o projeto se não resolvido antes de escrever código
- **RISCO** — Pode causar erro silencioso ou problema em produção
- **MELHORIA** — Não crítico para MVP mas impacta qualidade ou manutenção futura

---

## Categoria A — Contradições Entre Documentos

### [BLOQUEADOR] A1. Isenção de FII: 50 vs. 100 cotistas

**Fonte:** Doc 02 (seção 2.2.1) vs. Doc 04 (seção 2.2.6) vs. Doc 05 (seção 4.2)  
**Problema:** Os documentos estão em conflito direto entre si.
- **Doc 02** (tributação por classe): "mais de **100** cotistas" — referência expressa à Lei 15.270/2025.  
- **Doc 04** (compensação de prejuízos, seção 2.2.6): "mais de **50** cotistas" — texto ainda não atualizado.  
- **Doc 05** (DARF, seção 4.2): "mais de **50** cotistas" — idem, desatualizado.

A regra vigente em 2026 é **100 cotistas**, conforme Lei 15.270/2025, sancionada em 2025. O Doc 02 é a fonte correta. Os docs 04 e 05 foram escritos com base na lei anterior (Lei 11.033/2004, antes da alteração).  
**Impacto:** Se o sistema usar 50 cotistas como critério de isenção de rendimentos, pode indicar incorretamente que dividendos de FIIs menores são isentos quando já não são. Isso gera orientação fiscal errada ao cliente e potencial responsabilidade ao assessor.  
**Solução recomendada:** Usar sempre o limite de **100 cotistas** (Lei 15.270/2025). Adicionar comentário de código referenciando explicitamente a lei. Ignorar o critério para fins práticos: na enorme maioria dos FIIs listados na B3 (KNRI11, HGLG11, MXRF11 etc.) o requisito é cumprido; para FIIs menores o assessor deve alertar manualmente.

---

### [BLOQUEADOR] A2. correpy não roda no browser — contradição arquitetural entre Fase 1 e Fase 4

**Fonte:** Doc 01 (seção 8.4) vs. Doc 06 (seções 1, 2.4 e 8)  
**Problema:** O Doc 06 define Fase 1 como "MVP com parsing via pdfjs-dist no browser" e Fase 4 como "Firebase Function v2 (Python runtime) com correpy + pdfplumber". No entanto, o Doc 01 confirma explicitamente (seção 8.4): "Python-only — não funciona no browser". O Doc 06 trata essa transição como se fosse uma melhoria incremental simples, mas na prática a mudança é de paradigma arquitetural:

- Fase 1: processamento no **cliente** (browser, zero infraestrutura backend nova)  
- Fase 4: processamento no **servidor** (Firebase Function v2, Python runtime, Cloud Run)

O parser JavaScript da Fase 1 e o parser Python da Fase 4 não são intercambiáveis. Eles produzem resultados em estruturas ligeiramente diferentes (campo `buy_or_sell.value` do correpy vs. `tipo: 'C'|'V'` do parser JS). Se os dados salvos no Firestore por um formato não forem migrados quando o outro assumir, haverá inconsistência histórica.

**Impacto:** Notas importadas na Fase 1 (parser JS) vão ter estrutura diferente das notas da Fase 4 (parser Python). Isso afeta o recálculo retroativo de PM e carry-forward. Se não houver um contrato de dados neutro definido desde o início, a migração vai exigir reprocessamento total do histórico.  
**Solução recomendada:** Definir **agora** um schema canônico de `NotaCorretagemDoc` no Firestore que seja o contrato de dados independente de qual parser produziu os dados. Ambos os parsers (JS e Python) devem normalizar sua saída para esse schema antes de salvar. O schema deve incluir um campo `parserVersao` e `parserTipo: 'js-pdfjs' | 'python-correpy'` para rastreabilidade.

---

### [BLOQUEADOR] A3. `float` para valores monetários vs. exigência de centavos inteiros

**Fonte:** Doc 06 (schema `OperacaoFirestore`, linha `preco: number`) vs. Doc 04 (seção 9.3) e Doc 03 (seção 11.2)  
**Problema:** O Doc 06 armazena `preco: number` e `valorBruto: number` como `float` JavaScript (IEEE 754) com o comentário: "float, centavos evitados por precisão". Isso é diretamente contraditório com:
- **Doc 04** (seção 9.3): "Nunca use `float` para cálculos monetários ... armazenar sempre em centavos (inteiro)". Fornece exemplo: "R$ 1.500,75 → armazenar como 150075".
- **Doc 03** (seção 11.2): "Usar `Decimal`, nunca float" (Python). A recomendação é análoga em TypeScript.

O próprio Doc 06 reconhece o problema na seção 9.1: "0.1 + 0.2 === 0.30000000000000004" — mas depois ignora essa advertência no schema.

**Impacto:** Erros de arredondamento se acumulam ao longo de meses de processamento. O cálculo de PM com preços fracionários (ex: R$ 38,52) multiplicado por grandes quantidades produz centavos fantasmas. A discrepância pode ser pequena por operação mas, em um exercício fiscal, pode resultar em DARF calculado a maior ou menor, abrindo passivo fiscal para o assessor.  
**Solução recomendada:** Corrigir o schema do Firestore **antes de escrever a primeira linha de código de produção**. Armazenar `precoEmCentavos: number` (inteiro), `valorBrutoEmCentavos: number` (inteiro). Nos algoritmos de cálculo, trabalhar com centavos inteiros ou usar `decimal.js`. A conversão para exibição (dividir por 100) só ocorre na camada de apresentação.

---

### [RISCO] A4. MP 1.303/2025 — referência inconsistente entre documentos

**Fonte:** Doc 04 (seção 2.1, nota 2026 e referência 7) vs. Doc 06 (nenhuma menção)  
**Problema:** O Doc 04 documenta claramente que a MP 1.303/2025 "caducou em outubro de 2025" e que as regras vigentes para FIIs em 2026 são as da Lei 11.033/2004 (com alteração da Lei 15.270/2025). O Doc 06 não menciona nada sobre isso. O risco é que um desenvolvedor leia o Doc 06 isoladamente e assuma que as regras de FII são as antigas da MP que nunca entrou em vigor.  
**Impacto:** Risco baixo se o desenvolvedor ler todos os documentos. Risco alto se ler apenas o doc de implementação.  
**Solução recomendada:** Adicionar no código-fonte (comentário no classificador de FII e na função de alíquota) uma nota explícita: "Regras FII: Lei 11.033/2004 com alteração da Lei 15.270/2025. Alíquota ganho capital: 20%. Dividendos: isentos com condições (> 100 cotistas, PF < 10% do fundo, cotas negociadas em bolsa). MP 1.303/2025 caducou — NÃO aplicar."

---

## Categoria B — Gaps no Modelo de Dados Firestore (Doc 06)

### [BLOQUEADOR] B1. Schema `posicoes_ir` sem campo `classe_ativo`

**Fonte:** Doc 06 (seção 3.2, schema `PosicaoIRDoc`) vs. Doc 02 (seções 2, 3, 4)  
**Problema:** O schema `PosicaoIRDoc` do Doc 06 tem os campos: `ticker`, `quantidade`, `pm`, `custoTotal`, `ultimaAtualizacao`, `ultimaNotaId`, `possuiDayTradeAberto`. Não existe campo `classeAtivo`.

Sem `classeAtivo`, é impossível:
1. Aplicar a alíquota correta na apuração (15% para ACAO/ETF_RV/BDR vs. 20% para FII).
2. Determinar se a venda entra no cálculo do limite de R$ 20.000 de isenção.
3. Segregar o resultado na cesta correta (A para ações/ETF/BDR, B para FII).

O sistema precisaria refazer a classificação do ticker a cada cálculo (consultando as listas de ETFs e FIIs), o que é frágil e ineficiente.  
**Impacto:** Sem esse campo, o cálculo de IR para FIIs vai usar alíquota errada (15% em vez de 20%), e o cálculo da isenção de R$ 20.000 vai incluir FIIs indevidamente, gerando DARF incorreto.  
**Solução recomendada:** Adicionar `classeAtivo: AssetClass` ao schema `PosicaoIRDoc`. O valor é definido no momento em que a primeira operação com o ticker é processada e deve ser validado em operações subsequentes.

---

### [BLOQUEADOR] B2. Schema `resultado_mensal` sem segregação das 3 cestas

**Fonte:** Doc 06 (seção 3.3, schema `ResultadoMensalDoc`) vs. Doc 04 (seção 2, schema `ApuracaoMensalCompleta`) e Doc 02 (seção 7)  
**Problema:** O schema `ResultadoMensalDoc` do Doc 06 tem campos para ST e DT (ex: `ganhoLiquidoST`, `ganhoLiquidoDT`, `darfST`, `darfDT`) mas **não tem campos para a Cesta B (FII)** — que tem alíquota 20% e é completamente isolada da Cesta A.

O Doc 04, por outro lado, propõe o schema correto com `cesta_a_*` e `cesta_b_*` separados. Os dois documentos estão em conflito.

Consequências do schema do Doc 06:
- O `ganhoLiquidoST` mistura ações (15%) e FIIs (20%) num único campo, tornando o cálculo do IR impossível de ser feito corretamente.
- O `isentoST: boolean` aplica a verificação de R$ 20.000 potencialmente sobre FIIs, o que é errado.
- Não há como registrar `rendimentosIsentos` de FIIs para a DIRPF.  

**Impacto:** O DARF calculado vai ser sistematicamente errado para qualquer cliente que opere FIIs.  
**Solução recomendada:** Adotar o schema do Doc 04 como referência: campos separados para `cesta_a_st_*`, `cesta_a_dt_*`, `cesta_b_st_*`, `cesta_b_dt_*`. Ver `ApuracaoMensalCompleta` no Doc 04 (seção 10.1) como modelo canônico.

---

### [BLOQUEADOR] B3. Campo `vendasST` inclui FII — cálculo da isenção de R$ 20.000 errado

**Fonte:** Doc 06 (seção 3.3 e função `apurarMensal`) vs. Doc 04 (seção 3.1) e Doc 03 (seção 6.3)  
**Problema:** O campo `vendasST` no schema do Doc 06 é descrito como "total de vendas swing trade no mês (para isenção)". A função `apurarMensal` no Doc 06 compara `entrada.vendasST <= LIMITE_ISENCAO_ST` para determinar isenção.

Mas `vendasST` agrega todas as vendas swing trade, incluindo FIIs e ETFs, o que é errado.

A regra legal (confirmada pelos Docs 02, 03, 04 e 05) é explícita: o limite de R$ 20.000 se aplica **exclusivamente** a vendas de ações à vista (e ouro como ativo financeiro). FIIs, ETFs, BDRs, opções e futuros **não entram** nesse cálculo e nunca têm isenção.  
**Impacto:** Se um cliente vender R$ 12.000 em ações e R$ 10.000 em FIIs no mesmo mês, o sistema calculará `vendasST = 22.000` e concluirá que não há isenção — mas a isenção deveria se aplicar às ações (R$ 12.000 < R$ 20.000). O cliente pagará DARF quando não deveria.  
**Solução recomendada:** Renomear o campo para `vendasAcoesST` (ou `cesta_a_st_vendas_acoes`) e garantir que só ações e Units entrem nesse total. FIIs, ETFs, BDRs, opções e futuros vão para o resultado bruto de suas respectivas cestas, mas nunca para o contador de isenção.

---

### [RISCO] B4. Schema `saldo_prejuizo` com apenas 2 tipos (ST/DT) — falta cesta FII

**Fonte:** Doc 06 (seção 3.4, schema `SaldoPrejuizoDoc`) vs. Doc 04 (seções 2 e 10.2)  
**Problema:** O schema `SaldoPrejuizoDoc` usa `tipo: 'ST' | 'DT'` como document ID. Isso implica apenas dois saldos: um para swing trade geral e um para day trade geral.

Faltam:
- `saldo_fii_st`: prejuízo de FII em swing trade (Cesta B — não pode compensar ações)
- `saldo_fii_dt`: prejuízo de FII em day trade (raro, mas possível)

Com o schema atual, um prejuízo em FII seria misturado ao saldo ST de ações, permitindo compensação indevida entre cestas.  
**Impacto:** Compensação ilegal entre cestas A e B — pode resultar em DARF menor que o correto, gerando passivo fiscal.  
**Solução recomendada:** Expandir para `tipo: 'A_ST' | 'A_DT' | 'B_ST' | 'B_DT'` (seguindo a nomenclatura de cestas do Doc 04). Ou usar o modelo consolidado do Doc 04 com `saldo_atual` como documento único com campos por cesta.

---

### [RISCO] B5. Nenhum campo para IRRF acumulado entre meses (carry-forward intra-ano)

**Fonte:** Doc 06 (schema `ResultadoMensalDoc`) vs. Doc 04 (seção 6.2 e schema)  
**Problema:** O schema do Doc 06 não tem campo para IRRF excedente acumulado. A fórmula `darfST = max(0, irBrutoST - irrfST)` considera apenas o IRRF do mês corrente. Se o IRRF retido no mês superar o IR calculado (comum em meses com poucas vendas e isenção), o excesso simplesmente desaparece.

O Doc 04 (seção 6.2) é claro: o excesso de IRRF pode ser transportado para compensar IR nos meses seguintes até dezembro do mesmo ano. Após dezembro, vai para a DIRPF como "imposto pago/retido" para possível restituição.  
**Impacto:** O sistema subestima o crédito de IRRF do cliente. O assessor vai orientar o cliente a pagar um DARF que seria zero (porque o IRRF excedente do mês anterior deveria ter coberto). Perda financeira pequena por mês, mas real.  
**Solução recomendada:** Adicionar `irrfAcumuladoST: number` e `irrfAcumuladoDT: number` ao schema mensal. No cálculo do DARF, usar `irrf_total = irrfDoMes + irrfAcumuladoMesesAnteriores`. Zerar o acumulado na virada do ano (vai para DIRPF).

---

### [RISCO] B6. Nenhum modelo para notas BM&F (futuros) — formato completamente diferente

**Fonte:** Doc 01 (seção 3.1) vs. Doc 06 (nenhuma menção a BM&F no schema)  
**Problema:** O Doc 01 documenta claramente que existem dois tipos de nota SINACOR: Bovespa (ações) e BM&F (futuros/derivativos), com estruturas de campos completamente diferentes. O Doc 06 trata apenas o formato Bovespa. Futuros aparecem em notas BM&F separadas, com campos como "Ajuste Diário" em vez de "Preço/Ajuste".

O schema `NotaCorretagemDoc` do Doc 06 não tem: `segmento: 'BOVESPA' | 'BMF'`, campos de ajuste diário, vencimento de contrato ou resultado do ajuste.  
**Impacto:** Clientes que operam WIN/WDO não terão suas notas BM&F processadas. O assessor terá PM e apuração de IR incompletos para esses clientes.  
**Solução recomendada:** Adicionar `segmento: 'BOVESPA' | 'BMF'` ao schema `NotaCorretagemDoc`. Para notas BM&F, adicionar sub-schema específico com campos de futuro. Isso pode ser Fase 2 do roadmap mas deve estar no schema desde o início para evitar migrações.

---

### [MELHORIA] B7. Nenhum campo para IRRF acumulado não transportável entre anos (DIRPF)

**Fonte:** Doc 04 (seção 6.2, tabela) e Doc 05 (seção 12)  
**Problema:** O IRRF retido durante o ano que não foi compensado nos DARFs mensais vai para a DIRPF como "imposto retido na fonte". O schema atual não tem campo para isso, nem lógica de zeramento anual.  
**Impacto:** O relatório anual gerado para o cliente não terá o valor correto de IRRF para informar na DIRPF. Pode fazer o cliente perder restituição.  
**Solução recomendada:** Adicionar ao relatório anual o campo "Total IRRF retido no ano" e documenta-lo separado do saldo de prejuízo. É dado derivado das somas de `irrfST + irrfDT` de todos os meses do ano.

---

## Categoria C — Gaps Técnicos no Parser (Docs 01 e 06)

### [BLOQUEADOR] C1. `cMapUrl` ausente no parser do Doc 06 — acentuação falha silenciosamente

**Fonte:** Doc 01 (seção 11.2) vs. Doc 06 (seção 2.3, função `parseNotaCorretagem`)  
**Problema:** O parser TypeScript do Doc 06 inicializa o pdfjs sem `cMapUrl`:
```typescript
const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
```

O Doc 01 (seção 11.2) documenta que isso é crítico:
> "Esta configuração é OBRIGATÓRIA para PDFs com fontes especiais"

Sem o `cMapUrl`, caracteres acentuados do português (`ã`, `ç`, `é`, `ê`, `ó`) aparecem como `?`, espaços ou sequências corrompidas. Os campos críticos "Especificação do título" (contém o ticker) e "Negócios Realizados" são afetados. O parser pode extrair o ticker errado ou falhar silenciosamente sem erro.

O Doc 01 também documenta que essa falha é silenciosa: o texto é extraído mas está errado, sem nenhum erro ou exceção.  
**Impacto:** Parsing corrompido em PDFs com fontes Type1/Type3 (comuns em notas SINACOR geradas pelo sistema Oracle das corretoras). Operações serão perdidas ou parseadas com dados errados. PM calculado incorretamente.  
**Solução recomendada:** Antes de escrever qualquer código de parser, configurar o `next.config.js` para copiar os cmaps para `/public`, e inicializar o pdfjs com:
```typescript
const loadingTask = pdfjsLib.getDocument({
  data: pdfBuffer,
  cMapUrl: '/_next/static/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/_next/static/standard_fonts/',
});
```

---

### [BLOQUEADOR] C2. Nenhuma detecção de PDF-imagem (nota digitalizada)

**Fonte:** Doc 01 (seção 11.3) vs. Doc 06 (nenhuma menção)  
**Problema:** O Doc 01 documenta que notas antigas podem ser PDFs de imagem (escaneadas/digitalizadas). O pdfjs não extrai texto de imagens — retorna string vazia ou com menos de 100 caracteres. O parser do Doc 06 não verifica esse caso e processaria um array de operações vazio, provavelmente salvando uma nota com zero operações no Firestore sem nenhum alerta ao usuário.  
**Impacto:** O assessor importa uma nota digitalizada, recebe status "processado" com sucesso, mas o PM e a apuração ficam incorretos por dados ausentes. Falha silenciosa grave.  
**Solução recomendada:** Implementar a função `isPDFImagem` documentada no Doc 01:
```typescript
function isPDFImagem(texto: string): boolean {
  return texto.trim().length < 100;
}
```
Se retornar `true`, exibir mensagem: "Este PDF parece ser uma imagem digitalizada e não pode ser processado automaticamente. Por favor, obtenha a versão digital da nota na sua corretora."

---

### [BLOQUEADOR] C3. Nenhum fallback quando o parser falha — usuário sem feedback

**Fonte:** Doc 06 (hook `useUploadNota`, bloco `catch`)  
**Problema:** O bloco `catch` do hook `useUploadNota` apenas seta `status = 'error'` e `erro = e.message`. Não há:
1. Nenhuma estratégia de fallback (ex: formulário manual de preenchimento)
2. Nenhuma informação de qual campo falhou no parsing
3. Nenhuma opção de "corrigir manualmente e confirmar"

O próprio Doc 06 (seção 8, Fase 1) diz: "O assessor deve validar os dados antes de confirmar" — mas não há nenhum componente de validação/correção manual no fluxo.  
**Impacto:** Quando o parser falha (o que vai acontecer para notas de corretoras não testadas, PDFs com layout diferente, ou após mudança de versão do SINACOR), o assessor não tem nenhuma alternativa. A nota é bloqueada indefinidamente.  
**Solução recomendada:** Implementar um passo de "revisão e confirmação" entre o parsing e o save. O parser extrai o que consegue, exibe em um formulário editável, e o assessor corrige campos errados/faltantes antes de confirmar. Isso é mencionado no Doc 06 como prioridade da Fase 1 mas sem implementação.

---

### [RISCO] C4. Campo de senha no modal de upload não implementado

**Fonte:** Doc 01 (seção 10) vs. Doc 06 (seção 9.4, apenas menciona brevemente)  
**Problema:** O Doc 01 documenta que notas XP, Clear e Rico são frequentemente protegidas por senha (primeiros 3 dígitos do CPF). O Doc 06 menciona o suporte a senha em uma linha (seção 9.4) mas o componente `UploadNotaModal` na estrutura de componentes (seção 5) não inclui nenhum campo de senha. O hook `useUploadNota` passa `pdfBuffer` diretamente para `parseNotaCorretagem` sem tratamento de senha.  
**Impacto:** Qualquer nota XP/Clear/Rico protegida por senha vai falhar no parsing com erro de "senha incorreta" não tratado.  
**Solução recomendada:** Implementar o padrão do Doc 01 (seção 10.2): tentar abrir sem senha; se falhar com `PasswordException`, exibir campo de senha no modal com o hint "geralmente os primeiros 3 dígitos do CPF do cliente".

---

### [RISCO] C5. Distinção entre FII, ETF e Unit para tickers com sufixo "11" não implementada no parser

**Fonte:** Doc 02 (seções 2.6, 3.5, 8) vs. Doc 06 (parser não usa as listas de referência)  
**Problema:** O Doc 02 documenta extensamente o problema: tickers terminados em "11" podem ser FII, ETF de RV, ETF de RF ou Unit. A distinção exige uma lista de referência (`ETF_RF_TICKERS`, `ETF_RV_TICKERS`, `FIAGRO_TICKERS`, `UNIT_TICKERS`). Essas listas estão documentadas no Doc 02 (seção 10.2).

O parser do Doc 06 (seção 2.3) extrai o ticker do campo "Especificação do título" mas não realiza nenhuma classificação. O campo `isDayTrade` é calculado, mas `assetClass` nunca é definido durante o parsing. O classificador do Doc 02 só é mencionado como código auxiliar mas não está integrado ao fluxo de parsing do Doc 06.  
**Impacto:** Todos os tickers com sufixo "11" serão processados como se fossem ações (alíquota 15%, isenção R$ 20k), quando muitos são FIIs (alíquota 20%, sem isenção). Erro tributário sistemático.  
**Solução recomendada:** Integrar o `classifyAsset()` do Doc 02 ao pipeline de parsing. Chamá-lo para cada operação após extrair ticker e tipoMercado. O resultado deve ser salvo como `assetClass` em `OperacaoFirestore`.

---

### [RISCO] C6. `dataPregao` sem conversão de timezone para BRT (UTC-3)

**Fonte:** Doc 06 (função `parseNotaCorretagem`, linha `const dataPregao = new Date(year, month - 1, day)`)  
**Problema:** O Firestore armazena `Timestamp` em UTC. A B3 opera em BRT (UTC-3). Ao criar `new Date(year, month - 1, day)` sem timezone explícito, o JavaScript usa o timezone local da máquina que está executando o código. Em um cliente no Brasil, isso pode funcionar. Em um servidor Firebase Functions rodando em UTC (padrão do Cloud Run), um pregão de 15/05 em BRT pode ser salvo como 14/05 em UTC.

Queries mensais que filtram `anoMes == '2026-05'` podem perder a nota da última sessão do mês (31/05 às 00:00 BRT = 31/05 03:00 UTC, ok) ou incluir erroneamente notas de outro mês.  
**Impacto:** Apuração mensal com datas incorretas. O mês de competência da nota pode ser errado, gerando DARF no mês errado.  
**Solução recomendada:** Ao criar a data do pregão, forçar explicitamente BRT: `new Date(Date.UTC(year, month - 1, day, 3, 0, 0))` (meio-dia em BRT = 15h UTC). Ou armazenar `dataPregao` como string `'YYYY-MM-DD'` e derivar timestamps quando necessário.

---

### [MELHORIA] C7. Parser não diferencia "Modelo XP" do "Modelo B3" da XP

**Fonte:** Doc 01 (seção 4.1)  
**Problema:** O Doc 01 documenta que a XP oferece dois modelos: o "Modelo B3" (padrão SINACOR, parseável) e o "Modelo XP" (proprietário, incompatível com ferramentas fiscais). Se o assessor importar acidentalmente uma nota no "Modelo XP", o parser vai falhar ou retornar dados corrompidos sem nenhum aviso claro.  
**Impacto:** Falha silenciosa ou dados incorretos para ~20% das notas XP se o assessor não souber selecionar o modelo correto.  
**Solução recomendada:** Detectar no início do parsing se o PDF é "Modelo XP" (buscar por padrões textuais do formato proprietário) e exibir mensagem: "Esta nota está no Modelo XP. Acesse o Portal XP, selecione 'Modelo B3' e reimporte."

---

## Categoria D — Gaps de Regras de Negócio (Docs 02, 03, 04)

### [BLOQUEADOR] D1. FIIs, ETFs e BDRs ausentes da apuração — roadmap informal não resolve o problema de dados

**Fonte:** Doc 06 (seção 4.2, função `apurarMensal`) vs. Doc 02 (seções 2, 3, 4)  
**Problema:** A função `apurarMensal` do Doc 06 recebe `ganhosST`, `ganhosDT` e `vendasST` como números agregados, sem segregação por classe de ativo. O cálculo aplica 15% em tudo na base de cálculo ST. A alíquota de 20% para FIIs nunca é aplicada.

Mesmo que a classificação de ativos seja implementada no parser (ver C5), a função de apuração mensal não usa essa informação para aplicar alíquotas corretas por classe.  
**Impacto:** FIIs sempre tributados a 15% em vez de 20%. Sistemicamente errado. Não é um detalhe que pode ser "adicionado depois" — requer refatoração da função de apuração.  
**Solução recomendada:** Refatorar `apurarMensal` para receber resultados já segregados por cesta: `{ cesta_a_st, cesta_a_dt, cesta_b_st, cesta_b_dt }`. Cada cesta tem sua alíquota e regras próprias. Usar o pseudocódigo do Doc 04 (seção 11) como referência.

---

### [RISCO] D2. Opções: ticker de opção pode ser confundido com ticker de ação

**Fonte:** Doc 02 (seção 5.6) e Doc 01 (seção 7.1) vs. Doc 06 (função `parseTicker`)  
**Problema:** A função `parseTicker` do Doc 06 usa o regex `/^([A-Z]{4}\d{1,2}[A-Z]?)\b/` para extrair o ticker. Para a opção "PETR4L300", isso extrai "PETR4L" — que não é um ticker válido de ação. O regex não distingue corretamente opções de ações.

O Doc 01 (seção 7.1) mostra que o campo "Tipo Mercado" é o identificador confiável: "OPCAO DE COMPRA" e "OPCAO DE VENDA". Mas o parser do Doc 06 (seção 2.3) usa uma heurística diferente que pode falhar para opções.  
**Impacto:** Operações com opções podem ser salvas com ticker errado. O PM de opções pode ser misturado com o PM de ações do ativo objeto.  
**Solução recomendada:** Usar o campo "Tipo Mercado" (já extraído) como filtro primário antes de tentar extrair o ticker. Se `tipoMercado === 'OPCAO_COMPRA' || 'OPCAO_VENDA'`, usar o decoder de opções do Doc 02 (seção 10.5) para extrair ticker da opção completo e ticker do ativo objeto separadamente.

---

### [RISCO] D3. Notas retificadas/canceladas sem tratamento — importação duplicada quebra PM

**Fonte:** Doc 04 (seção 9.1) vs. Doc 06 (nenhuma menção)  
**Problema:** O Doc 04 documenta que corretoras emitem notas retificadas (com sufixo "R" ou "C" no número da nota) para corrigir erros operacionais. O sistema deve ignorar a nota original e usar apenas a retificadora. O Doc 06 não tem nenhum campo `status: 'ATIVA' | 'CANCELADA' | 'RETIFICADA' | 'RETIFICADORA'` nem lógica de detecção.

Se o assessor importar a nota original e a nota retificadora, as operações serão somadas, dobrando as quantidades e os valores. O PM calculado será completamente errado.  
**Impacto:** PM incorreto para todos os tickers da nota, afetando todos os cálculos subsequentes.  
**Solução recomendada:** Adicionar `status: 'ATIVA' | 'CANCELADA' | 'RETIFICADA' | 'RETIFICADORA'` ao schema `NotaCorretagemDoc`. Detectar notas retificadas pelo número da nota (sufixo "R", "C" ou número duplicado com data diferente). Antes de processar, verificar se já existe nota com mesmo número e data para a mesma corretora.

---

### [RISCO] D4. Importação fora de ordem cronológica sem reprocessamento em cascata

**Fonte:** Doc 04 (seção 5) vs. Doc 06 (nenhuma menção)  
**Problema:** O Doc 04 documenta extensamente o problema: se o assessor importar notas de março antes de importar notas de janeiro, o PM de fevereiro e março estará errado porque foi calculado sem as operações de janeiro. A solução (seção 5.3 do Doc 04) é um algoritmo de reprocessamento em cascata com o campo `dirty: boolean` nos documentos mensais e uso de batch writes no Firestore.

O Doc 06 não menciona `dirty`, não tem algoritmo de cascata e usa `addDoc` simples sem nenhuma lógica de reprocessamento.  
**Impacto:** PM sistematicamente errado quando notas são importadas retroativamente. O assessor que reconstruir o histórico de um cliente importando notas antigas vai ter resultados incorretos em todos os meses subsequentes.  
**Solução recomendada:** Implementar o campo `dirty: boolean` no schema de `resultado_mensal` (ou `apuracoes`). Ao importar uma nota com data anterior ao último mês processado, marcar todos os meses posteriores como `dirty = true`. Implementar a função `reprocessarAPartirDe` do Doc 04 (seção 5.3), usando Firestore batch writes para garantir atomicidade.

---

### [RISCO] D5. Day Trade parcial não tratado corretamente

**Fonte:** Doc 03 (seção 7.3) e Doc 04 (seção 9.5) vs. Doc 06 (seção 4.1)  
**Problema:** O Doc 06 marca uma operação como day trade com base na presença do mesmo ticker em compras e vendas da mesma nota. Mas a função `processarLoteOperacoes` processa compras antes de vendas indiscriminadamente, sem calcular `qtd_day_trade = min(total_comprado, total_vendido)`.

Cenário problemático: investidor compra 200 PETR4 e vende 100 PETR4 no mesmo dia. As 100 vendidas são DT, mas as 100 compradas que sobraram são ST. A função atual marca todas as 200 compras como contribuintes da posição ST, sem segregar as 100 que correspondem ao DT.  
**Impacto:** PM swing trade inflado. Ganho DT subapurado.  
**Solução recomendada:** Implementar o algoritmo do Doc 03 (seção 7.3): `qtd_DT = min(total_comprado, total_vendido)`. As primeiras compras até `qtd_DT` são DT; o restante é ST. O PM DT é calculado separadamente apenas com as compras intradiárias.

---

### [MELHORIA] D6. Day Trade em FII — alíquota correta mas sem tratamento de cesta isolada

**Fonte:** Doc 02 (seção 2.3) vs. Doc 04 (schema `cesta_b_dt`)  
**Problema:** Day trade em FII tem alíquota 20% (igual ao DT de ações), mas o prejuízo de DT em FII só pode compensar lucro de DT em FII — não compensa DT de ações. O Doc 06 não trata esse caso de forma alguma.  
**Impacto:** Raro na prática (poucos clientes fazem DT em FII), mas quando ocorre, a compensação seria aplicada de forma incorreta.  
**Solução recomendada:** O schema `cesta_b_dt_*` do Doc 04 cobre esse caso. Ao implementar o schema correto (B2), esse caso será tratado automaticamente.

---

### [MELHORIA] D7. Eventos corporativos: bonificação requer custo divulgado em fato relevante

**Fonte:** Doc 03 (seção 5.4) vs. Doc 06 (seção 7 e coleção `eventos_corporativos`)  
**Problema:** O schema `EventoCorporativoDoc` do Doc 06 tem apenas `tipo: 'SPLIT' | 'GRUPAMENTO' | 'BONIFICACAO'` e `fator: number`. Para bonificações, o `fator` de quantidade de ações novas não é suficiente — é necessário também o `custoUnitarioBonificado` (valor divulgado pela empresa em fato relevante, que impacta o PM).

A brapi.dev retorna `value` para bonificações mas não está claro se esse valor é o fator de quantidade ou o custo unitário.  
**Impacto:** PM calculado incorretamente para ações que receberam bonificação. O usuário veria PM diferente do correto.  
**Solução recomendada:** Adicionar `custoUnitarioBonificado?: number` ao schema `EventoCorporativoDoc`. Para bonificações, exigir que o assessor confirme/informe o custo unitário do fato relevante, com link para consulta na CVM.

---

## Categoria E — Gaps de Infraestrutura e Deploy

### [BLOQUEADOR] E1. @react-pdf/renderer — compatibilidade com Next.js 14 App Router

**Fonte:** Doc 06 (seção 6.2) — sem menção a `'use client'` ou dynamic import  
**Problema:** `@react-pdf/renderer` usa APIs do Node.js (`fs`, `buffer`, `stream`) e não é compatível com Server Components do Next.js 14 App Router. O componente `RelatorioIRDocument` do Doc 06 não tem diretiva `'use client'`.

Além disso, `@react-pdf/renderer` causa erros em SSR (Server-Side Rendering) porque tenta acessar APIs de browser. O componente deve ser carregado apenas no cliente com `dynamic import` e `{ ssr: false }`.  
**Impacto:** Build do Next.js vai falhar ou o componente vai lançar erro em runtime no servidor.  
**Solução recomendada:** Criar o componente como Client Component (`'use client'`) e importá-lo com:
```typescript
const RelatorioIRDocument = dynamic(
  () => import('./RelatorioIRDocument'),
  { ssr: false }
);
```
A geração do PDF (`PDFDownloadLink` ou `pdf().toBlob()`) ocorre apenas no browser.

---

### [BLOQUEADOR] E2. pdfjs-dist (~3MB) no bundle principal — Next.js vai incluir por padrão

**Fonte:** Doc 06 (seção 2.1) vs. boas práticas Next.js  
**Problema:** O Doc 06 importa pdfjs-dist diretamente:
```typescript
import * as pdfjsLib from 'pdfjs-dist';
```
Isso inclui os ~3MB do bundle do pdfjs no bundle principal do Next.js 14, impactando o tempo de carregamento inicial de toda a aplicação CRM.

Adicionalmente, o Web Worker do pdfjs (`pdf.worker.min.mjs`) referenciado com `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` pode não funcionar corretamente com o bundler do Next.js 14 sem configuração adicional.  
**Impacto:** Degradação severa de performance do CRM inteiro. O Lighthouse score vai cair. Carregamento lento de todas as páginas, não apenas da página de IR.  
**Solução recomendada:** Usar `dynamic import` com `{ ssr: false }` para o parser de PDF. O worker deve ser configurado via `next.config.js` como asset estático. Adicionar `experimental.serverComponentsExternalPackages: ['pdfjs-dist']` ao `next.config.js`.

---

### [RISCO] E3. Firebase Functions Python runtime — plano e disponibilidade

**Fonte:** Doc 06 (seções 1 e 2.4) — sem menção ao plano Firebase necessário  
**Problema:** Firebase Functions v2 com Python runtime requer o **plano Blaze (pay-as-you-go)**. O plano Spark (gratuito) não suporta Functions externas. O Doc 06 não menciona esse requisito.

Além disso, Firebase Functions v2 com Python runtime usa Cloud Run internamente. Dependências nativas (como Ghostscript para Camelot, ou JVM para Tabula) não estão disponíveis por padrão no ambiente Cloud Run padrão — precisariam de uma imagem Docker customizada.

A correpy usa `pdfminer.six` (Python puro, sem dependências nativas), então deve funcionar. Mas pdfplumber usa `pdfminer.six` + pillow (para imagens) — pillow tem dependências nativas que precisam ser compiladas.  
**Impacto:** A Fase 4 (parser Python na nuvem) pode não funcionar sem configuração extra do Cloud Run. Bloqueio não técnico (plano de cobrança) e possível bloqueio técnico (dependências nativas).  
**Solução recomendada:** Confirmar com o cliente qual plano Firebase está ativo. Se Spark, migrar para Blaze antes da Fase 4. Para dependências nativas do pdfplumber, verificar se o runtime padrão do Cloud Run inclui as bibliotecas necessárias ou se é preciso `Dockerfile` customizado.

---

### [RISCO] E4. Firebase Security Rules para as novas collections não foram definidas

**Fonte:** Doc 06 (nenhuma menção a Security Rules) vs. Doc 04 (path `clientes/{clienteId}/apuracoes/{anoMes}`)  
**Problema:** O Doc 06 usa paths como `usuarios/{uid}/clientes/{clienteId}/notas_corretagem/{notaId}`. As Security Rules do CRM atual foram escritas para o path existente do Positivador e CRM (`usuarios/{uid}/...`). Não está documentado se as novas subcoleções são cobertas por regras existentes ou precisam de regras novas.

Risco 1: as novas collections ficam abertas (sem regras), qualquer usuário autenticado pode ler os dados fiscais de qualquer cliente.  
Risco 2: regras existentes são muito restritivas e bloqueiam writes legítimos das novas collections.  
**Impacto:** Brecha de segurança (dados fiscais de clientes expostos) ou funcionalidade bloqueada.  
**Solução recomendada:** Antes de fazer deploy de qualquer collection nova, escrever e testar as Security Rules. Regra mínima: o assessor (`request.auth.uid`) deve ser dono do documento (`uid == request.auth.uid`). Usar Firebase Emulator Suite para testar regras antes do deploy.

---

### [MELHORIA] E5. `dynamic import` com `{ ssr: false }` para o parser — não documentado

**Fonte:** Doc 06 (seção 5.1, hook `useUploadNota`) — importa `parseNotaCorretagem` diretamente  
**Problema:** O hook `useUploadNota` importa `parseNotaCorretagem` na raiz do arquivo, causando que o pdfjs-dist seja carregado junto com o módulo do hook. Se esse hook for importado em qualquer Server Component (mesmo indiretamente), o build vai falhar.  
**Solução recomendada:** Garantir que `'use client'` esteja presente em todo componente ou hook que usa pdfjs. Alternativamente, usar `lazy()` do React para carregar o parser apenas quando o modal de upload é aberto.

---

## Categoria F — Gaps de UX e Fluxo do Assessor

### [BLOQUEADOR] F1. Upload modal não sabe para qual cliente atribuir a nota

**Fonte:** Doc 06 (hook `useUploadNota`, que recebe `clienteId`) vs. fluxo do assessor  
**Problema:** O hook recebe `clienteId` como parâmetro, assumindo que o modal de upload é aberto dentro da página do cliente específico. Mas o fluxo real de trabalho do assessor é: baixar 10 notas de 10 clientes diferentes e importar em lote. Não está documentado como o modal sabe para qual cliente cada nota pertence.

Adicionalmente, o CPF do cliente (necessário como hint de senha) não está disponível no hook — apenas o `clienteId`.  
**Impacto:** O assessor precisará importar uma nota por vez, entrando na página de cada cliente. Com 50 clientes, isso é inviável. Ou pior: vai importar nota do cliente A na página do cliente B por engano.  
**Solução recomendada:** Adicionar uma etapa de confirmação do cliente no modal de upload. Extrair o CPF do investidor da nota (campo "CPF" no rodapé, regex disponível no Doc 01) e validar contra o CPF do cliente selecionado. Se divergir, alertar.

---

### [RISCO] F2. Sem limite de retroatividade documentado — como tratar importação de notas de 2020?

**Fonte:** Doc 04 (seção 5.2) vs. Doc 06 (nenhuma menção)  
**Problema:** O Doc 04 documenta que não há limite legal de retroatividade para compensar prejuízo — um prejuízo de 2020 pode ser compensado em 2026. Mas há um limite para retificar declarações: 5 anos. O sistema não documenta como o assessor deve proceder quando importa notas de anos anteriores.

Especificamente: se o assessor importar notas de 2022 em maio de 2026, o sistema precisa recalcular toda a cadeia de PM e carry-forward de 2022 a 2026. O algoritmo de cascata do Doc 04 cobre isso, mas o prazo de processamento pode ser longo.  
**Impacto:** Importação retroativa pode travar a UI do assessor por minutos (processando anos de dados) sem feedback adequado.  
**Solução recomendada:** Implementar o reprocessamento em cascata como operação assíncrona (Firebase Function triggered por escrita na collection de notas). Exibir indicador de "reprocessando histórico" enquanto a cascata ocorre.

---

### [RISCO] F3. Múltiplas corretoras por cliente — PM deve ser agregado por CPF

**Fonte:** Doc 04 (seção 7) vs. Doc 06 (path `usuarios/{uid}/clientes/{clienteId}/notas_corretagem`)  
**Problema:** O Doc 04 documenta que um cliente pode operar em XP e Clear simultaneamente (note: ambas são do mesmo CNPJ, mas o problema se aplica a XP + BTG, por exemplo). Nesse caso, o PM de um ativo é calculado sobre todas as operações de todas as corretoras (por CPF, não por conta).

O Doc 06 não tem um campo `corretoraId` separado por operação, mas tem `corretora: string` na nota. O problema: se o cliente tem conta na XP e no BTG, a query de posições vai precisar agregar notas de ambas as corretoras para calcular o PM correto.

A path do Firestore `notas_corretagem` está aninhada sob `clientes/{clienteId}`, o que está correto. Mas falta a lógica de agregação multi-corretora no algoritmo de PM.  
**Impacto:** Cliente com múltiplas corretoras terá PM calculado erroneamente — apenas considerando as operações de uma corretora, ignorando as outras.  
**Solução recomendada:** Garantir que `processarLoteOperacoes` agregue todas as notas do período (independentemente de corretora) antes de calcular PM. A ordenação cronológica é por `dataPregao`, não por corretora.

---

### [RISCO] F4. Relatório PDF apenas com resumo anual — assessor precisa de detalhe mensal

**Fonte:** Doc 06 (seção 6.2, componente `RelatorioIRDocument`) vs. necessidade do assessor  
**Problema:** O componente `RelatorioIRDocument` tem apenas uma seção "Resumo Anual" com totais anuais de IR. Não há detalhe mensal.

Para orientar o cliente sobre quando pagar DARF, o assessor precisa de uma tabela com: mês, resultado ST, resultado DT, IRRF retido, DARF a pagar, vencimento. Sem esse detalhe, o relatório não tem utilidade prática imediata.  
**Impacto:** O assessor não pode usar o relatório para orientar o cliente sobre pagamentos mensais de DARF. Reduz o valor da ferramenta.  
**Solução recomendada:** Adicionar a seção `DetalhesMensais.tsx` (já listada na estrutura de componentes do Doc 06, seção 5) ao documento PDF. Essa seção deve ter a tabela mês a mês com todos os campos do `ResultadoMensalDoc`.

---

### [MELHORIA] F5. Nenhum alerta preventivo "vendas próximas de R$ 20k"

**Fonte:** Doc 05 (seção 13.2, tabela de alertas) vs. Doc 06 (sem implementação)  
**Problema:** O Doc 05 documenta o alerta "Atenção: vendas em R$ 18.500 — próximo do limite de isenção de R$ 20k" como funcionalidade necessária. O Doc 06 não implementa nenhum alerta em tempo real durante o mês.  
**Impacto:** O cliente pode realizar uma venda extra de R$ 1.600 e perder a isenção do mês inteiro sem saber. O assessor não tinha como alertar.  
**Solução recomendada:** O componente `AlertaIsencao.tsx` (listado na estrutura do Doc 06) deve mostrar o total acumulado de vendas de ações ST no mês corrente, com barra de progresso até R$ 20.000 e alerta em vermelho quando > R$ 18.000.

---

## Categoria G — Tópicos Não Cobertos por Nenhum dos 6 Documentos

### [BLOQUEADOR] G1. Firebase Security Rules para as novas collections — ausente em todos os docs

**Problema:** Nenhum dos 6 documentos define as Security Rules necessárias para as novas collections (`notas_corretagem`, `posicoes_ir`, `resultado_mensal`, `saldo_prejuizo`, `eventos_corporativos`). O CRM existente tem regras que cobrem os paths atuais, mas os novos paths não foram mapeados.

Isso é um pré-requisito de deploy, não uma melhoria. Sem regras corretas, os dados fiscais dos clientes ficam expostos ou o sistema não funciona.  
**Solução recomendada:** Criar um documento `08-security-rules/security-rules.md` que defina as regras Firestore para todas as novas collections, com testes usando Firebase Emulator.

---

### [RISCO] G2. Precisão decimal em TypeScript — biblioteca `decimal.js` vs. centavos inteiros

**Problema:** O Doc 04 recomenda `decimal.js` para TypeScript. O Doc 03 recomenda `Decimal` do Python. O Doc 06 usa uma abordagem híbrida: `Math.round(valor * 1e10) / 1e10` para PM (que ainda usa float) e discute centavos inteiros na seção 9.1 mas não implementa.

Não há uma decisão arquitetural documentada sobre qual abordagem usar consistentemente. `decimal.js` tem overhead de performance. Centavos inteiros são mais simples mas requerem disciplina de codificação.  
**Solução recomendada:** Decidir **antes de escrever a primeira linha de código de cálculo**: ou usar `decimal.js` em todos os cálculos de PM e apuração, ou usar centavos inteiros em todo o schema Firestore. Documentar a decisão em um ADR (Architecture Decision Record) no projeto.

---

### [RISCO] G3. Regime de criptoativos (Cesta C) completamente ausente

**Problema:** O Doc 04 documenta a existência de Cesta C (criptoativos: isenção até R$ 35.000/mês, 15% acima disso), mas nenhum dos 6 documentos define como importar extratos de exchanges de cripto, nem o schema Firestore para a Cesta C. O schema `ApuracaoMensalCompleta` do Doc 04 tem campos `cesta_c_*` mas não há pesquisa sobre como parsear extratos de Binance, Mercado Bitcoin etc.

Se clientes do assessor operarem cripto, essa lacuna impede a apuração completa do IR.  
**Solução recomendada:** Para MVP, documentar explicitamente que Cesta C não é suportada e exibir aviso no relatório. Para uma versão futura, pesquisar formatos de exportação das principais exchanges brasileiras (Binance, Mercado Bitcoin, Foxbit).

---

### [RISCO] G4. Integração com CEI/B3 como alternativa ao PDF — não pesquisada

**Problema:** A B3 anunciou em dezembro de 2024 (referência no Doc 05) uma ferramenta conjunta B3+RFB para pré-preenchimento de dados de renda variável. O Canal Eletrônico do Investidor (CEI) permite exportar posições e movimentações diretamente da B3. Nenhum dos 6 documentos pesquisa essa integração.

Essa alternativa ao parsing de PDF eliminaria os problemas de C1 (cMapUrl), C2 (PDF imagem), C4 (senha) e C7 (modelo proprietário XP).  
**Solução recomendada:** Pesquisar a API da B3 ou do CEI para verificar se há um endpoint oficial que retorne movimentações em formato estruturado. Se existir, pode ser a estratégia de parsing mais robusta para uma versão futura.

---

### [RISCO] G5. Regras de Units (SANB11, KLBN11, EGIE11) — isenção R$ 20k aplicável?

**Problema:** O Doc 02 (seção 10.2) classifica Units como `ACAO` para fins tributários e diz que "entram na conta dos R$ 20k". O Doc 02 também lista KLBN11, TAEE11, EGIE11 como Units com sufixo 11. Mas a lista `UNIT_TICKERS` no Doc 02 inclui "ITSA11" — que na prática não existe como Unit (ITSA4 é PN de Itaúsa, ITSA11 não é listado ativamente).

A lista de Units com sufixo 11 é pequena mas imprecisa. Se um ETF ou FII for incorretamente classificado como Unit, entrará indevidamente no cálculo de isenção de R$ 20k.  
**Solução recomendada:** Revisar e validar a lista `UNIT_TICKERS` contra a B3 antes de usar em produção. Adicionar um endpoint de consulta à API da B3 ou brapi.dev para verificar dinamicamente se um ticker com sufixo 11 é Unit, FII ou ETF.

---

### [MELHORIA] G6. Exercício de opções — PM das ações adquiridas via exercício de call

**Problema:** O Doc 03 (seção 8.4) e o Doc 02 (seção 5.4.2) documentam que no exercício de uma call, as ações adquiridas têm PM = strike + prêmio pago + custos. O prêmio pago pela opção integra o custo de aquisição das ações. Nenhum dos 6 documentos explica como o sistema deve tratar esse evento automaticamente: ele apareceria na nota como "EXERC DE OPCOES", não como uma compra normal.

Sem tratamento especial, o exercício seria registrado como compra ao preço do strike, ignorando o prêmio pago anteriormente.  
**Solução recomendada:** Para MVP, documentar como limitação conhecida: "exercícios de opções requerem ajuste manual do PM". Para uma versão futura, implementar o cruzamento: ao detectar "EXERC DE OPCOES" na nota, buscar o prêmio pago pela opção correspondente no histórico de operações.

---

## Tabela Resumo por Prioridade

| # | Gap | Categoria | Prioridade |
|---|-----|-----------|------------|
| A3 | `float` para valores monetários em vez de centavos inteiros | Contradição doc | BLOQUEADOR |
| A2 | correpy não roda no browser — contradição arquitetural Fase 1 vs Fase 4 | Contradição doc | BLOQUEADOR |
| A1 | Isenção FII: 50 vs. 100 cotistas (Lei 15.270/2025) | Contradição doc | BLOQUEADOR |
| B1 | `posicoes_ir` sem campo `classeAtivo` | Modelo de dados | BLOQUEADOR |
| B2 | `resultado_mensal` sem segregação das 3 cestas (A, B, FII) | Modelo de dados | BLOQUEADOR |
| B3 | `vendasST` inclui FII — isenção R$ 20k calculada errada | Modelo de dados | BLOQUEADOR |
| C1 | `cMapUrl` ausente no parser — acentuação falha silenciosamente | Parser técnico | BLOQUEADOR |
| C2 | Nenhuma detecção de PDF-imagem (nota digitalizada) | Parser técnico | BLOQUEADOR |
| C3 | Nenhum fallback quando parser falha — usuário sem feedback | Parser técnico | BLOQUEADOR |
| D1 | FIIs/ETFs/BDRs ausentes da apuração — alíquota errada | Regra de negócio | BLOQUEADOR |
| E1 | @react-pdf/renderer sem `'use client'` — build falha no App Router | Infraestrutura | BLOQUEADOR |
| E2 | pdfjs-dist (~3MB) incluído no bundle principal do Next.js | Infraestrutura | BLOQUEADOR |
| G1 | Firebase Security Rules para novas collections — não definidas | Gap geral | BLOQUEADOR |
| B4 | `saldo_prejuizo` sem cesta FII separada | Modelo de dados | RISCO |
| B5 | IRRF acumulado entre meses sem carry-forward intra-ano | Modelo de dados | RISCO |
| B6 | Nenhum modelo para notas BM&F (futuros) | Modelo de dados | RISCO |
| C4 | Campo de senha ausente no modal de upload | Parser técnico | RISCO |
| C5 | Sufixo "11" (FII/ETF/Unit) sem classificação integrada ao parser | Parser técnico | RISCO |
| C6 | `dataPregao` sem conversão explícita para BRT (UTC-3) | Parser técnico | RISCO |
| D2 | Ticker de opção confundido com ticker de ação | Regra de negócio | RISCO |
| D3 | Notas retificadas/canceladas sem tratamento | Regra de negócio | RISCO |
| D4 | Importação fora de ordem sem reprocessamento em cascata | Regra de negócio | RISCO |
| D5 | Day Trade parcial não tratado corretamente | Regra de negócio | RISCO |
| E3 | Firebase Functions Python runtime — plano Blaze necessário | Infraestrutura | RISCO |
| E4 | Firebase Security Rules — novas collections descobertas | Infraestrutura | RISCO |
| F1 | Modal não sabe para qual cliente atribuir a nota em lote | UX | RISCO |
| F2 | Sem limite de retroatividade documentado — cascata longa | UX | RISCO |
| F3 | Múltiplas corretoras por cliente sem agregação por CPF | UX | RISCO |
| F4 | Relatório PDF apenas com resumo anual — falta detalhe mensal | UX | RISCO |
| G2 | Decisão arquitetural: `decimal.js` vs. centavos inteiros | Gap geral | RISCO |
| G3 | Cesta C (criptoativos) completamente ausente | Gap geral | RISCO |
| G4 | CEI/B3 como alternativa ao PDF — não pesquisada | Gap geral | RISCO |
| G5 | Lista `UNIT_TICKERS` com sufixo 11 imprecisa | Gap geral | RISCO |
| A4 | MP 1.303/2025 inconsistente entre documentos | Contradição doc | RISCO |
| B7 | IRRF anual não transportável entre anos ausente | Modelo de dados | MELHORIA |
| C7 | Parser não detecta "Modelo XP" vs. "Modelo B3" | Parser técnico | MELHORIA |
| D6 | Day Trade em FII sem cesta isolada | Regra de negócio | MELHORIA |
| D7 | Bonificação requer custo do fato relevante — não tratado | Regra de negócio | MELHORIA |
| E5 | `dynamic import` com `{ ssr: false }` não documentado para hook | Infraestrutura | MELHORIA |
| F5 | Nenhum alerta preventivo "vendas próximas de R$ 20k" | UX | MELHORIA |
| G6 | Exercício de opções — PM das ações adquiridas via call | Gap geral | MELHORIA |

---

## O que fazer ANTES de escrever o primeiro arquivo de código

Execute os itens abaixo nesta ordem. Não escreva código de produção antes de concluir todos os BLOQUEADORs.

### Passo 1 — Definir o schema canônico de dados (resolver B1, B2, B3, B4, A3)

Crie o arquivo `src/lib/ir/types/firestore-schema.ts` com o schema definitivo do Firestore, resolvendo:
- `OperacaoFirestore` com `classeAtivo: AssetClass` e valores em **centavos inteiros** (`precoEmCentavos`, `valorBrutoEmCentavos`)
- `PosicaoIRDoc` com `classeAtivo: AssetClass`
- `ApuracaoMensalDoc` com segregação completa das cestas A e B (usando o modelo do Doc 04 como referência, não o do Doc 06)
- `SaldoPrejuizoDoc` com `tipo: 'A_ST' | 'A_DT' | 'B_ST' | 'B_DT'`
- Campo `vendasAcoesST` (apenas ações + Units) separado de `vendasTotalST` (que inclui tudo)

### Passo 2 — Definir o contrato de parsing independente do backend (resolver A2)

Crie o arquivo `src/lib/ir/types/parsed-nota.ts` com o tipo `ParsedNotaResult` que representa a saída normalizada de qualquer parser (JS ou Python). Ambos os parsers devem produzir exatamente esse tipo. Adicionar campo `parserMeta: { tipo: 'js-pdfjs' | 'python-correpy'; versao: string; timestamp: string }`.

### Passo 3 — Configurar pdfjs-dist corretamente no Next.js (resolver C1, E2)

Antes de qualquer código de parsing:
1. Configurar `next.config.js` com `CopyWebpackPlugin` para copiar cmaps e standard_fonts para `/public`
2. Criar wrapper `src/lib/pdf/pdfjs-loader.ts` com a inicialização correta (`cMapUrl`, `cMapPacked`, `workerSrc`)
3. Garantir que o import do pdfjs só ocorre no cliente (`dynamic` com `ssr: false`)
4. Testar com uma nota XP real que tenha acentos antes de continuar

### Passo 4 — Implementar detecção de PDF-imagem e fallback manual (resolver C2, C3)

Adicionar ao pipeline de parsing:
1. `isPDFImagem(texto: string): boolean` — alerta e bloqueia processamento
2. `avaliarQualidadeExtracao(texto: string): ExtractionQuality` — score 0-4
3. Formulário de revisão/correção manual integrado ao modal de upload

### Passo 5 — Corrigir a regra de FII para 100 cotistas (resolver A1)

Adicionar no código do classificador de ativos e na documentação do schema:
```typescript
/** 
 * Requisito para isenção de dividendos de FII.
 * Lei 15.270/2025 alterou de 50 para 100 cotistas.
 * MP 1.303/2025 (que alteraria outras regras) caducou em out/2025.
 */
const MIN_COTISTAS_FII_ISENCAO = 100;
```

### Passo 6 — Escrever as Firebase Security Rules (resolver G1, E4)

Antes de criar qualquer collection no Firestore em produção:
1. Escrever regras de segurança para todos os paths novos
2. Testar com Firebase Emulator Suite
3. Fazer deploy das regras antes de qualquer dado de produção

### Passo 7 — Decidir e implementar a estratégia de precisão decimal (resolver G2, A3)

Decisão: **centavos inteiros** (mais simples, zero dependência externa):
- Todos os valores monetários no Firestore são `number` (inteiro de centavos)
- Conversão para exibição ocorre apenas na camada de apresentação
- Criar funções utilitárias: `toBRL(centavos: number): string` e `fromBRL(reais: number): number`
- Criar funções de cálculo de PM usando inteiros: `calcularPMEmCentavos(...)`

### Passo 8 — Corrigir o componente de relatório PDF (resolver E1)

Adicionar `'use client'` ao componente `RelatorioIRDocument` e encapsulá-lo com `dynamic import` e `{ ssr: false }`. Testar geração de PDF antes da Fase 3.

### Passo 9 — Implementar campo de senha no modal de upload (resolver C4)

Adicionar ao `UploadNotaModal`:
1. Tentativa de abertura sem senha
2. Se `PasswordException`: exibir campo de senha com hint "primeiros 3 dígitos do CPF"
3. Retry com senha fornecida
4. Não persistir a senha em nenhum lugar

### Passo 10 — Integrar o classificador de ativos ao pipeline de parsing (resolver C5, D1)

Após ter o schema e o classificador prontos:
1. Chamar `classifyAsset()` do Doc 02 para cada operação extraída
2. Salvar `classeAtivo` em `OperacaoFirestore`
3. Usar `classeAtivo` na função `apurarMensal` para determinar cesta e alíquota correta
4. Implementar a segregação de `vendasAcoesST` vs. vendas de outras classes

---

*Documento elaborado em maio de 2026 com base nos documentos 01 a 06 da pasta `docs/13-resultado-acoes-ir/`. Revisar após implementação de cada fase.*
