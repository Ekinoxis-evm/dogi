import 'server-only'
import { PrivyClient } from '@privy-io/node'
import { db } from './db'

let privy: PrivyClient | null = null

function client(): PrivyClient {
  if (!privy) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
    const appSecret = process.env.PRIVY_APP_SECRET
    if (!appId || !appSecret) throw new Error('NEXT_PUBLIC_PRIVY_APP_ID / PRIVY_APP_SECRET are not set')
    privy = new PrivyClient({
      appId,
      appSecret,
      // optional: verify offline instead of fetching the key from Privy
      jwtVerificationKey: process.env.PRIVY_VERIFICATION_KEY || undefined,
    })
  }
  return privy
}

export class Unauthorized extends Error {}

export interface Profile {
  id: string
  privy_did: string
  first_name: string | null
  locale: 'es' | 'en'
  is_host: boolean
}

/**
 * Verify the Privy access token on the request and return the matching profile,
 * creating it on first sight. The browser sends the token as `Authorization: Bearer`.
 */
export async function requireUser(req: Request): Promise<Profile> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Unauthorized('missing token')

  let did: string
  try {
    const claims = await client().utils().auth().verifyAccessToken(token)
    did = claims.user_id
  } catch {
    throw new Unauthorized('invalid token')
  }

  const { data, error } = await db()
    .from('profiles')
    .upsert({ privy_did: did }, { onConflict: 'privy_did', ignoreDuplicates: false })
    .select('id, privy_did, first_name, locale, is_host')
    .single()
  if (error) throw error
  return data as Profile
}

export function unauthorized(e: unknown): Response | null {
  return e instanceof Unauthorized ? Response.json({ error: 'unauthorized' }, { status: 401 }) : null
}
