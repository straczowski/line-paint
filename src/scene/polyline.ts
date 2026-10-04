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

export function setPolylineClosed(
  scene: readonly Polyline[],
  change: PolylineClosed,
): readonly Polyline[] {
  const polyline = scene.find((item) => item.id === change.id)
  if (!polyline) {
    throw new Error(`No polyline ${change.id}`)
  }
  if (polyline.closed === change.closed) {
    return scene
  }

  return scene.map((item) =>
    item.id === change.id ? { ...item, closed: change.closed } : item,
  )
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

export type PolylineClosed = {
  id: string
  closed: boolean
}

export type Point = {
  x: number
  y: number
}
