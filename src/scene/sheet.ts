import type { Point, Polyline } from './polyline'

export const sheetWidthMm = 297
export const sheetHeightMm = 210

export const emptyScene: Scene = []

export function fitSheet(windowSize: WindowSize): SheetFit {
  const frame = frameInsideInset(windowSize)
  if (frame.width <= 0 || frame.height <= 0) {
    return placeSheet(windowSize, 0)
  }

  return placeSheet(windowSize, scaleSheet(frame))
}

export function sceneYToTop(sceneY: number): number {
  return sheetHeightMm - sceneY
}

export function canvasPointToScene(point: Point, fit: SheetFit): Point {
  if (fit.scale <= 0) {
    throw new Error('Cannot map a point onto a sheet with no scale')
  }

  const millimetersFromTop = (point.y - fit.top) / fit.scale
  return {
    x: (point.x - fit.left) / fit.scale,
    y: sceneYToTop(millimetersFromTop),
  }
}

export function panBy(fit: SheetFit, deltaX: number, deltaY: number): SheetFit {
  if (fit.scale <= 0) {
    return fit
  }

  return {
    scale: fit.scale,
    left: fit.left - deltaX,
    top: fit.top - deltaY,
  }
}

export function pinchAt(
  fit: SheetFit,
  anchor: Point,
  deltaY: number,
  fitScale: number,
): SheetFit {
  if (fit.scale <= 0 || fitScale <= 0) {
    return fit
  }

  const nextScale = scaleAfterPinch(fit.scale, deltaY, fitScale)
  if (nextScale === fit.scale) {
    return fit
  }

  return zoomAround(fit, anchor, nextScale)
}

export function resetZoom(fit: SheetFit, windowSize: WindowSize): SheetFit {
  const fitScale = fitSheet(windowSize).scale
  if (fitScale <= 0) {
    return placeSheet(windowSize, 1)
  }
  if (fit.scale <= 0) {
    return placeSheet(windowSize, fitScale)
  }

  return zoomAround(fit, windowCenter(windowSize), fitScale)
}

export function zoomPercent(scale: number, fitScale: number): number {
  if (fitScale <= 0) {
    return 0
  }

  return Math.round((scale / fitScale) * 100)
}

export function viewZoom(scale: number, fitScale: number): number {
  if (!(scale > 0) || !(fitScale > 0)) {
    return 1
  }

  return scale / fitScale
}

export function sheetCenterOnCanvas(fit: SheetFit): Point {
  return {
    x: fit.left + (sheetWidthMm / 2) * fit.scale,
    y: fit.top + (sheetHeightMm / 2) * fit.scale,
  }
}

const sheetInsetPx = 32

function frameInsideInset(windowSize: WindowSize): WindowSize {
  return {
    width: windowSize.width - sheetInsetPx * 2,
    height: windowSize.height - sheetInsetPx * 2,
  }
}

function scaleSheet(frame: WindowSize): number {
  const widthScale = frame.width / sheetWidthMm
  const heightScale = frame.height / sheetHeightMm
  return Math.min(widthScale, heightScale)
}

const minZoomOfFit = 0.1
const maxZoomOfFit = 10

function scaleAfterPinch(
  scale: number,
  deltaY: number,
  fitScale: number,
): number {
  const factor = 1 - deltaY / 500
  if (factor <= 0) {
    return scale
  }

  const next = scale * factor
  return Math.min(
    fitScale * maxZoomOfFit,
    Math.max(fitScale * minZoomOfFit, next),
  )
}

function zoomAround(fit: SheetFit, anchor: Point, nextScale: number): SheetFit {
  const scene = canvasPointToScene(anchor, fit)
  return {
    scale: nextScale,
    left: anchor.x - scene.x * nextScale,
    top: anchor.y - sceneYToTop(scene.y) * nextScale,
  }
}

function windowCenter(windowSize: WindowSize): Point {
  return {
    x: windowSize.width / 2,
    y: windowSize.height / 2,
  }
}

function placeSheet(windowSize: WindowSize, scale: number): SheetFit {
  const width = sheetWidthMm * scale
  const height = sheetHeightMm * scale
  return {
    scale,
    left: (windowSize.width - width) / 2,
    top: (windowSize.height - height) / 2,
  }
}

export type Scene = readonly Polyline[]

export type WindowSize = {
  width: number
  height: number
}

export type SheetFit = {
  scale: number
  left: number
  top: number
}
