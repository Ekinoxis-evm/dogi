import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'
import { pesosToMinor } from '@/lib/money'
import { hourlyRate, suggestedHourly } from '@/lib/pricing'
import { hostTier, maxGuestsFor } from '@/lib/reputation'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const Body = z
  .object({
    space: z.enum(['apartment_pet_room', 'house_no_yard', 'house_with_yard', 'dedicated_pet_space']),
    areaM2: z.number().int().min(1).max(10000).nullable().optional(),
    city: z.string().trim().min(1).max(80).default('Medellín'),
    neighbourhood: z.string().trim().min(2).max(120),
    otherPetsAtHome: z.string().trim().max(200).nullable().optional(),
    accepts: z.object({
      smallDogs: z.boolean(),
      mediumDogs: z.boolean(),
      largeDogs: z.boolean(),
      cats: z.boolean(),
      puppies: z.boolean(),
      seniors: z.boolean(),
    }),
    maxGuests: z.number().int().min(1).max(3),
    earliestDropoff: z.string().regex(HHMM),
    latestPickup: z.string().regex(HHMM),
    minStay: z.enum(['one_hour', 'two_hours', 'half_day']),
    notice: z.enum(['two_hours', 'same_day', 'one_day']),
    requiresVaccines: z.boolean(),
    requiresMeetGreet: z.boolean(),
    requiresNeutered: z.boolean(),
    demand: z.enum(['low', 'standard', 'high']),
    adjustPct: z.number().int().min(-15).max(15).multipleOf(5),
    amenityIds: z.array(z.string().min(1).max(40)).max(20),
  })
  .refine((b) => b.earliestDropoff < b.latestPickup, { message: 'latest pick-up must be after earliest drop-off', path: ['latestPickup'] })
  .refine((b) => b.accepts.smallDogs || b.accepts.mediumDogs || b.accepts.largeDogs || b.accepts.cats, {
    message: 'accept at least one kind of pet',
    path: ['accepts'],
  })

// Create a listing. The hourly price is recomputed here from the space, the amenities'
// prices in the database, demand and the host's adjustment -- never taken from the browser.
// The listing goes live only when the host already has a payout account; otherwise draft.
export async function POST(req: Request) {
  try {
    const me = await requireUser(req)
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return Response.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 })
    const b = parsed.data
    const amenityIds = [...new Set(b.amenityIds)]

    const [amenitiesRes, profileRes, scoreRes, staysRes, payoutRes] = await Promise.all([
      amenityIds.length
        ? db().from('amenities').select('id, add_per_hour_cop').in('id', amenityIds)
        : Promise.resolve({ data: [] as { id: string; add_per_hour_cop: number }[], error: null }),
      db().from('profiles').select('id_verified_at, first_aid_cert_url').eq('id', me.id).single(),
      db().from('host_scores').select('paw_score').eq('host_id', me.id).maybeSingle(),
      db().from('bookings').select('id', { count: 'exact', head: true }).eq('host_id', me.id).eq('status', 'completed'),
      db().from('payout_accounts').select('profile_id').eq('profile_id', me.id).maybeSingle(),
    ])
    for (const r of [amenitiesRes, profileRes, scoreRes, staysRes, payoutRes]) if (r.error) throw r.error

    const amenities = amenitiesRes.data ?? []
    if (amenities.length !== amenityIds.length) return Response.json({ error: 'unknown_amenity' }, { status: 400 })

    const tier = hostTier({
      stays: staysRes.count ?? 0,
      pawScore: scoreRes.data?.paw_score != null ? Number(scoreRes.data.paw_score) : null,
      idVerified: !!profileRes.data?.id_verified_at,
      firstAidCert: !!profileRes.data?.first_aid_cert_url,
    })
    const suggested = suggestedHourly(
      b.space,
      amenities.map((a) => a.add_per_hour_cop),
      b.demand,
    )
    const hourly = hourlyRate(suggested, b.adjustPct, tier)
    const status = payoutRes.data ? 'live' : 'draft'

    const { data: listing, error } = await db()
      .from('listings')
      .insert({
        host_id: me.id,
        status,
        space: b.space,
        area_m2: b.areaM2 ?? null,
        city: b.city,
        neighbourhood: b.neighbourhood,
        other_pets_at_home: b.otherPetsAtHome || null,
        accepts_small_dogs: b.accepts.smallDogs,
        accepts_medium_dogs: b.accepts.mediumDogs,
        accepts_large_dogs: b.accepts.largeDogs,
        accepts_cats: b.accepts.cats,
        accepts_puppies: b.accepts.puppies,
        accepts_seniors: b.accepts.seniors,
        max_guests: Math.min(b.maxGuests, maxGuestsFor(tier)),
        earliest_dropoff: b.earliestDropoff,
        latest_pickup: b.latestPickup,
        min_stay: b.minStay,
        notice: b.notice,
        requires_vaccines: b.requiresVaccines,
        requires_meet_greet: b.requiresMeetGreet,
        requires_neutered: b.requiresNeutered,
        demand: b.demand,
        price_adjust_pct: b.adjustPct,
        hourly_minor: pesosToMinor(hourly),
        currency: 'COP',
      })
      .select('id, status, hourly_minor, max_guests')
      .single()
    if (error) throw error

    if (amenityIds.length) {
      const { error: amErr } = await db()
        .from('listing_amenities')
        .insert(amenityIds.map((amenity_id) => ({ listing_id: listing.id, amenity_id })))
      if (amErr) {
        await db().from('listings').delete().eq('id', listing.id)
        throw amErr
      }
    }

    if (!me.is_host) {
      const { error: hostErr } = await db().from('profiles').update({ is_host: true }).eq('id', me.id)
      if (hostErr) throw hostErr
    }

    return Response.json(
      { id: listing.id, status: listing.status, hourlyMinor: listing.hourly_minor, maxGuests: listing.max_guests, tier },
      { status: 201 },
    )
  } catch (e) {
    console.error('[listings]', e instanceof Error ? e.message : e)
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
