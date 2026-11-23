import type { TransactionHistoryItem } from '../types'

/**
 * Fixtures aisladas de revisión visual para HU 3.2.2.
 * El historial real continúa usando GET /api/contributions/me.
 */
export const refundHistoryFixtures: Record<'held' | 'refunded' | 'successful', TransactionHistoryItem> = {
  held: {
    contributionId: 'fixture-contribution-held',
    date: '2026-06-01T10:00:00.000Z',
    projectName: 'Biblioteca comunitaria',
    campaignId: 'fixture-campaign-held',
    amount: 40,
    currency: 'USD',
    referenceCode: 'IF-HELD-001',
    receiptStatus: 'HELD',
    receiptStatusLabel: 'Retenido',
    contributionStatus: 'HELD',
    paymentStatus: 'AUTHORIZED',
    campaignDeadline: '2026-07-15T23:59:59.000Z',
  },
  refunded: {
    contributionId: 'fixture-contribution-refunded',
    date: '2026-04-10T14:30:00.000Z',
    projectName: 'Laboratorio móvil',
    campaignId: 'fixture-campaign-refunded',
    amount: 85,
    currency: 'USD',
    referenceCode: 'IF-REFUND-002',
    receiptStatus: 'REFUNDED',
    receiptStatusLabel: 'Reembolsado',
    contributionStatus: 'REFUNDED',
    paymentStatus: 'REFUNDED',
    refundedAt: '2026-05-12T09:00:00.000Z',
  },
  successful: {
    contributionId: 'fixture-contribution-successful',
    date: '2026-03-20T18:00:00.000Z',
    projectName: 'Taller de energía solar',
    campaignId: 'fixture-campaign-successful',
    amount: 120,
    currency: 'USD',
    referenceCode: 'IF-SUCCESS-003',
    receiptStatus: 'SUCCESSFUL',
    receiptStatusLabel: 'Consolidado',
    contributionStatus: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
  },
}

export const refundDesktopFixtures = refundHistoryFixtures
export const refundMobileFixtures = refundHistoryFixtures
