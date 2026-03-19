"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getClientes, importarClientes } from "@/lib/firestore";
import { brl } from "@/lib/formatters";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ModalNota } from "@/components/ui/ModalNota";
import { AnotacoesSection } from "@/components/ui/AnotacoesSection";
import * as XLSX from "xlsx";

const suitabilityColor: Record<string, string> = {
  Conservador: "bg-blue-100 text-blue-700",
  Moderado:    "bg-amber-100 text-amber-700",
  Arrojado:    "bg-purple-100 text-purple-700",
  Agressivo:   "bg-red-100 text-red-700",
};

function calcularAniversario(dataNasc: string | null) {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc + "T00:00:00");
  const hoje = new Date();
  const ano  = hoje.getFullYear();
  let aniv   = new Date(ano, nasc.getMonth(), nasc.getDate());
  if (aniv < hoje) aniv = new Date(ano + 1, nasc.getMonth(), nasc.getDate());
  const dias = Math.ceil((aniv.getTime() - hoje.getTime()) / 86400000);
  return { data: aniv, dias };
}

function mapearColuna(headers: string[], ...opcoes: string[]) {
  return headers.find((h) =>
    opcoes.some((o) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "").includes(o.toLowerCase().replace(/[^a-z0-9]/g, ""))
    )
  );
}

// ── Perfil do cliente (inline) ──────────────────────────────────────────────
function ClientePerfil({ conta, clientes, onVoltar }: { conta: string; clientes: any[]; onVoltar: () => void }) {
  const cliente = clientes.find((c) => c.codigo_conta === conta);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onVoltar} className="text-blue-600 text-sm">← Clientes</button>
        <h1 className="text-2xl font-bold text-slate-800">
          {cliente?.nome || `Conta ${conta}`}
        </h1>
      </div>

      {cliente && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Dados do cliente</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Patrimônio (NET)</p>
              <p className="text-lg font-bold text-slate-800">{brl(cliente.net)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Perfil</p>
              {cliente.suitability ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${suitabilityColor[cliente.suitability] || "bg-slate-100 text-slate-600"}`}>
                  {cliente.suitability}
                </span>
              ) : <p className="text-sm text-slate-400">—</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500">Profissão</p>
              <p className="text-sm text-slate-800">{cliente.profissao || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Nascimento</p>
              <p className="text-sm text-slate-800">
                {cliente.data_nascimento
                  ? new Date(cliente.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <AnotacoesSection codigoConta={conta} />
    </div>
  );
}

// ── Lista de clientes ────────────────────────────────────────────────────────
/** Lê um arquivo Excel e retorna as linhas como array de objetos. */
async function lerExcel(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, { type: "array" });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
}

/** Converte valor numérico/string do Excel para float. */
function parseNet(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
}

function ClientesLista({
  clientes, load, onSelectConta,
}: {
  clientes: any[];
  load: () => void;
  onSelectConta: (conta: string) => void;
}) {
  const { user }  = useAuth();
  const [busca, setBusca]           = useState("");
  const [modalNota, setModalNota]   = useState<{ conta: string; nome: string } | null>(null);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport]   = useState("");
  const [mostrarAniv, setMostrarAniv] = useState(false);

  // Dois arquivos separados
  const [fileRelatorio,   setFileRelatorio]   = useState<File | null>(null);
  const [filePositivador, setFilePositivador] = useState<File | null>(null);
  const refRelatorio   = useRef<HTMLInputElement>(null);
  const refPositivador = useRef<HTMLInputElement>(null);

  const podeImportar = !!fileRelatorio && !!filePositivador && !importando;

  const importarDoisExcels = async () => {
    if (!user || !fileRelatorio || !filePositivador) return;
    setImportando(true);
    setMsgImport("");
    try {
      // ── 1. RelatorioSaldoConsolidado → mapa conta → nome ──────────────────
      const rowsRel = await lerExcel(fileRelatorio);
      if (rowsRel.length === 0) { setMsgImport("Relatório Saldo: planilha vazia."); return; }

      const hdRel    = Object.keys(rowsRel[0]);
      const colConta = mapearColuna(hdRel, "conta", "codigoconta", "codigo", "account");
      const colNome  = mapearColuna(hdRel, "cliente", "nomecliente", "nome");

      if (!colConta) { setMsgImport("Relatório Saldo: coluna de código não encontrada."); return; }
      if (!colNome)  { setMsgImport("Relatório Saldo: coluna de nome não encontrada."); return; }

      const nomesPorConta = new Map<string, string>();
      for (const r of rowsRel) {
        const conta = String(r[colConta] || "").trim();
        if (!conta) continue;
        nomesPorConta.set(conta, String(r[colNome] || "").trim());
      }

      // ── 2. Positivador → mapa conta → dados ───────────────────────────────
      const rowsPos = await lerExcel(filePositivador);
      if (rowsPos.length === 0) { setMsgImport("Positivador: planilha vazia."); return; }

      const hdPos    = Object.keys(rowsPos[0]);
      // Código do cliente no Positivador pode ser COD_CLIENTE ou Cliente (quando é número)
      const colContaP = mapearColuna(hdPos, "codcliente", "codigocliente", "conta", "account");
      const colNet    = mapearColuna(hdPos, "netemm", "netem", "net", "patrimonio", "saldo");
      const colSuit   = mapearColuna(hdPos, "suitability", "dscsuitability", "perfil");
      const colProf   = mapearColuna(hdPos, "profissao", "dscprofissao", "profissão", "ocupacao");
      const colNasc   = mapearColuna(hdPos, "datanascimento", "datdatanascimento", "nascimento");
      const colSeg    = mapearColuna(hdPos, "segmento", "dscsegmento");

      if (!colContaP) { setMsgImport("Positivador: coluna de código não encontrada."); return; }
      if (!colNet)    { setMsgImport("Positivador: coluna de NET não encontrada."); return; }

      const dadosPorConta = new Map<string, any>();
      for (const r of rowsPos) {
        const conta = String(r[colContaP] || "").trim();
        if (!conta) continue;
        dadosPorConta.set(conta, {
          net:             parseNet(r[colNet]),
          suitability:     colSuit  ? String(r[colSuit]  || "").trim() : "",
          profissao:       colProf  ? String(r[colProf]  || "").trim() : "",
          data_nascimento: colNasc  ? String(r[colNasc]  || "").trim() : "",
          segmento:        colSeg   ? String(r[colSeg]   || "").trim() : "",
        });
      }

      // ── 3. Cruzar pelo código do cliente ──────────────────────────────────
      const clts: any[] = [];
      for (const [conta, nome] of nomesPorConta) {
        if (!nome) continue;
        const pos = dadosPorConta.get(conta) ?? {};
        clts.push({
          codigo_conta:    conta,
          nome,
          net:             pos.net             ?? 0,
          suitability:     pos.suitability     ?? "",
          profissao:       pos.profissao       ?? "",
          data_nascimento: pos.data_nascimento ?? "",
          segmento:        pos.segmento        ?? "",
        });
      }

      if (clts.length === 0) {
        setMsgImport("Nenhum cliente encontrado após o cruzamento. Verifique se os arquivos são os corretos.");
        return;
      }

      const semMatch = clts.filter((c) => !c.net && !c.suitability).length;
      const n = await importarClientes(user.uid, clts);
      const aviso = semMatch > 0 ? ` (${semMatch} sem match no Positivador)` : "";
      setMsgImport(`${n} clientes importados${aviso}!`);
      load();
    } catch (err: any) {
      setMsgImport(`Erro: ${err.message}`);
    } finally {
      setImportando(false);
      setFileRelatorio(null);
      setFilePositivador(null);
      if (refRelatorio.current)   refRelatorio.current.value   = "";
      if (refPositivador.current) refPositivador.current.value = "";
    }
  };

  const sorted = [...clientes].sort((a, b) => (b.net || 0) - (a.net || 0));

  const aniversariantes = sorted
    .map((c) => ({ ...c, aniv: calcularAniversario(c.data_nascimento) }))
    .filter((c) => c.aniv && c.aniv.dias <= 30)
    .sort((a, b) => a.aniv!.dias - b.aniv!.dias);

  const filtrados = sorted.filter(
    (c) =>
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
          onSaved={load}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm">{clientes.length} clientes</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {msgImport && (
            <span className={`text-xs ${msgImport.startsWith("Erro") || msgImport.startsWith("Nenhum") ? "text-red-600" : "text-emerald-600"}`}>
              {msgImport}
            </span>
          )}
          <div className="flex items-center gap-2">
            {/* Input ocultos */}
            <input ref={refRelatorio} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => setFileRelatorio(e.target.files?.[0] ?? null)} />
            <input ref={refPositivador} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => setFilePositivador(e.target.files?.[0] ?? null)} />

            {/* Botão 1: Relatório Saldo (nome) */}
            <button onClick={() => refRelatorio.current?.click()} disabled={importando}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                fileRelatorio
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                  : "bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600"
              }`}>
              {fileRelatorio ? `✓ ${fileRelatorio.name.slice(0, 20)}…` : "1. Rel. Saldo (nome)"}
            </button>

            {/* Botão 2: Positivador (net) */}
            <button onClick={() => refPositivador.current?.click()} disabled={importando}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                filePositivador
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                  : "bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600"
              }`}>
              {filePositivador ? `✓ ${filePositivador.name.slice(0, 20)}…` : "2. Positivador (net)"}
            </button>

            {/* Botão importar — só ativo quando os dois estão selecionados */}
            <button onClick={importarDoisExcels} disabled={!podeImportar}
              className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {importando ? "Importando..." : "⬆ Importar"}
            </button>
          </div>
          {(!fileRelatorio || !filePositivador) && !importando && (
            <p className="text-xs text-slate-400">Selecione os 2 arquivos para habilitar a importação</p>
          )}
        </div>
      </div>

      {aniversariantes.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
              🎂 Aniversariantes nos próximos 30 dias ({aniversariantes.length})
            </p>
            <button onClick={() => setMostrarAniv(!mostrarAniv)} className="text-xs text-violet-500 hover:text-violet-700">
              {mostrarAniv ? "Ocultar ▲" : "Mostrar ▼"}
            </button>
          </div>
          {mostrarAniv && (
            <div className="flex flex-wrap gap-2">
              {aniversariantes.map((c) => (
                <button key={c.codigo_conta} onClick={() => onSelectConta(c.codigo_conta)}
                  className="flex items-center gap-2 bg-white border border-violet-200 rounded-lg px-3 py-1.5 hover:border-violet-400 transition-colors">
                  <span className="text-sm font-medium text-slate-800">{c.nome.split(" ").slice(0, 2).join(" ")}</span>
                  <span className="text-xs text-violet-600 font-semibold">
                    {c.aniv!.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    c.aniv!.dias === 0 ? "bg-violet-600 text-white" :
                    c.aniv!.dias <= 7 ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.aniv!.dias === 0 ? "Hoje!" : `${c.aniv!.dias}d`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, código ou profissão..."
          className="flex-1 max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-xs text-slate-400">{filtrados.length} clientes</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">
            {clientes.length === 0
              ? 'Nenhum cliente. Use "⬆ Importar XP Excel" para carregar sua base.'
              : "Nenhum cliente encontrado."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Profissão</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nascimento</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Perfil</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Patrimônio</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((c: any) => {
                const suit = c.suitability || "";
                const cor  = suitabilityColor[suit] || "bg-slate-100 text-slate-600";
                const aniv = calcularAniversario(c.data_nascimento);
                return (
                  <tr key={c.codigo_conta} className={`hover:bg-slate-50 transition-colors ${aniv && aniv.dias <= 30 ? "bg-violet-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{c.nome}</span>
                        {aniv && aniv.dias <= 30 && <span className="text-xs">🎂</span>}
                        <button onClick={() => setModalNota({ conta: c.codigo_conta, nome: c.nome })}
                          className="text-slate-300 hover:text-blue-600 transition-colors text-xs" title="Nova anotação">📝</button>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{c.codigo_conta}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.profissao || "—"}</td>
                    <td className="px-4 py-3">
                      {c.data_nascimento ? (
                        <span className="text-xs text-slate-600">
                          {new Date(c.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")}
                          {aniv && aniv.dias <= 30 && (
                            <span className="ml-2 text-violet-600 font-medium">
                              {aniv.dias === 0 ? "Hoje!" : `em ${aniv.dias}d`}
                            </span>
                          )}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {suit && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cor}`}>{suit}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{brl(c.net)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onSelectConta(c.codigo_conta)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                        Ver perfil →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page principal (decide lista vs perfil) ──────────────────────────────────
function ClientesPageInner() {
  const { user }  = useAuth();
  const router    = useRouter();
  const params    = useSearchParams();
  const conta     = params.get("conta");
  const [clientes, setClientes] = useState<any[]>([]);

  const load = () => {
    if (!user) return;
    getClientes(user.uid).then(setClientes).catch(() => {});
  };

  useEffect(() => { load(); }, [user]);

  const ir = (c: string) => router.push(`/clientes?conta=${c}`);
  const voltar = () => router.push("/clientes");

  if (conta) {
    return <ClientePerfil conta={conta} clientes={clientes} onVoltar={voltar} />;
  }

  return <ClientesLista clientes={clientes} load={load} onSelectConta={ir} />;
}

export default function ClientesPage() {
  return (
    <Suspense>
      <ClientesPageInner />
    </Suspense>
  );
}
