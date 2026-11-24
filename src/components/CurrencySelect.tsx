import { useEffect, useRef, useState } from 'react'
import { supportedCurrencies } from '../utils/currencies'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  ariaLabel?: string
}

export default function CurrencySelect({
  id,
  value,
  onChange,
  className = '',
  disabled = false,
  invalid = false,
  describedBy,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = supportedCurrencies.find(item => item.code === value) ?? supportedCurrencies[0]

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const choose = (code: string) => {
    onChange(code)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={`flex items-center justify-between gap-3 ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none" aria-hidden="true">{selected.flag}</span>
          <span className="truncate">{selected.code} — {selected.label}</span>
        </span>
        <span className="text-xs text-gray-400" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Monedas disponibles"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-surface py-1 shadow-lg"
        >
          {supportedCurrencies.map(item => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === value}
              onClick={() => choose(item.code)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-primary-light ${item.code === value ? 'bg-primary-light/60 text-primary font-semibold' : 'text-gray-700'}`}
            >
              <span className="text-xl leading-none" aria-hidden="true">{item.flag}</span>
              <span className="truncate">{item.code} — {item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
