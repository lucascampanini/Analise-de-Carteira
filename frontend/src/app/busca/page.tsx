"use client";
import { useState } from "react";
import { buscarClientesPorTicker } from "@/lib/api";
import { brl } from "@/lib/formatters";
import Link from "next/link";

export default function BuscaPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[] | null>(null);
  const [buscado, setBuscado] = useState("");

  const buscar = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setLoading(true);
    setResultados(null);
    const r = await buscarClientesPorTicker(t).catch(() => []);
    setResultados(r);
    setBuscado(t);
    setLoading(false);
  };

  const totalValor = resultados?.reduce((s, r) => s + (r.valor || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Busca por Ativo</h1>
        <p className="text-slate-500 text-sm">Encontre quais clientes possuem um ativo na carteira</p>
      </div>

      {/* Input de busca */}
      <div className="flex items-center gap-3 max-w-md">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder="Ex: SMALL11, PETR4, KNRI11..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase placeholder:normal-case placeholder:font-sans"
        />
        <button
          onClick={buscar}
          disabled={loading || !ticker.trim()}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {/* Resultados */}
      {resultados !== null && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-600">
              <strong>{resultados.length}</strong> cliente{resultados.length !== 1 ? "s" : ""} com{" "}
              <span className="font-mono font-semibold text-blue-700">{buscado}</span> na carteira
            </p>
            {resultados.length > 0 && (
              <p className="text-sm text-slate-500">
                Volume total: <strong className="text-slate-800">{brl(totalValor)}</strong>
              </p>
            )}
          </div>

          {resultados.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
              Nenhum cliente encontrado com esse ativo
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Ticker</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Qtd</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Valor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultados.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{r.nome_cliente}</span>
                        <span className="block text-xs text-slate-400 font-mono">{r.codigo_conta}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">{r.ticker}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.tipo}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.quantidade?.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{brl(r.valor)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/clientes/${r.codigo_conta}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                          Ver perfil →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
