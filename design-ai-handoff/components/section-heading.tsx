import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-[var(--text-soft)]">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

