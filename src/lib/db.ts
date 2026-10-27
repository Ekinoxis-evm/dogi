import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Login is Privy, so there is no Supabase session and auth.uid() means nothing here.
// Every read/write that touches a user goes through this service-role client, after
// requireUser() has verified the Privy token. Never import this from a client component.

let client: SupabaseClient<any, 'dogi', 'dogi'> | null = null // eslint-disable-line @typescript-eslint/no-explicit-any

export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const keyValue = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !keyValue) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
    client = createClient(url, keyValue, {
      db: { schema: 'dogi' },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
