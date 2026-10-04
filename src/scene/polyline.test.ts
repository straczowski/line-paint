import { describe, expect, it } from 'vitest'
import { emptyScene } from './sheet'
import {
  commitPolyline,
  previewStrokePoints,
  setPolylineClosed,
} from './polyline'
import type { Point } from './polyline'

describe('previewStrokePoints', () => {
  it('extends the latest point to the pointer', () => {
    const points = [point(1, 2)]
    expect(previewStrokePoints(points, point(8, 9))).toEqual([
      point(1, 2),
      point(8, 9),
    ])
    expect(
      previewStrokePoints([point(1, 2), point(3, 4)], point(5, 6)),
    ).toEqual([point(1, 2), point(3, 4), point(5, 6)])
  })

  it('leaves the clicked points alone when the pointer is not a new end', () => {
    const points = [point(1, 2), point(3, 4)]
    expect(previewStrokePoints(points, undefined)).toBe(points)
    expect(previewStrokePoints(points, point(3, 4))).toBe(points)
    expect(previewStrokePoints([], point(3, 4))).toEqual([])
  })
})

describe('commitPolyline', () => {
  it('stores two or more points as one open polyline', () => {
    const points = [point(10, 20), point(30, 40), point(-5, 400)]
    const scene = commitPolyline(emptyScene, { id: 'stroke-1', points })
    const polyline = scene[0]

    expect(scene).toHaveLength(1)
    expect(polyline).toEqual({
      id: 'stroke-1',
      points,
      closed: false,
      stroke: '#1e1e1e',
      widthMm: 0.3,
    })
    expect(polyline?.points).not.toBe(points)
  })

  it('drops a preview with fewer than two points', () => {
    const scene = commitPolyline(emptyScene, {
      id: 'kept',
      points: [point(0, 0), point(1, 1)],
    })

    expect(commitPolyline(scene, { id: 'empty', points: [] })).toBe(scene)
    expect(commitPolyline(scene, { id: 'single', points: [point(9, 9)] })).toBe(
      scene,
    )
  })

  it('appends the next polyline after the ones already stored', () => {
    const first = commitPolyline(emptyScene, {
      id: 'first',
      points: [point(0, 0), point(1, 1)],
    })
    const second = commitPolyline(first, {
      id: 'second',
      points: [point(2, 2), point(3, 3)],
    })

    expect(first).toHaveLength(1)
    expect(second.map((polyline) => polyline.id)).toEqual(['first', 'second'])
  })
})

describe('setPolylineClosed', () => {
  it('sets the flag and keeps the stored points', () => {
    const points = [point(0, 0), point(10, 0), point(10, 10)]
    const scene = commitPolyline(emptyScene, { id: 'line', points })
    const closed = setPolylineClosed(scene, { id: 'line', closed: true })
    const polyline = closed[0]

    expect(polyline?.closed).toBe(true)
    expect(polyline?.points).toEqual(points)
    expect(polyline?.points).toBe(scene[0]?.points)
    expect(
      setPolylineClosed(closed, { id: 'line', closed: false })[0]?.closed,
    ).toBe(false)
  })

  it('leaves the scene as it is when the flag already matches', () => {
    const scene = commitPolyline(emptyScene, {
      id: 'line',
      points: [point(0, 0), point(1, 1)],
    })

    expect(setPolylineClosed(scene, { id: 'line', closed: false })).toBe(scene)
  })
})

function point(x: number, y: number): Point {
  return { x, y }
}
