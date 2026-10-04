import {
  defaultPolylineStroke,
  defaultPolylineWidthMm,
} from '../scene/polyline'
import type { Point } from '../scene/polyline'
import type { SelectionBounds } from '../scene/selection'
import { sceneYToTop, sheetHeightMm, sheetWidthMm } from '../scene/sheet'
import type { Scene, SheetFit, WindowSize } from '../scene/sheet'

export function paintStaticCanvas(input: PaintStaticCanvasInput): void {
  const { context, scene, fit, size } = input
  matchCanvasSize(context, size)
  clearCanvas(context, size)
  strokeSheetBorder(context, fit)
  for (const polyline of scene) {
    paintStroke(context, {
      points: polyline.points,
      fit,
      color: polyline.stroke,
      widthMm: polyline.widthMm,
    })
  }
}

export function paintOverlay(input: PaintOverlayInput): void {
  const { context, draftPoints, preview, bounds, marquee, handles, fit, size } =
    input
  matchCanvasSize(context, size)
  clearOverlay(context, size)
  paintStroke(context, {
    points: draftPoints,
    fit,
    color: defaultPolylineStroke,
    widthMm: defaultPolylineWidthMm,
  })
  for (const stroke of preview) {
    paintStroke(context, {
      points: stroke.points,
      fit,
      color: defaultPolylineStroke,
      widthMm: stroke.widthMm,
    })
  }
  if (bounds) {
    strokeSelectionBounds(context, { bounds, fit })
  }
  if (marquee) {
    strokeMarquee(context, { ...marquee, fit })
  }
  paintHandles(context, handles, fit)
}

function matchCanvasSize(
  context: CanvasRenderingContext2D,
  size: WindowSize,
): void {
  context.canvas.width = size.width
  context.canvas.height = size.height
}

function clearCanvas(
  context: CanvasRenderingContext2D,
  size: WindowSize,
): void {
  context.fillStyle = canvasWhite
  context.fillRect(0, 0, size.width, size.height)
}

function clearOverlay(
  context: CanvasRenderingContext2D,
  size: WindowSize,
): void {
  context.clearRect(0, 0, size.width, size.height)
}

function strokeSheetBorder(
  context: CanvasRenderingContext2D,
  fit: SheetFit,
): void {
  const topLeft = scenePointToCanvas({ x: 0, y: sheetHeightMm }, fit)
  const bottomRight = scenePointToCanvas({ x: sheetWidthMm, y: 0 }, fit)
  const left = alignHairline(topLeft.x)
  const top = alignHairline(topLeft.y)
  const right = alignHairline(bottomRight.x)
  const bottom = alignHairline(bottomRight.y)
  context.strokeStyle = sheetHairline
  context.lineWidth = 1
  context.strokeRect(left, top, right - left, bottom - top)
}

function alignHairline(pixel: number): number {
  return Math.round(pixel) + 0.5
}

function strokeSelectionBounds(
  context: CanvasRenderingContext2D,
  paint: BoundsPaint,
): void {
  const topLeft = scenePointToCanvas(
    { x: paint.bounds.minX, y: paint.bounds.maxY },
    paint.fit,
  )
  const bottomRight = scenePointToCanvas(
    { x: paint.bounds.maxX, y: paint.bounds.minY },
    paint.fit,
  )
  context.strokeStyle = selectionColor
  context.lineWidth = 1
  context.strokeRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  )
}

function paintHandles(
  context: CanvasRenderingContext2D,
  handles: readonly Handle[],
  fit: SheetFit,
): void {
  for (const handle of handles) {
    if (!handle.selected) {
      paintHandle(context, handle, fit)
    }
  }
  for (const handle of handles) {
    if (handle.selected) {
      paintHandle(context, handle, fit)
    }
  }
}

const handleRadiusPx = 4

function paintHandle(
  context: CanvasRenderingContext2D,
  handle: Handle,
  fit: SheetFit,
): void {
  const center = scenePointToCanvas(handle.point, fit)
  context.beginPath()
  context.arc(center.x, center.y, handleRadiusPx, 0, Math.PI * 2)
  context.fillStyle = handle.selected ? selectionColor : canvasWhite
  context.strokeStyle = selectionColor
  context.lineWidth = 1
  context.fill()
  context.stroke()
}

function strokeMarquee(
  context: CanvasRenderingContext2D,
  marquee: MarqueePaint,
): void {
  const start = scenePointToCanvas(marquee.start, marquee.fit)
  const end = scenePointToCanvas(marquee.end, marquee.fit)
  context.strokeStyle = selectionColor
  context.lineWidth = 1
  context.strokeRect(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y),
  )
}

function paintStroke(
  context: CanvasRenderingContext2D,
  stroke: DrawnStroke,
): void {
  const first = stroke.points[0]
  if (!first) {
    return
  }

  applyPen(context, stroke.color, stroke.widthMm, stroke.fit.scale)
  if (stroke.points.length === 1) {
    fillPointMark(context, first, stroke.fit)
    return
  }

  strokeThrough(context, first, stroke.points, stroke.fit)
}

function applyPen(
  context: CanvasRenderingContext2D,
  color: string,
  widthMm: number,
  scale: number,
): void {
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = Math.max(minimumStrokePx, widthMm * scale)
  context.lineCap = 'round'
  context.lineJoin = 'round'
}

function fillPointMark(
  context: CanvasRenderingContext2D,
  point: Point,
  fit: SheetFit,
): void {
  const canvasPoint = scenePointToCanvas(point, fit)
  context.beginPath()
  context.arc(
    canvasPoint.x,
    canvasPoint.y,
    context.lineWidth / 2,
    0,
    Math.PI * 2,
  )
  context.fill()
}

function strokeThrough(
  context: CanvasRenderingContext2D,
  first: Point,
  points: readonly Point[],
  fit: SheetFit,
): void {
  const start = scenePointToCanvas(first, fit)
  context.beginPath()
  context.moveTo(start.x, start.y)
  for (const point of points.slice(1)) {
    const canvasPoint = scenePointToCanvas(point, fit)
    context.lineTo(canvasPoint.x, canvasPoint.y)
  }
  context.stroke()
}

function scenePointToCanvas(point: Point, fit: SheetFit): CanvasPoint {
  return {
    x: fit.left + point.x * fit.scale,
    y: fit.top + sceneYToTop(point.y) * fit.scale,
  }
}

const canvasWhite = '#ffffff'
const sheetHairline = '#c5c5d0'
const selectionColor = '#6965db'
const minimumStrokePx = 1

type PaintStaticCanvasInput = {
  context: CanvasRenderingContext2D
  scene: Scene
  fit: SheetFit
  size: WindowSize
}

type PaintOverlayInput = {
  context: CanvasRenderingContext2D
  draftPoints: readonly Point[]
  preview: readonly SelectionStroke[]
  bounds: SelectionBounds | undefined
  marquee: Marquee | undefined
  handles: readonly Handle[]
  fit: SheetFit
  size: WindowSize
}

type Handle = {
  point: Point
  selected: boolean
}

type SelectionStroke = {
  points: readonly Point[]
  widthMm: number
}

type Marquee = {
  start: Point
  end: Point
}

type BoundsPaint = {
  bounds: SelectionBounds
  fit: SheetFit
}

type MarqueePaint = Marquee & {
  fit: SheetFit
}

type DrawnStroke = {
  points: readonly Point[]
  fit: SheetFit
  color: string
  widthMm: number
}

type CanvasPoint = {
  x: number
  y: number
}
