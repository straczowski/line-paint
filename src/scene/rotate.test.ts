import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from './polyline'
import { rotateHandleAt, rotatePolylines, unwrapAngle } from './rotate'

describe('rotatePolylines', () => {
  const scene = [
    stroke('line', [point(0, 0), point(10, 0)], true),
    stroke('stay', [point(40, 40), point(50, 40)]),
  ]

  it('rotates about the center of the points', () => {
    const next = rotatePolylines(scene, {
      ids: ['line'],
      angle: Math.PI / 2,
      shiftHeld: false,
    })

    expect(next[0]?.points[0]?.x).toBeCloseTo(5)
    expect(next[0]?.points[0]?.y).toBeCloseTo(-5)
    expect(next[0]?.points[1]?.x).toBeCloseTo(5)
    expect(next[0]?.points[1]?.y).toBeCloseTo(5)
    expect(next[0]?.closed).toBe(true)
    expect(next[0]?.stroke).toBe('#e03131')
    expect(next[0]?.widthMm).toBe(0.5)
    expect(next[1]).toBe(scene[1])
    expect(scene[0]?.points).toEqual([point(0, 0), point(10, 0)])
  })

  it('steps a shift drag to the nearest 45 degrees', () => {
    const stepped = rotatePolylines(scene, {
      ids: ['line'],
      angle: Math.PI / 6,
      shiftHeld: true,
    })
    const held = rotatePolylines(scene, {
      ids: ['line'],
      angle: Math.PI / 6,
      shiftHeld: false,
    })

    expect(stepped[0]?.points[0]?.x).toBeCloseTo(5 - 5 * Math.SQRT1_2)
    expect(stepped[0]?.points[0]?.y).toBeCloseTo(-5 * Math.SQRT1_2)
    expect(stepped[0]?.points[1]?.x).toBeCloseTo(5 + 5 * Math.SQRT1_2)
    expect(stepped[0]?.points[1]?.y).toBeCloseTo(5 * Math.SQRT1_2)
    expect(held[0]?.points[0]?.y).toBeCloseTo(-2.5)
    expect(
      rotatePolylines(scene, {
        ids: ['line'],
        angle: Math.PI / 18,
        shiftHeld: true,
      }),
    ).toBe(scene)
  })

  it('leaves the scene in place when the angle is zero', () => {
    expect(
      rotatePolylines(scene, { ids: ['line'], angle: 0, shiftHeld: false }),
    ).toBe(scene)
    expect(
      rotatePolylines(scene, { ids: [], angle: Math.PI / 2, shiftHeld: false }),
    ).toBe(scene)
  })

  it('rotates a group about one center and leaves the rest', () => {
    const grouped = [
      stroke('north', [point(0, 10), point(10, 10)], false, ['g']),
      stroke('south', [point(0, 0), point(10, 0)], false, ['g']),
      scene[1],
    ]
    const next = rotatePolylines(grouped, {
      ids: ['north', 'south'],
      angle: Math.PI / 2,
      shiftHeld: false,
    })

    expect(next[0]?.points[0]?.x).toBeCloseTo(0)
    expect(next[0]?.points[0]?.y).toBeCloseTo(0)
    expect(next[0]?.points[1]?.x).toBeCloseTo(0)
    expect(next[0]?.points[1]?.y).toBeCloseTo(10)
    expect(next[1]?.points[0]?.x).toBeCloseTo(10)
    expect(next[1]?.points[0]?.y).toBeCloseTo(0)
    expect(next[1]?.points[1]?.x).toBeCloseTo(10)
    expect(next[1]?.points[1]?.y).toBeCloseTo(10)
    expect(next[0]?.groupIds).toBe(grouped[0]?.groupIds)
    expect(next[1]?.groupIds).toEqual(['g'])
    expect(next[2]).toBe(grouped[2])
  })
})

describe('unwrapAngle', () => {
  it('continues past a half turn', () => {
    const previous = (170 * Math.PI) / 180
    const wrapped = (-170 * Math.PI) / 180

    expect(unwrapAngle(previous, wrapped)).toBeCloseTo((190 * Math.PI) / 180)
  })
})

describe('rotateHandleAt', () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 }

  it('hits the circle above the top edge', () => {
    expect(rotateHandleAt(bounds, point(5, 18), 2)).toBe(true)
    expect(rotateHandleAt(bounds, point(7, 18), 2)).toBe(true)
    expect(rotateHandleAt(bounds, point(7.1, 18), 2)).toBe(false)
    expect(rotateHandleAt(bounds, point(5, 10), 2)).toBe(false)
    expect(rotateHandleAt(bounds, point(5, 18), 0)).toBe(false)
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
