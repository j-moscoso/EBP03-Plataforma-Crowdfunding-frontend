import { useState } from 'react'

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete: 'new-password' | 'current-password'
  placeholder?: string
  disabled?: boolean
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full px-4 py-3 pr-20 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-400 ${
            error ? 'border-error bg-red-50 focus:border-error' : 'border-gray-200 focus:border-primary'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(current => !current)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-1 disabled:text-gray-300"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs text-error" role="alert">{error}</p>}
    </div>
  )
}

export interface PasswordRequirements {
  length: boolean
  upper: boolean
  lower: boolean
  number: boolean
  symbol: boolean
}

export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

export function PasswordChecklist({ requirements }: { requirements: PasswordRequirements }) {
  const items: Array<[keyof PasswordRequirements, string]> = [
    ['length', 'Mínimo 8 caracteres'],
    ['upper', 'Una mayúscula'],
    ['lower', 'Una minúscula'],
    ['number', 'Un número'],
    ['symbol', 'Un símbolo'],
  ]
  return (
    <div className="grid sm:grid-cols-2 gap-2 mt-3" aria-label="Requisitos de contraseña">
      {items.map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
            requirements[key] ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-400'
          }`} aria-hidden="true">
            {requirements[key] ? '✓' : '·'}
          </span>
          <span className={`text-xs ${requirements[key] ? 'text-primary font-medium' : 'text-gray-500'}`}>{label}</span>
        </div>
      ))}
    </div>
  )
}
