import { describe, expect, it } from 'vitest'
import { shapePoints } from './shape'
import type { ShapeDrag } from './shape'

describe('shapePoints', () => {
  it('places a rectangle on the four corners, bottom-left first', () => {
    expect(shapePoints(drag({ pointer: { x: 30, y: 10 } }))).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(
      shapePoints(drag({ anchor: { x: 10, y: 10 }, pointer: { x: 0, y: 0 } })),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(
      shapePoints(drag({ anchor: { x: -10, y: -4 }, pointer: { x: 5, y: 8 } })),
    ).toEqual([
      { x: -10, y: -4 },
      { x: 5, y: -4 },
      { x: 5, y: 8 },
      { x: -10, y: 8 },
    ])
  })

  it('grows the short side to the longer span when Shift is held', () => {
    expect(
      shapePoints(drag({ pointer: { x: 30, y: 10 }, symmetric: true })),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 30 },
      { x: 0, y: 30 },
    ])
    expect(
      shapePoints(drag({ pointer: { x: 30, y: 0 }, symmetric: true })),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 30 },
      { x: 0, y: 30 },
    ])
    expect(
      shapePoints(drag({ pointer: { x: -20, y: -5 }, symmetric: true })),
    ).toEqual([
      { x: -20, y: -20 },
      { x: 0, y: -20 },
      { x: 0, y: 0 },
      { x: -20, y: 0 },
    ])
  })

  it('uses the clicked point as the center when Command is held', () => {
    expect(
      shapePoints(
        drag({
          anchor: { x: 10, y: 10 },
          pointer: { x: 40, y: 20 },
          fromCenter: true,
        }),
      ),
    ).toEqual([
      { x: -20, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 20 },
      { x: -20, y: 20 },
    ])
  })

  it('centers a square when Command and Shift are both held', () => {
    expect(
      shapePoints(
        drag({
          pointer: { x: 30, y: 10 },
          fromCenter: true,
          symmetric: true,
        }),
      ),
    ).toEqual([
      { x: -30, y: -30 },
      { x: 30, y: -30 },
      { x: 30, y: 30 },
      { x: -30, y: 30 },
    ])
  })

  it('returns nothing for a zero side', () => {
    expect(shapePoints(drag({ pointer: { x: 0, y: 0 } }))).toBeUndefined()
    expect(shapePoints(drag({ pointer: { x: 30, y: 0 } }))).toBeUndefined()
    expect(shapePoints(drag({ pointer: { x: 0, y: 12 } }))).toBeUndefined()
  })

  it('draws an ellipse from the right, counterclockwise, with more points as it grows', () => {
    const small = shapePoints(circle(10))
    const middle = shapePoints(circle(50))
    const large = shapePoints(circle(100))

    expect(small).toHaveLength(16)
    expect(middle).toHaveLength(36)
    expect(large).toHaveLength(50)
    expect(chordGap(10, 16)).toBeLessThanOrEqual(0.2)
    expect(chordGap(50, 36)).toBeLessThanOrEqual(0.2)
    expect(chordGap(100, 50)).toBeLessThanOrEqual(0.2)

    const first = small?.[0]
    const second = small?.[1]
    expect(first).toEqual({ x: 10, y: 0 })
    expect(second?.x).toBeLessThan(10)
    expect(second?.y).toBeGreaterThan(0)
  })

  it('uses eight points when the shorter radius is within the chord gap', () => {
    const thin = shapePoints(
      drag({
        kind: 'ellipse',
        pointer: { x: 20, y: 0.4 },
      }),
    )
    expect(thin).toHaveLength(8)
    expect(thin?.[0]).toEqual({ x: 20, y: 0.2 })
  })
})

function circle(radius: number): ShapeDrag {
  return drag({
    kind: 'ellipse',
    fromCenter: true,
    pointer: { x: radius, y: radius },
  })
}

function chordGap(radius: number, count: number): number {
  return radius * (1 - Math.cos(Math.PI / count))
}

function drag(
  input: Partial<ShapeDrag> & { pointer: ShapeDrag['pointer'] },
): ShapeDrag {
  return {
    anchor: input.anchor ?? { x: 0, y: 0 },
    pointer: input.pointer,
    kind: input.kind ?? 'rectangle',
    fromCenter: input.fromCenter ?? false,
    symmetric: input.symmetric ?? false,
  }
}
