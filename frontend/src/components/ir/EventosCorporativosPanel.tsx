'use client';
import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IR_PATHS } from '@/lib/ir/types/firestore-schema';
import {
  salvarEvento, confirmarEvento, rejeitarEvento,
  sincronizarSplitsBrapi,
} from '@/lib/ir/eventos-corporativos';
import { recalcularPMCompleto } from '@/lib/ir/pm-calculator';
import { recalcularApuracoesCompleto } from '@/lib/ir/apuracao-mensal';
import type { EventoCorporativoDoc, TipoEventoCorporativo } from '@/lib/ir/types/firestore-schema';
import { CheckCircle, XCircle, Plus, RefreshCw, AlertTriangle } from 'lucide-react';

const TIPO_LABEL: Record<TipoEventoCorporativo, string> = {
  SPLIT:       'Split',
  GRUPAMENTO:  'Grupamento',
  BONIFICACAO: 'Bonificação',
  TROCA_TICKER:'Troca de Ticker',
};

const TIPO_CLS: Record<TipoEventoCorporativo, string> = {
  SPLIT:        'bg-blue-100 text-blue-700',
  GRUPAMENTO:   'bg-amber-100 text-amber-700',
  BONIFICACAO:  'bg-emerald-100 text-emerald-700',
  TROCA_TICKER: 'bg-purple-100 text-purple-700',
};

function formatData(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Formulário de novo evento manual ────────────────────────────────────────

interface NovoEventoForm {
  ticker: string;
  tipo: TipoEventoCorporativo;
  dataEvento: string;
  fatorQuantidade: string;
  qtdBonificada: string;
  custoUnitario: string; // reais, convertido para centavos ao salvar
  tickerNovo: string;
  proporcao: string;
}

const formVazio = (): NovoEventoForm => ({
  ticker: '', tipo: 'SPLIT', dataEvento: '',
  fatorQuantidade: '', qtdBonificada: '', custoUnitario: '',
  tickerNovo: '', proporcao: '',
});

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  uid: string;
  clienteId: string;
  tickers: string[];          // posições abertas (para sincronizar brapi)
}

export function EventosCorporativosPanel({ uid, clienteId, tickers }: Props) {
  const [eventos, setEventos] = useState<EventoCorporativoDoc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NovoEventoForm>(formVazio());
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Tempo real via onSnapshot
  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(db, IR_PATHS.eventosCorporativos(uid)),
        orderBy('dataEvento', 'desc'),
      ),
      (snap) => setEventos(snap.docs.map((d) => d.data() as EventoCorporativoDoc)),
    );
    return unsub;
  }, [uid]);

  // ── Confirmar / Rejeitar ──────────────────────────────────────────────────
  const handleConfirmar = useCallback(async (ticker: string, dataEvento: string) => {
    await confirmarEvento(uid, ticker, dataEvento);
    setMsg(null);
    // Recalcula PM após confirmação
    setRecalculando(true);
    try {
      await recalcularPMCompleto(uid, clienteId);
      await recalcularApuracoesCompleto(uid, clienteId);
      setMsg('PM e apurações recalculados com o evento aplicado.');
    } finally {
      setRecalculando(false);
    }
  }, [uid, clienteId]);

  const handleRejeitar = useCallback(async (ticker: string, dataEvento: string) => {
    await rejeitarEvento(uid, ticker, dataEvento);
  }, [uid]);

  // ── Sincronizar brapi ─────────────────────────────────────────────────────
  const handleSincronizar = useCallback(async () => {
    if (!tickers.length) return;
    setSincronizando(true);
    setMsg(null);
    try {
      const token = process.env.NEXT_PUBLIC_BRAPI_TOKEN;
      const resultados = await sincronizarSplitsBrapi(uid, tickers, token);
      const novos = resultados.filter((r) => r.status === 'novo').length;
      setMsg(novos > 0
        ? `${novos} evento(s) novo(s) encontrado(s). Confirme para aplicar ao PM.`
        : 'Nenhum evento novo encontrado no brapi.dev.',
      );
    } finally {
      setSincronizando(false);
    }
  }, [uid, tickers]);

  // ── Salvar evento manual ──────────────────────────────────────────────────
  const handleSalvar = useCallback(async () => {
    if (!form.ticker.trim() || !form.dataEvento) return;
    setSalvando(true);
    try {
      const base = {
        ticker: form.ticker.trim().toUpperCase(),
        tipo: form.tipo,
        dataEvento: form.dataEvento,
        fonte: 'manual' as const,
        confirmadoPeloAssessor: form.tipo !== 'BONIFICACAO', // bonificação requer revisão extra
      };

      if (form.tipo === 'SPLIT' || form.tipo === 'GRUPAMENTO') {
        const fator = parseFloat(form.fatorQuantidade);
        if (isNaN(fator) || fator <= 0) return;
        await salvarEvento(uid, { ...base, fatorQuantidade: fator });
      } else if (form.tipo === 'BONIFICACAO') {
        const qtd = parseInt(form.qtdBonificada, 10);
        const custo = Math.round(parseFloat(form.custoUnitario || '0') * 100);
        if (isNaN(qtd) || qtd <= 0) return;
        await salvarEvento(uid, { ...base, qtdBonificada: qtd, custoUnitarioBonificacaoEmCentavos: custo });
      } else if (form.tipo === 'TROCA_TICKER') {
        if (!form.tickerNovo.trim()) return;
        const proporcao = parseFloat(form.proporcao || '1');
        await salvarEvento(uid, { ...base, tickerNovo: form.tickerNovo.trim().toUpperCase(), proporcaoConversao: isNaN(proporcao) ? 1 : proporcao });
      }

      setForm(formVazio());
      setShowForm(false);
    } finally {
      setSalvando(false);
    }
  }, [uid, form]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const pendentes  = eventos.filter((e) => !e.confirmadoPeloAssessor);
  const confirmados = eventos.filter((e) => e.confirmadoPeloAssessor);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-slate-700 text-sm">Eventos Corporativos</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSincronizar}
            disabled={sincronizando || !tickers.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw size={12} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Buscando…' : 'Sincronizar brapi'}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-svn-carbon text-white rounded-lg hover:bg-[#2e2420]"
          >
            <Plus size={12} />
            Adicionar manual
          </button>
        </div>
      </div>

      {/* Mensagem de feedback */}
      {msg && (
        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          {msg}
        </div>
      )}
      {recalculando && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          Recalculando PM e apurações…
        </div>
      )}

      {/* Formulário de novo evento */}
      {showForm && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ticker</label>
              <input
                value={form.ticker}
                onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                placeholder="VALE3"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-svn-ruby"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoEventoCorporativo }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none"
              >
                <option value="SPLIT">Split</option>
                <option value="GRUPAMENTO">Grupamento</option>
                <option value="BONIFICACAO">Bonificação</option>
                <option value="TROCA_TICKER">Troca de Ticker</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Data do evento</label>
              <input
                type="date"
                value={form.dataEvento}
                onChange={(e) => setForm((f) => ({ ...f, dataEvento: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none"
              />
            </div>

            {(form.tipo === 'SPLIT' || form.tipo === 'GRUPAMENTO') && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Fator {form.tipo === 'SPLIT' ? '(ex: 2 = dobra)' : '(ex: 0.5 = metade)'}
                </label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={form.fatorQuantidade}
                  onChange={(e) => setForm((f) => ({ ...f, fatorQuantidade: e.target.value }))}
                  placeholder={form.tipo === 'SPLIT' ? '2' : '0.5'}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none"
                />
              </div>
            )}

            {form.tipo === 'BONIFICACAO' && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Qtd bonificada</label>
                  <input
                    type="number" min="1"
                    value={form.qtdBonificada}
                    onChange={(e) => setForm((f) => ({ ...f, qtdBonificada: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Custo unitário (R$, 0 se FII)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.custoUnitario}
                    onChange={(e) => setForm((f) => ({ ...f, custoUnitario: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none"
                  />
                </div>
              </>
            )}

            {form.tipo === 'TROCA_TICKER' && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Novo ticker</label>
                  <input
                    value={form.tickerNovo}
                    onChange={(e) => setForm((f) => ({ ...f, tickerNovo: e.target.value.toUpperCase() }))}
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Proporção (1 = 1:1)</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form.proporcao}
                    onChange={(e) => setForm((f) => ({ ...f, proporcao: e.target.value }))}
                    placeholder="1"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSalvar}
              disabled={salvando || !form.ticker || !form.dataEvento}
              className="px-4 py-1.5 bg-svn-carbon text-white text-xs rounded-lg disabled:opacity-40"
            >
              {salvando ? 'Salvando…' : 'Salvar evento'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Pendentes de confirmação */}
      {pendentes.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 mb-2">
            <AlertTriangle size={12} />
            {pendentes.length} evento(s) pendente(s) de confirmação
          </p>
          <div className="space-y-1.5">
            {pendentes.map((e) => (
              <EventoLinha
                key={`${e.ticker}_${e.dataEvento}`}
                evento={e}
                onConfirmar={() => handleConfirmar(e.ticker, e.dataEvento)}
                onRejeitar={() => handleRejeitar(e.ticker, e.dataEvento)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmados */}
      {confirmados.length > 0 ? (
        <div className="px-5 py-3">
          <p className="text-xs text-slate-400 mb-2">Aplicados ao PM ({confirmados.length})</p>
          <div className="space-y-1">
            {confirmados.slice(0, 10).map((e) => (
              <EventoLinha
                key={`${e.ticker}_${e.dataEvento}`}
                evento={e}
                confirmado
                onConfirmar={() => {}}
                onRejeitar={() => handleRejeitar(e.ticker, e.dataEvento)}
              />
            ))}
            {confirmados.length > 10 && (
              <p className="text-xs text-slate-400">+ {confirmados.length - 10} mais…</p>
            )}
          </div>
        </div>
      ) : pendentes.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-sm">
          Nenhum evento cadastrado. Use "Sincronizar brapi" para buscar splits recentes.
        </div>
      )}
    </div>
  );
}

// ─── Linha de evento ──────────────────────────────────────────────────────────

function EventoLinha({ evento, confirmado, onConfirmar, onRejeitar }: {
  evento: EventoCorporativoDoc;
  confirmado?: boolean;
  onConfirmar: () => void;
  onRejeitar: () => void;
}) {
  function descricao(e: EventoCorporativoDoc): string {
    if (e.tipo === 'SPLIT' || e.tipo === 'GRUPAMENTO') {
      return `fator ${e.fatorQuantidade?.toFixed(4) ?? '?'}`;
    }
    if (e.tipo === 'BONIFICACAO') {
      return `${e.qtdBonificada} ações · custo R$ ${((e.custoUnitarioBonificacaoEmCentavos ?? 0) / 100).toFixed(4)}/ação`;
    }
    if (e.tipo === 'TROCA_TICKER') {
      return `→ ${e.tickerNovo} (proporção ${e.proporcaoConversao ?? 1})`;
    }
    return '';
  }

  return (
    <div className="flex items-center gap-2 text-xs py-1 flex-wrap">
      <span className="font-mono font-medium text-slate-700 w-16">{evento.ticker}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TIPO_CLS[evento.tipo]}`}>
        {TIPO_LABEL[evento.tipo]}
      </span>
      <span className="text-slate-500">{formatData(evento.dataEvento)}</span>
      <span className="text-slate-400">{descricao(evento)}</span>
      <span className="text-slate-300 text-[10px]">{evento.fonte}</span>
      <div className="ml-auto flex gap-1">
        {!confirmado && (
          <button onClick={onConfirmar} className="text-emerald-600 hover:text-emerald-700" title="Confirmar">
            <CheckCircle size={14} />
          </button>
        )}
        <button onClick={onRejeitar} className="text-slate-400 hover:text-svn-ruby" title="Remover">
          <XCircle size={14} />
        </button>
      </div>
    </div>
  );
}
