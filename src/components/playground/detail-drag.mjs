/**
 * Pure geometry for the run-details card drag.
 *
 * The card must stay where the reader can still reach its header, which is not
 * the same as staying inside the window: the playground sits inside a grid that
 * clips its own overflow, so a card dragged within the viewport can still be cut
 * out of sight. Keeping the maths here makes both rules directly testable.
 */

/** Intersect the viewport with every clipping ancestor rect. */
export function visibleArea(viewport, clipRects = []) {
  return clipRects.reduce(
    (area, rect) => ({
      left: Math.max(area.left, rect.left),
      top: Math.max(area.top, rect.top),
      right: Math.min(area.right, rect.right),
      bottom: Math.min(area.bottom, rect.bottom),
    }),
    { left: viewport.left, top: viewport.top, right: viewport.right, bottom: viewport.bottom },
  );
}

/**
 * Offset range that keeps the card inside `area`, derived from where the card
 * rests when the drag starts. `rect` is measured with `offset` already applied.
 */
export function dragOffsetBounds({ rect, offset, area, margin = 0 }) {
  const restingLeft = rect.left - offset.x;
  const restingTop = rect.top - offset.y;
  return {
    minX: area.left + margin - restingLeft,
    maxX: area.right - margin - rect.width - restingLeft,
    minY: area.top + margin - restingTop,
    maxY: area.bottom - margin - rect.height - restingTop,
  };
}

/** An area smaller than the card keeps the lower bound, so its header stays reachable. */
export function clampOffset(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
