import type { ReactNode } from 'react'
import { type Tone, statusTone } from '@/domain/status'
import { cn } from '@/lib/utils'

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  bad: 'bg-bad-bg text-bad-fg',
  info: 'bg-info-bg text-info-fg',
  warn: 'bg-warn-bg text-warn-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
}

/** Status badge: tone colour + the status text (never colour alone). */
export function StatusPill({
  label,
  tone,
  icon,
  className,
}: {
  label: string
  /** Overrides the tone looked up from the label. */
  tone?: Tone
  /** Optional leading icon rendered alongside the status label. */
  icon?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-[5px] rounded-full px-[9px] text-[11.5px] font-semibold whitespace-nowrap',
        TONE_CLASS[tone ?? statusTone(label)],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  )
}
