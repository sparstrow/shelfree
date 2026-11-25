import type { HelpMap } from '@/components/help/types'
import { CAPABILITIES, CAPABILITIES_IN_USE, WORKSPACE_MODULES } from '@/domain/modules-capabilities'

/** Settings ▸ Modules & capabilities — quiet-help text (prototype `q.mod.*`). Keys: `page`, group ids, `mod.<id>`, `cap.<key>`. */
export const MODULES_HELP: HelpMap = {
  page: {
    title: 'Modules & capabilities',
    body: 'Turn off what you don’t use to keep the app minimal. A module that is off disappears from the sidebar, the Departments page, page search and Settings, for everyone.',
  },
  modules: {
    title: 'Modules',
    body: 'Hide whole modules from the sidebar. Home and Warehouse are always on. Switching a module off keeps its data; switch it back on to see it again.',
  },
  capabilities: {
    title: 'Capabilities',
    body: 'Extra depth for a bigger operation. Each capability that is off stays out of the daily screens and is only found here.',
  },
  ...Object.fromEntries(
    WORKSPACE_MODULES.map((m) => [
      `mod.${m.id}`,
      {
        title: m.name,
        body: m.locked
          ? `${m.name} is always on.`
          : `Show ${m.name} in the sidebar, Departments, page search and Settings.`,
      },
    ]),
  ),
  ...Object.fromEntries(
    CAPABILITIES.map((c) => [
      `cap.${c.key}`,
      {
        title: c.label,
        body: c.desc,
        ...(CAPABILITIES_IN_USE.has(c.key)
          ? {}
          : { note: 'No screen reads this switch yet; it is saved for when the feature ships.' }),
      },
    ]),
  ),
}
