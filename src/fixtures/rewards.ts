import type { Reward } from '../types'

/**
 * Fixtures aisladas de revisión visual para HU 2.1.3.
 * No se importan desde pantallas ni sustituyen respuestas del backend.
 */
export const rewardFixtures: Record<'soldOut' | 'limited' | 'unlimited', Reward> = {
  soldOut: {
    id: 'fixture-reward-sold-out',
    title: 'Edición fundadores',
    description: 'Una edición numerada con agradecimiento impreso.',
    minimumAmount: 75,
    estimatedDeliveryDate: '2026-09-15',
    quantity: 20,
    claimedQuantity: 20,
    available: false,
    remainingQuantity: 0,
  },
  limited: {
    id: 'fixture-reward-limited',
    title: 'Kit de lanzamiento',
    description: 'Producto, empaque especial y acceso anticipado.',
    minimumAmount: 120,
    estimatedDeliveryDate: '2026-10-01',
    quantity: 50,
    claimedQuantity: 42,
    available: true,
    remainingQuantity: 8,
  },
  unlimited: {
    id: 'fixture-reward-unlimited',
    title: 'Agradecimiento digital',
    description: 'Tu nombre aparecerá en el muro digital de patrocinadores.',
    minimumAmount: 15,
    estimatedDeliveryDate: '2026-08-01',
    quantity: null,
    claimedQuantity: 128,
    available: true,
    remainingQuantity: null,
  },
}
