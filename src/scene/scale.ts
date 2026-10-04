import type { Point, Polyline } from './polyline'
import { selectionBounds, selectionOutsetMm } from './selection'
import type { SelectionBounds } from './selection'

export function scalePolylines(
  scene: readonly Polyline[],
  change: PolylineScale,
): readonly Polyline[] {
  if (change.ids.length === 0) {
    return scene
  }

  const selected = new Set(change.ids)
  const bounds = tightBounds(
    scene.flatMap((polyline) =>
      selected.has(polyline.id) ? polyline.points : [],
    ),
  )
  if (!bounds) {
    return scene
  }

  const factors = scaleFactors(bounds, change)
  if (factors.x === 1 && factors.y === 1) {
    return scene
  }

  let changed = false
  const next = scene.map((polyline) => {
    if (!selected.has(polyline.id)) {
      return polyline
    }
    changed = true
    return scalePolyline(polyline, factors)
  })
  return changed ? next : scene
}

export const scaleHandleHalfPx = 4

export function scaleHandleAt(
  bounds: SelectionBounds,
  point: Point,
  halfMm: number,
): ScaleHandle | undefined {
  if (halfMm <= 0) {
    return undefined
  }

  const corner = cornerAt(bounds, point, halfMm)
  if (corner) {
    return corner
  }
  return edgeAt(bounds, point, halfMm)
}

function scaleFactors(
  bounds: SelectionBounds,
  change: PolylineScale,
): ScaleFactors {
  if (change.shiftHeld && isCorner(change.handle)) {
    return uniformScale(bounds, change)
  }

  const x = axisScale(bounds.minX, bounds.maxX, change, 'x')
  const y = axisScale(bounds.minY, bounds.maxY, change, 'y')
  return {
    anchorX: x.anchor,
    anchorY: y.anchor,
    x: x.factor,
    y: y.factor,
  }
}

function uniformScale(
  bounds: SelectionBounds,
  change: PolylineScale,
): ScaleFactors {
  const anchor = change.altHeld
    ? boundsCenter(bounds)
    : cornerPoint(bounds, change.handle, true)
  const corner = cornerPoint(bounds, change.handle, false)
  const dx = corner.x - anchor.x
  const dy = corner.y - anchor.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return { anchorX: anchor.x, anchorY: anchor.y, x: 1, y: 1 }
  }

  const implied = impliedCorner(change.pointer, change.handle)
  const projected =
    ((implied.x - anchor.x) * dx + (implied.y - anchor.y) * dy) / lengthSquared
  const factor = clampedUniformFactor(projected, dx, dy)
  return { anchorX: anchor.x, anchorY: anchor.y, x: factor, y: factor }
}

function axisScale(
  min: number,
  max: number,
  change: PolylineScale,
  axis: Axis,
): AxisScale {
  const side = movedEdge(change.handle, axis)
  if (!side) {
    return { anchor: min, factor: 1 }
  }

  const moving = side === 'max' ? max : min
  const anchor = change.altHeld ? (min + max) / 2 : side === 'max' ? min : max
  const pointer = axis === 'x' ? change.pointer.x : change.pointer.y
  const proposed =
    side === 'max' ? pointer - selectionOutsetMm : pointer + selectionOutsetMm
  return { anchor, factor: clampedFactor(anchor, moving, proposed) }
}

function clampedFactor(
  anchor: number,
  moving: number,
  proposed: number,
): number {
  const extent = moving - anchor
  if (extent === 0) {
    return 1
  }

  const proposedExtent = proposed - anchor
  const limit = Math.min(Math.abs(extent), minimumExtentMm)
  const sign = Math.sign(extent)
  const nextExtent =
    proposedExtent * sign < limit ? sign * limit : proposedExtent
  return nextExtent / extent
}

const minimumExtentMm = 1

function clampedUniformFactor(factor: number, dx: number, dy: number): number {
  return Math.max(factor, minimumFactor(dx), minimumFactor(dy))
}

function minimumFactor(extent: number): number {
  if (extent === 0) {
    return 0
  }

  const limit = Math.min(Math.abs(extent), minimumExtentMm)
  return limit / Math.abs(extent)
}

function isCorner(handle: ScaleHandle): boolean {
  return (
    movedEdge(handle, 'x') !== undefined && movedEdge(handle, 'y') !== undefined
  )
}

function movedEdge(handle: ScaleHandle, axis: Axis): EdgeSide | undefined {
  if (axis === 'x') {
    if (handle === 'west' || handle === 'northWest' || handle === 'southWest') {
      return 'min'
    }
    if (handle === 'east' || handle === 'northEast' || handle === 'southEast') {
      return 'max'
    }
    return undefined
  }

  if (handle === 'south' || handle === 'southWest' || handle === 'southEast') {
    return 'min'
  }
  if (handle === 'north' || handle === 'northWest' || handle === 'northEast') {
    return 'max'
  }
  return undefined
}

function cornerPoint(
  bounds: SelectionBounds,
  handle: ScaleHandle,
  opposite: boolean,
): Point {
  const xSide = requireEdge(handle, 'x')
  const ySide = requireEdge(handle, 'y')
  const xMax = opposite ? xSide === 'min' : xSide === 'max'
  const yMax = opposite ? ySide === 'min' : ySide === 'max'
  return {
    x: xMax ? bounds.maxX : bounds.minX,
    y: yMax ? bounds.maxY : bounds.minY,
  }
}

function impliedCorner(pointer: Point, handle: ScaleHandle): Point {
  const xSide = requireEdge(handle, 'x')
  const ySide = requireEdge(handle, 'y')
  return {
    x:
      xSide === 'max'
        ? pointer.x - selectionOutsetMm
        : pointer.x + selectionOutsetMm,
    y:
      ySide === 'max'
        ? pointer.y - selectionOutsetMm
        : pointer.y + selectionOutsetMm,
  }
}

function requireEdge(handle: ScaleHandle, axis: Axis): EdgeSide {
  const side = movedEdge(handle, axis)
  if (!side) {
    throw new Error(`Scale handle ${handle} is not a corner`)
  }
  return side
}

function boundsCenter(bounds: SelectionBounds): Point {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
}

function cornerAt(
  bounds: SelectionBounds,
  point: Point,
  halfMm: number,
): ScaleHandle | undefined {
  let best: ScaleHandle | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const corner of cornerHandles(bounds)) {
    if (
      Math.abs(point.x - corner.x) > halfMm ||
      Math.abs(point.y - corner.y) > halfMm
    ) {
      continue
    }

    const distance = Math.hypot(point.x - corner.x, point.y - corner.y)
    if (distance >= bestDistance) {
      continue
    }
    bestDistance = distance
    best = corner.handle
  }
  return best
}

function edgeAt(
  bounds: SelectionBounds,
  point: Point,
  halfMm: number,
): ScaleHandle | undefined {
  let best: ScaleHandle | undefined
  let bestDistance = halfMm
  for (const edge of boundsEdges(bounds)) {
    const distance = distanceToSegment(point, edge.start, edge.end)
    if (distance > bestDistance) {
      continue
    }
    bestDistance = distance
    best = edge.handle
  }
  return best
}

function cornerHandles(bounds: SelectionBounds): readonly CornerHit[] {
  return [
    { handle: 'northWest', x: bounds.minX, y: bounds.maxY },
    { handle: 'northEast', x: bounds.maxX, y: bounds.maxY },
    { handle: 'southEast', x: bounds.maxX, y: bounds.minY },
    { handle: 'southWest', x: bounds.minX, y: bounds.minY },
  ]
}

function boundsEdges(bounds: SelectionBounds): readonly EdgeHit[] {
  const northWest = { x: bounds.minX, y: bounds.maxY }
  const northEast = { x: bounds.maxX, y: bounds.maxY }
  const southEast = { x: bounds.maxX, y: bounds.minY }
  const southWest = { x: bounds.minX, y: bounds.minY }
  return [
    { handle: 'north', start: northWest, end: northEast },
    { handle: 'east', start: northEast, end: southEast },
    { handle: 'south', start: southEast, end: southWest },
    { handle: 'west', start: southWest, end: northWest },
  ]
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  )
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

function tightBounds(points: readonly Point[]): SelectionBounds | undefined {
  const visual = selectionBounds(points)
  if (!visual) {
    return undefined
  }

  return {
    minX: visual.minX + selectionOutsetMm,
    maxX: visual.maxX - selectionOutsetMm,
    minY: visual.minY + selectionOutsetMm,
    maxY: visual.maxY - selectionOutsetMm,
  }
}

function scalePolyline(polyline: Polyline, factors: ScaleFactors): Polyline {
  return {
    ...polyline,
    points: polyline.points.map((point) => scalePoint(point, factors)),
  }
}

function scalePoint(point: Point, factors: ScaleFactors): Point {
  return {
    x: factors.anchorX + (point.x - factors.anchorX) * factors.x,
    y: factors.anchorY + (point.y - factors.anchorY) * factors.y,
  }
}

export type PolylineScale = {
  ids: readonly string[]
  handle: ScaleHandle
  pointer: Point
  shiftHeld: boolean
  altHeld: boolean
}

export type ScaleHandle =
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'northEast'
  | 'northWest'
  | 'southEast'
  | 'southWest'

type ScaleFactors = {
  anchorX: number
  anchorY: number
  x: number
  y: number
}

type AxisScale = {
  anchor: number
  factor: number
}

type Axis = 'x' | 'y'

type EdgeSide = 'min' | 'max'

type CornerHit = {
  handle: ScaleHandle
  x: number
  y: number
}

type EdgeHit = {
  handle: ScaleHandle
  start: Point
  end: Point
}
