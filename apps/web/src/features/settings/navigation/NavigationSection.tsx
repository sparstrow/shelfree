import { Link } from '@tanstack/react-router'
import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { NavigationConfig } from '@/data/api/settings'
import { useSettings } from '@/data/queries/settings'
import { useUpdateNavigation } from '@/data/queries/workspace-config'
import { DEFAULT_NAVIGATION_SETTINGS as D } from '@/domain/navigation-settings'
import { NAVIGATION_HELP } from './help'

const linkClass =
  'hover-lift inline-flex h-[34px] items-center rounded-[9px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground no-underline hover:bg-tint-12'

const GROUPS: readonly SettingsGroup<NavigationConfig>[] = [
  {
    id: 'pages',
    title: 'Departments page',
    rows: [
      { key: 'departments', label: 'Departments page', control: { type: 'switch' }, default: D.departments },
      {
        key: 'jumpBackIn',
        label: '“Jump back in” row',
        control: { type: 'switch' },
        default: D.jumpBackIn,
        locked: (d) => !d.departments,
      },
      {
        key: 'showUnbuilt',
        label: 'List pages that aren’t built yet',
        control: { type: 'switch' },
        default: D.showUnbuilt,
        locked: (d) => !d.departments,
      },
    ],
    footer: () => (
      <div className="mt-3 flex flex-wrap gap-2.5 border-t border-dashed border-border pt-3">
        <Link to="/settings/$section" params={{ section: 'ws-modules' }} className={linkClass}>
          Modules &amp; capabilities
        </Link>
        <Link to="/settings/$section" params={{ section: 'terminology' }} className={linkClass}>
          Terminology
        </Link>
      </div>
    ),
  },
]

/** Settings ▸ Workspace ▸ Navigation (`/settings/cfg-nav`). */
export function NavigationSection({ readOnly }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const update = useUpdateNavigation()
  return (
    <SettingsSection<NavigationConfig>
      id="cfg-nav"
      title="Navigation"
      help={NAVIGATION_HELP}
      saved={settings.data?.navigation}
      isLoading={settings.isLoading}
      error={settings.error}
      onRetry={() => void settings.refetch()}
      onSave={(next) => update.mutateAsync(next)}
      groups={GROUPS}
      readOnly={readOnly}
    />
  )
}
