import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { Me } from '@/data/api/session'
import { NOTIFY_CHANNEL_OPTIONS } from '@/domain/personal-preferences'
import { NOTIFICATIONS_HELP } from './help'
import { useMeBlock } from './use-me-block'

const KEYS = ['notifyLowStock', 'notifyPO', 'notifyMentions', 'notifyDigest', 'notifyChannel'] as const
type Block = Pick<Me, (typeof KEYS)[number]>

const GROUPS: readonly SettingsGroup<Block>[] = [
  {
    id: 'alerts',
    title: 'Alerts',
    rows: [
      { key: 'notifyLowStock', label: 'Low-stock alerts', control: { type: 'switch' }, default: true },
      { key: 'notifyPO', label: 'Purchase order updates', control: { type: 'switch' }, default: true },
      { key: 'notifyMentions', label: 'Mentions', control: { type: 'switch' }, default: true },
      { key: 'notifyDigest', label: 'Weekly digest', control: { type: 'switch' }, default: false },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery',
    rows: [
      {
        key: 'notifyChannel',
        label: 'Delivery channel',
        control: { type: 'select', options: NOTIFY_CHANNEL_OPTIONS.map((value) => ({ value, label: value })) },
        default: 'In-app + email',
      },
    ],
  },
]

/**
 * Settings ▸ Personal ▸ Notifications (`/settings/me-notifications`). Stored per user; no notification is sent yet
 * (the backend's notifier reads these flags).
 */
export function NotificationsSection() {
  const block = useMeBlock(KEYS)
  return (
    <SettingsSection<Block>
      id="me-notifications"
      title="Notifications"
      help={NOTIFICATIONS_HELP}
      saved={block.saved}
      isLoading={block.isLoading}
      error={block.error}
      onRetry={block.onRetry}
      onSave={(next) => block.onSave(next)}
      groups={GROUPS}
    />
  )
}
