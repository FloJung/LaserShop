import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isAdminRole } from "@/shared/firebase/roles";

const SESSION_COOKIE_NAME = "__session";

export async function getCurrentSession() {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return null;
  }

  try {
    return await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getCurrentSession();
  if (!session || !isAdminRole(session.role)) {
    redirect("/admin");
  }

  return session;
}
