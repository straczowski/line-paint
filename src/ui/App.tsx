import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import {
  captureSelectionPicture,
  paintOverlay,
  paintStaticCanvas,
} from '../render/paint-sheet'
import type { HeldPicture } from '../render/paint-sheet'
import { selectionPicturePadPx } from '../render/selection-picture'
import { alignObjectCount, alignPolylines } from '../scene/align'
import type { AlignAction } from '../scene/align'
import {
  blueprintCorners,
  deleteBlueprints,
  imagesWithoutIds,
  lockBlueprints,
} from '../scene/blueprint'
import type { Blueprint } from '../scene/blueprint'
import { gcodeFiles, svgDocument } from '../scene/export'
import {
  addLayer,
  assignPolylines,
  defaultLayerId,
  defaultLayers,
  deleteLayer,
  penLayer,
  renameLayer,
  recolorLayer,
  resetLayers,
  sharedLayerId,
} from '../scene/layer'
import type { ImportedPolyline } from '../scene/import'
import { commitPolyline, setPolylineClosed } from '../scene/polyline'
import type { Point, Polyline } from '../scene/polyline'
import type { ShapeKind } from '../scene/shape'
import {
  deletePolylines,
  enteredGroupAfterRemoval,
  sceneWithoutHiddenPolylines,
  selectionFrameOf,
} from '../scene/selection'
import type { SelectionFrame } from '../scene/selection'
import {
  emptyScene,
  fitSheet,
  panBy,
  pinchAt,
  resetZoom,
  sheetCenterOnCanvas,
  viewZoom,
  zoomPercent,
} from '../scene/sheet'
import type { Scene, SheetFit, WindowSize } from '../scene/sheet'
import {
  duplicateSelection,
  groupSelection,
  selectionGroupActions,
  useCommandDuplicate,
  useFinishOnEnter,
  useGroupShortcut,
  useHeldKey,
  useSelectBackspace,
  useUndoShortcut,
} from './commands'
import { commitDrawing } from './history'
import type { CommitDrawing, DrawingStep, DrawingUndo } from './history'
import {
  appendImportedPolylines,
  downloadTextFile,
  loadSvgFile,
  useImportToast,
  useSvgDrop,
} from './files'
import {
  FinishIsland,
  ImportToast,
  LayerIsland,
  MenuIsland,
  NavigationIsland,
  SelectIsland,
  ShapeIsland,
  ToolIsland,
} from './islands'
import {
  hiddenBlueprintIds,
  hiddenPolylineKey,
  idsInHiddenKey,
  overlayFrame,
} from './overlay-frame'
import type { OverlayFrame } from './overlay-frame'
import { useSheetPointer } from './sheet-pointer'
import type { PointEdit, SelectGesture, Tool } from './sheet-pointer'

export function App() {
  const [scene, setScene] = useState<Scene>(emptyScene)
  const [images, setImages] = useState<readonly Blueprint[]>([])
  const [draftPoints, setDraftPoints] = useState<readonly Point[]>([])
  const [follower, setFollower] = useState<Point>()
  const [tool, setTool] = useState<Tool>('polyline')
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rectangle')
  const [layers, setLayers] = useState(defaultLayers)
  const [activeLayerId, setActiveLayerId] = useState(defaultLayerId)
  const [layersOpen, setLayersOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const [enteredGroupId, setEnteredGroupId] = useState<string>()
  const [duplicateDelta, setDuplicateDelta] = useState<Point>()
  const [pointEdit, setPointEdit] = useState<PointEdit>()
  const [gesture, setGesture] = useState<SelectGesture>()
  const [shiftHeld, setShiftHeld] = useHeldKey('Shift')
  const [altHeld, setAltHeld] = useHeldKey('Alt')
  const [commandHeld, setCommandHeld] = useHeldKey('Meta')
  const windowSize = useWindowSize()
  const [viewport, setViewport] = useState(() => fitSheet(readWindowSize()))
  const zoom = viewZoom(viewport.scale, fitSheet(windowSize).scale)
  const hostRef = useRef<HTMLElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const svgInputRef = useRef<HTMLInputElement>(null)
  const importToast = useImportToast()
  const gestureRef = useRef<SelectGesture | undefined>(undefined)
  const draftCountRef = useRef(0)
  const pastRef = useRef<readonly DrawingStep[]>([])
  const drawingRef = useRef<DrawingStep>({
    scene,
    images,
    layers,
    selectedIds,
    enteredGroupId,
    pointEdit,
    duplicateDelta,
  })
  useEffect(() => {
    drawingRef.current = {
      scene,
      images,
      layers,
      selectedIds,
      enteredGroupId,
      pointEdit,
      duplicateDelta,
    }
  }, [
    duplicateDelta,
    enteredGroupId,
    images,
    layers,
    pointEdit,
    scene,
    selectedIds,
  ])
  const commitScene: CommitDrawing = useCallback(
    (nextScene, editor, nextImages, nextLayers) => {
      const before = drawingRef.current
      const sceneAfter =
        typeof nextScene === 'function' ? nextScene(before.scene) : nextScene
      const imagesAfter =
        nextImages === undefined
          ? before.images
          : typeof nextImages === 'function'
            ? nextImages(before.images)
            : nextImages
      const result = commitDrawing(
        pastRef.current,
        before,
        sceneAfter,
        editor,
        imagesAfter,
        nextLayers,
      )
      if (!result.recorded && !editor) {
        return
      }
      if (result.recorded) {
        pastRef.current = result.past
        setScene(result.step.scene)
        setImages(result.step.images)
        setLayers(result.step.layers)
      }
      drawingRef.current = result.step
      if (!editor) {
        return
      }
      setSelectedIds(result.step.selectedIds)
      setEnteredGroupId(result.step.enteredGroupId)
      setPointEdit(result.step.pointEdit)
      setDuplicateDelta(result.step.duplicateDelta)
    },
    [],
  )
  const applyUndo = useCallback((undone: DrawingUndo) => {
    pastRef.current = undone.past
    drawingRef.current = undone.step
    setScene(undone.step.scene)
    setImages(undone.step.images)
    setLayers(undone.step.layers)
    setActiveLayerId((current) =>
      undone.step.layers.some((layer) => layer.id === current)
        ? current
        : penLayer(undone.step.layers, current).id,
    )
    setSelectedIds(undone.step.selectedIds)
    setEnteredGroupId(undone.step.enteredGroupId)
    setPointEdit(undone.step.pointEdit)
    setDuplicateDelta(undone.step.duplicateDelta)
  }, [])
  const clearDraft = () => {
    draftCountRef.current = 0
    setDraftPoints([])
    setFollower(undefined)
  }
  const pen = penLayer(layers, activeLayerId)
  const finishDraft = () => {
    const ink = penLayer(drawingRef.current.layers, activeLayerId)
    commitScene((current) =>
      commitPolyline(current, {
        id: crypto.randomUUID(),
        points: draftPoints,
        stroke: ink.color,
        layerId: ink.id,
      }),
    )
    clearDraft()
  }
  const chooseTool = (next: Tool) => {
    setTool(next)
    if (next !== 'polyline') {
      clearDraft()
    }
    if (next !== 'select') {
      setSelectedIds([])
      setEnteredGroupId(undefined)
      setDuplicateDelta(undefined)
      setPointEdit(undefined)
    }
    gestureRef.current = undefined
    setGesture(undefined)
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.style.cursor = ''
    }
  }

  const [bitmapEpoch, setBitmapEpoch] = useState(0)
  const noteBitmap = useCallback(() => {
    setBitmapEpoch((epoch) => epoch + 1)
  }, [])
  const shownSelection = tool === 'select' ? selectedIds : noSelection
  const selectionFrame = useMemo(
    () =>
      selectionFrameOf(
        scene,
        shownSelection,
        zoom,
        selectedBlueprintCorners(images, shownSelection),
      ),
    [images, scene, shownSelection, zoom],
  )
  useFinishedPicture(
    staticCanvasRef,
    scene,
    imagesWithoutIds(images, hiddenBlueprintIds(gesture, scene, altHeld)),
    windowSize,
    viewport,
    hiddenPolylineKey(selectedIds, gesture, altHeld),
    noteBitmap,
    bitmapEpoch,
  )
  useOverlayPicture(
    overlayCanvasRef,
    overlayFrame(
      scene,
      draftPoints,
      follower,
      shownSelection,
      gesture,
      pointEdit,
      shiftHeld,
      altHeld,
      zoom,
      viewport.scale,
      images,
      { kind: shapeKind, fromCenter: commandHeld },
      selectionFrame,
      windowSize,
    ),
    scene,
    shownSelection,
    selectionFrame,
    windowSize,
    viewport,
    pen.color,
    noteBitmap,
    bitmapEpoch,
  )
  useSheetWheel(hostRef, windowSize, viewport, setViewport)
  useSheetPointer({
    canvasRef: overlayCanvasRef,
    viewport,
    zoom,
    tool,
    scene,
    images,
    selectedIds,
    enteredGroupId,
    pointEdit,
    gestureRef,
    draftCountRef,
    duplicateDelta,
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
    setCommandHeld,
    shapeKind,
    pen,
    selectionFrame,
  })
  const deleteSelection = useCallback(() => {
    const before = drawingRef.current
    if (before.selectedIds.length === 0) {
      return
    }

    const remaining = deletePolylines(before.scene, before.selectedIds)
    const remainingImages = deleteBlueprints(before.images, before.selectedIds)
    commitScene(
      remaining,
      {
        selectedIds: [],
        enteredGroupId: enteredGroupAfterRemoval(
          remaining,
          before.enteredGroupId,
        ),
        duplicateDelta: undefined,
        pointEdit: undefined,
      },
      remainingImages,
    )
    gestureRef.current = undefined
    setGesture(undefined)
  }, [commitScene])
  const duplicateSelected = useCallback(() => {
    if (!duplicateSelection(drawingRef.current, commitScene)) {
      return
    }
    gestureRef.current = undefined
    setGesture(undefined)
  }, [commitScene])
  const groupSelected = useCallback(() => {
    groupSelection(drawingRef.current, commitScene, false)
  }, [commitScene])
  const ungroupSelected = useCallback(() => {
    groupSelection(drawingRef.current, commitScene, true)
  }, [commitScene])
  useSelectBackspace(tool, drawingRef, deleteSelection, commitScene)
  useCommandDuplicate(tool, drawingRef, gestureRef, commitScene, setGesture)
  useUndoShortcut(pastRef, gestureRef, applyUndo)
  useGroupShortcut(tool, drawingRef, commitScene)
  useFinishOnEnter(finishDraft)

  const sheetIsEmpty = scene.length === 0 && images.length === 0
  const hint =
    tool === 'polyline' && sheetIsEmpty && draftPoints.length === 0
      ? 'Click to add a point. Enter to finish.'
      : tool === 'shape' && sheetIsEmpty && gesture?.kind !== 'shape'
        ? 'Drag to draw a shape.'
        : undefined
  const hintCenter = sheetCenterOnCanvas(viewport)
  const selectedPolyline = lonePolyline(scene, selectedIds)
  const groupActions = selectionGroupActions(
    scene,
    selectedIds,
    enteredGroupId,
    images,
  )
  const selectedImages = images.filter((image) =>
    selectedIds.includes(image.id),
  )
  const lock =
    selectedImages.length === 0
      ? undefined
      : selectedImages.every((image) => image.locked)
        ? 'locked'
        : 'unlocked'
  const lockSelected = () => {
    const before = drawingRef.current
    commitScene(
      before.scene,
      undefined,
      lockBlueprints(before.images, before.selectedIds),
    )
  }
  const objectCount = alignObjectCount(scene, selectedIds, enteredGroupId)
  const alignSelected = (action: AlignAction) => {
    const drawing = drawingRef.current
    commitScene((current) =>
      alignPolylines(current, {
        ids: drawing.selectedIds,
        enteredGroupId: drawing.enteredGroupId,
        action,
      }),
    )
  }
  const closeSelected = (closed: boolean) => {
    if (!selectedPolyline) {
      return
    }

    const id = selectedPolyline.id
    commitScene((current) => setPolylineClosed(current, { id, closed }))
  }

  const applyImportedSvg = (polylines: readonly ImportedPolyline[]) => {
    const drawing = drawingRef.current
    commitScene(
      appendImportedPolylines(
        drawing.scene,
        polylines,
        penLayer(drawing.layers, activeLayerId),
      ),
      {
        selectedIds: [],
        enteredGroupId: undefined,
        duplicateDelta: undefined,
        pointEdit: undefined,
      },
    )
    clearDraft()
    gestureRef.current = undefined
    setGesture(undefined)
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.style.cursor = ''
    }
    importToast.hide()
  }
  const applyBlueprint = (image: Blueprint) => {
    const before = drawingRef.current
    commitScene(
      before.scene,
      {
        selectedIds: [image.id],
        enteredGroupId: undefined,
        pointEdit: undefined,
        duplicateDelta: undefined,
      },
      [...before.images, image],
    )
    gestureRef.current = undefined
    setGesture(undefined)
    importToast.hide()
  }
  const choosePen = (layerId: string) => {
    setActiveLayerId(layerId)
  }
  const addLayerPen = () => {
    const id = crypto.randomUUID()
    const drawing = drawingRef.current
    commitScene(
      drawing.scene,
      undefined,
      undefined,
      addLayer(drawing.layers, id),
    )
    setActiveLayerId(id)
  }
  const renameLayerPen = (layerId: string, name: string) => {
    const drawing = drawingRef.current
    const next = renameLayer(drawing.layers, layerId, name)
    if (next === drawing.layers) {
      return
    }
    commitScene(drawing.scene, undefined, undefined, next)
  }
  const recolorLayerPen = (layerId: string, color: string) => {
    const drawing = drawingRef.current
    const next = recolorLayer(drawing.layers, drawing.scene, layerId, color)
    if (next.layers === drawing.layers && next.scene === drawing.scene) {
      return
    }
    commitScene(next.scene, undefined, undefined, next.layers)
  }
  const deleteLayerPen = (layerId: string) => {
    const drawing = drawingRef.current
    const removed = deleteLayer(drawing.layers, drawing.scene, layerId)
    if (!removed) {
      return
    }
    commitScene(removed.scene, undefined, undefined, removed.layers)
    setActiveLayerId((current) =>
      current === layerId ? removed.receiverId : current,
    )
  }
  const assignSelection = (layerId: string) => {
    const drawing = drawingRef.current
    commitScene(
      assignPolylines(
        drawing.scene,
        drawing.selectedIds,
        drawing.layers,
        layerId,
      ),
    )
  }
  const deactivateLayers = () => {
    const drawing = drawingRef.current
    const next = resetLayers(drawing.layers, drawing.scene)
    commitScene(next.scene, undefined, undefined, next.layers)
    setActiveLayerId(defaultLayerId)
    setLayersOpen(false)
    setMenuOpen(false)
  }
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedPolylines = scene.some((polyline) =>
    selectedIdSet.has(polyline.id),
  )
  const layerAssign =
    tool === 'select' && selectedPolylines && layers.length > 1
      ? {
          layers,
          sharedLayerId: sharedLayerId(scene, selectedIds, layers),
          onAssign: assignSelection,
        }
      : undefined
  const chooseSvgFile = () => {
    setMenuOpen(false)
    svgInputRef.current?.click()
  }
  useSvgDrop(applyImportedSvg, applyBlueprint, importToast.show, {
    canvasRef: overlayCanvasRef,
    fit: viewport,
  })

  return (
    <main ref={hostRef} className="sheet-host">
      <canvas ref={staticCanvasRef} className="sheet-canvas" />
      <canvas ref={overlayCanvasRef} className="sheet-canvas" />
      {hint && (
        <p
          className="sheet-hint"
          style={{ left: hintCenter.x, top: hintCenter.y }}
        >
          {hint}
        </p>
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
          layersOpen={layersOpen}
          onToggle={() => setMenuOpen((open) => !open)}
          onImportSvg={chooseSvgFile}
          onExportGcode={() => {
            for (const file of gcodeFiles(scene, layers)) {
              downloadTextFile(file.name, file.text, 'text/plain')
            }
            setMenuOpen(false)
          }}
          onLayers={() => {
            if (layersOpen) {
              deactivateLayers()
              return
            }
            setLayersOpen(true)
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
        {tool === 'shape' && (
          <ShapeIsland shape={shapeKind} onShape={setShapeKind} />
        )}
        {tool === 'select' && selectedIds.length > 0 && (
          <SelectIsland
            polyline={selectedPolyline}
            showGroup={groupActions.group}
            showUngroup={groupActions.ungroup}
            onClosed={closeSelected}
            onDuplicate={duplicateSelected}
            onGroup={groupSelected}
            onUngroup={ungroupSelected}
            onDelete={deleteSelection}
            showAlign={objectCount >= 2}
            distribute={objectCount >= 3}
            showDuplicate={scene.some((polyline) =>
              selectedIdSet.has(polyline.id),
            )}
            lock={lock}
            onAlign={alignSelected}
            onLock={lockSelected}
            layerAssign={layerAssign}
          />
        )}
      </div>
      {layersOpen && (
        <LayerIsland
          layers={layers}
          activeLayerId={pen.id}
          onChoose={choosePen}
          onAdd={addLayerPen}
          onRename={renameLayerPen}
          onRecolor={recolorLayerPen}
          onDelete={deleteLayerPen}
        />
      )}
      <NavigationIsland
        percent={zoomPercent(viewport.scale, fitSheet(windowSize).scale)}
        onResetZoom={() => setViewport((fit) => resetZoom(fit, windowSize))}
        onFit={() => setViewport(fitSheet(windowSize))}
      />
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
  images: readonly Blueprint[],
  windowSize: WindowSize,
  viewport: SheetFit,
  hiddenKey: string,
  onBitmap: () => void,
  bitmapEpoch: number,
): void {
  useLayoutEffect(() => {
    if (windowSize.width <= 0 || windowSize.height <= 0) {
      return
    }

    paintStaticCanvas({
      context: requireContext(canvasRef.current, 'Static'),
      scene: sceneWithoutHiddenPolylines(scene, idsInHiddenKey(hiddenKey)),
      images,
      onBitmap,
      fit: viewport,
      size: windowSize,
    })
  }, [
    bitmapEpoch,
    canvasRef,
    hiddenKey,
    images,
    onBitmap,
    scene,
    viewport,
    windowSize,
  ])
}

function useOverlayPicture(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  frame: OverlayFrame,
  scene: Scene,
  selectedIds: readonly string[],
  selectionFrame: SelectionFrame | undefined,
  windowSize: WindowSize,
  viewport: SheetFit,
  draftColor: string,
  onBitmap: () => void,
  bitmapEpoch: number,
): void {
  const held = useRef<StoredPicture | undefined>(undefined)
  useLayoutEffect(() => {
    if (windowSize.width <= 0 || windowSize.height <= 0) {
      return
    }

    const heldPicture = heldSelectionPicture(
      held,
      frame,
      scene,
      selectedIds,
      selectionFrame,
      viewport,
    )
    const gesturePicture = gestureWithoutPicture(
      frame.gesturePicture,
      heldPicture,
    )
    paintOverlay({
      context: requireContext(canvasRef.current, 'Overlay'),
      draftPoints: frame.draftPoints,
      draftColor,
      preview:
        gesturePicture?.draw === 'transform' && frame.preview.length === 0
          ? frame.pictureStrokes
          : frame.preview,
      bounds: frame.bounds,
      rotatedBounds: frame.rotatedBounds,
      dashed: frame.dashed,
      scaleHandles: frame.scaleHandles,
      scaleHandlePoints: frame.scaleHandlePoints,
      rotateHandle: frame.rotateHandle,
      marquee: frame.marquee,
      handles: frame.handles,
      blueprints: frame.blueprints,
      gesturePicture,
      heldPicture,
      onBitmap,
      fit: viewport,
      size: windowSize,
    })
  }, [
    bitmapEpoch,
    canvasRef,
    draftColor,
    frame,
    onBitmap,
    scene,
    selectedIds,
    selectionFrame,
    viewport,
    windowSize,
  ])
}

function gestureWithoutPicture(
  gesture: OverlayFrame['gesturePicture'],
  held: HeldPicture | undefined,
): OverlayFrame['gesturePicture'] {
  if (gesture?.draw !== 'picture' || held) {
    return gesture
  }
  if (gesture.kind === 'move') {
    return { kind: 'move', delta: gesture.delta, draw: 'transform' }
  }
  return {
    kind: 'rotate',
    center: gesture.center,
    angle: gesture.angle,
    draw: 'transform',
  }
}

function heldSelectionPicture(
  held: { current: StoredPicture | undefined },
  frame: OverlayFrame,
  scene: Scene,
  selectedIds: readonly string[],
  selectionFrame: SelectionFrame | undefined,
  viewport: SheetFit,
): HeldPicture | undefined {
  if (frame.gesturePicture?.draw !== 'picture' || !selectionFrame) {
    return undefined
  }
  const stored = held.current
  if (
    stored &&
    stored.scene === scene &&
    stored.ids === selectedIds &&
    stored.scale === viewport.scale &&
    stored.left === viewport.left &&
    stored.top === viewport.top
  ) {
    return stored.picture
  }

  const picture = captureSelectionPicture(
    frame.pictureStrokes,
    viewport,
    selectionFrame.tight,
    selectionPicturePadPx(selectionFrame.widthMm, viewport.scale),
  )
  if (!picture) {
    return undefined
  }
  held.current = {
    scene,
    ids: selectedIds,
    scale: viewport.scale,
    left: viewport.left,
    top: viewport.top,
    picture,
  }
  return picture
}

function useSheetWheel(
  hostRef: RefObject<HTMLElement | null>,
  windowSize: WindowSize,
  viewport: SheetFit,
  setViewport: Dispatch<SetStateAction<SheetFit>>,
): void {
  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const fitScale = fitSheet(windowSize).scale
    let pending: SheetFit | undefined
    let frame = 0
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const anchor = pointerOnHost(event, host)
      const base = pending ?? viewport
      pending = event.ctrlKey
        ? pinchAt(base, anchor, event.deltaY, fitScale)
        : panBy(base, event.deltaX, event.deltaY)
      if (frame) {
        return
      }
      frame = requestAnimationFrame(() => {
        frame = 0
        const next = pending
        pending = undefined
        if (next) {
          setViewport(next)
        }
      })
    }

    host.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      host.removeEventListener('wheel', onWheel)
      if (frame) {
        cancelAnimationFrame(frame)
      }
    }
  }, [hostRef, setViewport, viewport, windowSize])
}

function pointerOnHost(
  event: { clientX: number; clientY: number },
  host: HTMLElement,
): Point {
  const bounds = host.getBoundingClientRect()
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  }
}

const noSelection: readonly string[] = []

function selectedBlueprintCorners(
  images: readonly Blueprint[],
  ids: readonly string[],
): readonly Point[] {
  const selected = new Set(ids)
  return images.flatMap((image) =>
    selected.has(image.id) ? blueprintCorners(image) : [],
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

type StoredPicture = {
  scene: Scene
  ids: readonly string[]
  scale: number
  left: number
  top: number
  picture: HeldPicture
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
