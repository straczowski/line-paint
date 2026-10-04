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
