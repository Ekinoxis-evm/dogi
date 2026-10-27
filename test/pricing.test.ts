import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fairRange, hourlyRate, quoteStay, suggestedHourly } from '../src/lib/pricing.ts'
import { formatMoney, pesosToMinor, toMpAmount } from '../src/lib/money.ts'

test('suggested hourly = (base + amenities) x demand, rounded to 500', () => {
  assert.equal(suggestedHourly('house_with_yard', [6000, 5000], 'standard'), 49000)
  assert.equal(suggestedHourly('apartment_pet_room', [], 'low'), 25500)
  assert.equal(suggestedHourly('dedicated_pet_space', [1000], 'high'), 54000)
})

test('host adjustment is -15..15 in steps of 5, tier bonus on top', () => {
  assert.equal(hourlyRate(40000, 0), 40000)
  assert.equal(hourlyRate(40000, -15), 34000)
  assert.equal(hourlyRate(40000, 0, 'trusted'), 42000)
  assert.equal(hourlyRate(40000, 0, 'pack_leader'), 45000)
  assert.throws(() => hourlyRate(40000, 7))
  assert.throws(() => hourlyRate(40000, 20))
})

test('stay lengths and the 90/10 split', () => {
  const half = quoteStay(40000, 'half_day', 1)
  assert.equal(half.base, 120000) // 5 h x 60%
  assert.equal(quoteStay(40000, 'full_day', 1).base, 160000) // 10 h x 40%
  assert.equal(quoteStay(40000, 'overnight', 1).base, 220000) // 10 h x 55%
  assert.equal(quoteStay(40000, 'drop_in', 1, 3).base, 120000)
  assert.equal(half.platformFee, 12000)
  assert.equal(half.hostPayout, 108000)
})

test('each extra pet adds 60%; fee + payout always equals total', () => {
  const q = quoteStay(37500, 'full_day', 3)
  assert.equal(q.extraPets, q.base * 1.2)
  for (const pets of [1, 2, 3]) {
    for (const stay of ['drop_in', 'half_day', 'full_day', 'overnight'] as const) {
      const r = quoteStay(33500, stay, pets, 2)
      assert.equal(r.platformFee + r.hostPayout, r.total)
      assert.equal(r.total % 500, 0)
    }
  }
  assert.throws(() => quoteStay(40000, 'full_day', 4))
})

test('fair range is +/-15%', () => {
  assert.deepEqual(fairRange(40000), [34000, 46000])
})

test('MP gets whole pesos, never minor units', () => {
  assert.equal(toMpAmount(pesosToMinor(120000), 'COP'), 120000)
  assert.throws(() => toMpAmount(12000050, 'COP'))
  assert.throws(() => pesosToMinor(1.5))
  assert.match(formatMoney(12000000, 'COP'), /120\.000/)
})
