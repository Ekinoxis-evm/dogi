import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

// Marketplace (split 1:1): each host authorises Dogi on their own Mercado Pago account.
// The resulting token creates preferences on the host's behalf, with Dogi's
// marketplace_fee taken out, so the host's 90% never passes through Dogi.
// Tokens last 180 days; refresh before they expire (see refreshIfNeeded in payout.ts).

const AUTH_URL = 'https://auth.mercadopago.com.co/authorization'
const TOKEN_URL = 'https://api.mercadopago.com/oauth/token'

function cfg() {
  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!clientId || !clientSecret || !appUrl) throw new Error('MP_CLIENT_ID / MP_CLIENT_SECRET / NEXT_PUBLIC_APP_URL are not set')
  return { clientId, clientSecret, redirectUri: `${appUrl}/api/mp/callback` }
}

export function pkcePair() {
  const verifier = randomBytes(48).toString('base64url') // 64 chars, inside 43-128
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function authorizationUrl(state: string, challenge: string): string {
  const { clientId, redirectUri } = cfg()
  const u = new URL(AUTH_URL)
  u.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()
  return u.toString()
}

export interface MpToken {
  access_token: string
  refresh_token?: string
  public_key?: string
  user_id: number
  expires_in: number
  live_mode: boolean
}

async function tokenRequest(body: Record<string, string>): Promise<MpToken> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`MP oauth ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as MpToken
}

export function exchangeCode(code: string, verifier: string): Promise<MpToken> {
  const { clientId, clientSecret, redirectUri } = cfg()
  return tokenRequest({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    test_token: process.env.MP_TEST_MODE === 'true' ? 'true' : 'false',
  })
}

export function refreshToken(refresh: string): Promise<MpToken> {
  const { clientId, clientSecret } = cfg()
  return tokenRequest({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
  })
}
