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
  | 'transaction-history'
  | 'supported-projects'
  | 'create-campaign'
  | 'campaign-page'
  | 'payment-flow'

export type UserRole = 'creator' | 'sponsor'
export type VerificationStatus = 'pending' | 'verified'
export type CampaignStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED'
export type ContributionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
export type CampaignUpdateMediaType = 'IMAGE' | 'VIDEO'
export type ReceiptStatus = 'HELD' | 'SUCCESSFUL' | 'REFUNDED' | 'FAILED'
export type SupportedCampaignStatusCode = CampaignStatus

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  verificationStatus: VerificationStatus
}

export interface Reward {
  id: string
  title: string
  description: string
  minimumAmount: number
  quantity?: number | null
  claimedQuantity?: number
}

export interface CampaignUpdate {
  id: string
  campaignId: string
  title: string
  body: string
  createdAt: string
  media: CampaignUpdateMedia[]
}

export interface CampaignUpdateMedia {
  id?: string
  type: CampaignUpdateMediaType
  url: string
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
  title: string
  body: string
  campaignId: string
  campaignTitle: string
  createdAt: string
  read: boolean
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
  status: CampaignStatus
  publishedAt: string | null
  creator: User
  rewards: Reward[]
  updates: CampaignUpdate[]
  progress: Progress
  currentUserIsCreator?: boolean
}

export interface Draft {
  id: string
  title: string
  description: string
  goalAmount: number | null
  durationDays: number | null
  category: string
  mediaUrl: string | null
  rewards: Reward[]
  completionPercentage: number
  savedAt: string
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
  receiptStatus: ReceiptStatus
  receiptStatusLabel: string
  contributionStatus: ContributionStatus
  paymentStatus: string
}

export interface SupportedCampaignCard {
  campaignId: string
  imageUrl: string | null
  title: string
  amountContributedByMe: number
  currency: string
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
  banking: {
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
    type: CreatorProfileLinkType
    label: string
    url: string
    order: number
  }>
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
  rewards: Array<{
    title: string
    description: string
    minimumAmount: number
  }>
}

export interface ContributionPayload {
  amount: number
  currency: string
  rewardId?: string
  paymentMethodId: string
}
