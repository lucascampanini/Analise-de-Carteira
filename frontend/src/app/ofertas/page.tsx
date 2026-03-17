"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { ModalNota } from "@/components/ui/ModalNota";
import {
  getOfertas, postOferta, deleteOferta,
  getResumoClientesOfertas,
  postClienteOferta, patchClienteOferta, deleteClienteOferta,
} from "@/lib/api";
import { brl } from "@/lib/formatters";

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

// ── Tipo para célula em edição ────────────────────────────────────────────────
type CelulaEditando = { conta: string; ofertaId: string } | null;

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [resumo, setResumo] = useState<{ ofertas: any[]; clientes: any[] } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", data_liquidacao: "", roa: "" });
  const [busca, setBusca] = useState("");
  const [filtroOfertaId, setFiltroOfertaId] = useState<string | null>(null);
  const [modalNota, setModalNota] = useState<{ conta: string; nome: string } | null>(null);
  // célula com painel de vinculação aberta
  const [celulaAberta, setCelulaAberta] = useState<CelulaEditando>(null);
  const [novoValor, setNovoValor] = useState("");
  const [novoStatus, setNovoStatus] = useState<Status>("WHATSAPP");
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    const [o, r] = await Promise.all([
      getOfertas().catch(() => []),
      getResumoClientesOfertas().catch(() => null),
    ]);
    setOfertas(o);
    setResumo(r);
  };

  useEffect(() => { load(); }, []);

  // ── Criar oferta ─────────────────────────────────────────────────────────────
  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    await postOferta({
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
    if (!confirm(`Remover oferta "${nome}"?`)) return;
    await deleteOferta(id);
    load();
  };

  // ── Vincular cliente a oferta ────────────────────────────────────────────────
  const abrirCelula = (conta: string, ofertaId: string) => {
    setCelulaAberta({ conta, ofertaId });
    setNovoValor("");
    setNovoStatus("WHATSAPP");
  };

  const vincular = async (cliente: any) => {
    if (!celulaAberta) return;
    setSalvando(true);
    await postClienteOferta(celulaAberta.ofertaId, {
      codigo_conta: cliente.codigo_conta,
      nome_cliente: cliente.nome_cliente,
      net: cliente.net,
      valor_ofertado: novoValor ? parseFloat(novoValor) : null,
      status: novoStatus,
    });
    setSalvando(false);
    setCelulaAberta(null);
    load();
  };

  const atualizarStatus = async (item: any, ofertaId: string, novoSt: Status) => {
    await patchClienteOferta(ofertaId, item.item_id, {
      codigo_conta: item.codigo_conta,
      valor_ofertado: item.valor,
      saldo_disponivel: null,
      status: novoSt,
      observacao: null,
    });
    load();
  };

  const atualizarValorCelula = async (item: any, ofertaId: string, val: string) => {
    await patchClienteOferta(ofertaId, item.item_id, {
      codigo_conta: item.codigo_conta,
      valor_ofertado: val ? parseFloat(val) : null,
      saldo_disponivel: null,
      status: item.status,
      observacao: null,
    });
    load();
  };

  const cancelarVinculo = async (item: any, ofertaId: string, nomeCliente: string) => {
    if (!confirm(`Cancelar reserva de ${nomeCliente}?`)) return;
    await deleteClienteOferta(ofertaId, item.item_id);
    load();
  };

  // ── Dados filtrados ──────────────────────────────────────────────────────────
  const totalVolume     = ofertas.reduce((s, o) => s + (o.total_ofertado     || 0), 0);
  const totalReceita    = ofertas.reduce((s, o) => s + (o.receita_em_aberto  || 0), 0);
  const totalFinalizado = ofertas.reduce((s, o) => s + (o.receita_confirmada || 0), 0);

  const colunas = resumo?.ofertas || [];

  const clientes = (() => {
    let lista = resumo?.clientes || [];

    // Filtro por texto
    if (busca) {
      lista = lista.filter((c: any) =>
        (c.nome_cliente || "").toLowerCase().includes(busca.toLowerCase()) ||
        String(c.codigo_conta).includes(busca)
      );
    }

    // Filtro por oferta: só quem está alocado, ordenado por valor desc
    if (filtroOfertaId) {
      lista = lista
        .filter((c: any) => c.participacoes?.[filtroOfertaId])
        .sort((a: any, b: any) =>
          (b.participacoes[filtroOfertaId]?.valor || 0) -
          (a.participacoes[filtroOfertaId]?.valor || 0)
        );
    }

    return lista;
  })();

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
          <h1 className="text-2xl font-bold text-slate-800">Ofertas Mensais</h1>
          <p className="text-slate-500 text-sm">{ofertas.length} oferta{ofertas.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Nova Oferta
        </button>
      </div>

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

      {/* Modal nova oferta */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={criar} className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="font-bold text-slate-800 text-lg">Nova Oferta</h2>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nome *</label>
              <input required value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: DI-2029, NTN-B 35, Euro Garden..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Descrição</label>
              <input value={form.descricao}
                onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Data de liquidação</label>
                <input type="date" value={form.data_liquidacao}
                  onChange={(e) => setForm(f => ({ ...f, data_liquidacao: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ROA (%)</label>
                <input type="number" step="0.01" min="0" value={form.roa}
                  onChange={(e) => setForm(f => ({ ...f, roa: e.target.value }))}
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

      {/* Resumo por produto */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Resumo por produto</h2>
        </div>
        {ofertas.length === 0 ? (
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
              {ofertas.map((o) => {
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

      {/* Tabela cruzada: todos os clientes × ofertas */}
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
            {clientes.length} clientes · {colunas.length} oferta{colunas.length !== 1 ? "s" : ""}
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
                  <th className="px-4 py-3 text-right min-w-[110px]" title="RF vencida + Fundos D+0/D+1">Liquidez</th>
                  <th className="px-4 py-3 text-right min-w-[110px]" title="RF vencida + Fundos até D+6">Liquidez D+6</th>
                  {colunas.map((o) => {
                    const ativo = filtroOfertaId === o.id;
                    return (
                      <th key={o.id} className="px-4 py-3 text-center min-w-[160px]">
                        <button
                          onClick={() => setFiltroOfertaId(ativo ? null : o.id)}
                          className={`w-full rounded-lg px-2 py-1 transition-colors ${ativo ? "bg-blue-100 ring-1 ring-blue-400" : "hover:bg-slate-100"}`}
                          title={ativo ? "Clique para remover filtro" : "Clique para filtrar por esta oferta"}
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
                {clientes.map((c: any) => (
                  <tr key={c.codigo_conta} className="hover:bg-slate-50/50 transition-colors">
                    {/* Nome */}
                    <td className="px-4 py-2 sticky left-0 bg-white border-r border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <a href={`/clientes/${c.codigo_conta}`}
                          className="font-medium text-slate-800 hover:text-blue-600 text-sm truncate max-w-[180px]">
                          {c.nome_cliente || c.codigo_conta}
                        </a>
                        <button
                          onClick={() => setModalNota({ conta: c.codigo_conta, nome: c.nome_cliente || c.codigo_conta })}
                          className="text-slate-300 hover:text-blue-600 transition-colors shrink-0"
                          title="Nova anotação"
                        >
                          📝
                        </button>
                      </div>
                      <span className="text-xs text-slate-400">{c.codigo_conta}</span>
                    </td>

                    {/* Net */}
                    <td className="px-4 py-2 text-right text-slate-600 text-xs font-medium whitespace-nowrap">
                      {c.net ? brl(c.net) : "—"}
                    </td>

                    {/* Liquidez */}
                    <td className="px-4 py-2 text-right text-xs font-medium whitespace-nowrap">
                      {c.liquidez > 0
                        ? <span className="text-emerald-700">{brl(c.liquidez)}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* Liquidez D+6 */}
                    <td className="px-4 py-2 text-right text-xs font-medium whitespace-nowrap">
                      {c.liquidez6 > 0
                        ? <span className="text-blue-700">{brl(c.liquidez6)}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* Uma célula por oferta */}
                    {colunas.map((o) => {
                      const p = c.participacoes?.[o.id];
                      const estaAberta = celulaAberta?.conta === c.codigo_conta && celulaAberta?.ofertaId === o.id;

                      // Célula vinculada
                      if (p) {
                        const item = { ...p, codigo_conta: c.codigo_conta };
                        return (
                          <td key={o.id} className="px-3 py-2 text-center align-middle">
                            <div className="space-y-1">
                              {/* Valor editável */}
                              <ValorCelula
                                valor={p.valor}
                                onChange={(v) => atualizarValorCelula(item, o.id, v)}
                              />
                              {/* Receita */}
                              {p.valor && p.receita > 0 && (
                                <div className="text-xs text-blue-600 font-medium">{brl(p.receita)}</div>
                              )}
                              {/* Status badge clicável */}
                              <StatusBadge
                                status={p.status as Status}
                                onChange={(s) => atualizarStatus(item, o.id, s)}
                              />
                              {/* Cancelar */}
                              <button
                                onClick={() => cancelarVinculo(item, o.id, c.nome_cliente)}
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
                  <td /><td /><td />
                  {colunas.map((o) => {
                    const oferta = ofertas.find((x) => x.id === o.id);
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
        {STATUS_SHORT[status]} ▾
      </button>
      {aberto && (
        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[150px]">
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
