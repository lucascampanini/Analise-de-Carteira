import {
  getClientes,
  getVencimentos,
  getEventosProximos,
  getReunioes,
  getResumoProduto,
  getExposicaoRfFundos,
  getExposicaoRv,
  getOfertas,
} from "@/lib/api";
import { brl, diasAte } from "@/lib/formatters";
import { Users, TrendingUp, AlertTriangle, Calendar, CheckSquare } from "lucide-react";

export const dynamic = "force-dynamic";

const CLASSE_COR: Record<string, string> = {
  "Renda Fixa":    "bg-blue-500",
  "Ações":         "bg-emerald-500",
  "FII":           "bg-violet-500",
  "ETF":           "bg-cyan-500",
  "Fundo RF":      "bg-blue-300",
  "Fundo Multim.": "bg-amber-500",
  "Fundo Ações":   "bg-emerald-300",
  "Previdência":   "bg-pink-500",
};

const STATUS_COR: Record<string, string> = {
  PENDENTE:     "bg-slate-100 text-slate-600",
  WHATSAPP:     "bg-blue-100 text-blue-700",
  RESERVADO:    "bg-amber-100 text-amber-700",
  PUSH_ENVIADO: "bg-violet-100 text-violet-700",
  FINALIZADO:   "bg-emerald-100 text-emerald-700",
};

function PainelTop20({
  titulo,
  items,
  totalProd,
  vazio = "Importe o Diversificador.",
}: {
  titulo: string;
  items: { label: string; sublabel: string; total: number }[];
  totalProd: number;
  vazio?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">{titulo}</h2>
        <p className="text-xs text-slate-400 mt-0.5">top 20 · exposição consolidada</p>
      </div>
      <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">{vazio}</p>
        ) : (
          items.map((item, i) => {
            const pct = totalProd > 0 ? (item.total / totalProd * 100).toFixed(1) : "0.0";
            return (
              <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-slate-300 w-5 shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
                    <p className="text-xs text-slate-400 truncate">{item.sublabel}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{brl(item.total)}</p>
                  <p className="text-xs text-slate-400">{pct}%</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [clientes, vencimentos, eventos, reunioes, resumo, rfFundos, rv, ofertas] =
    await Promise.allSettled([
      getClientes(),
      getVencimentos(180),
      getEventosProximos(365),
      getReunioes(30),
      getResumoProduto(),
      getExposicaoRfFundos(),
      getExposicaoRv(),
      getOfertas(),
    ]);

  const cls      = clientes.status    === "fulfilled" ? clientes.value    : [];
  const vencs    = vencimentos.status === "fulfilled" ? vencimentos.value : [];
  const evts     = eventos.status     === "fulfilled" ? eventos.value     : [];
  const reuns    = reunioes.status    === "fulfilled" ? reunioes.value    : [];
  const prod     = resumo.status      === "fulfilled" ? resumo.value      : [];
  const rfData   = rfFundos.status    === "fulfilled" ? rfFundos.value    : [];
  const rvData   = rv.status          === "fulfilled" ? rv.value          : [];
  const ofData   = ofertas.status     === "fulfilled" ? ofertas.value     : [];

  const totalNet = cls.reduce((s: number, c: any) => s + (c.net || 0), 0);
  const vencs30  = vencs.filter((v: any) => diasAte(v.vencimento) <= 30);
  const tarefas  = evts.filter((e: any) => e.tipo === "TAREFA");
  const totalProd = prod.reduce((s: number, p: any) => s + p.valor, 0);

  const kpis = [
    { label: "Clientes ativos",  value: cls.length,     icon: Users,         color: "bg-blue-600"    },
    { label: "AuM total",        value: brl(totalNet),  icon: TrendingUp,    color: "bg-emerald-600" },
    { label: "Vencimentos <30d", value: vencs30.length, icon: AlertTriangle, color: vencs30.length > 0 ? "bg-red-600" : "bg-slate-400" },
    { label: "Reuniões (30d)",   value: reuns.length,   icon: Calendar,      color: "bg-violet-600"  },
    { label: "Tarefas abertas",  value: tarefas.length, icon: CheckSquare,   color: tarefas.length > 0 ? "bg-amber-500" : "bg-slate-400" },
  ];

  // Separar RF vs Fundos+Prev
  const topRF    = rfData.filter((x: any) => x.classe === "RF")
    .map((x: any) => ({ label: x.nome, sublabel: x.categoria, total: x.total }));
  const topFund  = rfData.filter((x: any) => x.classe !== "RF")
    .map((x: any) => ({ label: x.nome, sublabel: x.classe + " · " + x.categoria, total: x.total }));

  // Separar Ações vs FII
  const topAcoes = rvData.filter((x: any) => x.tipo === "ACAO" || x.tipo === "ETF" || x.tipo === "BDR")
    .map((x: any) => ({ label: x.ticker, sublabel: x.tipo + " · " + x.nome, total: x.total }));
  const topFII   = rvData.filter((x: any) => x.tipo === "FII")
    .map((x: any) => ({ label: x.ticker, sublabel: x.nome, total: x.total }));

  const ofertasAtivas = ofData.filter((o: any) => o.ativa);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral da sua carteira de clientes</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
            <div className={`${k.color} p-3 rounded-lg shrink-0`}>
              <k.icon className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium truncate">{k.label}</p>
              <p className="text-xl font-bold text-slate-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Resumo por Produto ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Resumo por Produto</h2>
          <p className="text-xs text-slate-400 mt-0.5">AuM total: {brl(totalProd)}</p>
        </div>
        {prod.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            Importe o Diversificador para visualizar alocação.
          </p>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
              {prod.map((p: any) => (
                <div
                  key={p.classe}
                  className={`${CLASSE_COR[p.classe] || "bg-slate-400"} transition-all`}
                  style={{ width: `${p.pct}%` }}
                  title={`${p.classe}: ${p.pct}%`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
              {prod.map((p: any) => (
                <div key={p.classe} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${CLASSE_COR[p.classe] || "bg-slate-400"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{p.classe}</p>
                    <p className="text-xs font-bold text-slate-800">{p.pct}%</p>
                    <p className="text-xs text-slate-400">{brl(p.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Resumo das Ofertas ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Resumo das Ofertas</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {ofertasAtivas.length} oferta{ofertasAtivas.length !== 1 ? "s" : ""} ativa{ofertasAtivas.length !== 1 ? "s" : ""}
          </p>
        </div>
        {ofertasAtivas.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            Nenhuma oferta ativa. Crie ofertas na aba Ofertas.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ofertasAtivas.map((o: any) => {
              const pctConfirmado = o.total_ofertado > 0
                ? Math.round(o.total_confirmado / o.total_ofertado * 100)
                : 0;
              return (
                <div key={o.id} className="px-5 py-4 space-y-3">
                  {/* Linha 1 — nome + data liq */}
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-800">{o.nome}</p>
                    {o.data_liquidacao && (
                      <span className="text-xs text-slate-400 shrink-0">Liq. {o.data_liquidacao}</span>
                    )}
                  </div>

                  {/* Linha 2 — barra de progresso (Finalizado + Reservado) */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>
                        Confirmado (fin. + res.):&nbsp;
                        <strong className="text-emerald-600">{brl(o.total_confirmado)}</strong>
                      </span>
                      <span>{pctConfirmado}% de {brl(o.total_ofertado)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pctConfirmado}%` }}
                      />
                    </div>
                  </div>

                  {/* Linha 3 — métricas + badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-slate-400">Clientes</p>
                        <p className="text-sm font-bold text-slate-800">{o.total_clientes}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">ROA</p>
                        <p className="text-sm font-bold text-slate-800">{o.roa}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Rec. confirmada</p>
                        <p className="text-sm font-bold text-emerald-600">{brl(o.receita_confirmada)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Rec. em aberto</p>
                        <p className="text-sm font-bold text-violet-600">{brl(o.receita_em_aberto)}</p>
                      </div>
                    </div>
                    {o.por_status && Object.keys(o.por_status).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(o.por_status as Record<string, number>).map(([s, n]) => (
                          <span
                            key={s}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[s] || "bg-slate-100 text-slate-600"}`}
                          >
                            {s.replace("_", " ")} · {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top 20: RF + Fundos ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PainelTop20
          titulo="Top 20 — Renda Fixa"
          items={topRF}
          totalProd={totalProd}
        />
        <PainelTop20
          titulo="Top 20 — Fundos & Previdência"
          items={topFund}
          totalProd={totalProd}
        />
      </div>

      {/* ── Top 20: Ações + FII ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PainelTop20
          titulo="Top 20 — Ações"
          items={topAcoes}
          totalProd={totalProd}
        />
        <PainelTop20
          titulo="Top 20 — FII"
          items={topFII}
          totalProd={totalProd}
        />
      </div>
    </div>
  );
}
