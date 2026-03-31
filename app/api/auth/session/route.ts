import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isAdminRole } from "@/shared/firebase/roles";

const SESSION_COOKIE_NAME = "__session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Firebase admin is not configured." }, { status: 503 });
  }

  const body = (await request.json()) as { idToken?: string };
  if (!body.idToken) {
    return NextResponse.json({ error: "idToken is required." }, { status: 400 });
  }

  const decodedToken = await getAdminAuth().verifyIdToken(body.idToken);
  if (!isAdminRole(decodedToken.role)) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const sessionCookie = await getAdminAuth().createSessionCookie(body.idToken, {
    expiresIn: SESSION_DURATION_MS
  });

  (await cookies()).set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return NextResponse.json({ success: true });
}
