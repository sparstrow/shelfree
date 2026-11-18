import { NotesBlock } from '@/components/notes/NotesBlock'
import { RecordCard } from '@/components/record-page/RecordPage'

export function ItemNotesTab({ itemNo }: { itemNo: string }) {
  return (
    <div className="max-w-[760px] animate-sf-fade">
      <RecordCard title="Notes">
        <NotesBlock
          entityType="item"
          entityNo={itemNo}
          placeholder="Add a note about this item… quality, handling, what stores ask for."
        />
      </RecordCard>
    </div>
  )
}
