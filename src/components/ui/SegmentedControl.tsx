interface Option {
  label: string
  value: string
}

interface SegmentedControlProps {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function SegmentedControl({ options, value, onChange, label, className = '' }: SegmentedControlProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="font-heading text-xs uppercase tracking-wider text-text-muted">
          {label}
        </span>
      )}
      <div
        role="group"
        className={['flex w-full rounded-full bg-bg-elevated border border-border-color overflow-hidden', className].join(' ')}
      >
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 px-4 py-1.5 text-sm text-center transition-colors duration-150 cursor-pointer',
              value === opt.value
                ? 'bg-accent-primary text-bg-primary font-semibold'
                : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
