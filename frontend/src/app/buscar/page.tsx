"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDataRefresh } from "@/contexts/DataRefreshContext";
import { getPosicoes, getClientes } from "@/lib/firestore";
import { brl } from "@/lib/formatters";
import { Search } from "lucide-react";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function BuscarPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [posicoes,  setPosicoes]  = useState<any[]>([]);
  const [clientes,  setClientes]  = useState<any[]>([]);
  const [busca,     setBusca]     = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPosicoes(user.uid), getClientes(user.uid)]).then(([pos, cls]) => {
      setPosicoes(pos);
      setClientes(cls);
      setLoading(false);
    });
  }, [user, refreshKey]);

  const clienteMap = useMemo(() => {
    const m: Record<string, string> = {};
    clientes.forEach((c) => { m[c.codigo_conta] = c.nome || c.codigo_conta; });
    return m;
  }, [clientes]);

  // Agrupa posições por nome do ativo
  const grupos = useMemo(() => {
    const q = norm(busca.trim());
    if (!q) return [];

    const filtradas = posicoes.filter((p) =>
      norm(p.ativo || "").includes(q) ||
      norm(p.produto || "").includes(q) ||
      norm(p.cnpj_fundo || "").includes(q)
    );

    const map: Record<string, { ativo: string; classe: string; posicoes: any[] }> = {};
    filtradas.forEach((p) => {
      const key = p.ativo || p.produto || "—";
      if (!map[key]) map[key] = { ativo: key, classe: p.classe || "—", posicoes: [] };
      map[key].posicoes.push(p);
    });

    return Object.values(map).sort((a, b) => {
      const sa = a.posicoes.reduce((s, p) => s + (p.valor || 0), 0);
      const sb = b.posicoes.reduce((s, p) => s + (p.valor || 0), 0);
      return sb - sa;
    });
  }, [posicoes, busca]);

  const totalAtivos   = useMemo(() => new Set(posicoes.map((p) => p.ativo)).size, [posicoes]);
  const totalClientes = useMemo(() => new Set(posicoes.map((p) => p.codigo_conta)).size, [posicoes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Buscar Ativo</h1>
        <p className="text-slate-500 text-sm">
          {loading ? "Carregando..." : `${totalAtivos} ativos · ${totalClientes} clientes indexados`}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite o nome do ativo, fundo ou CNPJ..."
          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby shadow-sm"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors text-lg"
          >
            ✕
          </button>
        )}
      </div>

      {/* Estado vazio */}
      {!busca && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          <Search size={36} className="mx-auto mb-3 text-slate-200" />
          Digite um ativo para ver em quais clientes ele aparece
        </div>
      )}

      {/* Sem resultados */}
      {busca && grupos.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          Nenhum ativo encontrado para <strong className="text-slate-600">"{busca}"</strong>
        </div>
      )}

      {/* Resultados */}
      {grupos.map((grupo) => {
        const totalValor    = grupo.posicoes.reduce((s, p) => s + (p.valor || 0), 0);
        const totalClts     = new Set(grupo.posicoes.map((p) => p.codigo_conta)).size;
        const posOrdenadas  = [...grupo.posicoes].sort((a, b) => (b.valor || 0) - (a.valor || 0));

        return (
          <div key={grupo.ativo} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Cabeçalho do grupo */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-800 truncate">{grupo.ativo}</h2>
                  <p className="text-xs text-slate-400">
                    {grupo.classe}
                    {grupo.classe === "Renda Fixa" && grupo.posicoes[0]?.gestora && (
                      <span className="ml-2 text-slate-500 font-medium">· {grupo.posicoes[0].gestora}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0 text-right">
                <div>
                  <p className="text-xs text-slate-400">Clientes</p>
                  <p className="font-semibold text-slate-700">{totalClts}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total exposto</p>
                  <p className="font-bold text-slate-800 text-lg">{brl(totalValor)}</p>
                </div>
              </div>
            </div>

            {/* Tabela de posições */}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-2 text-left">Cliente</th>
                  <th className="px-5 py-2 text-left">Conta</th>
                  <th className="px-5 py-2 text-right">Valor</th>
                  <th className="px-5 py-2 text-right">% da carteira</th>
                  {grupo.classe === "Renda Fixa" && (
                    <th className="px-5 py-2 text-right">Vencimento</th>
                  )}
                  <th className="px-5 py-2 text-right">Liquidez</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posOrdenadas.map((p, i) => {
                  const pctCarteira = (() => {
                    const totalConta = posicoes
                      .filter((x) => x.codigo_conta === p.codigo_conta)
                      .reduce((s, x) => s + (x.valor || 0), 0);
                    return totalConta > 0 ? ((p.valor || 0) / totalConta) * 100 : 0;
                  })();

                  const liqLabel =
                    p.liquidez_dias == null  ? "—"
                    : p.liquidez_dias <= 1   ? "D+1"
                    : p.liquidez_dias <= 5   ? `D+${p.liquidez_dias}`
                    : p.liquidez_dias <= 30  ? `D+${p.liquidez_dias}`
                    : `D+${p.liquidez_dias}`;

                  const liqCor =
                    p.liquidez_dias == null  ? "text-slate-300"
                    : p.liquidez_dias <= 1   ? "text-emerald-600 font-semibold"
                    : p.liquidez_dias <= 5   ? "text-svn-ruby"
                    : p.liquidez_dias <= 30  ? "text-amber-600"
                    : "text-slate-500";

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-slate-800">
                        {clienteMap[p.codigo_conta] || p.codigo_conta}
                      </td>
                      <td className="px-5 py-2.5 text-slate-400 text-xs">{p.codigo_conta}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-slate-800">
                        {brl(p.valor || 0)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-svn-ruby rounded-full"
                              style={{ width: `${Math.min(pctCarteira, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-10 text-right">
                            {pctCarteira.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      {grupo.classe === "Renda Fixa" && (
                        <td className="px-5 py-2.5 text-right text-xs text-slate-500">
                          {p.data_vencimento
                            ? new Date(p.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      )}
                      <td className={`px-5 py-2.5 text-right text-xs ${liqCor}`}>
                        {liqLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 bg-slate-50 text-xs font-semibold">
                  <td className="px-5 py-2 text-slate-500" colSpan={2}>TOTAL</td>
                  <td className="px-5 py-2 text-right text-slate-800">{brl(totalValor)}</td>
                  <td colSpan={grupo.classe === "Renda Fixa" ? 3 : 2} />
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
