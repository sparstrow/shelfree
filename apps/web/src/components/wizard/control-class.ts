import { cn } from '@/lib/utils'

/** Classes of a text input, number input or select inside a wizard step. */
export const wizardControlClass = (invalid?: boolean): string =>
  cn(
    'h-8 w-full min-w-0 rounded-lg border bg-transparent px-[10px] text-[13px] text-foreground outline-none transition-colors duration-[140ms] placeholder:text-muted-foreground focus:border-ring disabled:opacity-50',
    invalid ? 'border-bad-fg' : 'border-input',
  )
