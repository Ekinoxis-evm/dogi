import 'server-only'
import { cacheLife } from 'next/cache'
import { db } from '@/lib/db'
import { hostTier, type HostTier } from '@/lib/reputation'
import type { SpaceType } from '@/lib/pricing'

// Public reads for the home page and the stay page. Everything here is what an anonymous
// visitor may see (live listings, their photos, amenities, reviews), cached for about a
// minute. A missing env or a database error returns empty data instead of throwing, so
// the build never fails on a missing SUPABASE_URL.

export interface ListingCard {
  id: string
  hostFirstName: string
  hostPhotoUrl: string | null
  space: SpaceType
  neighbourhood: string
  city: string
  hourlyMinor: number
  currency: 'COP'
  photoUrl: string | null
  amenities: { id: string; label: string }[]
  pawScore: number | null
  reviews: number
  stays: number
  tier: HostTier
}

export interface CategoryScore {
  key: 'pet_care' | 'safety' | 'communication' | 'accuracy' | 'cleanliness'
  avg: number | null
}

export interface StayReview {
  id: string
  author: string
  pets: string[]
  stay: 'drop_in' | 'half_day' | 'full_day' | 'overnight' | null
  createdAt: string
  score: number
  body: string | null
}

export interface ListingDetail extends ListingCard {
  hostId: string
  hostIntro: string | null
  hostSince: string
  idVerified: boolean
  firstAid: boolean
  spaceCheckedAt: string | null
  areaM2: number | null
  otherPetsAtHome: string | null
  photos: { url: string; caption: string | null }[]
  amenityDetails: { id: string; label: string; detail: string | null }[]
  accepts: {
    smallDogs: boolean
    mediumDogs: boolean
    largeDogs: boolean
    cats: boolean
    puppies: boolean
    seniors: boolean
  }
  maxGuests: number
  earliestDropoff: string // 'HH:MM'
  latestPickup: string // 'HH:MM'
  minStay: 'one_hour' | 'two_hours' | 'half_day'
  notice: 'two_hours' | 'same_day' | 'one_day'
  requiresVaccines: boolean
  requiresMeetGreet: boolean
  requiresNeutered: boolean
  latePickupMinor: number | null
  categories: CategoryScore[]
  reviewList: StayReview[]
}

const PHOTO_BUCKET = 'dogi-photos'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* eslint-disable @typescript-eslint/no-explicit-any -- the db() client is untyped */

function photoUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return db().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

async function scoresFor(hostIds: string[]) {
  const scores = new Map<string, { reviews: number; paw: number | null }>()
  const stays = new Map<string, number>()
  if (!hostIds.length) return { scores, stays }
  const [s, b] = await Promise.all([
    db().from('host_scores').select('host_id, reviews, paw_score').in('host_id', hostIds),
    db().from('bookings').select('host_id').in('host_id', hostIds).eq('status', 'completed'),
  ])
  for (const r of (s.data ?? []) as any[]) {
    scores.set(r.host_id, { reviews: Number(r.reviews), paw: r.paw_score == null ? null : Number(r.paw_score) })
  }
  for (const r of (b.data ?? []) as any[]) stays.set(r.host_id, (stays.get(r.host_id) ?? 0) + 1)
  return { scores, stays }
}

const CARD_SELECT = `
  id, host_id, space, neighbourhood, city, hourly_minor, currency,
  host:profiles ( first_name, photo_url, id_verified_at, first_aid_cert_url, intro, created_at ),
  listing_amenities ( amenity_id, detail, amenities ( label_es, sort ) ),
  listing_photos ( path, caption, sort )
`

function toCard(row: any, scores: Map<string, { reviews: number; paw: number | null }>, stays: Map<string, number>): ListingCard {
  const sc = scores.get(row.host_id)
  const nStays = stays.get(row.host_id) ?? 0
  const amenities = ((row.listing_amenities ?? []) as any[])
    .slice()
    .sort((a, b) => (a.amenities?.sort ?? 0) - (b.amenities?.sort ?? 0))
    .map((a) => ({ id: a.amenity_id as string, label: (a.amenities?.label_es ?? a.amenity_id) as string }))
  const photos = ((row.listing_photos ?? []) as any[]).slice().sort((a, b) => a.sort - b.sort)
  return {
    id: row.id,
    hostFirstName: row.host?.first_name || 'Anfitrión',
    hostPhotoUrl: row.host?.photo_url ?? null,
    space: row.space,
    neighbourhood: row.neighbourhood,
    city: row.city,
    hourlyMinor: Number(row.hourly_minor),
    currency: 'COP',
    photoUrl: photos[0] ? photoUrl(photos[0].path) : null,
    amenities,
    pawScore: sc?.paw ?? null,
    reviews: sc?.reviews ?? 0,
    stays: nStays,
    tier: hostTier({
      stays: nStays,
      pawScore: sc?.paw ?? null,
      idVerified: !!row.host?.id_verified_at,
      firstAidCert: !!row.host?.first_aid_cert_url,
    }),
  }
}

/** Live listings for the home page, best-rated first. Empty on any error. */
export async function getLiveListings(limit = 8): Promise<ListingCard[]> {
  'use cache'
  cacheLife('minutes')
  try {
    const { data, error } = await db()
      .from('listings')
      .select(CARD_SELECT)
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    const { scores, stays } = await scoresFor([...new Set((data as any[]).map((r) => r.host_id as string))])
    return (data as any[])
      .map((r) => toCard(r, scores, stays))
      .sort((a, b) => (b.pawScore ?? 0) - (a.pawScore ?? 0))
  } catch {
    return []
  }
}

/** One live listing with everything the stay page shows. Null when unknown or not live. */
export async function getListing(id: string): Promise<ListingDetail | null> {
  'use cache'
  cacheLife('minutes')
  if (!UUID.test(id)) return null
  try {
    const { data: row, error } = await db()
      .from('listings')
      .select(`
        ${CARD_SELECT},
        status, area_m2, other_pets_at_home, accepts_small_dogs, accepts_medium_dogs, accepts_large_dogs,
        accepts_cats, accepts_puppies, accepts_seniors, max_guests, earliest_dropoff, latest_pickup,
        min_stay, notice, requires_vaccines, requires_meet_greet, requires_neutered, late_pickup_minor,
        space_checked_at
      `)
      .eq('id', id)
      .maybeSingle()
    if (error || !row || (row as any).status !== 'live') return null
    const r = row as any

    const [{ scores, stays }, reviewsRes] = await Promise.all([
      scoresFor([r.host_id]),
      db()
        .from('host_reviews')
        .select(`
          booking_id, pet_care, safety, communication, accuracy, cleanliness, body, created_at,
          author:profiles!host_reviews_author_id_fkey ( first_name ),
          booking:bookings ( stay, booking_pets ( pets ( name ) ) )
        `)
        .eq('host_id', r.host_id)
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    const card = toCard(r, scores, stays)
    const reviews = (reviewsRes.data ?? []) as any[]

    const keys: CategoryScore['key'][] = ['pet_care', 'safety', 'communication', 'accuracy', 'cleanliness']
    const categories = keys.map((key) => ({
      key,
      avg: reviews.length ? reviews.reduce((s, rv) => s + Number(rv[key]), 0) / reviews.length : null,
    }))

    const reviewList: StayReview[] = reviews.slice(0, 6).map((rv) => ({
      id: rv.booking_id,
      author: rv.author?.first_name || 'Un tutor',
      pets: ((rv.booking?.booking_pets ?? []) as any[]).map((bp) => bp.pets?.name).filter(Boolean),
      stay: rv.booking?.stay ?? null,
      createdAt: rv.created_at,
      score:
        rv.pet_care * 0.3 + rv.safety * 0.25 + rv.communication * 0.2 + rv.accuracy * 0.15 + rv.cleanliness * 0.1,
      body: rv.body,
    }))

    const photos = ((r.listing_photos ?? []) as any[])
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((p) => ({ url: photoUrl(p.path), caption: p.caption ?? null }))

    return {
      ...card,
      hostId: r.host_id,
      hostIntro: r.host?.intro ?? null,
      hostSince: r.host?.created_at ?? '',
      idVerified: !!r.host?.id_verified_at,
      firstAid: !!r.host?.first_aid_cert_url,
      spaceCheckedAt: r.space_checked_at,
      areaM2: r.area_m2,
      otherPetsAtHome: r.other_pets_at_home,
      photos,
      amenityDetails: ((r.listing_amenities ?? []) as any[])
        .slice()
        .sort((a, b) => (a.amenities?.sort ?? 0) - (b.amenities?.sort ?? 0))
        .map((a) => ({ id: a.amenity_id, label: a.amenities?.label_es ?? a.amenity_id, detail: a.detail ?? null })),
      accepts: {
        smallDogs: r.accepts_small_dogs,
        mediumDogs: r.accepts_medium_dogs,
        largeDogs: r.accepts_large_dogs,
        cats: r.accepts_cats,
        puppies: r.accepts_puppies,
        seniors: r.accepts_seniors,
      },
      maxGuests: r.max_guests,
      earliestDropoff: String(r.earliest_dropoff).slice(0, 5),
      latestPickup: String(r.latest_pickup).slice(0, 5),
      minStay: r.min_stay,
      notice: r.notice,
      requiresVaccines: r.requires_vaccines,
      requiresMeetGreet: r.requires_meet_greet,
      requiresNeutered: r.requires_neutered,
      latePickupMinor: r.late_pickup_minor == null ? null : Number(r.late_pickup_minor),
      categories,
      reviewList,
    }
  } catch {
    return null
  }
}
