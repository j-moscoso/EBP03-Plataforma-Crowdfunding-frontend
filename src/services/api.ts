import type {
  ApiErrorBody,
  AuthResponse,
  Campaign,
  CampaignUpdate,
  CampaignUpdatePayload,
  Contribution,
  ContributionPayload,
  CreatorProfile,
  CreatorProfilePayload,
  Draft,
  DraftPayload,
  PageResponse,
  Notification,
  PasswordResetRequestResponse,
  PasswordResetValidationResponse,
  Progress,
  SupportedCampaignCard,
  TransactionHistoryItem,
  User,
  UserRole,
  UpdateMePayload,
} from '../types'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8080' : '')

export class ApiError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function normalizeUser(user: User): User {
  const role = String(user.role).toLowerCase()
  if (role !== 'creator' && role !== 'sponsor') {
    throw new ApiError(500, 'INVALID_USER_ROLE', 'El servidor devolvió un rol de usuario no válido.')
  }
  return { ...user, role: role as UserRole }
}

function normalizeCampaign(campaign: Campaign): Campaign {
  return { ...campaign, creator: normalizeUser(campaign.creator) }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    throw new ApiError(0, 'NETWORK_ERROR', 'No pudimos conectar con el servidor.', error)
  }

  if (response.status === 204) {
    if (!response.ok) throw new ApiError(response.status, 'HTTP_ERROR', response.statusText)
    return undefined as T
  }

  const raw = await response.text()
  let data: unknown = null
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      throw new ApiError(
        response.status,
        'INVALID_JSON',
        response.ok ? 'El servidor devolvió una respuesta no válida.' : `Error HTTP ${response.status}.`,
        raw,
      )
    }
  }

  if (!response.ok) {
    const body = (data ?? {}) as ApiErrorBody
    throw new ApiError(
      response.status,
      body.code ?? 'HTTP_ERROR',
      body.message ?? `La solicitud falló con estado ${response.status}.`,
      body.details,
    )
  }

  return data as T
}

function page<T>(path: string) {
  return request<PageResponse<T>>(path)
}

export const api = {
  async me() {
    return normalizeUser(await request<User>('/api/auth/me'))
  },
  async login(email: string, password: string, rememberMe: boolean) {
    const response = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    })
    return { ...response, user: normalizeUser(response.user) }
  },
  async register(name: string, email: string, password: string, role: UserRole) {
    const response = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    })
    return { ...response, user: normalizeUser(response.user) }
  },
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  async creatorProfile() {
    return (await request<CreatorProfile | null>('/api/creators/me/profile')) ?? null
  },
  saveCreatorProfile: (body: CreatorProfilePayload) =>
    request<CreatorProfile>('/api/creators/me/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  async updateMe(body: UpdateMePayload) {
    return normalizeUser(
      await request<User>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    )
  },
  requestPasswordReset: (email: string) =>
    request<PasswordResetRequestResponse>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  validatePasswordReset: (token: string) =>
    request<PasswordResetValidationResponse>('/api/auth/password-reset/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    request<void>('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  drafts: () => page<Draft>('/api/drafts?page=0&pageSize=10'),
  draft: (id: string) => request<Draft>(`/api/drafts/${encodeURIComponent(id)}`),
  createDraft: (body: DraftPayload) =>
    request<Draft>('/api/drafts', { method: 'POST', body: JSON.stringify(body) }),
  updateDraft: (id: string, body: DraftPayload) =>
    request<Draft>(`/api/drafts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteDraft: (id: string) =>
    request<void>(`/api/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  async publishDraft(id: string) {
    return normalizeCampaign(
      await request<Campaign>(`/api/drafts/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
    )
  },
  async campaigns() {
    const result = await page<Campaign>('/api/campaigns?page=0&pageSize=10&status=ACTIVE')
    return { ...result, content: result.content.map(normalizeCampaign) }
  },
  async campaignsMine() {
    const result = await page<Campaign>('/api/campaigns/mine?page=0&pageSize=10')
    return { ...result, content: result.content.map(normalizeCampaign) }
  },
  async campaign(id: string) {
    return normalizeCampaign(await request<Campaign>(`/api/campaigns/${encodeURIComponent(id)}`))
  },
  campaignProgress: (id: string) =>
    request<Progress>(`/api/campaigns/${encodeURIComponent(id)}/progress`),
  campaignUpdates: (id: string) =>
    page<CampaignUpdate>(`/api/campaigns/${encodeURIComponent(id)}/updates?page=0&pageSize=10`),
  createCampaignUpdate: (id: string, body: CampaignUpdatePayload) =>
    request<CampaignUpdate>(`/api/campaigns/${encodeURIComponent(id)}/updates`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  notifications: () =>
    page<Notification>('/api/notifications/me?page=0&pageSize=20'),
  contributions: (pageNumber = 0, pageSize = 10) =>
    page<TransactionHistoryItem>(`/api/contributions/me?page=${pageNumber}&pageSize=${pageSize}`),
  supportedCampaigns: (pageNumber = 0, pageSize = 10) =>
    page<SupportedCampaignCard>(`/api/sponsors/me/supported-campaigns?page=${pageNumber}&pageSize=${pageSize}`),
  contribute: (
    campaignId: string,
    body: ContributionPayload,
    idempotencyKey: string,
  ) =>
    request<Contribution>(`/api/campaigns/${encodeURIComponent(campaignId)}/contributions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    }),
  retryContribution: (id: string, paymentMethodId: string, idempotencyKey: string) =>
    request<Contribution>(`/api/contributions/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ paymentMethodId }),
    }),
}

export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  return error instanceof ApiError ? error.message : fallback
}
