import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

interface BookingRow {
  id: string
  listing_id: string
  host_id: string
  parent_id: string
  stay: string
  dropoff_at: string
  pickup_at: string
  status: string
  base_minor: number
  extra_pets_minor: number
  total_minor: number
  platform_fee_minor: number
  currency: 'COP'
  listing: { neighbourhood: string; city: string; space: string } | null
  booking_pets: { pets: { id: string; name: string; species: string } | null }[]
  payments: { status: string; method: string | null; amount_minor: number; updated_at: string }[]
}

// One booking, for its parent or its host only. Polled by the Mercado Pago return page
// until the webhook marks it paid.
export async function GET(req: Request, { params }: Ctx) {
  try {
    const me = await requireUser(req)
    const { id } = await params
    if (!z.uuid().safeParse(id).success) return Response.json({ error: 'not_found' }, { status: 404 })

    const { data, error } = await db()
      .from('bookings')
      .select(
        'id, listing_id, host_id, parent_id, stay, dropoff_at, pickup_at, status, base_minor, extra_pets_minor, total_minor, platform_fee_minor, currency, listing:listings(neighbourhood, city, space), booking_pets(pets(id, name, species)), payments(status, method, amount_minor, updated_at)',
      )
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    const b = data as unknown as BookingRow | null
    if (!b || (b.parent_id !== me.id && b.host_id !== me.id)) return Response.json({ error: 'not_found' }, { status: 404 })

    const payments = [...(b.payments ?? [])].sort((x, y) => y.updated_at.localeCompare(x.updated_at))
    return Response.json({
      viewer: b.parent_id === me.id ? 'parent' : 'host',
      booking: {
        id: b.id,
        listingId: b.listing_id,
        stay: b.stay,
        dropoffAt: b.dropoff_at,
        pickupAt: b.pickup_at,
        status: b.status,
        baseMinor: b.base_minor,
        extraPetsMinor: b.extra_pets_minor,
        totalMinor: b.total_minor,
        platformFeeMinor: b.platform_fee_minor,
        currency: b.currency,
        listing: b.listing,
        pets: (b.booking_pets ?? []).flatMap((bp) => (bp.pets ? [bp.pets] : [])),
      },
      payment: payments[0] ? { status: payments[0].status, method: payments[0].method, updatedAt: payments[0].updated_at } : null,
    })
  } catch (e) {
    console.error('[bookings/:id]', e instanceof Error ? e.message : e)
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
