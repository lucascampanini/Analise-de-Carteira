// Fonte: docs/13-resultado-acoes-ir/02-tributacao-por-classe-ativo/
// Fonte: docs/13-resultado-acoes-ir/04-compensacao-prejuizo/
// Regras vigentes: Lei 15.270/2025, IN RFB 1.585/2015, Lei 11.033/2004

export enum AssetClass {
  ACAO     = 'ACAO',      // Ações ON, PN — B3
  UNIT     = 'UNIT',      // Units (SANB11, KLBN11, TAEE11) — tratadas como ACAO para IR
  FII      = 'FII',       // Fundos de Investimento Imobiliário
  FIAGRO   = 'FIAGRO',    // Fiagros — mesma cesta que FII (Cesta B)
  ETF_RV   = 'ETF_RV',    // ETFs de renda variável (BOVA11, SMAL11, IVVB11)
  ETF_RF   = 'ETF_RF',    // ETFs de renda fixa — IR retido na fonte, sem DARF manual
  BDR      = 'BDR',       // Brazilian Depositary Receipts (sufixos 34, 35, 32, 33)
  OPCAO    = 'OPCAO',     // Opções de compra (call) e venda (put)
  FUTURO   = 'FUTURO',    // Contratos futuros (WIN, WDO, BGI, DI1)
  CRIPTO   = 'CRIPTO',    // Criptoativos — FORA DO MVP (Cesta C)
  DESCONHECIDO = 'DESCONHECIDO',
}

// Cestas de compensação de prejuízo — segregação OBRIGATÓRIA pela RFB
// Prejuízo de uma cesta NUNCA compensa ganho de outra
export enum CestaIR {
  A = 'A', // Ações + ETF_RV + BDR + Opções + Futuros — 15% ST / 20% DT
  B = 'B', // FII + Fiagro — 20% ST e DT, completamente isolada
  C = 'C', // Cripto — fora do escopo do MVP
}

export enum TipoOperacao {
  COMPRA = 'C',
  VENDA  = 'V',
}

export enum ModalidadeOperacao {
  SWING_TRADE = 'ST',
  DAY_TRADE   = 'DT',
}

export enum SegmentoNota {
  BOVESPA = 'BOVESPA', // Ações, FIIs, ETFs, BDRs, Opções
  BMF     = 'BMF',     // Futuros (WIN, WDO) — nota com estrutura diferente
}

export interface RegrasTributarias {
  cesta: CestaIR;
  aliquotaST: number;       // ex: 0.15 (15%)
  aliquotaDT: number;       // ex: 0.20 (20%)
  entraIsencao20k: boolean; // true apenas para ACAO e UNIT
  irrfVenda: number;        // 0.00005 = 0,005% sobre valor bruto da venda
  irrfDT: number;           // 0.01 = 1% sobre resultado líquido DT
  temIsencao: boolean;      // se a classe tem alguma isenção mensal
}

// Regras tributárias consolidadas por classe (centavos nas constantes, alíquotas em decimal)
export const REGRAS_POR_CLASSE: Record<AssetClass, RegrasTributarias> = {
  [AssetClass.ACAO]: {
    cesta: CestaIR.A, aliquotaST: 0.15, aliquotaDT: 0.20,
    entraIsencao20k: true, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: true,
  },
  [AssetClass.UNIT]: {
    cesta: CestaIR.A, aliquotaST: 0.15, aliquotaDT: 0.20,
    entraIsencao20k: true, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: true,
  },
  [AssetClass.FII]: {
    cesta: CestaIR.B, aliquotaST: 0.20, aliquotaDT: 0.20,
    entraIsencao20k: false, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: false,
  },
  [AssetClass.FIAGRO]: {
    cesta: CestaIR.B, aliquotaST: 0.20, aliquotaDT: 0.20,
    entraIsencao20k: false, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: false,
  },
  [AssetClass.ETF_RV]: {
    cesta: CestaIR.A, aliquotaST: 0.15, aliquotaDT: 0.20,
    entraIsencao20k: false, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: false,
  },
  [AssetClass.ETF_RF]: {
    // IR retido na fonte pela corretora — não gera DARF manual pelo investidor
    cesta: CestaIR.A, aliquotaST: 0, aliquotaDT: 0,
    entraIsencao20k: false, irrfVenda: 0, irrfDT: 0, temIsencao: false,
  },
  [AssetClass.BDR]: {
    // 15% até R$5mi de ganho; 22,5% acima — MVP usa 15% (conservador para maioria)
    cesta: CestaIR.A, aliquotaST: 0.15, aliquotaDT: 0.20,
    entraIsencao20k: false, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: false,
  },
  [AssetClass.OPCAO]: {
    cesta: CestaIR.A, aliquotaST: 0.15, aliquotaDT: 0.20,
    entraIsencao20k: false, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: false,
  },
  [AssetClass.FUTURO]: {
    cesta: CestaIR.A, aliquotaST: 0.15, aliquotaDT: 0.20,
    entraIsencao20k: false, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: false,
  },
  [AssetClass.CRIPTO]: {
    // Cesta C — fora do MVP; isenção abaixo de R$35k/mês de vendas
    cesta: CestaIR.C, aliquotaST: 0.15, aliquotaDT: 0.15,
    entraIsencao20k: false, irrfVenda: 0, irrfDT: 0, temIsencao: true,
  },
  [AssetClass.DESCONHECIDO]: {
    cesta: CestaIR.A, aliquotaST: 0.15, aliquotaDT: 0.20,
    entraIsencao20k: false, irrfVenda: 0.00005, irrfDT: 0.01, temIsencao: false,
  },
};

// ─── Constantes fiscais (em centavos) ────────────────────────────────────────

// Isenção mensal de ST: apenas ACAO e UNIT (à vista)
// ETF, FII, BDR, Opções e Futuros NÃO entram neste limite
export const LIMITE_ISENCAO_ACOES_CENTAVOS = 2_000_000; // R$ 20.000,00

// DARF abaixo deste valor acumula para o mês seguinte (sem multa)
export const DARF_MINIMO_CENTAVOS = 1_000; // R$ 10,00

// Isenção cripto (Cesta C — MVP não implementa)
export const LIMITE_ISENCAO_CRIPTO_CENTAVOS = 3_500_000; // R$ 35.000,00

// FII: mínimo de cotistas para isenção de dividendos distribuídos
// ATENÇÃO: Lei 15.270/2025 alterou de 50 para 100. MP 1.303/2025 caducou em out/2025.
export const MIN_COTISTAS_FII_ISENCAO = 100;

// Código DARF para renda variável (pessoa física)
export const CODIGO_DARF_RV = '6015';
