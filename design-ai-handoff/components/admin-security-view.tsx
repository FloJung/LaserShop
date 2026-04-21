import Link from "next/link";
import type { AdminSecurityDashboardData } from "@/lib/server/security-monitoring";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatEventTypes(
  eventTypes: Array<{
    type: string;
    count: number;
  }>
) {
  return eventTypes.map((entry) => `${entry.type} (${entry.count})`).join(", ");
}

export function AdminSecurityView({ alerts, topAttackers, recentEvents }: AdminSecurityDashboardData) {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Admin Security</p>
              <h1 className="mt-3 text-3xl font-bold">Security Monitoring</h1>
              <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
                Zentrale Sicht auf Security-Events, erkannte Angriffsmuster und auffaellige Request-Serien.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Zurueck zum Admin
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Offene Alerts</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">Gruppierte Attacken pro gehashter IP.</p>
            </div>
            <span className="rounded-full bg-[var(--sand)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
              {alerts.length} offen
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--text-soft)]">
              Aktuell keine offenen Security-Alerts.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[var(--text-soft)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Typ</th>
                    <th className="px-3 py-2 font-semibold">IP Hash</th>
                    <th className="px-3 py-2 font-semibold">Events</th>
                    <th className="px-3 py-2 font-semibold">Erste Aktivitaet</th>
                    <th className="px-3 py-2 font-semibold">Letzte Aktivitaet</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-t border-[var(--line)]">
                      <td className="px-3 py-3 font-medium text-[var(--text)]">{alert.type}</td>
                      <td className="px-3 py-3 font-mono text-xs text-[var(--text-soft)]">{alert.ipHash}</td>
                      <td className="px-3 py-3 text-[var(--text)]">{alert.eventCount}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{formatDateTime(alert.firstSeenAt.toDate().toISOString())}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{formatDateTime(alert.lastSeenAt.toDate().toISOString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[var(--text)]">Top Angreifer</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">Aggregiert aus den zuletzt geladenen Security-Events.</p>

          {topAttackers.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--text-soft)]">
              Noch keine auffaelligen Angreifer in den geladenen Events.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {topAttackers.map((attacker) => (
                <article key={attacker.ipHash} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                  <p className="font-mono text-xs text-[var(--text-soft)]">{attacker.ipHash}</p>
                  <p className="mt-3 text-3xl font-bold text-[var(--text)]">{attacker.eventCount}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">Events in der geladenen Stichprobe</p>
                  <p className="mt-4 text-sm text-[var(--text)]">Hauefigste Typen: {formatEventTypes(attacker.topEventTypes)}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Letzte Aktivitaet: {formatDateTime(attacker.lastSeenAt)}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[var(--text)]">Event Feed</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">Die letzten 100 Security-Events in absteigender Zeitfolge.</p>

          {recentEvents.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--text-soft)]">
              Noch keine Security-Events vorhanden.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[var(--text-soft)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Zeit</th>
                    <th className="px-3 py-2 font-semibold">Typ</th>
                    <th className="px-3 py-2 font-semibold">Severity</th>
                    <th className="px-3 py-2 font-semibold">IP Hash</th>
                    <th className="px-3 py-2 font-semibold">Pfad</th>
                    <th className="px-3 py-2 font-semibold">Grund</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event.id} className="border-t border-[var(--line)]">
                      <td className="px-3 py-3 text-[var(--text-soft)]">{formatDateTime(event.createdAt.toDate().toISOString())}</td>
                      <td className="px-3 py-3 font-medium text-[var(--text)]">{event.type}</td>
                      <td className="px-3 py-3 text-[var(--text)]">{event.severity}</td>
                      <td className="px-3 py-3 font-mono text-xs text-[var(--text-soft)]">{event.ipHash}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{event.path ?? "-"}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{event.reason ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
