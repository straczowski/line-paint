import { describe, expect, it } from 'vitest'
import type { Point, Polyline } from '../scene/polyline'
import { selectionFrameOf } from '../scene/selection'
import { hiddenPolylineKey, overlayFrame } from './overlay-frame'
import type {
  MoveGesture,
  RotateGesture,
  SelectGesture,
  ShapeGesture,
} from './sheet-pointer'

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
      1,
      1,
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
      1,
      1,
    )

    expect(frame.preview[0]?.points).toBe(scene[0]?.points)
    expect(frame.gesturePicture).toEqual({
      kind: 'move',
      delta: point(4, 1),
      draw: 'transform',
    })
    expect(frame.handles).toEqual([
      { point: point(4, 1), selected: true },
      { point: point(14, 1), selected: false },
    ])
    expect(frame.scaleHandles).toBe(false)
    expect(frame.rotateHandle).toBeUndefined()
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
      1,
      1,
    )

    expect(frame.marquee).toEqual({
      start: point(0, 0),
      end: point(3, 3),
    })
    expect(frame.scaleHandles).toBe(true)
    expect(frame.rotateHandle).toEqual(point(5, 18))
    expect(frame.bounds).toEqual({
      minX: -2,
      maxX: 12,
      minY: -2,
      maxY: 2,
    })
  })

  it('rotates the preview about the selection center and hides the scale squares', () => {
    const gesture: RotateGesture = {
      kind: 'rotate',
      pointerId: 1,
      startScene: point(5, 18),
      currentScene: point(5, 1),
      ids: ['line'],
      center: point(5, 0),
      angle: Math.PI / 2,
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
      1,
      1,
    )

    expect(frame.scaleHandles).toBe(false)
    expect(frame.bounds).toBeUndefined()
    expect(frame.preview[0]?.points).toBe(scene[0]?.points)
    expect(frame.gesturePicture).toEqual({
      kind: 'rotate',
      center: point(5, 0),
      angle: Math.PI / 2,
      draw: 'transform',
    })
    expect(frame.rotateHandle?.x).toBeCloseTo(-13)
    expect(frame.rotateHandle?.y).toBeCloseTo(0)
    expect(frame.rotatedBounds?.[0]?.x).toBeCloseTo(3)
    expect(frame.rotatedBounds?.[0]?.y).toBeCloseTo(-7)
    expect(frame.rotatedBounds?.[1]?.x).toBeCloseTo(3)
    expect(frame.rotatedBounds?.[1]?.y).toBeCloseTo(7)
    expect(frame.rotatedBounds?.[2]?.x).toBeCloseTo(7)
    expect(frame.rotatedBounds?.[2]?.y).toBeCloseTo(7)
    expect(frame.rotatedBounds?.[3]?.x).toBeCloseTo(7)
    expect(frame.rotatedBounds?.[3]?.y).toBeCloseTo(-7)
    expect(hiddenPolylineKey(['line'], gesture, true)).toBe('line')
  })

  it('snaps the rotating preview when shift is held', () => {
    const gesture: RotateGesture = {
      kind: 'rotate',
      pointerId: 1,
      startScene: point(6, 0),
      currentScene: point(6, 1),
      ids: ['line'],
      center: point(5, 0),
      angle: Math.PI / 6,
    }
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      ['line'],
      gesture,
      undefined,
      true,
      false,
      1,
      1,
    )

    expect(frame.preview[0]?.points).toBe(scene[0]?.points)
    expect(frame.gesturePicture).toMatchObject({
      kind: 'rotate',
      angle: Math.PI / 4,
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

  it('hides a selection, and hides a drag except when alt keeps the move', () => {
    expect(hiddenPolylineKey(['a', 'c'], undefined, false)).toBe('a,c')
    expect(hiddenPolylineKey(['a', 'b'], move, false)).toBe('a,b')
    expect(hiddenPolylineKey(['a', 'b'], move, true)).toBe('')
    expect(
      hiddenPolylineKey(
        ['a'],
        {
          kind: 'point',
          pointerId: 1,
          startScene: point(0, 0),
          currentScene: point(1, 1),
          id: 'a',
          index: 0,
        },
        true,
      ),
    ).toBe('a')
    expect(hiddenPolylineKey([], undefined, false)).toBe('')
    const many = Array.from({ length: 513 }, (_, index) => `id-${index}`)
    expect(hiddenPolylineKey(many, undefined, false)).toBe('')
  })
})

describe('selection accent', () => {
  const scene = [
    stroke('chosen', [point(0, 0), point(10, 0), point(10, 10)], true, 0.8),
    stroke('other', [point(0, 20), point(10, 20)]),
  ]

  it('previews the selected strokes and leaves the rest stored', () => {
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      ['chosen'],
      undefined,
      undefined,
      false,
      false,
      1,
      1,
    )

    expect(frame.preview).toEqual([
      {
        points: [point(0, 0), point(10, 0), point(10, 10)],
        closed: true,
        widthMm: 0.8,
      },
    ])
    expect(scene[1]?.stroke).toBe('#1e1e1e')
    expect(hiddenPolylineKey(['chosen'], undefined, false)).toBe('chosen')
  })

  it('leaves a large selection on the static canvas and draws no accent copy', () => {
    const many = Array.from({ length: 513 }, (_, index) => `id-${index}`)
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      many,
      undefined,
      undefined,
      false,
      false,
      1,
      1,
    )

    expect(frame.preview).toEqual([])
  })

  it('does not recolor a polyline the marquee has not selected yet', () => {
    const frame = overlayFrame(
      scene,
      [point(1, 2)],
      point(4, 5),
      ['chosen'],
      {
        kind: 'marquee',
        pointerId: 1,
        startScene: point(0, 20),
        currentScene: point(12, 22),
      },
      undefined,
      false,
      false,
      1,
      1,
    )

    expect(frame.draftPoints).toEqual([point(1, 2), point(4, 5)])
    expect(frame.preview).toEqual([
      {
        points: [point(0, 0), point(10, 0), point(10, 10)],
        closed: true,
        widthMm: 0.8,
      },
    ])
  })

  it('keeps the original stroke on the static canvas while alt moves the copy', () => {
    const gesture: MoveGesture = {
      kind: 'move',
      pointerId: 1,
      startScene: point(0, 0),
      currentScene: point(3, 4),
      ids: ['chosen'],
    }
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      ['chosen'],
      gesture,
      undefined,
      false,
      true,
      1,
      1,
    )

    expect(hiddenPolylineKey(['chosen'], gesture, true)).toBe('')
    expect(frame.preview[0]?.points).toBe(scene[0]?.points)
    expect(frame.gesturePicture).toEqual({
      kind: 'move',
      delta: point(3, 4),
      draw: 'transform',
    })
    expect(scene[0]?.stroke).toBe('#1e1e1e')
  })

  it('draws a fitting move from the stored rectangle and keeps the point arrays', () => {
    const gesture: MoveGesture = {
      kind: 'move',
      pointerId: 1,
      startScene: point(0, 0),
      currentScene: point(3, 4),
      ids: ['chosen'],
    }
    const resting = selectionFrameOf(scene, ['chosen'], 1)
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      ['chosen'],
      gesture,
      undefined,
      false,
      false,
      1,
      1,
      [],
      undefined,
      resting,
      { width: 800, height: 600 },
    )

    expect(resting).toBeDefined()
    expect(frame.gesturePicture).toEqual({
      kind: 'move',
      delta: point(3, 4),
      draw: 'picture',
    })
    expect(frame.preview).toEqual([])
    expect(frame.pictureStrokes[0]?.points).toBe(scene[0]?.points)
    expect(frame.bounds).toEqual({
      minX: 1,
      maxX: 15,
      minY: 2,
      maxY: 16,
    })
  })

  it('strokes a move whose picture would be larger than the overlay', () => {
    const gesture: MoveGesture = {
      kind: 'move',
      pointerId: 1,
      startScene: point(0, 0),
      currentScene: point(3, 4),
      ids: ['chosen'],
    }
    const resting = selectionFrameOf(scene, ['chosen'], 1)
    const frame = overlayFrame(
      scene,
      [],
      undefined,
      ['chosen'],
      gesture,
      undefined,
      false,
      false,
      1,
      1,
      [],
      undefined,
      resting,
      { width: 4, height: 4 },
    )

    expect(frame.gesturePicture?.draw).toBe('transform')
    expect(frame.preview[0]?.points).toBe(scene[0]?.points)
  })

  it('closes the shape preview on the overlay', () => {
    const gesture: ShapeGesture = {
      kind: 'shape',
      pointerId: 1,
      startCanvas: point(0, 0),
      startScene: point(0, 0),
      currentScene: point(30, 10),
    }
    const frame = overlayFrame(
      [],
      [],
      undefined,
      [],
      gesture,
      undefined,
      false,
      false,
      1,
      1,
      [],
      { kind: 'rectangle', fromCenter: false },
    )

    expect(frame.draftPoints).toEqual([
      point(0, 0),
      point(30, 0),
      point(30, 10),
      point(0, 10),
      point(0, 0),
    ])
  })
})

function stroke(
  id: string,
  points: readonly Point[],
  closed = false,
  widthMm = 0.3,
): Polyline {
  return {
    id,
    points,
    closed,
    stroke: '#1e1e1e',
    widthMm,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
