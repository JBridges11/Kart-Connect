import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  unit?: string
  error?: string
  hint?: string
}

export function Input({ label, unit, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="font-heading text-xs uppercase tracking-wider text-text-muted"
        >
          {label}
        </label>
      )}
      <div
        className={[
          'relative flex items-center bg-bg-elevated border border-border-color rounded-card transition-all duration-150',
          'focus-within:border-l-2 focus-within:border-accent-primary',
          error ? 'border-accent-secondary' : '',
        ].join(' ')}
      >
        <input
          id={inputId}
          className={[
            'flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none',
            unit ? 'pr-1' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {unit && (
          <span className="px-3 text-xs font-mono text-text-muted select-none whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-accent-secondary">{error}</p>}
    </div>
  )
}
