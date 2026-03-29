"use client";

import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Rect,
  Stage,
  Text as KonvaText,
  Transformer
} from "react-konva";
import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import {
  CANVAS_SIZE,
  DEFAULT_TEXT_COLOR,
  MAX_LINE_LENGTH,
  MAX_RECT_SIZE,
  MAX_STROKE_WIDTH,
  MIN_LINE_LENGTH,
  MIN_RECT_SIZE,
  MIN_STROKE_WIDTH,
  SAFE_MARGIN,
  clampCanvasPoint,
  clampElementPosition,
  clampValue,
  formatMillimeters,
  type CanvasPoint,
  getShapeBoundsForPoints,
  getOctagonPoints,
  getIconPath
} from "@/lib/design-tool";
import type { EditorElement, EditorTool, LineDraft, MeasureDraft, MeasureSnapTarget, ShapeDraft } from "@/lib/design-tool";

function CanvasUploadedImage({
  source,
  width,
  height
}: {
  source: string;
  width: number;
  height: number;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const nextImage = new window.Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = source;
  }, [source]);

  if (!image) {
    return <Rect width={width} height={height} fill="#f4f7fb" cornerRadius={18} />;
  }

  return <KonvaImage image={image} width={width} height={height} />;
}

export function CoasterStage({
  elements,
  size = CANVAS_SIZE,
  interactive = false,
  activeTool = "select",
  lineDraft,
  measureDraft,
  measureDockModeActive = false,
  measurePointer,
  measureHoverSnapTarget,
  shapeDraft,
  selectedId,
  stageRef,
  onSelect,
  onChange,
  onLinePoint,
  onLinePreview,
  onMeasurePoint,
  onMeasurePreview,
  onMeasureLeave,
  onShapePoint,
  onShapePreview,
  onCancelDraw
}: {
  elements: EditorElement[];
  size?: number;
  interactive?: boolean;
  activeTool?: EditorTool;
  lineDraft?: LineDraft | null;
  measureDraft?: MeasureDraft | null;
  measureDockModeActive?: boolean;
  measurePointer?: CanvasPoint | null;
  measureHoverSnapTarget?: MeasureSnapTarget | null;
  shapeDraft?: ShapeDraft | null;
  selectedId?: string | null;
  stageRef?: React.RefObject<Konva.Stage | null>;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<EditorElement>) => void;
  onLinePoint?: (point: { x: number; y: number }) => void;
  onLinePreview?: (point: { x: number; y: number }) => void;
  onMeasurePoint?: (point: { x: number; y: number }) => void;
  onMeasurePreview?: (point: { x: number; y: number }) => void;
  onMeasureLeave?: () => void;
  onShapePoint?: (point: { x: number; y: number }) => void;
  onShapePreview?: (point: { x: number; y: number }) => void;
  onCancelDraw?: () => void;
}) {
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef<Record<string, Konva.Group | null>>({});
  const ratio = size / CANVAS_SIZE;
  const selectedElement = selectedId ? elements.find((element) => element.id === selectedId) : undefined;
  const shapePreviewBounds = shapeDraft
    ? getShapeBoundsForPoints(
        shapeDraft.shapeType,
        { x: shapeDraft.startX, y: shapeDraft.startY },
        { x: shapeDraft.endX, y: shapeDraft.endY }
      )
    : null;
  const measureSnapTargets = [
    measureDraft?.startSnapTarget,
    measureDraft?.endSnapTarget,
    measureHoverSnapTarget
  ].filter((target): target is MeasureSnapTarget => Boolean(target));
  const uniqueMeasureSnapTargets = Array.from(
    new Map(measureSnapTargets.map((target) => [`${target.elementId}-${target.edge}`, target])).values()
  );

  function getCanvasPointerPosition(stage: Konva.Stage | null) {
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      return null;
    }

    return clampCanvasPoint({
      x: pointer.x / ratio,
      y: pointer.y / ratio
    });
  }

  useEffect(() => {
    if (!interactive || !transformerRef.current || !selectedId || activeTool !== "select") {
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();
      return;
    }

    const node = nodeRefs.current[selectedId];
    if (!node) {
      return;
    }

    transformerRef.current.nodes([node]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [activeTool, interactive, selectedId, elements]);

  function getMeasureEdgePoints(target: MeasureSnapTarget) {
    const { bounds, edge } = target;

    if (edge === "left" || edge === "right") {
      const x = edge === "left" ? bounds.x : bounds.x + bounds.width;
      return [x, bounds.y, x, bounds.y + bounds.height];
    }

    const y = edge === "top" ? bounds.y : bounds.y + bounds.height;
    return [bounds.x, y, bounds.x + bounds.width, y];
  }

  return (
    <Stage
      ref={stageRef}
      width={size}
      height={size}
      style={{
        cursor:
          interactive && activeTool === "measure"
            ? measureDockModeActive
              ? "cell"
              : "crosshair"
            : interactive && activeTool !== "select"
              ? "crosshair"
              : "default"
      }}
      onContextMenu={(event) => {
        if (!interactive || activeTool === "select") {
          return;
        }
        event.evt.preventDefault();
        onCancelDraw?.();
      }}
      onMouseDown={(event) => {
        if (!interactive) {
          return;
        }

        const stage = event.target.getStage();

        if (activeTool === "line") {
          event.evt.preventDefault();
          const point = getCanvasPointerPosition(stage);
          if (point) {
            onLinePoint?.(point);
          }
          return;
        }

        if (activeTool === "shape") {
          event.evt.preventDefault();
          const point = getCanvasPointerPosition(stage);
          if (point) {
            onShapePoint?.(point);
          }
          return;
        }

        if (activeTool === "measure") {
          event.evt.preventDefault();
          const point = getCanvasPointerPosition(stage);
          if (point) {
            onMeasurePoint?.(point);
          }
          return;
        }

        if (event.target !== stage) {
          return;
        }

        onSelect?.(null);
      }}
      onMouseMove={(event) => {
        const point = getCanvasPointerPosition(event.target.getStage());

        if (!point) {
          return;
        }

        if (interactive && activeTool === "line" && lineDraft) {
          onLinePreview?.(point);
        }

        if (interactive && activeTool === "shape" && shapeDraft) {
          onShapePreview?.(point);
        }

        if (interactive && activeTool === "measure" && measureDraft) {
          onMeasurePreview?.(point);
          return;
        }

        if (interactive && activeTool === "measure") {
          onMeasurePreview?.(point);
        }
      }}
      onMouseLeave={() => {
        if (interactive && activeTool === "measure") {
          onMeasureLeave?.();
        }
      }}
    >
      <Layer scaleX={ratio} scaleY={ratio}>
        <Rect width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#ffffff" cornerRadius={32} />

        {Array.from({ length: 11 }).map((_, index) => {
          const point = (CANVAS_SIZE / 10) * index;
          return (
            <Group key={point}>
              <Line
                points={[point, 0, point, CANVAS_SIZE]}
                stroke="#edf1f5"
                strokeWidth={index === 0 || index === 10 ? 0 : 1}
              />
              <Line
                points={[0, point, CANVAS_SIZE, point]}
                stroke="#edf1f5"
                strokeWidth={index === 0 || index === 10 ? 0 : 1}
              />
            </Group>
          );
        })}

        <Rect
          x={SAFE_MARGIN}
          y={SAFE_MARGIN}
          width={CANVAS_SIZE - SAFE_MARGIN * 2}
          height={CANVAS_SIZE - SAFE_MARGIN * 2}
          stroke="#e7772c"
          strokeWidth={1.5}
          dash={[8, 6]}
          cornerRadius={22}
        />

        {elements.map((element) => {
          const path = element.type === "icon" ? getIconPath(element.content) : null;

          return (
            <Group
              key={element.id}
              ref={(node) => {
                nodeRefs.current[element.id] = node;
              }}
              x={element.x}
              y={element.y}
              rotation={element.rotation}
              scaleX={element.scale}
              scaleY={element.scale}
              draggable={interactive && activeTool === "select" && !element.locked}
              onClick={() => {
                if (activeTool !== "select") {
                  return;
                }
                onSelect?.(element.id);
              }}
              onTap={() => {
                if (activeTool !== "select") {
                  return;
                }
                onSelect?.(element.id);
              }}
              dragBoundFunc={(position) => clampElementPosition(element, position.x, position.y)}
              onDragMove={(event) => onChange?.(element.id, { x: event.target.x(), y: event.target.y() })}
              onDragEnd={(event) => onChange?.(element.id, { x: event.target.x(), y: event.target.y() })}
              onTransformEnd={(event) => {
                if (!onChange) {
                  return;
                }

                const node = event.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                const nextScale = clampValue(element.scale * scaleX, 0.35, 4);
                const nextPatch: Partial<EditorElement> = {
                  x: node.x(),
                  y: node.y(),
                  rotation: node.rotation()
                };

                if (element.type === "line") {
                  const nextLineLength = clampValue(
                    (element.lineLength ?? element.width) * scaleX,
                    MIN_LINE_LENGTH,
                    MAX_LINE_LENGTH
                  );
                  const nextStrokeWidth = clampValue(
                    (element.strokeWidth ?? element.height) * scaleY,
                    MIN_STROKE_WIDTH,
                    MAX_STROKE_WIDTH
                  );
                  const clampedPosition = clampElementPosition(
                    {
                      ...element,
                      lineLength: nextLineLength,
                      width: nextLineLength,
                      strokeWidth: nextStrokeWidth,
                      height: nextStrokeWidth,
                      scale: 1
                    },
                    node.x(),
                    node.y()
                  );

                  node.scaleX(1);
                  node.scaleY(1);

                  onChange(element.id, {
                    ...nextPatch,
                    x: clampedPosition.x,
                    y: clampedPosition.y,
                    scale: 1,
                    lineLength: nextLineLength,
                    width: nextLineLength,
                    strokeWidth: nextStrokeWidth,
                    height: nextStrokeWidth
                  });
                  return;
                }

                if (element.type === "rect" || element.type === "octagon") {
                  const nextWidth = clampValue(element.width * scaleX, MIN_RECT_SIZE, MAX_RECT_SIZE);
                  const nextHeight = clampValue(element.height * scaleY, MIN_RECT_SIZE, MAX_RECT_SIZE);
                  const clampedPosition = clampElementPosition(
                    {
                      ...element,
                      width: nextWidth,
                      height: nextHeight,
                      scale: 1
                    },
                    node.x(),
                    node.y()
                  );

                  node.scaleX(1);
                  node.scaleY(1);

                  onChange(element.id, {
                    ...nextPatch,
                    x: clampedPosition.x,
                    y: clampedPosition.y,
                    scale: 1,
                    width: nextWidth,
                    height: nextHeight
                  });
                  return;
                }

                if (element.type === "circle") {
                  const nextSize = clampValue(
                    Math.max(element.width * scaleX, element.height * scaleY),
                    MIN_RECT_SIZE,
                    MAX_RECT_SIZE
                  );
                  const clampedPosition = clampElementPosition(
                    {
                      ...element,
                      width: nextSize,
                      height: nextSize,
                      scale: 1
                    },
                    node.x(),
                    node.y()
                  );

                  node.scaleX(1);
                  node.scaleY(1);

                  onChange(element.id, {
                    ...nextPatch,
                    x: clampedPosition.x,
                    y: clampedPosition.y,
                    scale: 1,
                    width: nextSize,
                    height: nextSize
                  });
                  return;
                }

                const clampedPosition = clampElementPosition({ ...element, scale: nextScale }, node.x(), node.y());

                node.scaleX(1);
                node.scaleY(1);

                onChange(element.id, {
                  x: clampedPosition.x,
                  y: clampedPosition.y,
                  rotation: node.rotation(),
                  scale: nextScale
                });
              }}
            >
              {element.type === "text" ? (
                <KonvaText
                  text={element.content}
                  width={element.width}
                  height={element.height}
                  fontSize={element.fontSize}
                  fontFamily={element.fontFamily}
                  align={element.textAlign}
                  letterSpacing={element.letterSpacing}
                  fill={DEFAULT_TEXT_COLOR}
                  verticalAlign="middle"
                />
              ) : null}

              {element.type === "icon" && path ? (
                <Path
                  data={path}
                  fill={DEFAULT_TEXT_COLOR}
                  stroke={DEFAULT_TEXT_COLOR}
                  strokeWidth={1.2}
                  scaleX={element.width / 24}
                  scaleY={element.height / 24}
                />
              ) : null}

              {element.type === "shape" && element.content === "frame" ? (
                <Rect
                  width={element.width}
                  height={element.height}
                  stroke={DEFAULT_TEXT_COLOR}
                  strokeWidth={2.5}
                  cornerRadius={22}
                />
              ) : null}

              {element.type === "rect" ? (
                <Rect
                  width={element.width}
                  height={element.height}
                  stroke={DEFAULT_TEXT_COLOR}
                  strokeWidth={element.strokeWidth ?? 2.5}
                />
              ) : null}

              {element.type === "circle" ? (
                <Circle
                  x={element.width / 2}
                  y={element.height / 2}
                  radius={element.width / 2}
                  stroke={DEFAULT_TEXT_COLOR}
                  strokeWidth={element.strokeWidth ?? 2.5}
                />
              ) : null}

              {element.type === "octagon" ? (
                <Line
                  points={getOctagonPoints(element.width, element.height)}
                  stroke={DEFAULT_TEXT_COLOR}
                  strokeWidth={element.strokeWidth ?? 2.5}
                  closed
                />
              ) : null}

              {element.type === "line" ? (
                <Line
                  points={[0, 0, element.lineLength ?? element.width, 0]}
                  stroke={DEFAULT_TEXT_COLOR}
                  strokeWidth={element.strokeWidth ?? element.height}
                  lineCap="round"
                />
              ) : null}

              {element.type === "upload" ? (
                <CanvasUploadedImage source={element.content} width={element.width} height={element.height} />
              ) : null}
            </Group>
          );
        })}

        {interactive && lineDraft ? (
          <Group listening={false}>
            <Circle
              x={lineDraft.startX}
              y={lineDraft.startY}
              radius={lineDraft.snapAxis ? 5.5 : 5}
              fill="#e7772c"
              opacity={0.85}
            />
            <Line
              points={[lineDraft.startX, lineDraft.startY, lineDraft.endX, lineDraft.endY]}
              stroke="#e7772c"
              strokeWidth={lineDraft.snapAxis ? 3.5 : 3}
              lineCap="round"
              dash={lineDraft.snapAxis ? [4, 3] : [8, 6]}
              opacity={lineDraft.snapAxis ? 0.95 : 0.82}
            />
          </Group>
        ) : null}

        {interactive && measureDraft ? (
          <Group listening={false}>
            <Circle
              x={measureDraft.startX}
              y={measureDraft.startY}
              radius={measureDraft.isFinal ? 5.5 : 5}
              fill="#0f8a83"
              opacity={0.88}
            />
            <Line
              points={[measureDraft.startX, measureDraft.startY, measureDraft.endX, measureDraft.endY]}
              stroke="#0f8a83"
              strokeWidth={measureDraft.isFinal ? 3.5 : 3}
              lineCap="round"
              dash={measureDraft.isFinal ? [4, 3] : [10, 6]}
              opacity={measureDraft.isFinal ? 0.96 : 0.86}
            />
            <Circle
              x={measureDraft.endX}
              y={measureDraft.endY}
              radius={measureDraft.isFinal ? 4.5 : 4}
              fill="#0f8a83"
              opacity={0.78}
            />
            <Group
              x={(measureDraft.startX + measureDraft.endX) / 2}
              y={(measureDraft.startY + measureDraft.endY) / 2}
              rotation={
                (Math.atan2(measureDraft.endY - measureDraft.startY, measureDraft.endX - measureDraft.startX) * 180) /
                Math.PI
              }
            >
              <Rect
                x={-34}
                y={-30}
                width={68}
                height={20}
                fill="#ffffff"
                opacity={0.96}
                cornerRadius={999}
                shadowColor="#0f172a"
                shadowBlur={8}
                shadowOffsetY={2}
                shadowOpacity={0.08}
              />
              <KonvaText
                x={-34}
                y={-26}
                width={68}
                align="center"
                text={formatMillimeters(measureDraft.distanceMm)}
                fontSize={11}
                fontStyle="700"
                fill="#0f8a83"
              />
            </Group>
          </Group>
        ) : null}

        {interactive && activeTool === "measure"
          ? uniqueMeasureSnapTargets.map((target) => (
              <Group key={`${target.elementId}-${target.edge}`} listening={false}>
                <Line
                  points={getMeasureEdgePoints(target)}
                  stroke="#0f8a83"
                  strokeWidth={2}
                  dash={[6, 4]}
                  opacity={0.36}
                />
              </Group>
            ))
          : null}

        {interactive && activeTool === "measure" && measureHoverSnapTarget ? (
          <Group listening={false}>
            <Circle
              x={measureHoverSnapTarget.point.x}
              y={measureHoverSnapTarget.point.y}
              radius={4.5}
              fill="#ffffff"
              stroke="#0f8a83"
              strokeWidth={2}
              opacity={0.95}
            />
          </Group>
        ) : null}

        {interactive && activeTool === "measure" && measureDockModeActive && measurePointer ? (
          <Group x={measurePointer.x + 12} y={measurePointer.y - 18} listening={false}>
            <Rect
              width={18}
              height={18}
              fill="#ffffff"
              opacity={0.96}
              cornerRadius={6}
              shadowColor="#0f172a"
              shadowBlur={8}
              shadowOffsetY={2}
              shadowOpacity={0.08}
            />
            <Line points={[5, 9, 13, 9]} stroke="#0f8a83" strokeWidth={1.8} lineCap="round" />
            <Line points={[9, 5, 9, 13]} stroke="#0f8a83" strokeWidth={1.8} lineCap="round" />
          </Group>
        ) : null}

        {interactive && shapeDraft ? (
          <Group listening={false}>
            <Circle x={shapeDraft.startX} y={shapeDraft.startY} radius={5} fill="#e7772c" opacity={0.85} />

            {shapeDraft.shapeType === "rect" && shapePreviewBounds ? (
              <Rect
                x={shapePreviewBounds.x}
                y={shapePreviewBounds.y}
                width={shapePreviewBounds.width}
                height={shapePreviewBounds.height}
                stroke="#e7772c"
                strokeWidth={2.5}
                dash={[8, 6]}
                opacity={0.88}
              />
            ) : null}

            {shapeDraft.shapeType === "circle" && shapePreviewBounds ? (
              <Circle
                x={shapePreviewBounds.x + shapePreviewBounds.width / 2}
                y={shapePreviewBounds.y + shapePreviewBounds.height / 2}
                radius={shapePreviewBounds.width / 2}
                stroke="#e7772c"
                strokeWidth={2.5}
                dash={[8, 6]}
                opacity={0.88}
              />
            ) : null}

            {shapeDraft.shapeType === "octagon" && shapePreviewBounds ? (
              <Line
                x={shapePreviewBounds.x}
                y={shapePreviewBounds.y}
                points={getOctagonPoints(shapePreviewBounds.width, shapePreviewBounds.height)}
                stroke="#e7772c"
                strokeWidth={2.5}
                dash={[8, 6]}
                opacity={0.88}
                closed
              />
            ) : null}
          </Group>
        ) : null}

        {interactive && selectedId && activeTool === "select" ? (
          <Transformer
            ref={transformerRef}
            rotateEnabled
            flipEnabled={false}
            anchorCornerRadius={999}
            anchorSize={10}
            borderStroke="#e7772c"
            anchorFill="#ffffff"
            anchorStroke="#e7772c"
            enabledAnchors={
              selectedElement?.type === "line"
                ? ["middle-left", "middle-right", "top-center", "bottom-center"]
                : undefined
            }
            keepRatio={
              selectedElement?.type === "line"
                ? false
                : selectedElement?.type === "circle"
                  ? true
                  : selectedElement?.type === "rect" || selectedElement?.type === "octagon"
                    ? false
                    : true
            }
            boundBoxFunc={(oldBox, newBox) => {
              const minimumWidth =
                selectedElement?.type === "line"
                  ? MIN_LINE_LENGTH
                  : selectedElement?.type === "rect" ||
                      selectedElement?.type === "circle" ||
                      selectedElement?.type === "octagon"
                    ? MIN_RECT_SIZE
                    : 24;
              const minimumHeight =
                selectedElement?.type === "rect" ||
                  selectedElement?.type === "circle" ||
                  selectedElement?.type === "octagon"
                  ? MIN_RECT_SIZE
                  : selectedElement?.type === "line"
                    ? 12
                    : 24;

              if (newBox.width < minimumWidth || newBox.height < minimumHeight) {
                return oldBox;
              }
              return newBox;
            }}
          />
        ) : null}
      </Layer>
    </Stage>
  );
}
