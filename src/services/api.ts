import type {
  ApiErrorBody,
  AuthResponse,
  Campaign,
  CampaignComment,
  CampaignUpdate,
  CampaignUpdateDto,
  CampaignUpdatePayload,
  CampaignCurrencyStatus,
  CampaignSummary,
  Contribution,
  ContributionPayload,
  CreateSubscriptionPayload,
  CreatorSubscription,
  CreatorProfile,
  CreatorProfileDto,
  CreatorProfilePayload,
  CreatorProfileSaveResponse,
  Draft,
  DraftPayload,
  FundingModel,
  PageResponse,
  Notification,
  NotificationDto,
  PasswordResetRequestResponse,
  PasswordResetValidationResponse,
  Progress,
  Reward,
  SupportedCampaignCard,
  SupportedCampaignsResponse,
  TransactionHistoryItem,
  User,
  UserRole,
  UpdateMePayload,
  UpdateMeResponse,
} from '../types'
import { isCurrencyCode } from '../utils/money'

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

function normalizeCurrency(value: unknown): { currency: string | null; currencyStatus: CampaignCurrencyStatus } {
  const received = typeof value === 'string' ? value.trim().toUpperCase() : null
  const currency = isCurrencyCode(received) ? received : null
  if (received !== null && currency === null) {
    console.error('La campaña recibió una moneda inválida.', { currency: received })
  }
  return { currency, currencyStatus: currency ? 'CONFIGURED' : 'UNAVAILABLE' }
}

function normalizeCreatorProfile(profile: CreatorProfileDto | CreatorProfile): CreatorProfile {
  if ('banking' in profile) return profile
  return {
    id: profile.id ?? undefined,
    displayName: profile.displayName ?? '',
    bio: profile.bio ?? '',
    phone: profile.phone ?? '',
    professionalTitle: profile.professionalTitle ?? '',
    banking: {
      accountType: profile.bankAccountType ?? '',
      bankName: profile.bankName ?? '',
      maskedAccountNumber: profile.bankAccountNumberMasked,
      accountHolder: profile.bankAccountHolder ?? '',
      maskedHolderDocument: profile.bankAccountDocumentMasked,
    },
    links: profile.links.map(link => ({
      id: link.id,
      type: link.linkType,
      label: link.label ?? '',
      url: link.url,
      order: link.sortOrder,
    })),
  }
}

function normalizeFundingModel(value: unknown, fallback?: FundingModel): FundingModel {
  if (value === 'FIXED' || value === 'FLEXIBLE') return value
  // Compatibilidad de lectura durante la migración; toda escritura usa el contrato nuevo.
  if (value === 'all-or-nothing') return 'FIXED'
  if (value === 'flexible') return 'FLEXIBLE'
  if (value == null && fallback) return fallback
  return value as FundingModel
}

function normalizeRewards(item: Pick<Campaign, 'tiers' | 'rewards'> | Pick<Draft, 'tiers' | 'rewards'>): Reward[] {
  const canonical = Array.isArray(item.rewards) ? item.rewards : []
  const source = canonical.length > 0
    ? canonical
    : (item.tiers ?? []).map(tier => ({
        id: tier.id,
        title: tier.nombre,
        description: tier.descripcion,
        minimumAmount: tier.montoMinimo,
        estimatedDeliveryDate: null,
        quantity: tier.cupos ?? null,
        claimedQuantity: tier.cuposReclamados ?? 0,
        available: true,
        remainingQuantity: null,
      }))

  return source.map(reward => {
    const quantity = reward.quantity == null ? null : Number(reward.quantity)
    const claimedQuantity = Math.max(Number(reward.claimedQuantity ?? 0), 0)
    const remainingQuantity = quantity == null ? null : Math.max(quantity - claimedQuantity, 0)
    const soldOut = quantity !== null && claimedQuantity >= quantity
    return {
      id: String(reward.id),
      title: String(reward.title ?? ''),
      description: String(reward.description ?? ''),
      minimumAmount: Number(reward.minimumAmount),
      estimatedDeliveryDate: reward.estimatedDeliveryDate ?? null,
      quantity,
      claimedQuantity,
      available: !soldOut && reward.available !== false,
      remainingQuantity,
    }
  })
}

function normalizeCampaign(campaign: Campaign): Campaign {
  const normalized: Campaign = {
    ...campaign,
    ...normalizeCurrency(campaign.currency),
    mediaType: campaign.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    fundingModel: normalizeFundingModel(campaign.fundingModel),
    rewards: normalizeRewards(campaign),
    creator: normalizeUser(campaign.creator),
  }
  const deadline = new Date(normalized.deadline).getTime()
  const missedAllOrNothingGoal =
    normalized.fundingModel === 'FIXED' &&
    normalized.status !== 'FAILED' &&
    normalized.progress.raisedAmount < normalized.goalAmount &&
    Number.isFinite(deadline) &&
    deadline <= Date.now()
  return missedAllOrNothingGoal ? {
    ...normalized,
    status: 'FAILED',
    progress: { ...normalized.progress, status: 'FAILED', secondsRemaining: 0 },
  } : normalized
}

function normalizeDraft(draft: Draft): Draft {
  return {
    ...draft,
    ...normalizeCurrency(draft.currency),
    mediaType: draft.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    fundingModel: normalizeFundingModel(draft.fundingModel, 'FIXED'),
    rewards: normalizeRewards(draft),
  }
}

function normalizeCampaignSummary(campaign: CampaignSummary): CampaignSummary {
  return {
    ...campaign,
    fundingModel: normalizeFundingModel(campaign.fundingModel),
    ...normalizeCurrency(campaign.currency),
  }
}

function normalizeCampaignUpdate(update: CampaignUpdateDto | CampaignUpdate): CampaignUpdate {
  if ('media' in update && Array.isArray(update.media) && update.media.every(media => 'type' in media)) {
    const normalized = update as CampaignUpdate
    return {
      ...normalized,
      createdAt: normalized.createdAt ?? normalized.publishedAt,
      publishedAt: normalized.publishedAt,
    }
  }
  const dto = update as CampaignUpdateDto
  return {
    id: dto.id,
    campaignId: dto.campaignId,
    title: dto.title,
    body: dto.body,
    createdAt: dto.publishedAt,
    publishedAt: dto.publishedAt,
    media: dto.media.map(media => ({
      id: media.id,
      type: media.mediaType,
      url: media.url,
      sortOrder: media.sortOrder,
    })),
  }
}

function normalizeTransaction(item: TransactionHistoryItem): TransactionHistoryItem {
  return {
    ...item,
    receiptStatus: item.receiptStatus ?? null,
    receiptStatusLabel: item.receiptStatusLabel ?? null,
    paymentStatus: item.paymentStatus ?? null,
    refundedAt: item.refundedAt ?? null,
  }
}

function normalizeNotification(notification: NotificationDto): Notification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    campaignId: notification.campaignId,
    campaignUpdateId: notification.campaignUpdateId,
    createdAt: notification.createdAt,
    read: notification.readAt !== null,
  }
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
    const response = await request<CreatorProfileDto | CreatorProfile | null>('/api/creators/me/profile')
    return response ? normalizeCreatorProfile(response) : null
  },
  async saveCreatorProfile(body: CreatorProfilePayload) {
    const response = await request<CreatorProfileSaveResponse | CreatorProfileDto | CreatorProfile>(
      '/api/creators/me/profile',
      { method: 'PUT', body: JSON.stringify(body) },
    )
    if ('profile' in response) return normalizeCreatorProfile(response.profile)
    return normalizeCreatorProfile(response)
  },
  async updateMe(body: UpdateMePayload) {
    const response = await request<UpdateMeResponse | User>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return normalizeUser('user' in response ? response.user : response)
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
  async drafts() {
    const result = await page<Draft>('/api/drafts?page=0&pageSize=10')
    return { ...result, content: result.content.map(normalizeDraft) }
  },
  async draft(id: string) {
    return normalizeDraft(await request<Draft>(`/api/drafts/${encodeURIComponent(id)}`))
  },
  async createDraft(body: DraftPayload) {
    return normalizeDraft(await request<Draft>('/api/drafts', { method: 'POST', body: JSON.stringify(body) }))
  },
  async updateDraft(id: string, body: DraftPayload) {
    return normalizeDraft(await request<Draft>(`/api/drafts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }))
  },
  deleteDraft: (id: string) =>
    request<void>(`/api/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  async publishDraft(id: string) {
    return normalizeCampaign(
      await request<Campaign>(`/api/drafts/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
    )
  },
  async campaigns() {
    const result = await page<CampaignSummary>('/api/campaigns?page=0&pageSize=10&status=ACTIVE')
    return { ...result, content: result.content.map(normalizeCampaignSummary) }
  },
  async campaignsMine() {
    const result = await page<CampaignSummary>('/api/campaigns/mine?page=0&pageSize=10')
    return { ...result, content: result.content.map(normalizeCampaignSummary) }
  },
  async campaign(id: string) {
    return normalizeCampaign(await request<Campaign>(`/api/campaigns/${encodeURIComponent(id)}`))
  },
  async updateCampaignFundingModel(id: string, fundingModel: FundingModel) {
    return normalizeCampaign(
      await request<Campaign>(`/api/campaigns/${encodeURIComponent(id)}/funding-model`, {
        method: 'PATCH',
        body: JSON.stringify({ fundingModel }),
      }),
    )
  },
  campaignProgress: (id: string) =>
    request<Progress>(`/api/campaigns/${encodeURIComponent(id)}/progress`),
  async campaignUpdates(id: string, pageNumber = 0, pageSize = 10) {
    const response = await page<CampaignUpdateDto | CampaignUpdate>(
      `/api/campaigns/${encodeURIComponent(id)}/updates?page=${pageNumber}&pageSize=${pageSize}`,
    )
    return { ...response, content: response.content.map(normalizeCampaignUpdate) }
  },
  async createCampaignUpdate(id: string, body: CampaignUpdatePayload) {
    const response = await request<CampaignUpdateDto | CampaignUpdate>(
      `/api/campaigns/${encodeURIComponent(id)}/updates`,
      {
        method: 'POST',
        body: JSON.stringify(body.media.length ? {
          title: body.title,
          body: body.body,
          media: body.media.map((media, sortOrder) => ({
            mediaType: media.type,
            url: media.url,
            sortOrder,
          })),
        } : body),
      },
    )
    return normalizeCampaignUpdate(response)
  },
  campaignDiscussion: (id: string, pageNumber = 0, pageSize = 20) =>
    page<CampaignComment>(`/api/campaigns/${encodeURIComponent(id)}/discussion?page=${pageNumber}&pageSize=${pageSize}`),
  createDiscussionComment: (id: string, body: string) =>
    request<CampaignComment>(`/api/campaigns/${encodeURIComponent(id)}/discussion/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  replyToDiscussionComment: (campaignId: string, commentId: string, body: string) =>
    request<CampaignComment>(`/api/campaigns/${encodeURIComponent(campaignId)}/discussion/comments/${encodeURIComponent(commentId)}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  convertDiscussionCommentToFaq: (campaignId: string, commentId: string) =>
    request<CampaignComment | void>(`/api/campaigns/${encodeURIComponent(campaignId)}/discussion/comments/${encodeURIComponent(commentId)}/faq`, {
      method: 'PATCH',
    }),
  campaignFaq: (id: string, pageNumber = 0, pageSize = 20) =>
    page<CampaignComment>(`/api/campaigns/${encodeURIComponent(id)}/faq?page=${pageNumber}&pageSize=${pageSize}`),
  async notifications() {
    const result = await page<NotificationDto>('/api/notifications/me?page=0&pageSize=20&unreadOnly=false')
    return { ...result, content: result.content.map(normalizeNotification) }
  },
  markNotificationRead: (id: string) =>
    request<NotificationDto | void>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    }),
  async contributions(pageNumber = 0, pageSize = 10) {
    const result = await page<TransactionHistoryItem>(`/api/contributions/me?page=${pageNumber}&pageSize=${pageSize}`)
    return { ...result, content: result.content.map(normalizeTransaction) }
  },
  async supportedCampaigns(pageNumber = 0, pageSize = 10, signal?: AbortSignal) {
    const response = await request<SupportedCampaignsResponse>(
      `/api/sponsors/me/supported-campaigns?page=${pageNumber}&pageSize=${pageSize}`,
      { signal },
    )
    return {
      ...response,
      omittedCampaigns: Array.isArray(response.omittedCampaigns) ? response.omittedCampaigns : [],
      warnings: Array.isArray(response.warnings) ? response.warnings : [],
      content: response.content.map(item => {
        const received = typeof item.currency === 'string' ? item.currency.trim().toUpperCase() : null
        const currency = isCurrencyCode(received) ? received : null
        return {
          ...item,
          currency,
          currencyStatus: currency ? 'CONFIGURED' as const : 'UNAVAILABLE' as const,
        }
      }),
    }
  },
  subscriptions: (pageNumber = 0, pageSize = 20) =>
    page<CreatorSubscription>(`/api/subscriptions/me?page=${pageNumber}&pageSize=${pageSize}`),
  createSubscription: (body: CreateSubscriptionPayload) =>
    request<CreatorSubscription>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  cancelSubscription: (id: string) =>
    request<CreatorSubscription | void>(`/api/subscriptions/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    }),
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
