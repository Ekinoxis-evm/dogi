import 'server-only'
import MercadoPagoConfig, { Payment, Preference } from 'mercadopago'
import { toMpAmount, type Currency } from '../money'

export interface CheckoutInput {
  hostAccessToken: string
  bookingId: string
  title: string
  totalMinor: number
  feeMinor: number
  currency: Currency
  payerEmail?: string
}

/**
 * Create a Checkout Pro preference on the host's account. marketplace_fee is Dogi's
 * 10%; MP takes its own commission first, the host receives the rest.
 * external_reference is the booking id -- the webhook joins on it, never on email/amount.
 */
export async function createPreference(input: CheckoutInput) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')
  const pref = new Preference(new MercadoPagoConfig({ accessToken: input.hostAccessToken }))
  const back = (outcome: string) => `${appUrl}/bookings/${input.bookingId}?payment=${outcome}`
  const res = await pref.create({
    body: {
      items: [
        {
          id: `booking-${input.bookingId}`,
          title: input.title,
          quantity: 1,
          unit_price: toMpAmount(input.totalMinor, input.currency),
          currency_id: input.currency,
        },
      ],
      marketplace_fee: toMpAmount(input.feeMinor, input.currency),
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      back_urls: { success: back('success'), failure: back('failure'), pending: back('pending') },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      external_reference: input.bookingId,
      statement_descriptor: 'DOGI',
    },
    requestOptions: { idempotencyKey: `pref-${input.bookingId}` },
  })
  const url = process.env.MP_TEST_MODE === 'true' ? (res.sandbox_init_point ?? res.init_point) : res.init_point
  if (!url) throw new Error('MP returned no checkout URL')
  return { preferenceId: res.id, url }
}

/** Read the payment with the host's token. Never trust a status sent in the webhook body. */
export function getPayment(hostAccessToken: string, paymentId: string) {
  return new Payment(new MercadoPagoConfig({ accessToken: hostAccessToken })).get({ id: paymentId })
}
