import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { placeBlueprint } from '../scene/blueprint'
import type { Blueprint } from '../scene/blueprint'
import { polylinesFromSvg } from '../scene/import'
import type { Layer } from '../scene/layer'
import type { ImportedPolyline } from '../scene/import'
import type { Point, Polyline } from '../scene/polyline'
import { canvasPointToScene } from '../scene/sheet'
import type { SheetFit } from '../scene/sheet'

const importToastMs = 4000

export function useSvgDrop(
  applySvg: (polylines: readonly ImportedPolyline[]) => void,
  applyBlueprint: (image: Blueprint) => void,
  refuse: (refusal?: ImportRefusal) => void,
  target: DropTarget,
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

      const kind = droppedFileKind(file)
      if (kind === 'svg') {
        void loadSvgFile(file, applySvg, () => refuse('svg'))
        return
      }
      if (kind === 'image') {
        const point = dropPoint(event, target.canvasRef.current, target.fit)
        if (!point) {
          return
        }
        void loadBlueprintFile(file, point, applyBlueprint, () =>
          refuse('file'),
        )
        return
      }

      refuse('file')
    }

    window.addEventListener('dragover', cancelNavigation)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', cancelNavigation)
      window.removeEventListener('drop', onDrop)
    }
  }, [applyBlueprint, applySvg, refuse, target.canvasRef, target.fit])
}

export function droppedFileKind(file: NamedFile): DroppedFileKind {
  const name = file.name.toLowerCase()
  if (file.type === 'image/svg+xml' || name.endsWith('.svg')) {
    return 'svg'
  }
  if (imageTypes.has(file.type)) {
    return 'image'
  }
  if (
    file.type === '' &&
    imageExtensions.some((extension) => name.endsWith(extension))
  ) {
    return 'image'
  }
  return 'refused'
}

export function useImportToast(): ImportToast {
  const [notice, setNotice] = useState<ImportNotice>()
  const key = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(timer.current)
  }, [])

  const show = (refusal: ImportRefusal = 'svg') => {
    window.clearTimeout(timer.current)
    key.current += 1
    setNotice({ key: key.current, refusal })
    timer.current = window.setTimeout(() => setNotice(undefined), importToastMs)
  }

  const hide = () => {
    window.clearTimeout(timer.current)
    setNotice(undefined)
  }

  return { notice, show, hide }
}

export async function loadSvgFile(
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

export async function loadBlueprintFile(
  file: File,
  center: Point,
  apply: (image: Blueprint) => void,
  showRefusal: () => void,
): Promise<void> {
  const href = await readDataUrl(file)
  if (!href) {
    showRefusal()
    return
  }

  const pixels = await pixelSize(href)
  if (!pixels) {
    console.error('Failed to decode image file', { name: file.name })
    showRefusal()
    return
  }

  const image = placeBlueprint({
    id: crypto.randomUUID(),
    href,
    pixelWidth: pixels.width,
    pixelHeight: pixels.height,
    center,
  })
  if (!image) {
    showRefusal()
    return
  }

  apply(image)
}

const imageTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

function dropPoint(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement | null,
  fit: SheetFit,
): Point | undefined {
  if (!canvas || fit.scale <= 0) {
    return undefined
  }

  const bounds = canvas.getBoundingClientRect()
  return canvasPointToScene(
    {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    },
    fit,
  )
}

function readDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : undefined)
    }
    reader.onerror = () => {
      console.error('Failed to read image file', { name: file.name })
      resolve(undefined)
    }
    reader.readAsDataURL(file)
  })
}

function pixelSize(
  href: string,
): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      resolve(
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : undefined,
      )
    }
    image.onerror = () => resolve(undefined)
    image.src = href
  })
}

export function downloadTextFile(
  name: string,
  contents: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function appendImportedPolylines(
  scene: readonly Polyline[],
  imported: readonly ImportedPolyline[],
  layer: Layer,
): readonly Polyline[] {
  if (imported.length === 0) {
    return scene
  }

  const groupId = crypto.randomUUID()
  return [
    ...scene,
    ...imported.map((polyline) => ({
      ...polylineWithNewId(polyline, layer),
      groupIds: [groupId],
    })),
  ]
}

function polylineWithNewId(polyline: ImportedPolyline, layer: Layer): Polyline {
  return {
    id: crypto.randomUUID(),
    points: polyline.points,
    closed: polyline.closed,
    stroke: layer.color,
    widthMm: polyline.widthMm,
    layerId: layer.id,
  }
}

export type ImportNotice = {
  key: number
  refusal: ImportRefusal
}

export type ImportRefusal = 'svg' | 'file'

export type DroppedFileKind = 'svg' | 'image' | 'refused'

type NamedFile = {
  type: string
  name: string
}

type DropTarget = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  fit: SheetFit
}

type ImportToast = {
  notice: ImportNotice | undefined
  show: () => void
  hide: () => void
}
