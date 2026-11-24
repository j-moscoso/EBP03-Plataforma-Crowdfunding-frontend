import { useEffect, useState } from 'react'
import type {
  Campaign,
  CampaignSponsorRanking,
  CampaignSummary,
  CampaignUpdate,
  CampaignUpdateMedia,
  CampaignUpdateMediaType,
  FieldValidationError,
  Screen,
  User,
} from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'
import CampaignTabs from '../components/CampaignTabs'
import CampaignMedia from '../components/CampaignMedia'

interface Props {
  campaignId: string | null
  campaigns: CampaignSummary[]
  loading: boolean
  error: string
  navigate: (screen: Screen, id?: string | null) => void
  onSelectReward: (campaignId: string, rewardId: string) => void
  user: User | null
  campaignOverride?: Campaign
}

function Countdown({ initialSeconds }: { initialSeconds: number }) {
  const [seconds, setSeconds] = useState(Math.max(initialSeconds, 0))
  useEffect(() => {
    setSeconds(Math.max(initialSeconds, 0))
    if (initialSeconds <= 0) return
    const timer = window.setInterval(() => setSeconds(value => Math.max(value - 1, 0)), 1000)
    return () => window.clearInterval(timer)
  }, [initialSeconds])
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return (
    <div className="flex gap-2">
      {[[days, 'días'], [hours, 'hrs'], [minutes, 'min'], [secs, 'seg']].map(([value, label]) => (
        <div key={String(label)} className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gray-900 text-white flex items-center justify-center font-display font-700 tabular-nums">{String(value).padStart(2, '0')}</div>
          <span className="text-[11px] text-gray-400">{label}</span>
        </div>
      ))}
    </div>
  )
}

const fundingModelCopy = {
  FIXED: {
    label: 'Modelo fijo',
    shortLabel: 'Fijo',
    note: 'Los aportes quedan retenidos hasta cerrar la campaña. Si no se alcanza la meta, se reembolsan.',
  },
  FLEXIBLE: {
    label: 'Modelo flexible',
    shortLabel: 'Flexible',
    note: 'Los fondos recaudados pueden consolidarse al finalizar aunque no se alcance la meta completa.',
  },
} as const

function fundingModelInfo(value: unknown) {
  if (value === 'FIXED' || value === 'FLEXIBLE') return fundingModelCopy[value]
  return null
}

function FundingStatusBadge({ campaign }: { campaign: Campaign }) {
  if (campaign.fundingModel === 'FIXED') {
    if (campaign.status === 'SUCCESSFUL' || campaign.progress.raisedAmount >= campaign.goalAmount) {
      return <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-700">Meta alcanzada</span>
    }
    if (campaign.status === 'FAILED') {
      return <span className="inline-flex rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">Meta no alcanzada</span>
    }
    return <span className="inline-flex rounded-full bg-yellow-50 border border-yellow-200 px-2.5 py-1 text-xs font-semibold text-yellow-700">Fondos retenidos</span>
  }
  if (campaign.fundingModel === 'FLEXIBLE') {
    return campaign.progress.raisedAmount > 0
      ? <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-700">Aportes consolidados</span>
      : <span className="inline-flex rounded-full bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">Sin aportes aún</span>
  }
  return <span className="inline-flex rounded-full bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">Modelo no disponible</span>
}

function rankingInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '—'
}

function SponsorRanking({ sponsors }: { sponsors: CampaignSponsorRanking[] }) {
  const ranked = sponsors
    .filter(sponsor => sponsor.sponsorName.trim() && Number.isFinite(sponsor.totalAmount) && sponsor.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5)
  const podium = ranked.slice(0, 3)
  const following = ranked.slice(3, 5)

  return (
    <section className="border-t border-gray-100 pt-5 mt-5" aria-labelledby="sponsor-ranking-title">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Comunidad</p>
          <h2 id="sponsor-ranking-title" className="font-display font-700 text-base text-gray-900 mt-0.5">Patrocinadores destacados</h2>
        </div>
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 21h8m-4-4v4M7 4h10v4a5 5 0 01-10 0V4zm0 2H4v1a4 4 0 004 4m9-5h3v1a4 4 0 01-4 4" />
        </svg>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-4 text-center text-xs text-gray-500">
          El ranking aparecerá cuando haya patrocinadores.
        </p>
      ) : (
        <>
          <ol className="grid grid-cols-3 items-end gap-2" aria-label="Podio de patrocinadores">
            {podium.map((sponsor, index) => {
              const rank = index + 1
              const visualOrder = rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'
              const podiumHeight = rank === 1 ? 'h-20' : rank === 2 ? 'h-14' : 'h-11'
              const medal = rank === 1 ? 'bg-yellow-400 text-yellow-950' : rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-amber-700 text-white'
              return (
                <li key={sponsor.sponsorId} className={`${visualOrder} min-w-0 text-center`} aria-label={`${rank}. ${sponsor.sponsorName}`}>
                  <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-sm ${rank === 1 ? 'bg-primary text-white' : 'bg-primary-light text-primary'}`} aria-hidden="true">
                    {rankingInitials(sponsor.sponsorName)}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-800 truncate mt-2" title={sponsor.sponsorName}>{sponsor.sponsorName}</p>
                  <div className={`${podiumHeight} mt-2 rounded-t-xl bg-gradient-to-b from-primary-light to-primary-light/35 border border-primary/10 flex items-start justify-center pt-2`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-800 ${medal}`}>{rank}</span>
                  </div>
                </li>
              )
            })}
          </ol>
          {following.length > 0 && (
            <ol start={4} className="mt-3 space-y-2" aria-label="Posiciones cuatro y cinco">
              {following.map((sponsor, index) => (
                <li key={sponsor.sponsorId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                  <span className="w-6 text-center text-xs font-800 text-gray-400">{index + 4}</span>
                  <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-primary" aria-hidden="true">{rankingInitials(sponsor.sponsorName)}</span>
                  <span className="min-w-0 truncate text-xs font-semibold text-gray-700">{sponsor.sponsorName}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}

function Projects({ campaigns, loading, error, navigate }: Pick<Props, 'campaigns' | 'loading' | 'error' | 'navigate'>) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display font-800 text-3xl text-gray-900">Explorar proyectos</h1>
        <p className="text-gray-500 text-sm mt-2 mb-8">Descubre campañas activas y apoya ideas con impacto.</p>
        {error && <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? <p className="py-16 text-center text-sm text-gray-500">Cargando campañas...</p> : campaigns.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center text-gray-500">No hay campañas activas disponibles.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => {
              const model = fundingModelInfo(campaign.fundingModel)
              return (
              <article key={campaign.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <CampaignMedia
                  url={campaign.mediaUrl}
                  mediaType={campaign.mediaType}
                  title={campaign.title}
                  className="h-48"
                />
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-full">{campaign.category}</span>
                    <span className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">{model ? `Modelo ${model.shortLabel.toLowerCase()}` : 'Modelo no disponible'}</span>
                  </div>
                  <h2 className="font-display font-700 text-gray-900 mt-3 line-clamp-2">{campaign.title}</h2>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{campaign.description}</p>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-4"><div className="h-full bg-primary" style={{ width: `${Math.min(campaign.progress?.percentage ?? (campaign.goalAmount > 0 ? Math.round((campaign.raisedAmount ?? 0) * 100 / campaign.goalAmount) : 0), 100)}%` }} /></div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2 mb-4">
                    <span><strong className="text-gray-900">${(campaign.progress?.raisedAmount ?? campaign.raisedAmount ?? 0).toLocaleString()}</strong> de ${campaign.goalAmount.toLocaleString()}</span>
                    <span>{campaign.progress?.percentage ?? 0}%</span>
                  </div>
                  <button onClick={() => navigate('campaign-page', campaign.id)} className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-hover">Ver campaña</button>
                </div>
              </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function isSafeMediaUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function mediaDomain(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.hostname : ''
  } catch {
    return ''
  }
}

function SafeMedia({ media, title }: { media: CampaignUpdateMedia; title: string }) {
  const [failed, setFailed] = useState(false)
  if (!isSafeMediaUrl(media.url) || failed) {
    return (
      <div className="min-h-36 bg-gray-100 rounded-xl flex items-center justify-center px-4 text-center">
        <p className="text-xs text-gray-500">No pudimos mostrar este medio.</p>
      </div>
    )
  }
  if (media.type === 'IMAGE') {
    return (
      <img
        src={media.url}
        alt={`Imagen de la actualización: ${title}`}
        className="w-full max-h-96 object-cover rounded-xl bg-gray-100"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="min-h-36 bg-gray-900 rounded-xl flex flex-col items-center justify-center px-5 py-8 text-center">
      <svg className="w-9 h-9 text-white mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.75 9l-5.5-3.25v6.5L14.75 9zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm font-semibold text-white">Video externo</p>
      <p className="text-xs text-gray-300 mt-1">{mediaDomain(media.url)}</p>
      <a href={media.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-xs font-semibold bg-white text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/40">
        Abrir video de forma segura
      </a>
    </div>
  )
}

interface DraftMedia {
  localId: string
  type: CampaignUpdateMediaType
  url: string
}

interface UpdateErrors {
  title: string[]
  body: string[]
  media: Record<string, string[]>
}

const emptyUpdateErrors = (): UpdateErrors => ({ title: [], body: [], media: {} })

function CampaignWall({ campaign, user }: { campaign: Campaign; user: User | null }) {
  const [updates, setUpdates] = useState<CampaignUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [media, setMedia] = useState<DraftMedia[]>([])
  const [errors, setErrors] = useState<UpdateErrors>(emptyUpdateErrors)
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [editorForbidden, setEditorForbidden] = useState(false)

  const isCreator = user?.role === 'creator' &&
    (user.id === campaign.creator.id || campaign.currentUserIsCreator === true)

  async function loadUpdates() {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.campaignUpdates(campaign.id)
      setUpdates([...response.content].sort((a, b) =>
        new Date(b.createdAt ?? b.publishedAt ?? 0).getTime() - new Date(a.createdAt ?? a.publishedAt ?? 0).getTime(),
      ))
    } catch (requestError) {
      setLoadError(apiErrorMessage(requestError, 'No pudimos cargar las actualizaciones.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setEditorForbidden(false)
    setTitle('')
    setBody('')
    setMedia([])
    setSuccess(false)
    void loadUpdates()
  }, [campaign.id])

  function addMedia() {
    if (media.length >= 5) return
    setMedia(current => [...current, { localId: crypto.randomUUID(), type: 'IMAGE', url: '' }])
    setSuccess(false)
  }

  function updateMedia(localId: string, field: 'type' | 'url', value: string) {
    setMedia(current => current.map(item => item.localId === localId ? { ...item, [field]: value } : item))
    setErrors(current => {
      const nextMedia = { ...current.media }
      delete nextMedia[localId]
      return { ...current, media: nextMedia }
    })
    setPublishError('')
    setSuccess(false)
  }

  function validate() {
    const next = emptyUpdateErrors()
    if (!title.trim()) next.title.push('El título es obligatorio.')
    if (!body.trim()) next.body.push('El contenido es obligatorio.')
    media.forEach(item => {
      const rowErrors: string[] = []
      if (item.type !== 'IMAGE' && item.type !== 'VIDEO') rowErrors.push('Selecciona un tipo de medio válido.')
      if (!item.url.trim()) rowErrors.push('La URL del medio es obligatoria.')
      else if (!isSafeMediaUrl(item.url.trim())) rowErrors.push('Usa una URL absoluta con http:// o https://. No se permiten esquemas peligrosos.')
      if (rowErrors.length) next.media[item.localId] = rowErrors
    })
    setErrors(next)
    return next.title.length === 0 && next.body.length === 0 && Object.keys(next.media).length === 0
  }

  function applyBackendErrors(details: unknown) {
    const next = emptyUpdateErrors()
    let fieldErrors: FieldValidationError[] = []
    if (Array.isArray(details)) fieldErrors = details as FieldValidationError[]
    else if (details && typeof details === 'object') {
      const errorBody = details as {
        fieldErrors?: FieldValidationError[]
        errors?: FieldValidationError[] | Record<string, string | string[]>
      }
      const source = errorBody.fieldErrors ?? errorBody.errors ?? []
      if (Array.isArray(source)) fieldErrors = source
      else {
        fieldErrors = Object.entries(source).flatMap(([field, messages]) =>
          (Array.isArray(messages) ? messages : [messages]).map(message => ({ field, message })),
        )
      }
    }
    fieldErrors.forEach(fieldError => {
      if (fieldError.field === 'title') next.title.push(fieldError.message)
      else if (fieldError.field === 'body') next.body.push(fieldError.message)
      else {
        const match = fieldError.field.match(/^media\[(\d+)]\.(url|type)$/)
        const row = match ? media[Number(match[1])] : null
        if (row) next.media[row.localId] = [...(next.media[row.localId] ?? []), fieldError.message]
      }
    })
    setErrors(next)
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault()
    if (!isCreator || editorForbidden || publishing || !validate()) return
    setPublishing(true)
    setPublishError('')
    setSuccess(false)
    try {
      const created = await api.createCampaignUpdate(campaign.id, {
        title: title.trim(),
        body: body.trim(),
        media: media.map(item => ({ type: item.type, url: item.url.trim() })),
      })
      setUpdates(current => [created, ...current.filter(update => update.id !== created.id)])
      setTitle('')
      setBody('')
      setMedia([])
      setErrors(emptyUpdateErrors())
      setSuccess(true)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setEditorForbidden(true)
      } else if (requestError instanceof ApiError && (requestError.status === 400 || requestError.code === 'VALIDATION_ERROR')) {
        applyBackendErrors(requestError.details)
        setPublishError(requestError.message)
      } else {
        setPublishError(apiErrorMessage(requestError, 'No pudimos publicar la actualización.'))
      }
    } finally {
      setPublishing(false)
    }
  }

  return (
    <section className="mt-10" aria-labelledby="campaign-updates-title">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">Muro de campaña</p>
          <h2 id="campaign-updates-title" className="font-display font-800 text-2xl text-gray-900">Actualizaciones del proyecto</h2>
        </div>
        {!loading && !loadError && <span className="text-xs text-gray-400">{updates.length} {updates.length === 1 ? 'publicación' : 'publicaciones'}</span>}
      </div>

      {isCreator && !editorForbidden && (
        <form onSubmit={publish} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display font-700 text-lg text-gray-900">Publicar un avance</h3>
              <p className="text-xs text-gray-500 mt-1">Comparte noticias verificables con quienes siguen tu campaña.</p>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary-light rounded-full px-2.5 py-1">Creador</span>
          </div>
          {success && <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-semibold text-green-800 fade-in" role="status">Actualización publicada</div>}
          {publishError && <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{publishError}</div>}
          <div className="space-y-4">
            <div>
              <label htmlFor="update-title" className="block text-sm font-medium text-gray-700 mb-1.5">Título *</label>
              <input id="update-title" value={title} onChange={event => { setTitle(event.target.value); setErrors(current => ({ ...current, title: [] })); setSuccess(false) }} disabled={publishing} aria-invalid={errors.title.length > 0} aria-describedby={errors.title.length ? 'update-title-errors' : undefined} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 ${errors.title.length ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="Ej: Comenzamos la primera producción" />
              <div id="update-title-errors">{errors.title.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5"><label htmlFor="update-body" className="block text-sm font-medium text-gray-700">Contenido *</label><span className="text-xs text-gray-400">{body.length}/3000</span></div>
              <textarea id="update-body" value={body} onChange={event => { setBody(event.target.value); setErrors(current => ({ ...current, body: [] })); setSuccess(false) }} maxLength={3000} rows={6} disabled={publishing} aria-invalid={errors.body.length > 0} aria-describedby={errors.body.length ? 'update-body-errors' : undefined} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 ${errors.body.length ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="Cuenta qué ha cambiado, qué lograron y cuáles son los próximos pasos." />
              <div id="update-body-errors">{errors.body.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div><p className="text-sm font-semibold text-gray-700">Medios externos</p><p className="text-xs text-gray-400 mt-0.5">Imágenes o videos mediante URL segura.</p></div>
                <button type="button" onClick={addMedia} disabled={media.length >= 5 || publishing} className="text-xs font-semibold text-primary border border-primary rounded-lg px-3 py-2 hover:bg-primary-light disabled:border-gray-200 disabled:text-gray-300">+ Agregar medio</button>
              </div>
              <div className="space-y-4">
                {media.map((item, index) => {
                  const rowErrors = errors.media[item.localId] ?? []
                  return (
                    <div key={item.localId} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-500">MEDIO {index + 1}</span>
                        <button type="button" onClick={() => setMedia(current => current.filter(mediaItem => mediaItem.localId !== item.localId))} disabled={publishing} className="text-xs font-semibold text-error">Eliminar</button>
                      </div>
                      <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
                        <div>
                          <label htmlFor={`${item.localId}-type`} className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                          <select id={`${item.localId}-type`} value={item.type} onChange={event => updateMedia(item.localId, 'type', event.target.value)} disabled={publishing} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary">
                            <option value="IMAGE">Imagen</option><option value="VIDEO">Video</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`${item.localId}-url`} className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                          <input id={`${item.localId}-url`} type="url" value={item.url} onChange={event => updateMedia(item.localId, 'url', event.target.value)} disabled={publishing} aria-invalid={rowErrors.length > 0} aria-describedby={rowErrors.length ? `${item.localId}-errors` : undefined} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${rowErrors.length ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="https://..." />
                        </div>
                      </div>
                      <div id={`${item.localId}-errors`}>{rowErrors.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
                      {isSafeMediaUrl(item.url) && <div className="mt-3"><SafeMedia media={{ type: item.type, url: item.url }} title={title || 'Vista previa'} /></div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button type="submit" disabled={publishing} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
              {publishing && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
              {publishing ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Cargando actualizaciones">
          {[1, 2].map(item => <div key={item} className="h-44 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : loadError ? (
        <div className="bg-white border border-red-100 rounded-2xl p-6 text-center">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" onClick={() => void loadUpdates()} className="mt-3 text-sm font-semibold text-primary hover:underline">Reintentar</button>
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-12 px-6 text-center">
          <p className="font-display font-700 text-gray-700">Aún no hay actualizaciones</p>
          <p className="text-sm text-gray-400 mt-1">Las noticias y avances del proyecto aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map(update => (
            <article key={update.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {update.media.length > 0 && (
                <div className={`grid gap-2 p-3 bg-gray-50 ${update.media.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {update.media.map((item, index) => <SafeMedia key={item.id ?? `${update.id}-${index}`} media={item} title={update.title} />)}
                </div>
              )}
              <div className="p-6">
                <p className="text-xs text-gray-400">{new Date(update.createdAt ?? update.publishedAt ?? 0).toLocaleString('es-ES')}</p>
                <h3 className="font-display font-700 text-xl text-gray-900 mt-2">{update.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mt-3">{update.body}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default function CampaignPage(props: Props) {
  const { campaignId, campaigns, loading, error, navigate, user, campaignOverride } = props
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [detailLoading, setDetailLoading] = useState(Boolean(campaignId))
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    if (!campaignId) {
      setCampaign(null)
      setDetailLoading(false)
      return
    }
    let active = true
    setDetailLoading(true)
    setDetailError('')
    void api.campaign(campaignId)
      .then(result => {
        if (!active) return
        setCampaign(campaignOverride?.id === campaignId
          ? { ...result, ...campaignOverride, topSponsors: result.topSponsors ?? campaignOverride.topSponsors }
          : result)
      })
      .catch(requestError => { if (active) setDetailError(apiErrorMessage(requestError, 'No pudimos cargar la campaña.')) })
      .finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [campaignId])

  useEffect(() => {
    if (campaignOverride?.id === campaignId) {
      setCampaign(current => ({
        ...current,
        ...campaignOverride,
        topSponsors: current?.topSponsors ?? campaignOverride.topSponsors,
      }))
    }
  }, [campaignId, campaignOverride])

  if (!campaignId) return <Projects campaigns={campaigns} loading={loading} error={error} navigate={navigate} />
  if (detailLoading) return <div className="min-h-screen bg-bg flex items-center justify-center text-sm font-semibold text-gray-600">Cargando campaña...</div>
  if (!campaign) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-md">
        <p className="text-error text-sm mb-4">{detailError || 'No encontramos esta campaña.'}</p>
        <button onClick={() => navigate('projects')} className="text-primary font-semibold text-sm">Volver a explorar</button>
      </div>
    </div>
  )

  const canContribute = user?.role === 'sponsor' && campaign.status === 'ACTIVE' && campaign.progress.secondsRemaining > 0
  const cta = user?.role !== 'sponsor' ? 'Inicia sesión como patrocinador para aportar' : canContribute ? 'Apoyar este proyecto' : 'Campaña no disponible'
  const model = fundingModelInfo(campaign.fundingModel)
  const sortedRewards = [...campaign.rewards].sort((a, b) => a.minimumAmount - b.minimumAmount)
  const isFailedAllOrNothing = campaign.status === 'FAILED' && campaign.fundingModel === 'FIXED' && campaign.progress.raisedAmount < campaign.goalAmount
  const fundingModelLocked = campaign.fundingModelEditable === false || campaign.progress.sponsorsCount > 0
  const sponsorRanking = campaign.topSponsors ?? []
  return (
    <div className="min-h-screen bg-bg">
      <button onClick={() => navigate('projects')} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 block text-sm text-gray-500 hover:text-primary">← Volver a explorar</button>
      {campaign.mediaUrl ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5"><img src={campaign.mediaUrl} alt={campaign.title} className="w-full h-64 sm:h-96 object-cover rounded-2xl bg-gray-100" /></div>
      ) : <div className="max-w-7xl mx-auto h-20" />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isFailedAllOrNothing && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3" role="status" data-frame="S3_HU322_CampaignFailed">
            <svg className="w-5 h-5 text-error shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 3.7L2.5 17.2A2 2 0 004.2 20h15.6a2 2 0 001.7-2.8L13.7 3.7a2 2 0 00-3.4 0z" /></svg>
            <div><p className="font-semibold text-red-800">Esta campaña no alcanzó su meta. Los aportes fueron reembolsados.</p><p className="text-xs text-red-700 mt-1">Consulta el historial de transacciones para revisar el comprobante y su referencia original.</p></div>
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">{campaign.category}</span>
              <span className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1 rounded-full">
                {model?.label ?? 'Modelo no disponible'}
              </span>
            </div>
            <h1 className="font-display font-800 text-3xl sm:text-4xl text-gray-900 mt-4">{campaign.title}</h1>
            <p className="text-sm text-gray-500 mt-2">por <strong className="text-gray-800">{campaign.creator.name}</strong></p>
            <div className={`mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${model ? 'border-primary/15 bg-primary-light/50 text-gray-600' : 'border-yellow-200 bg-yellow-50 text-yellow-800'}`} data-frame="S3_HU212_Published">
              <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 4.5h.008v.008H12V16.5z" /></svg>
              <div>
                <p><strong className="text-gray-800">{model?.label ?? 'Modelo no disponible'}.</strong> {model?.note ?? 'El servidor devolvió un modelo que no podemos interpretar. Intenta recargar o contacta soporte.'}</p>
                <div className="mt-2"><FundingStatusBadge campaign={campaign} /></div>
                {user?.role === 'creator' && fundingModelLocked && (
                  <p className="text-xs mt-2" data-frame="S3_HU212_ModelLocked">
                    {campaign.fundingModelLockedReason || 'El modelo está bloqueado porque la campaña ya recibió aportes.'}
                  </p>
                )}
              </div>
            </div>
            <CampaignTabs
              key={campaign.id}
              campaign={campaign}
              user={user}
              onLogin={() => navigate('login')}
              information={(
                <div>
                  <h2 className="font-display font-700 text-xl mb-4">Sobre esta campaña</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
                </div>
              )}
              updates={<CampaignWall campaign={campaign} user={user} />}
            />
          </div>
          <aside className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
              <div className="flex items-end justify-between">
                <p className="font-display font-800 text-3xl">${campaign.progress.raisedAmount.toLocaleString()}</p>
                <p className="font-bold text-primary">{campaign.progress.percentage}%</p>
              </div>
              <p className="text-xs text-gray-400">recaudados de ${campaign.goalAmount.toLocaleString()}</p>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden my-3"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(campaign.progress.percentage, 100)}%` }} /></div>
              <p className="text-xs text-gray-500">Faltan <strong>${campaign.progress.remainingAmount.toLocaleString()}</strong></p>
              <div className="grid grid-cols-2 gap-3 my-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="font-display font-700 text-xl">{campaign.progress.sponsorsCount}</p><p className="text-xs text-gray-500">Patrocinadores</p></div>
                <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="font-display font-700 text-sm text-primary">{campaign.status}</p><p className="text-xs text-gray-500">Estado</p></div>
              </div>
              <SponsorRanking sponsors={sponsorRanking} />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tiempo restante</p>
              <Countdown initialSeconds={campaign.progress.secondsRemaining} />
              {!isFailedAllOrNothing && <button disabled={!canContribute} onClick={() => navigate('payment-flow', campaign.id)} className="w-full mt-6 bg-primary text-white rounded-xl py-3 text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">{cta}</button>}
              {campaign.progress.percentage === 0 && <p className="text-center text-xs text-gray-400 mt-3">¡Sé el primero en apoyar este proyecto!</p>}
            </div>
            <section aria-labelledby="campaign-rewards-title">
              <div className="flex items-end justify-between gap-3 mb-3">
                <h2 id="campaign-rewards-title" className="font-display font-700 text-lg text-gray-900">Recompensas</h2>
                {sortedRewards.length > 0 && <span className="text-xs text-gray-400">{sortedRewards.length} {sortedRewards.length === 1 ? 'opción' : 'opciones'}</span>}
              </div>
              {sortedRewards.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-5 text-sm text-gray-500">Esta campaña acepta aportes libres y no ofrece recompensas.</div>
              ) : (
                <div className="space-y-3">
                  {sortedRewards.map(reward => {
                    const soldOut = reward.quantity !== null && reward.claimedQuantity >= reward.quantity
                    const remaining = reward.quantity === null ? null : Math.max(reward.quantity - reward.claimedQuantity, 0)
                    const selectable = canContribute && reward.available && !soldOut
                    const frame = soldOut
                      ? 'S3_HU213_Reward_SoldOut'
                      : reward.quantity === null
                        ? 'S3_HU213_Reward_Unlimited'
                        : 'S3_HU213_Reward_LimitedRemaining'
                    return (
                      <article key={reward.id} data-frame={frame} className={`bg-white rounded-2xl border shadow-sm p-5 ${soldOut ? 'border-red-200' : 'border-gray-100'}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Aporta desde</p>
                        <p className="font-display font-800 text-2xl text-gray-900 mt-1">${reward.minimumAmount.toLocaleString('es-ES')}</p>
                        <h3 className="font-display font-700 text-gray-900 mt-4">{reward.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed mt-1.5">{reward.description}</p>
                        <p className="text-xs text-gray-500 mt-3">
                          Entrega estimada: <strong className="text-gray-700">{reward.estimatedDeliveryDate ? new Date(`${reward.estimatedDeliveryDate.slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 'Por confirmar'}</strong>
                        </p>
                        <div className={`mt-4 rounded-lg px-3 py-2 text-xs font-semibold ${soldOut ? 'bg-red-50 text-error' : 'bg-gray-50 text-gray-600'}`}>
                          {soldOut ? 'Agotado' : reward.quantity === null ? 'Cupos ilimitados' : `Quedan ${remaining} cupos`}
                        </div>
                        <button
                          type="button"
                          disabled={!selectable}
                          aria-disabled={!selectable}
                          onClick={() => props.onSelectReward(campaign.id, reward.id)}
                          className="w-full mt-4 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {soldOut ? 'Agotado' : 'Seleccionar'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
