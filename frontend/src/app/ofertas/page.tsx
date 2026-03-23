"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDataRefresh } from "@/contexts/DataRefreshContext";
import {
  getOfertas, addOferta, deleteOferta,
  getAllClientesOfertas, addClienteOferta, patchClienteOferta, deleteClienteOferta,
  importarClientesOferta, getClientes, getPosicoes, getFundosInfo,
} from "@/lib/firestore";
import { ModalNota } from "@/components/ui/ModalNota";

// ── Liquidez helpers ──────────────────────────────────────────────────────────
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function buildFundoMap(fundosInfo: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  fundosInfo.forEach((f) => {
    if (f.cnpj)  map[f.cnpj]          = f;
    if (f.nome)  map[norm(f.nome)]     = f;
  });
  return map;
}

function enriquecerLiquidez(posicoes: any[], fundoMap: Record<string, any>): any[] {
  return posicoes.map((p) => {
    const nomNorm = norm(p.ativo || "");
    const info = (p.cnpj_fundo && fundoMap[p.cnpj_fundo]) || fundoMap[nomNorm] || null;
    if (!info) return p;
    return {
      ...p,
      liquidez_dias: info.total_dias,
    };
  });
}
import { brl } from "@/lib/formatters";
import * as XLSX from "xlsx";

// ── Status ────────────────────────────────────────────────────────────────────
const STATUSES = ["PENDENTE", "WHATSAPP", "RESERVADO", "PUSH_ENVIADO", "FINALIZADO"] as const;
type Status = typeof STATUSES[number];

const STATUS_LABEL: Record<Status, string> = {
  PENDENTE:     "Pendente",
  WHATSAPP:     "Ofertei pelo WhatsApp",
  RESERVADO:    "Reservado",
  PUSH_ENVIADO: "Push enviado",
  FINALIZADO:   "Finalizado",
};
const STATUS_COR: Record<Status, string> = {
  PENDENTE:     "bg-slate-100 text-slate-500",
  WHATSAPP:     "bg-green-100 text-green-700",
  RESERVADO:    "bg-amber-100 text-amber-700",
  PUSH_ENVIADO: "bg-blue-100 text-blue-700",
  FINALIZADO:   "bg-emerald-100 text-emerald-700",
};
const STATUS_SHORT: Record<Status, string> = {
  PENDENTE:     "Pendente",
  WHATSAPP:     "WhatsApp",
  RESERVADO:    "Reservado",
  PUSH_ENVIADO: "Push",
  FINALIZADO:   "Finalizado",
};

function diasAte(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000);
}

// Célula em edição (painel aberto para vincular cliente)
type CelulaAberta = { conta: string; ofertaId: string } | null;

export default function OfertasPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [ofertas,   setOfertas]   = useState<any[]>([]);
  const [ocItems,   setOcItems]   = useState<any[]>([]);
  const [clientes,  setClientes]  = useState<any[]>([]);
  const [posicoes,  setPosicoes]  = useState<any[]>([]);
  const [fundoMap,  setFundoMap]  = useState<Record<string, any>>({});
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", data_liquidacao: "", roa: "" });
  const [busca, setBusca]         = useState("");
  const [filtroOfertaId, setFiltroOfertaId] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport]   = useState("");

  // painel de vinculação aberto na célula
  const [celulaAberta, setCelulaAberta] = useState<CelulaAberta>(null);
  const [novoValor, setNovoValor] = useState("");
  const [novoStatus, setNovoStatus] = useState<Status>("WHATSAPP");
  const [salvando, setSalvando] = useState(false);
  const [modalNota, setModalNota] = useState<{ conta: string; nome: string } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [ofs, oc, cls, pos, fi] = await Promise.all([
      getOfertas(user.uid),
      getAllClientesOfertas(user.uid),
      getClientes(user.uid),
      getPosicoes(user.uid),
      getFundosInfo(user.uid),
    ]);
    const map = buildFundoMap(fi);
    setOfertas(ofs);
    setOcItems(oc);
    setClientes(cls);
    setFundoMap(map);
    setPosicoes(enriquecerLiquidez(pos, map));
  }, [user, refreshKey]);

  useEffect(() => { load(); }, [load]);

  // ── Liquidez das posições ────────────────────────────────────────────────────
  const liquidezD1 = (conta: string) =>
    posicoes
      .filter((p) => p.codigo_conta === conta && (p.liquidez_dias ?? 9999) <= 1)
      .reduce((s: number, p: any) => s + (p.valor || 0), 0);

  const liquidezD6 = (conta: string) =>
    posicoes
      .filter((p) => p.codigo_conta === conta && (p.liquidez_dias ?? 9999) <= 6)
      .reduce((s: number, p: any) => s + (p.valor || 0), 0);

  // ── Métricas por oferta ──────────────────────────────────────────────────────
  const ofertasComMetricas = ofertas.map((o) => {
    const items = ocItems.filter((x) => x.oferta_id === o.id);
    const conf  = items.filter((x) => ["FINALIZADO", "RESERVADO"].includes(x.status));
    const total_ofertado   = items.reduce((s, x) => s + (x.valor_ofertado || 0), 0);
    const total_confirmado = conf.reduce((s, x) => s + (x.valor_ofertado || 0), 0);
    const por_status: Record<string, number> = {};
    items.forEach((x) => { por_status[x.status] = (por_status[x.status] || 0) + 1; });
    return {
      ...o,
      total_clientes:    items.length,
      total_ofertado,
      total_confirmado,
      receita_em_aberto:  ((total_ofertado - total_confirmado) * (o.roa || 0)) / 100,
      receita_confirmada: (total_confirmado * (o.roa || 0)) / 100,
      por_status,
    };
  });

  const totalVolume     = ofertasComMetricas.reduce((s, o) => s + o.total_ofertado,    0);
  const totalReceita    = ofertasComMetricas.reduce((s, o) => s + o.receita_em_aberto,  0);
  const totalFinalizado = ofertasComMetricas.reduce((s, o) => s + o.receita_confirmada, 0);

  // ── Lista de clientes filtrada para o crosstab ───────────────────────────────
  const colunas = ofertas; // uma coluna por oferta

  const clientesTabela = (() => {
    let lista = [...clientes].sort((a, b) => (b.net || 0) - (a.net || 0));
    if (busca) {
      lista = lista.filter((c) =>
        (c.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
        String(c.codigo_conta).includes(busca)
      );
    }
    if (filtroOfertaId) {
      lista = lista
        .filter((c) => ocItems.some((x) => x.oferta_id === filtroOfertaId && x.codigo_conta === c.codigo_conta))
        .sort((a, b) => {
          const va = ocItems.find((x) => x.oferta_id === filtroOfertaId && x.codigo_conta === a.codigo_conta)?.valor_ofertado || 0;
          const vb = ocItems.find((x) => x.oferta_id === filtroOfertaId && x.codigo_conta === b.codigo_conta)?.valor_ofertado || 0;
          return vb - va;
        });
    }
    return lista;
  })();

  const getItem = (ofertaId: string, conta: string) =>
    ocItems.find((x) => x.oferta_id === ofertaId && x.codigo_conta === conta);

  // ── Criar oferta ─────────────────────────────────────────────────────────────
  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoadingForm(true);
    await addOferta(user.uid, {
      nome: form.nome,
      descricao: form.descricao || null,
      data_liquidacao: form.data_liquidacao || null,
      roa: form.roa ? parseFloat(form.roa) : 0,
    });
    setForm({ nome: "", descricao: "", data_liquidacao: "", roa: "" });
    setShowForm(false);
    setLoadingForm(false);
    load();
  };

  const removerOferta = async (id: string, nome: string) => {
    if (!user || !confirm(`Remover oferta "${nome}"?`)) return;
    await deleteOferta(user.uid, id);
    load();
  };

  // ── Vincular cliente a oferta ────────────────────────────────────────────────
  const abrirCelula = (conta: string, ofertaId: string) => {
    setCelulaAberta({ conta, ofertaId });
    setNovoValor("");
    setNovoStatus("WHATSAPP");
  };

  const vincular = async (cliente: any) => {
    if (!celulaAberta || !user) return;
    setSalvando(true);
    await addClienteOferta(user.uid, {
      oferta_id:     celulaAberta.ofertaId,
      codigo_conta:  cliente.codigo_conta,
      nome_cliente:  cliente.nome || cliente.codigo_conta,
      net:           cliente.net || 0,
      valor_ofertado: novoValor ? parseFloat(novoValor) : null,
      status:        novoStatus,
    });
    setSalvando(false);
    setCelulaAberta(null);
    load();
  };

  const atualizarStatus = async (item: any, novoSt: Status) => {
    if (!user) return;
    await patchClienteOferta(user.uid, item.id, { status: novoSt });
    load();
  };

  const atualizarValor = async (item: any, val: string) => {
    if (!user) return;
    await patchClienteOferta(user.uid, item.id, { valor_ofertado: val ? parseFloat(val) : null });
    load();
  };

  const cancelarVinculo = async (item: any, nomeCliente: string) => {
    if (!user || !confirm(`Cancelar reserva de ${nomeCliente}?`)) return;
    await deleteClienteOferta(user.uid, item.id);
    load();
  };

  // ── Import Excel ─────────────────────────────────────────────────────────────
  const baixarTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["codigo_conta", "nome_cliente", "valor_ofertado", "status"],
      ["1234567", "João Silva", 100000, "PENDENTE"],
      ["7654321", "Maria Santos", 50000, "WHATSAPP"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "template_oferta_clientes.xlsx");
  };

  const importarExcel = async (file: File) => {
    if (!user) return;
    setImportando(true);
    setMsgImport("");
    try {
      let ofertaId: string | null = null;
      if (ofertas.length === 1) {
        ofertaId = ofertas[0].id;
      } else if (ofertas.length > 1) {
        const nomes  = ofertas.map((o, i) => `${i + 1}. ${o.nome}`).join("\n");
        const escolha = prompt(`Selecione a oferta (número):\n${nomes}`);
        const idx    = parseInt(escolha || "0") - 1;
        if (idx >= 0 && idx < ofertas.length) ofertaId = ofertas[idx].id;
      }
      if (!ofertaId) { setMsgImport("Nenhuma oferta selecionada."); return; }
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      const lista = rows
        .filter((r: any) => r.codigo_conta || r.nome_cliente)
        .map((r: any) => ({
          codigo_conta:   String(r.codigo_conta || "").trim(),
          nome_cliente:   String(r.nome_cliente || "").trim(),
          valor_ofertado: parseFloat(String(r.valor_ofertado || "0")) || null,
          status:         String(r.status || "PENDENTE").trim().toUpperCase(),
        }));
      const n = await importarClientesOferta(user.uid, ofertaId, lista);
      setMsgImport(`${n} clientes importados!`);
      load();
    } catch (err: any) {
      setMsgImport(`Erro: ${err.message}`);
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ofertas Mensais</h1>
          <p className="text-slate-500 text-sm">{ofertas.length} oferta{ofertas.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {msgImport && (
            <span className={`text-xs ${msgImport.startsWith("Erro") ? "text-red-600" : "text-emerald-600"}`}>
              {msgImport}
            </span>
          )}
          <button onClick={baixarTemplate}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ⬇ Template
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => e.target.files?.[0] && importarExcel(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={importando}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {importando ? "Importando..." : "⬆ Importar Excel"}
          </button>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Nova Oferta
          </button>
        </div>
      </div>

      {/* Modal nova oferta */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={criar} className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="font-bold text-slate-800 text-lg">Nova Oferta</h2>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nome *</label>
              <input required value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: DI-2029, NTN-B 35, Euro Garden..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Descrição</label>
              <input value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Data de liquidação</label>
                <input type="date" value={form.data_liquidacao}
                  onChange={(e) => setForm((f) => ({ ...f, data_liquidacao: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ROA (%)</label>
                <input type="number" step="0.01" min="0" value={form.roa}
                  onChange={(e) => setForm((f) => ({ ...f, roa: e.target.value }))}
                  placeholder="0.82"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loadingForm}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {loadingForm ? "Salvando..." : "Criar Oferta"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Volume total ofertado", valor: brl(totalVolume),     cor: "text-slate-800"   },
          { label: "Receita prevista",       valor: brl(totalReceita),    cor: "text-blue-700"    },
          { label: "Receita finalizada",     valor: brl(totalFinalizado), cor: "text-emerald-700" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Resumo por produto */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Resumo por produto</h2>
        </div>
        {ofertasComMetricas.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nenhuma oferta criada ainda</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Produto</th>
                <th className="px-5 py-3 text-right">Volume</th>
                <th className="px-5 py-3 text-right">ROA</th>
                <th className="px-5 py-3 text-right">Rec. em aberto</th>
                <th className="px-5 py-3 text-right">Confirmado (fin+res)</th>
                <th className="px-5 py-3 text-right">Liquidação</th>
                <th className="px-5 py-3 text-center">Progresso</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ofertasComMetricas.map((o) => {
                const dias = diasAte(o.data_liquidacao);
                const confirmados = (o.por_status?.FINALIZADO || 0) + (o.por_status?.RESERVADO || 0);
                const pct = o.total_clientes > 0
                  ? Math.round((confirmados / o.total_clientes) * 100) : 0;
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-semibold text-slate-800">{o.nome}</span>
                      {o.descricao && <p className="text-xs text-slate-400">{o.descricao}</p>}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{brl(o.total_ofertado)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{o.roa?.toFixed(2)}%</td>
                    <td className="px-5 py-3 text-right text-blue-700 font-semibold">{brl(o.receita_em_aberto)}</td>
                    <td className="px-5 py-3 text-right text-emerald-700 font-semibold">{brl(o.receita_confirmada)}</td>
                    <td className="px-5 py-3 text-right">
                      {o.data_liquidacao ? (
                        <span className={`text-xs font-medium ${dias !== null && dias <= 7 ? "text-red-600" : "text-slate-600"}`}>
                          {new Date(o.data_liquidacao + "T00:00:00").toLocaleDateString("pt-BR")}
                          {dias !== null && <span className="text-slate-400 ml-1">({dias}d)</span>}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => removerOferta(o.id, o.nome)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Tabela cruzada: clientes × ofertas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
          <h2 className="font-semibold text-slate-800 shrink-0">Clientes por oferta</h2>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="max-w-xs flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400 ml-auto shrink-0">
            {clientesTabela.length} clientes · {colunas.length} oferta{colunas.length !== 1 ? "s" : ""}
          </span>
        </div>

        {colunas.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">Crie uma oferta para começar</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 bg-slate-50">
                  <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 z-10 min-w-[220px]">Cliente</th>
                  <th className="px-4 py-3 text-right min-w-[100px]">Net</th>
                  <th className="px-4 py-3 text-right min-w-[110px]" title="Fundos D+0/D+1 e RF vencida">Liquidez D+1</th>
                  <th className="px-4 py-3 text-right min-w-[110px]" title="Fundos até D+6">Liquidez D+6</th>
                  {colunas.map((o) => {
                    const ativo = filtroOfertaId === o.id;
                    return (
                      <th key={o.id} className="px-4 py-3 text-center min-w-[160px]">
                        <button
                          onClick={() => setFiltroOfertaId(ativo ? null : o.id)}
                          className={`w-full rounded-lg px-2 py-1 transition-colors ${ativo ? "bg-blue-100 ring-1 ring-blue-400" : "hover:bg-slate-100"}`}
                          title={ativo ? "Remover filtro" : "Filtrar por esta oferta"}
                        >
                          <div className={`font-semibold ${ativo ? "text-blue-700" : "text-slate-700"}`}>{o.nome}</div>
                          <div className="text-slate-400 font-normal">{o.roa?.toFixed(2)}% ROA</div>
                          {o.data_liquidacao && (
                            <div className="text-slate-400 font-normal">
                              {new Date(o.data_liquidacao + "T00:00:00").toLocaleDateString("pt-BR")}
                            </div>
                          )}
                          {ativo && <div className="text-xs text-blue-500 font-medium mt-0.5">▼ filtrando</div>}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clientesTabela.map((c: any) => (
                  <tr key={c.codigo_conta} className="hover:bg-slate-50/50 transition-colors">
                    {/* Nome */}
                    <td className="px-4 py-2 sticky left-0 bg-white border-r border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800 text-sm truncate max-w-[160px]">
                          {c.nome || c.codigo_conta}
                        </span>
                        <button
                          onClick={() => setModalNota({ conta: c.codigo_conta, nome: c.nome || c.codigo_conta })}
                          className="text-slate-300 hover:text-blue-600 transition-colors text-xs shrink-0"
                          title="Nova anotação / tarefa / reunião"
                        >📝</button>
                      </div>
                      <span className="text-xs text-slate-400">{c.codigo_conta}</span>
                    </td>

                    {/* Net */}
                    <td className="px-4 py-2 text-right text-slate-600 text-xs font-medium whitespace-nowrap">
                      {c.net ? brl(c.net) : "—"}
                    </td>

                    {/* Liquidez D+1 */}
                    <td className="px-4 py-2 text-right text-xs font-medium whitespace-nowrap">
                      {liquidezD1(c.codigo_conta) > 0
                        ? <span className="text-emerald-700">{brl(liquidezD1(c.codigo_conta))}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* Liquidez D+6 */}
                    <td className="px-4 py-2 text-right text-xs font-medium whitespace-nowrap">
                      {liquidezD6(c.codigo_conta) > 0
                        ? <span className="text-blue-700">{brl(liquidezD6(c.codigo_conta))}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* Uma célula por oferta */}
                    {colunas.map((o) => {
                      const p = getItem(o.id, c.codigo_conta);
                      const estaAberta = celulaAberta?.conta === c.codigo_conta && celulaAberta?.ofertaId === o.id;

                      // Célula vinculada
                      if (p) {
                        return (
                          <td key={o.id} className="px-3 py-2 text-center align-middle">
                            <div className="space-y-1">
                              <ValorCelula
                                valor={p.valor_ofertado}
                                onChange={(v) => atualizarValor(p, v)}
                              />
                              {p.valor_ofertado && o.roa > 0 && (
                                <div className="text-xs text-blue-600 font-medium">
                                  {brl((p.valor_ofertado * o.roa) / 100)}
                                </div>
                              )}
                              <StatusBadge
                                status={p.status as Status}
                                onChange={(s) => atualizarStatus(p, s)}
                              />
                              <button
                                onClick={() => cancelarVinculo(p, c.nome || c.codigo_conta)}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              >
                                cancelar
                              </button>
                            </div>
                          </td>
                        );
                      }

                      // Célula com painel de vinculação aberto
                      if (estaAberta) return (
                        <td key={o.id} className="px-2 py-2 bg-blue-50 align-middle">
                          <div className="space-y-1.5">
                            <input
                              autoFocus
                              type="number"
                              value={novoValor}
                              onChange={(e) => setNovoValor(e.target.value)}
                              placeholder="Valor R$"
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <select
                              value={novoStatus}
                              onChange={(e) => setNovoStatus(e.target.value as Status)}
                              className="w-full border border-slate-300 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>{STATUS_SHORT[s]}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <button
                                onClick={() => vincular(c)}
                                disabled={salvando}
                                className="flex-1 bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {salvando ? "..." : "OK"}
                              </button>
                              <button
                                onClick={() => setCelulaAberta(null)}
                                className="flex-1 bg-slate-200 text-slate-600 text-xs py-1 rounded hover:bg-slate-300"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </td>
                      );

                      // Célula vazia — botão "+"
                      return (
                        <td key={o.id} className="px-3 py-2 text-center">
                          <button
                            onClick={() => abrirCelula(c.codigo_conta, o.id)}
                            className="text-slate-300 hover:text-blue-600 hover:bg-blue-50 w-7 h-7 rounded-full text-lg leading-none transition-colors"
                            title="Vincular à oferta"
                          >
                            +
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {/* Totais por oferta */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold">
                  <td className="px-4 py-3 text-slate-500 sticky left-0 bg-slate-50">TOTAL</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {brl(clientesTabela.reduce((s, c) => s + (c.net || 0), 0))}
                  </td>
                  <td />
                  <td />
                  {colunas.map((o) => {
                    const oferta = ofertasComMetricas.find((x) => x.id === o.id);
                    return (
                      <td key={o.id} className="px-3 py-3 text-center">
                        <div className="text-slate-800">{brl(oferta?.total_ofertado || 0)}</div>
                        <div className="text-blue-600">{brl(oferta?.receita_em_aberto || 0)}</div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status badge com dropdown ─────────────────────────────────────────────────
function StatusBadge({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button
        onClick={() => setAberto(!aberto)}
        className={`text-xs font-medium px-2 py-0.5 rounded-full w-full text-center transition-opacity hover:opacity-80 ${STATUS_COR[status] || "bg-slate-100 text-slate-500"}`}
      >
        {STATUS_SHORT[status] ?? status} ▾
      </button>
      {aberto && (
        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setAberto(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors flex items-center gap-2 ${s === status ? "font-semibold" : ""}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COR[s].split(" ")[0]}`} />
              {STATUS_LABEL[s]}
              {s === status && <span className="ml-auto text-slate-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Valor editável inline na célula ──────────────────────────────────────────
function ValorCelula({ valor, onChange }: { valor: number | null; onChange: (v: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(String(valor || ""));

  const confirmar = () => {
    setEditando(false);
    if (draft !== String(valor || "")) onChange(draft);
  };

  if (editando) return (
    <input
      autoFocus
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === "Enter" && confirmar()}
      className="w-full text-center border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none"
    />
  );

  return (
    <button
      onClick={() => { setDraft(String(valor || "")); setEditando(true); }}
      className="font-semibold text-slate-800 hover:text-blue-600 text-sm transition-colors w-full text-center"
      title="Clique para editar"
    >
      {valor ? brl(valor) : <span className="text-slate-300 text-xs italic">editar</span>}
    </button>
  );
}
