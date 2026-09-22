import { useState } from "react"

import { type Screen, type User } from "../types"

import { api, ApiError } from "../services/api"

interface RegisterProps {
  navigate: (s: Screen) => void

  onLogin: (user: User) => void
}

function CheckIcon({ met }: { met: boolean }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 ${
        met ? "text-success" : "text-gray-300"
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

export default function Register({ navigate, onLogin }: RegisterProps) {
  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [showPass, setShowPass] = useState(false)

  const [role, setRole] = useState<"sponsor" | "creator" | null>(null)

  const [emailError, setEmailError] = useState("")

  const [requestError, setRequestError] = useState("")

  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")

  const checks = {
    length: password.length >= 8,

    upper: /[A-Z]/.test(password),

    number: /[0-9]/.test(password),

    symbol: /[^A-Za-z0-9]/.test(password),
  }

  const passwordOk = Object.values(checks).every(Boolean)

  const canSubmit = email && passwordOk && role && !emailError

  function handleEmailBlur() {
    setEmailError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!canSubmit) return

    setStatus("loading")

    setRequestError("")

    try {
      const response = await api.register(
        email.split("@")[0],

        email,

        password,

        role!,
      )

      onLogin(response.user)

      navigate("projects")
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "EMAIL_ALREADY_IN_USE")
        setEmailError(cause.message)
      else
        setRequestError(
          cause instanceof ApiError
            ? cause.message
            : "No se pudo conectar con el servidor.",
        )

      setStatus("idle")
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg fade-in">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="font-display font-700 text-2xl text-gray-900 mb-2">
            ¡Cuenta creada!
          </h2>
          <p className="text-gray-500 text-sm">Redirigiendo a tu panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <h1 className="font-display font-800 text-3xl text-gray-900 mb-2">
            Crea tu cuenta
          </h1>
          <p className="text-gray-500 text-sm">
            Únete a miles de creadores y patrocinadores
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
        >
          {requestError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestError}
            </div>
          )}
          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ¿Cuál es tu rol?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                {
                  value: "sponsor",

                  emoji: "💎",

                  label: "Quiero ser Patrocinador",

                  sub: "Apoya proyectos",
                },

                {
                  value: "creator",

                  emoji: "🚀",

                  label: "Quiero ser Creador",

                  sub: "Lanza tu campaña",
                },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`card-selectable p-4 rounded-xl border-2 text-left transition-all ${
                    role === opt.value
                      ? "border-primary bg-primary-light shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-xl mb-1">{opt.emoji}</div>
                  <div className="text-xs font-semibold text-gray-900 leading-tight">
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                  {role === opt.value && (
                    <div className="mt-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
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
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

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

                setEmailError("")
              }}
              onBlur={handleEmailBlur}
              placeholder="tu@correo.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20 ${
                emailError
                  ? "border-error bg-red-50 focus:border-error"
                  : "border-gray-200 focus:border-primary"
              }`}
            />
            {emailError && (
              <p className="mt-1.5 text-xs text-error flex items-start gap-1">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  />
                </svg>
                {emailError}
              </p>
            )}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20 ${
                  password && !passwordOk
                    ? "border-error bg-red-50 focus:border-error"
                    : password && passwordOk
                      ? "border-success bg-green-50 focus:border-success"
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

            {/* Password checklist */}
            {password && (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {[
                  {
                    key: "length",

                    label: "Mínimo 8 caracteres",

                    met: checks.length,
                  },

                  {
                    key: "upper",

                    label: "Al menos 1 mayúscula",

                    met: checks.upper,
                  },

                  {
                    key: "number",

                    label: "Al menos 1 número",

                    met: checks.number,
                  },

                  {
                    key: "symbol",

                    label: "Al menos 1 símbolo",

                    met: checks.symbol,
                  },
                ].map((c) => (
                  <div key={c.key} className="flex items-center gap-1.5">
                    <CheckIcon met={c.met} />
                    <span
                      className={`text-xs ${
                        c.met ? "text-success font-medium" : "text-gray-400"
                      }`}
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || status === "loading"}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              canSubmit
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
                Creando cuenta...
              </>
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{" "}
          <button
            onClick={() => navigate("login")}
            className="text-primary font-semibold hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  )
}
