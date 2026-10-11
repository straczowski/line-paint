import { useEffect, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import {
  deletePolylinePoint,
  duplicatePolylines,
  enteredGroupAfterRemoval,
  groupIdsToRenew,
  groupPolylines,
  nextDuplicateDelta,
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
      if (!isPlainBackspace(event) || tool !== 'select') {
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
      const selection = drawingRef.current
      if (event.repeat || selection.selectedIds.length === 0) {
        return
      }

      const delta = nextDuplicateDelta(selection.duplicateDelta)
      const newIds = selection.selectedIds.map(() => crypto.randomUUID())
      const oldGroupIds = groupIdsToRenew(
        selection.scene,
        selection.selectedIds,
        selection.enteredGroupId,
      )
      commitScene(
        duplicatePolylines(selection.scene, {
          ids: selection.selectedIds,
          newIds,
          delta,
          enteredGroupId: selection.enteredGroupId,
          newGroupIds: oldGroupIds.map(() => crypto.randomUUID()),
        }),
        {
          selectedIds: newIds,
          enteredGroupId: selection.enteredGroupId,
          pointEdit: undefined,
          duplicateDelta: delta,
        },
      )
      gestureRef.current = undefined
      setGesture(undefined)
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
      const selection = drawingRef.current
      if (event.repeat || selection.selectedIds.length === 0) {
        return
      }

      const next = event.shiftKey
        ? ungroupPolylines(selection.scene, {
            ids: selection.selectedIds,
            enteredGroupId: selection.enteredGroupId,
          })
        : groupPolylines(selection.scene, {
            ids: selection.selectedIds,
            groupId: crypto.randomUUID(),
            enteredGroupId: selection.enteredGroupId,
          })
      commitScene(next)
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
