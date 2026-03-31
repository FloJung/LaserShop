import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminEnv, isFirebaseAdminConfigured } from "@/lib/firebase/env";

declare global {
  var __lasershopAdminDb: import("firebase-admin/firestore").Firestore | undefined;
}

function parseServiceAccountJson(value: string) {
  const parsed = JSON.parse(value) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key
  };
}

export function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase admin environment variables are missing.");
  }

  if (getApps().length) {
    return getApp();
  }

  const env = getFirebaseAdminEnv();
  const serviceAccount = env.serviceAccountJson
    ? parseServiceAccountJson(env.serviceAccountJson)
    : {
        projectId: env.projectId!,
        clientEmail: env.clientEmail!,
        privateKey: env.privateKey!
      };

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: env.projectId,
    storageBucket: env.storageBucket
  });
}

export function getAdminDb() {
  if (globalThis.__lasershopAdminDb) {
    return globalThis.__lasershopAdminDb;
  }

  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  const app = getFirebaseAdminApp();
  const db = getFirestore(app);

  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Firestore may already be initialized in dev/HMR. Reuse the existing instance.
  }

  globalThis.__lasershopAdminDb = db;
  return globalThis.__lasershopAdminDb;
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminBucket() {
  const { getStorage } = require("firebase-admin/storage") as typeof import("firebase-admin/storage");
  return getStorage(getFirebaseAdminApp()).bucket();
}

export { isFirebaseAdminConfigured };
