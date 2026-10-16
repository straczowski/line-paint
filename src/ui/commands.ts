import { useEffect, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Blueprint } from '../scene/blueprint'
import {
  deletePolylinePoint,
  duplicatePolylines,
  enteredGroupAfterRemoval,
  groupIdsToRenew,
  groupPolylines,
  nextDuplicateDelta,
  ungroupChangesScene,
  ungroupPolylines,
} from '../scene/selection'
import type { PointDelete } from '../scene/selection'
import { undoDrawing } from './history'
import type { CommitDrawing, DrawingStep, DrawingUndo } from './history'
import type { SelectGesture, Tool } from './sheet-pointer'

export function useHeldKey(
  key: string,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key) {
        return
      }
      setHeld(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== key) {
        return
      }
      setHeld(false)
    }
    const onBlur = () => {
      setHeld(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [key])

  return [held, setHeld]
}

export function useSelectBackspace(
  tool: Tool,
  drawingRef: RefObject<DrawingStep>,
  deleteSelection: () => void,
  commitScene: CommitDrawing,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !isPlainBackspace(event) ||
        tool !== 'select' ||
        backspaceEditsField(event.target)
      ) {
        return
      }

      event.preventDefault()
      if (event.repeat) {
        return
      }
      const drawing = drawingRef.current
      if (drawing.pointEdit?.pointIndex !== undefined) {
        deleteSelectedPoint(
          drawing,
          { id: drawing.pointEdit.id, index: drawing.pointEdit.pointIndex },
          commitScene,
        )
        return
      }

      deleteSelection()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commitScene, deleteSelection, drawingRef, tool])
}

export function useCommandDuplicate(
  tool: Tool,
  drawingRef: RefObject<DrawingStep>,
  gestureRef: RefObject<SelectGesture | undefined>,
  commitScene: CommitDrawing,
  setGesture: Dispatch<SetStateAction<SelectGesture | undefined>>,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandDuplicate(event) || tool !== 'select') {
        return
      }

      event.preventDefault()
      if (event.repeat) {
        return
      }
      if (duplicateSelection(drawingRef.current, commitScene)) {
        gestureRef.current = undefined
        setGesture(undefined)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commitScene, drawingRef, gestureRef, setGesture, tool])
}

export function useUndoShortcut(
  pastRef: RefObject<readonly DrawingStep[]>,
  gestureRef: RefObject<SelectGesture | undefined>,
  applyUndo: (undone: DrawingUndo) => void,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandUndo(event)) {
        return
      }

      event.preventDefault()
      const undone = undoCommittedDrawing(
        pastRef.current,
        gestureRef.current !== undefined,
      )
      if (!undone) {
        return
      }
      applyUndo(undone)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [applyUndo, gestureRef, pastRef])
}

export function useFinishOnEnter(finishDraft: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return
      }

      event.preventDefault()
      finishDraft()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finishDraft])
}

export function duplicateSelection(
  drawing: DrawingStep,
  commitScene: CommitDrawing,
): boolean {
  const ids = drawing.selectedIds.filter((id) =>
    drawing.scene.some((polyline) => polyline.id === id),
  )
  if (ids.length === 0) {
    return false
  }

  const delta = nextDuplicateDelta(drawing.duplicateDelta)
  const newIds = ids.map(() => crypto.randomUUID())
  const oldGroupIds = groupIdsToRenew(
    drawing.scene,
    ids,
    drawing.enteredGroupId,
  )
  commitScene(
    duplicatePolylines(drawing.scene, {
      ids,
      newIds,
      delta,
      enteredGroupId: drawing.enteredGroupId,
      newGroupIds: oldGroupIds.map(() => crypto.randomUUID()),
    }),
    {
      selectedIds: newIds,
      enteredGroupId: drawing.enteredGroupId,
      pointEdit: undefined,
      duplicateDelta: delta,
    },
  )
  return true
}

export function groupSelection(
  drawing: DrawingStep,
  commitScene: CommitDrawing,
  ungroup: boolean,
): void {
  if (
    drawing.selectedIds.length === 0 ||
    drawing.selectedIds.some((id) =>
      drawing.images.some((image) => image.id === id),
    )
  ) {
    return
  }

  const next = ungroup
    ? ungroupPolylines(drawing.scene, {
        ids: drawing.selectedIds,
        enteredGroupId: drawing.enteredGroupId,
      })
    : groupPolylines(drawing.scene, {
        ids: drawing.selectedIds,
        groupId: crypto.randomUUID(),
        enteredGroupId: drawing.enteredGroupId,
      })
  commitScene(next)
}

export function selectionGroupActions(
  scene: DrawingStep['scene'],
  selectedIds: readonly string[],
  enteredGroupId: string | undefined,
  images: readonly Blueprint[] = [],
): { group: boolean; ungroup: boolean } {
  if (selectedIds.some((id) => images.some((image) => image.id === id))) {
    return { group: false, ungroup: false }
  }

  const change = { ids: selectedIds, enteredGroupId }
  return {
    group:
      groupPolylines(scene, { ...change, groupId: offeredGroupId }) !== scene,
    ungroup: ungroupChangesScene(scene, change),
  }
}

const offeredGroupId = 'offer'

export function backspaceEditsField(
  target: EventTarget | { readonly tagName: string } | null,
): boolean {
  if (!target || !('tagName' in target)) {
    return false
  }

  return target.tagName === 'INPUT'
}

function isPlainBackspace(event: KeyboardEvent): boolean {
  return (
    event.key === 'Backspace' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  )
}

export function useGroupShortcut(
  tool: Tool,
  drawingRef: RefObject<DrawingStep>,
  commitScene: CommitDrawing,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandGroup(event) || tool !== 'select') {
        return
      }

      event.preventDefault()
      if (event.repeat) {
        return
      }
      groupSelection(drawingRef.current, commitScene, event.shiftKey)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commitScene, drawingRef, tool])
}

export function undoCommittedDrawing(
  past: readonly DrawingStep[],
  gestureActive: boolean,
): DrawingUndo | undefined {
  if (gestureActive) {
    return undefined
  }

  return undoDrawing(past)
}

function deleteSelectedPoint(
  drawing: DrawingStep,
  target: PointDelete,
  commitScene: CommitDrawing,
): void {
  const polyline = drawing.scene.find((item) => item.id === target.id)
  if (!polyline?.points[target.index]) {
    return
  }

  const next = deletePolylinePoint(drawing.scene, target)
  const enteredGroupId = enteredGroupAfterRemoval(next, drawing.enteredGroupId)
  if (next.some((item) => item.id === target.id)) {
    commitScene(next, {
      selectedIds: drawing.selectedIds,
      enteredGroupId,
      pointEdit: { id: target.id, pointIndex: undefined },
      duplicateDelta: drawing.duplicateDelta,
    })
    return
  }

  commitScene(next, {
    selectedIds: [],
    enteredGroupId,
    pointEdit: undefined,
    duplicateDelta: undefined,
  })
}

function isCommandGroup(event: KeyboardEvent): boolean {
  return (
    event.key.toLowerCase() === 'g' &&
    event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  )
}

export function isCommandUndo(event: {
  key: string
  metaKey: boolean
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
}): boolean {
  return (
    event.key.toLowerCase() === 'z' &&
    event.metaKey &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey
  )
}

function isCommandDuplicate(event: KeyboardEvent): boolean {
  return (
    event.key.toLowerCase() === 'd' &&
    event.metaKey &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey
  )
}
