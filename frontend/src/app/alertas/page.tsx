"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDataRefresh } from "@/contexts/DataRefreshContext";
import { getEventosProximos, concluirEvento, deleteEvento, getPosicoes, getClientes } from "@/lib/firestore";
import { fmtDate, brl } from "@/lib/formatters";

function getVencimentosRF(posicoes: any[], clientes: any[], dias = 30) {
  const hoje   = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);

  const clienteMap: Record<string, string> = {};
  clientes.forEach((c) => { clienteMap[c.codigo_conta] = c.nome; });

  // Inclui qualquer posição com data_vencimento no período — não só RF classificada
  // Isso garante que RF mal-classificada (Outros) também apareça
  const ehRF = (p: any) => {
    if (p.classe === "Renda Fixa") return true;
    if (p.classe === "Outros" && p.data_vencimento) return true;
    const a = (p.ativo || "").toLowerCase();
    return a.includes("cdb") || a.includes("lci") || a.includes("lca")
      || a.includes("cri") || a.includes("cra") || a.includes("tesouro")
      || a.includes("debentur") || a.includes("letras");
  };

  return posicoes
    .filter((p) => {
      if (!p.data_vencimento) return false;
      if (!ehRF(p)) return false;
      const venc = new Date(p.data_vencimento + "T00:00:00");
      return venc >= hoje && venc <= limite;
    })
    .map((p) => {
      const venc = new Date(p.data_vencimento + "T00:00:00");
      const dias_para_venc = Math.ceil((venc.getTime() - hoje.getTime()) / 86400000);
      return {
        ...p,
        nome_cliente: clienteMap[p.codigo_conta] || p.codigo_conta,
        dias_para_venc,
        venc,
      };
    })
    .sort((a, b) => a.venc.getTime() - b.venc.getTime());
}

export default function AlertasPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [eventos,   setEventos]   = useState<any[]>([]);
  const [posicoes,  setPosicoes]  = useState<any[]>([]);
  const [clientes,  setClientes]  = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const [evts, pos, cls] = await Promise.all([
      getEventosProximos(user.uid, 365).catch(() => []),
      getPosicoes(user.uid).catch(() => []),
      getClientes(user.uid).catch(() => []),
    ]);
    setEventos(evts);
    setPosicoes(pos);
    setClientes(cls);
  };

  useEffect(() => { load(); }, [user, refreshKey]);

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
  const vencimentosRF = getVencimentosRF(posicoes, clientes, 30);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Central de Alertas</h1>
        <p className="text-slate-500 text-sm">
          {eventos.length} evento{eventos.length !== 1 ? "s" : ""} aberto{eventos.length !== 1 ? "s" : ""}
          {vencimentosRF.length > 0 && ` · ${vencimentosRF.length} vencimento${vencimentosRF.length !== 1 ? "s" : ""} de RF nos próximos 30 dias`}
        </p>
      </div>

      {/* Vencimentos RF */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          🔔 Vencimentos de Renda Fixa — próximos 30 dias
        </h2>
        {vencimentosRF.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            Nenhum vencimento de RF nos próximos 30 dias.
            {posicoes.filter(p => p.classe === "Renda Fixa" && p.data_vencimento).length === 0 && (
              <p className="text-xs mt-1 text-slate-300">Reimporte o Diversificador para carregar datas de vencimento.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {vencimentosRF.map((p, i) => {
              const urgente  = p.dias_para_venc <= 7;
              const atencao  = p.dias_para_venc <= 15;
              const corBg    = urgente ? "bg-red-50/40" : atencao ? "bg-amber-50/30" : "";
              const corDias  = urgente ? "text-red-600" : atencao ? "text-amber-600" : "text-slate-500";
              const corBadge = urgente ? "bg-red-100 text-red-700" : atencao ? "bg-amber-100 text-amber-700" : "bg-[#f5e8e7] text-svn-ruby";
              return (
                <div key={i} className={`px-5 py-3 flex items-center justify-between gap-4 ${corBg}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.ativo}</p>
                    <p className="text-xs text-slate-400">
                      {p.nome_cliente} · {p.codigo_conta}
                      {p.gestora && <span className="ml-1 text-slate-500">· {p.gestora}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{fmtDate(p.data_vencimento)}</p>
                    <p className={`text-xs font-semibold ${corDias}`}>
                      {p.dias_para_venc === 0 ? "Vence hoje!" : `${p.dias_para_venc}d`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className="text-sm font-bold text-slate-800">{brl(p.valor)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corBadge}`}>
                      {urgente ? "Urgente" : atencao ? "Atenção" : "Próximo"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                    <button onClick={() => concluir(e.id)}
                      className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200 transition-colors font-medium">
                      Concluir
                    </button>
                    <button onClick={() => deletar(e.id)}
                      className="text-xs text-slate-300 hover:text-red-500 transition-colors">✕</button>
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
