import type { SelectionBounds } from '../scene/selection'
import { sceneYToTop } from '../scene/sheet'
import type { WindowSize } from '../scene/sheet'

export function selectionPicturePadPx(widthMm: number, scale: number): number {
  if (!(scale > 0)) {
    return 1
  }

  return Math.max(minimumStrokePx, widthMm * scale) / 2 + 1
}

export function selectionPictureFits(
  tight: SelectionBounds,
  scale: number,
  size: WindowSize,
  padPx: number,
): boolean {
  const box = selectionPictureBox(tight, scale, 0, 0, padPx)
  if (!box || size.width <= 0 || size.height <= 0) {
    return false
  }

  return box.width <= size.width && box.height <= size.height
}

export function selectionPictureBox(
  tight: SelectionBounds,
  scale: number,
  left: number,
  top: number,
  padPx: number,
): PictureBox | undefined {
  if (!(scale > 0) || !(padPx >= 0)) {
    return undefined
  }

  const originX = left + tight.minX * scale - padPx
  const originY = top + sceneYToTop(tight.maxY) * scale - padPx
  const width = Math.ceil((tight.maxX - tight.minX) * scale + padPx * 2)
  const height = Math.ceil((tight.maxY - tight.minY) * scale + padPx * 2)
  if (width < 1 || height < 1) {
    return undefined
  }

  return { originX, originY, width, height }
}

const minimumStrokePx = 1

type PictureBox = {
  originX: number
  originY: number
  width: number
  height: number
}

export type { PictureBox }
