import type { Point, Polyline } from './polyline'

export function polylineAt(
  scene: readonly Polyline[],
  point: Point,
  zoom: number,
): string | undefined {
  for (let index = scene.length - 1; index >= 0; index -= 1) {
    const polyline = scene[index]
    if (polyline && pointHitsPolyline(point, polyline, zoom)) {
      return polyline.id
    }
  }
  return undefined
}

export function touchedPolylineIds(
  scene: readonly Polyline[],
  rectangle: CornerRectangle,
): readonly string[] {
  const bounds = rectangleFromCorners(rectangle)
  return scene
    .filter((polyline) => polylineTouchesRectangle(polyline, bounds))
    .map((polyline) => polyline.id)
}

export function selectionBounds(
  points: readonly Point[],
  zoom: number,
): SelectionBounds | undefined {
  const bounds = tightBounds(points)
  if (!bounds) {
    return undefined
  }

  return outsetBounds(bounds, selectionOutsetAt(zoom))
}

export function translatePolylines(
  scene: readonly Polyline[],
  move: PolylineMove,
): readonly Polyline[] {
  if (move.ids.length === 0) {
    return scene
  }

  const selected = new Set(move.ids)
  let moved = false
  const next = scene.map((polyline) => {
    if (!selected.has(polyline.id)) {
      return polyline
    }
    moved = true
    return movePolyline(polyline, move.delta)
  })
  return moved ? next : scene
}

export function duplicatePolylines(
  scene: readonly Polyline[],
  copy: PolylineCopy,
): readonly Polyline[] {
  if (copy.ids.length === 0) {
    return scene
  }

  const copies = copiedPolylines(scene, copy)
  return [...scene, ...copies]
}

export function nextDuplicateDelta(stored: Point | undefined): Point {
  return stored ?? freshDuplicateDelta
}

const freshDuplicateDelta: Point = { x: 10, y: 10 }

export function duplicateDeltaAfterSelection(
  stored: Point | undefined,
  previousIds: readonly string[],
  nextIds: readonly string[],
): Point | undefined {
  if (sameSelection(previousIds, nextIds)) {
    return stored
  }
  return undefined
}

export function deletePolylines(
  scene: readonly Polyline[],
  ids: readonly string[],
): readonly Polyline[] {
  if (ids.length === 0) {
    return scene
  }

  const selected = new Set(ids)
  const next = scene.filter((polyline) => !selected.has(polyline.id))
  return next.length === scene.length ? scene : next
}

export function groupPolylines(
  scene: readonly Polyline[],
  change: PolylineGroup,
): readonly Polyline[] {
  if (change.ids.length < 2 || alreadyOneGroup(scene, change)) {
    return scene
  }

  const selected = new Set(change.ids)
  let changed = false
  const next = scene.map((polyline) => {
    if (!selected.has(polyline.id)) {
      return polyline
    }
    changed = true
    return withGroupIds(
      polyline,
      insertedGroupId(
        groupIdsOf(polyline),
        change.groupId,
        change.enteredGroupId,
      ),
    )
  })
  return changed ? next : scene
}

export function ungroupPolylines(
  scene: readonly Polyline[],
  change: PolylineUngroup,
): readonly Polyline[] {
  const selected = new Set(change.ids)
  let changed = false
  const next = scene.map((polyline) => {
    if (!selected.has(polyline.id)) {
      return polyline
    }
    const groupIds = groupIdsWithoutOuter(
      groupIdsOf(polyline),
      change.enteredGroupId,
    )
    if (!groupIds) {
      return polyline
    }
    changed = true
    return withGroupIds(polyline, groupIds)
  })
  return changed ? next : scene
}

export function selectionAfterClick(
  scene: readonly Polyline[],
  selectedIds: readonly string[],
  hitId: string,
  enteredGroupId: string | undefined,
  shiftHeld: boolean,
): GroupSelection {
  const polyline = scene.find((item) => item.id === hitId)
  if (!polyline) {
    return { ids: selectedIds, enteredGroupId }
  }
  if (enteredGroupId && !groupIdsOf(polyline).includes(enteredGroupId)) {
    return selectionAfterClick(scene, selectedIds, hitId, undefined, false)
  }

  const ids = unitIds(scene, polyline, enteredGroupId)
  if (!shiftHeld) {
    return { ids, enteredGroupId }
  }
  if (ids.every((id) => selectedIds.includes(id))) {
    return { ids: selectedIds, enteredGroupId }
  }
  return {
    ids: [...selectedIds, ...ids.filter((id) => !selectedIds.includes(id))],
    enteredGroupId,
  }
}

export function selectionAfterMarquee(
  scene: readonly Polyline[],
  touchedIds: readonly string[],
  enteredGroupId: string | undefined,
): readonly string[] {
  const ids: string[] = []
  for (const hitId of touchedIds) {
    const polyline = scene.find((item) => item.id === hitId)
    if (!polyline) {
      continue
    }
    if (enteredGroupId && !groupIdsOf(polyline).includes(enteredGroupId)) {
      continue
    }
    for (const id of unitIds(scene, polyline, enteredGroupId)) {
      if (!ids.includes(id)) {
        ids.push(id)
      }
    }
  }
  return ids
}

export function selectionAfterDoubleClick(
  scene: readonly Polyline[],
  hitId: string,
  enteredGroupId: string | undefined,
): DoubleClickSelection {
  const polyline = scene.find((item) => item.id === hitId)
  if (!polyline) {
    return { ids: [], enteredGroupId, editPoints: false }
  }
  if (enteredGroupId && !groupIdsOf(polyline).includes(enteredGroupId)) {
    return selectionAfterDoubleClick(scene, hitId, undefined)
  }

  const child = childGroupId(polyline, enteredGroupId)
  if (!child) {
    return { ids: [hitId], enteredGroupId, editPoints: true }
  }

  const deeper = childGroupId(polyline, child)
  if (!deeper) {
    return { ids: [hitId], enteredGroupId: child, editPoints: false }
  }
  return {
    ids: membersOf(scene, deeper),
    enteredGroupId: child,
    editPoints: false,
  }
}

export function selectionIsOneGroup(
  scene: readonly Polyline[],
  ids: readonly string[],
): boolean {
  if (ids.length === 0) {
    return false
  }

  const selected = new Set(ids)
  const polylines = scene.filter((polyline) => selected.has(polyline.id))
  if (polylines.length !== ids.length) {
    return false
  }

  const candidates = new Set(
    polylines.flatMap((polyline) => groupIdsOf(polyline)),
  )
  for (const groupId of candidates) {
    const members = membersOf(scene, groupId)
    if (
      members.length === ids.length &&
      members.every((id) => selected.has(id))
    ) {
      return true
    }
  }
  return false
}

export function groupIdsToRenew(
  scene: readonly Polyline[],
  ids: readonly string[],
  enteredGroupId: string | undefined,
): readonly string[] {
  const selected = new Set(ids)
  const renew: string[] = []
  for (const polyline of scene) {
    if (!selected.has(polyline.id)) {
      continue
    }
    for (const groupId of innerGroupIds(polyline, enteredGroupId)) {
      if (!renew.includes(groupId)) {
        renew.push(groupId)
      }
    }
  }
  return renew
}

export function enteredGroupAfterRemoval(
  scene: readonly Polyline[],
  enteredGroupId: string | undefined,
): string | undefined {
  if (!enteredGroupId) {
    return undefined
  }
  if (scene.some((polyline) => groupIdsOf(polyline).includes(enteredGroupId))) {
    return enteredGroupId
  }
  return undefined
}

export function hiddenPolylineIds(
  drag: DragHide | undefined,
): readonly string[] {
  if (!drag || (drag.kind === 'move' && drag.altHeld)) {
    return []
  }
  return drag.ids
}

export function sceneWithoutHiddenPolylines(
  scene: readonly Polyline[],
  ids: readonly string[],
): readonly Polyline[] {
  if (ids.length === 0) {
    return scene
  }

  const hidden = new Set(ids)
  const next = scene.filter((polyline) => !hidden.has(polyline.id))
  return next.length === scene.length ? scene : next
}

export function pointerTarget(
  scene: readonly Polyline[],
  point: Point,
  editingId: string | undefined,
  zoom: number,
): PointerTarget {
  const editing = editingId
    ? scene.find((polyline) => polyline.id === editingId)
    : undefined
  if (editing) {
    const pointIndex = pointIndexAt(editing, point)
    if (pointIndex !== undefined) {
      return { id: editing.id, pointIndex }
    }
  }

  return { id: polylineAt(scene, point, zoom), pointIndex: undefined }
}

export function movePolylinePoint(
  scene: readonly Polyline[],
  move: PointMove,
): readonly Polyline[] {
  const polyline = requirePolyline(scene, move.id)
  const current = requirePoint(polyline, move.index)
  if (samePoint(current, move.point)) {
    return scene
  }

  const points = polyline.points.map((point, index) =>
    index === move.index ? move.point : point,
  )
  return replacePolyline(scene, { ...polyline, points })
}

export function deletePolylinePoint(
  scene: readonly Polyline[],
  target: PointDelete,
): readonly Polyline[] {
  const polyline = requirePolyline(scene, target.id)
  requirePoint(polyline, target.index)
  if (polyline.points.length < 3) {
    return scene.filter((item) => item.id !== target.id)
  }

  const points = polyline.points.filter((_, index) => index !== target.index)
  return replacePolyline(scene, { ...polyline, points })
}

export function insertPolylinePoint(
  scene: readonly Polyline[],
  insert: PointInsert,
): PointInsertion | undefined {
  const polyline = requirePolyline(scene, insert.id)
  if (pointIndexAt(polyline, insert.point) !== undefined) {
    return undefined
  }

  const placement = segmentPlacement(polyline, insert.point)
  if (!placement) {
    return undefined
  }

  const points = [
    ...polyline.points.slice(0, placement.index),
    placement.point,
    ...polyline.points.slice(placement.index),
  ]
  return {
    scene: replacePolyline(scene, { ...polyline, points }),
    index: placement.index,
  }
}

function pointIndexAt(polyline: Polyline, point: Point): number | undefined {
  let closestIndex: number | undefined
  let closestDistance = hitSlopMm
  for (let index = 0; index < polyline.points.length; index += 1) {
    const vertex = polyline.points[index]
    if (!vertex) {
      continue
    }

    const distance = distanceBetween(point, vertex)
    if (distance > closestDistance) {
      continue
    }

    closestDistance = distance
    closestIndex = index
  }
  return closestIndex
}

function requirePolyline(scene: readonly Polyline[], id: string): Polyline {
  const polyline = scene.find((item) => item.id === id)
  if (!polyline) {
    throw new Error(`No polyline ${id}`)
  }
  return polyline
}

function requirePoint(polyline: Polyline, index: number): Point {
  const point = polyline.points[index]
  if (!point) {
    throw new Error(`No point ${index} on ${polyline.id}`)
  }
  return point
}

function replacePolyline(
  scene: readonly Polyline[],
  polyline: Polyline,
): readonly Polyline[] {
  return scene.map((item) => (item.id === polyline.id ? polyline : item))
}

function samePoint(start: Point, end: Point): boolean {
  return start.x === end.x && start.y === end.y
}

function sameSelection(
  previousIds: readonly string[],
  nextIds: readonly string[],
): boolean {
  if (previousIds.length !== nextIds.length) {
    return false
  }

  const next = new Set(nextIds)
  return previousIds.every((id) => next.has(id))
}

function tightBounds(points: readonly Point[]): Rectangle | undefined {
  const first = points[0]
  if (!first) {
    return undefined
  }

  let minX = first.x
  let maxX = first.x
  let minY = first.y
  let maxY = first.y
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, maxX, minY, maxY }
}

function outsetBounds(bounds: Rectangle, outsetMm: number): Rectangle {
  return {
    minX: bounds.minX - outsetMm,
    maxX: bounds.maxX + outsetMm,
    minY: bounds.minY - outsetMm,
    maxY: bounds.maxY + outsetMm,
  }
}

export const selectionOutsetMm = 2

export function selectionOutsetAt(zoom: number): number {
  return distanceAtZoom(selectionOutsetMm, zoom)
}

function pointHitsPolyline(
  point: Point,
  polyline: Polyline,
  zoom: number,
): boolean {
  const slop = hitSlopAt(zoom)
  return segmentsOf(polyline).some(
    (segment) => distanceToSegment(point, segment) <= slop,
  )
}

function polylineTouchesRectangle(
  polyline: Polyline,
  bounds: Rectangle,
): boolean {
  return segmentsOf(polyline).some((segment) =>
    segmentTouchesRectangle(segment, bounds),
  )
}

function segmentsOf(polyline: Polyline): readonly Segment[] {
  const segments: Segment[] = []
  for (let index = 1; index < polyline.points.length; index += 1) {
    const start = polyline.points[index - 1]
    const end = polyline.points[index]
    if (start && end) {
      segments.push({ start, end })
    }
  }

  const first = polyline.points[0]
  const last = polyline.points[polyline.points.length - 1]
  if (polyline.closed && first && last) {
    segments.push({ start: last, end: first })
  }
  return segments
}

function segmentPlacement(
  polyline: Polyline,
  point: Point,
): SegmentPlacement | undefined {
  let closestIndex = -1
  let closestPoint: Point | undefined
  let closestDistance = hitSlopMm
  const segments = segmentsOf(polyline)
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    if (!segment) {
      continue
    }

    const nearest = nearestPointOnSegment(point, segment)
    if (isSegmentEndpoint(nearest, segment)) {
      continue
    }

    const distance = distanceBetween(point, nearest)
    if (distance > closestDistance) {
      continue
    }

    closestDistance = distance
    closestIndex = index
    closestPoint = nearest
  }

  if (!closestPoint || closestIndex < 0) {
    return undefined
  }

  return {
    index: insertIndex(polyline, closestIndex),
    point: closestPoint,
  }
}

function insertIndex(polyline: Polyline, segmentIndex: number): number {
  if (segmentIndex < polyline.points.length - 1) {
    return segmentIndex + 1
  }
  return polyline.points.length
}

function isSegmentEndpoint(point: Point, segment: Segment): boolean {
  return samePoint(point, segment.start) || samePoint(point, segment.end)
}

function distanceToSegment(point: Point, segment: Segment): number {
  return distanceBetween(point, nearestPointOnSegment(point, segment))
}

function nearestPointOnSegment(point: Point, segment: Segment): Point {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return segment.start
  }

  const t = clamp01(
    ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) /
      lengthSquared,
  )
  return {
    x: segment.start.x + t * dx,
    y: segment.start.y + t * dy,
  }
}

function distanceBetween(start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return Math.hypot(dx, dy)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function segmentTouchesRectangle(segment: Segment, bounds: Rectangle): boolean {
  if (
    pointInsideRectangle(segment.start, bounds) ||
    pointInsideRectangle(segment.end, bounds)
  ) {
    return true
  }

  return rectangleEdges(bounds).some((edge) => segmentsIntersect(segment, edge))
}

function pointInsideRectangle(point: Point, bounds: Rectangle): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  )
}

function rectangleFromCorners(rectangle: CornerRectangle): Rectangle {
  return {
    minX: Math.min(rectangle.start.x, rectangle.end.x),
    maxX: Math.max(rectangle.start.x, rectangle.end.x),
    minY: Math.min(rectangle.start.y, rectangle.end.y),
    maxY: Math.max(rectangle.start.y, rectangle.end.y),
  }
}

function rectangleEdges(bounds: Rectangle): readonly Segment[] {
  const topLeft = { x: bounds.minX, y: bounds.maxY }
  const topRight = { x: bounds.maxX, y: bounds.maxY }
  const bottomRight = { x: bounds.maxX, y: bounds.minY }
  const bottomLeft = { x: bounds.minX, y: bounds.minY }
  return [
    { start: topLeft, end: topRight },
    { start: topRight, end: bottomRight },
    { start: bottomRight, end: bottomLeft },
    { start: bottomLeft, end: topLeft },
  ]
}

function segmentsIntersect(first: Segment, second: Segment): boolean {
  const startOrientation = orientation(first.start, first.end, second.start)
  const endOrientation = orientation(first.start, first.end, second.end)
  const otherStart = orientation(second.start, second.end, first.start)
  const otherEnd = orientation(second.start, second.end, first.end)

  if (startOrientation !== endOrientation && otherStart !== otherEnd) {
    return true
  }
  if (startOrientation === 0 && pointOnSegment(second.start, first)) {
    return true
  }
  if (endOrientation === 0 && pointOnSegment(second.end, first)) {
    return true
  }
  if (otherStart === 0 && pointOnSegment(first.start, second)) {
    return true
  }
  return otherEnd === 0 && pointOnSegment(first.end, second)
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

function pointOnSegment(point: Point, segment: Segment): boolean {
  return (
    point.x <= Math.max(segment.start.x, segment.end.x) &&
    point.x >= Math.min(segment.start.x, segment.end.x) &&
    point.y <= Math.max(segment.start.y, segment.end.y) &&
    point.y >= Math.min(segment.start.y, segment.end.y)
  )
}

function copiedPolylines(
  scene: readonly Polyline[],
  copy: PolylineCopy,
): Polyline[] {
  if (copy.newIds.length !== copy.ids.length) {
    throw new Error('Each copy needs its own id')
  }

  const taken = new Set(scene.map((polyline) => polyline.id))
  const replacements = groupReplacements(scene, copy)
  return copy.ids.map((id, index) => {
    const newId = copy.newIds[index]
    if (!newId || taken.has(newId)) {
      throw new Error('Each copy needs its own id')
    }

    taken.add(newId)
    return copyPolyline(
      requirePolyline(scene, id),
      newId,
      copy.delta,
      replacements,
      copy.enteredGroupId,
    )
  })
}

function copyPolyline(
  polyline: Polyline,
  id: string,
  delta: Point,
  replacements: ReadonlyMap<string, string>,
  enteredGroupId: string | undefined,
): Polyline {
  return withGroupIds(
    { ...movePolyline(polyline, delta), id },
    replacedGroupIds(polyline, replacements, enteredGroupId),
  )
}

function groupReplacements(
  scene: readonly Polyline[],
  copy: PolylineCopy,
): ReadonlyMap<string, string> {
  const oldIds = groupIdsToRenew(scene, copy.ids, copy.enteredGroupId)
  const newGroupIds = copy.newGroupIds ?? []
  if (oldIds.length !== newGroupIds.length) {
    throw new Error('Each group copy needs its own id')
  }

  const pairs: [string, string][] = []
  for (let index = 0; index < oldIds.length; index += 1) {
    const oldId = oldIds[index]
    const newId = newGroupIds[index]
    if (!oldId || !newId) {
      throw new Error('Each group copy needs its own id')
    }
    pairs.push([oldId, newId])
  }
  return new Map(pairs)
}

function movePolyline(polyline: Polyline, delta: Point): Polyline {
  return {
    ...polyline,
    points: polyline.points.map((point) => ({
      x: point.x + delta.x,
      y: point.y + delta.y,
    })),
  }
}

function alreadyOneGroup(
  scene: readonly Polyline[],
  change: PolylineGroup,
): boolean {
  if (change.ids.length < 2) {
    return false
  }

  const selected = scene.filter((polyline) => change.ids.includes(polyline.id))
  const first = selected[0]
  if (!first || selected.length !== change.ids.length) {
    return false
  }

  const child = childGroupId(first, change.enteredGroupId)
  if (!child) {
    return false
  }
  if (
    !selected.every(
      (polyline) => childGroupId(polyline, change.enteredGroupId) === child,
    )
  ) {
    return false
  }

  const members = membersOf(scene, child)
  return (
    members.length === change.ids.length &&
    members.every((id) => change.ids.includes(id))
  )
}

function insertedGroupId(
  groupIds: readonly string[],
  groupId: string,
  enteredGroupId: string | undefined,
): readonly string[] {
  if (!enteredGroupId) {
    return [...groupIds, groupId]
  }

  const index = groupIds.lastIndexOf(enteredGroupId)
  if (index === -1) {
    return [...groupIds, groupId]
  }
  return [...groupIds.slice(0, index), groupId, ...groupIds.slice(index)]
}

function groupIdsWithoutOuter(
  groupIds: readonly string[],
  enteredGroupId: string | undefined,
): readonly string[] | undefined {
  if (!enteredGroupId) {
    return groupIds.length > 0 ? groupIds.slice(0, -1) : undefined
  }

  const index = groupIds.lastIndexOf(enteredGroupId)
  if (index <= 0) {
    return undefined
  }
  return groupIds.filter((_, position) => position !== index - 1)
}

function unitIds(
  scene: readonly Polyline[],
  polyline: Polyline,
  enteredGroupId: string | undefined,
): readonly string[] {
  const child = childGroupId(polyline, enteredGroupId)
  if (!child) {
    return [polyline.id]
  }
  return membersOf(scene, child)
}

function childGroupId(
  polyline: Polyline,
  enteredGroupId: string | undefined,
): string | undefined {
  const groupIds = groupIdsOf(polyline)
  if (!enteredGroupId) {
    return groupIds[groupIds.length - 1]
  }

  const index = groupIds.lastIndexOf(enteredGroupId)
  if (index <= 0) {
    return undefined
  }
  return groupIds[index - 1]
}

function membersOf(
  scene: readonly Polyline[],
  groupId: string,
): readonly string[] {
  return scene
    .filter((polyline) => groupIdsOf(polyline).includes(groupId))
    .map((polyline) => polyline.id)
}

function innerGroupIds(
  polyline: Polyline,
  enteredGroupId: string | undefined,
): readonly string[] {
  const groupIds = groupIdsOf(polyline)
  if (!enteredGroupId) {
    return groupIds
  }

  const index = groupIds.lastIndexOf(enteredGroupId)
  if (index === -1) {
    return groupIds
  }
  return groupIds.slice(0, index)
}

function replacedGroupIds(
  polyline: Polyline,
  replacements: ReadonlyMap<string, string>,
  enteredGroupId: string | undefined,
): readonly string[] {
  const groupIds = groupIdsOf(polyline)
  const keptFrom = enteredGroupId ? groupIds.lastIndexOf(enteredGroupId) : -1
  return groupIds.map((groupId, index) => {
    if (keptFrom !== -1 && index >= keptFrom) {
      return groupId
    }
    return requiredReplacement(replacements, groupId)
  })
}

function requiredReplacement(
  replacements: ReadonlyMap<string, string>,
  groupId: string,
): string {
  const next = replacements.get(groupId)
  if (!next) {
    throw new Error('Each group copy needs its own id')
  }
  return next
}

function withGroupIds(
  polyline: Polyline,
  groupIds: readonly string[],
): Polyline {
  if (groupIds.length === 0) {
    if (!polyline.groupIds) {
      return polyline
    }
    return {
      id: polyline.id,
      points: polyline.points,
      closed: polyline.closed,
      stroke: polyline.stroke,
      widthMm: polyline.widthMm,
    }
  }
  if (sameGroupIds(polyline.groupIds, groupIds)) {
    return polyline
  }
  return { ...polyline, groupIds }
}

function sameGroupIds(
  left: readonly string[] | undefined,
  right: readonly string[],
): boolean {
  if (!left || left.length !== right.length) {
    return false
  }
  return left.every((groupId, index) => groupId === right[index])
}

function groupIdsOf(polyline: Polyline): readonly string[] {
  return polyline.groupIds ?? []
}

const hitSlopMm = 3

function hitSlopAt(zoom: number): number {
  return distanceAtZoom(hitSlopMm, zoom)
}

function distanceAtZoom(millimeters: number, zoom: number): number {
  if (!(zoom > 0)) {
    return millimeters
  }
  return millimeters / zoom
}

export type CornerRectangle = {
  start: Point
  end: Point
}

export type PolylineMove = {
  ids: readonly string[]
  delta: Point
}

export type PolylineCopy = {
  ids: readonly string[]
  newIds: readonly string[]
  delta: Point
  enteredGroupId?: string
  newGroupIds?: readonly string[]
}

export type PolylineGroup = {
  ids: readonly string[]
  groupId: string
  enteredGroupId: string | undefined
}

export type PolylineUngroup = {
  ids: readonly string[]
  enteredGroupId: string | undefined
}

export type GroupSelection = {
  ids: readonly string[]
  enteredGroupId: string | undefined
}

export type DoubleClickSelection = GroupSelection & {
  editPoints: boolean
}

export type PointerTarget = {
  id: string | undefined
  pointIndex: number | undefined
}

export type PointMove = {
  id: string
  index: number
  point: Point
}

export type PointDelete = {
  id: string
  index: number
}

export type PointInsert = {
  id: string
  point: Point
}

export type PointInsertion = {
  scene: readonly Polyline[]
  index: number
}

export type SelectionBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type DragHide = {
  kind: 'move' | 'point' | 'scale'
  ids: readonly string[]
  altHeld: boolean
}

type Rectangle = SelectionBounds

type Segment = {
  start: Point
  end: Point
}

type SegmentPlacement = {
  index: number
  point: Point
}
