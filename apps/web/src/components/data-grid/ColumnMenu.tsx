import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  EyeOff,
  Group,
  MoveHorizontal,
  PinOff,
  Pin as PinIcon,
  RotateCcw,
  Ungroup,
} from 'lucide-react'
import type { Pin } from '@/domain/grid-layout'

import type { MenuKit } from './column-menu-kits'

export interface ColumnMenuProps {
  label: string
  sortable: boolean
  sortDir: 'asc' | 'desc' | null
  pin: Pin | null
  canHide: boolean
  canGroup: boolean
  grouped: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  onSort: (dir: 'asc' | 'desc') => void
  onPin: (side: Pin) => void
  onMove: (dir: -1 | 1) => void
  onHide: () => void
  onGroup: () => void
  onAutofit: () => void
  onAutofitAll: () => void
  onReset: () => void
}

const item = 'gap-[9px] text-[12.5px]'
const icon = 'size-[14px]'

export function ColumnMenuItems({ kit, ...p }: ColumnMenuProps & { kit: MenuKit }) {
  const { Item, Separator } = kit
  return (
    <>
      {p.sortable && (
        <>
          <Item className={item} onSelect={() => p.onSort('asc')}>
            <ArrowUp className={icon} strokeWidth={2} />
            <span className="flex-1">Sort ascending</span>
            {p.sortDir === 'asc' && <Check className="size-[13px] text-primary" strokeWidth={2.4} />}
          </Item>
          <Item className={item} onSelect={() => p.onSort('desc')}>
            <ArrowDown className={icon} strokeWidth={2} />
            <span className="flex-1">Sort descending</span>
            {p.sortDir === 'desc' && <Check className="size-[13px] text-primary" strokeWidth={2.4} />}
          </Item>
          <Separator />
        </>
      )}
      <Item className={item} onSelect={() => p.onPin('left')}>
        {p.pin === 'left' ? <PinOff className={icon} strokeWidth={2} /> : <PinIcon className={icon} strokeWidth={2} />}
        {p.pin === 'left' ? 'Unpin from left' : 'Pin to left'}
      </Item>
      <Item className={item} onSelect={() => p.onPin('right')}>
        {p.pin === 'right' ? <PinOff className={icon} strokeWidth={2} /> : <PinIcon className={`${icon} -scale-x-100`} strokeWidth={2} />}
        {p.pin === 'right' ? 'Unpin from right' : 'Pin to right'}
      </Item>
      <Item className={item} disabled={!p.canMoveLeft} onSelect={() => p.onMove(-1)}>
        <ArrowLeft className={icon} strokeWidth={2} />
        Move left
      </Item>
      <Item className={item} disabled={!p.canMoveRight} onSelect={() => p.onMove(1)}>
        <ArrowRight className={icon} strokeWidth={2} />
        Move right
      </Item>
      <Separator />
      <Item className={item} disabled={!p.canHide} onSelect={p.onHide}>
        <EyeOff className={icon} strokeWidth={2} />
        Hide column
      </Item>
      {p.canGroup && (
        <Item className={item} onSelect={p.onGroup}>
          {p.grouped ? <Ungroup className={icon} strokeWidth={2} /> : <Group className={icon} strokeWidth={2} />}
          {p.grouped ? 'Ungroup' : 'Group by this column'}
        </Item>
      )}
      <Separator />
      <Item className={item} onSelect={p.onAutofit}>
        <MoveHorizontal className={icon} strokeWidth={2} />
        Autofit this column
      </Item>
      <Item className={item} onSelect={p.onAutofitAll}>
        <MoveHorizontal className={icon} strokeWidth={2} />
        Autofit all columns
      </Item>
      <Item className={item} onSelect={p.onReset}>
        <RotateCcw className={icon} strokeWidth={2} />
        Reset layout
      </Item>
    </>
  )
}
