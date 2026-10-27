import { createHmac, timingSafeEqual } from 'node:crypto'

// Pure webhook logic, same shape as gamingtower's mpWebhookDecision.ts (audit C-3):
// verify the signature fail-closed, map MP status to ours, and never let a late
// out-of-order delivery move a payment backwards. No Next, no Supabase: unit-tested
// with `node --test`.

export const WEBHOOK_TS_MAX_AGE_SECONDS = 10 * 60

export type SignatureResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'missing_secret'
        | 'missing_header'
        | 'malformed_header'
        | 'missing_request_id'
        | 'missing_data_id'
        | 'stale_timestamp'
        | 'bad_signature'
    }

/**
 * x-signature is `ts=<unix>,v1=<hex>`; v1 = HMAC_SHA256(`id:<data.id>;request-id:<x-request-id>;ts:<ts>;`).
 * The trailing semicolon is part of the manifest. MP lowercases alphanumeric data ids.
 */
export function verifySignature(input: {
  secret: string | undefined
  signature: string | null
  requestId: string | null
  dataId: string | null
  nowSeconds?: number
}): SignatureResult {
  if (!input.secret) return { ok: false, reason: 'missing_secret' }
  if (!input.signature) return { ok: false, reason: 'missing_header' }
  if (!input.requestId) return { ok: false, reason: 'missing_request_id' }
  if (!input.dataId) return { ok: false, reason: 'missing_data_id' }

  const parts = Object.fromEntries(
    input.signature.split(',').map((p) => {
      const i = p.indexOf('=')
      return i < 0 ? [p.trim(), ''] : [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[0-9a-f]+$/i.test(v1)) return { ok: false, reason: 'malformed_header' }

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  // MP has sent ts in both seconds and milliseconds; normalise.
  const tsSeconds = ts.length > 11 ? Math.floor(Number(ts) / 1000) : Number(ts)
  if (Math.abs(now - tsSeconds) > WEBHOOK_TS_MAX_AGE_SECONDS) return { ok: false, reason: 'stale_timestamp' }

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${ts};`
  const expected = createHmac('sha256', input.secret).update(manifest).digest()
  const given = Buffer.from(v1, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad_signature' }
  }
  return { ok: true }
}

export type OurStatus = 'pending' | 'approved' | 'rejected' | 'refunded'

export function mapStatus(mp: string): OurStatus | null {
  switch (mp) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'pending':
    case 'in_process':
    case 'in_mediation':
    case 'authorized':
      return 'pending'
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'refunded'
    default:
      return null
  }
}

const ALLOWED: Record<OurStatus, OurStatus[]> = {
  pending: ['pending', 'approved', 'rejected', 'refunded'],
  approved: ['approved', 'refunded'], // only a refund or chargeback leaves approved
  rejected: ['rejected'],
  refunded: ['refunded'],
}

export type Decision =
  | { action: 'insert' }
  | { action: 'dedupe' }
  | { action: 'ignore_regression' }
  | { action: 'update'; markBookingPaid: boolean; markBookingCancelled: boolean }

/** `current` is our stored status for this (provider, payment id), or null if unseen. */
export function decide(current: OurStatus | null, next: OurStatus): Decision {
  if (current === null) return { action: 'insert' }
  if (current === next) return { action: 'dedupe' }
  if (!ALLOWED[current].includes(next)) return { action: 'ignore_regression' }
  return {
    action: 'update',
    markBookingPaid: next === 'approved',
    markBookingCancelled: current === 'approved' && next === 'refunded',
  }
}
