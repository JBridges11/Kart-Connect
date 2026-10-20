import type { ReactNode } from 'react'
import { UtcClock } from '@/components/ui/UtcClock'

interface TopBarProps {
  title: string
  action?: ReactNode
  leftContent?: ReactNode
}

export function TopBar({ title, action, leftContent }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border-color bg-bg-card flex-shrink-0 gap-4 safe-area-top safe-area-left safe-area-right">
      <div className="flex items-center gap-4 min-w-0">
        {title && (
          <h1 className="font-heading text-xl font-bold tracking-wide uppercase text-text-primary truncate">
            {title}
          </h1>
        )}
        {leftContent && <div>{leftContent}</div>}
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
        {action && <div>{action}</div>}
        <UtcClock />
      </div>
    </header>
  )
}
