import { describe, expect, it } from 'vitest'
import { svgDocument } from './export'
import { polylinesFromSvg } from './import'
import type { Point, Polyline } from './polyline'

describe('polylinesFromSvg', () => {
  it('round-trips an export in place', () => {
    const openPoints = [point(10, 20), point(30, 40)]
    const closedPoints = [point(0, 0), point(297, 210), point(10, 200)]
    const scene = [
      line({ points: openPoints, stroke: '#1e1e1e', widthMm: 0.3 }),
      line({
        points: closedPoints,
        closed: true,
        stroke: '#e03131',
        widthMm: 0.5,
      }),
    ]

    expect(polylinesFromSvg(svgDocument(scene))).toEqual({
      ok: true,
      polylines: [
        {
          points: openPoints,
          closed: false,
          stroke: '#1e1e1e',
          widthMm: 0.3,
        },
        {
          points: closedPoints,
          closed: true,
          stroke: '#e03131',
          widthMm: 0.5,
        },
      ],
    })
  })

  it('accepts an empty document', () => {
    expect(polylinesFromSvg(svgDocument([]))).toEqual({
      ok: true,
      polylines: [],
    })
    expect(polylinesFromSvg(`${sheetOpen(297, 210)}\n\n</svg>`)).toEqual({
      ok: true,
      polylines: [],
    })
  })

  it('fits a wide viewBox to the sheet width and centers it vertically', () => {
    const text = sheet(400, 100, path('M 0,0 L 400,100', '#000000', 2))

    expect(polylinesFromSvg(text)).toEqual({
      ok: true,
      polylines: [
        {
          points: [point(0, 142.125), point(297, 67.875)],
          closed: false,
          stroke: '#000000',
          widthMm: 1.485,
        },
      ],
    })
  })

  it('fits a tall viewBox to the sheet height and centers it horizontally', () => {
    const text = sheet(100, 400, path('M 0,0 L 100,400', '#000000', 2))

    expect(polylinesFromSvg(text)).toEqual({
      ok: true,
      polylines: [
        {
          points: [point(122.25, 210), point(174.75, 0)],
          closed: false,
          stroke: '#000000',
          widthMm: 1.05,
        },
      ],
    })
  })

  it('refuses a circle', () => {
    const text = sheet(
      297,
      210,
      `${path('M 0,0 L 10,10')}\n  <circle cx="1" cy="1" r="1" />`,
    )
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })

  it('refuses a line element', () => {
    const text = sheet(297, 210, '<line x1="0" y1="0" x2="10" y2="10" />')
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })

  it('refuses a curve', () => {
    const text = sheet(297, 210, path('M 0,0 C 1,1 2,2 3,3'))
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })

  it('refuses a group', () => {
    const text = sheet(297, 210, `<g>\n    ${path('M 0,0 L 10,10')}\n  </g>`)
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })

  it('refuses a transform', () => {
    const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="297" height="210" style="background: white" transform="rotate(1)">
  ${path('M 0,0 L 10,10')}
</svg>`
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })

  it('refuses an extra attribute', () => {
    const text = sheet(
      297,
      210,
      '<path d="M 0,0 L 10,10" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" id="a" />',
    )
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })

  it('refuses a reordered attribute', () => {
    const text = sheet(
      297,
      210,
      '<path stroke="#000000" d="M 0,0 L 10,10" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" />',
    )
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })

  it('refuses a path with one point', () => {
    const text = sheet(297, 210, path('M 10,20'))
    expect(polylinesFromSvg(text)).toEqual({ ok: false })
  })
})

function sheet(width: number, height: number, body: string): string {
  return `${sheetOpen(width, height)}\n  ${body}\n</svg>`
}

function sheetOpen(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background: white">`
}

function path(data: string, stroke = '#000000', width = 1): string {
  return `<path d="${data}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
}

function line(fields: Partial<Polyline> & Pick<Polyline, 'points'>): Polyline {
  return {
    id: 'line',
    closed: false,
    stroke: '#1e1e1e',
    widthMm: 0.3,
    ...fields,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
