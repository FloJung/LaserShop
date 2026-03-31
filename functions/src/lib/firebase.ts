import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

declare global {
  var __lasershopFunctionsDb: import("firebase-admin/firestore").Firestore | undefined;
}

export function getAdminApp() {
  return getApps().length ? getApp() : initializeApp();
}

export function getDb() {
  if (globalThis.__lasershopFunctionsDb) {
    return globalThis.__lasershopFunctionsDb;
  }

  const app = getAdminApp();
  const db = getFirestore(app);

  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Functions runtime may reuse an already initialized Firestore instance.
  }

  globalThis.__lasershopFunctionsDb = db;
  return globalThis.__lasershopFunctionsDb;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getBucket() {
  return getStorage(getAdminApp()).bucket();
}
