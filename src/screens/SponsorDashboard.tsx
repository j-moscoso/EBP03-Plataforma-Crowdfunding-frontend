import { useEffect, useState } from 'react'
import type { Screen, TransactionHistoryItem, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

interface Props {
  navigate: (screen: Screen, id?: string | null) => void
  user: User
  onSessionExpired: () => void
}

function amountLabel(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('es-ES')}`
  }
}

function totalLabel(items: TransactionHistoryItem[]) {
  const totals = new Map<string, number>()
  items.forEach(item => totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount))
  return [...totals.entries()].map(([currency, amount]) => amountLabel(amount, currency)).join(' · ') || '—'
}

export default function SponsorDashboard({ navigate, user, onSessionExpired }: Props) {
  const [contributions, setContributions] = useState<TransactionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void api.contributions()
      .then(response => { if (active) setContributions(response.content) })
      .catch(requestError => {
        if (!active) return
        if (requestError instanceof ApiError && requestError.status === 401) onSessionExpired()
        else setError(apiErrorMessage(requestError, 'No pudimos cargar tus aportes.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const confirmed = contributions.filter(item => item.contributionStatus === 'CONFIRMED').length
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
            ['Total por moneda (primera página)', totalLabel(contributions)],
            ['Aportes confirmados (primera página)', String(confirmed)],
            ['Proyectos visibles (primera página)', String(projects)],
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
                  <p className="font-display font-700 text-lg text-primary">{amountLabel(contribution.amount, contribution.currency)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
