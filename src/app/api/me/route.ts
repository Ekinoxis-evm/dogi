import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const me = await requireUser(req)
    const { data: payout } = await db()
      .from('payout_accounts')
      .select('live_mode, expires_at')
      .eq('profile_id', me.id)
      .maybeSingle()
    return Response.json({ ...me, payoutConnected: !!payout, payoutLive: payout?.live_mode ?? null })
  } catch (e) {
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
