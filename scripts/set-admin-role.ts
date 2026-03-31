import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

function nowIso() {
  return new Date().toISOString();
}

function readArgument(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function resolveUid() {
  const uid = readArgument("--uid");
  if (uid) {
    return uid;
  }

  const email = readArgument("--email");
  if (!email) {
    throw new Error("Use --uid <uid> or --email <email>.");
  }

  try {
    const user = await getAdminAuth().getUserByEmail(email);
    return user.uid;
  } catch (error) {
    const createFlag = readArgument("--create");
    const password = readArgument("--password");

    if (createFlag !== "true" || !password) {
      throw error;
    }

    const createdUser = await getAdminAuth().createUser({
      email,
      password,
      emailVerified: true
    });

    return createdUser.uid;
  }
}

async function main() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase admin environment is missing. Fill FIREBASE_* variables first.");
  }

  const uid = await resolveUid();
  const user = await getAdminAuth().getUser(uid);

  await getAdminAuth().setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    role: "admin"
  });

  await getAdminDb()
    .collection("customers")
    .doc(uid)
    .set(
      {
        email: user.email ?? "",
        firstName: user.displayName?.split(" ")[0] ?? undefined,
        lastName: user.displayName?.split(" ").slice(1).join(" ") || undefined,
        role: "admin",
        updatedAt: nowIso(),
        createdAt: nowIso()
      },
      { merge: true }
    );

  console.log(`Admin role assigned to ${uid}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
