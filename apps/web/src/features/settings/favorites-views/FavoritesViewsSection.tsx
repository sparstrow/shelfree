import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { FavoritesConfigBlock } from '@/data/api/settings'
import { useSettings } from '@/data/queries/settings'
import { useUpdateFavoritesConfig } from '@/data/queries/workspace-config'
import {
  DEFAULT_FAVORITES_CONFIG as D,
  FAVORITES_CAP_MIN,
  VIEW_SHARE_ROLES,
  VIEW_SHARE_ROLE_LABELS,
  favoritesCapError,
} from '@/domain/favorites'
import { FAVORITES_VIEWS_HELP } from './help'

const GROUPS: readonly SettingsGroup<FavoritesConfigBlock>[] = [
  {
    id: 'pins',
    title: 'Pinned pages',
    rows: [
      { key: 'enabled', label: 'Pinned sidebar section', control: { type: 'switch' }, default: D.enabled },
      {
        key: 'cap',
        label: 'Pins shown before “Show all”',
        control: { type: 'number', step: '1', min: FAVORITES_CAP_MIN },
        default: D.cap,
        validate: (v) => favoritesCapError(Number(v)),
        locked: (d) => !d.enabled,
      },
    ],
  },
  {
    id: 'views',
    title: 'Saved views',
    rows: [
      {
        key: 'shareRole',
        label: 'Who can share a view with the team',
        control: { type: 'select', options: VIEW_SHARE_ROLES.map((value) => ({ value, label: VIEW_SHARE_ROLE_LABELS[value] })) },
        default: D.shareRole,
      },
    ],
  },
]

/** Settings ▸ Workspace ▸ Favorites & views (`/settings/cfg-favorites`). The per-person part is `me-favorites` (run 2.6). */
export function FavoritesViewsSection({ readOnly }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const update = useUpdateFavoritesConfig()
  return (
    <SettingsSection<FavoritesConfigBlock>
      id="cfg-favorites"
      title="Favorites & views"
      help={FAVORITES_VIEWS_HELP}
      saved={settings.data?.favoritesConfig}
      isLoading={settings.isLoading}
      error={settings.error}
      onRetry={() => void settings.refetch()}
      onSave={(next) => update.mutateAsync(next)}
      groups={GROUPS}
      readOnly={readOnly}
    />
  )
}
