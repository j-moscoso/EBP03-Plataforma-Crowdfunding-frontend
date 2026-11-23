import type { CampaignComment, PageResponse } from '../types'

const question: CampaignComment = {
  id: 'fixture-comment-question',
  campaignId: 'fixture-campaign-discussion',
  authorId: 'fixture-sponsor',
  authorName: 'María Torres',
  parentCommentId: null,
  body: '¿Cuál será la fecha de entrega?',
  isOfficialAnswer: false,
  isFaq: false,
  createdAt: '2026-06-12T10:00:00.000Z',
}

const officialAnswer: CampaignComment = {
  id: 'fixture-comment-answer',
  campaignId: 'fixture-campaign-discussion',
  authorId: 'fixture-creator',
  authorName: 'Equipo Horizonte',
  parentCommentId: question.id,
  body: 'La primera entrega está prevista para septiembre de 2026.',
  isOfficialAnswer: true,
  isFaq: true,
  createdAt: '2026-06-12T14:30:00.000Z',
}

export const discussionFixture: PageResponse<CampaignComment> = {
  content: [question, officialAnswer],
  page: 0,
  pageSize: 20,
  totalElements: 2,
  totalPages: 1,
}

export const faqFixture: PageResponse<CampaignComment> = {
  content: [officialAnswer],
  page: 0,
  pageSize: 20,
  totalElements: 1,
  totalPages: 1,
}

export const discussionDesktopFixtures = { discussion: discussionFixture, faq: faqFixture }
export const discussionMobileFixtures = discussionDesktopFixtures
