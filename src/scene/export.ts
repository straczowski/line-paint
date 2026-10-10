import type { Point, Polyline } from './polyline'
import { sceneYToTop, sheetHeightMm, sheetWidthMm } from './sheet'
import type { Scene } from './sheet'

export function svgDocument(scene: Scene): string {
  const paths = polylinesForExport(scene).map(svgPath)
  return assembleSvg(paths)
}

export function gcodeDocument(scene: Scene): string {
  const moves = polylinesForGcode(scene).flatMap(gcodeMoves)
  return [...gcodePreamble(), ...moves, returnToOrigin].join('\n')
}

function polylinesForGcode(scene: Scene): readonly ExportPolyline[] {
  return orderForTravel(scene.filter(isOnSheet)).map(withClosingPoint)
}

export function polylinesForExport(scene: Scene): readonly ExportPolyline[] {
  return scene.filter(isOnSheet).map(withClosingPoint)
}

function svgPath(polyline: ExportPolyline): string {
  const data = pathData(polyline.points)
  return `<path d="${data}" stroke="${polyline.stroke}" stroke-width="${polyline.widthMm}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
}

function pathData(points: readonly Point[]): string {
  return points.map((point, index) => pathCommand(point, index === 0)).join(' ')
}

function pathCommand(point: Point, first: boolean): string {
  const command = first ? 'M' : 'L'
  const x = formatMillimeter(point.x)
  const y = formatMillimeter(sceneYToTop(point.y))
  return `${command} ${x},${y}`
}

const svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetWidthMm} ${sheetHeightMm}" width="${sheetWidthMm}" height="${sheetHeightMm}" style="background: white">`

function assembleSvg(paths: readonly string[]): string {
  if (paths.length === 0) {
    return `${svgOpen}</svg>`
  }

  return `${svgOpen}\n  ${paths.join('\n  ')}\n</svg>`
}

const penUp = 'M5'
const penDown = 'M3 S1000'
const pause = 'G4 P0.5'
const feed = 'G1 F3000'
const returnToOrigin = 'G0 X0 Y0'

function gcodePreamble(): readonly string[] {
  return [penUp, pause, penDown, pause, penUp, pause, feed]
}

const travelOrigin: Point = { x: 0, y: 0 }

function orderForTravel(polylines: readonly Polyline[]): readonly Polyline[] {
  const pending = [...polylines]
  const ordered: Polyline[] = []
  let pen = travelOrigin

  while (pending.length > 0) {
    const choice = nearestToPen(pending, pen)
    const taken = pending.splice(choice.index, 1)[0]
    const oriented = choice.reversed ? reversePolyline(taken) : taken
    ordered.push(oriented)
    const written = writtenPoints(oriented)
    const end = written[written.length - 1]
    if (end) {
      pen = end
    }
  }

  return ordered
}

function nearestToPen(
  pending: readonly Polyline[],
  pen: Point,
): { index: number; reversed: boolean } {
  let index = 0
  let distance = Infinity
  let reversed = false

  for (let candidate = 0; candidate < pending.length; candidate++) {
    const ends = nearerEnd(pending[candidate], pen)
    if (ends.distance < distance) {
      distance = ends.distance
      index = candidate
      reversed = ends.reversed
    }
  }

  return { index, reversed }
}

function nearerEnd(
  polyline: Polyline | undefined,
  pen: Point,
): { distance: number; reversed: boolean } {
  const start = polyline?.points[0]
  const end = polyline?.points[polyline.points.length - 1]
  if (!start || !end) {
    return { distance: Infinity, reversed: false }
  }

  const distanceToStart = travel(pen, start)
  const distanceToEnd = travel(pen, end)
  return {
    distance: Math.min(distanceToStart, distanceToEnd),
    reversed: distanceToEnd < distanceToStart,
  }
}

function reversePolyline(polyline: Polyline): Polyline {
  return { ...polyline, points: [...polyline.points].reverse() }
}

function travel(from: Point, to: Point): number {
  const dx = from.x - to.x
  const dy = from.y - to.y
  return Math.hypot(dx, dy)
}

function gcodeMoves(polyline: ExportPolyline): readonly string[] {
  const start = polyline.points[0]
  if (!start) {
    return []
  }

  return [
    rapidMove(start),
    penDown,
    pause,
    ...polyline.points.slice(1).map(drawMove),
    penUp,
    pause,
  ]
}

function rapidMove(point: Point): string {
  return `G0 X${formatMillimeter(point.x)} Y${formatMillimeter(point.y)}`
}

function drawMove(point: Point): string {
  return `G1 X${formatMillimeter(point.x)} Y${formatMillimeter(point.y)}`
}

function withClosingPoint(polyline: Polyline): ExportPolyline {
  return {
    points: writtenPoints(polyline),
    stroke: polyline.stroke,
    widthMm: polyline.widthMm,
  }
}

function writtenPoints(polyline: Polyline): readonly Point[] {
  const first = polyline.points[0]
  if (!polyline.closed || !first) {
    return polyline.points
  }

  return [...polyline.points, first]
}

function isOnSheet(polyline: Polyline): boolean {
  return polyline.points.every(isPointOnSheet)
}

function isPointOnSheet(point: Point): boolean {
  return (
    point.x >= 0 &&
    point.x <= sheetWidthMm &&
    point.y >= 0 &&
    point.y <= sheetHeightMm
  )
}

function formatMillimeter(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) {
    return rounded.toString()
  }

  return rounded.toFixed(2)
}

type ExportPolyline = {
  points: readonly Point[]
  stroke: string
  widthMm: number
}
