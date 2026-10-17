import { useEffect, useState } from 'react'
import type { PageResponse, ReceiptStatus, Screen, TransactionHistoryItem } from '../types'
import { api, apiErrorMessage } from '../services/api'

interface Props {
  navigate: (screen: Screen, id?: string | null) => void
}

const receiptStyles: Record<ReceiptStatus, { label: string; classes: string }> = {
  HELD: { label: 'Retenido', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  SUCCESSFUL: { label: 'Exitoso', classes: 'bg-green-50 text-green-700 border-green-200' },
  REFUNDED: { label: 'Reembolsado', classes: 'bg-slate-100 text-slate-700 border-slate-200' },
  FAILED: { label: 'Fallido', classes: 'bg-red-50 text-red-700 border-red-200' },
}

function ReceiptBadge({ status }: { status: ReceiptStatus }) {
  const option = receiptStyles[status]
  return <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${option.classes}`}>{option.label}</span>
}

function amountLabel(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('es-ES')}`
  }
}

function totalLabel(items: TransactionHistoryItem[]) {
  if (!items.length) return amountLabel(0, 'USD')
  const currency = items[0].currency
  if (items.some(item => item.currency !== currency)) return 'Varias monedas'
  return amountLabel(items.reduce((sum, item) => sum + item.amount, 0), currency)
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Cargando historial de transacciones">
      <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="h-12 bg-gray-100" />
        {[1, 2, 3, 4].map(row => <div key={row} className="h-20 border-t border-gray-100 bg-white" />)}
      </div>
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map(card => <div key={card} className="h-48 bg-white border border-gray-100 rounded-2xl" />)}
      </div>
      <span className="sr-only">Cargando transacciones...</span>
    </div>
  )
}

function Reference({
  item,
  copiedId,
  onCopy,
}: {
  item: TransactionHistoryItem
  copiedId: string | null
  onCopy: (item: TransactionHistoryItem) => void
}) {
  if (!item.referenceCode) return <span className="text-xs text-gray-500">Pendiente de comprobante</span>
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-mono text-gray-700 break-all">{item.referenceCode}</span>
      <button
        type="button"
        onClick={() => onCopy(item)}
        className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md flex-shrink-0"
        aria-label={`Copiar referencia ${item.referenceCode}`}
      >
        {copiedId === item.contributionId ? 'Copiada' : 'Copiar'}
      </button>
    </div>
  )
}

export default function TransactionHistory({ navigate }: Props) {
  const [response, setResponse] = useState<PageResponse<TransactionHistoryItem> | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState('')

  async function load(targetPage: number) {
    setLoading(true)
    setError('')
    setResponse(null)
    setPage(targetPage)
    try {
      const result = await api.contributions(targetPage, 10)
      setResponse(result)
      setPage(result.page)
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'No pudimos cargar tu historial de transacciones.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(0)
  }, [])

  async function copyReference(item: TransactionHistoryItem) {
    if (!item.referenceCode) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(item.referenceCode)
      setCopiedId(item.contributionId)
    } catch {
      setCopyError('No pudimos copiar la referencia. Selecciónala manualmente.')
    }
  }

  const items = response?.content ?? []

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button type="button" onClick={() => navigate('sponsor-dashboard')} className="text-sm font-medium text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md mb-6">
          ← Volver al panel
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Mis aportes</p>
            <h1 className="font-display font-800 text-3xl text-gray-900">Historial de transacciones</h1>
            <p className="text-sm text-gray-500 mt-2">Consulta los comprobantes y referencias devueltos por ImpulsaFund.</p>
          </div>
          <button type="button" onClick={() => navigate('projects')} className="self-start text-sm font-semibold text-primary border border-primary rounded-xl px-5 py-2.5 hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30">
            Explorar proyectos
          </button>
        </div>

        {!loading && response && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-500">Total en esta página</p>
              <p className="font-display font-800 text-2xl text-gray-900 mt-1">{totalLabel(items)}</p>
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-500">Cantidad de aportes</p>
              <p className="font-display font-800 text-2xl text-gray-900 mt-1">{response.totalElements}</p>
            </div>
          </div>
        )}

        {copyError && <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{copyError}</div>}

        {loading ? <HistorySkeleton /> : error ? (
          <div className="bg-white border border-red-100 shadow-sm rounded-2xl py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-error flex items-center justify-center text-xl font-bold mx-auto mb-4" aria-hidden="true">!</div>
            <h2 className="font-display font-700 text-gray-900">No pudimos cargar el historial</h2>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
            <button type="button" onClick={() => void load(page)} className="mt-5 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30">Reintentar</button>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-primary-light text-primary flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m5 8H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2zM2 9h20" /></svg>
            </div>
            <h2 className="font-display font-700 text-gray-900">Aún no has realizado aportes</h2>
            <p className="text-sm text-gray-400 mt-2 mb-5">Cuando apoyes una campaña, su transacción aparecerá aquí.</p>
            <button type="button" onClick={() => navigate('projects')} className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover">Explorar proyectos</button>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Fecha', 'Proyecto', 'Monto', 'Referencia', 'Comprobante'].map(header => <th key={header} scope="col" className="px-5 py-3.5 text-xs font-semibold text-gray-500">{header}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(item => (
                      <tr key={item.contributionId} className="hover:bg-gray-50/60">
                        <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{dateLabel(item.date)}</td>
                        <td className="px-5 py-4">
                          <button type="button" onClick={() => navigate('campaign-page', item.campaignId)} className="text-sm font-semibold text-gray-900 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md text-left">{item.projectName}</button>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{amountLabel(item.amount, item.currency)}</td>
                        <td className="px-5 py-4 max-w-xs"><Reference item={item} copiedId={copiedId} onCopy={copyReference} /></td>
                        <td className="px-5 py-4"><ReceiptBadge status={item.receiptStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden space-y-3">
              {items.map(item => (
                <article key={item.contributionId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{dateLabel(item.date)}</p>
                      <button type="button" onClick={() => navigate('campaign-page', item.campaignId)} className="font-display font-700 text-gray-900 hover:text-primary text-left mt-1">{item.projectName}</button>
                    </div>
                    <ReceiptBadge status={item.receiptStatus} />
                  </div>
                  <p className="font-display font-800 text-xl text-primary mt-4">{amountLabel(item.amount, item.currency)}</p>
                  <div className="border-t border-gray-100 mt-4 pt-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Referencia del comprobante</p>
                    <Reference item={item} copiedId={copiedId} onCopy={copyReference} />
                  </div>
                </article>
              ))}
            </div>

            {response && response.totalPages > 1 && (
              <nav className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-label="Paginación del historial">
                <p className="text-xs text-gray-500">Página {response.page + 1} de {response.totalPages}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={response.page <= 0 || loading} onClick={() => void load(response.page - 1)} className="flex-1 sm:flex-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:text-gray-300 disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Anterior</button>
                  <button type="button" disabled={response.page + 1 >= response.totalPages || loading} onClick={() => void load(response.page + 1)} className="flex-1 sm:flex-none bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30">Siguiente</button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}
