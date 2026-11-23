import { useEffect, useState } from 'react'
import type { Campaign, ContributionFrequency, Screen, SimulatedContribution, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

interface Props {
  campaignId: string | null
  initialRewardId: string | null
  user: User | null
  navigate: (screen: Screen, id?: string | null) => void
  onContribution: (contribution: SimulatedContribution) => void
}

type Status = 'form' | 'loading' | 'success'
const validAmount = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0

export default function PaymentFlow({ campaignId, initialRewardId, user, navigate, onContribution }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loadingCampaign, setLoadingCampaign] = useState(true)
  const [campaignError, setCampaignError] = useState('')
  const [amount, setAmount] = useState('')
  const currency = 'USD'
  const [rewardId, setRewardId] = useState('')
  const [frequency, setFrequency] = useState<ContributionFrequency>('once')
  const [status, setStatus] = useState<Status>('form')
  const [contribution, setContribution] = useState<SimulatedContribution | null>(null)

  async function loadCampaign(applyInitialReward = false, propagateError = false) {
    if (!campaignId) {
      setCampaignError('Falta el identificador de la campaña.')
      setLoadingCampaign(false)
      return null
    }
    try {
      const result = await api.campaign(campaignId)
      setCampaign(result)
      setCampaignError('')
      if (applyInitialReward && initialRewardId) {
        const initialReward = result.rewards.find(reward => reward.id === initialRewardId)
        const soldOut = initialReward?.quantity !== null && initialReward != null && initialReward.claimedQuantity >= initialReward.quantity
        if (initialReward && initialReward.available && !soldOut) {
          setRewardId(initialReward.id)
          setAmount(String(initialReward.minimumAmount))
        } else {
          setRewardId('')
          setCampaignError('La recompensa seleccionada ya no está disponible.')
        }
      }
      return result
    } catch (requestError) {
      setCampaignError(apiErrorMessage(requestError, 'No pudimos cargar la campaña.'))
      if (propagateError) throw requestError
      return null
    } finally {
      setLoadingCampaign(false)
    }
  }

  useEffect(() => { void loadCampaign(true) }, [campaignId, initialRewardId])

  if (!user || user.role !== 'sponsor') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-md">
          <h1 className="font-display font-800 text-2xl text-gray-900">Inicia sesión como patrocinador</h1>
          <p className="text-sm text-gray-500 mt-2 mb-6">Necesitas una cuenta de patrocinador para realizar un aporte.</p>
          <button onClick={() => navigate('login')} className="bg-primary text-white rounded-xl px-6 py-3 text-sm font-semibold">Iniciar sesión</button>
        </div>
      </div>
    )
  }

  if (loadingCampaign) return <div className="min-h-screen bg-bg flex items-center justify-center text-sm font-semibold text-gray-600">Cargando campaña...</div>
  if (!campaign) return <div className="min-h-screen bg-bg flex items-center justify-center px-4"><div className="bg-white p-8 rounded-2xl text-center"><p className="text-error text-sm mb-4">{campaignError}</p><button onClick={() => navigate('projects')} className="text-primary font-semibold">Volver a explorar</button></div></div>

  const remaining = Math.max(campaign.progress.remainingAmount ?? campaign.goalAmount - campaign.progress.raisedAmount, 0)
  const sortedRewards = [...campaign.rewards].sort((a, b) => a.minimumAmount - b.minimumAmount)
  const selectedReward = campaign.rewards.find(reward => reward.id === rewardId)
  const amountOkay = validAmount(amount) && Number(amount) <= remaining
  const rewardOkay = !selectedReward || Number(amount) >= selectedReward.minimumAmount
  const rewardAvailable = !selectedReward || (
    selectedReward.available &&
    (selectedReward.quantity === null || selectedReward.claimedQuantity < selectedReward.quantity)
  )
  const canSubmit = campaign.status === 'ACTIVE' && campaign.progress.secondsRemaining > 0 && amountOkay && rewardOkay && rewardAvailable
  const activeCampaign = campaign
  const sponsor = user

  async function contribute(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || !campaignId) return
    setStatus('loading')
    setCampaignError('')
    try {
      const refreshed = await loadCampaign(false, true)
      const refreshedReward = rewardId ? refreshed?.rewards.find(reward => reward.id === rewardId) : null
      const soldOut = refreshedReward?.quantity !== null && refreshedReward != null && refreshedReward.claimedQuantity >= refreshedReward.quantity
      if (rewardId && (!refreshedReward || !refreshedReward.available || soldOut)) {
        setRewardId('')
        setCampaignError('La recompensa seleccionada se agotó. Elige otra recompensa o realiza un aporte libre.')
        setStatus('form')
        return
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.code === 'REWARD_SOLD_OUT' || requestError.status === 409)) {
        setRewardId('')
        await loadCampaign(false)
        setCampaignError('La recompensa seleccionada se agotó. Actualizamos la disponibilidad para que elijas otra opción.')
        setStatus('form')
        return
      }
      // El aporte sigue siendo una simulación local; una recarga no disponible no debe solicitar datos de pago.
    }
    await new Promise(resolve => window.setTimeout(resolve, 650))
    const result: SimulatedContribution = {
      id: crypto.randomUUID(),
      campaignId,
      campaignTitle: activeCampaign.title,
      creatorId: activeCampaign.creator.id,
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      amount: Number(amount),
      currency,
      rewardId: rewardId || null,
      frequency,
      receiptStatus: 'HELD',
      createdAt: new Date().toISOString(),
    }
    setContribution(result)
    onContribution(result)
    setStatus('success')
  }

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        <button onClick={() => navigate('campaign-page', campaign.id)} className="text-sm text-gray-500 hover:text-primary mb-6">← Volver a la campaña</button>
        {status === 'form' && (
          <form onSubmit={contribute} className="fade-in">
            <h1 className="font-display font-800 text-3xl text-gray-900">Realiza tu aporte</h1>
            <p className="text-sm text-gray-500 mt-2 mb-6">Apoyando a <strong>{campaign.title}</strong>. Restante simulado: {currency} {remaining.toLocaleString('es-ES')}.</p>
            {campaignError && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{campaignError}</div>}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <fieldset>
                <legend className="block text-sm font-medium mb-2">Frecuencia del aporte</legend>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1" role="radiogroup">
                  {([
                    ['once', 'Aporte único'],
                    ['monthly', 'Aporte mensual'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={frequency === value}
                      onClick={() => setFrequency(value)}
                      className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${frequency === value ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {frequency === 'monthly' && (
                  <div className="mt-3 rounded-xl border border-primary/15 bg-primary-light/50 px-4 py-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Resumen mensual</p>
                    <p className="text-sm text-gray-700 mt-1">Aportarás <strong>{currency} {validAmount(amount) ? Number(amount).toLocaleString('es-ES') : '0'}</strong> cada mes.</p>
                    <p className="text-xs text-gray-500 mt-1">Simulación visual: no se realizarán cobros automáticos.</p>
                  </div>
                )}
              </fieldset>
              <fieldset>
                <legend className="block text-sm font-medium mb-2">Elige cómo aportar</legend>
                <div className="space-y-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!rewardId}
                    onClick={() => setRewardId('')}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${!rewardId ? 'border-primary bg-primary-light/50' : 'border-gray-200 hover:border-primary/40'}`}
                  >
                    <span className="font-display font-700 text-sm text-gray-900">Aporte libre</span>
                    <span className="block text-xs text-gray-500 mt-1">Tú decides el monto, sin seleccionar una recompensa.</span>
                  </button>
                  {sortedRewards.map(reward => {
                    const exhausted = !reward.available || (reward.quantity !== null && reward.claimedQuantity >= reward.quantity)
                    const selected = reward.id === rewardId
                    return (
                      <button
                        key={reward.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-disabled={exhausted}
                        disabled={exhausted}
                        onClick={() => { setRewardId(reward.id); setAmount(String(reward.minimumAmount)); setCampaignError('') }}
                        className={`w-full text-left rounded-xl border-2 p-4 transition-colors disabled:bg-gray-50 disabled:text-gray-400 ${selected ? 'border-primary bg-primary-light/50' : 'border-gray-200 hover:border-primary/40'}`}
                      >
                        <span className="flex items-center justify-between gap-4">
                          <span className="font-display font-700 text-sm">{reward.title}</span>
                          <span className="font-display font-800 text-primary">{reward.minimumAmount.toLocaleString('es-ES')}+</span>
                        </span>
                        <span className="block text-xs text-gray-500 mt-1">{exhausted ? 'Agotado' : reward.description}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <div>
                <label htmlFor="contribution-amount" className="block text-sm font-medium mb-1.5">Monto del aporte</label>
                <input id="contribution-amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="50.00" />
                {amount && !amountOkay && <p className="text-xs text-error mt-1">Ingresa un monto positivo, con máximo dos decimales y no mayor al restante disponible.</p>}
                {!rewardOkay && <p className="text-xs text-error mt-1">El monto debe alcanzar el mínimo de esta recompensa.</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contribution-currency" className="block text-sm font-medium mb-1.5">Moneda</label>
                  <input
                    id="contribution-currency"
                    value={`${currency} · Simulación`}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 outline-none"
                  />
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500">Modo demostración</p>
                  <p className="text-xs text-gray-400 mt-1">No se solicitarán ni procesarán datos de pago.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-primary-light rounded-xl px-4 py-3 text-xs text-gray-600">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Pago seguro. Nunca enviamos ni almacenamos datos completos de tarjeta.
              </div>
              <button disabled={!canSubmit} className="w-full bg-primary text-white rounded-xl py-3 font-semibold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">Simular aporte{frequency === 'monthly' ? ' mensual' : ''}</button>
            </div>
          </form>
        )}
        {status === 'loading' && <div className="py-20 text-center"><div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" /><h2 className="font-display font-700 text-xl">Procesando tu aporte...</h2><p className="text-sm text-gray-500 mt-2">Esperando la confirmación del servidor.</p></div>}
        {status === 'success' && contribution && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center fade-in">
            <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
            <h2 className="font-display font-800 text-2xl">¡Gracias por tu aporte!</h2>
            <p className="text-sm text-gray-500 mt-2">Tu apoyo de <strong className="text-primary">{contribution.currency} {contribution.amount.toLocaleString()}</strong> quedó en estado Retenido.</p>
            {contribution.frequency === 'monthly' && <p className="text-xs text-gray-500 mt-3">La suscripción mensual simulada ya aparece en tu panel.</p>}
            <p className="text-xs text-gray-400 mt-3">Referencia: {contribution.id}</p>
            <button onClick={() => navigate(contribution.frequency === 'monthly' ? 'subscriptions' : 'campaign-page', contribution.frequency === 'monthly' ? null : campaign.id)} className="w-full bg-primary text-white rounded-xl py-3 font-semibold mt-6">{contribution.frequency === 'monthly' ? 'Ver mis suscripciones' : 'Volver a la campaña'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
