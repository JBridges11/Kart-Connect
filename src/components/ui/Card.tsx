import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  highlight?: boolean
}

export function Card({ children, className = '', onClick, highlight = false }: CardProps) {
  const interactive = onClick !== undefined

  return (
    <div
      onClick={onClick}
      className={[
        'bg-bg-card border rounded-card p-4',
        highlight ? 'border-accent-primary/50' : 'border-border-color',
        interactive ? 'cursor-pointer hover:bg-bg-elevated transition-colors duration-150' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
