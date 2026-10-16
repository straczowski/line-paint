import { describe, expect, it } from 'vitest'
import { defaultLayers, resetLayers } from '../scene/layer'
import type { Layer } from '../scene/layer'
import type { Point, Polyline } from '../scene/polyline'
import type { Scene } from '../scene/sheet'
import { commitDrawing, undoDrawing } from './history'
import type { DrawingStep } from './history'

describe('commitDrawing', () => {
  it('restores the drawing and the editor state, then the step before that', () => {
    const origin = step([line('a', 0)], ['a'], { x: 10, y: 10 })
    const moved = [line('a', 5)]
    const afterMove = commitDrawing([], origin, moved)
    const duplicated = [...moved, line('b', 9)]
    const afterDuplicate = commitDrawing(
      afterMove.past,
      afterMove.step,
      duplicated,
      {
        selectedIds: ['b'],
        enteredGroupId: 'inner',
        pointEdit: { id: 'b', pointIndex: 1 },
        duplicateDelta: { x: 4, y: 0 },
      },
    )

    const firstUndo = undoDrawing(afterDuplicate.past)
    const secondUndo = undoDrawing(firstUndo?.past ?? [])

    expect(afterDuplicate.recorded).toBe(true)
    expect(firstUndo?.step).toEqual(afterMove.step)
    expect(firstUndo?.step.scene).toEqual(moved)
    expect(secondUndo?.step).toEqual(origin)
    expect(secondUndo?.past).toEqual([])
    expect(undoDrawing([])).toBeUndefined()
  })

  it('drops the oldest step once the past holds 100', () => {
    let past: readonly DrawingStep[] = []
    let current = step([line('s', 0)])
    for (let index = 0; index < 101; index += 1) {
      const next = [line('s', index + 1)]
      const committed = commitDrawing(past, current, next)
      past = committed.past
      current = committed.step
    }

    expect(past).toHaveLength(100)
    expect(past[0]?.scene[0]?.points[0]?.x).toBe(1)
    expect(past.at(-1)?.scene[0]?.points[0]?.x).toBe(100)
  })

  it('skips a commit when the drawing fields match', () => {
    const current = step([
      {
        ...line('a', 0),
        closed: true,
        stroke: '#e03131',
        widthMm: 0.8,
        groupIds: ['g'],
      },
    ])
    const copy: Scene = current.scene.map((polyline) => ({
      ...polyline,
      points: polyline.points.map((point) => ({ ...point })),
      groupIds: [...(polyline.groupIds ?? [])],
    }))

    const polyline = current.scene[0]
    if (!polyline) {
      throw new Error('missing polyline')
    }

    const skipped = commitDrawing([], current, copy)
    const closed = commitDrawing([], current, [{ ...polyline, closed: false }])
    const grouped = commitDrawing([], current, [
      { ...polyline, groupIds: ['other'] },
    ])

    expect(skipped.recorded).toBe(false)
    expect(skipped.past).toEqual([])
    expect(commitDrawing([], current, current.scene).recorded).toBe(false)
    expect(closed.recorded).toBe(true)
    expect(grouped.recorded).toBe(true)
  })

  it('records a blueprint and restores it with the polylines', () => {
    const current = step([])
    const image = {
      id: 'photo',
      href: 'data:,',
      x: 1,
      y: 2,
      widthMm: 10,
      heightMm: 8,
      rotation: 0,
      locked: false,
    }
    const added = commitDrawing([], current, current.scene, undefined, [image])
    const locked = commitDrawing([], added.step, added.step.scene, undefined, [
      { ...image, locked: true },
    ])
    const undone = undoDrawing(locked.past)

    expect(added.recorded).toBe(true)
    expect(locked.recorded).toBe(true)
    expect(undone?.step.images).toEqual([image])
    expect(
      commitDrawing([], added.step, added.step.scene, undefined, [image])
        .recorded,
    ).toBe(false)
  })

  it('records a layer rename that leaves the polylines alone', () => {
    const current = step([])
    const renamed = current.layers.map((layer) =>
      layer.id === 'default' ? { ...layer, name: 'Ink' } : layer,
    )
    const committed = commitDrawing(
      [],
      current,
      current.scene,
      undefined,
      undefined,
      renamed,
    )
    const undone = undoDrawing(committed.past)

    expect(committed.recorded).toBe(true)
    expect(committed.step.layers[0]?.name).toBe('Ink')
    expect(undone?.step.layers).toEqual(current.layers)
    expect(
      commitDrawing(
        [],
        committed.step,
        committed.step.scene,
        undefined,
        undefined,
        committed.step.layers,
      ).recorded,
    ).toBe(false)
  })

  it('records a layer reset and skips one that is already Default', () => {
    const layers: readonly Layer[] = [
      { id: 'red', name: 'Red', color: '#e03131' },
      { id: 'default', name: 'Default', color: '#1e1e1e' },
    ]
    const scene = [
      {
        ...line('a', 0),
        layerId: 'red',
        stroke: '#e03131',
      },
    ]
    const current = { ...step(scene), layers }
    const reset = resetLayers(layers, scene)
    const committed = commitDrawing(
      [],
      current,
      reset.scene,
      undefined,
      undefined,
      reset.layers,
    )
    const undone = undoDrawing(committed.past)
    const again = resetLayers(committed.step.layers, committed.step.scene)
    const skipped = commitDrawing(
      committed.past,
      committed.step,
      again.scene,
      undefined,
      undefined,
      again.layers,
    )

    expect(committed.recorded).toBe(true)
    expect(committed.step.layers).toEqual(defaultLayers())
    expect(committed.step.scene[0]).toMatchObject({
      layerId: 'default',
      stroke: '#1e1e1e',
    })
    expect(undone?.step.layers).toEqual(layers)
    expect(undone?.step.scene).toEqual(scene)
    expect(skipped.recorded).toBe(false)
    expect(skipped.past).toBe(committed.past)
  })
})

function step(
  scene: Scene,
  selectedIds: readonly string[] = [],
  duplicateDelta?: Point,
): DrawingStep {
  return {
    scene,
    images: [],
    layers: defaultLayers(),
    selectedIds,
    enteredGroupId: undefined,
    pointEdit: undefined,
    duplicateDelta,
  }
}

function line(id: string, x: number): Polyline {
  return {
    id,
    points: [
      { x, y: 0 },
      { x: x + 1, y: 0 },
    ],
    closed: false,
    stroke: '#1e1e1e',
    widthMm: 0.3,
  }
}
