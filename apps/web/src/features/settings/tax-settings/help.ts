import type { HelpMap } from '@/components/help/types'
import {
  BRANCH_VALUE_OPTIONS,
  COMP_INTER_STATE_OPTIONS,
  ITC_BOOKING_OPTIONS,
  PAPER_TRANSFER_OPTIONS,
  TAX_CALC_OPTIONS,
} from '@/domain/tax-settings'

const CA_NOTE = 'Confirm with your CA — the default is the recommended option, and you can change it any time.'

/**
 * Settings ▸ Tax settings — quiet-help map (ported from the prototype's `tsHelpText()` / `tsOpts()`).
 * Keys: `page`, group ids (`calc`, `rounding`, `checks`, `itc`, `branch`), row keys.
 */
export const TAX_SETTINGS_HELP: HelpMap = {
  page: {
    title: 'Tax settings',
    body: 'How GST is worked out, rounded and booked across the workspace. Only finance admins can change these.',
  },
  calc: {
    title: 'Tax calculation',
    body: 'How GST is worked out on a document. Tax is always rounded to the paisa, separately for CGST, SGST and IGST.',
  },
  rounding: {
    title: 'Rounding',
    body: 'Whether document totals round to the nearest rupee, and where the difference posts.',
  },
  checks: {
    title: 'Document checks',
    body: 'What people may change on a document line, and what gets flagged.',
  },
  itc: {
    title: 'Input tax credit',
    body: 'When GST paid on a vendor bill counts as credit in your books, compared with the government’s GSTR-2B list.',
  },
  branch: {
    title: 'Branch transfers',
    body: 'The value put on a branch invoice when stock moves between two of your GST registrations. Moves inside one registration are delivery challans with no tax.',
  },
  taxCalc: {
    title: 'Calculate tax',
    body: 'Applies to every document that carries GST — purchase orders, bills, invoices.',
    options: TAX_CALC_OPTIONS,
    note: 'Rounding to the paisa is fixed: 2 decimals, half up, CGST and SGST each on their own. A vendor can override this on its own card.',
  },
  roundTotal: {
    title: 'Round document totals to the nearest rupee',
    body: 'The paise added or dropped post to the round-off account.',
  },
  roundOffAcct: {
    title: 'Round-off account',
    body: 'Where the paise added or dropped by rounding post. Used only while rounding totals is on.',
  },
  compInterState: {
    title: 'Composition vendor in another state',
    body: 'Composition dealers can’t supply to another state. Flags a PO whose ship-to location is in a different state from the vendor.',
    options: COMP_INTER_STATE_OPTIONS,
  },
  lineOverride: {
    title: 'Tax override on a document line',
    body: 'People with the override permission can change the tax on one line. A reason is always required and every override is logged.',
  },
  mismatchWarn: {
    title: 'GSTIN state mismatch warning',
    body: 'Flags a vendor or customer whose GSTIN state code doesn’t match their address — on their record and on documents.',
  },
  paperTransfer: {
    title: 'Bill-to and ship-to in different states',
    body: 'Normally a PO is billed to the registration of the location it ships to. Billing another state creates a paper transfer between your own registrations.',
    options: PAPER_TRANSFER_OPTIONS,
    note: 'Only matters once you hold two or more active GST registrations.',
  },
  itcBooking: {
    title: 'Book input tax credit',
    body: 'Bills already posted keep the treatment they were posted with.',
    options: ITC_BOOKING_OPTIONS,
    note: CA_NOTE,
  },
  branchValue: {
    title: 'Transfer value',
    body: 'The starting value on each branch invoice — it can be changed per transfer.',
    options: BRANCH_VALUE_OPTIONS,
    note: CA_NOTE,
  },
  branchPct: {
    title: 'Share of selling price',
    body: 'The starting value on each transfer. It can still be changed on the transfer itself.',
    note: 'Whole numbers or up to two decimals, from 1 to 100.',
  },
}
