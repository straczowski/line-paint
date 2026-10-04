import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { paintOverlay, paintStaticCanvas } from '../render/paint-sheet'
import { commitPolyline, previewStrokePoints } from '../scene/polyline'
import type { Point } from '../scene/polyline'
import {
  polylineAt,
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
    }
    gestureRef.current = undefined
    setGesture(undefined)
  }

  useFinishedPicture(staticCanvasRef, scene, windowSize)
  useOverlayPicture(
    overlayCanvasRef,
    overlayFrame(scene, draftPoints, follower, selectedIds, gesture),
    windowSize,
  )
  useSheetPointer({
    canvasRef: overlayCanvasRef,
    windowSize,
    tool,
    scene,
    selectedIds,
    gestureRef,
    draftCountRef,
    setScene,
    setDraftPoints,
    setFollower,
    setSelectedIds,
    setGesture,
  })
  useFinishOnEnter(finishDraft)

  const showHint =
    tool === 'polyline' && scene.length === 0 && draftPoints.length === 0

  return (
    <main className="sheet-host">
      <canvas ref={staticCanvasRef} className="sheet-canvas" />
      <canvas ref={overlayCanvasRef} className="sheet-canvas" />
      {showHint && (
        <p className="sheet-hint">Click to add a point. Enter to finish.</p>
      )}
      <div className="top-islands">
        <ToolIsland tool={tool} onTool={chooseTool} />
        {draftPoints.length > 0 && <FinishIsland onFinish={finishDraft} />}
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
): void {
  useLayoutEffect(() => {
    if (windowSize.width <= 0 || windowSize.height <= 0) {
      return
    }

    paintStaticCanvas({
      context: requireContext(canvasRef.current, 'Static'),
      scene,
      fit: fitSheet(windowSize),
      size: windowSize,
    })
  }, [canvasRef, scene, windowSize])
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
    gestureRef,
    draftCountRef,
    setScene,
    setDraftPoints,
    setFollower,
    setSelectedIds,
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
      gestureRef,
      draftCountRef,
      setScene,
      setDraftPoints,
      setFollower,
      setSelectedIds,
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

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [
    canvasRef,
    draftCountRef,
    gestureRef,
    scene,
    selectedIds,
    setDraftPoints,
    setFollower,
    setGesture,
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
  const press: SelectGesture = {
    kind: 'press',
    pointerId: event.pointerId,
    startCanvas: located.canvas,
    startScene: located.scene,
    hitId: polylineAt(input.scene, located.scene),
  }
  input.gestureRef.current = press
  input.setGesture(press)
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
    input.setSelectedIds(gesture.hitId ? [gesture.hitId] : [])
    return
  }
  if (gesture.kind === 'marquee') {
    input.setSelectedIds(
      touchedPolylineIds(input.scene, {
        start: gesture.startScene,
        end: gesture.currentScene,
      }),
    )
    return
  }

  input.setScene((current) =>
    translatePolylines(current, {
      ids: gesture.ids,
      delta: sceneDelta(gesture),
    }),
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

function advanceGesture(
  gesture: SelectGesture,
  located: LocatedPointer,
  selectedIds: readonly string[],
): GestureAdvance {
  if (gesture.kind === 'marquee' || gesture.kind === 'move') {
    return {
      gesture: { ...gesture, currentScene: located.scene },
      selectedIds,
    }
  }
  if (!pointerPassedClickSlop(gesture.startCanvas, located.canvas)) {
    return { gesture, selectedIds }
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
  event: PointerEvent,
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
  event: PointerEvent,
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

function sceneDelta(gesture: MoveGesture): Point {
  return {
    x: gesture.currentScene.x - gesture.startScene.x,
    y: gesture.currentScene.y - gesture.startScene.y,
  }
}

function overlayFrame(
  scene: Scene,
  draftPoints: readonly Point[],
  follower: Point | undefined,
  selectedIds: readonly string[],
  gesture: SelectGesture | undefined,
): OverlayFrame {
  return {
    draftPoints: previewStrokePoints(draftPoints, follower),
    preview: movePreview(scene, selectedIds, gesture),
    bounds: selectionFrameBounds(scene, selectedIds, gesture),
    marquee:
      gesture?.kind === 'marquee'
        ? { start: gesture.startScene, end: gesture.currentScene }
        : undefined,
  }
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
    return selection.delta
      ? translatedPoints(polyline.points, selection.delta)
      : polyline.points
  })
  return selectionBounds(points)
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
  return points.map((point) => ({
    x: point.x + delta.x,
    y: point.y + delta.y,
  }))
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

function FinishIsland({ onFinish }: FinishIslandProps) {
  return (
    <div className="island property-island">
      <button type="button" className="finish-button" onClick={onFinish}>
        Finish
      </button>
    </div>
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

type SelectGesture = PressGesture | MarqueeGesture | MoveGesture

type PressGesture = {
  kind: 'press'
  pointerId: number
  startCanvas: Point
  startScene: Point
  hitId: string | undefined
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

type OverlayFrame = {
  draftPoints: readonly Point[]
  preview: readonly { points: readonly Point[]; widthMm: number }[]
  bounds: SelectionBounds | undefined
  marquee: { start: Point; end: Point } | undefined
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
  gestureRef: RefObject<SelectGesture | undefined>
  draftCountRef: RefObject<number>
  setScene: Dispatch<SetStateAction<Scene>>
  setDraftPoints: Dispatch<SetStateAction<readonly Point[]>>
  setFollower: Dispatch<SetStateAction<Point | undefined>>
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>
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
  onFinish: () => void
}
