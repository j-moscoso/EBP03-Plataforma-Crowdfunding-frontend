import { useEffect, useRef, useState } from 'react'
import type { Campaign, CreatorSubscription, Screen, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'
import { formatGoalInput, numericGoalValue } from '../utils/campaignForm'

interface Props {
  campaignId: string | null
  initialRewardId: string | null
  user: User | null
  navigate: (screen: Screen, id?: string | null) => void
}

type Status = 'form' | 'loading' | 'success'
type SupportMode = 'one-time' | 'monthly'
const validAmount = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0

export default function PaymentFlow({ campaignId, initialRewardId, user, navigate }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loadingCampaign, setLoadingCampaign] = useState(true)
  const [campaignError, setCampaignError] = useState('')
  const [amount, setAmount] = useState('')
  const [supportMode, setSupportMode] = useState<SupportMode>('one-time')
  const [rewardId, setRewardId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('sim_success')
  const [status, setStatus] = useState<Status>('form')
  const [contributionId, setContributionId] = useState<string | null>(null)
  const [contributionStatus, setContributionStatus] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<CreatorSubscription | null>(null)
  const idempotencyKey = useRef('')

  async function loadCampaign(applyInitialReward = false) {
    if (!campaignId) {
      setCampaignError('Falta el identificador de la campaña.')
      setLoadingCampaign(false)
      return null
    }
    setLoadingCampaign(true)
    try {
      const result = await api.campaign(campaignId)
      setCampaign(result)
      setCampaignError('')
      if (applyInitialReward && initialRewardId) {
        const reward = result.rewards.find(item => item.id === initialRewardId)
        if (reward?.available) {
          setRewardId(reward.id)
          setAmount(formatGoalInput(String(reward.minimumAmount)))
        } else {
          setCampaignError('La recompensa seleccionada ya no está disponible.')
        }
      }
      return result
    } catch (error) {
      setCampaignError(apiErrorMessage(error, 'No pudimos cargar la campaña.'))
      return null
    } finally {
      setLoadingCampaign(false)
    }
  }

  useEffect(() => {
    void loadCampaign(true)
  }, [campaignId, initialRewardId])

  if (!user || user.role !== 'sponsor') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-md">
          <h1 className="font-display font-800 text-2xl text-gray-900">Inicia sesión como patrocinador</h1>
          <p className="text-sm text-gray-500 mt-2 mb-6">Necesitas una cuenta de patrocinador para realizar un aporte.</p>
          <button type="button" onClick={() => navigate('login')} className="bg-primary text-white rounded-xl px-6 py-3 text-sm font-semibold">Iniciar sesión</button>
        </div>
      </div>
    )
  }

  if (loadingCampaign) return <div className="min-h-screen bg-bg flex items-center justify-center text-sm font-semibold text-gray-600">Cargando campaña...</div>
  if (!campaign) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl text-center">
        <p className="text-error text-sm mb-4">{campaignError}</p>
        <button type="button" onClick={() => navigate('projects')} className="text-primary font-semibold">Volver a explorar</button>
      </div>
    </div>
  )

  const remaining = Math.max(campaign.progress.remainingAmount ?? campaign.goalAmount - campaign.progress.raisedAmount, 0)
  const sortedRewards = [...campaign.rewards].sort((a, b) => a.minimumAmount - b.minimumAmount)
  const selectedReward = campaign.rewards.find(reward => reward.id === rewardId)
  const amountValue = Number(numericGoalValue(amount))
  const amountOkay = validAmount(numericGoalValue(amount)) &&
    (supportMode === 'monthly' || amountValue <= remaining)
  const rewardOkay = !selectedReward || amountValue >= selectedReward.minimumAmount
  const rewardAvailable = !selectedReward || (selectedReward.available &&
    (selectedReward.quantity === null || selectedReward.claimedQuantity < selectedReward.quantity))
  const canSubmit = campaign.status === 'ACTIVE' &&
    campaign.progress.secondsRemaining > 0 &&
    amountOkay &&
    rewardOkay &&
    rewardAvailable &&
    paymentMethodId.trim().length > 0

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || status === 'loading' || !campaignId) return
    setStatus('loading')
    setCampaignError('')

    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
    try {
      const refreshed = await api.campaign(campaignId)
      setCampaign(refreshed)
      if (refreshed.status !== 'ACTIVE' || refreshed.progress.secondsRemaining <= 0) {
        setStatus('form')
        setCampaignError('La campaña ya no acepta aportes.')
        return
      }
      const refreshedReward = rewardId
        ? refreshed.rewards.find(reward => reward.id === rewardId)
        : null
      if (rewardId && (!refreshedReward?.available ||
        (refreshedReward.quantity !== null &&
          refreshedReward.claimedQuantity >= refreshedReward.quantity))) {
        setRewardId('')
        setStatus('form')
        setCampaignError('La recompensa seleccionada se agotó. Elige otra opción.')
        return
      }

      if (supportMode === 'monthly') {
        const createdSubscription = await api.createSubscription({
          creatorId: refreshed.creator.id,
          amount: Number(numericGoalValue(amount)),
          currency: refreshed.currency ?? 'USD',
          paymentMethodId: paymentMethodId.trim(),
        })
        setSubscription(createdSubscription)
        setStatus('success')
        return
      }

      const result = await api.contribute(campaignId, {
        amount: Number(numericGoalValue(amount)),
        currency: refreshed.currency ?? 'USD',
        ...(rewardId ? { rewardId } : {}),
        paymentMethodId: paymentMethodId.trim(),
      }, idempotencyKey.current)

      setContributionId(result.id)
      setContributionStatus(result.status)
      setStatus('success')
      await loadCampaign(false)
    } catch (error) {
      setStatus('form')
      if (error instanceof ApiError) {
        if (error.code === 'REWARD_SOLD_OUT') {
          setRewardId('')
          await loadCampaign(false)
          setCampaignError('La recompensa seleccionada se agotó.')
          return
        }
        if (error.code === 'CONTRIBUTION_EXCEEDS_REMAINING_AMOUNT') {
          setCampaignError('El monto supera el restante disponible. Ajusta el aporte.')
          return
        }
        if (error.code === 'CAMPAIGN_NOT_ACTIVE') {
          setCampaignError('La campaña ya no acepta aportes.')
          return
        }
      }
      setCampaignError(apiErrorMessage(error, 'No pudimos procesar el aporte.'))
    }
  }

  async function retryPayment() {
    if (!contributionId || status === 'loading') return
    setStatus('loading')
    setCampaignError('')
    try {
      const result = await api.retryContribution(
        contributionId,
        paymentMethodId.trim(),
        idempotencyKey.current,
      )
      setContributionStatus(result.status)
      setStatus('success')
      await loadCampaign(false)
    } catch (error) {
      setStatus('form')
      setCampaignError(apiErrorMessage(error, 'No pudimos reintentar el aporte.'))
    }
  }

  const currency = campaign.currency ?? 'USD'
  return (
    <div className="min-h-screen bg-bg flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        <button type="button" onClick={() => navigate('campaign-page', campaign.id)} className="text-sm text-gray-500 hover:text-primary mb-6">← Volver a la campaña</button>
        {status === 'form' && (
          <form onSubmit={submit} className="fade-in">
            <h1 className="font-display font-800 text-3xl text-gray-900">Realiza tu aporte</h1>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              {supportMode === 'monthly'
                ? <>Suscripción mensual para apoyar a <strong>{campaign.creator.name}</strong>.</>
                : <>Apoyando a <strong>{campaign.title}</strong>. Restante: {currency} {remaining.toLocaleString('es-ES')}.</>}
            </p>
            {campaignError && <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{campaignError}</div>}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <fieldset>
                <legend className="block text-sm font-medium mb-2">Elige cómo aportar</legend>
                <div className="space-y-2">
                  <button type="button" role="radio" aria-checked={supportMode === 'one-time'} onClick={() => { setSupportMode('one-time'); setRewardId(''); setCampaignError('') }} className={`w-full text-left rounded-xl border-2 p-4 ${supportMode === 'one-time' ? 'border-primary bg-primary-light/50' : 'border-gray-200'}`}>
                    <span className="font-display font-700 text-sm text-gray-900">Aporte único a esta campaña</span>
                    <span className="block text-xs text-gray-500 mt-1">Tú decides el monto y puedes elegir una recompensa.</span>
                  </button>
                  <button type="button" role="radio" aria-checked={supportMode === 'monthly'} onClick={() => { setSupportMode('monthly'); setRewardId(''); setCampaignError('') }} className={`w-full text-left rounded-xl border-2 p-4 ${supportMode === 'monthly' ? 'border-primary bg-primary-light/50' : 'border-gray-200'}`}>
                    <span className="font-display font-700 text-sm text-gray-900">Suscripción mensual a {campaign.creator.name}</span>
                    <span className="block text-xs text-gray-500 mt-1">El primer cobro es ahora y los siguientes se realizan cada mes. Apoya al creador en general; no incluye recompensas de esta campaña.</span>
                  </button>
                  {supportMode === 'monthly' ? (
                    <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">Administra o cancela tus cobros futuros desde «Mis suscripciones».</p>
                  ) : (
                    <>
                      <button type="button" role="radio" aria-checked={!rewardId} onClick={() => setRewardId('')} className={`w-full text-left rounded-xl border-2 p-4 ${!rewardId ? 'border-primary bg-primary-light/50' : 'border-gray-200'}`}>
                        <span className="font-display font-700 text-sm text-gray-900">Aporte libre</span>
                        <span className="block text-xs text-gray-500 mt-1">Tú decides el monto.</span>
                      </button>
                      {sortedRewards.map(reward => {
                        const exhausted = !reward.available || (reward.quantity !== null && reward.claimedQuantity >= reward.quantity)
                        const selected = reward.id === rewardId
                        return (
                          <button key={reward.id} type="button" role="radio" aria-checked={selected} disabled={exhausted} onClick={() => { setRewardId(reward.id); setAmount(formatGoalInput(String(reward.minimumAmount))); setCampaignError('') }} className={`w-full text-left rounded-xl border-2 p-4 disabled:bg-gray-50 disabled:text-gray-400 ${selected ? 'border-primary bg-primary-light/50' : 'border-gray-200'}`}>
                            <span className="flex items-center justify-between gap-4">
                              <span className="font-display font-700 text-sm">{reward.title}</span>
                              <span className="font-display font-800 text-primary">{reward.minimumAmount.toLocaleString('es-ES')}+</span>
                            </span>
                            <span className="block text-xs text-gray-500 mt-1">{exhausted ? 'Agotado' : reward.description}</span>
                            {reward.estimatedDeliveryDate && <span className="block text-xs text-gray-400 mt-1">Entrega estimada: {reward.estimatedDeliveryDate.slice(0, 10)}</span>}
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              </fieldset>

              <div>
                <label htmlFor="contribution-amount" className="block text-sm font-medium mb-1.5">{supportMode === 'monthly' ? 'Monto mensual' : 'Monto del aporte'}</label>
                <input id="contribution-amount" inputMode="decimal" value={amount} onChange={event => setAmount(formatGoalInput(event.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="50.00" />
                {amount && !amountOkay && <p className="text-xs text-error mt-1">{supportMode === 'monthly' ? 'Ingresa un monto mensual positivo con máximo dos decimales.' : 'Ingresa un monto positivo, con máximo dos decimales y no mayor al restante disponible.'}</p>}
                {!rewardOkay && <p className="text-xs text-error mt-1">El monto debe alcanzar el mínimo de esta recompensa.</p>}
              </div>

              <div>
                <label htmlFor="payment-method-id" className="block text-sm font-medium mb-1.5">Método de pago (simulación backend)</label>
                <select id="payment-method-id" value={paymentMethodId} onChange={event => setPaymentMethodId(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200">
                  <option value="sim_success">Pago exitoso</option>
                  <option value="sim_failure">Pago fallido</option>
                </select>
              </div>

              <button type="submit" disabled={!canSubmit} className="w-full bg-primary text-white rounded-xl py-3 font-semibold disabled:bg-gray-100 disabled:text-gray-400">{supportMode === 'monthly' ? 'Activar suscripción mensual' : 'Confirmar aporte'}</button>
            </div>
          </form>
        )}

        {status === 'loading' && (
          <div className="py-20 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
            <h2 className="font-display font-700 text-xl">Procesando tu aporte...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
            <h2 className="font-display font-800 text-2xl">{subscription ? 'Suscripción activada' : 'Aporte procesado'}</h2>
            {subscription ? (
              <>
                <p className="text-sm text-gray-500 mt-2">Tu suscripción mensual a <strong>{campaign.creator.name}</strong> está activa.</p>
                <p className="text-sm text-gray-500 mt-2">Próximo cobro: <strong>{subscription.nextChargeAt ? new Date(subscription.nextChargeAt).toLocaleDateString('es-ES', { dateStyle: 'long' }) : 'No programado'}</strong></p>
              </>
            ) : (
              <p className="text-sm text-gray-500 mt-2">Estado: <strong>{contributionStatus === 'HELD' ? 'Retenido' : contributionStatus === 'CONFIRMED' ? 'Confirmado' : contributionStatus}</strong></p>
            )}
            {contributionStatus === 'FAILED' && (
              <button type="button" onClick={() => void retryPayment()} className="mt-6 w-full bg-primary text-white rounded-xl py-3 font-semibold">Reintentar pago</button>
            )}
            {subscription && (
              <button type="button" onClick={() => navigate('subscriptions')} className="mt-6 w-full bg-primary text-white rounded-xl py-3 font-semibold">Ver mis suscripciones</button>
            )}
            {!subscription && contributionStatus !== 'FAILED' && (
              <button type="button" onClick={() => navigate('campaign-page', campaign.id)} className="mt-6 w-full bg-primary text-white rounded-xl py-3 font-semibold">Volver a la campaña</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
