"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getFirebaseClientEnv, isFirebaseClientConfigured } from "@/lib/firebase/env";

export function getFirebaseClientApp() {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase client environment variables are missing.");
  }

  const env = getFirebaseClientEnv();

  return getApps().length
    ? getApp()
    : initializeApp({
        apiKey: env.apiKey,
        authDomain: env.authDomain,
        projectId: env.projectId,
        storageBucket: env.storageBucket,
        messagingSenderId: env.messagingSenderId,
        appId: env.appId
      });
}

export function getFirebaseClientAuth() {
  return getAuth(getFirebaseClientApp());
}

export function getFirebaseClientStorage() {
  return getStorage(getFirebaseClientApp());
}

export function getFirebaseClientFunctions() {
  const env = getFirebaseClientEnv();
  return getFunctions(getFirebaseClientApp(), env.functionsRegion);
}
