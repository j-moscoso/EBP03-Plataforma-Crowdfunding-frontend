import { useState } from 'react'
import type { Campaign, CampaignMediaType, Draft, DraftPayload, Screen } from '../types'
import { api, apiErrorMessage } from '../services/api'
import CampaignMedia from '../components/CampaignMedia'

interface Props {
  navigate: (screen: Screen, id?: string | null) => void
  initialDraft: Draft | null
  onSaveDraft: (draft: Draft) => void
  onPublish: (campaign: Campaign, draftId: string) => void
}

interface FormReward {
  id: string
  title: string
  description: string
  minimumAmount: string
}

interface Errors {
  title?: string
  description?: string
  goal?: string
  duration?: string
  category?: string
  currency?: string
  rewards: Record<string, string>
}

const categories = ['Tecnología', 'Medio ambiente', 'Arte', 'Salud', 'Educación', 'Comunidad', 'Ciencia', 'Emprendimiento']
const validMoney = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0

export default function CreateCampaign({ navigate, initialDraft, onSaveDraft, onPublish }: Props) {
  const [currentDraft, setCurrentDraft] = useState(initialDraft)
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [description, setDescription] = useState(initialDraft?.description ?? '')
  const [goal, setGoal] = useState(initialDraft?.goalAmount?.toString() ?? '')
  const [duration, setDuration] = useState(initialDraft?.durationDays?.toString() ?? '')
  const [category, setCategory] = useState(initialDraft?.category ?? '')
  const [mediaUrl, setMediaUrl] = useState(initialDraft?.mediaUrl ?? '')
  const [mediaType, setMediaType] = useState<CampaignMediaType>(initialDraft?.mediaType ?? 'IMAGE')
  const [currency, setCurrency] = useState(initialDraft?.currency ?? '')
  const [rewards, setRewards] = useState<FormReward[]>(
    initialDraft?.rewards.map(reward => ({ ...reward, minimumAmount: String(reward.minimumAmount) })) ??
      [{ id: crypto.randomUUID(), title: '', description: '', minimumAmount: '' }],
  )
  const [errors, setErrors] = useState<Errors>({ rewards: {} })
  const [requestError, setRequestError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<'save' | 'publish' | null>(null)

  function validate(forPublish: boolean) {
    const next: Errors = { rewards: {} }
    if (forPublish && !title.trim()) next.title = 'El título es obligatorio para publicar.'
    if (forPublish && !description.trim()) next.description = 'La descripción es obligatoria para publicar.'
    if (!goal) next.goal = 'Este campo es obligatorio.'
    else if (!validMoney(goal)) next.goal = 'Ingresa una meta positiva con máximo dos decimales.'
    if (!duration) next.duration = 'Este campo es obligatorio.'
    else if (!/^\d+$/.test(duration) || Number(duration) <= 0) next.duration = 'Ingresa una duración positiva en días.'
    if (!category) next.category = 'Este campo es obligatorio.'
    if (forPublish && !/^[A-Za-z]{3}$/.test(currency.trim())) next.currency = 'Configura una moneda de tres letras para publicar.'
    rewards.forEach(reward => {
      const hasAny = Boolean(reward.title || reward.description || reward.minimumAmount)
      if (!hasAny) return
      if (!reward.title.trim()) next.rewards[reward.id] = 'Agrega un título.'
      else if (!reward.minimumAmount || !validMoney(reward.minimumAmount)) next.rewards[reward.id] = 'El monto debe ser positivo y tener máximo dos decimales.'
      else if (goal && validMoney(goal) && Number(reward.minimumAmount) > Number(goal)) next.rewards[reward.id] = 'El monto no puede superar la meta.'
    })
    setErrors(next)
    return !next.title && !next.description && !next.goal && !next.duration && !next.category && Object.keys(next.rewards).length === 0
  }

  function payload(): DraftPayload {
    return {
      title: title.trim(),
      description: description.trim(),
      goalAmount: goal ? Number(goal) : null,
      durationDays: duration ? Number(duration) : null,
      category,
      mediaUrl: mediaUrl.trim() || null,
      mediaType,
      currency: currency.trim() ? currency.trim().toUpperCase() : null,
      rewards: rewards
        .filter(reward => reward.title && reward.minimumAmount)
        .map(reward => ({
          title: reward.title.trim(),
          description: reward.description.trim(),
          minimumAmount: Number(reward.minimumAmount),
        })),
    }
  }

  async function saveDraft() {
    if (!validate(false) || pending) return null
    setPending('save')
    setRequestError('')
    setMessage('')
    try {
      const saved = currentDraft
        ? await api.updateDraft(currentDraft.id, payload())
        : await api.createDraft(payload())
      setCurrentDraft(saved)
      onSaveDraft(saved)
      setMessage('Borrador guardado correctamente.')
      return saved
    } catch (error) {
      setRequestError(apiErrorMessage(error, 'No pudimos guardar el borrador.'))
      return null
    } finally {
      setPending(null)
    }
  }

  async function publish() {
    if (!validate(true) || pending) return
    setPending('publish')
    setRequestError('')
    setMessage('')
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
      setRequestError(apiErrorMessage(error, 'No pudimos publicar la campaña.'))
    } finally {
      setPending(null)
    }
  }

  function updateReward(id: string, field: keyof Omit<FormReward, 'id'>, value: string) {
    setRewards(current => current.map(reward => reward.id === id ? { ...reward, [field]: value } : reward))
  }

  const input = (error?: string) => `w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${error ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 bg-white/95 backdrop-blur border-b border-gray-100 px-4 sm:px-6 py-3 mb-8 flex items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0">
            <button onClick={() => navigate('creator-dashboard')} className="text-xs text-gray-500 hover:text-primary">← Volver al panel</button>
            <h1 className="font-display font-700 text-gray-900 truncate">{title || 'Nueva campaña'} <span className="text-xs text-gray-400">· Borrador</span></h1>
          </div>
          <div className="flex gap-2">
            <button disabled={Boolean(pending)} onClick={() => void saveDraft()} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">{pending === 'save' ? 'Guardando...' : 'Guardar borrador'}</button>
            <button disabled={Boolean(pending)} onClick={() => void publish()} className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:bg-gray-300">{pending === 'publish' ? 'Publicando...' : 'Publicar'}</button>
          </div>
        </div>

        {(requestError || Object.keys(errors).length > 1) && <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{requestError || 'Revisa los campos marcados antes de continuar.'}</div>}
        {message && <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800">{message}</div>}

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-display font-700 text-lg">1. Información básica</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
              <input value={title} onChange={event => setTitle(event.target.value)} className={input(errors.title)} placeholder="Nombre de tu campaña" />
              {errors.title && <p className="text-xs text-error mt-1">{errors.title}</p>}
            </div>
            <div>
              <label htmlFor="campaign-currency" className="block text-sm font-medium text-gray-700 mb-1.5">Moneda de la campaña</label>
              <input id="campaign-currency" value={currency} maxLength={3} onChange={event => setCurrency(event.target.value.toUpperCase())} className={input(errors.currency)} placeholder="COP" />
              <p className="text-xs text-gray-400 mt-1">Se usará como moneda autoritativa de los aportes.</p>
              {errors.currency && <p className="text-xs text-error mt-1">{errors.currency}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción <span className="text-gray-400">{description.length}/2000</span></label>
              <textarea value={description} maxLength={2000} onChange={event => setDescription(event.target.value)} rows={6} className={`${input(errors.description)} resize-none`} placeholder="Describe tu proyecto y su impacto..." />
              {errors.description && <p className="text-xs text-error mt-1">{errors.description}</p>}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-display font-700 text-lg mb-5">2. Financiamiento</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Meta *</label><input inputMode="decimal" value={goal} onChange={event => setGoal(event.target.value)} className={input(errors.goal)} placeholder="30000" />{errors.goal && <p className="text-xs text-error mt-1">{errors.goal}</p>}</div>
              <div><label className="block text-sm font-medium mb-1.5">Duración (días) *</label><input inputMode="numeric" value={duration} onChange={event => setDuration(event.target.value)} className={input(errors.duration)} placeholder="30" />{errors.duration && <p className="text-xs text-error mt-1">{errors.duration}</p>}</div>
              <div><label className="block text-sm font-medium mb-1.5">Categoría *</label><select value={category} onChange={event => setCategory(event.target.value)} className={input(errors.category)}><option value="">Seleccionar...</option>{categories.map(item => <option key={item}>{item}</option>)}</select>{errors.category && <p className="text-xs text-error mt-1">{errors.category}</p>}</div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-display font-700 text-lg mb-5">3. Recompensas</h2>
            <div className="space-y-4">
              {rewards.map((reward, index) => (
                <div key={reward.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between mb-3"><span className="text-xs font-semibold text-gray-500">RECOMPENSA {index + 1}</span><button onClick={() => setRewards(current => current.filter(item => item.id !== reward.id))} className="text-xs text-error">Eliminar</button></div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input value={reward.title} onChange={event => updateReward(reward.id, 'title', event.target.value)} className={input(errors.rewards[reward.id])} placeholder="Título" />
                    <input value={reward.description} onChange={event => updateReward(reward.id, 'description', event.target.value)} className={input(errors.rewards[reward.id])} placeholder="Descripción" />
                    <input inputMode="decimal" value={reward.minimumAmount} onChange={event => updateReward(reward.id, 'minimumAmount', event.target.value)} className={input(errors.rewards[reward.id])} placeholder="Monto mínimo" />
                  </div>
                  {errors.rewards[reward.id] && <p className="text-xs text-error mt-2">{errors.rewards[reward.id]}</p>}
                </div>
              ))}
              <button onClick={() => setRewards(current => [...current, { id: crypto.randomUUID(), title: '', description: '', minimumAmount: '' }])} className="w-full border border-dashed border-primary text-primary rounded-xl py-3 text-sm font-semibold hover:bg-primary-light">+ Añadir recompensa</button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-display font-700 text-lg mb-5">4. Medios</h2>
            <label className="block text-sm font-medium mb-1.5">URL HTTPS opcional de imagen, video MP4/WebM/OGG, YouTube o Vimeo</label>
            <input type="url" value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} className={input()} placeholder="https://..." />
            <label className="block text-sm font-medium mt-4 mb-1.5" htmlFor="campaign-media-type">Tipo de medio</label>
            <select id="campaign-media-type" value={mediaType} onChange={event => setMediaType(event.target.value === 'VIDEO' ? 'VIDEO' : 'IMAGE')} className={input()}>
              <option value="IMAGE">Imagen</option>
              <option value="VIDEO">Video</option>
            </select>
            {mediaUrl && <CampaignMedia url={mediaUrl} mediaType={mediaType} title={title || 'campaña'} className="mt-4 h-44 rounded-xl" />}
          </section>
        </div>
      </div>
    </div>
  )
}
