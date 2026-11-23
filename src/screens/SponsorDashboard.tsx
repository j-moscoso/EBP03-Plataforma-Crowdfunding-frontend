import { useEffect, useState } from 'react'
import type {
  CreatorSubscription,
  Screen,
  TransactionHistoryItem,
  User,
} from '../types'
import { api, apiErrorMessage } from '../services/api'

interface Props {
  navigate: (screen: Screen, id?: string | null) => void
  user: User
}

function amountLabel(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('es-ES')}`
  }
}

function totalLabel(items: TransactionHistoryItem[]) {
  if (!items.length) return amountLabel(0, 'USD')
  const currency = items[0].currency
  if (items.some(item => item.currency !== currency)) return 'Varias monedas'
  return amountLabel(items.reduce((sum, item) => sum + item.amount, 0), currency)
}

export default function SponsorDashboard({ navigate, user }: Props) {
  const [contributions, setContributions] = useState<TransactionHistoryItem[]>([])
  const [subscriptions, setSubscriptions] = useState<CreatorSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void Promise.all([api.contributions(), api.subscriptions()])
      .then(([contributionResponse, subscriptionResponse]) => {
        if (!active) return
        setContributions(contributionResponse.content)
        setSubscriptions(subscriptionResponse.content)
      })
      .catch(requestError => { if (active) setError(apiErrorMessage(requestError, 'No pudimos cargar tus aportes.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const confirmed = contributions.filter(item =>
    item.contributionStatus === 'CONFIRMED' || item.contributionStatus === 'HELD').length
  const projects = new Set(contributions.map(item => item.campaignId)).size

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-800 text-2xl text-gray-900">Panel del Patrocinador</h1>
            <p className="text-gray-500 text-sm mt-1">Hola, <strong className="text-gray-700">{user.name}</strong>. Sigue el impacto de tus aportes.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={() => navigate('subscriptions')} className="bg-white text-primary border border-primary rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30">
              Mis suscripciones
            </button>
            <button type="button" onClick={() => navigate('supported-projects')} className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">
              Proyectos Apoyados
            </button>
            <button type="button" onClick={() => navigate('transaction-history')} className="bg-white text-primary border border-primary rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30">
              Historial de transacciones
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            ['Total visible', totalLabel(contributions)],
            ['Aportes confirmados', String(confirmed)],
            ['Proyectos visibles', String(projects)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-display font-800 text-2xl text-gray-900">{value}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-700 text-gray-900">Aportes recientes</h2>
            <button type="button" onClick={() => navigate('transaction-history')} className="text-xs font-semibold text-primary hover:underline">Ver todos</button>
          </div>
          {error && <div className="m-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
          {loading ? <p className="py-16 text-center text-sm text-gray-500">Cargando aportes...</p> : contributions.length === 0 ? (
            <div className="py-16 text-center px-4">
              <h3 className="font-display font-700 text-gray-800">Aún no has realizado aportes</h3>
              <p className="text-sm text-gray-400 mt-1 mb-5">Explora campañas activas y apoya una idea.</p>
              <button type="button" onClick={() => navigate('projects')} className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Explorar proyectos</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {contributions.slice(0, 3).map(contribution => (
                <article key={contribution.contributionId} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <button type="button" onClick={() => navigate('campaign-page', contribution.campaignId)} className="text-sm font-semibold text-gray-900 hover:text-primary text-left">{contribution.projectName}</button>
                    <p className="text-xs text-gray-400 mt-1">{new Date(contribution.date).toLocaleString('es-ES')} · {contribution.referenceCode || 'Pendiente de comprobante'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${contribution.receiptStatus === 'REFUNDED' ? 'bg-slate-100 text-slate-700' : 'bg-yellow-50 text-yellow-700'}`}>{contribution.receiptStatus === 'REFUNDED' ? 'Reembolsado' : 'Retenido'}</span>
                    <p className="font-display font-700 text-lg text-primary">{amountLabel(contribution.amount, contribution.currency)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-primary/15 bg-primary-light/40 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Apoyo mensual</p>
              <h2 className="font-display font-800 text-xl text-gray-900 mt-1">Haz que tu impacto continúe</h2>
              <p className="text-sm text-gray-500 mt-2">{subscriptions.filter(item => item.status === 'ACTIVE').length > 0 ? `Tienes ${subscriptions.filter(item => item.status === 'ACTIVE').length} suscripciones activas.` : 'Programa un aporte recurrente a los creadores que sigues.'}</p>
            </div>
            <button type="button" onClick={() => navigate('subscriptions')} className="shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">Administrar suscripciones</button>
          </div>
        </section>
      </div>
    </div>
  )
}
