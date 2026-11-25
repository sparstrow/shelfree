import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Payment terms — quiet-help text (central Shared lists and module slices). */
export const PAYMENT_TERMS_HELP: HelpMap = {
  page: {
    title: 'Payment terms',
    body: 'Default terms offered to customers and agreed with vendors. A term can serve Purchasing, Sales or both, so a module only lists the terms offered there.',
    note: 'A term a vendor or customer uses can’t be deleted — make it inactive instead.',
  },
  code: {
    title: 'Code',
    body: 'Short code, e.g. NET30. 2–12 letters, digits or hyphens. Fixed once a vendor or customer uses the term.',
  },
  name: {
    title: 'Name',
    body: 'The name shown when choosing a term, e.g. Net 30 days. Must be unique.',
  },
  days: {
    title: 'Net days',
    body: 'Days from the invoice date until payment is due. 0 means due on delivery. Leave blank for terms without a fixed number of days, such as end of month.',
  },
  forPurchasing: {
    title: 'Purchasing',
    body: 'Offer this term to vendors. Can’t be turned off while a vendor uses the term.',
  },
  forSales: {
    title: 'Sales',
    body: 'Offer this term to customers. Can’t be turned off while a customer uses the term.',
  },
  active: {
    title: 'Status',
    body: 'Inactive terms stay on the vendors and customers that use them but aren’t offered to new ones.',
  },
  used: {
    title: 'Used by',
    body: 'How many vendors and customers carry this term.',
  },
}
