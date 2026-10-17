import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('frontend API integration contracts', () => {
  it('extracts the public user from the PATCH response wrapper', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      message: 'Datos actualizados',
      user: {
        id: 'user-1',
        name: 'Ana Pérez',
        email: 'ana@example.com',
        role: 'CREATOR',
        verificationStatus: 'VERIFIED',
      },
    }))

    const user = await api.updateMe({ name: 'Ana Pérez' })

    expect(user).toMatchObject({ id: 'user-1', name: 'Ana Pérez', role: 'creator' })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ name: 'Ana Pérez' }),
      }),
    )
  })

  it('maps the flat creator profile DTO and masked banking fields to the screen model', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 'profile-1',
      userId: 'user-1',
      displayName: 'Ana Pérez',
      bio: null,
      professionalTitle: null,
      phone: null,
      bankAccountType: null,
      bankName: null,
      bankAccountNumberMasked: null,
      bankAccountHolder: null,
      bankAccountDocumentMasked: null,
      links: [{
        id: 'link-1',
        linkType: 'PORTFOLIO',
        label: 'Portafolio',
        url: 'https://portfolio.example',
        sortOrder: 0,
      }],
      createdAt: null,
      updatedAt: null,
    }))

    const profile = await api.creatorProfile()

    expect(profile).toMatchObject({
      displayName: 'Ana Pérez',
      banking: { accountType: '', maskedAccountNumber: null },
      links: [{ id: 'link-1', type: 'PORTFOLIO', order: 0 }],
    })
  })

  it('sends the flat creator profile contract and extracts its wrapped profile', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      message: 'Perfil guardado',
      profile: {
        id: 'profile-1',
        userId: 'user-1',
        displayName: 'Ana Pérez',
        bio: '',
        professionalTitle: '',
        phone: '',
        bankAccountType: 'SAVINGS',
        bankName: 'Banco de Prueba',
        bankAccountNumberMasked: '******7890',
        bankAccountHolder: 'Ana Pérez',
        bankAccountDocumentMasked: '*******89',
        links: [],
        createdAt: '2026-10-16T03:00:00Z',
        updatedAt: '2026-10-16T03:05:00Z',
      },
    }))

    const payload = {
      displayName: 'Ana Pérez',
      bio: '',
      professionalTitle: '',
      phone: '',
      bankAccountType: 'SAVINGS' as const,
      bankName: 'Banco de Prueba',
      bankAccountNumber: '1234567890',
      bankAccountHolder: 'Ana Pérez',
      bankAccountDocument: '123456789',
      links: [{ linkType: 'PORTFOLIO' as const, label: 'Portafolio', url: 'https://portfolio.example', sortOrder: 0 }],
    }

    const profile = await api.saveCreatorProfile(payload)
    const requestOptions = fetchMock.mock.calls[0]?.[1]

    expect(profile.banking.maskedAccountNumber).toBe('******7890')
    expect(JSON.parse(String(requestOptions?.body))).toEqual(payload)
    expect(JSON.stringify(requestOptions?.body)).not.toContain('preserveAccountNumber')
    expect(requestOptions?.credentials).toBe('include')
  })

  it('maps update media and publication dates from the backend DTO', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      content: [{
        id: 'update-1',
        campaignId: 'campaign-1',
        authorId: 'creator-1',
        title: 'Avance',
        body: 'Primera etapa lista',
        publishedAt: '2026-10-16T03:10:00Z',
        media: [{ id: 'media-1', mediaType: 'IMAGE', url: 'https://cdn.example/a.jpg', sortOrder: 0 }],
      }],
      page: 0,
      pageSize: 10,
      totalElements: 1,
      totalPages: 1,
    }))

    const response = await api.campaignUpdates('campaign-1')

    expect(response.content[0]).toMatchObject({
      publishedAt: '2026-10-16T03:10:00Z',
      media: [{ type: 'IMAGE', sortOrder: 0 }],
    })
  })

  it('sends campaign update media using the backend mediaType and sortOrder fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 'update-2',
      campaignId: 'campaign-1',
      authorId: 'creator-1',
      title: 'Avance',
      body: 'Actualización',
      publishedAt: '2026-10-16T03:10:00Z',
      media: [{ id: 'media-2', mediaType: 'VIDEO', url: 'https://cdn.example/a.mp4', sortOrder: 0 }],
      notificationsCreated: 2,
    }, 201))

    await api.createCampaignUpdate('campaign-1', {
      title: 'Avance',
      body: 'Actualización',
      media: [{ type: 'VIDEO', url: 'https://cdn.example/a.mp4' }],
    })
    const requestOptions = fetchMock.mock.calls[0]?.[1]

    expect(JSON.parse(String(requestOptions?.body))).toEqual({
      title: 'Avance',
      body: 'Actualización',
      media: [{ mediaType: 'VIDEO', url: 'https://cdn.example/a.mp4', sortOrder: 0 }],
    })
  })

  it('maps supported-campaign empty responses without changing their message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      content: [],
      page: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      emptyMessage: 'Aún no has apoyado ningún proyecto',
    }))

    const response = await api.supportedCampaigns(0, 10)
    const [url, options] = fetchMock.mock.calls[0] ?? []

    expect(response.emptyMessage).toBe('Aún no has apoyado ningún proyecto')
    expect(url).toContain('/api/sponsors/me/supported-campaigns?page=0&pageSize=10')
    expect(options?.credentials).toBe('include')
  })

  it('normalizes a configured campaign currency without changing its status', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 'campaign-1',
      title: 'Huerta comunitaria',
      description: 'Una campaña',
      goalAmount: 100000,
      deadline: '2026-12-01T00:00:00Z',
      category: 'COMMUNITY',
      mediaUrl: null,
      currency: ' cop ',
      currencyStatus: 'CONFIGURED',
      status: 'ACTIVE',
      publishedAt: '2026-10-16T03:00:00Z',
      creator: {
        id: 'creator-1',
        name: 'Ana Pérez',
        email: 'ana@example.com',
        role: 'CREATOR',
        verificationStatus: 'VERIFIED',
      },
      rewards: [],
      updates: [],
      progress: {
        goalAmount: 100000,
        raisedAmount: 25000,
        remainingAmount: 75000,
        percentage: 25,
        sponsorsCount: 1,
        secondsRemaining: 1000,
        status: 'ACTIVE',
      },
    }))

    const campaign = await api.campaign('campaign-1')

    expect(campaign).toMatchObject({
      id: 'campaign-1',
      currency: 'COP',
      currencyStatus: 'CONFIGURED',
    })
  })

  it('keeps a campaign without canonical currency unavailable', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 'campaign-2',
      title: 'Campaña histórica',
      description: 'Sin fuente autoritativa',
      goalAmount: 100000,
      deadline: '2026-12-01T00:00:00Z',
      category: 'COMMUNITY',
      mediaUrl: null,
      currency: null,
      currencyStatus: 'UNAVAILABLE',
      status: 'ACTIVE',
      publishedAt: null,
      creator: {
        id: 'creator-2',
        name: 'Luis Gómez',
        email: 'luis@example.com',
        role: 'CREATOR',
        verificationStatus: 'VERIFIED',
      },
      rewards: [],
      updates: [],
      progress: {
        goalAmount: 100000,
        raisedAmount: 0,
        remainingAmount: 100000,
        percentage: 0,
        sponsorsCount: 0,
        secondsRemaining: 0,
        status: 'ACTIVE',
      },
    }))

    const campaign = await api.campaign('campaign-2')

    expect(campaign.currency).toBeNull()
    expect(campaign.currencyStatus).toBe('UNAVAILABLE')
  })

  it('does not present an invalid campaign currency as configured', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 'campaign-3',
      title: 'Campaña inválida',
      description: 'Moneda incorrecta',
      goalAmount: 100000,
      deadline: '2026-12-01T00:00:00Z',
      category: 'COMMUNITY',
      mediaUrl: null,
      currency: 'US',
      currencyStatus: 'CONFIGURED',
      status: 'ACTIVE',
      publishedAt: null,
      creator: {
        id: 'creator-3',
        name: 'Marta Ruiz',
        email: 'marta@example.com',
        role: 'CREATOR',
        verificationStatus: 'VERIFIED',
      },
      rewards: [],
      updates: [],
      progress: {
        goalAmount: 100000,
        raisedAmount: 0,
        remainingAmount: 100000,
        percentage: 0,
        sponsorsCount: 0,
        secondsRemaining: 0,
        status: 'ACTIVE',
      },
    }))

    const campaign = await api.campaign('campaign-3')

    expect(campaign.currency).toBeNull()
    expect(campaign.currencyStatus).toBe('UNAVAILABLE')
    expect(consoleError).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })

  it('preserves supported-campaign omissions and warning details', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      content: [{
        campaignId: 'campaign-4',
        imageUrl: null,
        title: 'Campaña visible',
        amountContributedByMe: 50000,
        currency: 'cop',
        raisedAmount: 50000,
        goalAmount: 100000,
        totalRaisedPercentage: 50,
        status: 'Activa',
        statusCode: 'ACTIVE',
        lastContributionAt: '2026-10-16T03:00:00Z',
      }],
      page: 0,
      pageSize: 10,
      totalElements: 1,
      totalPages: 1,
      omittedCampaigns: [{
        campaignId: 'campaign-5',
        title: 'Campaña histórica',
        reasonCode: 'MIXED_CONFIRMED_CURRENCIES',
        currencies: ['COP', 'USD'],
      }],
      warnings: [{
        code: 'SUPPORTED_CAMPAIGNS_OMITTED',
        message: 'Algunas campañas no se muestran porque tienen monedas confirmadas incompatibles.',
        affectedCampaignCount: 1,
      }],
    }))

    const response = await api.supportedCampaigns()

    expect(response.content[0]).toMatchObject({
      currency: 'COP',
      currencyStatus: 'CONFIGURED',
    })
    expect(response.omittedCampaigns).toEqual([{
      campaignId: 'campaign-5',
      title: 'Campaña histórica',
      reasonCode: 'MIXED_CONFIRMED_CURRENCIES',
      currencies: ['COP', 'USD'],
    }])
    expect(response.warnings).toEqual([{
      code: 'SUPPORTED_CAMPAIGNS_OMITTED',
      message: 'Algunas campañas no se muestran porque tienen monedas confirmadas incompatibles.',
      affectedCampaignCount: 1,
    }])
  })

  it('sends exactly the campaign currency with a contribution', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 'contribution-1',
      campaignId: 'campaign-1',
      sponsorId: 'sponsor-1',
      rewardId: null,
      amount: 25000,
      currency: 'COP',
      status: 'PENDING',
      createdAt: '2026-10-16T03:00:00Z',
      payment: null,
    }, 201))

    await api.contribute(
      'campaign-1',
      { amount: 25000, currency: 'COP', paymentMethodId: 'pm-1' },
      'idempotency-1',
    )

    const requestOptions = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(requestOptions?.body))).toMatchObject({
      amount: 25000,
      currency: 'COP',
    })
    expect(requestOptions?.headers).toMatchObject({
      'Idempotency-Key': 'idempotency-1',
    })
  })
})
