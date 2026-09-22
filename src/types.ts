export type Screen = "home" | "projects" | "register" | "login" | "creator-dashboard" | "sponsor-dashboard" | "create-campaign" | "campaign-page" | "payment-flow"

export interface User {
  id: string

  name: string

  email: string

  role: "creator" | "sponsor"

  verificationStatus: "pending" | "verified"
}

export interface Campaign {
  id: string

  title: string

  description: string

  goalAmount: number

  deadline: string

  category: string

  mediaUrl: string | null

  status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "SUCCESSFUL" | "FAILED" | "CANCELLED"

  publishedAt: string | null

  creator?: User

  rewards: Reward[]

  updates?: CampaignUpdate[]

  progress: Progress
}

export interface Draft {
  id: string

  title: string

  description: string | null

  goalAmount: number | null

  durationDays: number | null

  category: string

  mediaUrl: string | null

  rewards: Reward[]

  completionPercentage: number

  savedAt: string
}

export interface Reward {
  id: string

  title: string

  description: string | null

  minimumAmount: number

  quantity: number | null

  claimedQuantity: number | null
}

export interface Progress {
  goalAmount: number

  raisedAmount: number

  remainingAmount: number

  percentage: number

  sponsorsCount: number

  secondsRemaining: number

  status?: Campaign["status"]
}

export interface CampaignUpdate {
  id: string

  campaignId: string

  authorId: string

  title: string

  body: string

  publishedAt: string
}

export interface Contribution {
  id: string

  campaignId: string

  sponsorId: string

  rewardId: string | null

  amount: number

  currency: string

  status: "PENDING" | "CONFIRMED" | "FAILED" | "REFUNDED"

  createdAt: string

  payment?: PaymentSummary | null
}

export interface PaymentSummary {
  id: string

  status: string
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

  session: { expiresAt: string }
}

export interface ApiErrorBody {
  code?: string

  message?: string

  details?: string[]
}
