import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SettingsFormBar } from './use-settings-form'

const quiet =
  'hover-lift inline-flex h-[34px] items-center rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-foreground hover:bg-tint-12 disabled:pointer-events-none disabled:opacity-45'

/**
 * Save bar — always rendered at the foot of a form section so nothing moves
 * when the first change is made; the buttons just enable. Also hosts the
 * "leave without saving?" dialog.
 */
export function SaveBar({ form }: { form: SettingsFormBar }) {
  const n = form.dirtyKeys.length
  return (
    <>
      <div
        role="region"
        aria-label="Save changes"
        className="flex h-14 flex-none items-center gap-3 border-t border-border bg-panel px-[22px]"
      >
        <span aria-live="polite" className={cn('min-w-0 flex-1 truncate text-[12.5px]', n ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {n ? `${n} unsaved ${n === 1 ? 'change' : 'changes'}` : 'No unsaved changes'}
        </span>
        <button type="button" disabled={!n || form.saving} onClick={form.discard} title="Discard changes (Esc)" className={quiet}>
          Discard
        </button>
        <button
          type="button"
          disabled={!n || form.saving}
          onClick={() => void form.save()}
          title="Save changes (Ctrl+S)"
          className="hover-lift inline-flex h-[34px] min-w-[72px] items-center justify-center gap-1.5 rounded-lg border-0 bg-primary px-[14px] text-[13px] font-semibold text-new-btn-fg hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-45"
        >
          {form.saving && <Loader2 className="size-3.5 animate-sf-spin" strokeWidth={2.2} />}
          Save
        </button>
      </div>
      <Dialog open={form.blocker.open} onOpenChange={(next) => !next && form.blocker.stay()}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>
              {n} unsaved {n === 1 ? 'change' : 'changes'} on this page will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={form.blocker.stay} className={quiet}>
              Keep editing
            </button>
            <button
              type="button"
              onClick={form.blocker.leave}
              className="hover-lift inline-flex h-[34px] items-center rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-bad-fg hover:bg-tint-12"
            >
              Discard and leave
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => void form.blocker.saveAndLeave()}
              className="hover-lift inline-flex h-[34px] items-center rounded-lg border-0 bg-primary px-[14px] text-[13px] font-semibold text-new-btn-fg hover:bg-primary-hover"
            >
              Save and leave
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
