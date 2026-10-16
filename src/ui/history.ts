import type { Blueprint } from '../scene/blueprint'
import type { Layer } from '../scene/layer'
import type { Point, Polyline } from '../scene/polyline'
import type { Scene } from '../scene/sheet'

export function commitDrawing(
  past: readonly DrawingStep[],
  before: DrawingStep,
  nextScene: Scene,
  editor?: DrawingEditor,
  nextImages?: readonly Blueprint[],
  nextLayers?: readonly Layer[],
): DrawingCommit {
  const images = nextImages ?? before.images
  const layers = nextLayers ?? before.layers
  const pastAfter = recordDrawing(past, before, nextScene, images, layers)
  const recorded = pastAfter !== past
  if (!recorded && !editor) {
    return { past, step: before, recorded: false }
  }

  const step = editor
    ? {
        ...editor,
        scene: recorded ? nextScene : before.scene,
        images: recorded ? images : before.images,
        layers: recorded ? layers : before.layers,
      }
    : { ...before, scene: nextScene, images, layers }
  return { past: pastAfter, step, recorded }
}

export function undoDrawing(
  past: readonly DrawingStep[],
): DrawingUndo | undefined {
  const step = past.at(-1)
  if (!step) {
    return undefined
  }

  return { past: past.slice(0, -1), step }
}

const drawingHistoryLimit = 100

function recordDrawing(
  past: readonly DrawingStep[],
  before: DrawingStep,
  nextScene: Scene,
  nextImages: readonly Blueprint[],
  nextLayers: readonly Layer[],
): readonly DrawingStep[] {
  if (
    sameDrawing(before.scene, nextScene) &&
    sameImages(before.images, nextImages) &&
    sameLayers(before.layers, nextLayers)
  ) {
    return past
  }

  const recorded = [...past, before]
  if (recorded.length <= drawingHistoryLimit) {
    return recorded
  }

  return recorded.slice(recorded.length - drawingHistoryLimit)
}

function sameDrawing(current: Scene, next: Scene): boolean {
  if (current === next) {
    return true
  }
  if (current.length !== next.length) {
    return false
  }

  return current.every((polyline, index) => samePolyline(polyline, next[index]))
}

function samePolyline(current: Polyline, next: Polyline | undefined): boolean {
  if (!next || current.id !== next.id) {
    return false
  }
  if (current.closed !== next.closed || current.stroke !== next.stroke) {
    return false
  }
  if (current.layerId !== next.layerId) {
    return false
  }
  if (current.widthMm !== next.widthMm) {
    return false
  }
  if (!sameGroupIds(current.groupIds, next.groupIds)) {
    return false
  }

  return samePoints(current.points, next.points)
}

function sameImages(
  current: readonly Blueprint[],
  next: readonly Blueprint[],
): boolean {
  if (current === next) {
    return true
  }
  if (current.length !== next.length) {
    return false
  }

  return current.every((image, index) => sameBlueprint(image, next[index]))
}

function sameBlueprint(
  current: Blueprint,
  next: Blueprint | undefined,
): boolean {
  if (!next || current.id !== next.id || current.href !== next.href) {
    return false
  }
  return (
    current.x === next.x &&
    current.y === next.y &&
    current.widthMm === next.widthMm &&
    current.heightMm === next.heightMm &&
    current.rotation === next.rotation &&
    current.locked === next.locked
  )
}

function sameLayers(
  current: readonly Layer[],
  next: readonly Layer[],
): boolean {
  if (current === next) {
    return true
  }
  if (current.length !== next.length) {
    return false
  }

  return current.every((layer, index) => {
    const other = next[index]
    return (
      other !== undefined &&
      layer.id === other.id &&
      layer.name === other.name &&
      layer.color === other.color
    )
  })
}

function sameGroupIds(
  current: readonly string[] | undefined,
  next: readonly string[] | undefined,
): boolean {
  const left = current ?? []
  const right = next ?? []
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  )
}

function samePoints(
  current: readonly Point[],
  next: readonly Point[],
): boolean {
  return (
    current.length === next.length &&
    current.every(
      (point, index) =>
        point.x === next[index]?.x && point.y === next[index]?.y,
    )
  )
}

export type DrawingStep = {
  scene: Scene
  images: readonly Blueprint[]
  layers: readonly Layer[]
  selectedIds: readonly string[]
  enteredGroupId: string | undefined
  pointEdit: PointEdit | undefined
  duplicateDelta: Point | undefined
}

export type DrawingEditor = {
  selectedIds: readonly string[]
  enteredGroupId: string | undefined
  pointEdit: PointEdit | undefined
  duplicateDelta: Point | undefined
}

export type DrawingCommit = {
  past: readonly DrawingStep[]
  step: DrawingStep
  recorded: boolean
}

export type DrawingUndo = {
  past: readonly DrawingStep[]
  step: DrawingStep
}

export type CommitDrawing = (
  nextScene: Scene | ((scene: Scene) => Scene),
  editor?: DrawingEditor,
  nextImages?:
    | readonly Blueprint[]
    | ((images: readonly Blueprint[]) => readonly Blueprint[]),
  nextLayers?: readonly Layer[],
) => void

type PointEdit = {
  id: string
  pointIndex: number | undefined
}
