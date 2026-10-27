import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { requireUser, unauthorized } from '@/lib/auth'
import { seal } from '@/lib/crypto'
import { authorizationUrl, pkcePair } from '@/lib/mercadopago/oauth'

// Step 1 of connecting a host's Mercado Pago account. The browser calls this with its
// Privy token (a redirect can't carry one), we park state + PKCE verifier + profile id
// in a sealed httpOnly cookie, and hand back the MP authorization URL.
export async function POST(req: Request) {
  try {
    const me = await requireUser(req)
    const state = randomBytes(24).toString('base64url')
    const { verifier, challenge } = pkcePair()
    ;(await cookies()).set('dogi_mp_oauth', seal(JSON.stringify({ state, verifier, profileId: me.id })), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/mp/callback',
      maxAge: 600, // MP authorization codes also expire in 10 minutes
    })
    return Response.json({ url: authorizationUrl(state, challenge) })
  } catch (e) {
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
