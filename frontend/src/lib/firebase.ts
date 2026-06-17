import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, memoryLocalCache, type Firestore } from "firebase/firestore";
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

// Cache em memória (sem IndexedDB): evita travas de lease/conexão zumbi
// entre abas/sessões que ocorriam com persistentLocalCache. Sem persistência
// offline — sempre busca do servidor ao recarregar, mas escritas nunca
// dependem de estado preso em IndexedDB.
// Módulo-level singleton — garante que a instância criada na primeira chamada
// é reutilizada em hot-reloads sem fallback para a instância errada do
// getFirestore(app).
let _dbInstance: Firestore | null = null;

function getDb(): Firestore {
  if (_dbInstance) return _dbInstance;
  const app = getApp();
  try {
    _dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
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

export function getFirebaseDb(): Firestore {
  return getDb();
}

// App Check — protege contra clientes não autorizados (bots, scripts, Postman)
// Só inicializa no browser; a chave é pública por design (reCAPTCHA v3)
//
// DESLIGADO por padrão (teste de eliminação 2026-06): o reCAPTCHA estava
// falhando (appCheck/recaptcha-error) após a migração para o Vercel — o
// domínio novo não está registrado na chave reCAPTCHA, e com App Check
// enforced no Firestore isso travava TODA escrita/leitura esperando um token
// que nunca chegava. Para reativar: registrar o domínio do Vercel no console
// do reCAPTCHA v3 + Firebase App Check, depois setar NEXT_PUBLIC_APPCHECK_ENABLED=true.
function initAppCheck(app: FirebaseApp): AppCheck | null {
  if (process.env.NEXT_PUBLIC_APPCHECK_ENABLED !== "true") return null;
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
export const db         = typeof window !== "undefined" ? getDb()                                              : null as unknown as Firestore;
export const functions = typeof window !== "undefined" ? getFunctions(getApp(), "southamerica-east1")         : null as unknown as Functions;
export const appCheck  = typeof window !== "undefined" ? initAppCheck(getApp())                               : null;
