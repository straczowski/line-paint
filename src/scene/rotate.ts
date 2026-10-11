import type { Point, Polyline } from './polyline'
import type { SelectionBounds } from './selection'

export function rotatePolylines(
  scene: readonly Polyline[],
  change: PolylineRotation,
): readonly Polyline[] {
  if (change.ids.length === 0) {
    return scene
  }

  const angle = rotationAngle(change.angle, change.shiftHeld)
  if (angle === 0) {
    return scene
  }

  const selected = new Set(change.ids)
  const center =
    change.center ??
    selectionCenter(
      scene.flatMap((polyline) =>
        selected.has(polyline.id) ? polyline.points : [],
      ),
    )
  if (!center) {
    return scene
  }

  let changed = false
  const next = scene.map((polyline) => {
    if (!selected.has(polyline.id)) {
      return polyline
    }
    changed = true
    return rotatePolyline(polyline, center, angle)
  })
  return changed ? next : scene
}

export function rotationAngle(angle: number, shiftHeld: boolean): number {
  if (!shiftHeld) {
    return angle
  }

  return Math.round(angle / quarterTurn) * quarterTurn
}

const quarterTurn = Math.PI / 4

export function signedAngle(
  center: Point,
  start: Point,
  pointer: Point,
): number {
  return wrapAngle(
    Math.atan2(pointer.y - center.y, pointer.x - center.x) -
      Math.atan2(start.y - center.y, start.x - center.x),
  )
}

export function unwrapAngle(previous: number, next: number): number {
  return previous + wrapAngle(next - previous)
}

export function selectionCenter(points: readonly Point[]): Point | undefined {
  const bounds = tightBounds(points)
  if (!bounds) {
    return undefined
  }

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
}

export const rotateHandleRadiusPx = 4
export const rotateHandleOffsetPx = 16

export function rotateHandleAt(
  bounds: SelectionBounds,
  point: Point,
  pixelsPerMm: number,
): boolean {
  if (!(pixelsPerMm > 0)) {
    return false
  }

  const handle = restingHandle(bounds, pixelsPerMm)
  const radius = rotateHandleRadiusPx / pixelsPerMm
  const dx = point.x - handle.x
  const dy = point.y - handle.y
  return dx * dx + dy * dy <= radius * radius
}

export function rotatedSelection(
  bounds: SelectionBounds,
  center: Point,
  angle: number,
  pixelsPerMm: number,
): RotatedSelection {
  return {
    corners: selectionCorners(bounds).map((corner) =>
      rotatePoint(corner, center, angle),
    ),
    handle: rotatePoint(restingHandle(bounds, pixelsPerMm), center, angle),
  }
}

function rotatePolyline(
  polyline: Polyline,
  center: Point,
  angle: number,
): Polyline {
  return {
    ...polyline,
    points: polyline.points.map((point) => rotatePoint(point, center, angle)),
  }
}

function rotatePoint(point: Point, center: Point, angle: number): Point {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

function wrapAngle(angle: number): number {
  const turn = Math.PI * 2
  return angle - turn * Math.round(angle / turn)
}

function tightBounds(points: readonly Point[]): SelectionBounds | undefined {
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

function restingHandle(bounds: SelectionBounds, pixelsPerMm: number): Point {
  const offset = pixelsPerMm > 0 ? rotateHandleOffsetPx / pixelsPerMm : 0
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: bounds.maxY + offset,
  }
}

function selectionCorners(bounds: SelectionBounds): readonly Point[] {
  return [
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.minX, y: bounds.minY },
  ]
}

export type PolylineRotation = {
  ids: readonly string[]
  angle: number
  shiftHeld: boolean
  center?: Point
}

export type RotatedSelection = {
  corners: readonly Point[]
  handle: Point
}
