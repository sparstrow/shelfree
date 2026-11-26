import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { HelpTarget } from '@/components/help/HelpTarget'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useChangePassword, useSessions, useSignOutOtherSessions } from '@/data/queries/security'
import { useMe, useUpdateMe } from '@/data/queries/session'
import { MIN_PASSWORD_LENGTH, type PasswordForm, validatePasswordChange } from '@/domain/personal-preferences'
import { cn } from '@/lib/utils'
import { SECURITY_HELP as HELP } from './help'

const rowClass = 'flex items-center gap-3 border-b border-dashed border-border py-2.5 last:border-b-0'
const inputClass = (bad: boolean) =>
  cn(
    'h-8 w-full rounded-lg border bg-transparent px-2.5 text-[13px] outline-none focus:border-ring',
    bad ? 'border-bad-fg' : 'border-input hover:border-ring/60',
  )

const EMPTY: PasswordForm = { current: '', next: '', confirm: '' }
const FIELDS: readonly { key: keyof PasswordForm; label: string }[] = [
  { key: 'current', label: 'Current password' },
  { key: 'next', label: 'New password' },
  { key: 'confirm', label: 'Confirm new password' },
]

/** The change-password dialog. The values live in this component's state only until submit; nothing is stored. */
function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const change = useChangePassword()
  const [form, setForm] = useState<PasswordForm>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const close = () => {
    setForm(EMPTY)
    setErrors({})
    onClose()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found = validatePasswordChange(form)
    setErrors(found)
    if (Object.keys(found).length) return
    change.mutate(form, {
      onSuccess: () => {
        close()
        toast.success('Password change sent to the sign-in service')
      },
      onError: () => toast.error('Could not change the password. Try again.'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Use at least {MIN_PASSWORD_LENGTH} characters with upper case, lower case and a number.</DialogDescription>
          </DialogHeader>
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="grid gap-1">
              <label htmlFor={`pw-${key}`} className="text-[12.5px] text-muted-foreground">
                {label}
              </label>
              <input
                id={`pw-${key}`}
                type="password"
                autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `pw-${key}-error` : undefined}
                className={inputClass(!!errors[key])}
              />
              {errors[key] && (
                <span id={`pw-${key}-error`} role="alert" className="text-[12px] text-bad-fg">
                  {errors[key]}
                </span>
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={change.isPending}>
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Settings ▸ Personal ▸ Security (`/settings/me-security`). UI only: nothing sensitive is stored in the client.
 * Password change validates and is then handled by the backend (`securityApi`, a stub that stores nothing);
 * sessions are demo rows; the two-factor switch keeps a flag (`me.twoFA`). See docs/personal-settings/README.md.
 */
export function SecuritySection() {
  const me = useMe()
  const updateMe = useUpdateMe()
  const sessions = useSessions()
  const signOut = useSignOutOtherSessions()
  const [pwOpen, setPwOpen] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const twoFA = me.data?.twoFA === true
  const others = (sessions.data ?? []).filter((s) => !s.current)

  return (
    <SettingsPage
      title="Security"
      help={HELP.page}
      isLoading={me.isLoading || sessions.isLoading}
      error={me.error ?? sessions.error}
      onRetry={() => void me.refetch()}
    >
      <section aria-label="Sign-in" className="rounded-xl border border-border bg-card px-5 py-2">
        <div data-row="password" className={rowClass}>
          <span className="min-w-0 flex-1">
            <HelpTarget help={HELP.password} label="Password">
              <span className="text-[13px] font-semibold">Password</span>
            </HelpTarget>
            <span className="block text-[11.5px] text-muted-foreground">Last changed 3 months ago.</span>
          </span>
          <Button variant="outline" className="hover-lift" onClick={() => setPwOpen(true)}>
            Change password
          </Button>
        </div>

        <div data-row="twoFA" className={rowClass}>
          <span className="min-w-0 flex-1">
            <HelpTarget help={HELP.twoFA} label="Two-factor authentication">
              <label htmlFor="me-security-2fa" className="text-[13px] font-semibold">
                Two-factor authentication
              </label>
            </HelpTarget>
          </span>
          <Switch
            id="me-security-2fa"
            checked={twoFA}
            onCheckedChange={(next) => (next ? updateMe.mutate({ twoFA: true }) : setConfirmOff(true))}
          />
        </div>

        <div data-row="sessions" className={rowClass}>
          <span className="min-w-0 flex-1">
            <HelpTarget help={HELP.sessions} label="Active sessions">
              <span className="text-[13px] font-semibold">Active sessions</span>
            </HelpTarget>
            <ul className="m-0 list-none p-0">
              {(sessions.data ?? []).map((s) => (
                <li key={s.id} className="text-[11.5px] text-muted-foreground">
                  {s.device} · {s.place} · {s.lastActive.toLowerCase()}.
                </li>
              ))}
            </ul>
          </span>
          <Button
            variant="outline"
            className="hover-lift"
            disabled={others.length === 0 || signOut.isPending}
            onClick={() =>
              signOut.mutate(undefined, { onSuccess: () => toast.success('Signed out of your other sessions') })
            }
          >
            Sign out others
          </Button>
        </div>
      </section>

      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />

      <Dialog open={confirmOff} onOpenChange={setConfirmOff}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Turn off two-factor authentication?</DialogTitle>
            <DialogDescription>Signing in will need only your password, which makes your account easier to take over.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOff(false)}>
              Keep it on
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                updateMe.mutate({ twoFA: false })
                setConfirmOff(false)
              }}
            >
              Turn off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  )
}
