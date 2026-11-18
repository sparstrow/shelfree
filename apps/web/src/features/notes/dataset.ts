import type { Dataset, RawValue } from '@/components/data-grid/model'
import type { Note } from '@/data/schemas'
import { noteWhen } from '@/domain/notes'
import { EM_DASH } from '@/lib/format'

export interface NoteEntityMeta {
  type: string
  label: string
  path: (no: string) => string
}

/** Entity type → display label & record URL mapping, matching the prototype's `noteTypes()`. */
export const NOTE_ENTITY_TYPES: readonly NoteEntityMeta[] = [
  { type: 'purchaseOrder', label: 'Purchase order', path: (no) => `/purchasing/purchase-orders/${no}` },
  { type: 'purchaseReceipt', label: 'Purchase receipt', path: (no) => `/purchasing/purchase-receipts/${no}` },
  { type: 'vendor', label: 'Vendor', path: (no) => `/purchasing/vendors/${no}` },
  { type: 'item', label: 'Item', path: (no) => `/warehouse/items/${no}` },
  { type: 'bom', label: 'Bill of materials', path: (no) => `/production/bills-of-materials/${no}` },
  { type: 'assemblyOrder', label: 'Assembly order', path: (no) => `/production/assembly-orders/${no}` },
  { type: 'customer', label: 'Customer', path: (no) => `/sales/customers/${no}` },
]

export function noteTypeLabel(entityType: string): string {
  return NOTE_ENTITY_TYPES.find((t) => t.type === entityType)?.label ?? entityType
}

export function noteRecordPath(note: Pick<Note, 'entityType' | 'entityNo'>): string {
  const meta = NOTE_ENTITY_TYPES.find((t) => t.type === note.entityType)
  return meta && note.entityNo ? meta.path(note.entityNo) : '/notes'
}

function noteStatusLabel(status: Note['status']): 'Valid' | 'Invalid' {
  return status === 'invalid' ? 'Invalid' : 'Valid'
}

/** Notes ▸ Notes — every note in the workspace, newest first. */
export function notesDataset(notes: readonly Note[]): Dataset<Note> {
  const authors = [...new Set(notes.map((n) => n.authorName).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  const raw = (n: Note, key: string): RawValue => {
    switch (key) {
      case 'entityType':
        return noteTypeLabel(n.entityType)
      case 'status':
        return noteStatusLabel(n.status)
      case 'createdAt':
        return n.createdAt || ''
      case 'invalidReason':
        return n.invalidReason ?? ''
      default: {
        const v = n[key as keyof Note]
        return v == null ? '' : String(v)
      }
    }
  }

  const col = (key: string, label: string, width: number, extra: Partial<Dataset<Note>['columns'][number]> = {}) => ({
    key,
    label,
    width,
    min: Math.min(width, 80),
    visible: true,
    align: 'left' as const,
    type: 'text' as const,
    sortable: true,
    ...extra,
  })

  return {
    id: 'notes',
    noun: 'note',
    nounPlural: 'notes',
    idOf: (n) => n.id,
    columns: [
      col('entityNo', 'Reference', 136, { frozen: 'left', type: 'mono', min: 96 }),
      col('entityType', 'Record', 156, { muted: true }),
      col('text', 'Note', 380, { min: 180 }),
      col('authorName', 'Added by', 170),
      col('createdAt', 'Date & time', 170, { muted: true }),
      col('status', 'Status', 104, { type: 'pill' }),
      col('invalidReason', 'Invalidation reason', 220, { visible: false }),
      col('id', 'Note ID', 118, { type: 'mono', visible: false }),
    ],
    raw,
    text: (n, key) => {
      if (key === 'createdAt') return noteWhen(n.createdAt) || EM_DASH
      if (key === 'invalidReason') return n.status === 'invalid' && n.invalidReason ? n.invalidReason : EM_DASH
      const v = raw(n, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (n) =>
      [
        n.id,
        n.entityNo,
        noteTypeLabel(n.entityType),
        n.text,
        n.authorName,
        noteStatusLabel(n.status),
        n.invalidReason ?? '',
        n.invalidatedByName ?? '',
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All notes', system: true, filters: [], sorts: [{ key: 'createdAt', dir: 'desc' }] },
      {
        id: 'valid',
        name: 'Valid notes',
        filters: [{ key: 'status', op: 'isAny', value: ['Valid'] }],
        sorts: [{ key: 'createdAt', dir: 'desc' }],
      },
      {
        id: 'invalid',
        name: 'Invalid notes',
        filters: [{ key: 'status', op: 'isAny', value: ['Invalid'] }],
        sorts: [{ key: 'createdAt', dir: 'desc' }],
      },
    ],
    filterColumns: [
      { key: 'entityType', label: 'Record', type: 'enum', options: NOTE_ENTITY_TYPES.map((t) => t.label) },
      { key: 'entityNo', label: 'Reference', type: 'text' },
      { key: 'authorName', label: 'Added by', type: 'enum', options: authors },
      { key: 'status', label: 'Status', type: 'enum', options: ['Valid', 'Invalid'] },
      { key: 'text', label: 'Note', type: 'text' },
      { key: 'createdAt', label: 'Date & time', type: 'text' },
    ],
    defaultSort: { key: 'createdAt', dir: 'desc' },
    rowFlag: (n) => (n.status === 'invalid' ? 'Marked invalid' : null),
  }
}
