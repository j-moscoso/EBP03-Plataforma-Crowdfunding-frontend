import { useEffect, useMemo, useState } from 'react'
import type {
  BankAccountType,
  CreatorProfile as CreatorProfileModel,
  CreatorProfileLink,
  CreatorProfileLinkType,
  CreatorProfilePayload,
  FieldValidationError,
  Screen,
} from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

interface Props {
  navigate: (screen: Screen) => void
  onSessionExpired: () => void
}

interface DraftLink {
  localId: string
  type: CreatorProfileLinkType
  label: string
  url: string
}

interface DraftProfile {
  displayName: string
  bio: string
  phone: string
  professionalTitle: string
  accountType: BankAccountType | ''
  bankName: string
  accountNumberReplacement: string
  accountHolder: string
  holderDocumentReplacement: string
  links: DraftLink[]
}

interface ProfileErrors {
  fields: Record<string, string[]>
  links: Record<string, Record<string, string[]>>
}

const linkLimit = 20
const allowedLinkTypes: CreatorProfileLinkType[] = ['PORTFOLIO', 'PROFESSIONAL_NETWORK', 'OTHER_PROJECT']
const emptyErrors = (): ProfileErrors => ({ fields: {}, links: {} })

function blankDraft(): DraftProfile {
  return {
    displayName: '',
    bio: '',
    phone: '',
    professionalTitle: '',
    accountType: '',
    bankName: '',
    accountNumberReplacement: '',
    accountHolder: '',
    holderDocumentReplacement: '',
    links: [],
  }
}

function linkToDraft(link: CreatorProfileLink): DraftLink {
  return {
    localId: `saved-${link.id}`,
    type: link.type,
    label: link.label,
    url: link.url,
  }
}

function profileToDraft(profile: CreatorProfileModel): DraftProfile {
  return {
    displayName: profile.displayName,
    bio: profile.bio,
    phone: profile.phone,
    professionalTitle: profile.professionalTitle,
    accountType: profile.banking.accountType,
    bankName: profile.banking.bankName,
    accountNumberReplacement: '',
    accountHolder: profile.banking.accountHolder,
    holderDocumentReplacement: '',
    links: [...profile.links].sort((a, b) => a.order - b.order).map(linkToDraft),
  }
}

function validHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function domainPreview(value: string) {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return ''
    return parsed.hostname
  } catch {
    return ''
  }
}

function validateProfile(draft: DraftProfile): ProfileErrors {
  const errors = emptyErrors()
  const add = (field: string, message: string) => {
    errors.fields[field] = [...(errors.fields[field] ?? []), message]
  }
  if (!draft.displayName.trim()) add('displayName', 'El nombre público es obligatorio.')
  else if (draft.displayName.trim().length < 2 || draft.displayName.trim().length > 120) add('displayName', 'El nombre público debe tener entre 2 y 120 caracteres.')
  if (draft.bio.length > 2000) add('bio', 'La biografía no puede superar 2000 caracteres.')
  if (draft.phone.trim() && !/^\+573\d{9}$/.test(draft.phone.trim())) add('phone', 'Ingresa un celular colombiano en formato +573XXXXXXXXX.')
  if (draft.professionalTitle.length > 120) add('professionalTitle', 'El título profesional no puede superar 120 caracteres.')
  if (!draft.accountType) add('accountType', 'Selecciona un tipo de cuenta.')
  if (!draft.bankName.trim()) add('bankName', 'El banco es obligatorio.')
  else if (draft.bankName.trim().length > 120) add('bankName', 'El banco no puede superar 120 caracteres.')
  if (!/^\d{5,80}$/.test(draft.accountNumberReplacement)) add('accountNumber', 'Ingresa entre 5 y 80 dígitos, sin letras ni espacios.')
  if (!draft.accountHolder.trim()) add('accountHolder', 'El titular es obligatorio.')
  else if (draft.accountHolder.trim().length > 160) add('accountHolder', 'El titular no puede superar 160 caracteres.')
  if (!/^\d{5,15}$/.test(draft.holderDocumentReplacement.trim())) add('holderDocument', 'Ingresa entre 5 y 15 dígitos para el documento.')

  const seenUrls = new Set<string>()

  draft.links.forEach(link => {
    const linkErrors: Record<string, string[]> = {}
    const addLinkError = (field: string, message: string) => {
      linkErrors[field] = [...(linkErrors[field] ?? []), message]
    }
    if (!allowedLinkTypes.includes(link.type)) addLinkError('type', 'Selecciona un tipo de enlace válido.')
    if (!link.url.trim()) addLinkError('url', 'La URL es obligatoria.')
    else if (link.url.trim().length > 1000 || !validHttpUrl(link.url.trim())) {
      addLinkError('url', 'Usa una URL absoluta con http:// o https://. No se permiten esquemas peligrosos.')
    }
    const normalizedUrl = link.url.trim().toLowerCase()
    if (normalizedUrl && seenUrls.has(normalizedUrl)) addLinkError('url', 'No repitas una URL dentro del perfil.')
    seenUrls.add(normalizedUrl)
    if (Object.keys(linkErrors).length) errors.links[link.localId] = linkErrors
  })
  return errors
}

function hasErrors(errors: ProfileErrors) {
  return Object.keys(errors.fields).length > 0 || Object.keys(errors.links).length > 0
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse" role="status">
        <div className="h-4 w-28 rounded-full bg-gray-200 mb-6" />
        <div className="h-10 w-80 max-w-full rounded-xl bg-gray-200 mb-3" />
        <div className="h-4 w-96 max-w-full rounded-full bg-gray-200 mb-8" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map(section => <div key={section} className="h-56 bg-white rounded-2xl border border-gray-100 shadow-sm" />)}
        </div>
        <span className="sr-only">Cargando perfil de creador...</span>
      </div>
    </div>
  )
}

export default function CreatorProfile({ navigate, onSessionExpired }: Props) {
  const [savedProfile, setSavedProfile] = useState<CreatorProfileModel | null>(null)
  const [draftProfile, setDraftProfile] = useState<DraftProfile>(blankDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [globalError, setGlobalError] = useState('')
  const [errors, setErrors] = useState<ProfileErrors>(emptyErrors)
  const [success, setSuccess] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function loadProfile() {
    setLoading(true)
    setLoadError('')
    setForbidden(false)
    try {
      const profile = await api.creatorProfile()
      setSavedProfile(profile)
      setDraftProfile(profile ? profileToDraft(profile) : blankDraft())
      setErrors(emptyErrors())
      setGlobalError('')
      setSuccess(false)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setSavedProfile(null)
        setDraftProfile(blankDraft())
      } else if (error instanceof ApiError && error.status === 401) {
        onSessionExpired()
      } else if (error instanceof ApiError && error.status === 403) {
        setForbidden(true)
      } else {
        setLoadError(apiErrorMessage(error, 'No pudimos cargar el perfil de creador.'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const completion = useMemo(() => {
    const checks = [
      draftProfile.displayName.trim(),
      draftProfile.bio.trim(),
      draftProfile.phone.trim(),
      draftProfile.professionalTitle.trim(),
      draftProfile.accountType,
      draftProfile.bankName.trim(),
      draftProfile.accountNumberReplacement,
      draftProfile.accountHolder.trim(),
      draftProfile.holderDocumentReplacement,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [draftProfile])

  function updateField<K extends keyof Omit<DraftProfile, 'links'>>(field: K, value: DraftProfile[K]) {
    setDraftProfile(current => ({ ...current, [field]: value }))
    const errorField = field === 'accountNumberReplacement'
      ? 'accountNumber'
      : field === 'holderDocumentReplacement'
        ? 'holderDocument'
        : field
    setErrors(current => ({ ...current, fields: { ...current.fields, [errorField]: [] } }))
    setGlobalError('')
    setSuccess(false)
  }

  function addLink() {
    if (draftProfile.links.length >= linkLimit) return
    setDraftProfile(current => ({
      ...current,
      links: [...current.links, {
        localId: `new-${crypto.randomUUID()}`,
        type: 'PORTFOLIO',
        label: '',
        url: '',
      }],
    }))
    setSuccess(false)
  }

  function updateLink(localId: string, field: 'type' | 'label' | 'url', value: string) {
    setDraftProfile(current => ({
      ...current,
      links: current.links.map(link => link.localId === localId ? { ...link, [field]: value } : link),
    }))
    setErrors(current => {
      const nextLinks = { ...current.links }
      delete nextLinks[localId]
      return { ...current, links: nextLinks }
    })
    setGlobalError('')
    setSuccess(false)
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= draftProfile.links.length) return
    setDraftProfile(current => {
      const links = [...current.links]
      ;[links[index], links[target]] = [links[target], links[index]]
      return { ...current, links }
    })
    setSuccess(false)
  }

  function removeLink(localId: string) {
    if (confirmDeleteId !== localId) {
      setConfirmDeleteId(localId)
      return
    }
    setDraftProfile(current => ({ ...current, links: current.links.filter(link => link.localId !== localId) }))
    setConfirmDeleteId(null)
    setSuccess(false)
  }

  function buildPayload(): CreatorProfilePayload {
    if (!draftProfile.accountType) throw new Error('Debes seleccionar un tipo de cuenta.')
    return {
      displayName: draftProfile.displayName.trim(),
      bio: draftProfile.bio.trim(),
      phone: draftProfile.phone.trim(),
      professionalTitle: draftProfile.professionalTitle.trim(),
      bankAccountType: draftProfile.accountType,
      bankName: draftProfile.bankName.trim(),
      bankAccountNumber: draftProfile.accountNumberReplacement.trim(),
      bankAccountHolder: draftProfile.accountHolder.trim(),
      bankAccountDocument: draftProfile.holderDocumentReplacement.trim(),
      links: draftProfile.links.map((link, index) => ({
        linkType: link.type,
        label: link.label.trim(),
        url: link.url.trim(),
        sortOrder: index,
      })),
    }
  }

  function applyBackendErrors(details: unknown) {
    const next = emptyErrors()
    let fieldErrors: FieldValidationError[] = []
    if (Array.isArray(details)) fieldErrors = details as FieldValidationError[]
    else if (details && typeof details === 'object') {
      const body = details as { fieldErrors?: FieldValidationError[]; errors?: FieldValidationError[] }
      fieldErrors = body.fieldErrors ?? body.errors ?? []
    }
    fieldErrors.forEach(error => {
      const linkMatch = error.field.match(/^links\[(\d+)]\.(linkType|type|label|url)$/)
      if (linkMatch) {
        const link = draftProfile.links[Number(linkMatch[1])]
        if (link) {
          const row = next.links[link.localId] ?? {}
          const field = linkMatch[2] === 'linkType' ? 'type' : linkMatch[2]
          row[field] = [...(row[field] ?? []), error.message]
          next.links[link.localId] = row
        }
      } else {
        const aliases: Record<string, string> = {
          'profile.bankAccountType': 'accountType',
          'profile.bankName': 'bankName',
          'profile.bankAccountNumber': 'accountNumber',
          'profile.bankAccountHolder': 'accountHolder',
          'profile.bankAccountDocument': 'holderDocument',
          bankAccountType: 'accountType',
          bankAccountNumber: 'accountNumber',
          bankAccountHolder: 'accountHolder',
          bankAccountDocument: 'holderDocument',
        }
        const field = aliases[error.field] ?? error.field
        next.fields[field] = [...(next.fields[field] ?? []), error.message]
      }
    })
    setErrors(next)
    return hasErrors(next)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    const validation = validateProfile(draftProfile)
    setErrors(validation)
    setGlobalError('')
    setSuccess(false)
    if (hasErrors(validation)) {
      setGlobalError('Revisa los campos marcados antes de guardar.')
      return
    }
    setSaving(true)
    try {
      const profile = await api.saveCreatorProfile(buildPayload())
      setSavedProfile(profile)
      setDraftProfile(profileToDraft(profile))
      setErrors(emptyErrors())
      setSuccess(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setForbidden(true)
      } else if (error instanceof ApiError && error.status === 401) {
        onSessionExpired()
      } else if (error instanceof ApiError && (error.status === 400 || error.code === 'VALIDATION_ERROR')) {
        const mapped = applyBackendErrors(error.details)
        setGlobalError(mapped ? 'Revisa los campos marcados.' : error.message)
      } else {
        setGlobalError(apiErrorMessage(error, 'No pudimos guardar el perfil.'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ProfileSkeleton />

  if (forbidden) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-error flex items-center justify-center text-xl font-bold mx-auto mb-4" aria-hidden="true">!</div>
          <h1 className="font-display font-800 text-2xl text-gray-900">Acceso exclusivo para creadores</h1>
          <p className="text-sm text-gray-500 mt-2">No tienes permisos para consultar o modificar este perfil.</p>
          <button type="button" onClick={() => navigate('creator-dashboard')} className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">Volver al dashboard</button>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h1 className="font-display font-800 text-2xl text-gray-900">No pudimos cargar tu perfil</h1>
          <p className="text-sm text-gray-500 mt-2">{loadError}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button type="button" onClick={() => navigate('creator-dashboard')} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Volver</button>
            <button type="button" onClick={() => void loadProfile()} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold">Reintentar</button>
          </div>
        </div>
      </div>
    )
  }

  const inputClass = (field: string) => `w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-400 ${
    errors.fields[field]?.length ? 'border-error bg-red-50 focus:border-error' : 'border-gray-200 focus:border-primary'
  }`

  const FieldErrors = ({ field }: { field: string }) => errors.fields[field]?.length ? (
    <ul id={`${field}-errors`} className="mt-1.5 space-y-1" role="alert">
      {errors.fields[field].map(message => <li key={message} className="text-xs text-error">• {message}</li>)}
    </ul>
  ) : null

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button type="button" onClick={() => navigate('creator-dashboard')} className="text-sm font-medium text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md mb-6">← Volver al dashboard</button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Identidad y confianza</p>
            <h1 className="font-display font-800 text-3xl text-gray-900">Perfil de creador</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">Completa información verificable para fortalecer la confianza de tus patrocinadores. Tus datos bancarios sensibles nunca se muestran completos.</p>
          </div>
          <div className="sm:w-56">
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2"><span>Perfil completado</span><span className="text-primary">{completion}%</span></div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full progress-bar" style={{ width: `${completion}%` }} /></div>
          </div>
        </div>

        {!savedProfile && (
          <div className="mb-6 bg-primary-light/60 border border-green-200 rounded-xl px-5 py-4">
            <p className="text-sm font-semibold text-green-900">Tu perfil aún está vacío</p>
            <p className="text-xs text-green-800 mt-1">Completa las secciones siguientes. No hemos agregado valores por ti.</p>
          </div>
        )}
        {success && <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm font-semibold text-green-800 fade-in" role="status">Perfil guardado</div>}
        {globalError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" role="alert">
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        <form onSubmit={submit} noValidate className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="font-display font-700 text-xl text-gray-900 mb-5">Información personal</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre público *</label>
                <input id="displayName" value={draftProfile.displayName} onChange={event => updateField('displayName', event.target.value)} maxLength={120} disabled={saving} aria-invalid={Boolean(errors.fields.displayName?.length)} aria-describedby={errors.fields.displayName?.length ? 'displayName-errors' : undefined} className={inputClass('displayName')} />
                <FieldErrors field="displayName" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono (opcional)</label>
                <input id="phone" type="tel" value={draftProfile.phone} onChange={event => updateField('phone', event.target.value)} maxLength={30} disabled={saving} aria-invalid={Boolean(errors.fields.phone?.length)} aria-describedby={errors.fields.phone?.length ? 'phone-errors' : undefined} className={inputClass('phone')} placeholder="+573000000000" />
                <FieldErrors field="phone" />
              </div>
              <div className="sm:col-span-2">
                <div className="flex justify-between mb-1.5"><label htmlFor="bio" className="block text-sm font-medium text-gray-700">Biografía (opcional)</label><span className="text-xs text-gray-400">{draftProfile.bio.length}/2000</span></div>
                <textarea id="bio" value={draftProfile.bio} onChange={event => updateField('bio', event.target.value)} disabled={saving} rows={5} maxLength={2000} aria-invalid={Boolean(errors.fields.bio?.length)} aria-describedby={errors.fields.bio?.length ? 'bio-errors' : undefined} className={`${inputClass('bio')} resize-none`} placeholder="Cuenta tu experiencia y la motivación detrás de tus proyectos." />
                <FieldErrors field="bio" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="font-display font-700 text-xl text-gray-900 mb-5">Información profesional</h2>
            <label htmlFor="professionalTitle" className="block text-sm font-medium text-gray-700 mb-1.5">Cargo o título profesional (opcional)</label>
            <input id="professionalTitle" value={draftProfile.professionalTitle} onChange={event => updateField('professionalTitle', event.target.value)} maxLength={120} disabled={saving} aria-invalid={Boolean(errors.fields.professionalTitle?.length)} aria-describedby={errors.fields.professionalTitle?.length ? 'professionalTitle-errors' : undefined} className={inputClass('professionalTitle')} placeholder="Ej: Diseñadora industrial y fundadora" />
            <FieldErrors field="professionalTitle" />
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div><h2 className="font-display font-700 text-xl text-gray-900">Datos bancarios</h2><p className="text-xs text-gray-500 mt-1">Los valores guardados se muestran enmascarados. Por seguridad, el backend exige volver a ingresar el número de cuenta y documento cada vez que guardas el perfil.</p></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de cuenta *</label>
                <select id="accountType" value={draftProfile.accountType} onChange={event => updateField('accountType', event.target.value as BankAccountType | '')} disabled={saving} className={inputClass('accountType')} aria-invalid={Boolean(errors.fields.accountType?.length)}>
                  <option value="">Seleccionar...</option><option value="SAVINGS">Ahorros</option><option value="CHECKING">Corriente</option>
                </select>
                <FieldErrors field="accountType" />
              </div>
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1.5">Banco *</label>
                <input id="bankName" value={draftProfile.bankName} onChange={event => updateField('bankName', event.target.value)} maxLength={120} disabled={saving} className={inputClass('bankName')} aria-invalid={Boolean(errors.fields.bankName?.length)} />
                <FieldErrors field="bankName" />
              </div>
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1.5">Número de cuenta *</label>
                {savedProfile?.banking.maskedAccountNumber && <p className="text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2">Actual: {savedProfile.banking.maskedAccountNumber}</p>}
                <input id="accountNumber" inputMode="numeric" autoComplete="off" value={draftProfile.accountNumberReplacement} onChange={event => updateField('accountNumberReplacement', event.target.value)} disabled={saving} className={inputClass('accountNumber')} aria-invalid={Boolean(errors.fields.accountNumber?.length)} aria-describedby={errors.fields.accountNumber?.length ? 'accountNumber-errors' : 'accountNumber-help'} placeholder="Volver a ingresar, solo dígitos" />
                <FieldErrors field="accountNumber" />
                {!errors.fields.accountNumber?.length && <p id="accountNumber-help" className="text-xs text-gray-400 mt-1.5">Entre 5 y 80 dígitos. Nunca solicitaremos PIN ni contraseña bancaria.</p>}
              </div>
              <div>
                <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-1.5">Titular *</label>
                <input id="accountHolder" value={draftProfile.accountHolder} onChange={event => updateField('accountHolder', event.target.value)} maxLength={160} disabled={saving} className={inputClass('accountHolder')} aria-invalid={Boolean(errors.fields.accountHolder?.length)} />
                <FieldErrors field="accountHolder" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="holderDocument" className="block text-sm font-medium text-gray-700 mb-1.5">Documento del titular *</label>
                {savedProfile?.banking.maskedHolderDocument && <p className="text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2">Actual: {savedProfile.banking.maskedHolderDocument}</p>}
                <input id="holderDocument" inputMode="numeric" autoComplete="off" value={draftProfile.holderDocumentReplacement} onChange={event => updateField('holderDocumentReplacement', event.target.value)} maxLength={15} disabled={saving} className={inputClass('holderDocument')} aria-invalid={Boolean(errors.fields.holderDocument?.length)} aria-describedby={errors.fields.holderDocument?.length ? 'holderDocument-errors' : undefined} placeholder="Volver a ingresar el documento (5-15 digitos)" />
                <FieldErrors field="holderDocument" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div><h2 className="font-display font-700 text-xl text-gray-900">Enlaces</h2><p className="text-xs text-gray-500 mt-1">Añade portafolios, redes profesionales u otros proyectos.</p></div>
              <div className="flex items-center gap-3"><span className="text-xs font-semibold text-gray-500">{draftProfile.links.length}/{linkLimit}</span><button type="button" onClick={addLink} disabled={draftProfile.links.length >= linkLimit || saving} className="text-sm font-semibold text-primary border border-primary rounded-xl px-4 py-2 hover:bg-primary-light disabled:border-gray-200 disabled:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30">+ Agregar enlace</button></div>
            </div>
            {draftProfile.links.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl py-10 px-4 text-center"><p className="text-sm font-semibold text-gray-600">Aún no agregaste enlaces</p><p className="text-xs text-gray-400 mt-1">Puedes guardar el perfil y añadirlos más adelante.</p></div>
            ) : (
              <div className="space-y-4">
                {draftProfile.links.map((link, index) => {
                  const linkErrors = errors.links[link.localId] ?? {}
                  const domain = domainPreview(link.url)
                  return (
                    <div key={link.localId} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <span className="text-xs font-semibold text-gray-500">ENLACE {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => moveLink(index, -1)} disabled={index === 0 || saving} className="text-xs text-gray-500 disabled:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-2 py-1" aria-label={`Subir enlace ${index + 1}`}>↑ Subir</button>
                          <button type="button" onClick={() => moveLink(index, 1)} disabled={index === draftProfile.links.length - 1 || saving} className="text-xs text-gray-500 disabled:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-2 py-1" aria-label={`Bajar enlace ${index + 1}`}>↓ Bajar</button>
                          {confirmDeleteId === link.localId && <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 px-2 py-1">Cancelar</button>}
                          <button type="button" onClick={() => removeLink(link.localId)} disabled={saving} className={`text-xs font-semibold px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-error/30 ${confirmDeleteId === link.localId ? 'bg-red-50 text-error' : 'text-error'}`}>{confirmDeleteId === link.localId ? 'Confirmar eliminación' : 'Eliminar'}</button>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor={`${link.localId}-type`} className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                          <select id={`${link.localId}-type`} value={link.type} onChange={event => updateLink(link.localId, 'type', event.target.value)} disabled={saving} aria-invalid={Boolean(linkErrors.type)} aria-describedby={linkErrors.type ? `${link.localId}-type-errors` : undefined} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${linkErrors.type ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`}>
                            <option value="PORTFOLIO">Portafolio</option><option value="PROFESSIONAL_NETWORK">Red profesional</option><option value="OTHER_PROJECT">Otro proyecto</option>
                          </select>
                          <div id={`${link.localId}-type-errors`}>{linkErrors.type?.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
                        </div>
                        <div>
                          <label htmlFor={`${link.localId}-label`} className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
                          <input id={`${link.localId}-label`} value={link.label} onChange={event => updateLink(link.localId, 'label', event.target.value)} disabled={saving} aria-invalid={Boolean(linkErrors.label)} aria-describedby={linkErrors.label ? `${link.localId}-label-errors` : undefined} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${linkErrors.label ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="Ej: Mi portafolio" />
                          <div id={`${link.localId}-label-errors`}>{linkErrors.label?.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor={`${link.localId}-url`} className="block text-xs font-medium text-gray-600 mb-1">URL absoluta</label>
                          <input id={`${link.localId}-url`} type="url" value={link.url} onChange={event => updateLink(link.localId, 'url', event.target.value)} disabled={saving} aria-invalid={Boolean(linkErrors.url)} aria-describedby={linkErrors.url ? `${link.localId}-url-errors` : undefined} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${linkErrors.url ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="https://..." />
                          <div id={`${link.localId}-url-errors`}>{linkErrors.url?.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
                          {domain && <p className="text-xs text-gray-400 mt-1.5">Dominio: <span className="font-medium text-gray-600">{domain}</span>{link.url.startsWith('http://') && <span className="text-warning ml-2">Se recomienda HTTPS</span>}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="sticky bottom-4 bg-white/95 backdrop-blur border border-gray-100 shadow-lg rounded-2xl p-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-400">Los cambios se guardan únicamente al confirmar.</p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button type="button" onClick={() => navigate('creator-dashboard')} disabled={saving} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 disabled:text-gray-300">Cancelar</button>
              <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
                {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
                {saving ? 'Guardando perfil...' : 'Guardar perfil'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
