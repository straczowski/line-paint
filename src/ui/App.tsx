import {
  RiCheckLine,
  RiCircleLine,
  RiDeleteBinLine,
  RiMenuLine,
  RiRouteLine,
} from '@remixicon/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { paintOverlay, paintStaticCanvas } from '../render/paint-sheet'
import {
  commitPolyline,
  previewStrokePoints,
  setPolylineClosed,
} from '../scene/polyline'
import type { Point, Polyline } from '../scene/polyline'
import {
  deletePolylinePoint,
  deletePolylines,
  duplicateDeltaAfterSelection,
  duplicatePolylines,
  nextDuplicateDelta,
  insertPolylinePoint,
  movePolylinePoint,
  pointerTarget,
  hiddenPolylineIds,
  sceneWithoutHiddenPolylines,
  selectionBounds,
  touchedPolylineIds,
  translatePolylines,
} from '../scene/selection'
import type { DragHide, PointDelete, SelectionBounds } from '../scene/selection'
import { gcodeDocument, svgDocument } from '../scene/export'
import { polylinesFromSvg } from '../scene/import'
import type { ImportedPolyline } from '../scene/import'
import { dragDelta, draftPoint, draggedHandle } from '../scene/ruler'
import {
  scaleHandleAt,
  scaleHandleHalfPx,
  scalePolylines,
} from '../scene/scale'
import type { ScaleHandle } from '../scene/scale'
import { canvasPointToScene, emptyScene, fitSheet } from '../scene/sheet'
import type { Scene, WindowSize } from '../scene/sheet'

export function App() {
  const [scene, setScene] = useState<Scene>(emptyScene)
  const [draftPoints, setDraftPoints] = useState<readonly Point[]>([])
  const [follower, setFollower] = useState<Point>()
  const [tool, setTool] = useState<Tool>('polyline')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const [duplicateDelta, setDuplicateDelta] = useState<Point>()
  const [pointEdit, setPointEdit] = useState<PointEdit>()
  const [gesture, setGesture] = useState<SelectGesture>()
  const [shiftHeld, setShiftHeld] = useHeldKey('Shift')
  const [altHeld, setAltHeld] = useHeldKey('Alt')
  const windowSize = useWindowSize()
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const svgInputRef = useRef<HTMLInputElement>(null)
  const importToast = useImportToast()
  const gestureRef = useRef<SelectGesture | undefined>(undefined)
  const draftCountRef = useRef(0)
  const clearDraft = () => {
    draftCountRef.current = 0
    setDraftPoints([])
    setFollower(undefined)
  }
  const finishDraft = () => {
    setScene((current) =>
      commitPolyline(current, {
        id: crypto.randomUUID(),
        points: draftPoints,
      }),
    )
    clearDraft()
  }
  const chooseTool = (next: Tool) => {
    setTool(next)
    if (next === 'select') {
      clearDraft()
    } else {
      setSelectedIds([])
      setDuplicateDelta(undefined)
      setPointEdit(undefined)
    }
    gestureRef.current = undefined
    setGesture(undefined)
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.style.cursor = ''
    }
  }

  useFinishedPicture(
    staticCanvasRef,
    scene,
    windowSize,
    hiddenPolylineKey(gesture, altHeld),
  )
  useOverlayPicture(
    overlayCanvasRef,
    overlayFrame(
      scene,
      draftPoints,
      follower,
      selectedIds,
      gesture,
      pointEdit,
      shiftHeld,
      altHeld,
    ),
    windowSize,
  )
  useSheetPointer({
    canvasRef: overlayCanvasRef,
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
  })
  const deleteSelection = () => {
    if (selectedIds.length === 0) {
      return
    }

    setScene((current) => deletePolylines(current, selectedIds))
    setSelectedIds([])
    setDuplicateDelta(undefined)
    setPointEdit(undefined)
    gestureRef.current = undefined
    setGesture(undefined)
  }
  useSelectBackspace(
    tool,
    scene,
    pointEdit,
    deleteSelection,
    setScene,
    setSelectedIds,
    setDuplicateDelta,
    setPointEdit,
  )
  useCommandDuplicate(
    tool,
    selectedIds,
    duplicateDelta,
    gestureRef,
    setScene,
    setSelectedIds,
    setDuplicateDelta,
    setPointEdit,
    setGesture,
  )
  useFinishOnEnter(finishDraft)

  const showHint =
    tool === 'polyline' && scene.length === 0 && draftPoints.length === 0
  const selectedPolyline = lonePolyline(scene, selectedIds)
  const closeSelected = (closed: boolean) => {
    if (!selectedPolyline) {
      return
    }

    const id = selectedPolyline.id
    setScene((current) => setPolylineClosed(current, { id, closed }))
  }

  const applyImportedSvg = (polylines: readonly ImportedPolyline[]) => {
    setScene(polylines.map(polylineWithNewId))
    setSelectedIds([])
    setDuplicateDelta(undefined)
    setPointEdit(undefined)
    clearDraft()
    gestureRef.current = undefined
    setGesture(undefined)
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.style.cursor = ''
    }
    importToast.hide()
  }
  const chooseSvgFile = () => {
    setMenuOpen(false)
    svgInputRef.current?.click()
  }
  useSvgDrop(applyImportedSvg, importToast.show)

  return (
    <main className="sheet-host">
      <canvas ref={staticCanvasRef} className="sheet-canvas" />
      <canvas ref={overlayCanvasRef} className="sheet-canvas" />
      {showHint && (
        <p className="sheet-hint">Click to add a point. Enter to finish.</p>
      )}
      <input
        ref={svgInputRef}
        type="file"
        accept=".svg"
        hidden
        onChange={(event) => {
          const input = event.currentTarget
          const file = input.files?.[0]
          input.value = ''
          if (file) {
            void loadSvgFile(file, applyImportedSvg, importToast.show)
          }
        }}
      />
      <ImportToast notice={importToast.notice} />
      <div className="menu-anchor">
        <MenuIsland
          open={menuOpen}
          onToggle={() => setMenuOpen((open) => !open)}
          onImportSvg={chooseSvgFile}
          onExportGcode={() => {
            downloadTextFile(
              'drawing.gcode',
              gcodeDocument(scene),
              'text/plain',
            )
            setMenuOpen(false)
          }}
          onExportSvg={() => {
            downloadTextFile('drawing.svg', svgDocument(scene), 'image/svg+xml')
            setMenuOpen(false)
          }}
        />
      </div>
      <div className="top-islands">
        <ToolIsland tool={tool} onTool={chooseTool} />
        {tool === 'polyline' && (
          <FinishIsland
            enabled={draftPoints.length > 0}
            onFinish={finishDraft}
          />
        )}
        {tool === 'select' && selectedIds.length > 0 && (
          <SelectIsland
            polyline={selectedPolyline}
            onClosed={closeSelected}
            onDelete={deleteSelection}
          />
        )}
      </div>
    </main>
  )
}

function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState(readWindowSize)

  useEffect(() => {
    const onResize = () => {
      setWindowSize(readWindowSize())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return windowSize
}

function readWindowSize(): WindowSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function useFinishedPicture(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  scene: Scene,
  windowSize: WindowSize,
  hiddenKey: string,
): void {
  useLayoutEffect(() => {
    if (windowSize.width <= 0 || windowSize.height <= 0) {
      return
    }

    paintStaticCanvas({
      context: requireContext(canvasRef.current, 'Static'),
      scene: sceneWithoutHiddenPolylines(scene, idsInHiddenKey(hiddenKey)),
      fit: fitSheet(windowSize),
      size: windowSize,
    })
  }, [canvasRef, hiddenKey, scene, windowSize])
}

function hiddenPolylineKey(
  gesture: SelectGesture | undefined,
  altHeld: boolean,
): string {
  return hiddenPolylineIds(dragHide(gesture, altHeld)).join(',')
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

function idsInHiddenKey(hiddenKey: string): readonly string[] {
  if (!hiddenKey) {
    return []
  }
  return hiddenKey.split(',')
}

function useOverlayPicture(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  frame: OverlayFrame,
  windowSize: WindowSize,
): void {
  useLayoutEffect(() => {
    if (windowSize.width <= 0 || windowSize.height <= 0) {
      return
    }

    paintOverlay({
      context: requireContext(canvasRef.current, 'Overlay'),
      draftPoints: frame.draftPoints,
      preview: frame.preview,
      bounds: frame.bounds,
      scaleHandles: frame.scaleHandles,
      marquee: frame.marquee,
      handles: frame.handles,
      fit: fitSheet(windowSize),
      size: windowSize,
    })
  }, [canvasRef, frame, windowSize])
}

function useSheetPointer(input: SheetPointerInput): void {
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
    finishPress(gesture, input)
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

function finishPress(gesture: PressGesture, input: SheetPointerInput): void {
  if (gesture.scaleHandle) {
    return
  }
  if (gesture.pointIndex !== undefined && gesture.hitId) {
    replaceSelection(input, [gesture.hitId])
    input.setPointEdit({ id: gesture.hitId, pointIndex: gesture.pointIndex })
    return
  }
  if (gesture.hitId) {
    replaceSelection(input, [gesture.hitId])
    if (gesture.hitId !== input.pointEdit?.id) {
      input.setPointEdit(undefined)
    }
    return
  }

  replaceSelection(input, [])
  input.setPointEdit(undefined)
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

function advanceGesture(
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

function overlayFrame(
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
  return movePreview(scene, selectedIds, gesture, shiftHeld)
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

function movePreview(
  scene: Scene,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  shiftHeld: boolean,
): OverlayFrame['preview'] {
  const selection = activeSelection(selectedIds, gesture, shiftHeld)
  if (!selection.delta) {
    return []
  }

  const delta = selection.delta
  return scene.flatMap((polyline) => {
    if (!selection.ids.includes(polyline.id)) {
      return []
    }
    return [
      {
        points: translatedPoints(polyline.points, delta),
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

function useSelectBackspace(
  tool: Tool,
  scene: Scene,
  pointEdit: PointEdit | undefined,
  deleteSelection: () => void,
  setScene: Dispatch<SetStateAction<Scene>>,
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>,
  setDuplicateDelta: Dispatch<SetStateAction<Point | undefined>>,
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPlainBackspace(event) || tool !== 'select') {
        return
      }

      event.preventDefault()
      if (event.repeat) {
        return
      }
      if (pointEdit?.pointIndex !== undefined) {
        deleteSelectedPoint(
          scene,
          { id: pointEdit.id, index: pointEdit.pointIndex },
          setScene,
          setSelectedIds,
          setDuplicateDelta,
          setPointEdit,
        )
        return
      }

      deleteSelection()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    deleteSelection,
    pointEdit,
    scene,
    setDuplicateDelta,
    setPointEdit,
    setScene,
    setSelectedIds,
    tool,
  ])
}

function useCommandDuplicate(
  tool: Tool,
  selectedIds: readonly string[],
  duplicateDelta: Point | undefined,
  gestureRef: RefObject<SelectGesture | undefined>,
  setScene: Dispatch<SetStateAction<Scene>>,
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>,
  setDuplicateDelta: Dispatch<SetStateAction<Point | undefined>>,
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>,
  setGesture: Dispatch<SetStateAction<SelectGesture | undefined>>,
): void {
  const latest = useRef({ selectedIds, duplicateDelta })
  latest.current = { selectedIds, duplicateDelta }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandDuplicate(event) || tool !== 'select') {
        return
      }

      event.preventDefault()
      const selection = latest.current
      if (event.repeat || selection.selectedIds.length === 0) {
        return
      }

      const delta = nextDuplicateDelta(selection.duplicateDelta)
      const newIds = selection.selectedIds.map(() => crypto.randomUUID())
      latest.current = { selectedIds: newIds, duplicateDelta: delta }
      setScene((current) =>
        duplicatePolylines(current, {
          ids: selection.selectedIds,
          newIds,
          delta,
        }),
      )
      setSelectedIds(newIds)
      setDuplicateDelta(delta)
      setPointEdit(undefined)
      gestureRef.current = undefined
      setGesture(undefined)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    gestureRef,
    latest,
    setDuplicateDelta,
    setGesture,
    setPointEdit,
    setScene,
    setSelectedIds,
    tool,
  ])
}

function isCommandDuplicate(event: KeyboardEvent): boolean {
  return (
    event.key.toLowerCase() === 'd' &&
    event.metaKey &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey
  )
}

function isPlainBackspace(event: KeyboardEvent): boolean {
  return (
    event.key === 'Backspace' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  )
}

function deleteSelectedPoint(
  scene: Scene,
  target: PointDelete,
  setScene: Dispatch<SetStateAction<Scene>>,
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>,
  setDuplicateDelta: Dispatch<SetStateAction<Point | undefined>>,
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>,
): void {
  const polyline = scene.find((item) => item.id === target.id)
  if (!polyline?.points[target.index]) {
    return
  }

  const next = deletePolylinePoint(scene, target)
  setScene(next)
  if (next.some((item) => item.id === target.id)) {
    setPointEdit({ id: target.id, pointIndex: undefined })
    return
  }

  setSelectedIds([])
  setDuplicateDelta(undefined)
  setPointEdit(undefined)
}

function useHeldKey(key: string): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key) {
        return
      }
      setHeld(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== key) {
        return
      }
      setHeld(false)
    }
    const onBlur = () => {
      setHeld(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [key])

  return [held, setHeld]
}

function noteHeldKey(
  held: boolean,
  setHeld: Dispatch<SetStateAction<boolean>>,
): void {
  setHeld((current) => (current === held ? current : held))
}

function useFinishOnEnter(finishDraft: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return
      }

      event.preventDefault()
      finishDraft()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finishDraft])
}

const importToastMs = 4000

function useSvgDrop(
  apply: (polylines: readonly ImportedPolyline[]) => void,
  showRefusal: () => void,
): void {
  useEffect(() => {
    const cancelNavigation = (event: DragEvent) => {
      event.preventDefault()
    }
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      const file = event.dataTransfer?.files[0]
      if (!file) {
        return
      }

      void loadSvgFile(file, apply, showRefusal)
    }

    window.addEventListener('dragover', cancelNavigation)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', cancelNavigation)
      window.removeEventListener('drop', onDrop)
    }
  }, [apply, showRefusal])
}

function useImportToast(): ImportToast {
  const [notice, setNotice] = useState<ImportNotice>()
  const key = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(timer.current)
  }, [])

  const show = () => {
    window.clearTimeout(timer.current)
    key.current += 1
    setNotice({ key: key.current })
    timer.current = window.setTimeout(() => setNotice(undefined), importToastMs)
  }

  const hide = () => {
    window.clearTimeout(timer.current)
    setNotice(undefined)
  }

  return { notice, show, hide }
}

async function loadSvgFile(
  file: File,
  apply: (polylines: readonly ImportedPolyline[]) => void,
  showRefusal: () => void,
): Promise<void> {
  let text: string
  try {
    text = await file.text()
  } catch (error) {
    console.error('Failed to read SVG file', { name: file.name, error })
    showRefusal()
    return
  }

  const imported = polylinesFromSvg(text)
  if (!imported.ok) {
    showRefusal()
    return
  }

  apply(imported.polylines)
}

function downloadTextFile(name: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function polylineWithNewId(polyline: ImportedPolyline): Polyline {
  return {
    id: crypto.randomUUID(),
    points: polyline.points,
    closed: polyline.closed,
    stroke: polyline.stroke,
    widthMm: polyline.widthMm,
  }
}

function ImportToast({ notice }: ImportToastProps) {
  if (!notice) {
    return null
  }

  return (
    <p key={notice.key} className="island import-toast" role="alert">
      This SVG format is not suitable for line-paint. Only path elements are
      allowed.
    </p>
  )
}

function MenuIsland({
  open,
  onToggle,
  onImportSvg,
  onExportGcode,
  onExportSvg,
}: MenuIslandProps) {
  return (
    <>
      <div className="island menu-island">
        <button
          type="button"
          className="tool-button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={onToggle}
        >
          <RiMenuLine />
        </button>
      </div>
      {open && (
        <div className="island menu-panel" role="menu">
          <button
            type="button"
            className="menu-action"
            role="menuitem"
            onClick={onExportGcode}
          >
            Export GCode
          </button>
          <button
            type="button"
            className="menu-action"
            role="menuitem"
            onClick={onExportSvg}
          >
            Export SVG
          </button>
          <button
            type="button"
            className="menu-action"
            role="menuitem"
            onClick={onImportSvg}
          >
            Import SVG
          </button>
        </div>
      )}
    </>
  )
}

function ToolIsland({ tool, onTool }: ToolIslandProps) {
  return (
    <div className="island tool-island">
      <ToolButton
        label="Select"
        pressed={tool === 'select'}
        onPress={() => onTool('select')}
      >
        <SelectIcon />
      </ToolButton>
      <ToolButton
        label="Polyline"
        pressed={tool === 'polyline'}
        onPress={() => onTool('polyline')}
      >
        <PolylineIcon />
      </ToolButton>
    </div>
  )
}

function ToolButton({ label, pressed, onPress, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className="tool-button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 1.8v10.6l3.2-3.1 2.3 4.9 1.9-.9-2.3-4.9h4.1z"
        fill="currentColor"
      />
    </svg>
  )
}

function PolylineIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2.5 11.5 6 4.5l4 5 3.5-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FinishIsland({ enabled, onFinish }: FinishIslandProps) {
  return (
    <div className="island property-island">
      <button
        type="button"
        className="finish-button"
        aria-label="Finish"
        disabled={!enabled}
        onClick={onFinish}
      >
        <RiCheckLine />
      </button>
    </div>
  )
}

function lonePolyline(
  scene: Scene,
  selectedIds: readonly string[],
): Polyline | undefined {
  if (selectedIds.length !== 1) {
    return undefined
  }

  const id = selectedIds[0]
  return scene.find((polyline) => polyline.id === id)
}

function SelectIsland({ polyline, onClosed, onDelete }: SelectIslandProps) {
  return (
    <div
      className="island property-island"
      role="group"
      aria-label={polyline ? 'Open or closed' : undefined}
    >
      {polyline && (
        <>
          <ChoiceButton
            label="Open"
            pressed={!polyline.closed}
            onPress={() => onClosed(false)}
          >
            <RiRouteLine />
          </ChoiceButton>
          <ChoiceButton
            label="Closed"
            pressed={polyline.closed}
            onPress={() => onClosed(true)}
          >
            <RiCircleLine />
          </ChoiceButton>
        </>
      )}
      <button
        type="button"
        className="delete-button"
        aria-label="Delete"
        onClick={onDelete}
      >
        <RiDeleteBinLine />
      </button>
    </div>
  )
}

function ChoiceButton({
  label,
  pressed,
  onPress,
  children,
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      className="choice-button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

function requireContext(
  canvas: HTMLCanvasElement | null,
  name: string,
): CanvasRenderingContext2D {
  if (!canvas) {
    throw new Error(`${name} canvas is missing`)
  }
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error(`${name} canvas has no 2d context`)
  }
  return context
}

type Tool = 'select' | 'polyline'

type SelectGesture =
  PressGesture | MarqueeGesture | MoveGesture | PointGesture | ScaleGesture

type PressGesture = {
  kind: 'press'
  pointerId: number
  startCanvas: Point
  startScene: Point
  hitId: string | undefined
  pointIndex: number | undefined
  scaleHandle: ScaleHandle | undefined
}

type MarqueeGesture = {
  kind: 'marquee'
  pointerId: number
  startScene: Point
  currentScene: Point
}

type MoveGesture = {
  kind: 'move'
  pointerId: number
  startScene: Point
  currentScene: Point
  ids: readonly string[]
}

type PointGesture = {
  kind: 'point'
  pointerId: number
  startScene: Point
  currentScene: Point
  id: string
  index: number
}

type ScaleGesture = {
  kind: 'scale'
  pointerId: number
  startScene: Point
  currentScene: Point
  ids: readonly string[]
  handle: ScaleHandle
}

type PointEdit = {
  id: string
  pointIndex: number | undefined
}

type OverlayFrame = {
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

type ImportNotice = {
  key: number
}

type ImportToast = {
  notice: ImportNotice | undefined
  show: () => void
  hide: () => void
}

type ImportToastProps = {
  notice: ImportNotice | undefined
}

type MenuIslandProps = {
  open: boolean
  onToggle: () => void
  onImportSvg: () => void
  onExportGcode: () => void
  onExportSvg: () => void
}

type ToolIslandProps = {
  tool: Tool
  onTool: (tool: Tool) => void
}

type ToolButtonProps = {
  label: string
  pressed: boolean
  onPress: () => void
  children: ReactNode
}

type FinishIslandProps = {
  enabled: boolean
  onFinish: () => void
}

type SelectIslandProps = {
  polyline: Polyline | undefined
  onClosed: (closed: boolean) => void
  onDelete: () => void
}

type ChoiceButtonProps = {
  label: string
  pressed: boolean
  onPress: () => void
  children: ReactNode
}
