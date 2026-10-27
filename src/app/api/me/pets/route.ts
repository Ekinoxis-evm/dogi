import { unstable_rethrow } from 'next/navigation'
import { requireUser, unauthorized } from '@/lib/auth'
import { db } from '@/lib/db'

// The signed-in parent's pets, for the booking panel's pet picker.
export async function GET(req: Request) {
  try {
    const me = await requireUser(req)
    const { data, error } = await db()
      .from('pets')
      .select('id, name, species, photo_url')
      .eq('owner_id', me.id)
      .order('created_at', { ascending: true })
    if (error) throw error
    return Response.json({ pets: data ?? [] })
  } catch (e) {
    unstable_rethrow(e) // let Next's own prerender bail-out through
    console.error('[me/pets]', e instanceof Error ? e.message : e)
    return unauthorized(e) ?? Response.json({ error: 'server_error' }, { status: 500 })
  }
}
