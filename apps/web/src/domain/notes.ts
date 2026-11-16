/**
 * Notes are an append-only log attached to a record (type + number). They are
 * never edited or deleted, only marked invalid. See docs/notes/README.md.
 */
import type { Note } from '@/data/schemas'

/** Notes for one record, newest first. */
export function notesFor(notes: readonly Note[], entityType: string, entityNo: string): Note[] {
  if (!entityNo) return []
  return notes
    .filter((n) => n.entityType === entityType && n.entityNo === entityNo)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

/** Text of the newest note that is still valid, or ''. */
export function latestNoteText(notes: readonly Note[], entityType: string, entityNo: string): string {
  return notesFor(notes, entityType, entityNo).find((n) => n.status === 'valid')?.text ?? ''
}

/** Everything searchable about a record's notes. */
export function notesBlob(notes: readonly Note[], entityType: string, entityNo: string): string {
  return notesFor(notes, entityType, entityNo)
    .map((n) => n.text + ' ' + n.authorName)
    .join(' ')
}
