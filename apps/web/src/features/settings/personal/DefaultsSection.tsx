import { useMemo } from 'react'
import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { Me } from '@/data/api/session'
import { useList } from '@/data/queries'
import { useMe } from '@/data/queries/session'
import { LANDING_OPTIONS, MIN_ASSEMBLY_QTY, USE_WORKSPACE } from '@/domain/personal-preferences'
import { DEFAULTS_HELP } from './help'
import { useMeBlock } from './use-me-block'

const KEYS = ['defLanding', 'defLocation', 'defAssemblyLoc', 'defAssemblyQty', 'showTaxSplit'] as const
type Block = Pick<Me, (typeof KEYS)[number]>

/**
 * Settings ▸ Personal ▸ Personal defaults (`/settings/me-defaults`). The landing page opens at `/`, the default
 * location pre-fills new employees, the assembly pair pre-fills a new assembly order (`resolveAssemblyDefaults`),
 * and the tax split switch is stored (the purchase document lines do not read it yet: gap G-038).
 */
export function DefaultsSection() {
  const block = useMeBlock(KEYS)
  const warehouses = useList('warehouses')
  const stored = useMe().data

  const groups = useMemo<readonly SettingsGroup<Block>[]>(() => {
    const sites = warehouses.data ?? []
    // Whatever is stored stays in the list, even if that site is gone, so a pick never disappears.
    const codes = [...new Set([...sites.map((w) => w.code), stored?.defLocation].filter((c): c is string => !!c))]
    const buildSites = [
      { value: USE_WORKSPACE, label: 'Use the workspace default' },
      ...sites.filter((w) => w.status !== 'inactive' || w.id === stored?.defAssemblyLoc).map((w) => ({ value: w.id, label: w.name })),
    ]
    return [
      {
        id: 'start',
        title: 'Start',
        rows: [
          {
            key: 'defLanding',
            label: 'Landing page',
            control: { type: 'select', options: LANDING_OPTIONS.map((value) => ({ value, label: value })) },
            default: 'Purchasing · Purchase Orders',
          },
          {
            key: 'defLocation',
            label: 'Default location',
            control: { type: 'select', options: codes.map((value) => ({ value, label: value })) },
          },
        ],
      },
      {
        id: 'assembly',
        title: 'Assembly orders',
        rows: [
          {
            key: 'defAssemblyLoc',
            label: 'Build at',
            control: { type: 'select', options: buildSites },
            default: USE_WORKSPACE,
            defaultText: 'Use the workspace default',
          },
          {
            key: 'defAssemblyQty',
            label: 'Default quantity',
            control: { type: 'number', step: '1', min: MIN_ASSEMBLY_QTY },
            default: 1,
            validate: (v) => (Number.isInteger(Number(v)) && Number(v) >= MIN_ASSEMBLY_QTY ? null : 'Enter a whole number from 1.'),
          },
        ],
      },
      {
        id: 'documents',
        title: 'Documents',
        rows: [{ key: 'showTaxSplit', label: 'Show tax split columns on document lines', control: { type: 'switch' }, default: false }],
      },
    ]
  }, [warehouses.data, stored?.defLocation, stored?.defAssemblyLoc])

  return (
    <SettingsSection<Block>
      id="me-defaults"
      title="Personal defaults"
      help={DEFAULTS_HELP}
      saved={block.saved}
      isLoading={block.isLoading || warehouses.isLoading}
      error={block.error ?? warehouses.error}
      onRetry={block.onRetry}
      onSave={(next) => block.onSave(next)}
      groups={groups}
    />
  )
}
