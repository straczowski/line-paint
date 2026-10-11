import { describe, expect, it } from 'vitest'
import { alignObjectCount, alignPolylines } from './align'
import type { Point, Polyline } from './polyline'

describe('alignPolylines', () => {
  const scene = [
    stroke('left', [point(0, 0), point(10, 10)], true),
    stroke('right', [point(30, 5), point(40, 25)]),
    stroke('stay', [point(80, 80), point(90, 90)]),
  ]

  it('moves each left edge to the selection left', () => {
    const next = alignPolylines(scene, {
      ids: ['left', 'right'],
      enteredGroupId: undefined,
      action: 'left',
    })

    expect(next[0]).toBe(scene[0])
    expect(next[1]?.points).toEqual([point(0, 5), point(10, 25)])
    expect(next[1]?.closed).toBe(false)
    expect(next[1]?.stroke).toBe('#e03131')
    expect(next[1]?.widthMm).toBe(0.5)
    expect(next[2]).toBe(scene[2])
    expect(scene[1]?.points).toEqual([point(30, 5), point(40, 25)])
  })

  it('moves each top to the greater y', () => {
    const next = alignPolylines(scene, {
      ids: ['left', 'right'],
      enteredGroupId: undefined,
      action: 'top',
    })

    expect(next[0]?.points).toEqual([point(0, 15), point(10, 25)])
    expect(next[1]).toBe(scene[1])
  })

  it('moves each center onto the selection center', () => {
    const next = alignPolylines(scene, {
      ids: ['left', 'right'],
      enteredGroupId: undefined,
      action: 'centerX',
    })

    expect(next[0]?.points).toEqual([point(15, 0), point(25, 10)])
    expect(next[1]?.points).toEqual([point(15, 5), point(25, 25)])
    expect(next[2]).toBe(scene[2])
  })

  it('moves a group as one box', () => {
    const grouped = [
      stroke('wide', [point(0, 0), point(30, 5)], false, ['g']),
      stroke('narrow', [point(10, 10), point(15, 20)], false, ['g']),
      stroke('loose', [point(50, 0), point(60, 10)]),
      scene[2],
    ]
    const next = alignPolylines(grouped, {
      ids: ['wide', 'narrow', 'loose'],
      enteredGroupId: undefined,
      action: 'right',
    })

    expect(
      alignObjectCount(grouped, ['wide', 'narrow', 'loose'], undefined),
    ).toBe(2)
    expect(alignObjectCount(grouped, ['wide', 'narrow'], undefined)).toBe(1)
    expect(next[0]?.points).toEqual([point(30, 0), point(60, 5)])
    expect(next[1]?.points).toEqual([point(40, 10), point(45, 20)])
    expect(next[0]?.groupIds).toBe(grouped[0]?.groupIds)
    expect(next[1]?.groupIds).toEqual(['g'])
    expect(next[2]).toBe(grouped[2])
    expect(next[3]).toBe(grouped[3])
    expect(
      alignPolylines(grouped, {
        ids: ['wide', 'narrow'],
        enteredGroupId: undefined,
        action: 'left',
      }),
    ).toBe(grouped)
  })

  it('aligns children inside an entered group and leaves the rest', () => {
    const grouped = [
      stroke('left', [point(0, 0), point(10, 10)], false, ['outer']),
      stroke('right', [point(30, 2), point(40, 8)], false, ['outer']),
      stroke('sibling', [point(10, 40), point(20, 50)], false, ['outer']),
      stroke('nestA', [point(0, 0), point(8, 4)], false, ['nest', 'outer']),
      stroke('nestB', [point(2, 12), point(6, 18)], false, ['nest', 'outer']),
      stroke('outside', [point(100, 100), point(110, 110)]),
    ]
    const next = alignPolylines(grouped, {
      ids: ['left', 'right'],
      enteredGroupId: 'outer',
      action: 'left',
    })
    const nested = alignPolylines(grouped, {
      ids: ['nestA', 'nestB', 'left'],
      enteredGroupId: 'outer',
      action: 'right',
    })

    expect(next[0]).toBe(grouped[0])
    expect(next[1]?.points).toEqual([point(0, 2), point(10, 8)])
    expect(next[1]?.groupIds).toEqual(['outer'])
    expect(next[2]).toBe(grouped[2])
    expect(next[5]).toBe(grouped[5])
    expect(nested[3]?.points).toEqual([point(2, 0), point(10, 4)])
    expect(nested[4]?.points).toEqual([point(4, 12), point(8, 18)])
    expect(nested[4]?.groupIds).toEqual(['nest', 'outer'])
    expect(nested[0]).toBe(grouped[0])
    expect(nested[2]).toBe(grouped[2])
    expect(nested[5]).toBe(grouped[5])
    expect(alignObjectCount(grouped, ['nestA', 'nestB', 'left'], 'outer')).toBe(
      2,
    )
  })

  it('distributes with equal gaps and keeps the span', () => {
    const spaced = [
      stroke('a', [point(0, 0), point(10, 4)]),
      stroke('b', [point(20, 1), point(40, 6)]),
      stroke('c', [point(100, 2), point(110, 8)]),
      scene[2],
    ]
    const next = alignPolylines(spaced, {
      ids: ['a', 'b', 'c'],
      enteredGroupId: undefined,
      action: 'distributeX',
    })

    expect(next[0]).toBe(spaced[0])
    expect(next[1]?.points).toEqual([point(45, 1), point(65, 6)])
    expect(next[2]).toBe(spaced[2])
    expect(next[3]).toBe(spaced[3])
  })

  it('spaces centers when the boxes are larger than the span', () => {
    const crowded = [
      stroke('a', [point(0, 0), point(20, 10)]),
      stroke('b', [point(2, 0), point(22, 10)]),
      stroke('c', [point(10, 0), point(40, 10)]),
    ]
    const next = alignPolylines(crowded, {
      ids: ['a', 'b', 'c'],
      enteredGroupId: undefined,
      action: 'distributeX',
    })
    const covered = [
      stroke('wide', [point(0, 0), point(50, 10)]),
      stroke('low', [point(5, 0), point(15, 10)]),
      stroke('high', [point(8, 0), point(18, 10)]),
    ]
    const ontoWide = alignPolylines(covered, {
      ids: ['wide', 'low', 'high'],
      enteredGroupId: undefined,
      action: 'distributeX',
    })

    expect(next[0]).toBe(crowded[0])
    expect(next[1]?.points).toEqual([point(7.5, 0), point(27.5, 10)])
    expect(next[2]).toBe(crowded[2])
    expect(ontoWide[0]).toBe(covered[0])
    expect(ontoWide[1]?.points).toEqual([point(20, 0), point(30, 10)])
    expect(ontoWide[2]?.points).toEqual([point(20, 0), point(30, 10)])
  })

  it('returns the same scene when the points would not move', () => {
    const aligned = [
      stroke('a', [point(0, 0), point(10, 10)]),
      stroke('b', [point(0, 20), point(8, 30)]),
    ]

    expect(
      alignPolylines(aligned, {
        ids: ['a', 'b'],
        enteredGroupId: undefined,
        action: 'left',
      }),
    ).toBe(aligned)
    expect(
      alignPolylines(scene, {
        ids: ['left'],
        enteredGroupId: undefined,
        action: 'right',
      }),
    ).toBe(scene)
    expect(
      alignPolylines(scene, {
        ids: ['left', 'right'],
        enteredGroupId: undefined,
        action: 'distributeX',
      }),
    ).toBe(scene)
    expect(
      alignPolylines(scene, {
        ids: [],
        enteredGroupId: undefined,
        action: 'top',
      }),
    ).toBe(scene)
  })
})

function stroke(
  id: string,
  points: readonly Point[],
  closed = false,
  groupIds?: readonly string[],
): Polyline {
  return {
    id,
    points,
    closed,
    stroke: '#e03131',
    widthMm: 0.5,
    groupIds,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
