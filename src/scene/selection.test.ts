import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from './polyline'
import {
  deletePolylinePoint,
  deletePolylines,
  insertPolylinePoint,
  movePolylinePoint,
  pointerTarget,
  polylineAt,
  selectionAfterClick,
  selectionAfterDoubleClick,
  selectionAfterMarquee,
  selectionBounds,
  selectionIsOneGroup,
  touchedPolylineIds,
  ungroupPolylines,
  duplicateDeltaAfterSelection,
  duplicatePolylines,
  groupPolylines,
  hiddenPolylineIds,
  nextDuplicateDelta,
  sceneWithoutHiddenPolylines,
  translatePolylines,
} from './selection'

describe('polylineAt', () => {
  const scene = [stroke('line', [point(0, 0), point(10, 0)])]

  it('hits within 3 mm of the stroke and misses beyond it', () => {
    expect(polylineAt(scene, point(5, 3), 1)).toBe('line')
    expect(polylineAt(scene, point(5, -3), 1)).toBe('line')
    expect(polylineAt(scene, point(12, 0), 1)).toBe('line')
    expect(polylineAt(scene, point(5, 3.1), 1)).toBeUndefined()
    expect(polylineAt(scene, point(14, 0), 1)).toBeUndefined()
  })

  it('shrinks the slop when zoomed in and grows it when zoomed out', () => {
    expect(polylineAt(scene, point(5, 1.5), 2)).toBe('line')
    expect(polylineAt(scene, point(5, 1.6), 2)).toBeUndefined()
    expect(polylineAt(scene, point(5, 6), 0.5)).toBe('line')
    expect(polylineAt(scene, point(5, 6.1), 0.5)).toBeUndefined()
  })

  it('uses the fitted slop when zoom is not positive', () => {
    expect(polylineAt(scene, point(5, 3), 0)).toBe('line')
    expect(polylineAt(scene, point(5, 3.1), 0)).toBeUndefined()
  })

  it('chooses the later polyline when both are within the slop', () => {
    const stacked = [
      stroke('lower', [point(0, 0), point(10, 0)]),
      stroke('upper', [point(0, 2), point(10, 2)]),
    ]

    expect(polylineAt(stacked, point(5, 1.2), 1)).toBe('upper')
  })

  it('misses the empty inside of a multi-polyline bounds', () => {
    const scene = [
      stroke('left', [point(0, 0), point(0, 40)]),
      stroke('right', [point(40, 0), point(40, 40)]),
    ]

    expect(polylineAt(scene, point(20, 20), 1)).toBeUndefined()
  })

  it('misses the empty inside of the bounds', () => {
    const square = [
      stroke('box', [point(0, 0), point(40, 0), point(40, 40), point(0, 40)]),
    ]

    expect(polylineAt(square, point(20, 20), 1)).toBeUndefined()
  })

  it('counts the return segment of a closed polyline', () => {
    const square = [point(0, 0), point(10, 0), point(10, 10), point(0, 10)]
    const closed = [stroke('box', square, true)]
    const open = [stroke('box', square, false)]

    expect(polylineAt(closed, point(-3, 5), 1)).toBe('box')
    expect(polylineAt(open, point(-3, 5), 1)).toBeUndefined()
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
      selectionBounds(
        [point(0, 0), point(10, 0), point(40, 30), point(50, 10)],
        1,
      ),
    ).toEqual({
      minX: -2,
      maxX: 52,
      minY: -2,
      maxY: 32,
    })
  })

  it('outsets one polyline by 2 mm', () => {
    expect(selectionBounds([point(10, 20), point(30, 50)], 1)).toEqual({
      minX: 8,
      maxX: 32,
      minY: 18,
      maxY: 52,
    })
  })

  it('pulls the rectangle in when zoomed in and pushes it out when zoomed out', () => {
    const points = [point(10, 20), point(30, 50)]
    expect(selectionBounds(points, 2)).toEqual({
      minX: 9,
      maxX: 31,
      minY: 19,
      maxY: 51,
    })
    expect(selectionBounds(points, 0.5)).toEqual({
      minX: 6,
      maxX: 34,
      minY: 16,
      maxY: 54,
    })
  })

  it('uses the fitted outset when zoom is not positive', () => {
    expect(selectionBounds([point(10, 20), point(30, 50)], 0)).toEqual({
      minX: 8,
      maxX: 32,
      minY: 18,
      maxY: 52,
    })
  })

  it('gives a flat polyline height', () => {
    expect(selectionBounds([point(0, 10), point(40, 10)], 1)).toEqual({
      minX: -2,
      maxX: 42,
      minY: 8,
      maxY: 12,
    })
  })

  it('returns nothing when there are no points', () => {
    expect(selectionBounds([], 1)).toBeUndefined()
  })
})

describe('pointerTarget', () => {
  const line = stroke('line', [point(0, 0), point(40, 0)])

  it('prefers a point handle over the segment while that polyline is edited', () => {
    expect(pointerTarget([line], point(0, 2), 'line', 1)).toEqual({
      id: 'line',
      pointIndex: 0,
    })
    expect(pointerTarget([line], point(20, 2), 'line', 1)).toEqual({
      id: 'line',
      pointIndex: undefined,
    })
    expect(pointerTarget([line], point(0, 3.1), 'line', 1)).toEqual({
      id: undefined,
      pointIndex: undefined,
    })
  })

  it('shrinks the handle slop when zoomed in and grows it when zoomed out', () => {
    expect(pointerTarget([line], point(0, 1.5), 'line', 2)).toEqual({
      id: 'line',
      pointIndex: 0,
    })
    expect(pointerTarget([line], point(0, 1.6), 'line', 2)).toEqual({
      id: undefined,
      pointIndex: undefined,
    })
    expect(pointerTarget([line], point(0, 6), 'line', 0.5)).toEqual({
      id: 'line',
      pointIndex: 0,
    })
    expect(pointerTarget([line], point(0, 6.1), 'line', 0.5)).toEqual({
      id: undefined,
      pointIndex: undefined,
    })
  })

  it('uses the fitted handle slop when zoom is not positive', () => {
    expect(pointerTarget([line], point(0, 3), 'line', 0)).toEqual({
      id: 'line',
      pointIndex: 0,
    })
    expect(pointerTarget([line], point(0, 3.1), 'line', 0)).toEqual({
      id: undefined,
      pointIndex: undefined,
    })
  })

  it('hits the segment when points are not being edited', () => {
    expect(pointerTarget([line], point(0, 2), undefined, 1)).toEqual({
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
    const inserted = insertPolylinePoint(
      scene,
      {
        id: 'edit',
        point: point(2, 20),
      },
      1,
    )

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
    const inserted = insertPolylinePoint(
      scene,
      {
        id: 'box',
        point: point(-2, 5),
      },
      1,
    )

    expect(inserted?.index).toBe(4)
    expect(inserted?.scene[0]?.points).toEqual([...square, point(0, 5)])
    expect(inserted?.scene[0]?.closed).toBe(true)
    expect(inserted?.scene[0]?.points[0]).toEqual(point(0, 0))
  })

  it('does not insert when the pointer misses the segment or hits a handle', () => {
    const scene = [stroke('edit', [point(0, 0), point(0, 40)])]

    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(3.1, 20) }, 1),
    ).toBeUndefined()
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(2, 0) }, 1),
    ).toBeUndefined()
    expect(scene[0]?.points).toHaveLength(2)
  })

  it('shrinks the insert slop when zoomed in and grows it when zoomed out', () => {
    const scene = [stroke('edit', [point(0, 0), point(0, 40)])]

    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(1.5, 20) }, 2)
        ?.index,
    ).toBe(1)
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(1.6, 20) }, 2),
    ).toBeUndefined()
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(2, 5) }, 2),
    ).toBeUndefined()
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(1.5, 0) }, 2),
    ).toBeUndefined()
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(6, 20) }, 0.5)
        ?.index,
    ).toBe(1)
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(6.1, 20) }, 0.5),
    ).toBeUndefined()
  })

  it('uses the fitted insert slop when zoom is not positive', () => {
    const scene = [stroke('edit', [point(0, 0), point(0, 40)])]

    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(3, 20) }, 0)?.index,
    ).toBe(1)
    expect(
      insertPolylinePoint(scene, { id: 'edit', point: point(3.1, 20) }, 0),
    ).toBeUndefined()
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
        layerId: 'red',
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
      layerId: 'red',
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

  it('steps a fresh copy 10 mm right and up, then repeats that step', () => {
    const scene = [
      {
        ...stroke('source', [point(1, 2), point(3, 4)], true),
        stroke: '#e03131',
        widthMm: 0.5,
      },
    ]
    const first = nextDuplicateDelta(undefined)
    const once = duplicatePolylines(scene, {
      ids: ['source'],
      newIds: ['copy'],
      delta: first,
    })
    const second = nextDuplicateDelta(first)
    const twice = duplicatePolylines(once, {
      ids: ['copy'],
      newIds: ['copy-2'],
      delta: second,
    })

    expect(once[1]).toEqual({
      id: 'copy',
      points: [point(11, 12), point(13, 14)],
      closed: true,
      stroke: '#e03131',
      widthMm: 0.5,
    })
    expect(once[1]?.points).not.toBe(scene[0]?.points)
    expect(twice[2]?.points).toEqual([point(21, 22), point(23, 24)])
    expect(twice[0]).toBe(scene[0])
    expect(twice[1]).toBe(once[1])
    expect(second).toBe(first)
  })

  it('repeats an alt-drop delta from the copies', () => {
    const scene = [stroke('source', [point(0, 0), point(2, 0)])]
    const drop = point(25, 0)
    const copied = duplicatePolylines(scene, {
      ids: ['source'],
      newIds: ['copy'],
      delta: drop,
    })
    const again = duplicatePolylines(copied, {
      ids: ['copy'],
      newIds: ['copy-2'],
      delta: nextDuplicateDelta(drop),
    })

    expect(copied[0]?.points).toEqual([point(0, 0), point(2, 0)])
    expect(again[1]?.points).toEqual([point(25, 0), point(27, 0)])
    expect(again[2]?.points).toEqual([point(50, 0), point(52, 0)])
  })
})

describe('duplicateDeltaAfterSelection', () => {
  const stored = point(12, 3)

  it('keeps the delta when the same polylines stay selected', () => {
    expect(duplicateDeltaAfterSelection(stored, ['a'], ['a'])).toBe(stored)
    expect(duplicateDeltaAfterSelection(stored, ['a', 'b'], ['b', 'a'])).toBe(
      stored,
    )
  })

  it('forgets the delta when the selection changes', () => {
    expect(duplicateDeltaAfterSelection(stored, ['a'], [])).toBeUndefined()
    expect(duplicateDeltaAfterSelection(stored, ['a'], ['b'])).toBeUndefined()
    expect(
      duplicateDeltaAfterSelection(stored, ['a', 'b'], ['a']),
    ).toBeUndefined()
    expect(
      duplicateDeltaAfterSelection(undefined, ['a'], ['b']),
    ).toBeUndefined()
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
    expect(
      hiddenPolylineIds({ kind: 'rotate', ids: ['a', 'b'], altHeld: true }),
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

describe('groups', () => {
  const loose = [
    stroke('a', [point(0, 0), point(1, 0)]),
    stroke('b', [point(2, 0), point(3, 0)]),
    stroke('c', [point(4, 0), point(5, 0)]),
  ]

  it('groups two polylines and refuses a group that is already one', () => {
    const grouped = groupPolylines(loose, {
      ids: ['a', 'b'],
      groupId: 'outer',
      enteredGroupId: undefined,
    })

    expect(grouped[0]?.groupIds).toEqual(['outer'])
    expect(grouped[1]?.groupIds).toEqual(['outer'])
    expect(grouped[2]?.groupIds).toBeUndefined()
    expect(
      groupPolylines(grouped, {
        ids: ['a', 'b'],
        groupId: 'again',
        enteredGroupId: undefined,
      }),
    ).toBe(grouped)
    expect(
      groupPolylines(loose, {
        ids: ['a'],
        groupId: 'one',
        enteredGroupId: undefined,
      }),
    ).toBe(loose)
  })

  it('wraps a group in a new one and ungroups one level', () => {
    const inner = groupPolylines(loose, {
      ids: ['a', 'b'],
      groupId: 'inner',
      enteredGroupId: undefined,
    })
    const outer = groupPolylines(inner, {
      ids: ['a', 'b', 'c'],
      groupId: 'outer',
      enteredGroupId: undefined,
    })

    expect(outer[0]?.groupIds).toEqual(['inner', 'outer'])
    expect(outer[2]?.groupIds).toEqual(['outer'])

    const peeled = ungroupPolylines(outer, {
      ids: ['a', 'b', 'c'],
      enteredGroupId: undefined,
    })
    expect(peeled[0]?.groupIds).toEqual(['inner'])
    expect(peeled[2]?.groupIds).toBeUndefined()
    expect(
      ungroupPolylines(peeled, {
        ids: ['a', 'b'],
        enteredGroupId: undefined,
      })[0]?.groupIds,
    ).toBeUndefined()
  })

  it('inserts and removes a group inside the entered group', () => {
    const entered = groupPolylines(loose, {
      ids: ['a', 'b', 'c'],
      groupId: 'room',
      enteredGroupId: undefined,
    })
    const nested = groupPolylines(entered, {
      ids: ['a', 'c'],
      groupId: 'inner',
      enteredGroupId: 'room',
    })

    expect(nested[0]?.groupIds).toEqual(['inner', 'room'])
    expect(nested[1]?.groupIds).toEqual(['room'])
    expect(nested[2]?.groupIds).toEqual(['inner', 'room'])

    const peeled = ungroupPolylines(nested, {
      ids: ['a', 'c'],
      enteredGroupId: 'room',
    })
    expect(peeled[0]?.groupIds).toEqual(['room'])
    expect(peeled[2]?.groupIds).toEqual(['room'])
  })

  it('selects a whole group from a click or a marquee, and one child after entering', () => {
    const scene = groupPolylines(loose, {
      ids: ['a', 'b'],
      groupId: 'outer',
      enteredGroupId: undefined,
    })

    expect(selectionAfterClick(scene, [], 'a', undefined, false).ids).toEqual([
      'a',
      'b',
    ])
    expect(selectionAfterMarquee(scene, ['b'], undefined)).toEqual(['a', 'b'])

    const entered = selectionAfterDoubleClick(scene, 'a', undefined)
    expect(entered).toEqual({
      ids: ['a'],
      enteredGroupId: 'outer',
      editPoints: false,
    })
    expect(selectionAfterClick(scene, [], 'a', 'outer', false).ids).toEqual([
      'a',
    ])
    expect(selectionAfterMarquee(scene, ['a'], 'outer')).toEqual(['a'])

    const crowd = Array.from({ length: 4000 }, (_, index) =>
      stroke(`line-${index}`, [point(index, 0), point(index, 1)]),
    )
    const imported = groupPolylines(crowd, {
      ids: crowd.map((polyline) => polyline.id),
      groupId: 'imported',
      enteredGroupId: undefined,
    })
    expect(
      selectionAfterMarquee(imported, ['line-10'], undefined),
    ).toHaveLength(4000)
    expect(selectionAfterClick(scene, ['c'], 'a', undefined, true).ids).toEqual(
      ['c', 'a', 'b'],
    )
    expect(selectionAfterDoubleClick(scene, 'a', 'outer')).toEqual({
      ids: ['a'],
      enteredGroupId: 'outer',
      editPoints: true,
    })
    expect(selectionAfterClick(scene, ['a'], 'c', 'outer', false)).toEqual({
      ids: ['c'],
      enteredGroupId: undefined,
    })
    expect(selectionIsOneGroup(scene, ['a', 'b'])).toBe(true)
    expect(selectionIsOneGroup(scene, ['a'])).toBe(false)
  })

  it('keeps the inner group when a nested selection is duplicated', () => {
    const scene = groupPolylines(
      groupPolylines(loose, {
        ids: ['a', 'b'],
        groupId: 'inner',
        enteredGroupId: undefined,
      }),
      {
        ids: ['a', 'b', 'c'],
        groupId: 'outer',
        enteredGroupId: undefined,
      },
    )
    const copied = duplicatePolylines(scene, {
      ids: ['a', 'b'],
      newIds: ['a2', 'b2'],
      delta: point(10, 0),
      enteredGroupId: 'outer',
      newGroupIds: ['inner-copy'],
    })

    expect(copied[3]?.groupIds).toEqual(['inner-copy', 'outer'])
    expect(copied[4]?.groupIds).toEqual(['inner-copy', 'outer'])
    expect(copied[0]?.groupIds).toEqual(['inner', 'outer'])

    const top = duplicatePolylines(scene, {
      ids: ['a', 'b'],
      newIds: ['a3', 'b3'],
      delta: point(0, 10),
      newGroupIds: ['inner-copy', 'outer-copy'],
    })
    expect(top[3]?.groupIds).toEqual(['inner-copy', 'outer-copy'])
    expect(top[4]?.groupIds).toEqual(['inner-copy', 'outer-copy'])

    const entered = selectionAfterDoubleClick(scene, 'a', undefined)
    expect(entered.enteredGroupId).toBe('outer')
    expect(entered.ids).toEqual(['a', 'b'])
    expect(entered.editPoints).toBe(false)
  })
})

it('keeps a large imported group as one group', () => {
  const scene = Array.from({ length: 4000 }, (_, index) => ({
    ...stroke(`line-${index}`, [point(index, 0), point(index, 1)]),
    groupIds: ['imported'],
  }))
  const ids = scene.map((polyline) => polyline.id)

  expect(
    groupPolylines(scene, {
      ids,
      groupId: 'offer',
      enteredGroupId: undefined,
    }),
  ).toBe(scene)
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
