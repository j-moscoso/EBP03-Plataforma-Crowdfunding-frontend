import { useEffect, useState } from "react"

import {
  type Campaign,
  type Screen,
  type User,
  type Contribution,
} from "../types"

import { api, ApiError } from "../services/api"

type Props = {
  navigate: (screen: Screen) => void

  campaignId: string | null

  user: User | null
}

export default function PaymentFlow({ navigate, campaignId, user }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  const [amount, setAmount] = useState("")

  const [currency, setCurrency] = useState("USD")

  const [rewardId, setRewardId] = useState("")

  const [paymentMethodId, setPaymentMethodId] = useState("sim_success")

  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "failed">("idle")

  const [error, setError] = useState("")

  const [contribution, setContribution] = useState<Contribution | null>(null)

  const [operationKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    if (!campaignId) {
      setCampaign(null)
      return
    }

    let current = true
    setCampaign(null)
    setError("")
    api
      .campaign(campaignId)
      .then((nextCampaign) => {
        if (current) setCampaign(nextCampaign)
      })
      .catch(() => {
        if (current) setError("No se pudo cargar la campaña.")
      })
    return () => {
      current = false
    }
  }, [campaignId])

  const selectedReward = campaign?.rewards.find(
    (reward) => reward.id === rewardId,
  )

  const remainingAmount = campaign
    ? Math.max(
        campaign.progress.remainingAmount ??
          campaign.goalAmount - campaign.progress.raisedAmount,
        0,
      )
    : 0
  const numericAmount = Number(amount)

  const canSubmit =
    user?.role === "sponsor" &&
    !!campaignId &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    Math.round(numericAmount * 100) === numericAmount * 100 &&
    numericAmount <= remainingAmount &&
    /^[A-Za-z]{3}$/.test(currency) &&
    paymentMethodId.trim().length > 0 &&
    (!selectedReward || Number(amount) >= selectedReward.minimumAmount)

  function capacityError(limit = remainingAmount) {
    return `El aporte supera el importe que todavía falta por recaudar. Máximo permitido: $${limit.toFixed(2)}.`
  }

  function apiErrorMessage(cause: unknown) {
    if (cause instanceof ApiError) {
      if (cause.code === "CONTRIBUTION_EXCEEDS_REMAINING_AMOUNT")
        return capacityError()
      if (cause.code === "CAMPAIGN_NOT_ACTIVE")
        return "La campaña ya no acepta aportes."
      return cause.message
    }
    return "No se pudo procesar el aporte."
  }

  async function submit() {
    if (!canSubmit || !campaignId) return

    setStatus("loading")

    setError("")

    try {
      const result = await api.contribute(
        campaignId,

        {
          amount: Number(amount),

          currency: currency.toUpperCase(),

          rewardId: rewardId || undefined,

          paymentMethodId,
        },

        operationKey,
      )

      setContribution(result)

      setStatus(result.status === "CONFIRMED" ? "success" : "failed")
    } catch (cause) {
      setError(apiErrorMessage(cause))

      setStatus("failed")
    }
  }

  async function retry() {
    if (!contribution || !campaignId) return

    setStatus("loading")
    setError("")

    try {
      const latestCampaign = await api.campaign(campaignId)
      setCampaign(latestCampaign)
      const latestRemaining = Math.max(
        latestCampaign.progress.remainingAmount ??
          latestCampaign.goalAmount - latestCampaign.progress.raisedAmount,
        0,
      )
      if (contribution.amount > latestRemaining) {
        setError(capacityError(latestRemaining))
        setStatus("failed")
        return
      }
      const result = await api.retryContribution(
        contribution.id,

        paymentMethodId,

        operationKey,
      )

      setContribution(result)

      setStatus(result.status === "CONFIRMED" ? "success" : "failed")
    } catch (cause) {
      setStatus("failed")
      setError(apiErrorMessage(cause))
    }
  }

  if (!user || user.role !== "sponsor")
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <h1 className="font-display font-800 text-xl">
            Inicia sesión como patrocinador
          </h1>
          <button
            onClick={() => navigate("login")}
            className="mt-5 rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate("campaign-page")}
          className="text-sm text-gray-500 mb-6"
        >
          ← Volver a la campaña
        </button>
        {status === "success" ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl text-primary mb-4">✓</div>
            <h1 className="font-display font-800 text-2xl">
              Aporte confirmado
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Tu aporte de {amount} {currency.toUpperCase()} fue registrado.
            </p>
            <button
              onClick={() => navigate("campaign-page")}
              className="mt-6 rounded-xl bg-primary text-white px-5 py-3 text-sm font-semibold"
            >
              Volver a la campaña
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display font-800 text-2xl">
              Apoya este proyecto
            </h1>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              {campaign?.title || "Cargando campaña..."}
            </p>
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <label className="block text-sm font-medium">
                Monto
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={campaign ? remainingAmount : undefined}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3"
                />
                <span className="text-xs text-gray-400">
                  Máximo permitido actualmente: ${remainingAmount.toFixed(2)}
                </span>
              </label>
              <label className="block text-sm font-medium">
                Moneda
                <input
                  maxLength={3}
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3"
                />
              </label>
              <label className="block text-sm font-medium">
                Recompensa
                <select
                  value={rewardId}
                  onChange={(event) => setRewardId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3"
                >
                  <option value="">Aporte libre</option>
                  {campaign?.rewards.map((reward) => (
                    <option key={reward.id} value={reward.id}>
                      {reward.title} - mínimo {reward.minimumAmount}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Identificador de pago de desarrollo
                <input
                  value={paymentMethodId}
                  onChange={(event) => setPaymentMethodId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3"
                />
                <span className="text-xs text-gray-400">
                  Usa sim_success o sim_failure en desarrollo.
                </span>
              </label>
              <button
                disabled={!canSubmit || status === "loading"}
                onClick={submit}
                className="w-full rounded-xl bg-primary text-white py-3.5 font-semibold disabled:bg-gray-200 disabled:text-gray-500"
              >
                {status === "loading" ? "Procesando..." : "Confirmar aporte"}
              </button>
            </div>
            {status === "failed" && (
              <button
                disabled={
                  !contribution ||
                  contribution.amount > remainingAmount
                }
                onClick={retry}
                className="mt-4 w-full rounded-xl border border-primary text-primary py-3 font-semibold disabled:border-gray-200 disabled:text-gray-400"
              >
                Reintentar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
