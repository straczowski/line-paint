import type { Point } from './polyline'

export function draftPoint(input: DraftPoint): Point {
  const anchor = input.points[input.points.length - 1]
  if (!anchor || !input.shiftHeld) {
    return input.pointer
  }

  return lockToRuler(anchor, input.pointer)
}

export function dragDelta(input: DragDelta): Point {
  const end = input.shiftHeld
    ? lockToRuler(input.start, input.pointer)
    : input.pointer
  return {
    x: end.x - input.start.x,
    y: end.y - input.start.y,
  }
}

export function draggedHandle(input: DraggedHandle): Point {
  if (input.shiftHeld) {
    return lockToRuler(input.origin, input.pointer)
  }

  const delta = dragDelta({
    start: input.start,
    pointer: input.pointer,
    shiftHeld: false,
  })
  return {
    x: input.origin.x + delta.x,
    y: input.origin.y + delta.y,
  }
}

export function lockToRuler(anchor: Point, pointer: Point): Point {
  const dx = pointer.x - anchor.x
  const dy = pointer.y - anchor.y
  const line = nearestRulerLine(dx, dy)
  return projectOnRuler(anchor, dx, dy, line)
}

function nearestRulerLine(dx: number, dy: number): RulerLine {
  let line: RulerLine = 'horizontal'
  let best = dy * dy
  const diagonal = ((dx - dy) * (dx - dy)) / 2
  if (closerRulerLine(diagonal, best)) {
    line = 'diagonal'
    best = diagonal
  }
  const vertical = dx * dx
  if (closerRulerLine(vertical, best)) {
    line = 'vertical'
    best = vertical
  }
  const counterDiagonal = ((dx + dy) * (dx + dy)) / 2
  if (closerRulerLine(counterDiagonal, best)) {
    line = 'counterDiagonal'
  }
  return line
}

function closerRulerLine(distance: number, best: number): boolean {
  const scale = Math.max(distance, best, 1)
  if (Math.abs(distance - best) <= scale * rulerDistanceTie) {
    return false
  }
  return distance < best
}

const rulerDistanceTie = 1e-9

function projectOnRuler(
  anchor: Point,
  dx: number,
  dy: number,
  line: RulerLine,
): Point {
  if (line === 'horizontal') {
    return { x: anchor.x + dx, y: anchor.y }
  }
  if (line === 'vertical') {
    return { x: anchor.x, y: anchor.y + dy }
  }
  if (line === 'diagonal') {
    const share = (dx + dy) / 2
    return { x: anchor.x + share, y: anchor.y + share }
  }

  const share = (dx - dy) / 2
  return { x: anchor.x + share, y: anchor.y - share }
}

type DraftPoint = {
  points: readonly Point[]
  pointer: Point
  shiftHeld: boolean
}

type DragDelta = {
  start: Point
  pointer: Point
  shiftHeld: boolean
}

type DraggedHandle = {
  origin: Point
  start: Point
  pointer: Point
  shiftHeld: boolean
}

type RulerLine = 'horizontal' | 'diagonal' | 'vertical' | 'counterDiagonal'
