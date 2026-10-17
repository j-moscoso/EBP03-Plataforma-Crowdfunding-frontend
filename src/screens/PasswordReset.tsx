import { useEffect, useMemo, useState } from 'react'
import type { FieldValidationError, Screen } from '../types'
import { ApiError, api } from '../services/api'
import { getPasswordRequirements, PasswordChecklist, PasswordField } from '../components/PasswordField'

interface Props {
  mode: 'request' | 'confirm'
  token: string | null
  navigate: (screen: Screen) => void
  clearToken: () => void
}

type RequestState = 'default' | 'loading' | 'sent'
type ConfirmState = 'validating' | 'validation-error' | 'invalid' | 'form' | 'loading' | 'success'

const publicRequestMessage = 'Si la cuenta cumple los requisitos, recibirás instrucciones para restablecer tu contraseña.'
const invalidTokenMessage = 'El enlace no es válido o ya expiró. Solicita uno nuevo.'

function BrandMark() {
  return (
    <button type="button" onClick={() => location.assign('/projects')} className="inline-flex items-center gap-2 font-display font-800 text-xl focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg">
      <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white text-sm">IF</span>
      <span className="text-gray-900">Impulsa<span className="text-primary">Fund</span></span>
    </button>
  )
}

function SecurityNote() {
  return (
    <div className="flex items-start gap-3 bg-primary-light/60 border border-green-200 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <p className="text-xs text-gray-600 leading-relaxed">Por seguridad, nunca confirmaremos públicamente si un correo o enlace pertenece a una cuenta.</p>
    </div>
  )
}

function RequestPasswordReset({ navigate }: Pick<Props, 'navigate'>) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<RequestState>('default')
  const [emailError, setEmailError] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Ingresa un correo electrónico válido.')
      return
    }
    setEmailError('')
    setError('')
    setState('loading')
    try {
      await api.requestPasswordReset(trimmedEmail)
      setState('sent')
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && requestError.status === 429
          ? 'Has realizado demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.'
          : 'No pudimos enviar la solicitud en este momento. Inténtalo de nuevo.',
      )
      setState('default')
    }
  }

  if (state === 'sent') {
    return (
      <ResetShell>
        <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.9 5.3a2 2 0 002.2 0L21 8m-16 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </div>
        <h1 className="font-display font-800 text-2xl text-gray-900 text-center">Revisa tu correo</h1>
        <p className="text-sm text-gray-500 text-center leading-relaxed mt-3">{publicRequestMessage}</p>
        <button type="button" onClick={() => navigate('login')} className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">
          Volver a iniciar sesión
        </button>
      </ResetShell>
    )
  }

  return (
    <ResetShell>
      <div className="mb-7">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Recuperación segura</p>
        <h1 className="font-display font-800 text-3xl text-gray-900">Restablece tu contraseña</h1>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">Escribe tu correo y, si la cuenta cumple los requisitos, enviaremos las instrucciones correspondientes.</p>
      </div>
      {error && <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={event => { setEmail(event.target.value); setEmailError(''); setError('') }}
            placeholder="tu@correo.com"
            autoComplete="email"
            disabled={state === 'loading'}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'reset-email-error' : 'reset-email-help'}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 ${
              emailError ? 'border-error bg-red-50 focus:border-error' : 'border-gray-200 focus:border-primary'
            }`}
          />
          {emailError
            ? <p id="reset-email-error" className="mt-1.5 text-xs text-error" role="alert">{emailError}</p>
            : <p id="reset-email-help" className="mt-1.5 text-xs text-gray-400">No revelaremos si este correo está registrado.</p>}
        </div>
        <button type="submit" disabled={!email.trim() || state === 'loading'} className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
          {state === 'loading' && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
          {state === 'loading' ? 'Enviando instrucciones...' : 'Enviar instrucciones'}
        </button>
        <SecurityNote />
      </form>
      <button type="button" onClick={() => navigate('login')} className="w-full mt-6 text-sm font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg">
        Volver a iniciar sesión
      </button>
    </ResetShell>
  )
}

function ConfirmPasswordReset({ token, navigate, clearToken }: Omit<Props, 'mode'>) {
  const [state, setState] = useState<ConfirmState>('validating')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmationError, setConfirmationError] = useState('')
  const [error, setError] = useState('')
  const [validationAttempt, setValidationAttempt] = useState(0)
  const requirements = useMemo(() => getPasswordRequirements(newPassword), [newPassword])
  const passwordValid = Object.values(requirements).every(Boolean)

  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }
    let active = true
    void api.validatePasswordReset(token)
      .then(response => {
        if (active) setState(response.valid ? 'form' : 'invalid')
      })
      .catch(requestError => {
        if (!active) return
        if (
          requestError instanceof ApiError &&
          (requestError.code === 'RESET_TOKEN_INVALID' ||
            requestError.code === 'RESET_TOKEN_EXPIRED' ||
            [400, 401, 403, 404, 409].includes(requestError.status))
        ) {
          setState('invalid')
        } else {
          setError(requestError instanceof ApiError && requestError.status === 429
            ? 'Has realizado demasiados intentos. Espera unos minutos antes de continuar.'
            : 'No pudimos validar el enlace. Comprueba tu conexión e inténtalo de nuevo.')
          setState('validation-error')
        }
      })
    return () => { active = false }
  }, [token, validationAttempt])

  function applyFieldErrors(details: unknown) {
    if (!details || typeof details !== 'object') return
    const detailObject = details as { fieldErrors?: FieldValidationError[]; errors?: FieldValidationError[] }
    const fieldErrors = detailObject.fieldErrors ?? detailObject.errors ?? []
    fieldErrors.forEach(fieldError => {
      if (fieldError.field === 'newPassword') setPasswordError(fieldError.message)
      if (fieldError.field === 'passwordConfirmation') setConfirmationError(fieldError.message)
    })
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPasswordError('')
    setConfirmationError('')
    setError('')
    if (!passwordValid) {
      setPasswordError('La contraseña todavía no cumple todos los requisitos.')
      return
    }
    if (newPassword !== confirmation) {
      setConfirmationError('Las contraseñas no coinciden.')
      return
    }
    if (!token) {
      setState('invalid')
      return
    }
    setState('loading')
    try {
      const result = await api.confirmPasswordReset(token, newPassword)
      if (!result.loginRequired) {
        throw new ApiError(502, 'INVALID_RESET_CONFIRMATION', 'El servidor no confirmó el cierre de las sesiones anteriores.')
      }
      setNewPassword('')
      setConfirmation('')
      clearToken()
      setState('success')
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (
          requestError.code === 'RESET_TOKEN_INVALID' ||
          requestError.code === 'RESET_TOKEN_EXPIRED' ||
          (requestError.code !== 'VALIDATION_ERROR' && [400, 401, 403, 404, 409].includes(requestError.status))
        ) {
          setState('invalid')
          return
        }
        if (requestError.code === 'VALIDATION_ERROR') {
          applyFieldErrors(requestError.details)
          setError('Revisa los campos marcados e inténtalo nuevamente.')
        } else if (requestError.status === 429) {
          setError('Has realizado demasiados intentos. Espera unos minutos antes de continuar.')
        } else {
          setPasswordError(requestError.message)
        }
      } else {
        setError('No pudimos actualizar la contraseña. Comprueba tu conexión e inténtalo de nuevo.')
      }
      setState('form')
    }
  }

  if (state === 'validating') {
    return (
      <ResetShell>
        <div className="py-10 text-center" role="status">
          <span className="block w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <h1 className="font-display font-700 text-xl text-gray-900">Validando enlace...</h1>
          <p className="text-sm text-gray-500 mt-2">Esto tomará solo un momento.</p>
        </div>
      </ResetShell>
    )
  }

  if (state === 'validation-error') {
    return (
      <ResetShell>
        <h1 className="font-display font-800 text-2xl text-gray-900 text-center">No pudimos validar el enlace</h1>
        <p className="text-sm text-gray-500 text-center leading-relaxed mt-3">{error}</p>
        <button type="button" onClick={() => { setError(''); setState('validating'); setValidationAttempt(attempt => attempt + 1) }} className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">
          Reintentar
        </button>
      </ResetShell>
    )
  }

  if (state === 'invalid') {
    return (
      <ResetShell>
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="font-display font-800 text-2xl text-gray-900 text-center">Enlace no disponible</h1>
        <p className="text-sm text-gray-500 text-center leading-relaxed mt-3">{error || invalidTokenMessage}</p>
        <button type="button" onClick={() => navigate('password-reset-request')} className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">
          Solicitar nuevo enlace
        </button>
      </ResetShell>
    )
  }

  if (state === 'success') {
    return (
      <ResetShell>
        <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="font-display font-800 text-2xl text-gray-900 text-center">Contraseña actualizada correctamente.</h1>
        <p className="text-sm text-gray-500 text-center leading-relaxed mt-3">Por seguridad, las sesiones anteriores fueron cerradas. Inicia sesión nuevamente con tu nueva contraseña.</p>
        <button type="button" onClick={() => navigate('login')} className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">
          Volver a iniciar sesión
        </button>
      </ResetShell>
    )
  }

  return (
    <ResetShell>
      <div className="mb-7">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Último paso</p>
        <h1 className="font-display font-800 text-3xl text-gray-900">Crea una nueva contraseña</h1>
        <p className="text-sm text-gray-500 mt-2">Elige una contraseña segura que no hayas usado anteriormente.</p>
      </div>
      {error && <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <PasswordField
            id="new-password"
            label="Nueva contraseña"
            value={newPassword}
            onChange={value => { setNewPassword(value); setPasswordError(''); setError('') }}
            error={passwordError}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            disabled={state === 'loading'}
          />
          <PasswordChecklist requirements={requirements} />
        </div>
        <PasswordField
          id="password-confirmation"
          label="Confirma la nueva contraseña"
          value={confirmation}
          onChange={value => { setConfirmation(value); setConfirmationError('') }}
          error={confirmationError || (confirmation && confirmation !== newPassword ? 'Las contraseñas no coinciden.' : '')}
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          disabled={state === 'loading'}
        />
        <button type="submit" disabled={!passwordValid || !confirmation || confirmation !== newPassword || state === 'loading'} className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
          {state === 'loading' && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
          {state === 'loading' ? 'Actualizando contraseña...' : 'Cambiar contraseña'}
        </button>
        <SecurityNote />
      </form>
    </ResetShell>
  )
}

function ResetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8"><BrandMark /></div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 fade-in">{children}</div>
      </div>
    </div>
  )
}

export default function PasswordReset({ mode, token, navigate, clearToken }: Props) {
  return mode === 'request'
    ? <RequestPasswordReset navigate={navigate} />
    : <ConfirmPasswordReset token={token} navigate={navigate} clearToken={clearToken} />
}
