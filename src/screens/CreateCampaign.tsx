import { useState } from "react"

import { type Campaign, type Draft, type Screen, type User } from "../types"

import { api, ApiError } from "../services/api"

type RewardForm = {
  id: string

  title: string

  description: string

  minimumAmount: string
}

type Props = {
  navigate: (screen: Screen) => void

  initialDraft: Draft | null

  onSaveDraft: (draft: Draft) => void

  onPublish: (campaign: Campaign) => void

  user: User | null
}

const categories = [
  "Tecnología",

  "Medio ambiente",

  "Arte",

  "Salud",

  "Educación",

  "Comunidad",

  "Ciencia",

  "Emprendimiento",
]

export default function CreateCampaign({
  navigate,

  initialDraft,

  onSaveDraft,

  onPublish,

  user,
}: Props) {
  const [title, setTitle] = useState(initialDraft?.title || "")

  const [description, setDescription] = useState(
    initialDraft?.description || "",
  )

  const [goal, setGoal] = useState(initialDraft?.goalAmount?.toString() || "")

  const [duration, setDuration] = useState(
    initialDraft?.durationDays?.toString() || "",
  )

  const [category, setCategory] = useState(initialDraft?.category || "")

  const [mediaUrl, setMediaUrl] = useState(initialDraft?.mediaUrl || "")

  const [rewards, setRewards] = useState<RewardForm[]>(
    initialDraft?.rewards.map((reward) => ({
      id: reward.id,

      title: reward.title,

      description: reward.description || "",

      minimumAmount: String(reward.minimumAmount),
    })) || [
      {
        id: crypto.randomUUID(),

        title: "",

        description: "",

        minimumAmount: "",
      },
    ],
  )

  const [error, setError] = useState("")

  const [rewardErrors, setRewardErrors] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)

  const [publishing, setPublishing] = useState(false)

  const body = {
    title,

    description,

    goalAmount: goal ? Number(goal) : null,

    durationDays: duration ? Number(duration) : null,

    category,

    mediaUrl: mediaUrl || null,

    rewards: rewards

      .filter((reward) => reward.title && reward.minimumAmount)

      .map((reward) => ({
        title: reward.title,

        description: reward.description,

        minimumAmount: Number(reward.minimumAmount),
      })),
  }

  function validate() {
    setRewardErrors({})

    const goalAmount = Number(goal)

    const nextRewardErrors: Record<string, string> = {}

    if (!goal || !Number.isFinite(goalAmount) || goalAmount <= 0)
      return "Completa una meta financiera válida."

    if (
      !Number.isFinite(goalAmount) ||
      Math.round(goalAmount * 100) !== goalAmount * 100
    )
      return "La meta debe ser un importe válido con hasta dos decimales."

    if (!duration || Number(duration) <= 0)
      return "Completa una duración válida."

    if (!category) return "Selecciona una categoría."

    rewards.forEach((reward) => {
      if (!reward.title && !reward.minimumAmount) return

      const minimumAmount = Number(reward.minimumAmount)

      if (
        !Number.isFinite(minimumAmount) ||
        minimumAmount <= 0 ||
        Math.round(minimumAmount * 100) !== minimumAmount * 100
      )
        nextRewardErrors[reward.id] = "Introduce un monto mínimo válido."
      else if (minimumAmount > goalAmount)
        nextRewardErrors[reward.id] =
          "El monto mínimo no puede superar la meta."
    })

    setRewardErrors(nextRewardErrors)

    if (Object.keys(nextRewardErrors).length > 0)
      return "Revisa los montos mínimos de las recompensas."

    return ""
  }

  async function save() {
    const validation = validate()

    if (validation) {
      setError(validation)

      return
    }

    setSaving(true)

    setError("")

    try {
      const draft = initialDraft
        ? await api.updateDraft(initialDraft.id, body)
        : await api.createDraft(body)

      onSaveDraft(draft)
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No se pudo guardar el borrador.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    const validation = validate()

    if (validation || !title || !description) {
      setError(validation || "Completa título y descripción para publicar.")

      return
    }

    setPublishing(true)

    setError("")

    try {
      const draft = initialDraft ? initialDraft : await api.createDraft(body)

      const campaign = await api.publishDraft(draft.id)

      onPublish(campaign)
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No se pudo publicar la campaña.",
      )
    } finally {
      setPublishing(false)
    }
  }

  function updateReward(id: string, field: keyof RewardForm, value: string) {
    setRewards((previous) =>
      previous.map((reward) =>
        reward.id === id ? { ...reward, [field]: value } : reward,
      ),
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("creator-dashboard")}
            className="text-sm text-gray-500 hover:text-primary"
          >
            ← Volver
          </button>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || publishing}
              className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-semibold"
            >
              {saving ? "Guardando..." : "Guardar borrador"}
            </button>
            <button
              onClick={publish}
              disabled={saving || publishing}
              className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {publishing ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </div>
        <h1 className="font-display font-800 text-2xl text-gray-900 mb-2">
          {initialDraft ? "Editar campaña" : "Nueva campaña"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Los campos de meta, duración y categoría son requeridos.
        </p>
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-display font-700 text-lg">
              Información básica
            </h2>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título de la campaña"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe tu proyecto"
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-display font-700 text-lg">Financiamiento</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="number"
                min="1"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Meta"
                className="px-4 py-3 rounded-xl border border-gray-200 text-sm"
              />
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="Días"
                className="px-4 py-3 rounded-xl border border-gray-200 text-sm"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-sm"
              >
                <option value="">Categoría</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <input
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="URL de imagen o video (opcional)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex justify-between">
              <h2 className="font-display font-700 text-lg">Recompensas</h2>
              <button
                onClick={() =>
                  setRewards((previous) => [
                    ...previous,

                    {
                      id: crypto.randomUUID(),

                      title: "",

                      description: "",

                      minimumAmount: "",
                    },
                  ])
                }
                className="text-sm text-primary font-semibold"
              >
                Añadir
              </button>
            </div>
            {rewards.map((reward) => (
              <div key={reward.id} className="grid sm:grid-cols-3 gap-3">
                <input
                  value={reward.title}
                  onChange={(event) =>
                    updateReward(reward.id, "title", event.target.value)
                  }
                  placeholder="Título"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={reward.description}
                  onChange={(event) =>
                    updateReward(reward.id, "description", event.target.value)
                  }
                  placeholder="Descripción"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  type="number"
                  value={reward.minimumAmount}
                  onChange={(event) =>
                    updateReward(reward.id, "minimumAmount", event.target.value)
                  }
                  placeholder="Monto mínimo"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                {rewardErrors[reward.id] && (
                  <p className="sm:col-span-3 text-xs text-red-700">
                    {rewardErrors[reward.id]}
                  </p>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
