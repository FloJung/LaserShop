import Link from "next/link";
import { Gem } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--text)] text-white">
        <Gem size={18} />
      </span>
      <div>
        <p className="font-[var(--font-serif)] text-xl leading-none">Laser Shop</p>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">engraved glass</p>
      </div>
    </Link>
  );
}

