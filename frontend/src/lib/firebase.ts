import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, type Firestore } from "firebase/firestore";
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
function getDb(): Firestore {
  const app = getApp();
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache(),
    });
  } catch {
    // Já inicializado (hot reload / StrictMode) — retorna a instância existente
    return getFirestore(app);
  }
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export function getFirebaseDb(): Firestore {
  return getDb();
}

// App Check — protege contra clientes não autorizados (bots, scripts, Postman)
// Só inicializa no browser; a chave é pública por design (reCAPTCHA v3)
function initAppCheck(app: FirebaseApp): AppCheck | null {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;
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
export const auth     = typeof window !== "undefined" ? getAuth(getApp()) : null as unknown as Auth;
export const db       = typeof window !== "undefined" ? getDb()           : null as unknown as Firestore;
export const appCheck = typeof window !== "undefined" ? initAppCheck(getApp()) : null;
