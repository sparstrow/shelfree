import { describe, expect, it } from 'vitest'
import { type SettingsActor, canEditArea, canViewArea } from './settings-permissions'

const makeActor = (
  role: SettingsActor['role'],
  perms: Record<string, string> = {},
  settings: Record<string, boolean> = {},
): SettingsActor => ({
  role,
  user: { perms, settings },
})

describe('settings permissions', () => {
  it('allows owner and admin to view and edit every area kind', () => {
    for (const role of ['owner', 'admin'] as const) {
      const actor = makeActor(role, { purchasing: 'none' }, { purchasing: false })
      expect(canViewArea(actor, 'workspace')).toBe(true)
      expect(canEditArea(actor, 'workspace')).toBe(true)
      expect(canViewArea(actor, 'shared')).toBe(true)
      expect(canEditArea(actor, 'shared')).toBe(true)
      expect(canViewArea(actor, 'module', 'purchasing')).toBe(true)
      expect(canEditArea(actor, 'module', 'purchasing')).toBe(true)
      expect(canViewArea(actor, 'personal')).toBe(true)
      expect(canEditArea(actor, 'personal')).toBe(true)
    }
  })

  it('always allows personal settings for members and even without a user record', () => {
    const member = makeActor('member')
    expect(canViewArea(member, 'personal')).toBe(true)
    expect(canEditArea(member, 'personal')).toBe(true)
    expect(canViewArea({ role: 'member', user: null }, 'personal')).toBe(true)
    expect(canEditArea({ role: 'member', user: null }, 'personal')).toBe(true)
  })

  it('denies workspace and shared areas to members', () => {
    const member = makeActor('member', { purchasing: 'write' }, { purchasing: true })
    expect(canViewArea(member, 'workspace')).toBe(false)
    expect(canEditArea(member, 'workspace')).toBe(false)
    expect(canViewArea(member, 'shared')).toBe(false)
    expect(canEditArea(member, 'shared')).toBe(false)
  })

  it('requires non-none module perm to view module settings and Manage settings right to edit', () => {
    const readOnly = makeActor('member', { purchasing: 'read' }, { purchasing: false })
    expect(canViewArea(readOnly, 'module', 'purchasing')).toBe(true)
    expect(canEditArea(readOnly, 'module', 'purchasing')).toBe(false)

    const writeNoSettings = makeActor('member', { purchasing: 'write' }, { purchasing: false })
    expect(canViewArea(writeNoSettings, 'module', 'purchasing')).toBe(true)
    expect(canEditArea(writeNoSettings, 'module', 'purchasing')).toBe(false)

    const readWithSettings = makeActor('member', { purchasing: 'read' }, { purchasing: true })
    expect(canViewArea(readWithSettings, 'module', 'purchasing')).toBe(true)
    expect(canEditArea(readWithSettings, 'module', 'purchasing')).toBe(true)

    const writeWithSettings = makeActor('member', { purchasing: 'write' }, { purchasing: true })
    expect(canViewArea(writeWithSettings, 'module', 'purchasing')).toBe(true)
    expect(canEditArea(writeWithSettings, 'module', 'purchasing')).toBe(true)
  })

  it('denies module view and edit when module permission is none or missing, or moduleId is missing', () => {
    const noAccessEvenWithFlag = makeActor('member', { purchasing: 'none' }, { purchasing: true })
    expect(canViewArea(noAccessEvenWithFlag, 'module', 'purchasing')).toBe(false)
    expect(canEditArea(noAccessEvenWithFlag, 'module', 'purchasing')).toBe(false)

    const missingPerm = makeActor('member', {}, { purchasing: true })
    expect(canViewArea(missingPerm, 'module', 'purchasing')).toBe(false)
    expect(canEditArea(missingPerm, 'module', 'purchasing')).toBe(false)

    const noModule = makeActor('member', { purchasing: 'write' }, { purchasing: true })
    expect(canViewArea(noModule, 'module')).toBe(false)
    expect(canEditArea(noModule, 'module')).toBe(false)
    expect(canViewArea({ role: 'member', user: null }, 'module', 'purchasing')).toBe(false)
    expect(canEditArea({ role: 'member', user: null }, 'module', 'purchasing')).toBe(false)
  })
})
