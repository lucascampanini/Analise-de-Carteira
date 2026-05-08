'use client';
// Eventos corporativos — splits, grupamentos, bonificações.
// Afetam o PM ponderado (IN SRF 84/2001 art. 16 e 17).
//
// Regras:
// - SPLIT:       quantidade × fator; custoTotal inalterado → PM cai proporcionalmente
// - GRUPAMENTO:  quantidade × fator (<1); custoTotal inalterado → PM sobe
// - BONIFICAÇÃO: quantidade + qtdBonificada; custo += qtdBonificada × custoUnitario
//                Se custo divulgado = 0 (FII sem declaração): PM inalterado
// - TROCA_TICKER: renomeia o ticker na posição (fusões/incorporações)
//
// Apenas eventos CONFIRMADOS (confirmadoPeloAssessor === true) entram no PM.
// Bonificações exigem confirmação manual (custo precisa ser verificado pelo assessor).

import {
  collection, doc, getDocs, setDoc, deleteDoc, updateDoc,
  query, orderBy, serverTimestamp, type FieldValue,
} from 'firebase/firestore';
import { db } from '../firebase';
import { IR_PATHS } from './types/firestore-schema';
import type { EventoCorporativoDoc, TipoEventoCorporativo } from './types/firestore-schema';

type EventoWrite = Omit<EventoCorporativoDoc, 'importadoEm'> & { importadoEm: FieldValue };

// ─── ID canônico do documento ─────────────────────────────────────────────────

export function eventoDocId(ticker: string, dataEvento: string): string {
  return `${ticker}_${dataEvento}`;
}

// ─── CRUD básico ──────────────────────────────────────────────────────────────

export async function salvarEvento(
  uid: string,
  evento: Omit<EventoCorporativoDoc, 'importadoEm'>,
): Promise<void> {
  const id = eventoDocId(evento.ticker, evento.dataEvento);
  const data: EventoWrite = { ...evento, importadoEm: serverTimestamp() };
  await setDoc(doc(db, IR_PATHS.eventosCorporativos(uid), id), data, { merge: true });
}

export async function confirmarEvento(uid: string, ticker: string, dataEvento: string): Promise<void> {
  const id = eventoDocId(ticker, dataEvento);
  await updateDoc(doc(db, IR_PATHS.eventosCorporativos(uid), id), {
    confirmadoPeloAssessor: true,
  });
}

export async function rejeitarEvento(uid: string, ticker: string, dataEvento: string): Promise<void> {
  const id = eventoDocId(ticker, dataEvento);
  await deleteDoc(doc(db, IR_PATHS.eventosCorporativos(uid), id));
}

export async function getEventosCorporativos(uid: string): Promise<EventoCorporativoDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, IR_PATHS.eventosCorporativos(uid)),
      orderBy('dataEvento', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({ ...d.data() } as EventoCorporativoDoc));
}

export async function getEventosConfirmados(uid: string): Promise<EventoCorporativoDoc[]> {
  const todos = await getEventosCorporativos(uid);
  return todos.filter((e) => e.confirmadoPeloAssessor);
}

// ─── Busca no brapi.dev ───────────────────────────────────────────────────────

interface BrapiQuoteResult {
  symbol?: string;
  lastSplitDate?: string;    // "YYYY-MM-DD" ou null
  lastSplitFactor?: string;  // ex: "2:1" (split) ou "1:2" (grupamento)
}

interface BrapiResponse {
  results?: BrapiQuoteResult[];
  error?: string;
}

/**
 * Parseia o lastSplitFactor do brapi ("A:B") em fatorQuantidade.
 * "2:1" = 1 ação vira 2 = split = fator 2.0
 * "1:2" = 2 ações viram 1 = grupamento = fator 0.5
 */
function parseSplitFactor(fatorStr: string): { fator: number; tipo: TipoEventoCorporativo } {
  const [a, b] = fatorStr.split(':').map(Number);
  if (!a || !b || isNaN(a) || isNaN(b)) return { fator: 1, tipo: 'SPLIT' };
  const fator = a / b;
  return { fator, tipo: fator >= 1 ? 'SPLIT' : 'GRUPAMENTO' };
}

/**
 * Busca o último split/grupamento conhecido para um ticker via brapi.dev.
 * Retorna null se não houver dados ou a API estiver indisponível.
 */
export async function buscarUltimoSplitBrapi(
  ticker: string,
  token?: string,
): Promise<{ dataEvento: string; fator: number; tipo: TipoEventoCorporativo } | null> {
  try {
    const params = new URLSearchParams({ fundamental: 'true' });
    if (token) params.set('token', token);

    const url = `https://brapi.dev/api/v3/quote/${encodeURIComponent(ticker)}?${params}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;

    const data: BrapiResponse = await resp.json();
    const result = data.results?.[0];
    if (!result?.lastSplitDate || !result?.lastSplitFactor) return null;

    // brapi retorna datas no formato "YYYY-MM-DD" ou "MM/DD/YYYY"
    const raw = result.lastSplitDate;
    const dataEvento = raw.includes('/') ? brapiDateToIso(raw) : raw.slice(0, 10);
    if (!dataEvento) return null;

    const { fator, tipo } = parseSplitFactor(result.lastSplitFactor);
    if (fator === 1) return null; // fator 1:1 = sem split real

    return { dataEvento, fator, tipo };
  } catch {
    return null;
  }
}

function brapiDateToIso(mmddyyyy: string): string {
  const [mm, dd, yyyy] = mmddyyyy.split('/');
  if (!mm || !dd || !yyyy) return '';
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Para cada ticker da lista, consulta o brapi e registra o último split como evento
 * pendente de confirmação (confirmadoPeloAssessor = false).
 * Pula tickers para os quais já existe um evento na mesma data.
 */
export async function sincronizarSplitsBrapi(
  uid: string,
  tickers: string[],
  token?: string,
): Promise<{ ticker: string; status: 'novo' | 'existente' | 'sem_dados' | 'erro' }[]> {
  const existentes = await getEventosCorporativos(uid);
  const existenteSet = new Set(existentes.map((e) => eventoDocId(e.ticker, e.dataEvento)));

  const resultados: { ticker: string; status: 'novo' | 'existente' | 'sem_dados' | 'erro' }[] = [];

  // Processa em paralelo, mas com concorrência limitada (4 por vez) para não saturar a API
  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 4) {
    chunks.push(tickers.slice(i, i + 4));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (ticker) => {
      try {
        const split = await buscarUltimoSplitBrapi(ticker, token);
        if (!split) {
          resultados.push({ ticker, status: 'sem_dados' });
          return;
        }

        const id = eventoDocId(ticker, split.dataEvento);
        if (existenteSet.has(id)) {
          resultados.push({ ticker, status: 'existente' });
          return;
        }

        await salvarEvento(uid, {
          ticker,
          tipo: split.tipo,
          dataEvento: split.dataEvento,
          fatorQuantidade: split.fator,
          fonte: 'brapi',
          confirmadoPeloAssessor: false,
        });
        resultados.push({ ticker, status: 'novo' });
      } catch {
        resultados.push({ ticker, status: 'erro' });
      }
    }));
  }

  return resultados;
}

// ─── Aplicação de evento a um estado de posição (usado pelo pm-calculator) ────

export interface EstadoParaAjuste {
  ticker: string;
  quantidade: number;
  custoTotalEmCentavos: number;
}

/**
 * Aplica um evento corporativo ao estado de uma posição em memória.
 * Modificação in-place — retorna o mesmo objeto.
 */
export function aplicarEvento(estado: EstadoParaAjuste, evento: EventoCorporativoDoc): void {
  if (!evento.confirmadoPeloAssessor) return;

  switch (evento.tipo) {
    case 'SPLIT':
    case 'GRUPAMENTO': {
      const fator = evento.fatorQuantidade ?? 1;
      if (fator === 0 || fator === 1) break;
      // Quantidade ajustada (split pode gerar frações → arredonda para inteiro)
      estado.quantidade = Math.round(estado.quantidade * fator);
      // Custo total inalterado → PM recalculado automaticamente
      break;
    }
    case 'BONIFICACAO': {
      const qtdBon = evento.qtdBonificada ?? 0;
      const custoUnit = evento.custoUnitarioBonificacaoEmCentavos ?? 0;
      estado.quantidade += qtdBon;
      estado.custoTotalEmCentavos += qtdBon * custoUnit; // 0 se custo não divulgado
      break;
    }
    case 'TROCA_TICKER': {
      // Troca de ticker não altera quantidade nem custo, só o identificador.
      // Tratado no pm-calculator que move o estado para o novo ticker.
      break;
    }
  }
}
