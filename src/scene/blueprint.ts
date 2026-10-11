import type { Point, Polyline } from './polyline'
import {
  rotationAngle,
  rotateHandleOffsetPx,
  rotateHandleRadiusPx,
} from './rotate'
import { factorsFor, scaleFrame, scaleHandleAt, scaledPoint } from './scale'
import type { PolylineScale, ScaleHandle } from './scale'
import { polylineAt } from './selection'
import type { SelectionBounds } from './selection'
import { sheetHeightMm } from './sheet'

export function placeBlueprint(
  input: BlueprintPlacement,
): Blueprint | undefined {
  if (input.pixelWidth <= 0 || input.pixelHeight <= 0) {
    return undefined
  }

  const wide = input.pixelWidth >= input.pixelHeight
  const widthMm = wide
    ? sheetHeightMm
    : sheetHeightMm * (input.pixelWidth / input.pixelHeight)
  const heightMm = wide
    ? sheetHeightMm * (input.pixelHeight / input.pixelWidth)
    : sheetHeightMm
  return {
    id: input.id,
    href: input.href,
    x: input.center.x - widthMm / 2,
    y: input.center.y - heightMm / 2,
    widthMm,
    heightMm,
    rotation: 0,
    locked: false,
  }
}

export function translateBlueprints(
  images: readonly Blueprint[],
  move: BlueprintMove,
): readonly Blueprint[] {
  if (move.ids.length === 0 || (move.delta.x === 0 && move.delta.y === 0)) {
    return images
  }

  const selected = new Set(move.ids)
  let moved = false
  const next = images.map((image) => {
    if (!selected.has(image.id) || image.locked) {
      return image
    }
    moved = true
    return {
      ...image,
      x: image.x + move.delta.x,
      y: image.y + move.delta.y,
    }
  })
  return moved ? next : images
}

export function scaleBlueprintFrame(
  image: Blueprint,
  change: PolylineScale,
): Blueprint {
  if (image.locked) {
    return image
  }

  const next = scaleFrame(frameBounds(image), {
    ...change,
    pointer: rotateAround(
      change.pointer,
      blueprintCenter(image),
      -image.rotation,
    ),
    outsetMm: 0,
  })
  if (!next) {
    return image
  }

  return {
    ...image,
    x: next.minX,
    y: next.minY,
    widthMm: next.maxX - next.minX,
    heightMm: next.maxY - next.minY,
  }
}

export function scaleBlueprints(
  images: readonly Blueprint[],
  change: PolylineScale,
): readonly Blueprint[] {
  const points = change.framePoints
  if (!points || change.ids.length === 0) {
    return images
  }

  const factors = factorsFor(points, change)
  if (!factors) {
    return images
  }

  const selected = new Set(change.ids)
  let changed = false
  const next = images.map((image) => {
    if (!selected.has(image.id) || image.locked) {
      return image
    }
    changed = true
    const widthMm = image.widthMm * factors.x
    const heightMm = image.heightMm * factors.y
    const center = scaledPoint(blueprintCenter(image), factors)
    return {
      ...image,
      widthMm,
      heightMm,
      x: center.x - widthMm / 2,
      y: center.y - heightMm / 2,
    }
  })
  return changed ? next : images
}

export function rotateBlueprints(
  images: readonly Blueprint[],
  change: BlueprintRotation,
): readonly Blueprint[] {
  const angle = rotationAngle(change.angle, change.shiftHeld)
  if (angle === 0 || change.ids.length === 0) {
    return images
  }

  const selected = new Set(change.ids)
  let changed = false
  const next = images.map((image) => {
    if (!selected.has(image.id) || image.locked) {
      return image
    }
    changed = true
    const center = rotateAround(blueprintCenter(image), change.center, angle)
    return {
      ...image,
      rotation: image.rotation + angle,
      x: center.x - image.widthMm / 2,
      y: center.y - image.heightMm / 2,
    }
  })
  return changed ? next : images
}

export function lockBlueprints(
  images: readonly Blueprint[],
  ids: readonly string[],
): readonly Blueprint[] {
  const selected = images.filter((image) => ids.includes(image.id))
  if (selected.length === 0) {
    return images
  }

  const locked = selected.some((image) => !image.locked)
  let changed = false
  const next = images.map((image) => {
    if (!ids.includes(image.id) || image.locked === locked) {
      return image
    }
    changed = true
    return { ...image, locked }
  })
  return changed ? next : images
}

export function deleteBlueprints(
  images: readonly Blueprint[],
  ids: readonly string[],
): readonly Blueprint[] {
  if (ids.length === 0) {
    return images
  }

  const selected = new Set(ids)
  const next = images.filter((image) => !selected.has(image.id))
  return next.length === images.length ? images : next
}

export function blueprintAt(
  images: readonly Blueprint[],
  point: Point,
): string | undefined {
  for (let index = images.length - 1; index >= 0; index -= 1) {
    const image = images[index]
    if (image && pointHitsBlueprint(point, image)) {
      return image.id
    }
  }
  return undefined
}

export function blueprintsTouching(
  images: readonly Blueprint[],
  rectangle: CornerRectangle,
): readonly string[] {
  const bounds = boundsOf(rectangle)
  return images
    .filter((image) => frameTouches(image, bounds))
    .map((image) => image.id)
}

export function targetUnderPointer(
  scene: readonly Polyline[],
  images: readonly Blueprint[],
  point: Point,
  zoom: number,
): string | undefined {
  return polylineAt(scene, point, zoom) ?? blueprintAt(images, point)
}

export function blueprintCenter(image: Blueprint): Point {
  return {
    x: image.x + image.widthMm / 2,
    y: image.y + image.heightMm / 2,
  }
}

export function blueprintCorners(image: Blueprint): readonly Point[] {
  const center = blueprintCenter(image)
  return frameCorners(image).map((corner) =>
    rotateAround(corner, center, image.rotation),
  )
}

export function blueprintPoints(
  images: readonly Blueprint[],
  ids: readonly string[],
): readonly Point[] {
  return images.flatMap((image) =>
    ids.includes(image.id) ? blueprintCorners(image) : [],
  )
}

export function loneBlueprint(
  images: readonly Blueprint[],
  ids: readonly string[],
): Blueprint | undefined {
  if (ids.length !== 1) {
    return undefined
  }

  const id = ids[0]
  return images.find((image) => image.id === id)
}

export function blueprintScaleHandleAt(
  image: Blueprint,
  point: Point,
  halfMm: number,
): ScaleHandle | undefined {
  const local = rotateAround(point, blueprintCenter(image), -image.rotation)
  return scaleHandleAt(frameBounds(image), local, halfMm)
}

export function blueprintRotateHandle(
  image: Blueprint,
  pixelsPerMm: number,
): Point {
  const offset = pixelsPerMm > 0 ? rotateHandleOffsetPx / pixelsPerMm : 0
  const handle = {
    x: image.x + image.widthMm / 2,
    y: image.y + image.heightMm + offset,
  }
  return rotateAround(handle, blueprintCenter(image), image.rotation)
}

export function blueprintRotateHandleAt(
  image: Blueprint,
  point: Point,
  pixelsPerMm: number,
): boolean {
  if (!(pixelsPerMm > 0)) {
    return false
  }

  const handle = blueprintRotateHandle(image, pixelsPerMm)
  const radius = rotateHandleRadiusPx / pixelsPerMm
  const dx = point.x - handle.x
  const dy = point.y - handle.y
  return dx * dx + dy * dy <= radius * radius
}

export function imagesWithoutIds(
  images: readonly Blueprint[],
  ids: readonly string[],
): readonly Blueprint[] {
  if (ids.length === 0) {
    return images
  }

  const hidden = new Set(ids)
  const next = images.filter((image) => !hidden.has(image.id))
  return next.length === images.length ? images : next
}

export function selectionIsFrozen(
  scene: readonly Polyline[],
  images: readonly Blueprint[],
  ids: readonly string[],
): boolean {
  if (ids.length === 0 || scene.some((polyline) => ids.includes(polyline.id))) {
    return false
  }

  const selected = images.filter((image) => ids.includes(image.id))
  return selected.length > 0 && selected.every((image) => image.locked)
}

function frameTouches(image: Blueprint, bounds: SelectionBounds): boolean {
  const corners = blueprintCorners(image)
  if (corners.some((corner) => pointInBounds(corner, bounds))) {
    return true
  }

  const box = boundsCorners(bounds)
  if (box.some((corner) => pointHitsBlueprint(corner, image))) {
    return true
  }

  const edges = boxEdges(box)
  for (let index = 0; index < corners.length; index += 1) {
    const start = corners[index]
    const end = corners[(index + 1) % corners.length]
    if (!start || !end) {
      continue
    }
    if (edges.some((edge) => segmentsCross(start, end, edge.start, edge.end))) {
      return true
    }
  }
  return false
}

function pointHitsBlueprint(point: Point, image: Blueprint): boolean {
  const local = rotateAround(point, blueprintCenter(image), -image.rotation)
  return (
    local.x >= image.x &&
    local.x <= image.x + image.widthMm &&
    local.y >= image.y &&
    local.y <= image.y + image.heightMm
  )
}

function frameBounds(image: Blueprint): SelectionBounds {
  return {
    minX: image.x,
    maxX: image.x + image.widthMm,
    minY: image.y,
    maxY: image.y + image.heightMm,
  }
}

function frameCorners(image: Blueprint): readonly Point[] {
  return [
    { x: image.x, y: image.y + image.heightMm },
    { x: image.x + image.widthMm, y: image.y + image.heightMm },
    { x: image.x + image.widthMm, y: image.y },
    { x: image.x, y: image.y },
  ]
}

function boundsOf(rectangle: CornerRectangle): SelectionBounds {
  return {
    minX: Math.min(rectangle.start.x, rectangle.end.x),
    maxX: Math.max(rectangle.start.x, rectangle.end.x),
    minY: Math.min(rectangle.start.y, rectangle.end.y),
    maxY: Math.max(rectangle.start.y, rectangle.end.y),
  }
}

function pointInBounds(point: Point, bounds: SelectionBounds): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  )
}

function boundsCorners(bounds: SelectionBounds): readonly Point[] {
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]
}

function boxEdges(corners: readonly Point[]): readonly Segment[] {
  return corners.flatMap((start, index) => {
    const end = corners[(index + 1) % corners.length]
    return end ? [{ start, end }] : []
  })
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const first = orientation(a, b, c)
  const second = orientation(a, b, d)
  const third = orientation(c, d, a)
  const fourth = orientation(c, d, b)
  if (first === 0 && second === 0 && third === 0 && fourth === 0) {
    return false
  }
  return first !== second && third !== fourth
}

function orientation(start: Point, end: Point, point: Point): number {
  const value =
    (end.y - start.y) * (point.x - end.x) -
    (end.x - start.x) * (point.y - end.y)
  if (value === 0) {
    return 0
  }
  return value > 0 ? 1 : -1
}

function rotateAround(point: Point, center: Point, angle: number): Point {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

export type Blueprint = {
  id: string
  href: string
  x: number
  y: number
  widthMm: number
  heightMm: number
  rotation: number
  locked: boolean
}

export type BlueprintPlacement = {
  id: string
  href: string
  pixelWidth: number
  pixelHeight: number
  center: Point
}

export type BlueprintMove = {
  ids: readonly string[]
  delta: Point
}

export type BlueprintRotation = {
  ids: readonly string[]
  center: Point
  angle: number
  shiftHeld: boolean
}

type CornerRectangle = {
  start: Point
  end: Point
}

type Segment = {
  start: Point
  end: Point
}
