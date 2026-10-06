import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from './polyline'
import {
  deletePolylinePoint,
  deletePolylines,
  insertPolylinePoint,
  movePolylinePoint,
  pointerTarget,
  polylineAt,
  selectionBounds,
  touchedPolylineIds,
  duplicatePolylines,
  hiddenPolylineIds,
  sceneWithoutHiddenPolylines,
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

describe('pointerTarget', () => {
  const line = stroke('line', [point(0, 0), point(40, 0)])

  it('prefers a point handle over the segment while that polyline is edited', () => {
    expect(pointerTarget([line], point(0, 2), 'line')).toEqual({
      id: 'line',
      pointIndex: 0,
    })
    expect(pointerTarget([line], point(20, 2), 'line')).toEqual({
      id: 'line',
      pointIndex: undefined,
    })
    expect(pointerTarget([line], point(0, 3.1), 'line')).toEqual({
      id: undefined,
      pointIndex: undefined,
    })
  })

  it('hits the segment when points are not being edited', () => {
    expect(pointerTarget([line], point(0, 2), undefined)).toEqual({
      id: 'line',
      pointIndex: undefined,
    })
  })
})

describe('movePolylinePoint', () => {
  it('moves one point and keeps the stroke', () => {
    const scene = [
      stroke('edit', [point(0, 0), point(10, 0), point(10, 10)]),
      stroke('stay', [point(5, 5), point(6, 6)]),
    ]
    const next = movePolylinePoint(scene, {
      id: 'edit',
      index: 1,
      point: point(-4, 30),
    })

    expect(next[0]?.points).toEqual([point(0, 0), point(-4, 30), point(10, 10)])
    expect(next[0]?.stroke).toBe('#1e1e1e')
    expect(next[1]).toBe(scene[1])
    expect(scene[0]?.points[1]).toEqual(point(10, 0))
  })
})

describe('deletePolylinePoint', () => {
  it('deletes the chosen point and leaves the rest', () => {
    const scene = [stroke('edit', [point(0, 0), point(10, 0), point(10, 10)])]

    expect(
      deletePolylinePoint(scene, { id: 'edit', index: 1 })[0]?.points,
    ).toEqual([point(0, 0), point(10, 10)])
    expect(scene[0]?.points).toHaveLength(3)
  })

  it('removes the polyline when fewer than two points would remain', () => {
    const scene = [
      stroke('edit', [point(0, 0), point(10, 0)]),
      stroke('stay', [point(1, 1), point(2, 2)]),
    ]
    const next = deletePolylinePoint(scene, { id: 'edit', index: 0 })

    expect(next).toHaveLength(1)
    expect(next[0]).toBe(scene[1])
  })
})

describe('insertPolylinePoint', () => {
  it('inserts the closest point on an open segment and keeps the other points', () => {
    const scene = [
      stroke('edit', [point(0, 0), point(0, 40), point(40, 40)]),
      stroke('stay', [point(5, 5), point(6, 6)]),
    ]
    const inserted = insertPolylinePoint(scene, {
      id: 'edit',
      point: point(2, 20),
    })

    expect(inserted?.index).toBe(1)
    expect(inserted?.scene[0]?.points).toEqual([
      point(0, 0),
      point(0, 20),
      point(0, 40),
      point(40, 40),
    ])
    expect(inserted?.scene[0]?.closed).toBe(false)
    expect(inserted?.scene[0]?.stroke).toBe('#1e1e1e')
    expect(inserted?.scene[0]?.widthMm).toBe(0.3)
    expect(inserted?.scene[1]).toBe(scene[1])
    expect(scene[0]?.points).toHaveLength(3)
  })

  it('appends a point on the closing segment', () => {
    const square = [point(0, 0), point(10, 0), point(10, 10), point(0, 10)]
    const scene = [stroke('box', square, true)]
    const inserted = insertPolylinePoint(scene, {
      id: 'box',
      point: point(-2, 5),
    })

    expect(inserted?.index).toBe(4)
    expect(inserted?.scene[0]?.points).toEqual([...square, point(0, 5)])
    expect(inserted?.scene[0]?.closed).toBe(true)
    expect(inserted?.scene[0]?.points[0]).toEqual(point(0, 0))
  })

  it('does not insert when the pointer misses the segment or hits a handle', () => {
    const scene = [stroke('edit', [point(0, 0), point(0, 40)])]

    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(3.1, 20) }),
    ).toBeUndefined()
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(2, 0) }),
    ).toBeUndefined()
    expect(scene[0]?.points).toHaveLength(2)
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

describe('duplicatePolylines', () => {
  it('copies one polyline and leaves the original in place', () => {
    const scene = [
      {
        ...stroke('source', [point(1, 2), point(3, 4)], true),
        stroke: '#e03131',
        widthMm: 0.5,
      },
      stroke('stay', [point(8, 9), point(10, 11)]),
    ]
    const next = duplicatePolylines(scene, {
      ids: ['source'],
      newIds: ['copy'],
      delta: point(5, -2),
    })

    expect(next[0]).toBe(scene[0])
    expect(next[1]).toBe(scene[1])
    expect(scene[0]?.points).toEqual([point(1, 2), point(3, 4)])
    expect(next[2]).toEqual({
      id: 'copy',
      points: [point(6, 0), point(8, 2)],
      closed: true,
      stroke: '#e03131',
      widthMm: 0.5,
    })
    expect(next[2]?.points).not.toBe(scene[0]?.points)
    expect(next[2]?.points[0]).not.toBe(scene[0]?.points[0])
  })

  it('copies every polyline in the selection', () => {
    const scene = [
      stroke('a', [point(0, 0), point(1, 0)]),
      stroke('b', [point(2, 0), point(3, 0)]),
      stroke('c', [point(4, 0), point(5, 0)]),
    ]
    const next = duplicatePolylines(scene, {
      ids: ['a', 'c'],
      newIds: ['a-copy', 'c-copy'],
      delta: point(10, 1),
    })

    expect(next[0]).toBe(scene[0])
    expect(next[1]).toBe(scene[1])
    expect(next[2]).toBe(scene[2])
    expect(next[3]?.points).toEqual([point(10, 1), point(11, 1)])
    expect(next[4]?.points).toEqual([point(14, 1), point(15, 1)])
    expect(next[3]?.id).toBe('a-copy')
    expect(next[4]?.id).toBe('c-copy')
  })

  it('returns the same scene when nothing is selected', () => {
    const scene = [stroke('stay', [point(0, 0), point(1, 1)])]
    expect(
      duplicatePolylines(scene, { ids: [], newIds: [], delta: point(1, 1) }),
    ).toBe(scene)
  })
})

describe('hiddenPolylineIds', () => {
  const scene = [
    stroke('a', [point(0, 0), point(10, 0)]),
    stroke('b', [point(0, 20), point(10, 20)]),
    stroke('c', [point(0, 40), point(10, 40)]),
  ]

  it('omits a moving selection from the static canvas', () => {
    const hidden = hiddenPolylineIds({
      kind: 'move',
      ids: ['a', 'c'],
      altHeld: false,
    })
    const visible = sceneWithoutHiddenPolylines(scene, hidden)

    expect(hidden).toEqual(['a', 'c'])
    expect(visible.map((polyline) => polyline.id)).toEqual(['b'])
    expect(visible[0]).toBe(scene[1])
  })

  it('keeps the originals on the static canvas while alt is held', () => {
    const hidden = hiddenPolylineIds({
      kind: 'move',
      ids: ['a', 'c'],
      altHeld: true,
    })

    expect(hidden).toEqual([])
    expect(sceneWithoutHiddenPolylines(scene, hidden)).toBe(scene)
  })

  it('still omits a point drag and a scale drag when alt is held', () => {
    expect(
      hiddenPolylineIds({ kind: 'point', ids: ['a'], altHeld: true }),
    ).toEqual(['a'])
    expect(
      hiddenPolylineIds({ kind: 'scale', ids: ['a', 'b'], altHeld: true }),
    ).toEqual(['a', 'b'])
    expect(hiddenPolylineIds(undefined)).toEqual([])
  })
})

describe('deletePolylines', () => {
  it('removes the named polylines and keeps the rest in order', () => {
    const scene = [
      stroke('a', [point(0, 0), point(1, 0)], true),
      stroke('b', [point(2, 0), point(3, 0)]),
      stroke('c', [point(4, 0), point(5, 0)], true),
    ]
    const next = deletePolylines(scene, ['a', 'c'])

    expect(next).toEqual([scene[1]])
    expect(next[0]).toBe(scene[1])
    expect(scene).toHaveLength(3)
  })

  it('returns the same scene when nothing is selected', () => {
    const scene = [stroke('stay', [point(0, 0), point(1, 1)])]
    expect(deletePolylines(scene, [])).toBe(scene)
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
