import { forwardRef, type ReactNode } from 'react'

export const ControlBar = forwardRef<
  HTMLDivElement,
  { label: string; children: ReactNode }
>(function ControlBar({ label, children }, ref) {
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        alignContent: 'center',
        flexWrap: 'wrap',
        gap: '8px 12px',
        padding: '8px 10px',
        font: '500 12px/1.2 system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  )
})

export function ControlField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {children}
    </label>
  )
}

export const ControlButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ControlButton({ children, style, type = 'button', ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      style={{ padding: '0 14px', ...style }}
    >
      {children}
    </button>
  )
})

export function RangeField({
  label,
  max,
  min,
  onChange,
  step,
  suffix = '',
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step: number
  suffix?: string
  value: number
}) {
  return (
    <ControlField label={label}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={{ width: 96 }}
      />
      <output>{`${value}${suffix}`}</output>
    </ControlField>
  )
}
