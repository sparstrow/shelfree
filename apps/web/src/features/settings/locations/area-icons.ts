import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Boxes,
  Briefcase,
  Cog,
  Factory,
  LayoutGrid,
  type LucideIcon,
  Package,
  Rows3,
  ShoppingCart,
  Store,
  Truck,
  Undo2,
  Warehouse,
  Wine,
} from 'lucide-react'

/** Icon of each area type in the catalogue (`domain/location-layouts`). */
export const AREA_ICONS: Record<string, LucideIcon> = {
  receiving: ArrowDownToLine,
  bulk: Boxes,
  pick: ShoppingCart,
  fragile: Wine,
  qc: BadgeCheck,
  components: Rows3,
  assembly: Cog,
  finished: Package,
  shipping: ArrowUpFromLine,
  staging: LayoutGrid,
  returns: Undo2,
  office: Briefcase,
}

export const areaIcon = (typeId: string): LucideIcon => AREA_ICONS[typeId] ?? Boxes

/** The wizard's site-type cards (prototype copy). The values are the site types of `domain/locations`. */
export const SITE_TYPE_CARDS: readonly { value: string; name: string; desc: string; icon: LucideIcon }[] = [
  { value: 'dc', name: 'Distribution centre', desc: 'Stores & ships finished stock', icon: Warehouse },
  { value: 'mixed', name: 'Manufacturing + DC', desc: 'Makes and stores product', icon: Factory },
  { value: '3pl', name: 'Third-party (3PL)', desc: 'Outsourced logistics partner', icon: Truck },
  { value: 'retail', name: 'Retail forward stock', desc: 'Back-of-store stockroom', icon: Store },
]
