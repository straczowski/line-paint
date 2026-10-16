import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from '../scene/polyline'
import { sceneWithoutHiddenPolylines } from '../scene/selection'
import type { SheetFit, WindowSize } from '../scene/sheet'
import {
  paintOverlay,
  paintStaticCanvas,
  pointsWithClosingSegment,
} from './paint-sheet'

describe('sheet paint', () => {
  it('fills the window grey and the sheet white', () => {
    const page = new RecordingPen()
    paintStaticCanvas({
      context: page,
      scene: [],
      fit: { scale: 2, left: 8, top: 4 },
      size,
    })

    expect(page.fills).toEqual([
      { color: '#f1f3f5', x: 0, y: 0, width: 400, height: 300 },
      { color: '#ffffff', x: 8, y: 4, width: 594, height: 420 },
    ])
  })
})

describe('pointsWithClosingSegment', () => {
  it('adds the return to the first point when closed', () => {
    const points = [point(0, 0), point(10, 0), point(10, 10)]

    expect(pointsWithClosingSegment(points, true)).toEqual([
      ...points,
      point(0, 0),
    ])
  })

  it('leaves the stored points alone when open', () => {
    const points = [point(0, 0), point(10, 0)]

    expect(pointsWithClosingSegment(points, false)).toBe(points)
    expect(pointsWithClosingSegment([point(1, 1)], true)).toEqual([point(1, 1)])
  })
})

describe('selection paint', () => {
  const chosen = stroke(
    'chosen',
    [point(0, 0), point(10, 0), point(10, 10)],
    true,
    '#e03131',
  )
  const other = stroke('other', [point(0, 20), point(10, 20)])
  const scene = [chosen, other]

  it('paints a selected stroke in the accent and keeps the other stored', () => {
    const page = new RecordingPen()
    paintStaticCanvas({
      context: page,
      scene: sceneWithoutHiddenPolylines(scene, ['chosen']),
      fit,
      size,
    })

    expect(page.strokes).toEqual(['#1e1e1e'])
    expect(chosen.stroke).toBe('#e03131')

    const accent = new RecordingPen()
    paintOverlay({
      context: accent,
      draftPoints: [],
      preview: [
        { points: chosen.points, closed: true, widthMm: chosen.widthMm },
      ],
      bounds: undefined,
      rotatedBounds: undefined,
      dashed: false,
      scaleHandles: false,
      rotateHandle: undefined,
      marquee: undefined,
      handles: [],
      fit,
      size,
    })

    expect(accent.strokes).toEqual(['#6965db'])

    const dashed = new RecordingPen()
    paintOverlay({
      context: dashed,
      draftPoints: [],
      preview: [],
      bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      rotatedBounds: undefined,
      dashed: true,
      scaleHandles: false,
      rotateHandle: undefined,
      marquee: undefined,
      handles: [],
      fit,
      size,
    })
    const solid = new RecordingPen()
    paintOverlay({
      context: solid,
      draftPoints: [],
      preview: [],
      bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      rotatedBounds: undefined,
      dashed: false,
      scaleHandles: false,
      rotateHandle: undefined,
      marquee: undefined,
      handles: [],
      fit,
      size,
    })

    expect(dashed.dashes).toEqual([[4, 3], []])
    expect(solid.dashes).toEqual([[], []])
    const line = accent.lines[0]
    expect(line?.[0]).toEqual(point(0, 210))
    expect(line?.[line.length - 1]).toEqual(line?.[0])
  })

  it('paints a draft in the stored default and an alt-move original in its stroke', () => {
    const draft = new RecordingPen()
    paintOverlay({
      context: draft,
      draftPoints: [point(1, 2), point(4, 5)],
      preview: [],
      bounds: undefined,
      rotatedBounds: undefined,
      dashed: false,
      scaleHandles: false,
      rotateHandle: undefined,
      marquee: undefined,
      handles: [],
      fit,
      size,
    })

    expect(draft.strokes).toEqual(['#1e1e1e'])

    const ink = new RecordingPen()
    paintOverlay({
      context: ink,
      draftPoints: [point(1, 2), point(4, 5)],
      draftColor: '#e03131',
      preview: [],
      bounds: undefined,
      rotatedBounds: undefined,
      dashed: false,
      scaleHandles: false,
      rotateHandle: undefined,
      marquee: undefined,
      handles: [],
      fit,
      size,
    })

    expect(ink.strokes).toEqual(['#e03131'])

    const handle = new RecordingPen()
    paintOverlay({
      context: handle,
      draftPoints: [],
      preview: [],
      bounds: undefined,
      rotatedBounds: undefined,
      dashed: false,
      scaleHandles: false,
      rotateHandle: point(5, 18),
      marquee: undefined,
      handles: [],
      fit,
      size,
    })

    expect(handle.arcs).toEqual([{ x: 5, y: 192, radius: 4 }])
    expect(handle.paintedFills).toEqual(['#ffffff'])
    expect(handle.strokes).toContain('#6965db')

    const original = new RecordingPen()
    paintStaticCanvas({
      context: original,
      scene,
      fit,
      size,
    })

    expect(original.strokes).toEqual(['#e03131', '#1e1e1e'])
  })

  it('translates a move without baking the delta into the points', () => {
    const page = new RecordingPen()
    const points = [point(0, 0), point(10, 0)]
    paintOverlay({
      context: page,
      draftPoints: [],
      preview: [{ points, closed: false, widthMm: 0.3 }],
      bounds: undefined,
      rotatedBounds: undefined,
      dashed: false,
      scaleHandles: false,
      rotateHandle: undefined,
      marquee: undefined,
      handles: [],
      gesturePicture: { kind: 'move', delta: point(4, 1), draw: 'transform' },
      fit: { scale: 2, left: 0, top: 0 },
      size,
    })

    expect(page.moves).toEqual([{ x: 8, y: -2 }])
    expect(page.lines[0]?.[0]).toEqual(point(0, 420))
    expect(points).toEqual([point(0, 0), point(10, 0)])
  })
})

const fit: SheetFit = { scale: 1, left: 0, top: 0 }
const size: WindowSize = { width: 400, height: 300 }

class RecordingPen {
  canvas = { width: 0, height: 0 }
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000'
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000'
  lineWidth = 1
  lineCap: CanvasLineCap = 'butt'
  lineJoin: CanvasLineJoin = 'miter'
  readonly strokes: string[] = []
  readonly moves: Point[] = []
  readonly lines: Point[][] = []
  readonly fills: Fill[] = []
  readonly arcs: { x: number; y: number; radius: number }[] = []
  readonly paintedFills: string[] = []
  private current: Point[] = []

  fillRect(x: number, y: number, width: number, height: number): void {
    if (typeof this.fillStyle === 'string') {
      this.fills.push({ color: this.fillStyle, x, y, width, height })
    }
  }
  clearRect(): void {}
  dash: readonly number[] = []
  readonly dashes: number[][] = []
  setLineDash(segments: readonly number[]): void {
    this.dash = segments
    this.dashes.push([...segments])
  }
  strokeRect(): void {}
  beginPath(): void {}
  arc(x: number, y: number, radius: number): void {
    this.arcs.push({ x, y, radius })
  }
  fill(): void {
    if (typeof this.fillStyle === 'string') {
      this.paintedFills.push(this.fillStyle)
    }
  }

  moveTo(x: number, y: number): void {
    this.current = [point(x, y)]
  }

  lineTo(x: number, y: number): void {
    this.current.push(point(x, y))
  }

  stroke(): void {
    if (typeof this.strokeStyle === 'string') {
      this.strokes.push(this.strokeStyle)
    }
    this.lines.push(this.current)
    this.current = []
  }
  save(): void {}
  restore(): void {}
  translate(x: number, y: number): void {
    this.moves.push(point(x, y))
  }
  rotate(): void {}
  drawImage(): void {}
}

function stroke(
  id: string,
  points: readonly Point[],
  closed = false,
  color = '#1e1e1e',
): Polyline {
  return {
    id,
    points,
    closed,
    stroke: color,
    widthMm: 0.3,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}

type Fill = {
  color: string
  x: number
  y: number
  width: number
  height: number
}
