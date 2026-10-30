import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COUNTRY_CODES } from '../src/app/onboarding/types.ts'
import { fairRange, hourlyRate, quoteStay, suggestedHourly } from '../src/lib/pricing.ts'

test('onboarding country codes includes Colombia as default and valid codes', () => {
  assert.equal(COUNTRY_CODES[0].code, '+57')
  assert.equal(COUNTRY_CODES[0].flag, '🇨🇴')
  assert.ok(COUNTRY_CODES.some((c) => c.code === '+1'))
  assert.ok(COUNTRY_CODES.some((c) => c.code === '+34'))
  assert.ok(COUNTRY_CODES.some((c) => c.code === '+52'))
})

test('onboarding night price definition matches Dogi pricing rules', () => {
  // House with yard, no amenities, standard demand
  const hourly = suggestedHourly('house_with_yard', [], 'standard')
  assert.equal(hourly, 38000)

  // Overnight stay quote
  const nightQuote = quoteStay(hourly, 'overnight', 1)
  assert.equal(nightQuote.total, 209000)
  // Host payout is 90% rounded to nearest 500 COP
  assert.equal(nightQuote.hostPayout, 188000)
  assert.equal(nightQuote.platformFee, 21000)
  assert.equal(nightQuote.hostPayout + nightQuote.platformFee, nightQuote.total)

  // Adjustment within fair range +/- 15%
  const adjustedHourly = hourlyRate(hourly, 10)
  const adjustedNight = quoteStay(adjustedHourly, 'overnight', 1)
  const [minNight, maxNight] = fairRange(nightQuote.total)

  assert.ok(adjustedNight.total >= minNight)
  assert.ok(adjustedNight.total <= maxNight)
})
