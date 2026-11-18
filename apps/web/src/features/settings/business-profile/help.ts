import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Business profile — quiet-help text. Keys: `page`, group ids, row keys. */
export const BUSINESS_PROFILE_HELP: HelpMap = {
  page: {
    title: 'Business profile',
    body: 'Who your business is. The name, address and tax identifiers here appear on documents, and the name shows in the sidebar. Only owners and admins can change them.',
  },
  identity: {
    title: 'Identity',
    body: 'The names your business trades and is registered under.',
  },
  contact: {
    title: 'Contact',
    body: 'How customers and vendors reach the business. Shown on printed documents.',
  },
  address: {
    title: 'Registered address',
    body: 'The address on your registration. It decides the state that GST is worked out from, so keep it in step with your GST registration.',
    note: 'The state here must match the first two digits of your GSTIN.',
  },
  tax: {
    title: 'Tax identifiers',
    body: 'Your GST and PAN numbers, printed on invoices and used for filing.',
  },
  name: { title: 'Business name', body: 'The name people know you by. Shown in the sidebar and the top of every document.' },
  legal: { title: 'Legal / registered name', body: 'The name on your incorporation and GST certificate. Printed on tax documents.' },
  industry: { title: 'Industry', body: 'Used to suggest sensible defaults when you set up a new area of the app.' },
  email: { title: 'Contact email', body: 'Where replies to emailed documents go.' },
  phone: { title: 'Phone', body: 'The number printed on documents.' },
  addr1: { title: 'Address', body: 'Street address as it appears on your registration.' },
  city: { title: 'City', body: 'Town or city of the registered address.' },
  region: { title: 'State', body: 'Decides the GST state code that new documents start from.' },
  postal: { title: 'Postal code', body: 'Six-digit PIN code.' },
  country: { title: 'Country', body: 'Country of the registered address.' },
  gstin: {
    title: 'GSTIN',
    body: 'Your primary GST registration. Add, change or cancel registrations — and see every location they cover — under GST registrations.',
    note: 'A 15-character number issued by the GST portal; the first two digits are the state code.',
  },
  pan: {
    title: 'PAN',
    body: 'Permanent Account Number: 5 letters, 4 digits, 1 letter. It is also characters 3 to 12 of your GSTIN.',
  },
}
