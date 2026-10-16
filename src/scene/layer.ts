import type { Polyline } from './polyline'
import { defaultPolylineStroke } from './polyline'

export function defaultLayers(): readonly Layer[] {
  return [
    {
      id: defaultLayerId,
      name: 'Default',
      color: defaultPolylineStroke,
    },
  ]
}

export function addLayer(
  layers: readonly Layer[],
  id: string,
): readonly Layer[] {
  if (layers.some((layer) => layer.id === id)) {
    throw new Error(`Layer ${id} already exists`)
  }

  return [
    { id, name: nextLayerName(layers), color: defaultPolylineStroke },
    ...layers,
  ]
}

export function renameLayer(
  layers: readonly Layer[],
  id: string,
  rawName: string,
): readonly Layer[] {
  const layer = requiredLayer(layers, id)
  const name = rawName.trim()
  if (
    name.length === 0 ||
    name.length > layerNameLimit ||
    name.toLowerCase() === layer.name.toLowerCase() ||
    nameTaken(layers, name, id)
  ) {
    return layers
  }

  return layers.map((item) => (item.id === id ? { ...item, name } : item))
}

export function recolorLayer(
  layers: readonly Layer[],
  scene: readonly Polyline[],
  id: string,
  color: string,
): LayerPaint {
  if (!layerColorChoices.some((choice) => choice.color === color)) {
    throw new Error(`Unknown layer color ${color}`)
  }

  const layer = requiredLayer(layers, id)
  const sceneNext = paintMembers(scene, layers, layer.id, {
    ...layer,
    color,
  })
  const layersNext =
    layer.color === color
      ? layers
      : layers.map((item) => (item.id === id ? { ...item, color } : item))
  if (sceneNext === scene && layersNext === layers) {
    return { layers, scene }
  }

  return { layers: layersNext, scene: sceneNext }
}

export function deleteLayer(
  layers: readonly Layer[],
  scene: readonly Polyline[],
  id: string,
): LayerDelete | undefined {
  if (layers.length < 2) {
    return undefined
  }

  const index = layers.findIndex((layer) => layer.id === id)
  if (index < 0) {
    throw new Error(`No layer ${id}`)
  }

  const removed = requiredLayer(layers, id)
  const receiver = layers[index + 1] ?? layers[index - 1]
  if (!receiver) {
    return undefined
  }

  return {
    layers: layers.filter((layer) => layer.id !== id),
    scene: paintMembers(scene, layers, removed.id, receiver),
    receiverId: receiver.id,
  }
}

export function resetLayers(
  layers: readonly Layer[],
  scene: readonly Polyline[],
): LayerPaint {
  const start = defaultLayers()
  const receiver = bottomLayer(start)
  const sceneNext = paintWhere(scene, () => true, receiver)
  const only = layers.length === 1 ? layers[0] : undefined
  if (
    sceneNext === scene &&
    only?.id === receiver.id &&
    only.name === receiver.name &&
    only.color === receiver.color
  ) {
    return { layers, scene }
  }

  return { layers: start, scene: sceneNext }
}

export function assignPolylines(
  scene: readonly Polyline[],
  ids: readonly string[],
  layers: readonly Layer[],
  layerId: string,
): readonly Polyline[] {
  const layer = requiredLayer(layers, layerId)
  const selected = new Set(ids)
  return paintWhere(scene, (polyline) => selected.has(polyline.id), layer)
}

export function penLayer(layers: readonly Layer[], id: string): Layer {
  return layers.find((layer) => layer.id === id) ?? bottomLayer(layers)
}

export function sharedLayerId(
  scene: readonly Polyline[],
  ids: readonly string[],
  layers: readonly Layer[],
): string | undefined {
  const selected = scene.filter((polyline) => ids.includes(polyline.id))
  const first = selected[0]
  if (!first) {
    return undefined
  }

  const shared = layerOf(first, layers).id
  if (selected.every((polyline) => layerOf(polyline, layers).id === shared)) {
    return shared
  }

  return undefined
}

export function polylinesOnLayer(
  scene: readonly Polyline[],
  layer: Layer,
  layers: readonly Layer[],
): readonly Polyline[] {
  return scene.filter((polyline) => layerOf(polyline, layers).id === layer.id)
}

function paintMembers(
  scene: readonly Polyline[],
  layers: readonly Layer[],
  memberId: string,
  receiver: Layer,
): readonly Polyline[] {
  return paintWhere(
    scene,
    (polyline) => layerOf(polyline, layers).id === memberId,
    receiver,
  )
}

function paintWhere(
  scene: readonly Polyline[],
  chosen: (polyline: Polyline) => boolean,
  receiver: Layer,
): readonly Polyline[] {
  let changed = false
  const next = scene.map((polyline) => {
    if (!chosen(polyline)) {
      return polyline
    }
    if (
      polyline.layerId === receiver.id &&
      polyline.stroke === receiver.color
    ) {
      return polyline
    }
    changed = true
    return { ...polyline, layerId: receiver.id, stroke: receiver.color }
  })
  return changed ? next : scene
}

function nextLayerName(layers: readonly Layer[]): string {
  for (let number = 2; number < 100000; number += 1) {
    const name = `Layer ${number}`
    if (name.length > layerNameLimit) {
      break
    }
    if (!nameTaken(layers, name)) {
      return name
    }
  }

  throw new Error('No free layer name')
}

function nameTaken(
  layers: readonly Layer[],
  name: string,
  exceptId?: string,
): boolean {
  const folded = name.toLowerCase()
  return layers.some(
    (layer) => layer.id !== exceptId && layer.name.toLowerCase() === folded,
  )
}

function layerOf(polyline: Polyline, layers: readonly Layer[]): Layer {
  const named = polyline.layerId
    ? layers.find((layer) => layer.id === polyline.layerId)
    : undefined
  return named ?? bottomLayer(layers)
}

function bottomLayer(layers: readonly Layer[]): Layer {
  const layer = layers.at(-1)
  if (!layer) {
    throw new Error('A drawing needs a layer')
  }
  return layer
}

function requiredLayer(layers: readonly Layer[], id: string): Layer {
  const layer = layers.find((item) => item.id === id)
  if (!layer) {
    throw new Error(`No layer ${id}`)
  }
  return layer
}

export const defaultLayerId = 'default'

export const layerNameLimit = 32

export const layerColorChoices = [
  { name: 'Black', color: '#1e1e1e' },
  { name: 'Red', color: '#e03131' },
  { name: 'Green', color: '#2f9e44' },
  { name: 'Blue', color: '#1971c2' },
  { name: 'Yellow', color: '#f08c00' },
] as const

export type Layer = {
  id: string
  name: string
  color: string
}

export type LayerPaint = {
  layers: readonly Layer[]
  scene: readonly Polyline[]
}

export type LayerDelete = LayerPaint & {
  receiverId: string
}
