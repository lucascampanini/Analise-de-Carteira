"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { importarClientes, importarPosicoesMulti, importarFundosInfo } from "@/lib/firestore";
import * as XLSX from "xlsx";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// ── Helpers Excel ─────────────────────────────────────────────────────────────
async function lerExcel(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, { type: "array" });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function mapCol(headers: string[], ...opts: string[]) {
  return headers.find((h) => opts.some((o) => norm(h).includes(norm(o))));
}

function mapColExact(headers: string[], ...opts: string[]) {
  return headers.find((h) => opts.some((o) => norm(h) === norm(o)));
}

// ── Parsers: Clientes ─────────────────────────────────────────────────────────
function parseNet(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
}

function normalizarData(v: any): string {
  if (!v && v !== 0) return "";
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return "";
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s.slice(0, 10);
}

async function parsearClientes(fileRelatorio: File, filePositivador: File) {
  const rowsRel = await lerExcel(fileRelatorio);
  if (rowsRel.length === 0) throw new Error("Relatório Saldo: planilha vazia.");
  const hdRel    = Object.keys(rowsRel[0]);
  const colConta = mapCol(hdRel, "conta", "codigoconta", "codigo", "account");
  const colNome  = mapCol(hdRel, "cliente", "nomecliente", "nome");
  if (!colConta) throw new Error("Relatório Saldo: coluna de código não encontrada.");
  if (!colNome)  throw new Error("Relatório Saldo: coluna de nome não encontrada.");

  const nomesPorConta = new Map<string, string>();
  for (const r of rowsRel) {
    const conta = String(r[colConta] || "").trim();
    if (conta) nomesPorConta.set(conta, String(r[colNome] || "").trim());
  }

  const rowsPos = await lerExcel(filePositivador);
  if (rowsPos.length === 0) throw new Error("Positivador: planilha vazia.");
  const hdPos    = Object.keys(rowsPos[0]);
  const colContaP = mapCol(hdPos, "codcliente", "codigocliente", "conta", "account");
  const colNet    = mapCol(hdPos, "netemm", "netem", "net", "patrimonio", "saldo");
  const colSuit   = mapCol(hdPos, "suitability", "dscsuitability", "perfil");
  const colProf   = mapCol(hdPos, "profissao", "dscprofissao", "profissão", "ocupacao");
  const colNasc   = mapCol(hdPos, "datanascimento", "datdatanascimento", "nascimento");
  const colSeg    = mapCol(hdPos, "segmento", "dscsegmento");
  if (!colContaP) throw new Error("Positivador: coluna de código não encontrada.");
  if (!colNet)    throw new Error("Positivador: coluna de NET não encontrada.");

  const dadosPorConta = new Map<string, any>();
  for (const r of rowsPos) {
    const conta = String(r[colContaP] || "").trim();
    if (!conta) continue;
    dadosPorConta.set(conta, {
      net:             parseNet(r[colNet]),
      suitability:     colSuit ? String(r[colSuit]  || "").trim() : "",
      profissao:       colProf ? String(r[colProf]  || "").trim() : "",
      data_nascimento: colNasc ? normalizarData(r[colNasc]) : "",
      segmento:        colSeg  ? String(r[colSeg]   || "").trim() : "",
    });
  }

  const clts: any[] = [];
  for (const [conta, nome] of nomesPorConta) {
    if (!nome) continue;
    const pos = dadosPorConta.get(conta) ?? {};
    clts.push({ codigo_conta: conta, nome, net: pos.net ?? 0, suitability: pos.suitability ?? "", profissao: pos.profissao ?? "", data_nascimento: pos.data_nascimento ?? "", segmento: pos.segmento ?? "" });
  }
  if (clts.length === 0) throw new Error("Nenhum cliente encontrado. Verifique se os arquivos são os corretos.");
  return clts;
}

// ── Parsers: Diversificador ───────────────────────────────────────────────────
function normalizeClasse(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("prev")) return "Previdência";
  if (s.includes("imobili") || s.includes("fii")) return "FII";
  if (s.includes("fix") || s.includes(" rf")) return "Renda Fixa";
  if (s.includes("vari") || s.includes(" rv") || s.includes("bdr") || s.includes("etf")) return "Renda Variável";
  if (s.includes("fund") || s.includes("fim") || s.includes("fic")) return "Fundos";
  return "Outros";
}

function normalizarClasseXP(produto: string, dscAtivo: string): string {
  const p = (produto || "").toLowerCase();
  const a = (dscAtivo || "").toLowerCase();
  if (p.includes("previd")) return "Previdência";
  if (p.includes("imobili") || p.includes("fii") || a.includes("fii")) return "FII";
  if (p.includes("renda fixa") || p.includes("tesouro")) return "Renda Fixa";
  if (p.includes("ação") || p.includes("acao") || p.includes("bdr") || p.includes("etf")) return "Renda Variável";
  if (p.includes("fundo") || p.includes("fim") || p.includes("fic") || p.includes("multimercado")) return "Fundos";
  return normalizeClasse(produto || dscAtivo);
}

function parseLiquidez(raw: string): number {
  if (!raw) return 9999;
  const s = raw.toString().toLowerCase().replace(/\s/g, "");
  if (s === "vencimento") return 9999;
  const parts = s.split("/");
  const last = parts[parts.length - 1];
  const m = last.match(/d?\+?(\d+)/);
  return m ? parseInt(m[1]) : 9999;
}

async function parsearDiversificador(file: File) {
  const rows = await lerExcel(file);
  if (rows.length === 0) throw new Error("Planilha vazia.");
  const headers = Object.keys(rows[0]);
  const colConta = mapCol(headers, "codcliente", "codigodaconta", "codigoconta", "conta", "codigo");
  const colAtivo = mapColExact(headers, "dscativo", "nomativo", "nomefundo", "fundo", "papel", "titulo");
  const colProd  = mapCol(headers, "dscproduto", "produto", "classe", "tipo", "categoria", "tipodeativos");
  const colGest  = mapCol(headers, "gestora", "gestor", "administrador", "dscgestor");
  const colValor = mapCol(headers, "valnet", "valornet", "valorliquido", "valorbrutodeativos", "valorbruto", "saldo", "valor", "pl");
  const colLiq   = mapCol(headers, "prazoderesgate", "liquidez", "prazo", "resgate");
  const colRent  = mapCol(headers, "rentabilidade12m", "rent12m", "rentabilidade");
  const colCNPJ  = mapCol(headers, "dsccnpjfundo", "cnpjfundo", "cnpjativo", "cnpj");

  const parsed = rows.map((r: any) => {
    const valor = parseFloat(String(r[colValor!] ?? "0").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
    if (!valor || valor < 0.01) return null;
    const conta    = colConta ? String(r[colConta] || "").trim() : "";
    const rawLiq   = colLiq  ? String(r[colLiq]   || "")        : "";
    const produtoRaw = colProd ? String(r[colProd] || "") : "";
    const ativoRaw   = colAtivo ? String(r[colAtivo] || "—").trim() : "—";
    const cnpjRaw    = colCNPJ  ? String(r[colCNPJ]  || "").replace(/\D/g, "") : "";
    return {
      codigo_conta:    conta,
      ativo:           ativoRaw,
      cnpj_fundo:      cnpjRaw.length === 14 ? cnpjRaw : "",
      classe:          normalizarClasseXP(produtoRaw, ativoRaw) || normalizeClasse(produtoRaw),
      gestora:         colGest ? String(r[colGest] || "").trim() : "",
      valor,
      liquidez_raw:    rawLiq || "—",
      liquidez_dias:   parseLiquidez(rawLiq),
      rent_12m:        colRent ? (parseFloat(String(r[colRent] || "0").replace(",", ".")) || null) : null,
    };
  }).filter(Boolean) as any[];

  const comConta = parsed.filter((p) => p.codigo_conta);
  if (comConta.length === 0) throw new Error("Nenhuma posição com código de cliente encontrada. Verifique se o arquivo é o Diversificador XP.");
  return comConta;
}

// ── Parsers: Lista de Fundos ──────────────────────────────────────────────────
function parsePrazoETipo(v: any): { dias: number | null; tipo: "DU" | "DC" } {
  if (!v) return { dias: null, tipo: "DU" };
  const s = String(v).toLowerCase().trim();
  if (!s || s === "---" || s === "-") return { dias: null, tipo: "DU" };
  const isUteis = s.includes("úteis") || s.includes("uteis") || s.includes(" du") || s.includes("d.u") || s.endsWith("du");
  const tipo: "DU" | "DC" = isUteis ? "DU" : "DC";
  const m = s.match(/(\d+)/);
  return { dias: m ? parseInt(m[1]) : null, tipo };
}

async function parsearListaFundos(file: File) {
  const rows = await lerExcel(file);
  if (rows.length === 0) throw new Error("Planilha vazia.");
  const headers = Object.keys(rows[0]);
  const colCNPJ  = mapCol(headers, "cnpjfundo", "cnpj");
  const colNome  = mapCol(headers, "nomefundo", "nome", "denominacao", "denomsocial");
  const colGest  = mapCol(headers, "nomegestora", "gestora", "gestor");
  const colCotiz = mapCol(headers, "cotizacaoresgate", "cotizacao", "prazocotizacao", "prazocotiz", "diasparacotizacao");
  const colLiq   = mapCol(headers, "liquidacaoresgate", "liquidacao", "prazoliquidacao", "prazopagto", "diasparaliquidacao");
  const colTipoCot = mapCol(headers, "periodocotizacao", "tipocotizacao", "tipocotiz", "unidadecotiz");
  const colTipoLiq = mapCol(headers, "periodoliquidacao", "tipoliquidacao", "tipoliq", "unidadeliq");

  const fundos = rows
    .filter((r) => colCNPJ && r[colCNPJ])
    .map((r) => {
      const cnpj = String(r[colCNPJ!] || "").replace(/\D/g, "").padStart(14, "0");
      const { dias: cotizDias, tipo: cotizTipoCell } = parsePrazoETipo(colCotiz ? r[colCotiz] : null);
      const { dias: pagtoDias, tipo: pagtoTipoCell  } = parsePrazoETipo(colLiq   ? r[colLiq]   : null);
      const tipoCotStr = String(colTipoCot ? r[colTipoCot] : "").toLowerCase();
      const tipoPagStr = String(colTipoLiq ? r[colTipoLiq] : "").toLowerCase();
      const tipoCot: "DU" | "DC" = tipoCotStr ? (tipoCotStr.includes("úteis") || tipoCotStr.includes("uteis") ? "DU" : "DC") : cotizTipoCell;
      const tipoPag: "DU" | "DC" = tipoPagStr ? (tipoPagStr.includes("úteis") || tipoPagStr.includes("uteis") ? "DU" : "DC") : pagtoTipoCell;
      const totalDias = (cotizDias ?? 0) + (pagtoDias ?? 0);
      const tipoFinal = tipoCot === "DU" && tipoPag === "DU" ? "DU" : "DC";
      const prazo_fmt = cotizDias != null ? `D+${cotizDias} ${tipoCot} + D+${pagtoDias ?? 0} ${tipoPag} = D+${totalDias} ${tipoFinal}` : "—";
      return {
        cnpj,
        nome_fundo:      colNome ? String(r[colNome] || "").trim() : "",
        gestora:         colGest ? String(r[colGest] || "").trim() : "",
        dias_cotizacao:  cotizDias,
        tipo_dia_cotiz:  tipoCot,
        dias_pagto:      pagtoDias,
        tipo_dia_pagto:  tipoPag,
        total_dias:      totalDias,
        tipo_final:      tipoFinal,
        prazo_fmt,
      };
    })
    .filter((f) => f.cnpj.length === 14);

  if (fundos.length === 0) throw new Error("Nenhum fundo encontrado. Verifique o formato (CNPJ_FUNDO, NOME_FUNDO...).");
  return fundos;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
type Status = "idle" | "loading" | "ok" | "error";

function StatusIcon({ status }: { status: Status }) {
  if (status === "loading") return <Loader2 size={18} className="animate-spin text-blue-500" />;
  if (status === "ok")      return <CheckCircle size={18} className="text-emerald-500" />;
  if (status === "error")   return <AlertCircle size={18} className="text-red-500" />;
  return null;
}

function FileInput({ label, accept, fileRef, onChange }: {
  label: string;
  accept?: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onChange: (f: File) => void;
}) {
  const [nome, setNome] = useState("");
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:border-blue-400 hover:bg-blue-50 transition-colors">
        <Upload size={15} className="text-slate-400" />
        <span className="text-sm text-slate-600 truncate">{nome || "Selecionar arquivo…"}</span>
        <input
          ref={fileRef}
          type="file"
          accept={accept || ".xlsx,.xls,.csv"}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setNome(f.name); onChange(f); }
          }}
        />
      </label>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 text-lg">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function ImportarPage() {
  const { user } = useAuth();

  // Clientes
  const [fileRel,  setFileRel]  = useState<File | null>(null);
  const [filePos,  setFilePos]  = useState<File | null>(null);
  const [stClts,   setStClts]   = useState<Status>("idle");
  const [msgClts,  setMsgClts]  = useState("");
  const refRel = useRef<HTMLInputElement>(null);
  const refPos = useRef<HTMLInputElement>(null);

  // Diversificador
  const [fileDiv,  setFileDiv]  = useState<File | null>(null);
  const [stDiv,    setStDiv]    = useState<Status>("idle");
  const [msgDiv,   setMsgDiv]   = useState("");
  const refDiv = useRef<HTMLInputElement>(null);

  // Lista de Fundos
  const [fileFund, setFileFund] = useState<File | null>(null);
  const [stFund,   setStFund]   = useState<Status>("idle");
  const [msgFund,  setMsgFund]  = useState("");
  const refFund = useRef<HTMLInputElement>(null);

  const isImporting = stClts === "loading" || stDiv === "loading" || stFund === "loading";

  // ── Import individual ────────────────────────────────────────────────────────
  async function runClientes() {
    if (!user || !fileRel || !filePos) return;
    setStClts("loading"); setMsgClts("");
    try {
      const clts = await parsearClientes(fileRel, filePos);
      const semMatch = clts.filter((c: any) => !c.net && !c.suitability).length;
      const n = await importarClientes(user.uid, clts);
      setMsgClts(`${n} clientes importados${semMatch > 0 ? ` (${semMatch} sem match no Positivador)` : ""}!`);
      setStClts("ok");
    } catch (err: any) {
      setMsgClts(err.message); setStClts("error");
    }
  }

  async function runDiversificador() {
    if (!user || !fileDiv) return;
    setStDiv("loading"); setMsgDiv("");
    try {
      const posicoes = await parsearDiversificador(fileDiv);
      const nContas  = new Set(posicoes.map((p: any) => p.codigo_conta)).size;
      const n = await importarPosicoesMulti(user.uid, posicoes);
      setMsgDiv(`${n} posições importadas (${nContas} clientes)!`);
      setStDiv("ok");
    } catch (err: any) {
      setMsgDiv(err.message); setStDiv("error");
    }
  }

  async function runListaFundos() {
    if (!user || !fileFund) return;
    setStFund("loading"); setMsgFund("");
    try {
      const fundos = await parsearListaFundos(fileFund);
      const n = await importarFundosInfo(user.uid, fundos);
      setMsgFund(`${n} fundos importados!`);
      setStFund("ok");
    } catch (err: any) {
      setMsgFund(err.message); setStFund("error");
    }
  }

  // ── Importar Tudo ────────────────────────────────────────────────────────────
  async function importarTudo() {
    const tarefas: Promise<void>[] = [];
    if (fileRel && filePos) tarefas.push(runClientes());
    if (fileDiv)            tarefas.push(runDiversificador());
    if (fileFund)           tarefas.push(runListaFundos());
    if (tarefas.length === 0) return;
    await Promise.all(tarefas);
  }

  const algumArquivo = !!(fileRel && filePos) || !!fileDiv || !!fileFund;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Importar Documentos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Selecione os arquivos e importe tudo de uma vez, ou individualmente por seção.
        </p>
      </div>

      {/* ── Clientes ── */}
      <Card
        title="Clientes"
        description="Relatório Saldo Consolidado + Positivador XP (dois arquivos Excel)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FileInput label="Relatório Saldo Consolidado" fileRef={refRel} onChange={setFileRel} />
          <FileInput label="Positivador" fileRef={refPos} onChange={setFilePos} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runClientes}
            disabled={!fileRel || !filePos || isImporting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Importar Clientes
          </button>
          <StatusIcon status={stClts} />
          {msgClts && (
            <p className={`text-sm ${stClts === "error" ? "text-red-600" : "text-emerald-600"}`}>{msgClts}</p>
          )}
        </div>
      </Card>

      {/* ── Diversificador ── */}
      <Card
        title="Diversificador XP"
        description="Posições de todos os clientes (um arquivo com coluna COD_CLIENTE)"
      >
        <FileInput label="Diversificador XP" fileRef={refDiv} onChange={setFileDiv} />
        <div className="flex items-center gap-3">
          <button
            onClick={runDiversificador}
            disabled={!fileDiv || isImporting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Importar Posições
          </button>
          <StatusIcon status={stDiv} />
          {msgDiv && (
            <p className={`text-sm ${stDiv === "error" ? "text-red-600" : "text-emerald-600"}`}>{msgDiv}</p>
          )}
        </div>
      </Card>

      {/* ── Lista de Fundos ── */}
      <Card
        title="Lista de Fundos XP"
        description="Planilha com CNPJ, nome e liquidez dos fundos (cotização + liquidação)"
      >
        <FileInput label="Lista de Fundos XP" fileRef={refFund} onChange={setFileFund} />
        <div className="flex items-center gap-3">
          <button
            onClick={runListaFundos}
            disabled={!fileFund || isImporting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Importar Fundos
          </button>
          <StatusIcon status={stFund} />
          {msgFund && (
            <p className={`text-sm ${stFund === "error" ? "text-red-600" : "text-emerald-600"}`}>{msgFund}</p>
          )}
        </div>
      </Card>

      {/* ── Botão Importar Tudo ── */}
      <div className="pt-2">
        <button
          onClick={importarTudo}
          disabled={!algumArquivo || isImporting}
          className="w-full py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {isImporting ? "Importando…" : "Importar Tudo de Uma Vez"}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">
          Apenas as seções com arquivo selecionado serão importadas.
        </p>
      </div>
    </div>
  );
}
