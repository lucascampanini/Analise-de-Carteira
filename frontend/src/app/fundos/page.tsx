"use client";
import { useEffect, useState } from "react";
import { getFundos } from "@/lib/api";
import { brl } from "@/lib/formatters";

const PRAZO_COR: Record<string, string> = {
  "—":    "bg-slate-100 text-slate-400",
  "D+0":  "bg-emerald-100 text-emerald-700",
  "D+1":  "bg-emerald-100 text-emerald-700",
  "D+2":  "bg-blue-100 text-blue-700",
  "D+3":  "bg-blue-100 text-blue-700",
};

function prazoCor(prazo: string): string {
  if (prazo === "—") return "bg-slate-100 text-slate-400";
  const total = parseInt(prazo.split("/").pop()?.replace("D+", "") || "999");
  if (total <= 1)  return "bg-emerald-100 text-emerald-700";
  if (total <= 3)  return "bg-blue-100 text-blue-700";
  if (total <= 15) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default function FundosPage() {
  const [fundos, setFundos]         = useState<any[]>([]);
  const [busca, setBusca]           = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  useEffect(() => { getFundos().then(setFundos).catch(() => {}); }, []);

  const tipos = ["TODOS", ...Array.from(new Set(fundos.map((f) => f.tipo))).sort()];

  const filtrados = fundos.filter((f) => {
    const okTipo = filtroTipo === "TODOS" || f.tipo === filtroTipo;
    const okBusca = !busca || [f.fundo, f.nome_cliente, f.gestora].some(
      (s) => s?.toLowerCase().includes(busca.toLowerCase())
    );
    return okTipo && okBusca;
  });

  const semPrazo = filtrados.filter((f) => f.prazo_fmt === "—").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fundos de Investimento</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filtrados.length} posições{semPrazo > 0 ? ` · ${semPrazo} sem prazo cadastrado` : ""}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar fundo, cliente ou gestora..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
        />
        <div className="flex gap-1 flex-wrap">
          {tipos.map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtroTipo === t
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide bg-slate-50">
                <th className="px-5 py-3 text-left">Fundo</th>
                <th className="px-5 py-3 text-left">Cliente</th>
                <th className="px-5 py-3 text-left">Tipo</th>
                <th className="px-5 py-3 text-left">Gestora</th>
                <th className="px-5 py-3 text-center">Prazo Resgate</th>
                <th className="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Nenhum fundo encontrado. Importe o Diversificador primeiro.
                  </td>
                </tr>
              ) : (
                filtrados.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 max-w-xs truncate">{f.fundo || "—"}</p>
                      {f.cnpj && <p className="text-xs text-slate-400">{f.cnpj}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-700">{f.nome_cliente || "—"}</p>
                      <p className="text-xs text-slate-400">{f.codigo_conta}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {f.tipo}
                      </span>
                      {f.classe === "PREV" && (
                        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">Prev</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{f.gestora || "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${prazoCor(f.prazo_fmt)}`}>
                        {f.prazo_fmt}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">
                      {brl(f.valor)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
