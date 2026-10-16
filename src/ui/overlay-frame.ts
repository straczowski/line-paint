import { previewStrokePoints } from '../scene/polyline'
import type { Point, Polyline } from '../scene/polyline'
import { shapePoints } from '../scene/shape'
import type { ShapeKind } from '../scene/shape'
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
  selectionFrameOf,
  selectionIsOneGroup,
  translateSelectionFrame,
} from '../scene/selection'
import type {
  DragHide,
  SelectionBounds,
  SelectionFrame,
} from '../scene/selection'
import {
  selectionPictureFits,
  selectionPicturePadPx,
} from '../render/selection-picture'
import type { GesturePicture } from '../render/paint-sheet'
import { dragDelta, draftPoint, draggedHandle } from '../scene/ruler'
import { rotatedSelection, rotationAngle } from '../scene/rotate'
import { scalePolylines } from '../scene/scale'
import type { Scene, WindowSize } from '../scene/sheet'
import type {
  PointEdit,
  PointGesture,
  RotateGesture,
  ScaleGesture,
  SelectGesture,
  ShapeGesture,
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
  shape: ShapePreview | undefined = undefined,
  resting: SelectionFrame | undefined = undefined,
  windowSize: WindowSize | undefined = undefined,
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
  const gesturePicture = gesturePictureOf(
    gesture,
    shiftHeld,
    resting,
    pixelsPerMm,
    windowSize,
  )
  const rotation =
    gesture?.kind === 'rotate'
      ? rotationOverlay(
          scene,
          images,
          gesture,
          shiftHeld,
          zoom,
          pixelsPerMm,
          resting,
          gesturePicture,
        )
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
        resting,
        gesturePicture,
      )
  const preview =
    rotation?.preview ??
    overlayPreview(
      scene,
      selectedIds,
      gesture,
      shiftHeld,
      altHeld,
      zoom,
      gesturePicture,
    )
  return {
    draftPoints:
      gesture?.kind === 'shape'
        ? shapeDraftPoints(gesture, shape, shiftHeld)
        : previewStrokePoints(
            draftPoints,
            followerEnd(draftPoints, follower, shiftHeld),
          ),
    preview,
    pictureStrokes: pictureSource(scene, gesture, gesturePicture),
    gesturePicture,
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

const strokedAccentLimit = 512

export function hiddenPolylineKey(
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  altHeld: boolean,
): string {
  if (gesture?.kind === 'move' && altHeld) {
    return ''
  }
  if (
    selectedIds.length > strokedAccentLimit &&
    !gestureRedrawsSelection(gesture)
  ) {
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

function shapeDraftPoints(
  gesture: ShapeGesture,
  shape: ShapePreview | undefined,
  shiftHeld: boolean,
): readonly Point[] {
  if (!shape) {
    return []
  }

  const points = shapePoints({
    anchor: gesture.startScene,
    pointer: gesture.currentScene,
    kind: shape.kind,
    fromCenter: shape.fromCenter,
    symmetric: shiftHeld,
  })
  const first = points?.[0]
  if (!points || !first) {
    return []
  }
  return [...points, first]
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

function gesturePictureOf(
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  resting: SelectionFrame | undefined,
  pixelsPerMm: number,
  windowSize: WindowSize | undefined,
): GesturePicture | undefined {
  if (gesture?.kind === 'move') {
    return {
      kind: 'move',
      delta: dragDelta({
        start: gesture.startScene,
        pointer: gesture.currentScene,
        shiftHeld,
      }),
      draw: pictureDraw(resting, pixelsPerMm, windowSize),
    }
  }
  if (gesture?.kind !== 'rotate') {
    return undefined
  }

  return {
    kind: 'rotate',
    center: gesture.center,
    angle: rotationAngle(gesture.angle, shiftHeld),
    draw: pictureDraw(resting, pixelsPerMm, windowSize),
  }
}

function pictureDraw(
  resting: SelectionFrame | undefined,
  pixelsPerMm: number,
  windowSize: WindowSize | undefined,
): 'picture' | 'transform' {
  if (!resting || !windowSize) {
    return 'transform'
  }
  if (
    selectionPictureFits(
      resting.tight,
      pixelsPerMm,
      windowSize,
      selectionPicturePadPx(resting.widthMm, pixelsPerMm),
    )
  ) {
    return 'picture'
  }
  return 'transform'
}

function pictureSource(
  scene: Scene,
  gesture: SelectGesture | undefined,
  gesturePicture: GesturePicture | undefined,
): OverlayFrame['preview'] {
  if (
    gesturePicture?.draw !== 'picture' ||
    (gesture?.kind !== 'move' && gesture?.kind !== 'rotate')
  ) {
    return []
  }

  return selectedStrokes(scene, gesture.ids)
}

function overlayPreview(
  scene: Scene,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
  gesturePicture: GesturePicture | undefined,
): OverlayFrame['preview'] {
  if (gesture?.kind === 'point') {
    return pointDragPreview(scene, gesture, shiftHeld)
  }
  if (gesture?.kind === 'scale') {
    return scalePreview(scene, gesture, shiftHeld, altHeld, zoom)
  }
  if (gesturePicture?.draw === 'picture') {
    return []
  }
  if (gesturePicture) {
    const ids =
      gesture?.kind === 'move' || gesture?.kind === 'rotate'
        ? gesture.ids
        : selectedIds
    return selectedStrokes(scene, ids)
  }
  if (selectedIds.length > strokedAccentLimit) {
    return []
  }
  return selectedStrokes(scene, selectedIds)
}

function gestureRedrawsSelection(gesture: SelectGesture | undefined): boolean {
  return (
    gesture?.kind === 'move' ||
    gesture?.kind === 'scale' ||
    gesture?.kind === 'rotate' ||
    gesture?.kind === 'point'
  )
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

function selectedStrokes(
  scene: Scene,
  ids: readonly string[],
): OverlayFrame['preview'] {
  const selected = new Set(ids)
  const strokes: {
    points: readonly Point[]
    closed: boolean
    widthMm: number
  }[] = []
  for (const polyline of scene) {
    if (!selected.has(polyline.id)) {
      continue
    }
    strokes.push({
      points: polyline.points,
      closed: polyline.closed,
      widthMm: polyline.widthMm,
    })
  }
  return strokes
}

function selectionFrameBounds(
  scene: Scene,
  images: readonly Blueprint[],
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
  resting: SelectionFrame | undefined,
  gesturePicture: GesturePicture | undefined,
): SelectionBounds | undefined {
  if (gesture?.kind === 'scale') {
    return scaledBounds(scene, images, gesture, shiftHeld, altHeld, zoom)
  }
  if (gesturePicture?.kind === 'move' && gesture?.kind === 'move') {
    return movedBounds(
      scene,
      images,
      gesture.ids,
      gesturePicture.delta,
      zoom,
      resting,
    )
  }
  if (gesture?.kind === 'point') {
    return pointBounds(scene, images, selectedIds, gesture, shiftHeld, zoom)
  }
  if (resting) {
    return resting.bounds
  }

  return selectionBounds(
    [...pointsIn(scene, selectedIds), ...blueprintPoints(images, selectedIds)],
    zoom,
  )
}

function movedBounds(
  scene: Scene,
  images: readonly Blueprint[],
  ids: readonly string[],
  delta: Point,
  zoom: number,
  resting: SelectionFrame | undefined,
): SelectionBounds | undefined {
  const selected = new Set(ids)
  const locked = images.some((image) => image.locked && selected.has(image.id))
  if (resting && !locked) {
    return translateSelectionFrame(resting, delta).bounds
  }

  const frame = selectionFrameOf(scene, ids, zoom)
  const corners = frame
    ? rectangleCorners(translateSelectionFrame(frame, delta).tight)
    : []
  const pictures = images.flatMap((image) => {
    if (!selected.has(image.id)) {
      return []
    }
    const shown = image.locked
      ? image
      : { ...image, x: image.x + delta.x, y: image.y + delta.y }
    return blueprintCorners(shown)
  })
  return selectionBounds([...corners, ...pictures], zoom)
}

function scaledBounds(
  scene: Scene,
  images: readonly Blueprint[],
  gesture: ScaleGesture,
  shiftHeld: boolean,
  altHeld: boolean,
  zoom: number,
): SelectionBounds | undefined {
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

function pointBounds(
  scene: Scene,
  images: readonly Blueprint[],
  selectedIds: readonly string[],
  gesture: PointGesture,
  shiftHeld: boolean,
  zoom: number,
): SelectionBounds | undefined {
  const selected = new Set(selectedIds)
  const points: Point[] = []
  for (const polyline of scene) {
    if (!selected.has(polyline.id)) {
      continue
    }
    if (polyline.id === gesture.id) {
      points.push(...pointsWithMovedIndex(polyline.points, gesture, shiftHeld))
    } else {
      points.push(...polyline.points)
    }
  }
  return selectionBounds(
    [...points, ...blueprintPoints(images, selectedIds)],
    zoom,
  )
}

function rectangleCorners(bounds: SelectionBounds): readonly Point[] {
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]
}

function rotationOverlay(
  scene: Scene,
  images: readonly Blueprint[],
  gesture: RotateGesture,
  shiftHeld: boolean,
  zoom: number,
  pixelsPerMm: number,
  resting: SelectionFrame | undefined,
  gesturePicture: GesturePicture | undefined,
): RotationOverlay | undefined {
  const frame =
    resting ??
    selectionFrameOf(
      scene,
      gesture.ids,
      zoom,
      blueprintPoints(images, gesture.ids),
    )
  if (!frame) {
    return undefined
  }

  const angle =
    gesturePicture?.kind === 'rotate'
      ? gesturePicture.angle
      : rotationAngle(gesture.angle, shiftHeld)
  const center = gesture.center
  const turned = rotateBlueprints(images, {
    ids: gesture.ids,
    center,
    angle: gesture.angle,
    shiftHeld,
  })
  const rotated = rotatedSelection(frame.bounds, center, angle, pixelsPerMm)
  const selected = new Set(gesture.ids)
  return {
    preview:
      gesturePicture?.draw === 'picture'
        ? []
        : selectedStrokes(scene, gesture.ids),
    corners: rotated.corners,
    handle: rotated.handle,
    blueprints: turned.filter((image) => selected.has(image.id)),
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
  return selectedStrokes(scaled, gesture.ids)
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
  const selected = new Set(ids)
  const points: Point[] = []
  for (const polyline of scene) {
    if (!selected.has(polyline.id)) {
      continue
    }
    points.push(...polyline.points)
  }
  return points
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
    pictureStrokes: [],
    gesturePicture: undefined,
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
  pictureStrokes: OverlayFrame['preview']
  gesturePicture: GesturePicture | undefined
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

type ShapePreview = {
  kind: ShapeKind
  fromCenter: boolean
}
