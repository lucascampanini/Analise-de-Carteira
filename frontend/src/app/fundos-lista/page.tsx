"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDataRefresh } from "@/contexts/DataRefreshContext";
import { getPosicoes, getClientes } from "@/lib/firestore";
import { brl } from "@/lib/formatters";
import { writeBatch, doc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";

// ── Firestore helpers ────────────────────────────────────────────────────────
async function importarFundosInfo(uid: string, fundos: any[]) {
  const col = collection(db, "users", uid, "fundos_info");
  // Upsert por CNPJ — evita apagar+reinserir (reduz writes ~3x)
  for (let i = 0; i < fundos.length; i += 400) {
    const b = writeBatch(db);
    fundos.slice(i, i + 400).forEach((f) => {
      const ref = doc(col, f.cnpj || String(Math.random()));
      b.set(ref, f);
    });
    await b.commit();
  }
  return fundos.length;
}

async function getFundosInfo(uid: string) {
  const col = collection(db, "users", uid, "fundos_info");
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Parsers ──────────────────────────────────────────────────────────────────
function parsePrazoETipo(v: any): { dias: number | null; tipo: "DU" | "DC" } {
  if (!v) return { dias: null, tipo: "DU" };
  const s = String(v).toLowerCase().trim();
  if (!s || s === "---" || s === "-") return { dias: null, tipo: "DU" };
  // Detecta se é dias úteis ou corridos pelo conteúdo da célula
  const isUteis =
    s.includes("úteis") || s.includes("uteis") ||
    s.includes(" du") || s.includes("d.u") || s.endsWith("du");
  const tipo: "DU" | "DC" = isUteis ? "DU" : "DC";
  const m = s.match(/(\d+)/);
  return { dias: m ? parseInt(m[1]) : null, tipo };
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function mapColFundo(headers: string[], ...opts: string[]) {
  return headers.find((h) =>
    opts.some((o) => norm(h).includes(norm(o)))
  );
}

// Estrutura XP lista-fundos: J=dias cotiz, K=tipo cotiz, L=dias liq, M=tipo liq
function parsearListaFundos(rows: any[]): any[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const colCNPJ = mapColFundo(headers, "cnpjfundo", "cnpj");
  const colNome = mapColFundo(headers, "nomefundo", "nome", "denominacao", "denomsocial");
  const colGest = mapColFundo(headers, "nomegestora", "gestora", "gestor");

  // J=dias cotização, K=tipo cotização, L=dias liquidação, M=tipo liquidação
  // Tenta por nome; fallback por posição (J=9, K=10, L=11, M=12)
  const colDiasCotiz = mapColFundo(headers, "diascotiz", "prazocotiz", "cotizacao") ?? headers[9];
  const colTipoCotiz = mapColFundo(headers, "tipocotiz", "periodocotiz", "unidcotiz", "modalidadecotiz") ?? headers[10];
  const colDiasLiq   = mapColFundo(headers, "diasliq", "prazoliq", "liquidacao") ?? headers[11];
  const colTipoLiq   = mapColFundo(headers, "tipoliq", "periodoliq", "unidliq", "modalidadeliq") ?? headers[12];

  const parseDias = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const m = String(v).match(/\d+/);
    return m ? parseInt(m[0]) : null;
  };

  const parseTipo = (v: any): "DU" | "DC" => {
    const s = norm(String(v || ""));
    return s.includes("util") || s === "du" || s.endsWith("du") ? "DU" : "DC";
  };

  return rows
    .filter((r) => colCNPJ && r[colCNPJ])
    .map((r) => {
      const cnpj = String(r[colCNPJ!] || "").replace(/\D/g, "");
      if (cnpj.length !== 14) return null;

      const cotizDias = parseDias(r[colDiasCotiz]);
      const tipoCot   = parseTipo(r[colTipoCotiz]);
      const pagtoDias = parseDias(r[colDiasLiq]);
      const tipoPag   = parseTipo(r[colTipoLiq]);

      const totalDias = (cotizDias ?? 0) + (pagtoDias ?? 0);
      const tipoFinal = tipoCot === "DU" && tipoPag === "DU" ? "DU" : "DC";
      const prazo_fmt = cotizDias != null
        ? `D+${cotizDias} ${tipoCot} + D+${pagtoDias ?? 0} ${tipoPag} = D+${totalDias} ${tipoFinal}`
        : "—";

      return {
        cnpj,
        nome_fundo:     colNome ? String(r[colNome] || "").trim() : "—",
        gestora:        colGest ? String(r[colGest] || "").trim() : "—",
        dias_cotizacao: cotizDias,
        tipo_dia_cotiz: tipoCot,
        dias_pagto:     pagtoDias,
        tipo_dia_pagto: tipoPag,
        total_dias:     totalDias,
        tipo_final:     tipoFinal,
        prazo_fmt,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
}

// ── Cruzamento posições × fundos_info ───────────────────────────────────────
function cruzarPosicoesFundos(posicoes: any[], fundosInfo: any[]) {
  const mapaFundo: Record<string, any> = {};
  fundosInfo.forEach((f) => {
    mapaFundo[f.cnpj] = f;
    // Também indexa por nome normalizado (fallback)
    const nNorm = f.nome_fundo.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (nNorm) mapaFundo[nNorm] = f;
  });

  const fundoPosicoes = posicoes.filter(
    (p) => p.classe === "Fundos" || p.classe === "Previdência" || p.classe === "Renda Fixa"
  );

  // Agrupa por nome do ativo (fundo)
  const agg: Record<string, any> = {};
  for (const p of fundoPosicoes) {
    const key = (p.ativo || "—").trim();
    if (!agg[key]) {
      // 1º cruza por CNPJ, 2º por nome normalizado
      const nNorm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const info = (p.cnpj_fundo && mapaFundo[p.cnpj_fundo]) || mapaFundo[nNorm] || null;
      agg[key] = {
        ativo: key,
        classe: p.classe,
        gestora: p.gestora || info?.gestora || "—",
        valor: 0,
        nClientes: new Set(),
        prazo_fmt: info?.prazo_fmt || p.liquidez_raw || "—",
        total_dias: info?.total_dias ?? p.liquidez_dias ?? 9999,
      };
    }
    agg[key].valor += p.valor || 0;
    agg[key].nClientes.add(p.codigo_conta);
  }

  return Object.values(agg)
    .map((x) => ({ ...x, nClientes: x.nClientes.size }))
    .sort((a, b) => b.valor - a.valor);
}

function CustomScrollbar({ contentRef }: { contentRef: React.RefObject<HTMLDivElement | null> }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 30 });
  const drag = useRef<{ startX: number; startScroll: number } | null>(null);

  const update = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const w = Math.max((el.clientWidth / el.scrollWidth) * 100, 8);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const l = maxScroll > 0 ? (el.scrollLeft / maxScroll) * (100 - w) : 0;
    setThumb({ left: l, width: w });
  }, [contentRef]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!drag.current || !contentRef.current || !trackRef.current) return;
      const dx = e.clientX - drag.current.startX;
      const trackW = trackRef.current.clientWidth;
      const el = contentRef.current;
      const ratio = (el.scrollWidth - el.clientWidth) / (trackW - trackW * (thumb.width / 100));
      el.scrollLeft = drag.current.startScroll + dx * ratio;
    };
    const up = () => { drag.current = null; };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  }, [contentRef, thumb.width]);

  // Não renderiza se não há scroll horizontal
  if (thumb.width >= 100) return null;

  return (
    <div
      ref={trackRef}
      className="relative bg-slate-200 cursor-pointer"
      style={{ height: 20 }}
      onClick={(e) => {
        if (!contentRef.current || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const el = contentRef.current;
        el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
      }}
    >
      <div
        className="absolute top-1 bottom-1 bg-svn-ruby hover:bg-svn-ruby-dark rounded-full cursor-grab active:cursor-grabbing transition-colors"
        style={{ left: `${thumb.left}%`, width: `${thumb.width}%` }}
        onMouseDown={(e) => {
          drag.current = { startX: e.clientX, startScroll: contentRef.current?.scrollLeft ?? 0 };
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
}

const LIQ_COR = (dias: number) => {
  if (dias <= 1)  return "bg-emerald-100 text-emerald-700";
  if (dias <= 5)  return "bg-[#f5e8e7] text-svn-ruby";
  if (dias <= 30) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-600";
};

// ── Componente ───────────────────────────────────────────────────────────────
export default function FundosListaPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [posicoes,   setPosicoes]   = useState<any[]>([]);
  const [clientes,   setClientes]   = useState<any[]>([]);
  const [fundosInfo, setFundosInfo] = useState<any[]>([]);
  const [busca,      setBusca]      = useState("");
  const [filtroClasse, setFiltroClasse] = useState("Todos");
  const [importando, setImportando] = useState(false);
  const [msgImport,  setMsgImport]  = useState("");
  const [ativoDetalhe, setAtivoDetalhe] = useState<string | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const tabelaRef  = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [pos, fi, cls] = await Promise.all([getPosicoes(user.uid), getFundosInfo(user.uid), getClientes(user.uid)]);
    setPosicoes(pos);
    setFundosInfo(fi);
    setClientes(cls);
  }, [user, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const importarExcel = async (file: File) => {
    if (!user) return;
    setImportando(true);
    setMsgImport("");
    try {
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      if (rows.length === 0) { setMsgImport("Planilha vazia."); return; }
      const fundos = parsearListaFundos(rows);
      if (fundos.length === 0) { setMsgImport("Nenhum fundo encontrado. Verifique o formato (CNPJ_FUNDO, NOME_FUNDO...)."); return; }
      const n = await importarFundosInfo(user.uid, fundos);
      setMsgImport(`${n} fundos importados!`);
      await load();
    } catch (err: any) {
      setMsgImport(`Erro: ${err.message}`);
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const lista = cruzarPosicoesFundos(posicoes, fundosInfo);
  const pl    = lista.reduce((s, x) => s + x.valor, 0);

  const filtrados = lista.filter((x) => {
    const classOk = filtroClasse === "Todos" || x.classe === filtroClasse;
    const buscaOk = !busca || x.ativo.toLowerCase().includes(busca.toLowerCase()) || x.gestora.toLowerCase().includes(busca.toLowerCase());
    return classOk && buscaOk;
  });

  const classes = ["Todos", ...Array.from(new Set(lista.map((x) => x.classe)))];

  const plPorConta = useMemo(() => {
    const map: Record<string, number> = {};
    posicoes.forEach((p) => { map[p.codigo_conta] = (map[p.codigo_conta] || 0) + (p.valor || 0); });
    return map;
  }, [posicoes]);

  const clientesDoAtivo = useMemo(() => {
    if (!ativoDetalhe) return [];
    return posicoes
      .filter((p) => p.ativo === ativoDetalhe)
      .map((p) => ({
        ...p,
        nome: clientes.find((c) => c.codigo_conta === p.codigo_conta)?.nome || p.codigo_conta,
        pct_carteira: plPorConta[p.codigo_conta] > 0 ? (p.valor / plPorConta[p.codigo_conta]) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [ativoDetalhe, posicoes, clientes, plPorConta]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fundos & RF</h1>
          <p className="text-slate-500 text-sm">Posições consolidadas de todos os clientes · {lista.length} ativos</p>
        </div>
        <div className="flex items-center gap-2">
          {msgImport && (
            <span className={`text-xs ${msgImport.startsWith("Erro") || msgImport.startsWith("Nenhum") ? "text-red-600" : "text-emerald-600"}`}>
              {msgImport}
            </span>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => e.target.files?.[0] && importarExcel(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={importando}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {importando ? "Importando..." : "⬆ Importar Lista Fundos XP"}
          </button>
        </div>
      </div>

      {fundosInfo.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <strong>Dica:</strong> importe a planilha <code>lista-fundos-*.xlsx</code> da XP para enriquecer os dados de liquidez dos fundos.
          Sem ela, será usado o prazo do diversificador quando disponível.
        </div>
      )}

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <p className="text-slate-400 text-sm">Sem posições. Importe o Diversificador XP na aba Carteira primeiro.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "PL total",     value: brl(pl) },
              { label: "Ativos",       value: lista.length },
              { label: "Fundos info",  value: `${fundosInfo.length} importados` },
              { label: "D+0 a D+1",   value: brl(lista.filter((x) => x.total_dias <= 1).reduce((s, x) => s + x.valor, 0)) },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-xl font-bold text-slate-800">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar fundo ou gestora..."
              className="flex-1 max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby" />
            <div className="flex gap-1">
              {classes.map((c) => (
                <button key={c} onClick={() => setFiltroClasse(c)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    filtroClasse === c ? "bg-svn-ruby text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 ml-auto">{filtrados.length} ativos</span>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <CustomScrollbar contentRef={tabelaRef} />
            <div ref={tabelaRef} className="overflow-x-auto no-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Fundo / Ativo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Gestora</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Classe</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Liquidez</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Clientes</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Valor Total</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">%</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((x, i) => {
                    const pct      = pl > 0 ? (x.valor / pl) * 100 : 0;
                    const aberto   = ativoDetalhe === x.ativo;
                    const clisAtivo = aberto ? clientesDoAtivo : [];
                    return (
                      <>
                        <tr
                          key={x.ativo}
                          className={`border-b border-slate-100 cursor-pointer transition-colors ${aberto ? "bg-[#f5e8e7]/40" : "hover:bg-slate-50"}`}
                          onClick={() => setAtivoDetalhe(aberto ? null : x.ativo)}
                        >
                          <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-slate-800 max-w-xs truncate">{x.ativo}</p>
                              <span className="text-slate-400 text-xs">{aberto ? "▲" : "▼"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{x.gestora}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{x.classe}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LIQ_COR(x.total_dias)}`}>
                              {x.prazo_fmt}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-500">{x.nClientes}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{brl(x.valor)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-svn-ruby rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                        {aberto && (
                          <tr key={`${x.ativo}-detail`} className="border-b border-slate-200 bg-slate-50">
                            <td colSpan={8} className="px-6 py-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {clisAtivo.map((p, j) => (
                                  <div key={p.codigo_conta} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-slate-100">
                                    <span className="text-xs text-slate-400 w-4 shrink-0">{j + 1}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-800 truncate">{p.nome}</p>
                                      <p className="text-xs text-slate-400 font-mono">{p.codigo_conta}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-xs font-bold text-slate-800">{brl(p.valor)}</p>
                                      <p className="text-xs text-slate-400">{p.pct_carteira.toFixed(1)}%</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={6} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {brl(filtrados.reduce((s, x) => s + x.valor, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
