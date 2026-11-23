import { useEffect, useMemo, useState } from 'react'
import type { FieldValidationError, Screen, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

interface Props {
  navigate: (screen: Screen) => void
  onUserUpdated: (user: User) => void
  onSessionExpired: () => void
}

const maxNameLength = 80
const validNameCharacters = /^[\p{L}\p{M} .'-]+$/u

function validateName(value: string) {
  const errors: string[] = []
  const trimmed = value.trim()
  if (!trimmed) errors.push('El nombre es obligatorio.')
  if (value.length > maxNameLength) errors.push(`El nombre no puede superar ${maxNameLength} caracteres.`)
  if (trimmed && !validNameCharacters.test(trimmed)) {
    errors.push('Usa únicamente letras, espacios, puntos, apóstrofes o guiones.')
  }
  return errors
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse" role="status" aria-label="Cargando configuración">
        <div className="h-4 bg-gray-200 rounded-full w-24 mb-5" />
        <div className="h-9 bg-gray-200 rounded-xl w-64 mb-3" />
        <div className="h-4 bg-gray-200 rounded-full w-80 max-w-full mb-8" />
        <div className="grid md:grid-cols-[16rem_1fr] gap-6">
          <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm" />
          <div className="h-96 bg-white rounded-2xl border border-gray-100 shadow-sm" />
        </div>
        <span className="sr-only">Cargando datos de la cuenta...</span>
      </div>
    </div>
  )
}

function verificationLabel(user: User) {
  return user.verificationStatus === 'verified' ? 'Verificada' : 'Pendiente'
}

export default function UserSettings({ navigate, onUserUpdated, onSessionExpired }: Props) {
  const [savedUser, setSavedUser] = useState<User | null>(null)
  const [draftName, setDraftName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [globalError, setGlobalError] = useState('')
  const [serverNameErrors, setServerNameErrors] = useState<string[]>([])
  const [showValidation, setShowValidation] = useState(false)
  const [success, setSuccess] = useState(false)

  const localNameErrors = useMemo(() => validateName(draftName), [draftName])
  const visibleNameErrors = [
    ...new Set(showValidation ? [...localNameErrors, ...serverNameErrors] : serverNameErrors),
  ]
  const isDirty = savedUser ? draftName !== savedUser.name : false

  async function loadUser() {
    setLoading(true)
    setLoadError('')
    setGlobalError('')
    try {
      const currentUser = await api.me()
      setSavedUser(currentUser)
      setDraftName(currentUser.name)
      setShowValidation(false)
      setServerNameErrors([])
      setSuccess(false)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired()
        return
      }
      setLoadError(apiErrorMessage(error, 'No pudimos cargar los datos de tu cuenta.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUser()
  }, [])

  function dashboardFor(user: User) {
    return user.role === 'creator' ? 'creator-dashboard' : 'sponsor-dashboard'
  }

  function cancel() {
    if (!savedUser) return
    setDraftName(savedUser.name)
    setShowValidation(false)
    setServerNameErrors([])
    setGlobalError('')
    setSuccess(false)
    navigate(dashboardFor(savedUser))
  }

  function mapValidationErrors(details: unknown) {
    if (Array.isArray(details)) {
      return (details as FieldValidationError[])
        .filter(error => error.field === 'name')
        .map(error => error.message)
    }
    if (!details || typeof details !== 'object') return [] as string[]
    const detailObject = details as {
      fieldErrors?: FieldValidationError[]
      errors?: FieldValidationError[] | Record<string, string | string[]>
    }
    const errors = detailObject.fieldErrors ?? detailObject.errors
    if (Array.isArray(errors)) {
      return errors.filter(error => error.field === 'name').map(error => error.message)
    }
    if (errors && typeof errors === 'object') {
      const nameError = errors.name
      if (Array.isArray(nameError)) return nameError
      if (typeof nameError === 'string') return [nameError]
    }
    return []
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!savedUser || saving) return
    setShowValidation(true)
    setServerNameErrors([])
    setGlobalError('')
    setSuccess(false)
    if (localNameErrors.length > 0) return

    setSaving(true)
    try {
      const updatedUser = await api.updateMe({ name: draftName.trim() })
      setSavedUser(updatedUser)
      setDraftName(updatedUser.name)
      setShowValidation(false)
      setServerNameErrors([])
      setSuccess(true)
      onUserUpdated(updatedUser)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired()
        return
      }
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        const fieldErrors = mapValidationErrors(error.details)
        setServerNameErrors(fieldErrors)
        setGlobalError(fieldErrors.length ? 'Revisa los campos marcados.' : error.message)
      } else {
        setGlobalError(apiErrorMessage(error, 'No pudimos guardar los cambios.'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SettingsSkeleton />

  if (!savedUser) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h1 className="font-display font-800 text-2xl text-gray-900">No pudimos cargar tu cuenta</h1>
          <p className="text-sm text-gray-500 mt-2">{loadError}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button type="button" onClick={() => navigate('projects')} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">Volver</button>
            <button type="button" onClick={() => void loadUser()} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">Reintentar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          type="button"
          onClick={cancel}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md mb-6"
        >
          <span aria-hidden="true">←</span> Volver al panel
        </button>

        <div className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Mi cuenta</p>
          <h1 className="font-display font-800 text-3xl text-gray-900">Configuración de cuenta</h1>
          <p className="text-sm text-gray-500 mt-2">Actualiza tus datos personales y consulta el estado de tu cuenta.</p>
        </div>

        <div className="grid md:grid-cols-[16rem_1fr] gap-6 items-start">
          <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-light text-primary flex items-center justify-center font-display font-800 text-2xl mb-4" aria-hidden="true">
              {savedUser.name[0]?.toUpperCase() || savedUser.email[0]?.toUpperCase()}
            </div>
            <h2 className="font-display font-700 text-gray-900 break-words">{savedUser.name}</h2>
            <p className="text-xs text-gray-400 mt-1 break-all">{savedUser.email}</p>
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-xs text-gray-400">Rol</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">{savedUser.role === 'creator' ? 'Creador' : 'Patrocinador'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Estado de verificación</p>
                <span className={`inline-flex mt-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  savedUser.verificationStatus === 'verified'
                    ? 'bg-primary-light text-primary'
                    : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {verificationLabel(savedUser)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mt-5">El correo, rol y estado de verificación son administrados de forma segura y no pueden editarse aquí.</p>
          </aside>

          <form onSubmit={submit} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            {success && (
              <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 fade-in" role="status">
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold" aria-hidden="true">✓</span>
                <p className="text-sm font-semibold text-green-800">Datos actualizados</p>
              </div>
            )}
            {globalError && <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{globalError}</div>}

            <div className="mb-6">
              <h2 className="font-display font-700 text-xl text-gray-900">Datos personales</h2>
              <p className="text-sm text-gray-500 mt-1">Por ahora puedes actualizar tu nombre público.</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 mb-1.5">
                <label htmlFor="settings-name" className="block text-sm font-medium text-gray-700">Nombre</label>
                <span className={`text-xs ${draftName.length > maxNameLength ? 'text-error font-semibold' : 'text-gray-400'}`}>{draftName.length}/{maxNameLength}</span>
              </div>
              <input
                id="settings-name"
                type="text"
                value={draftName}
                onChange={event => {
                  setDraftName(event.target.value)
                  setServerNameErrors([])
                  setGlobalError('')
                  setSuccess(false)
                }}
                maxLength={maxNameLength + 20}
                disabled={saving}
                autoComplete="name"
                aria-invalid={visibleNameErrors.length > 0}
                aria-describedby={visibleNameErrors.length ? 'settings-name-errors' : 'settings-name-help'}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-400 ${
                  visibleNameErrors.length ? 'border-error bg-red-50 focus:border-error' : 'border-gray-200 focus:border-primary'
                }`}
              />
              {visibleNameErrors.length > 0 ? (
                <ul id="settings-name-errors" className="mt-2 space-y-1" role="alert">
                  {visibleNameErrors.map(message => <li key={message} className="text-xs text-error">• {message}</li>)}
                </ul>
              ) : (
                <p id="settings-name-help" className="mt-1.5 text-xs text-gray-400">Este nombre se mostrará en tu perfil y, si eres creador, en tus campañas.</p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-gray-400">{isDirty ? 'Tienes cambios sin guardar.' : 'Todos los cambios están guardados.'}</p>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" onClick={cancel} disabled={saving} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  Cancelar
                </button>
                <button type="submit" disabled={!isDirty || saving || (showValidation && localNameErrors.length > 0)} className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
