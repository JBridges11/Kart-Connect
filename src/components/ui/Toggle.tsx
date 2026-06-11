import { SegmentedControl } from './SegmentedControl'

interface ToggleProps {
  optionA: string
  optionB: string
  value: string | null
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function Toggle({ optionA, optionB, value, onChange, label, className }: ToggleProps) {
  return (
    <SegmentedControl
      label={label}
      options={[
        { label: optionA, value: optionA },
        { label: optionB, value: optionB },
      ]}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}
