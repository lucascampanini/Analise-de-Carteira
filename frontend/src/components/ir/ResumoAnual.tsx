'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApuracoes } from '@/lib/ir/hooks';
import { DARF_MINIMO_CENTAVOS } from '@/lib/ir/types/asset-types';
import type { ApuracaoMensalDoc } from '@/lib/ir/types/firestore-schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Card de mês ─────────────────────────────────────────────────────────────

function MesCard({ mes, apuracao }: { mes: number; apuracao?: ApuracaoMensalDoc }) {
  const label = MESES_LABEL[mes];

  if (!apuracao) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-400 mb-2">{label}</p>
        <p className="text-[11px] text-slate-300">Sem dados</p>
      </div>
    );
  }

  const ganhoTotal =
    apuracao.cestaA_ST.ganhoLiquidoEmCentavos +
    apuracao.cestaA_DT.ganhoLiquidoEmCentavos +
    apuracao.cestaB_ST.ganhoLiquidoEmCentavos +
    apuracao.cestaB_DT.ganhoLiquidoEmCentavos;

  const darf = apuracao.darfTotalEmCentavos;
  const darfDevido = darf >= DARF_MINIMO_CENTAVOS;

  const statusCls =
    apuracao.statusDarf === 'pago'     ? 'text-emerald-600' :
    darfDevido                         ? 'text-svn-ruby'    :
    apuracao.statusDarf === 'nao_devido' ? 'text-slate-400' :
    'text-slate-400';

  const statusLabel =
    apuracao.statusDarf === 'pago'     ? 'Pago'           :
    darfDevido                         ? 'DARF pendente'  :
    apuracao.statusDarf === 'nao_devido' ? 'Sem DARF'     :
    'Sem apuração';

  return (
    <div className={`rounded-xl border p-3 ${
      darfDevido && apuracao.statusDarf !== 'pago'
        ? 'border-red-200 bg-red-50'
        : apuracao.statusDarf === 'pago'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-white'
    }`}>
      <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>

      {/* Resultado do mês */}
      <p className={`text-sm font-bold font-mono ${ganhoTotal >= 0 ? 'text-emerald-700' : 'text-svn-ruby'}`}>
        {brl(ganhoTotal)}
      </p>

      {/* DARF */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className={`text-[11px] font-medium ${statusCls}`}>{statusLabel}</span>
        {darfDevido && (
          <span className={`text-[11px] font-mono font-medium ${apuracao.statusDarf === 'pago' ? 'text-emerald-600' : 'text-svn-ruby'}`}>
            {brl(darf)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  uid: string;
  clienteId: string;
}

export function ResumoAnual({ uid, clienteId }: Props) {
  const anoCorrente = new Date().getFullYear();
  const [ano, setAno] = useState(anoCorrente);

  const { apuracoes, loading } = useApuracoes(uid, clienteId);

  const apuracoesDoPeriodo = apuracoes.filter((a) => a.anoMes.startsWith(`${ano}-`));
  const mapaApuracoes: Record<number, ApuracaoMensalDoc> = {};
  for (const a of apuracoesDoPeriodo) {
    const mes = parseInt(a.anoMes.split('-')[1], 10) - 1; // 0-based
    mapaApuracoes[mes] = a;
  }

  // Totais anuais
  let totalGanho = 0;
  let totalDarf = 0;
  let totalDarfPago = 0;
  let totalPreiuizo = 0;

  for (const a of apuracoesDoPeriodo) {
    const ganho =
      a.cestaA_ST.ganhoLiquidoEmCentavos +
      a.cestaA_DT.ganhoLiquidoEmCentavos +
      a.cestaB_ST.ganhoLiquidoEmCentavos +
      a.cestaB_DT.ganhoLiquidoEmCentavos;
    totalGanho += ganho;
    if (a.darfTotalEmCentavos >= DARF_MINIMO_CENTAVOS) {
      totalDarf += a.darfTotalEmCentavos;
      if (a.statusDarf === 'pago') totalDarfPago += a.darfTotalEmCentavos;
    }
    const prejuizoA = a.cestaA_ST.novoSaldoPrejuizoEmCentavos + a.cestaA_DT.novoSaldoPrejuizoEmCentavos;
    const prejuizoB = a.cestaB_ST.novoSaldoPrejuizoEmCentavos + a.cestaB_DT.novoSaldoPrejuizoEmCentavos;
    totalPreiuizo = Math.max(totalPreiuizo, prejuizoA + prejuizoB);
  }

  const anosDisponiveis = Array.from(
    new Set(apuracoes.map((a) => parseInt(a.anoMes.split('-')[0], 10)))
  ).sort((a, b) => b - a);

  if (loading) {
    return <div className="py-8 text-center text-slate-400 text-sm">Carregando…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Seletor de ano */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAno((v) => v - 1)}
          className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-bold text-slate-800 text-lg w-14 text-center">{ano}</span>
        <button
          onClick={() => setAno((v) => v + 1)}
          disabled={ano >= anoCorrente}
          className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
        {anosDisponiveis.length > 1 && (
          <div className="flex gap-1 ml-2">
            {anosDisponiveis.map((a) => (
              <button
                key={a}
                onClick={() => setAno(a)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  a === ano
                    ? 'bg-svn-carbon text-white border-svn-carbon'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cards mensais */}
      {apuracoesDoPeriodo.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">
          Nenhuma apuração em {ano}.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <MesCard key={i} mes={i} apuracao={mapaApuracoes[i]} />
          ))}
        </div>
      )}

      {/* Totais anuais */}
      {apuracoesDoPeriodo.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] text-slate-400 font-medium mb-1">Resultado {ano}</p>
            <p className={`text-lg font-bold font-mono ${totalGanho >= 0 ? 'text-emerald-700' : 'text-svn-ruby'}`}>
              {brl(totalGanho)}
            </p>
          </div>

          <div className={`rounded-xl border p-4 ${totalDarf > totalDarfPago ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-[11px] text-slate-400 font-medium mb-1">DARF total {ano}</p>
            <p className={`text-lg font-bold font-mono ${totalDarf > 0 ? 'text-svn-ruby' : 'text-slate-300'}`}>
              {totalDarf > 0 ? brl(totalDarf) : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] text-slate-400 font-medium mb-1">DARF pago</p>
            <p className={`text-lg font-bold font-mono ${totalDarfPago > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
              {totalDarfPago > 0 ? brl(totalDarfPago) : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] text-slate-400 font-medium mb-1">Prejuízo carregado</p>
            <p className={`text-lg font-bold font-mono ${totalPreiuizo > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
              {totalPreiuizo > 0 ? brl(totalPreiuizo) : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
