import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { decide, mapStatus, verifySignature } from '../src/lib/mercadopago/webhook.ts'

const secret = 's3cret'
const now = 1_800_000_000
function sign(dataId: string, requestId: string, ts: number) {
  const v1 = createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')
  return `ts=${ts},v1=${v1}`
}

test('valid signature passes', () => {
  const r = verifySignature({ secret, signature: sign('123', 'req-1', now), requestId: 'req-1', dataId: '123', nowSeconds: now })
  assert.deepEqual(r, { ok: true })
})

test('fails closed on every missing piece', () => {
  const base = { secret, signature: sign('123', 'req-1', now), requestId: 'req-1', dataId: '123', nowSeconds: now }
  assert.equal((verifySignature({ ...base, secret: undefined }) as { reason: string }).reason, 'missing_secret')
  assert.equal((verifySignature({ ...base, signature: null }) as { reason: string }).reason, 'missing_header')
  assert.equal((verifySignature({ ...base, requestId: null }) as { reason: string }).reason, 'missing_request_id')
  assert.equal((verifySignature({ ...base, signature: 'garbage' }) as { reason: string }).reason, 'malformed_header')
})

test('rejects stale, tampered and wrong-id deliveries', () => {
  const old = now - 11 * 60
  assert.equal((verifySignature({ secret, signature: sign('123', 'r', old), requestId: 'r', dataId: '123', nowSeconds: now }) as { reason: string }).reason, 'stale_timestamp')
  assert.equal((verifySignature({ secret, signature: sign('123', 'r', now), requestId: 'r', dataId: '124', nowSeconds: now }) as { reason: string }).reason, 'bad_signature')
  assert.equal((verifySignature({ secret: 'other', signature: sign('123', 'r', now), requestId: 'r', dataId: '123', nowSeconds: now }) as { reason: string }).reason, 'bad_signature')
})

test('accepts millisecond timestamps', () => {
  const ms = now * 1000
  assert.deepEqual(verifySignature({ secret, signature: sign('9', 'r', ms), requestId: 'r', dataId: '9', nowSeconds: now }), { ok: true })
})

test('status map', () => {
  assert.equal(mapStatus('in_process'), 'pending')
  assert.equal(mapStatus('charged_back'), 'refunded')
  assert.equal(mapStatus('weird'), null)
})

test('a late in_process never undoes an approval', () => {
  assert.deepEqual(decide(null, 'pending'), { action: 'insert' })
  assert.deepEqual(decide('approved', 'pending'), { action: 'ignore_regression' })
  assert.deepEqual(decide('approved', 'approved'), { action: 'dedupe' })
  assert.deepEqual(decide('rejected', 'approved'), { action: 'ignore_regression' })
  assert.deepEqual(decide('pending', 'approved'), { action: 'update', markBookingPaid: true, markBookingCancelled: false })
  assert.deepEqual(decide('approved', 'refunded'), { action: 'update', markBookingPaid: false, markBookingCancelled: true })
})
