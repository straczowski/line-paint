import { describe, expect, it } from 'vitest'
import {
  addLayer,
  assignPolylines,
  defaultLayers,
  sharedLayerId,
  deleteLayer,
  renameLayer,
  recolorLayer,
  resetLayers,
} from './layer'
import type { Layer } from './layer'
import type { Point, Polyline } from './polyline'

describe('layers', () => {
  it('starts from Default and inserts the next free name above it', () => {
    const added = addLayer(defaultLayers(), 'two')
    const renamed = renameLayer(added, 'default', 'Ink')
    const again = addLayer(renamed, 'three')

    expect(defaultLayers()).toEqual([
      { id: 'default', name: 'Default', color: '#1e1e1e' },
    ])
    expect(added.map((layer) => layer.name)).toEqual(['Layer 2', 'Default'])
    expect(added[0]).toMatchObject({ id: 'two', color: '#1e1e1e' })
    expect(again.map((layer) => layer.name)).toEqual([
      'Layer 3',
      'Layer 2',
      'Ink',
    ])
  })

  it('keeps a name that is blank, too long, or already used', () => {
    const layers = addLayer(defaultLayers(), 'two')

    const atCap = 'n'.repeat(32)

    expect(renameLayer(layers, 'two', '   ')).toBe(layers)
    expect(renameLayer(layers, 'two', 'Default Layer')[0]?.name).toBe(
      'Default Layer',
    )
    expect(renameLayer(layers, 'two', atCap)[0]?.name).toBe(atCap)
    expect(renameLayer(layers, 'two', `${atCap}n`)).toBe(layers)
    expect(renameLayer(layers, 'two', 'My Red Layer')[0]?.name).toBe(
      'My Red Layer',
    )
    expect(renameLayer(layers, 'two', 'default')).toBe(layers)
    expect(renameLayer(layers, 'two', '  Red  ')[0]?.name).toBe('Red')
    expect(renameLayer(layers, 'two', 'Layer 2')).toBe(layers)
  })

  it('writes a color onto the layer and its polylines', () => {
    const layers = addLayer(defaultLayers(), 'two')
    const scene = [line('a', 'two'), line('b')]
    const painted = recolorLayer(layers, scene, 'two', '#e03131')

    expect(painted.layers[0]?.color).toBe('#e03131')
    expect(painted.scene[0]).toMatchObject({
      layerId: 'two',
      stroke: '#e03131',
    })
    expect(painted.scene[1]).toBe(scene[1])
    expect(
      recolorLayer(painted.layers, painted.scene, 'two', '#e03131'),
    ).toEqual(painted)
  })

  it('moves a deleted layer onto the one below it', () => {
    const layers = [layer('top', 'Layer 3'), layer('mid', 'Layer 2'), bottom]
    const scene = [line('a', 'mid', ['g']), line('b', 'top'), line('c')]
    const removed = deleteLayer(layers, scene, 'mid')

    expect(removed?.layers.map((item) => item.id)).toEqual(['top', 'default'])
    expect(removed?.receiverId).toBe('default')
    expect(removed?.scene[0]).toMatchObject({
      layerId: 'default',
      stroke: '#1e1e1e',
      groupIds: ['g'],
    })
    expect(removed?.scene[1]).toBe(scene[1])
    expect(removed?.scene[2]).toBe(scene[2])
  })

  it('moves the bottom layer onto the one above it and keeps the last layer', () => {
    const layers = [layer('top', 'Layer 2'), bottom]
    const scene = [line('a'), line('loose')]
    const removed = deleteLayer(layers, scene, 'default')

    expect(removed?.layers).toEqual([layers[0]])
    expect(removed?.receiverId).toBe('top')
    expect(removed?.scene.every((polyline) => polyline.layerId === 'top')).toBe(
      true,
    )
    expect(deleteLayer(defaultLayers(), scene, 'default')).toBeUndefined()
  })

  it('assigns a selection, including a group, and leaves other strokes', () => {
    const layers = [layer('red', 'Red', '#e03131'), bottom]
    const scene = [
      line('a', 'default', ['g']),
      line('b', 'default', ['g']),
      line('c', 'red', ['g'], '#e03131'),
    ]
    const next = assignPolylines(scene, ['a', 'b', 'c'], layers, 'red')

    expect(next[0]).toMatchObject({
      layerId: 'red',
      stroke: '#e03131',
      groupIds: ['g'],
    })
    expect(next[1]?.layerId).toBe('red')
    expect(next[2]).toBe(scene[2])
    expect(assignPolylines(next, ['a', 'b', 'c'], layers, 'red')).toBe(next)
  })

  it('marks a selection that sits on one layer', () => {
    const layers = [layer('red', 'Red', '#e03131'), bottom]
    const scene = [
      line('a', 'red', undefined, '#e03131'),
      line('b', 'default'),
      line('c', 'red', undefined, '#e03131'),
    ]

    expect(sharedLayerId(scene, new Set(['a', 'c']), layers)).toBe('red')
    expect(sharedLayerId(scene, new Set(['a', 'b']), layers)).toBeUndefined()
    expect(sharedLayerId(scene, new Set(['missing']), layers)).toBeUndefined()
  })

  it('resets every polyline onto the black Default layer', () => {
    const layers = [
      layer('red', 'Red', '#e03131'),
      layer('default', 'Ink', '#1971c2'),
    ]
    const scene = [
      line('a', 'red', ['g'], '#e03131'),
      line('b', 'default', undefined, '#1971c2'),
      line('c', 'default'),
    ]
    const reset = resetLayers(layers, scene)

    expect(reset.layers).toEqual(defaultLayers())
    expect(reset.scene[0]).toMatchObject({
      layerId: 'default',
      stroke: '#1e1e1e',
      groupIds: ['g'],
    })
    expect(reset.scene[0]?.points).toBe(scene[0]?.points)
    expect(reset.scene[1]).toMatchObject({
      layerId: 'default',
      stroke: '#1e1e1e',
    })
    expect(reset.scene[2]).toBe(scene[2])
  })

  it('leaves a drawing that is already the black Default layer', () => {
    const layers = defaultLayers()
    const scene = [line('a', 'default')]
    const reset = resetLayers(layers, scene)

    expect(reset.layers).toBe(layers)
    expect(reset.scene).toBe(scene)
  })
})

const bottom = layer('default', 'Default')

function layer(id: string, name: string, color = '#1e1e1e'): Layer {
  return { id, name, color }
}

function line(
  id: string,
  layerId?: string,
  groupIds?: readonly string[],
  stroke = '#1e1e1e',
): Polyline {
  return {
    id,
    points: [point(0, 0), point(10, 0)],
    closed: false,
    stroke,
    widthMm: 0.3,
    ...(layerId ? { layerId } : {}),
    ...(groupIds ? { groupIds } : {}),
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
