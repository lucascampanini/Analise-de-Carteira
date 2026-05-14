'use client';
// Hooks React para o módulo IR.
// Usam onSnapshot para atualização em tempo real das collections IR.

import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { IR_PATHS } from './types/firestore-schema';
import type { PosicaoIRDoc, ApuracaoMensalDoc, SaldoPrejuizoDoc, TipoPrejuizo } from './types/firestore-schema';

// ─── Posições abertas ─────────────────────────────────────────────────────────

export interface UsePosicoesIRResult {
  posicoes: PosicaoIRDoc[];
  loading: boolean;
  error: string | null;
}

export function usePosicoesIR(uid: string | undefined, clienteId: string): UsePosicoesIRResult {
  const [posicoes, setPosicoes] = useState<PosicaoIRDoc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !clienteId) { setLoading(false); return; }

    const unsub = onSnapshot(
      collection(db, IR_PATHS.posicaoIR(uid, clienteId)),
      (snap) => {
        setPosicoes(snap.docs.map((d) => ({ ...d.data(), ticker: d.id } as PosicaoIRDoc)));
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); },
    );
    return unsub;
  }, [uid, clienteId]);

  return { posicoes, loading, error };
}

// ─── Apuração de um mês ───────────────────────────────────────────────────────

export interface UseResultadoMensalResult {
  apuracao: ApuracaoMensalDoc | null;
  loading: boolean;
  error: string | null;
}

export function useResultadoMensal(
  uid: string | undefined,
  clienteId: string,
  anoMes: string,
): UseResultadoMensalResult {
  const [apuracao, setApuracao] = useState<ApuracaoMensalDoc | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !clienteId || !anoMes) { setLoading(false); return; }

    const unsub = onSnapshot(
      doc(db, IR_PATHS.apuracaoMensal(uid, clienteId), anoMes),
      (snap) => {
        setApuracao(snap.exists() ? (snap.data() as ApuracaoMensalDoc) : null);
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); },
    );
    return unsub;
  }, [uid, clienteId, anoMes]);

  return { apuracao, loading, error };
}

// ─── Todas as apurações (para histórico) ─────────────────────────────────────

export interface UseApuracoesResult {
  apuracoes: ApuracaoMensalDoc[];
  loading: boolean;
  error: string | null;
}

export function useApuracoes(uid: string | undefined, clienteId: string): UseApuracoesResult {
  const [apuracoes, setApuracoes] = useState<ApuracaoMensalDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !clienteId) { setLoading(false); return; }

    const unsub = onSnapshot(
      query(
        collection(db, IR_PATHS.apuracaoMensal(uid, clienteId)),
        orderBy('anoMes', 'desc'),
      ),
      (snap) => {
        setApuracoes(snap.docs.map((d) => d.data() as ApuracaoMensalDoc));
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); },
    );
    return unsub;
  }, [uid, clienteId]);

  return { apuracoes, loading, error };
}

// ─── Saldo de prejuízo consolidado ───────────────────────────────────────────

export interface SaldosPrejuizo {
  A_ST: number;
  A_DT: number;
  B_ST: number;
  B_DT: number;
  total: number;
}

export interface UseSaldoPrejuizoResult {
  saldos: SaldosPrejuizo;
  loading: boolean;
}

export function useSaldoPrejuizo(uid: string | undefined, clienteId: string): UseSaldoPrejuizoResult {
  const [saldos, setSaldos] = useState<SaldosPrejuizo>({ A_ST: 0, A_DT: 0, B_ST: 0, B_DT: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    if (!uid || !clienteId) { setLoading(false); return; }

    const tipos: TipoPrejuizo[] = ['A_ST', 'A_DT', 'B_ST', 'B_DT'];
    const valores: Record<string, number> = { A_ST: 0, A_DT: 0, B_ST: 0, B_DT: 0 };
    let loadedCount = 0;

    const unsubs = tipos.map((tipo) =>
      onSnapshot(
        doc(db, IR_PATHS.saldoPrejuizo(uid, clienteId), tipo),
        (snap) => {
          valores[tipo] = snap.exists() ? (snap.data() as SaldoPrejuizoDoc).saldoEmCentavos : 0;
          loadedCount++;
          setSaldos({
            A_ST: valores.A_ST, A_DT: valores.A_DT,
            B_ST: valores.B_ST, B_DT: valores.B_DT,
            total: valores.A_ST + valores.A_DT + valores.B_ST + valores.B_DT,
          });
          if (loadedCount === tipos.length) setLoading(false);
          setLoaded(loadedCount);
        },
      ),
    );
    void loaded;
    return () => unsubs.forEach((u) => u());
  }, [uid, clienteId]);

  return { saldos, loading };
}
