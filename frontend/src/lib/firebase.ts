import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, memoryLocalCache, clearIndexedDbPersistence, terminate, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";

// Firebase is only available in the browser — guard against SSR pre-rendering
function getApp(): FirebaseApp {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  });
}

// Inicializa o Firestore com cache persistente (IndexedDB).
// Após o primeiro carregamento, os dados vêm do cache local em ms,
// com sincronização automática em background quando online.
// Módulo-level singleton — garante que a instância criada na primeira chamada
// (com o cache correto) é reutilizada em hot-reloads sem fallback para a
// instância errada do getFirestore(app).
let _dbInstance: Firestore | null = null;

function getDb(): Firestore {
  if (_dbInstance) return _dbInstance;
  const app = getApp();
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  try {
    _dbInstance = initializeFirestore(app, {
      // persistentLocalCache: setDoc resolve do IndexedDB instantaneamente
      // sem esperar o servidor — servidor sincroniza em background
      localCache: persistentLocalCache(),
    });
  } catch {
    // já inicializado por outro módulo — reutiliza
    _dbInstance = getFirestore(app);
  }
  return _dbInstance;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

/**
 * Limpa o IndexedDB do Firestore e reinicializa a instância.
 * Resolve mutations pendentes travadas de sessões anteriores.
 * Chamar antes de importações em lote quando persistentLocalCache está em uso.
 */
export async function resetFirestoreCache(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (_dbInstance) {
    try {
      await terminate(_dbInstance);
    } catch { /* ignora se já terminado */ }
    _dbInstance = null;
  }
  const app = getApp();
  // Cria instância temporária apenas para limpar o IndexedDB
  try {
    const tempDb = initializeFirestore(app, { localCache: persistentLocalCache() });
    await clearIndexedDbPersistence(tempDb);
  } catch { /* ignora se já limpo */ }
  // Reinicializa com persistentLocalCache limpo — reatribui o binding exportado
  // `db`, já que a instância antiga foi terminada e não pode mais ser usada.
  db = getDb();
}

export function getFirebaseDb(): Firestore {
  return getDb();
}

// App Check — protege contra clientes não autorizados (bots, scripts, Postman)
// Só inicializa no browser; a chave é pública por design (reCAPTCHA v3)
function initAppCheck(app: FirebaseApp): AppCheck | null {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;
  // localhost não está na whitelist do reCAPTCHA — pula App Check em dev
  if (window.location.hostname === 'localhost') return null;
  try {
    return initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Já inicializado (hot reload / StrictMode)
    return null;
  }
}

// Lazy singletons — safe to import at module level; only initialized when called
export const auth      = typeof window !== "undefined" ? getAuth(getApp())                                    : null as unknown as Auth;
export let db           = typeof window !== "undefined" ? getDb()                                              : null as unknown as Firestore;
export const functions = typeof window !== "undefined" ? getFunctions(getApp(), "southamerica-east1")         : null as unknown as Functions;
export const appCheck  = typeof window !== "undefined" ? initAppCheck(getApp())                               : null;
