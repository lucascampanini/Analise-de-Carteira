"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAnotacoes, addAnotacao, deleteAnotacao } from "@/lib/firestore";

const TIPOS = ["NOTA", "LIGACAO", "REUNIAO", "EMAIL", "WHATSAPP"] as const;
const TIPO_ICON: Record<string, string> = {
  NOTA: "📝", LIGACAO: "📞", REUNIAO: "🤝", EMAIL: "📧", WHATSAPP: "💬",
};

export function AnotacoesSection({ codigoConta }: { codigoConta: string }) {
  const { user } = useAuth();
  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [tipo,  setTipo]  = useState("NOTA");
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const load = () => {
    if (!user || !codigoConta) return;
    getAnotacoes(user.uid, codigoConta).then(setAnotacoes).catch(() => {});
  };

  useEffect(() => { load(); }, [user, codigoConta]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !texto.trim()) return;
    setSalvando(true);
    await addAnotacao(user.uid, codigoConta, tipo, texto.trim());
    setTexto("");
    setSalvando(false);
    load();
  };

  const deletar = async (id: string) => {
    if (!user || !confirm("Remover esta anotação?")) return;
    await deleteAnotacao(user.uid, id);
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Anotações e contatos</h2>
      </div>

      <form onSubmit={salvar} className="px-5 py-4 border-b border-slate-100 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {TIPOS.map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                tipo === t
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}>
              {TIPO_ICON[t]} {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="Descreva o contato ou observação..." rows={2}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <button type="submit" disabled={salvando || !texto.trim()}
            className="bg-blue-600 text-white px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors self-end py-2">
            {salvando ? "..." : "Salvar"}
          </button>
        </div>
      </form>

      {anotacoes.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Nenhuma anotação ainda</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {anotacoes.map((a: any) => (
            <div key={a.id} className="px-5 py-3 flex items-start gap-3 group">
              <span className="text-lg shrink-0">{TIPO_ICON[a.tipo] || "📝"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{a.texto}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {a.tipo} ·{" "}
                  {a.criado_em?.seconds
                    ? new Date(a.criado_em.seconds * 1000).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
              <button onClick={() => deletar(a.id)}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-xs shrink-0">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
