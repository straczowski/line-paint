import { z } from 'zod'
import type { Point } from './polyline'
import { sheetHeightMm, sheetWidthMm } from './sheet'

export function polylinesFromSvg(text: string): SvgImport {
  const reader = { text: text.trim(), index: 0 }
  const viewBox = readSvgOpen(reader)
  if (!viewBox) {
    return { ok: false }
  }

  const paths = readPaths(reader)
  if (!paths || !readLiteral(reader, '</svg>') || !atEnd(reader)) {
    return { ok: false }
  }

  const polylines = paths.map((path) => fitPath(path, viewBox))
  if (!importedPolylinesSchema.safeParse(polylines).success) {
    return { ok: false }
  }

  return { ok: true, polylines }
}

function readSvgOpen(reader: Reader): ViewBox | undefined {
  if (!readLiteral(reader, svgOpenBeforeSize)) {
    return
  }

  const viewBox = readViewBox(reader)
  if (!viewBox || !readLiteral(reader, svgOpenAfterSize)) {
    return
  }

  return viewBox
}

function readViewBox(reader: Reader): ViewBox | undefined {
  const width = readPositiveNumber(reader)
  if (width === undefined || !readLiteral(reader, ' ')) {
    return
  }

  const height = readPositiveNumber(reader)
  if (height === undefined || !readLiteral(reader, '" width="')) {
    return
  }

  if (
    readPositiveNumber(reader) !== width ||
    !readLiteral(reader, '" height="')
  ) {
    return
  }

  if (readPositiveNumber(reader) !== height) {
    return
  }

  return { width, height }
}

function readPaths(reader: Reader): FilePath[] | undefined {
  const paths: FilePath[] = []
  skipWhitespace(reader)
  while (startsWith(reader, '<') && !startsWith(reader, '</svg>')) {
    const path = readPath(reader)
    if (!path) {
      return
    }
    paths.push(path)
    skipWhitespace(reader)
  }

  return paths
}

function readPath(reader: Reader): FilePath | undefined {
  if (!readLiteral(reader, '<path d="')) {
    return
  }

  const drawn = readDrawnPoints(reader)
  if (!drawn || !readLiteral(reader, '" stroke="')) {
    return
  }

  const stroke = readAttributeValue(reader)
  if (stroke === undefined || !readLiteral(reader, '" stroke-width="')) {
    return
  }

  const width = readPositiveNumber(reader)
  if (width === undefined || !readLiteral(reader, pathTail)) {
    return
  }

  const polyline = withoutRepeatedStart(drawn)
  if (polyline.points.length < 2) {
    return
  }

  return { points: polyline.points, closed: polyline.closed, stroke, width }
}

function readDrawnPoints(reader: Reader): Point[] | undefined {
  if (!readLiteral(reader, 'M ')) {
    return
  }

  const start = readCoordinate(reader)
  if (!start) {
    return
  }

  const points = [start]
  while (startsWith(reader, ' L ')) {
    readLiteral(reader, ' L ')
    const next = readCoordinate(reader)
    if (!next) {
      return
    }
    points.push(next)
  }

  return points
}

function withoutRepeatedStart(points: readonly Point[]): StoredPoints {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last || !samePoint(first, last)) {
    return { points, closed: false }
  }

  return { points: points.slice(0, -1), closed: true }
}

function fitPath(path: FilePath, viewBox: ViewBox): ImportedPolyline {
  const scale = fitScale(viewBox)
  const offsetX = (sheetWidthMm - viewBox.width * scale) / 2
  const offsetY = (sheetHeightMm - viewBox.height * scale) / 2
  return {
    points: path.points.map((point) =>
      fitPoint(point, scale, offsetX, offsetY),
    ),
    closed: path.closed,
    stroke: path.stroke,
    widthMm: path.width * scale,
  }
}

function fitScale(viewBox: ViewBox): number {
  return Math.min(sheetWidthMm / viewBox.width, sheetHeightMm / viewBox.height)
}

function fitPoint(
  point: Point,
  scale: number,
  offsetX: number,
  offsetY: number,
): Point {
  return {
    x: point.x * scale + offsetX,
    y: sheetHeightMm - (point.y * scale + offsetY),
  }
}

function readCoordinate(reader: Reader): Point | undefined {
  const x = readNumber(reader)
  if (x === undefined || !readLiteral(reader, ',')) {
    return
  }

  const y = readNumber(reader)
  if (y === undefined) {
    return
  }

  return { x, y }
}

function readPositiveNumber(reader: Reader): number | undefined {
  const value = readNumber(reader)
  if (value === undefined || value <= 0) {
    return
  }

  return value
}

function readNumber(reader: Reader): number | undefined {
  const start = reader.index
  if (reader.text[reader.index] === '-') {
    reader.index += 1
  }
  if (!readDigits(reader)) {
    reader.index = start
    return
  }
  if (reader.text[reader.index] === '.') {
    reader.index += 1
    if (!readDigits(reader)) {
      reader.index = start
      return
    }
  }

  const value = Number(reader.text.slice(start, reader.index))
  if (!Number.isFinite(value)) {
    reader.index = start
    return
  }

  return value
}

function readDigits(reader: Reader): boolean {
  const start = reader.index
  while (isDigit(reader.text[reader.index])) {
    reader.index += 1
  }

  return reader.index > start
}

function readAttributeValue(reader: Reader): string | undefined {
  const start = reader.index
  while (
    reader.index < reader.text.length &&
    reader.text[reader.index] !== '"'
  ) {
    reader.index += 1
  }
  if (reader.text[reader.index] !== '"') {
    return
  }

  return reader.text.slice(start, reader.index)
}

function readLiteral(reader: Reader, literal: string): boolean {
  if (!startsWith(reader, literal)) {
    return false
  }

  reader.index += literal.length
  return true
}

function skipWhitespace(reader: Reader): void {
  while (isWhitespace(reader.text[reader.index])) {
    reader.index += 1
  }
}

function startsWith(reader: Reader, literal: string): boolean {
  return reader.text.startsWith(literal, reader.index)
}

function atEnd(reader: Reader): boolean {
  return reader.index === reader.text.length
}

function samePoint(first: Point, last: Point): boolean {
  return first.x === last.x && first.y === last.y
}

function isDigit(character: string | undefined): boolean {
  return character !== undefined && character >= '0' && character <= '9'
}

function isWhitespace(character: string | undefined): boolean {
  return (
    character === ' ' ||
    character === '\n' ||
    character === '\r' ||
    character === '\t'
  )
}

const svgOpenBeforeSize =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '

const svgOpenAfterSize = '" style="background: white">'

const pathTail =
  '" stroke-linecap="round" stroke-linejoin="round" fill="none" />'

const importedPolylineSchema = z.object({
  points: z
    .array(
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
      }),
    )
    .min(2),
  closed: z.boolean(),
  stroke: z.string(),
  widthMm: z.number().finite().positive(),
})

const importedPolylinesSchema = z.array(importedPolylineSchema)

export type SvgImport =
  { ok: true; polylines: readonly ImportedPolyline[] } | { ok: false }

export type ImportedPolyline = {
  points: readonly Point[]
  closed: boolean
  stroke: string
  widthMm: number
}

type FilePath = {
  points: readonly Point[]
  closed: boolean
  stroke: string
  width: number
}

type StoredPoints = {
  points: readonly Point[]
  closed: boolean
}

type ViewBox = {
  width: number
  height: number
}

type Reader = {
  text: string
  index: number
}
