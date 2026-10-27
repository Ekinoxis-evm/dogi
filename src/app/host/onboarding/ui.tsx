'use client'

import { formatMoney, pesosToMinor } from '@/lib/money'

/** Whole pesos → "$ 38.000" */
export const cop = (pesos: number) => formatMoney(pesosToMinor(pesos), 'COP')

export const inputCls =
  'min-h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base font-normal text-ink'
export const labelCls = 'flex flex-col gap-2 text-base font-bold text-ink'
export const btnPrimary =
  'inline-flex min-h-13 items-center justify-center rounded-full bg-brand px-7 text-base font-bold text-surface hover:bg-brand-hover active:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50'
export const btnSecondary =
  'inline-flex min-h-13 items-center justify-center rounded-full border border-line-strong bg-surface px-6 text-base font-bold text-ink hover:bg-sunk disabled:cursor-not-allowed disabled:opacity-50'

export function StepHeader({ title, lead }: { title: string; lead: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 tabIndex={-1} className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-lg leading-relaxed text-muted">{lead}</p>
    </div>
  )
}

export function Card({ children }: { children: React.ReactNode }) {
  return <section className="flex flex-col gap-6 rounded-xl bg-surface p-5 shadow-card sm:p-9">{children}</section>
}

export function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-full border-[1.5px] px-4 text-base font-semibold transition-colors ${
        pressed ? 'border-brand bg-brand text-surface hover:bg-brand-hover' : 'border-line-strong bg-surface text-ink hover:bg-sunk'
      }`}
    >
      {children}
    </button>
  )
}

export function Stepper({
  value,
  onDec,
  onInc,
  decLabel,
  incLabel,
  canDec,
  canInc,
}: {
  value: React.ReactNode
  onDec: () => void
  onInc: () => void
  decLabel: string
  incLabel: string
  canDec: boolean
  canInc: boolean
}) {
  const b =
    'flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface text-2xl text-ink hover:bg-sunk disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex items-center gap-3.5">
      <button type="button" className={b} onClick={onDec} disabled={!canDec} aria-label={decLabel}>
        −
      </button>
      <strong className="min-w-16 text-center text-2xl" aria-live="polite">
        {value}
      </strong>
      <button type="button" className={b} onClick={onInc} disabled={!canInc} aria-label={incLabel}>
        +
      </button>
    </div>
  )
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5.5 flex-none accent-brand" />
      {children}
    </label>
  )
}

export function Icon({ d, className = 'size-7 text-brand' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  )
}

export const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5'
export const LOCK_PATH = 'M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM8 10V7a4 4 0 0 1 8 0v3'
