"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getReunioes, getEventosProximos, getClientes, getLeads,
  addReuniao, cancelarReuniao,
} from "@/lib/firestore";
import { fmtDate, diasAte } from "@/lib/formatters";

export default function AgendaPage() {
  const { user } = useAuth();
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [eventos,  setEventos]  = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [leads,    setLeads]    = useState<any[]>([]);
  const [tipoContato, setTipoContato] = useState<"cliente" | "lead">("cliente");
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [form, setForm] = useState({
    titulo: "", data_hora: "", duracao_minutos: "60",
    codigo_conta: "", nome_cliente: "", descricao: "",
  });

  const load = async () => {
    if (!user) return;
    const [r, e] = await Promise.all([
      getReunioes(user.uid, 30).catch(() => []),
      getEventosProximos(user.uid, 30).catch(() => []),
    ]);
    setReunioes(r);
    setEventos(e);
  };

  useEffect(() => {
    if (!user) return;
    load();
    getClientes(user.uid).then(setClientes).catch(() => {});
    getLeads(user.uid).then(setLeads).catch(() => {});
  }, [user]);

  const clienteSelecionado = clientes.find((c) => c.codigo_conta === form.codigo_conta);
  const leadSelecionado    = leads.find((l) => l.id === form.codigo_conta);
  const nomeContato = tipoContato === "cliente" ? clienteSelecionado?.nome : leadSelecionado?.nome;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addReuniao(user.uid, {
        titulo:          form.titulo,
        data_hora:       form.data_hora,
        duracao_minutos: Number(form.duracao_minutos),
        codigo_conta:    tipoContato === "cliente" ? (form.codigo_conta || null) : null,
        nome_cliente:    nomeContato || form.nome_cliente || null,
        descricao:       form.descricao || null,
      });
      setForm({ titulo: "", data_hora: "", duracao_minutos: "60", codigo_conta: "", nome_cliente: "", descricao: "" });
      setTipoContato("cliente");
      setShowForm(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const cancelar = async (id: string) => {
    if (!user || !confirm("Cancelar esta reunião?")) return;
    await cancelarReuniao(user.uid, id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-500 text-sm">Reuniões e eventos dos próximos 30 dias</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nova Reunião
        </button>
      </div>

      {/* Modal nova reunião */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={salvar} className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="font-bold text-slate-800 text-lg">Nova Reunião</h2>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Título *</label>
              <input required value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Revisão de carteira"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Data e hora *</label>
                <input required type="datetime-local" value={form.data_hora}
                  onChange={(e) => setForm((f) => ({ ...f, data_hora: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Duração (min)</label>
                <input type="number" min="15" step="15" value={form.duracao_minutos}
                  onChange={(e) => setForm((f) => ({ ...f, duracao_minutos: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Participante</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-2">
                {(["cliente", "lead"] as const).map((t) => (
                  <button key={t} type="button"
                    onClick={() => { setTipoContato(t); setForm((f) => ({ ...f, codigo_conta: "", nome_cliente: "" })); }}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                      tipoContato === t ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}>
                    {t === "cliente" ? "Cliente" : "Lead"}
                  </button>
                ))}
              </div>
              {tipoContato === "cliente" ? (
                <select value={form.codigo_conta}
                  onChange={(e) => setForm((f) => ({ ...f, codigo_conta: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Nenhum —</option>
                  {clientes.map((c) => (
                    <option key={c.codigo_conta} value={c.codigo_conta}>
                      {c.nome} ({c.codigo_conta})
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <select value={form.codigo_conta}
                    onChange={(e) => setForm((f) => ({ ...f, codigo_conta: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2">
                    <option value="">— Selecione um lead —</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.nome} · {l.estagio}</option>
                    ))}
                  </select>
                  {!form.codigo_conta && (
                    <input value={form.nome_cliente}
                      onChange={(e) => setForm((f) => ({ ...f, nome_cliente: e.target.value }))}
                      placeholder="Ou digitar nome manualmente"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Pauta</label>
              <textarea value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={2} placeholder="Opcional"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Salvando..." : "Agendar"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Reuniões */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Reuniões agendadas</h2>
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{reunioes.length}</span>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto" style={{ maxHeight: "32rem" }}>
            {reunioes.length === 0 && <p className="text-slate-400 text-sm text-center py-8">Nenhuma reunião agendada</p>}
            {reunioes.map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.titulo}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.nome_cliente || "—"}</p>
                  {r.descricao && <p className="text-xs text-slate-400 mt-0.5 truncate">{r.descricao}</p>}
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs font-medium text-violet-700">
                    {new Date(r.data_hora).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(r.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {r.duracao_minutos && <p className="text-xs text-slate-400">{r.duracao_minutos} min</p>}
                  <button onClick={() => cancelar(r.id)} className="text-xs text-slate-300 hover:text-red-500 transition-colors mt-1">
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eventos/Tarefas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Tarefas próximas</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{eventos.length}</span>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto" style={{ maxHeight: "32rem" }}>
            {eventos.length === 0 && <p className="text-slate-400 text-sm text-center py-8">Nenhuma tarefa nos próximos 30 dias</p>}
            {eventos.map((e: any) => (
              <div key={e.id} className="px-5 py-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{e.descricao}</p>
                  {e.nome_cliente && <p className="text-xs text-slate-500">{e.nome_cliente}</p>}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-slate-600">{fmtDate(e.data)}</p>
                  <p className={`text-xs font-semibold ${e.dias_para_evento <= 7 ? "text-red-600" : "text-slate-500"}`}>
                    {e.dias_para_evento === 0 ? "Hoje" : `${e.dias_para_evento}d`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
