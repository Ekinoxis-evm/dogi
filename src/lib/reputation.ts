// Paw Score weights and tier rules from the design. Kept in code, not SQL, so they can
// be tuned without a migration (the dogi.host_scores view uses the same weights).

export const PAW_WEIGHTS = {
  pet_care: 0.3,
  safety: 0.25,
  communication: 0.2,
  accuracy: 0.15,
  cleanliness: 0.1,
} as const

export type HostTier = 'new_host' | 'rising' | 'trusted' | 'pack_leader'

export interface HostRecord {
  stays: number
  pawScore: number | null
  idVerified: boolean
  firstAidCert: boolean
}

export function hostTier(r: HostRecord): HostTier {
  const score = r.pawScore ?? 0
  if (r.idVerified && r.firstAidCert && r.stays >= 25 && score >= 4.8) return 'pack_leader'
  if (r.idVerified && r.firstAidCert && r.stays >= 10 && score >= 4.6) return 'trusted'
  if (r.idVerified && r.stays >= 3 && score >= 4.3) return 'rising'
  return 'new_host'
}

/** Trusted hosts can take up to 3 guests at once; everyone else starts at 1. */
export function maxGuestsFor(tier: HostTier): number {
  return tier === 'trusted' || tier === 'pack_leader' ? 3 : 1
}

export type GuestTier = 'new_guest' | 'good_guest' | 'star_guest'

export function guestTier(stays: number, guestScore: number | null): GuestTier {
  const s = guestScore ?? 0
  if (stays >= 10 && s >= 4.8) return 'star_guest'
  if (stays >= 3 && s >= 4.5) return 'good_guest'
  return 'new_guest'
}
