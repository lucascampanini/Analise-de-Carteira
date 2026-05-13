'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Upload, AlertTriangle, TrendingDown, BarChart2, Calendar, FileDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getNotasCorretagem } from '@/lib/ir/firestore';
import { usePosicoesIR, useResultadoMensal, useSaldoPrejuizo, useApuracoes } from '@/lib/ir/hooks';
import { LIMITE_ISENCAO_ACOES_CENTAVOS, DARF_MINIMO_CENTAVOS } from '@/lib/ir/types/asset-types';
import { UploadNotasModal } from '@/components/ir/UploadNotasModal';
import { EventosCorporativosPanel } from '@/components/ir/EventosCorporativosPanel';
import type { NotaCorretagemDoc } from '@/lib/ir/types/firestore-schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  processando: 'Processando', processado: 'Importado',
  revisao_pendente: 'Revisão pendente', erro: 'Erro',
};
const STATUS_CLS: Record<string, string> = {
  processado: 'bg-emerald-100 text-emerald-700',
  revisao_pendente: 'bg-amber-100 text-amber-700',
  erro: 'bg-red-100 text-svn-ruby',
  processando: 'bg-blue-100 text-blue-700',
};

function formatData(iso: string) {
  if (!iso) return '—';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function anoMesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Sub-componente: cards de resumo IR ──────────────────────────────────────

function IRResumoCards({ uid, clienteId }: { uid: string; clienteId: string }) {
  const anoMes = anoMesAtual();
  const { posicoes, loading: pLoading } = usePosicoesIR(uid, clienteId);
  const { apuracao, loading: aLoading } = useResultadoMensal(uid, clienteId, anoMes);
  const { saldos, loading: sLoading }   = useSaldoPrejuizo(uid, clienteId);

  const loading = pLoading || aLoading || sLoading;
  if (loading) return <div className="text-xs text-slate-400 py-2">Calculando…</div>;

  const darfTotal = apuracao
    ? apuracao.cestaA_ST.darfTotalEmCentavos + apuracao.cestaA_DT.darfTotalEmCentavos
      + apuracao.cestaB_ST.darfTotalEmCentavos + apuracao.cestaB_DT.darfTotalEmCentavos
    : 0;
  const darfDevido = darfTotal >= DARF_MINIMO_CENTAVOS;

  const vendasAcoes = apuracao?.cestaA_ST.vendasAcoesSTemCentavos ?? 0;
  const pctIsencao  = Math.min(100, Math.round((vendasAcoes / LIMITE_ISENCAO_ACOES_CENTAVOS) * 100));
  const proximoLimite = pctIsencao >= 70 && pctIsencao < 100;
  const atingiuLimite = vendasAcoes > LIMITE_ISENCAO_ACOES_CENTAVOS;

  const totalPosicoes = posicoes.length;
  const plTotal = posicoes.reduce((acc, p) => acc + p.custoTotalEmCentavos, 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* DARF do mês */}
      <div className={`rounded-xl border p-4 ${darfDevido ? 'border-svn-ruby bg-red-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={14} className={darfDevido ? 'text-svn-ruby' : 'text-slate-400'} />
          <span className="text-xs font-medium text-slate-500">DARF {anoMes}</span>
        </div>
        <p className={`text-lg font-bold ${darfDevido ? 'text-svn-ruby' : 'text-slate-400'}`}>
          {darfDevido ? brl(darfTotal) : '—'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {darfDevido
            ? `Vence ${apuracao?.vencimentoDarf ? formatData(apuracao.vencimentoDarf) : '—'}`
            : apuracao ? 'Nenhum DARF devido' : 'Sem apuração'}
        </p>
      </div>

      {/* Saldo de prejuízo */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Prejuízo acumulado</span>
        </div>
        <p className="text-lg font-bold text-slate-800">
          {saldos.total > 0 ? brl(saldos.total) : '—'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {saldos.total > 0 ? 'A compensar em meses futuros' : 'Sem saldo a compensar'}
        </p>
      </div>

      {/* Posições abertas */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Posições abertas</span>
        </div>
        <p className="text-lg font-bold text-slate-800">{totalPosicoes}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {totalPosicoes > 0 ? `Custo total: ${brl(plTotal)}` : 'Sem posições'}
        </p>
      </div>

      {/* Alerta isenção R$20k */}
      <div className={`rounded-xl border p-4 ${atingiuLimite ? 'border-svn-ruby bg-red-50' : proximoLimite ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className={atingiuLimite ? 'text-svn-ruby' : proximoLimite ? 'text-amber-500' : 'text-slate-400'} />
          <span className="text-xs font-medium text-slate-500">Isenção R$20k</span>
        </div>
        <p className={`text-lg font-bold ${atingiuLimite ? 'text-svn-ruby' : proximoLimite ? 'text-amber-600' : 'text-slate-400'}`}>
          {vendasAcoes > 0 ? `${pctIsencao}%` : '—'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {atingiuLimite
            ? 'Limite atingido — IR devido'
            : vendasAcoes > 0
              ? `${brl(vendasAcoes)} de ${brl(LIMITE_ISENCAO_ACOES_CENTAVOS)}`
              : 'Sem vendas de ações no mês'}
        </p>
      </div>
    </div>
  );
}

// ─── Conteúdo da página (usa useSearchParams — requer Suspense no export) ────

function IRPageInner() {
  const searchParams = useSearchParams();
  const clienteId = searchParams.get('clienteId') ?? '';
  const { user } = useAuth();

  const [cliente, setCliente] = useState<Record<string, string> | null>(null);
  const [notas, setNotas] = useState<NotaCorretagemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState<string | null>(null);

  const { apuracoes } = useApuracoes(user?.uid, clienteId);
  const { posicoes }  = usePosicoesIR(user?.uid, clienteId);

  const baixarPDF = async (anoMes: string) => {
    setGerandoPDF(anoMes);
    try {
      const apuracao = apuracoes.find((a) => a.anoMes === anoMes);
      if (!apuracao) return;
      const { baixarRelatorioIR } = await import('@/components/ir/RelatorioIRPDF');
      await baixarRelatorioIR(apuracao, nomeCliente || clienteId);
    } finally {
      setGerandoPDF(null);
    }
  };

  const carregarDados = async () => {
    if (!user || !clienteId) return;
    setLoading(true);
    try {
      const [clienteSnap, notasData] = await Promise.all([
        getDoc(doc(db, 'users', user.uid, 'clientes', clienteId)),
        getNotasCorretagem(user.uid, clienteId),
      ]);
      if (clienteSnap.exists()) setCliente(clienteSnap.data() as Record<string, string>);
      setNotas(notasData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, clienteId]);

  const nomeCliente = cliente?.nome || clienteId;

  if (!clienteId) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Cliente não especificado.{' '}
        <Link href="/clientes" className="text-svn-ruby underline">Voltar para Clientes</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/clientes" className="text-svn-ruby text-sm">← Clientes</Link>
        <h1 className="text-2xl font-bold text-slate-800">IR — {nomeCliente}</h1>
        <span className="text-sm text-slate-400 font-mono">{clienteId}</span>
        <button
          onClick={() => setModalOpen(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-svn-carbon text-white text-sm font-medium rounded-lg hover:bg-[#2e2420] transition-colors"
        >
          <Upload size={15} />
          Importar notas
        </button>
      </div>

      {/* Cards de resumo IR */}
      {user && <IRResumoCards uid={user.uid} clienteId={clienteId} />}

      {/* Eventos corporativos */}
      {user && (
        <EventosCorporativosPanel
          uid={user.uid}
          clienteId={clienteId}
          tickers={posicoes.map((p) => p.ticker)}
        />
      )}

      {/* Tabela de notas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm">Notas de Corretagem</h2>
          <span className="text-xs text-slate-400">{notas.length} importada{notas.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando…</div>
        ) : notas.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhuma nota importada ainda.
            <br />
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 text-svn-ruby underline text-xs"
            >
              Importar primeira nota
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 text-left">
                  <th className="px-4 py-2 font-medium">Pregão</th>
                  <th className="px-4 py-2 font-medium">Nº Nota</th>
                  <th className="px-4 py-2 font-medium">Corretora</th>
                  <th className="px-4 py-2 font-medium text-right">Operações</th>
                  <th className="px-4 py-2 font-medium text-right">Líquido</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {notas.map((n) => {
                  const liquido = n.resumoFinanceiro.liquidoParaClienteEmCentavos / 100;
                  return (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        {formatData(n.dataPregao)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">{n.nrNota}</td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate" title={n.corretora}>
                        {n.corretora}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{n.operacoes.length}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${liquido >= 0 ? 'text-emerald-700' : 'text-svn-ruby'}`}>
                        {liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[n.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABEL[n.status] ?? n.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico de apurações */}
      {apuracoes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">Apurações mensais</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 text-left">
                  <th className="px-4 py-2 font-medium">Mês</th>
                  <th className="px-4 py-2 font-medium text-right">DARF total</th>
                  <th className="px-4 py-2 font-medium text-right">Prejuízo A_ST</th>
                  <th className="px-4 py-2 font-medium text-right">Prejuízo B_ST</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {apuracoes.map((a) => {
                  const darf = a.darfTotalEmCentavos;
                  const darfDevido = darf >= DARF_MINIMO_CENTAVOS;
                  return (
                    <tr key={a.anoMes} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-slate-700">{a.anoMes}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${darfDevido ? 'text-svn-ruby' : 'text-slate-400'}`}>
                        {darfDevido ? brl(darf) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {a.cestaA_ST.novoSaldoPrejuizoEmCentavos > 0 ? brl(a.cestaA_ST.novoSaldoPrejuizoEmCentavos) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {a.cestaB_ST.novoSaldoPrejuizoEmCentavos > 0 ? brl(a.cestaB_ST.novoSaldoPrejuizoEmCentavos) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {a.vencimentoDarf ? formatData(a.vencimentoDarf) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => baixarPDF(a.anoMes)}
                          disabled={gerandoPDF === a.anoMes}
                          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-svn-ruby transition-colors disabled:opacity-40"
                        >
                          <FileDown size={13} />
                          {gerandoPDF === a.anoMes ? 'Gerando…' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UploadNotasModal
        clienteId={clienteId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); carregarDados(); }}
      />
    </div>
  );
}

// ─── Export default com Suspense (obrigatório para useSearchParams em static export) ──

export default function IRPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Carregando…</div>}>
      <IRPageInner />
    </Suspense>
  );
}
