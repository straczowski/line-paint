import {
  RiCheckLine,
  RiCircleLine,
  RiDeleteBinLine,
  RiMenuLine,
  RiRouteLine,
} from '@remixicon/react'
import type { ReactNode } from 'react'
import type { Polyline } from '../scene/polyline'
import type { ImportNotice } from './files'
import type { Tool } from './sheet-pointer'

export function ImportToast({ notice }: ImportToastProps) {
  if (!notice) {
    return null
  }

  return (
    <p key={notice.key} className="island import-toast" role="alert">
      This SVG format is not suitable for line-paint. Only path elements are
      allowed.
    </p>
  )
}

export function MenuIsland({
  open,
  onToggle,
  onImportSvg,
  onExportGcode,
  onExportSvg,
}: MenuIslandProps) {
  return (
    <>
      <div className="island menu-island">
        <button
          type="button"
          className="tool-button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={onToggle}
        >
          <RiMenuLine />
        </button>
      </div>
      {open && (
        <div className="island menu-panel" role="menu">
          <button
            type="button"
            className="menu-action"
            role="menuitem"
            onClick={onExportGcode}
          >
            Export GCode
          </button>
          <button
            type="button"
            className="menu-action"
            role="menuitem"
            onClick={onExportSvg}
          >
            Export SVG
          </button>
          <button
            type="button"
            className="menu-action"
            role="menuitem"
            onClick={onImportSvg}
          >
            Import SVG
          </button>
        </div>
      )}
    </>
  )
}

export function ToolIsland({ tool, onTool }: ToolIslandProps) {
  return (
    <div className="island tool-island">
      <ToolButton
        label="Select"
        pressed={tool === 'select'}
        onPress={() => onTool('select')}
      >
        <SelectIcon />
      </ToolButton>
      <ToolButton
        label="Polyline"
        pressed={tool === 'polyline'}
        onPress={() => onTool('polyline')}
      >
        <PolylineIcon />
      </ToolButton>
    </div>
  )
}

function ToolButton({ label, pressed, onPress, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className="tool-button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 1.8v10.6l3.2-3.1 2.3 4.9 1.9-.9-2.3-4.9h4.1z"
        fill="currentColor"
      />
    </svg>
  )
}

function PolylineIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2.5 11.5 6 4.5l4 5 3.5-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FinishIsland({ enabled, onFinish }: FinishIslandProps) {
  return (
    <div className="island property-island">
      <button
        type="button"
        className="finish-button"
        aria-label="Finish"
        disabled={!enabled}
        onClick={onFinish}
      >
        <RiCheckLine />
      </button>
    </div>
  )
}

export function SelectIsland({
  polyline,
  onClosed,
  onDelete,
}: SelectIslandProps) {
  return (
    <div
      className="island property-island"
      role="group"
      aria-label={polyline ? 'Open or closed' : undefined}
    >
      {polyline && (
        <>
          <ChoiceButton
            label="Open"
            pressed={!polyline.closed}
            onPress={() => onClosed(false)}
          >
            <RiRouteLine />
          </ChoiceButton>
          <ChoiceButton
            label="Closed"
            pressed={polyline.closed}
            onPress={() => onClosed(true)}
          >
            <RiCircleLine />
          </ChoiceButton>
        </>
      )}
      <button
        type="button"
        className="delete-button"
        aria-label="Delete"
        onClick={onDelete}
      >
        <RiDeleteBinLine />
      </button>
    </div>
  )
}

function ChoiceButton({
  label,
  pressed,
  onPress,
  children,
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      className="choice-button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

type ImportToastProps = {
  notice: ImportNotice | undefined
}

type MenuIslandProps = {
  open: boolean
  onToggle: () => void
  onImportSvg: () => void
  onExportGcode: () => void
  onExportSvg: () => void
}

type ToolIslandProps = {
  tool: Tool
  onTool: (tool: Tool) => void
}

type ToolButtonProps = {
  label: string
  pressed: boolean
  onPress: () => void
  children: ReactNode
}

type FinishIslandProps = {
  enabled: boolean
  onFinish: () => void
}

type SelectIslandProps = {
  polyline: Polyline | undefined
  onClosed: (closed: boolean) => void
  onDelete: () => void
}

type ChoiceButtonProps = {
  label: string
  pressed: boolean
  onPress: () => void
  children: ReactNode
}
