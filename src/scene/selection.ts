import type { Point, Polyline } from './polyline'

export function polylineAt(
  scene: readonly Polyline[],
  point: Point,
): string | undefined {
  for (let index = scene.length - 1; index >= 0; index -= 1) {
    const polyline = scene[index]
    if (polyline && pointHitsPolyline(point, polyline)) {
      return polyline.id
    }
  }
  return undefined
}

export function touchedPolylineIds(
  scene: readonly Polyline[],
  rectangle: CornerRectangle,
): readonly string[] {
  const bounds = rectangleFromCorners(rectangle)
  return scene
    .filter((polyline) => polylineTouchesRectangle(polyline, bounds))
    .map((polyline) => polyline.id)
}

export function selectionBounds(
  points: readonly Point[],
): SelectionBounds | undefined {
  const bounds = tightBounds(points)
  if (!bounds) {
    return undefined
  }

  return outsetBounds(bounds, boundsOutsetMm)
}

export function translatePolylines(
  scene: readonly Polyline[],
  move: PolylineMove,
): readonly Polyline[] {
  if (move.ids.length === 0) {
    return scene
  }

  const selected = new Set(move.ids)
  let moved = false
  const next = scene.map((polyline) => {
    if (!selected.has(polyline.id)) {
      return polyline
    }
    moved = true
    return movePolyline(polyline, move.delta)
  })
  return moved ? next : scene
}

function tightBounds(points: readonly Point[]): Rectangle | undefined {
  const first = points[0]
  if (!first) {
    return undefined
  }

  let minX = first.x
  let maxX = first.x
  let minY = first.y
  let maxY = first.y
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, maxX, minY, maxY }
}

function outsetBounds(bounds: Rectangle, outsetMm: number): Rectangle {
  return {
    minX: bounds.minX - outsetMm,
    maxX: bounds.maxX + outsetMm,
    minY: bounds.minY - outsetMm,
    maxY: bounds.maxY + outsetMm,
  }
}

const boundsOutsetMm = 2

function pointHitsPolyline(point: Point, polyline: Polyline): boolean {
  return segmentsOf(polyline).some(
    (segment) => distanceToSegment(point, segment) <= hitSlopMm,
  )
}

function polylineTouchesRectangle(
  polyline: Polyline,
  bounds: Rectangle,
): boolean {
  return segmentsOf(polyline).some((segment) =>
    segmentTouchesRectangle(segment, bounds),
  )
}

function segmentsOf(polyline: Polyline): readonly Segment[] {
  const segments: Segment[] = []
  for (let index = 1; index < polyline.points.length; index += 1) {
    const start = polyline.points[index - 1]
    const end = polyline.points[index]
    if (start && end) {
      segments.push({ start, end })
    }
  }

  const first = polyline.points[0]
  const last = polyline.points[polyline.points.length - 1]
  if (polyline.closed && first && last) {
    segments.push({ start: last, end: first })
  }
  return segments
}

function distanceToSegment(point: Point, segment: Segment): number {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return distanceBetween(point, segment.start)
  }

  const t = clamp01(
    ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) /
      lengthSquared,
  )
  return distanceBetween(point, {
    x: segment.start.x + t * dx,
    y: segment.start.y + t * dy,
  })
}

function distanceBetween(start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return Math.hypot(dx, dy)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function segmentTouchesRectangle(segment: Segment, bounds: Rectangle): boolean {
  if (
    pointInsideRectangle(segment.start, bounds) ||
    pointInsideRectangle(segment.end, bounds)
  ) {
    return true
  }

  return rectangleEdges(bounds).some((edge) => segmentsIntersect(segment, edge))
}

function pointInsideRectangle(point: Point, bounds: Rectangle): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  )
}

function rectangleFromCorners(rectangle: CornerRectangle): Rectangle {
  return {
    minX: Math.min(rectangle.start.x, rectangle.end.x),
    maxX: Math.max(rectangle.start.x, rectangle.end.x),
    minY: Math.min(rectangle.start.y, rectangle.end.y),
    maxY: Math.max(rectangle.start.y, rectangle.end.y),
  }
}

function rectangleEdges(bounds: Rectangle): readonly Segment[] {
  const topLeft = { x: bounds.minX, y: bounds.maxY }
  const topRight = { x: bounds.maxX, y: bounds.maxY }
  const bottomRight = { x: bounds.maxX, y: bounds.minY }
  const bottomLeft = { x: bounds.minX, y: bounds.minY }
  return [
    { start: topLeft, end: topRight },
    { start: topRight, end: bottomRight },
    { start: bottomRight, end: bottomLeft },
    { start: bottomLeft, end: topLeft },
  ]
}

function segmentsIntersect(first: Segment, second: Segment): boolean {
  const startOrientation = orientation(first.start, first.end, second.start)
  const endOrientation = orientation(first.start, first.end, second.end)
  const otherStart = orientation(second.start, second.end, first.start)
  const otherEnd = orientation(second.start, second.end, first.end)

  if (startOrientation !== endOrientation && otherStart !== otherEnd) {
    return true
  }
  if (startOrientation === 0 && pointOnSegment(second.start, first)) {
    return true
  }
  if (endOrientation === 0 && pointOnSegment(second.end, first)) {
    return true
  }
  if (otherStart === 0 && pointOnSegment(first.start, second)) {
    return true
  }
  return otherEnd === 0 && pointOnSegment(first.end, second)
}

function orientation(start: Point, end: Point, point: Point): number {
  const value =
    (end.y - start.y) * (point.x - end.x) -
    (end.x - start.x) * (point.y - end.y)
  if (value === 0) {
    return 0
  }
  return value > 0 ? 1 : -1
}

function pointOnSegment(point: Point, segment: Segment): boolean {
  return (
    point.x <= Math.max(segment.start.x, segment.end.x) &&
    point.x >= Math.min(segment.start.x, segment.end.x) &&
    point.y <= Math.max(segment.start.y, segment.end.y) &&
    point.y >= Math.min(segment.start.y, segment.end.y)
  )
}

function movePolyline(polyline: Polyline, delta: Point): Polyline {
  return {
    ...polyline,
    points: polyline.points.map((point) => ({
      x: point.x + delta.x,
      y: point.y + delta.y,
    })),
  }
}

const hitSlopMm = 3

export type CornerRectangle = {
  start: Point
  end: Point
}

export type PolylineMove = {
  ids: readonly string[]
  delta: Point
}

export type SelectionBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type Rectangle = SelectionBounds

type Segment = {
  start: Point
  end: Point
}
