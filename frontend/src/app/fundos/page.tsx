"use client";
import { useEffect, useRef, useState, useCallback, useMemo, Suspense, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDataRefresh } from "@/contexts/DataRefreshContext";
import { useSearchParams } from "next/navigation";
import { getClientes, getPosicoes, importarPosicoes, importarPosicoesMulti, deletarPosicoesCliente, getFundosInfo } from "@/lib/firestore";
import { brl } from "@/lib/formatters";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

const CLASSE_COR: Record<string, string> = {
  "Renda Fixa":     "#3b82f6",
  "Renda Variável": "#8b5cf6",
  "Fundos":         "#f59e0b",
  "Previdência":    "#ec4899",
  "FII":            "#10b981",
  "Outros":         "#94a3b8",
};

const LIQUIDEZ_BUCKETS = [
  { label: "D+0 a D+1",   max: 1,    cor: "#10b981" },
  { label: "D+2 a D+5",   max: 5,    cor: "#3b82f6" },
  { label: "D+6 a D+30",  max: 30,   cor: "#f59e0b" },
  { label: "D+31 a D+90", max: 90,   cor: "#f97316" },
  { label: "D+91+",       max: 9999, cor: "#ef4444" },
];

function normalizeClasse(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("prev")) return "Previdência";
  if (s.includes("imobili") || s.includes("fii")) return "FII";
  if (s.includes("fix") || s.includes(" rf") || s.startsWith("rf")
    || s.includes("cdb") || s.includes("lci") || s.includes("lca")
    || s.includes("cri") || s.includes("cra") || s.includes("debentur")
    || s.includes("debêntur") || s.includes("tesouro") || s.includes("credito privado")
    || s.includes("crédito privado") || s.includes("letras") || s.includes("fidc")) return "Renda Fixa";
  if (s.includes("vari") || s.includes(" rv") || s.includes("bdr") || s.includes("etf")) return "Renda Variável";
  if (s.includes("fund") || s.includes("fim") || s.includes("fic")) return "Fundos";
  return "Outros";
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

function liquidezBucket(dias: number): string {
  for (const b of LIQUIDEZ_BUCKETS) {
    if (dias <= b.max) return b.label;
  }
  return "D+91+";
}

function mapCol(headers: string[], ...opts: string[]) {
  return headers.find((h) =>
    opts.some((o) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "").includes(o.toLowerCase().replace(/[^a-z0-9]/g, ""))
    )
  );
}

// Match exato (normalizado) — evita falsos positivos em colunas críticas
function mapColExact(headers: string[], ...opts: string[]) {
  return headers.find((h) =>
    opts.some((o) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "") === o.toLowerCase().replace(/[^a-z0-9]/g, "")
    )
  );
}

// Detecta a classe a partir do DSC_PRODUTO do Diversificador XP
function normalizarClasseXP(produto: string, dscAtivo: string): string {
  const p = (produto || "").toLowerCase();
  const a = (dscAtivo || "").toLowerCase();
  if (p.includes("previd")) return "Previdência";
  if (p.includes("imobili") || p.includes("fii") || a.includes("fii")) return "FII";
  if (p.includes("renda fixa") || p.includes("tesouro") || p.includes("credito privado")
    || p.includes("crédito privado") || p.includes("cdb") || p.includes("lci")
    || p.includes("lca") || p.includes("cri") || p.includes("cra")
    || p.includes("debentur") || p.includes("debêntur") || p.includes("letras")
    || a.includes("cdb") || a.includes("lci") || a.includes("lca")
    || a.includes("cri") || a.includes("cra") || a.includes("tesouro")) return "Renda Fixa";
  if (p.includes("ação") || p.includes("acao") || p.includes("bdr") || p.includes("etf")) return "Renda Variável";
  if (p.includes("fundo") || p.includes("fim") || p.includes("fic") || p.includes("multimercado")) return "Fundos";
  return normalizeClasse(produto || dscAtivo);
}

function parseDataExcel(v: any): string {
  if (!v && v !== 0) return "";
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s.slice(0, 10);
}

function parseExcel(rows: any[], contaFixa?: string) {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  // Suporte às colunas do XP Diversificador (COD_CLIENTE, DSC_ATIVO, VAL_NET, etc.)
  const colConta  = mapCol(headers, "codcliente", "codigodaconta", "codigoconta", "conta", "codigo");
  const colAtivo  = mapColExact(headers, "dscativo", "nomativo", "nomefundo", "fundo", "papel", "titulo");
  const colProd   = mapCol(headers, "dscproduto", "produto", "classe", "tipo", "categoria", "tipodeativos");
  const colClasse = mapCol(headers, "classe", "tipo", "categoria", "tipodeativos", "segmento");
  const colTipo   = mapCol(headers, "subtipo", "subclasse", "tipodeproduto", "estrategia");
  const colGest   = mapCol(headers, "gestora", "gestor", "administrador", "dscgestor");
  const colValor  = mapCol(headers, "valnet", "valornet", "valorliquido", "valorbrutodeativos", "valorbruto", "saldo", "valor", "pl");
  const colLiq    = mapCol(headers, "prazoderesgate", "liquidez", "prazo", "resgate");
  const colRent   = mapCol(headers, "rentabilidade12m", "rent12m", "rentabilidade");
  const colCNPJ   = mapCol(headers, "dsccnpjfundo", "cnpjfundo", "cnpjativo", "cnpj");
  const colVenc   = mapCol(headers, "datvencimento", "datavencimento", "dtavencimento", "vencimento", "datavenc", "dtvenc");

  return rows
    .map((r: any) => {
      const valor = parseFloat(
        String(r[colValor!] ?? "0").replace(/[^0-9.,-]/g, "").replace(",", ".")
      ) || 0;
      if (!valor || valor < 0.01) return null;
      const conta = contaFixa || (colConta ? String(r[colConta] || "").trim() : "");
      const rawLiq = colLiq ? String(r[colLiq] || "") : "";
      const diasLiq = parseLiquidez(rawLiq);
      const produtoRaw = colProd ? String(r[colProd] || "") : "";
      const ativoRaw   = colAtivo ? String(r[colAtivo] || "—").trim() : "—";
      const cnpjRaw    = colCNPJ  ? String(r[colCNPJ]  || "").replace(/\D/g, "") : "";
      const vencRaw    = colVenc  ? r[colVenc] : null;
      const data_vencimento = parseDataExcel(vencRaw);
      return {
        codigo_conta:    conta,
        ativo:           ativoRaw,
        cnpj_fundo:      cnpjRaw.length === 14 ? cnpjRaw : "",
        classe:          normalizarClasseXP(produtoRaw, ativoRaw) || normalizeClasse(colClasse ? String(r[colClasse] || "") : produtoRaw),
        tipo:            colTipo   ? String(r[colTipo]   || "").trim()  : "",
        gestora:         colGest   ? String(r[colGest]   || "").trim()  : "",
        valor,
        liquidez_raw:    rawLiq || "—",
        liquidez_dias:   diasLiq,
        liquidez_bucket: liquidezBucket(diasLiq),
        rent_12m: colRent ? (parseFloat(String(r[colRent] || "0").replace(",", ".")) || null) : null,
        data_vencimento,
      };
    })
    .filter(Boolean) as any[];
}

function calcAnalise(posicoes: any[]) {
  const pl = posicoes.reduce((s, p) => s + p.valor, 0);
  if (pl === 0) return null;

  const porClasse: Record<string, number> = {};
  posicoes.forEach((p) => { porClasse[p.classe] = (porClasse[p.classe] || 0) + p.valor; });
  const alocacao = Object.entries(porClasse)
    .map(([classe, valor]) => ({ classe, valor, pct: (valor / pl) * 100 }))
    .sort((a, b) => b.valor - a.valor);

  const porBucket: Record<string, number> = {};
  posicoes.forEach((p) => { porBucket[p.liquidez_bucket] = (porBucket[p.liquidez_bucket] || 0) + p.valor; });
  const liquidez = LIQUIDEZ_BUCKETS.map((b) => ({
    label: b.label, cor: b.cor,
    valor: porBucket[b.label] || 0,
    pct:   ((porBucket[b.label] || 0) / pl) * 100,
  }));

  const hhi = posicoes.reduce((s, p) => s + Math.pow((p.valor / pl) * 100, 2), 0);
  const nEfetivo = hhi > 0 ? Math.round(10000 / hhi) : 0;
  const pctLiquido = posicoes.filter((p) => p.liquidez_dias <= 5).reduce((s, p) => s + p.valor, 0) / pl * 100;
  const top5 = [...posicoes].sort((a, b) => b.valor - a.valor).slice(0, 5).map((p) => ({ ...p, pct: (p.valor / pl) * 100 }));

  return { pl, alocacao, liquidez, hhi: Math.round(hhi), nEfetivo, pctLiquido, top5 };
}

function DonutAlocacao({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="valor" cx="50%" cy="50%" innerRadius={55} outerRadius={90}
          paddingAngle={2} label={({ pct }: any) => `${pct.toFixed(0)}%`} labelLine={false}>
          {data.map((entry) => <Cell key={entry.classe} fill={CLASSE_COR[entry.classe] || "#94a3b8"} />)}
        </Pie>
        <Tooltip formatter={(v: any) => brl(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BarLiquidez({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 40 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v: any, _n: any, props: any) => [brl(props.payload.valor), "Valor"]} />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {data.map((entry) => <Cell key={entry.label} fill={entry.cor} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Mapa nome normalizado → info do fundo (para cruzar liquidez)
function buildFundoMap(fundosInfo: any[]): Record<string, any> {
  const mapa: Record<string, any> = {};
  for (const f of fundosInfo) {
    if (f.cnpj) mapa[f.cnpj] = f;
    const norm = (f.nome_fundo || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (norm) mapa[norm] = f;
  }
  return mapa;
}

function enriquecerLiquidez(posicoes: any[], fundoMap: Record<string, any>): any[] {
  return posicoes.map((p) => {
    // 1º: cruza por CNPJ (mais confiável)
    // 2º: fallback por nome normalizado
    const norm = (p.ativo || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const info = (p.cnpj_fundo && fundoMap[p.cnpj_fundo]) || fundoMap[norm] || null;
    if (info && info.total_dias != null) {
      return {
        ...p,
        liquidez_raw:    info.prazo_fmt || p.liquidez_raw,
        liquidez_dias:   info.total_dias,
        liquidez_bucket: liquidezBucket(info.total_dias),
      };
    }
    return p;
  });
}

function TopScrollWrapper({ children }: { children: ReactNode }) {
  const topRef     = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const phantomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (contentRef.current && phantomRef.current)
        phantomRef.current.style.width = contentRef.current.scrollWidth + "px";
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div
        ref={topRef}
        className="top-scroll-bar border-b border-slate-100"
        style={{ height: 12 }}
        onScroll={() => { if (contentRef.current && topRef.current) contentRef.current.scrollLeft = topRef.current.scrollLeft; }}
      >
        <div ref={phantomRef} style={{ height: 1 }} />
      </div>
      <div
        ref={contentRef}
        className="overflow-x-auto"
        onScroll={() => { if (topRef.current && contentRef.current) topRef.current.scrollLeft = contentRef.current.scrollLeft; }}
      >
        {children}
      </div>
    </>
  );
}

function CarteiraDiversificacaoPageInner() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const searchParams = useSearchParams();
  const contaParam   = searchParams.get("conta");
  const [clientes,   setClientes]   = useState<any[]>([]);
  const [posicoes,   setPosicoes]   = useState<any[]>([]);
  const [fundoMap,   setFundoMap]   = useState<Record<string, any>>({});
  const [conta,      setConta]      = useState(contaParam || "");
  const [busca,      setBusca]      = useState("");
  const [importando, setImportando] = useState(false);
  const [msgImport,  setMsgImport]  = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPosicoes = useCallback(async () => {
    if (!user) return;
    const [pos, fi] = await Promise.all([getPosicoes(user.uid), getFundosInfo(user.uid)]);
    setPosicoes(pos);
    setFundoMap(buildFundoMap(fi));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([getClientes(user.uid), getPosicoes(user.uid), getFundosInfo(user.uid)]).then(([cls, pos, fi]) => {
      setClientes(cls);
      setPosicoes(pos);
      setFundoMap(buildFundoMap(fi));
      if (contaParam) setConta(contaParam);
      else if (cls.length > 0 && !conta) setConta(cls[0].codigo_conta);
    });
  }, [user, refreshKey]);

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

      // Parseia sem forçar conta — se o arquivo tiver coluna de cliente, codigo_conta virá preenchido
      const parsed = parseExcel(rows);
      const comConta = parsed.filter((p) => p.codigo_conta);

      if (comConta.length > 0) {
        // Multi-cliente (ex: Diversificador XP com COD_CLIENTE)
        const n = await importarPosicoesMulti(user.uid, comConta);
        const nContas = new Set(comConta.map((p) => p.codigo_conta)).size;
        setMsgImport(`${n} posições importadas (${nContas} clientes)!`);
      } else {
        // Arquivo sem coluna de conta → usa o cliente selecionado na tela
        if (!conta) { setMsgImport("Selecione um cliente primeiro."); return; }
        const parsedSingle = parseExcel(rows, conta);
        const n = await importarPosicoes(user.uid, conta, parsedSingle);
        setMsgImport(`${n} posições importadas para ${conta}!`);
      }
      await loadPosicoes();
    } catch (err: any) {
      setMsgImport(`Erro: ${err.message}`);
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deletarCliente = async () => {
    if (!user || !conta || !confirm(`Remover todas as posições de ${conta}?`)) return;
    await deletarPosicoesCliente(user.uid, conta);
    await loadPosicoes();
    setMsgImport("Posições removidas.");
  };

  const [ativoDetalhe, setAtivoDetalhe] = useState<string | null>(null);

  const contasComPos  = [...new Set(posicoes.map((p) => p.codigo_conta))];
  const posBruta      = enriquecerLiquidez(posicoes.filter((p) => p.codigo_conta === conta), fundoMap);
  const posFiltradas  = posBruta.filter(
    (p) => !busca ||
      p.ativo.toLowerCase().includes(busca.toLowerCase()) ||
      p.classe.toLowerCase().includes(busca.toLowerCase()) ||
      (p.gestora || "").toLowerCase().includes(busca.toLowerCase())
  );
  const analise     = calcAnalise(posBruta);
  const clienteInfo = clientes.find((c) => c.codigo_conta === conta);

  // PL total por cliente (para calcular % da carteira no painel de detalhe)
  const plPorConta = useMemo(() => {
    const map: Record<string, number> = {};
    posicoes.forEach((p) => { map[p.codigo_conta] = (map[p.codigo_conta] || 0) + (p.valor || 0); });
    return map;
  }, [posicoes]);

  // Todos os clientes que possuem o ativo selecionado
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

      {/* Painel lateral — clientes que possuem o ativo */}
      {ativoDetalhe && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setAtivoDetalhe(null)} />
          <div className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-800 text-sm leading-snug break-words">{ativoDetalhe}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {clientesDoAtivo.length} cliente{clientesDoAtivo.length !== 1 ? "s" : ""} · {brl(clientesDoAtivo.reduce((s, p) => s + p.valor, 0))}
                </p>
              </div>
              <button onClick={() => setAtivoDetalhe(null)} className="text-slate-400 hover:text-slate-700 shrink-0 text-lg leading-none">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {clientesDoAtivo.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-10">Nenhum cliente encontrado</p>
              ) : clientesDoAtivo.map((p, i) => (
                <div key={p.codigo_conta} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                  <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.nome}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.codigo_conta}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">{brl(p.valor)}</p>
                    <p className="text-xs text-slate-400">{p.pct_carteira.toFixed(1)}% da carteira</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Análise de Carteira</h1>
          <p className="text-slate-500 text-sm">Diversificação · Liquidez · Concentração</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {msgImport && (
            <span className={`text-xs ${msgImport.startsWith("Erro") ? "text-red-600" : "text-emerald-600"}`}>
              {msgImport}
            </span>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => e.target.files?.[0] && importarExcel(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={importando}
            className="text-xs bg-svn-ruby text-white px-3 py-2 rounded-lg hover:bg-svn-ruby-dark disabled:opacity-50 transition-colors">
            {importando ? "Importando..." : "⬆ Importar Excel"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 shrink-0">Cliente</label>
          <select value={conta} onChange={(e) => { setConta(e.target.value); setBusca(""); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby min-w-[220px]">
            <option value="">— selecione —</option>
            {clientes.map((c) => (
              <option key={c.codigo_conta} value={c.codigo_conta}>
                {c.nome} ({c.codigo_conta}){contasComPos.includes(c.codigo_conta) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
        {clienteInfo && (
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>NET: <strong className="text-slate-800">{brl(clienteInfo.net)}</strong></span>
            {analise && <span>Importado: <strong className="text-slate-800">{brl(analise.pl)}</strong></span>}
          </div>
        )}
        {conta && contasComPos.includes(conta) && (
          <button onClick={deletarCliente} className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors">
            Limpar posições
          </button>
        )}
      </div>

      {!analise ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <p className="text-slate-400 text-sm">
            {clientes.length === 0 ? "Importe clientes primeiro na página Clientes."
              : conta ? "Nenhuma posição. Importe o Excel de posições (XP Diversificador ou extrato individual)."
              : "Selecione um cliente para ver a análise."}
          </p>
          <p className="text-xs text-slate-300 mt-2">
            Dica: planilha com coluna de conta importa múltiplos clientes de uma vez.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "PL Importado",     value: brl(analise.pl),                     cor: "text-slate-800" },
              { label: "Nº de Ativos",     value: `${posBruta.length}`,               cor: "text-slate-800" },
              { label: "HHI Concentração", value: analise.hhi.toLocaleString("pt-BR"), cor: analise.hhi > 2500 ? "text-red-600" : analise.hhi > 1000 ? "text-amber-600" : "text-emerald-600" },
              { label: "Líquido ≤ D+5",   value: `${analise.pctLiquido.toFixed(1)}%`, cor: analise.pctLiquido >= 20 ? "text-emerald-600" : "text-amber-600" },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={`text-xl font-bold ${k.cor}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 px-1">
            HHI: <span className="text-emerald-600 font-medium">&lt; 1000 diversificado</span>
            {" · "}<span className="text-amber-600 font-medium">1000–2500 moderado</span>
            {" · "}<span className="text-red-600 font-medium">&gt; 2500 concentrado</span>
            <span className="ml-4">N° efetivo de ativos: <strong className="text-slate-700">{analise.nEfetivo}</strong></span>
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-1">Alocação por Classe</h2>
              <DonutAlocacao data={analise.alocacao} />
              <div className="mt-3 space-y-1">
                {analise.alocacao.map((a) => (
                  <div key={a.classe} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CLASSE_COR[a.classe] || "#94a3b8" }} />
                      <span className="text-slate-600">{a.classe}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-semibold text-slate-800">{a.pct.toFixed(1)}%</span>
                      <span className="text-slate-400 w-24 text-right">{brl(a.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-1">Perfil de Liquidez</h2>
              <BarLiquidez data={analise.liquidez} />
              <div className="mt-1 space-y-1">
                {analise.liquidez.filter((l) => l.valor > 0).map((l) => (
                  <div key={l.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.cor }} />
                      <span className="text-slate-600">{l.label}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-semibold text-slate-800">{l.pct.toFixed(1)}%</span>
                      <span className="text-slate-400 w-24 text-right">{brl(l.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Top 5 Posições</h2>
            <div className="space-y-3">
              {analise.top5.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-sm font-medium text-slate-800 break-words">{p.ativo}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{p.gestora || p.classe}</span>
                        <span className="text-xs font-semibold text-slate-700 w-10 text-right">{p.pct.toFixed(1)}%</span>
                        <span className="text-sm font-bold text-slate-800 w-28 text-right">{brl(p.valor)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: CLASSE_COR[p.classe] || "#94a3b8" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <h2 className="font-semibold text-slate-800 shrink-0">Todas as Posições</h2>
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ativo, classe ou gestora..."
                className="flex-1 max-w-sm border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-svn-ruby" />
              <span className="text-xs text-slate-400 ml-auto shrink-0">{posFiltradas.length} posições</span>
            </div>
            <TopScrollWrapper>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Ativo / Produto</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Classe</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Gestora / Emissor</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Liquidez</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Rent. 12m</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Valor</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posFiltradas.map((p, i) => {
                    const pct = (p.valor / analise.pl) * 100;
                    const liqCor = p.liquidez_dias <= 1  ? "bg-emerald-100 text-emerald-700"
                                 : p.liquidez_dias <= 5  ? "bg-[#f5e8e7] text-svn-ruby"
                                 : p.liquidez_dias <= 30 ? "bg-amber-100 text-amber-700"
                                 :                         "bg-red-100 text-red-600";
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setAtivoDetalhe(p.ativo)}>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium text-slate-800 break-words">{p.ativo}</p>
                          {p.tipo && <p className="text-xs text-slate-400">{p.tipo}</p>}
                          {p.classe === "Renda Fixa" && (p.gestora || p.data_vencimento) && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {p.gestora && <span className="font-medium text-slate-500">{p.gestora}</span>}
                              {p.gestora && p.data_vencimento && <span> · </span>}
                              {p.data_vencimento && <span>Venc: {new Date(p.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: (CLASSE_COR[p.classe] || "#94a3b8") + "22", color: CLASSE_COR[p.classe] || "#64748b" }}>
                            {p.classe}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.gestora || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${liqCor}`}>
                            {p.liquidez_raw || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {p.rent_12m != null
                            ? <span className={p.rent_12m >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{p.rent_12m.toFixed(2)}%</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{brl(p.valor)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: CLASSE_COR[p.classe] || "#94a3b8" }} />
                            </div>
                            <span className="text-xs text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Total ({posFiltradas.length} posições)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {brl(posFiltradas.reduce((s, p) => s + p.valor, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </TopScrollWrapper>
          </div>
        </>
      )}
    </div>
  );
}

export default function CarteiraDiversificacaoPage() {
  return (
    <Suspense>
      <CarteiraDiversificacaoPageInner />
    </Suspense>
  );
}
