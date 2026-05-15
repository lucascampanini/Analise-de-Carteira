// Schema canônico das 5 collections Firestore do módulo IR.
// Path base: users/{uid}/clientes/{clienteId}/
//
// REGRAS ABSOLUTAS deste schema:
// 1. Todos os valores monetários em CENTAVOS INTEIROS (number, nunca float)
// 2. Datas como string "YYYY-MM-DD" (dataPregao) ou Timestamp Firestore (eventos)
// 3. Resultados mensais segregados em 3 cestas: A (ações/ETF/BDR), B (FII), C (cripto)
// 4. vendasAcoesST conta APENAS ações e units — FII/ETF/BDR não entram na isenção R$20k
//
// Fonte: docs/13-resultado-acoes-ir/07-analise-gaps-bloqueadores/ (gaps B1, B2, B3, A3)

import type { Timestamp } from 'firebase/firestore';
import type { AssetClass, CestaIR, SegmentoNota, TipoOperacao } from './asset-types';
import type { ParserTipo } from './parsed-nota';

// ─── 1. notas_corretagem ─────────────────────────────────────────────────────
// Path: users/{uid}/clientes/{clienteId}/notas_corretagem/{notaId}
// Imutável após criação. Representa uma nota de corretagem importada.

export type StatusNota = 'processando' | 'processado' | 'erro' | 'revisao_pendente';
export type StatusRetificacao = 'ATIVA' | 'CANCELADA' | 'RETIFICADA' | 'RETIFICADORA';

export interface OperacaoFirestore {
  tipo: TipoOperacao;                  // 'C' ou 'V'
  ticker: string;                      // ex: "PETR4"
  tickerAtivo?: string;                // para opções: ativo objeto
  classeAtivo: AssetClass;             // classificado e persistido — nunca recalcular
  quantidade: number;                  // inteiro
  precoEmCentavos: number;             // preço unitário em centavos (ex: 3852 = R$38,52)
  valorBrutoEmCentavos: number;        // quantidade * precoEmCentavos
  custoRateadoEmCentavos: number;      // parcela de taxas rateada proporcional ao valor
  isDayTrade: boolean;
  tipoMercado?: string;                // "VISTA", "OPCAO DE COMPRA", etc.
}

export interface ResumoFinanceiroFirestore {
  taxaOperacionalEmCentavos: number;
  emolumentosEmCentavos: number;
  taxaLiquidacaoEmCentavos: number;
  taxaRegistroEmCentavos: number;
  issEmCentavos: number;
  irrfNormalEmCentavos: number;        // IRRF 0,005% sobre vendas ST
  irrfDayTradeEmCentavos: number;      // IRRF 1% sobre resultado DT
  liquidoParaClienteEmCentavos: number; // positivo = crédito; negativo = débito
  totalCustosDedutivelEmCentavos: number;
}

export interface NotaCorretagemDoc {
  id: string;
  clienteId: string;
  uid: string;

  // Metadados da nota
  nrNota: string;
  dataPregao: string;                  // "YYYY-MM-DD" em BRT — nunca Timestamp aqui
  anoMes: string;                      // "YYYY-MM" — para queries mensais
  corretora: string;
  cnpjCorretora: string;
  segmento: SegmentoNota;
  cpfCliente?: string;

  // Operações e resumo
  operacoes: OperacaoFirestore[];
  resumoFinanceiro: ResumoFinanceiroFirestore;

  // Controle de retificação — evita processamento duplo
  statusRetificacao: StatusRetificacao;
  notaRetificadoraId?: string;         // se RETIFICADA, aponta para a retificadora
  notaOriginalId?: string;             // se RETIFICADORA, aponta para a original

  // BMF/Futuros: resultado líquido do ajuste diário (+ = crédito, - = débito)
  // Preenchido somente quando segmento === BMF. É o P&L real dos contratos futuros.
  // Futuros não têm PM — a apuração usa este campo diretamente como ganho/prejuízo.
  ajusteDiarioEmCentavos?: number;

  // Rastreabilidade do parser
  parserTipo: ParserTipo;
  parserVersao: string;
  parserConfianca: number;             // 0-1

  // Controle
  status: StatusNota;
  erroMsg?: string;
  importadoEm: Timestamp;
  confirmadoPor?: string;              // uid do assessor (se passou por revisão manual)
  pdfStoragePath: string;
}

// ─── 2. posicoes_ir ──────────────────────────────────────────────────────────
// Path: users/{uid}/clientes/{clienteId}/posicoes_ir/{ticker}
// Mutable — atualizado a cada nota processada. Representa o estado atual do PM.

export interface PosicaoIRDoc {
  ticker: string;                      // document ID
  clienteId: string;
  uid: string;

  classeAtivo: AssetClass;             // definido na primeira operação, imutável depois
  cestaIR: CestaIR;                    // derivado de classeAtivo — salvo para performance

  quantidade: number;                  // quantidade atual em custódia
  pmEmCentavos: number;                // preço médio ponderado por ação (centavos)
  custoTotalEmCentavos: number;        // quantidade * pmEmCentavos

  ultimaAtualizacao: Timestamp;
  ultimaNotaId: string;
  possuiDayTradeAberto: boolean;
}

// ─── 3. apuracoes_ir ─────────────────────────────────────────────────────────
// Path: users/{uid}/clientes/{clienteId}/apuracoes_ir/{anoMes}
// Calculado ao processar notas do mês. Segregado em cestas A e B.

export type StatusDarf = 'nao_gerado' | 'gerado' | 'pago' | 'nao_devido';

export interface ResultadoCestaDoc {
  // Resultados brutos do mês
  ganhoLiquidoEmCentavos: number;      // pode ser negativo (prejuízo)
  vendasBrutasEmCentavos: number;      // total de vendas (para referência)

  // Para Cesta A apenas: vendas de AÇÕES e UNITS (isenção R$20k)
  vendasAcoesSTemCentavos?: number;

  // Compensação de prejuízo
  saldoPrejuizoAnteriorEmCentavos: number;
  prejuizoCompensadoEmCentavos: number;
  novoSaldoPrejuizoEmCentavos: number;

  // Isenção (apenas Cesta A, apenas ST)
  isento: boolean;
  ganhoIsentoEmCentavos: number;

  // Cálculo do IR
  baseCalculoEmCentavos: number;       // max(0, ganho - prejuizoCompensado) se não isento
  aliquota: number;                    // 0.15 ou 0.20
  irBrutoEmCentavos: number;

  // IRRF (antecipação — dedutível do DARF)
  irrfEmCentavos: number;
  irrfAcumuladoMesesAnterioresEmCentavos: number; // excesso não compensado em meses anteriores
  irrfTotalEmCentavos: number;         // irrfEmCentavos + irrfAcumuladoMesesAnterioresEmCentavos

  // DARF a pagar
  darfEmCentavos: number;              // max(0, irBruto - irrfTotal); 0 se < R$10
  darfAcumuladoMesAnteriorEmCentavos: number; // DARF < R$10 acumulado do mês anterior
  darfTotalEmCentavos: number;         // darfEmCentavos + darfAcumuladoMesAnterior
}

export interface ApuracaoMensalDoc {
  anoMes: string;                      // document ID: "YYYY-MM"
  clienteId: string;
  uid: string;

  // Segregação obrigatória: cesta A e cesta B calculadas separadamente
  // A: Ações, ETF_RV, BDR, Opções, Futuros — 15% ST / 20% DT
  cestaA_ST: ResultadoCestaDoc;
  cestaA_DT: ResultadoCestaDoc;

  // B: FII e Fiagro — 20% ST e DT, completamente isolada da A
  cestaB_ST: ResultadoCestaDoc;
  cestaB_DT: ResultadoCestaDoc;

  // Status do DARF consolidado
  statusDarf: StatusDarf;
  darfTotalEmCentavos: number;         // soma dos 4 DARFs (mesmo código 6015)
  vencimentoDarf?: string;             // "YYYY-MM-DD" — último dia útil do mês seguinte

  // Pagamento do DARF
  dataPagamentoDarf?: string;          // "YYYY-MM-DD" preenchido ao marcar como pago

  // Rastreabilidade
  notasProcessadas: string[];          // IDs das notas incluídas
  dirty: boolean;                      // true = precisa recalcular (nota retroativa importada)
  calculadoEm: Timestamp;
}

// ─── 4. saldo_prejuizo ───────────────────────────────────────────────────────
// Path: users/{uid}/clientes/{clienteId}/saldo_prejuizo/{tipo}
// Carry-forward de prejuízos. Tipos segregados por cesta e modalidade.

export type TipoPrejuizo = 'A_ST' | 'A_DT' | 'B_ST' | 'B_DT';
// C_ST e C_DT (cripto) fora do MVP

export interface SaldoPrejuizoDoc {
  tipo: TipoPrejuizo;                  // document ID
  clienteId: string;
  uid: string;

  saldoEmCentavos: number;             // sempre >= 0
  ultimaAtualizacao: Timestamp;

  // Últimos 36 meses para rastreabilidade e DIRPF
  historico: {
    anoMes: string;                    // "YYYY-MM"
    variacaoEmCentavos: number;        // negativo = prejuízo adicionado; positivo = compensado
    saldoAposEmCentavos: number;
  }[];
}

// ─── 5. eventos_corporativos ─────────────────────────────────────────────────
// Path: users/{uid}/eventos_corporativos/{ticker}_{dataEvento}
// Cache local de splits, grupamentos e bonificações para ajuste de PM.

export type TipoEventoCorporativo = 'SPLIT' | 'GRUPAMENTO' | 'BONIFICACAO' | 'TROCA_TICKER';

export interface EventoCorporativoDoc {
  ticker: string;
  tipo: TipoEventoCorporativo;
  dataEvento: string;                  // "YYYY-MM-DD"

  // Split/Grupamento: fator de quantidade (split 1:4 → 4.0; grupamento 4:1 → 0.25)
  fatorQuantidade?: number;

  // Bonificação: custo unitário divulgado no fato relevante (centavos)
  // Obrigatório para bonificação — impacta PM. Ver Doc 03 seção 5.4.
  custoUnitarioBonificacaoEmCentavos?: number;
  qtdBonificada?: number;

  // Troca de ticker (fusão, incorporação)
  tickerNovo?: string;
  proporcaoConversao?: number;         // ex: 0.5 = cada ação vira 0.5 da nova

  fonte: 'brapi' | 'manual' | 'b3';
  confirmadoPeloAssessor: boolean;     // bonificação exige confirmação manual
  importadoEm: Timestamp;
}

// ─── Helpers de path ─────────────────────────────────────────────────────────

export const IR_PATHS = {
  notasCorretagem: (uid: string, clienteId: string) =>
    `users/${uid}/clientes/${clienteId}/notas_corretagem`,

  posicaoIR: (uid: string, clienteId: string) =>
    `users/${uid}/clientes/${clienteId}/posicoes_ir`,

  apuracaoMensal: (uid: string, clienteId: string) =>
    `users/${uid}/clientes/${clienteId}/apuracoes_ir`,

  saldoPrejuizo: (uid: string, clienteId: string) =>
    `users/${uid}/clientes/${clienteId}/saldo_prejuizo`,

  eventosCorporativos: (uid: string) =>
    `users/${uid}/eventos_corporativos`,
} as const;
