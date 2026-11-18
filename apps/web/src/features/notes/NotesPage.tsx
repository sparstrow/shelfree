import { useMemo } from 'react'
import { useActivePage } from '@/app/shell/use-active-page'
import type { GridFilter } from '@/components/data-grid/model'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useList } from '@/data/queries'
import type { Note } from '@/data/schemas'
import { noteInitials, noteWhen } from '@/domain/notes'
import { EM_DASH } from '@/lib/format'
import { cn } from '@/lib/utils'
import { noteRecordPath, noteTypeLabel, notesDataset } from './dataset'

export interface NotesPageProps {
  sel?: string
  type?: string
  entity?: string
  status?: string
}

/**
 * Notes ▸ Notes — every note in the workspace, newest first.
 * Exceptions to the list template: append-only audit index, so no New and no
 * Delete; double-clicking, pressing Enter, or choosing Open record opens the
 * parent document or profile.
 */
export function NotesPage({ sel, type, entity, status }: NotesPageProps) {
  const active = useActivePage()
  const notes = useList('notes')

  const noteList = useMemo(() => notes.data ?? [], [notes.data])
  const dataset = useMemo(() => notesDataset(noteList), [noteList])

  const initialFilters = useMemo<Omit<GridFilter, 'id'>[] | undefined>(() => {
    const out: Omit<GridFilter, 'id'>[] = []
    if (type) out.push({ key: 'entityType', op: 'isAny', value: [noteTypeLabel(type)] })
    if (entity) out.push({ key: 'entityNo', op: 'equals', value: entity })
    if (status === 'valid' || status === 'invalid') {
      out.push({ key: 'status', op: 'isAny', value: [status === 'invalid' ? 'Invalid' : 'Valid'] })
    }
    return out.length > 0 ? out : undefined
  }, [type, entity, status])

  const preview = (n: Note): ListPreview => {
    const invalid = n.status === 'invalid'
    const typeLabel = noteTypeLabel(n.entityType)
    return {
      ariaLabel: `Note ${n.id}`,
      no: n.entityNo,
      status: invalid ? 'Invalid' : 'Valid',
      title: typeLabel,
      subtitle: `${n.authorName} · ${noteWhen(n.createdAt) || EM_DASH}`,
      notice: invalid
        ? `Invalidated by ${n.invalidatedByName || 'Unknown'} · ${noteWhen(n.invalidatedAt) || EM_DASH}${n.invalidReason ? ` — ${n.invalidReason}` : ''}`
        : undefined,
      beforeFacts: (
        <div className="px-[14px] pt-3 pb-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex size-[22px] flex-none items-center justify-center rounded-full text-[10px] font-bold',
                invalid
                  ? 'bg-neutral-bg text-muted-foreground'
                  : 'bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-primary',
              )}
            >
              {noteInitials(n.authorName)}
            </span>
            <span className="truncate text-[12.5px] font-semibold">{n.authorName}</span>
          </div>
          <p
            className={cn(
              'm-0 text-[12.5px] leading-[1.55] text-pretty whitespace-pre-wrap',
              invalid ? 'text-muted-foreground line-through' : 'text-foreground',
            )}
          >
            {n.text}
          </p>
          <p className="mt-2.5 mb-0 text-[11px] leading-[1.45] text-muted-foreground">
            Append-only: notes can’t be edited or deleted — only marked invalid on the record.
          </p>
        </div>
      ),
      facts: [
        { k: 'Note ID', v: n.id },
        { k: 'Reference', v: n.entityNo },
        { k: 'Record', v: typeLabel },
        { k: 'Added by', v: n.authorName },
        { k: 'Date & time', v: noteWhen(n.createdAt) || EM_DASH },
      ],
    }
  }

  return (
    <ListPage
      pageLabel={active.kind === 'other' ? 'Notes' : undefined}
      dataset={dataset}
      rows={notes.data}
      isLoading={notes.isPending}
      error={notes.error}
      onRefresh={() => notes.refetch()}
      recordPath={noteRecordPath}
      openLabel="Open record"
      preview={preview}
      initialActiveId={sel ?? null}
      initialFilters={initialFilters}
      gridKey={`${type ?? ''}|${entity ?? ''}|${status ?? ''}`}
      emptyText="No notes yet. Add a note from any order, receipt, BOM, assembly order, item, vendor or customer."
    />
  )
}
