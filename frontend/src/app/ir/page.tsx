'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import {
  Upload, AlertTriangle, TrendingDown, BarChart2,
  Calendar, ChevronRight, Receipt,
  LayoutGrid, FileText, PieChart, CalendarDays,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getClientes } from '@/lib/firestore';
import { getNotasCorretagem } from '@/lib/ir/firestore';
import { usePosicoesIR, useResultadoMensal, useSaldoPrejuizo, useApuracoes } from '@/lib/ir/hooks';
import { LIMITE_ISENCAO_ACOES_CENTAVOS, DARF_MINIMO_CENTAVOS } from '@/lib/ir/types/asset-types';
import { UploadNotasModal } from '@/components/ir/UploadNotasModal';
import { EventosCorporativosPanel } from '@/components/ir/EventosCorporativosPanel';
import { PosicoesTable } from '@/components/ir/PosicoesTable';
import { ApuracoesMensais } from '@/components/ir/ApuracoesMensais';
import { ResumoAnual } from '@/components/ir/ResumoAnual';
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = 'carteira' | 'apuracoes' | 'anual' | 'notas' | 'eventos';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'carteira',   label: 'Carteira',      icon: LayoutGrid   },
  { id: 'apuracoes',  label: 'Apurações',     icon: CalendarDays },
  { id: 'anual',      label: 'Resumo anual',  icon: PieChart     },
  { id: 'notas',      label: 'Notas',         icon: FileText     },
  { id: 'eventos',    label: 'Eventos corp.', icon: Receipt      },
];

// ─── Seletor de cliente ───────────────────────────────────────────────────────

function IRClientePicker() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string; codigo_conta: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!user) return;
    getClientes(user.uid).then((data) => {
      setClientes(
        (data as Array<{ id: string; nome: string; codigo_conta: string }>)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      );
      setLoading(false);
    });
  }, [user]);

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filtrados = busca.trim()
    ? clientes.filter((c) => norm(c.nome).includes(norm(busca)) || c.codigo_conta.includes(busca))
    : clientes;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Receipt size={22} className="text-svn-ruby shrink-0" />
        <h1 className="text-2xl font-bold text-slate-800">Apuração de IR</h1>
      </div>
      <p className="text-sm text-slate-500">Selecione um cliente para acessar o módulo de IR.</p>

      <input
        type="text"
        placeholder="Buscar cliente…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby/30"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando clientes…</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum cliente encontrado.</div>
        ) : (
          filtrados.map((c) => (
            <Link
              key={c.id}
              href={`/ir?clienteId=${c.codigo_conta}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 group-hover:text-svn-ruby transition-colors">{c.nome}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{c.codigo_conta}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-svn-ruby transition-colors" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Cards de resumo IR ───────────────────────────────────────────────────────

function IRResumoCards({ uid, clienteId }: { uid: string; clienteId: string }) {
  const anoMes = anoMesAtual();
  const { posicoes, loading: pLoading } = usePosicoesIR(uid, clienteId);
  const { apuracao, loading: aLoading } = useResultadoMensal(uid, clienteId, anoMes);
  const { saldos, loading: sLoading }   = useSaldoPrejuizo(uid, clienteId);

  if (pLoading || aLoading || sLoading) {
    return <div className="text-xs text-slate-400 py-2">Calculando…</div>;
  }

  const darfTotal = apuracao
    ? apuracao.cestaA_ST.darfTotalEmCentavos + apuracao.cestaA_DT.darfTotalEmCentavos
      + apuracao.cestaB_ST.darfTotalEmCentavos + apuracao.cestaB_DT.darfTotalEmCentavos
    : 0;
  const darfDevido = darfTotal >= DARF_MINIMO_CENTAVOS;

  const vendasAcoes  = apuracao?.cestaA_ST.vendasAcoesSTemCentavos ?? 0;
  const pctIsencao   = Math.min(100, Math.round((vendasAcoes / LIMITE_ISENCAO_ACOES_CENTAVOS) * 100));
  const proximoLimite = pctIsencao >= 70 && pctIsencao < 100;
  const atingiuLimite = vendasAcoes > LIMITE_ISENCAO_ACOES_CENTAVOS;

  const totalPosicoes = posicoes.length;
  const plTotal = posicoes.reduce((acc, p) => acc + p.custoTotalEmCentavos, 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

// ─── Tabela de notas ──────────────────────────────────────────────────────────

function NotasTab({
  notas, loading, onImportar,
}: { notas: NotaCorretagemDoc[]; loading: boolean; onImportar: () => void }) {
  return (
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
          <button onClick={onImportar} className="mt-2 text-svn-ruby underline text-xs">
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
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{formatData(n.dataPregao)}</td>
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
  );
}

// ─── Conteúdo principal da página ────────────────────────────────────────────

function IRPageInner() {
  const searchParams = useSearchParams();
  const clienteId = searchParams.get('clienteId') ?? '';
  const { user } = useAuth();

  const [cliente, setCliente] = useState<Record<string, string> | null>(null);
  const [notas, setNotas] = useState<NotaCorretagemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('carteira');

  const { posicoes } = usePosicoesIR(user?.uid, clienteId);
  const { apuracoes } = useApuracoes(user?.uid, clienteId);

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

  if (!clienteId) return <IRClientePicker />;

  // Badge de alerta por tab
  const badgeApuracoes = apuracoes.filter(
    (a) => a.darfTotalEmCentavos >= DARF_MINIMO_CENTAVOS && a.statusDarf !== 'pago'
  ).length;

  const badgeNotas = notas.filter((n) => n.status === 'revisao_pendente').length;

  return (
    <div className="space-y-5">
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

      {/* Cards de resumo */}
      {user && <IRResumoCards uid={user.uid} clienteId={clienteId} />}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const badge = tab.id === 'apuracoes' ? badgeApuracoes : tab.id === 'notas' ? badgeNotas : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-svn-ruby text-svn-ruby'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {badge > 0 && (
                  <span className="ml-1 bg-svn-ruby text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da tab ativa */}
      <div>
        {activeTab === 'carteira' && (
          <PosicoesTable posicoes={posicoes} />
        )}

        {activeTab === 'apuracoes' && user && (
          <ApuracoesMensais uid={user.uid} clienteId={clienteId} nomeCliente={nomeCliente} />
        )}

        {activeTab === 'anual' && user && (
          <ResumoAnual uid={user.uid} clienteId={clienteId} />
        )}

        {activeTab === 'notas' && (
          <NotasTab notas={notas} loading={loading} onImportar={() => setModalOpen(true)} />
        )}

        {activeTab === 'eventos' && user && (
          <EventosCorporativosPanel
            uid={user.uid}
            clienteId={clienteId}
            tickers={posicoes.map((p) => p.ticker)}
          />
        )}
      </div>

      <UploadNotasModal
        clienteId={clienteId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); carregarDados(); }}
      />
    </div>
  );
}

// ─── Export default ───────────────────────────────────────────────────────────

export default function IRPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Carregando…</div>}>
      <IRPageInner />
    </Suspense>
  );
}
