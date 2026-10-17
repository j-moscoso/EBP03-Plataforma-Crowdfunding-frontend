import { useEffect, useState } from 'react'
import type {
  Screen,
  SupportedCampaignCard as SupportedCampaignCardModel,
  SupportedCampaignsResponse,
  SupportedCampaignStatusCode,
} from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'
import { formatMoneyExact } from '../utils/money'

interface Props {
  navigate: (screen: Screen, id?: string | null) => void
  onSessionExpired: () => void
}

const statusStyles: Record<SupportedCampaignStatusCode, string> = {
  ACTIVE: 'bg-primary-light text-primary border-green-200',
  PUBLISHED: 'bg-primary-light text-primary border-green-200',
  SUCCESSFUL: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
}

function exactPercentage(value: number) {
  return `${value.toLocaleString('es-ES', { maximumFractionDigits: 20 })}%`
}

function ProjectImage({ item }: { item: SupportedCampaignCardModel }) {
  const [failed, setFailed] = useState(false)
  if (!item.imageUrl || failed) {
    return (
      <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center text-center px-5" role="img" aria-label={`Proyecto ${item.title} sin imagen disponible`}>
        <svg className="w-9 h-9 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14m-14 6h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-xs text-gray-500">Imagen no disponible</p>
      </div>
    )
  }
  return (
    <div className="aspect-video bg-gray-100 overflow-hidden">
      <img
        src={item.imageUrl}
        alt={`Portada de ${item.title}`}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function SupportedCampaignCard({
  item,
  onOpen,
}: {
  item: SupportedCampaignCardModel
  onOpen: () => void
}) {
  const statusClass = statusStyles[item.statusCode] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  const visualPercentage = Math.max(0, Math.min(item.totalRaisedPercentage, 100))
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <ProjectImage item={item} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display font-700 text-lg text-gray-900 line-clamp-2">{item.title}</h2>
          <span className={`inline-flex text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full border flex-shrink-0 ${statusClass}`}>{item.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-primary-light/50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Aportado por mí</p>
            <p className="text-sm font-bold text-primary mt-1">{formatMoneyExact(item.amountContributedByMe, item.currency)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Recaudado</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{exactPercentage(item.totalRaisedPercentage)}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden" aria-label={`${exactPercentage(item.totalRaisedPercentage)} recaudado`}>
            <div className="h-full bg-primary rounded-full progress-bar" style={{ width: `${visualPercentage}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <strong className="text-gray-700">{formatMoneyExact(item.raisedAmount, item.currency)}</strong> de {formatMoneyExact(item.goalAmount, item.currency)}
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-4">Último aporte: {new Date(item.lastContributionAt).toLocaleDateString('es-ES', { dateStyle: 'medium' })}</p>
        <button type="button" onClick={onOpen} className="w-full mt-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">
          Ver proyecto
        </button>
      </div>
    </article>
  )
}

function CardSkeletons() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse" role="status" aria-label="Cargando proyectos apoyados">
      {[1, 2, 3, 4, 5, 6].map(item => (
        <div key={item} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="aspect-video bg-gray-200" />
          <div className="p-5">
            <div className="h-5 bg-gray-200 rounded-full w-3/4 mb-5" />
            <div className="grid grid-cols-2 gap-3"><div className="h-16 bg-gray-100 rounded-xl" /><div className="h-16 bg-gray-100 rounded-xl" /></div>
            <div className="h-2.5 bg-gray-100 rounded-full mt-5" />
            <div className="h-11 bg-gray-200 rounded-xl mt-6" />
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando proyectos...</span>
    </div>
  )
}

export default function SupportedProjects({ navigate, onSessionExpired }: Props) {
  const [response, setResponse] = useState<SupportedCampaignsResponse | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forbidden, setForbidden] = useState(false)

  async function load(targetPage: number) {
    setLoading(true)
    setError('')
    setForbidden(false)
    setResponse(null)
    setPage(targetPage)
    try {
      const result = await api.supportedCampaigns(targetPage, 10)
      setResponse(result)
      setPage(result.page)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onSessionExpired()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) {
        setForbidden(true)
      } else {
        setError(apiErrorMessage(requestError, 'No pudimos cargar tus proyectos apoyados.'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(0)
  }, [])

  if (forbidden) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-error flex items-center justify-center text-xl font-bold mx-auto mb-4" aria-hidden="true">!</div>
          <h1 className="font-display font-800 text-2xl text-gray-900">Acceso no disponible</h1>
          <p className="text-sm text-gray-500 mt-2">Esta sección está disponible únicamente para patrocinadores autorizados.</p>
          <button type="button" onClick={() => navigate('projects')} className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover">Volver a proyectos</button>
        </div>
      </div>
    )
  }

  const items = response?.content ?? []
  const omittedCampaigns = response?.omittedCampaigns ?? []
  const warnings = response?.warnings ?? []
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button type="button" onClick={() => navigate('sponsor-dashboard')} className="text-sm font-medium text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md mb-6">← Volver al panel</button>
        <div className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Mi impacto</p>
          <h1 className="font-display font-800 text-3xl text-gray-900">Proyectos Apoyados</h1>
          <p className="text-sm text-gray-500 mt-2">Sigue el progreso agregado de todas las campañas que has ayudado a impulsar.</p>
        </div>

        {loading ? <CardSkeletons /> : error ? (
          <div className="bg-white border border-red-100 rounded-2xl shadow-sm py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-error flex items-center justify-center text-xl font-bold mx-auto mb-4" aria-hidden="true">!</div>
            <h2 className="font-display font-700 text-gray-900">No pudimos cargar tus proyectos</h2>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
            <button type="button" onClick={() => void load(page)} className="mt-5 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover">Reintentar</button>
          </div>
        ) : (
          <>
            {omittedCampaigns.length > 0 && (
              <section className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900" role="status" aria-live="polite">
                <h2 className="font-display font-700">Hay campañas que no se muestran</h2>
                <p className="text-sm mt-1">{warnings[0]?.message ?? 'Algunas campañas no se muestran porque tienen monedas confirmadas incompatibles.'}</p>
                <ul className="mt-4 space-y-3">
                  {omittedCampaigns.map(item => (
                    <li key={item.campaignId} className="rounded-xl border border-yellow-200 bg-white/70 p-3 text-sm">
                      <button type="button" onClick={() => navigate('campaign-page', item.campaignId)} className="font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded">
                        {item.title}
                      </button>
                      <p className="text-xs mt-1">Motivo: monedas confirmadas incompatibles ({item.currencies.join(', ')}).</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {items.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-primary-light text-primary flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s-7-4.4-7-11a4 4 0 017-2.6A4 4 0 0119 10c0 6.6-7 11-7 11z" /></svg>
            </div>
            <h2 className="font-display font-700 text-gray-900">{response?.emptyMessage || 'Aún no has apoyado ningún proyecto'}</h2>
            <p className="text-sm text-gray-400 mt-2 mb-5">Descubre campañas activas y comienza a generar impacto.</p>
            <button type="button" onClick={() => navigate('projects')} className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover">Explorar proyectos</button>
          </div>
            ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => <SupportedCampaignCard key={item.campaignId} item={item} onOpen={() => navigate('campaign-page', item.campaignId)} />)}
            </div>
            )}
            {response && response.totalPages > 1 && (
              <nav className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-label="Paginación de proyectos apoyados">
                <p className="text-xs text-gray-500">Página {response.page + 1} de {response.totalPages}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={response.page <= 0 || loading} onClick={() => void load(response.page - 1)} className="flex-1 sm:flex-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:text-gray-300 disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Anterior</button>
                  <button type="button" disabled={response.page + 1 >= response.totalPages || loading} onClick={() => void load(response.page + 1)} className="flex-1 sm:flex-none bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30">Siguiente</button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}
