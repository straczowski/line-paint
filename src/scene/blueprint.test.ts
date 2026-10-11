import { describe, expect, it } from 'vitest'
import {
  blueprintAt,
  blueprintCorners,
  deleteBlueprints,
  lockBlueprints,
  placeBlueprint,
  rotateBlueprints,
  scaleBlueprintFrame,
  targetUnderPointer,
  translateBlueprints,
} from './blueprint'
import type { Blueprint } from './blueprint'
import type { Polyline } from './polyline'
import { gcodeDocument, svgDocument } from './export'

describe('placeBlueprint', () => {
  it('centers the picture on the drop and gives the long side 210 mm', () => {
    const placed = placeBlueprint({
      id: 'photo',
      href: 'data:image/png;base64,aaaa',
      pixelWidth: 400,
      pixelHeight: 200,
      center: { x: 100, y: 80 },
    })

    expect(placed).toEqual({
      id: 'photo',
      href: 'data:image/png;base64,aaaa',
      x: -5,
      y: 27.5,
      widthMm: 210,
      heightMm: 105,
      rotation: 0,
      locked: false,
    })
    expect(
      placeBlueprint({
        id: 'tall',
        href: 'data:,',
        pixelWidth: 100,
        pixelHeight: 200,
        center: { x: 0, y: 0 },
      }),
    ).toMatchObject({ widthMm: 105, heightMm: 210 })
    expect(
      placeBlueprint({
        id: 'empty',
        href: 'data:,',
        pixelWidth: 0,
        pixelHeight: 10,
        center: { x: 0, y: 0 },
      }),
    ).toBeUndefined()
  })
})

describe('blueprint edits', () => {
  const placed = requireBlueprint(
    placeBlueprint({
      id: 'photo',
      href: 'data:,',
      pixelWidth: 200,
      pixelHeight: 100,
      center: { x: 100, y: 80 },
    }),
  )

  it('moves an unlocked picture and leaves a locked one', () => {
    const moved = translateBlueprints([placed], {
      ids: ['photo'],
      delta: { x: 3, y: 4 },
    })
    expect(moved[0]).toMatchObject({ x: -2, y: 31.5 })

    const locked = lockBlueprints([placed], ['photo'])
    expect(locked[0]?.locked).toBe(true)
    expect(
      translateBlueprints(locked, { ids: ['photo'], delta: { x: 3, y: 0 } }),
    ).toBe(locked)
  })

  it('scales the frame from the opposite edge', () => {
    const scaled = scaleBlueprintFrame(placed, {
      ids: ['photo'],
      handle: 'east',
      pointer: { x: 215, y: 80 },
      shiftHeld: false,
      altHeld: false,
      zoom: 1,
    })

    expect(scaled.x).toBe(-5)
    expect(scaled.widthMm).toBe(220)
    expect(scaled.heightMm).toBe(105)
    expect(scaled.rotation).toBe(0)
  })

  it('keeps the aspect ratio when shift is held on a corner', () => {
    const scaled = scaleBlueprintFrame(placed, {
      ids: ['photo'],
      handle: 'northEast',
      pointer: {
        x: placed.x + placed.widthMm + 20,
        y: placed.y + placed.heightMm + 20,
      },
      shiftHeld: true,
      altHeld: false,
      zoom: 1,
    })

    expect(scaled.widthMm / scaled.heightMm).toBeCloseTo(
      placed.widthMm / placed.heightMm,
    )
    expect(scaled.rotation).toBe(0)
  })

  it('adds the angle about the picture center', () => {
    const center = { x: 100, y: 80 }
    const turned = rotateBlueprints([placed], {
      ids: ['photo'],
      center,
      angle: Math.PI / 2,
      shiftHeld: false,
    })
    const image = turned[0]
    if (!image) {
      throw new Error('missing blueprint')
    }

    expect(image.rotation).toBeCloseTo(Math.PI / 2)
    expect(image.x + image.widthMm / 2).toBeCloseTo(center.x)
    expect(image.y + image.heightMm / 2).toBeCloseTo(center.y)
    expect(blueprintCorners(image)[0]).toEqual({
      x: expect.closeTo(center.x - placed.heightMm / 2),
      y: expect.closeTo(center.y - placed.widthMm / 2),
    })
  })

  it('steps the rotation by 45 degrees while shift is held', () => {
    const turned = rotateBlueprints([placed], {
      ids: ['photo'],
      center: { x: 100, y: 80 },
      angle: Math.PI / 5,
      shiftHeld: true,
    })
    expect(turned[0]?.rotation).toBeCloseTo(Math.PI / 4)
  })

  it('deletes the chosen picture and keeps the rest in order', () => {
    const second = { ...placed, id: 'other', x: 10 }
    expect(deleteBlueprints([placed, second], ['photo'])).toEqual([second])
    expect(
      deleteBlueprints(
        [lockBlueprints([placed], ['photo'])[0] ?? placed],
        ['photo'],
      ),
    ).toEqual([])
  })
})

describe('targetUnderPointer', () => {
  it('hits a polyline that lies over a blueprint', () => {
    const image = requireBlueprint(
      placeBlueprint({
        id: 'photo',
        href: 'data:,',
        pixelWidth: 100,
        pixelHeight: 100,
        center: { x: 100, y: 100 },
      }),
    )
    const line: Polyline = {
      id: 'line',
      points: [
        { x: 20, y: 100 },
        { x: 80, y: 100 },
      ],
      closed: false,
      stroke: '#1e1e1e',
      widthMm: 0.3,
    }
    const point = { x: 40, y: 100 }

    expect(blueprintAt([image], point)).toBe('photo')
    expect(targetUnderPointer([line], [image], point, 1)).toBe('line')
    expect(targetUnderPointer([], [image], point, 1)).toBe('photo')
  })
})

describe('blueprint export', () => {
  it('leaves the picture out of svg and gcode', () => {
    const scene: Polyline[] = [
      {
        id: 'line',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
        closed: false,
        stroke: '#1e1e1e',
        widthMm: 0.3,
      },
    ]
    const href = 'data:image/png;base64,aaaa'

    expect(svgDocument(scene)).not.toContain('<image')
    expect(svgDocument(scene)).not.toContain(href)
    expect(gcodeDocument(scene)).not.toContain(href)
  })
})

function requireBlueprint(image: Blueprint | undefined): Blueprint {
  if (!image) {
    throw new Error('missing blueprint')
  }
  return image
}
