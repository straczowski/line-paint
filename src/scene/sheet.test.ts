import { describe, expect, it } from 'vitest'
import {
  canvasPointToScene,
  emptyScene,
  fitSheet,
  sceneYToTop,
  sheetHeightMm,
  sheetWidthMm,
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
})
