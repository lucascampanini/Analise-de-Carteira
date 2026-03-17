"use client";
import { useEffect, useState } from "react";
import { getClientes } from "@/lib/api";
import { brl } from "@/lib/formatters";
import Link from "next/link";
import { ModalNota } from "@/components/ui/ModalNota";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const suitabilityColor: Record<string, string> = {
  Conservador: "bg-blue-100 text-blue-700",
  Moderado:    "bg-amber-100 text-amber-700",
  Arrojado:    "bg-purple-100 text-purple-700",
  Agressivo:   "bg-red-100 text-red-700",
};

function calcularAniversario(dataNasc: string | null): { data: Date; dias: number; idade: number } | null {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc + "T00:00:00");
  const hoje = new Date();
  const ano = hoje.getFullYear();
  let aniv = new Date(ano, nasc.getMonth(), nasc.getDate());
  if (aniv < hoje) aniv = new Date(ano + 1, nasc.getMonth(), nasc.getDate());
  const dias = Math.ceil((aniv.getTime() - hoje.getTime()) / 86400000);
  const idade = aniv.getFullYear() - nasc.getFullYear();
  return { data: aniv, dias, idade };
}

function fmtDataBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [modalNota, setModalNota] = useState<{ conta: string; nome: string } | null>(null);
  const [gerandoAlertas, setGerandoAlertas] = useState(false);
  const [msgAlertas, setMsgAlertas] = useState("");
  const [mostrarAniversariantes, setMostrarAniversariantes] = useState(false);

  useEffect(() => { getClientes().then(setClientes).catch(() => {}); }, []);

  const gerarAlertas = async () => {
    setGerandoAlertas(true);
    setMsgAlertas("");
    const r = await fetch(`${API}/assistente/clientes/gerar-alertas-aniversario`, { method: "POST" })
      .then((r) => r.json()).catch(() => ({ mensagem: "Erro ao gerar alertas" }));
    setMsgAlertas(r.mensagem || "Feito");
    setGerandoAlertas(false);
  };

  const sorted = [...clientes].sort((a, b) => (b.net || 0) - (a.net || 0));

  // Aniversariantes nos próximos 30 dias
  const aniversariantes = sorted
    .map((c) => ({ ...c, aniv: calcularAniversario(c.data_nascimento) }))
    .filter((c) => c.aniv && c.aniv.dias <= 30)
    .sort((a, b) => a.aniv!.dias - b.aniv!.dias);

  const filtrados = sorted.filter((c) =>
    !busca ||
    (c.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
    String(c.codigo_conta).includes(busca) ||
    (c.profissao || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {modalNota && (
        <ModalNota
          codigoConta={modalNota.conta}
          nomeCliente={modalNota.nome}
          onClose={() => setModalNota(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm">{clientes.length} clientes ativos</p>
        </div>
        <div className="flex items-center gap-3">
          {msgAlertas && <span className="text-xs text-emerald-600">{msgAlertas}</span>}
          <button onClick={gerarAlertas} disabled={gerandoAlertas}
            className="text-xs bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {gerandoAlertas ? "Gerando..." : "🎂 Gerar alertas de aniversário"}
          </button>
        </div>
      </div>

      {/* Banner aniversariantes */}
      {aniversariantes.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
              🎂 Aniversariantes nos próximos 30 dias ({aniversariantes.length})
            </p>
            <button
              onClick={() => setMostrarAniversariantes(!mostrarAniversariantes)}
              className="text-xs text-violet-500 hover:text-violet-700 transition-colors"
            >
              {mostrarAniversariantes ? "Ocultar ▲" : "Mostrar ▼"}
            </button>
          </div>
          {mostrarAniversariantes && (
            <div className="flex flex-wrap gap-2">
              {aniversariantes.map((c) => (
                <Link key={c.codigo_conta} href={`/clientes/${c.codigo_conta}`}
                  className="flex items-center gap-2 bg-white border border-violet-200 rounded-lg px-3 py-1.5 hover:border-violet-400 transition-colors">
                  <span className="text-sm font-medium text-slate-800">
                    {c.nome.split(" ").slice(0, 2).join(" ")}
                  </span>
                  <span className="text-xs text-violet-600 font-semibold">
                    {fmtDataBR(c.aniv!.data)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    c.aniv!.dias === 0 ? "bg-violet-600 text-white" :
                    c.aniv!.dias <= 7 ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.aniv!.dias === 0 ? "Hoje!" : `${c.aniv!.dias}d`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Busca */}
      <div className="flex items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, código ou profissão..."
          className="flex-1 max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-slate-400">{filtrados.length} clientes</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Profissão</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Nascimento</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Perfil</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Patrimônio</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Saldo D0</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((c: any) => {
              const suit = c.suitability || "";
              const cor  = suitabilityColor[suit] || "bg-slate-100 text-slate-600";
              const aniv = calcularAniversario(c.data_nascimento);
              const isAnivBreve = aniv && aniv.dias <= 30;

              return (
                <tr key={c.codigo_conta}
                  className={`hover:bg-slate-50 transition-colors ${isAnivBreve ? "bg-violet-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{c.nome}</span>
                      {isAnivBreve && (
                        <span className="text-xs" title={`Aniversário em ${aniv.dias}d`}>🎂</span>
                      )}
                      <button
                        onClick={() => setModalNota({ conta: c.codigo_conta, nome: c.nome })}
                        className="text-slate-300 hover:text-blue-600 transition-colors text-xs"
                        title="Nova anotação"
                      >
                        📝
                      </button>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{c.codigo_conta}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {c.profissao || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.data_nascimento ? (
                      <div>
                        <span className="text-xs text-slate-600">
                          {new Date(c.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        {aniv && (
                          <span className={`ml-2 text-xs font-medium ${
                            aniv.dias <= 7 ? "text-violet-600" : "text-slate-400"
                          }`}>
                            {aniv.dias === 0 ? "🎂 Hoje!" : aniv.dias <= 30 ? `(em ${aniv.dias}d)` : ""}
                          </span>
                        )}
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {suit && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cor}`}>
                        {suit}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{brl(c.net)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{brl(c.saldo_d0)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/clientes/${c.codigo_conta}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                      Ver perfil →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
