export function isCurrencyCode(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value)
}

export function formatMoney(amount: number, currency: string | null | undefined): string {
  if (!isCurrencyCode(currency)) return 'Moneda no disponible'
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return 'Moneda no disponible'
  }
}

export function formatMoneyExact(amount: number, currency: string | null | undefined): string {
  if (!isCurrencyCode(currency)) return 'Moneda no disponible'
  return `${currency} ${amount.toLocaleString('es-ES', { maximumFractionDigits: 20 })}`
}
