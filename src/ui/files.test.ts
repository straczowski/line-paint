import { describe, expect, it } from 'vitest'
import type { ImportedPolyline } from '../scene/import'
import type { Point, Polyline } from '../scene/polyline'
import { appendImportedPolylines } from './files'

describe('appendImportedPolylines', () => {
  it('keeps the polylines already on the sheet and appends the import', () => {
    const kept = line('kept', [point(1, 2), point(3, 4)])
    const imported = importedLine([point(10, 20), point(30, 40)], {
      closed: true,
      stroke: '#e03131',
      widthMm: 0.5,
    })

    const next = appendImportedPolylines([kept], [imported])

    expect(next[0]).toBe(kept)
    expect(next).toHaveLength(2)
    expect(next[1]).toMatchObject({
      points: imported.points,
      closed: true,
      stroke: '#e03131',
      widthMm: 0.5,
    })
    expect(next[1]?.id).not.toBe(kept.id)
  })

  it('adds nothing when the import has no polylines', () => {
    const kept = line('kept', [point(1, 2), point(3, 4)])

    expect(appendImportedPolylines([kept], [])).toEqual([kept])
  })
})

function line(id: string, points: readonly Point[]): Polyline {
  return {
    id,
    points,
    closed: false,
    stroke: '#1e1e1e',
    widthMm: 0.3,
  }
}

function importedLine(
  points: readonly Point[],
  patch: Partial<ImportedPolyline> = {},
): ImportedPolyline {
  return {
    points,
    closed: false,
    stroke: '#1e1e1e',
    widthMm: 0.3,
    ...patch,
  }
}

function point(x: number, y: number): Point {
  return { x, y }
}
