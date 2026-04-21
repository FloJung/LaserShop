"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInAdminWithEmail, signOutFirebaseUser } from "@/lib/firebase/auth";
import { isAdminRole } from "@/shared/firebase/roles";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("joni.moser01@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const credentials = await signInAdminWithEmail(email.trim(), password);
      const tokenResult = await credentials.user.getIdTokenResult(true);

      if (!isAdminRole(tokenResult.claims.role as string | undefined)) {
        await signOutFirebaseUser();
        setError("Dieser Nutzer hat keine Admin-Berechtigung.");
        return;
      }

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken: tokenResult.token })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Die Admin-Session konnte nicht erstellt werden.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Admin-Login fehlgeschlagen.";
      setError(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
          E-Mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--brand)]"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--brand)]"
            required
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Admin wird angemeldet..." : "Als Admin anmelden"}
      </button>
    </form>
  );
}
