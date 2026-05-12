'use client';
// Funções Firestore para o módulo IR.
// Converte ParsedNotaResult (reais) → NotaCorretagemDoc (centavos) ao salvar.

import {
  collection, doc, getDoc, getDocs, setDoc,
  query, orderBy, serverTimestamp, type FieldValue,
} from 'firebase/firestore';
import { db } from '../firebase';
import { reaisParaCentavos } from './utils/money';
import type {
  NotaCorretagemDoc,
  OperacaoFirestore,
  ResumoFinanceiroFirestore,
} from './types/firestore-schema';
import type { ParsedNotaResult } from './types/parsed-nota';

// FieldValue (serverTimestamp) não é compatível com Timestamp no tipo de escrita
type NotaWrite = Omit<NotaCorretagemDoc, 'importadoEm'> & { importadoEm: FieldValue };

function toWriteDoc(
  parsed: ParsedNotaResult,
  corrections: Record<string, string>,
  uid: string,
  clienteId: string,
): NotaWrite {
  // Aplica correções manuais do assessor sobre o resultado do parser
  const nrNota       = corrections.nrNota       ?? parsed.nrNota;
  const dataPregao   = corrections.dataPregao   ?? parsed.dataPregao;
  const cnpjCorretora = corrections.cnpjCorretora ?? parsed.cnpjCorretora;
  const corretora    = corrections.corretora    ?? parsed.corretora;
  const anoMes       = dataPregao.slice(0, 7);  // "YYYY-MM"

  const { resumo, operacoes } = parsed;
  const totalCustos = reaisParaCentavos(resumo.totalCustosDedutiveis);
  const totalValor  = operacoes.reduce((s, o) => s + o.valorBruto, 0);

  const ops: OperacaoFirestore[] = operacoes.map((op) => ({
    tipo: op.tipo,
    ticker: op.ticker,
    ...(op.tickerAtivo ? { tickerAtivo: op.tickerAtivo } : {}),
    classeAtivo: op.classeAtivo,
    quantidade: op.quantidade,
    precoEmCentavos: reaisParaCentavos(op.precoUnitario),
    valorBrutoEmCentavos: reaisParaCentavos(op.valorBruto),
    // Rateia os custos proporcionalmente ao valor de cada operação
    custoRateadoEmCentavos: totalValor > 0
      ? Math.round(totalCustos * (op.valorBruto / totalValor))
      : 0,
    isDayTrade: op.isDayTrade,
    ...(op.tipoMercado ? { tipoMercado: op.tipoMercado } : {}),
  }));

  const resumoFirestore: ResumoFinanceiroFirestore = {
    taxaOperacionalEmCentavos:       reaisParaCentavos(resumo.taxaOperacional),
    emolumentosEmCentavos:           reaisParaCentavos(resumo.emolumentos),
    taxaLiquidacaoEmCentavos:        reaisParaCentavos(resumo.taxaLiquidacao),
    taxaRegistroEmCentavos:          reaisParaCentavos(resumo.taxaRegistro),
    issEmCentavos:                   reaisParaCentavos(resumo.iss),
    irrfNormalEmCentavos:            reaisParaCentavos(resumo.irrfNormal),
    irrfDayTradeEmCentavos:          reaisParaCentavos(resumo.irrfDayTrade),
    liquidoParaClienteEmCentavos:    reaisParaCentavos(resumo.liquidoParaCliente),
    totalCustosDedutivelEmCentavos:  totalCustos,
  };

  const faltando = parsed.camposFaltando.filter(
    (f) => !corrections[f],  // campo corrigido → não conta como faltando
  );

  return {
    id: nrNota,
    clienteId,
    uid,
    nrNota,
    dataPregao,
    anoMes,
    corretora,
    cnpjCorretora,
    segmento: parsed.segmento,
    ...(parsed.cpfCliente ? { cpfCliente: parsed.cpfCliente } : {}),
    operacoes: ops,
    // BMF/Futuros: converte ajuste diário de reais para centavos
    ...(parsed.ajusteDiarioEmReais !== undefined
      ? { ajusteDiarioEmCentavos: reaisParaCentavos(parsed.ajusteDiarioEmReais) }
      : {}),
    resumoFinanceiro: resumoFirestore,
    statusRetificacao: 'ATIVA',
    parserTipo: parsed.parser.tipo,
    parserVersao: parsed.parser.versao,
    parserConfianca: parsed.parser.confianca,
    status: faltando.length === 0 ? 'processado' : 'revisao_pendente',
    pdfStoragePath: '',
    importadoEm: serverTimestamp(),
  };
}

export async function salvarNota(
  uid: string,
  clienteId: string,
  parsed: ParsedNotaResult,
  corrections: Record<string, string> = {},
): Promise<void> {
  const data = toWriteDoc(parsed, corrections, uid, clienteId);
  const ref = doc(db, 'users', uid, 'clientes', clienteId, 'notas_corretagem', data.nrNota);
  await setDoc(ref, data);
}

export async function getNotasCorretagem(
  uid: string,
  clienteId: string,
): Promise<NotaCorretagemDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'clientes', clienteId, 'notas_corretagem'),
      orderBy('dataPregao', 'asc'),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotaCorretagemDoc));
}

export async function notaJaExiste(
  uid: string,
  clienteId: string,
  nrNota: string,
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, 'users', uid, 'clientes', clienteId, 'notas_corretagem', nrNota),
  );
  return snap.exists();
}
