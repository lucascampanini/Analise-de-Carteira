"use client";
import { useEffect, useState } from "react";
import { getVencimentos, getEventosProximos } from "@/lib/api";
import { brl, fmtDate, diasAte, urgenciaCor, urgenciaBg } from "@/lib/formatters";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const TIPO_ICON: Record<string, string> = {
  TAREFA:          "✅",
  ANIVERSARIO:     "🎂",
  LIQUIDACAO:      "💰",
  JANELA_RESGATE:  "🔓",
  RESGATE_FUNDO:   "📤",
  OUTROS:          "📌",
  REUNIAO_AGENDADA:"🤝",
};

export default function AlertasPage() {
  const [vencimentos, setVencimentos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);

  const load = async () => {
    const [v, e] = await Promise.allSettled([
      getVencimentos(180),
      getEventosProximos(90),
    ]);
    setVencimentos(v.status === "fulfilled" ? v.value : []);
    setEventos(e.status === "fulfilled" ? e.value : []);
  };

  useEffect(() => { load(); }, []);

  const concluir = async (id: string) => {
    await fetch(`${API}/assistente/eventos/${id}/concluir`, { method: "PATCH" });
    load();
  };

  const deletar = async (id: string) => {
    if (!confirm("Remover este alerta?")) return;
    await fetch(`${API}/assistente/eventos/${id}`, { method: "DELETE" });
    load();
  };

  // Vencimentos RF por urgência
  const criticos = vencimentos.filter((v: any) => diasAte(v.vencimento) <= 30);
  const atencao  = vencimentos.filter((v: any) => { const d = diasAte(v.vencimento); return d > 30 && d <= 90; });
  const ok       = vencimentos.filter((v: any) => diasAte(v.vencimento) > 90);

  // Tarefas e outros alertas (excluindo vencimentos RF que já aparecem acima)
  const tarefas = eventos.filter((e: any) => e.tipo === "TAREFA");
  const outrosAlertas = eventos.filter((e: any) =>
    !["VENCIMENTO_RF", "TAREFA"].includes(e.tipo)
  );

  const GrupoVenc = ({ titulo, cor, items }: { titulo: string; cor: string; items: any[] }) =>
    items.length === 0 ? null : (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${cor}`} />
          <h3 className="font-semibold text-slate-800">{titulo}</h3>
          <span className="ml-auto text-xs text-slate-500">{items.length} posições</span>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((v: any, i: number) => {
            const dias = diasAte(v.vencimento);
            return (
              <div key={i} className={`px-5 py-3 flex items-center justify-between ${urgenciaBg(dias)}`}>
                <div>
                  <p className="text-sm font-medium text-slate-800">{v.cliente || v.conta}</p>
                  <p className="text-xs text-slate-500">{v.tipo} · {v.emissor || v.ativo || "—"}</p>
                  <p className="text-xs text-slate-400">Conta: {v.conta}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{brl(v.valor)}</p>
                  <p className={`text-xs ${urgenciaCor(dias)}`}>{fmtDate(v.vencimento)}</p>
                  <p className={`text-xs font-semibold ${urgenciaCor(dias)}`}>{dias} dias</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Central de Alertas</h1>
        <p className="text-slate-500 text-sm">
          {tarefas.length + outrosAlertas.length} tarefa{tarefas.length + outrosAlertas.length !== 1 ? "s" : ""} · {vencimentos.length} vencimentos de RF
        </p>
      </div>

      {/* ── Tarefas agendadas ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">✅ Tarefas agendadas</h2>
        {tarefas.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            Nenhuma tarefa agendada. Use o botão 📝 em qualquer cliente para criar uma.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {tarefas.map((e: any) => {
              const dias = e.dias_para_evento;
              const urgente = dias <= 3;
              return (
                <div key={e.id} className={`px-5 py-3 flex items-center justify-between gap-4 ${urgente ? "bg-red-50/40" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{e.descricao}</p>
                    {e.cliente && <p className="text-xs text-slate-400">{e.cliente}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{fmtDate(e.data)}</p>
                    <p className={`text-xs font-semibold ${urgente ? "text-red-600" : "text-slate-500"}`}>
                      {dias === 0 ? "Hoje!" : `${dias}d`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => concluir(e.id)}
                      className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
                      title="Marcar como concluída"
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

      {/* ── Outros alertas (aniversários, liquidações etc.) ── */}
      {outrosAlertas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">📌 Outros alertas</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {outrosAlertas.map((e: any) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-lg shrink-0">{TIPO_ICON[e.tipo] || "📌"}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{e.descricao}</p>
                    {e.cliente && <p className="text-xs text-slate-400">{e.cliente}</p>}
                  </div>
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

      {/* ── Vencimentos de RF ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">📄 Vencimentos de Renda Fixa</h2>
        <GrupoVenc titulo="Crítico — vence em até 30 dias"  cor="bg-red-500"   items={criticos} />
        <GrupoVenc titulo="Atenção — vence em 30 a 90 dias" cor="bg-amber-500" items={atencao}  />
        <GrupoVenc titulo="OK — vence em mais de 90 dias"   cor="bg-green-500" items={ok}       />
        {vencimentos.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            Nenhum vencimento encontrado. Importe o Diversificador primeiro.
          </div>
        )}
      </div>
    </div>
  );
}
