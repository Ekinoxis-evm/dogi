// Money is stored in minor units (2 implied decimals) for every currency, including
// COP, which has no cents in practice. Mercado Pago wants whole pesos, so every
// amount leaving for MP goes through toMpAmount. Never send minor units to MP:
// that is the 100x overcharge.

export type Currency = 'COP'

export function pesosToMinor(pesos: number): number {
  if (!Number.isInteger(pesos)) throw new Error(`pesos must be whole, got ${pesos}`)
  return pesos * 100
}

export function toMpAmount(minor: number, currency: Currency): number {
  if (currency !== 'COP') throw new Error(`unsupported currency ${currency}`)
  if (!Number.isInteger(minor) || minor % 100 !== 0) {
    throw new Error(`COP amount must be whole pesos, got ${minor} minor units`)
  }
  return minor / 100
}

export function formatMoney(minor: number, currency: Currency, locale: 'es' | 'en' = 'es'): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100)
}
