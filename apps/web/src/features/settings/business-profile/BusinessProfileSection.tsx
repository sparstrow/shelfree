import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { Workspace } from '@/data/api/session'
import { useUpdateWorkspace, useWorkspace } from '@/data/queries/session'
import {
  INDUSTRIES,
  PROFILE_STATES,
  isValidEmail,
  isValidPostal,
  panWarning,
  requiredError,
  stateWarning,
} from '@/domain/business-profile'
import { BUSINESS_PROFILE_HELP } from './help'

const options = (list: readonly string[]) => list.map((value) => ({ value, label: value }))

const GROUPS: readonly SettingsGroup<Workspace>[] = [
  {
    id: 'identity',
    title: 'Identity',
    rows: [
      { key: 'name', label: 'Business name', control: { type: 'text', maxLength: 80 }, validate: (v) => requiredError(String(v), 'a business name') },
      { key: 'legal', label: 'Legal / registered name', control: { type: 'text', maxLength: 120 }, validate: (v) => requiredError(String(v), 'the registered name') },
      { key: 'industry', label: 'Industry', control: { type: 'select', options: options(INDUSTRIES) } },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    rows: [
      {
        key: 'email',
        label: 'Contact email',
        control: { type: 'text', inputMode: 'email' },
        validate: (v) => (String(v).trim() && !isValidEmail(String(v)) ? 'Enter a valid email address.' : null),
      },
      { key: 'phone', label: 'Phone', control: { type: 'text', inputMode: 'tel' } },
    ],
  },
  {
    id: 'address',
    title: 'Registered address',
    rows: [
      { key: 'addr1', label: 'Address', control: { type: 'text' } },
      { key: 'city', label: 'City', control: { type: 'text' } },
      {
        key: 'region',
        label: 'State',
        control: { type: 'select', options: options(PROFILE_STATES) },
        warn: (v, d) => stateWarning(String(v), d.gstin),
      },
      {
        key: 'postal',
        label: 'Postal code',
        control: { type: 'text', inputMode: 'numeric', maxLength: 6 },
        validate: (v) => (String(v).trim() && !isValidPostal(String(v)) ? 'Enter a six-digit PIN code.' : null),
      },
      { key: 'country', label: 'Country', control: { type: 'text' } },
    ],
  },
  {
    id: 'tax',
    title: 'Tax identifiers',
    rows: [
      {
        key: 'gstin',
        label: 'GSTIN',
        control: { type: 'readonly', mono: true, link: { label: 'GST registrations', section: 'ws-gst' } },
      },
      { key: 'pan', label: 'PAN', control: { type: 'text', mono: true, maxLength: 10 }, warn: (v, d) => panWarning(String(v), d.gstin) },
    ],
  },
]

/** Settings ▸ Workspace ▸ Business profile (`/settings/ws-profile`). */
export function BusinessProfileSection({ readOnly }: { readOnly?: boolean } = {}) {
  const workspace = useWorkspace()
  const update = useUpdateWorkspace()
  return (
    <SettingsSection<Workspace>
      id="ws-profile"
      title="Business profile"
      help={BUSINESS_PROFILE_HELP}
      saved={workspace.data}
      isLoading={workspace.isLoading}
      error={workspace.error}
      onRetry={() => void workspace.refetch()}
      onSave={(next) => update.mutateAsync({ ...next, pan: next.pan.trim().toUpperCase() })}
      groups={GROUPS}
      readOnly={readOnly}
    />
  )
}
