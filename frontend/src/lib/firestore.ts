import {
  listDocsREST, getDocREST, commitSetREST, deleteDocREST,
  addDocREST, patchDocREST,
} from "./firestore-rest";

// NOTA: toda a camada de dados usa a API REST do Firestore (firestore-rest.ts)
// em vez do SDK. No ambiente do assessor o canal de streaming do SDK é
// bloqueado por antivírus/proxy (escritas e leituras travam indefinidamente),
// mas a REST funciona normalmente. Ver comentário em firestore-rest.ts.

// Comparador de "criado_em" robusto: via REST um Timestamp do Firestore vem
// como string ISO; docs antigos do SDK podem ter vindo como { seconds }; e
// alguns campos são número (epoch ms). Normaliza tudo para milissegundos.
const tsMillis = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  return 0;
};

// ──────────────────────────────────────────────
// CLIENTES
// ──────────────────────────────────────────────
export async function getClientes(uid: string) {
  const list = await listDocsREST(`users/${uid}/clientes`);
  return list.sort((a: any, b: any) => (b.net || 0) - (a.net || 0));
}

export async function importarClientes(uid: string, clientes: any[]) {
  // Upsert por codigo_conta — evita apagar+reinserir (reduz writes ~3x)
  const importado_em = new Date().toISOString();
  const docs = clientes.map((c) => ({
    id: c.codigo_conta || String(Math.random()),
    data: { ...c, importado_em },
  }));
  return commitSetREST(`users/${uid}/clientes`, docs);
}

export async function criarClienteIR(
  uid: string,
  dados: { nome: string; codigo_conta: string; suitability?: string }
) {
  await commitSetREST(`users/${uid}/clientes`, [{
    id: dados.codigo_conta,
    data: {
      nome: dados.nome,
      codigo_conta: dados.codigo_conta,
      ...(dados.suitability ? { suitability: dados.suitability } : {}),
      net: 0,
      importado_em: new Date().toISOString(),
      origem: "ir_manual",
    },
  }]);
}

// ──────────────────────────────────────────────
// ANOTAÇÕES
// ──────────────────────────────────────────────
export async function getAnotacoes(uid: string, conta: string) {
  const list = await listDocsREST(`users/${uid}/anotacoes`);
  return list
    .filter((a: any) => a.codigo_conta === conta)
    .sort((a: any, b: any) => tsMillis(b.criado_em) - tsMillis(a.criado_em));
}

export async function addAnotacao(uid: string, conta: string, tipo: string, texto: string) {
  return addDocREST(`users/${uid}/anotacoes`, {
    codigo_conta: conta,
    tipo,
    texto,
    criado_em: new Date().toISOString(),
  });
}

export async function deleteAnotacao(uid: string, id: string) {
  return deleteDocREST(`users/${uid}/anotacoes/${id}`);
}

// ──────────────────────────────────────────────
// EVENTOS / TAREFAS
// ──────────────────────────────────────────────
export async function getEventosProximos(uid: string, dias = 90) {
  const list = await listDocsREST(`users/${uid}/eventos`);
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return list
    .filter((e: any) => !e.concluido && new Date(e.data_evento) <= limite)
    .sort((a: any, b: any) =>
      new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime()
    )
    .map((e: any) => ({
      ...e,
      data: e.data_evento,
      dias_para_evento: Math.max(
        0,
        Math.ceil((new Date(e.data_evento).getTime() - Date.now()) / 86400000)
      ),
    }));
}

export async function addEvento(uid: string, data: any) {
  return addDocREST(`users/${uid}/eventos`, { ...data, concluido: false, criado_em: new Date().toISOString() });
}

export async function concluirEvento(uid: string, id: string) {
  return patchDocREST(`users/${uid}/eventos/${id}`, { concluido: true });
}

export async function deleteEvento(uid: string, id: string) {
  return deleteDocREST(`users/${uid}/eventos/${id}`);
}

// ──────────────────────────────────────────────
// REUNIÕES
// ──────────────────────────────────────────────
export async function getReunioes(uid: string, dias = 30) {
  const list = await listDocsREST(`users/${uid}/reunioes`);
  const agora = new Date().toISOString();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return list
    .filter(
      (r: any) =>
        r.status !== "CANCELADA" &&
        r.data_hora >= agora &&
        new Date(r.data_hora) <= limite
    )
    .sort((a: any, b: any) =>
      new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
    );
}

export async function addReuniao(uid: string, data: any) {
  return addDocREST(`users/${uid}/reunioes`, {
    ...data,
    status: "AGENDADA",
    criado_em: new Date().toISOString(),
  });
}

export async function cancelarReuniao(uid: string, id: string) {
  return patchDocREST(`users/${uid}/reunioes/${id}`, { status: "CANCELADA" });
}

// ──────────────────────────────────────────────
// LEADS
// ──────────────────────────────────────────────
export async function getLeads(uid: string, estagio?: string) {
  let list = await listDocsREST(`users/${uid}/leads`);
  if (estagio) list = list.filter((l: any) => l.estagio === estagio);
  return list.sort((a: any, b: any) => tsMillis(b.criado_em) - tsMillis(a.criado_em));
}

export async function addLead(uid: string, data: any) {
  return addDocREST(`users/${uid}/leads`, { ...data, criado_em: new Date().toISOString() });
}

export async function patchLeadEstagio(uid: string, id: string, estagio: string) {
  return patchDocREST(`users/${uid}/leads/${id}`, { estagio });
}

export async function patchLead(uid: string, id: string, data: any) {
  return patchDocREST(`users/${uid}/leads/${id}`, data);
}

export async function deleteLead(uid: string, id: string) {
  return deleteDocREST(`users/${uid}/leads/${id}`);
}

export async function importarLeads(uid: string, leads: any[]) {
  // commit em lote via REST com IDs gerados no cliente (mantém ceil(N/400) requests)
  const criado_em = new Date().toISOString();
  const docs = leads.map((l) => ({
    id: crypto.randomUUID(),
    data: { ...l, criado_em },
  }));
  return commitSetREST(`users/${uid}/leads`, docs);
}

// ──────────────────────────────────────────────
// OFERTAS
// ──────────────────────────────────────────────
export async function getOfertas(uid: string) {
  const list = await listDocsREST(`users/${uid}/ofertas`);
  return list.sort((a: any, b: any) => tsMillis(b.criado_em) - tsMillis(a.criado_em));
}

export async function addOferta(uid: string, data: any) {
  return addDocREST(`users/${uid}/ofertas`, {
    ...data,
    criado_em: new Date().toISOString(),
  });
}

export async function patchOferta(uid: string, id: string, data: any) {
  return patchDocREST(`users/${uid}/ofertas/${id}`, data);
}

export async function deleteOferta(uid: string, id: string) {
  return deleteDocREST(`users/${uid}/ofertas/${id}`);
}

// ──────────────────────────────────────────────
// OFERTA × CLIENTES
// ──────────────────────────────────────────────
export async function getAllClientesOfertas(uid: string) {
  return listDocsREST(`users/${uid}/oferta_clientes`);
}

export async function getClientesOferta(uid: string, ofertaId: string) {
  const list = await listDocsREST(`users/${uid}/oferta_clientes`);
  return list.filter((c: any) => c.oferta_id === ofertaId);
}

export async function addClienteOferta(uid: string, data: any) {
  return addDocREST(`users/${uid}/oferta_clientes`, {
    ...data,
    criado_em: new Date().toISOString(),
  });
}

export async function patchClienteOferta(uid: string, id: string, data: any) {
  return patchDocREST(`users/${uid}/oferta_clientes/${id}`, data);
}

export async function deleteClienteOferta(uid: string, id: string) {
  return deleteDocREST(`users/${uid}/oferta_clientes/${id}`);
}

export async function importarClientesOferta(uid: string, ofertaId: string, clientes: any[]) {
  const list = await listDocsREST(`users/${uid}/oferta_clientes`);
  const existentes = new Set(
    list.filter((c: any) => c.oferta_id === ofertaId).map((c: any) => c.codigo_conta)
  );
  let inseridos = 0;
  for (const c of clientes) {
    if (existentes.has(c.codigo_conta)) continue;
    await addDocREST(`users/${uid}/oferta_clientes`, {
      ...c,
      oferta_id: ofertaId,
      status: c.status || "PENDENTE",
      criado_em: new Date().toISOString(),
    });
    inseridos++;
  }
  return inseridos;
}

// ──────────────────────────────────────────────
// POSIÇÕES DE CARTEIRA (Diversificador)
// ──────────────────────────────────────────────

// Expande documentos de ambos os formatos:
//   Novo:  { codigo_conta, posicoes: [...], importado_em }  — 1 doc por cliente
//   Antigo: { codigo_conta, ativo, valor, ... }             — 1 doc por posição
function expandirPosicoes(docs: any[]): any[] {
  const all: any[] = [];
  docs.forEach((d) => {
    if (Array.isArray(d.posicoes)) {
      d.posicoes.forEach((p: any) =>
        all.push({ ...p, codigo_conta: p.codigo_conta || d.codigo_conta, importado_em: p.importado_em || d.importado_em })
      );
    } else {
      all.push(d);
    }
  });
  // Deduplicar por conta+ativo (compat com docs antigos ainda no Firestore)
  const seen = new Map<string, any>();
  all.forEach((p) => {
    const key = `${p.codigo_conta}_${p.cnpj_fundo || p.ativo || ""}`;
    const ex = seen.get(key);
    if (!ex || (p.importado_em || "") >= (ex.importado_em || "")) seen.set(key, p);
  });
  return Array.from(seen.values());
}

export async function getPosicoes(uid: string, conta?: string) {
  // Quando filtra por conta: busca direto o documento do cliente (1 leitura)
  if (conta) {
    const data = await getDocREST(`users/${uid}/posicoes/${conta}`);
    if (data && Array.isArray(data.posicoes)) {
      return [...data.posicoes].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
    }
    // Fallback: formato antigo — lê toda a coleção e filtra
    const list = expandirPosicoes(await listDocsREST(`users/${uid}/posicoes`))
      .filter((p) => p.codigo_conta === conta);
    return list.sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
  }

  // Sem filtro: lê toda a coleção, expande e deduplica
  const list = await listDocsREST(`users/${uid}/posicoes`);
  return expandirPosicoes(list).sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
}

export async function importarPosicoes(uid: string, conta: string, posicoes: any[]) {
  // Novo formato: 1 documento por cliente com array de posições
  await commitSetREST(`users/${uid}/posicoes`, [{
    id: conta,
    data: {
      codigo_conta: conta,
      posicoes: posicoes.map((p) => ({ ...p, codigo_conta: conta })),
      importado_em: new Date().toISOString(),
    },
  }]);
  return posicoes.length;
}

export async function importarPosicoesMulti(uid: string, posicoes: any[]) {
  // Agrupa por codigo_conta — 1 documento por cliente (~10x menos writes)
  const porConta = new Map<string, any[]>();
  posicoes.forEach((p) => {
    const conta = p.codigo_conta || "";
    if (!porConta.has(conta)) porConta.set(conta, []);
    porConta.get(conta)!.push(p);
  });

  const importado_em = new Date().toISOString();
  const docs = Array.from(porConta.entries()).map(([conta, pos]) => ({
    id: conta,
    data: { codigo_conta: conta, posicoes: pos, importado_em },
  }));

  await commitSetREST(`users/${uid}/posicoes`, docs);
  return posicoes.length;
}

// ──────────────────────────────────────────────
// FUNDOS INFO (lista-fundos XP)
// ──────────────────────────────────────────────
export async function getFundosInfo(uid: string) {
  return listDocsREST(`users/${uid}/fundos_info`);
}

export async function importarFundosInfo(uid: string, fundos: any[]) {
  const docs = fundos.map((f) => ({
    id: f.cnpj || String(Math.random()),
    data: f,
  }));
  return commitSetREST(`users/${uid}/fundos_info`, docs);
}

// ──────────────────────────────────────────────
// SUPERNOVA
// ──────────────────────────────────────────────
export async function getAllAnotacoes(uid: string) {
  return listDocsREST(`users/${uid}/anotacoes`);
}

export async function getSupernovaConfig(uid: string) {
  return getDocREST(`users/${uid}/config/supernova`);
}

export async function setSupernovaConfig(uid: string, config: any) {
  await commitSetREST(`users/${uid}/config`, [{ id: "supernova", data: config }]);
}

export async function deletarPosicoesCliente(uid: string, conta: string) {
  // Novo formato: 1 doc por cliente, ID = codigo_conta — delete direto, sem scan
  const existing = await getDocREST(`users/${uid}/posicoes/${conta}`);
  if (existing) {
    await deleteDocREST(`users/${uid}/posicoes/${conta}`);
    return;
  }
  // Fallback: formato antigo com 1 doc por posição
  const all = await listDocsREST(`users/${uid}/posicoes`);
  const doConta = all.filter((d: any) => d.codigo_conta === conta);
  for (const d of doConta) {
    await deleteDocREST(`users/${uid}/posicoes/${d.id}`);
  }
}
