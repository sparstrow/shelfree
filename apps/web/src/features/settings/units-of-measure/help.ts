import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Units of measure — quiet-help text (prototype `uomCatHelpText().uom`). */
export const UOM_HELP: HelpMap = {
  page: {
    title: 'Units of measure',
    body: 'Default units ship GST-ready — each mapped to its official UQC code for returns, e-invoices and e-way bills — and are locked. Add your own for anything specific to your operation; you can edit or delete only the ones you create.',
  },
  cat: {
    title: 'Category',
    body: 'The kind of quantity — count, weight, length, volume and so on. A unit converts only to other units in the same category.',
  },
  uqc: {
    title: 'GST UQC',
    body: 'The government Unique Quantity Code this unit is reported as on GST returns, e-invoices and e-way bills.',
    note: 'Pick OTH (Others) only when no other code fits.',
  },
  conv: {
    title: 'Conversion',
    body: 'How much of the category’s base unit one of this unit holds. A standalone unit has no fixed conversion.',
  },
  src: {
    title: 'Source',
    body: 'Default units ship with Shelfree and are locked so GST reporting stays correct. Custom units are yours to edit or delete.',
  },
  code: {
    title: 'Code',
    body: 'Short code shown on items and documents, e.g. PNL. Letters and numbers only, up to 8 characters. Fixed once an item uses the unit.',
  },
  fCat: {
    title: 'Category',
    body: 'Sets the base unit the conversion factor is measured in. Changing it resets the base unit shown next to the factor.',
  },
  fUqc: {
    title: 'GST UQC code',
    body: 'The official code GST returns will report this unit as. Pick OTH (Others) only when nothing else fits.',
  },
  factor: {
    title: 'Conversion factor',
    body: 'How many base units one of this unit equals — e.g. 12 for a box of 12 pieces. Leave blank for a standalone unit.',
  },
  sym: {
    title: 'Symbol',
    body: 'Optional short label shown beside quantities, e.g. kg.',
  },
  name: {
    title: 'Name',
    body: 'The full name shown in pickers, e.g. Panel.',
  },
}
