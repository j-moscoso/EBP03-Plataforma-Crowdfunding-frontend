import { useState } from "react"

import { type Screen, type User } from "../types"

import { api, ApiError } from "../services/api"

interface LoginProps {
  navigate: (s: Screen) => void

  onLogin: (user: User) => void
}

export default function Login({ navigate, onLogin }: LoginProps) {
  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [showPass, setShowPass] = useState(false)

  const [remember, setRemember] = useState(false)

  const [error, setError] = useState("")

  const [status, setStatus] = useState<"idle" | "loading">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) return

    setError("")

    setStatus("loading")

    try {
      const response = await api.login(email, password, remember)

      onLogin(response.user)

      navigate("projects")
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No se pudo conectar con el servidor.",
      )

      setStatus("idle")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <h1 className="font-display font-800 text-3xl text-gray-900 mb-2">
            Bienvenido de vuelta
          </h1>
          <p className="text-gray-500 text-sm">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 fade-in">
            <svg
              className="w-5 h-5 text-error flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">
              El correo o la contraseña son incorrectos.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
        >
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              placeholder="tu@correo.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20 ${
                error
                  ? "border-error bg-red-50 focus:border-error"
                  : "border-gray-200 focus:border-primary"
              }`}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                placeholder="Tu contraseña"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20 ${
                  error
                    ? "border-error bg-red-50 focus:border-error"
                    : "border-gray-200 focus:border-primary"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setRemember((v) => !v)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                remember ? "bg-primary border-primary" : "border-gray-300"
              }`}
            >
              {remember && (
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-600">Recordarme</span>
          </label>

          <button
            type="submit"
            disabled={!email || !password || status === "loading"}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              email && password && status !== "loading"
                ? "bg-primary text-white hover:bg-primary-hover shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {status === "loading" ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Verificando...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{" "}
          <button
            onClick={() => navigate("register")}
            className="text-primary font-semibold hover:underline"
          >
            Regístrate
          </button>
        </p>
      </div>
    </div>
  )
}
