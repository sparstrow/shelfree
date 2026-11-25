import type { HelpMap } from '@/components/help/types'

/**
 * Settings ▸ GST registrations — quiet-help map. The prototype's page was written before the
 * quiet-pages rule, so this text comes from `docs/gst-registrations/README.md`.
 */
export const GST_REGISTRATIONS_HELP: HelpMap = {
  page: {
    title: 'GST registrations',
    body: 'Your own GSTINs, one for each state you operate in. Each registration files its own returns, keeps its own tax credit and numbers its own invoices. Documents pick the registration from the location, so nobody chooses it by hand.',
    note: 'A location can’t be Active in a state until an active registration covers it.',
  },
  gstin: {
    title: 'GSTIN',
    body: 'The 15-character number on your registration certificate. The first two digits are the state, characters 3 to 12 are your PAN. It can’t be changed after saving — if it is wrong, cancel the registration and add the right one.',
    note: 'The last character must check out. All registrations share the PAN in Business profile.',
  },
  registeredOn: { title: 'Registered on', body: 'The date on the certificate. Optional; it can’t be in the future.' },
  legal: { title: 'Legal name', body: 'The name exactly as on the certificate — it prints on tax invoices from this registration.' },
  trade: { title: 'Trade name', body: 'The trade name on the certificate, when it differs from the legal name.' },
  scheme: {
    title: 'Scheme',
    body: 'Regular registrations charge GST and claim input credit. Composition registrations pay a flat share of turnover, can’t charge GST on invoices and can’t claim credit.',
    options: [
      { value: 'Regular', label: 'Regular', desc: 'Normal GST: charge tax, claim input tax credit.' },
      { value: 'Composition', label: 'Composition', desc: 'Flat-rate scheme: no tax on invoices, no credit. Returns are quarterly and e-invoicing is off.' },
    ],
  },
  regType: {
    title: 'Registration type',
    body: 'Normal registrations are permanent and cover their state. A Casual registration is temporary — for a trade fair or a seasonal stall — and runs for a fixed period.',
    options: [
      { value: 'Normal', label: 'Normal', desc: 'Permanent. One active Normal registration per state.' },
      { value: 'Casual', label: 'Casual (temporary)', desc: 'Up to 90 days plus one 90-day extension. It doesn’t own locations and can’t be primary.' },
    ],
  },
  validFrom: { title: 'Valid from', body: 'The first day a casual registration is in force.' },
  validTo: { title: 'Valid to', body: 'The last day a casual registration is in force — at most 180 days after it starts (90 days plus one 90-day extension).' },
  filing: {
    title: 'Returns filed',
    body: 'How often GSTR-1 is filed for this registration. Composition registrations always file quarterly.',
    options: [
      { value: 'Monthly', label: 'Monthly', desc: 'GSTR-1 and GSTR-3B every month.' },
      { value: 'Quarterly', label: 'Quarterly (QRMP)', desc: 'Invoice details monthly, returns every quarter — for turnover up to ₹5 crore.' },
    ],
  },
  series: {
    title: 'Invoice number prefix',
    body: 'Invoices from this registration start with it, followed by a four-digit running number. Add {FY} so numbering restarts each financial year — TN/{FY}/ gives TN/2026-27/0001.',
    note: 'A GST invoice number is at most 16 characters, and the prefix must be different for every registration.',
  },
  ewayMin: {
    title: 'E-way bill from (₹)',
    body: 'The consignment value from which an e-way bill is raised for this registration. ₹50,000 is the national threshold; some states set their own.',
  },
  eInvoice: {
    title: 'E-invoice',
    body: 'Whether this registration must generate e-invoices (IRN). It is a flag only — no portal credentials are stored here.',
    note: 'Not available to composition registrations.',
  },
  addr1: { title: 'Address', body: 'The principal place of business as on the certificate.' },
  city: { title: 'City', body: 'City of the principal place of business.' },
  postal: { title: 'PIN code', body: 'Six digits.' },
  primary: {
    title: 'Primary',
    body: 'The registration shown in Business profile and used when a document has no location. There is always exactly one primary, and it must be a Normal registration.',
  },
}
