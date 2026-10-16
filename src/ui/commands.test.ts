import { describe, expect, it } from 'vitest'
import { defaultLayers } from '../scene/layer'
import { groupPolylines } from '../scene/selection'
import type { Polyline } from '../scene/polyline'
import { commitDrawing } from './history'
import type { CommitDrawing, DrawingEditor, DrawingStep } from './history'
import {
  backspaceEditsField,
  duplicateSelection,
  groupSelection,
  isCommandUndo,
  selectionGroupActions,
  undoCommittedDrawing,
} from './commands'

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
    images: [],
    layers: defaultLayers(),
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

describe('Backspace in the rename field', () => {
  it('leaves the selection and any selected point in place', () => {
    expect(backspaceEditsField({ tagName: 'INPUT' })).toBe(true)
    expect(backspaceEditsField({ tagName: 'BUTTON' })).toBe(false)
    expect(backspaceEditsField(null)).toBe(false)
  })
})

describe('selection actions', () => {
  const loose = [line('a'), line('b'), line('c')]

  it('copies a fresh selection by 10 mm and selects the copies', () => {
    const drawing = step([line('a')], ['a'])
    drawing.enteredGroupId = 'room'
    drawing.pointEdit = { id: 'a', pointIndex: 0 }
    const commit = recordCommit()

    expect(duplicateSelection(drawing, commit.commit)).toBe(true)

    const copy = commit.scene[1]
    expect(commit.scene).toHaveLength(2)
    expect(copy?.points).toEqual([
      { x: 10, y: 10 },
      { x: 11, y: 10 },
    ])
    expect(commit.editor?.selectedIds).toEqual([copy?.id])
    expect(commit.editor?.duplicateDelta).toEqual({ x: 10, y: 10 })
    expect(commit.editor?.pointEdit).toBeUndefined()
    expect(commit.editor?.enteredGroupId).toBe('room')
  })

  it('repeats a stored duplicate offset', () => {
    const drawing = step([line('a')], ['a'])
    drawing.duplicateDelta = { x: 3, y: -2 }
    const commit = recordCommit()

    duplicateSelection(drawing, commit.commit)

    expect(commit.scene[1]?.points).toEqual([
      { x: 3, y: -2 },
      { x: 4, y: -2 },
    ])
    expect(commit.editor?.duplicateDelta).toEqual({ x: 3, y: -2 })
  })

  it('does nothing with an empty selection', () => {
    expect(
      duplicateSelection(step(loose, []), () => {
        throw new Error('committed')
      }),
    ).toBe(false)
  })

  it('groups and ungroups through the same commit as the shortcuts', () => {
    const grouped = recordCommit()
    groupSelection(step(loose, ['a', 'b']), grouped.commit, false)

    const groupId = grouped.scene[0]?.groupIds?.[0]
    expect(groupId).toBeTruthy()
    expect(grouped.scene[0]?.groupIds).toEqual([groupId])
    expect(grouped.scene[1]?.groupIds).toEqual([groupId])
    expect(grouped.scene[2]).toBe(loose[2])
    expect(grouped.editor).toBeUndefined()

    const peeled = recordCommit()
    groupSelection(step(grouped.scene, ['a', 'b']), peeled.commit, true)
    expect(peeled.scene[0]?.groupIds).toBeUndefined()
    expect(peeled.scene[1]?.groupIds).toBeUndefined()
  })

  it('shows group and ungroup only when that command would change the drawing', () => {
    expect(selectionGroupActions(loose, ['a'], undefined)).toEqual({
      group: false,
      ungroup: false,
    })
    expect(
      selectionGroupActions([line('a', ['solo'])], ['a'], undefined),
    ).toEqual({ group: false, ungroup: true })
    expect(selectionGroupActions(loose, ['a', 'b'], undefined)).toEqual({
      group: true,
      ungroup: false,
    })

    const grouped = groupPolylines(loose, {
      ids: ['a', 'b'],
      groupId: 'outer',
      enteredGroupId: undefined,
    })
    expect(selectionGroupActions(grouped, ['a', 'b'], undefined)).toEqual({
      group: false,
      ungroup: true,
    })
    expect(selectionGroupActions(grouped, ['a', 'b', 'c'], undefined)).toEqual({
      group: true,
      ungroup: true,
    })

    const twoGroups = [
      line('a', ['left']),
      line('b', ['left']),
      line('c', ['right']),
    ]
    expect(
      selectionGroupActions(twoGroups, ['a', 'b', 'c'], undefined),
    ).toEqual({ group: true, ungroup: true })

    const room = groupPolylines(loose, {
      ids: ['a', 'b', 'c'],
      groupId: 'room',
      enteredGroupId: undefined,
    })
    expect(selectionGroupActions(room, ['a', 'b'], 'room')).toEqual({
      group: true,
      ungroup: false,
    })
    const inner = groupPolylines(room, {
      ids: ['a', 'c'],
      groupId: 'inner',
      enteredGroupId: 'room',
    })
    expect(selectionGroupActions(inner, ['a', 'c'], 'room')).toEqual({
      group: false,
      ungroup: true,
    })
  })
})

function line(id: string, groupIds?: readonly string[]): Polyline {
  return {
    id,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    closed: false,
    stroke: '#1e1e1e',
    widthMm: 0.3,
    groupIds,
  }
}

function step(
  scene: readonly Polyline[],
  selectedIds: readonly string[],
): DrawingStep {
  return {
    scene,
    images: [],
    layers: defaultLayers(),
    selectedIds,
    enteredGroupId: undefined,
    pointEdit: undefined,
    duplicateDelta: undefined,
  }
}

function recordCommit(): {
  commit: CommitDrawing
  scene: readonly Polyline[]
  editor: DrawingEditor | undefined
} {
  const recorded: {
    commit: CommitDrawing
    scene: readonly Polyline[]
    editor: DrawingEditor | undefined
  } = {
    commit: (nextScene, editor) => {
      if (typeof nextScene === 'function') {
        throw new Error('expected a scene')
      }
      recorded.scene = nextScene
      recorded.editor = editor
    },
    scene: [],
    editor: undefined,
  }
  return recorded
}
