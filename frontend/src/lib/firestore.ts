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
  const snap = await getDocs(col(uid, "anotacoes"));
  return snap2arr(snap)
    .filter((a: any) => a.codigo_conta === conta)
    .sort((a: any, b: any) => {
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
  const snap = await getDocs(col(uid, "eventos"));
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return snap2arr(snap)
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
  const snap = await getDocs(col(uid, "reunioes"));
  const agora = new Date().toISOString();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return snap2arr(snap)
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
  for (const l of leads) {
    await addDoc(col(uid, "leads"), { ...l, criado_em: serverTimestamp() });
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
  const snap = await getDocs(col(uid, "oferta_clientes"));
  return snap2arr(snap).filter((x: any) => x.oferta_id === ofertaId);
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
export async function getPosicoes(uid: string, conta?: string) {
  const snap = await getDocs(col(uid, "posicoes"));
  let list = snap2arr(snap);
  if (conta) list = list.filter((p: any) => p.codigo_conta === conta);
  return list.sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
}

export async function importarPosicoes(uid: string, conta: string, posicoes: any[]) {
  // Upsert por ID estável (conta + cnpj/ativo) — evita apagar+reinserir (reduz writes ~3x)
  for (let i = 0; i < posicoes.length; i += 400) {
    const b = writeBatch(db);
    posicoes.slice(i, i + 400).forEach((p) => {
      const chave = `${conta}_${(p.cnpj_fundo || p.ativo || "").replace(/[^a-z0-9]/gi, "").slice(0, 40)}`;
      const ref = doc(col(uid, "posicoes"), chave);
      b.set(ref, { ...p, codigo_conta: conta, importado_em: new Date().toISOString() });
    });
    await b.commit();
  }
  return posicoes.length;
}

export async function importarPosicoesMulti(uid: string, posicoes: any[]) {
  // Upsert por ID estável (conta + cnpj/ativo) — evita apagar+reinserir (reduz writes ~3x)
  for (let i = 0; i < posicoes.length; i += 400) {
    const b = writeBatch(db);
    posicoes.slice(i, i + 400).forEach((p) => {
      const chave = `${p.codigo_conta}_${(p.cnpj_fundo || p.ativo || "").replace(/[^a-z0-9]/gi, "").slice(0, 40)}`;
      const ref = doc(col(uid, "posicoes"), chave);
      b.set(ref, { ...p, importado_em: new Date().toISOString() });
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

export async function deletarPosicoesCliente(uid: string, conta: string) {
  const existing = await getDocs(col(uid, "posicoes"));
  const doConta = existing.docs.filter((d) => d.data().codigo_conta === conta);
  for (let i = 0; i < doConta.length; i += 400) {
    const b = writeBatch(db);
    doConta.slice(i, i + 400).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
}
