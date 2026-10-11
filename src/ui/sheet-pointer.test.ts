import { describe, expect, it } from 'vitest'
import type { Point } from '../scene/polyline'
import { advanceGesture } from './sheet-pointer'
import type { PressGesture, SelectGesture } from './sheet-pointer'

describe('advanceGesture', () => {
  const press = (patch: Partial<PressGesture> = {}): PressGesture => ({
    kind: 'press',
    pointerId: 1,
    startCanvas: point(0, 0),
    startScene: point(10, 10),
    hitId: undefined,
    pointIndex: undefined,
    scaleHandle: undefined,
    rotateCenter: undefined,
    ...patch,
  })

  it('keeps a press until the pointer moves 4 px', () => {
    const gesture = press()
    const stayed = advanceGesture(
      gesture,
      located(point(3, 0), point(12, 10)),
      [],
    )
    const moved = advanceGesture(
      gesture,
      located(point(4, 0), point(14, 10)),
      [],
    )

    expect(stayed).toEqual({ gesture, selectedIds: [] })
    expect(moved.gesture).toEqual({
      kind: 'marquee',
      pointerId: 1,
      startScene: point(10, 10),
      currentScene: point(14, 10),
    })
  })

  it('drags a point, a scale handle, or the hit polyline', () => {
    const pointDrag = advanceGesture(
      press({ hitId: 'line', pointIndex: 1 }),
      located(point(5, 0), point(20, 10)),
      ['line'],
    )
    const scale = advanceGesture(
      press({ scaleHandle: 'east' }),
      located(point(5, 0), point(20, 10)),
      ['line', 'other'],
    )
    const kept = advanceGesture(
      press({ hitId: 'line' }),
      located(point(5, 0), point(20, 10)),
      ['line', 'other'],
    )
    const replaced = advanceGesture(
      press({ hitId: 'line' }),
      located(point(5, 0), point(20, 10)),
      ['other'],
    )

    const rotate = advanceGesture(
      press({ rotateCenter: point(5, 0) }),
      located(point(5, 0), point(5, 10)),
      ['line', 'other'],
    )

    expect(pointDrag.gesture.kind).toBe('point')
    expect(rotate.gesture).toMatchObject({
      kind: 'rotate',
      ids: ['line', 'other'],
      center: point(5, 0),
    })
    expect(scale.gesture).toMatchObject({
      kind: 'scale',
      ids: ['line', 'other'],
      handle: 'east',
    })
    expect(kept.selectedIds).toEqual(['line', 'other'])
    expect(replaced).toMatchObject({
      gesture: { kind: 'move', ids: ['line'] },
      selectedIds: ['line'],
    })
  })

  it('follows a drag that has already left the press', () => {
    const gesture: SelectGesture = {
      kind: 'move',
      pointerId: 1,
      startScene: point(0, 0),
      currentScene: point(1, 1),
      ids: ['line'],
    }

    expect(
      advanceGesture(gesture, located(point(9, 9), point(4, 5)), ['line']),
    ).toEqual({
      gesture: { ...gesture, currentScene: point(4, 5) },
      selectedIds: ['line'],
    })
  })

  it('keeps a rotate drag turning past a half turn', () => {
    const gesture: SelectGesture = {
      kind: 'rotate',
      pointerId: 1,
      startScene: point(0, 1),
      currentScene: point(-1, 0),
      ids: ['line'],
      center: point(0, 0),
      angle: (170 * Math.PI) / 180,
    }
    const pointer = point(
      Math.cos((-80 * Math.PI) / 180),
      Math.sin((-80 * Math.PI) / 180),
    )

    expect(
      advanceGesture(gesture, located(point(0, 0), pointer), ['line']).gesture,
    ).toMatchObject({
      kind: 'rotate',
      angle: expect.closeTo((190 * Math.PI) / 180),
    })
  })
})

function located(canvas: Point, scene: Point) {
  return { canvas, scene }
}

function point(x: number, y: number): Point {
  return { x, y }
}
