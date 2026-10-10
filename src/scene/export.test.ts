import { describe, expect, it } from 'vitest'
import { gcodeDocument, polylinesForExport, svgDocument } from './export'
import type { Point, Polyline } from './polyline'

describe('polylinesForExport', () => {
  it('appends the first point when closed and leaves the scene points alone', () => {
    const points = [point(10, 20), point(30, 40)]
    const scene = [line({ points, closed: true })]

    expect(polylinesForExport(scene)[0]?.points).toEqual([
      point(10, 20),
      point(30, 40),
      point(10, 20),
    ])
    expect(scene[0]?.points).toBe(points)
  })

  it('does not repeat the first point of an open polyline', () => {
    const points = [point(10, 20), point(30, 40)]
    expect(polylinesForExport([line({ points })])[0]?.points).toBe(points)
  })

  it('drops a polyline with one point outside the sheet and keeps scene order', () => {
    const inside = [point(10, 20), point(30, 40)]
    const outside = [point(10, 20), point(297.01, 40)]
    const edge = [point(0, 0), point(297, 210)]
    const scene = [
      line({ id: 'inside', points: inside }),
      line({ id: 'outside', points: outside }),
      line({ id: 'edge', points: edge }),
    ]

    expect(
      polylinesForExport(scene).map((polyline) => polyline.points),
    ).toEqual([inside, edge])
    expect(scene).toHaveLength(3)
    expect(scene[1]?.points).toBe(outside)
  })
})

describe('svgDocument', () => {
  it('is an empty sheet document when nothing is written', () => {
    expect(svgDocument([])).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="297" height="210" style="background: white"></svg>',
    )
  })

  it('maps scene y onto the sheet and keeps the element stroke', () => {
    const scene = [
      line({
        points: [point(0, 0), point(297, 210)],
        stroke: '#e03131',
        widthMm: 0.3,
      }),
    ]

    expect(svgDocument(scene)).toBe(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="297" height="210" style="background: white">',
        '  <path d="M 0,210 L 297,0" stroke="#e03131" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round" fill="none" />',
        '</svg>',
      ].join('\n'),
    )
  })

  it('rounds after the y map and does not scale or pad', () => {
    const scene = [line({ points: [point(10.126, 20.454), point(30, 40)] })]
    expect(svgDocument(scene)).toContain('d="M 10.13,189.55 L 30,170"')
  })

  it('omits a polyline that leaves the sheet', () => {
    const scene = [
      line({ points: [point(10, 20), point(30, 40)] }),
      line({ points: [point(1, 1), point(-0.01, 1)] }),
    ]
    const document = svgDocument(scene)
    expect(document).toContain('M 10,190 L 30,170')
    expect(document).not.toContain('-0.01')
    expect(document.match(/<path /g)).toHaveLength(1)
  })
})

describe('gcodeDocument', () => {
  it('is the pen cycle and a return to origin when nothing is written', () => {
    expect(gcodeDocument([])).toBe(
      [
        'M5',
        'G4 P0.5',
        'M3 S1000',
        'G4 P0.5',
        'M5',
        'G4 P0.5',
        'G1 F3000',
        'G0 X0 Y0',
      ].join('\n'),
    )
  })

  it('draws scene coordinates and repeats a closed polyline', () => {
    const points = [point(10, 20), point(30, 40)]
    const scene = [line({ points, closed: true })]

    expect(gcodeDocument(scene)).toBe(
      [
        'M5',
        'G4 P0.5',
        'M3 S1000',
        'G4 P0.5',
        'M5',
        'G4 P0.5',
        'G1 F3000',
        'G0 X10 Y20',
        'M3 S1000',
        'G4 P0.5',
        'G1 X30 Y40',
        'G1 X10 Y20',
        'M5',
        'G4 P0.5',
        'G0 X0 Y0',
      ].join('\n'),
    )
    expect(scene[0]?.points).toEqual(points)
  })

  it('does not repeat an open polyline or flip x', () => {
    const document = gcodeDocument([
      line({ points: [point(10, 20), point(30.789, 40.999)] }),
    ])
    expect(document).toContain('G0 X10 Y20')
    expect(document).toContain('G1 X30.79 Y41')
    expect(document).not.toContain('G1 X10 Y20')
    expect(document).not.toContain('X287')
  })

  it('omits a polyline that leaves the sheet', () => {
    const document = gcodeDocument([
      line({ points: [point(10, 20), point(30, 40)] }),
      line({ points: [point(5, 5), point(5, 210.01)] }),
    ])
    expect(document).toContain('G0 X10 Y20')
    expect(document).not.toContain('Y210.01')
    expect(document.match(/G0 X\d+/g)).toEqual(['G0 X10', 'G0 X0'])
  })

  it('draws the nearer polyline first and starts the next one at its nearer end', () => {
    const far = [point(80, 80), point(25, 25)]
    const near = [point(10, 10), point(20, 20)]
    const scene = [
      line({ id: 'far', points: far }),
      line({ id: 'near', points: near }),
    ]

    expect(gcodeMoves(gcodeDocument(scene))).toEqual([
      'G0 X10 Y10',
      'G1 X20 Y20',
      'G0 X25 Y25',
      'G1 X80 Y80',
      'G0 X0 Y0',
    ])
    expect(scene[0]?.points).toBe(far)
    expect(scene[1]?.points).toBe(near)
    expect(svgDocument(scene).indexOf('M 80,130')).toBeLessThan(
      svgDocument(scene).indexOf('M 10,200'),
    )
  })

  it('starts a closed polyline at the stored end nearer the origin and repeats that point', () => {
    const points = [point(100, 100), point(30, 40)]
    const scene = [line({ points, closed: true })]

    expect(gcodeMoves(gcodeDocument(scene))).toEqual([
      'G0 X30 Y40',
      'G1 X100 Y100',
      'G1 X30 Y40',
      'G0 X0 Y0',
    ])
    expect(scene[0]?.points).toBe(points)
  })

  it('continues from the repeated start of a closed polyline', () => {
    const document = gcodeDocument([
      line({ points: [point(40, 0), point(50, 0)], closed: true }),
      line({ points: [point(51, 0), point(52, 0)] }),
      line({ points: [point(41, 0), point(42, 0)] }),
    ])

    expect(document.match(/G0 X\d+ Y\d+/g)).toEqual([
      'G0 X40 Y0',
      'G0 X41 Y0',
      'G0 X51 Y0',
      'G0 X0 Y0',
    ])
  })
})

function gcodeMoves(document: string): string[] {
  return document
    .split('\n')
    .filter((line) => line.startsWith('G0 X') || line.startsWith('G1 X'))
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
