'use client';
// Constantes e padrões de extração para notas Sinacor (XP/Clear/Rico/BTG/Inter/Genial).
// Separado do parser para facilitar testes unitários das regex isoladamente.

// CNPJ → nome normalizado. Grupo XP usa o mesmo CNPJ para todas as marcas.
export const CORRETORAS_NOME: Record<string, string> = {
  '02.332.886/0001-04': 'XP Investimentos CCTVM S.A.',
  '00.250.699/0001-53': 'BTG Pactual CTVM S.A.',
  '62.169.875/0001-79': 'Rico Investimentos (CTVM)',
  '02.801.938/0001-36': 'Inter DTVM Ltda.',
  '65.913.436/0001-17': 'Genial Investimentos CCTVM S.A.',
  '04.902.979/0001-44': 'Itaú Corretora de Valores S.A.',
};

export const PAT = {
  // ── Cabeçalho ────────────────────────────────────────────────────────────
  dataPregao:  /[Dd]ata\s+preg[aã]o\s+(\d{2}\/\d{2}\/\d{4})/,
  nrNota:      /Nr\.?\s*nota\s+(\d+)/i,
  cnpj:        /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/,
  // CPF do cliente: linha "CPF/CNPJ  xxx.xxx.xxx-xx" (formato PF)
  cpf:         /CPF\/CNPJ\s+(\d{3}\.\d{3}\.\d{3}-\d{2})/i,

  // ── Linhas de operação ────────────────────────────────────────────────────
  // Quick check antes do parse completo (evita regex pesada em linhas erradas)
  operacaoInicio: /^(C|V)\s+(VISTA|FRACIONARIO|OPCAO(?:\s+DE\s+(?:COMPRA|VENDA))?|FUTURO|TERMO)\s+/i,

  // Parse completo:  C/V  TipoMercado  [middle]  qty  preco  D/C  valor
  // - middle (não-ganancioso) absorve ticker + descritores + obs
  // - qty = inteiro sem ponto/vírgula
  // - preco e valor = formato BRL  ([\d.]+,\d{2})
  // Âncora $ garante que D/C e valor são sempre os últimos tokens da linha
  operacao: /^(C|V)\s+(VISTA|FRACIONARIO|OPCAO(?:\s+DE\s+(?:COMPRA|VENDA))?|FUTURO|TERMO)\s+(.+?)\s+(\d{1,10})\s+([\d.]+,\d{2})\s+(C|D)\s+([\d.]+,\d{2})\s*$/i,

  // Ticker B3 válido: 3-6 letras + dígitos + letra opcional + dígitos
  // Permissivo — classificação final é feita pelo classifyAsset()
  tickerB3: /^[A-Z]{3,6}[0-9A-Z]{0,8}$/,

  // ── Cabeçalho de tabela e âncoras de seção ───────────────────────────────
  cabecalhoTabela:    /C\/V\s+[Tt]ipo\s+[Mm]ercado/,
  negociosRealizados: /[Nn]eg[óo]cios?\s+[Rr]ealizados?/,
  resumoNegócios:     /[Rr]esumo\s+dos?\s+[Nn]eg[óo]cios?/,
  resumoFinanceiro:   /[Rr]esumo\s+[Ff]inanceiro/,

  // ── Campos do Resumo Financeiro ──────────────────────────────────────────
  linhaCorretagem:   /[Cc]orretagem|[Tt]axa\s+[Oo]peracional/,
  linhaEmolumentos:  /[Ee]molumentos/,
  linhaTaxaLiq:      /[Tt]axa\s+de\s+[Ll]iquida/,
  linhaTaxaReg:      /[Tt]axa\s+de\s+[Rr]egistro/,
  linhaISS:          /\bI\.?S\.?S\.?\b/,
  // IRRF normal: "I.R.R.F. s/operações, base R$ X,XX   Y,YY"
  linhaIRRFNormal:   /I\.?R\.?R\.?F\.?[^A-Za-z\d]*s\/\s*oper/i,
  // IRRF day-trade: "I.R.R.F. s/Day-Trade, base R$ X,XX   Y,YY"
  linhaIRRFDT:       /I\.?R\.?R\.?F\.?[^A-Za-z\d]*s\/\s*[Dd]ay/i,
  linhaValorLiquido: /[Vv]alor\s+l[íi]quido/,

  // ── BRL — encontra todos os valores monetários numa linha ─────────────────
  // Usado por extractLastBRL para pegar o valor mais à direita da linha
  qualquerBRL: /[\d.]+,\d{2}/g,
} as const;
