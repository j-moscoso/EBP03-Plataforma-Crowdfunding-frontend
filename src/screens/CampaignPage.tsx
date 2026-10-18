import { useEffect, useState } from 'react'
import type {
  Campaign,
  CampaignSummary,
  CampaignUpdate,
  CampaignUpdateMedia,
  CampaignUpdateMediaType,
  FieldValidationError,
  PageResponse,
  Screen,
  User,
} from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'
import { formatMoney, isCurrencyCode } from '../utils/money'
import CampaignMedia, { isPublicHttpsUrl } from '../components/CampaignMedia'

interface Props {
  campaignId: string | null
  campaigns: CampaignSummary[]
  loading: boolean
  error: string
  navigate: (screen: Screen, id?: string | null) => void
  user: User | null
  onSessionExpired: () => void
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
            {campaigns.map(campaign => (
              <article key={campaign.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <CampaignMedia url={campaign.mediaUrl} mediaType={campaign.mediaType} title={campaign.title} className="h-48" />
                <div className="p-5">
                  <span className="text-xs font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-full">{campaign.category}</span>
                  <h2 className="font-display font-700 text-gray-900 mt-3 line-clamp-2">{campaign.title}</h2>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{campaign.description}</p>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-4"><div className="h-full bg-primary" style={{ width: `${Math.min(campaign.progress.percentage, 100)}%` }} /></div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2 mb-4">
                    <span><strong className="text-gray-900">{formatMoney(campaign.progress.raisedAmount, campaign.currency)}</strong> de {formatMoney(campaign.goalAmount, campaign.currency)}</span>
                    <span>{campaign.progress.percentage}%</span>
                  </div>
                  <button onClick={() => navigate('campaign-page', campaign.id)} className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-hover">Ver campaña</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SafeMedia({ media, title }: { media: CampaignUpdateMedia; title: string }) {
  return (
    <CampaignMedia
      url={media.url}
      mediaType={media.type}
      title={title}
      className="w-full aspect-video rounded-xl"
    />
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

function CampaignWall({ campaign, user, onSessionExpired }: { campaign: Campaign; user: User | null; onSessionExpired: () => void }) {
  const [updatesResponse, setUpdatesResponse] = useState<PageResponse<CampaignUpdate> | null>(null)
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

  async function loadUpdates(pageNumber = 0) {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.campaignUpdates(campaign.id, pageNumber, 10)
      setUpdatesResponse(response)
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
    setUpdatesResponse(null)
    void loadUpdates(0)
  }, [campaign.id])

  function addMedia() {
    if (media.length >= 10) return
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
    else if (title.trim().length > 140) next.title.push('El título no puede superar 140 caracteres.')
    if (!body.trim()) next.body.push('El contenido es obligatorio.')
    media.forEach(item => {
      const rowErrors: string[] = []
      if (item.type !== 'IMAGE' && item.type !== 'VIDEO') rowErrors.push('Selecciona un tipo de medio válido.')
      if (!item.url.trim()) rowErrors.push('La URL del medio es obligatoria.')
      else if (!isPublicHttpsUrl(item.url.trim())) rowErrors.push('Usa una URL HTTPS pública. No se permiten localhost ni otros esquemas.')
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
        const match = fieldError.field.match(/^media\[(\d+)]\.(url|type|mediaType)$/)
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
      if ((updatesResponse?.page ?? 0) === 0) {
        setUpdatesResponse(current => {
          if (!current) return current
          const totalElements = current.totalElements + 1
          return {
            ...current,
            content: [created, ...current.content.filter(update => update.id !== created.id)].slice(0, current.pageSize),
            totalElements,
            totalPages: Math.ceil(totalElements / current.pageSize),
          }
        })
      } else {
        void loadUpdates(0)
      }
      setTitle('')
      setBody('')
      setMedia([])
      setErrors(emptyUpdateErrors())
      setSuccess(true)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onSessionExpired()
      } else if (requestError instanceof ApiError && requestError.status === 403) {
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
        {!loading && !loadError && updatesResponse && <span className="text-xs text-gray-400">{updatesResponse.totalElements} {updatesResponse.totalElements === 1 ? 'publicación' : 'publicaciones'}</span>}
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
              <input id="update-title" value={title} onChange={event => { setTitle(event.target.value); setErrors(current => ({ ...current, title: [] })); setSuccess(false) }} maxLength={140} disabled={publishing} aria-invalid={errors.title.length > 0} aria-describedby={errors.title.length ? 'update-title-errors' : undefined} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 ${errors.title.length ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="Ej: Comenzamos la primera producción" />
              <div id="update-title-errors">{errors.title.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5"><label htmlFor="update-body" className="block text-sm font-medium text-gray-700">Contenido *</label><span className="text-xs text-gray-400">{body.length}/10000</span></div>
              <textarea id="update-body" value={body} onChange={event => { setBody(event.target.value); setErrors(current => ({ ...current, body: [] })); setSuccess(false) }} maxLength={10000} rows={6} disabled={publishing} aria-invalid={errors.body.length > 0} aria-describedby={errors.body.length ? 'update-body-errors' : undefined} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 ${errors.body.length ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} placeholder="Cuenta qué ha cambiado, qué lograron y cuáles son los próximos pasos." />
              <div id="update-body-errors">{errors.body.map(message => <p key={message} className="text-xs text-error mt-1">{message}</p>)}</div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div><p className="text-sm font-semibold text-gray-700">Medios externos</p><p className="text-xs text-gray-400 mt-0.5">Imágenes o videos mediante URL HTTPS segura (máximo 10).</p></div>
                <button type="button" onClick={addMedia} disabled={media.length >= 10 || publishing} className="text-xs font-semibold text-primary border border-primary rounded-lg px-3 py-2 hover:bg-primary-light disabled:border-gray-200 disabled:text-gray-300">+ Agregar medio</button>
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
                      {isPublicHttpsUrl(item.url) && <div className="mt-3"><SafeMedia media={{ type: item.type, url: item.url, sortOrder: index }} title={title || 'Vista previa'} /></div>}
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
      ) : (updatesResponse?.content.length ?? 0) === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-12 px-6 text-center">
          <p className="font-display font-700 text-gray-700">Aún no hay actualizaciones</p>
          <p className="text-sm text-gray-400 mt-1">Las noticias y avances del proyecto aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updatesResponse?.content.map(update => (
            <article key={update.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {update.media.length > 0 && (
                <div className={`grid gap-2 p-3 bg-gray-50 ${update.media.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {update.media.map((item, index) => <SafeMedia key={item.id ?? `${update.id}-${index}`} media={item} title={update.title} />)}
                </div>
              )}
              <div className="p-6">
                <p className="text-xs text-gray-400">{new Date(update.publishedAt).toLocaleString('es-ES')}</p>
                <h3 className="font-display font-700 text-xl text-gray-900 mt-2">{update.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mt-3">{update.body}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !loadError && updatesResponse && updatesResponse.totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Paginación de actualizaciones">
          <p className="text-xs text-gray-500">Página {updatesResponse.page + 1} de {updatesResponse.totalPages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={updatesResponse.page <= 0} onClick={() => void loadUpdates(updatesResponse.page - 1)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 disabled:text-gray-300 disabled:bg-gray-50">Anterior</button>
            <button type="button" disabled={updatesResponse.page + 1 >= updatesResponse.totalPages} onClick={() => void loadUpdates(updatesResponse.page + 1)} className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400">Siguiente</button>
          </div>
        </nav>
      )}
    </section>
  )
}

export default function CampaignPage(props: Props) {
  const { campaignId, campaigns, loading, error, navigate, user, onSessionExpired } = props
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
      .then(result => { if (active) setCampaign(result) })
      .catch(requestError => { if (active) setDetailError(apiErrorMessage(requestError, 'No pudimos cargar la campaña.')) })
      .finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [campaignId])

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

  const currencyAvailable = campaign.currencyStatus === 'CONFIGURED' && isCurrencyCode(campaign.currency)
  const canContribute = user?.role === 'sponsor' && campaign.status === 'ACTIVE' && campaign.progress.secondsRemaining > 0 && currencyAvailable
  const cta = user?.role !== 'sponsor'
    ? 'Inicia sesión como patrocinador para aportar'
    : !currencyAvailable
      ? 'Moneda pendiente de configuración'
      : canContribute ? 'Apoyar este proyecto' : 'Campaña no disponible'
  return (
    <div className="min-h-screen bg-bg">
      <button onClick={() => navigate('projects')} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 block text-sm text-gray-500 hover:text-primary">← Volver a explorar</button>
      {campaign.mediaUrl ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5"><CampaignMedia url={campaign.mediaUrl} mediaType={campaign.mediaType} title={campaign.title} className="w-full h-64 sm:h-96 rounded-2xl" /></div>
      ) : <div className="max-w-7xl mx-auto h-20" />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <span className="text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">{campaign.category}</span>
            <h1 className="font-display font-800 text-3xl sm:text-4xl text-gray-900 mt-4">{campaign.title}</h1>
            <p className="text-sm text-gray-500 mt-2">por <strong className="text-gray-800">{campaign.creator.name}</strong></p>
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-8">
              <h2 className="font-display font-700 text-xl mb-4">Sobre esta campaña</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
            </section>
            <section className="mt-6">
              <h2 className="font-display font-700 text-xl mb-4">Recompensas</h2>
              {campaign.rewards.length === 0 ? <div className="bg-white border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">Esta campaña no ofrece recompensas.</div> : (
                <div className="space-y-3">
                  {campaign.rewards.map(reward => (
                    <article key={reward.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex justify-between gap-4"><h3 className="font-display font-700 text-gray-900">{reward.title}</h3><span className="font-display font-800 text-primary">{formatMoney(reward.minimumAmount, campaign.currency)}+</span></div>
                      <p className="text-sm text-gray-500 mt-2">{reward.description}</p>
                      {reward.quantity != null && <p className="text-xs text-gray-400 mt-3">{reward.claimedQuantity ?? 0} de {reward.quantity} reclamadas</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
            <CampaignWall campaign={campaign} user={user} onSessionExpired={onSessionExpired} />
          </div>
          <aside>
            <div className="lg:sticky lg:top-20 bg-white rounded-2xl border border-gray-100 shadow-md p-6">
              <div className="flex items-end justify-between">
                <p className="font-display font-800 text-3xl">{formatMoney(campaign.progress.raisedAmount, campaign.currency)}</p>
                <p className="font-bold text-primary">{campaign.progress.percentage}%</p>
              </div>
              <p className="text-xs text-gray-400">recaudados de {formatMoney(campaign.goalAmount, campaign.currency)}</p>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden my-3"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(campaign.progress.percentage, 100)}%` }} /></div>
              <p className="text-xs text-gray-500">Faltan <strong>{formatMoney(campaign.progress.remainingAmount, campaign.currency)}</strong></p>
              <div className="grid grid-cols-2 gap-3 my-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="font-display font-700 text-xl">{campaign.progress.sponsorsCount}</p><p className="text-xs text-gray-500">Patrocinadores</p></div>
                <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="font-display font-700 text-sm text-primary">{campaign.status}</p><p className="text-xs text-gray-500">Estado</p></div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tiempo restante</p>
              <Countdown initialSeconds={campaign.progress.secondsRemaining} />
              <button disabled={!canContribute} onClick={() => navigate('payment-flow', campaign.id)} className="w-full mt-6 bg-primary text-white rounded-xl py-3 text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">{cta}</button>
              {!currencyAvailable && <p className="text-center text-xs text-warning mt-3">Esta campaña aún no permite aportes porque no tiene una moneda autorizada.</p>}
              {campaign.progress.percentage === 0 && <p className="text-center text-xs text-gray-400 mt-3">¡Sé el primero en apoyar este proyecto!</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
