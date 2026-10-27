import { db } from '@/lib/db'
import { getPayment } from '@/lib/mercadopago/checkout'
import { hostAccessToken, hostByMpUser } from '@/lib/mercadopago/payout'
import { decide, mapStatus, verifySignature, type OurStatus } from '@/lib/mercadopago/webhook'
import { pesosToMinor } from '@/lib/money'

// Payments land on the host's MP account, so the notification carries the host's MP
// user_id; we use that host's token to read the payment. Status always comes from the
// API read, never from the request body. Fail closed on signature; 200 on anything we
// deliberately ignore so MP stops retrying it.
export async function POST(req: Request) {
  const url = new URL(req.url)
  const body = (await req.json().catch(() => ({}))) as {
    type?: string
    data?: { id?: string | number }
    user_id?: string | number
  }
  const dataId = url.searchParams.get('data.id') ?? (body.data?.id != null ? String(body.data.id) : null)

  const sig = verifySignature({
    secret: process.env.MP_WEBHOOK_SECRET,
    signature: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId,
  })
  if (!sig.ok) {
    console.warn('[mp-webhook] refused:', sig.reason)
    return Response.json({ error: sig.reason }, { status: 401 })
  }

  const type = url.searchParams.get('type') ?? body.type
  if (type !== 'payment' || !dataId || body.user_id == null) return Response.json({ ignored: 'not_a_payment' })

  const hostId = await hostByMpUser(String(body.user_id))
  const token = hostId ? await hostAccessToken(hostId) : null
  if (!hostId || !token) return Response.json({ ignored: 'unknown_seller' })

  const p = await getPayment(token, dataId)
  const bookingId = p.external_reference
  const next = mapStatus(p.status ?? '')
  if (!bookingId || !next) return Response.json({ ignored: 'unmapped' })

  const { data: booking } = await db()
    .from('bookings')
    .select('id, host_id, total_minor, status')
    .eq('id', bookingId)
    .maybeSingle()
  // the payment must belong to this booking's host -- a seller can't settle someone else's booking
  if (!booking || booking.host_id !== hostId) return Response.json({ ignored: 'booking_mismatch' })

  const { data: existing } = await db()
    .from('payments')
    .select('id, status')
    .eq('provider', 'mercadopago')
    .eq('provider_ref', String(p.id))
    .maybeSingle()

  const d = decide((existing?.status as OurStatus | undefined) ?? null, next)
  if (d.action === 'dedupe' || d.action === 'ignore_regression') return Response.json({ ok: d.action })

  const amountMinor = pesosToMinor(Math.round(p.transaction_amount ?? 0))
  const feeMinor = pesosToMinor(Math.round((p as { marketplace_fee?: number }).marketplace_fee ?? 0))
  const row = {
    booking_id: booking.id,
    provider: 'mercadopago' as const,
    provider_ref: String(p.id),
    status: next,
    amount_minor: amountMinor,
    marketplace_fee_minor: feeMinor,
    currency: p.currency_id ?? 'COP',
    method: p.payment_type_id ?? null,
    raw: { id: p.id, status: p.status, status_detail: p.status_detail, date_approved: p.date_approved },
  }
  const { error } =
    d.action === 'insert'
      ? await db().from('payments').upsert(row, { onConflict: 'provider,provider_ref' })
      : await db().from('payments').update(row).eq('id', existing!.id)
  if (error) throw error

  const paid = next === 'approved' && amountMinor === booking.total_minor
  if (next === 'approved' && !paid) console.error('[mp-webhook] amount mismatch on booking', booking.id)
  if (paid && ['requested', 'accepted'].includes(booking.status)) {
    await db().from('bookings').update({ status: 'paid' }).eq('id', booking.id)
  } else if (d.action === 'update' && d.markBookingCancelled) {
    await db().from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
  }
  return Response.json({ ok: true })
}
