import type { HelpMap } from '@/components/help/types'

/**
 * Settings ▸ Locations & warehouses — quiet-help text. The prototype's page had no help map
 * (it was its own component), so these are written from `docs/locations-warehouses/README.md`.
 */
export const LOCATIONS_HELP: HelpMap = {
  page: {
    title: 'Locations & warehouses',
    body: 'The sites that hold your stock — the one list every document, stock figure and GST registration reads from. Returns are an area inside a site, not a site of their own.',
    note: 'A site can’t be deleted while it holds stock or has open documents — set it to Inactive instead.',
  },
  name: {
    title: 'Name',
    body: 'The full name shown in pickers and on documents, e.g. Tiruvannamalai — Main.',
  },
  code: {
    title: 'Code',
    body: 'Short code printed on documents, e.g. TVM-MAIN. Letters, numbers and hyphens, up to 9 characters. Fixed once a document refers to it.',
  },
  type: {
    title: 'Type',
    body: 'What the site does — makes and ships, ships only, runs on a third-party logistics partner, or sells over the counter.',
  },
  status: {
    title: 'Status',
    body: 'Setting up: visible but not yet trading. Active: stock can move in and out. Inactive: hidden from pickers; history stays.',
    note: 'There is always at least one active location.',
  },
  addr: {
    title: 'Address',
    body: 'Street address of the site, printed on documents that ship from or into it.',
  },
  city: { title: 'City', body: 'Town or city of the site.' },
  zip: { title: 'PIN code', body: 'Postal code of the site.' },
  country: {
    title: 'Country',
    body: 'India by default. A site outside India has no GST registration — moves in are exports, moves out are imports.',
  },
  state: {
    title: 'State',
    body: 'The GST state of the site. It decides which GST registration the site files under, and can’t change while open documents use the site.',
  },
  area: {
    title: 'Floor area',
    body: 'Built-up area in square feet. Used for capacity planning.',
  },
  pobStatus: {
    title: 'On the GST certificate as',
    body: 'Principal: the address printed on your GST certificate. Additional: listed as an additional place of business. Not on the certificate yet: add it on the GST portal first — Shelfree never files on the portal.',
    note: 'One principal place per state: saving a site as Principal moves the state’s previous principal to Additional.',
  },
  managerEmpId: {
    title: 'Site manager',
    body: 'Your own staff, from People › Employees.',
  },
  operatorVendorId: {
    title: 'Operated by (3PL vendor)',
    body: 'The 3PL’s vendor record carries their GSTIN, contacts and storage bills. Stock held there still files under your GSTIN.',
  },
  stock: {
    title: 'Units in stock',
    body: 'Units of every item held at this site right now.',
  },
  openDocs: {
    title: 'Open documents',
    body: 'Purchase orders, receipts, assembly orders and sales orders still in progress at this site.',
  },
}
