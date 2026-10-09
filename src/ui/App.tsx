import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { paintOverlay, paintStaticCanvas } from '../render/paint-sheet'
import { gcodeDocument, svgDocument } from '../scene/export'
import type { ImportedPolyline } from '../scene/import'
import { commitPolyline, setPolylineClosed } from '../scene/polyline'
import type { Point, Polyline } from '../scene/polyline'
import {
  deletePolylines,
  sceneWithoutHiddenPolylines,
} from '../scene/selection'
import { emptyScene, fitSheet } from '../scene/sheet'
import type { Scene, WindowSize } from '../scene/sheet'
import {
  useCommandDuplicate,
  useFinishOnEnter,
  useHeldKey,
  useSelectBackspace,
} from './commands'
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
  MenuIsland,
  SelectIsland,
  ToolIsland,
} from './islands'
import {
  hiddenPolylineKey,
  idsInHiddenKey,
  overlayFrame,
} from './overlay-frame'
import type { OverlayFrame } from './overlay-frame'
import { useSheetPointer } from './sheet-pointer'
import type { PointEdit, SelectGesture, Tool } from './sheet-pointer'

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
    setScene((current) => appendImportedPolylines(current, polylines))
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
