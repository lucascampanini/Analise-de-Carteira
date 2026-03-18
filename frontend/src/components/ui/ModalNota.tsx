"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { addAnotacao, addEvento, addReuniao } from "@/lib/firestore";

const TIPOS_NOTA = ["NOTA", "LIGACAO", "REUNIAO", "EMAIL", "WHATSAPP"] as const;
const TIPO_ICON: Record<string, string> = {
  NOTA: "📝", LIGACAO: "📞", REUNIAO: "🤝", EMAIL: "📧", WHATSAPP: "💬",
};

type Aba = "anotacao" | "tarefa" | "reuniao";

interface Props {
  codigoConta: string;
  nomeCliente?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function ModalNota({ codigoConta, nomeCliente, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [aba, setAba]       = useState<Aba>("anotacao");
  const [salvando, setSalvando] = useState(false);

  // Anotação
  const [tipoNota, setTipoNota] = useState("NOTA");
  const [textoNota, setTextoNota] = useState("");

  // Tarefa
  const [descTarefa, setDescTarefa] = useState("");
  const [dataTarefa, setDataTarefa] = useState("");
  const [alertarDias, setAlertarDias] = useState("1");

  // Reunião
  const [tituloReuniao, setTituloReuniao] = useState(
    nomeCliente ? `Reunião com ${nomeCliente}` : ""
  );
  const [dataReuniao, setDataReuniao] = useState("");
  const [duracaoReuniao, setDuracaoReuniao] = useState("60");
  const [descReuniao, setDescReuniao] = useState("");

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSalvando(true);
    try {
      if (aba === "anotacao") {
        await addAnotacao(user.uid, codigoConta, tipoNota, textoNota.trim());

      } else if (aba === "tarefa") {
        await addEvento(user.uid, {
          tipo:          "TAREFA",
          descricao:     descTarefa.trim(),
          data_evento:   dataTarefa,
          codigo_conta:  codigoConta,
          nome_cliente:  nomeCliente || null,
        });

      } else if (aba === "reuniao") {
        await addReuniao(user.uid, {
          titulo:          tituloReuniao.trim(),
          data_hora:       dataReuniao,
          duracao_minutos: Number(duracaoReuniao),
          codigo_conta:    codigoConta,
          nome_cliente:    nomeCliente || null,
          descricao:       descReuniao || null,
        });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      alert(`Não foi possível salvar.\n\n${err}`);
    } finally {
      setSalvando(false);
    }
  };

  const abas: { key: Aba; label: string; icon: string }[] = [
    { key: "anotacao", label: "Anotação", icon: "📝" },
    { key: "tarefa",   label: "Tarefa",   icon: "✅" },
    { key: "reuniao",  label: "Reunião",  icon: "🤝" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="font-bold text-slate-800 text-base">Novo registro</h3>
          {nomeCliente && <p className="text-xs text-slate-400 mt-0.5">{nomeCliente}</p>}
        </div>

        <div className="flex border-b border-slate-100 px-5 gap-1">
          {abas.map((a) => (
            <button key={a.key} type="button" onClick={() => setAba(a.key)}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
                aba === a.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3">
          {aba === "anotacao" && (
            <>
              <div className="flex gap-1.5 flex-wrap">
                {TIPOS_NOTA.map((t) => (
                  <button key={t} type="button" onClick={() => setTipoNota(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      tipoNota === t
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-200 text-slate-500 hover:border-slate-400"
                    }`}>
                    {TIPO_ICON[t]} {t}
                  </button>
                ))}
              </div>
              <textarea autoFocus required value={textoNota}
                onChange={(e) => setTextoNota(e.target.value)}
                placeholder="Descreva o contato ou observação..." rows={4}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </>
          )}

          {aba === "tarefa" && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Descrição da tarefa *</label>
                <input autoFocus required value={descTarefa}
                  onChange={(e) => setDescTarefa(e.target.value)}
                  placeholder="Ex: Enviar proposta de previdência"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Data limite *</label>
                <input required type="date" value={dataTarefa}
                  onChange={(e) => setDataTarefa(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}

          {aba === "reuniao" && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Título *</label>
                <input autoFocus required value={tituloReuniao}
                  onChange={(e) => setTituloReuniao(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Data e hora *</label>
                  <input required type="datetime-local" value={dataReuniao}
                    onChange={(e) => setDataReuniao(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Duração (min)</label>
                  <input type="number" min="15" step="15" value={duracaoReuniao}
                    onChange={(e) => setDuracaoReuniao(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Pauta</label>
                <textarea value={descReuniao} onChange={(e) => setDescReuniao(e.target.value)}
                  rows={2} placeholder="Opcional"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button type="submit" disabled={salvando}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
