'use client';
// Calculador de Preço Médio Ponderado (PM) — IN SRF 84/2001.
//
// Abordagem "recalcular do zero": lê TODAS as notas em ordem cronológica e
// reconstrói posicoes_ir do início. Simples, livre de estado incremental corrompido.
// Adequado para até ~500 operações por cliente (batch único no Firestore).
//
// Regras:
// - COMPRA:  PM = (custo_anterior + preco × qtd + custo_rateado) / qtd_total
// - VENDA:   baixa custo pelo PM atual; PM não muda; quantidade diminui
// - DT:      compra e venda no mesmo dia → processa compras antes das vendas
//            (garante que o PM do dia entra antes de ser usado na venda DT)

import {
  collection, doc, getDocs, query, orderBy, writeBatch,
  serverTimestamp, type FieldValue,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TipoOperacao, REGRAS_POR_CLASSE } from './types/asset-types';
import type { AssetClass, CestaIR } from './types/asset-types';
import type { NotaCorretagemDoc, OperacaoFirestore, PosicaoIRDoc } from './types/firestore-schema';

type PosicaoWrite = Omit<PosicaoIRDoc, 'ultimaAtualizacao'> & { ultimaAtualizacao: FieldValue };

interface EstadoPosicao {
  ticker: string;
  classeAtivo: AssetClass;
  cestaIR: CestaIR;
  quantidade: number;
  custoTotalEmCentavos: number;  // PM = custoTotal / quantidade
  ultimaNotaId: string;
}

function processarCompra(estado: EstadoPosicao, op: OperacaoFirestore): void {
  // Acumula custo de aquisição: preço × qtd + custo rateado desta operação
  estado.custoTotalEmCentavos += op.precoEmCentavos * op.quantidade + op.custoRateadoEmCentavos;
  estado.quantidade += op.quantidade;
}

function processarVenda(estado: EstadoPosicao, op: OperacaoFirestore): void {
  if (estado.quantidade === 0) return;

  // Baixa o custo proporcional ao PM atual — PM não muda
  const pmAtual = estado.custoTotalEmCentavos / estado.quantidade;
  const custoBaixado = Math.round(pmAtual * op.quantidade);
  estado.custoTotalEmCentavos = Math.max(0, estado.custoTotalEmCentavos - custoBaixado);
  estado.quantidade -= op.quantidade;

  if (estado.quantidade < 0) {
    // Nota faltando ou venda a descoberto — zera sem bloquear
    console.warn(`[pm-calculator] quantidade negativa: ${estado.ticker} → ${estado.quantidade}`);
    estado.quantidade = 0;
    estado.custoTotalEmCentavos = 0;
  }
}

/**
 * Reconstrói posicoes_ir do zero para um cliente lendo todas as notas ativas.
 * Chamado após importar notas (UploadNotasModal) ou manualmente para corrigir PM.
 */
export async function recalcularPMCompleto(
  uid: string,
  clienteId: string,
): Promise<void> {
  // ── 1. Carrega notas em ordem cronológica ────────────────────────────────
  const notasSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'clientes', clienteId, 'notas_corretagem'),
      orderBy('dataPregao', 'asc'),
    ),
  );

  const notas = notasSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as NotaCorretagemDoc))
    .filter((n) => n.statusRetificacao === 'ATIVA'); // notas canceladas não entram no PM

  // ── 2. Reconstrói posições em memória ────────────────────────────────────
  const estados = new Map<string, EstadoPosicao>();

  for (const nota of notas) {
    // Dentro de cada nota: compras primeiro, depois vendas.
    // Isso garante que uma compra DT atualiza o PM antes da venda DT usá-lo.
    const compras = nota.operacoes.filter((o) => o.tipo === TipoOperacao.COMPRA);
    const vendas  = nota.operacoes.filter((o) => o.tipo === TipoOperacao.VENDA);

    for (const op of [...compras, ...vendas]) {
      if (!estados.has(op.ticker)) {
        estados.set(op.ticker, {
          ticker:               op.ticker,
          classeAtivo:          op.classeAtivo,
          cestaIR:              REGRAS_POR_CLASSE[op.classeAtivo].cesta,
          quantidade:           0,
          custoTotalEmCentavos: 0,
          ultimaNotaId:         nota.id,
        });
      }

      const estado = estados.get(op.ticker)!;
      estado.ultimaNotaId = nota.id;

      if (op.tipo === TipoOperacao.COMPRA) {
        processarCompra(estado, op);
      } else {
        processarVenda(estado, op);
      }
    }
  }

  // ── 3. Persiste no Firestore (batch atômico) ─────────────────────────────
  const colRef = collection(db, 'users', uid, 'clientes', clienteId, 'posicoes_ir');

  // Busca documentos existentes para deletar os que viraram zero ou desapareceram
  const existentesSnap = await getDocs(colRef);
  const tickersExistentes = new Set(existentesSnap.docs.map((d) => d.id));

  const batch = writeBatch(db);

  // Remove posições que zeraram ou não existem mais
  for (const ticker of tickersExistentes) {
    const estado = estados.get(ticker);
    if (!estado || estado.quantidade === 0) {
      batch.delete(doc(colRef, ticker));
    }
  }

  // Escreve posições com saldo positivo
  for (const [ticker, estado] of estados) {
    if (estado.quantidade <= 0) continue;

    const pmEmCentavos = Math.round(estado.custoTotalEmCentavos / estado.quantidade);

    const docData: PosicaoWrite = {
      ticker,
      clienteId,
      uid,
      classeAtivo:          estado.classeAtivo,
      cestaIR:              estado.cestaIR,
      quantidade:           estado.quantidade,
      pmEmCentavos,
      custoTotalEmCentavos: estado.custoTotalEmCentavos,
      ultimaAtualizacao:    serverTimestamp(),
      ultimaNotaId:         estado.ultimaNotaId,
      possuiDayTradeAberto: false, // DT sempre fecha no mesmo dia
    };

    batch.set(doc(colRef, ticker), docData);
  }

  await batch.commit();
}
