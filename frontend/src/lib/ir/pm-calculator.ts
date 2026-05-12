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
import { TipoOperacao, REGRAS_POR_CLASSE, SegmentoNota } from './types/asset-types';
import { getEventosConfirmados, aplicarEvento } from './eventos-corporativos';
import type { AssetClass, CestaIR } from './types/asset-types';
import type { NotaCorretagemDoc, OperacaoFirestore, PosicaoIRDoc, EventoCorporativoDoc } from './types/firestore-schema';

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
 * Aplica um evento corporativo ao mapa de estados em memória.
 * TROCA_TICKER: move o estado do ticker antigo para o novo.
 * Demais: delega para aplicarEvento().
 */
function aplicarEventoAosMaps(
  estados: Map<string, EstadoPosicao>,
  evento: EventoCorporativoDoc,
): void {
  if (evento.tipo === 'TROCA_TICKER' && evento.tickerNovo) {
    const estadoAntigo = estados.get(evento.ticker);
    if (!estadoAntigo) return;
    const proporcao = evento.proporcaoConversao ?? 1;
    // Move para o novo ticker, ajustando quantidade pela proporção
    const novoEstado: EstadoPosicao = {
      ...estadoAntigo,
      ticker:    evento.tickerNovo,
      quantidade: Math.round(estadoAntigo.quantidade * proporcao),
      // custo total proporcional (fusão parcial = perde a parte convertida)
      custoTotalEmCentavos: Math.round(estadoAntigo.custoTotalEmCentavos * proporcao),
    };
    estados.delete(evento.ticker);
    estados.set(evento.tickerNovo, novoEstado);
    return;
  }

  const estado = estados.get(evento.ticker);
  if (!estado) return; // ticker sem posição → evento não afeta nada

  aplicarEvento(estado, evento);

  // Se split/grupamento zerou a quantidade (erro de dados), remove
  if (estado.quantidade <= 0) {
    estados.delete(evento.ticker);
  }
}

/**
 * Reconstrói posicoes_ir do zero para um cliente lendo todas as notas ativas.
 * Aplica eventos corporativos confirmados na ordem cronológica correta.
 * Chamado após importar notas (UploadNotasModal) ou confirmar um evento.
 */
export async function recalcularPMCompleto(
  uid: string,
  clienteId: string,
): Promise<void> {
  // ── 1. Carrega notas e eventos em ordem cronológica ──────────────────────
  const [notasSnap, eventosConfirmados] = await Promise.all([
    getDocs(query(
      collection(db, 'users', uid, 'clientes', clienteId, 'notas_corretagem'),
      orderBy('dataPregao', 'asc'),
    )),
    getEventosConfirmados(uid),
  ]);

  const notas = notasSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as NotaCorretagemDoc))
    .filter((n) => n.statusRetificacao === 'ATIVA')
    .filter((n) => n.segmento !== SegmentoNota.BMF); // futuros liquidam diariamente — sem PM

  // Eventos ordenados ASC por data para merge com notas
  const eventos = [...eventosConfirmados].sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
  let eventoIdx = 0;

  // ── 2. Reconstrói posições em memória ────────────────────────────────────
  const estados = new Map<string, EstadoPosicao>();

  for (const nota of notas) {
    // Antes de processar cada nota, aplica eventos que ocorreram ATÉ a data do pregão.
    // Eventos são fatos históricos que ajustam as posições ANTES das operações do dia.
    while (eventoIdx < eventos.length && eventos[eventoIdx].dataEvento <= nota.dataPregao) {
      const evento = eventos[eventoIdx++];
      aplicarEventoAosMaps(estados, evento);
    }

    // Dentro de cada nota: compras primeiro, depois vendas (DT correctness)
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

  // Aplica eventos que ficaram após a última nota (caso o assessor adicionou evento futuro)
  while (eventoIdx < eventos.length) {
    aplicarEventoAosMaps(estados, eventos[eventoIdx++]);
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
