import { RiCheckLine, RiCircleLine, RiRouteLine } from '@remixicon/react'
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
  movePolylinePoint,
  pointerTarget,
  selectionBounds,
  touchedPolylineIds,
  translatePolylines,
} from '../scene/selection'
import type { SelectionBounds } from '../scene/selection'
import { canvasPointToScene, emptyScene, fitSheet } from '../scene/sheet'
import type { Scene, WindowSize } from '../scene/sheet'

export function App() {
  const [scene, setScene] = useState<Scene>(emptyScene)
  const [draftPoints, setDraftPoints] = useState<readonly Point[]>([])
  const [follower, setFollower] = useState<Point>()
  const [tool, setTool] = useState<Tool>('polyline')
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const [pointEdit, setPointEdit] = useState<PointEdit>()
  const [gesture, setGesture] = useState<SelectGesture>()
  const windowSize = useWindowSize()
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
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
      setPointEdit(undefined)
    }
    gestureRef.current = undefined
    setGesture(undefined)
  }

  useFinishedPicture(
    staticCanvasRef,
    scene,
    windowSize,
    gesture?.kind === 'point' ? gesture.id : undefined,
  )
  useOverlayPicture(
    overlayCanvasRef,
    overlayFrame(scene, draftPoints, follower, selectedIds, gesture, pointEdit),
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
    setPointEdit,
    setGesture,
  })
  useDeletePoint(tool, scene, pointEdit, setScene, setSelectedIds, setPointEdit)
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

  return (
    <main className="sheet-host">
      <canvas ref={staticCanvasRef} className="sheet-canvas" />
      <canvas ref={overlayCanvasRef} className="sheet-canvas" />
      {showHint && (
        <p className="sheet-hint">Click to add a point. Enter to finish.</p>
      )}
      <div className="top-islands">
        <ToolIsland tool={tool} onTool={chooseTool} />
        {tool === 'polyline' && (
          <FinishIsland
            enabled={draftPoints.length > 0}
            onFinish={finishDraft}
          />
        )}
        {tool === 'select' && selectedPolyline && (
          <ClosedIsland
            closed={selectedPolyline.closed}
            onClosed={closeSelected}
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
  draggedPolylineId: string | undefined,
): void {
  useLayoutEffect(() => {
    if (windowSize.width <= 0 || windowSize.height <= 0) {
      return
    }

    paintStaticCanvas({
      context: requireContext(canvasRef.current, 'Static'),
      scene: sceneWithoutPolyline(scene, draggedPolylineId),
      fit: fitSheet(windowSize),
      size: windowSize,
    })
  }, [canvasRef, draggedPolylineId, scene, windowSize])
}

function sceneWithoutPolyline(scene: Scene, id: string | undefined): Scene {
  if (!id) {
    return scene
  }
  return scene.filter((polyline) => polyline.id !== id)
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
    setPointEdit,
    setGesture,
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
      setPointEdit,
      setGesture,
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
    setScene,
    setSelectedIds,
    tool,
    windowSize,
  ])
}

function beginSheetPointer(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  input: SheetPointerInput,
): void {
  if (event.button !== 0) {
    return
  }

  const located = locatePointer(canvas, event, input.windowSize)
  if (!located) {
    return
  }
  if (input.tool === 'polyline') {
    input.draftCountRef.current += 1
    input.setDraftPoints((points) => [...points, located.scene])
    input.setFollower(located.scene)
    return
  }

  if (event.isTrusted) {
    canvas.setPointerCapture(event.pointerId)
  }
  const target = pointerTarget(input.scene, located.scene, input.pointEdit?.id)
  const press: SelectGesture = {
    kind: 'press',
    pointerId: event.pointerId,
    startCanvas: located.canvas,
    startScene: located.scene,
    hitId: target.id,
    pointIndex: target.pointIndex,
  }
  input.gestureRef.current = press
  input.setGesture(press)
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
  input.setSelectedIds([target.id])
  input.setPointEdit({ id: target.id, pointIndex: undefined })
}

function moveSheetPointer(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  input: SheetPointerInput,
): void {
  if (input.tool === 'polyline') {
    followDraft(canvas, event, input)
    return
  }

  const gesture = input.gestureRef.current
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return
  }

  const located = locatePointer(canvas, event, input.windowSize)
  if (!located) {
    return
  }

  const next = advanceGesture(gesture, located, input.selectedIds)
  if (next.gesture === gesture && next.selectedIds === input.selectedIds) {
    return
  }

  input.gestureRef.current = next.gesture
  input.setGesture(next.gesture)
  if (next.selectedIds !== input.selectedIds) {
    input.setSelectedIds(next.selectedIds)
    input.setPointEdit(undefined)
  }
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
  const gesture = input.gestureRef.current
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return
  }

  input.gestureRef.current = undefined
  input.setGesture(undefined)
  if (gesture.kind === 'press') {
    if (event.detail > 1) {
      return
    }
    finishPress(gesture, input)
    return
  }
  if (gesture.kind === 'marquee') {
    input.setSelectedIds(
      touchedPolylineIds(input.scene, {
        start: gesture.startScene,
        end: gesture.currentScene,
      }),
    )
    input.setPointEdit(undefined)
    return
  }
  if (gesture.kind === 'point') {
    moveEditedPoint(input, gesture)
    return
  }

  input.setScene((current) =>
    translatePolylines(current, {
      ids: gesture.ids,
      delta: sceneDelta(gesture),
    }),
  )
}

function finishPress(gesture: PressGesture, input: SheetPointerInput): void {
  if (gesture.pointIndex !== undefined && gesture.hitId) {
    input.setSelectedIds([gesture.hitId])
    input.setPointEdit({ id: gesture.hitId, pointIndex: gesture.pointIndex })
    return
  }
  if (gesture.hitId) {
    input.setSelectedIds([gesture.hitId])
    if (gesture.hitId !== input.pointEdit?.id) {
      input.setPointEdit(undefined)
    }
    return
  }

  input.setSelectedIds([])
  input.setPointEdit(undefined)
}

function moveEditedPoint(
  input: SheetPointerInput,
  gesture: PointGesture,
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
      point: translatedPoint(origin, sceneDelta(gesture)),
    })
  })
  input.setSelectedIds([gesture.id])
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
    gesture.kind === 'point'
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

function sceneDelta(drag: { startScene: Point; currentScene: Point }): Point {
  return {
    x: drag.currentScene.x - drag.startScene.x,
    y: drag.currentScene.y - drag.startScene.y,
  }
}

function overlayFrame(
  scene: Scene,
  draftPoints: readonly Point[],
  follower: Point | undefined,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
  pointEdit: PointEdit | undefined,
): OverlayFrame {
  return {
    draftPoints: previewStrokePoints(draftPoints, follower),
    preview: overlayPreview(scene, selectedIds, gesture),
    bounds: selectionFrameBounds(scene, selectedIds, gesture),
    marquee:
      gesture?.kind === 'marquee'
        ? { start: gesture.startScene, end: gesture.currentScene }
        : undefined,
    handles: pointHandles(scene, pointEdit, gesture),
  }
}

function overlayPreview(
  scene: Scene,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
): OverlayFrame['preview'] {
  if (gesture?.kind === 'point') {
    return pointDragPreview(scene, gesture)
  }
  return movePreview(scene, selectedIds, gesture)
}

function pointDragPreview(
  scene: Scene,
  gesture: PointGesture,
): OverlayFrame['preview'] {
  const polyline = scene.find((item) => item.id === gesture.id)
  if (!polyline) {
    return []
  }

  return [
    {
      points: pointsWithMovedIndex(polyline.points, gesture),
      closed: polyline.closed,
      widthMm: polyline.widthMm,
    },
  ]
}

function movePreview(
  scene: Scene,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
): OverlayFrame['preview'] {
  const selection = activeSelection(selectedIds, gesture)
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
): SelectionBounds | undefined {
  const selection = activeSelection(selectedIds, gesture)
  const points = scene.flatMap((polyline) => {
    if (!selection.ids.includes(polyline.id)) {
      return []
    }
    if (gesture?.kind === 'point' && gesture.id === polyline.id) {
      return pointsWithMovedIndex(polyline.points, gesture)
    }
    return selection.delta
      ? translatedPoints(polyline.points, selection.delta)
      : polyline.points
  })
  return selectionBounds(points)
}

function pointHandles(
  scene: Scene,
  pointEdit: PointEdit | undefined,
  gesture: SelectGesture | undefined,
): OverlayFrame['handles'] {
  if (!pointEdit) {
    return []
  }

  const polyline = scene.find((item) => item.id === pointEdit.id)
  if (!polyline) {
    return []
  }

  const points = handlePoints(polyline, gesture)
  const selectedIndex = handleSelection(pointEdit, gesture)
  return points.map((point, index) => ({
    point,
    selected: index === selectedIndex,
  }))
}

function handlePoints(
  polyline: Polyline,
  gesture: SelectGesture | undefined,
): readonly Point[] {
  if (gesture?.kind === 'point' && gesture.id === polyline.id) {
    return pointsWithMovedIndex(polyline.points, gesture)
  }
  if (gesture?.kind === 'move' && gesture.ids.includes(polyline.id)) {
    return translatedPoints(polyline.points, sceneDelta(gesture))
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
): readonly Point[] {
  const delta = sceneDelta(gesture)
  return points.map((point, index) =>
    index === gesture.index ? translatedPoint(point, delta) : point,
  )
}

function activeSelection(
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
): ActiveSelection {
  if (gesture?.kind === 'move') {
    return { ids: gesture.ids, delta: sceneDelta(gesture) }
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

function useDeletePoint(
  tool: Tool,
  scene: Scene,
  pointEdit: PointEdit | undefined,
  setScene: Dispatch<SetStateAction<Scene>>,
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>,
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (tool !== 'select' || pointEdit?.pointIndex === undefined) {
        return
      }

      const index = pointEdit.pointIndex
      const id = pointEdit.id
      const polyline = scene.find((item) => item.id === id)
      if (!polyline?.points[index]) {
        return
      }

      event.preventDefault()
      const next = deletePolylinePoint(scene, { id, index })
      setScene(next)
      if (next.some((item) => item.id === id)) {
        setPointEdit({ id, pointIndex: undefined })
        return
      }

      setSelectedIds([])
      setPointEdit(undefined)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pointEdit, scene, setPointEdit, setScene, setSelectedIds, tool])
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

function ClosedIsland({ closed, onClosed }: ClosedIslandProps) {
  return (
    <div
      className="island property-island"
      role="group"
      aria-label="Open or closed"
    >
      <ChoiceButton
        label="Open"
        pressed={!closed}
        onPress={() => onClosed(false)}
      >
        <RiRouteLine />
      </ChoiceButton>
      <ChoiceButton
        label="Closed"
        pressed={closed}
        onPress={() => onClosed(true)}
      >
        <RiCircleLine />
      </ChoiceButton>
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

type SelectGesture = PressGesture | MarqueeGesture | MoveGesture | PointGesture

type PressGesture = {
  kind: 'press'
  pointerId: number
  startCanvas: Point
  startScene: Point
  hitId: string | undefined
  pointIndex: number | undefined
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
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>
  setGesture: Dispatch<SetStateAction<SelectGesture | undefined>>
}

type LocatedPointer = {
  canvas: Point
  scene: Point
}

type GestureAdvance = {
  gesture: SelectGesture
  selectedIds: readonly string[]
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

type ClosedIslandProps = {
  closed: boolean
  onClosed: (closed: boolean) => void
}

type ChoiceButtonProps = {
  label: string
  pressed: boolean
  onPress: () => void
  children: ReactNode
}
