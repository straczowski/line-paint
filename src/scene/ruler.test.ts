import { describe, expect, it } from 'vitest'
import { duplicatePolylines, translatePolylines } from './selection'
import type { Point } from './polyline'
import { dragDelta, draftPoint, draggedHandle, lockToRuler } from './ruler'

describe('lockToRuler', () => {
  it('projects the pointer onto the nearest of the four lines', () => {
    expect(lockToRuler(point(2, 3), point(12, 4))).toEqual(point(12, 3))
    expect(lockToRuler(point(2, 3), point(3, 13))).toEqual(point(2, 13))
    expect(lockToRuler(point(0, 0), point(10, 8))).toEqual(point(9, 9))
    expect(lockToRuler(point(0, 0), point(10, -8))).toEqual(point(9, -9))
    expect(lockToRuler(point(0, 0), point(-10, -8))).toEqual(point(-9, -9))
  })

  it('prefers the line closer to horizontal when the pointer is halfway', () => {
    const horizontalOrDiagonal = point(1 + Math.SQRT1_2, Math.SQRT1_2)
    expect(lockToRuler(point(0, 0), horizontalOrDiagonal)).toEqual({
      x: horizontalOrDiagonal.x,
      y: 0,
    })

    const diagonalOrVertical = point(Math.SQRT1_2, 1 + Math.SQRT1_2)
    const diagonal = (diagonalOrVertical.x + diagonalOrVertical.y) / 2
    expect(lockToRuler(point(0, 0), diagonalOrVertical)).toEqual(
      point(diagonal, diagonal),
    )

    const verticalOrCounter = point(-Math.SQRT1_2, 1 + Math.SQRT1_2)
    expect(lockToRuler(point(0, 0), verticalOrCounter)).toEqual(
      point(0, verticalOrCounter.y),
    )
  })
})

describe('draftPoint', () => {
  it('locks the next point to the last created point while shift is held', () => {
    expect(
      draftPoint({
        points: [point(0, 0)],
        pointer: point(6, 2),
        shiftHeld: true,
      }),
    ).toEqual(point(6, 0))
    expect(
      draftPoint({
        points: [point(0, 0), point(6, 0)],
        pointer: point(6, 5),
        shiftHeld: true,
      }),
    ).toEqual(point(6, 5))
  })

  it('stores the pointer for the first point and when shift is up', () => {
    expect(
      draftPoint({ points: [], pointer: point(4, 5), shiftHeld: true }),
    ).toEqual(point(4, 5))
    expect(
      draftPoint({
        points: [point(0, 0)],
        pointer: point(6, 2),
        shiftHeld: false,
      }),
    ).toEqual(point(6, 2))
  })
})

describe('dragDelta', () => {
  it('locks a move to the line through where the drag started', () => {
    expect(
      dragDelta({
        start: point(1, 1),
        pointer: point(9, 3),
        shiftHeld: true,
      }),
    ).toEqual(point(8, 0))
    expect(
      dragDelta({
        start: point(1, 1),
        pointer: point(9, 3),
        shiftHeld: false,
      }),
    ).toEqual(point(8, 2))
  })

  it('moves and copies a selection along that same locked delta', () => {
    const scene = [
      {
        id: 'line',
        points: [point(1, 2), point(4, 2)],
        closed: false,
        stroke: '#1e1e1e',
        widthMm: 0.3,
      },
    ]
    const delta = dragDelta({
      start: point(0, 0),
      pointer: point(8, 3),
      shiftHeld: true,
    })
    const moved = translatePolylines(scene, { ids: ['line'], delta })
    const copied = duplicatePolylines(scene, {
      ids: ['line'],
      newIds: ['copy'],
      delta,
    })

    expect(delta).toEqual(point(8, 0))
    expect(moved[0]?.points).toEqual([point(9, 2), point(12, 2)])
    expect(copied[0]).toBe(scene[0])
    expect(copied[1]?.points).toEqual([point(9, 2), point(12, 2)])
  })
})

describe('draggedHandle', () => {
  it('locks a point to the ruler through its original position', () => {
    const origin = point(0, 0)
    const start = point(2, 0)
    const pointer = point(12, 8)

    expect(draggedHandle({ origin, start, pointer, shiftHeld: false })).toEqual(
      point(10, 8),
    )
    expect(draggedHandle({ origin, start, pointer, shiftHeld: true })).toEqual(
      point(10, 10),
    )
  })
})

function point(x: number, y: number): Point {
  return { x, y }
}
