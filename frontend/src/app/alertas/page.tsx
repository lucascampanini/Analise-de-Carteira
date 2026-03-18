"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getEventosProximos, concluirEvento, deleteEvento } from "@/lib/firestore";
import { fmtDate } from "@/lib/formatters";

export default function AlertasPage() {
  const { user }    = useAuth();
  const [eventos, setEventos] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const evts = await getEventosProximos(user.uid, 365).catch(() => []);
    setEventos(evts);
  };

  useEffect(() => { load(); }, [user]);

  const concluir = async (id: string) => {
    if (!user) return;
    await concluirEvento(user.uid, id);
    load();
  };

  const deletar = async (id: string) => {
    if (!user || !confirm("Remover este alerta?")) return;
    await deleteEvento(user.uid, id);
    load();
  };

  const tarefas       = eventos.filter((e) => e.tipo === "TAREFA");
  const outrosAlertas = eventos.filter((e) => e.tipo !== "TAREFA");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Central de Alertas</h1>
        <p className="text-slate-500 text-sm">
          {eventos.length} evento{eventos.length !== 1 ? "s" : ""} aberto{eventos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Tarefas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">✅ Tarefas agendadas</h2>
        {tarefas.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            Nenhuma tarefa agendada. Use o botão 📝 em qualquer cliente para criar uma.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {tarefas.map((e: any) => {
              const urgente = e.dias_para_evento <= 3;
              return (
                <div key={e.id} className={`px-5 py-3 flex items-center justify-between gap-4 ${urgente ? "bg-red-50/40" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{e.descricao}</p>
                    {e.nome_cliente && <p className="text-xs text-slate-400">{e.nome_cliente}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{fmtDate(e.data)}</p>
                    <p className={`text-xs font-semibold ${urgente ? "text-red-600" : "text-slate-500"}`}>
                      {e.dias_para_evento === 0 ? "Hoje!" : `${e.dias_para_evento}d`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => concluir(e.id)}
                      className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
                    >
                      Concluir
                    </button>
                    <button
                      onClick={() => deletar(e.id)}
                      className="text-xs text-slate-300 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outros alertas */}
      {outrosAlertas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">📌 Outros alertas</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {outrosAlertas.map((e: any) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{e.descricao}</p>
                  {e.nome_cliente && <p className="text-xs text-slate-400">{e.nome_cliente}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">{fmtDate(e.data)}</p>
                  <p className="text-xs font-semibold text-slate-500">{e.dias_para_evento}d</p>
                </div>
                <button onClick={() => deletar(e.id)} className="text-xs text-slate-300 hover:text-red-500 transition-colors">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
