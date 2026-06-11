import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="font-heading text-xs uppercase tracking-wider text-text-muted"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={3}
        className={[
          'bg-bg-elevated border border-border-color rounded-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none resize-none transition-all duration-150',
          'focus:border-l-2 focus:border-accent-primary',
          error ? 'border-accent-secondary' : '',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-accent-secondary">{error}</p>}
    </div>
  )
}
