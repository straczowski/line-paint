import { previewStrokePoints } from '../scene/polyline'
import type { Point, Polyline } from '../scene/polyline'
import {
  blueprintCorners,
  blueprintPoints,
  blueprintRotateHandle,
  loneBlueprint,
  rotateBlueprints,
  scaleBlueprintFrame,
  scaleBlueprints,
  selectionIsFrozen,
  translateBlueprints,
} from '../scene/blueprint'
import type { Blueprint } from '../scene/blueprint'
import {
  hiddenPolylineIds,
  selectionBounds,
  selectionIsOneGroup,
} from '../scene/selection'
import type { DragHide, SelectionBounds } from '../scene/selection'
import { dragDelta, draftPoint, draggedHandle } from '../scene/ruler'
import {
  rotatedSelection,
  rotatePolylines,
  rotationAngle,
  selectionCenter,
} from '../scene/rotate'
import { scalePolylines } from '../scene/scale'
import type { Scene } from '../scene/sheet'
import type {
  PointEdit,
  PointGesture,
  RotateGesture,
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
  zoom: number,
  pixelsPerMm: number,
  images: readonly Blueprint[] = [],
): OverlayFrame {
  const single = loneBlueprint(images, selectedIds)
  if (single) {
    return singleImageFrame(
      scene,
      single,
      draftPoints,
      follower,
      gesture,
      pointEdit,
      shiftHeld,
      altHeld,
      zoom,
      pixelsPerMm,
    )
  }

  const frozen = selectionIsFrozen(scene, images, selectedIds)
  const rotation =
    gesture?.kind === 'rotate'
      ? rotationOverlay(scene, images, gesture, shiftHeld, zoom, pixelsPerMm)
      : undefined
  const bounds = rotation
    ? undefined
    : selectionFrameBounds(
        scene,
        images,
        selectedIds,
        gesture,
        shiftHeld,
        altHeld,
        zoom,
      )
  return {
    draftPoints: previewStrokePoints(
      draftPoints,
      followerEnd(draftPoints, follower, shiftHeld),
    ),
    preview:
      rotation?.preview ??
      overlayPreview(scene, selectedIds, gesture, shiftHeld, altHeld, zoom),
    bounds,
    rotatedBounds: rotation?.corners,
    dashed: selectionIsOneGroup(scene, bounds || rotation ? selectedIds : []),
    marquee:
      gesture?.kind === 'marquee'
        ? { start: gesture.startScene, end: gesture.currentScene }
        : undefined,
    handles: pointHandles(scene, pointEdit, gesture, shiftHeld),
    scaleHandles: !frozen && pointEdit === undefined && bounds !== undefined,
    scaleHandlePoints: undefined,
    rotateHandle: frozen
      ? undefined
      : (rotation?.handle ??
        restingRotateHandle(bounds, pointEdit, pixelsPerMm)),
    blueprints:
      rotation?.blueprints ??
      draggedBlueprints(scene, images, gesture, shiftHeld, altHeld, zoom),
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

export function hiddenBlueprintIds(
  gesture: SelectGesture | undefined,
  scene: Scene,
  altHeld: boolean,
): readonly string[] {
  if (
    !gesture ||
    (gesture.kind !== 'move' &&
      gesture.kind !== 'scale' &&
      gesture.kind !== 'rotate')
  ) {
    return []
  }
  if (
    gesture.kind === 'move' &&
    altHeld &&
    gesture.ids.some((id) => scene.some((polyline) => polyline.id === id))
  ) {
    return []
  }
  return gesture.ids
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
  if (gesture?.kind === 'rotate') {
    return { kind: 'rotate', ids: gesture.ids, altHeld }
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
  zoom: number,
): OverlayFrame['preview'] {
  if (gesture?.kind === 'point') {
    return pointDragPreview(scene, gesture, shiftHeld)
  }
  if (gesture?.kind === 'scale') {
    return scalePreview(scene, gesture, shiftHeld, altHeld, zoom)
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
  images: readonly Blueprint[],
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
): SelectionBounds | undefined {
  if (gesture?.kind === 'scale') {
    const framePoints = [
      ...pointsIn(scene, gesture.ids),
      ...blueprintPoints(images, gesture.ids),
    ]
    const change = {
      ...scaleInput(gesture, shiftHeld, altHeld, zoom),
      framePoints,
    }
    return selectionBounds(
      [
        ...pointsIn(scalePolylines(scene, change), gesture.ids),
        ...blueprintPoints(scaleBlueprints(images, change), gesture.ids),
      ],
      zoom,
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
  const pictures = images.flatMap((image) => {
    if (!selection.ids.includes(image.id)) {
      return []
    }
    const shown =
      selection.delta && !image.locked
        ? {
            ...image,
            x: image.x + selection.delta.x,
            y: image.y + selection.delta.y,
          }
        : image
    return blueprintCorners(shown)
  })
  return selectionBounds([...points, ...pictures], zoom)
}

function rotationOverlay(
  scene: Scene,
  images: readonly Blueprint[],
  gesture: RotateGesture,
  shiftHeld: boolean,
  zoom: number,
  pixelsPerMm: number,
): RotationOverlay | undefined {
  const points = [
    ...pointsIn(scene, gesture.ids),
    ...blueprintPoints(images, gesture.ids),
  ]
  const bounds = selectionBounds(points, zoom)
  const center = selectionCenter(points)
  if (!bounds || !center) {
    return undefined
  }

  const angle = rotationAngle(gesture.angle, shiftHeld)
  const rotated = rotatePolylines(scene, {
    ids: gesture.ids,
    angle: gesture.angle,
    shiftHeld,
    center,
  })
  const turned = rotateBlueprints(images, {
    ids: gesture.ids,
    center,
    angle: gesture.angle,
    shiftHeld,
  })
  const frame = rotatedSelection(bounds, center, angle, pixelsPerMm)
  return {
    preview: rotated.flatMap((polyline) => {
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
    }),
    corners: frame.corners,
    handle: frame.handle,
    blueprints: turned.filter((image) => gesture.ids.includes(image.id)),
  }
}

function restingRotateHandle(
  bounds: SelectionBounds | undefined,
  pointEdit: PointEdit | undefined,
  pixelsPerMm: number,
): Point | undefined {
  if (!bounds || pointEdit || !(pixelsPerMm > 0)) {
    return undefined
  }

  return rotatedSelection(bounds, selectionCenterOf(bounds), 0, pixelsPerMm)
    .handle
}

function selectionCenterOf(bounds: SelectionBounds): Point {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
}

function scalePreview(
  scene: Scene,
  gesture: ScaleGesture,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
): OverlayFrame['preview'] {
  const scaled = scalePolylines(
    scene,
    scaleInput(gesture, shiftHeld, altHeld, zoom),
  )
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
  zoom: number,
) {
  return {
    ids: gesture.ids,
    handle: gesture.handle,
    pointer: gesture.currentScene,
    shiftHeld,
    altHeld,
    zoom,
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

function singleImageFrame(
  scene: Scene,
  image: Blueprint,
  draftPoints: readonly Point[],
  follower: Point | undefined,
  gesture: SelectGesture | undefined,
  pointEdit: PointEdit | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
  pixelsPerMm: number,
): OverlayFrame {
  const shown = shownBlueprint(image, gesture, shiftHeld, altHeld, zoom)
  const turning = gesture?.kind === 'rotate'
  return {
    draftPoints: previewStrokePoints(
      draftPoints,
      followerEnd(draftPoints, follower, shiftHeld),
    ),
    preview: [],
    bounds: undefined,
    rotatedBounds: blueprintCorners(shown),
    dashed: false,
    marquee:
      gesture?.kind === 'marquee'
        ? { start: gesture.startScene, end: gesture.currentScene }
        : undefined,
    handles: pointHandles(scene, pointEdit, gesture, shiftHeld),
    scaleHandles: false,
    scaleHandlePoints:
      shown.locked || turning ? undefined : blueprintCorners(shown),
    rotateHandle: shown.locked
      ? undefined
      : blueprintRotateHandle(shown, pixelsPerMm),
    blueprints: imageFollowsGesture(scene, shown, gesture, altHeld)
      ? [shown]
      : [],
  }
}

function shownBlueprint(
  image: Blueprint,
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
): Blueprint {
  if (image.locked || !gesture || !gestureHas(gesture, image.id)) {
    return image
  }
  if (gesture.kind === 'move') {
    return (
      translateBlueprints([image], {
        ids: [image.id],
        delta: dragDelta({
          start: gesture.startScene,
          pointer: gesture.currentScene,
          shiftHeld,
        }),
      })[0] ?? image
    )
  }
  if (gesture.kind === 'scale') {
    return scaleBlueprintFrame(
      image,
      scaleInput(gesture, shiftHeld, altHeld, zoom),
    )
  }
  if (gesture.kind === 'rotate') {
    return (
      rotateBlueprints([image], {
        ids: [image.id],
        center: gesture.center,
        angle: gesture.angle,
        shiftHeld,
      })[0] ?? image
    )
  }
  return image
}

function draggedBlueprints(
  scene: Scene,
  images: readonly Blueprint[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
): readonly Blueprint[] {
  if (!gesture || gesture.kind === 'rotate') {
    return []
  }
  if (gesture.kind === 'move') {
    if (altCopiesPolylines(scene, gesture.ids, altHeld)) {
      return []
    }
    return translateBlueprints(images, {
      ids: gesture.ids,
      delta: dragDelta({
        start: gesture.startScene,
        pointer: gesture.currentScene,
        shiftHeld,
      }),
    }).filter((image) => gesture.ids.includes(image.id))
  }
  if (gesture.kind === 'scale') {
    const framePoints = [
      ...pointsIn(scene, gesture.ids),
      ...blueprintPoints(images, gesture.ids),
    ]
    return scaleBlueprints(images, {
      ...scaleInput(gesture, shiftHeld, altHeld, zoom),
      framePoints,
    }).filter((image) => gesture.ids.includes(image.id))
  }
  return []
}

function imageFollowsGesture(
  scene: Scene,
  image: Blueprint,
  gesture: SelectGesture | undefined,
  altHeld: boolean,
): boolean {
  if (!gesture || !gestureHas(gesture, image.id)) {
    return false
  }
  if (gesture.kind === 'scale' || gesture.kind === 'rotate') {
    return true
  }
  if (gesture.kind === 'move') {
    return !altCopiesPolylines(scene, gesture.ids, altHeld)
  }
  return false
}

function altCopiesPolylines(
  scene: Scene,
  ids: readonly string[],
  altHeld: boolean,
): boolean {
  return (
    altHeld && ids.some((id) => scene.some((polyline) => polyline.id === id))
  )
}

function gestureHas(gesture: SelectGesture, id: string): boolean {
  return (
    (gesture.kind === 'move' ||
      gesture.kind === 'scale' ||
      gesture.kind === 'rotate') &&
    gesture.ids.includes(id)
  )
}

export type OverlayFrame = {
  draftPoints: readonly Point[]
  preview: readonly {
    points: readonly Point[]
    closed: boolean
    widthMm: number
  }[]
  bounds: SelectionBounds | undefined
  rotatedBounds: readonly Point[] | undefined
  dashed: boolean
  marquee: { start: Point; end: Point } | undefined
  handles: readonly { point: Point; selected: boolean }[]
  scaleHandles: boolean
  scaleHandlePoints: readonly Point[] | undefined
  rotateHandle: Point | undefined
  blueprints: readonly Blueprint[]
}

type RotationOverlay = {
  preview: OverlayFrame['preview']
  corners: readonly Point[]
  handle: Point
  blueprints: readonly Blueprint[]
}

type ActiveSelection = {
  ids: readonly string[]
  delta: Point | undefined
}
