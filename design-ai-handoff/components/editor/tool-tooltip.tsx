"use client";

export function ToolTooltip({
  label,
  description
}: {
  label: string;
  description?: string;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-[180px] -translate-x-1/2 translate-y-1 rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-center opacity-0 shadow-sm transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
      <p className="text-xs font-semibold text-[var(--text)]">{label}</p>
      {description ? <p className="mt-1 text-xs text-[var(--text-soft)]">{description}</p> : null}
    </div>
  );
}
