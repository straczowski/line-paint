import { useEffect, useRef, useState } from 'react'
import { polylinesFromSvg } from '../scene/import'
import type { ImportedPolyline } from '../scene/import'
import type { Polyline } from '../scene/polyline'

const importToastMs = 4000

export function useSvgDrop(
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

export function useImportToast(): ImportToast {
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
): readonly Polyline[] {
  return [...scene, ...imported.map(polylineWithNewId)]
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

export type ImportNotice = {
  key: number
}

type ImportToast = {
  notice: ImportNotice | undefined
  show: () => void
  hide: () => void
}
