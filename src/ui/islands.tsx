import {
  RiAlignItemBottomLine,
  RiAlignItemHorizontalCenterLine,
  RiAlignItemLeftLine,
  RiAlignItemRightLine,
  RiAlignItemTopLine,
  RiAlignItemVerticalCenterLine,
  RiCheckLine,
  RiCircleLine,
  RiRectangleLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiFullscreenLine,
  RiLockLine,
  RiLockUnlockLine,
  RiMenuLine,
  RiMergeCellsHorizontal,
  RiRouteLine,
  RiSplitCellsHorizontal,
} from '@remixicon/react'
import type { ReactNode } from 'react'
import type { AlignAction } from '../scene/align'
import type { Polyline } from '../scene/polyline'
import type { ShapeKind } from '../scene/shape'
import type { ImportNotice } from './files'
import type { Tool } from './sheet-pointer'

export function ImportToast({ notice }: ImportToastProps) {
  if (!notice) {
    return null
  }

  return (
    <p key={notice.key} className="island import-toast" role="alert">
      {notice.refusal === 'file'
        ? 'This file cannot be imported.'
        : 'This SVG format is not suitable for line-paint. Only path elements are allowed.'}
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
      <ToolButton
        label="Shape"
        pressed={tool === 'shape'}
        onPress={() => onTool('shape')}
      >
        <ShapeIcon />
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

function ShapeIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
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

export function NavigationIsland({
  percent,
  onResetZoom,
  onFit,
}: NavigationIslandProps) {
  return (
    <div className="navigation-anchor">
      <div className="island navigation-island">
        <button
          type="button"
          className="zoom-button"
          aria-label="Reset zoom to 100%"
          onClick={onResetZoom}
        >
          {percent}%
        </button>
        <button
          type="button"
          className="tool-button"
          aria-label="Fit sheet"
          onClick={onFit}
        >
          <RiFullscreenLine />
        </button>
      </div>
    </div>
  )
}

export function ShapeIsland({ shape, onShape }: ShapeIslandProps) {
  return (
    <div className="island property-island" role="group">
      <ChoiceButton
        label="Rectangle"
        pressed={shape === 'rectangle'}
        onPress={() => onShape('rectangle')}
      >
        <RiRectangleLine />
      </ChoiceButton>
      <ChoiceButton
        label="Ellipse"
        pressed={shape === 'ellipse'}
        onPress={() => onShape('ellipse')}
      >
        <RiCircleLine />
      </ChoiceButton>
    </div>
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
  showGroup,
  showUngroup,
  showAlign,
  distribute,
  showDuplicate,
  lock,
  onClosed,
  onDuplicate,
  onGroup,
  onUngroup,
  onDelete,
  onAlign,
  onLock,
}: SelectIslandProps) {
  return (
    <div className="island property-island" role="group">
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
      {showDuplicate && (
        <button
          type="button"
          className="action-button"
          aria-label="Duplicate"
          onClick={onDuplicate}
        >
          <RiFileCopyLine />
        </button>
      )}
      {showGroup && (
        <button
          type="button"
          className="action-button"
          aria-label="Group"
          onClick={onGroup}
        >
          <RiMergeCellsHorizontal />
        </button>
      )}
      {showUngroup && (
        <button
          type="button"
          className="action-button"
          aria-label="Ungroup"
          onClick={onUngroup}
        >
          <RiSplitCellsHorizontal />
        </button>
      )}
      {lock && (
        <button
          type="button"
          className="action-button"
          aria-label={lock === 'locked' ? 'Unlock' : 'Lock'}
          onClick={onLock}
        >
          {lock === 'locked' ? <RiLockLine /> : <RiLockUnlockLine />}
        </button>
      )}
      <button
        type="button"
        className="delete-button"
        aria-label="Delete"
        onClick={onDelete}
      >
        <RiDeleteBinLine />
      </button>
      {showAlign && (
        <>
          <AlignButton label="Align left" onPress={() => onAlign('left')}>
            <RiAlignItemLeftLine />
          </AlignButton>
          <AlignButton
            label="Center horizontally"
            onPress={() => onAlign('centerX')}
          >
            <RiAlignItemHorizontalCenterLine />
          </AlignButton>
          <AlignButton label="Align right" onPress={() => onAlign('right')}>
            <RiAlignItemRightLine />
          </AlignButton>
          {distribute && (
            <AlignButton
              label="Distribute horizontally"
              onPress={() => onAlign('distributeX')}
            >
              <DistributeHorizontalIcon />
            </AlignButton>
          )}
          <AlignButton label="Align top" onPress={() => onAlign('top')}>
            <RiAlignItemTopLine />
          </AlignButton>
          <AlignButton
            label="Center vertically"
            onPress={() => onAlign('centerY')}
          >
            <RiAlignItemVerticalCenterLine />
          </AlignButton>
          <AlignButton label="Align bottom" onPress={() => onAlign('bottom')}>
            <RiAlignItemBottomLine />
          </AlignButton>
          {distribute && (
            <AlignButton
              label="Distribute vertically"
              onPress={() => onAlign('distributeY')}
            >
              <DistributeVerticalIcon />
            </AlignButton>
          )}
        </>
      )}
    </div>
  )
}

function AlignButton({ label, onPress, children }: AlignButtonProps) {
  return (
    <button
      type="button"
      className="action-button"
      aria-label={label}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

function DistributeHorizontalIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1.5 2h2v12h-2zM7 2h2v12H7zM12.5 2h2v12h-2z"
        fill="currentColor"
      />
    </svg>
  )
}

function DistributeVerticalIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 1.5h12v2H2zM2 7h12v2H2zM2 12.5h12v2H2z" fill="currentColor" />
    </svg>
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

type NavigationIslandProps = {
  percent: number
  onResetZoom: () => void
  onFit: () => void
}

type ShapeIslandProps = {
  shape: ShapeKind
  onShape: (shape: ShapeKind) => void
}

type FinishIslandProps = {
  enabled: boolean
  onFinish: () => void
}

type AlignButtonProps = {
  label: string
  onPress: () => void
  children: ReactNode
}

type SelectIslandProps = {
  polyline: Polyline | undefined
  showGroup: boolean
  showUngroup: boolean
  showAlign: boolean
  distribute: boolean
  showDuplicate: boolean
  onClosed: (closed: boolean) => void
  onDuplicate: () => void
  onGroup: () => void
  onUngroup: () => void
  onDelete: () => void
  onAlign: (action: AlignAction) => void
  lock: 'locked' | 'unlocked' | undefined
  onLock: () => void
}

type ChoiceButtonProps = {
  label: string
  pressed: boolean
  onPress: () => void
  children: ReactNode
}
