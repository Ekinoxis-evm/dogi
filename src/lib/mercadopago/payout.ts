import 'server-only'
import { db } from '../db'
import { open, seal } from '../crypto'
import { refreshToken, type MpToken } from './oauth'

const REFRESH_WHEN_DAYS_LEFT = 30

export async function saveToken(profileId: string, t: MpToken) {
  const { error } = await db()
    .from('payout_accounts')
    .upsert(
      {
        profile_id: profileId,
        provider: 'mercadopago',
        provider_user_id: String(t.user_id),
        access_token_enc: seal(t.access_token),
        refresh_token_enc: t.refresh_token ? seal(t.refresh_token) : null,
        public_key: t.public_key ?? null,
        live_mode: t.live_mode,
        expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      },
      { onConflict: 'profile_id' },
    )
  if (error) throw error
}

/** The host's usable MP access token, refreshed if it is close to expiry. Null if not connected. */
export async function hostAccessToken(hostId: string): Promise<string | null> {
  const { data, error } = await db()
    .from('payout_accounts')
    .select('access_token_enc, refresh_token_enc, expires_at')
    .eq('profile_id', hostId)
    .eq('provider', 'mercadopago')
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const daysLeft = (new Date(data.expires_at).getTime() - Date.now()) / 86_400_000
  if (daysLeft > REFRESH_WHEN_DAYS_LEFT || !data.refresh_token_enc) {
    return daysLeft > 0 ? open(data.access_token_enc) : null
  }
  const fresh = await refreshToken(open(data.refresh_token_enc))
  await saveToken(hostId, fresh)
  return fresh.access_token
}

/** The MP user id behind a payment, to look up which host's token can read it. */
export async function hostByMpUser(mpUserId: string): Promise<string | null> {
  const { data } = await db()
    .from('payout_accounts')
    .select('profile_id')
    .eq('provider', 'mercadopago')
    .eq('provider_user_id', mpUserId)
    .maybeSingle()
  return data?.profile_id ?? null
}
