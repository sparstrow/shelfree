import { useMemo } from 'react'
import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { ProductionConfig } from '@/data/api/settings'
import { useList } from '@/data/queries'
import { useUpdateProduction } from '@/data/queries/sales-production-settings'
import { useSettings } from '@/data/queries/settings'
import { useCapability } from '@/data/queries/workspace-config'
import { DEFAULT_PRODUCTION_SETTINGS, defaultScrapError, productionLocationError } from '@/domain/assembly-order'
import { ASSEMBLY_PRODUCTION_HELP } from './help'

const D = DEFAULT_PRODUCTION_SETTINGS

function groups(
  sites: readonly { value: string; label: string }[],
  /** The Production orders & routing capability (Modules & capabilities) is on. */
  routed: boolean,
): readonly SettingsGroup<ProductionConfig>[] {
  return [
    {
      id: 'defaults',
      title: 'Defaults',
      rows: [
        {
          key: 'outputLoc',
          label: 'Finished goods arrive at',
          control: { type: 'select', options: sites },
          default: D.outputLoc,
          validate: (v) => productionLocationError(String(v), 'where finished goods arrive'),
        },
        {
          key: 'defaultScrap',
          label: 'Default scrap allowance %',
          control: { type: 'number', step: '0.5', min: 0 },
          default: D.defaultScrap,
          validate: (v) => defaultScrapError(Number(v)),
        },
        {
          key: 'wipLoc',
          label: 'Work-in-progress location',
          control: { type: 'select', options: sites },
          default: D.wipLoc,
          validate: (v) => productionLocationError(String(v), 'the work-in-progress location'),
          // WIP only means something with routed production; shown while that capability is on (G-027).
          hidden: () => !routed,
        },
      ],
    },
    {
      id: 'behaviour',
      title: 'Behaviour',
      rows: [
        { key: 'manualConsumption', label: 'Correct component quantities when finishing', control: { type: 'switch' }, default: D.manualConsumption },
        { key: 'allowShortRelease', label: 'Allow release with shortages', control: { type: 'switch' }, default: D.allowShortRelease },
        { key: 'allowOverConsume', label: 'Allow consuming more than planned', control: { type: 'switch' }, default: D.allowOverConsume },
      ],
    },
  ]
}

/** Settings ▸ Production ▸ Assembly & production (`/production/settings/assembly`). */
export function AssemblyProductionSection({ readOnly }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const update = useUpdateProduction()
  const warehouses = useList('warehouses')
  const saved = settings.data?.production

  // Sites that are not inactive, plus whatever is currently chosen (so a stored pick never disappears).
  const sites = useMemo(() => {
    const all = warehouses.data ?? []
    const chosen = new Set([saved?.outputLoc, saved?.wipLoc])
    return all.filter((w) => w.status !== 'inactive' || chosen.has(w.id)).map((w) => ({ value: w.id, label: w.name }))
  }, [warehouses.data, saved?.outputLoc, saved?.wipLoc])
  const withStored = useMemo(() => {
    const known = new Set(sites.map((s) => s.value))
    const extra = [saved?.outputLoc, saved?.wipLoc].filter((v): v is string => !!v && !known.has(v))
    return [...new Set(extra)].map((value) => ({ value, label: value })).concat(sites)
  }, [sites, saved?.outputLoc, saved?.wipLoc])
  const routed = useCapability('production')
  const rows = useMemo(() => groups(withStored, routed), [withStored, routed])

  return (
    <SettingsSection<ProductionConfig>
      id="assembly"
      title="Assembly & production"
      help={ASSEMBLY_PRODUCTION_HELP}
      saved={saved}
      isLoading={settings.isLoading || warehouses.isLoading}
      error={settings.error ?? warehouses.error}
      onRetry={() => {
        void settings.refetch()
        void warehouses.refetch()
      }}
      onSave={(next) => update.mutateAsync(next)}
      groups={rows}
      readOnly={readOnly}
    />
  )
}
