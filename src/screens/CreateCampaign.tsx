import { useState } from 'react'
import type { Campaign, CampaignMediaType, Draft, DraftPayload, FundingModel, Screen, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'
import {
  formatGoalInput,
  isValidIsoDate,
  localDateInputValue,
  numericGoalValue,
} from '../utils/campaignForm'

interface Props {
  navigate: (screen: Screen, id?: string | null) => void
  initialDraft: Draft | null
  onSaveDraft: (draft: Draft) => void
  onPublish: (campaign: Campaign, draftId: string) => void
  user: User
}

interface FormReward {
  id: string
  title: string
  description: string
  minimumAmount: string
  estimatedDeliveryDate: string
  quantity: string
  unlimited: boolean
}

interface RewardErrors {
  title?: string
  description?: string
  minimumAmount?: string
  estimatedDeliveryDate?: string
  quantity?: string
}

interface Errors {
  title?: string
  description?: string
  goal?: string
  duration?: string
  category?: string
  currency?: string
  fundingModel?: string
  rewards: Record<string, RewardErrors>
}

const categories = ['Tecnología', 'Medio ambiente', 'Arte', 'Salud', 'Educación', 'Comunidad', 'Ciencia', 'Emprendimiento']
const currencies = [
  { code: 'USD', flag: '🇺🇸', label: 'Dólar estadounidense' },
  { code: 'EUR', flag: '🇪🇺', label: 'Euro' },
  { code: 'COP', flag: '🇨🇴', label: 'Peso colombiano' },
  { code: 'MXN', flag: '🇲🇽', label: 'Peso mexicano' },
  { code: 'ARS', flag: '🇦🇷', label: 'Peso argentino' },
  { code: 'CLP', flag: '🇨🇱', label: 'Peso chileno' },
  { code: 'PEN', flag: '🇵🇪', label: 'Sol peruano' },
] as const
const validMoney = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0
const rewardDescriptionLimit = 1000

export default function CreateCampaign({ navigate, initialDraft, onSaveDraft, onPublish, user }: Props) {
  const [currentDraft, setCurrentDraft] = useState(initialDraft)
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [description, setDescription] = useState(initialDraft?.description ?? '')
  const [goal, setGoal] = useState(initialDraft?.goalAmount == null ? '' : formatGoalInput(String(initialDraft.goalAmount)))
  const [duration, setDuration] = useState(initialDraft?.durationDays?.toString() ?? '')
  const [category, setCategory] = useState(initialDraft?.category ?? '')
  const [currency, setCurrency] = useState(initialDraft?.currency ?? 'USD')
  const [mediaUrl, setMediaUrl] = useState(initialDraft?.mediaUrl ?? '')
  const [mediaType, setMediaType] = useState<CampaignMediaType>(initialDraft?.mediaType ?? 'IMAGE')
  const [fundingModel, setFundingModel] = useState<FundingModel>(initialDraft?.fundingModel ?? 'FIXED')
  const [rewards, setRewards] = useState<FormReward[]>(
    initialDraft?.rewards.map(reward => ({
      id: reward.id,
      title: reward.title,
      description: reward.description,
      minimumAmount: String(reward.minimumAmount),
      estimatedDeliveryDate: reward.estimatedDeliveryDate?.slice(0, 10) ?? '',
      quantity: reward.quantity == null ? '' : String(reward.quantity),
      unlimited: reward.quantity == null,
    })) ?? [],
  )
  const [errors, setErrors] = useState<Errors>({ rewards: {} })
  const [requestError, setRequestError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<'save' | 'publish' | null>(null)
  const [retryAction, setRetryAction] = useState<'save' | 'publish' | null>(null)
  const fundingModelEditable = currentDraft?.fundingModelEditable !== false
  const today = localDateInputValue()
  const canSubmit = user.role === 'creator'
  const hasFieldErrors = Boolean(
    errors.title ||
    errors.description ||
    errors.goal ||
    errors.duration ||
    errors.category ||
    errors.currency ||
    errors.fundingModel ||
    Object.keys(errors.rewards).length,
  )
  const fundingModelFrame = pending
    ? 'S3_HU212_SaveLoading'
    : errors.fundingModel
      ? 'S3_HU212_SaveError'
      : fundingModel === 'FLEXIBLE'
        ? 'S3_HU212_Create_FlexibleSelected'
        : 'S3_HU212_Create_FixedSelected'

  function validate(forPublish: boolean) {
    const next: Errors = { rewards: {} }
    if (forPublish && !title.trim()) next.title = 'El título es obligatorio para publicar.'
    if (forPublish && !description.trim()) next.description = 'La descripción es obligatoria para publicar.'
    if (!goal) next.goal = 'Este campo es obligatorio.'
    else if (!validMoney(numericGoalValue(goal))) next.goal = 'Ingresa una meta positiva con máximo dos decimales.'
    if (!duration) next.duration = 'Este campo es obligatorio.'
    else if (!/^\d+$/.test(duration) || Number(duration) <= 0) next.duration = 'Ingresa una duración positiva en días.'
    if (!category) next.category = 'Este campo es obligatorio.'
    if (!currencies.some(item => item.code === currency)) next.currency = 'Selecciona una moneda válida.'
    if (fundingModel !== 'FIXED' && fundingModel !== 'FLEXIBLE') next.fundingModel = 'Selecciona un modelo de recaudación válido.'
    rewards.forEach(reward => {
      const rewardErrors: RewardErrors = {}
      if (!reward.title.trim()) rewardErrors.title = 'El título es obligatorio'
      else if (reward.title.trim().length > 120) rewardErrors.title = 'El título no puede superar 120 caracteres'
      if (!reward.description.trim()) rewardErrors.description = 'La descripción es obligatoria'
      else if (reward.description.trim().length > rewardDescriptionLimit) rewardErrors.description = `La descripción no puede superar ${rewardDescriptionLimit} caracteres`
      if (!validMoney(reward.minimumAmount)) rewardErrors.minimumAmount = 'El monto debe ser mayor a 0'
      if (!isValidIsoDate(reward.estimatedDeliveryDate)) rewardErrors.estimatedDeliveryDate = 'Ingresa una fecha válida'
      else if (reward.estimatedDeliveryDate < today) rewardErrors.estimatedDeliveryDate = 'La entrega no puede ser anterior a hoy'
      if (!reward.unlimited && (!/^\d+$/.test(reward.quantity) || Number(reward.quantity) <= 0)) {
        rewardErrors.quantity = 'Los cupos deben ser un entero positivo'
      }
      if (Object.keys(rewardErrors).length) next.rewards[reward.id] = rewardErrors
    })
    setErrors(next)
    return !next.title && !next.description && !next.goal && !next.duration && !next.category && !next.currency && !next.fundingModel && Object.keys(next.rewards).length === 0
  }

  function payload(): DraftPayload {
    return {
      title: title.trim(),
      description: description.trim(),
      goalAmount: goal ? Number(numericGoalValue(goal)) : null,
      durationDays: duration ? Number(duration) : null,
      category,
      currency,
      mediaUrl: mediaUrl.trim() || null,
      mediaType,
      fundingModel,
      rewards: rewards.map(reward => ({
        title: reward.title.trim(),
        description: reward.description.trim(),
        minimumAmount: Number(reward.minimumAmount),
        estimatedDeliveryDate: reward.estimatedDeliveryDate,
        quantity: reward.unlimited ? null : Number(reward.quantity),
      })),
    }
  }

  async function saveDraft() {
    if (!canSubmit || !validate(false) || pending) return null
    setPending('save')
    setRequestError('')
    setMessage('')
    setRetryAction(null)
    try {
      const saved = currentDraft
        ? await api.updateDraft(currentDraft.id, payload())
        : await api.createDraft(payload())
      setCurrentDraft(saved)
      if (saved.fundingModel === 'FIXED' || saved.fundingModel === 'FLEXIBLE') {
        setFundingModel(saved.fundingModel)
      }
      onSaveDraft(saved)
      setMessage(rewards.length ? 'Recompensa guardada correctamente' : 'Borrador guardado correctamente.')
      return saved
    } catch (error) {
      handleRequestError(error, 'No pudimos guardar el borrador.', 'save')
      return null
    } finally {
      setPending(null)
    }
  }

  async function publish() {
    if (!canSubmit || !validate(true) || pending) return
    setPending('publish')
    setRequestError('')
    setMessage('')
    setRetryAction(null)
    try {
      const draft = currentDraft
        ? await api.updateDraft(currentDraft.id, payload())
        : await api.createDraft(payload())
      setCurrentDraft(draft)
      onSaveDraft(draft)
      const campaign = await api.publishDraft(draft.id)
      onPublish(campaign, draft.id)
      navigate('creator-dashboard')
    } catch (error) {
      handleRequestError(error, 'No pudimos publicar la campaña.', 'publish')
    } finally {
      setPending(null)
    }
  }

  function updateReward(id: string, field: keyof Omit<FormReward, 'id' | 'unlimited'>, value: string) {
    setRewards(current => current.map(reward => reward.id === id ? { ...reward, [field]: value } : reward))
    setErrors(current => {
      const rewardErrors = { ...current.rewards[id] }
      delete rewardErrors[field]
      return { ...current, rewards: { ...current.rewards, [id]: rewardErrors } }
    })
  }

  function handleRequestError(error: unknown, fallback: string, operation: 'save' | 'publish') {
    if (error instanceof ApiError) {
      if (
        error.code === 'FUNDING_MODEL_INVALID' ||
        (error.status === 400 && error.code === 'VALIDATION_ERROR')
      ) {
        setErrors(current => ({
          ...current,
          fundingModel: error.message || 'Selecciona Fijo o Flexible.',
        }))
        return
      }
      if (error.status === 401) {
        setRequestError('Tu sesión expiró. Inicia sesión nuevamente.')
        navigate('login')
        return
      }
      if (error.status === 403) {
        setRequestError('Solo el creador propietario puede modificar este modelo.')
        return
      }
      if (error.status === 404) {
        setRequestError('No encontramos el borrador o la campaña solicitada.')
        return
      }
      if (error.status === 409) {
        setRequestError('El modelo no puede cambiar porque la campaña ya recibió aportes o finalizó.')
        return
      }
      if (error.status === 0 || error.code === 'NETWORK_ERROR') {
        setRequestError(apiErrorMessage(error, fallback))
        setRetryAction(operation)
        return
      }
    }
    setRequestError(apiErrorMessage(error, fallback))
  }

  const input = (error?: string) => `w-full bg-surface px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${error ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`

  return (
    <div className="min-h-screen bg-bg" data-screen-frame="S3_HU212_Create_Default">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 bg-surface/95 backdrop-blur border-b border-gray-100 px-4 sm:px-6 py-3 mb-8 flex items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0">
            <button onClick={() => navigate('creator-dashboard')} className="text-xs text-gray-500 hover:text-primary">← Volver al panel</button>
            <h1 className="font-display font-700 text-gray-900 truncate">{title || 'Nueva campaña'} <span className="text-xs text-gray-400">· Borrador</span></h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <button disabled={Boolean(pending) || !canSubmit} onClick={() => void saveDraft()} className="border border-gray-200 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold disabled:opacity-50">{pending === 'save' ? 'Guardando...' : 'Guardar borrador'}</button>
            <button disabled={Boolean(pending) || !canSubmit} onClick={() => void publish()} className="bg-primary text-white rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold disabled:bg-gray-300">{pending === 'publish' ? 'Publicando...' : 'Publicar'}</button>
          </div>
        </div>

        {(requestError || hasFieldErrors) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700" role="alert">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>{requestError || 'Revisa los campos marcados antes de continuar.'}</span>
              {retryAction && (
                <button
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() => void (retryAction === 'save' ? saveDraft() : publish())}
                  className="self-start shrink-0 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                >
                  Reintentar
                </button>
              )}
            </div>
          </div>
        )}
        {message && <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800" role="status" aria-live="polite">{message}</div>}

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-display font-700 text-lg">1. Información básica</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
              <input value={title} onChange={event => setTitle(event.target.value)} className={input(errors.title)} placeholder="Nombre de tu campaña" />
              {errors.title && <p className="text-xs text-error mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción <span className="text-gray-400">{description.length}/2000</span></label>
              <textarea value={description} maxLength={2000} onChange={event => setDescription(event.target.value)} rows={6} className={`${input(errors.description)} resize-none`} placeholder="Describe tu proyecto y su impacto..." />
              {errors.description && <p className="text-xs text-error mt-1">{errors.description}</p>}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-display font-700 text-lg mb-5">2. Financiamiento</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Meta *</label><input inputMode="decimal" value={goal} onChange={event => { setGoal(formatGoalInput(event.target.value)); setErrors(current => ({ ...current, goal: undefined })) }} className={input(errors.goal)} placeholder="30,000" aria-label={`Meta en ${currency}`} />{errors.goal && <p className="text-xs text-error mt-1">{errors.goal}</p>}</div>
              <div><label className="block text-sm font-medium mb-1.5">Duración (días) *</label><input inputMode="numeric" value={duration} onChange={event => setDuration(event.target.value)} className={input(errors.duration)} placeholder="30" />{errors.duration && <p className="text-xs text-error mt-1">{errors.duration}</p>}</div>
              <div><label className="block text-sm font-medium mb-1.5">Categoría *</label><select value={category} onChange={event => setCategory(event.target.value)} className={input(errors.category)}><option value="">Seleccionar...</option>{categories.map(item => <option key={item}>{item}</option>)}</select>{errors.category && <p className="text-xs text-error mt-1">{errors.category}</p>}</div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Moneda *</label>
                <select value={currency} onChange={event => { setCurrency(event.target.value); setErrors(current => ({ ...current, currency: undefined })) }} className={input(errors.currency)}>
                  {currencies.map(item => <option key={item.code} value={item.code}>{item.flag} {item.code} — {item.label}</option>)}
                </select>
                {errors.currency && <p className="text-xs text-error mt-1">{errors.currency}</p>}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-frame={fundingModelFrame}>
            <fieldset disabled={Boolean(pending) || !fundingModelEditable}>
              <div className="mb-5">
              <legend className="font-display font-700 text-lg">3. Modelo de recaudación</legend>
              <p className="text-sm text-gray-500 mt-1">Define qué ocurrirá con los aportes si la campaña no alcanza su meta.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                {
                  value: 'FIXED' as const,
                  title: 'Fijo',
                  description: 'Los aportes quedan retenidos hasta cerrar la campaña. Si no alcanzas la meta, se reembolsan.',
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l7 4v5c0 4.5-2.9 7.5-7 9-4.1-1.5-7-4.5-7-9V7l7-4zm-3 9l2 2 4-4" />,
                },
                {
                  value: 'FLEXIBLE' as const,
                  title: 'Flexible',
                  description: 'Conservas los fondos recaudados al finalizar, siempre que exista al menos un aporte.',
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 17l5-5 4 4 7-8m0 0h-5m5 0v5" />,
                },
              ]).map(option => {
                const selected = fundingModel === option.value
                const descriptionId = `funding-model-${option.value.toLowerCase()}-description`
                return (
                  <label key={option.value} className={`card-selectable relative text-left rounded-2xl border-2 p-5 focus-within:ring-2 focus-within:ring-primary/30 ${selected ? 'border-primary bg-primary-light/50 shadow-sm' : 'border-gray-200 bg-white hover:border-primary/40'} ${pending || !fundingModelEditable ? 'cursor-not-allowed opacity-70' : ''}`}>
                    <input
                      type="radio"
                      name="fundingModel"
                      value={option.value}
                      checked={selected}
                      onChange={() => {
                        setFundingModel(option.value)
                        setErrors(current => ({ ...current, fundingModel: undefined }))
                      }}
                      aria-describedby={descriptionId}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-4">
                      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">{option.icon}</svg>
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-primary' : 'border-gray-300'}`}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                    </div>
                    <h3 className="font-display font-700 text-gray-900 mt-4">{option.title}</h3>
                    <p id={descriptionId} className="text-sm text-gray-500 leading-relaxed mt-1">{option.description}</p>
                  </label>
                )
              })}
            </div>
            <p className="sr-only" aria-live="polite">Modelo seleccionado: {fundingModel === 'FIXED' ? 'Fijo' : 'Flexible'}</p>
            {errors.fundingModel && <p className="text-xs text-error mt-3" role="alert">{errors.fundingModel}</p>}
            {!fundingModelEditable && (
              <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                {initialDraft?.fundingModelLockedReason || 'El modelo no puede cambiar porque la campaña ya recibió aportes o finalizó.'}
              </div>
            )}
            </fieldset>
          </section>

          <section
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            data-frame={pending
              ? 'S3_HU213_Reward_Loading'
              : Object.keys(errors.rewards).length
                ? 'S3_HU213_Reward_Validation'
                : message === 'Recompensa guardada correctamente'
                  ? 'S3_HU213_Reward_Saved'
                  : 'S3_HU213_Reward_Default'}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display font-700 text-lg">4. Recompensas</h2>
                <p className="text-sm text-gray-500 mt-1">Crea niveles claros con entrega y disponibilidad definidas.</p>
              </div>
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => setRewards(current => [...current, {
                  id: crypto.randomUUID(),
                  title: '',
                  description: '',
                  minimumAmount: '',
                  estimatedDeliveryDate: '',
                  quantity: '',
                  unlimited: false,
                }])}
                className="shrink-0 border border-primary text-primary rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary-light disabled:border-gray-200 disabled:text-gray-300"
              >
                + Agregar recompensa
              </button>
            </div>
            <div className="space-y-4">
              {rewards.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">Aún no agregaste recompensas. Los patrocinadores podrán hacer aportes libres.</div>}
              {rewards.map((reward, index) => {
                const rewardErrors = errors.rewards[reward.id] ?? {}
                const field = (name: keyof RewardErrors) => {
                  const error = rewardErrors[name]
                  return {
                    error,
                    errorId: `${reward.id}-${name}-error`,
                    describedBy: error ? `${reward.id}-${name}-error` : undefined,
                  }
                }
                const titleField = field('title')
                const descriptionField = field('description')
                const amountField = field('minimumAmount')
                const dateField = field('estimatedDeliveryDate')
                const quantityField = field('quantity')
                return (
                  <fieldset key={reward.id} disabled={Boolean(pending)} className="bg-gray-50 border border-gray-200 rounded-xl p-4 disabled:opacity-70">
                    <legend className="sr-only">Recompensa {index + 1}</legend>
                    <div className="flex justify-between mb-4">
                      <span className="text-xs font-semibold text-gray-500">RECOMPENSA {index + 1}</span>
                      <button type="button" disabled={Boolean(pending)} onClick={() => setRewards(current => current.filter(item => item.id !== reward.id))} className="text-xs font-semibold text-error disabled:text-gray-300">Eliminar</button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`${reward.id}-title`} className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
                        <input id={`${reward.id}-title`} maxLength={120} value={reward.title} onChange={event => updateReward(reward.id, 'title', event.target.value)} aria-invalid={Boolean(titleField.error)} aria-describedby={titleField.describedBy} className={input(titleField.error)} placeholder="Ej. Edición fundadores" />
                        {titleField.error && <p id={titleField.errorId} className="text-xs text-error mt-1">{titleField.error}</p>}
                      </div>
                      <div>
                        <label htmlFor={`${reward.id}-amount`} className="block text-xs font-medium text-gray-600 mb-1">Monto mínimo *</label>
                        <input id={`${reward.id}-amount`} inputMode="decimal" value={reward.minimumAmount} onChange={event => updateReward(reward.id, 'minimumAmount', event.target.value)} aria-invalid={Boolean(amountField.error)} aria-describedby={amountField.describedBy} className={input(amountField.error)} placeholder="25.00" />
                        {amountField.error && <p id={amountField.errorId} className="text-xs text-error mt-1">{amountField.error}</p>}
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex justify-between gap-3 mb-1"><label htmlFor={`${reward.id}-description`} className="block text-xs font-medium text-gray-600">Descripción *</label><span className="text-xs text-gray-400">{reward.description.length}/{rewardDescriptionLimit}</span></div>
                        <textarea id={`${reward.id}-description`} maxLength={rewardDescriptionLimit} value={reward.description} onChange={event => updateReward(reward.id, 'description', event.target.value)} rows={3} aria-invalid={Boolean(descriptionField.error)} aria-describedby={descriptionField.describedBy} className={`${input(descriptionField.error)} resize-none`} placeholder="Qué recibirá el patrocinador" />
                        {descriptionField.error && <p id={descriptionField.errorId} className="text-xs text-error mt-1">{descriptionField.error}</p>}
                      </div>
                      <div>
                        <label htmlFor={`${reward.id}-date`} className="block text-xs font-medium text-gray-600 mb-1">Entrega estimada *</label>
                        <input id={`${reward.id}-date`} type="date" min={today} value={reward.estimatedDeliveryDate} onChange={event => updateReward(reward.id, 'estimatedDeliveryDate', event.target.value)} aria-invalid={Boolean(dateField.error)} aria-describedby={dateField.describedBy} className={input(dateField.error)} />
                        {dateField.error && <p id={dateField.errorId} className="text-xs text-error mt-1">{dateField.error}</p>}
                      </div>
                      <div>
                        <label htmlFor={`${reward.id}-quantity`} className="block text-xs font-medium text-gray-600 mb-1">Cantidad total *</label>
                        <input id={`${reward.id}-quantity`} inputMode="numeric" disabled={reward.unlimited || Boolean(pending)} value={reward.quantity} onChange={event => updateReward(reward.id, 'quantity', event.target.value)} aria-invalid={Boolean(quantityField.error)} aria-describedby={quantityField.describedBy} className={`${input(quantityField.error)} disabled:bg-gray-100 disabled:text-gray-400`} placeholder="100" />
                        {quantityField.error && <p id={quantityField.errorId} className="text-xs text-error mt-1">{quantityField.error}</p>}
                        <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                          <input
                            type="checkbox"
                            checked={reward.unlimited}
                            onChange={event => {
                              const unlimited = event.target.checked
                              setRewards(current => current.map(item => item.id === reward.id ? { ...item, unlimited, quantity: unlimited ? '' : item.quantity } : item))
                              setErrors(current => {
                                const nextRewardErrors = { ...current.rewards[reward.id] }
                                delete nextRewardErrors.quantity
                                return { ...current, rewards: { ...current.rewards, [reward.id]: nextRewardErrors } }
                              })
                            }}
                            className="w-4 h-4 accent-primary"
                          />
                          Cantidad ilimitada
                        </label>
                      </div>
                    </div>
                  </fieldset>
                )
              })}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-display font-700 text-lg mb-5">5. Medios</h2>
            <div className="grid sm:grid-cols-[11rem_1fr] gap-4">
              <div>
                <label htmlFor="campaign-media-type" className="block text-sm font-medium mb-1.5">Tipo de medio</label>
                <select id="campaign-media-type" value={mediaType} onChange={event => setMediaType(event.target.value as CampaignMediaType)} className={input()}>
                  <option value="IMAGE">Imagen</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
              <div>
                <label htmlFor="campaign-media-url" className="block text-sm font-medium mb-1.5">URL opcional</label>
                <input id="campaign-media-url" type="url" value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} className={input()} placeholder={mediaType === 'IMAGE' ? 'https://.../imagen.jpg' : 'https://.../video.mp4'} />
              </div>
            </div>
            {mediaUrl && (
              <div className="mt-4 h-44 bg-gray-100 rounded-xl overflow-hidden">
                {mediaType === 'IMAGE'
                  ? <img src={mediaUrl} alt="Vista previa de la campaña" className="w-full h-full object-cover" onError={event => { event.currentTarget.style.display = 'none' }} />
                  : <video src={mediaUrl} controls preload="metadata" className="w-full h-full bg-gray-900" aria-label="Vista previa del video de campaña" />}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
