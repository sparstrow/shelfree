import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Purchasing ▸ Carrier types — quiet-help text (prototype carrier types page). */
export const CARRIER_TYPES_HELP: HelpMap = {
  page: {
    title: 'Carrier types',
    body: 'The list behind the Type field on Purchasing ▸ Carriers. Three built-in types ship with Shelfree; add your own — rail parcel, bus parcel, vendor delivery. Each type behaves as one of three fixed kinds, because the kind drives GST treatment and which carrier fields apply.',
    note: 'GST logic reads the behaviour, never the type name.',
  },
  code: {
    title: 'Code',
    body: 'Short code carriers store, e.g. RAIL. 2–12 letters, digits or hyphens. Fixed once created.',
  },
  name: {
    title: 'Type',
    body: 'The name shown in the carrier Type dropdown. Must be unique.',
  },
  behavior: {
    title: 'Behaves as',
    body: 'How carriers of this type are treated for GST and which fields they show. Locked for built-in types and for a type any carrier uses — changing it would silently flip those carriers’ GST treatment. Create a new type instead.',
    options: [
      {
        value: 'courier',
        label: 'Forward-charge carrier',
        desc: 'Bills freight with GST on its own invoice. GSTIN optional; tracking link supported.',
      },
      {
        value: 'gta',
        label: 'Goods transport agency (GTA)',
        desc: 'Road transporter that issues a lorry receipt (LR). Reverse charge by default — we pay the GST on its freight.',
      },
      {
        value: 'own',
        label: 'Own vehicle',
        desc: 'Our own van or bike. No freight bill, GSTIN, GST or tracking link.',
      },
    ],
  },
  refLabel: {
    title: 'Tracking ref.',
    body: 'What a shipment reference is called for this type — AWB, LR no. Blank shows “Tracking no.”. Not used by own vehicles.',
  },
  desc: {
    title: 'Description',
    body: 'A note for your team on when to use this type.',
  },
  active: {
    title: 'Status',
    body: 'Inactive types aren’t offered on new carriers; carriers already using one keep it. At least one type must stay active.',
  },
  carriers: {
    title: 'Carriers',
    body: 'How many carriers use this type. A type in use can’t be deleted.',
  },
}
