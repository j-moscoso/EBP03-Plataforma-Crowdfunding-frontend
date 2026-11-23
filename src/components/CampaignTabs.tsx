import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Campaign, CampaignComment, FieldValidationError, PageResponse, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

type Tab = 'information' | 'updates' | 'discussion' | 'faq'

interface Props {
  campaign: Campaign
  user: User | null
  information: ReactNode
  updates: ReactNode
  onLogin: () => void
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'information', label: 'Información' },
  { id: 'updates', label: 'Actualizaciones' },
  { id: 'discussion', label: 'Discusión' },
  { id: 'faq', label: 'Preguntas frecuentes' },
]

function tabFromUrl(): Tab {
  const value = new URLSearchParams(location.search).get('tab')
  return tabs.some(tab => tab.id === value) ? value as Tab : 'information'
}

function bodyError(details: unknown) {
  let fields: FieldValidationError[] = []
  if (Array.isArray(details)) fields = details as FieldValidationError[]
  else if (details && typeof details === 'object') {
    const source = (details as { fieldErrors?: FieldValidationError[]; errors?: FieldValidationError[] | Record<string, string | string[]> }).fieldErrors
      ?? (details as { errors?: FieldValidationError[] | Record<string, string | string[]> }).errors
      ?? []
    fields = Array.isArray(source)
      ? source
      : Object.entries(source).flatMap(([field, messages]) =>
          (Array.isArray(messages) ? messages : [messages]).map(message => ({ field, message })))
  }
  return fields.find(error => error.field === 'body')?.message
}

function Pagination({ response, loading, onPage }: {
  response: PageResponse<CampaignComment>
  loading: boolean
  onPage: (page: number) => void
}) {
  if (response.totalPages <= 1) return null
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginación">
      <p className="text-xs text-gray-500">Página {response.page + 1} de {response.totalPages}</p>
      <div className="flex gap-2">
        <button type="button" disabled={loading || response.page === 0} onClick={() => onPage(response.page - 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:text-gray-300">Anterior</button>
        <button type="button" disabled={loading || response.page + 1 >= response.totalPages} onClick={() => onPage(response.page + 1)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:bg-gray-200">Siguiente</button>
      </div>
    </nav>
  )
}

export default function CampaignTabs({ campaign, user, information, updates, onLogin }: Props) {
  const [tab, setTab] = useState<Tab>(tabFromUrl)
  const [discussion, setDiscussion] = useState<PageResponse<CampaignComment> | null>(null)
  const [faq, setFaq] = useState<PageResponse<CampaignComment> | null>(null)
  const [discussionLoading, setDiscussionLoading] = useState(false)
  const [faqLoading, setFaqLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [body, setBody] = useState('')
  const [bodyValidation, setBodyValidation] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replyError, setReplyError] = useState('')
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [authRequired, setAuthRequired] = useState(false)
  const isCreator = user?.role === 'creator' && (user.id === campaign.creator.id || campaign.currentUserIsCreator === true)

  function selectTab(next: Tab, updateHistory = true) {
    setTab(next)
    if (!updateHistory) return
    const url = new URL(location.href)
    if (next === 'information') url.searchParams.delete('tab')
    else url.searchParams.set('tab', next)
    history.pushState({}, '', `${url.pathname}${url.search}`)
    window.requestAnimationFrame(() => window.dispatchEvent(new Event('impulsafund:route-ready')))
  }

  useEffect(() => {
    const onPopState = () => selectTab(tabFromUrl(), false)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    setDiscussion(null)
    setFaq(null)
    setBody('')
    setReplyTo(null)
    setSuccess(false)
    setLoadError('')
  }, [campaign.id])

  async function loadDiscussion(page = 0) {
    setDiscussionLoading(true)
    setLoadError('')
    try {
      setDiscussion(await api.campaignDiscussion(campaign.id, page, 20))
    } catch (error) {
      handleReadError(error, 'No pudimos cargar la discusión.')
    } finally {
      setDiscussionLoading(false)
    }
  }

  async function loadFaq(page = 0) {
    setFaqLoading(true)
    setLoadError('')
    try {
      setFaq(await api.campaignFaq(campaign.id, page, 20))
    } catch (error) {
      handleReadError(error, 'No pudimos cargar las preguntas frecuentes.')
    } finally {
      setFaqLoading(false)
    }
  }

  function handleReadError(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        setAuthRequired(true)
        setLoadError('Tu sesión expiró. Inicia sesión para continuar.')
        return
      }
      if (error.status === 403) {
        setForbidden(true)
        setLoadError('Sin permisos')
        return
      }
      if (error.status === 404) {
        setLoadError('No encontramos la campaña o el comentario solicitado.')
        return
      }
    }
    setLoadError(apiErrorMessage(error, fallback))
  }

  useEffect(() => {
    if (tab === 'discussion') void loadDiscussion()
    if (tab === 'faq') void loadFaq()
  }, [tab, campaign.id])

  function validate(value: string) {
    if (!value.trim()) return 'La pregunta no puede estar vacía'
    if (value.length > 1000) return 'La pregunta no puede superar 1000 caracteres'
    return ''
  }

  async function publishQuestion(event: React.FormEvent) {
    event.preventDefault()
    const validation = validate(body)
    setBodyValidation(validation)
    setSuccess(false)
    if (validation || publishing) return
    if (!user) {
      setAuthRequired(true)
      return
    }
    setPublishing(true)
    setLoadError('')
    try {
      const created = await api.createDiscussionComment(campaign.id, body.trim())
      setDiscussion(current => current
        ? { ...current, content: [created, ...current.content.filter(comment => comment.id !== created.id)], totalElements: current.totalElements + 1 }
        : { content: [created], page: 0, pageSize: 20, totalElements: 1, totalPages: 1 })
      setBody('')
      setBodyValidation('')
      setSuccess(true)
    } catch (error) {
      await handleMutationError(error, () => loadDiscussion(discussion?.page ?? 0), message => setBodyValidation(message))
    } finally {
      setPublishing(false)
    }
  }

  async function publishReply(parentCommentId: string) {
    const validation = validate(replyBody)
    setReplyError(validation)
    if (!isCreator || forbidden || validation || replyingId) return
    setReplyingId(parentCommentId)
    setLoadError('')
    try {
      const created = await api.replyToDiscussionComment(campaign.id, parentCommentId, replyBody.trim())
      setDiscussion(current => current ? {
        ...current,
        content: [...current.content.filter(comment => comment.id !== created.id), created],
        totalElements: current.totalElements + 1,
      } : current)
      setReplyBody('')
      setReplyTo(null)
      setReplyError('')
    } catch (error) {
      await handleMutationError(error, () => loadDiscussion(discussion?.page ?? 0), message => setReplyError(message))
    } finally {
      setReplyingId(null)
    }
  }

  async function convertToFaq(comment: CampaignComment) {
    if (!isCreator || forbidden || convertingId) return
    setConvertingId(comment.id)
    setLoadError('')
    try {
      const converted = (await api.convertDiscussionCommentToFaq(campaign.id, comment.id)) || {
        ...comment,
        isOfficialAnswer: true,
        isFaq: true,
      }
      setDiscussion(current => current ? {
        ...current,
        content: current.content.map(item => item.id === converted.id ? converted : item),
      } : current)
      await loadFaq(0)
    } catch (error) {
      await handleMutationError(error, () => loadDiscussion(discussion?.page ?? 0))
    } finally {
      setConvertingId(null)
    }
  }

  async function handleMutationError(error: unknown, reload: () => Promise<void>, setFieldError?: (message: string) => void) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        setFieldError?.(bodyError(error.details) || error.message)
        return
      }
      if (error.status === 401) {
        setAuthRequired(true)
        setLoadError('Tu sesión expiró. Inicia sesión para continuar. Conservamos el texto escrito.')
        return
      }
      if (error.status === 403) {
        setForbidden(true)
        setLoadError('Sin permisos')
        return
      }
      if (error.status === 404) {
        setLoadError('No encontramos la campaña o el comentario solicitado.')
        return
      }
      if (error.status === 409) {
        await reload()
        setLoadError('El hilo cambió mientras publicabas. Lo recargamos para evitar duplicados.')
        return
      }
    }
    setLoadError(apiErrorMessage(error, 'No pudimos completar la acción.'))
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return
    event.preventDefault()
    selectTab(tabs[nextIndex].id)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }

  const rootComments = discussion?.content.filter(comment => !comment.parentCommentId) ?? []
  const discussionFrame = discussionLoading
    ? 'S3_HU411_Discussion_Loading'
    : bodyValidation
      ? 'S3_HU411_Discussion_Validation'
      : success
        ? 'S3_HU411_Discussion_Success'
        : 'S3_HU411_Discussion_Default'

  return (
    <section className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" aria-labelledby="campaign-content-title">
      <h2 id="campaign-content-title" className="sr-only">Contenido de la campaña</h2>
      <div className="overflow-x-auto border-b border-gray-100">
        <div className="flex min-w-max" role="tablist" aria-label="Contenido de la campaña">
          {tabs.map((item, index) => (
            <button
              key={item.id}
              id={`campaign-tab-${item.id}`}
              type="button"
              role="tab"
              tabIndex={tab === item.id ? 0 : -1}
              aria-selected={tab === item.id}
              aria-controls={`campaign-panel-${item.id}`}
              onClick={() => selectTab(item.id)}
              onKeyDown={event => onTabKeyDown(event, index)}
              className={`min-h-12 px-5 py-4 text-sm font-semibold border-b-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30 ${tab === item.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div id={`campaign-panel-${tab}`} role="tabpanel" aria-labelledby={`campaign-tab-${tab}`} className="p-5 sm:p-6">
        {tab === 'information' && information}
        {tab === 'updates' && updates}
        {tab === 'discussion' && (
          <div data-frame={discussionFrame}>
            {success && <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800" role="status" aria-live="polite">Pregunta publicada</div>}
            {loadError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{loadError}{authRequired && <button type="button" onClick={onLogin} className="ml-2 font-semibold underline">Iniciar sesión</button>}</div>}
            {user ? (
              <form onSubmit={publishQuestion} noValidate className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-5 mb-6">
                <label htmlFor="discussion-question" className="block text-sm font-semibold text-gray-800 mb-2">Publicar una pregunta</label>
                <textarea
                  id="discussion-question"
                  value={body}
                  onChange={event => { setBody(event.target.value); setBodyValidation(''); setSuccess(false) }}
                  rows={4}
                  disabled={publishing}
                  aria-invalid={Boolean(bodyValidation)}
                  aria-describedby={bodyValidation ? 'discussion-question-error discussion-question-count' : 'discussion-question-count'}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 ${bodyValidation ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="Escribe tu pregunta para el creador..."
                />
                <div className="flex items-start justify-between gap-3 mt-2">
                  <div>{bodyValidation && <p id="discussion-question-error" className="text-xs text-error">{bodyValidation}</p>}</div>
                  <span id="discussion-question-count" className={`text-xs ${body.length > 1000 ? 'text-error font-semibold' : 'text-gray-400'}`} aria-live="polite">{body.length}/1000</span>
                </div>
                <div className="flex justify-end mt-3">
                  <button type="submit" disabled={publishing} className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300">{publishing ? 'Publicando...' : 'Enviar'}</button>
                </div>
              </form>
            ) : (
              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-500">Inicia sesión para publicar una pregunta. <button type="button" onClick={onLogin} className="font-semibold text-primary underline">Iniciar sesión</button></div>
            )}

            {discussionLoading ? (
              <div className="space-y-4" role="status" aria-label="Cargando discusión">
                {[1, 2, 3].map(item => <div key={item} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : !loadError && rootComments.length === 0 ? (
              <div className="py-10 text-center"><p className="font-display font-700 text-gray-700">Aún no hay preguntas</p><p className="text-sm text-gray-400 mt-1">Sé la primera persona en preguntar.</p></div>
            ) : (
              <div className="space-y-5">
                {rootComments.map(comment => {
                  const replies = discussion?.content.filter(item => item.parentCommentId === comment.id) ?? []
                  return (
                    <article key={comment.id} className="rounded-xl border border-gray-100 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-bold shrink-0" aria-hidden="true">{comment.authorName[0]?.toUpperCase() || 'P'}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{comment.authorName}</p><span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString('es-ES')}</span></div>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mt-2">{comment.body}</p>
                          {isCreator && !forbidden && <button type="button" onClick={() => { setReplyTo(comment.id); setReplyBody(''); setReplyError('') }} className="min-h-11 mt-2 px-1 text-xs font-semibold text-primary">Responder</button>}
                        </div>
                      </div>

                      {replies.map(reply => (
                        <div key={reply.id} data-frame="S3_HU411_OfficialAnswer" className="ml-4 sm:ml-12 mt-3 rounded-xl border border-primary/15 bg-primary-light/30 p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">{reply.authorName[0]?.toUpperCase() || 'C'}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{reply.authorName}</p>{reply.isOfficialAnswer && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Respuesta oficial</span>}{reply.isFaq && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">En FAQ</span>}<span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleString('es-ES')}</span></div>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{reply.body}</p>
                              {isCreator && !forbidden && reply.isOfficialAnswer && !reply.isFaq && <button type="button" disabled={convertingId === reply.id} onClick={() => void convertToFaq(reply)} className="min-h-11 mt-2 text-xs font-semibold text-primary disabled:text-gray-300">{convertingId === reply.id ? 'Convirtiendo...' : 'Convertir a FAQ'}</button>}
                            </div>
                          </div>
                        </div>
                      ))}

                      {replyTo === comment.id && isCreator && !forbidden && (
                        <div data-frame="S3_HU411_CreatorReply" className="ml-4 sm:ml-12 mt-3">
                          <label htmlFor={`reply-${comment.id}`} className="block text-xs font-semibold text-gray-700 mb-1.5">Responder como creador</label>
                          <textarea id={`reply-${comment.id}`} value={replyBody} onChange={event => { setReplyBody(event.target.value); setReplyError('') }} rows={3} disabled={replyingId === comment.id} aria-invalid={Boolean(replyError)} aria-describedby={replyError ? `reply-${comment.id}-error` : undefined} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20 ${replyError ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`} />
                          <div className="flex items-start justify-between gap-3 mt-2">
                            <div>{replyError && <p id={`reply-${comment.id}-error`} className="text-xs text-error">{replyError}</p>}</div>
                            <span className="text-xs text-gray-400" aria-live="polite">{replyBody.length}/1000</span>
                          </div>
                          <div className="flex justify-end gap-2 mt-2"><button type="button" disabled={Boolean(replyingId)} onClick={() => setReplyTo(null)} className="min-h-11 px-3 text-xs font-semibold text-gray-500">Cancelar</button><button type="button" disabled={Boolean(replyingId)} onClick={() => void publishReply(comment.id)} className="min-h-11 rounded-lg bg-primary px-4 text-xs font-semibold text-white disabled:bg-gray-300">{replyingId === comment.id ? 'Respondiendo...' : 'Responder'}</button></div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
            {discussion && <Pagination response={discussion} loading={discussionLoading} onPage={page => void loadDiscussion(page)} />}
          </div>
        )}

        {tab === 'faq' && (
          <div data-frame="S3_HU411_FAQ">
            {loadError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{loadError}</div>}
            {faqLoading ? (
              <div className="space-y-3" role="status" aria-label="Cargando preguntas frecuentes">{[1, 2, 3].map(item => <div key={item} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}</div>
            ) : !loadError && (faq?.content.length ?? 0) === 0 ? (
              <div className="py-12 text-center"><p className="font-display font-700 text-gray-700">Aún no hay preguntas frecuentes</p><p className="text-sm text-gray-400 mt-1">Las respuestas oficiales marcadas por el creador aparecerán aquí.</p></div>
            ) : (
              <div className="space-y-3">
                {faq?.content.map(item => {
                  const question = item.parentCommentId ? discussion?.content.find(comment => comment.id === item.parentCommentId) : null
                  return (
                    <article key={item.id} className="rounded-xl border border-gray-100 p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2"><span className="rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">Respuesta oficial</span><span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('es-ES')}</span></div>
                      {question && <h3 className="font-display font-700 text-gray-900">{question.body}</h3>}
                      <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ${question ? 'mt-2' : ''}`}>{item.body}</p>
                    </article>
                  )
                })}
              </div>
            )}
            {faq && <Pagination response={faq} loading={faqLoading} onPage={page => void loadFaq(page)} />}
          </div>
        )}
      </div>
    </section>
  )
}
