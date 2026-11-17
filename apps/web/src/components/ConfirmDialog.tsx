import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  /** Red confirm button for destructive actions. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** The shared "are you sure?" dialog. Enter confirms, Esc cancels. */
export function ConfirmDialog({ open, title, description, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="hover-lift inline-flex h-[34px] items-center rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-foreground hover:bg-tint-12"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={cn(
              'hover-lift inline-flex h-[34px] items-center rounded-lg border-0 px-[14px] text-[13px] font-semibold',
              danger
                ? 'bg-danger text-danger-fg hover:bg-danger-hover'
                : 'bg-primary text-primary-foreground hover:bg-primary-hover',
            )}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
