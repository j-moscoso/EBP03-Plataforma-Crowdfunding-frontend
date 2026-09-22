import { useEffect, useState } from "react"

import { type Contribution, type Screen, type User } from "../types"

import { api, ApiError } from "../services/api"

type Props = {
  navigate: (screen: Screen) => void

  user: User

  isNew?: boolean
}

export default function SponsorDashboard({ navigate, user }: Props) {
  const [contributions, setContributions] = useState<Contribution[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  useEffect(() => {
    api

      .contributions()

      .then((page) => setContributions(page.content))

      .catch((cause: unknown) =>
        setError(
          cause instanceof ApiError
            ? cause.message
            : "No se pudo cargar tus aportes.",
        ),
      )

      .finally(() => setLoading(false))
  }, [])

  const total = contributions.reduce(
    (sum, contribution) => sum + contribution.amount,

    0,
  )

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display font-800 text-2xl">
          Panel del Patrocinador
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Hola, <strong>{user.name}</strong> - sigue el impacto de tus aportes.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8 mb-8">
          {[
            ["Total aportado", `$${total.toLocaleString()}`],

            ["Aportes confirmados", String(contributions.length)],

            [
              "Proyectos apoyados",

              String(
                new Set(contributions.map((item) => item.campaignId)).size,
              ),
            ],
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
            <h2 className="font-display font-700">Mis aportes</h2>
          </div>
          {loading ? (
            <p className="p-8 text-sm text-gray-500">Cargando aportes...</p>
          ) : error ? (
            <p className="p-8 text-sm text-red-700">{error}</p>
          ) : contributions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-display font-700">
                Aún no tienes aportes confirmados
              </p>
              <button
                onClick={() => navigate("campaign-page")}
                className="mt-4 rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold"
              >
                Explorar campañas
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="px-6 py-4 flex justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      Campaña {contribution.campaignId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(contribution.createdAt).toLocaleDateString(
                        "es-AR",
                      )}{" "}
                      · {contribution.currency}
                    </p>
                  </div>
                  <strong>${contribution.amount.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
