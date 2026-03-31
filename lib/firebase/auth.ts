"use client";

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

export async function signInAdminWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseClientAuth(), email, password);
}

export async function signInAdminWithGoogle() {
  return signInWithPopup(getFirebaseClientAuth(), new GoogleAuthProvider());
}

export async function signOutFirebaseUser() {
  return signOut(getFirebaseClientAuth());
}
