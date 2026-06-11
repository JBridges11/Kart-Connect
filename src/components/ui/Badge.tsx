type BadgeVariant = 'positive' | 'negative' | 'neutral' | 'info' | 'warning'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  positive: 'text-green-400 bg-green-400/10 border-green-400/20',
  negative: 'text-accent-secondary bg-accent-secondary/10 border-accent-secondary/20',
  neutral:  'text-text-muted bg-bg-elevated border-border-color',
  info:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  warning:  'text-accent-primary bg-accent-primary/10 border-accent-primary/20',
}

export function Badge({ label, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
