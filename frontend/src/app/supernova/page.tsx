"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDataRefresh } from "@/contexts/DataRefreshContext";
import {
  getClientes, getAllAnotacoes, addAnotacao,
  getSupernovaConfig, setSupernovaConfig,
} from "@/lib/firestore";
import { brl } from "@/lib/formatters";
import { ModalNota } from "@/components/ui/ModalNota";

// ── Configuração de tiers ─────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  a1_min: 1_000_000,
  a2_min: 300_000,
  b_min:  100_000,
  cadencia: { A1: 30, A2: 60, B: 90, C: 180 },
};

type Tier = "A1" | "A2" | "B" | "C";
type StatusContato = "ok" | "atencao" | "atrasado" | "nunca";

const TIER_META: Record<Tier, { badge: string; bg: string; ring: string; cor: string }> = {
  A1: { badge: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-400", cor: "bg-emerald-500" },
  A2: { badge: "bg-blue-100 text-blue-700",       bg: "bg-blue-50",     ring: "ring-blue-400",    cor: "bg-blue-500"    },
  B:  { badge: "bg-amber-100 text-amber-700",     bg: "bg-amber-50",    ring: "ring-amber-400",   cor: "bg-amber-400"   },
  C:  { badge: "bg-slate-100 text-slate-500",     bg: "bg-slate-50",    ring: "ring-slate-300",   cor: "bg-slate-400"   },
};

const STATUS_META: Record<StatusContato, { label: string; cor: string }> = {
  ok:       { label: "Em dia",      cor: "bg-emerald-100 text-emerald-700" },
  atencao:  { label: "Atenção",     cor: "bg-amber-100 text-amber-700"     },
  atrasado: { label: "Atrasado",    cor: "bg-red-100 text-red-700"         },
  nunca:    { label: "Sem contato", cor: "bg-slate-100 text-slate-500"     },
};

const TIPOS_CONTATO = ["LIGACAO", "REUNIAO", "EMAIL", "WHATSAPP"];

function classificarTier(net: number, cfg: typeof DEFAULT_CONFIG): Tier {
  if (net >= cfg.a1_min) return "A1";
  if (net >= cfg.a2_min) return "A2";
  if (net >= cfg.b_min)  return "B";
  return "C";
}

function calcularStatus(dias: number | null, cadencia: number): StatusContato {
  if (dias === null) return "nunca";
  if (dias > cadencia) return "atrasado";
  if (dias > cadencia * 0.75) return "atencao";
  return "ok";
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function SupernovaPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();

  const [clientes,  setClientes]  = useState<any[]>([]);
  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [config,    setConfig]    = useState(DEFAULT_CONFIG);
  const [loading,   setLoading]   = useState(true);

  const [filtroTier,   setFiltroTier]   = useState<Tier | "TODOS">("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<StatusContato | "TODOS">("TODOS");
  const [busca,        setBusca]        = useState("");
  const [showConfig,   setShowConfig]   = useState(false);
  const [modalNota,    setModalNota]    = useState<{ conta: string; nome: string } | null>(null);
  const [salvandoContato, setSalvandoContato] = useState<string | null>(null);

  const [cfgForm, setCfgForm] = useState({
    a1_min: "", a2_min: "", b_min: "",
    cad_a1: "", cad_a2: "", cad_b: "", cad_c: "",
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cls, anots, cfg] = await Promise.all([
      getClientes(user.uid),
      getAllAnotacoes(user.uid),
      getSupernovaConfig(user.uid),
    ]);
    setClientes(cls);
    setAnotacoes(anots);
    if (cfg) setConfig({ ...DEFAULT_CONFIG, ...cfg, cadencia: { ...DEFAULT_CONFIG.cadencia, ...(cfg.cadencia || {}) } });
    setLoading(false);
  }, [user, refreshKey]);

  useEffect(() => { load(); }, [load]);

  // ── Último contato por cliente ────────────────────────────────────────────
  const diasSemContato: Record<string, number | null> = {};
  const hoje = Date.now();
  const porConta: Record<string, number> = {};

  anotacoes
    .filter(a => TIPOS_CONTATO.includes(a.tipo) && a.codigo_conta && a.criado_em?.seconds)
    .forEach(a => {
      const ts = a.criado_em.seconds * 1000;
      if (!porConta[a.codigo_conta] || ts > porConta[a.codigo_conta]) {
        porConta[a.codigo_conta] = ts;
      }
    });

  clientes.forEach(c => {
    const ultimo = porConta[c.codigo_conta];
    diasSemContato[c.codigo_conta] = ultimo
      ? Math.floor((hoje - ultimo) / 86_400_000)
      : null;
  });

  // ── Enriquecer clientes ───────────────────────────────────────────────────
  const enriched = clientes.map(c => {
    const tier     = classificarTier(c.net || 0, config);
    const cadencia = config.cadencia[tier];
    const dias     = diasSemContato[c.codigo_conta] ?? null;
    const status   = calcularStatus(dias, cadencia);
    return { ...c, tier, cadencia, dias, status };
  });

  // ── KPIs por tier ─────────────────────────────────────────────────────────
  const kpis = (["A1", "A2", "B", "C"] as Tier[]).map(tier => {
    const grupo    = enriched.filter(c => c.tier === tier);
    const emDia    = grupo.filter(c => c.status === "ok").length;
    const atrasado = grupo.filter(c => c.status === "atrasado" || c.status === "nunca").length;
    const compliance = grupo.length > 0 ? Math.round((emDia / grupo.length) * 100) : 100;
    return { tier, total: grupo.length, emDia, atrasado, compliance };
  });

  const totalAtrasados = kpis.reduce((s, k) => s + k.atrasado, 0);
  const complianceGeral = clientes.length > 0
    ? Math.round((kpis.reduce((s, k) => s + k.emDia, 0) / clientes.length) * 100)
    : 100;

  // ── Filtros e ordenação ───────────────────────────────────────────────────
  let lista = enriched;
  if (filtroTier   !== "TODOS") lista = lista.filter(c => c.tier === filtroTier);
  if (filtroStatus !== "TODOS") lista = lista.filter(c => c.status === filtroStatus);
  if (busca) lista = lista.filter(c =>
    (c.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
    String(c.codigo_conta).includes(busca)
  );

  const ordemStatus: Record<StatusContato, number> = { atrasado: 0, nunca: 1, atencao: 2, ok: 3 };
  lista = [...lista].sort((a, b) => {
    const oa = ordemStatus[a.status as StatusContato] ?? 4;
    const ob = ordemStatus[b.status as StatusContato] ?? 4;
    if (oa !== ob) return oa - ob;
    return (b.dias ?? 9999) - (a.dias ?? 9999);
  });

  // ── Ações ─────────────────────────────────────────────────────────────────
  const registrarContato = async (conta: string) => {
    if (!user) return;
    setSalvandoContato(conta);
    await addAnotacao(user.uid, conta, "LIGACAO", "Contato registrado via Supernova");
    await load();
    setSalvandoContato(null);
  };

  const abrirConfig = () => {
    setCfgForm({
      a1_min: String(config.a1_min),
      a2_min: String(config.a2_min),
      b_min:  String(config.b_min),
      cad_a1: String(config.cadencia.A1),
      cad_a2: String(config.cadencia.A2),
      cad_b:  String(config.cadencia.B),
      cad_c:  String(config.cadencia.C),
    });
    setShowConfig(true);
  };

  const salvarConfig = async () => {
    if (!user) return;
    const novo = {
      a1_min: parseFloat(cfgForm.a1_min) || DEFAULT_CONFIG.a1_min,
      a2_min: parseFloat(cfgForm.a2_min) || DEFAULT_CONFIG.a2_min,
      b_min:  parseFloat(cfgForm.b_min)  || DEFAULT_CONFIG.b_min,
      cadencia: {
        A1: parseInt(cfgForm.cad_a1) || DEFAULT_CONFIG.cadencia.A1,
        A2: parseInt(cfgForm.cad_a2) || DEFAULT_CONFIG.cadencia.A2,
        B:  parseInt(cfgForm.cad_b)  || DEFAULT_CONFIG.cadencia.B,
        C:  parseInt(cfgForm.cad_c)  || DEFAULT_CONFIG.cadencia.C,
      },
    };
    await setSupernovaConfig(user.uid, novo);
    setConfig(novo);
    setShowConfig(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-svn-ruby" />
    </div>
  );

  const corCompliance = (p: number) =>
    p >= 80 ? "text-emerald-600" : p >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {modalNota && (
        <ModalNota
          codigoConta={modalNota.conta}
          nomeCliente={modalNota.nome}
          onClose={() => setModalNota(null)}
          onSaved={load}
        />
      )}

      {/* Modal de configuração */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <h2 className="font-bold text-slate-800 text-lg">Configurar Tiers Supernova</h2>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Patrimônio mínimo por tier (R$)
              </p>
              <div className="space-y-2">
                {([
                  ["A1 — NET mínimo", "a1_min"],
                  ["A2 — NET mínimo", "a2_min"],
                  ["B — NET mínimo",  "b_min" ],
                ] as [string, keyof typeof cfgForm][]).map(([label, key]) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-600 w-40 shrink-0">{label}</label>
                    <input type="number" value={cfgForm[key]}
                      onChange={e => setCfgForm(p => ({ ...p, [key]: e.target.value }))}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby" />
                  </div>
                ))}
                <p className="text-xs text-slate-400 pt-1">C = abaixo do mínimo de B</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Cadência de contato (dias)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Tier A1", "cad_a1"],
                  ["Tier A2", "cad_a2"],
                  ["Tier B",  "cad_b" ],
                  ["Tier C",  "cad_c" ],
                ] as [string, keyof typeof cfgForm][]).map(([label, key]) => (
                  <div key={key}>
                    <label className="text-xs text-slate-500 block mb-1">{label}</label>
                    <input type="number" value={cfgForm[key]}
                      onChange={e => setCfgForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={salvarConfig}
                className="flex-1 bg-svn-ruby text-white py-2 rounded-lg font-medium hover:bg-svn-ruby-dark transition-colors">
                Salvar
              </button>
              <button onClick={() => setShowConfig(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Método Supernova</h1>
          <p className="text-slate-500 text-sm">
            {clientes.length} clientes
            {totalAtrasados > 0 && (
              <span className="text-red-500 font-medium"> · {totalAtrasados} precisam de contato</span>
            )}
            {" · "}compliance geral:
            <span className={`font-semibold ml-1 ${corCompliance(complianceGeral)}`}>
              {complianceGeral}%
            </span>
          </p>
        </div>
        <button onClick={abrirConfig}
          className="text-sm border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shrink-0">
          ⚙ Configurar tiers
        </button>
      </div>

      {/* KPI cards por tier */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const meta   = TIER_META[k.tier];
          const ativo  = filtroTier === k.tier;
          return (
            <div key={k.tier}
              onClick={() => setFiltroTier(ativo ? "TODOS" : k.tier)}
              className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                ativo ? `ring-2 ${meta.ring} border-transparent` : "border-slate-200 hover:border-slate-300"
              }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
                  Tier {k.tier}
                </span>
                <span className="text-xs text-slate-400">{config.cadencia[k.tier]}d</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{k.total}</p>
              <p className="text-xs text-slate-500 mb-3">clientes</p>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Compliance</span>
                  <span className={`font-semibold ${corCompliance(k.compliance)}`}>{k.compliance}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    k.compliance >= 80 ? "bg-emerald-500" : k.compliance >= 60 ? "bg-amber-400" : "bg-red-500"
                  }`} style={{ width: `${k.compliance}%` }} />
                </div>
                {k.atrasado > 0 && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{k.atrasado} em atraso</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Filtros */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="min-w-[160px] flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby" />

          <div className="flex gap-1.5 flex-wrap">
            {(["TODOS", "atrasado", "nunca", "atencao", "ok"] as const).map(s => (
              <button key={s}
                onClick={() => setFiltroStatus(s === filtroStatus ? "TODOS" : s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filtroStatus === s
                    ? "bg-svn-ruby text-white border-svn-ruby"
                    : "bg-white text-slate-600 border-slate-200 hover:border-svn-ruby hover:text-svn-ruby"
                }`}>
                {s === "TODOS" ? "Todos" : STATUS_META[s].label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 shrink-0">{lista.length} clientes</span>
        </div>

        {lista.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-12">Nenhum cliente encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-center">Tier</th>
                  <th className="hidden md:table-cell px-4 py-3 text-right">NET</th>
                  <th className="px-4 py-3 text-center">Último contato</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lista.map(c => {
                  const meta   = TIER_META[c.tier as Tier];
                  const sMeta  = STATUS_META[c.status as StatusContato];
                  const pct    = c.dias !== null ? Math.min(Math.round((c.dias / c.cadencia) * 100), 100) : 100;
                  const salvando = salvandoContato === c.codigo_conta;
                  return (
                    <tr key={c.codigo_conta}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        c.status === "atrasado" ? "bg-red-50/20" : c.status === "nunca" ? "bg-slate-50/40" : ""
                      }`}>

                      {/* Nome */}
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800 truncate max-w-[180px]">{c.nome}</p>
                        <p className="text-xs text-slate-400 font-mono">{c.codigo_conta}</p>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
                          {c.tier}
                        </span>
                      </td>

                      {/* NET */}
                      <td className="hidden md:table-cell px-4 py-3 text-right text-slate-600 text-xs font-medium whitespace-nowrap">
                        {brl(c.net || 0)}
                      </td>

                      {/* Último contato + barra de progresso */}
                      <td className="px-4 py-3 text-center min-w-[130px]">
                        {c.dias !== null ? (
                          <div>
                            <p className={`text-xs font-semibold ${
                              c.status === "atrasado" ? "text-red-600" :
                              c.status === "atencao"  ? "text-amber-600" : "text-slate-600"
                            }`}>
                              {c.dias === 0 ? "Hoje" : `${c.dias}d atrás`}
                            </p>
                            <div className="mt-1.5 h-1.5 w-24 mx-auto bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${
                                pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-emerald-500"
                              }`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">/{c.cadencia}d</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Nunca registrado</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${sMeta.cor}`}>
                          {sMeta.label}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => registrarContato(c.codigo_conta)}
                            disabled={salvando}
                            className="text-xs bg-[#f5e8e7] text-svn-ruby px-2.5 py-1 rounded-lg hover:bg-svn-ruby hover:text-white disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
                            title="Registrar contato rápido (ligação)">
                            {salvando ? "..." : "☎ Contatei"}
                          </button>
                          <button
                            onClick={() => setModalNota({ conta: c.codigo_conta, nome: c.nome })}
                            className="text-xs border border-slate-200 text-slate-500 px-2 py-1 rounded-lg hover:border-svn-ruby hover:text-svn-ruby transition-colors"
                            title="Anotação / tarefa / reunião">
                            📝
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Legenda de tiers</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["A1", "A2", "B", "C"] as Tier[]).map(tier => {
            const meta = TIER_META[tier];
            const minNet = tier === "A1" ? config.a1_min : tier === "A2" ? config.a2_min : tier === "B" ? config.b_min : 0;
            const maxNet = tier === "A1" ? null : tier === "A2" ? config.a1_min : tier === "B" ? config.a2_min : config.b_min;
            return (
              <div key={tier} className={`rounded-lg p-3 ${meta.bg}`}>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>Tier {tier}</span>
                <p className="text-xs text-slate-600 mt-2">
                  {maxNet ? `${brl(minNet)} – ${brl(maxNet)}` : `≥ ${brl(minNet)}`}
                </p>
                <p className="text-xs text-slate-500">Contato a cada <strong>{config.cadencia[tier]}d</strong></p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
