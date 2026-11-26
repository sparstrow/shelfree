import type { RoleDef } from '@/data/schemas'
import { defaultRoleDefs } from '@/domain/roles'

/** One definition per built-in role, from the built-in presets. */
export function seedRoleDefs(): RoleDef[] {
  return defaultRoleDefs()
}
