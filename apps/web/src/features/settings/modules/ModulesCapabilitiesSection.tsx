import { useMemo } from 'react'
import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import { useSettings } from '@/data/queries/settings'
import { useUpdateModulesCapabilities } from '@/data/queries/workspace-config'
import {
  CAPABILITIES,
  type ModulesCapabilitiesDraft,
  WORKSPACE_MODULES,
  fromDraft,
  isModuleLocked,
  moduleOffNote,
  toDraft,
} from '@/domain/modules-capabilities'
import { MODULES_HELP } from './help'

const GROUPS: readonly SettingsGroup<ModulesCapabilitiesDraft>[] = [
  {
    id: 'modules',
    title: 'Modules',
    rows: WORKSPACE_MODULES.map((m) => ({
      key: `mod.${m.id}`,
      label: m.name,
      control: { type: 'switch' as const },
      default: true,
      locked: () => isModuleLocked(m.id),
      warn: (value: boolean) => (value ? null : moduleOffNote(m.id)),
    })),
  },
  {
    id: 'capabilities',
    title: 'Capabilities',
    rows: CAPABILITIES.map((c) => ({
      key: `cap.${c.key}`,
      label: c.label,
      control: { type: 'switch' as const },
      default: c.default,
    })),
  },
]

/** Settings ▸ Workspace ▸ Modules & capabilities (`/settings/ws-modules`). */
export function ModulesCapabilitiesSection({ readOnly }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const update = useUpdateModulesCapabilities()
  const data = settings.data
  const saved = useMemo(
    () => (data ? toDraft(data.modules, data.capabilities, data.salesPricing.enabled) : undefined),
    [data],
  )
  return (
    <SettingsSection<ModulesCapabilitiesDraft>
      id="ws-modules"
      title="Modules & capabilities"
      help={MODULES_HELP}
      saved={saved}
      isLoading={settings.isLoading}
      error={settings.error}
      onRetry={() => void settings.refetch()}
      onSave={(next) => update.mutateAsync(fromDraft(next))}
      groups={GROUPS}
      readOnly={readOnly}
    />
  )
}
