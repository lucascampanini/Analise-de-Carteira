import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, serverTimestamp, writeBatch,
  query, where, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const col = (uid: string, name: string) =>
  collection(db, "users", uid, name);

const docRef = (uid: string, name: string, id: string) =>
  doc(db, "users", uid, name, id);

const snap2arr = (snap: any) =>
  snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

// ──────────────────────────────────────────────
// CLIENTES
// ──────────────────────────────────────────────
export async function getClientes(uid: string) {
  const snap = await getDocs(col(uid, "clientes"));
  return snap2arr(snap).sort((a: any, b: any) =>
    (b.net || 0) - (a.net || 0)
  );
}

export async function importarClientes(uid: string, clientes: any[]) {
  // Upsert por codigo_conta — evita apagar+reinserir (reduz writes ~3x)
  for (let i = 0; i < clientes.length; i += 400) {
    const b = writeBatch(db);
    clientes.slice(i, i + 400).forEach((c) => {
      const ref = doc(col(uid, "clientes"), c.codigo_conta || String(Math.random()));
      b.set(ref, { ...c, importado_em: new Date().toISOString() });
    });
    await b.commit();
  }
  return clientes.length;
}

// ──────────────────────────────────────────────
// ANOTAÇÕES
// ──────────────────────────────────────────────
export async function getAnotacoes(uid: string, conta: string) {
  // where sem orderBy — usa índice single-field automático, sem precisar de índice composto
  const q = query(col(uid, "anotacoes"), where("codigo_conta", "==", conta));
  const snap = await getDocs(q);
  return snap2arr(snap).sort((a: any, b: any) => {
    const ta = a.criado_em?.seconds ?? 0;
    const tb = b.criado_em?.seconds ?? 0;
    return tb - ta;
  });
}

export async function addAnotacao(uid: string, conta: string, tipo: string, texto: string) {
  return addDoc(col(uid, "anotacoes"), {
    codigo_conta: conta,
    tipo,
    texto,
    criado_em: serverTimestamp(),
  });
}

export async function deleteAnotacao(uid: string, id: string) {
  return deleteDoc(docRef(uid, "anotacoes", id));
}

// ──────────────────────────────────────────────
// EVENTOS / TAREFAS
// ──────────────────────────────────────────────
export async function getEventosProximos(uid: string, dias = 90) {
  // where sem orderBy — usa índice single-field automático, sem precisar de índice composto
  const q = query(col(uid, "eventos"), where("concluido", "==", false));
  const snap = await getDocs(q);
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return snap2arr(snap)
    .filter((e: any) => new Date(e.data_evento) <= limite)
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
  return addDoc(col(uid, "eventos"), { ...data, concluido: false, criado_em: serverTimestamp() });
}

export async function concluirEvento(uid: string, id: string) {
  return updateDoc(docRef(uid, "eventos", id), { concluido: true });
}

export async function deleteEvento(uid: string, id: string) {
  return deleteDoc(docRef(uid, "eventos", id));
}

// ──────────────────────────────────────────────
// REUNIÕES
// ──────────────────────────────────────────────
export async function getReunioes(uid: string, dias = 30) {
  // Range query no servidor — data_hora já serve como índice (single-field, sem composite)
  const agora = new Date().toISOString();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  const q = query(
    col(uid, "reunioes"),
    where("data_hora", ">=", agora),
    where("data_hora", "<=", limite.toISOString()),
    orderBy("data_hora"),
  );
  const snap = await getDocs(q);
  // Só filtra status no cliente (poucos docs depois do range)
  return snap2arr(snap).filter((r: any) => r.status !== "CANCELADA");
}

export async function addReuniao(uid: string, data: any) {
  return addDoc(col(uid, "reunioes"), {
    ...data,
    status: "AGENDADA",
    criado_em: serverTimestamp(),
  });
}

export async function cancelarReuniao(uid: string, id: string) {
  return updateDoc(docRef(uid, "reunioes", id), { status: "CANCELADA" });
}

// ──────────────────────────────────────────────
// LEADS
// ──────────────────────────────────────────────
export async function getLeads(uid: string, estagio?: string) {
  const snap = await getDocs(col(uid, "leads"));
  let list = snap2arr(snap);
  if (estagio) list = list.filter((l: any) => l.estagio === estagio);
  return list.sort((a: any, b: any) => {
    const ta = a.criado_em?.seconds ?? 0;
    const tb = b.criado_em?.seconds ?? 0;
    return tb - ta;
  });
}

export async function addLead(uid: string, data: any) {
  return addDoc(col(uid, "leads"), { ...data, criado_em: serverTimestamp() });
}

export async function patchLeadEstagio(uid: string, id: string, estagio: string) {
  return updateDoc(docRef(uid, "leads", id), { estagio });
}

export async function patchLead(uid: string, id: string, data: any) {
  return updateDoc(docRef(uid, "leads", id), data);
}

export async function deleteLead(uid: string, id: string) {
  return deleteDoc(docRef(uid, "leads", id));
}

export async function importarLeads(uid: string, leads: any[]) {
  // writeBatch em vez de loop sequencial — N requests → ceil(N/400) requests
  const now = serverTimestamp();
  for (let i = 0; i < leads.length; i += 400) {
    const b = writeBatch(db);
    leads.slice(i, i + 400).forEach((l) => {
      const ref = doc(col(uid, "leads")); // auto-ID
      b.set(ref, { ...l, criado_em: now });
    });
    await b.commit();
  }
  return leads.length;
}

// ──────────────────────────────────────────────
// OFERTAS
// ──────────────────────────────────────────────
export async function getOfertas(uid: string) {
  const snap = await getDocs(col(uid, "ofertas"));
  return snap2arr(snap).sort((a: any, b: any) => {
    const ta = a.criado_em?.seconds ?? 0;
    const tb = b.criado_em?.seconds ?? 0;
    return tb - ta;
  });
}

export async function addOferta(uid: string, data: any) {
  const ref = await addDoc(col(uid, "ofertas"), {
    ...data,
    criado_em: serverTimestamp(),
  });
  return ref.id;
}

export async function patchOferta(uid: string, id: string, data: any) {
  return updateDoc(docRef(uid, "ofertas", id), data);
}

export async function deleteOferta(uid: string, id: string) {
  return deleteDoc(docRef(uid, "ofertas", id));
}

// ──────────────────────────────────────────────
// OFERTA × CLIENTES
// ──────────────────────────────────────────────
export async function getAllClientesOfertas(uid: string) {
  const snap = await getDocs(col(uid, "oferta_clientes"));
  return snap2arr(snap);
}

export async function getClientesOferta(uid: string, ofertaId: string) {
  const q = query(col(uid, "oferta_clientes"), where("oferta_id", "==", ofertaId));
  const snap = await getDocs(q);
  return snap2arr(snap);
}

export async function addClienteOferta(uid: string, data: any) {
  const ref = await addDoc(col(uid, "oferta_clientes"), {
    ...data,
    criado_em: serverTimestamp(),
  });
  return ref.id;
}

export async function patchClienteOferta(uid: string, id: string, data: any) {
  return updateDoc(docRef(uid, "oferta_clientes", id), data);
}

export async function deleteClienteOferta(uid: string, id: string) {
  return deleteDoc(docRef(uid, "oferta_clientes", id));
}

export async function importarClientesOferta(uid: string, ofertaId: string, clientes: any[]) {
  for (const c of clientes) {
    await addDoc(col(uid, "oferta_clientes"), {
      ...c,
      oferta_id: ofertaId,
      status: c.status || "PENDENTE",
      criado_em: serverTimestamp(),
    });
  }
  return clientes.length;
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
    const docSnap = await getDoc(doc(col(uid, "posicoes"), conta));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.posicoes)) {
        return [...data.posicoes].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
      }
    }
    // Fallback: formato antigo — lê toda a coleção e filtra
    const snap = await getDocs(col(uid, "posicoes"));
    const list = expandirPosicoes(snap2arr(snap)).filter((p) => p.codigo_conta === conta);
    return list.sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
  }

  // Sem filtro: lê toda a coleção, expande e deduplica
  const snap = await getDocs(col(uid, "posicoes"));
  return expandirPosicoes(snap2arr(snap)).sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
}

export async function importarPosicoes(uid: string, conta: string, posicoes: any[]) {
  // Novo formato: 1 documento por cliente com array de posições
  const ref = doc(col(uid, "posicoes"), conta);
  await setDoc(ref, {
    codigo_conta: conta,
    posicoes: posicoes.map((p) => ({ ...p, codigo_conta: conta })),
    importado_em: new Date().toISOString(),
  });
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

  const entries = Array.from(porConta.entries());
  const importado_em = new Date().toISOString();
  for (let i = 0; i < entries.length; i += 400) {
    const b = writeBatch(db);
    entries.slice(i, i + 400).forEach(([conta, pos]) => {
      const ref = doc(col(uid, "posicoes"), conta);
      b.set(ref, { codigo_conta: conta, posicoes: pos, importado_em });
    });
    await b.commit();
  }
  return posicoes.length;
}

// ──────────────────────────────────────────────
// FUNDOS INFO (lista-fundos XP)
// ──────────────────────────────────────────────
export async function getFundosInfo(uid: string) {
  const snap = await getDocs(collection(db, "users", uid, "fundos_info"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function importarFundosInfo(uid: string, fundos: any[]) {
  const col = collection(db, "users", uid, "fundos_info");
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

// ──────────────────────────────────────────────
// SUPERNOVA
// ──────────────────────────────────────────────
export async function getAllAnotacoes(uid: string) {
  const snap = await getDocs(col(uid, "anotacoes"));
  return snap2arr(snap);
}

export async function getSupernovaConfig(uid: string) {
  const ref = doc(db, "users", uid, "config", "supernova");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function setSupernovaConfig(uid: string, config: any) {
  await setDoc(doc(db, "users", uid, "config", "supernova"), config);
}

export async function deletarPosicoesCliente(uid: string, conta: string) {
  // Novo formato: 1 doc por cliente, ID = codigo_conta — delete direto, sem scan
  const ref = doc(col(uid, "posicoes"), conta);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return;
  }
  // Fallback: formato antigo com 1 doc por posição
  const existing = await getDocs(col(uid, "posicoes"));
  const doConta = existing.docs.filter((d) => d.data().codigo_conta === conta);
  for (let i = 0; i < doConta.length; i += 400) {
    const b = writeBatch(db);
    doConta.slice(i, i + 400).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
}
