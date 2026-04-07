import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminSignOutButton } from "@/components/admin-sign-out-button";
import { getCurrentSession } from "@/lib/server/admin-session";

export default async function AdminPage() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <section className="section">
        <div className="shell rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Admin</p>
          <h1 className="mt-3 text-3xl font-bold">Admin-Sitzung erforderlich</h1>
          <p className="mt-3 max-w-2xl text-[var(--text-soft)]">
            Melde dich mit deinem Firebase-Admin-Nutzer an. Die Session wird danach serverseitig als Cookie fuer
            geschuetzte Admin-Seiten erstellt.
          </p>
          <AdminLoginForm />
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            >
              Zur Startseite
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="shell rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Admin</p>
        <h1 className="mt-3 text-3xl font-bold">Firebase Admin-Zugang aktiv</h1>
        <p className="mt-3 max-w-2xl text-[var(--text-soft)]">
          Eingeloggt als {session.email ?? session.uid}. Firestore Rules, Storage Rules, Session-Cookies und
          Custom Claims sind fuer einen geschuetzten Admin-Bereich vorbereitet.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-full bg-[var(--text)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Produkte verwalten
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Bestellungen ansehen
          </Link>
          <Link
            href="/admin/security"
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Security Monitoring
          </Link>
          <AdminSignOutButton />
        </div>
      </div>
    </section>
  );
}
