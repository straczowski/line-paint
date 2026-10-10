import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from './polyline'
import { scaleHandleAt, scalePolylines } from './scale'

describe('scalePolylines', () => {
  const scene = [
    stroke('box', [point(10, 10), point(30, 20)], true),
    stroke('stay', [point(1, 1), point(2, 2)]),
  ]

  it('scales a corner from the opposite corner', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'northEast',
      pointer: point(42, 32),
      shiftHeld: false,
      altHeld: false,
      zoom: 1,
    })

    expect(next[0]?.points).toEqual([point(10, 10), point(40, 30)])
    expect(next[0]?.closed).toBe(true)
    expect(next[0]?.stroke).toBe('#e03131')
    expect(next[0]?.widthMm).toBe(0.5)
    expect(next[1]).toBe(scene[1])
    expect(scene[0]?.points).toEqual([point(10, 10), point(30, 20)])
  })

  it('leaves the zoomed outset out of the points', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'northEast',
      pointer: point(41, 31),
      shiftHeld: false,
      altHeld: false,
      zoom: 2,
    })

    expect(next[0]?.points).toEqual([point(10, 10), point(40, 30)])
  })

  it('uses one factor for both axes when shift is held on a corner', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'northEast',
      pointer: point(42, 32),
      shiftHeld: true,
      altHeld: false,
      zoom: 1,
    })

    expect(next[0]?.points[0]).toEqual(point(10, 10))
    expect(next[0]?.points[1]?.x).toBeCloseTo(42)
    expect(next[0]?.points[1]?.y).toBeCloseTo(26)
  })

  it('stretches one border and ignores shift', () => {
    const input = {
      ids: ['box'],
      handle: 'east' as const,
      pointer: point(42, 80),
      shiftHeld: true,
      altHeld: false,
      zoom: 1,
    }

    expect(scalePolylines(scene, input)[0]?.points).toEqual([
      point(10, 10),
      point(40, 20),
    ])
    expect(
      scalePolylines(scene, {
        ...input,
        handle: 'north',
        pointer: point(0, 32),
      })[0]?.points,
    ).toEqual([point(10, 10), point(30, 30)])
  })

  it('keeps the selection center fixed when alt is held', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'east',
      pointer: point(42, 15),
      shiftHeld: false,
      altHeld: true,
      zoom: 1,
    })

    expect(next[0]?.points).toEqual([point(0, 10), point(40, 20)])
  })

  it('keeps the center and the aspect ratio when alt and shift are held', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'northEast',
      pointer: point(42, 32),
      shiftHeld: true,
      altHeld: true,
      zoom: 1,
    })

    expect(next[0]?.points[0]?.x).toBeCloseTo(-2)
    expect(next[0]?.points[0]?.y).toBeCloseTo(4)
    expect(next[0]?.points[1]?.x).toBeCloseTo(42)
    expect(next[0]?.points[1]?.y).toBeCloseTo(26)
  })

  it('stops 1 mm short of the fixed side instead of mirroring', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'east',
      pointer: point(0, 15),
      shiftHeld: false,
      altHeld: false,
      zoom: 1,
    })

    expect(next[0]?.points[0]).toEqual(point(10, 10))
    expect(next[0]?.points[1]?.x).toBeCloseTo(11)
    expect(next[0]?.points[1]?.y).toBe(20)
  })

  it('stops a corner short of a mirror when shift is held', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'northEast',
      pointer: point(0, 0),
      shiftHeld: true,
      altHeld: false,
      zoom: 1,
    })

    expect(next[0]?.points[0]).toEqual(point(10, 10))
    expect(next[0]?.points[1]?.x).toBeCloseTo(12)
    expect(next[0]?.points[1]?.y).toBeCloseTo(11)
  })

  it('pulls the minimum side and leaves the opposite side', () => {
    const next = scalePolylines(scene, {
      ids: ['box'],
      handle: 'west',
      pointer: point(-2, 15),
      shiftHeld: false,
      altHeld: false,
      zoom: 1,
    })

    expect(next[0]?.points).toEqual([point(0, 10), point(30, 20)])
  })

  it('scales every selected polyline in the shared frame', () => {
    const pair = [
      stroke('left', [point(0, 0), point(10, 0)]),
      stroke('right', [point(20, 10), point(30, 10)]),
      stroke('stay', [point(4, 4), point(5, 5)]),
    ]
    const next = scalePolylines(pair, {
      ids: ['left', 'right'],
      handle: 'east',
      pointer: point(62, 10),
      shiftHeld: false,
      altHeld: false,
      zoom: 1,
    })

    expect(next[0]?.points).toEqual([point(0, 0), point(20, 0)])
    expect(next[1]?.points).toEqual([point(40, 10), point(60, 10)])
    expect(next[2]).toBe(pair[2])
  })

  it('leaves a flat axis where every point already shares it', () => {
    const flat = [stroke('line', [point(0, 10), point(40, 10)])]

    expect(
      scalePolylines(flat, {
        ids: ['line'],
        handle: 'north',
        pointer: point(20, 30),
        shiftHeld: false,
        altHeld: false,
        zoom: 1,
      }),
    ).toBe(flat)
  })

  it('returns the same scene when the pointer is still on the handle', () => {
    expect(
      scalePolylines(scene, {
        ids: ['box'],
        handle: 'east',
        pointer: point(32, 15),
        shiftHeld: false,
        altHeld: false,
        zoom: 1,
      }),
    ).toBe(scene)
  })

  it('returns the same scene when nothing is selected', () => {
    expect(
      scalePolylines(scene, {
        ids: [],
        handle: 'east',
        pointer: point(80, 15),
        shiftHeld: false,
        altHeld: false,
        zoom: 1,
      }),
    ).toBe(scene)
  })
})

describe('scaleHandleAt', () => {
  const bounds = { minX: 8, maxX: 32, minY: 8, maxY: 22 }

  it('hits a corner square before the borders that meet there', () => {
    expect(scaleHandleAt(bounds, point(32, 22), 1)).toBe('northEast')
    expect(scaleHandleAt(bounds, point(8, 22), 1)).toBe('northWest')
    expect(scaleHandleAt(bounds, point(32, 8), 1)).toBe('southEast')
    expect(scaleHandleAt(bounds, point(8, 8), 1)).toBe('southWest')
  })

  it('hits a border within the slop and misses the interior', () => {
    expect(scaleHandleAt(bounds, point(20, 21.5), 1)).toBe('north')
    expect(scaleHandleAt(bounds, point(31.5, 15), 1)).toBe('east')
    expect(scaleHandleAt(bounds, point(20, 8.5), 1)).toBe('south')
    expect(scaleHandleAt(bounds, point(8.5, 15), 1)).toBe('west')
    expect(scaleHandleAt(bounds, point(20, 15), 1)).toBeUndefined()
    expect(scaleHandleAt(bounds, point(20, 20), 1)).toBeUndefined()
  })

  it('misses when the slop is empty', () => {
    expect(scaleHandleAt(bounds, point(32, 22), 0)).toBeUndefined()
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
    stroke: '#e03131',
    widthMm: 0.5,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
