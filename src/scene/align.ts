import type { Point, Polyline } from './polyline'

export function alignPolylines(
  scene: readonly Polyline[],
  change: PolylineAlign,
): readonly Polyline[] {
  const objects = objectsInSelection(scene, change.ids, change.enteredGroupId)
  if (!actionApplies(objects.length, change.action)) {
    return scene
  }

  const boxes = boxedObjects(objects)
  if (!boxes) {
    return scene
  }

  return translateScene(scene, deltasFor(boxes, change.action))
}

export function alignObjectCount(
  scene: readonly Polyline[],
  ids: readonly string[],
  enteredGroupId: string | undefined,
): number {
  return objectsInSelection(scene, ids, enteredGroupId).length
}

function actionApplies(count: number, action: AlignAction): boolean {
  if (count < 2) {
    return false
  }
  if (action === 'distributeX' || action === 'distributeY') {
    return count >= 3
  }
  return true
}

function objectsInSelection(
  scene: readonly Polyline[],
  ids: readonly string[],
  enteredGroupId: string | undefined,
): readonly (readonly Polyline[])[] {
  const selected = new Set(ids)
  const groups = new Map<string, Polyline[]>()
  for (const polyline of scene) {
    if (!selected.has(polyline.id)) {
      continue
    }
    const key = objectKey(polyline, enteredGroupId)
    const group = groups.get(key)
    if (group) {
      group.push(polyline)
      continue
    }
    groups.set(key, [polyline])
  }
  return [...groups.values()]
}

function objectKey(
  polyline: Polyline,
  enteredGroupId: string | undefined,
): string {
  const child = childGroupAt(polyline.groupIds ?? [], enteredGroupId)
  return child !== undefined ? `group:${child}` : `line:${polyline.id}`
}

function childGroupAt(
  groupIds: readonly string[],
  enteredGroupId: string | undefined,
): string | undefined {
  if (!enteredGroupId) {
    return groupIds.at(-1)
  }

  const index = groupIds.lastIndexOf(enteredGroupId)
  if (index <= 0) {
    return undefined
  }
  return groupIds[index - 1]
}

function boxedObjects(
  objects: readonly (readonly Polyline[])[],
): readonly ObjectBox[] | undefined {
  const boxes: ObjectBox[] = []
  for (const polylines of objects) {
    const box = boundsOf(polylines)
    if (!box) {
      return undefined
    }
    boxes.push({
      ids: polylines.map((polyline) => polyline.id),
      box,
    })
  }
  return boxes
}

function boundsOf(polylines: readonly Polyline[]): Bounds | undefined {
  let bounds: Bounds | undefined
  for (const polyline of polylines) {
    for (const point of polyline.points) {
      bounds = bounds
        ? {
            minX: Math.min(bounds.minX, point.x),
            maxX: Math.max(bounds.maxX, point.x),
            minY: Math.min(bounds.minY, point.y),
            maxY: Math.max(bounds.maxY, point.y),
          }
        : {
            minX: point.x,
            maxX: point.x,
            minY: point.y,
            maxY: point.y,
          }
    }
  }
  return bounds
}

function deltasFor(
  boxes: readonly ObjectBox[],
  action: AlignAction,
): readonly ObjectDelta[] {
  if (action === 'distributeX' || action === 'distributeY') {
    return distributeDeltas(boxes, action === 'distributeX' ? 'x' : 'y')
  }
  return edgeDeltas(boxes, action)
}

function edgeDeltas(
  boxes: readonly ObjectBox[],
  action: AlignEdge,
): readonly ObjectDelta[] {
  const selection = unionBox(boxes)
  return boxes.map((item) => ({
    ids: item.ids,
    delta: edgeDelta(item.box, selection, action),
  }))
}

function edgeDelta(box: Bounds, selection: Bounds, action: AlignEdge): Point {
  switch (action) {
    case 'left':
      return { x: selection.minX - box.minX, y: 0 }
    case 'centerX':
      return { x: midpoint(selection, 'x') - midpoint(box, 'x'), y: 0 }
    case 'right':
      return { x: selection.maxX - box.maxX, y: 0 }
    case 'top':
      return { x: 0, y: selection.maxY - box.maxY }
    case 'centerY':
      return { x: 0, y: midpoint(selection, 'y') - midpoint(box, 'y') }
    case 'bottom':
      return { x: 0, y: selection.minY - box.minY }
  }
}

function distributeDeltas(
  boxes: readonly ObjectBox[],
  axis: Axis,
): readonly ObjectDelta[] {
  const selection = unionBox(boxes)
  const ordered = [...boxes].sort(
    (left, right) => midpoint(left.box, axis) - midpoint(right.box, axis),
  )
  const span = extent(selection, axis)
  const sum = ordered.reduce((total, item) => total + extent(item.box, axis), 0)
  const gap = (span - sum) / (ordered.length - 1)
  if (gap >= 0) {
    return packBoxes(ordered, selection, axis, gap)
  }
  return spaceCenters(ordered, selection, axis)
}

function packBoxes(
  ordered: readonly ObjectBox[],
  selection: Bounds,
  axis: Axis,
  gap: number,
): readonly ObjectDelta[] {
  let cursor = edge(selection, axis, 'start')
  return ordered.map((item) => {
    const delta = cursor - edge(item.box, axis, 'start')
    cursor += extent(item.box, axis) + gap
    return { ids: item.ids, delta: axisDelta(axis, delta) }
  })
}

function spaceCenters(
  ordered: readonly ObjectBox[],
  selection: Bounds,
  axis: Axis,
): readonly ObjectDelta[] {
  const start = edge(selection, axis, 'start')
  const end = edge(selection, axis, 'end')
  const leading = ordered.find(
    (item) => edge(item.box, axis, 'start') === start,
  )
  const trailing = ordered.find((item) => edge(item.box, axis, 'end') === end)
  if (!leading || !trailing) {
    return ordered.map((item) => ({ ids: item.ids, delta: { x: 0, y: 0 } }))
  }

  const origin = midpoint(leading.box, axis)
  if (leading === trailing) {
    return ordered.map((item) => ({
      ids: item.ids,
      delta:
        item === leading
          ? { x: 0, y: 0 }
          : axisDelta(axis, origin - midpoint(item.box, axis)),
    }))
  }

  const others = ordered.filter((item) => item !== leading && item !== trailing)
  const step = (midpoint(trailing.box, axis) - origin) / (others.length + 1)
  let placed = 0
  return ordered.map((item) => {
    if (item === leading || item === trailing) {
      return { ids: item.ids, delta: { x: 0, y: 0 } }
    }
    placed += 1
    return {
      ids: item.ids,
      delta: axisDelta(axis, origin + step * placed - midpoint(item.box, axis)),
    }
  })
}

function unionBox(boxes: readonly ObjectBox[]): Bounds {
  const first = boxes[0]
  if (!first) {
    throw new Error('Align needs an object')
  }

  return boxes.reduce(
    (total, item) => ({
      minX: Math.min(total.minX, item.box.minX),
      maxX: Math.max(total.maxX, item.box.maxX),
      minY: Math.min(total.minY, item.box.minY),
      maxY: Math.max(total.maxY, item.box.maxY),
    }),
    first.box,
  )
}

function translateScene(
  scene: readonly Polyline[],
  deltas: readonly ObjectDelta[],
): readonly Polyline[] {
  const byId = new Map<string, Point>()
  for (const item of deltas) {
    for (const id of item.ids) {
      byId.set(id, item.delta)
    }
  }

  let changed = false
  const next = scene.map((polyline) => {
    const delta = byId.get(polyline.id)
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      return polyline
    }
    changed = true
    return {
      ...polyline,
      points: polyline.points.map((point) => ({
        x: point.x + delta.x,
        y: point.y + delta.y,
      })),
    }
  })
  return changed ? next : scene
}

function midpoint(box: Bounds, axis: Axis): number {
  return axis === 'x' ? (box.minX + box.maxX) / 2 : (box.minY + box.maxY) / 2
}

function extent(box: Bounds, axis: Axis): number {
  return axis === 'x' ? box.maxX - box.minX : box.maxY - box.minY
}

function edge(box: Bounds, axis: Axis, side: 'start' | 'end'): number {
  if (axis === 'x') {
    return side === 'start' ? box.minX : box.maxX
  }
  return side === 'start' ? box.minY : box.maxY
}

function axisDelta(axis: Axis, delta: number): Point {
  return axis === 'x' ? { x: delta, y: 0 } : { x: 0, y: delta }
}

type Axis = 'x' | 'y'

type Bounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type ObjectBox = {
  ids: readonly string[]
  box: Bounds
}

type ObjectDelta = {
  ids: readonly string[]
  delta: Point
}

type AlignEdge = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'

export type AlignAction = AlignEdge | 'distributeX' | 'distributeY'

export type PolylineAlign = {
  ids: readonly string[]
  enteredGroupId: string | undefined
  action: AlignAction
}
