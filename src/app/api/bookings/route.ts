import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'
import { pesosToMinor } from '@/lib/money'
import { quoteStay, type StayLength } from '@/lib/pricing'
import { createPreference } from '@/lib/mercadopago/checkout'
import { hostAccessToken } from '@/lib/mercadopago/payout'

const STAY_HOURS: Record<StayLength, number | null> = { drop_in: null, half_day: 5, full_day: 10, overnight: 14 }

const Body = z.object({
  listingId: z.uuid(),
  stay: z.enum(['drop_in', 'half_day', 'full_day', 'overnight']),
  dropoffAt: z.iso.datetime({ offset: true }),
  dropInHours: z.number().int().min(1).max(4).optional(),
  petIds: z.array(z.uuid()).min(1).max(3),
  note: z.string().max(1000).optional(),
})

// Request a stay and get a Mercado Pago checkout URL for it. The price is computed here
// from the listing, never taken from the browser.
export async function POST(req: Request) {
  try {
    const me = await requireUser(req)
    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 })
    const b = parsed.data

    const { data: listing } = await db()
      .from('listings')
      .select('id, host_id, status, hourly_minor, currency, max_guests, neighbourhood, city')
      .eq('id', b.listingId)
      .maybeSingle()
    if (!listing || listing.status !== 'live') return Response.json({ error: 'listing_unavailable' }, { status: 404 })
    if (listing.host_id === me.id) return Response.json({ error: 'own_listing' }, { status: 400 })
    if (b.petIds.length > listing.max_guests) return Response.json({ error: 'too_many_pets' }, { status: 400 })

    const { data: pets } = await db().from('pets').select('id').eq('owner_id', me.id).in('id', b.petIds)
    if ((pets?.length ?? 0) !== b.petIds.length) return Response.json({ error: 'unknown_pet' }, { status: 400 })

    const token = await hostAccessToken(listing.host_id)
    if (!token) return Response.json({ error: 'host_payout_not_connected' }, { status: 409 })

    const hourlyPesos = listing.hourly_minor / 100
    const q = quoteStay(hourlyPesos, b.stay, b.petIds.length, b.dropInHours ?? 1)
    const dropoff = new Date(b.dropoffAt)
    const hours = STAY_HOURS[b.stay] ?? b.dropInHours ?? 1
    const pickup = new Date(dropoff.getTime() + hours * 3_600_000)

    const { data: booking, error } = await db()
      .from('bookings')
      .insert({
        listing_id: listing.id,
        host_id: listing.host_id,
        parent_id: me.id,
        stay: b.stay,
        dropoff_at: dropoff.toISOString(),
        pickup_at: pickup.toISOString(),
        base_minor: pesosToMinor(q.base),
        extra_pets_minor: pesosToMinor(q.extraPets),
        total_minor: pesosToMinor(q.total),
        platform_fee_minor: pesosToMinor(q.platformFee),
        host_payout_minor: pesosToMinor(q.hostPayout),
        currency: listing.currency,
        parent_note: b.note ?? null,
      })
      .select('id')
      .single()
    if (error) throw error

    const { error: petsErr } = await db()
      .from('booking_pets')
      .insert(b.petIds.map((pet_id) => ({ booking_id: booking.id, pet_id })))
    if (petsErr) throw petsErr

    const checkout = await createPreference({
      hostAccessToken: token,
      bookingId: booking.id,
      title: `Dogi stay - ${listing.neighbourhood}, ${listing.city}`,
      totalMinor: pesosToMinor(q.total),
      feeMinor: pesosToMinor(q.platformFee),
      currency: 'COP',
    })
    return Response.json({ bookingId: booking.id, quote: q, checkoutUrl: checkout.url })
  } catch (e) {
    console.error('[bookings]', e instanceof Error ? e.message : e)
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
