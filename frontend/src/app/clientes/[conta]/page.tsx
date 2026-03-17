import { getPosicoesRF, getPosicoesRV, getPosicoeFundos, getPosicoesPrev } from "@/lib/api";
import { AnotacoesSection } from "@/components/ui/AnotacoesSection";
import { brl, fmtDate, diasAte, urgenciaCor } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const tipoIcon: Record<string, string> = {
  LIGACAO: "📞", REUNIAO: "🤝", EMAIL: "📧", WHATSAPP: "💬", NOTA: "📝",
};

export default async function ClientePerfilPage({ params }: { params: Promise<{ conta: string }> }) {
  const { conta } = await params;

  const [rf, rv, fundos, prev] = await Promise.allSettled([
    getPosicoesRF(conta),
    getPosicoesRV(conta),
    getPosicoeFundos(conta),
    getPosicoesPrev(conta),
  ]);

  const rfData     = rf.status     === "fulfilled" ? rf.value     : [];
  const rvData     = rv.status     === "fulfilled" ? rv.value     : [];
  const fundosData = fundos.status === "fulfilled" ? fundos.value : [];
  const prevData   = prev.status   === "fulfilled" ? prev.value   : [];

  const totalRF    = rfData.reduce((s: number, p: any) => s + (p.valor || 0), 0);
  const totalRV    = rvData.filter((p: any) => p.tipo !== "ALUGUEL").reduce((s: number, p: any) => s + (p.valor || 0), 0);
  const totalFundos= fundosData.reduce((s: number, p: any) => s + (p.valor || 0), 0);
  const totalPrev  = prevData.reduce((s: number, p: any) => s + (p.valor || 0), 0);
  const totalGeral = totalRF + totalRV + totalFundos + totalPrev;

  const pct = (v: number) => totalGeral > 0 ? ((v / totalGeral) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/clientes" className="text-blue-600 text-sm">← Clientes</a>
        <h1 className="text-2xl font-bold text-slate-800">Conta {conta}</h1>
      </div>

      {/* Exposição por classe */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Exposição por classe de ativo</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Renda Fixa",   valor: totalRF,     pct: pct(totalRF),     cor: "bg-blue-600"    },
            { label: "Renda Variável",valor: totalRV,    pct: pct(totalRV),     cor: "bg-emerald-600" },
            { label: "Fundos",        valor: totalFundos, pct: pct(totalFundos), cor: "bg-violet-600"  },
            { label: "Previdência",   valor: totalPrev,   pct: pct(totalPrev),   cor: "bg-amber-600"   },
          ].map((item) => (
            <div key={item.label} className="border border-slate-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${item.cor}`} />
                <span className="text-xs font-medium text-slate-600">{item.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800">{item.pct}%</p>
              <p className="text-xs text-slate-500 mt-1">{brl(item.valor)}</p>
            </div>
          ))}
        </div>
        {totalGeral > 0 && (
          <div className="mt-4 h-3 rounded-full overflow-hidden flex gap-0.5">
            {totalRF    > 0 && <div className="bg-blue-600    h-full" style={{ width: `${pct(totalRF)}%` }} />}
            {totalRV    > 0 && <div className="bg-emerald-600 h-full" style={{ width: `${pct(totalRV)}%` }} />}
            {totalFundos> 0 && <div className="bg-violet-600  h-full" style={{ width: `${pct(totalFundos)}%` }} />}
            {totalPrev  > 0 && <div className="bg-amber-600   h-full" style={{ width: `${pct(totalPrev)}%` }} />}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Renda Fixa */}
        {rfData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Renda Fixa <span className="text-slate-400 font-normal text-sm">({rfData.length})</span></h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {rfData.map((p: any, i: number) => {
                const dias = diasAte(p.vencimento);
                return (
                  <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.tipo}</p>
                      <p className="text-xs text-slate-500">{p.emissor || p.ativo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{brl(p.valor)}</p>
                      <p className={`text-xs ${urgenciaCor(dias)}`}>{fmtDate(p.vencimento)} · {dias}d</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Renda Variável */}
        {rvData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Renda Variável <span className="text-slate-400 font-normal text-sm">({rvData.length})</span></h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {rvData.map((p: any, i: number) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.ticker || p.ativo}</p>
                    <p className="text-xs text-slate-500">{p.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${(p.valor || 0) < 0 ? "text-red-600" : "text-slate-800"}`}>
                      {brl(p.valor)}
                    </p>
                    <p className="text-xs text-slate-500">Qtd: {p.quantidade}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fundos */}
        {fundosData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Fundos <span className="text-slate-400 font-normal text-sm">({fundosData.length})</span></h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {fundosData.map((p: any, i: number) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.fundo}</p>
                    <p className="text-xs text-slate-500">{p.tipo} · {p.gestora || "—"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {p.prazo_fmt && p.prazo_fmt !== "—" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {p.prazo_fmt}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-slate-800">{brl(p.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previdência */}
        {prevData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Previdência</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {prevData.map((p: any, i: number) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.fundo}</p>
                    <p className="text-xs text-slate-500">{p.tipo} · {p.gestora || "—"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {p.prazo_fmt && p.prazo_fmt !== "—" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                        {p.prazo_fmt}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-slate-800">{brl(p.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnotacoesSection codigoConta={conta} />
    </div>
  );
}
