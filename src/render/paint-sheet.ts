import type { Blueprint } from '../scene/blueprint'
import { blueprintCenter } from '../scene/blueprint'
import {
  defaultPolylineStroke,
  defaultPolylineWidthMm,
} from '../scene/polyline'
import type { Point } from '../scene/polyline'
import { rotateHandleRadiusPx } from '../scene/rotate'
import { scaleHandleHalfPx } from '../scene/scale'
import type { SelectionBounds } from '../scene/selection'
import { sceneYToTop, sheetHeightMm, sheetWidthMm } from '../scene/sheet'
import type { Scene, SheetFit, WindowSize } from '../scene/sheet'

export function paintStaticCanvas(input: PaintStaticCanvasInput): void {
  const { context, scene, fit, size } = input
  matchCanvasSize(context, size)
  clearCanvas(context, size)
  paintSheet(context, fit)
  paintBlueprints(context, input.images ?? [], fit, input.onBitmap)
  for (const polyline of scene) {
    paintStroke(context, {
      points: pointsWithClosingSegment(polyline.points, polyline.closed),
      fit,
      color: polyline.stroke,
      widthMm: polyline.widthMm,
    })
  }
}

export function paintOverlay(input: PaintOverlayInput): void {
  const {
    context,
    draftPoints,
    preview,
    bounds,
    rotatedBounds,
    dashed,
    scaleHandles,
    rotateHandle,
    marquee,
    handles,
    fit,
    size,
  } = input
  matchCanvasSize(context, size)
  clearOverlay(context, size)
  paintBlueprints(context, input.blueprints ?? [], fit, input.onBitmap)
  paintStroke(context, {
    points: draftPoints,
    fit,
    color: input.draftColor ?? defaultPolylineStroke,
    widthMm: defaultPolylineWidthMm,
  })
  for (const stroke of preview) {
    paintStroke(context, {
      points: pointsWithClosingSegment(stroke.points, stroke.closed),
      fit,
      color: selectionColor,
      widthMm: stroke.widthMm,
    })
  }
  if (bounds) {
    strokeSelectionBounds(context, { bounds, fit, dashed })
  }
  if (rotatedBounds) {
    strokeRotatedBounds(context, rotatedBounds, fit, dashed)
  }
  if (input.scaleHandlePoints) {
    paintScaleHandlePoints(context, input.scaleHandlePoints, fit)
  } else if (scaleHandles && bounds) {
    paintScaleHandles(context, bounds, fit)
  }
  if (rotateHandle) {
    paintRotateHandle(context, rotateHandle, fit)
  }
  if (marquee) {
    strokeMarquee(context, { ...marquee, fit })
  }
  paintHandles(context, handles, fit)
}

function matchCanvasSize(context: SheetContext, size: WindowSize): void {
  context.canvas.width = size.width
  context.canvas.height = size.height
}

function clearCanvas(context: SheetContext, size: WindowSize): void {
  context.fillStyle = outsideSheet
  context.fillRect(0, 0, size.width, size.height)
}

function clearOverlay(context: SheetContext, size: WindowSize): void {
  context.clearRect(0, 0, size.width, size.height)
}

function paintSheet(context: SheetContext, fit: SheetFit): void {
  const topLeft = scenePointToCanvas({ x: 0, y: sheetHeightMm }, fit)
  const bottomRight = scenePointToCanvas({ x: sheetWidthMm, y: 0 }, fit)
  context.fillStyle = canvasWhite
  context.fillRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  )
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
  context: SheetContext,
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
  context.setLineDash(paint.dashed ? groupDash : [])
  context.strokeRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  )
  context.setLineDash([])
}

function strokeRotatedBounds(
  context: SheetContext,
  corners: readonly Point[],
  fit: SheetFit,
  dashed: boolean,
): void {
  const first = corners[0]
  if (!first) {
    return
  }

  context.strokeStyle = selectionColor
  context.lineWidth = 1
  context.setLineDash(dashed ? groupDash : [])
  const start = scenePointToCanvas(first, fit)
  context.beginPath()
  context.moveTo(start.x, start.y)
  for (const corner of corners.slice(1)) {
    const next = scenePointToCanvas(corner, fit)
    context.lineTo(next.x, next.y)
  }
  context.lineTo(start.x, start.y)
  context.stroke()
  context.setLineDash([])
}

function paintRotateHandle(
  context: SheetContext,
  point: Point,
  fit: SheetFit,
): void {
  const center = scenePointToCanvas(point, fit)
  context.beginPath()
  context.arc(center.x, center.y, rotateHandleRadiusPx, 0, Math.PI * 2)
  context.fillStyle = canvasWhite
  context.strokeStyle = selectionColor
  context.lineWidth = 1
  context.fill()
  context.stroke()
}

function paintBlueprints(
  context: SheetContext,
  images: readonly Blueprint[],
  fit: SheetFit,
  onBitmap: (() => void) | undefined,
): void {
  if (fit.scale <= 0) {
    return
  }

  for (const image of images) {
    const bitmap = bitmapFor(image.href, onBitmap)
    if (!bitmap) {
      continue
    }

    const center = scenePointToCanvas(blueprintCenter(image), fit)
    context.save()
    context.translate(center.x, center.y)
    context.rotate(-image.rotation)
    context.drawImage(
      bitmap,
      (-image.widthMm * fit.scale) / 2,
      (-image.heightMm * fit.scale) / 2,
      image.widthMm * fit.scale,
      image.heightMm * fit.scale,
    )
    context.restore()
  }
}

function bitmapFor(
  href: string,
  onBitmap: (() => void) | undefined,
): HTMLImageElement | undefined {
  const loaded = readyBitmaps.get(href)
  if (loaded) {
    return loaded
  }
  if (pendingBitmaps.has(href) || typeof Image === 'undefined') {
    return undefined
  }

  const image = new Image()
  pendingBitmaps.add(href)
  image.onload = () => {
    pendingBitmaps.delete(href)
    readyBitmaps.set(href, image)
    onBitmap?.()
  }
  image.src = href
  if (image.complete && image.naturalWidth > 0) {
    pendingBitmaps.delete(href)
    readyBitmaps.set(href, image)
    return image
  }
  return undefined
}

const readyBitmaps = new Map<string, HTMLImageElement>()
const pendingBitmaps = new Set<string>()

function paintScaleHandles(
  context: SheetContext,
  bounds: SelectionBounds,
  fit: SheetFit,
): void {
  paintScaleHandlePoints(context, scaleCorners(bounds), fit)
}

function paintScaleHandlePoints(
  context: SheetContext,
  points: readonly Point[],
  fit: SheetFit,
): void {
  const side = scaleHandleHalfPx * 2
  context.fillStyle = canvasWhite
  context.strokeStyle = selectionColor
  context.lineWidth = 1
  for (const corner of points) {
    const center = scenePointToCanvas(corner, fit)
    const left = center.x - scaleHandleHalfPx
    const top = center.y - scaleHandleHalfPx
    context.fillRect(left, top, side, side)
    context.strokeRect(left, top, side, side)
  }
}

function scaleCorners(bounds: SelectionBounds): readonly Point[] {
  return [
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.minX, y: bounds.minY },
  ]
}

function paintHandles(
  context: SheetContext,
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
  context: SheetContext,
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

function strokeMarquee(context: SheetContext, marquee: MarqueePaint): void {
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

export function pointsWithClosingSegment(
  points: readonly Point[],
  closed: boolean,
): readonly Point[] {
  const first = points[0]
  if (!closed || !first || points.length < 2) {
    return points
  }

  return [...points, first]
}

function paintStroke(context: SheetContext, stroke: DrawnStroke): void {
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
  context: SheetContext,
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
  context: SheetContext,
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
  context: SheetContext,
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

type SheetContext = {
  canvas: { width: number; height: number }
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  lineWidth: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  fillRect(x: number, y: number, width: number, height: number): void
  clearRect(x: number, y: number, width: number, height: number): void
  setLineDash(segments: readonly number[]): void
  strokeRect(x: number, y: number, width: number, height: number): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void
  fill(): void
  stroke(): void
  save(): void
  restore(): void
  translate(x: number, y: number): void
  rotate(angle: number): void
  drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void
}

const outsideSheet = '#f1f3f5'
const canvasWhite = '#ffffff'
const sheetHairline = '#c5c5d0'
const selectionColor = '#6965db'
const groupDash = [4, 3]
const minimumStrokePx = 1

type PaintStaticCanvasInput = {
  context: SheetContext
  scene: Scene
  images?: readonly Blueprint[]
  onBitmap?: () => void
  fit: SheetFit
  size: WindowSize
}

type PaintOverlayInput = {
  context: SheetContext
  draftPoints: readonly Point[]
  draftColor?: string
  preview: readonly SelectionStroke[]
  bounds: SelectionBounds | undefined
  rotatedBounds: readonly Point[] | undefined
  dashed: boolean
  scaleHandles: boolean
  rotateHandle: Point | undefined
  marquee: Marquee | undefined
  handles: readonly Handle[]
  blueprints?: readonly Blueprint[]
  scaleHandlePoints?: readonly Point[]
  onBitmap?: () => void
  fit: SheetFit
  size: WindowSize
}

type Handle = {
  point: Point
  selected: boolean
}

type SelectionStroke = {
  points: readonly Point[]
  closed: boolean
  widthMm: number
}

type Marquee = {
  start: Point
  end: Point
}

type BoundsPaint = {
  bounds: SelectionBounds
  fit: SheetFit
  dashed: boolean
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
