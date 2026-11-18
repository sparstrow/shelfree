import type { ComponentType, ReactNode } from 'react'
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

interface ItemProps {
  className?: string
  disabled?: boolean
  onSelect?: () => void
  children?: ReactNode
}

/** The column menu is the same list in a button menu and in the header's right-click menu. */
export interface MenuKit {
  Item: ComponentType<ItemProps>
  Separator: ComponentType
}

export const dropdownKit: MenuKit = {
  Item: DropdownMenuItem as ComponentType<ItemProps>,
  Separator: DropdownMenuSeparator as ComponentType,
}
export const contextKit: MenuKit = {
  Item: ContextMenuItem as ComponentType<ItemProps>,
  Separator: ContextMenuSeparator as ComponentType,
}

