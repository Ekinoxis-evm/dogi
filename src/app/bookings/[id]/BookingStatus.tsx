'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/client/api'
import { formatMoney } from '@/lib/money'
import { PageSkeleton } from '../../pets/new/AuthGate'
import { SPACE_LABEL, STAY_LABEL, speciesLabel } from '../../pets/new/labels'

export type PaymentHint = 'success' | 'failure' | 'pending'

interface BookingData {
  viewer: 'parent' | 'host'
  booking: {
    id: string
    listingId: string
    stay: string
    dropoffAt: string
    pickupAt: string
    status: string
    baseMinor: number
    extraPetsMinor: number
    totalMinor: number
    platformFeeMinor: number
    currency: 'COP'
    listing: { neighbourhood: string; city: string; space: string } | null
    pets: { id: string; name: string; species: string }[]
  }
  payment: { status: string; method: string | null; updatedAt: string } | null
}

type PayState = 'paid' | 'confirming' | 'pending' | 'failed' | 'cancelled' | 'refunded' | 'unpaid'

const POLL_MS = 5_000
const POLL_FOR_MS = 120_000

function payState(d: BookingData, hint: PaymentHint | null): PayState {
  const s = d.booking.status
  const p = d.payment?.status
  if (['paid', 'in_stay', 'completed'].includes(s) || p === 'approved' || p === 'released_to_host') return 'paid'
  if (p === 'refunded') return 'refunded'
  if (s === 'cancelled' || s === 'declined') return 'cancelled'
  if (p === 'rejected') return 'failed'
  if (p === 'pending') return 'pending'
  if (hint === 'failure') return 'failed'
  if (hint === 'pending') return 'pending'
  if (hint === 'success') return 'confirming'
  return 'unpaid'
}

const METHOD: Record<string, string> = {
  pse: 'PSE',
  card: 'tarjeta',
  credit_card: 'tarjeta de crédito',
  debit_card: 'tarjeta débito',
  nequi: 'Nequi',
  efecty: 'Efecty',
  ticket: 'efectivo',
  bank_transfer: 'transferencia bancaria',
  account_money: 'saldo de Mercado Pago',
}

const when = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(iso))

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ok'; data: BookingData }

export default function BookingStatus({ id, hint }: { id: string; hint: PaymentHint | null }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [polling, setPolling] = useState(true)
  const [pollKey, setPollKey] = useState(0)
  const startedAt = useRef(0)

  const fetchOnce = useCallback(async (): Promise<BookingData | 'missing' | null> => {
    try {
      const res = await api(`/api/bookings/${id}`)
      if (res.status === 404) {
        setLoad({ state: 'missing' })
        return 'missing'
      }
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as BookingData
      setLoad({ state: 'ok', data })
      return data
    } catch {
      // keep showing the last good read while polling; only fail if we never had one
      setLoad((prev) => (prev.state === 'ok' ? prev : { state: 'error' }))
      return null
    }
  }, [id])

  // Poll every 5 s for up to 2 min until the webhook marks the booking paid.
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    startedAt.current = Date.now()

    const tick = async () => {
      const data = await fetchOnce()
      if (!alive) return
      const done = data === 'missing' || (data !== null && payState(data, hint) === 'paid')
      if (done || Date.now() - startedAt.current >= POLL_FOR_MS) {
        setPolling(false)
        return
      }
      timer = setTimeout(tick, POLL_MS)
    }
    void tick()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [fetchOnce, hint, pollKey])

  if (load.state === 'loading') return <PageSkeleton />
  if (load.state !== 'ok') {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold text-ink">
            {load.state === 'missing' ? 'No encontramos esta reserva' : 'No pudimos cargar tu reserva'}
          </h1>
          <p className="text-base text-muted">
            {load.state === 'missing'
              ? 'Revisa que entraste con la misma cuenta con la que reservaste.'
              : 'Revisa tu conexión. Si ya pagaste, tu pago no se pierde: vuelve a abrir esta página en un momento.'}
          </p>
        </div>
      </div>
    )
  }

  const { data } = load
  const b = data.booking
  const state = payState(data, hint)
  const host = data.viewer === 'host'
  const method = data.payment?.method ? METHOD[data.payment.method] ?? data.payment.method : null
  const petNames = b.pets.map((p) => p.name).join(' y ')
  const waiting = state === 'pending' || state === 'confirming'

  const copy: Record<PayState, { badge: string; badgeClass: string; title: string; body: React.ReactNode }> = {
    paid: {
      badge: 'Pagada',
      badgeClass: 'bg-brand-tint text-brand-hover',
      title: host ? 'Reserva pagada' : '¡Listo! Tu reserva está pagada',
      body: host
        ? `El pago está confirmado. Ya puedes ver el pasaporte completo de ${petNames}, con microchip y contacto de emergencia.`
        : `El anfitrión ya tiene el pasaporte de ${petNames}. Te esperamos el ${when(b.dropoffAt)}.`,
    },
    confirming: {
      badge: 'Confirmando',
      badgeClass: 'bg-sunk text-brand',
      title: 'Estamos confirmando tu pago',
      body: 'Mercado Pago nos dijo que el pago salió bien. Falta la confirmación final, que suele tardar unos segundos. No cierres ni pagues de nuevo.',
    },
    pending: {
      badge: 'Pago pendiente',
      badgeClass: 'bg-amber-tint text-amber-ink',
      title: 'Tu pago está pendiente',
      body: (
        <>
          Esto es normal con algunos medios de pago. <strong>Con PSE</strong>, el banco puede tardar unos minutos en confirmar.{' '}
          <strong>En efectivo (Efecty u otro punto)</strong>, la reserva queda pagada cuando hagas el pago en el punto y Mercado Pago lo
          confirme, normalmente en menos de 2 días hábiles. <strong>No pagues de nuevo</strong>: esta página se actualiza sola y te
          avisamos cuando se confirme.
        </>
      ),
    },
    failed: {
      badge: 'Pago no completado',
      badgeClass: 'bg-sunk-2 text-ink-2',
      title: 'El pago no se completó',
      body: 'Mercado Pago rechazó el pago o lo cancelaste antes de terminar. Puedes intentarlo de nuevo con otro medio de pago.',
    },
    cancelled: {
      badge: b.status === 'declined' ? 'No aceptada' : 'Cancelada',
      badgeClass: 'bg-sunk-2 text-ink-2',
      title: b.status === 'declined' ? 'El anfitrión no aceptó esta reserva' : 'Esta reserva fue cancelada',
      body: host ? 'No hay nada más que hacer con esta reserva.' : 'Busca otra estadía; hay más anfitriones cerca.',
    },
    refunded: {
      badge: 'Reembolsada',
      badgeClass: 'bg-sunk-2 text-ink-2',
      title: 'Este pago fue reembolsado',
      body: 'El dinero vuelve al medio con el que pagaste. Los tiempos dependen de tu banco o de Mercado Pago.',
    },
    unpaid: {
      badge: 'Sin pagar',
      badgeClass: 'bg-sunk-2 text-ink-2',
      title: 'Esta reserva todavía no está pagada',
      body: host ? 'Te avisamos cuando la familia pague.' : 'Si ya pagaste, espera un momento: esta página se actualiza sola.',
    },
  }
  const c = copy[state]

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pb-20 pt-10 sm:px-6">
      <section aria-live="polite" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-raised sm:p-8">
        <span className={`self-start rounded-full px-3 py-1 text-sm font-bold ${c.badgeClass}`}>{c.badge}</span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{c.title}</h1>
        <p className="text-base leading-relaxed text-ink-2 sm:text-lg">{c.body}</p>
        {method && state !== 'unpaid' && <p className="text-sm text-muted">Medio de pago: {method}</p>}
        {waiting && (
          <p className="text-sm font-semibold text-muted">
            {polling ? (
              'Revisando el estado cada 5 segundos…'
            ) : (
              <>
                Seguimos esperando la confirmación. Puedes cerrar esta página y volver más tarde.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPolling(true)
                    setPollKey((k) => k + 1)
                  }}
                  className="min-h-11 rounded-full border border-line-strong bg-surface px-4 font-bold text-ink hover:bg-sunk"
                >
                  Revisar de nuevo
                </button>
              </>
            )}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {!host && state === 'failed' && (
            <Link href={`/stays/${b.listingId}`} className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover hover:text-white">
              Intentar de nuevo
            </Link>
          )}
          {!host && state === 'cancelled' && (
            <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover hover:text-white">
              Buscar otra estadía
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="detail-h" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <h2 id="detail-h" className="font-display text-2xl font-bold text-ink">
          {STAY_LABEL[b.stay] ?? b.stay}
          {b.listing && ` en ${b.listing.neighbourhood}`}
        </h2>
        {b.listing && (
          <p className="text-base text-muted">
            {SPACE_LABEL[b.listing.space] ?? b.listing.space} · {b.listing.city}
          </p>
        )}
        <dl className="flex flex-col">
          <Row label="Llegada">{when(b.dropoffAt)}</Row>
          <Row label="Recogida">{when(b.pickupAt)}</Row>
          <Row label={b.pets.length === 1 ? 'Mascota' : 'Mascotas'}>
            <span className="flex flex-wrap justify-end gap-x-3 gap-y-1">
              {b.pets.map((p) => (
                <Link key={p.id} href={`/pets/${p.id}`} className="inline-flex min-h-11 items-center font-semibold">
                  {p.name} <span className="ml-1 font-normal text-muted">({speciesLabel(p.species).toLowerCase()})</span>
                </Link>
              ))}
            </span>
          </Row>
          <Row label="Estadía">{formatMoney(b.baseMinor, b.currency)}</Row>
          {b.extraPetsMinor > 0 && <Row label="Mascotas adicionales">{formatMoney(b.extraPetsMinor, b.currency)}</Row>}
          <Row label="Total" strong last>
            {formatMoney(b.totalMinor, b.currency)}
          </Row>
        </dl>
        <p className="text-sm text-muted">El total incluye la tarifa de servicio de Dogi ({formatMoney(b.platformFeeMinor, b.currency)}).</p>
      </section>
    </div>
  )
}

function Row({ label, strong, last, children }: { label: string; strong?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 py-3 text-base ${last ? '' : 'border-b border-sunk-2'}`}>
      <dt className={strong ? 'font-bold text-ink' : 'text-ink-2'}>{label}</dt>
      <dd className={`text-right ${strong ? 'text-lg font-bold text-ink' : 'text-ink'}`}>{children}</dd>
    </div>
  )
}
