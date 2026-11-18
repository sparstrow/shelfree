import type { CustomUom } from '@/data/schemas'

/** Units Kanalora added on top of the locked defaults (prototype `uomLoadCustom()` seed). */
export function seedUnitsOfMeasure(): CustomUom[] {
  return [
    { code: 'PNL', name: 'Panel', cat: 'count', uqc: 'NOS', conv: '1 PNL = 1 NOS', sym: '', custom: true },
    { code: 'RFT', name: 'Running Feet', cat: 'length', uqc: 'OTH', conv: '1 RFT = 0.305 M', sym: 'rft', custom: true },
  ]
}
