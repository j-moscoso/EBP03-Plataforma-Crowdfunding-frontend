import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CreatorSubscription,
  FieldValidationError,
  PageResponse,
  Screen,
  User,
} from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'
import { formatGoalInput, numericGoalValue } from '../utils/campaignForm'
import { supportedCurrencies } from '../utils/currencies'
import CurrencySelect from '../components/CurrencySelect'

interface Props {
  user: User
  creators: Array<Pick<User, 'id' | 'name'>>
  navigate: (screen: Screen, id?: string | null) => void
  onSessionExpired: () => void
}

interface FormErrors {
  creatorId?: string
  amount?: string
  currency?: string
  paymentMethodId?: string
}

const validAmount = (value: string) => {
  const numericValue = numericGoalValue(value)
  return /^\d+(?:\.\d{1,2})?$/.test(numericValue) && Number(numericValue) > 0
}
const validCurrency = (value: string) => supportedCurrencies.some(item => item.code === value)

function amountLabel(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('es-ES')}`
  }
}

function dateLabel(value: string | null) {
  if (!value) return 'No programado'
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(value))
}

function backendFieldErrors(details: unknown) {
  const errors: FormErrors = {}
  let fields: FieldValidationError[] = []
  if (Array.isArray(details)) fields = details as FieldValidationError[]
  else if (details && typeof details === 'object') {
    const body = details as { fieldErrors?: FieldValidationError[]; errors?: FieldValidationError[] | Record<string, string> }
    const source = body.fieldErrors ?? body.errors
    if (Array.isArray(source)) fields = source
    else if (source) fields = Object.entries(source).map(([field, message]) => ({ field, message }))
  }
  fields.forEach(({ field, message }) => {
    if (field === 'creatorId' || field === 'amount' || field === 'currency' || field === 'paymentMethodId') {
      errors[field] = message
    }
  })
  return errors
}

export default function Subscriptions({
  user,
  creators,
  navigate,
  onSessionExpired,
}: Props) {
  const [response, setResponse] = useState<PageResponse<CreatorSubscription> | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [creatorId, setCreatorId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatorSubscription | null>(null)
  const [cancelTarget, setCancelTarget] = useState<CreatorSubscription | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  const availableCreators = useMemo(() => {
    const unique = new Map<string, Pick<User, 'id' | 'name'>>()
    creators.forEach(creator => {
      if (creator.id !== user.id) unique.set(creator.id, creator)
    })
    return [...unique.values()]
  }, [creators, user.id])

  async function load(targetPage: number) {
    setLoading(true)
    setLoadError('')
    try {
      const result = await api.subscriptions(targetPage, 20)
      setResponse(result)
      setPage(result.page)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onSessionExpired()
        return
      }
      setLoadError(apiErrorMessage(requestError, 'No pudimos cargar tus suscripciones.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(0)
  }, [])

  useEffect(() => {
    if (!cancelTarget) return
    const modal = modalRef.current
    const focusable = modal?.querySelectorAll<HTMLElement>('button:not([disabled])')
    focusable?.[0]?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cancellingId) {
        setCancelTarget(null)
        setCancelError('')
        return
      }
      if (event.key !== 'Tab' || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [cancelTarget, cancellingId])

  function validate() {
    const next: FormErrors = {}
    if (!creatorId) next.creatorId = 'Selecciona un creador.'
    else if (creatorId === user.id) next.creatorId = 'El creador debe ser distinto de tu usuario.'
    if (!validAmount(amount)) next.amount = 'Ingresa un monto mayor a cero con máximo dos decimales.'
    if (!validCurrency(currency)) next.currency = 'Selecciona una moneda válida.'
    if (!paymentMethodId) next.paymentMethodId = 'Selecciona un método de pago.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function subscribe(event: React.FormEvent) {
    event.preventDefault()
    if (creating || !validate()) return
    setCreating(true)
    setGeneralError('')
    setCreated(null)
    try {
      const subscription = await api.createSubscription({
        creatorId,
        amount: Number(numericGoalValue(amount)),
        currency,
        paymentMethodId,
      })
      setResponse(current => current
        ? { ...current, content: [subscription, ...current.content.filter(item => item.id !== subscription.id)], totalElements: current.totalElements + 1 }
        : { content: [subscription], page: 0, pageSize: 20, totalElements: 1, totalPages: 1 })
      setCreated(subscription)
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.status === 401) {
          onSessionExpired()
          return
        }
        if (requestError.code === 'NO_ACTIVE_CAMPAIGNS_FOR_SUBSCRIPTION') {
          setGeneralError('Este creador no tiene campañas activas que reciban aportes en la moneda seleccionada.')
          return
        }
        const inline = backendFieldErrors(requestError.details)
        if (requestError.code === 'PAYMENT_METHOD_INVALID' || requestError.code === 'INVALID_PAYMENT_METHOD') {
          inline.paymentMethodId = 'El método de pago seleccionado no es válido.'
        }
        if (requestError.code === 'INSUFFICIENT_FUNDS') {
          inline.paymentMethodId = 'Fondos insuficientes para procesar el primer cobro.'
        }
        if (Object.keys(inline).length) setErrors(current => ({ ...current, ...inline }))
        if (requestError.status === 402 || requestError.status === 409) {
          setGeneralError(`${requestError.code}: ${requestError.message}`)
        } else if (!Object.keys(inline).length) {
          setGeneralError(apiErrorMessage(requestError, 'No pudimos activar la suscripción.'))
        }
      } else {
        setGeneralError(apiErrorMessage(requestError, 'No pudimos activar la suscripción.'))
      }
    } finally {
      setCreating(false)
    }
  }

  async function cancelSubscription() {
    if (!cancelTarget || cancellingId) return
    const target = cancelTarget
    setCancellingId(target.id)
    setCancelError('')
    try {
      let cancelled: CreatorSubscription
      cancelled = (await api.cancelSubscription(target.id)) || {
        ...target,
        status: 'CANCELLED',
        nextChargeAt: null,
        cancelledAt: new Date().toISOString(),
      }
      setResponse(current => current ? {
        ...current,
        content: current.content.map(item => item.id === cancelled.id ? cancelled : item),
      } : current)
      setCancelTarget(null)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onSessionExpired()
        return
      }
      setCancelError(apiErrorMessage(requestError, 'No pudimos cancelar la suscripción.'))
    } finally {
      setCancellingId(null)
    }
  }

  const subscriptions = response?.content ?? []
  const frame = creating
    ? 'S3_HU312_Subscribe_Loading'
    : created
      ? 'S3_HU312_Subscribe_Success'
      : generalError
        ? 'S3_HU312_Subscribe_PaymentError'
        : 'S3_HU312_Subscriptions_Default'
  const inputClass = (error?: string) => `w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 ${error ? 'border-error bg-red-50' : 'border-gray-200 focus:border-primary'}`

  return (
    <div className="min-h-screen bg-bg" data-frame={frame}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button type="button" onClick={() => navigate('sponsor-dashboard')} className="text-sm font-medium text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md mb-6">← Volver al panel</button>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Apoyo mensual</p>
            <h1 className="font-display font-800 text-3xl text-gray-900">Mis suscripciones</h1>
            <p className="text-sm text-gray-500 mt-2">Programa y administra aportes mensuales a creadores.</p>
          </div>
          <span className="self-start rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">{subscriptions.filter(item => item.status === 'ACTIVE').length} activas</span>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_24rem] gap-8 items-start">
          <section aria-labelledby="subscriptions-list-title">
            <h2 id="subscriptions-list-title" className="font-display font-700 text-xl text-gray-900 mb-4">Planes mensuales</h2>
            {loading ? (
              <div className="space-y-3" role="status" aria-label="Cargando suscripciones">
                {[1, 2, 3].map(item => <div key={item} className="h-40 rounded-2xl border border-gray-100 bg-white animate-pulse" />)}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
                <p className="text-sm text-error">{loadError}</p>
                <button type="button" onClick={() => void load(page)} className="mt-4 text-sm font-semibold text-primary">Reintentar</button>
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
                <h3 className="font-display font-700 text-gray-900">Aún no tienes suscripciones</h3>
                <p className="text-sm text-gray-500 mt-2">Elige un creador y configura tu primer apoyo mensual.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(subscription => (
                  <article key={subscription.id} data-frame={subscription.status === 'CANCELLED' ? 'S3_HU312_Cancelled' : undefined} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Creador</p>
                        <h3 className="font-display font-700 text-gray-900 mt-1">{subscription.creatorName || `Creador ${subscription.creatorId.slice(0, 8)}`}</h3>
                        <p className="font-display font-800 text-2xl text-primary mt-3">{amountLabel(subscription.amount, subscription.currency)} <span className="font-sans text-xs font-normal text-gray-400">al mes</span></p>
                      </div>
                      <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${subscription.status === 'ACTIVE' ? 'bg-primary-light text-primary' : subscription.status === 'FAILED' ? 'bg-red-50 text-error' : 'bg-gray-100 text-gray-500'}`}>
                        {subscription.status === 'ACTIVE' ? 'Activa' : subscription.status === 'FAILED' ? 'Fallida' : 'Cancelada'}
                      </span>
                    </div>
                    <div className="mt-4 grid sm:grid-cols-2 gap-2 text-xs text-gray-500">
                      <p>Próximo cobro: <strong className="text-gray-700">{subscription.status === 'CANCELLED' ? 'No programado' : dateLabel(subscription.nextChargeAt)}</strong></p>
                      {subscription.cancelledAt && <p>Cancelada el: <strong className="text-gray-700">{dateLabel(subscription.cancelledAt)}</strong></p>}
                    </div>
                    {subscription.status === 'ACTIVE' && (
                      <button type="button" onClick={() => { setCancelTarget(subscription); setCancelError('') }} className="mt-4 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-error hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200">Cancelar suscripción</button>
                    )}
                  </article>
                ))}
              </div>
            )}
            {response && response.totalPages > 1 && (
              <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginación de suscripciones">
                <p className="text-xs text-gray-500">Página {response.page + 1} de {response.totalPages}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={loading || response.page === 0} onClick={() => void load(response.page - 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold disabled:text-gray-300">Anterior</button>
                  <button type="button" disabled={loading || response.page + 1 >= response.totalPages} onClick={() => void load(response.page + 1)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-200">Siguiente</button>
                </div>
              </nav>
            )}
          </section>

          <aside className="lg:sticky lg:top-24">
            {created ? (
              <div className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm" aria-live="polite">
                <div className="w-12 h-12 rounded-full bg-green-50 text-primary flex items-center justify-center mb-4" aria-hidden="true">✓</div>
                <h2 className="font-display font-800 text-xl text-gray-900">Suscripción activada</h2>
                <p className="text-sm text-gray-500 mt-2">Tu primer cobro fue procesado y el apoyo mensual quedó activo.</p>
                <div className="rounded-xl bg-gray-50 p-4 mt-5">
                  <p className="font-display font-800 text-xl text-primary">{amountLabel(created.amount, created.currency)}</p>
                  <p className="text-xs text-gray-500 mt-1">Próximo cobro: {dateLabel(created.nextChargeAt)}</p>
                </div>
                <button type="button" onClick={() => { setCreated(null); setAmount(''); setPaymentMethodId('') }} className="w-full mt-5 rounded-xl bg-primary py-3 text-sm font-semibold text-white">Ver mis suscripciones</button>
              </div>
            ) : (
              <form onSubmit={subscribe} noValidate className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm" data-frame={creating ? 'S3_HU312_Subscribe_Loading' : generalError ? 'S3_HU312_Subscribe_PaymentError' : 'S3_HU312_Subscribe_Default'}>
                <h2 className="font-display font-800 text-xl text-gray-900">Crear apoyo mensual</h2>
                <p className="text-xs text-gray-500 mt-1 mb-5">El monto se divide entre las campañas activas del creador que usan esta moneda. Si no tiene campañas compatibles al renovar, no se cobrará ese mes. Solo enviaremos el identificador del método simulado.</p>
                {generalError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{generalError}</div>}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="subscription-creator" className="block text-sm font-medium text-gray-700 mb-1.5">Creador objetivo</label>
                    <select id="subscription-creator" value={creatorId} onChange={event => { setCreatorId(event.target.value); setErrors(current => ({ ...current, creatorId: undefined })) }} disabled={creating || availableCreators.length === 0} aria-invalid={Boolean(errors.creatorId)} aria-describedby={errors.creatorId ? 'subscription-creator-error' : undefined} className={inputClass(errors.creatorId)}>
                      <option value="">Seleccionar creador...</option>
                      {availableCreators.map(creator => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
                    </select>
                    {errors.creatorId && <p id="subscription-creator-error" className="text-xs text-error mt-1">{errors.creatorId}</p>}
                    {availableCreators.length === 0 && <p className="text-xs text-gray-500 mt-1">Explora proyectos para encontrar creadores disponibles.</p>}
                  </div>
                  <div>
                    <label htmlFor="subscription-amount" className="block text-sm font-medium text-gray-700 mb-1.5">Monto mensual</label>
                    <input id="subscription-amount" inputMode="decimal" value={amount} onChange={event => { setAmount(formatGoalInput(event.target.value)); setErrors(current => ({ ...current, amount: undefined })) }} disabled={creating} aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'subscription-amount-error' : undefined} className={inputClass(errors.amount)} placeholder="25.00" />
                    {errors.amount && <p id="subscription-amount-error" className="text-xs text-error mt-1">{errors.amount}</p>}
                  </div>
                  <div>
                    <label htmlFor="subscription-currency" className="block text-sm font-medium text-gray-700 mb-1.5">Moneda</label>
                    <CurrencySelect
                      id="subscription-currency"
                      value={currency}
                      onChange={value => { setCurrency(value); setErrors(current => ({ ...current, currency: undefined })) }}
                      disabled={creating}
                      invalid={Boolean(errors.currency)}
                      describedBy={errors.currency ? 'subscription-currency-error' : undefined}
                      className={inputClass(errors.currency)}
                    />
                    {errors.currency && <p id="subscription-currency-error" className="text-xs text-error mt-1">{errors.currency}</p>}
                  </div>
                  <div>
                    <label htmlFor="subscription-payment-method" className="block text-sm font-medium text-gray-700 mb-1.5">Método de pago simulado</label>
                    <select id="subscription-payment-method" value={paymentMethodId} onChange={event => { setPaymentMethodId(event.target.value); setErrors(current => ({ ...current, paymentMethodId: undefined })); setGeneralError('') }} disabled={creating} aria-invalid={Boolean(errors.paymentMethodId)} aria-describedby={errors.paymentMethodId ? 'subscription-payment-error' : undefined} className={inputClass(errors.paymentMethodId)}>
                      <option value="">Seleccionar método...</option>
                      <option value="sim_success">Método aprobado</option>
                      <option value="sim_invalid">Método inválido</option>
                      <option value="sim_insufficient">Fondos insuficientes</option>
                    </select>
                    {errors.paymentMethodId && <p id="subscription-payment-error" className="text-xs text-error mt-1">{errors.paymentMethodId}</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-primary/15 bg-primary-light/40 p-4 mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Resumen</p>
                  <p className="text-sm text-gray-700 mt-1">{creatorId ? availableCreators.find(item => item.id === creatorId)?.name : 'Selecciona un creador'}</p>
                  <p className="font-display font-800 text-lg text-gray-900 mt-1">{validAmount(amount) && validCurrency(currency) ? amountLabel(Number(numericGoalValue(amount)), currency) : `${currency} 0`} al mes</p>
                </div>
                <button type="submit" disabled={creating || availableCreators.length === 0} className="w-full mt-5 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500">
                  {creating ? 'Procesando primer cobro...' : 'Confirmar suscripción'}
                </button>
                {creating && <p className="text-center text-xs text-gray-500 mt-2" role="status" aria-live="polite">Procesando primer cobro...</p>}
              </form>
            )}
          </aside>
        </div>
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 p-4" role="presentation">
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title" aria-describedby="cancel-subscription-description" data-frame="S3_HU312_CancelConfirm" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="cancel-subscription-title" className="font-display font-800 text-xl text-gray-900">¿Cancelar suscripción?</h2>
            <p id="cancel-subscription-description" className="text-sm text-gray-500 mt-2">No habrá cobros futuros para el apoyo a <strong>{cancelTarget.creatorName || 'este creador'}</strong>. Los cobros anteriores no se modifican.</p>
            {cancelError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{cancelError}</div>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button type="button" disabled={Boolean(cancellingId)} onClick={() => { setCancelTarget(null); setCancelError('') }} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 disabled:text-gray-300">Cerrar sin cancelar</button>
              <button type="button" disabled={Boolean(cancellingId)} onClick={() => void cancelSubscription()} className="flex-1 rounded-xl bg-error py-3 text-sm font-semibold text-white disabled:bg-gray-300">{cancellingId ? 'Cancelando...' : 'Confirmar cancelación'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
