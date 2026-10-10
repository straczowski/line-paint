import { describe, expect, it } from 'vitest'
import {
  canvasPointToScene,
  emptyScene,
  fitSheet,
  panBy,
  pinchAt,
  resetZoom,
  sceneYToTop,
  sheetCenterOnCanvas,
  sheetHeightMm,
  sheetWidthMm,
  zoomPercent,
} from './sheet'

describe('sheet', () => {
  it('is A4 landscape in millimeters', () => {
    expect(sheetWidthMm).toBe(297)
    expect(sheetHeightMm).toBe(210)
  })

  it('starts as an empty list', () => {
    expect(emptyScene).toEqual([])
  })

  it('maps a scene y onto a top-left y', () => {
    expect(sceneYToTop(0)).toBe(210)
    expect(sceneYToTop(210)).toBe(0)
    expect(sceneYToTop(10)).toBe(200)
  })

  it('fits the sheet inside a 32 px inset and centers it', () => {
    const wide = fitSheet({ width: 1000, height: 800 })
    expect(wide.scale).toBeCloseTo(936 / 297)
    expect(wide.left).toBeCloseTo(32)
    expect(wide.top).toBeCloseTo((800 - 210 * wide.scale) / 2)
    expect(wide.top).toBeGreaterThan(32)

    const short = fitSheet({ width: 800, height: 400 })
    expect(short.scale).toBeCloseTo(336 / 210)
    expect(short.top).toBeCloseTo(32)
    expect(short.left).toBeCloseTo((800 - 297 * short.scale) / 2)
    expect(short.left).toBeGreaterThan(32)
  })

  it('drops the scale to zero when the inset does not fit', () => {
    const fit = fitSheet({ width: 40, height: 40 })
    expect(fit.scale).toBe(0)
    expect(fit.left).toBe(20)
    expect(fit.top).toBe(20)
  })

  it('maps a canvas point back to y-up millimeters', () => {
    const fit = fitSheet({ width: 1000, height: 800 })
    const origin = canvasPointToScene(
      { x: fit.left, y: fit.top + sheetHeightMm * fit.scale },
      fit,
    )
    const outside = canvasPointToScene(
      { x: fit.left - 10 * fit.scale, y: fit.top - 10 * fit.scale },
      fit,
    )

    expect(origin.x).toBeCloseTo(0)
    expect(origin.y).toBeCloseTo(0)
    expect(outside).toEqual({ x: -10, y: sheetHeightMm + 10 })
  })

  it('refuses to map a point when the sheet has no scale', () => {
    const fit = fitSheet({ width: 40, height: 40 })
    expect(() => canvasPointToScene({ x: 0, y: 0 }, fit)).toThrow(/scale/)
  })

  it('pans the sheet and leaves the scale', () => {
    const fit = { scale: 2, left: 10, top: 20 }
    expect(panBy(fit, 5, -3)).toEqual({ scale: 2, left: 5, top: 23 })
    expect(fit).toEqual({ scale: 2, left: 10, top: 20 })
  })

  it('does nothing when a pan has no scale', () => {
    const fit = fitSheet({ width: 40, height: 40 })
    expect(panBy(fit, 5, 5)).toBe(fit)
  })

  it('pinches toward a point and clamps against the fitted scale', () => {
    const fitScale = 2
    const fit = { scale: 2, left: 0, top: 0 }
    const anchor = { x: 100, y: 80 }
    const before = canvasPointToScene(anchor, fit)
    const zoomed = pinchAt(fit, anchor, -250, fitScale)

    expect(zoomed.scale).toBeCloseTo(3)
    const after = canvasPointToScene(anchor, zoomed)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    expect(pinchAt(fit, anchor, -5000, fitScale).scale).toBe(20)
    expect(pinchAt(fit, anchor, 490, fitScale).scale).toBe(0.2)
  })

  it('leaves the view when a pinch factor is not positive', () => {
    const fit = { scale: 2, left: 4, top: 6 }
    expect(pinchAt(fit, { x: 1, y: 1 }, 500, 2)).toBe(fit)
    expect(pinchAt(fit, { x: 1, y: 1 }, 800, 2)).toBe(fit)
  })

  it('does nothing when a pinch has no scale', () => {
    const fit = fitSheet({ width: 40, height: 40 })
    const zoomed = { scale: 2, left: 0, top: 0 }
    expect(pinchAt(fit, { x: 0, y: 0 }, -100, 2)).toBe(fit)
    expect(pinchAt(zoomed, { x: 0, y: 0 }, -100, 0)).toBe(zoomed)
  })

  it('resets zoom to the fitted scale around the window center', () => {
    const windowSize = { width: 800, height: 600 }
    const fitScale = fitSheet(windowSize).scale
    const fit = { scale: fitScale * 2, left: 40, top: 10 }
    const center = { x: 400, y: 300 }
    const before = canvasPointToScene(center, fit)
    const next = resetZoom(fit, windowSize)

    expect(next.scale).toBeCloseTo(fitScale)
    const after = canvasPointToScene(center, next)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('centers the sheet at scale 1 when the fit scale is zero', () => {
    const windowSize = { width: 40, height: 40 }
    const next = resetZoom(fitSheet(windowSize), windowSize)

    expect(next.scale).toBe(1)
    expect(next.left).toBeCloseTo((40 - sheetWidthMm) / 2)
    expect(next.top).toBeCloseTo((40 - sheetHeightMm) / 2)
  })

  it('rounds the zoom percentage against the fitted scale', () => {
    const fitScale = fitSheet({ width: 1000, height: 800 }).scale
    expect(zoomPercent(fitScale, fitScale)).toBe(100)
    expect(zoomPercent(fitScale * 2, fitScale)).toBe(200)
    expect(zoomPercent(fitScale * 0.156, fitScale)).toBe(16)
    expect(zoomPercent(1, 0)).toBe(0)
  })

  it('puts the hint at the center of the sheet', () => {
    const fit = fitSheet({ width: 1000, height: 800 })
    const center = sheetCenterOnCanvas(fit)
    expect(center.x).toBeCloseTo(fit.left + (sheetWidthMm * fit.scale) / 2)
    expect(center.y).toBeCloseTo(fit.top + (sheetHeightMm * fit.scale) / 2)

    const panned = panBy(fit, 40, -20)
    const moved = sheetCenterOnCanvas(panned)
    expect(moved.x).toBeCloseTo(center.x - 40)
    expect(moved.y).toBeCloseTo(center.y + 20)
  })
})
