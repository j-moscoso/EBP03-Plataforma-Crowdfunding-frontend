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
    if (campaignId)
      api

        .campaign(campaignId)

        .then(setCampaign)

        .catch(() => setError("No se pudo cargar la campaña."))
  }, [campaignId])

  const selectedReward = campaign?.rewards.find(
    (reward) => reward.id === rewardId,
  )

  const canSubmit =
    user?.role === "sponsor" &&
    !!campaignId &&
    Number(amount) > 0 &&
    /^[A-Za-z]{3}$/.test(currency) &&
    paymentMethodId.trim().length > 0 &&
    (!selectedReward || Number(amount) >= selectedReward.minimumAmount)

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
      setError(
        cause instanceof ApiError && cause.code === "CAMPAIGN_NOT_ACTIVE"
          ? "La campaña ya no acepta aportes."
          : cause instanceof ApiError
            ? cause.message
            : "No se pudo procesar el aporte.",
      )

      setStatus("failed")
    }
  }

  async function retry() {
    if (!contribution) return

    setStatus("loading")

    try {
      const result = await api.retryContribution(
        contribution.id,

        paymentMethodId,

        operationKey,
      )

      setContribution(result)

      setStatus(result.status === "CONFIRMED" ? "success" : "failed")
    } catch {
      setStatus("failed")

      setError("No se pudo reintentar el aporte.")
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
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3"
                />
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
                onClick={retry}
                className="mt-4 w-full rounded-xl border border-primary text-primary py-3 font-semibold"
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
