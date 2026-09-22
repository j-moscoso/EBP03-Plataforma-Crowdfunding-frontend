import { useState } from "react"

import { type Campaign, type Draft, type Screen, type User } from "../types"

type Props = {
  navigate: (screen: Screen) => void

  user: User

  isNew?: boolean

  drafts: Draft[]

  campaigns: Campaign[]

  onOpenDraft: (id: string) => void

  onDeleteDraft: (id: string) => void

  onViewCampaign: (id: string) => void
}

export default function CreatorDashboard({
  navigate,

  user,

  drafts,

  campaigns,

  onOpenDraft,

  onDeleteDraft,

  onViewCampaign,
}: Props) {
  const [showDrafts, setShowDrafts] = useState(false)

  const total = campaigns.reduce(
    (sum, campaign) => sum + campaign.progress.raisedAmount,

    0,
  )

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="font-display font-800 text-2xl">
              Panel del Creador
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Hola, <strong>{user.name}</strong> - gestiona tus campañas.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDrafts((value) => !value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold"
            >
              Borradores ({drafts.length})
            </button>
            <button
              onClick={() => navigate("create-campaign")}
              className="rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold"
            >
              + Nueva campaña
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8 mb-8">
          {[
            ["Total recaudado", `$${total.toLocaleString()}`],

            ["Campañas publicadas", String(campaigns.length)],

            ["Borradores", String(drafts.length)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="font-display font-700 text-2xl">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display font-700">Mis campañas</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Aún no tienes campañas publicadas.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs text-primary font-semibold">
                      {campaign.status} · {campaign.category}
                    </p>
                    <button
                      onClick={() => onViewCampaign(campaign.id)}
                      className="font-semibold text-gray-900 hover:text-primary"
                    >
                      {campaign.title}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      ${campaign.progress.raisedAmount.toLocaleString()} de $
                      {campaign.goalAmount.toLocaleString()} ·{" "}
                      {campaign.progress.percentage}%
                    </p>
                  </div>
                  <button
                    onClick={() => onViewCampaign(campaign.id)}
                    className="text-sm text-primary font-semibold"
                  >
                    Ver campaña
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {showDrafts && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-display font-700">Borradores guardados</h2>
            </div>
            {drafts.length === 0 ? (
              <p className="p-8 text-sm text-gray-500">No hay borradores.</p>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="px-6 py-4 flex justify-between items-center border-b border-gray-50"
                >
                  <div>
                    <p className="font-semibold">
                      {draft.title || "Sin título"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {draft.completionPercentage}% completado
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onDeleteDraft(draft.id)}
                      className="text-sm text-red-600"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => onOpenDraft(draft.id)}
                      className="text-sm text-primary font-semibold"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
