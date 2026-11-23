import type { CreatorSubscription, PageResponse } from '../types'

/**
 * Fixtures aisladas para revisar HU 3.1.2 sin convertir datos estáticos
 * en la fuente de verdad de las pantallas.
 */
export const subscriptionPageFixture: PageResponse<CreatorSubscription> = {
  content: [
    {
      id: 'fixture-subscription-active',
      creatorId: 'fixture-creator-active',
      creatorName: 'Estudio Horizonte',
      amount: 25,
      currency: 'USD',
      status: 'ACTIVE',
      nextChargeAt: '2026-07-15T10:00:00.000Z',
      lastChargeAt: '2026-06-15T10:00:00.000Z',
      cancelledAt: null,
      createdAt: '2026-06-15T10:00:00.000Z',
    },
    {
      id: 'fixture-subscription-cancelled',
      creatorId: 'fixture-creator-cancelled',
      creatorName: 'Laboratorio Abierto',
      amount: 12.5,
      currency: 'USD',
      status: 'CANCELLED',
      nextChargeAt: null,
      lastChargeAt: '2026-05-02T10:00:00.000Z',
      cancelledAt: '2026-05-20T12:00:00.000Z',
      createdAt: '2026-03-02T10:00:00.000Z',
    },
  ],
  page: 0,
  pageSize: 20,
  totalElements: 2,
  totalPages: 1,
}
