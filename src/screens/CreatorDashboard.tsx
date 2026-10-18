import { useState } from 'react'
import type { CampaignSummary, CampaignStatus, Draft, Screen, User } from '../types'
import { api, apiErrorMessage } from '../services/api'
import { formatMoney } from '../utils/money'

interface Props {
  user: User
  campaigns: CampaignSummary[]
  drafts: Draft[]
  loading: boolean
  error: string
  navigate: (screen: Screen, id?: string | null) => void
  onDraftDeleted: (id: string) => void
}

const statusLabels: Record<CampaignStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  ACTIVE: 'Activa',
  SUCCESSFUL: 'Exitosa',
  FAILED: 'No alcanzada',
  CANCELLED: 'Cancelada',
}

export default function CreatorDashboard({ user, campaigns, drafts, loading, error, navigate, onDraftDeleted }: Props) {
  const [showDrafts, setShowDrafts] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const totalsByCurrency = campaigns.reduce((totals, campaign) => {
    if (campaign.currencyStatus === 'CONFIGURED' && campaign.currency) {
      totals.set(campaign.currency, (totals.get(campaign.currency) ?? 0) + campaign.progress.raisedAmount)
    }
    return totals
  }, new Map<string, number>())
  const totalRaised = [...totalsByCurrency.entries()]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(' · ') || 'Moneda no disponible'

  async function deleteDraft(id: string) {
    setDeletingId(id)
    setDeleteError('')
    try {
      await api.deleteDraft(id)
      onDraftDeleted(id)
    } catch (requestError) {
      setDeleteError(apiErrorMessage(requestError, 'No pudimos eliminar el borrador.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-800 text-2xl text-gray-900">Panel del Creador</h1>
            <p className="text-gray-500 text-sm mt-1">Hola, <strong className="text-gray-700">{user.name}</strong>. Gestiona tus campañas con datos actualizados.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => navigate('creator-profile')}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Perfil de creador
            </button>
            <button onClick={() => setShowDrafts(value => !value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700">
              Borradores ({drafts.length})
            </button>
            <button onClick={() => navigate('create-campaign')} className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover">
              Nueva campaña
            </button>
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
        {deleteError && <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{deleteError}</div>}

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            ['Total recaudado', totalRaised],
            ['Campañas publicadas', String(campaigns.length)],
            ['Borradores', String(drafts.length)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-display font-800 text-2xl text-gray-900">{value}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-display font-700 text-gray-900">Mis campañas</h2></div>
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">Cargando campañas...</div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center px-4">
              <h3 className="font-display font-700 text-gray-800">Aún no tienes campañas</h3>
              <p className="text-sm text-gray-400 mt-1 mb-5">Crea tu primera campaña para comenzar.</p>
              <button onClick={() => navigate('create-campaign')} className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Crear campaña</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {campaigns.map(campaign => (
                <article key={campaign.id} className="px-6 py-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-2">
                        <span className="text-xs font-semibold bg-primary-light text-primary px-2.5 py-1 rounded-full">{statusLabels[campaign.status]}</span>
                        <span className="text-xs text-gray-400 py-1">{campaign.category}</span>
                      </div>
                      <button onClick={() => navigate('campaign-page', campaign.id)} className="font-semibold text-gray-900 hover:text-primary text-left">{campaign.title}</button>
                      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full progress-bar" style={{ width: `${Math.min(campaign.progress.percentage, 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatMoney(campaign.progress.raisedAmount, campaign.currency)} de {formatMoney(campaign.goalAmount, campaign.currency)} · {campaign.progress.percentage}%</p>
                    </div>
                    <button onClick={() => navigate('campaign-page', campaign.id)} className="text-xs font-semibold text-primary border border-primary rounded-lg px-4 py-2">Ver detalle</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {showDrafts && (
          <section className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden fade-in">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-display font-700 text-gray-900">Borradores guardados</h2></div>
            {drafts.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">No hay borradores guardados.</p> : (
              <div className="divide-y divide-gray-100">
                {drafts.map(draft => (
                  <article key={draft.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{draft.title || 'Sin título'}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(draft.savedAt).toLocaleString('es-ES')} · {draft.completionPercentage}% completado</p>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gray-400" style={{ width: `${draft.completionPercentage}%` }} /></div>
                    </div>
                    <button disabled={deletingId === draft.id} onClick={() => void deleteDraft(draft.id)} className="text-xs font-medium text-error disabled:text-gray-300">{deletingId === draft.id ? 'Eliminando...' : 'Eliminar'}</button>
                    <button onClick={() => navigate('create-campaign', draft.id)} className="text-xs font-semibold text-primary border border-primary rounded-lg px-3 py-2">Editar</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
