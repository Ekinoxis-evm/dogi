'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { getAccessToken } from '@privy-io/react-auth'
import { formatMoney } from '@/lib/money'
import { SPACE_LABEL } from '../pets/new/labels'

const SUGGESTIONS = [
  'Busca estadías en Laureles',
  '¿Quién recibe gatos en El Poblado?',
  '¿Cuánto cuesta un día completo para 2 perros?',
  'Necesito dejar a mi perro esta noche',
]

// The Privy token is fetched per request, so a long session never sends a stale one.
const transport = new DefaultChatTransport({
  api: '/api/agent/chat',
  headers: async (): Promise<Record<string, string>> => {
    const token = await getAccessToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  },
})

export default function DogiChat() {
  const { messages, sendMessage, status, error, stop, clearError } = useChat({ transport })
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [messages, status])

  function send(text: string) {
    const t = text.trim()
    if (!t || busy) return
    if (error) clearError()
    void sendMessage({ text: t })
    setInput('')
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pb-6 pt-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Pregúntale a Dogi</h1>
        <p className="text-base text-muted">
          Busca estadías cerca de ti y pregunta cuánto cuestan. Dogi no reserva ni cobra: cuando estés listo, te lleva a la página del anfitrión.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6 shadow-card">
            <p className="text-base font-semibold text-ink-2">Prueba con una de estas:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-left text-base font-semibold text-ink hover:bg-sunk"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}

        {status === 'submitted' && <p className="text-sm font-semibold text-muted">Dogi está pensando…</p>}
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-tint p-4 text-base text-amber-ink">
            <span className="font-semibold">No pudimos hablar con Dogi. Revisa tu conexión o vuelve a entrar.</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="sticky bottom-4 flex gap-2 rounded-full border border-line-strong bg-surface p-1.5 shadow-pop"
      >
        <label htmlFor="chat-input" className="sr-only">
          Escribe tu pregunta
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej.: algo cerca de Envigado para el sábado"
          autoComplete="off"
          maxLength={1000}
          className="min-h-11 min-w-0 flex-1 rounded-full bg-transparent px-4 text-base text-ink placeholder:text-muted"
        />
        {busy ? (
          <button type="button" onClick={() => void stop()} className="min-h-11 rounded-full border border-line-strong bg-surface px-5 font-bold text-ink hover:bg-sunk">
            Detener
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} className="min-h-11 rounded-full bg-brand px-5 font-bold text-white hover:bg-brand-hover disabled:opacity-60">
            Enviar
          </button>
        )}
      </form>
    </div>
  )
}

function Message({ message }: { message: UIMessage }) {
  const mine = message.role === 'user'
  return (
    <div className={`flex flex-col gap-3 ${mine ? 'items-end' : 'items-start'}`}>
      <span className="sr-only">{mine ? 'Tú' : 'Dogi'}:</span>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          if (!part.text.trim()) return null
          return (
            <p
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-base leading-relaxed ${
                mine ? 'bg-brand text-white' : 'border border-line bg-surface text-ink'
              }`}
            >
              {part.text}
            </p>
          )
        }
        if (part.type === 'tool-searchStays') {
          if (part.state === 'output-available') return <StayResults key={i} output={part.output} />
          if (part.state === 'output-error') return <ToolNote key={i}>No pudimos buscar estadías ahora mismo.</ToolNote>
          return <ToolNote key={i}>Buscando estadías…</ToolNote>
        }
        if (part.type === 'tool-quote') {
          if (part.state === 'output-available') return <QuoteCard key={i} output={part.output} />
          if (part.state === 'output-error') return <ToolNote key={i}>No pudimos calcular el precio.</ToolNote>
          return <ToolNote key={i}>Calculando el precio…</ToolNote>
        }
        if (part.type === 'tool-myPets' && part.state !== 'output-available' && part.state !== 'output-error') {
          return <ToolNote key={i}>Revisando el pasaporte de tus mascotas…</ToolNote>
        }
        return null
      })}
    </div>
  )
}

function ToolNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-muted">{children}</p>
}

interface StayHit {
  id: string
  space: string
  city: string
  neighbourhood: string
  hourly_cop: number
  max_guests: number
}

function isStayHit(x: unknown): x is StayHit {
  const o = x as Partial<StayHit> | null
  return !!o && typeof o.id === 'string' && typeof o.hourly_cop === 'number' && typeof o.neighbourhood === 'string'
}

function StayResults({ output }: { output: unknown }) {
  const stays = Array.isArray(output) ? output.filter(isStayHit) : []
  if (stays.length === 0) return <ToolNote>No encontramos estadías con esos filtros.</ToolNote>
  return (
    <ul className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
      {stays.map((s) => (
        <li key={s.id}>
          <Link
            href={`/stays/${s.id}`}
            className="flex h-full min-h-11 flex-col gap-1 rounded-lg border border-line bg-surface p-4 text-ink shadow-card hover:bg-sunk hover:text-ink"
          >
            <strong className="text-base">{s.neighbourhood}</strong>
            <span className="text-sm text-muted">
              {SPACE_LABEL[s.space] ?? s.space} · {s.city}
            </span>
            <span className="mt-1 text-base font-bold text-brand">
              {formatMoney(Math.round(s.hourly_cop) * 100, 'COP')} <span className="text-sm font-semibold text-muted">/ hora</span>
            </span>
            <span className="text-sm text-muted">Hasta {s.max_guests} {s.max_guests === 1 ? 'mascota' : 'mascotas'}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

interface QuoteOut {
  base: number
  extraPets: number
  total: number
  platformFee: number
  hostPayout: number
}

function QuoteCard({ output }: { output: unknown }) {
  const q = output as Partial<QuoteOut> & { error?: string }
  if (!q || q.error || typeof q.total !== 'number') return <ToolNote>Esa estadía no está disponible para cotizar.</ToolNote>
  const cop = (pesos: number) => formatMoney(Math.round(pesos) * 100, 'COP')
  return (
    <dl className="flex w-full max-w-sm flex-col gap-2 rounded-lg border border-line bg-surface p-4 text-base shadow-card">
      <div className="flex justify-between gap-3">
        <dt className="text-ink-2">Estadía</dt>
        <dd className="text-ink">{cop(q.base ?? 0)}</dd>
      </div>
      {!!q.extraPets && (
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">Mascotas adicionales</dt>
          <dd className="text-ink">{cop(q.extraPets)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-2">
        <dt className="font-bold text-ink">Total</dt>
        <dd className="font-bold text-ink">{cop(q.total)}</dd>
      </div>
      <p className="text-sm text-muted">Incluye la tarifa de Dogi. El precio final se confirma en la página del anfitrión.</p>
    </dl>
  )
}
