import type { CampaignSummary, Draft } from '../types'

/**
 * Fixtures de revisión visual para HU 2.1.2.
 * No se importan desde el servicio real ni reemplazan respuestas del backend.
 */
export const fundingModelDraftFixtures: Record<'fixed' | 'flexible' | 'locked', Draft> = {
  fixed: {
    id: 'fixture-draft-fixed',
    title: 'Campaña con financiación fija',
    description: 'Fixture visual de escritorio y mobile.',
    goalAmount: 30000,
    durationDays: 30,
    category: 'Comunidad',
    mediaUrl: null,
    fundingModel: 'FIXED',
    rewards: [],
    completionPercentage: 70,
    savedAt: '2026-01-01T12:00:00.000Z',
    fundingModelEditable: true,
  },
  flexible: {
    id: 'fixture-draft-flexible',
    title: 'Campaña con financiación flexible',
    description: 'Fixture visual de escritorio y mobile.',
    goalAmount: 18000,
    durationDays: 45,
    category: 'Emprendimiento',
    mediaUrl: null,
    fundingModel: 'FLEXIBLE',
    rewards: [],
    completionPercentage: 70,
    savedAt: '2026-01-01T12:00:00.000Z',
    fundingModelEditable: true,
  },
  locked: {
    id: 'fixture-draft-locked',
    title: 'Campaña con modelo bloqueado',
    description: 'Fixture visual de conflicto después del primer aporte.',
    goalAmount: 25000,
    durationDays: 30,
    category: 'Tecnología',
    mediaUrl: null,
    fundingModel: 'FIXED',
    rewards: [],
    completionPercentage: 100,
    savedAt: '2026-01-01T12:00:00.000Z',
    fundingModelEditable: false,
    fundingModelLockedReason: 'El modelo no puede cambiar porque la campaña ya recibió aportes.',
  },
}

export const fundingModelSummaryFixtures: CampaignSummary[] = [
  {
    id: 'fixture-campaign-fixed',
    title: 'Campaña fija publicada',
    category: 'Comunidad',
    mediaUrl: null,
    status: 'ACTIVE',
    goalAmount: 30000,
    raisedAmount: 12000,
    fundingModel: 'FIXED',
  },
  {
    id: 'fixture-campaign-flexible',
    title: 'Campaña flexible publicada',
    category: 'Emprendimiento',
    mediaUrl: null,
    status: 'ACTIVE',
    goalAmount: 18000,
    raisedAmount: 6500,
    fundingModel: 'FLEXIBLE',
  },
]
