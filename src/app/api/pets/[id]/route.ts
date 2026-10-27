import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

const CONFIRMED = ['paid', 'in_stay']

interface HostBookingRow {
  booking_id: string
  bookings: { id: string; host_id: string; status: string; stay: string; dropoff_at: string } | null
}

interface ReviewRow {
  booking_id: string
  author_id: string
  behaviour: number
  passport_match: number
  on_time_pickup: number
  communication: number
  body: string | null
  created_at: string
  author: { first_name: string | null } | null
  booking: { stay: string } | null
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

// A pet's guest profile. Visible to the owner, and to a host who has a booking with
// this pet. The microchip and the owner's emergency phones are shown only to the owner
// or to a host whose booking is confirmed (paid or in stay).
export async function GET(req: Request, { params }: Ctx) {
  try {
    const me = await requireUser(req)
    const { id } = await params
    if (!z.uuid().safeParse(id).success) return Response.json({ error: 'not_found' }, { status: 404 })

    const { data: pet, error } = await db().from('pets').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!pet) return Response.json({ error: 'not_found' }, { status: 404 })

    const isOwner = pet.owner_id === me.id
    let hostBookings: NonNullable<HostBookingRow['bookings']>[] = []
    if (!isOwner) {
      const { data: rows, error: bErr } = await db()
        .from('booking_pets')
        .select('booking_id, bookings!inner(id, host_id, status, stay, dropoff_at)')
        .eq('pet_id', id)
        .eq('bookings.host_id', me.id)
      if (bErr) throw bErr
      hostBookings = ((rows ?? []) as unknown as HostBookingRow[]).flatMap((r) => (r.bookings ? [r.bookings] : []))
      // Same answer as "doesn't exist", so a stranger can't probe pet ids.
      if (!hostBookings.length) return Response.json({ error: 'not_found' }, { status: 404 })
    }
    const confirmed = isOwner || hostBookings.some((b) => CONFIRMED.includes(b.status))

    const [vaccinesRes, scoreRes, reviewsRes, ownerRes] = await Promise.all([
      db().from('pet_vaccines').select('vaccine, valid_until').eq('pet_id', id),
      db().from('pet_scores').select('stays, guest_score').eq('pet_id', id).maybeSingle(),
      db()
        .from('guest_reviews')
        .select(
          'booking_id, author_id, behaviour, passport_match, on_time_pickup, communication, body, created_at, author:profiles(first_name), booking:bookings(stay)',
        )
        .eq('pet_id', id)
        .order('created_at', { ascending: false }),
      db().from('profiles').select('first_name, id_verified_at, created_at').eq('id', pet.owner_id).maybeSingle(),
    ])
    for (const r of [vaccinesRes, scoreRes, reviewsRes, ownerRes]) if (r.error) throw r.error

    const reviews = (reviewsRes.data ?? []) as unknown as ReviewRow[]
    const ratings = {
      behaviour: avg(reviews.map((r) => r.behaviour)),
      passportMatch: avg(reviews.map((r) => r.passport_match)),
      onTimePickup: avg(reviews.map((r) => r.on_time_pickup)),
      communication: avg(reviews.map((r) => r.communication)),
    }

    const hidden = confirmed ? {} : { microchip: null, vet_phone: null, emergency_contact: null }
    const latest = [...hostBookings].sort((a, b) => b.dropoff_at.localeCompare(a.dropoff_at))[0] ?? null

    return Response.json({
      viewer: isOwner ? 'owner' : 'host',
      confirmed,
      hostBooking: latest,
      pet: { ...pet, owner_id: undefined, ...hidden },
      owner: ownerRes.data
        ? {
            firstName: ownerRes.data.first_name,
            idVerified: Boolean(ownerRes.data.id_verified_at),
            memberSince: ownerRes.data.created_at,
          }
        : null,
      vaccines: vaccinesRes.data ?? [],
      score: {
        stays: Number(scoreRes.data?.stays ?? 0),
        guestScore: scoreRes.data?.guest_score == null ? null : Number(scoreRes.data.guest_score),
      },
      ratings,
      reviews: reviews.map((r) => ({
        bookingId: r.booking_id,
        author: r.author?.first_name ?? null,
        stay: r.booking?.stay ?? null,
        body: r.body,
        createdAt: r.created_at,
        behaviour: r.behaviour,
        passportMatch: r.passport_match,
        onTimePickup: r.on_time_pickup,
        communication: r.communication,
      })),
      reviewers: new Set(reviews.map((r) => r.author_id)).size,
    })
  } catch (e) {
    console.error('[pets/:id]', e instanceof Error ? e.message : e)
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
