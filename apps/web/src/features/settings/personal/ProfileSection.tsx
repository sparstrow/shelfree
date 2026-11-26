import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import { normalizeProfile, validateProfile } from '@/domain/personal-preferences'
import { PROFILE_HELP } from './help'
import { useMeBlock } from './use-me-block'

const KEYS = ['name', 'title', 'email', 'phone'] as const
type Block = { name: string; title: string; email: string; phone: string }

const GROUPS: readonly SettingsGroup<Block>[] = [
  {
    id: 'details',
    title: 'Your details',
    rows: [
      { key: 'name', label: 'Full name', control: { type: 'text', maxLength: 80 } },
      { key: 'title', label: 'Job title', control: { type: 'text', maxLength: 80 } },
      { key: 'email', label: 'Email', control: { type: 'text', inputMode: 'email', maxLength: 120 } },
      { key: 'phone', label: 'Phone', control: { type: 'text', inputMode: 'tel', maxLength: 24 } },
    ],
  },
]

/**
 * Settings ▸ Personal ▸ Profile (`/settings/me-profile`). Editable by every user, Member included.
 * The name and email are the same ones as the signed-in user's People ▸ Users record: saving mirrors them there
 * (`sessionApi.patchMe`), so there is one set of details. "Change photo" is not shown: there is no file storage yet.
 */
export function ProfileSection() {
  const block = useMeBlock(KEYS)
  return (
    <SettingsSection<Block>
      id="me-profile"
      title="Profile"
      help={PROFILE_HELP}
      saved={block.saved}
      isLoading={block.isLoading}
      error={block.error}
      onRetry={block.onRetry}
      onSave={(next) => block.onSave(normalizeProfile(next))}
      groups={GROUPS}
      validate={validateProfile}
    />
  )
}
