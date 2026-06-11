import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { label: string; value: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className = '', id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
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
        <select
          id={selectId}
          className={[
            'w-full appearance-none bg-transparent px-3 py-2 text-sm text-text-primary outline-none cursor-pointer pr-8',
            className,
          ].join(' ')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-bg-elevated">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 text-text-muted pointer-events-none" />
      </div>
      {error && <p className="text-xs text-accent-secondary">{error}</p>}
    </div>
  )
}
