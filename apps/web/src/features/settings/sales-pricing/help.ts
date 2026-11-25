import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Sales pricing — quiet-help text. Keys: `page`, group ids, row keys. */
export const SALES_PRICING_HELP: HelpMap = {
  page: {
    title: 'Sales pricing',
    body: 'By default every customer is billed the list price set on the item. These rules decide who may be billed something else, and what happens when an agreed price is missing.',
  },
  who: {
    title: 'Customer pricing',
    body: 'Who may be given an agreed price per item. Everyone else is billed the list price.',
  },
  mode: {
    title: 'Who can have their own price',
    body: 'Which customers can be given an agreed price per item. Everyone else is billed the list price.',
    options: [
      { value: 'off', label: 'No one', desc: 'Every customer is billed the list price. Price lists can still be prepared in advance.' },
      { value: 'all', label: 'Every customer', desc: 'Any customer can be given their own agreed price per item.' },
      { value: 'selected', label: 'Selected customers', desc: 'Only the customers switched on in the list — the usual choice for a handful of trade accounts.' },
      { value: 'newOnly', label: 'New customers only', desc: 'Accounts opened from the moment you pick this. Existing customers keep list pricing.' },
    ],
  },
  newCutoff: {
    title: 'New-customer cut-off',
    body: 'The date stamped when you switched to “New customers only”. Accounts opened on or after it are on customer pricing.',
  },
  cust: {
    title: 'Customers on customer pricing',
    body: 'Switch on each customer who may have agreed prices. Their prices are entered on the Sales prices page. These switches save as you flip them.',
  },
  missing: {
    title: 'When a customer has no agreed price',
    body: 'What a sales line does when an eligible customer has no agreed price for the item.',
  },
  fallbackToList: {
    title: 'Fall back to the list price',
    body: 'Whether the item’s list price fills in when an eligible customer has no agreed price.',
    options: [
      { value: 'false', label: 'Off', desc: 'The line comes through unpriced and flagged; the seller types a price and the line is marked Manual.' },
      { value: 'true', label: 'On', desc: 'The item’s list price is used silently.' },
    ],
  },
  blockUnpriced: {
    title: 'Block the item instead',
    body: 'The strictest setting: an eligible customer with no agreed price can’t be sold that item at all. Used only while the fallback is off — with it on there is always a price to fall back to.',
    options: [
      { value: 'false', label: 'Off', desc: 'The line follows the fallback rule above.' },
      { value: 'true', label: 'On', desc: 'The item can’t be added for that customer until a price is agreed.' },
    ],
  },
}
