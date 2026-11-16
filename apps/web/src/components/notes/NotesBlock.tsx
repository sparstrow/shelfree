import { Ban } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useUi } from '@/app/stores/ui'
import type { Note } from '@/data/schemas'
import { useList, useUpsert } from '@/data/queries'
import { useMe } from '@/data/queries/session'
import { noteInitials, noteWhen, notesFor } from '@/domain/notes'
import { cn } from '@/lib/utils'

/** Timestamp format used on notes: ISO to the second, no zone. */
const stamp = () => new Date().toISOString().slice(0, 19)
const newNoteId = () => 'NOTE-' + Date.now()

export interface NotesBlockProps {
  /** Record type and number the notes belong to, e.g. `purchaseOrder` + `PO00011`. */
  entityType: string
  entityNo: string
  placeholder?: string
  emptyText?: string
  /** Max height of the scrolling list. */
  listMaxHeight?: number
}

/**
 * The append-only notes thread shown on every record. Notes are stamped with
 * author + time and can never be edited or deleted — only marked invalid, with
 * a permanent reason. See docs/notes/README.md.
 */
export function NotesBlock({
  entityType,
  entityNo,
  placeholder = 'Add a note… it is stamped with your name and the time.',
  emptyText = 'No notes yet. The first one starts this record’s history.',
  listMaxHeight = 270,
}: NotesBlockProps) {
  const notes = useList('notes')
  const employees = useList('employees').data ?? []
  const users = useList('users').data ?? []
  const me = useMe().data
  const demoRole = useUi((s) => s.demoRole)
  const save = useUpsert('notes')

  const [text, setText] = useState('')
  const [showInvalid, setShowInvalid] = useState(false)
  const [invalidating, setInvalidating] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const myName = me?.name ?? 'You'
  const myId = employees.find((e) => e.name === myName)?.id ?? 'ME'
  const myUser = users.find((u) => u.name === myName || u.empId === myId)
  const isManager =
    demoRole === 'owner' || demoRole === 'admin' || myUser?.role === 'Admin' || myUser?.role === 'Manager'
  // Authors can invalidate their own notes; managers any note. The backend must enforce this.
  const canInvalidate = (n: Note) =>
    n.status !== 'invalid' && (n.authorId === myId || n.authorName === myName || isManager)

  const all = notesFor(notes.data ?? [], entityType, entityNo)
  const invalidCount = all.filter((n) => n.status === 'invalid').length
  const validCount = all.length - invalidCount
  const rows = showInvalid ? all : all.filter((n) => n.status !== 'invalid')
  const canAdd = !!entityNo && !!text.trim()

  const add = () => {
    if (!canAdd) return
    save.mutate({
      id: newNoteId(),
      entityType,
      entityNo,
      text: text.trim(),
      authorId: myId,
      authorName: myName,
      createdAt: stamp(),
      status: 'valid',
      invalidReason: null,
      invalidatedBy: null,
      invalidatedByName: null,
      invalidatedAt: null,
    })
    setText('')
    toast('Note added to ' + entityNo, { description: 'Notes can’t be edited or deleted — only marked invalid.' })
  }

  const confirmInvalid = () => {
    const note = all.find((n) => n.id === invalidating)
    if (!note || !reason.trim() || !canInvalidate(note)) return
    save.mutate({
      ...note,
      status: 'invalid',
      invalidReason: reason.trim(),
      invalidatedBy: myId,
      invalidatedByName: myName,
      invalidatedAt: stamp(),
    })
    setInvalidating(null)
    setReason('')
    toast('Note marked invalid', { description: 'It stays on the record with your reason attached.' })
  }

  return (
    <div className="flex min-h-0 flex-col gap-[11px]">
      <div className="flex flex-wrap items-center gap-[9px]">
        <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">NOTES</span>
        <span className="tnum rounded-full bg-neutral-bg px-2 py-px text-[11px] font-semibold whitespace-nowrap text-muted-foreground">
          {validCount === 1 ? '1 note' : validCount + ' notes'}
        </span>
        <span className="flex-1" />
        {invalidCount > 0 && (
          <button
            type="button"
            onClick={() => setShowInvalid((v) => !v)}
            aria-pressed={showInvalid}
            className="h-6 rounded-full border border-border bg-transparent px-[10px] text-[11px] font-semibold text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-10 hover:text-foreground"
          >
            {(showInvalid ? 'Hide' : 'Show') + ' ' + invalidCount + ' invalid'}
          </button>
        )}
      </div>

      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          aria-label="New note"
          className="max-h-[120px] min-h-[38px] min-w-0 flex-1 resize-y rounded-[9px] border border-input bg-transparent px-[11px] py-[9px] text-[12.5px] leading-normal text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_16%,transparent)]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          title="Add note (Ctrl/Cmd + Enter)"
          className="hover-lift h-[38px] flex-none rounded-[9px] border-0 bg-primary px-[15px] text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          Add note
        </button>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Once added, a note can’t be edited or deleted — only marked invalid, with a reason.
      </div>

      <div className="-mx-1 flex flex-col gap-0.5 overflow-auto px-1" style={{ maxHeight: listMaxHeight }}>
        {rows.map((n) => {
          const invalid = n.status === 'invalid'
          return (
            <div key={n.id} className="animate-sf-fade border-t border-border px-0.5 py-[10px]">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'inline-flex size-[22px] flex-none items-center justify-center rounded-full text-[10px] font-bold',
                    invalid
                      ? 'bg-neutral-bg text-muted-foreground'
                      : 'bg-[color-mix(in_oklab,var(--primary)_20%,transparent)] text-primary',
                  )}
                >
                  {noteInitials(n.authorName)}
                </span>
                <span className="min-w-0 truncate text-[12.5px] font-semibold">{n.authorName}</span>
                <span className="tnum flex-shrink-0 text-[11.5px] whitespace-nowrap text-muted-foreground">
                  {noteWhen(n.createdAt)}
                </span>
                {invalid && (
                  <span className="rounded-full bg-bad-bg px-[7px] py-px text-[10.5px] font-bold tracking-[0.03em] text-bad-fg">
                    INVALID
                  </span>
                )}
                <span className="flex-1" />
                {canInvalidate(n) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInvalidating(n.id)
                      setReason('')
                    }}
                    aria-label="Mark invalid"
                    title="Mark invalid — notes can never be edited or deleted, only marked invalid with a reason"
                    className="inline-flex size-6 flex-shrink-0 items-center justify-center rounded-[7px] border border-transparent bg-transparent p-0 text-muted-foreground opacity-70 transition-[background-color,color,opacity] duration-[140ms] hover:bg-bad-bg hover:text-bad-fg hover:opacity-100"
                  >
                    <Ban className="size-[13px]" strokeWidth={2} />
                  </button>
                )}
              </div>
              <div
                className={cn(
                  'mt-[5px] text-[12.5px] leading-[1.55] text-pretty whitespace-pre-wrap',
                  invalid ? 'text-muted-foreground line-through' : 'text-foreground',
                )}
              >
                {n.text}
              </div>
              {invalid && n.invalidReason && (
                <div className="mt-1.5 rounded-lg bg-bad-bg px-[9px] py-[7px] text-[11.5px] leading-[1.45] text-bad-fg">
                  Marked invalid by {n.invalidatedByName} · {noteWhen(n.invalidatedAt)} — {n.invalidReason}
                </div>
              )}
              {invalidating === n.id && (
                <div className="mt-2 flex flex-wrap items-center gap-[7px]">
                  <input
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        confirmInvalid()
                      } else if (e.key === 'Escape') {
                        e.stopPropagation()
                        setInvalidating(null)
                      }
                    }}
                    placeholder="Why is this note invalid? (required, permanent)"
                    aria-label="Reason this note is invalid"
                    className="h-[30px] min-w-[180px] flex-1 rounded-lg border border-input bg-transparent px-[10px] text-xs text-foreground outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    onClick={confirmInvalid}
                    disabled={!reason.trim()}
                    className="h-[30px] flex-none rounded-lg border-0 bg-bad-fg px-3 text-xs font-semibold text-background transition-transform duration-[140ms] hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  >
                    Mark invalid
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvalidating(null)}
                    className="h-[30px] rounded-lg border border-border bg-transparent px-[11px] text-xs font-semibold text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-10 hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="px-2 py-[22px] text-center text-[12.5px] text-muted-foreground">
            {showInvalid || invalidCount === 0 ? emptyText : `No valid notes — ${invalidCount} marked invalid.`}
          </div>
        )}
      </div>
    </div>
  )
}
