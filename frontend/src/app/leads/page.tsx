"use client";
import { useEffect, useState } from "react";
import { getLeads, postLead, patchLeadEstagio, deleteLead, downloadTemplateleads, uploadLeadsExcel } from "@/lib/api";
import { brl, fmtDate } from "@/lib/formatters";

const ESTAGIOS = ["PROSPECTO", "CONTATO", "PROPOSTA", "CLIENTE"];
const ESTAGIO_LABEL: Record<string, string> = {
  PROSPECTO: "PROSPECT",
  CONTATO:   "CONTATO",
  PROPOSTA:  "PROPOSTA",
  CLIENTE:   "CLIENTE",
};
const ESTAGIO_COR: Record<string, string> = {
  PROSPECTO: "border-slate-300 bg-slate-50",
  CONTATO:   "border-blue-300 bg-blue-50",
  PROPOSTA:  "border-amber-300 bg-amber-50",
  CLIENTE:   "border-emerald-300 bg-emerald-50",
};
const ESTAGIO_HEADER: Record<string, string> = {
  PROSPECTO: "bg-slate-700 text-white",
  CONTATO:   "bg-blue-600 text-white",
  PROPOSTA:  "bg-amber-500 text-white",
  CLIENTE:   "bg-emerald-600 text-white",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", origem: "", valor_potencial: "" });
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState("");

  const load = () => getLeads().then(setLeads).catch(() => {});
  useEffect(() => { load(); }, []);

  const mover = async (id: string, estagio: string) => {
    await patchLeadEstagio(id, estagio);
    load();
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este lead?")) return;
    await deleteLead(id);
    load();
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await postLead({ ...form, valor_potencial: form.valor_potencial ? Number(form.valor_potencial) : null });
    setForm({ nome: "", telefone: "", email: "", origem: "", valor_potencial: "" });
    setShowForm(false);
    setLoading(false);
    load();
  };

  const baixarTemplate = async () => {
    const blob = await downloadTemplateleads();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_leads.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setMsgImport("");
    const r = await uploadLeadsExcel(file).catch((err) => ({ mensagem: "Erro: " + err.message }));
    setMsgImport(r.mensagem || "Importado");
    setImportando(false);
    load();
    e.target.value = "";
  };

  const leadsBy = (e: string) => leads.filter((l) => l.estagio === e);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Funil de Leads</h1>
          <p className="text-slate-500 text-sm">{leads.length} leads no pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          {msgImport && (
            <span className="text-xs text-emerald-600">{msgImport}</span>
          )}
          <button onClick={baixarTemplate}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ⬇ Template Excel
          </button>
          <label className={`text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${importando ? "opacity-50 pointer-events-none" : ""}`}>
            {importando ? "Importando..." : "📥 Importar Excel"}
            <input type="file" accept=".xlsx" className="hidden" onChange={importarExcel} />
          </label>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Novo Lead
          </button>
        </div>
      </div>

      {/* Modal novo lead */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={criar} className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="font-bold text-slate-800 text-lg">Novo Lead</h2>
            {[
              { label: "Nome *", key: "nome", required: true },
              { label: "Telefone", key: "telefone" },
              { label: "Email", key: "email" },
              { label: "Patrimônio potencial (R$)", key: "valor_potencial" },
            ].map(({ label, key, required }) => (
              <div key={key}>
                <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                <input required={required} value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Origem</label>
              <select value={form.origem} onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione</option>
                {["INDICACAO","EVENTO","LINKEDIN","COLD_CALL","OUTRO"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {ESTAGIOS.map((estagio) => (
          <div key={estagio} className={`rounded-xl border-2 ${ESTAGIO_COR[estagio]} flex flex-col`}>
            <div className={`${ESTAGIO_HEADER[estagio]} px-4 py-2.5 rounded-t-lg flex items-center justify-between`}>
              <span className="text-sm font-semibold">{ESTAGIO_LABEL[estagio]}</span>
              <span className="text-xs opacity-80">{leadsBy(estagio).length}</span>
            </div>
            <div className="p-3 space-y-3 flex-1 min-h-[200px]">
              {leadsBy(estagio).map((lead) => (
                <div key={lead.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                  <p className="font-semibold text-sm text-slate-800">{lead.nome}</p>
                  {lead.valor_potencial && (
                    <p className="text-xs text-emerald-700 font-medium">{brl(lead.valor_potencial)}</p>
                  )}
                  {lead.telefone && <p className="text-xs text-slate-500">{lead.telefone}</p>}
                  {lead.origem && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {lead.origem}
                    </span>
                  )}
                  {lead.data_proximo_contato && (
                    <p className="text-xs text-blue-600 mt-1">📅 {fmtDate(lead.data_proximo_contato)}</p>
                  )}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {ESTAGIOS.filter((e) => e !== estagio).map((e) => (
                      <button key={e} onClick={() => mover(lead.id, e)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition-colors">
                        → {ESTAGIO_LABEL[e]}
                      </button>
                    ))}
                    <button onClick={() => remover(lead.id)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-0.5 rounded transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
