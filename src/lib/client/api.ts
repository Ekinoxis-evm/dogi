'use client'

import { getAccessToken } from '@privy-io/react-auth'

/** fetch() to our own API with the Privy access token attached. */
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  return fetch(path, { ...init, headers })
}
