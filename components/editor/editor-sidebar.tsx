"use client";

import { useRef } from "react";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { TemplatesDropdown } from "@/components/editor/templates-dropdown";
import type { DrawableShapeType, EditorTool, IconId, ShapeKind, TemplateId } from "@/lib/design-tool";

export function EditorSidebar({
  activeTool,
  selectedId,
  activeTemplate,
  onApplyTemplate,
  onActivateSelectTool,
  onAddText,
  onAddIcon,
  onAddShape,
  onActivateLineTool,
  onActivateMeasureTool,
  activeShapeType,
  onSelectShapeTool,
  onDeleteSelected,
  onUploadFile,
  uploadFeedback
}: {
  activeTool: EditorTool;
  selectedId: string | null;
  activeTemplate?: TemplateId;
  onApplyTemplate: (templateId: TemplateId) => void;
  onActivateSelectTool: () => void;
  onAddText: () => void;
  onAddIcon: (iconId: IconId) => void;
  onAddShape: (shapeKind: ShapeKind) => void;
  onActivateLineTool: () => void;
  onActivateMeasureTool: () => void;
  activeShapeType: DrawableShapeType;
  onSelectShapeTool: (shapeType: DrawableShapeType) => void;
  onDeleteSelected: () => void;
  onUploadFile: (file: File) => void;
  uploadFeedback?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <aside className="space-y-4 rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Werkzeuge</p>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          Kompakte Schnellaktionen für Layout, Symbole und Uploads. Details des gewaehlten Elements bearbeitest du
          rechts.
        </p>
      </div>

      <EditorToolbar
        activeTool={activeTool}
        hasSelection={Boolean(selectedId)}
        onActivateSelectTool={onActivateSelectTool}
        onAddText={onAddText}
        onAddIcon={onAddIcon}
        onActivateLineTool={onActivateLineTool}
        onActivateMeasureTool={onActivateMeasureTool}
        activeShapeType={activeShapeType}
        onSelectShapeTool={onSelectShapeTool}
        onAddFrame={() => onAddShape("frame")}
        onUpload={() => fileInputRef.current?.click()}
        onDelete={onDeleteSelected}
      />

      <TemplatesDropdown activeTemplate={activeTemplate ?? "blank"} onApplyTemplate={onApplyTemplate} />

      <div className="rounded-2xl bg-[var(--muted-surface)] p-4">
        <p className="text-sm font-semibold">Workflow</p>
        <div className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
          <p>1. Vorlage öffnen oder mit leerer Fläche starten.</p>
          <p>2. Elemente über die kompakte Werkzeugleiste einfuegen.</p>
          <p>3. Position, Größe und Inhalt im Eigenschaften-Panel feinjustieren.</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onUploadFile(file);
          }
          event.currentTarget.value = "";
        }}
      />

      {uploadFeedback ? (
        <div className="rounded-2xl bg-[var(--muted-surface)] p-4">
          <p className="text-sm font-semibold">Upload-Status</p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">{uploadFeedback}</p>
        </div>
      ) : null}
    </aside>
  );
}
