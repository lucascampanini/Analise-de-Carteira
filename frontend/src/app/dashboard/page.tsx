"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getClientes, getEventosProximos, getReunioes, getOfertas, getAllClientesOfertas, getLeads, getPosicoes,
} from "@/lib/firestore";
import { brl } from "@/lib/formatters";
import { Users, TrendingUp, Calendar, CheckSquare, Target, Briefcase } from "lucide-react";

const STATUS_COR: Record<string, string> = {
  PENDENTE:     "bg-slate-100 text-slate-600",
  WHATSAPP:     "bg-blue-100 text-blue-700",
  RESERVADO:    "bg-amber-100 text-amber-700",
  PUSH_ENVIADO: "bg-violet-100 text-violet-700",
  FINALIZADO:   "bg-emerald-100 text-emerald-700",
  CANCELADO:    "bg-red-100 text-red-700",
};

const ESTAGIOS = ["PROSPECTO", "CONTATO", "PROPOSTA", "CLIENTE"] as const;
const ESTAGIO_COR: Record<string, string> = {
  PROSPECTO: "bg-slate-100 text-slate-600",
  CONTATO:   "bg-blue-100 text-blue-700",
  PROPOSTA:  "bg-amber-100 text-amber-700",
  CLIENTE:   "bg-emerald-100 text-emerald-700",
};

// Agrupa posições de todos os clientes por nome do ativo e retorna top N por valor
function top20PorClasse(posicoes: any[], classes: string[], top = 20) {
  const agg: Record<string, { ativo: string; valor: number; nClientes: Set<string>; classe: string }> = {};
  for (const p of posicoes) {
    if (!classes.includes(p.classe)) continue;
    const key = (p.ativo || "—").trim();
    if (!agg[key]) agg[key] = { ativo: key, valor: 0, nClientes: new Set(), classe: p.classe };
    agg[key].valor += p.valor || 0;
    agg[key].nClientes.add(p.codigo_conta);
  }
  return Object.values(agg)
    .map((x) => ({ ...x, nClientes: x.nClientes.size }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, top);
}

function PainelTop20({ titulo, cor, itens, total }: { titulo: string; cor: string; itens: any[]; total: number }) {
  if (itens.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-semibold text-slate-800 mb-3">{titulo}</h3>
      <p className="text-slate-400 text-sm text-center py-6">Sem posições importadas</p>
    </div>
  );
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{titulo}</h3>
        <span className="text-xs text-slate-400">{brl(total)}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {itens.map((item, i) => {
          const pct = total > 0 ? (item.valor / total) * 100 : 0;
          return (
            <div key={item.ativo} className="px-5 py-2 flex items-center gap-3">
              <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-800 truncate">{item.ativo}</span>
                  <span className="text-xs font-bold text-slate-700 shrink-0">{brl(item.valor)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right shrink-0">{pct.toFixed(1)}%</span>
                  <span className="text-xs text-slate-300 w-14 text-right shrink-0">{item.nClientes} cli.</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [clientes, setClientes]   = useState<any[]>([]);
  const [tarefas,  setTarefas]    = useState<any[]>([]);
  const [reunioes, setReunioes]   = useState<any[]>([]);
  const [ofertas,  setOfertas]    = useState<any[]>([]);
  const [ocItems,  setOcItems]    = useState<any[]>([]);
  const [leads,    setLeads]      = useState<any[]>([]);
  const [posicoes, setPosicoes]   = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    Promise.all([
      getClientes(uid),
      getEventosProximos(uid, 365),
      getReunioes(uid, 30),
      getOfertas(uid),
      getAllClientesOfertas(uid),
      getLeads(uid),
      getPosicoes(uid),
    ]).then(([cls, evts, reuns, ofs, oc, ls, pos]) => {
      setClientes(cls);
      setTarefas(evts.filter((e: any) => e.tipo === "TAREFA"));
      setReunioes(reuns);
      setOfertas(ofs);
      setOcItems(oc);
      setLeads(ls);
      setPosicoes(pos);
    });
  }, [user]);

  const totalNet   = clientes.reduce((s, c) => s + (c.net || 0), 0);
  const leadsAtivos = leads.filter((l) => l.estagio !== "CLIENTE").length;

  const kpis = [
    { label: "Clientes",      value: clientes.length, icon: Users,      color: "bg-blue-600"    },
    { label: "AuM total",     value: brl(totalNet),   icon: TrendingUp, color: "bg-emerald-600" },
    { label: "Reuniões (30d)",value: reunioes.length, icon: Calendar,   color: "bg-violet-600"  },
    { label: "Tarefas abertas",value: tarefas.length, icon: CheckSquare,color: tarefas.length > 0 ? "bg-amber-500" : "bg-slate-400" },
    { label: "Leads ativos",  value: leadsAtivos,     icon: Target,     color: "bg-cyan-600"    },
    { label: "Ofertas",       value: ofertas.length,  icon: Briefcase,  color: "bg-pink-600"    },
  ];

  // Calcular métricas das ofertas
  const ofertasComMetricas = ofertas.map((o) => {
    const items = ocItems.filter((x) => x.oferta_id === o.id);
    const confirmados = items.filter((x) =>
      ["FINALIZADO", "RESERVADO"].includes(x.status)
    );
    const total_ofertado    = items.reduce((s, x) => s + (x.valor_ofertado || 0), 0);
    const total_confirmado  = confirmados.reduce((s, x) => s + (x.valor_ofertado || 0), 0);
    const receita_confirmada = (total_confirmado * (o.roa || 0)) / 100;
    const receita_em_aberto  = ((total_ofertado - total_confirmado) * (o.roa || 0)) / 100;
    const por_status: Record<string, number> = {};
    items.forEach((x) => { por_status[x.status] = (por_status[x.status] || 0) + 1; });
    return {
      ...o,
      total_clientes: items.length,
      total_ofertado,
      total_confirmado,
      receita_confirmada,
      receita_em_aberto,
      por_status,
    };
  });

  // Leads por estágio
  const leadsPorEstagio = ESTAGIOS.map((e) => ({
    estagio: e,
    count: leads.filter((l) => l.estagio === e).length,
    valor: leads.filter((l) => l.estagio === e).reduce((s, l) => s + (l.valor_potencial || 0), 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral da sua carteira de clientes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`${k.color} p-2.5 rounded-lg shrink-0`}>
              <k.icon className="text-white" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">{k.label}</p>
              <p className="text-lg font-bold text-slate-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Leads por estágio */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Pipeline de Leads</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {leadsPorEstagio.map(({ estagio, count, valor }) => (
              <div key={estagio} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTAGIO_COR[estagio]}`}>
                    {estagio}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{count} lead{count !== 1 ? "s" : ""}</span>
                </div>
                {valor > 0 && (
                  <span className="text-sm font-semibold text-slate-700">{brl(valor)}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tarefas próximas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Próximas Tarefas</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {tarefas.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Nenhuma tarefa aberta</p>
            ) : (
              tarefas.slice(0, 10).map((t: any) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{t.descricao}</p>
                    {t.nome_cliente && <p className="text-xs text-slate-400">{t.nome_cliente}</p>}
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${
                    t.dias_para_evento <= 3 ? "text-red-600" : "text-slate-500"
                  }`}>
                    {t.dias_para_evento === 0 ? "Hoje" : `${t.dias_para_evento}d`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top 20 por classe */}
      {posicoes.length > 0 && (() => {
        const topFII    = top20PorClasse(posicoes, ["FII"]);
        const topAcoes  = top20PorClasse(posicoes, ["Renda Variável"]);
        const topFundos = top20PorClasse(posicoes, ["Fundos", "Previdência"]);
        const topRF     = top20PorClasse(posicoes, ["Renda Fixa"]);
        const totalFII    = topFII.reduce((s, x) => s + x.valor, 0);
        const totalAcoes  = topAcoes.reduce((s, x) => s + x.valor, 0);
        const totalFundos = topFundos.reduce((s, x) => s + x.valor, 0);
        const totalRF     = topRF.reduce((s, x) => s + x.valor, 0);
        return (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-800">Top 20 Posições por Classe</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <PainelTop20 titulo="🏢 FII — Fundos Imobiliários" cor="#10b981" itens={topFII} total={totalFII} />
              <PainelTop20 titulo="📈 Ações / RV" cor="#8b5cf6" itens={topAcoes} total={totalAcoes} />
              <PainelTop20 titulo="💼 Fundos & Previdência" cor="#f59e0b" itens={topFundos} total={totalFundos} />
              <PainelTop20 titulo="🏦 Renda Fixa" cor="#3b82f6" itens={topRF} total={totalRF} />
            </div>
          </div>
        );
      })()}

      {/* Resumo das Ofertas */}
      {ofertasComMetricas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Resumo das Ofertas</h2>
            <p className="text-xs text-slate-400 mt-0.5">{ofertas.length} oferta{ofertas.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {ofertasComMetricas.map((o: any) => {
              const pct = o.total_ofertado > 0
                ? Math.round((o.total_confirmado / o.total_ofertado) * 100)
                : 0;
              return (
                <div key={o.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-800">{o.nome}</p>
                    {o.data_liquidacao && (
                      <span className="text-xs text-slate-400">Liq. {o.data_liquidacao}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Confirmado: <strong className="text-emerald-600">{brl(o.total_confirmado)}</strong></span>
                      <span>{pct}% de {brl(o.total_ofertado)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-slate-400">Clientes</p>
                      <p className="text-sm font-bold text-slate-800">{o.total_clientes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">ROA</p>
                      <p className="text-sm font-bold text-slate-800">{o.roa || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Rec. confirmada</p>
                      <p className="text-sm font-bold text-emerald-600">{brl(o.receita_confirmada)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Rec. em aberto</p>
                      <p className="text-sm font-bold text-violet-600">{brl(o.receita_em_aberto)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(o.por_status as Record<string, number>).map(([s, n]) => (
                        <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[s] || "bg-slate-100 text-slate-600"}`}>
                          {s.replace("_", " ")} · {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
