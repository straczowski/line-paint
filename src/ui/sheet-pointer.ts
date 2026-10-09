import { useEffect } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Point } from '../scene/polyline'
import {
  duplicateDeltaAfterSelection,
  duplicatePolylines,
  insertPolylinePoint,
  movePolylinePoint,
  pointerTarget,
  selectionBounds,
  touchedPolylineIds,
  translatePolylines,
} from '../scene/selection'
import { dragDelta, draftPoint, draggedHandle } from '../scene/ruler'
import {
  scaleHandleAt,
  scaleHandleHalfPx,
  scalePolylines,
} from '../scene/scale'
import type { ScaleHandle } from '../scene/scale'
import { canvasPointToScene, fitSheet } from '../scene/sheet'
import type { Scene, WindowSize } from '../scene/sheet'

export function useSheetPointer(input: SheetPointerInput): void {
  const {
    canvasRef,
    windowSize,
    tool,
    scene,
    selectedIds,
    pointEdit,
    gestureRef,
    draftCountRef,
    setScene,
    setDraftPoints,
    setFollower,
    setSelectedIds,
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
      windowSize,
      tool,
      scene,
      selectedIds,
      pointEdit,
      gestureRef,
      draftCountRef,
      setScene,
      setDraftPoints,
      setFollower,
      setSelectedIds,
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
    pointEdit,
    scene,
    selectedIds,
    setDraftPoints,
    setFollower,
    setGesture,
    setPointEdit,
    setDuplicateDelta,
    setScene,
    setSelectedIds,
    setAltHeld,
    setShiftHeld,
    tool,
    windowSize,
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

  const located = locatePointer(canvas, event, input.windowSize)
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
  const scaleHandle = scaleHandleUnderPointer(input, located.scene)
  const target = scaleHandle
    ? { id: undefined, pointIndex: undefined }
    : pointerTarget(input.scene, located.scene, input.pointEdit?.id)
  const press: SelectGesture = {
    kind: 'press',
    pointerId: event.pointerId,
    startCanvas: located.canvas,
    startScene: located.scene,
    hitId: target.id,
    pointIndex: target.pointIndex,
    scaleHandle,
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

  const located = locatePointer(canvas, event, input.windowSize)
  if (!located) {
    return
  }

  const target = pointerTarget(input.scene, located.scene, undefined)
  if (!target.id) {
    return
  }

  input.gestureRef.current = undefined
  input.setGesture(undefined)
  if (insertEditedPoint(input, located.scene, target.id)) {
    return
  }

  replaceSelection(input, [target.id])
  input.setPointEdit({ id: target.id, pointIndex: undefined })
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

  input.setScene(inserted.scene)
  replaceSelection(input, [editingId])
  input.setPointEdit({ id: editingId, pointIndex: inserted.index })
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

  const located = locatePointer(canvas, event, input.windowSize)
  const gesture = input.gestureRef.current
  if (!gesture || gesture.pointerId !== event.pointerId) {
    placeScaleCursor(canvas, located, input)
    return
  }
  if (!located) {
    return
  }

  const next = advanceGesture(gesture, located, input.selectedIds)
  if (next.gesture !== gesture || next.selectedIds !== input.selectedIds) {
    input.gestureRef.current = next.gesture
    input.setGesture(next.gesture)
    if (next.selectedIds !== input.selectedIds) {
      replaceSelection(input, next.selectedIds)
      input.setPointEdit(undefined)
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

  const located = locatePointer(canvas, event, input.windowSize)
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
      locatePointer(canvas, event, input.windowSize),
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
    replaceSelection(
      input,
      touchedPolylineIds(input.scene, {
        start: gesture.startScene,
        end: gesture.currentScene,
      }),
    )
    input.setPointEdit(undefined)
    return
  }
  if (gesture.kind === 'point') {
    moveEditedPoint(input, gesture, event.shiftKey)
    return
  }
  if (gesture.kind === 'scale') {
    input.setScene((current) =>
      scalePolylines(
        current,
        scaleInput(gesture, event.shiftKey, event.altKey),
      ),
    )
    return
  }
  if (event.altKey && input.pointEdit === undefined) {
    commitDuplicate(input, gesture, event.shiftKey)
    return
  }

  input.setScene((current) =>
    translatePolylines(current, {
      ids: gesture.ids,
      delta: dragDelta({
        start: gesture.startScene,
        pointer: gesture.currentScene,
        shiftHeld: event.shiftKey,
      }),
    }),
  )
}

function commitDuplicate(
  input: SheetPointerInput,
  gesture: MoveGesture,
  shiftHeld: boolean,
): void {
  const newIds = gesture.ids.map(() => crypto.randomUUID())
  const delta = dragDelta({
    start: gesture.startScene,
    pointer: gesture.currentScene,
    shiftHeld,
  })
  input.setScene((current) =>
    duplicatePolylines(current, {
      ids: gesture.ids,
      newIds,
      delta,
    }),
  )
  input.setSelectedIds(newIds)
  input.setDuplicateDelta(delta)
  input.setPointEdit(undefined)
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
  if (gesture.scaleHandle) {
    return
  }
  if (gesture.pointIndex !== undefined && gesture.hitId) {
    replaceSelection(input, [gesture.hitId])
    input.setPointEdit({ id: gesture.hitId, pointIndex: gesture.pointIndex })
    return
  }
  if (gesture.hitId) {
    replaceSelection(
      input,
      selectionAfterPolylineClick(
        input.selectedIds,
        gesture.hitId,
        shiftHeld && input.pointEdit === undefined,
      ),
    )
    if (gesture.hitId !== input.pointEdit?.id) {
      input.setPointEdit(undefined)
    }
    return
  }

  replaceSelection(input, [])
  input.setPointEdit(undefined)
}

export function selectionAfterPolylineClick(
  selectedIds: readonly string[],
  hitId: string,
  shiftHeld: boolean,
): readonly string[] {
  if (!shiftHeld) {
    return [hitId]
  }
  if (selectedIds.includes(hitId)) {
    return selectedIds
  }
  return [...selectedIds, hitId]
}

function moveEditedPoint(
  input: SheetPointerInput,
  gesture: PointGesture,
  shiftHeld: boolean,
): void {
  input.setScene((current) => {
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
  })
  replaceSelection(input, [gesture.id])
  input.setPointEdit({ id: gesture.id, pointIndex: gesture.index })
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
): GestureAdvance {
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
    : [gesture.hitId]
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
  windowSize: WindowSize,
): LocatedPointer | undefined {
  const fit = fitSheet(windowSize)
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

function scaleHandleUnderPointer(
  input: SheetPointerInput,
  point: Point,
): ScaleHandle | undefined {
  if (input.pointEdit || input.selectedIds.length === 0) {
    return undefined
  }

  const fit = fitSheet(input.windowSize)
  if (fit.scale <= 0) {
    return undefined
  }

  const bounds = selectionBounds(pointsIn(input.scene, input.selectedIds))
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
  if (gesture && gesture.kind !== 'press' && gesture.kind !== 'scale') {
    canvas.style.cursor = ''
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
  PressGesture | MarqueeGesture | MoveGesture | PointGesture | ScaleGesture

export type PressGesture = {
  kind: 'press'
  pointerId: number
  startCanvas: Point
  startScene: Point
  hitId: string | undefined
  pointIndex: number | undefined
  scaleHandle: ScaleHandle | undefined
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

export type PointEdit = {
  id: string
  pointIndex: number | undefined
}

type SheetPointerInput = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  windowSize: WindowSize
  tool: Tool
  scene: Scene
  selectedIds: readonly string[]
  pointEdit: PointEdit | undefined
  gestureRef: RefObject<SelectGesture | undefined>
  draftCountRef: RefObject<number>
  setScene: Dispatch<SetStateAction<Scene>>
  setDraftPoints: Dispatch<SetStateAction<readonly Point[]>>
  setFollower: Dispatch<SetStateAction<Point | undefined>>
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>
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
