'use client';
// Apuração mensal de IR — IN SRF 84/2001, Lei 11.033/2004, Lei 15.270/2025.
//
// Fluxo por mês:
// 1. Coleta notas ATIVAS do mês
// 2. Calcula resultado bruto por cesta/modalidade (ST e DT separados)
// 3. Aplica isenção R$20k (apenas Cesta A_ST, apenas ACAO+UNIT)
// 4. Carry-forward: lê saldo_prejuizo do mês anterior e compensa
// 5. Calcula IR bruto e desconta IRRF (que pode acumular entre meses)
// 6. Acumula DARF < R$10 para o mês seguinte
// 7. Salva ApuracaoMensalDoc em apuracoes_ir/{anoMes}

import {
  collection, doc, getDocs, getDoc, setDoc,
  query, orderBy, where, writeBatch,
  serverTimestamp, type FieldValue,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AssetClass, CestaIR, TipoOperacao, REGRAS_POR_CLASSE, LIMITE_ISENCAO_ACOES_CENTAVOS, DARF_MINIMO_CENTAVOS } from './types/asset-types';
import { IR_PATHS } from './types/firestore-schema';
import type {
  NotaCorretagemDoc,
  OperacaoFirestore,
  ApuracaoMensalDoc,
  ResultadoCestaDoc,
  SaldoPrejuizoDoc,
  TipoPrejuizo,
  StatusDarf,
} from './types/firestore-schema';

// ─── Helpers internos ────────────────────────────────────────────────────────

type ApuracaoWrite = Omit<ApuracaoMensalDoc, 'calculadoEm'> & { calculadoEm: FieldValue };

interface AcumuladorCesta {
  vendasBrutasEmCentavos: number;
  vendasAcoesSTemCentavos: number; // apenas para A_ST
  ganhoLiquidoEmCentavos: number;  // positivo = ganho, negativo = prejuízo
  irrfEmCentavos: number;
}

function cestaNula(): AcumuladorCesta {
  return {
    vendasBrutasEmCentavos: 0,
    vendasAcoesSTemCentavos: 0,
    ganhoLiquidoEmCentavos: 0,
    irrfEmCentavos: 0,
  };
}

// Classifica a operação em qual dos 4 acumuladores ela pertence
function tipoCesta(op: OperacaoFirestore): { cesta: CestaIR; isDT: boolean } | null {
  const regras = REGRAS_POR_CLASSE[op.classeAtivo];
  if (regras.cesta === CestaIR.C) return null; // cripto fora do MVP
  return { cesta: regras.cesta, isDT: op.isDayTrade };
}

// Retorna meses anteriores ao anoMes alvo que existem na coleção apuracoes_ir
async function getMesAnterior(uid: string, clienteId: string, anoMes: string): Promise<string | null> {
  const [ano, mes] = anoMes.split('-').map(Number);
  const mesAnt = mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, '0')}`;
  const snap = await getDoc(doc(db, IR_PATHS.apuracaoMensal(uid, clienteId), mesAnt));
  return snap.exists() ? mesAnt : null;
}

// Carrega saldo_prejuizo de um tipo específico
async function getSaldoPrejuizo(uid: string, clienteId: string, tipo: TipoPrejuizo): Promise<number> {
  const snap = await getDoc(doc(db, IR_PATHS.saldoPrejuizo(uid, clienteId), tipo));
  if (!snap.exists()) return 0;
  return (snap.data() as SaldoPrejuizoDoc).saldoEmCentavos;
}

// Constrói ResultadoCestaDoc a partir do acumulador e dados de carry-forward
function buildResultadoCesta(
  acum: AcumuladorCesta,
  tipo: TipoPrejuizo,
  aliquota: number,
  saldoPrejuizoAnterior: number,
  darfAcumuladoMesAnterior: number,
  irrfAcumuladoMesesAnteriores: number,
  isAcoesST: boolean, // true = Cesta A_ST → pode ter isenção R$20k
): ResultadoCestaDoc {
  const ganho = acum.ganhoLiquidoEmCentavos;

  // ── Isenção R$20k ────────────────────────────────────────────────────────
  // Apenas Cesta A_ST e apenas se vendas de ACAO+UNIT ≤ R$20.000
  // ATENÇÃO: mês isento AINDA consome/acumula carry-forward de prejuízo
  const isento = isAcoesST && acum.vendasAcoesSTemCentavos <= LIMITE_ISENCAO_ACOES_CENTAVOS;
  const ganhoIsentoEmCentavos = isento && ganho > 0 ? ganho : 0;

  // ── Carry-forward de prejuízo ────────────────────────────────────────────
  // Compensa até o limite do ganho (ou zero se prejuízo)
  const ganhoParaCompensar = ganho > 0 ? ganho : 0;
  const prejuizoCompensado = Math.min(saldoPrejuizoAnterior, ganhoParaCompensar);
  const novoSaldoPrejuizo = ganho < 0
    ? saldoPrejuizoAnterior + Math.abs(ganho)           // acumula prejuízo novo
    : Math.max(0, saldoPrejuizoAnterior - ganhoParaCompensar); // consome do saldo

  // ── Base de cálculo ──────────────────────────────────────────────────────
  const ganhoAposCompensar = Math.max(0, ganho - prejuizoCompensado);
  // Se isento, base = 0 (mas carry-forward já foi calculado acima)
  const baseCalculo = isento ? 0 : ganhoAposCompensar;

  // ── IR bruto ─────────────────────────────────────────────────────────────
  const irBruto = Math.round(baseCalculo * aliquota);

  // ── IRRF ─────────────────────────────────────────────────────────────────
  // IRRF do mês corrente + excesso não compensado de meses anteriores
  // IRRF não transita entre anos — registrado mas não acumulado (DIRPF)
  const irrfTotal = acum.irrfEmCentavos + irrfAcumuladoMesesAnteriores;

  // ── DARF ─────────────────────────────────────────────────────────────────
  // darfEmCentavos = contribuição bruta deste mês (armazenamos o valor real, não 0)
  // darfTotalEmCentavos = darfEmCentavos + darfAcumuladoMesAnterior
  // Se darfTotal < R$10 → cliente não paga este mês (carrega para o próximo)
  // O chamador determina o carry-forward lendo darfTotalEmCentavos < DARF_MINIMO
  const darfEmCentavos = Math.max(0, irBruto - irrfTotal);
  const darfTotalEmCentavos = darfEmCentavos + darfAcumuladoMesAnterior;

  return {
    ganhoLiquidoEmCentavos: ganho,
    vendasBrutasEmCentavos: acum.vendasBrutasEmCentavos,
    ...(isAcoesST ? { vendasAcoesSTemCentavos: acum.vendasAcoesSTemCentavos } : {}),
    saldoPrejuizoAnteriorEmCentavos: saldoPrejuizoAnterior,
    prejuizoCompensadoEmCentavos: prejuizoCompensado,
    novoSaldoPrejuizoEmCentavos: novoSaldoPrejuizo,
    isento,
    ganhoIsentoEmCentavos,
    baseCalculoEmCentavos: baseCalculo,
    aliquota,
    irBrutoEmCentavos: irBruto,
    irrfEmCentavos: acum.irrfEmCentavos,
    irrfAcumuladoMesesAnterioresEmCentavos: irrfAcumuladoMesesAnteriores,
    irrfTotalEmCentavos: irrfTotal,
    darfEmCentavos,
    darfAcumuladoMesAnteriorEmCentavos: darfAcumuladoMesAnterior,
    darfTotalEmCentavos,
  };
}

// Determina o resultado líquido de uma operação de venda (para calcular ganho)
// O custo de aquisição para DT = preço médio das compras DT do mesmo pregão (nota)
// Para ST = PM do posicoes_ir, mas aqui usamos o campo valorBruto - custoRateado das operações
// NOTA: usamos a aproximação disponível nos campos da nota, que já contêm custoRateado
function calcularGanhoVenda(op: OperacaoFirestore, pmEmCentavos: number): number {
  // Para ST: ganho = (preço_venda - PM_acumulado) × qtd - custo_rateado
  // Para DT: ganho = (preço_venda - preço_médio_compras_DT) × qtd - custo_rateado
  // O PM para DT é passado como parâmetro (calculado no loop por nota/dia)
  const receitaBruta = op.precoEmCentavos * op.quantidade;
  const custoAquisicao = pmEmCentavos * op.quantidade;
  return receitaBruta - custoAquisicao - op.custoRateadoEmCentavos;
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Apura o IR de um mês específico para um cliente.
 * Lê todas as notas ATIVAS do mês, calcula resultado por cesta e salva em apuracoes_ir.
 * Requer que posicoes_ir já esteja atualizado (F3 deve ter rodado antes).
 */
export async function apurarMes(
  uid: string,
  clienteId: string,
  anoMes: string,
): Promise<ApuracaoMensalDoc> {
  // ── 1. Carrega notas do mês ───────────────────────────────────────────────
  const notasSnap = await getDocs(
    query(
      collection(db, IR_PATHS.notasCorretagem(uid, clienteId)),
      where('anoMes', '==', anoMes),
      orderBy('dataPregao', 'asc'),
    ),
  );

  const notas = notasSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as NotaCorretagemDoc))
    .filter((n) => n.statusRetificacao === 'ATIVA');

  // ── 2. Acumula resultados brutos por cesta/modalidade ────────────────────
  const aA_ST = cestaNula();
  const aA_DT = cestaNula();
  const aB_ST = cestaNula();
  const aB_DT = cestaNula();

  // Para calcular ganho de venda precisamos do PM de cada ticker.
  // Usamos posicoes_ir (calculado pelo pm-calculator) como referência.
  // Para DT, calculamos PM das compras DT da mesma nota (mesmo pregão).
  const posicaoCache = new Map<string, number>(); // ticker → pmEmCentavos

  const carregarPM = async (ticker: string): Promise<number> => {
    if (posicaoCache.has(ticker)) return posicaoCache.get(ticker)!;
    const snap = await getDoc(doc(db, IR_PATHS.posicaoIR(uid, clienteId), ticker));
    const pm = snap.exists() ? (snap.data().pmEmCentavos as number) : 0;
    posicaoCache.set(ticker, pm);
    return pm;
  };

  for (const nota of notas) {
    // DT: calcula PM das compras DT por ticker para este pregão
    const pmDTPorTicker = new Map<string, number>();
    const comprasDT = nota.operacoes.filter((o) => o.tipo === TipoOperacao.COMPRA && o.isDayTrade);
    for (const c of comprasDT) {
      const totalAntes = (pmDTPorTicker.get(c.ticker + '_custo') ?? 0) + c.precoEmCentavos * c.quantidade;
      const qtdAntes   = (pmDTPorTicker.get(c.ticker + '_qtd')   ?? 0) + c.quantidade;
      pmDTPorTicker.set(c.ticker + '_custo', totalAntes);
      pmDTPorTicker.set(c.ticker + '_qtd',   qtdAntes);
    }
    const pmDT = (ticker: string): number => {
      const custo = pmDTPorTicker.get(ticker + '_custo') ?? 0;
      const qtd   = pmDTPorTicker.get(ticker + '_qtd')   ?? 1;
      return qtd > 0 ? Math.round(custo / qtd) : 0;
    };

    // Acumula por operação
    for (const op of nota.operacoes) {
      const dest = tipoCesta(op);
      if (!dest) continue;

      const acum = dest.cesta === CestaIR.A
        ? (dest.isDT ? aA_DT : aA_ST)
        : (dest.isDT ? aB_DT : aB_ST);

      if (op.tipo === TipoOperacao.VENDA) {
        acum.vendasBrutasEmCentavos += op.valorBrutoEmCentavos;

        // vendas de ACAO+UNIT ST para o limite R$20k
        if (!op.isDayTrade && (op.classeAtivo === AssetClass.ACAO || op.classeAtivo === AssetClass.UNIT)) {
          aA_ST.vendasAcoesSTemCentavos += op.valorBrutoEmCentavos;
        }

        // ganho da venda
        const pm = op.isDayTrade ? pmDT(op.ticker) : await carregarPM(op.ticker);
        acum.ganhoLiquidoEmCentavos += calcularGanhoVenda(op, pm);
      } else {
        // compras: custo rateado entra negativo no resultado (custo de aquisição)
        // não afeta ganho diretamente — já está embutido no PM
        // mas compras DT têm custoRateado que reduz o resultado DT
        if (op.isDayTrade) {
          acum.ganhoLiquidoEmCentavos -= op.custoRateadoEmCentavos;
        }
      }
    }

    // IRRF da nota: divide entre ST e DT (e entre cestas proporcionalmente)
    // Simplificação MVP: IRRF normal → Cesta A_ST; IRRF DT → Cesta A_DT
    // FII também tem IRRF, mas normalmente mínimo — vai para B_ST
    aA_ST.irrfEmCentavos += nota.resumoFinanceiro.irrfNormalEmCentavos;
    aA_DT.irrfEmCentavos += nota.resumoFinanceiro.irrfDayTradeEmCentavos;
  }

  // ── 3. Carrega carry-forward do mês anterior ─────────────────────────────
  const mesAntExiste = await getMesAnterior(uid, clienteId, anoMes);

  const [spA_ST, spA_DT, spB_ST, spB_DT] = await Promise.all([
    getSaldoPrejuizo(uid, clienteId, 'A_ST'),
    getSaldoPrejuizo(uid, clienteId, 'A_DT'),
    getSaldoPrejuizo(uid, clienteId, 'B_ST'),
    getSaldoPrejuizo(uid, clienteId, 'B_DT'),
  ]);

  // DARF e IRRF acumulados do mês anterior (se existir apuração anterior)
  let darfAcumA_ST = 0, darfAcumA_DT = 0, darfAcumB_ST = 0, darfAcumB_DT = 0;
  let irrfAcumA_ST = 0, irrfAcumA_DT = 0;

  if (mesAntExiste) {
    const antSnap = await getDoc(doc(db, IR_PATHS.apuracaoMensal(uid, clienteId), mesAntExiste));
    if (antSnap.exists()) {
      const ant = antSnap.data() as ApuracaoMensalDoc;
      // Carry-forward: se o darfTotal do mês anterior era < R$10, não foi pago → leva adiante
      darfAcumA_ST = ant.cestaA_ST.darfTotalEmCentavos < DARF_MINIMO_CENTAVOS ? ant.cestaA_ST.darfTotalEmCentavos : 0;
      darfAcumA_DT = ant.cestaA_DT.darfTotalEmCentavos < DARF_MINIMO_CENTAVOS ? ant.cestaA_DT.darfTotalEmCentavos : 0;
      darfAcumB_ST = ant.cestaB_ST.darfTotalEmCentavos < DARF_MINIMO_CENTAVOS ? ant.cestaB_ST.darfTotalEmCentavos : 0;
      darfAcumB_DT = ant.cestaB_DT.darfTotalEmCentavos < DARF_MINIMO_CENTAVOS ? ant.cestaB_DT.darfTotalEmCentavos : 0;
      // IRRF não compensado (irBruto=0 mas havia IRRF) — não acumula entre anos
      const mesAntAno = mesAntExiste.split('-')[0];
      const anoAtual  = anoMes.split('-')[0];
      if (mesAntAno === anoAtual) {
        irrfAcumA_ST = Math.max(0, ant.cestaA_ST.irrfTotalEmCentavos - ant.cestaA_ST.irBrutoEmCentavos);
        irrfAcumA_DT = Math.max(0, ant.cestaA_DT.irrfTotalEmCentavos - ant.cestaA_DT.irBrutoEmCentavos);
      }
    }
  }

  // ── 4. Constrói ResultadoCestaDoc para cada uma das 4 cestas ─────────────
  const cestaA_ST = buildResultadoCesta(aA_ST, 'A_ST', 0.15, spA_ST, darfAcumA_ST, irrfAcumA_ST, true);
  const cestaA_DT = buildResultadoCesta(aA_DT, 'A_DT', 0.20, spA_DT, darfAcumA_DT, irrfAcumA_DT, false);
  const cestaB_ST = buildResultadoCesta(aB_ST, 'B_ST', 0.20, spB_ST, darfAcumB_ST, 0, false);
  const cestaB_DT = buildResultadoCesta(aB_DT, 'B_DT', 0.20, spB_DT, darfAcumB_DT, 0, false);

  // ── 5. Total DARF e status ────────────────────────────────────────────────
  const darfTotal = cestaA_ST.darfTotalEmCentavos + cestaA_DT.darfTotalEmCentavos
    + cestaB_ST.darfTotalEmCentavos + cestaB_DT.darfTotalEmCentavos;

  const statusDarf: StatusDarf = darfTotal === 0 ? 'nao_devido' : 'gerado';
  const vencimentoDarf = darfTotal > 0 ? calcularVencimentoDarf(anoMes) : undefined;

  // ── 6. Persiste apuracao + atualiza saldo_prejuizo (batch atômico) ────────
  const batch = writeBatch(db);

  const apuracaoRef = doc(db, IR_PATHS.apuracaoMensal(uid, clienteId), anoMes);
  const apuracaoData: ApuracaoWrite = {
    anoMes,
    clienteId,
    uid,
    cestaA_ST,
    cestaA_DT,
    cestaB_ST,
    cestaB_DT,
    statusDarf,
    darfTotalEmCentavos: darfTotal,
    ...(vencimentoDarf ? { vencimentoDarf } : {}),
    notasProcessadas: notas.map((n) => n.id),
    dirty: false,
    calculadoEm: serverTimestamp(),
  };
  batch.set(apuracaoRef, apuracaoData);

  // Atualiza saldo_prejuizo para cada cesta
  const agora = new Date().toISOString();
  const prejDocs: [TipoPrejuizo, ResultadoCestaDoc][] = [
    ['A_ST', cestaA_ST], ['A_DT', cestaA_DT],
    ['B_ST', cestaB_ST], ['B_DT', cestaB_DT],
  ];
  for (const [tipo, resultado] of prejDocs) {
    const spRef = doc(db, IR_PATHS.saldoPrejuizo(uid, clienteId), tipo);
    const spSnap = await getDoc(spRef);
    const historico = spSnap.exists()
      ? [...(spSnap.data() as SaldoPrejuizoDoc).historico].slice(-35) // mantém 36 meses
      : [];
    historico.push({
      anoMes,
      variacaoEmCentavos: resultado.novoSaldoPrejuizoEmCentavos - resultado.saldoPrejuizoAnteriorEmCentavos,
      saldoAposEmCentavos: resultado.novoSaldoPrejuizoEmCentavos,
    });
    batch.set(spRef, {
      tipo,
      clienteId,
      uid,
      saldoEmCentavos: resultado.novoSaldoPrejuizoEmCentavos,
      ultimaAtualizacao: serverTimestamp(),
      historico,
    });
  }

  await batch.commit();

  return { ...apuracaoData, calculadoEm: null as unknown as import('firebase/firestore').Timestamp };
}

// ─── Recalcular todos os meses ────────────────────────────────────────────────

/**
 * Recalcula apuração de todos os meses com notas importadas, em ordem cronológica.
 * Zera saldo_prejuizo antes de começar para garantir consistência total.
 * Use após importações retroativas ou para corrigir inconsistências.
 */
export async function recalcularApuracoesCompleto(
  uid: string,
  clienteId: string,
): Promise<void> {
  // Descobre todos os anoMes com notas
  const notasSnap = await getDocs(
    query(
      collection(db, IR_PATHS.notasCorretagem(uid, clienteId)),
      orderBy('anoMes', 'asc'),
    ),
  );

  const meses = [...new Set(
    notasSnap.docs
      .map((d) => d.data().anoMes as string)
      .filter(Boolean),
  )].sort();

  if (meses.length === 0) return;

  // Zera saldo_prejuizo antes de recalcular (para evitar contagem dupla)
  const resetBatch = writeBatch(db);
  const tipos: TipoPrejuizo[] = ['A_ST', 'A_DT', 'B_ST', 'B_DT'];
  for (const tipo of tipos) {
    resetBatch.set(doc(db, IR_PATHS.saldoPrejuizo(uid, clienteId), tipo), {
      tipo, clienteId, uid,
      saldoEmCentavos: 0,
      ultimaAtualizacao: serverTimestamp(),
      historico: [],
    });
  }
  await resetBatch.commit();

  // Processa meses em ordem ASC (carry-forward depende da ordem)
  for (const anoMes of meses) {
    await apurarMes(uid, clienteId, anoMes);
  }
}

// ─── Helper: data de vencimento do DARF ──────────────────────────────────────

// Último dia útil do mês seguinte ao anoMes da apuração.
// Simplificação: retorna o último dia do mês seguinte (sem calendário de feriados).
function calcularVencimentoDarf(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const ultimoDia = new Date(proximoAno, proximoMes, 0).getDate(); // dia 0 do mês seguinte
  return `${proximoAno}-${String(proximoMes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
}
