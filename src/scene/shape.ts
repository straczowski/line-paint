import type { Point } from './polyline'

export function shapePoints(input: ShapeDrag): readonly Point[] | undefined {
  const bounds = shapeBounds(input)
  if (!bounds) {
    return undefined
  }
  if (input.kind === 'rectangle') {
    return rectanglePoints(bounds)
  }
  return ellipsePoints(bounds)
}

function shapeBounds(input: ShapeDrag): Bounds | undefined {
  const dx = input.pointer.x - input.anchor.x
  const dy = input.pointer.y - input.anchor.y
  const spanX = input.symmetric ? longerSpan(dx, dy) * axisSign(dx) : dx
  const spanY = input.symmetric ? longerSpan(dx, dy) * axisSign(dy) : dy
  const minX = input.fromCenter
    ? input.anchor.x - Math.abs(spanX)
    : Math.min(input.anchor.x, input.anchor.x + spanX)
  const maxX = input.fromCenter
    ? input.anchor.x + Math.abs(spanX)
    : Math.max(input.anchor.x, input.anchor.x + spanX)
  const minY = input.fromCenter
    ? input.anchor.y - Math.abs(spanY)
    : Math.min(input.anchor.y, input.anchor.y + spanY)
  const maxY = input.fromCenter
    ? input.anchor.y + Math.abs(spanY)
    : Math.max(input.anchor.y, input.anchor.y + spanY)
  if (minX === maxX || minY === maxY) {
    return undefined
  }
  return { minX, minY, maxX, maxY }
}

function rectanglePoints(bounds: Bounds): readonly Point[] {
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]
}

function ellipsePoints(bounds: Bounds): readonly Point[] {
  const rx = (bounds.maxX - bounds.minX) / 2
  const ry = (bounds.maxY - bounds.minY) / 2
  const centerX = bounds.minX + rx
  const centerY = bounds.minY + ry
  const count = ellipsePointCount(rx, ry)
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * 2 * Math.PI) / count
    return {
      x: centerX + rx * Math.cos(angle),
      y: centerY + ry * Math.sin(angle),
    }
  })
}

const chordGapMm = 0.2

function ellipsePointCount(rx: number, ry: number): number {
  const shorter = Math.min(rx, ry)
  if (shorter <= chordGapMm) {
    return 8
  }

  const curve = Math.max((rx * rx) / ry, (ry * ry) / rx)
  const step = 2 * Math.acos(1 - chordGapMm / curve)
  return Math.max(8, Math.ceil((2 * Math.PI) / step))
}

function longerSpan(dx: number, dy: number): number {
  return Math.max(Math.abs(dx), Math.abs(dy))
}

function axisSign(delta: number): number {
  return delta < 0 ? -1 : 1
}

export type ShapeKind = 'rectangle' | 'ellipse'

export type ShapeDrag = {
  anchor: Point
  pointer: Point
  kind: ShapeKind
  fromCenter: boolean
  symmetric: boolean
}

type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}
