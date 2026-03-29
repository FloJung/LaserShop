"use client";

import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import { Button } from "@/components/button";
import { useCart } from "@/components/cart-provider";
import { EditorActionBar } from "@/components/editor/editor-action-bar";
import { CoasterStage } from "@/components/editor/coaster-stage";
import { EditorPropertiesPanel } from "@/components/editor/editor-properties-panel";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { CUSTOM_COASTER_PRODUCT } from "@/lib/cart";
import {
  MEASURE_OVERLAY_DURATION_MS,
  DEFAULT_LINE_STROKE_WIDTH,
  DEFAULT_RECT_STROKE_WIDTH,
  EDITOR_PREVIEW_KEY,
  EDITOR_STORAGE_KEY,
  MEASURE_DOCK_KEY_LABEL,
  SAFE_MARGIN,
  TEMPLATE_OPTIONS,
  clampElementPosition,
  convertCanvasDistanceToMillimeters,
  convertUploadToEngravingPreview,
  createBlankDesign,
  createDrawableShapeElementFromPoints,
  createIconElement,
  createLineElementFromPoints,
  createShapeElement,
  createTextElement,
  createUploadElement,
  findNearestMeasureSnapTarget,
  formatMillimeters,
  getDistanceBetweenPoints,
  getShapeBoundsForPoints,
  getSnappedLineEnd,
  instantiateTemplate
} from "@/lib/design-tool";
import type {
  CanvasPoint,
  EditorTool,
  CoasterDesignDocument,
  DrawableShapeType,
  EditorElement,
  IconId,
  LineDraft,
  MeasureDraft,
  MeasureSnapTarget,
  ShapeDraft,
  ShapeKind,
  TemplateId
} from "@/lib/design-tool";

function getTemplateFromElements(elements: EditorElement[]): TemplateId | undefined {
  return elements.find((element) => element.templateId)?.templateId;
}

const ELEMENT_LABELS: Record<EditorElement["type"], string> = {
  text: "Text",
  icon: "Icon",
  shape: "Rahmen",
  line: "Linie",
  rect: "Rechteck",
  circle: "Kreis",
  octagon: "Achteck",
  upload: "Grafik"
};

function isSameMeasureSnapTarget(first: MeasureSnapTarget | null, second: MeasureSnapTarget | null) {
  if (!first && !second) {
    return true;
  }

  if (!first || !second) {
    return false;
  }

  return (
    first.elementId === second.elementId &&
    first.edge === second.edge &&
    first.point.x === second.point.x &&
    first.point.y === second.point.y &&
    first.bounds.x === second.bounds.x &&
    first.bounds.y === second.bounds.y &&
    first.bounds.width === second.bounds.width &&
    first.bounds.height === second.bounds.height
  );
}

export function CoasterEditor() {
  const router = useRouter();
  const { addCustomDesign } = useCart();
  const stageRef = useRef<Konva.Stage>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const measureTimeoutRef = useRef<number | null>(null);
  const [design, setDesign] = useState<CoasterDesignDocument>(createBlankDesign());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("blank");
  const [savedLabel, setSavedLabel] = useState("Noch nicht gespeichert");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | undefined>();
  const [lineDraft, setLineDraft] = useState<LineDraft | null>(null);
  const [measureDraft, setMeasureDraft] = useState<MeasureDraft | null>(null);
  const [measurePointer, setMeasurePointer] = useState<CanvasPoint | null>(null);
  const [measureHoverSnapTarget, setMeasureHoverSnapTarget] = useState<MeasureSnapTarget | null>(null);
  const [isMeasureDockModeActive, setIsMeasureDockModeActive] = useState(false);
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
  const [activeShapeType, setActiveShapeType] = useState<DrawableShapeType>("rect");

  useEffect(() => {
    const stored = window.localStorage.getItem(EDITOR_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as CoasterDesignDocument;
      setDesign(parsed);
      setActiveTemplate(getTemplateFromElements(parsed.elements) ?? "blank");
      setSavedLabel(`Gespeichert: ${new Date(parsed.updatedAt).toLocaleString("de-DE")}`);
    } catch {
      window.localStorage.removeItem(EDITOR_STORAGE_KEY);
    }
  }, []);

  useEffect(
    () => () => {
      if (measureTimeoutRef.current) {
        window.clearTimeout(measureTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeTool === "measure" && event.key === MEASURE_DOCK_KEY_LABEL) {
        setIsMeasureDockModeActive(true);
      }

      if (event.key === "Escape" && activeTool !== "select") {
        resetToSelectMode();
        return;
      }

      if (!selectedId || event.key !== "Delete") {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      setDesign((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        elements: current.elements.filter((element) => element.id !== selectedId)
      }));
      setSelectedId(null);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === MEASURE_DOCK_KEY_LABEL) {
        setIsMeasureDockModeActive(false);
      }
    };

    const onWindowBlur = () => {
      setIsMeasureDockModeActive(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [activeTool, selectedId]);

  const selectedElement = design.elements.find((element) => element.id === selectedId);
  const jsonPreview = useMemo(() => JSON.stringify(design, null, 2), [design]);
  const activeTemplateLabel =
    TEMPLATE_OPTIONS.find((template) => template.id === activeTemplate)?.label ?? "Leer";
  const measureDockHint = `${MEASURE_DOCK_KEY_LABEL}: an Kanten andocken.`;
  const toolStatus = useMemo(() => {
    if (activeTool === "line" && lineDraft) {
      const deltaX = lineDraft.endX - lineDraft.startX;
      const deltaY = lineDraft.endY - lineDraft.startY;
      const length = Math.round(Math.sqrt(deltaX ** 2 + deltaY ** 2));
      const snapLabel =
        lineDraft.snapAxis === "horizontal"
          ? " Horizontal eingerastet."
          : lineDraft.snapAxis === "vertical"
            ? " Vertikal eingerastet."
            : "";

      return {
        label: "Startpunkt gesetzt",
        detail: `Bewege die Maus und setze den Endpunkt. Aktuelle Laenge: ${length}px.${snapLabel}`
      };
    }

    if (activeTool === "line") {
      return {
        label: "Linienmodus aktiv",
        detail: "Setze mit dem ersten Klick den Startpunkt. ESC oder Rechtsklick bricht ab."
      };
    }

    if (activeTool === "measure" && measureDraft) {
      const snapLabel =
        measureDraft.snapAxis === "horizontal"
          ? " Horizontal."
          : measureDraft.snapAxis === "vertical"
            ? " Vertikal."
            : "";
      const dockLabel = isMeasureDockModeActive
        ? measureHoverSnapTarget
          ? " Docking: Kante erkannt."
          : " Docking: an Kante ziehen."
        : ` ${measureDockHint}`;

      return {
        label: measureDraft.isFinal ? "Messung abgeschlossen" : "Messung aktiv",
        detail: measureDraft.isFinal
          ? `${formatMillimeters(measureDraft.distanceMm)} wird kurz als Hilfslinie angezeigt.${snapLabel}${dockLabel}`
          : `Zweiten Punkt setzen. Abstand: ${formatMillimeters(measureDraft.distanceMm)}.${snapLabel}${dockLabel}`
      };
    }

    if (activeTool === "measure") {
      return {
        label: "Messmodus aktiv",
        detail: `Setze mit dem ersten Klick den Startpunkt. Die Messung bleibt nur kurz sichtbar. ${measureDockHint}`
      };
    }

    if (activeTool === "shape" && shapeDraft) {
      const bounds = getShapeBoundsForPoints(
        shapeDraft.shapeType,
        { x: shapeDraft.startX, y: shapeDraft.startY },
        { x: shapeDraft.endX, y: shapeDraft.endY }
      );
      const shapeLabel = ELEMENT_LABELS[shapeDraft.shapeType];
      const sizeLabel =
        shapeDraft.shapeType === "circle"
          ? `Aktueller Durchmesser: ${Math.round(bounds.width)}px`
          : `Aktuelle Groesse: ${Math.round(bounds.width)} x ${Math.round(bounds.height)}px`;

      return {
        label: `${shapeLabel} wird aufgezogen`,
        detail: `Bewege die Maus und setze mit dem zweiten Klick die gegenueberliegende Ecke. ${sizeLabel}`
      };
    }

    if (activeTool === "shape") {
      const shapeLabel = ELEMENT_LABELS[activeShapeType];
      return {
        label: `${shapeLabel}-Modus aktiv`,
        detail: "Setze mit dem ersten Klick den Startpunkt. ESC oder Rechtsklick bricht ab."
      };
    }

    return {
      label: "Auswahlmodus",
      detail: selectedElement
        ? `Aktives Element: ${ELEMENT_LABELS[selectedElement.type]}`
        : "Elemente koennen ausgewaehlt, verschoben und bearbeitet werden."
    };
  }, [
    activeShapeType,
    activeTool,
    isMeasureDockModeActive,
    lineDraft,
    measureDockHint,
    measureDraft,
    measureHoverSnapTarget,
    selectedElement,
    shapeDraft
  ]);

  function getMeasureHoverTarget(
    point: CanvasPoint,
    draft = measureDraft,
    previousTarget = measureHoverSnapTarget
  ) {
    if (!isMeasureDockModeActive) {
      return null;
    }

    const preferredPoint = draft && !draft.isFinal ? { x: draft.startX, y: draft.startY } : null;
    const preferredOrientation = draft && !draft.isFinal ? draft.startSnapTarget?.orientation ?? null : null;

    return findNearestMeasureSnapTarget(design.elements, point, {
      previousTarget,
      preferredPoint,
      preferredOrientation
    });
  }

  function getResolvedMeasureEnd(
    draft: MeasureDraft,
    point: CanvasPoint,
    hoverTarget: MeasureSnapTarget | null
  ) {
    if (hoverTarget) {
      return {
        endX: hoverTarget.point.x,
        endY: hoverTarget.point.y,
        snapAxis: null,
        endSnapTarget: hoverTarget
      };
    }

    const snappedPoint = getSnappedLineEnd(
      { x: draft.startX, y: draft.startY },
      point,
      0
    );

    return {
      endX: snappedPoint.endX,
      endY: snappedPoint.endY,
      snapAxis: snappedPoint.snapAxis,
      endSnapTarget: null
    };
  }

  function clearMeasureTimeout() {
    if (measureTimeoutRef.current) {
      window.clearTimeout(measureTimeoutRef.current);
      measureTimeoutRef.current = null;
    }
  }

  function clearMeasureInteractionState() {
    setIsMeasureDockModeActive(false);
    setMeasurePointer(null);
    setMeasureHoverSnapTarget(null);
  }

  function resetToSelectMode() {
    clearMeasureTimeout();
    setActiveTool("select");
    setLineDraft(null);
    setMeasureDraft(null);
    clearMeasureInteractionState();
    setShapeDraft(null);
  }

  function setLineToolActive() {
    if (activeTool === "line") {
      resetToSelectMode();
      return;
    }

    setLineDraft(null);
    setMeasureDraft(null);
    clearMeasureInteractionState();
    setShapeDraft(null);
    setSelectedId(null);
    setActiveTool("line");
  }

  function setMeasureToolActive() {
    if (activeTool === "measure") {
      resetToSelectMode();
      return;
    }

    clearMeasureTimeout();
    setLineDraft(null);
    setMeasureDraft(null);
    clearMeasureInteractionState();
    setShapeDraft(null);
    setSelectedId(null);
    setActiveTool("measure");
  }

  function handleSelectShapeTool(shapeType: DrawableShapeType) {
    setActiveShapeType(shapeType);
    clearMeasureTimeout();
    setLineDraft(null);
    setMeasureDraft(null);
    clearMeasureInteractionState();
    setShapeDraft(null);
    setSelectedId(null);
    setActiveTool("shape");
  }

  function handleLinePoint(point: { x: number; y: number }) {
    if (activeTool !== "line") {
      return;
    }

    if (!lineDraft) {
      setSelectedId(null);
      setLineDraft({
        x: point.x,
        y: point.y,
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
        snapAxis: null
      });
      return;
    }

    const snappedPoint = getSnappedLineEnd(
      { x: lineDraft.startX, y: lineDraft.startY },
      point
    );

    const nextLine = createLineElementFromPoints(
      { x: lineDraft.startX, y: lineDraft.startY },
      { x: snappedPoint.endX, y: snappedPoint.endY },
      {
        strokeWidth: DEFAULT_LINE_STROKE_WIDTH
      }
    );

    if (!nextLine) {
      setLineDraft({
        ...lineDraft,
        endX: snappedPoint.endX,
        endY: snappedPoint.endY,
        snapAxis: snappedPoint.snapAxis
      });
      return;
    }

    insertElement(nextLine);
    resetToSelectMode();
  }

  function handleLinePreview(point: { x: number; y: number }) {
    if (!lineDraft) {
      return;
    }

    setLineDraft((current) => {
      if (!current) {
        return current;
      }

      const snappedPoint = getSnappedLineEnd(
        { x: current.startX, y: current.startY },
        point
      );

      return {
        ...current,
        endX: snappedPoint.endX,
        endY: snappedPoint.endY,
        snapAxis: snappedPoint.snapAxis
      };
    });
  }

  function handleMeasurePoint(point: { x: number; y: number }) {
    if (activeTool !== "measure") {
      return;
    }

    const nextHoverTarget = getMeasureHoverTarget(point);
    const startPoint = nextHoverTarget?.point ?? point;

    setMeasurePointer(point);
    setMeasureHoverSnapTarget(nextHoverTarget);

    if (!measureDraft || measureDraft.isFinal) {
      clearMeasureTimeout();
      setSelectedId(null);
      setMeasureDraft({
        x: startPoint.x,
        y: startPoint.y,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: startPoint.x,
        endY: startPoint.y,
        snapAxis: null,
        distanceMm: 0,
        isFinal: false,
        startSnapTarget: nextHoverTarget,
        endSnapTarget: null
      });
      return;
    }

    const resolvedEnd = getResolvedMeasureEnd(measureDraft, point, nextHoverTarget);
    const distanceMm = convertCanvasDistanceToMillimeters(
      getDistanceBetweenPoints(
        { x: measureDraft.startX, y: measureDraft.startY },
        { x: resolvedEnd.endX, y: resolvedEnd.endY }
      )
    );

    const nextMeasure: MeasureDraft = {
      ...measureDraft,
      endX: resolvedEnd.endX,
      endY: resolvedEnd.endY,
      snapAxis: resolvedEnd.snapAxis,
      distanceMm,
      isFinal: true,
      endSnapTarget: resolvedEnd.endSnapTarget
    };

    setMeasureDraft(nextMeasure);
    clearMeasureTimeout();
    measureTimeoutRef.current = window.setTimeout(() => {
      setMeasureDraft(null);
      measureTimeoutRef.current = null;
    }, MEASURE_OVERLAY_DURATION_MS);
  }

  function handleMeasurePreview(point: { x: number; y: number }) {
    setMeasurePointer(point);

    const nextHoverTarget = getMeasureHoverTarget(point);

    if (!isSameMeasureSnapTarget(measureHoverSnapTarget, nextHoverTarget)) {
      setMeasureHoverSnapTarget(nextHoverTarget);
    }

    if (!measureDraft || measureDraft.isFinal) {
      return;
    }

    const resolvedEnd = getResolvedMeasureEnd(measureDraft, point, nextHoverTarget);
    const distanceMm = convertCanvasDistanceToMillimeters(
      getDistanceBetweenPoints(
        { x: measureDraft.startX, y: measureDraft.startY },
        { x: resolvedEnd.endX, y: resolvedEnd.endY }
      )
    );

    setMeasureDraft({
      ...measureDraft,
      endX: resolvedEnd.endX,
      endY: resolvedEnd.endY,
      snapAxis: resolvedEnd.snapAxis,
      distanceMm,
      endSnapTarget: resolvedEnd.endSnapTarget
    });
  }

  function handleMeasureLeave() {
    setMeasurePointer(null);
    setMeasureHoverSnapTarget(null);
  }

  function handleShapePoint(point: { x: number; y: number }) {
    if (activeTool !== "shape") {
      return;
    }

    if (!shapeDraft) {
      setSelectedId(null);
      setShapeDraft({
        shapeType: activeShapeType,
        x: point.x,
        y: point.y,
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y
      });
      return;
    }

    const nextShape = createDrawableShapeElementFromPoints(
      shapeDraft.shapeType,
      { x: shapeDraft.startX, y: shapeDraft.startY },
      point,
      {
        strokeWidth: DEFAULT_RECT_STROKE_WIDTH
      }
    );

    if (!nextShape) {
      setShapeDraft({
        ...shapeDraft,
        endX: point.x,
        endY: point.y
      });
      return;
    }

    insertElement(nextShape);
    resetToSelectMode();
  }

  function handleShapePreview(point: { x: number; y: number }) {
    if (!shapeDraft) {
      return;
    }

    setShapeDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        endX: point.x,
        endY: point.y
      };
    });
  }

  function updateElement(id: string, patch: Partial<EditorElement>) {
    setDesign((current) => {
      const nextElements = current.elements.map((element) => {
        if (element.id !== id) {
          return element;
        }

        const nextElement = {
          ...element,
          ...patch
        };
        const clamped = clampElementPosition(nextElement, nextElement.x, nextElement.y);

        return {
          ...nextElement,
          x: clamped.x,
          y: clamped.y
        };
      });

      return {
        ...current,
        updatedAt: new Date().toISOString(),
        elements: nextElements
      };
    });
  }

  useEffect(() => {
    if (activeTool !== "measure" || !measurePointer) {
      if (measureHoverSnapTarget) {
        setMeasureHoverSnapTarget(null);
      }
      return;
    }

    const nextHoverTarget = getMeasureHoverTarget(measurePointer);

    if (!isSameMeasureSnapTarget(measureHoverSnapTarget, nextHoverTarget)) {
      setMeasureHoverSnapTarget(nextHoverTarget);
    }

    if (!measureDraft || measureDraft.isFinal) {
      return;
    }

    const resolvedEnd = getResolvedMeasureEnd(measureDraft, measurePointer, nextHoverTarget);
    const distanceMm = convertCanvasDistanceToMillimeters(
      getDistanceBetweenPoints(
        { x: measureDraft.startX, y: measureDraft.startY },
        { x: resolvedEnd.endX, y: resolvedEnd.endY }
      )
    );

    if (
      measureDraft.endX === resolvedEnd.endX &&
      measureDraft.endY === resolvedEnd.endY &&
      measureDraft.snapAxis === resolvedEnd.snapAxis &&
      measureDraft.distanceMm === distanceMm &&
      isSameMeasureSnapTarget(measureDraft.endSnapTarget, resolvedEnd.endSnapTarget)
    ) {
      return;
    }

    setMeasureDraft({
      ...measureDraft,
      endX: resolvedEnd.endX,
      endY: resolvedEnd.endY,
      snapAxis: resolvedEnd.snapAxis,
      distanceMm,
      endSnapTarget: resolvedEnd.endSnapTarget
    });
  }, [activeTool, design.elements, isMeasureDockModeActive, measureDraft, measureHoverSnapTarget, measurePointer]);

  function insertElement(element: EditorElement) {
    setDesign((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      elements: [...current.elements, element]
    }));
    setSelectedId(element.id);
    resetToSelectMode();
  }

  function applyTemplate(templateId: TemplateId) {
    const nextElements = instantiateTemplate(templateId);
    setDesign({
      version: 1,
      productId: "gu-custom",
      updatedAt: new Date().toISOString(),
      elements: nextElements
    });
    setActiveTemplate(templateId);
    setSelectedId(nextElements[0]?.id ?? null);
    resetToSelectMode();
  }

  async function persistDesign() {
    const nextDocument = {
      ...design,
      updatedAt: new Date().toISOString()
    };
    const previewImage = stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? "";

    setDesign(nextDocument);
    window.localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(nextDocument));
    window.localStorage.setItem(EDITOR_PREVIEW_KEY, previewImage);
    setSavedLabel(`Gespeichert: ${new Date(nextDocument.updatedAt).toLocaleString("de-DE")}`);

    return { document: nextDocument, previewImage };
  }

  async function handleSave() {
    setIsSaving(true);
    await persistDesign();
    setIsSaving(false);
  }

  async function handleExportPng() {
    const previewImage = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!previewImage) {
      return;
    }

    const link = document.createElement("a");
    link.href = previewImage;
    link.download = "glasuntersetzer-design.png";
    link.click();
  }

  async function handleAddToCart() {
    setIsSubmitting(true);
    const { document: savedDocument, previewImage } = await persistDesign();
    addCustomDesign({ designJson: savedDocument, previewImage });
    startTransition(() => {
      router.push("/cart");
    });
  }

  async function handleUploadFile(file: File) {
    setUploadFeedback("Upload wird verarbeitet...");

    try {
      const asset = await convertUploadToEngravingPreview(file);
      insertElement(
        createUploadElement({
          ...asset,
          x: SAFE_MARGIN + 40,
          y: SAFE_MARGIN + 40
        })
      );
      setUploadFeedback(`Hochgeladen: ${asset.sourceName}`);
    } catch (error) {
      setUploadFeedback(error instanceof Error ? error.message : "Upload konnte nicht verarbeitet werden.");
    }
  }

  return (
    <div className="space-y-6">
      <EditorActionBar
        onPreview={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        onReset={() => applyTemplate("blank")}
        onSave={handleSave}
        onAddToCart={handleAddToCart}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <EditorSidebar
          activeTool={activeTool}
          selectedId={selectedId}
          activeTemplate={activeTemplate}
          onApplyTemplate={applyTemplate}
          onActivateSelectTool={resetToSelectMode}
          onAddText={() => {
            resetToSelectMode();
            insertElement(createTextElement({ x: SAFE_MARGIN + 32, y: SAFE_MARGIN + 32 }));
          }}
          onAddIcon={(iconId: IconId) => insertElement(createIconElement(iconId))}
          onActivateLineTool={setLineToolActive}
          onActivateMeasureTool={setMeasureToolActive}
          activeShapeType={activeShapeType}
          onSelectShapeTool={handleSelectShapeTool}
          onAddShape={(shapeKind: ShapeKind) => {
            resetToSelectMode();
            insertElement(createShapeElement(shapeKind));
          }}
          onDeleteSelected={() => {
            if (!selectedElement) {
              return;
            }
            setDesign((current) => ({
              ...current,
              updatedAt: new Date().toISOString(),
              elements: current.elements.filter((element) => element.id !== selectedElement.id)
            }));
            setSelectedId(null);
          }}
          onUploadFile={handleUploadFile}
          uploadFeedback={uploadFeedback}
        />

        <div className="space-y-5">
          <div className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
                  10 x 10 cm Editor
                </p>
                <h2 className="mt-2 text-2xl font-bold">Glasuntersaetzer Custom</h2>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Sicherheitsrand: 5 mm innen. Elemente bleiben innerhalb der gravierbaren Flaeche.
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--muted-surface)] px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Produkt</p>
                <p className="text-lg font-semibold">{CUSTOM_COASTER_PRODUCT.name}</p>
                <p className="text-sm text-[var(--brand)]">24,90 EUR pro Stueck</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-[1.75rem] border border-[var(--line)] bg-[var(--muted-surface)] p-4 md:h-[8.5rem] md:grid-cols-3">
              <div className="overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Vorlage</p>
                <p className="mt-1 truncate text-sm font-semibold">{activeTemplateLabel}</p>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Modus</p>
                <p className="mt-1 text-sm font-semibold">{toolStatus.label}</p>
                <p className="mt-1 h-[3.75rem] overflow-hidden text-xs leading-5 text-[var(--text-soft)]">
                  {toolStatus.detail}
                </p>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Elemente</p>
                <p className="mt-1 text-sm font-semibold">{design.elements.length} im Layout</p>
                {selectedElement ? (
                  <p className="mt-1 h-[3.75rem] overflow-hidden text-xs leading-5 text-[var(--text-soft)]">
                    Ausgewaehlt: {ELEMENT_LABELS[selectedElement.type]}
                  </p>
                ) : lineDraft ? (
                  <p className="mt-1 h-[3.75rem] overflow-hidden text-xs leading-5 text-[var(--text-soft)]">
                    Zweiter Klick finalisiert die Linie.
                  </p>
                ) : measureDraft ? (
                  <p className="mt-1 h-[3.75rem] overflow-hidden text-xs leading-5 text-[var(--text-soft)]">
                    Messwert: {formatMillimeters(measureDraft.distanceMm)}. Die Hilfslinie wird nicht gespeichert.
                  </p>
                ) : shapeDraft ? (
                  <p className="mt-1 h-[3.75rem] overflow-hidden text-xs leading-5 text-[var(--text-soft)]">
                    Zweiter Klick finalisiert {ELEMENT_LABELS[shapeDraft.shapeType].toLowerCase()}.
                  </p>
                ) : (
                  <p className="mt-1 h-[3.75rem] overflow-hidden text-xs leading-5 text-[var(--text-soft)]">
                    Kein Element markiert.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--muted-surface)] p-4">
              <div className="mx-auto w-full max-w-[620px]">
                <CoasterStage
                  elements={design.elements}
                  interactive
                  activeTool={activeTool}
                  lineDraft={lineDraft}
                  measureDraft={measureDraft}
                  measureDockModeActive={isMeasureDockModeActive}
                  measurePointer={measurePointer}
                  measureHoverSnapTarget={measureHoverSnapTarget}
                  shapeDraft={shapeDraft}
                  stageRef={stageRef}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={updateElement}
                  onLinePoint={handleLinePoint}
                  onLinePreview={handleLinePreview}
                  onMeasurePoint={handleMeasurePoint}
                  onMeasurePreview={handleMeasurePreview}
                  onMeasureLeave={handleMeasureLeave}
                  onShapePoint={handleShapePoint}
                  onShapePreview={handleShapePreview}
                  onCancelDraw={resetToSelectMode}
                />
              </div>
            </div>
          </div>

          <div ref={previewRef} className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Live-Vorschau</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Diese Vorschau wird beim Speichern und im Warenkorb fuer dein individuelles Produkt verwendet.
                </p>
              </div>
              <Button variant="secondary" onClick={handleExportPng}>
                PNG exportieren
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
              <div className="rounded-[2rem] bg-[var(--muted-surface)] p-4">
                <CoasterStage elements={design.elements} size={220} />
              </div>
              <div className="rounded-[2rem] bg-[var(--muted-surface)] p-5">
                <p className="text-sm font-semibold">Produktion</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
                  <li>- Gravur in schwarzer Vorschau, spaeter als Lasergravur umgesetzt</li>
                  <li>- Feste Arbeitsflaeche mit 10 x 10 cm</li>
                  <li>- Design wird als JSON und PNG-Vorschau gespeichert</li>
                  <li>- Direkte Uebergabe an den Warenkorb als Custom-Produkt</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <EditorPropertiesPanel
          selectedElement={selectedElement}
          jsonPreview={jsonPreview}
          savedLabel={savedLabel}
          onUpdate={(patch) => {
            if (!selectedElement) {
              return;
            }
            updateElement(selectedElement.id, patch);
          }}
          onDelete={() => {
            if (!selectedElement) {
              return;
            }
            setDesign((current) => ({
              ...current,
              updatedAt: new Date().toISOString(),
              elements: current.elements.filter((element) => element.id !== selectedElement.id)
            }));
            setSelectedId(null);
          }}
          onExportPng={handleExportPng}
        />
      </div>
    </div>
  );
}
