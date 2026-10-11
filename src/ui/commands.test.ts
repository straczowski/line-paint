import { describe, expect, it } from 'vitest'
import { commitDrawing } from './history'
import type { DrawingStep } from './history'
import { isCommandUndo, undoCommittedDrawing } from './commands'

describe('Command+Z', () => {
  const drawing: DrawingStep = {
    scene: [
      {
        id: 'a',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        closed: false,
        stroke: '#1e1e1e',
        widthMm: 0.3,
      },
    ],
    selectedIds: ['a'],
    enteredGroupId: undefined,
    pointEdit: undefined,
    duplicateDelta: undefined,
  }

  it('undoes on Command+Z, including key repeat, and leaves a gesture alone', () => {
    const polyline = drawing.scene[0]
    if (!polyline) {
      throw new Error('missing polyline')
    }
    const moved = commitDrawing([], drawing, [
      {
        ...polyline,
        points: [
          { x: 4, y: 0 },
          { x: 5, y: 0 },
        ],
      },
    ])
    const commandZ = {
      key: 'z',
      metaKey: true,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
    }

    expect(isCommandUndo(commandZ)).toBe(true)
    expect(isCommandUndo({ ...commandZ, key: 'Z' })).toBe(true)
    expect(isCommandUndo({ ...commandZ, ctrlKey: true })).toBe(false)
    expect(isCommandUndo({ ...commandZ, shiftKey: true })).toBe(false)
    expect(isCommandUndo({ ...commandZ, metaKey: false })).toBe(false)
    expect(undoCommittedDrawing(moved.past, true)).toBeUndefined()
    expect(undoCommittedDrawing(moved.past, false)?.step).toEqual(drawing)
  })
})
