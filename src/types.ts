export type Screen =
  | 'home'
  | 'projects'
  | 'register'
  | 'login'
  | 'password-reset-request'
  | 'password-reset-confirm'
  | 'settings'
  | 'creator-profile'
  | 'creator-dashboard'
  | 'sponsor-dashboard'
  | 'subscriptions'
  | 'transaction-history'
  | 'supported-projects'
  | 'create-campaign'
  | 'campaign-page'
  | 'payment-flow'

export type UserRole = 'creator' | 'sponsor'
export type VerificationStatus = 'pending' | 'verified'
export type CampaignStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED'
export type FundingModel = 'FIXED' | 'FLEXIBLE'
export type CampaignMediaType = 'IMAGE' | 'VIDEO'
export type ContributionStatus = 'PENDING' | 'HELD' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
export type CampaignUpdateMediaType = 'IMAGE' | 'VIDEO'
export type ReceiptStatus = 'HELD' | 'SUCCESSFUL' | 'REFUNDED' | 'FAILED'
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'CONFIRMED' | 'FAILED' | 'REFUNDED' | 'SIMULATED'
export type ContributionFrequency = 'once' | 'monthly'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'FAILED'
export type SupportedCampaignStatusCode = CampaignStatus
export type CampaignCurrencyStatus = 'CONFIGURED' | 'UNAVAILABLE'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  verificationStatus: VerificationStatus
}

export interface Tier {
  id: string
  nombre: string
  montoMinimo: number
  descripcion: string
  cupos?: number | null
  cuposReclamados?: number
}

export interface Reward {
  id: string
  title: string
  description: string
  minimumAmount: number
  estimatedDeliveryDate: string | null
  quantity: number | null
  claimedQuantity: number
  available: boolean
  remainingQuantity: number | null
}

export interface CampaignUpdate {
  id: string
  campaignId: string
  title: string
  body: string
  createdAt?: string
  publishedAt?: string
  media: CampaignUpdateMedia[]
}

export interface CampaignUpdateDto {
  id: string
  campaignId: string
  authorId: string
  title: string
  body: string
  publishedAt: string
  media: Array<{
    id: string
    mediaType: CampaignUpdateMediaType
    url: string
    sortOrder: number
  }>
  notificationsCreated?: number
}

export interface CampaignUpdateMedia {
  id?: string
  type: CampaignUpdateMediaType
  url: string
  sortOrder?: number
}

export interface CampaignUpdatePayload {
  title: string
  body: string
  media: Array<{
    type: CampaignUpdateMediaType
    url: string
  }>
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  campaignId: string | null
  contributionId?: string | null
  campaignUpdateId: string | null
  createdAt: string
  read: boolean
}

export interface NotificationDto {
  id: string
  type: string
  title: string
  body: string
  campaignId: string | null
  contributionId?: string | null
  campaignUpdateId: string | null
  readAt: string | null
  createdAt: string
}

export interface CreatorSubscription {
  id: string
  creatorId: string
  creatorName?: string
  amount: number
  currency: string
  status: SubscriptionStatus
  nextChargeAt: string | null
  lastChargeAt: string | null
  cancelledAt: string | null
  createdAt: string
}

export interface CampaignComment {
  id: string
  campaignId: string
  authorId: string
  authorName: string
  parentCommentId: string | null
  body: string
  isOfficialAnswer: boolean
  isFaq: boolean
  createdAt: string
}

export interface SimulatedContribution {
  id: string
  campaignId: string
  campaignTitle: string
  creatorId: string
  sponsorId: string
  sponsorName: string
  amount: number
  currency: string
  rewardId: string | null
  frequency: ContributionFrequency
  receiptStatus: Extract<ReceiptStatus, 'HELD' | 'REFUNDED'>
  refundedAt?: string | null
  createdAt: string
}

export interface Progress {
  goalAmount: number
  raisedAmount: number
  remainingAmount: number
  percentage: number
  sponsorsCount: number
  secondsRemaining: number
  status: CampaignStatus
}

export interface Campaign {
  id: string
  title: string
  description: string
  goalAmount: number
  deadline: string
  category: string
  mediaUrl: string | null
  mediaType?: CampaignMediaType
  currency: string | null
  currencyStatus: CampaignCurrencyStatus
  status: CampaignStatus
  publishedAt: string | null
  fundingModel: FundingModel
  creator: User
  rewards: Reward[]
  /** @deprecated Solo para compatibilidad de lectura con respuestas anteriores. */
  tiers?: Tier[]
  updates: CampaignUpdate[]
  progress: Progress
  refundedContributionsCount?: number
  currentUserIsCreator?: boolean
  fundingModelEditable?: boolean
  fundingModelLockedReason?: string | null
}

export interface CampaignSummary {
  id: string
  title: string
  description?: string
  category: string
  mediaUrl: string | null
  mediaType?: CampaignMediaType
  currency?: string | null
  currencyStatus?: CampaignCurrencyStatus
  status: CampaignStatus
  goalAmount: number
  raisedAmount?: number
  deadline?: string
  progress?: Pick<Progress, 'raisedAmount' | 'remainingAmount' | 'percentage' | 'sponsorsCount' | 'secondsRemaining'>
  publishedAt?: string | null
  fundingModel: FundingModel
  refundedContributionsCount?: number
  creator?: User
}

export interface Draft {
  id: string
  title: string
  description: string
  goalAmount: number | null
  durationDays: number | null
  category: string
  mediaUrl: string | null
  mediaType?: CampaignMediaType
  currency?: string | null
  fundingModel: FundingModel
  rewards: Reward[]
  /** @deprecated Solo para compatibilidad de lectura con respuestas anteriores. */
  tiers?: Tier[]
  completionPercentage: number
  savedAt: string
  fundingModelEditable?: boolean
  fundingModelLockedReason?: string | null
}

export interface PaymentSummary {
  id?: string
  paymentMethodId?: string
  provider?: string
  status?: string
  [key: string]: unknown
}

export interface Contribution {
  id: string
  campaignId: string
  sponsorId: string
  rewardId: string | null
  /** @deprecated Compatibilidad temporal con aportes anteriores. */
  tierId?: string | null
  amount: number
  currency: string
  status: ContributionStatus
  createdAt: string
  payment: PaymentSummary | null
}

export interface TransactionHistoryItem {
  contributionId: string
  date: string
  projectName: string
  campaignId: string
  amount: number
  currency: string
  referenceCode: string | null
  receiptStatus: ReceiptStatus | null
  receiptStatusLabel: string | null
  contributionStatus: ContributionStatus
  paymentStatus: PaymentStatus | null
  refundedAt?: string | null
  campaignDeadline?: string | null
  subscriptionId?: string | null
  contributionType?: 'ONE_TIME' | 'SUBSCRIPTION'
}

export interface SupportedCampaignCard {
  campaignId: string
  imageUrl: string | null
  mediaType?: CampaignMediaType
  title: string
  amountContributedByMe: number
  currency: string | null
  currencyStatus?: CampaignCurrencyStatus
  raisedAmount: number
  goalAmount: number
  totalRaisedPercentage: number
  status: string
  statusCode: SupportedCampaignStatusCode
  lastContributionAt: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
  emptyMessage?: string | null
}

export interface OmittedCampaign {
  campaignId: string
  title: string
  reasonCode: 'MIXED_CONFIRMED_CURRENCIES'
  currencies: string[]
}

export interface SupportedCampaignWarning {
  code: 'SUPPORTED_CAMPAIGNS_OMITTED'
  message: string
  affectedCampaignCount: number
}

export interface SupportedCampaignsResponse extends PageResponse<SupportedCampaignCard> {
  omittedCampaigns: OmittedCampaign[]
  warnings: SupportedCampaignWarning[]
}

export interface AuthResponse {
  user: User
}

export interface UpdateMePayload {
  name: string
}

export type CreatorProfileLinkType = 'PORTFOLIO' | 'PROFESSIONAL_NETWORK' | 'OTHER_PROJECT'
export type BankAccountType = 'SAVINGS' | 'CHECKING'

export interface CreatorProfileLink {
  id: string
  type: CreatorProfileLinkType
  label: string
  url: string
  order: number
}

export interface CreatorBankingProfile {
  accountType: BankAccountType | ''
  bankName: string
  maskedAccountNumber: string | null
  accountHolder: string
  maskedHolderDocument: string | null
}

export interface CreatorProfile {
  id?: string
  displayName: string
  bio: string
  phone: string
  professionalTitle: string
  banking: CreatorBankingProfile
  links: CreatorProfileLink[]
  completionPercentage?: number
}

export interface CreatorProfilePayload {
  displayName: string
  bio: string
  phone: string
  professionalTitle: string
  bankAccountType?: BankAccountType
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
  bankAccountDocument?: string
  banking?: {
    accountType: BankAccountType
    bankName: string
    accountNumber: string | null
    preserveAccountNumber: boolean
    accountHolder: string
    holderDocument: string | null
    preserveHolderDocument: boolean
  }
  links: Array<{
    id?: string
    type?: CreatorProfileLinkType
    linkType?: CreatorProfileLinkType
    label: string
    url: string
    order?: number
    sortOrder?: number
  }>
}

export interface CreatorProfileDto {
  id: string | null
  userId: string
  displayName: string | null
  bio: string | null
  professionalTitle: string | null
  phone: string | null
  bankAccountType: BankAccountType | null
  bankName: string | null
  bankAccountNumberMasked: string | null
  bankAccountHolder: string | null
  bankAccountDocumentMasked: string | null
  links: Array<{
    id: string
    linkType: CreatorProfileLinkType
    label: string | null
    url: string
    sortOrder: number
  }>
  createdAt: string | null
  updatedAt: string | null
}

export interface CreatorProfileSaveResponse {
  message: string
  profile: CreatorProfileDto
}

export interface UpdateMeResponse {
  message: string
  user: User
}

export interface ApiErrorBody {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

export interface FieldValidationError {
  field: string
  message: string
}

export interface PasswordResetRequestResponse {
  message: string
}

export interface PasswordResetValidationResponse {
  valid: boolean
  expiresAt?: string
}

export interface DraftPayload {
  title: string
  description: string
  goalAmount: number | null
  durationDays: number | null
  category: string
  mediaUrl: string | null
  mediaType?: CampaignMediaType
  currency?: string | null
  fundingModel: FundingModel
  rewards: Array<{
    title: string
    description: string
    minimumAmount: number
    estimatedDeliveryDate: string
    quantity: number | null
  }>
}

export interface ContributionPayload {
  amount: number
  currency: string
  rewardId?: string
  paymentMethodId: string
}

export interface CreateSubscriptionPayload {
  creatorId: string
  amount: number
  currency: string
  paymentMethodId: string
}
