// ──────────────────────────────────────────────────────────────────────────
// Acesso ao Firestore via API REST (bypassa o SDK)
// ──────────────────────────────────────────────────────────────────────────
// Em alguns ambientes (antivírus com inspeção HTTPS, proxy corporativo) o canal
// de streaming do SDK do Firestore (.../Firestore/Listen|Write/channel) é
// bloqueado — escritas/leituras ficam "pendentes" para sempre, mesmo com
// forceLongPolling. A API REST (/v1/.../documents) usa requisições HTTPS comuns
// e atravessa esses bloqueios. Comprovado em 2026-06 no diagnóstico da tela de
// importação: REST get/write/del = 200 em <700ms; SDK = timeout 15s.
//
// Este módulo replica as primitivas que a camada de dados precisa (get, list,
// commit em lote, delete), com conversão entre JSON do app e o formato "Value"
// do Firestore.

import { auth } from "./firebase";

// .trim(): a env var no Vercel foi gravada com \n no final (crm-assessor\n);
// na URL passava batido, mas o Firestore :commit valida o resource name ao pé
// da letra e rejeitava com "Invalid project ID(crm-assessor\n)".
const PROJECT_ID = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
const ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${ROOT}`;

async function getToken(): Promise<string> {
  const t = await auth?.currentUser?.getIdToken();
  if (!t) throw new Error("Sessão expirada. Faça login novamente e tente outra vez.");
  return t;
}

function headers(token: string, json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ── Conversão JS → Firestore Value ────────────────────────────────────────
export function toValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return { nullValue: null }; // Firestore não aceita NaN/Infinity
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

export function toFields(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val === undefined) continue; // Firestore ignora campos undefined
    out[k] = toValue(val);
  }
  return out;
}

// ── Conversão Firestore Value → JS ────────────────────────────────────────
export function fromValue(v: any): any {
  if (v == null) return null;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue; // mantém ISO string
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromValue);
  if ("mapValue" in v) return fromFields(v.mapValue.fields || {});
  if ("referenceValue" in v) return v.referenceValue;
  return null;
}

export function fromFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, val] of Object.entries(fields)) out[k] = fromValue(val);
  return out;
}

// ── Leitura de 1 documento ────────────────────────────────────────────────
// path relativo, ex: `users/${uid}/posicoes/${conta}`. Retorna null se 404.
export async function getDocREST(path: string): Promise<Record<string, any> | null> {
  const token = await getToken();
  const r = await fetch(`${BASE}/${path}`, { headers: headers(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Firestore GET (${path}) falhou: HTTP ${r.status}`);
  const d = await r.json();
  return { id: path.split("/").pop(), ...fromFields(d.fields || {}) };
}

// ── Listagem de uma coleção (com paginação) ───────────────────────────────
// coll relativo, ex: `users/${uid}/clientes`.
export async function listDocsREST(coll: string): Promise<any[]> {
  const token = await getToken();
  const out: any[] = [];
  let pageToken = "";
  do {
    const url =
      `${BASE}/${coll}?pageSize=300` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
    const r = await fetch(url, { headers: headers(token) });
    if (r.status === 404) break;
    if (!r.ok) throw new Error(`Firestore LIST (${coll}) falhou: HTTP ${r.status}`);
    const d = await r.json();
    (d.documents || []).forEach((doc: any) => {
      out.push({ id: doc.name.split("/").pop(), ...fromFields(doc.fields || {}) });
    });
    pageToken = d.nextPageToken || "";
  } while (pageToken);
  return out;
}

// ── Escrita em lote (set/overwrite) ───────────────────────────────────────
// coll relativo + docs com id e data. Sobrescreve o documento (= setDoc sem merge).
export async function commitSetREST(
  coll: string,
  docs: { id: string; data: Record<string, any> }[],
): Promise<number> {
  if (docs.length === 0) return 0;
  const token = await getToken();
  // Firestore :commit aceita até 500 writes; usamos 400 por segurança.
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const writes = chunk.map((d) => ({
      update: { name: `${ROOT}/${coll}/${d.id}`, fields: toFields(d.data) },
    }));
    const r = await fetch(`${BASE}:commit`, {
      method: "POST",
      headers: headers(token, true),
      body: JSON.stringify({ writes }),
    });
    if (!r.ok) {
      throw new Error(`Firestore commit falhou: HTTP ${r.status} — ${await r.text()}`);
    }
  }
  return docs.length;
}

// ── Criação com ID automático (= addDoc) ──────────────────────────────────
// Retorna o ID gerado pelo Firestore.
export async function addDocREST(coll: string, data: Record<string, any>): Promise<string> {
  const token = await getToken();
  const r = await fetch(`${BASE}/${coll}`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!r.ok) {
    throw new Error(`Firestore create (${coll}) falhou: HTTP ${r.status} — ${await r.text()}`);
  }
  const d = await r.json();
  return d.name.split("/").pop();
}

// ── Atualização parcial (= updateDoc / merge) ─────────────────────────────
// Atualiza APENAS os campos informados (updateMask), preservando os demais.
export async function patchDocREST(path: string, data: Record<string, any>): Promise<void> {
  const token = await getToken();
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const r = await fetch(`${BASE}/${path}?${mask}`, {
    method: "PATCH",
    headers: headers(token, true),
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!r.ok) {
    throw new Error(`Firestore patch (${path}) falhou: HTTP ${r.status} — ${await r.text()}`);
  }
}

// ── Exclusão de 1 documento ───────────────────────────────────────────────
export async function deleteDocREST(path: string): Promise<void> {
  const token = await getToken();
  const r = await fetch(`${BASE}/${path}`, { method: "DELETE", headers: headers(token) });
  if (!r.ok && r.status !== 404) {
    throw new Error(`Firestore DELETE (${path}) falhou: HTTP ${r.status}`);
  }
}
