import type { ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import type { ModuleId } from './nav'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

function Svg({
  size = 19,
  strokeWidth = 1.9,
  className,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('shrink-0', className)}
      {...rest}
    >
      {children}
    </svg>
  )
}

const MODULE_GLYPHS: Record<ModuleId | 'settings' | 'departments', ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h5v-6h4v6h5V9" />
    </>
  ),
  finance: (
    <>
      <line x1="3" y1="21" x2="21" y2="21" />
      <polygon points="12 3 20 8 4 8" />
      <line x1="6" y1="11" x2="6" y2="17" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
      <line x1="18" y1="11" x2="18" y2="17" />
    </>
  ),
  sales: (
    <>
      <path d="M12.6 2.6a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.4 8.4a2 2 0 0 0 2.8 0l6.4-6.4a2 2 0 0 0 0-2.8z" />
      <circle cx="7.3" cy="7.3" r="1.2" />
    </>
  ),
  purchasing: (
    <>
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="18" cy="20" r="1.3" />
      <path d="M2 3h3l2.2 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
    </>
  ),
  warehouse: (
    <>
      <path d="m21 8-9-5-9 5v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  production: (
    <>
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M7 18h.01" />
      <path d="M12 18h.01" />
      <path d="M17 18h.01" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.3a3 3 0 0 1 0 5.4" />
      <path d="M19.5 20a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  notes: (
    <>
      <path d="M15.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9.5z" />
      <path d="M15 3v6h6" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  departments: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
    </>
  ),
}

/** The 19 px module glyph used in the sidebar rail and workspace tabs. */
export function ModuleIcon({
  id,
  ...props
}: IconProps & { id: ModuleId | 'settings' | 'departments' }) {
  return <Svg {...props}>{MODULE_GLYPHS[id]}</Svg>
}

/** A single-path page icon (path data from the nav registry). */
export function PathIcon({ d, size = 15, strokeWidth = 1.7, ...props }: IconProps & { d: string }) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} {...props}>
      <path d={d} />
    </Svg>
  )
}
