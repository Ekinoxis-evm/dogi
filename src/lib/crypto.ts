import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM for secrets at rest (hosts' Mercado Pago tokens). DOGI_TOKEN_KEY is
// 32 random bytes, base64: `openssl rand -base64 32`. Output is v1.<iv>.<tag>.<ct>.

function key(): Buffer {
  const raw = process.env.DOGI_TOKEN_KEY
  if (!raw) throw new Error('DOGI_TOKEN_KEY is not set')
  const k = Buffer.from(raw, 'base64')
  if (k.length !== 32) throw new Error('DOGI_TOKEN_KEY must decode to 32 bytes')
  return k
}

export function seal(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

export function open(sealed: string): string {
  const [v, iv, tag, ct] = sealed.split('.')
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('malformed sealed value')
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8')
}
