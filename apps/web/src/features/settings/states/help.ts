import type { HelpMap } from '@/components/help/types'

/**
 * Settings ▸ States & territories — quiet-help text. The prototype page had no ⓘ map (it was
 * written before the quiet-pages rule), so these come from `docs/states/README.md`.
 */
export const STATES_HELP: HelpMap = {
  page: {
    title: 'States & territories',
    body: 'The official GST state codes — the first two digits of every GSTIN. Used by every State field, GSTIN checks and the same-state or different-state split. The list is set by GSTN and can’t be edited.',
    note: 'Carries codes only: GST rates are national, see Tax codes.',
  },
  check: {
    title: 'Check a GSTIN',
    body: 'Type or paste a GSTIN to see its state, PAN and how tax would split against your GST registrations (same state as one of them is CGST + SGST, otherwise IGST against your primary). Nothing you type is saved.',
    note: 'A wrong last character is a warning, not an error — vendor paperwork has typos.',
  },
}
