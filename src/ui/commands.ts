import { useEffect, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Point } from '../scene/polyline'
import {
  deletePolylinePoint,
  duplicatePolylines,
  nextDuplicateDelta,
} from '../scene/selection'
import type { PointDelete } from '../scene/selection'
import type { Scene } from '../scene/sheet'
import type { PointEdit, SelectGesture, Tool } from './sheet-pointer'

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
  scene: Scene,
  pointEdit: PointEdit | undefined,
  deleteSelection: () => void,
  setScene: Dispatch<SetStateAction<Scene>>,
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>,
  setDuplicateDelta: Dispatch<SetStateAction<Point | undefined>>,
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>,
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
      if (pointEdit?.pointIndex !== undefined) {
        deleteSelectedPoint(
          scene,
          { id: pointEdit.id, index: pointEdit.pointIndex },
          setScene,
          setSelectedIds,
          setDuplicateDelta,
          setPointEdit,
        )
        return
      }

      deleteSelection()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    deleteSelection,
    pointEdit,
    scene,
    setDuplicateDelta,
    setPointEdit,
    setScene,
    setSelectedIds,
    tool,
  ])
}

export function useCommandDuplicate(
  tool: Tool,
  selectedIds: readonly string[],
  duplicateDelta: Point | undefined,
  gestureRef: RefObject<SelectGesture | undefined>,
  setScene: Dispatch<SetStateAction<Scene>>,
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>,
  setDuplicateDelta: Dispatch<SetStateAction<Point | undefined>>,
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>,
  setGesture: Dispatch<SetStateAction<SelectGesture | undefined>>,
): void {
  const [latest] = useState(() => {
    let current = { selectedIds, duplicateDelta }
    return {
      read() {
        return current
      },
      write(nextIds: readonly string[], nextDelta: Point | undefined) {
        current = { selectedIds: nextIds, duplicateDelta: nextDelta }
      },
    }
  })
  latest.write(selectedIds, duplicateDelta)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandDuplicate(event) || tool !== 'select') {
        return
      }

      event.preventDefault()
      const selection = latest.read()
      if (event.repeat || selection.selectedIds.length === 0) {
        return
      }

      const delta = nextDuplicateDelta(selection.duplicateDelta)
      const newIds = selection.selectedIds.map(() => crypto.randomUUID())
      latest.write(newIds, delta)
      setScene((current) =>
        duplicatePolylines(current, {
          ids: selection.selectedIds,
          newIds,
          delta,
        }),
      )
      setSelectedIds(newIds)
      setDuplicateDelta(delta)
      setPointEdit(undefined)
      gestureRef.current = undefined
      setGesture(undefined)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    gestureRef,
    latest,
    setDuplicateDelta,
    setGesture,
    setPointEdit,
    setScene,
    setSelectedIds,
    tool,
  ])
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

function deleteSelectedPoint(
  scene: Scene,
  target: PointDelete,
  setScene: Dispatch<SetStateAction<Scene>>,
  setSelectedIds: Dispatch<SetStateAction<readonly string[]>>,
  setDuplicateDelta: Dispatch<SetStateAction<Point | undefined>>,
  setPointEdit: Dispatch<SetStateAction<PointEdit | undefined>>,
): void {
  const polyline = scene.find((item) => item.id === target.id)
  if (!polyline?.points[target.index]) {
    return
  }

  const next = deletePolylinePoint(scene, target)
  setScene(next)
  if (next.some((item) => item.id === target.id)) {
    setPointEdit({ id: target.id, pointIndex: undefined })
    return
  }

  setSelectedIds([])
  setDuplicateDelta(undefined)
  setPointEdit(undefined)
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
