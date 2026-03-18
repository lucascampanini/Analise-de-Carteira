const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// Clientes
export const getClientes = () => req<any[]>("/assistente/clientes");
export const getAnotacoes = (conta: string) => req<any[]>(`/assistente/clientes/${conta}/anotacoes`);
export const postAnotacao = (conta: string, tipo: string, texto: string) =>
  req(`/assistente/clientes/${conta}/anotacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, texto }),
  });

// Posições
export const getPosicoesRF = (conta: string) => req<any[]>(`/assistente/diversificador/posicoes/${conta}`);
export const getPosicoesRV = (conta: string) => req<any[]>(`/assistente/diversificador/posicoes-rv/${conta}`);
export const getPosicoeFundos = (conta: string) => req<any[]>(`/assistente/diversificador/fundos/${conta}`);
export const getPosicoesPrev = (conta: string) => req<any[]>(`/assistente/diversificador/previdencia/${conta}`);

// Vencimentos e eventos
export const getVencimentos = (dias = 90) => req<any[]>(`/assistente/diversificador/vencimentos?dias=${dias}`);
export const getEventosProximos = (dias = 30) => req<any[]>(`/assistente/eventos/proximos?dias=${dias}`);

// Reuniões
export const getReunioes = (dias = 30) => req<any[]>(`/assistente/reunioes/proximas?dias=${dias}`);

// Leads
export const getLeads = (estagio?: string) =>
  req<any[]>(`/assistente/leads${estagio ? `?estagio=${estagio}` : ""}`);
export const postLead = (data: any) =>
  req("/assistente/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const patchLeadEstagio = (id: string, estagio: string) =>
  req(`/assistente/leads/${id}/estagio?estagio=${estagio}`, { method: "PATCH" });
export const deleteLead = (id: string) =>
  req(`/assistente/leads/${id}`, { method: "DELETE" });

// Upload Diversificador
export const uploadDiversificador = (file: File) => {
  const form = new FormData();
  form.append("arquivo", file);
  return req<any>("/assistente/diversificador/importar", { method: "POST", body: form });
};
export const uploadDiversificadorCompleto = (file: File) => {
  const form = new FormData();
  form.append("arquivo", file);
  return req<any>("/assistente/diversificador/importar-completo", { method: "POST", body: form });
};
export const uploadDiversificadorTudo = (file: File) => {
  const form = new FormData();
  form.append("arquivo", file);
  return req<any>("/assistente/diversificador/importar-tudo", { method: "POST", body: form });
};

// Leads — importação Excel
export const downloadTemplateleads = () =>
  fetch(`${API}/assistente/leads/template-excel`).then((r) => r.blob());
export const uploadLeadsExcel = (file: File) => {
  const form = new FormData();
  form.append("arquivo", file);
  return req<any>("/assistente/leads/importar-excel", { method: "POST", body: form });
};

// Busca por ticker na carteira
export const buscarClientesPorTicker = (ticker: string) =>
  req<any[]>(`/assistente/diversificador/buscar-por-ticker?ticker=${encodeURIComponent(ticker)}`);

// Upload Clientes (Positivador + RelatorioSaldoConsolidado)
export const uploadClientes = (fileSaldo: File, filePositivador: File) => {
  const form = new FormData();
  form.append("arquivo_saldo", fileSaldo);
  form.append("arquivo_positivador", filePositivador);
  return req<any>("/assistente/clientes/importar", { method: "POST", body: form });
};

// Histórico de imports
export const getHistoricoImports = () => req<any[]>("/assistente/historico-imports");

// Fundos com prazo
export const getFundos = () => req<any[]>("/assistente/fundos");
export const importarListaXP = (file: File) => {
  const form = new FormData();
  form.append("arquivo", file);
  return req<any>("/assistente/fundos/importar-lista-xp", { method: "POST", body: form });
};
export const atualizarPrazosCVM = () =>
  req<any>("/assistente/fundos/atualizar-prazos-cvm", { method: "POST" });

// Dashboard: exposição consolidada
export const getResumoProduto = () => req<any[]>("/assistente/diversificador/resumo-produto");
export const getExposicaoRfFundos = () => req<any[]>("/assistente/diversificador/exposicao-rf-fundos");
export const getExposicaoRv = () => req<any[]>("/assistente/diversificador/exposicao-rv");

// Ofertas mensais
export const getOfertas = () => req<any[]>("/assistente/ofertas");
export const postOferta = (data: any) =>
  req<any>("/assistente/ofertas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const getOferta = (id: string) => req<any>(`/assistente/ofertas/${id}`);
export const patchOferta = (id: string, data: any) =>
  req<any>(`/assistente/ofertas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const deleteOferta = (id: string) =>
  req<any>(`/assistente/ofertas/${id}`, { method: "DELETE" });
export const postClienteOferta = (ofertaId: string, data: any) =>
  req<any>(`/assistente/ofertas/${ofertaId}/clientes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const patchClienteOferta = (ofertaId: string, itemId: string, data: any) =>
  req<any>(`/assistente/ofertas/${ofertaId}/clientes/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const deleteClienteOferta = (ofertaId: string, itemId: string) =>
  req<any>(`/assistente/ofertas/${ofertaId}/clientes/${itemId}`, { method: "DELETE" });
export const getResumoClientesOfertas = () => req<any>("/assistente/ofertas-resumo/clientes");
export const downloadTemplateOfertas = () =>
  fetch(`${API}/assistente/ofertas/template-excel`).then((r) => r.blob());
export const importarClientesOfertaExcel = (ofertaId: string, file: File) => {
  const form = new FormData();
  form.append("arquivo", file);
  return req<any>(`/assistente/ofertas/${ofertaId}/importar-excel`, { method: "POST", body: form });
};
