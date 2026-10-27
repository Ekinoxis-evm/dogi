import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthGate } from '../../pets/new/AuthGate'
import BookingStatus, { type PaymentHint } from './BookingStatus'

export const metadata: Metadata = { title: 'Tu reserva', robots: { index: false } }

const HINTS: PaymentHint[] = ['success', 'failure', 'pending']

// Mercado Pago sends the buyer back here with ?payment=success|failure|pending. The hint
// only shapes the first message; the booking and payment rows are the truth.
type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// params/searchParams are request data under Cache Components: read them inside Suspense.
export default function BookingPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <Booking {...props} />
    </Suspense>
  )
}

async function Booking({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const raw = Array.isArray(sp.payment) ? sp.payment[0] : sp.payment
  const hint = HINTS.find((h) => h === raw) ?? null
  return (
    <AuthGate reason="Entra con la misma cuenta con la que reservaste para ver el estado de tu pago.">
      <BookingStatus id={id} hint={hint} />
    </AuthGate>
  )
}
