"use client";

import { MousePointer2, PenLine, Ruler, Shapes, Trash2, Type, Upload } from "lucide-react";
import { FormsDropdown } from "@/components/editor/forms-dropdown";
import { IconsDropdown } from "@/components/editor/icons-dropdown";
import { ToolButton } from "@/components/editor/tool-button";
import type { DrawableShapeType, EditorTool, IconId } from "@/lib/design-tool";

export function EditorToolbar({
  activeTool,
  hasSelection,
  onActivateSelectTool,
  onAddText,
  onAddIcon,
  onActivateLineTool,
  onActivateMeasureTool,
  activeShapeType,
  onSelectShapeTool,
  onAddFrame,
  onUpload,
  onDelete
}: {
  activeTool: EditorTool;
  hasSelection: boolean;
  onActivateSelectTool: () => void;
  onAddText: () => void;
  onAddIcon: (iconId: IconId) => void;
  onActivateLineTool: () => void;
  onActivateMeasureTool: () => void;
  activeShapeType: DrawableShapeType;
  onSelectShapeTool: (shapeType: DrawableShapeType) => void;
  onAddFrame: () => void;
  onUpload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--muted-surface)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToolButton
          icon={<MousePointer2 size={17} />}
          label="Objekt auswaehlen"
          description="Auswahl auf der Arbeitsflaeche fokussieren oder aufheben"
          isActive={activeTool === "select"}
          onClick={onActivateSelectTool}
        />
        <ToolButton
          icon={<Type size={17} />}
          label="Text hinzufuegen"
          description="Einen neuen bearbeitbaren Textblock einfuegen"
          onClick={onAddText}
        />
        <IconsDropdown onAddIcon={onAddIcon} />
        <ToolButton
          icon={<PenLine size={17} />}
          label="Linie zeichnen"
          description="Startpunkt setzen, Vorschau ziehen und mit dem zweiten Klick finalisieren"
          isActive={activeTool === "line"}
          onClick={onActivateLineTool}
        />
        <ToolButton
          icon={<Ruler size={17} />}
          label="Abstand messen"
          description="Temporare Messlinie mit mm-Anzeige ziehen. Halte Shift fuer Kanten-Docking."
          isActive={activeTool === "measure"}
          onClick={onActivateMeasureTool}
        />
        <FormsDropdown activeTool={activeTool} activeShapeType={activeShapeType} onSelectShape={onSelectShapeTool} />
        <ToolButton
          icon={<Shapes size={17} />}
          label="Rahmen einfuegen"
          description="Einen klaren Rahmen fuer das Layout platzieren"
          onClick={onAddFrame}
        />
        <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
        <ToolButton
          icon={<Upload size={17} />}
          label="Grafik hochladen"
          description="SVG, PNG oder JPG fuer die Gravurvorschau einfuegen"
          onClick={onUpload}
        />
        <ToolButton
          icon={<Trash2 size={17} />}
          label="Loeschen"
          description="Das aktuell ausgewaehlte Element entfernen"
          disabled={!hasSelection}
          onClick={onDelete}
        />
      </div>
    </div>
  );
}
