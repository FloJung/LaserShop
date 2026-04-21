"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutFirebaseUser } from "@/lib/firebase/auth";

export function AdminSignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    await fetch("/api/auth/session", {
      method: "DELETE"
    });

    await signOutFirebaseUser().catch(() => undefined);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "Abmeldung..." : "Abmelden"}
    </button>
  );
}
