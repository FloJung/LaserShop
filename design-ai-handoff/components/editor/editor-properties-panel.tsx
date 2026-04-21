"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import {
  FONT_OPTIONS,
  ICON_LIBRARY,
  MAX_LINE_LENGTH,
  MAX_RECT_SIZE,
  MAX_STROKE_WIDTH,
  MIN_LINE_LENGTH,
  MIN_RECT_SIZE,
  MIN_STROKE_WIDTH,
  clampValue
} from "@/lib/design-tool";
import type { EditorElement, IconId } from "@/lib/design-tool";

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:shadow-[0_0_0_2px_rgba(231,119,44,0.2)]";

export function EditorPropertiesPanel({
  selectedElement,
  jsonPreview,
  savedLabel,
  onUpdate,
  onDelete,
  onExportPng
}: {
  selectedElement?: EditorElement;
  jsonPreview: string;
  savedLabel: string;
  onUpdate: (patch: Partial<EditorElement>) => void;
  onDelete: () => void;
  onExportPng: () => void;
}) {
  return (
    <aside className="space-y-4 rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Eigenschaften</p>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          {selectedElement
            ? "Passe das aktuell gewaehlte Element direkt an."
            : "Wähle ein Element auf der Fläche aus, um Inhalt, Position und Größe zu bearbeiten."}
        </p>
      </div>

      {selectedElement ? (
        <div className="space-y-4">
          {selectedElement.type === "text" || selectedElement.type === "icon" ? (
            <Field label="Inhalt">
              {selectedElement.type === "icon" ? (
                <select
                  className={inputClassName}
                  value={selectedElement.content}
                  onChange={(event) => onUpdate({ content: event.target.value as IconId })}
                >
                  {ICON_LIBRARY.map((icon) => (
                    <option key={icon.id} value={icon.id}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  className={`${inputClassName} min-h-24 resize-none`}
                  value={selectedElement.content}
                  onChange={(event) => onUpdate({ content: event.target.value })}
                />
              )}
            </Field>
          ) : null}

          {selectedElement.type === "text" ? (
            <>
              <Field label="Schriftart">
                <select
                  className={inputClassName}
                  value={selectedElement.fontFamily}
                  onChange={(event) => onUpdate({ fontFamily: event.target.value })}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Schriftgröße">
                  <input
                    className={inputClassName}
                    type="number"
                    min={12}
                    max={92}
                    value={selectedElement.fontSize ?? 28}
                    onChange={(event) =>
                      onUpdate({ fontSize: clampValue(Number(event.target.value) || 28, 12, 92) })
                    }
                  />
                </Field>

                <Field label="Ausrichtung">
                  <select
                    className={inputClassName}
                    value={selectedElement.textAlign}
                    onChange={(event) =>
                      onUpdate({ textAlign: event.target.value as "left" | "center" | "right" })
                    }
                  >
                    <option value="left">Links</option>
                    <option value="center">Zentriert</option>
                    <option value="right">Rechts</option>
                  </select>
                </Field>
              </div>

              <Field label="Buchstabenabstand">
                <input
                  className={inputClassName}
                  type="number"
                  min={0}
                  max={10}
                  step={0.2}
                  value={selectedElement.letterSpacing ?? 0}
                  onChange={(event) =>
                    onUpdate({ letterSpacing: clampValue(Number(event.target.value) || 0, 0, 10) })
                  }
                />
              </Field>
            </>
          ) : null}

          {selectedElement.type === "line" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Linienlaenge">
                  <input
                    className={inputClassName}
                    type="number"
                    min={MIN_LINE_LENGTH}
                    max={MAX_LINE_LENGTH}
                    value={selectedElement.lineLength ?? selectedElement.width}
                    onChange={(event) => {
                      const value = clampValue(Number(event.target.value) || 160, MIN_LINE_LENGTH, MAX_LINE_LENGTH);
                      onUpdate({ lineLength: value, width: value });
                    }}
                  />
                </Field>

                <Field label="Strichstaerke">
                  <input
                    className={inputClassName}
                    type="number"
                    min={1}
                    max={18}
                    value={selectedElement.strokeWidth ?? selectedElement.height}
                    onChange={(event) => {
                      const value = clampValue(Number(event.target.value) || 4, 1, 18);
                      onUpdate({ strokeWidth: value, height: value });
                    }}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {selectedElement.type === "rect" || selectedElement.type === "octagon" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Breite">
                  <input
                    className={inputClassName}
                    type="number"
                    min={MIN_RECT_SIZE}
                    max={MAX_RECT_SIZE}
                    value={Math.round(selectedElement.width)}
                    onChange={(event) =>
                      onUpdate({
                        width: clampValue(Number(event.target.value) || MIN_RECT_SIZE, MIN_RECT_SIZE, MAX_RECT_SIZE)
                      })
                    }
                  />
                </Field>

                <Field label="Hoehe">
                  <input
                    className={inputClassName}
                    type="number"
                    min={MIN_RECT_SIZE}
                    max={MAX_RECT_SIZE}
                    value={Math.round(selectedElement.height)}
                    onChange={(event) =>
                      onUpdate({
                        height: clampValue(Number(event.target.value) || MIN_RECT_SIZE, MIN_RECT_SIZE, MAX_RECT_SIZE)
                      })
                    }
                  />
                </Field>
              </div>

              <Field label="Strichstaerke">
                <input
                  className={inputClassName}
                  type="number"
                  min={MIN_STROKE_WIDTH}
                  max={MAX_STROKE_WIDTH}
                  step={0.5}
                  value={selectedElement.strokeWidth ?? 2.5}
                  onChange={(event) =>
                    onUpdate({
                      strokeWidth: clampValue(
                        Number(event.target.value) || 2.5,
                        MIN_STROKE_WIDTH,
                        MAX_STROKE_WIDTH
                      )
                    })
                  }
                />
              </Field>
            </>
          ) : null}

          {selectedElement.type === "circle" ? (
            <>
              <Field label="Durchmesser">
                <input
                  className={inputClassName}
                  type="number"
                  min={MIN_RECT_SIZE}
                  max={MAX_RECT_SIZE}
                  value={Math.round(selectedElement.width)}
                  onChange={(event) => {
                    const value = clampValue(
                      Number(event.target.value) || MIN_RECT_SIZE,
                      MIN_RECT_SIZE,
                      MAX_RECT_SIZE
                    );
                    onUpdate({ width: value, height: value });
                  }}
                />
              </Field>

              <Field label="Strichstaerke">
                <input
                  className={inputClassName}
                  type="number"
                  min={MIN_STROKE_WIDTH}
                  max={MAX_STROKE_WIDTH}
                  step={0.5}
                  value={selectedElement.strokeWidth ?? 2.5}
                  onChange={(event) =>
                    onUpdate({
                      strokeWidth: clampValue(
                        Number(event.target.value) || 2.5,
                        MIN_STROKE_WIDTH,
                        MAX_STROKE_WIDTH
                      )
                    })
                  }
                />
              </Field>
            </>
          ) : null}

          {selectedElement.type === "upload" ? (
            <div className="rounded-2xl bg-[var(--muted-surface)] p-4 text-sm text-[var(--text-soft)]">
              <p className="font-semibold text-[var(--text)]">Upload-Motiv</p>
              <p className="mt-2">{selectedElement.sourceName ?? "Eigenes Motiv"}</p>
              <p className="mt-2">Die Vorschau ist bereits als gravurgeeignete Schwarzdarstellung aufbereitet.</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="X">
              <input
                className={inputClassName}
                type="number"
                value={Math.round(selectedElement.x)}
                onChange={(event) => onUpdate({ x: Number(event.target.value) || 0 })}
              />
            </Field>
            <Field label="Y">
              <input
                className={inputClassName}
                type="number"
                value={Math.round(selectedElement.y)}
                onChange={(event) => onUpdate({ y: Number(event.target.value) || 0 })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Skalierung">
              <input
                className={inputClassName}
                type="number"
                min={0.35}
                max={4}
                step={0.05}
                value={selectedElement.scale}
                onChange={(event) =>
                  onUpdate({ scale: clampValue(Number(event.target.value) || 1, 0.35, 4) })
                }
              />
            </Field>
            <Field label="Rotation">
              <input
                className={inputClassName}
                type="number"
                min={-180}
                max={180}
                value={Math.round(selectedElement.rotation)}
                onChange={(event) =>
                  onUpdate({ rotation: clampValue(Number(event.target.value) || 0, -180, 180) })
                }
              />
            </Field>
          </div>

          <Button variant="secondary" className="w-full" onClick={onDelete}>
            <Trash2 size={16} />
            Element löschen
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--muted-surface)] p-4 text-sm text-[var(--text-soft)]">
          Wähle ein Objekt auf der Arbeitsfläche oder nutze links die Werkzeugleiste, um neue Elemente hinzuzufuegen.
        </div>
      )}

      <div className="rounded-2xl bg-[var(--muted-surface)] p-4">
        <p className="text-sm font-semibold">Speicherstatus</p>
        <p className="mt-2 text-sm text-[var(--text-soft)]">{savedLabel}</p>
        <Button variant="secondary" className="mt-4 w-full" onClick={onExportPng}>
          PNG exportieren
        </Button>
      </div>

      <div>
        <p className="text-sm font-semibold">Design JSON</p>
        <textarea
          readOnly
          className="mt-3 min-h-56 w-full rounded-2xl border border-[var(--line)] bg-[var(--muted-surface)] p-4 text-xs text-[var(--text-soft)] outline-none"
          value={jsonPreview}
        />
      </div>
    </aside>
  );
}
