/** Status → tone. Status is always shown as colour + text (never colour alone). */
export type Tone = 'ok' | 'bad' | 'info' | 'warn' | 'neutral'

const TONES: Record<string, Tone> = {
  Expiring: 'warn',
  Scheduled: 'info',
  Expired: 'neutral',
  Priced: 'ok',
  'No price': 'warn',
  'Below cost': 'bad',
  Active: 'ok',
  'On hold': 'bad',
  Blocked: 'bad',
  Overdue: 'bad',
  Prospect: 'info',
  'Low stock': 'warn',
  'Out of stock': 'bad',
  Healthy: 'ok',
  Draft: 'neutral',
  Open: 'info',
  Issued: 'info',
  'Partially received': 'warn',
  Received: 'ok',
  Posted: 'ok',
  Closed: 'ok',
  Cancelled: 'bad',
  Archived: 'neutral',
  Planned: 'neutral',
  Released: 'info',
  'In progress': 'warn',
  Finished: 'ok',
  Assembly: 'info',
  Production: 'warn',
  System: 'info',
  Pending: 'info',
  Suspended: 'bad',
  'On leave': 'warn',
  Terminated: 'neutral',
  Contractor: 'info',
  Valid: 'ok',
  Invalid: 'bad',
}

export function statusTone(label: string): Tone {
  return TONES[label] ?? 'neutral'
}
