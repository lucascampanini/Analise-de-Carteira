"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOfertas, addOferta, patchOferta, deleteOferta,
  getAllClientesOfertas, addClienteOferta, patchClienteOferta, deleteClienteOferta,
  importarClientesOferta, getClientes, getPosicoes,
} from "@/lib/firestore";
import { brl } from "@/lib/formatters";
import * as XLSX from "xlsx";

const STATUSES = ["PENDENTE", "WHATSAPP", "RESERVADO", "PUSH_ENVIADO", "FINALIZADO", "CANCELADO"] as const;

const STATUS_COR: Record<string, string> = {
  PENDENTE:     "bg-slate-100 text-slate-600",
  WHATSAPP:     "bg-blue-100 text-blue-700",
  RESERVADO:    "bg-amber-100 text-amber-700",
  PUSH_ENVIADO: "bg-violet-100 text-violet-700",
  FINALIZADO:   "bg-emerald-100 text-emerald-700",
  CANCELADO:    "bg-red-100 text-red-600",
};

function StatusBadge({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${STATUS_COR[status] || "bg-slate-100 text-slate-600"}`}
      >
        {status.replace("_", " ")} ▾
      </button>
      {open && (
        <div className="absolute z-20 top-6 left-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`block w-full text-left text-xs px-3 py-1.5 hover:bg-slate-50 ${status === s ? "font-bold" : ""}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ValorCelula({ valor, onSave }: { valor: number | null; onSave: (v: number | null) => void }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(String(valor ?? ""));
  if (edit) {
    return (
      <input autoFocus value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { onSave(parseFloat(text.replace(",", ".")) || null); setEdit(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onSave(parseFloat(text.replace(",", ".")) || null); setEdit(false); } }}
        className="w-20 border border-blue-400 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none"
      />
    );
  }
  return (
    <span onClick={() => { setText(String(valor ?? "")); setEdit(true); }}
      className="cursor-pointer hover:text-blue-600 text-xs font-medium">
      {valor ? brl(valor) : <span className="text-slate-300">—</span>}
    </span>
  );
}

export default function OfertasPage() {
  const { user } = useAuth();
  const [ofertas,  setOfertas]  = useState<any[]>([]);
  const [ocItems,  setOcItems]  = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", data_liquidacao: "", roa: "0" });
  const [loading,   setLoading]   = useState(false);
  const [importando,setImportando]= useState(false);
  const [msgImport, setMsgImport] = useState("");
  const [posicoes,  setPosicoes]  = useState<any[]>([]);
  // Estado para o inline-add: { ofertaId, conta, valor }
  const [addingCell, setAddingCell] = useState<{ ofertaId: string; conta: string; valor: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [ofs, oc, cls, pos] = await Promise.all([
      getOfertas(user.uid),
      getAllClientesOfertas(user.uid),
      getClientes(user.uid),
      getPosicoes(user.uid),
    ]);
    setOfertas(ofs);
    setOcItems(oc);
    setClientes(cls);
    setPosicoes(pos);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const ofertasComMetricas = ofertas.map((o) => {
    const items = ocItems.filter((x) => x.oferta_id === o.id);
    const conf  = items.filter((x) => ["FINALIZADO","RESERVADO"].includes(x.status));
    const total      = items.reduce((s, x) => s + (x.valor_ofertado || 0), 0);
    const conf_total = conf.reduce((s, x) => s + (x.valor_ofertado || 0), 0);
    return {
      ...o,
      total_clientes:    items.length,
      total_ofertado:    total,
      total_confirmado:  conf_total,
      receita_prevista:  (total * (o.roa || 0)) / 100,
      receita_confirmada:(conf_total * (o.roa || 0)) / 100,
    };
  });

  // Mostra TODOS os clientes (não só os já adicionados)
  const clientesTabela = [...clientes].sort((a, b) => (b.net || 0) - (a.net || 0));

  const getItem = (ofertaId: string, conta: string) =>
    ocItems.find((x) => x.oferta_id === ofertaId && x.codigo_conta === conta);

  const atualizarItem = async (id: string, data: any) => {
    if (!user) return;
    await patchClienteOferta(user.uid, id, data);
    load();
  };

  // Liquidez D+0/D+1 do cliente vindo das posições do diversificador
  const liquidezCliente = (conta: string): number => {
    const pos = posicoes.filter((p) => p.codigo_conta === conta && (p.liquidez_dias ?? 9999) <= 1);
    return pos.reduce((s: number, p: any) => s + (p.valor || 0), 0);
  };

  const confirmarAdicao = async () => {
    if (!addingCell || !user) return;
    const { ofertaId, conta, valor } = addingCell;
    const c = clientes.find((x) => x.codigo_conta === conta);
    const v = parseFloat(valor.replace(",", ".")) || null;
    await addClienteOferta(user.uid, {
      oferta_id: ofertaId, codigo_conta: conta,
      nome_cliente: c?.nome || conta, net: c?.net || 0,
      status: "PENDENTE", valor_ofertado: v,
    });
    setAddingCell(null);
    load();
  };

  const removerItem = async (id: string) => {
    if (!user) return;
    await deleteClienteOferta(user.uid, id);
    load();
  };

  const criarOferta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    await addOferta(user.uid, {
      nome: form.nome, descricao: form.descricao || null,
      data_liquidacao: form.data_liquidacao || null,
      roa: parseFloat(form.roa) || 0,
    });
    setForm({ nome: "", descricao: "", data_liquidacao: "", roa: "0" });
    setShowForm(false);
    setLoading(false);
    load();
  };

  const deletarOferta = async (id: string) => {
    if (!user || !confirm("Remover esta oferta?")) return;
    await deleteOferta(user.uid, id);
    load();
  };

  const baixarTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["codigo_conta","nome_cliente","valor_ofertado","status"],
      ["1234567","João Silva",100000,"PENDENTE"],
      ["7654321","Maria Santos",50000,"WHATSAPP"],
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
        const nomes = ofertas.map((o, i) => `${i + 1}. ${o.nome}`).join("\n");
        const escolha = prompt(`Selecione a oferta (número):\n${nomes}`);
        const idx = parseInt(escolha || "0") - 1;
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
          codigo_conta:  String(r.codigo_conta || "").trim(),
          nome_cliente:  String(r.nome_cliente || "").trim(),
          valor_ofertado:parseFloat(String(r.valor_ofertado || "0")) || null,
          status:        String(r.status || "PENDENTE").trim().toUpperCase(),
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

  const totalVolume  = ofertasComMetricas.reduce((s, o) => s + o.total_ofertado, 0);
  const totalReceita = ofertasComMetricas.reduce((s, o) => s + o.receita_prevista, 0);
  const totalConfirm = ofertasComMetricas.reduce((s, o) => s + o.receita_confirmada, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ofertas Mensais</h1>
          <p className="text-slate-500 text-sm">{ofertas.length} ofertas</p>
        </div>
        <div className="flex items-center gap-2">
          {msgImport && (
            <span className={`text-xs ${msgImport.startsWith("Erro") ? "text-red-600" : "text-emerald-600"}`}>
              {msgImport}
            </span>
          )}
          <button onClick={baixarTemplate}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ⬇ Template Excel
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
          <form onSubmit={criarOferta} className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="font-bold text-slate-800 text-lg">Nova Oferta</h2>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nome *</label>
              <input required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: CDB Banco XYZ 13% CDI"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
                <input type="number" step="0.01" value={form.roa}
                  onChange={(e) => setForm((f) => ({ ...f, roa: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Salvando..." : "Criar Oferta"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI */}
      {ofertas.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Volume total ofertado", value: brl(totalVolume),  cor: "text-slate-800"   },
            { label: "Receita prevista",      value: brl(totalReceita), cor: "text-violet-700"  },
            { label: "Receita confirmada",    value: brl(totalConfirm), cor: "text-emerald-700" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-bold ${k.cor}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela ofertas */}
      {ofertas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">Nenhuma oferta criada. Clique em "+ Nova Oferta" para começar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Produto</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Volume</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">ROA%</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Rec. Prevista</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Confirmado</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Progresso</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Liq.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ofertasComMetricas.map((o) => {
                const pct = o.total_ofertado > 0
                  ? Math.round((o.total_confirmado / o.total_ofertado) * 100) : 0;
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{o.nome}</p>
                      <p className="text-xs text-slate-400">{o.total_clientes} clientes</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{brl(o.total_ofertado)}</td>
                    <td className="px-4 py-3 text-right">{o.roa || 0}%</td>
                    <td className="px-4 py-3 text-right text-violet-700 font-medium">{brl(o.receita_prevista)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-medium">{brl(o.receita_confirmada)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.data_liquidacao || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deletarOferta(o.id)}
                        className="text-xs text-slate-300 hover:text-red-500 transition-colors">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Crosstab Clientes × Ofertas */}
      {ofertas.length > 0 && clientesTabela.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Clientes × Ofertas</h2>
            <p className="text-xs text-slate-400">{clientesTabela.length} clientes · {ofertas.length} ofertas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-10 text-left px-4 py-3 font-semibold text-slate-600 min-w-[200px]">Cliente</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 min-w-[100px]">NET</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 min-w-[90px]">D+1</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 min-w-[90px]">Liq. D+1</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 min-w-[90px]">Disponível</th>
                  {ofertas.map((o) => (
                    <th key={o.id} className="text-left px-3 py-3 font-semibold text-slate-600 min-w-[180px]">{o.nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientesTabela.map((c) => (
                  <tr key={c.codigo_conta} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white z-10 px-4 py-2.5">
                      <p className="font-medium text-slate-800">{c.nome}</p>
                      <p className="text-slate-400 font-mono">{c.codigo_conta}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">{brl(c.net)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-500">
                      {c.saldo_d1 ? brl(c.saldo_d1) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-blue-700 font-medium">
                      {liquidezCliente(c.codigo_conta) > 0 ? brl(liquidezCliente(c.codigo_conta)) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-emerald-700 font-medium">
                      {(c.saldo_d0 || c.saldo_d1 || c.saldo_d2 || c.saldo_d3)
                        ? brl((c.saldo_d0||0)+(c.saldo_d1||0)+(c.saldo_d2||0)+(c.saldo_d3||0))
                        : "—"}
                    </td>
                    {ofertas.map((o) => {
                      const item = getItem(o.id, c.codigo_conta);
                      const isAdding = addingCell?.ofertaId === o.id && addingCell?.conta === c.codigo_conta;
                      if (!item) {
                        if (isAdding) {
                          return (
                            <td key={o.id} className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Valor R$"
                                  value={addingCell?.valor ?? ""}
                                  onChange={(e) => setAddingCell((a) => a ? { ...a, valor: e.target.value } : a)}
                                  onKeyDown={(e) => { if (e.key === "Enter") confirmarAdicao(); if (e.key === "Escape") setAddingCell(null); }}
                                  className="w-24 border border-blue-400 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                                />
                                <button onClick={confirmarAdicao} className="text-xs text-emerald-600 hover:text-emerald-800 font-bold">✓</button>
                                <button onClick={() => setAddingCell(null)} className="text-xs text-slate-400 hover:text-red-500">✕</button>
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={o.id} className="px-3 py-2.5">
                            <button onClick={() => setAddingCell({ ofertaId: o.id, conta: c.codigo_conta, valor: "" })}
                              className="text-slate-300 hover:text-blue-600 transition-colors text-xs">
                              + adicionar
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={o.id} className="px-3 py-2.5 space-y-1">
                          <StatusBadge status={item.status}
                            onChange={(s) => atualizarItem(item.id, { status: s })} />
                          <div className="flex items-center gap-1">
                            <ValorCelula valor={item.valor_ofertado}
                              onSave={(v) => atualizarItem(item.id, { valor_ofertado: v })} />
                            {item.valor_ofertado && o.roa && (
                              <span className="text-slate-400">· {brl((item.valor_ofertado * o.roa) / 100)}</span>
                            )}
                            <button onClick={() => removerItem(item.id)}
                              className="text-slate-200 hover:text-red-500 transition-colors ml-1">✕</button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                  <td className="sticky left-0 bg-slate-50 z-10 px-4 py-2.5 text-slate-700">Total</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {brl(clientesTabela.reduce((s, c) => s + (c.net||0), 0))}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-500 text-xs">
                    {brl(clientesTabela.reduce((s, c) => s + (c.saldo_d1||0), 0))}
                  </td>
                  <td className="px-3 py-2.5 text-right text-emerald-700 text-xs font-medium">
                    {brl(clientesTabela.reduce((s, c) => s + (c.saldo_d0||0)+(c.saldo_d1||0)+(c.saldo_d2||0)+(c.saldo_d3||0), 0))}
                  </td>
                  {ofertas.map((o) => {
                    const total = ocItems
                      .filter((x) => x.oferta_id === o.id)
                      .reduce((s, x) => s + (x.valor_ofertado || 0), 0);
                    return (
                      <td key={o.id} className="px-3 py-2.5 text-slate-700">{total > 0 ? brl(total) : "—"}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
