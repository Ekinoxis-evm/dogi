import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'

const PatchBody = z.object({
  first_name: z.string().trim().min(1).max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  phone_country_code: z.string().trim().regex(/^\+\d{1,5}$/).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().optional(),
  city: z.string().trim().max(100).optional(),
  neighbourhood: z.string().trim().max(120).optional(),
  is_host: z.boolean().optional(),
  onboarding_completed: z.boolean().optional(),
})

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

export async function PATCH(req: Request) {
  try {
    const me = await requireUser(req)
    const json = await req.json().catch(() => null)
    const parsed = PatchBody.safeParse(json)
    if (!parsed.success) {
      return Response.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...parsed.data,
    }

    const { data, error } = await db()
      .from('profiles')
      .update(updates)
      .eq('id', me.id)
      .select('id, privy_did, first_name, last_name, phone, phone_country_code, email, city, neighbourhood, locale, is_host, onboarding_completed')
      .single()

    if (error) throw error

    return Response.json({ ok: true, profile: data })
  } catch (e) {
    console.error('[me/patch]', e instanceof Error ? e.message : e)
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}

