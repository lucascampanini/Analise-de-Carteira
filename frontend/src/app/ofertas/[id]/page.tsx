"use client";
import { useEffect, useState, use } from "react";
import {
  getOferta, getClientes,
  postClienteOferta, patchClienteOferta, deleteClienteOferta,
} from "@/lib/api";
import { brl } from "@/lib/formatters";

const STATUSES = ["PENDENTE", "RESERVADO", "PUSH_ENVIADO", "FINALIZADO"] as const;
type Status = typeof STATUSES[number];

const STATUS_LABEL: Record<Status, string> = {
  PENDENTE:     "Pendente",
  RESERVADO:    "Reservado",
  PUSH_ENVIADO: "Push enviado",
  FINALIZADO:   "Finalizado",
};
const STATUS_COR: Record<Status, string> = {
  PENDENTE:     "bg-slate-100 text-slate-600",
  RESERVADO:    "bg-amber-100 text-amber-700",
  PUSH_ENVIADO: "bg-blue-100 text-blue-700",
  FINALIZADO:   "bg-emerald-100 text-emerald-700",
};

export default function OfertaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [oferta, setOferta] = useState<any>(null);
  const [todosClientes, setTodosClientes] = useState<any[]>([]);
  // mapa codigo_conta → registro na oferta
  const [vinculados, setVinculados] = useState<Record<string, any>>({});
  // cliente com painel de vinculação aberto
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [formValor, setFormValor] = useState("");
  const [formSaldo, setFormSaldo] = useState("");
  const [formStatus, setFormStatus] = useState<Status>("RESERVADO");
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const load = async () => {
    const [o, clientes] = await Promise.all([
      getOferta(id).catch(() => null),
      getClientes().catch(() => []),
    ]);
    if (o) {
      setOferta(o);
      const mapa: Record<string, any> = {};
      for (const c of (o.clientes || [])) mapa[c.codigo_conta] = c;
      setVinculados(mapa);
    }
    // ordenar por net desc
    setTodosClientes([...clientes].sort((a, b) => (b.net || 0) - (a.net || 0)));
  };

  useEffect(() => { load(); }, [id]);

  const abrirVinculo = (conta: string) => {
    setAbrindo(conta);
    setFormValor("");
    setFormSaldo("");
    setFormStatus("RESERVADO");
  };

  const vincular = async (cliente: any) => {
    setSaving(true);
    await postClienteOferta(id, {
      codigo_conta: cliente.codigo_conta,
      nome_cliente: cliente.nome,
      net: cliente.net,
      saldo_disponivel: formSaldo ? parseFloat(formSaldo) : null,
      valor_ofertado: formValor ? parseFloat(formValor) : null,
      status: formStatus,
    });
    setSaving(false);
    setAbrindo(null);
    load();
  };

  const atualizarStatus = async (item: any, novoStatus: Status) => {
    await patchClienteOferta(id, item.id, {
      codigo_conta: item.codigo_conta,
      valor_ofertado: item.valor_ofertado,
      saldo_disponivel: item.saldo_disponivel,
      status: novoStatus,
      observacao: item.observacao,
    });
    load();
  };

  const atualizarValor = async (item: any, novoValor: string) => {
    await patchClienteOferta(id, item.id, {
      codigo_conta: item.codigo_conta,
      valor_ofertado: novoValor ? parseFloat(novoValor) : null,
      saldo_disponivel: item.saldo_disponivel,
      status: item.status,
      observacao: item.observacao,
    });
    load();
  };

  const cancelar = async (item: any) => {
    if (!confirm(`Cancelar reserva de ${item.nome_cliente}?`)) return;
    await deleteClienteOferta(id, item.id);
    load();
  };

  if (!oferta) return <div className="text-slate-400 text-sm p-8">Carregando...</div>;

  const preview = oferta.preview || {};
  const clientesFiltrados = todosClientes.filter((c) =>
    !busca ||
    (c.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
    String(c.codigo_conta).includes(busca)
  );
  const vinculadosCount = Object.keys(vinculados).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <a href="/ofertas" className="text-blue-600 text-sm">← Ofertas</a>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">{oferta.nome}</h1>
          {oferta.descricao && <p className="text-slate-500 text-sm">{oferta.descricao}</p>}
          {oferta.data_liquidacao && (
            <p className="text-sm text-slate-600 mt-1">
              📅 Liquidação:{" "}
              <strong>{new Date(oferta.data_liquidacao + "T00:00:00").toLocaleDateString("pt-BR")}</strong>
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{vinculadosCount} cliente{vinculadosCount !== 1 ? "s" : ""} vinculados</p>
          <p className="text-xs text-slate-400">{todosClientes.length} na base</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Volume ofertado",  valor: brl(preview.total_ofertado  || 0), cor: "text-slate-800"   },
          { label: "ROA",              valor: `${oferta.roa?.toFixed(2)}%`,       cor: "text-blue-700"   },
          { label: "Receita prevista", valor: brl(preview.receita_prevista || 0), cor: "text-blue-700"   },
          { label: "Receita finalizada",valor: brl(preview.receita_finalizada||0),cor: "text-emerald-700"},
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.cor}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabela de todos os clientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
          <h2 className="font-semibold text-slate-800 shrink-0">Clientes</h2>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="flex-1 max-w-xs border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400 ml-auto shrink-0">
            {vinculadosCount} vinculados · {clientesFiltrados.length} exibidos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Saldo disp.</th>
                <th className="px-4 py-3 text-right">Valor reservado</th>
                <th className="px-4 py-3 text-right">Receita</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clientesFiltrados.map((cliente) => {
                const item = vinculados[cliente.codigo_conta];
                const estaVinculado = !!item;
                const estaAbrindo = abrindo === cliente.codigo_conta;

                return (
                  <>
                    {/* Linha principal do cliente */}
                    <tr
                      key={cliente.codigo_conta}
                      className={`transition-colors ${estaVinculado ? "bg-blue-50/40" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-400">{cliente.codigo_conta}</td>
                      <td className="px-4 py-2.5">
                        <a href={`/clientes/${cliente.codigo_conta}`}
                          className="font-medium text-slate-800 hover:text-blue-600 text-sm">
                          {cliente.nome || cliente.codigo_conta}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 font-medium">
                        {brl(cliente.net)}
                      </td>

                      {/* Saldo disponível */}
                      <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                        {estaVinculado && item.saldo_disponivel ? brl(item.saldo_disponivel) : "—"}
                      </td>

                      {/* Valor reservado — editável inline se vinculado */}
                      <td className="px-4 py-2.5 text-right">
                        {estaVinculado ? (
                          <ValorEditavel
                            valor={item.valor_ofertado}
                            onChange={(v) => atualizarValor(item, v)}
                          />
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Receita */}
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-blue-700">
                        {estaVinculado && item.valor_ofertado
                          ? brl(item.valor_ofertado * (oferta.roa || 0) / 100)
                          : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5 text-center">
                        {estaVinculado ? (
                          <select
                            value={item.status}
                            onChange={(e) => atualizarStatus(item, e.target.value as Status)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_COR[item.status as Status]}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {estaVinculado ? (
                          <button
                            onClick={() => cancelar(item)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                          >
                            Cancelar
                          </button>
                        ) : (
                          <button
                            onClick={() => estaAbrindo ? setAbrindo(null) : abrirVinculo(cliente.codigo_conta)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                          >
                            {estaAbrindo ? "Fechar" : "Vincular"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Painel de vinculação — aparece abaixo da linha quando clica em Vincular */}
                    {estaAbrindo && (
                      <tr key={`${cliente.codigo_conta}-form`} className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-medium text-blue-700">Reservar para {cliente.nome?.split(" ")[0]}:</span>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">Saldo disp. (R$)</label>
                              <input
                                type="number"
                                value={formSaldo}
                                onChange={(e) => setFormSaldo(e.target.value)}
                                placeholder="0,00"
                                className="w-32 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">Valor ofertado (R$)</label>
                              <input
                                autoFocus
                                type="number"
                                value={formValor}
                                onChange={(e) => setFormValor(e.target.value)}
                                placeholder="0,00"
                                className="w-32 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">Status</label>
                              <select
                                value={formStatus}
                                onChange={(e) => setFormStatus(e.target.value as Status)}
                                className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => vincular(cliente)}
                              disabled={saving}
                              className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {saving ? "Salvando..." : "Confirmar"}
                            </button>
                            <button
                              onClick={() => setAbrindo(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>

            {/* Totais */}
            {vinculadosCount > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Total ({vinculadosCount} clientes)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    {brl(Object.values(vinculados).reduce((s, c) => s + (c.valor_ofertado || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {brl(Object.values(vinculados).reduce((s, c) => s + (c.valor_ofertado || 0), 0) * (oferta.roa || 0) / 100)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Valor editável inline ─────────────────────────────────────────────────────
function ValorEditavel({ valor, onChange }: { valor: number | null; onChange: (v: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(String(valor || ""));

  const confirmar = () => {
    setEditando(false);
    if (draft !== String(valor || "")) onChange(draft);
  };

  if (editando) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === "Enter" && confirmar()}
        className="w-28 text-right border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(valor || "")); setEditando(true); }}
      className="font-medium text-slate-800 hover:text-blue-600 transition-colors text-sm"
      title="Clique para editar"
    >
      {valor ? brl(valor) : <span className="text-slate-300 italic text-xs">editar</span>}
    </button>
  );
}
