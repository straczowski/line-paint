import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from '../scene/polyline'
import { hiddenPolylineKey, overlayFrame } from './overlay-frame'
import type { MoveGesture, SelectGesture } from './sheet-pointer'

describe('overlayFrame', () => {
  const scene = [stroke('line', [point(0, 0), point(10, 0)])]

  it('extends the draft to the follower', () => {
    const frame = overlayFrame(
      scene,
      [point(1, 2)],
      point(8, 9),
      [],
      undefined,
      undefined,
      false,
      false,
    )

    expect(frame.draftPoints).toEqual([point(1, 2), point(8, 9)])
    expect(frame.preview).toEqual([])
    expect(frame.scaleHandles).toBe(false)
  })

  it('previews a move and hides scale handles while a point is edited', () => {
    const gesture: MoveGesture = {
      kind: 'move',
      pointerId: 1,
      startScene: point(0, 0),
      currentScene: point(4, 1),
      ids: ['line'],
    }
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      ['line'],
      gesture,
      { id: 'line', pointIndex: 0 },
      false,
      false,
    )

    expect(frame.preview).toEqual([
      {
        points: [point(4, 1), point(14, 1)],
        closed: false,
        widthMm: 0.3,
      },
    ])
    expect(frame.handles).toEqual([
      { point: point(4, 1), selected: true },
      { point: point(14, 1), selected: false },
    ])
    expect(frame.scaleHandles).toBe(false)
    expect(frame.marquee).toBeUndefined()
  })

  it('marks the marquee and the scale handles for a selection', () => {
    const gesture: SelectGesture = {
      kind: 'marquee',
      pointerId: 1,
      startScene: point(0, 0),
      currentScene: point(3, 3),
    }
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      ['line'],
      gesture,
      undefined,
      false,
      false,
    )

    expect(frame.marquee).toEqual({
      start: point(0, 0),
      end: point(3, 3),
    })
    expect(frame.scaleHandles).toBe(true)
    expect(frame.bounds).toEqual({
      minX: -2,
      maxX: 12,
      minY: -2,
      maxY: 2,
    })
  })
})

describe('hiddenPolylineKey', () => {
  const move: MoveGesture = {
    kind: 'move',
    pointerId: 1,
    startScene: point(0, 0),
    currentScene: point(1, 1),
    ids: ['a', 'b'],
  }

  it('hides the dragged polylines, except an alt move', () => {
    expect(hiddenPolylineKey(move, false)).toBe('a,b')
    expect(hiddenPolylineKey(move, true)).toBe('')
    expect(
      hiddenPolylineKey(
        {
          kind: 'point',
          pointerId: 1,
          startScene: point(0, 0),
          currentScene: point(1, 1),
          id: 'a',
          index: 0,
        },
        false,
      ),
    ).toBe('a')
    expect(hiddenPolylineKey(undefined, false)).toBe('')
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
    stroke: '#1e1e1e',
    widthMm: 0.3,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
