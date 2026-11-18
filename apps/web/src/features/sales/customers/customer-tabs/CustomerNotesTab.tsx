import { NotesBlock } from '@/components/notes/NotesBlock'
import { RecordCard } from '@/components/record-page/RecordPage'
import type { CustomerActivityEntry } from '@/domain/customer'
import { fmtDate } from '@/lib/format'

export function CustomerActivityRows({ entries }: { entries: readonly CustomerActivityEntry[] }) {
  return (
    <>
      {entries.map((a, i) => (
        <div key={`${a.text}-${i}`} className="flex gap-[11px] border-b border-dashed border-border py-2 last:border-b-0">
          <span className="tnum w-[88px] flex-none text-[11.5px] text-muted-foreground">
            {a.date ? fmtDate(a.date) : ''}
          </span>
          <span className="min-w-0 flex-1 text-[12.5px]">
            <span className="block font-medium">{a.text}</span>
            <span className="block text-[11.5px] text-muted-foreground">{a.meta}</span>
          </span>
        </div>
      ))}
    </>
  )
}

export function CustomerNotesTab({
  customerNo,
  activity,
}: {
  customerNo: string
  activity: readonly CustomerActivityEntry[]
}) {
  return (
    <div className="grid animate-sf-fade grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
      <section aria-label="Notes" className="rounded-xl border border-border bg-card px-[18px] py-4">
        <NotesBlock
          entityType="customer"
          entityNo={customerNo}
          placeholder="Add a note about this customer…"
        />
      </section>

      <RecordCard title="Activity">
        <CustomerActivityRows entries={activity} />
        <div className="mt-3 text-[11.5px] leading-normal text-pretty text-muted-foreground">
          A full audit trail (who changed what, when) arrives with the backend.
        </div>
      </RecordCard>
    </div>
  )
}
