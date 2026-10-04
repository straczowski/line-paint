export function previewStrokePoints(
  points: readonly Point[],
  pointer: Point | undefined,
): readonly Point[] {
  const last = points[points.length - 1]
  if (!last || !pointer || samePoint(last, pointer)) {
    return points
  }

  return [...points, pointer]
}

export function commitPolyline(
  scene: readonly Polyline[],
  draft: PolylineDraft,
): readonly Polyline[] {
  if (draft.points.length < 2) {
    return scene
  }

  return [...scene, polylineFromDraft(draft)]
}

export const defaultPolylineStroke = '#1e1e1e'
export const defaultPolylineWidthMm = 0.3

function samePoint(start: Point, end: Point): boolean {
  return start.x === end.x && start.y === end.y
}

function polylineFromDraft(draft: PolylineDraft): Polyline {
  return {
    id: draft.id,
    points: [...draft.points],
    closed: false,
    stroke: defaultPolylineStroke,
    widthMm: defaultPolylineWidthMm,
  }
}

export type Polyline = {
  id: string
  points: readonly Point[]
  closed: boolean
  stroke: string
  widthMm: number
}

export type PolylineDraft = {
  id: string
  points: readonly Point[]
}

export type Point = {
  x: number
  y: number
}
