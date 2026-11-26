import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Personal — quiet-help text (prototype `q.meprof.*`, `q.app.*`, `q.notif.*`, `q.lang.*`, `q.mdef.*`, `q.sec.*`, `q.mefav.*`). */

export const PROFILE_HELP: HelpMap = {
  page: { title: 'Profile', body: 'Your personal details, visible to your team.' },
  details: {
    title: 'Your details',
    body: 'Shown next to your name wherever people see who did something. Your name and email are the same ones on your People ▸ Users record, so changing them here changes them there.',
  },
  name: { title: 'Full name', body: 'How your name appears on notes, documents and the team list.' },
  title: { title: 'Job title', body: 'Your role at the business, for example Finance Manager.' },
  email: {
    title: 'Email',
    body: 'Your sign-in and where notifications are sent.',
    note: 'Personal data: it is masked in lists and only shown in full to you and to admins.',
  },
  phone: {
    title: 'Phone',
    body: 'Optional. Shown to teammates on your profile.',
    note: 'Personal data: it is masked in lists and only shown in full to you and to admins.',
  },
}

export const APPEARANCE_HELP: HelpMap = {
  page: {
    title: 'Appearance',
    body: 'How the app looks for you. These are your personal preferences. Accent colour, corner style and surface palette are available in the Tweaks panel.',
  },
  look: { title: 'Look', body: 'Changes show as you pick them; Save keeps them for next time.' },
  theme: {
    title: 'Theme',
    body: 'Dark or light. Personal — it only changes how the app looks for you.',
    options: [
      { value: 'dark', label: 'Dark', desc: 'Dark surfaces. The default.' },
      { value: 'light', label: 'Light', desc: 'Light surfaces.' },
      { value: 'system', label: 'Match my device', desc: 'Follows your computer or phone and changes with it, for example at sunset.' },
    ],
  },
  defDensity: {
    title: 'Default grid density',
    body: 'Row height applied to data tables.',
    options: [
      { value: 'compact', label: 'Compact', desc: 'Tighter rows: more of the list on screen.' },
      { value: 'comfortable', label: 'Comfortable', desc: 'Taller rows with more air.' },
    ],
    note: 'Applies to tables when they open. Switch a single table from its own toolbar, or keep that in a saved view.',
  },
}

export const NOTIFICATIONS_HELP: HelpMap = {
  page: { title: 'Notifications', body: "Choose what you're alerted about and where." },
  alerts: { title: 'Alerts', body: 'The things the app can tell you about. Each can be turned off.' },
  delivery: { title: 'Delivery', body: 'Where the alerts reach you.' },
  notifyLowStock: { title: 'Low-stock alerts', body: 'When an item drops below its reorder point.' },
  notifyPO: { title: 'Purchase order updates', body: "Status changes on POs you're the buyer for." },
  notifyMentions: { title: 'Mentions', body: 'When someone @mentions you in a note.' },
  notifyDigest: { title: 'Weekly digest', body: 'A Monday summary of activity.' },
  notifyChannel: {
    title: 'Delivery channel',
    body: 'Where alerts reach you.',
    options: [
      { value: 'In-app only', label: 'In-app only', desc: 'Alerts appear in the app and nowhere else.' },
      { value: 'In-app + email', label: 'In-app + email', desc: 'In the app, and a copy to your email.' },
      { value: 'Email only', label: 'Email only', desc: 'Only an email. Nothing in the app.' },
    ],
  },
}

export const LANGUAGE_HELP: HelpMap = {
  page: { title: 'Language & region', body: 'Your personal language and locale — separate from the workspace defaults.' },
  language: { title: 'Language', body: 'The language the app speaks to you. Only English is translated for now; the others are saved for when more arrive.' },
  locale: { title: 'Locale', body: 'The regional conventions that apply to you, such as the order of day and month.' },
  formats: { title: 'Formats', body: 'Leave these on the workspace setting unless you want your own. They only change what you see.' },
  dateFmt: {
    title: 'Date format',
    body: 'How dates read to you. “Workspace default” follows Settings ▸ Regional & format.',
    note: 'Documents and exports keep the workspace format.',
  },
  numFmt: {
    title: 'Number format',
    body: 'How digits are grouped for you. “Workspace default” follows Settings ▸ Regional & format.',
    note: 'Documents and exports keep the workspace format.',
  },
}

export const DEFAULTS_HELP: HelpMap = {
  page: { title: 'Personal defaults', body: 'Where the app starts and what it assumes for you.' },
  start: { title: 'Start', body: 'Where the app opens and the place new records start at.' },
  defLanding: {
    title: 'Landing page',
    body: 'The page the app opens on when you sign in. Departments only opens while that page is switched on in Settings ▸ Navigation.',
  },
  defLocation: { title: 'Default location', body: 'The place new records, such as employees, start at. Pick another on the record whenever you need to.' },
  assembly: { title: 'Assembly orders', body: 'What a new assembly order is prefilled with when you raise one.' },
  defAssemblyLoc: {
    title: 'Build at',
    body: 'The place a new assembly order builds at. “Use the workspace default” follows Settings ▸ Assembly & production.',
  },
  defAssemblyQty: { title: 'Default quantity', body: 'How many a new assembly order starts with. A whole number from 1.' },
  documents: { title: 'Documents', body: 'How document lines are laid out for you.' },
  showTaxSplit: {
    title: 'Show tax split columns on document lines',
    body: 'Adds CGST, SGST / UTGST and IGST amount columns to PO and bill lines. Off shows one compact tax tag per line.',
  },
}

export const SECURITY_HELP: HelpMap = {
  page: { title: 'Security', body: 'Protect your account.' },
  password: {
    title: 'Password',
    body: 'Change the password you sign in with. You will be asked for the current one.',
    note: 'Handled by the sign-in service; Shelfree never keeps your password in the browser.',
  },
  twoFA: { title: 'Two-factor authentication', body: 'An extra code at sign-in.', note: 'Turning it off lowers account security.' },
  sessions: {
    title: 'Active sessions',
    body: 'The devices you are signed in on. Signing out the others ends their sessions; this device stays signed in.',
  },
}

export const FAVORITES_PERSONAL_HELP: HelpMap = {
  page: {
    title: 'Favorites & views',
    body: 'Yours alone — what you pin to the sidebar, the filtered views you save, and which view a page opens with. Nobody else sees these.',
  },
  pins: { title: 'Pinned in the sidebar', body: 'Pages and saved views pinned to your sidebar, in the order they show. Remove or reorder them here or in the sidebar.' },
  views: { title: 'My saved views', body: 'Filtered views you saved on lists. Make one the default to have its page open with it.' },
  recents: { title: 'Show recents in page search', body: 'Lists the last pages and records you opened when the search box is empty.' },
}
