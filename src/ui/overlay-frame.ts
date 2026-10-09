import { previewStrokePoints } from '../scene/polyline'
import type { Point, Polyline } from '../scene/polyline'
import { hiddenPolylineIds, selectionBounds } from '../scene/selection'
import type { DragHide, SelectionBounds } from '../scene/selection'
import { dragDelta, draftPoint, draggedHandle } from '../scene/ruler'
import { scalePolylines } from '../scene/scale'
import type { Scene } from '../scene/sheet'
import type {
  PointEdit,
  PointGesture,
  ScaleGesture,
  SelectGesture,
} from './sheet-pointer'

export function overlayFrame(
  scene: Scene,
  draftPoints: readonly Point[],
  follower: Point | undefined,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  pointEdit: PointEdit | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
): OverlayFrame {
  const bounds = selectionFrameBounds(
    scene,
    selectedIds,
    gesture,
    shiftHeld,
    altHeld,
  )
  return {
    draftPoints: previewStrokePoints(
      draftPoints,
      followerEnd(draftPoints, follower, shiftHeld),
    ),
    preview: overlayPreview(scene, selectedIds, gesture, shiftHeld, altHeld),
    bounds,
    marquee:
      gesture?.kind === 'marquee'
        ? { start: gesture.startScene, end: gesture.currentScene }
        : undefined,
    handles: pointHandles(scene, pointEdit, gesture, shiftHeld),
    scaleHandles: pointEdit === undefined && bounds !== undefined,
  }
}

export function hiddenPolylineKey(
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  altHeld: boolean,
): string {
  if (gesture?.kind === 'move' && altHeld) {
    return ''
  }

  const dragged = hiddenPolylineIds(dragHide(gesture, altHeld))
  return (dragged.length > 0 ? dragged : selectedIds).join(',')
}

export function idsInHiddenKey(hiddenKey: string): readonly string[] {
  if (!hiddenKey) {
    return []
  }
  return hiddenKey.split(',')
}

function dragHide(
  gesture: SelectGesture | undefined,
  altHeld: boolean,
): DragHide | undefined {
  if (gesture?.kind === 'point') {
    return { kind: 'point', ids: [gesture.id], altHeld }
  }
  if (gesture?.kind === 'scale') {
    return { kind: 'scale', ids: gesture.ids, altHeld }
  }
  if (gesture?.kind === 'move') {
    return { kind: 'move', ids: gesture.ids, altHeld }
  }
  return undefined
}

function followerEnd(
  points: readonly Point[],
  follower: Point | undefined,
  shiftHeld: boolean,
): Point | undefined {
  if (!follower) {
    return undefined
  }

  return draftPoint({ points, pointer: follower, shiftHeld })
}

function overlayPreview(
  scene: Scene,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
): OverlayFrame['preview'] {
  if (gesture?.kind === 'point') {
    return pointDragPreview(scene, gesture, shiftHeld)
  }
  if (gesture?.kind === 'scale') {
    return scalePreview(scene, gesture, shiftHeld, altHeld)
  }
  return selectionPreview(scene, selectedIds, gesture, shiftHeld)
}

function pointDragPreview(
  scene: Scene,
  gesture: PointGesture,
  shiftHeld: boolean,
): OverlayFrame['preview'] {
  const polyline = scene.find((item) => item.id === gesture.id)
  if (!polyline) {
    return []
  }

  return [
    {
      points: pointsWithMovedIndex(polyline.points, gesture, shiftHeld),
      closed: polyline.closed,
      widthMm: polyline.widthMm,
    },
  ]
}

function selectionPreview(
  scene: Scene,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
): OverlayFrame['preview'] {
  const selection = activeSelection(selectedIds, gesture, shiftHeld)
  return scene.flatMap((polyline) => {
    if (!selection.ids.includes(polyline.id)) {
      return []
    }
    return [
      {
        points: selection.delta
          ? translatedPoints(polyline.points, selection.delta)
          : polyline.points,
        closed: polyline.closed,
        widthMm: polyline.widthMm,
      },
    ]
  })
}

function selectionFrameBounds(
  scene: Scene,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
): SelectionBounds | undefined {
  if (gesture?.kind === 'scale') {
    return selectionBounds(
      pointsIn(
        scalePolylines(scene, scaleInput(gesture, shiftHeld, altHeld)),
        gesture.ids,
      ),
    )
  }

  const selection = activeSelection(selectedIds, gesture, shiftHeld)
  const points = scene.flatMap((polyline) => {
    if (!selection.ids.includes(polyline.id)) {
      return []
    }
    if (gesture?.kind === 'point' && gesture.id === polyline.id) {
      return pointsWithMovedIndex(polyline.points, gesture, shiftHeld)
    }
    return selection.delta
      ? translatedPoints(polyline.points, selection.delta)
      : polyline.points
  })
  return selectionBounds(points)
}

function scalePreview(
  scene: Scene,
  gesture: ScaleGesture,
  shiftHeld: boolean,
  altHeld: boolean,
): OverlayFrame['preview'] {
  const scaled = scalePolylines(scene, scaleInput(gesture, shiftHeld, altHeld))
  return scaled.flatMap((polyline) => {
    if (!gesture.ids.includes(polyline.id)) {
      return []
    }
    return [
      {
        points: polyline.points,
        closed: polyline.closed,
        widthMm: polyline.widthMm,
      },
    ]
  })
}

function scaleInput(
  gesture: ScaleGesture,
  shiftHeld: boolean,
  altHeld: boolean,
) {
  return {
    ids: gesture.ids,
    handle: gesture.handle,
    pointer: gesture.currentScene,
    shiftHeld,
    altHeld,
  }
}

function pointsIn(scene: Scene, ids: readonly string[]): readonly Point[] {
  return scene.flatMap((polyline) =>
    ids.includes(polyline.id) ? polyline.points : [],
  )
}

function pointHandles(
  scene: Scene,
  pointEdit: PointEdit | undefined,
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
): OverlayFrame['handles'] {
  if (!pointEdit) {
    return []
  }

  const polyline = scene.find((item) => item.id === pointEdit.id)
  if (!polyline) {
    return []
  }

  const points = handlePoints(polyline, gesture, shiftHeld)
  const selectedIndex = handleSelection(pointEdit, gesture)
  return points.map((point, index) => ({
    point,
    selected: index === selectedIndex,
  }))
}

function handlePoints(
  polyline: Polyline,
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
): readonly Point[] {
  if (gesture?.kind === 'point' && gesture.id === polyline.id) {
    return pointsWithMovedIndex(polyline.points, gesture, shiftHeld)
  }
  if (gesture?.kind === 'move' && gesture.ids.includes(polyline.id)) {
    return translatedPoints(
      polyline.points,
      dragDelta({
        start: gesture.startScene,
        pointer: gesture.currentScene,
        shiftHeld,
      }),
    )
  }
  return polyline.points
}

function handleSelection(
  pointEdit: PointEdit,
  gesture: SelectGesture | undefined,
): number | undefined {
  if (gesture?.kind === 'point') {
    return gesture.index
  }
  if (gesture?.kind === 'press' && gesture.pointIndex !== undefined) {
    return gesture.pointIndex
  }
  return pointEdit.pointIndex
}

function pointsWithMovedIndex(
  points: readonly Point[],
  gesture: PointGesture,
  shiftHeld: boolean,
): readonly Point[] {
  return points.map((point, index) =>
    index === gesture.index
      ? draggedHandle({
          origin: point,
          start: gesture.startScene,
          pointer: gesture.currentScene,
          shiftHeld,
        })
      : point,
  )
}

function activeSelection(
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
): ActiveSelection {
  if (gesture?.kind === 'move') {
    return {
      ids: gesture.ids,
      delta: dragDelta({
        start: gesture.startScene,
        pointer: gesture.currentScene,
        shiftHeld,
      }),
    }
  }
  return { ids: selectedIds, delta: undefined }
}

function translatedPoints(
  points: readonly Point[],
  delta: Point,
): readonly Point[] {
  return points.map((point) => translatedPoint(point, delta))
}

function translatedPoint(point: Point, delta: Point): Point {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y,
  }
}

export type OverlayFrame = {
  draftPoints: readonly Point[]
  preview: readonly {
    points: readonly Point[]
    closed: boolean
    widthMm: number
  }[]
  bounds: SelectionBounds | undefined
  marquee: { start: Point; end: Point } | undefined
  handles: readonly { point: Point; selected: boolean }[]
  scaleHandles: boolean
}

type ActiveSelection = {
  ids: readonly string[]
  delta: Point | undefined
}
