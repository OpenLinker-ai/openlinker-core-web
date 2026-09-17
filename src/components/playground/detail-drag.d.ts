export type DragArea = { left: number; top: number; right: number; bottom: number };
export type DragRect = { left: number; top: number; width: number; height: number };
export type DragOffset = { x: number; y: number };
export type DragBounds = { minX: number; maxX: number; minY: number; maxY: number };

export function visibleArea(viewport: DragArea, clipRects?: readonly DragArea[]): DragArea;

export function dragOffsetBounds(input: {
  rect: DragRect;
  offset: DragOffset;
  area: DragArea;
  margin?: number;
}): DragBounds;

export function clampOffset(value: number, min: number, max: number): number;
