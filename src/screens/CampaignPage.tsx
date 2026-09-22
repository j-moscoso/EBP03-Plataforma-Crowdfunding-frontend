import { useEffect, useState } from "react"

import { type Campaign, type Screen, type User } from "../types"

import { api, ApiError } from "../services/api"

type Props = {
  navigate: (screen: Screen) => void

  user: User | null

  campaigns: Campaign[]

  activeCampaign: Campaign | null

  activeCampaignId: string | null

  onViewCampaign: (id: string) => void
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,

    maximumFractionDigits: 2,
  })
}

function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)

    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),

      1000,
    )

    return () => window.clearInterval(timer)
  }, [seconds])

  const days = Math.floor(remaining / 86400)

  const hours = Math.floor((remaining % 86400) / 3600)

  return (
    <span>
      {days} días : {hours} horas
    </span>
  )
}

export default function CampaignPage({
  navigate,

  user,

  campaigns,

  activeCampaign,

  activeCampaignId,

  onViewCampaign,
}: Props) {
  const [detail, setDetail] = useState<Campaign | null>(activeCampaign)

  const [error, setError] = useState("")

  useEffect(() => {
    if (!activeCampaignId) {
      setDetail(null)

      setError("")

      return
    }

    setDetail(activeCampaign)

    setError("")

    const requestedCampaignId = activeCampaignId

    let current = true

    api

      .campaign(requestedCampaignId)

      .then((campaign) => {
        if (current) setDetail(campaign)
      })

      .catch(
        (cause: unknown) =>
          current &&
          setError(
            cause instanceof ApiError
              ? cause.message
              : "No se pudo cargar la campaña.",
          ),
      )

    return () => {
      current = false
    }
  }, [activeCampaignId, activeCampaign])

  if (!activeCampaignId)
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="font-display font-800 text-2xl mb-2">
            Explorar proyectos
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Campañas activas disponibles para apoyar.
          </p>
          {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-sm text-gray-500">
              No hay campañas activas disponibles.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="h-40 bg-gray-100">
                    {campaign.mediaUrl && (
                      <img
                        src={campaign.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold text-primary">
                      {campaign.category}
                    </span>
                    <h2 className="font-display font-700 mt-2">
                      {campaign.title}
                    </h2>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {campaign.description}
                    </p>
                    <div className="mt-4 h-2 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(campaign.progress.percentage, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ${formatMoney(campaign.progress.raisedAmount)} de $
                      {formatMoney(campaign.goalAmount)}
                    </p>
                    <button
                      onClick={() => onViewCampaign(campaign.id)}
                      className="w-full mt-4 rounded-xl bg-primary text-white py-2.5 text-sm font-semibold"
                    >
                      Ver campaña
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    )

  if (error && !detail)
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <button
            onClick={() => navigate("projects")}
            className="text-sm text-gray-500 hover:text-primary mb-6"
          >
            ← Explorar proyectos
          </button>
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    )

  if (!detail)
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-sm text-gray-500">Cargando campaña...</p>
      </div>
    )

  const progress = detail.progress

  const canSupport =
    user?.role === "sponsor" &&
    detail.status === "ACTIVE" &&
    progress.secondsRemaining > 0

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate("projects")}
          className="text-sm text-gray-500 hover:text-primary mb-6"
        >
          ← Explorar proyectos
        </button>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="h-64 bg-gray-100">
            {detail.mediaUrl && (
              <img
                src={detail.mediaUrl}
                alt={detail.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="p-6">
            <span className="text-xs font-semibold text-primary">
              {detail.category}
            </span>
            <h1 className="font-display font-800 text-3xl text-gray-900 mt-2">
              {detail.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              por {detail.creator?.name || "Creador"}
            </p>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mt-6">
              {detail.description}
            </p>
            <div className="grid sm:grid-cols-4 gap-3 mt-8">
              <div>
                <strong className="text-2xl">
                  ${formatMoney(progress.raisedAmount)}
                </strong>
                <p className="text-xs text-gray-500">recaudados</p>
              </div>
              <div>
                <strong className="text-2xl text-primary">
                  {progress.percentage}%
                </strong>
                <p className="text-xs text-gray-500">progreso</p>
              </div>
              <div>
                <strong className="text-2xl">{progress.sponsorsCount}</strong>
                <p className="text-xs text-gray-500">patrocinadores</p>
              </div>
              <div>
                <strong className="text-2xl">
                  <Countdown seconds={progress.secondsRemaining} />
                </strong>
                <p className="text-xs text-gray-500">restantes</p>
              </div>
            </div>
            <div className="h-3 rounded-full bg-gray-100 mt-6">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Faltan ${formatMoney(progress.remainingAmount)} para alcanzar la
              meta.
            </p>
            <button
              disabled={!canSupport}
              onClick={() => navigate("payment-flow")}
              className="mt-6 w-full rounded-xl bg-primary text-white py-3.5 font-semibold disabled:bg-gray-200 disabled:text-gray-500"
            >
              {canSupport
                ? "Apoyar este proyecto"
                : user?.role !== "sponsor"
                  ? "Inicia sesión como patrocinador para aportar"
                  : "Campaña no disponible"}
            </button>
            <div className="mt-8">
              <h2 className="font-display font-700 text-lg mb-4">
                Recompensas
              </h2>
              {(detail.rewards ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">
                  Esta campaña no tiene recompensas.
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.rewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="border border-gray-100 rounded-xl p-4"
                    >
                      <div className="flex justify-between">
                        <strong>{reward.title}</strong>
                        <span className="text-primary font-semibold">
                          ${formatMoney(reward.minimumAmount)}+
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {reward.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
