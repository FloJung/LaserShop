export type EditorElementType = "text" | "icon" | "shape" | "line" | "rect" | "circle" | "octagon" | "upload";
export type ShapeKind = "frame";
export type IconId = "heart" | "sparkle" | "rings" | "leaf" | "star";
export type TemplateId = "blank" | "wedding" | "initials" | "modern" | "birthday";
export type EditorTool = "select" | "line" | "shape" | "measure";
export type CanvasPoint = { x: number; y: number };
export type LineSnapAxis = "horizontal" | "vertical" | null;
export type DrawableShapeType = "rect" | "circle" | "octagon";
export type MeasureSnapEdge = "left" | "right" | "top" | "bottom";
export type MeasureSnapOrientation = "vertical" | "horizontal";
export type ElementMeasurementBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type MeasureSnapTarget = {
  elementId: string;
  edge: MeasureSnapEdge;
  orientation: MeasureSnapOrientation;
  point: CanvasPoint;
  distance: number;
  bounds: ElementMeasurementBounds;
};
export type LineDraft = CanvasPoint & {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  snapAxis: LineSnapAxis;
};
export type ShapeDraft = CanvasPoint & {
  shapeType: DrawableShapeType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};
export type MeasureDraft = CanvasPoint & {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  snapAxis: LineSnapAxis;
  distanceMm: number;
  isFinal: boolean;
  startSnapTarget: MeasureSnapTarget | null;
  endSnapTarget: MeasureSnapTarget | null;
};

export type EditorElement = {
  id: string;
  type: EditorElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  content: string;
  fontFamily?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;
  templateId?: TemplateId;
  locked: boolean;
  strokeWidth?: number;
  lineLength?: number;
  sourceName?: string;
};

export type CoasterDesignDocument = {
  version: 1;
  productId: "gu-custom";
  updatedAt: string;
  elements: EditorElement[];
};

export const EDITOR_STORAGE_KEY = "laser-shop-coaster-design";
export const EDITOR_PREVIEW_KEY = "laser-shop-coaster-preview";
export const CANVAS_SIZE = 520;
export const CANVAS_REAL_SIZE_MM = 100;
export const SAFE_MARGIN = 26;
export const DEFAULT_TEXT_COLOR = "#111111";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = ["image/svg+xml", "image/png", "image/jpeg"] as const;
export const DEFAULT_LINE_STROKE_WIDTH = 4;
export const MIN_LINE_LENGTH = 12;
export const MAX_LINE_LENGTH = 420;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 18;
export const LINE_SNAP_TOLERANCE = 10;
export const MEASURE_DOCK_TOLERANCE = 14;
export const MEASURE_DOCK_STICKINESS = 3;
export const MEASURE_DOCK_KEY_LABEL = "Shift";
export const MEASURE_OVERLAY_DURATION_MS = 1500;
export const DEFAULT_RECT_STROKE_WIDTH = 2.5;
export const MIN_RECT_SIZE = 16;
export const MAX_RECT_SIZE = CANVAS_SIZE - SAFE_MARGIN * 2;

export const DRAWABLE_SHAPES: Array<{
  id: DrawableShapeType;
  label: string;
}> = [
  { id: "rect", label: "Rechteck" },
  { id: "circle", label: "Kreis" },
  { id: "octagon", label: "Achteck" }
];

export const FONT_OPTIONS = [
  { label: "Manrope", value: "Manrope" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Georgia", value: "Georgia" }
] as const;

export const ICON_LIBRARY: Array<{ id: IconId; label: string; path: string }> = [
  {
    id: "heart",
    label: "Herz",
    path: "M12 21s-6.7-4.3-9.2-8.6C1.2 9.6 2 5.5 5.5 4.5c2-.6 4.2.1 5.5 1.8 1.3-1.7 3.5-2.4 5.5-1.8 3.5 1 4.3 5.1 2.7 7.9C18.7 16.7 12 21 12 21Z"
  },
  {
    id: "sparkle",
    label: "Sparkle",
    path: "M12 2 13.8 8.2 20 10 13.8 11.8 12 18 10.2 11.8 4 10 10.2 8.2ZM18.5 2l.9 2.6L22 5.5l-2.6.9-.9 2.6-.9-2.6L15 5.5l2.6-.9ZM5.5 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"
  },
  {
    id: "rings",
    label: "Ringe",
    path: "M8 9a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm8-4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-3.2 7.2 2.4-2.4"
  },
  {
    id: "leaf",
    label: "Blatt",
    path: "M19 3c-8 0-13 5.5-13 12 0 3.2 2 6 5.2 6 6.5 0 10.8-6.2 10.8-18ZM8 16c1.2-2.6 3.8-5.2 8-7"
  },
  {
    id: "star",
    label: "Stern",
    path: "M12 2 15 8.5 22 9.3 17 14 18.4 21 12 17.4 5.6 21 7 14 2 9.3 9 8.5Z"
  }
];

export const SHAPE_LIBRARY: Array<{ id: ShapeKind; label: string }> = [
  { id: "frame", label: "Rahmen" }
];

export const TEMPLATE_OPTIONS: Array<{
  id: TemplateId;
  label: string;
  description: string;
}> = [
  { id: "blank", label: "Leer", description: "Starte mit einer freien 10 x 10 cm Fläche." },
  { id: "wedding", label: "Hochzeit", description: "Feine Linien, Herzmotiv und ruhige Typografie." },
  { id: "initials", label: "Initialen", description: "Monogramm-Look mit klarer Zentrierung." },
  { id: "modern", label: "Modern", description: "Reduziertes Layout für einen sauberen Premium-Look." },
  { id: "birthday", label: "Geburtstag", description: "Verspielter Aufbau mit Symbol und kurzer Botschaft." }
];

type ElementSeed = Omit<EditorElement, "id">;

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTextElement(overrides: Partial<EditorElement> = {}): EditorElement {
  return {
    id: makeId("text"),
    type: "text",
    x: 120,
    y: 120,
    width: 280,
    height: 70,
    rotation: 0,
    scale: 1,
    content: "Dein Text",
    fontFamily: "Manrope",
    fontSize: 28,
    textAlign: "center",
    letterSpacing: 0,
    locked: false,
    ...overrides
  };
}

export function createIconElement(iconId: IconId, overrides: Partial<EditorElement> = {}): EditorElement {
  return {
    id: makeId("icon"),
    type: "icon",
    x: 210,
    y: 210,
    width: 72,
    height: 72,
    rotation: 0,
    scale: 1,
    content: iconId,
    locked: false,
    ...overrides
  };
}

export function createShapeElement(shapeKind: ShapeKind, overrides: Partial<EditorElement> = {}): EditorElement {
  const base = {
    width: 330,
    height: 330,
    x: 95,
    y: 95
  };

  return {
    id: makeId("shape"),
    type: "shape",
    x: base.x,
    y: base.y,
    width: base.width,
    height: base.height,
    rotation: 0,
    scale: 1,
    content: shapeKind,
    locked: false,
    ...overrides
  };
}

export function createLineElement(overrides: Partial<EditorElement> = {}): EditorElement {
  return {
    id: makeId("line"),
    type: "line",
    x: 150,
    y: 250,
    width: 220,
    height: 4,
    rotation: 0,
    scale: 1,
    content: "line",
    locked: false,
    strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
    lineLength: 220,
    ...overrides
  };
}

export function createRectElement(overrides: Partial<EditorElement> = {}): EditorElement {
  return {
    id: makeId("rect"),
    type: "rect",
    x: 140,
    y: 140,
    width: 180,
    height: 120,
    rotation: 0,
    scale: 1,
    content: "rect",
    locked: false,
    strokeWidth: DEFAULT_RECT_STROKE_WIDTH,
    ...overrides
  };
}

export function createCircleElement(overrides: Partial<EditorElement> = {}): EditorElement {
  return {
    id: makeId("circle"),
    type: "circle",
    x: 160,
    y: 160,
    width: 140,
    height: 140,
    rotation: 0,
    scale: 1,
    content: "circle",
    locked: false,
    strokeWidth: DEFAULT_RECT_STROKE_WIDTH,
    ...overrides
  };
}

export function createOctagonElement(overrides: Partial<EditorElement> = {}): EditorElement {
  return {
    id: makeId("octagon"),
    type: "octagon",
    x: 140,
    y: 140,
    width: 180,
    height: 140,
    rotation: 0,
    scale: 1,
    content: "octagon",
    locked: false,
    strokeWidth: DEFAULT_RECT_STROKE_WIDTH,
    ...overrides
  };
}

export function createLineElementFromPoints(
  startPoint: CanvasPoint,
  endPoint: CanvasPoint,
  overrides: Partial<EditorElement> = {}
) {
  const rawDeltaX = endPoint.x - startPoint.x;
  const rawDeltaY = endPoint.y - startPoint.y;
  const rawLength = Math.sqrt(rawDeltaX ** 2 + rawDeltaY ** 2);

  if (rawLength < MIN_LINE_LENGTH) {
    return null;
  }

  const ratio = rawLength > MAX_LINE_LENGTH ? MAX_LINE_LENGTH / rawLength : 1;
  const deltaX = rawDeltaX * ratio;
  const deltaY = rawDeltaY * ratio;
  const lineLength = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  return createLineElement({
    x: startPoint.x,
    y: startPoint.y,
    width: lineLength,
    height: DEFAULT_LINE_STROKE_WIDTH,
    lineLength,
    rotation: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
    strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
    ...overrides
  });
}

export function createRectElementFromPoints(
  startPoint: CanvasPoint,
  endPoint: CanvasPoint,
  overrides: Partial<EditorElement> = {}
) {
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  if (width < MIN_RECT_SIZE || height < MIN_RECT_SIZE) {
    return null;
  }

  return createRectElement({
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: clampValue(width, MIN_RECT_SIZE, MAX_RECT_SIZE),
    height: clampValue(height, MIN_RECT_SIZE, MAX_RECT_SIZE),
    strokeWidth: DEFAULT_RECT_STROKE_WIDTH,
    ...overrides
  });
}

export function getShapeBoundsForPoints(
  shapeType: DrawableShapeType,
  startPoint: CanvasPoint,
  endPoint: CanvasPoint
) {
  if (shapeType === "circle") {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));

    return {
      x: deltaX >= 0 ? startPoint.x : startPoint.x - size,
      y: deltaY >= 0 ? startPoint.y : startPoint.y - size,
      width: size,
      height: size
    };
  }

  return {
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y)
  };
}

export function createDrawableShapeElementFromPoints(
  shapeType: DrawableShapeType,
  startPoint: CanvasPoint,
  endPoint: CanvasPoint,
  overrides: Partial<EditorElement> = {}
) {
  const bounds = getShapeBoundsForPoints(shapeType, startPoint, endPoint);

  if (bounds.width < MIN_RECT_SIZE || bounds.height < MIN_RECT_SIZE) {
    return null;
  }

  const normalizedBounds = {
    x: bounds.x,
    y: bounds.y,
    width: clampValue(bounds.width, MIN_RECT_SIZE, MAX_RECT_SIZE),
    height: clampValue(bounds.height, MIN_RECT_SIZE, MAX_RECT_SIZE)
  };

  if (shapeType === "circle") {
    return createCircleElement({
      ...normalizedBounds,
      strokeWidth: DEFAULT_RECT_STROKE_WIDTH,
      ...overrides
    });
  }

  if (shapeType === "octagon") {
    return createOctagonElement({
      ...normalizedBounds,
      strokeWidth: DEFAULT_RECT_STROKE_WIDTH,
      ...overrides
    });
  }

  return createRectElement({
    ...normalizedBounds,
    strokeWidth: DEFAULT_RECT_STROKE_WIDTH,
    ...overrides
  });
}

export function getOctagonPoints(width: number, height: number) {
  const insetX = width * 0.28;
  const insetY = height * 0.28;

  return [
    insetX,
    0,
    width - insetX,
    0,
    width,
    insetY,
    width,
    height - insetY,
    width - insetX,
    height,
    insetX,
    height,
    0,
    height - insetY,
    0,
    insetY
  ];
}

export function createUploadElement(
  input: {
    dataUrl: string;
    sourceName: string;
    width: number;
    height: number;
  } & Partial<EditorElement>
): EditorElement {
  const { dataUrl, sourceName, width, height, ...overrides } = input;

  return {
    id: makeId("upload"),
    type: "upload",
    x: 160,
    y: 160,
    width,
    height,
    rotation: 0,
    scale: 1,
    content: dataUrl,
    locked: false,
    sourceName,
    ...overrides
  };
}

function instantiateElements(templateId: TemplateId, seeds: ElementSeed[]): EditorElement[] {
  return seeds.map((seed) => ({
    ...seed,
    id: makeId(seed.type),
    templateId
  }));
}

export function createBlankDesign(): CoasterDesignDocument {
  return {
    version: 1,
    productId: "gu-custom",
    updatedAt: new Date().toISOString(),
    elements: instantiateTemplate("blank")
  };
}

export function instantiateTemplate(templateId: TemplateId): EditorElement[] {
  switch (templateId) {
    case "wedding":
      return instantiateElements(templateId, [
        {
          type: "icon",
          x: 218,
          y: 80,
          width: 84,
          height: 84,
          rotation: 0,
          scale: 1,
          content: "heart",
          locked: false
        },
        {
          type: "text",
          x: 110,
          y: 190,
          width: 300,
          height: 70,
          rotation: 0,
          scale: 1,
          content: "Anna & Max",
          fontFamily: "Playfair Display",
          fontSize: 34,
          textAlign: "center",
          letterSpacing: 0,
          locked: false
        },
        {
          type: "line",
          x: 150,
          y: 282,
          width: 220,
          height: 4,
          rotation: 0,
          scale: 1,
          content: "line",
          locked: false,
          strokeWidth: 4,
          lineLength: 220
        },
        {
          type: "text",
          x: 140,
          y: 305,
          width: 240,
          height: 50,
          rotation: 0,
          scale: 1,
          content: "14.08.2026",
          fontFamily: "Manrope",
          fontSize: 18,
          textAlign: "center",
          letterSpacing: 1.4,
          locked: false
        }
      ]);
    case "initials":
      return instantiateElements(templateId, [
        {
          type: "shape",
          x: 105,
          y: 105,
          width: 310,
          height: 310,
          rotation: 0,
          scale: 1,
          content: "frame",
          locked: false
        },
        {
          type: "text",
          x: 160,
          y: 165,
          width: 200,
          height: 120,
          rotation: 0,
          scale: 1,
          content: "FM",
          fontFamily: "Playfair Display",
          fontSize: 64,
          textAlign: "center",
          letterSpacing: 2,
          locked: false
        },
        {
          type: "text",
          x: 120,
          y: 300,
          width: 280,
          height: 50,
          rotation: 0,
          scale: 1,
          content: "Laser Shop Atelier",
          fontFamily: "Manrope",
          fontSize: 16,
          textAlign: "center",
          letterSpacing: 2,
          locked: false
        }
      ]);
    case "modern":
      return instantiateElements(templateId, [
        {
          type: "text",
          x: 90,
          y: 132,
          width: 340,
          height: 60,
          rotation: 0,
          scale: 1,
          content: "TABLE No. 04",
          fontFamily: "Manrope",
          fontSize: 18,
          textAlign: "center",
          letterSpacing: 4,
          locked: false
        },
        {
          type: "line",
          x: 140,
          y: 218,
          width: 240,
          height: 4,
          rotation: 0,
          scale: 1,
          content: "line",
          locked: false,
          strokeWidth: 4,
          lineLength: 240
        },
        {
          type: "text",
          x: 130,
          y: 248,
          width: 260,
          height: 64,
          rotation: 0,
          scale: 1,
          content: "House Blend",
          fontFamily: "Playfair Display",
          fontSize: 36,
          textAlign: "center",
          letterSpacing: 0.5,
          locked: false
        }
      ]);
    case "birthday":
      return instantiateElements(templateId, [
        {
          type: "icon",
          x: 216,
          y: 74,
          width: 88,
          height: 88,
          rotation: 0,
          scale: 1,
          content: "sparkle",
          locked: false
        },
        {
          type: "text",
          x: 100,
          y: 182,
          width: 320,
          height: 60,
          rotation: 0,
          scale: 1,
          content: "Happy Birthday",
          fontFamily: "Playfair Display",
          fontSize: 34,
          textAlign: "center",
          letterSpacing: 0,
          locked: false
        },
        {
          type: "text",
          x: 130,
          y: 265,
          width: 260,
          height: 50,
          rotation: 0,
          scale: 1,
          content: "Cheers, Lisa!",
          fontFamily: "Manrope",
          fontSize: 22,
          textAlign: "center",
          letterSpacing: 0.4,
          locked: false
        }
      ]);
    case "blank":
    default:
      return [
        createTextElement({
          x: 110,
          y: 218,
          width: 300,
          height: 60,
          content: "Dein Untersetzer",
          fontFamily: "Playfair Display",
          fontSize: 34
        })
      ];
  }
}

export function getIconPath(iconId: string) {
  return ICON_LIBRARY.find((icon) => icon.id === iconId)?.path;
}

export function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampCanvasPoint(point: CanvasPoint) {
  return {
    x: clampValue(point.x, SAFE_MARGIN, CANVAS_SIZE - SAFE_MARGIN),
    y: clampValue(point.y, SAFE_MARGIN, CANVAS_SIZE - SAFE_MARGIN)
  };
}

function getElementLocalMeasurementBounds(element: EditorElement): ElementMeasurementBounds {
  if (element.type === "line") {
    const strokeWidth = element.strokeWidth ?? element.height;
    const halfStroke = strokeWidth / 2;
    return {
      x: -halfStroke,
      y: -halfStroke,
      width: (element.lineLength ?? element.width) + strokeWidth,
      height: strokeWidth
    };
  }

  if (element.type === "shape") {
    const halfStroke = 1.25;
    return {
      x: -halfStroke,
      y: -halfStroke,
      width: element.width + halfStroke * 2,
      height: element.height + halfStroke * 2
    };
  }

  if (element.type === "rect" || element.type === "circle" || element.type === "octagon") {
    const halfStroke = (element.strokeWidth ?? DEFAULT_RECT_STROKE_WIDTH) / 2;
    return {
      x: -halfStroke,
      y: -halfStroke,
      width: element.width + halfStroke * 2,
      height: element.height + halfStroke * 2
    };
  }

  if (element.type === "icon") {
    const scaledHalfStroke = (Math.max(element.width, element.height) / 24) * 0.6;
    return {
      x: -scaledHalfStroke,
      y: -scaledHalfStroke,
      width: element.width + scaledHalfStroke * 2,
      height: element.height + scaledHalfStroke * 2
    };
  }

  return {
    x: 0,
    y: 0,
    width: element.width,
    height: element.height
  };
}

export function getElementMeasurementBounds(element: EditorElement): ElementMeasurementBounds {
  const localBounds = getElementLocalMeasurementBounds(element);
  const scale = element.scale;
  const rotation = (element.rotation * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localPoints = [
    { x: localBounds.x, y: localBounds.y },
    { x: localBounds.x + localBounds.width, y: localBounds.y },
    { x: localBounds.x + localBounds.width, y: localBounds.y + localBounds.height },
    { x: localBounds.x, y: localBounds.y + localBounds.height }
  ];
  const transformedPoints = localPoints.map((point) => {
    const scaledX = point.x * scale;
    const scaledY = point.y * scale;
    return {
      x: element.x + scaledX * cos - scaledY * sin,
      y: element.y + scaledX * sin + scaledY * cos
    };
  });
  const xValues = transformedPoints.map((point) => point.x);
  const yValues = transformedPoints.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function buildMeasureSnapTarget(
  element: EditorElement,
  bounds: ElementMeasurementBounds,
  edge: MeasureSnapEdge,
  pointer: CanvasPoint,
  preferredPoint?: CanvasPoint | null,
  preferredOrientation?: MeasureSnapOrientation | null
): MeasureSnapTarget {
  const orientation = edge === "left" || edge === "right" ? "vertical" : "horizontal";
  const referencePoint =
    preferredPoint && preferredOrientation === orientation
      ? preferredPoint
      : pointer;

  if (orientation === "vertical") {
    const edgeX = edge === "left" ? bounds.x : bounds.x + bounds.width;
    const snappedPoint = {
      x: edgeX,
      y: clampValue(referencePoint.y, bounds.y, bounds.y + bounds.height)
    };

    return {
      elementId: element.id,
      edge,
      orientation,
      point: snappedPoint,
      distance: getDistanceBetweenPoints(pointer, snappedPoint),
      bounds
    };
  }

  const edgeY = edge === "top" ? bounds.y : bounds.y + bounds.height;
  const snappedPoint = {
    x: clampValue(referencePoint.x, bounds.x, bounds.x + bounds.width),
    y: edgeY
  };

  return {
    elementId: element.id,
    edge,
    orientation,
    point: snappedPoint,
    distance: getDistanceBetweenPoints(pointer, snappedPoint),
    bounds
  };
}

export function findNearestMeasureSnapTarget(
  elements: EditorElement[],
  pointer: CanvasPoint,
  options: {
    tolerance?: number;
    stickiness?: number;
    previousTarget?: MeasureSnapTarget | null;
    preferredPoint?: CanvasPoint | null;
    preferredOrientation?: MeasureSnapOrientation | null;
  } = {}
) {
  const tolerance = options.tolerance ?? MEASURE_DOCK_TOLERANCE;
  const stickiness = options.stickiness ?? MEASURE_DOCK_STICKINESS;
  const edges: MeasureSnapEdge[] = ["left", "right", "top", "bottom"];
  let bestTarget: MeasureSnapTarget | null = null;
  let previousCandidate: MeasureSnapTarget | null = null;

  for (const element of elements) {
    const bounds = getElementMeasurementBounds(element);

    for (const edge of edges) {
      const candidate = buildMeasureSnapTarget(
        element,
        bounds,
        edge,
        pointer,
        options.preferredPoint,
        options.preferredOrientation
      );

      if (candidate.distance > tolerance) {
        continue;
      }

      if (
        options.previousTarget &&
        candidate.elementId === options.previousTarget.elementId &&
        candidate.edge === options.previousTarget.edge
      ) {
        previousCandidate = candidate;
      }

      if (!bestTarget || candidate.distance < bestTarget.distance) {
        bestTarget = candidate;
      }
    }
  }

  if (previousCandidate && (!bestTarget || previousCandidate.distance <= bestTarget.distance + stickiness)) {
    return previousCandidate;
  }

  return bestTarget;
}

export function getSnappedLineEnd(startPoint: CanvasPoint, nextPoint: CanvasPoint, maxLength = MAX_LINE_LENGTH) {
  const deltaX = nextPoint.x - startPoint.x;
  const deltaY = nextPoint.y - startPoint.y;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const nearHorizontal = absY <= LINE_SNAP_TOLERANCE && absX > 0;
  const nearVertical = absX <= LINE_SNAP_TOLERANCE && absY > 0;

  let snapAxis: LineSnapAxis = null;
  let snappedX = nextPoint.x;
  let snappedY = nextPoint.y;

  if (nearHorizontal && nearVertical) {
    snapAxis = absX >= absY ? "horizontal" : "vertical";
  } else if (nearHorizontal) {
    snapAxis = "horizontal";
  } else if (nearVertical) {
    snapAxis = "vertical";
  }

  if (snapAxis === "horizontal") {
    snappedY = startPoint.y;
  }

  if (snapAxis === "vertical") {
    snappedX = startPoint.x;
  }

  const snappedDeltaX = snappedX - startPoint.x;
  const snappedDeltaY = snappedY - startPoint.y;
  const snappedLength = Math.sqrt(snappedDeltaX ** 2 + snappedDeltaY ** 2);

  if (maxLength && snappedLength > maxLength) {
    const ratio = maxLength / snappedLength;

    return {
      endX: startPoint.x + snappedDeltaX * ratio,
      endY: startPoint.y + snappedDeltaY * ratio,
      snapAxis
    };
  }

  return {
    endX: snappedX,
    endY: snappedY,
    snapAxis
  };
}

export function getDistanceBetweenPoints(startPoint: CanvasPoint, endPoint: CanvasPoint) {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;

  return Math.sqrt(deltaX ** 2 + deltaY ** 2);
}

export function convertCanvasDistanceToMillimeters(distance: number) {
  return (distance / CANVAS_SIZE) * CANVAS_REAL_SIZE_MM;
}

export function formatMillimeters(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)} mm` : `${rounded.toFixed(1)} mm`;
}

export function clampElementPosition(element: EditorElement, nextX: number, nextY: number) {
  const width = element.width * element.scale;
  const height = element.height * element.scale;

  return {
    x: clampValue(nextX, SAFE_MARGIN, CANVAS_SIZE - SAFE_MARGIN - width),
    y: clampValue(nextY, SAFE_MARGIN, CANVAS_SIZE - SAFE_MARGIN - height)
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
    image.src = source;
  });
}

export async function convertUploadToEngravingPreview(file: File) {
  if (!ACCEPTED_UPLOAD_TYPES.includes(file.type as (typeof ACCEPTED_UPLOAD_TYPES)[number])) {
    throw new Error("Bitte lade SVG, PNG oder JPG hoch.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Die Datei ist größer als 5 MB.");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const rasterScale = longestSide > 1200 ? 1200 / longestSide : 1;
  const rasterWidth = Math.max(1, Math.round(image.naturalWidth * rasterScale));
  const rasterHeight = Math.max(1, Math.round(image.naturalHeight * rasterScale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas-Kontext konnte nicht erstellt werden.");
  }

  canvas.width = rasterWidth;
  canvas.height = rasterHeight;
  context.clearRect(0, 0, rasterWidth, rasterHeight);
  context.drawImage(image, 0, 0, rasterWidth, rasterHeight);

  const imageData = context.getImageData(0, 0, rasterWidth, rasterHeight);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha === 0) {
      continue;
    }

    const luminance = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    const darkness = 255 - luminance;
    const nextAlpha = Math.max(0, Math.min(255, Math.round((alpha * darkness) / 255)));

    pixels[index] = 17;
    pixels[index + 1] = 17;
    pixels[index + 2] = 17;
    pixels[index + 3] = nextAlpha < 18 ? 0 : nextAlpha;
  }

  context.putImageData(imageData, 0, 0);

  const previewDataUrl = canvas.toDataURL("image/png");
  const elementMax = 180;
  const elementRatio = Math.min(elementMax / rasterWidth, elementMax / rasterHeight, 1);

  return {
    dataUrl: previewDataUrl,
    sourceName: file.name,
    width: Math.max(60, Math.round(rasterWidth * elementRatio)),
    height: Math.max(60, Math.round(rasterHeight * elementRatio))
  };
}
