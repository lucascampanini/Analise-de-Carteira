'use client';
import { useState } from 'react';
import {
  ChevronDown, ChevronRight, FileDown, CheckCircle2,
  Clock, Minus, AlertTriangle, CalendarCheck,
} from 'lucide-react';
import { useApuracoes } from '@/lib/ir/hooks';
import { getNotasMes, marcarDarfPago } from '@/lib/ir/firestore';
import { DARF_MINIMO_CENTAVOS } from '@/lib/ir/types/asset-types';
import type { ApuracaoMensalDoc, NotaCorretagemDoc, ResultadoCestaDoc } from '@/lib/ir/types/firestore-schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(iso: string) {
  if (!iso) return '—';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function formatAnoMes(anoMes: string) {
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [yyyy, mm] = anoMes.split('-');
  return `${meses[parseInt(mm, 10) - 1]}/${yyyy}`;
}

// ─── Status DARF ─────────────────────────────────────────────────────────────

type DarfStatus = 'nao_gerado' | 'nao_devido' | 'gerado' | 'pago';

const DARF_META: Record<DarfStatus, { label: string; cls: string; icon: React.ElementType }> = {
  nao_gerado: { label: 'Sem apuração', cls: 'bg-slate-100 text-slate-400',   icon: Minus },
  nao_devido: { label: 'Sem DARF',     cls: 'bg-slate-100 text-slate-500',   icon: Minus },
  gerado:     { label: 'DARF gerado',  cls: 'bg-amber-100 text-amber-700',   icon: Clock },
  pago:       { label: 'Pago',         cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

// ─── Sub-tabela de cestas ────────────────────────────────────────────────────

function CestaRow({
  label, cesta, aliquota,
}: { label: string; cesta: ResultadoCestaDoc; aliquota: number }) {
  const ganho = cesta.ganhoLiquidoEmCentavos;
  return (
    <tr className="text-xs">
      <td className="py-1.5 pr-4 text-slate-500 font-medium">{label}</td>
      <td className={`py-1.5 pr-4 text-right font-mono ${ganho >= 0 ? 'text-emerald-700' : 'text-svn-ruby'}`}>
        {brl(ganho)}
      </td>
      <td className="py-1.5 pr-4 text-right text-slate-500">
        {cesta.isento
          ? <span className="text-emerald-600">Isento</span>
          : cesta.baseCalculoEmCentavos > 0
            ? `${(aliquota * 100).toFixed(0)}% s/ ${brl(cesta.baseCalculoEmCentavos)}`
            : '—'
        }
      </td>
      <td className="py-1.5 pr-4 text-right font-mono text-slate-700">
        {cesta.darfTotalEmCentavos >= DARF_MINIMO_CENTAVOS ? brl(cesta.darfTotalEmCentavos) : '—'}
      </td>
      <td className="py-1.5 text-right text-slate-500 text-[11px]">
        {cesta.prejuizoCompensadoEmCentavos > 0 ? `-${brl(cesta.prejuizoCompensadoEmCentavos)}` : '—'}
      </td>
    </tr>
  );
}

// ─── Linha expandível de apuração ────────────────────────────────────────────

interface ApuracaoRowProps {
  apuracao: ApuracaoMensalDoc;
  uid: string;
  clienteId: string;
  nomeCliente: string;
}

function ApuracaoRow({ apuracao, uid, clienteId, nomeCliente }: ApuracaoRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [notas, setNotas] = useState<NotaCorretagemDoc[] | null>(null);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);
  const [dataPagamento, setDataPagamento] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const darf = apuracao.darfTotalEmCentavos;
  const darfDevido = darf >= DARF_MINIMO_CENTAVOS;
  const meta = DARF_META[apuracao.statusDarf as DarfStatus] ?? DARF_META.nao_gerado;
  const StatusIcon = meta.icon;

  // Ganho líquido total consolidado (A + B, ST + DT)
  const ganhoTotal =
    apuracao.cestaA_ST.ganhoLiquidoEmCentavos +
    apuracao.cestaA_DT.ganhoLiquidoEmCentavos +
    apuracao.cestaB_ST.ganhoLiquidoEmCentavos +
    apuracao.cestaB_DT.ganhoLiquidoEmCentavos;

  const toggleExpand = async () => {
    if (!expanded && notas === null) {
      setLoadingNotas(true);
      try {
        const data = await getNotasMes(uid, clienteId, apuracao.anoMes);
        setNotas(data);
      } finally {
        setLoadingNotas(false);
      }
    }
    setExpanded((v) => !v);
  };

  const handleMarcarPago = async () => {
    if (!dataPagamento) return;
    setSalvando(true);
    try {
      await marcarDarfPago(uid, clienteId, apuracao.anoMes, dataPagamento);
      setConfirmandoPagamento(false);
    } finally {
      setSalvando(false);
    }
  };

  const baixarPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGerandoPDF(true);
    try {
      const { baixarRelatorioIR } = await import('@/components/ir/RelatorioIRPDF');
      await baixarRelatorioIR(apuracao, nomeCliente);
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <>
      {/* Linha principal */}
      <tr
        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
        onClick={toggleExpand}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded
              ? <ChevronDown size={13} className="text-slate-400 shrink-0" />
              : <ChevronRight size={13} className="text-slate-400 shrink-0" />
            }
            <span className="font-mono font-medium text-slate-700">
              {formatAnoMes(apuracao.anoMes)}
            </span>
            {apuracao.dirty && (
              <span title="Nota retroativa importada — recalcule">
                <AlertTriangle size={12} className="text-amber-500 shrink-0" />
              </span>
            )}
          </div>
        </td>

        <td className={`px-4 py-3 text-right font-mono text-sm ${ganhoTotal >= 0 ? 'text-emerald-700' : 'text-svn-ruby'}`}>
          {brl(ganhoTotal)}
        </td>

        <td className={`px-4 py-3 text-right font-mono text-sm ${darfDevido ? 'text-svn-ruby font-medium' : 'text-slate-300'}`}>
          {darfDevido ? brl(darf) : '—'}
        </td>

        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>
            <StatusIcon size={11} />
            {meta.label}
          </span>
        </td>

        <td className="px-4 py-3 text-xs text-slate-500">
          {darfDevido && apuracao.vencimentoDarf ? formatData(apuracao.vencimentoDarf) : '—'}
        </td>

        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 justify-end">
            {/* Marcar como pago */}
            {darfDevido && apuracao.statusDarf !== 'pago' && (
              confirmandoPagamento ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    onClick={handleMarcarPago}
                    disabled={!dataPagamento || salvando}
                    className="text-[11px] px-2 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    {salvando ? '…' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setConfirmandoPagamento(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmandoPagamento(true); setDataPagamento(''); }}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  <CalendarCheck size={12} />
                  Marcar pago
                </button>
              )
            )}

            {/* Mostrar data de pagamento se já pago */}
            {apuracao.statusDarf === 'pago' && apuracao.dataPagamentoDarf && (
              <span className="text-[11px] text-slate-400">
                Pago em {formatData(apuracao.dataPagamentoDarf)}
              </span>
            )}

            {/* Download PDF */}
            <button
              onClick={baixarPDF}
              disabled={gerandoPDF}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-svn-ruby transition-colors disabled:opacity-40"
            >
              <FileDown size={12} />
              {gerandoPDF ? 'Gerando…' : 'PDF'}
            </button>
          </div>
        </td>
      </tr>

      {/* Linha expandida */}
      {expanded && (
        <tr>
          <td colSpan={6} className="px-0 pt-0 pb-2 bg-slate-50/50">
            <div className="mx-4 my-2 rounded-lg border border-slate-200 bg-white overflow-hidden">

              {/* Detalhe por cesta */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Resultado por cesta
                </p>
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] text-slate-400">
                      <th className="text-left pr-4 pb-1">Cesta</th>
                      <th className="text-right pr-4 pb-1">Ganho / Prejuízo</th>
                      <th className="text-right pr-4 pb-1">Base de cálculo</th>
                      <th className="text-right pr-4 pb-1">DARF</th>
                      <th className="text-right pb-1">Prejuízo compensado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <CestaRow label="A — Ações/ETF/BDR (Swing Trade)" cesta={apuracao.cestaA_ST} aliquota={0.15} />
                    <CestaRow label="A — Ações/ETF/BDR (Day Trade)"   cesta={apuracao.cestaA_DT} aliquota={0.20} />
                    <CestaRow label="B — FII/Fiagro (Swing Trade)"     cesta={apuracao.cestaB_ST} aliquota={0.20} />
                    <CestaRow label="B — FII/Fiagro (Day Trade)"       cesta={apuracao.cestaB_DT} aliquota={0.20} />
                  </tbody>
                </table>
              </div>

              {/* Operações das notas do mês */}
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Operações do mês ({apuracao.notasProcessadas.length} nota{apuracao.notasProcessadas.length !== 1 ? 's' : ''})
                </p>

                {loadingNotas ? (
                  <p className="text-xs text-slate-400 py-2">Carregando operações…</p>
                ) : notas && notas.length > 0 ? (
                  <div className="space-y-3">
                    {notas.map((nota) => (
                      <div key={nota.id}>
                        <p className="text-[11px] text-slate-500 font-medium mb-1">
                          Nota {nota.nrNota} · {formatData(nota.dataPregao)} · {nota.corretora}
                        </p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[10px] text-slate-400 border-b border-slate-100">
                              <th className="text-left pb-1">Ticker</th>
                              <th className="text-left pb-1">Tipo</th>
                              <th className="text-right pb-1">Qtd</th>
                              <th className="text-right pb-1">Preço</th>
                              <th className="text-right pb-1">Valor bruto</th>
                              <th className="text-right pb-1">DT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {nota.operacoes.map((op, i) => (
                              <tr key={i} className="text-slate-600">
                                <td className="py-1 pr-3 font-mono font-semibold">{op.ticker}</td>
                                <td className={`py-1 pr-3 font-medium ${op.tipo === 'C' ? 'text-emerald-600' : 'text-svn-ruby'}`}>
                                  {op.tipo === 'C' ? 'Compra' : 'Venda'}
                                </td>
                                <td className="py-1 pr-3 text-right font-mono">
                                  {op.quantidade.toLocaleString('pt-BR')}
                                </td>
                                <td className="py-1 pr-3 text-right font-mono">
                                  {brl(op.precoEmCentavos)}
                                </td>
                                <td className="py-1 pr-3 text-right font-mono">
                                  {brl(op.valorBrutoEmCentavos)}
                                </td>
                                <td className="py-1 text-right">
                                  {op.isDayTrade ? <span className="text-amber-600 font-medium">DT</span> : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : notas && notas.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Nenhuma nota encontrada para este mês.</p>
                ) : null}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  uid: string;
  clienteId: string;
  nomeCliente: string;
}

export function ApuracoesMensais({ uid, clienteId, nomeCliente }: Props) {
  const { apuracoes, loading } = useApuracoes(uid, clienteId);

  if (loading) {
    return <div className="py-8 text-center text-slate-400 text-sm">Carregando apurações…</div>;
  }

  if (apuracoes.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        Nenhuma apuração encontrada. Importe notas de corretagem para começar.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 text-left border-b border-slate-200">
            <th className="px-4 py-2.5 font-medium">Mês</th>
            <th className="px-4 py-2.5 font-medium text-right">Resultado líquido</th>
            <th className="px-4 py-2.5 font-medium text-right">DARF</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Vencimento</th>
            <th className="px-4 py-2.5 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apuracoes.map((a) => (
            <ApuracaoRow
              key={a.anoMes}
              apuracao={a}
              uid={uid}
              clienteId={clienteId}
              nomeCliente={nomeCliente}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
