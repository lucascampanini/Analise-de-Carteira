'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getNotasCorretagem } from '@/lib/ir/firestore';
import { UploadNotasModal } from '@/components/ir/UploadNotasModal';
import type { NotaCorretagemDoc } from '@/lib/ir/types/firestore-schema';

const STATUS_LABEL: Record<string, string> = {
  processando:      'Processando',
  processado:       'Importado',
  revisao_pendente: 'Revisão pendente',
  erro:             'Erro',
};

const STATUS_CLS: Record<string, string> = {
  processado:       'bg-emerald-100 text-emerald-700',
  revisao_pendente: 'bg-amber-100 text-amber-700',
  erro:             'bg-red-100 text-svn-ruby',
  processando:      'bg-blue-100 text-blue-700',
};

function formatData(iso: string) {
  if (!iso) return '—';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export default function IRClientePage({
  params,
}: {
  params: { clienteId: string };
}) {
  const { clienteId } = params;
  const { user } = useAuth();

  const [cliente, setCliente] = useState<Record<string, string> | null>(null);
  const [notas, setNotas] = useState<NotaCorretagemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const carregarDados = async () => {
    if (!user) return;
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/clientes" className="text-svn-ruby text-sm">← Clientes</Link>
        <h1 className="text-2xl font-bold text-slate-800">
          IR — {nomeCliente}
        </h1>
        <span className="text-sm text-slate-400 font-mono">{clienteId}</span>
        <button
          onClick={() => setModalOpen(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-svn-carbon text-white text-sm font-medium rounded-lg hover:bg-[#2e2420] transition-colors"
        >
          <Upload size={15} />
          Importar notas
        </button>
      </div>

      {/* Tabela de notas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm">
            Notas de Corretagem
          </h2>
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
                      <td className="px-4 py-2.5 font-mono text-slate-600">
                        {n.nrNota}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate" title={n.corretora}>
                        {n.corretora}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {n.operacoes.length}
                      </td>
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

      <UploadNotasModal
        clienteId={clienteId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); carregarDados(); }}
      />
    </div>
  );
}
