import type { InputHTMLAttributes, FocusEvent, ChangeEvent } from 'react'
import { useState, useRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  unit?: string
  error?: string
  hint?: string
  historyKey?: string
}

const HIST_MAX = 10
const HIST_PREFIX = 'kc_hist_'

function readHistory(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(HIST_PREFIX + key) ?? '[]') } catch { return [] }
}

function writeHistory(key: string, value: string) {
  const v = value.trim()
  if (!v) return
  const list = [v, ...readHistory(key).filter(x => x !== v)].slice(0, HIST_MAX)
  localStorage.setItem(HIST_PREFIX + key, JSON.stringify(list))
}

export function Input({
  label, unit, error, hint, historyKey,
  className = '', id,
  onChange, onBlur, onFocus,
  readOnly,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const pickedRef = useRef(false)

  const filterHistory = (typed: string) => {
    if (!historyKey || readOnly) return
    const hist = readHistory(historyKey)
    setSuggestions(typed ? hist.filter(v => v.toLowerCase().includes(typed.toLowerCase())) : hist)
  }

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    filterHistory(e.target.value)
    onFocus?.(e)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    filterHistory(e.target.value)
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setTimeout(() => setSuggestions([]), 150)
    if (!pickedRef.current && historyKey && !readOnly && e.target.value.trim()) {
      writeHistory(historyKey, e.target.value)
    }
    pickedRef.current = false
    onBlur?.(e)
  }

  const pick = (val: string) => {
    pickedRef.current = true
    setSuggestions([])
    if (historyKey) writeHistory(historyKey, val)
    onChange?.({ target: { value: val } } as ChangeEvent<HTMLInputElement>)
  }

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
      <div className="relative">
        <div
          className={[
            'flex items-center bg-bg-elevated border border-border-color rounded-card transition-all duration-150',
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
            onChange={historyKey ? handleChange : onChange}
            onFocus={historyKey ? handleFocus : onFocus}
            onBlur={historyKey ? handleBlur : onBlur}
            readOnly={readOnly}
            {...props}
          />
          {unit && (
            <span className="px-3 text-xs font-mono text-text-muted select-none whitespace-nowrap">
              {unit}
            </span>
          )}
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 bg-bg-elevated border border-border-color rounded-card shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {suggestions.map(s => (
              <li
                key={s}
                onMouseDown={() => pick(s)}
                className="px-3 py-2 text-sm text-text-primary cursor-pointer hover:bg-accent-primary/10 hover:text-accent-primary transition-colors"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-accent-secondary">{error}</p>}
    </div>
  )
}
