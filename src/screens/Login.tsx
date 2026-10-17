import { useState } from 'react'
import type { Screen, User } from '../types'
import { api, apiErrorMessage } from '../services/api'

interface Props {
  navigate: (screen: Screen) => void
  onLogin: (user: User) => void
}

export default function Login({ navigate, onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email || !password || loading) return
    setError('')
    setLoading(true)
    try {
      const response = await api.login(email, password, rememberMe)
      onLogin(response.user)
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'No pudimos conectar con el servidor.'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${error ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <h1 className="font-display font-800 text-3xl text-gray-900 mb-2">Bienvenido de vuelta</h1>
          <p className="text-gray-500 text-sm">Ingresa a tu cuenta para continuar</p>
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
            <input id="login-email" type="email" value={email} onChange={event => { setEmail(event.target.value); setError('') }} className={inputClass} placeholder="tu@correo.com" autoComplete="email" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <button type="button" onClick={() => navigate('password-reset-request')} className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); setError('') }} className={`${inputClass} pr-20`} placeholder="Tu contraseña" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} className="accent-primary" />
            Recordarme
          </label>
          <button disabled={!email || !password || loading} className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex justify-center gap-2">
            {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {loading ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta? <button onClick={() => navigate('register')} className="text-primary font-semibold hover:underline">Regístrate</button>
        </p>
      </div>
    </div>
  )
}
