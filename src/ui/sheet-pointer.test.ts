import { describe, expect, it } from 'vitest'
import type { Point } from '../scene/polyline'
import { advanceGesture, selectionAfterPolylineClick } from './sheet-pointer'
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

    expect(pointDrag.gesture.kind).toBe('point')
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
})

describe('selectionAfterPolylineClick', () => {
  it('appends the clicked polyline when shift is held', () => {
    expect(selectionAfterPolylineClick(['line'], 'other', true)).toEqual([
      'line',
      'other',
    ])
  })

  it('keeps the selection when that polyline is already selected', () => {
    const selected = ['line', 'other']
    expect(selectionAfterPolylineClick(selected, 'other', true)).toBe(selected)
  })

  it('replaces the selection when shift is up', () => {
    expect(
      selectionAfterPolylineClick(['line', 'other'], 'line', false),
    ).toEqual(['line'])
  })
})

function located(canvas: Point, scene: Point) {
  return { canvas, scene }
}

function point(x: number, y: number): Point {
  return { x, y }
}
