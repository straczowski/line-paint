import { useEffect } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Point } from '../scene/polyline'
import {
  blueprintAt,
  blueprintCenter,
  blueprintPoints,
  blueprintRotateHandleAt,
  blueprintScaleHandleAt,
  blueprintsTouching,
  loneBlueprint,
  rotateBlueprints,
  scaleBlueprintFrame,
  scaleBlueprints,
  selectionIsFrozen,
  translateBlueprints,
} from '../scene/blueprint'
import type { Blueprint } from '../scene/blueprint'
import {
  duplicateDeltaAfterSelection,
  duplicatePolylines,
  groupIdsToRenew,
  insertPolylinePoint,
  movePolylinePoint,
  pointerTarget,
  selectionAfterClick,
  selectionAfterDoubleClick,
  selectionAfterMarquee,
  selectionBounds,
  touchedPolylineIds,
  translatePolylines,
} from '../scene/selection'
import { dragDelta, draftPoint, draggedHandle } from '../scene/ruler'
import {
  rotateHandleAt,
  rotatePolylines,
  selectionCenter,
  signedAngle,
  unwrapAngle,
} from '../scene/rotate'
import {
  scaleHandleAt,
  scaleHandleHalfPx,
  scalePolylines,
} from '../scene/scale'
import type { ScaleHandle } from '../scene/scale'
import { canvasPointToScene } from '../scene/sheet'
import type { Scene, SheetFit } from '../scene/sheet'
import type { CommitDrawing } from './history'

export function useSheetPointer(input: SheetPointerInput): void {
  const {
    canvasRef,
    viewport,
    zoom,
    tool,
    scene,
    images,
    selectedIds,
    enteredGroupId,
    pointEdit,
    duplicateDelta,
    gestureRef,
    draftCountRef,
    commitScene,
    setDraftPoints,
    setFollower,
    setSelectedIds,
    setEnteredGroupId,
    setDuplicateDelta,
    setPointEdit,
    setGesture,
    setShiftHeld,
    setAltHeld,
  } = input

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const sheetPointer = {
      canvasRef,
      viewport,
      zoom,
      tool,
      scene,
      images,
      selectedIds,
      enteredGroupId,
      pointEdit,
      duplicateDelta,
      gestureRef,
      draftCountRef,
      commitScene,
      setDraftPoints,
      setFollower,
      setSelectedIds,
      setEnteredGroupId,
      setDuplicateDelta,
      setPointEdit,
      setGesture,
      setShiftHeld,
      setAltHeld,
    }
    const onPointerDown = (event: PointerEvent) => {
      beginSheetPointer(canvas, event, sheetPointer)
    }
    const onPointerMove = (event: PointerEvent) => {
      moveSheetPointer(canvas, event, sheetPointer)
    }
    const onPointerUp = (event: PointerEvent) => {
      endSheetPointer(event, sheetPointer)
    }
    const onPointerCancel = (event: PointerEvent) => {
      cancelSheetPointer(event, gestureRef, setGesture)
    }
    const onDoubleClick = (event: MouseEvent) => {
      beginPointEdit(canvas, event, sheetPointer)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('dblclick', onDoubleClick)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('dblclick', onDoubleClick)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [
    canvasRef,
    draftCountRef,
    gestureRef,
    commitScene,
    duplicateDelta,
    enteredGroupId,
    pointEdit,
    scene,
    images,
    selectedIds,
    setDraftPoints,
    setFollower,
    setGesture,
    setPointEdit,
    setDuplicateDelta,
    setEnteredGroupId,
    setSelectedIds,
    setAltHeld,
    setShiftHeld,
    tool,
    viewport,
    zoom,
  ])
}

function beginSheetPointer(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  input: SheetPointerInput,
): void {
  noteHeldKey(event.shiftKey, input.setShiftHeld)
  noteHeldKey(event.altKey, input.setAltHeld)
  if (event.button !== 0) {
    return
  }

  const located = locatePointer(canvas, event, input.viewport)
  if (!located) {
    return
  }
  if (input.tool === 'polyline') {
    canvas.style.cursor = ''
    input.draftCountRef.current += 1
    input.setDraftPoints((points) => [
      ...points,
      draftPoint({
        points,
        pointer: located.scene,
        shiftHeld: event.shiftKey,
      }),
    ])
    input.setFollower(located.scene)
    return
  }

  if (event.isTrusted) {
    canvas.setPointerCapture(event.pointerId)
  }
  const rotateCenter = rotateCenterUnderPointer(input, located.scene)
  const scaleHandle = rotateCenter
    ? undefined
    : scaleHandleUnderPointer(input, located.scene)
  const target =
    rotateCenter || scaleHandle
      ? { id: undefined, pointIndex: undefined }
      : hitTarget(input, located.scene)
  const press: SelectGesture = {
    kind: 'press',
    pointerId: event.pointerId,
    startCanvas: located.canvas,
    startScene: located.scene,
    hitId: target.id,
    pointIndex: target.pointIndex,
    scaleHandle,
    rotateCenter,
  }
  input.gestureRef.current = press
  input.setGesture(press)
  placeScaleCursor(canvas, located, input)
}

function beginPointEdit(
  canvas: HTMLCanvasElement,
  event: MouseEvent,
  input: SheetPointerInput,
): void {
  if (input.tool !== 'select' || event.button !== 0) {
    return
  }

  const located = locatePointer(canvas, event, input.viewport)
  if (!located) {
    return
  }

  const target = pointerTarget(
    input.scene,
    located.scene,
    undefined,
    input.zoom,
  )
  if (!target.id) {
    return
  }

  input.gestureRef.current = undefined
  input.setGesture(undefined)
  if (insertEditedPoint(input, located.scene, target.id)) {
    return
  }

  const next = selectionAfterDoubleClick(
    input.scene,
    target.id,
    input.enteredGroupId,
  )
  replaceSelection(input, next.ids)
  input.setEnteredGroupId(next.enteredGroupId)
  if (next.editPoints) {
    input.setPointEdit({ id: target.id, pointIndex: undefined })
    return
  }
  input.setPointEdit(undefined)
}

function insertEditedPoint(
  input: SheetPointerInput,
  point: Point,
  targetId: string,
): boolean {
  const editingId = input.pointEdit?.id
  if (!editingId || editingId !== targetId) {
    return false
  }

  const inserted = insertPolylinePoint(input.scene, {
    id: editingId,
    point,
  })
  if (!inserted) {
    return false
  }

  input.commitScene(inserted.scene, {
    selectedIds: [editingId],
    enteredGroupId: input.enteredGroupId,
    pointEdit: { id: editingId, pointIndex: inserted.index },
    duplicateDelta: duplicateDeltaAfterSelection(
      input.duplicateDelta,
      input.selectedIds,
      [editingId],
    ),
  })
  return true
}

function moveSheetPointer(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  input: SheetPointerInput,
): void {
  noteHeldKey(event.shiftKey, input.setShiftHeld)
  noteHeldKey(event.altKey, input.setAltHeld)
  if (input.tool === 'polyline') {
    canvas.style.cursor = ''
    followDraft(canvas, event, input)
    return
  }

  const located = locatePointer(canvas, event, input.viewport)
  const gesture = input.gestureRef.current
  if (!gesture || gesture.pointerId !== event.pointerId) {
    placeScaleCursor(canvas, located, input)
    return
  }
  if (!located) {
    return
  }

  const hitId = gesture.kind === 'press' ? gesture.hitId : undefined
  const replacement = hitId ? selectionForHit(input, hitId, false) : undefined
  const next = advanceGesture(
    gesture,
    located,
    input.selectedIds,
    replacement?.ids,
  )
  if (next.gesture !== gesture || next.selectedIds !== input.selectedIds) {
    input.gestureRef.current = next.gesture
    input.setGesture(next.gesture)
    if (next.selectedIds !== input.selectedIds) {
      replaceSelection(input, next.selectedIds)
      input.setPointEdit(undefined)
      if (replacement && hitId && !input.selectedIds.includes(hitId)) {
        input.setEnteredGroupId(replacement.enteredGroupId)
      }
    }
  }
  placeScaleCursor(canvas, located, input)
}

function followDraft(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  input: SheetPointerInput,
): void {
  if (input.draftCountRef.current === 0) {
    return
  }

  const located = locatePointer(canvas, event, input.viewport)
  if (!located) {
    return
  }

  input.setFollower((current) =>
    current && samePoint(current, located.scene) ? current : located.scene,
  )
}

function samePoint(start: Point, end: Point): boolean {
  return start.x === end.x && start.y === end.y
}

function endSheetPointer(event: PointerEvent, input: SheetPointerInput): void {
  noteHeldKey(event.shiftKey, input.setShiftHeld)
  noteHeldKey(event.altKey, input.setAltHeld)
  const gesture = input.gestureRef.current
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return
  }

  input.gestureRef.current = undefined
  input.setGesture(undefined)
  const canvas = input.canvasRef.current
  if (canvas) {
    placeScaleCursor(
      canvas,
      locatePointer(canvas, event, input.viewport),
      input,
    )
  }
  if (gesture.kind === 'press') {
    if (event.detail > 1) {
      return
    }
    finishPress(gesture, input, event.shiftKey)
    return
  }
  if (gesture.kind === 'marquee') {
    replaceSelection(input, [
      ...selectionAfterMarquee(
        input.scene,
        touchedPolylineIds(input.scene, {
          start: gesture.startScene,
          end: gesture.currentScene,
        }),
        input.enteredGroupId,
      ),
      ...(input.enteredGroupId
        ? []
        : blueprintsTouching(input.images, {
            start: gesture.startScene,
            end: gesture.currentScene,
          })),
    ])
    input.setPointEdit(undefined)
    return
  }
  if (gesture.kind === 'point') {
    moveEditedPoint(input, gesture, event.shiftKey)
    return
  }
  if (gesture.kind === 'scale') {
    const change = scaleInput(gesture, event.shiftKey, event.altKey, input.zoom)
    const single = loneBlueprint(input.images, gesture.ids)
    if (single) {
      input.commitScene(
        (current) => current,
        undefined,
        (images) =>
          images.map((image) =>
            image.id === single.id ? scaleBlueprintFrame(image, change) : image,
          ),
      )
      return
    }

    const framePoints = [
      ...pointsIn(input.scene, gesture.ids),
      ...blueprintPoints(input.images, gesture.ids),
    ]
    input.commitScene(
      (current) => scalePolylines(current, { ...change, framePoints }),
      undefined,
      (images) => scaleBlueprints(images, { ...change, framePoints }),
    )
    return
  }
  if (gesture.kind === 'rotate') {
    input.commitScene(
      (current) =>
        rotatePolylines(current, {
          ids: gesture.ids,
          angle: gesture.angle,
          shiftHeld: event.shiftKey,
          center: gesture.center,
        }),
      undefined,
      (images) =>
        rotateBlueprints(images, {
          ids: gesture.ids,
          center: gesture.center,
          angle: gesture.angle,
          shiftHeld: event.shiftKey,
        }),
    )
    return
  }
  if (
    event.altKey &&
    input.pointEdit === undefined &&
    gesture.ids.some((id) => input.scene.some((polyline) => polyline.id === id))
  ) {
    commitDuplicate(input, gesture, event.shiftKey)
    return
  }

  const delta = dragDelta({
    start: gesture.startScene,
    pointer: gesture.currentScene,
    shiftHeld: event.shiftKey,
  })
  input.commitScene(
    (current) => translatePolylines(current, { ids: gesture.ids, delta }),
    undefined,
    (images) => translateBlueprints(images, { ids: gesture.ids, delta }),
  )
}

function commitDuplicate(
  input: SheetPointerInput,
  gesture: MoveGesture,
  shiftHeld: boolean,
): void {
  const ids = gesture.ids.filter((id) =>
    input.scene.some((polyline) => polyline.id === id),
  )
  const newIds = ids.map(() => crypto.randomUUID())
  const oldGroupIds = groupIdsToRenew(input.scene, ids, input.enteredGroupId)
  const newGroupIds = oldGroupIds.map(() => crypto.randomUUID())
  const delta = dragDelta({
    start: gesture.startScene,
    pointer: gesture.currentScene,
    shiftHeld,
  })
  input.commitScene(
    (current) =>
      duplicatePolylines(current, {
        ids,
        newIds,
        delta,
        enteredGroupId: input.enteredGroupId,
        newGroupIds,
      }),
    {
      selectedIds: newIds,
      enteredGroupId: input.enteredGroupId,
      pointEdit: undefined,
      duplicateDelta: delta,
    },
  )
}

function selectionForHit(
  input: SheetPointerInput,
  hitId: string,
  shiftHeld: boolean,
): { ids: readonly string[]; enteredGroupId: string | undefined } {
  if (input.images.some((image) => image.id === hitId)) {
    if (input.enteredGroupId) {
      return { ids: [hitId], enteredGroupId: undefined }
    }
    if (shiftHeld && input.selectedIds.includes(hitId)) {
      return { ids: input.selectedIds, enteredGroupId: undefined }
    }
    if (shiftHeld) {
      return {
        ids: [...input.selectedIds, hitId],
        enteredGroupId: undefined,
      }
    }
    return { ids: [hitId], enteredGroupId: undefined }
  }

  return selectionAfterClick(
    input.scene,
    input.selectedIds,
    hitId,
    input.enteredGroupId,
    shiftHeld,
  )
}

function hitTarget(
  input: SheetPointerInput,
  point: Point,
): { id: string | undefined; pointIndex: number | undefined } {
  const target = pointerTarget(
    input.scene,
    point,
    input.pointEdit?.id,
    input.zoom,
  )
  if (target.id || target.pointIndex !== undefined) {
    return target
  }

  return { id: blueprintAt(input.images, point), pointIndex: undefined }
}

function replaceSelection(
  input: SheetPointerInput,
  nextIds: readonly string[],
): void {
  input.setDuplicateDelta((stored) =>
    duplicateDeltaAfterSelection(stored, input.selectedIds, nextIds),
  )
  input.setSelectedIds(nextIds)
}

function finishPress(
  gesture: PressGesture,
  input: SheetPointerInput,
  shiftHeld: boolean,
): void {
  if (gesture.scaleHandle || gesture.rotateCenter) {
    return
  }
  if (gesture.pointIndex !== undefined && gesture.hitId) {
    replaceSelection(input, [gesture.hitId])
    input.setPointEdit({ id: gesture.hitId, pointIndex: gesture.pointIndex })
    return
  }
  if (gesture.hitId) {
    const next = selectionForHit(
      input,
      gesture.hitId,
      shiftHeld && input.pointEdit === undefined,
    )
    replaceSelection(input, next.ids)
    input.setEnteredGroupId(next.enteredGroupId)
    if (gesture.hitId !== input.pointEdit?.id) {
      input.setPointEdit(undefined)
    }
    return
  }

  replaceSelection(input, [])
  input.setPointEdit(undefined)
  input.setEnteredGroupId(undefined)
}

function moveEditedPoint(
  input: SheetPointerInput,
  gesture: PointGesture,
  shiftHeld: boolean,
): void {
  input.commitScene(
    (current) => {
      const polyline = current.find((item) => item.id === gesture.id)
      const origin = polyline?.points[gesture.index]
      if (!polyline || !origin) {
        return current
      }

      return movePolylinePoint(current, {
        id: gesture.id,
        index: gesture.index,
        point: draggedHandle({
          origin,
          start: gesture.startScene,
          pointer: gesture.currentScene,
          shiftHeld,
        }),
      })
    },
    {
      selectedIds: [gesture.id],
      enteredGroupId: input.enteredGroupId,
      pointEdit: { id: gesture.id, pointIndex: gesture.index },
      duplicateDelta: duplicateDeltaAfterSelection(
        input.duplicateDelta,
        input.selectedIds,
        [gesture.id],
      ),
    },
  )
}

function cancelSheetPointer(
  event: PointerEvent,
  gestureRef: RefObject<SelectGesture | undefined>,
  setGesture: Dispatch<SetStateAction<SelectGesture | undefined>>,
): void {
  const gesture = gestureRef.current
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return
  }

  gestureRef.current = undefined
  setGesture(undefined)
}

export function advanceGesture(
  gesture: SelectGesture,
  located: LocatedPointer,
  selectedIds: readonly string[],
  replacementIds?: readonly string[],
): GestureAdvance {
  if (gesture.kind === 'rotate') {
    return {
      gesture: {
        ...gesture,
        currentScene: located.scene,
        angle: unwrapAngle(
          gesture.angle,
          signedAngle(gesture.center, gesture.startScene, located.scene),
        ),
      },
      selectedIds,
    }
  }
  if (
    gesture.kind === 'marquee' ||
    gesture.kind === 'move' ||
    gesture.kind === 'point' ||
    gesture.kind === 'scale'
  ) {
    return {
      gesture: { ...gesture, currentScene: located.scene },
      selectedIds,
    }
  }
  if (!pointerPassedClickSlop(gesture.startCanvas, located.canvas)) {
    return { gesture, selectedIds }
  }
  if (gesture.pointIndex !== undefined && gesture.hitId) {
    return {
      gesture: {
        kind: 'point',
        pointerId: gesture.pointerId,
        startScene: gesture.startScene,
        currentScene: located.scene,
        id: gesture.hitId,
        index: gesture.pointIndex,
      },
      selectedIds,
    }
  }
  if (gesture.rotateCenter && selectedIds.length > 0) {
    return {
      gesture: {
        kind: 'rotate',
        pointerId: gesture.pointerId,
        startScene: gesture.startScene,
        currentScene: located.scene,
        ids: selectedIds,
        center: gesture.rotateCenter,
        angle: signedAngle(
          gesture.rotateCenter,
          gesture.startScene,
          located.scene,
        ),
      },
      selectedIds,
    }
  }
  if (gesture.scaleHandle && selectedIds.length > 0) {
    return {
      gesture: {
        kind: 'scale',
        pointerId: gesture.pointerId,
        startScene: gesture.startScene,
        currentScene: located.scene,
        ids: selectedIds,
        handle: gesture.scaleHandle,
      },
      selectedIds,
    }
  }
  if (!gesture.hitId) {
    return {
      gesture: {
        kind: 'marquee',
        pointerId: gesture.pointerId,
        startScene: gesture.startScene,
        currentScene: located.scene,
      },
      selectedIds,
    }
  }

  const ids = selectedIds.includes(gesture.hitId)
    ? selectedIds
    : (replacementIds ?? [gesture.hitId])
  return {
    gesture: {
      kind: 'move',
      pointerId: gesture.pointerId,
      startScene: gesture.startScene,
      currentScene: located.scene,
      ids,
    },
    selectedIds: ids,
  }
}

function locatePointer(
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number },
  fit: SheetFit,
): LocatedPointer | undefined {
  if (fit.scale <= 0) {
    return undefined
  }

  const canvasPoint = pointerOnCanvas(event, canvas)
  return {
    canvas: canvasPoint,
    scene: canvasPointToScene(canvasPoint, fit),
  }
}

function pointerOnCanvas(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
): Point {
  const bounds = canvas.getBoundingClientRect()
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  }
}

const clickSlopPx = 4

function pointerPassedClickSlop(start: Point, current: Point): boolean {
  const dx = current.x - start.x
  const dy = current.y - start.y
  return dx * dx + dy * dy >= clickSlopPx * clickSlopPx
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

function rotateCenterUnderPointer(
  input: SheetPointerInput,
  point: Point,
): Point | undefined {
  if (input.pointEdit || input.selectedIds.length === 0) {
    return undefined
  }

  const pixelsPerMm = input.viewport.scale
  if (!(pixelsPerMm > 0)) {
    return undefined
  }

  const single = loneBlueprint(input.images, input.selectedIds)
  if (single && !single.locked) {
    return blueprintRotateHandleAt(single, point, pixelsPerMm)
      ? blueprintCenter(single)
      : undefined
  }
  if (selectionIsFrozen(input.scene, input.images, input.selectedIds)) {
    return undefined
  }

  const points = [
    ...pointsIn(input.scene, input.selectedIds),
    ...blueprintPoints(input.images, input.selectedIds),
  ]
  const bounds = selectionBounds(points, input.zoom)
  const center = selectionCenter(points)
  if (!bounds || !center || !rotateHandleAt(bounds, point, pixelsPerMm)) {
    return undefined
  }

  return center
}

function scaleHandleUnderPointer(
  input: SheetPointerInput,
  point: Point,
): ScaleHandle | undefined {
  if (input.pointEdit || input.selectedIds.length === 0) {
    return undefined
  }

  const fit = input.viewport
  if (fit.scale <= 0) {
    return undefined
  }

  const single = loneBlueprint(input.images, input.selectedIds)
  if (single && !single.locked) {
    return blueprintScaleHandleAt(single, point, scaleHandleHalfPx / fit.scale)
  }
  if (selectionIsFrozen(input.scene, input.images, input.selectedIds)) {
    return undefined
  }

  const bounds = selectionBounds(
    [
      ...pointsIn(input.scene, input.selectedIds),
      ...blueprintPoints(input.images, input.selectedIds),
    ],
    input.zoom,
  )
  if (!bounds) {
    return undefined
  }

  return scaleHandleAt(bounds, point, scaleHandleHalfPx / fit.scale)
}

function placeScaleCursor(
  canvas: HTMLCanvasElement,
  located: LocatedPointer | undefined,
  input: SheetPointerInput,
): void {
  if (input.tool !== 'select' || !located) {
    canvas.style.cursor = ''
    return
  }

  const gesture = input.gestureRef.current
  if (
    gesture &&
    gesture.kind !== 'press' &&
    gesture.kind !== 'scale' &&
    gesture.kind !== 'rotate'
  ) {
    canvas.style.cursor = ''
    return
  }
  if (
    gesture?.kind === 'rotate' ||
    ((!gesture || gesture.kind === 'press') &&
      rotateCenterUnderPointer(input, located.scene))
  ) {
    canvas.style.cursor = 'grab'
    return
  }

  const handle =
    gesture?.kind === 'scale'
      ? gesture.handle
      : scaleHandleUnderPointer(input, located.scene)
  canvas.style.cursor = cursorForScaleHandle(handle)
}

function cursorForScaleHandle(handle: ScaleHandle | undefined): string {
  if (handle === 'northWest' || handle === 'southEast') {
    return 'nwse-resize'
  }
  if (handle === 'northEast' || handle === 'southWest') {
    return 'nesw-resize'
  }
  if (handle === 'north' || handle === 'south') {
    return 'ns-resize'
  }
  if (handle === 'east' || handle === 'west') {
    return 'ew-resize'
  }
  return ''
}

function noteHeldKey(
  held: boolean,
  setHeld: Dispatch<SetStateAction<boolean>>,
): void {
  setHeld((current) => (current === held ? current : held))
}

export type Tool = 'select' | 'polyline'

export type SelectGesture =
  | PressGesture
  | MarqueeGesture
  | MoveGesture
  | PointGesture
  | ScaleGesture
  | RotateGesture

export type PressGesture = {
  kind: 'press'
  pointerId: number
  startCanvas: Point
  startScene: Point
  hitId: string | undefined
  pointIndex: number | undefined
  scaleHandle: ScaleHandle | undefined
  rotateCenter: Point | undefined
}

export type MarqueeGesture = {
  kind: 'marquee'
  pointerId: number
  startScene: Point
  currentScene: Point
}

export type MoveGesture = {
  kind: 'move'
  pointerId: number
  startScene: Point
  currentScene: Point
  ids: readonly string[]
}

export type PointGesture = {
  kind: 'point'
  pointerId: number
  startScene: Point
  currentScene: Point
  id: string
  index: number
}

export type ScaleGesture = {
  kind: 'scale'
  pointerId: number
  startScene: Point
  currentScene: Point
  ids: readonly string[]
  handle: ScaleHandle
}

export type RotateGesture = {
  kind: 'rotate'
  pointerId: number
  startScene: Point
  currentScene: Point
  ids: readonly string[]
  center: Point
  angle: number
}

export type PointEdit = {
  id: string
  pointIndex: number | undefined
}

type SheetPointerInput = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewport: SheetFit
  zoom: number
  tool: Tool
  scene: Scene
  images: readonly Blueprint[]
  selectedIds: readonly string[]
  enteredGroupId: string | undefined
  pointEdit: PointEdit | undefined
  duplicateDelta: Point | undefined
  gestureRef: RefObject<SelectGesture | undefined>
  draftCountRef: RefObject<number>
  commitScene: CommitDrawing
  setDraftPoints: Dispatch<SetStateAction<readonly Point[]>>
  setFollower: Dispatch<SetStateAction<Point | undefined>>
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>
  setEnteredGroupId: Dispatch<SetStateAction<string | undefined>>
  setDuplicateDelta: Dispatch<SetStateAction<Point | undefined>>
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>
  setGesture: Dispatch<SetStateAction<SelectGesture | undefined>>
  setShiftHeld: Dispatch<SetStateAction<boolean>>
  setAltHeld: Dispatch<SetStateAction<boolean>>
}

type LocatedPointer = {
  canvas: Point
  scene: Point
}

type GestureAdvance = {
  gesture: SelectGesture
  selectedIds: readonly string[]
}
