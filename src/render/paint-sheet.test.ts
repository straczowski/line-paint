import { describe, expect, it } from 'vitest'
import { pointsWithClosingSegment } from './paint-sheet'
import type { Point } from '../scene/polyline'

describe('pointsWithClosingSegment', () => {
  it('adds the return to the first point when closed', () => {
    const points = [point(0, 0), point(10, 0), point(10, 10)]

    expect(pointsWithClosingSegment(points, true)).toEqual([
      ...points,
      point(0, 0),
    ])
  })

  it('leaves the stored points alone when open', () => {
    const points = [point(0, 0), point(10, 0)]

    expect(pointsWithClosingSegment(points, false)).toBe(points)
    expect(pointsWithClosingSegment([point(1, 1)], true)).toEqual([point(1, 1)])
  })
})

function point(x: number, y: number): Point {
  return { x, y }
}
