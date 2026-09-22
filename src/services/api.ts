import type {
  ApiErrorBody,
  AuthResponse,
  Campaign,
  Contribution,
  Draft,
  PageResponse,
  Progress,
  User,
} from "../types"

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8080" : "")

function normalizeUser(user: User): User {
  return { ...user, role: String(user.role).toLowerCase() as User["role"] }
}

export class ApiError extends Error {
  status: number

  code: string

  details: string[]

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || "No se pudo completar la solicitud.")

    this.name = "ApiError"

    this.status = status

    this.code = body.code || "REQUEST_ERROR"

    this.details = body.details || []
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body) headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,

    headers,

    credentials: "include",
  })

  if (response.status === 204) return undefined as T

  const text = await response.text()

  let body: T | ApiErrorBody

  try {
    body = text ? JSON.parse(text) : {} as T
  } catch {
    body = {
      code: "INVALID_RESPONSE",

      message: "El servidor devolvió una respuesta inválida.",

      details: [],
    }
  }

  if (!response.ok) throw new ApiError(response.status, body as ApiErrorBody)

  return body as T
}

export const api = {
  me: async () => normalizeUser(await request<User>("/api/auth/me")),

  login: async (email: string, password: string, rememberMe: boolean) => {
    const response = await request<AuthResponse>("/api/auth/login", {
      method: "POST",

      body: JSON.stringify({ email, password, rememberMe }),
    })

    return { ...response, user: normalizeUser(response.user) }
  },

  register: (
    name: string,

    email: string,

    password: string,

    role: User["role"],
  ) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",

      body: JSON.stringify({ name, email, password, role }),
    }).then((response) => ({
      ...response,
      user: normalizeUser(response.user),
    })),

  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  drafts: () => request<PageResponse<Draft>>("/api/drafts?page=0&pageSize=10"),

  draft: (id: string) => request<Draft>(`/api/drafts/${id}`),

  createDraft: (body: unknown) =>
    request<Draft>("/api/drafts", {
      method: "POST",

      body: JSON.stringify(body),
    }),

  updateDraft: (id: string, body: unknown) =>
    request<Draft>(`/api/drafts/${id}`, {
      method: "PUT",

      body: JSON.stringify(body),
    }),

  deleteDraft: (id: string) =>
    request<void>(`/api/drafts/${id}`, { method: "DELETE" }),

  publishDraft: (id: string) =>
    request<Campaign>(`/api/drafts/${id}/publish`, { method: "POST" }),

  campaigns: () =>
    request<PageResponse<Campaign>>(
      "/api/campaigns?page=0&pageSize=10&status=ACTIVE",
    ),

  campaignsMine: () =>
    request<PageResponse<Campaign>>(
      "/api/campaigns/mine?page=0&pageSize=10",
    ),

  campaign: (id: string) => request<Campaign>(`/api/campaigns/${id}`),

  progress: (id: string) => request<Progress>(`/api/campaigns/${id}/progress`),

  contributions: () =>
    request<PageResponse<Contribution>>(
      "/api/contributions/me?page=0&pageSize=10&status=CONFIRMED",
    ),

  contribute: (id: string, body: unknown, idempotencyKey: string) =>
    request<Contribution>(`/api/campaigns/${id}/contributions`, {
      method: "POST",

      headers: { "Idempotency-Key": idempotencyKey },

      body: JSON.stringify(body),
    }),

  retryContribution: (
    id: string,

    paymentMethodId: string,

    idempotencyKey: string,
  ) =>
    request<Contribution>(`/api/contributions/${id}/retry`, {
      method: "POST",

      headers: { "Idempotency-Key": idempotencyKey },

      body: JSON.stringify({ paymentMethodId }),
    }),
}
