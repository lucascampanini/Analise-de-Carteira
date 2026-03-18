import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

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

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getApp());
}

// Lazy singletons — safe to import at module level; only initialized when called
export const auth = typeof window !== "undefined" ? getAuth(getApp()) : null as unknown as Auth;
export const db   = typeof window !== "undefined" ? getFirestore(getApp()) : null as unknown as Firestore;
