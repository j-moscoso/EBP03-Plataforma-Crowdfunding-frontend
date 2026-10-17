import { useState } from 'react'
import type { Screen, User, UserRole } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

interface Props {
  navigate: (screen: Screen) => void
  onLogin: (user: User) => void
}

export default function Register({ navigate, onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
  const passwordValid = Object.values(checks).every(Boolean)
  const canSubmit = Boolean(email && role && passwordValid && !loading)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || !role) return
    setEmailError('')
    setError('')
    setLoading(true)
    try {
      const response = await api.register(email.split('@')[0], email, password, role)
      onLogin(response.user)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'EMAIL_ALREADY_IN_USE') {
        setEmailError('Este correo ya está registrado. Intenta iniciar sesión o usa otro correo.')
      } else {
        setError(apiErrorMessage(requestError, 'No pudimos conectar con el servidor.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <h1 className="font-display font-800 text-3xl text-gray-900 mb-2">Crea tu cuenta</h1>
          <p className="text-gray-500 text-sm">Únete a creadores y patrocinadores que impulsan ideas</p>
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">¿Cuál es tu rol?</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['sponsor', 'Patrocinador', 'Apoya proyectos'],
                ['creator', 'Creador', 'Lanza tu campaña'],
              ] as const).map(([value, label, description]) => (
                <button key={value} type="button" onClick={() => setRole(value)} className={`p-4 rounded-xl border-2 text-left ${role === value ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
            <input type="email" value={email} onChange={event => { setEmail(event.target.value); setEmailError('') }} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${emailError ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="tu@correo.com" autoComplete="email" />
            {emailError && <p className="mt-1.5 text-xs text-error">{emailError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} className="w-full px-4 py-3 pr-20 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            {password && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  ['length', 'Mínimo 8 caracteres'],
                  ['upper', 'Una mayúscula'],
                  ['number', 'Un número'],
                  ['symbol', 'Un símbolo'],
                ].map(([key, label]) => (
                  <span key={key} className={`text-xs ${checks[key as keyof typeof checks] ? 'text-success' : 'text-error'}`}>
                    {checks[key as keyof typeof checks] ? '✓' : '○'} {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button disabled={!canSubmit} className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex justify-center gap-2">
            {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta? <button onClick={() => navigate('login')} className="text-primary font-semibold hover:underline">Inicia sesión</button>
        </p>
      </div>
    </div>
  )
}
