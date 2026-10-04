import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from './polyline'
import {
  polylineAt,
  selectionBounds,
  touchedPolylineIds,
  translatePolylines,
} from './selection'

describe('polylineAt', () => {
  const scene = [stroke('line', [point(0, 0), point(10, 0)])]

  it('hits within 3 mm of the stroke and misses beyond it', () => {
    expect(polylineAt(scene, point(5, 3))).toBe('line')
    expect(polylineAt(scene, point(5, -3))).toBe('line')
    expect(polylineAt(scene, point(12, 0))).toBe('line')
    expect(polylineAt(scene, point(5, 3.1))).toBeUndefined()
    expect(polylineAt(scene, point(14, 0))).toBeUndefined()
  })

  it('chooses the later polyline when both are within the slop', () => {
    const stacked = [
      stroke('lower', [point(0, 0), point(10, 0)]),
      stroke('upper', [point(0, 2), point(10, 2)]),
    ]

    expect(polylineAt(stacked, point(5, 1.2))).toBe('upper')
  })

  it('misses the empty inside of a multi-polyline bounds', () => {
    const scene = [
      stroke('left', [point(0, 0), point(0, 40)]),
      stroke('right', [point(40, 0), point(40, 40)]),
    ]

    expect(polylineAt(scene, point(20, 20))).toBeUndefined()
  })

  it('misses the empty inside of the bounds', () => {
    const square = [
      stroke('box', [point(0, 0), point(40, 0), point(40, 40), point(0, 40)]),
    ]

    expect(polylineAt(square, point(20, 20))).toBeUndefined()
  })

  it('counts the return segment of a closed polyline', () => {
    const square = [point(0, 0), point(10, 0), point(10, 10), point(0, 10)]
    const closed = [stroke('box', square, true)]
    const open = [stroke('box', square, false)]

    expect(polylineAt(closed, point(-3, 5))).toBe('box')
    expect(polylineAt(open, point(-3, 5))).toBeUndefined()
  })
})

describe('touchedPolylineIds', () => {
  const horizontal = stroke('horizontal', [point(0, 0), point(10, 0)])
  const aside = stroke('aside', [point(0, 20), point(10, 20)])

  it('selects a polyline the rectangle crosses', () => {
    expect(
      touchedPolylineIds([horizontal, aside], {
        start: point(4, -5),
        end: point(6, 5),
      }),
    ).toEqual(['horizontal'])
  })

  it('selects a polyline that lies inside the rectangle', () => {
    expect(
      touchedPolylineIds([horizontal, aside], {
        start: point(-1, -1),
        end: point(11, 1),
      }),
    ).toEqual(['horizontal'])
  })

  it('counts a closed return segment the rectangle only crosses', () => {
    const square = [point(0, 0), point(10, 0), point(10, 10), point(0, 10)]

    expect(
      touchedPolylineIds([stroke('box', square, true)], {
        start: point(-2, 4),
        end: point(0.5, 6),
      }),
    ).toEqual(['box'])
    expect(
      touchedPolylineIds([stroke('box', square, false)], {
        start: point(-2, 4),
        end: point(0.5, 6),
      }),
    ).toEqual([])
  })
})

describe('selectionBounds', () => {
  it('outsets the union of several polylines by 2 mm', () => {
    expect(
      selectionBounds([
        point(0, 0),
        point(10, 0),
        point(40, 30),
        point(50, 10),
      ]),
    ).toEqual({
      minX: -2,
      maxX: 52,
      minY: -2,
      maxY: 32,
    })
  })

  it('outsets one polyline by 2 mm', () => {
    expect(selectionBounds([point(10, 20), point(30, 50)])).toEqual({
      minX: 8,
      maxX: 32,
      minY: 18,
      maxY: 52,
    })
  })

  it('gives a flat polyline height', () => {
    expect(selectionBounds([point(0, 10), point(40, 10)])).toEqual({
      minX: -2,
      maxX: 42,
      minY: 8,
      maxY: 12,
    })
  })

  it('returns nothing when there are no points', () => {
    expect(selectionBounds([])).toBeUndefined()
  })
})

describe('translatePolylines', () => {
  it('moves the named polylines by a millimeter delta and keeps the stroke', () => {
    const scene = [
      stroke('move', [point(1, 2), point(3, 4)]),
      stroke('stay', [point(8, 9), point(10, 11)]),
    ]
    const next = translatePolylines(scene, {
      ids: ['move'],
      delta: point(5, -2),
    })

    expect(next[0]).toEqual({
      ...scene[0],
      points: [point(6, 0), point(8, 2)],
    })
    expect(next[0]?.stroke).toBe('#1e1e1e')
    expect(next[1]).toBe(scene[1])
    expect(scene[0]?.points).toEqual([point(1, 2), point(3, 4)])
  })

  it('returns the same scene when nothing is selected', () => {
    const scene = [stroke('stay', [point(0, 0), point(1, 1)])]
    expect(translatePolylines(scene, { ids: [], delta: point(1, 1) })).toBe(
      scene,
    )
  })
})

function stroke(
  id: string,
  points: readonly Point[],
  closed = false,
): Polyline {
  return {
    id,
    points,
    closed,
    stroke: '#1e1e1e',
    widthMm: 0.3,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
