"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Circle, Octagon, Square } from "lucide-react";
import { ToolTooltip } from "@/components/editor/tool-tooltip";
import { cn } from "@/lib/utils";
import { DRAWABLE_SHAPES } from "@/lib/design-tool";
import type { DrawableShapeType, EditorTool } from "@/lib/design-tool";

function ShapeIcon({ shapeType, size = 17 }: { shapeType: DrawableShapeType; size?: number }) {
  if (shapeType === "circle") {
    return <Circle size={size} />;
  }

  if (shapeType === "octagon") {
    return <Octagon size={size} />;
  }

  return <Square size={size} />;
}

export function FormsDropdown({
  activeTool,
  activeShapeType,
  onSelectShape
}: {
  activeTool: EditorTool;
  activeShapeType: DrawableShapeType;
  onSelectShape: (shapeType: DrawableShapeType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeShapeLabel = DRAWABLE_SHAPES.find((shape) => shape.id === activeShapeType)?.label ?? "Formen";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="group relative">
      <button
        type="button"
        aria-label={`Formen: ${activeShapeLabel}`}
        className={cn(
          "flex h-11 min-w-11 items-center justify-center gap-1 rounded-2xl border bg-white px-3 text-[var(--text)] transition focus:outline-none focus:shadow-[0_0_0_2px_rgba(231,119,44,0.2)]",
          activeTool === "shape" || isOpen
            ? "border-[var(--brand)] text-[var(--brand)]"
            : "border-[var(--line)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        )}
        onClick={() => setIsOpen((current) => !current)}
      >
        <ShapeIcon shapeType={activeShapeType} />
        <ChevronDown size={12} className={cn("text-[var(--text-soft)] transition", isOpen && "rotate-180")} />
      </button>
      <ToolTooltip label="Formen" description={`${activeShapeLabel} auswählen und auf der Fläche zeichnen`} />

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-3 w-[220px] rounded-3xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Formen</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">Wähle die Form für den Zwei-Klick-Zeichenmodus.</p>

          <div className="mt-4 space-y-2">
            {DRAWABLE_SHAPES.map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => {
                  onSelectShape(shape.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                  shape.id === activeShapeType
                    ? "border-[var(--brand)] bg-[var(--muted-surface)]"
                    : "border-[var(--line)] bg-white hover:border-[var(--brand)] hover:bg-[var(--muted-surface)]"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[var(--brand)]">
                  <ShapeIcon shapeType={shape.id} size={18} />
                </span>
                <span className="text-sm font-semibold text-[var(--text)]">{shape.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
