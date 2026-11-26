import { Switch } from '@/components/ui/switch'
import {
  PEOPLE_MODULES,
  PERM_LEVELS,
  type PermLevel,
  SETTINGS_AREA_MODULES,
  normalizePerms,
  normalizeSettings,
  permLevel,
} from '@/domain/people'
import { EM_DASH } from '@/lib/format'
import { cn } from '@/lib/utils'

const PERM_LABEL: Record<PermLevel, string> = {
  none: 'None',
  read: 'Read',
  write: 'Write',
}

export interface PermissionsEditorProps {
  perms: Record<string, string>
  settings: Record<string, boolean>
  editing: boolean
  /** `perms` / `settings` with their next value. */
  onChange?: (key: 'perms' | 'settings', value: unknown) => void
  /** A link in the heading that resets the access to a preset (e.g. "Apply Sales defaults"). */
  applyDefaults?: { label: string; run: () => void }
  /** Heading text. */
  title?: string
}

/**
 * Module access (none / read / write) and the "Manage settings" right, per module. One component for
 * a person (People ▸ Users) and for a role's defaults (Settings ▸ Team & roles), so both read the same rows.
 */
export function PermissionsEditor({
  perms: rawPerms,
  settings: rawSettings,
  editing,
  onChange,
  applyDefaults,
  title = 'MODULE PERMISSIONS',
}: PermissionsEditorProps) {
  const perms = normalizePerms(rawPerms)
  const settings = normalizeSettings(rawSettings)
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">{title}</span>
        {editing && applyDefaults && (
          <button
            type="button"
            onClick={applyDefaults.run}
            className="border-0 bg-transparent p-0 text-[11.5px] font-medium text-primary hover:underline"
          >
            {applyDefaults.label}
          </button>
        )}
      </div>
      <div className="grid grid-cols-[84px_minmax(0,1fr)_64px] items-end gap-x-2 border-b border-border pb-1 text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground">
        <span>Module</span>
        <span>Access</span>
        <span className="text-center leading-tight">Manage settings</span>
      </div>
      <div className="flex flex-col">
        {PEOPLE_MODULES.map((mod) => {
          const current = permLevel(perms, mod.key)
          // Only modules with a settings area get the right, and it needs access to the module.
          const hasSettingsArea = SETTINGS_AREA_MODULES.has(mod.key)
          const canManageSettings = hasSettingsArea && current !== 'none' && settings[mod.key] === true
          return (
            <div
              key={mod.key}
              data-module={mod.key}
              className="grid grid-cols-[84px_minmax(0,1fr)_64px] items-center gap-x-2 border-b border-dashed border-border py-1.5"
            >
              <span className="truncate text-[12.5px] text-muted-foreground">{mod.label}</span>
              <div
                role="radiogroup"
                aria-label={`${mod.label} permission`}
                className="inline-grid grid-cols-3 rounded-lg border border-border bg-muted/40 p-0.5"
              >
                {PERM_LEVELS.map((level) => {
                  const selected = current === level
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!editing}
                      onClick={() => {
                        onChange?.('perms', { ...perms, [mod.key]: level })
                        if (level === 'none' && settings[mod.key]) onChange?.('settings', { ...settings, [mod.key]: false })
                      }}
                      className={cn(
                        'h-6 rounded-md border-0 px-1.5 text-[11.5px] transition-colors duration-[120ms]',
                        selected
                          ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
                          : 'bg-transparent font-medium text-muted-foreground',
                        editing && !selected && 'hover:text-foreground',
                        !editing && 'cursor-default',
                      )}
                    >
                      {PERM_LABEL[level]}
                    </button>
                  )
                })}
              </div>
              <div className="flex h-[28px] items-center justify-center">
                {editing && hasSettingsArea ? (
                  <Switch
                    disabled={current === 'none'}
                    aria-label={`${mod.label} manage settings`}
                    checked={canManageSettings}
                    onCheckedChange={(checked) => onChange?.('settings', { ...settings, [mod.key]: checked })}
                  />
                ) : (
                  <span
                    className={cn(
                      'text-[12.5px] font-medium',
                      canManageSettings ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {canManageSettings ? 'Yes' : EM_DASH}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
