/**
 * Seed floors and layouts for the Kanalora sites (Settings ▸ Locations & warehouses, run 2.7).
 * Mirrors the prototype's `baseWarehouses()` / `baseLayouts()` in `SFLocationsWarehouses.dc.html`.
 */
import type { Floor, LayoutAisle, LayoutZone, LocationLayout, Warehouse } from '@/data/schemas'
import { areaTypeById, emptyLayout, layoutId } from '@/domain/location-layouts'
import { seedWarehouses } from '@/data/seed/seed-data.js'

const GROUND: Floor = { id: 'l1', name: 'Ground floor', code: 'L1', level: 1 }

const SITE_FLOORS: Record<string, Floor[]> = {
  'WH-TVM': [GROUND, { id: 'mz', name: 'Carton loft', code: 'MZ', level: 2 }],
  'WH-ASSY': [GROUND],
  'WH-CHN': [GROUND],
}

/** The seed sites, each with its floors. */
export function seedWarehousesWithFloors(): unknown[] {
  return (seedWarehouses() as Warehouse[]).map((w) => ({ ...w, floors: SITE_FLOORS[w.id] ?? [GROUND] }))
}

type ZoneSeed = Omit<LayoutZone, 'color'>

const zone = (z: ZoneSeed): LayoutZone => ({ ...z, color: areaTypeById(z.type).color })

const aisle = (
  id: string,
  zoneId: string,
  code: string,
  x: number,
  y: number,
  bays: number,
  levels: number,
  binsPerBay: number,
  sides: number,
  aisleWidth: number,
): LayoutAisle => ({ id, zoneId, code, dir: 'v', x, y, bays, levels, binsPerBay, sides, aisleWidth })

function layout(site: string, floor: string, floorW: number, floorH: number, zones: ZoneSeed[], aisles: LayoutAisle[]): LocationLayout {
  return { id: layoutId(site, floor), warehouseId: site, floorId: floor, floorW, floorH, zones: zones.map(zone), aisles, bins: {} }
}

/** One layout per seed site and floor. */
export function seedLocationLayouts(): LocationLayout[] {
  return [
    layout(
      'WH-TVM',
      'l1',
      104,
      78,
      [
        { id: 'z-rcv', code: 'RCV', name: 'Receiving — ceramic in', type: 'receiving', status: 'inuse', x: 6, y: 6, w: 30, h: 15 },
        { id: 'z-qc', code: 'QC', name: 'QC & inspection', type: 'qc', status: 'inuse', x: 40, y: 6, w: 24, h: 15 },
        { id: 'z-ship', code: 'SHIP', name: 'Shipping', type: 'shipping', status: 'available', x: 68, y: 6, w: 30, h: 15 },
        { id: 'z-frg', code: 'FRG', name: 'Fragile ceramic store', type: 'fragile', status: 'available', x: 6, y: 26, w: 30, h: 24 },
        { id: 'z-asm', code: 'ASM', name: 'Assembly & packing', type: 'assembly', status: 'inuse', x: 40, y: 26, w: 24, h: 24 },
        { id: 'z-cmp', code: 'CMP', name: 'Component bins', type: 'components', status: 'available', x: 68, y: 26, w: 30, h: 24 },
        { id: 'z-fin', code: 'FIN', name: 'Finished goods', type: 'finished', status: 'available', x: 6, y: 54, w: 30, h: 22 },
        { id: 'z-stg', code: 'STG', name: 'Staging — Girivalam runs', type: 'staging', status: 'available', x: 40, y: 54, w: 24, h: 16 },
        { id: 'z-ret', code: 'RET', name: 'Returns & breakage', type: 'returns', status: 'available', x: 68, y: 54, w: 18, h: 16 },
        { id: 'z-off', code: 'OFF', name: 'Office', type: 'office', status: 'available', x: 90, y: 54, w: 8, h: 14 },
      ],
      [
        aisle('a-fr1', 'z-frg', 'FR1', 14, 30, 5, 3, 1, 2, 6),
        aisle('a-fr2', 'z-frg', 'FR2', 28, 30, 5, 3, 1, 2, 6),
        aisle('a-cb1', 'z-cmp', 'CB1', 76, 30, 5, 4, 3, 2, 5),
        aisle('a-cb2', 'z-cmp', 'CB2', 90, 30, 5, 4, 3, 2, 5),
        aisle('a-fg1', 'z-fin', 'FG1', 14, 58, 4, 3, 2, 2, 6),
        aisle('a-fg2', 'z-fin', 'FG2', 28, 58, 4, 3, 2, 2, 6),
      ],
    ),
    layout(
      'WH-TVM',
      'mz',
      60,
      44,
      [{ id: 'z-loft', code: 'LOFT', name: 'Carton & packaging loft', type: 'bulk', status: 'available', x: 6, y: 6, w: 48, h: 32 }],
      [aisle('a-lf1', 'z-loft', 'LF1', 14, 10, 6, 3, 1, 2, 6), aisle('a-lf2', 'z-loft', 'LF2', 34, 10, 6, 3, 1, 2, 6)],
    ),
    layout(
      'WH-ASSY',
      'l1',
      56,
      40,
      [
        { id: 'z-a-rcv', code: 'RCV', name: 'Component in', type: 'receiving', status: 'inuse', x: 4, y: 4, w: 20, h: 12 },
        { id: 'z-a-asm', code: 'ASM', name: 'Twist-lock assembly', type: 'assembly', status: 'inuse', x: 28, y: 4, w: 24, h: 12 },
        { id: 'z-a-stg', code: 'STG', name: 'Pack & wrap', type: 'staging', status: 'available', x: 4, y: 20, w: 20, h: 16 },
        { id: 'z-a-fin', code: 'FIN', name: 'Finished goods', type: 'finished', status: 'available', x: 28, y: 20, w: 24, h: 16 },
      ],
      [aisle('a-af1', 'z-a-fin', 'AF1', 36, 24, 3, 3, 2, 2, 6), aisle('a-af2', 'z-a-fin', 'AF2', 48, 24, 3, 3, 2, 1, 5)],
    ),
    // The Chennai DC is still being set up — one empty ground floor.
    emptyLayout('WH-CHN', 'l1'),
  ]
}
