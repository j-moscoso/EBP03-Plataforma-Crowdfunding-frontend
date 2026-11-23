import type { Notification, NotificationDto } from '../types'

export const newContributionNotificationDto: NotificationDto = {
  id: 'notification-contribution-001',
  type: 'NEW_CONTRIBUTION',
  title: 'Nuevo aporte recibido',
  body: '¡Nuevo aporte! Ana Pérez ha aportado $25.00 USD',
  campaignId: 'campaign-community-garden',
  contributionId: 'contribution-ana-001',
  campaignUpdateId: null,
  readAt: null,
  createdAt: '2026-02-18T14:30:00.000Z',
}

export const notificationPanelFixtures: Notification[] = [
  {
    id: newContributionNotificationDto.id,
    type: newContributionNotificationDto.type,
    title: newContributionNotificationDto.title,
    body: newContributionNotificationDto.body,
    campaignId: newContributionNotificationDto.campaignId,
    contributionId: newContributionNotificationDto.contributionId,
    campaignUpdateId: null,
    createdAt: newContributionNotificationDto.createdAt,
    read: false,
  },
  {
    id: 'notification-update-001',
    type: 'CAMPAIGN_UPDATE_PUBLISHED',
    title: 'Hay novedades en una campaña',
    body: 'La campaña publicó una nueva actualización.',
    campaignId: 'campaign-community-garden',
    contributionId: null,
    campaignUpdateId: 'update-001',
    createdAt: '2026-02-17T10:15:00.000Z',
    read: true,
  },
]
