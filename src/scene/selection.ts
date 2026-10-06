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

  return outsetBounds(bounds, selectionOutsetMm)
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

export function duplicatePolylines(
  scene: readonly Polyline[],
  copy: PolylineCopy,
): readonly Polyline[] {
  if (copy.ids.length === 0) {
    return scene
  }

  const copies = copiedPolylines(scene, copy)
  return [...scene, ...copies]
}

export function deletePolylines(
  scene: readonly Polyline[],
  ids: readonly string[],
): readonly Polyline[] {
  if (ids.length === 0) {
    return scene
  }

  const selected = new Set(ids)
  const next = scene.filter((polyline) => !selected.has(polyline.id))
  return next.length === scene.length ? scene : next
}

export function hiddenPolylineIds(
  drag: DragHide | undefined,
): readonly string[] {
  if (!drag || (drag.kind === 'move' && drag.altHeld)) {
    return []
  }
  return drag.ids
}

export function sceneWithoutHiddenPolylines(
  scene: readonly Polyline[],
  ids: readonly string[],
): readonly Polyline[] {
  if (ids.length === 0) {
    return scene
  }

  const hidden = new Set(ids)
  const next = scene.filter((polyline) => !hidden.has(polyline.id))
  return next.length === scene.length ? scene : next
}

export function pointerTarget(
  scene: readonly Polyline[],
  point: Point,
  editingId: string | undefined,
): PointerTarget {
  const editing = editingId
    ? scene.find((polyline) => polyline.id === editingId)
    : undefined
  if (editing) {
    const pointIndex = pointIndexAt(editing, point)
    if (pointIndex !== undefined) {
      return { id: editing.id, pointIndex }
    }
  }

  return { id: polylineAt(scene, point), pointIndex: undefined }
}

export function movePolylinePoint(
  scene: readonly Polyline[],
  move: PointMove,
): readonly Polyline[] {
  const polyline = requirePolyline(scene, move.id)
  const current = requirePoint(polyline, move.index)
  if (samePoint(current, move.point)) {
    return scene
  }

  const points = polyline.points.map((point, index) =>
    index === move.index ? move.point : point,
  )
  return replacePolyline(scene, { ...polyline, points })
}

export function deletePolylinePoint(
  scene: readonly Polyline[],
  target: PointDelete,
): readonly Polyline[] {
  const polyline = requirePolyline(scene, target.id)
  requirePoint(polyline, target.index)
  if (polyline.points.length < 3) {
    return scene.filter((item) => item.id !== target.id)
  }

  const points = polyline.points.filter((_, index) => index !== target.index)
  return replacePolyline(scene, { ...polyline, points })
}

export function insertPolylinePoint(
  scene: readonly Polyline[],
  insert: PointInsert,
): PointInsertion | undefined {
  const polyline = requirePolyline(scene, insert.id)
  if (pointIndexAt(polyline, insert.point) !== undefined) {
    return undefined
  }

  const placement = segmentPlacement(polyline, insert.point)
  if (!placement) {
    return undefined
  }

  const points = [
    ...polyline.points.slice(0, placement.index),
    placement.point,
    ...polyline.points.slice(placement.index),
  ]
  return {
    scene: replacePolyline(scene, { ...polyline, points }),
    index: placement.index,
  }
}

function pointIndexAt(polyline: Polyline, point: Point): number | undefined {
  let closestIndex: number | undefined
  let closestDistance = hitSlopMm
  for (let index = 0; index < polyline.points.length; index += 1) {
    const vertex = polyline.points[index]
    if (!vertex) {
      continue
    }

    const distance = distanceBetween(point, vertex)
    if (distance > closestDistance) {
      continue
    }

    closestDistance = distance
    closestIndex = index
  }
  return closestIndex
}

function requirePolyline(scene: readonly Polyline[], id: string): Polyline {
  const polyline = scene.find((item) => item.id === id)
  if (!polyline) {
    throw new Error(`No polyline ${id}`)
  }
  return polyline
}

function requirePoint(polyline: Polyline, index: number): Point {
  const point = polyline.points[index]
  if (!point) {
    throw new Error(`No point ${index} on ${polyline.id}`)
  }
  return point
}

function replacePolyline(
  scene: readonly Polyline[],
  polyline: Polyline,
): readonly Polyline[] {
  return scene.map((item) => (item.id === polyline.id ? polyline : item))
}

function samePoint(start: Point, end: Point): boolean {
  return start.x === end.x && start.y === end.y
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

export const selectionOutsetMm = 2

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

function segmentPlacement(
  polyline: Polyline,
  point: Point,
): SegmentPlacement | undefined {
  let closestIndex = -1
  let closestPoint: Point | undefined
  let closestDistance = hitSlopMm
  const segments = segmentsOf(polyline)
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    if (!segment) {
      continue
    }

    const nearest = nearestPointOnSegment(point, segment)
    if (isSegmentEndpoint(nearest, segment)) {
      continue
    }

    const distance = distanceBetween(point, nearest)
    if (distance > closestDistance) {
      continue
    }

    closestDistance = distance
    closestIndex = index
    closestPoint = nearest
  }

  if (!closestPoint || closestIndex < 0) {
    return undefined
  }

  return {
    index: insertIndex(polyline, closestIndex),
    point: closestPoint,
  }
}

function insertIndex(polyline: Polyline, segmentIndex: number): number {
  if (segmentIndex < polyline.points.length - 1) {
    return segmentIndex + 1
  }
  return polyline.points.length
}

function isSegmentEndpoint(point: Point, segment: Segment): boolean {
  return samePoint(point, segment.start) || samePoint(point, segment.end)
}

function distanceToSegment(point: Point, segment: Segment): number {
  return distanceBetween(point, nearestPointOnSegment(point, segment))
}

function nearestPointOnSegment(point: Point, segment: Segment): Point {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return segment.start
  }

  const t = clamp01(
    ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) /
      lengthSquared,
  )
  return {
    x: segment.start.x + t * dx,
    y: segment.start.y + t * dy,
  }
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

function copiedPolylines(
  scene: readonly Polyline[],
  copy: PolylineCopy,
): Polyline[] {
  if (copy.newIds.length !== copy.ids.length) {
    throw new Error('Each copy needs its own id')
  }

  const taken = new Set(scene.map((polyline) => polyline.id))
  return copy.ids.map((id, index) => {
    const newId = copy.newIds[index]
    if (!newId || taken.has(newId)) {
      throw new Error('Each copy needs its own id')
    }

    taken.add(newId)
    return copyPolyline(requirePolyline(scene, id), newId, copy.delta)
  })
}

function copyPolyline(polyline: Polyline, id: string, delta: Point): Polyline {
  return { ...movePolyline(polyline, delta), id }
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

export type PolylineCopy = {
  ids: readonly string[]
  newIds: readonly string[]
  delta: Point
}

export type PointerTarget = {
  id: string | undefined
  pointIndex: number | undefined
}

export type PointMove = {
  id: string
  index: number
  point: Point
}

export type PointDelete = {
  id: string
  index: number
}

export type PointInsert = {
  id: string
  point: Point
}

export type PointInsertion = {
  scene: readonly Polyline[]
  index: number
}

export type SelectionBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type DragHide = {
  kind: 'move' | 'point' | 'scale'
  ids: readonly string[]
  altHeld: boolean
}

type Rectangle = SelectionBounds

type Segment = {
  start: Point
  end: Point
}

type SegmentPlacement = {
  index: number
  point: Point
}
