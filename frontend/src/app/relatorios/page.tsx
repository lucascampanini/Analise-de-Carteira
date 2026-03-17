"use client";
import { useState } from "react";
import { uploadDiversificadorTudo, getHistoricoImports, uploadClientes } from "@/lib/api";

function fmtDt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function RelatoriosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [historico, setHistorico] = useState<any[] | null>(null);
  const [loadingHist, setLoadingHist] = useState(false);

  // Import de clientes
  const [fileSaldo, setFileSaldo] = useState<File | null>(null);
  const [filePositivador, setFilePositivador] = useState<File | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [resultClientes, setResultClientes] = useState<any>(null);

  const importar = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    const r = await uploadDiversificadorTudo(file).catch((e) => ({ error: e.message }));
    setResult(r);
    setLoading(false);
    // Refresh historico após import
    if (!r.error) {
      const h = await getHistoricoImports().catch(() => []);
      setHistorico(h);
    }
  };

  const importarClientes = async () => {
    if (!fileSaldo || !filePositivador) return;
    setLoadingClientes(true);
    setResultClientes(null);
    const r = await uploadClientes(fileSaldo, filePositivador).catch((e) => ({ error: e.message }));
    setResultClientes(r);
    setLoadingClientes(false);
  };

  const carregarHistorico = async () => {
    setLoadingHist(true);
    const h = await getHistoricoImports().catch(() => []);
    setHistorico(h);
    setLoadingHist(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios e Importações</h1>
        <p className="text-slate-500 text-sm">Importe a planilha do Diversificador XP para atualizar todos os dados</p>
      </div>

      {/* Card de importação unificada */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-xl">
        <div>
          <h2 className="font-semibold text-slate-800">Importar Diversificador (Carteira Completa)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Importa de uma vez: Renda Fixa, Ações, FIIs, Fundos e Previdência.
            Os dados ficam salvos até o próximo import.
          </p>
        </div>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700 cursor-pointer"
        />
        <button
          onClick={importar}
          disabled={loading || !file}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
        >
          {loading ? "Importando..." : "Importar"}
        </button>

        {result && (
          <div className={`p-4 rounded-lg text-sm ${result.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
            {result.error ? result.error : (
              <div className="space-y-1">
                <p className="font-medium">{result.mensagem}</p>
                {result.data_referencia && (
                  <p className="text-xs text-emerald-600">Referência: {result.data_referencia}</p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 text-xs">
                  <span>Renda Fixa: <strong>{result.rf}</strong> posições</span>
                  <span>Renda Variável: <strong>{result.rv}</strong> posições</span>
                  <span>Fundos: <strong>{result.fundos}</strong></span>
                  <span>Previdência: <strong>{result.prev}</strong></span>
                  <span>Alertas criados: <strong>{result.eventos_criados}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card importação de clientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-xl">
        <div>
          <h2 className="font-semibold text-slate-800">Importar Clientes (Positivador + Saldo)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Atualiza nome, profissão, data de nascimento, suitability e saldos dos clientes.
          </p>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">RelatorioSaldoConsolidado.xlsx</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFileSaldo(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:text-sm file:font-medium hover:file:bg-violet-700 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Positivador.xlsx</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFilePositivador(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:text-sm file:font-medium hover:file:bg-violet-700 cursor-pointer"
            />
          </div>
        </div>
        <button
          onClick={importarClientes}
          disabled={loadingClientes || !fileSaldo || !filePositivador}
          className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors text-sm"
        >
          {loadingClientes ? "Importando..." : "Importar Clientes"}
        </button>

        {resultClientes && (
          <div className={`p-4 rounded-lg text-sm ${resultClientes.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
            {resultClientes.error ? resultClientes.error : (
              <p className="font-medium">{resultClientes.mensagem}</p>
            )}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Histórico de imports</h2>
          <button
            onClick={carregarHistorico}
            disabled={loadingHist}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loadingHist ? "Carregando..." : historico === null ? "Carregar" : "Atualizar"}
          </button>
        </div>

        {historico === null ? (
          <p className="text-slate-400 text-sm text-center py-8">Clique em "Carregar" para ver o histórico</p>
        ) : historico.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nenhum import registrado ainda</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {historico.map((h: any) => (
              <div key={h.id} className="px-5 py-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      h.tipo === "TUDO" ? "bg-emerald-100 text-emerald-700" :
                      h.tipo === "RF"   ? "bg-blue-100 text-blue-700" :
                                          "bg-violet-100 text-violet-700"
                    }`}>{h.tipo}</span>
                    {h.data_referencia && (
                      <span className="text-xs text-slate-500">Ref: {h.data_referencia}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-slate-600">
                    {h.total_rf > 0    && <span>RF: <strong>{h.total_rf}</strong></span>}
                    {h.total_rv > 0    && <span>RV: <strong>{h.total_rv}</strong></span>}
                    {h.total_fundos > 0 && <span>Fundos: <strong>{h.total_fundos}</strong></span>}
                    {h.total_prev > 0  && <span>Prev: <strong>{h.total_prev}</strong></span>}
                    {h.total_clientes > 0 && <span>Clientes: <strong>{h.total_clientes}</strong></span>}
                  </div>
                </div>
                <p className="text-xs text-slate-400 shrink-0 ml-4">{fmtDt(h.importado_em)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
