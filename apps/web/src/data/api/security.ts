/**
 * Account security (Settings ▸ Personal ▸ Security) — a stub. The real work (checking the current password,
 * hashing and storing the new one, ending sessions, enrolling a second factor) belongs to the backend's auth
 * service. Nothing here stores or reads a password, a code or a token: the calls validate the shape and resolve.
 * Backend contract: docs/personal-settings/README.md ▸ Security.
 */
import { validatePasswordChange, type PasswordForm } from '@/domain/personal-preferences'

export interface DeviceSession {
  id: string
  /** `This device` for the caller's own session. */
  device: string
  place: string
  lastActive: string
  current: boolean
}

/** Demo sessions (the prototype showed one line: this device, Bengaluru, active now). */
const DEMO_SESSIONS: readonly DeviceSession[] = [
  { id: 'current', device: 'This device', place: 'Tiruvannamalai', lastActive: 'Active now', current: true },
  { id: 's2', device: 'Android phone', place: 'Bengaluru', lastActive: '2 days ago', current: false },
]

let othersSignedOut = false

export const securityApi = {
  /** Backend: `POST /me/password` with the current and new password over TLS; never logged or echoed. */
  changePassword: (form: PasswordForm): Promise<{ ok: true; handledBy: 'backend' }> => {
    const errors = validatePasswordChange(form)
    if (Object.keys(errors).length) return Promise.reject(new Error('Password change failed validation.'))
    return Promise.resolve({ ok: true, handledBy: 'backend' })
  },
  /** Backend: `GET /me/sessions`. */
  sessions: (): Promise<DeviceSession[]> => Promise.resolve(DEMO_SESSIONS.filter((s) => s.current || !othersSignedOut)),
  /** Backend: `DELETE /me/sessions?except=current`. */
  signOutOthers: (): Promise<void> => {
    othersSignedOut = true
    return Promise.resolve()
  },
}
