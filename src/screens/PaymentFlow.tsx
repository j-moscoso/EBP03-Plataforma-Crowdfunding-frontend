import { useEffect, useRef, useState } from 'react'
import type { Campaign, Contribution, Screen, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

interface Props {
  campaignId: string | null
  user: User | null
  navigate: (screen: Screen, id?: string | null) => void
}

type Status = 'form' | 'loading' | 'success' | 'failed'
const validAmount = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0

export default function PaymentFlow({ campaignId, user, navigate }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loadingCampaign, setLoadingCampaign] = useState(true)
  const [campaignError, setCampaignError] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [rewardId, setRewardId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('sim_success')
  const [status, setStatus] = useState<Status>('form')
  const [error, setError] = useState('')
  const [contribution, setContribution] = useState<Contribution | null>(null)
  const operationKey = useRef<string | null>(null)

  async function loadCampaign() {
    if (!campaignId) {
      setCampaignError('Falta el identificador de la campaña.')
      setLoadingCampaign(false)
      return null
    }
    try {
      const result = await api.campaign(campaignId)
      setCampaign(result)
      setCampaignError('')
      return result
    } catch (requestError) {
      setCampaignError(apiErrorMessage(requestError, 'No pudimos cargar la campaña.'))
      return null
    } finally {
      setLoadingCampaign(false)
    }
  }

  useEffect(() => { void loadCampaign() }, [campaignId])

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
  const selectedReward = campaign.rewards.find(reward => reward.id === rewardId)
  const amountOkay = validAmount(amount) && Number(amount) <= remaining
  const rewardOkay = !selectedReward || Number(amount) >= selectedReward.minimumAmount
  const canSubmit = campaign.status === 'ACTIVE' && campaign.progress.secondsRemaining > 0 && amountOkay && /^[A-Za-z]{3}$/.test(currency) && Boolean(paymentMethodId.trim()) && rewardOkay

  function paymentError(requestError: unknown) {
    if (requestError instanceof ApiError) {
      if (requestError.code === 'CONTRIBUTION_EXCEEDS_REMAINING_AMOUNT') return 'El aporte supera el monto restante de la campaña.'
      if (requestError.code === 'CAMPAIGN_NOT_ACTIVE') return 'La campaña ya no está activa.'
    }
    return apiErrorMessage(requestError, 'No pudimos procesar tu aporte.')
  }

  async function contribute(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || !campaignId) return
    setStatus('loading')
    setError('')
    operationKey.current ??= crypto.randomUUID()
    try {
      const result = await api.contribute(
        campaignId,
        {
          amount: Number(amount),
          currency: currency.toUpperCase(),
          rewardId: rewardId || undefined,
          paymentMethodId: paymentMethodId.trim(),
        },
        operationKey.current,
      )
      setContribution(result)
      if (result.status === 'CONFIRMED') setStatus('success')
      else {
        setError('El aporte no fue confirmado. Puedes reintentarlo.')
        setStatus('failed')
      }
    } catch (requestError) {
      setError(paymentError(requestError))
      setStatus('failed')
    }
  }

  async function retry() {
    if (!contribution) {
      operationKey.current = null
      setStatus('form')
      return
    }
    setStatus('loading')
    setError('')
    const freshCampaign = await loadCampaign()
    if (!freshCampaign) {
      setError('No pudimos verificar el monto restante.')
      setStatus('failed')
      return
    }
    const freshRemaining = Math.max(freshCampaign.progress.remainingAmount ?? freshCampaign.goalAmount - freshCampaign.progress.raisedAmount, 0)
    if (contribution.amount > freshRemaining) {
      setError('El aporte supera el monto restante actualizado de la campaña.')
      setStatus('failed')
      return
    }
    const retryKey = crypto.randomUUID()
    operationKey.current = retryKey
    try {
      const result = await api.retryContribution(contribution.id, paymentMethodId.trim(), retryKey)
      setContribution(result)
      if (result.status === 'CONFIRMED') setStatus('success')
      else {
        setError('El aporte todavía no pudo confirmarse.')
        setStatus('failed')
      }
    } catch (requestError) {
      setError(paymentError(requestError))
      setStatus('failed')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        <button onClick={() => navigate('campaign-page', campaign.id)} className="text-sm text-gray-500 hover:text-primary mb-6">← Volver a la campaña</button>
        {status === 'form' && (
          <form onSubmit={contribute} className="fade-in">
            <h1 className="font-display font-800 text-3xl text-gray-900">Realiza tu aporte</h1>
            <p className="text-sm text-gray-500 mt-2 mb-6">Apoyando a <strong>{campaign.title}</strong>. Restante: ${remaining.toLocaleString()}.</p>
            {campaignError && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{campaignError}</div>}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Monto</label>
                <input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="50.00" />
                {amount && !amountOkay && <p className="text-xs text-error mt-1">Ingresa un monto positivo, con máximo dos decimales y no mayor a ${remaining.toLocaleString()}.</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1.5">Moneda</label><input value={currency} maxLength={3} onChange={event => setCurrency(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 uppercase outline-none focus:border-primary" /></div>
                <div><label className="block text-sm font-medium mb-1.5">Método de pago (desarrollo)</label><input value={paymentMethodId} onChange={event => setPaymentMethodId(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Recompensa opcional</label>
                <select value={rewardId} onChange={event => { const id = event.target.value; setRewardId(id); const reward = campaign.rewards.find(item => item.id === id); if (reward) setAmount(String(reward.minimumAmount)) }} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-primary">
                  <option value="">Sin recompensa</option>
                  {campaign.rewards.map(reward => <option key={reward.id} value={reward.id}>{reward.title} · ${reward.minimumAmount}+</option>)}
                </select>
                {!rewardOkay && <p className="text-xs text-error mt-1">El monto debe alcanzar el mínimo de la recompensa.</p>}
              </div>
              <div className="flex items-center gap-2 bg-primary-light rounded-xl px-4 py-3 text-xs text-gray-600">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Pago seguro. Nunca enviamos ni almacenamos datos completos de tarjeta.
              </div>
              <button disabled={!canSubmit} className="w-full bg-primary text-white rounded-xl py-3 font-semibold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">Confirmar aporte</button>
            </div>
          </form>
        )}
        {status === 'loading' && <div className="py-20 text-center"><div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" /><h2 className="font-display font-700 text-xl">Procesando tu aporte...</h2><p className="text-sm text-gray-500 mt-2">Esperando la confirmación del servidor.</p></div>}
        {status === 'success' && contribution && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center fade-in">
            <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
            <h2 className="font-display font-800 text-2xl">¡Gracias por tu aporte!</h2>
            <p className="text-sm text-gray-500 mt-2">Tu apoyo de <strong className="text-primary">{contribution.currency} {contribution.amount.toLocaleString()}</strong> fue confirmado.</p>
            <p className="text-xs text-gray-400 mt-3">Referencia: {contribution.id}</p>
            <button onClick={() => navigate('campaign-page', campaign.id)} className="w-full bg-primary text-white rounded-xl py-3 font-semibold mt-6">Volver a la campaña</button>
          </div>
        )}
        {status === 'failed' && (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center fade-in">
            <div className="w-16 h-16 rounded-full bg-red-50 text-error flex items-center justify-center text-3xl mx-auto mb-4">!</div>
            <h2 className="font-display font-800 text-2xl">No pudimos confirmar tu aporte</h2>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => navigate('campaign-page', campaign.id)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-semibold">Cancelar</button>
              <button onClick={() => void retry()} className="flex-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold">Reintentar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
