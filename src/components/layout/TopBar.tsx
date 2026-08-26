import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  action?: ReactNode
}

export function TopBar({ title, action }: TopBarProps) {
  if (!title && !action) return null
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border-color bg-bg-card flex-shrink-0">
      {title && (
        <h1 className="font-heading text-xl font-bold tracking-wide uppercase text-text-primary">
          {title}
        </h1>
      )}
      {action && <div className={title ? '' : 'ml-auto'}>{action}</div>}
    </header>
  )
}
