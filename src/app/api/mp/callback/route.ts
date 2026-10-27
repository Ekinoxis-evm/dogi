import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { open } from '@/lib/crypto'
import { db } from '@/lib/db'
import { exchangeCode } from '@/lib/mercadopago/oauth'
import { saveToken } from '@/lib/mercadopago/payout'

// Step 2: MP redirects the host back here with ?code&state.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const jar = await cookies()
  const sealed = jar.get('dogi_mp_oauth')?.value
  jar.delete({ name: 'dogi_mp_oauth', path: '/api/mp/callback' })

  let outcome = 'connected'
  try {
    if (!sealed) throw new Error('no oauth cookie')
    const { state, verifier, profileId } = JSON.parse(open(sealed)) as {
      state: string
      verifier: string
      profileId: string
    }
    const code = url.searchParams.get('code')
    if (!code || url.searchParams.get('state') !== state) throw new Error('state mismatch')
    const token = await exchangeCode(code, verifier)
    await saveToken(profileId, token)
    await db().from('profiles').update({ is_host: true }).eq('id', profileId)
  } catch (e) {
    console.error('[mp-oauth]', e instanceof Error ? e.message : e)
    outcome = 'failed'
  }
  redirect(`/host/onboarding?payout=${outcome}`)
}
