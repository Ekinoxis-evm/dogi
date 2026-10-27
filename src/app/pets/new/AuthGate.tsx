'use client'

import { usePrivy } from '@privy-io/react-auth'

// Shared by /pets/new, /pets/[id], /chat and /bookings/[id]. Renders children only once
// Privy says the visitor is signed in. Belongs in src/components once someone owns it.
export function AuthGate({ children, reason }: { children: React.ReactNode; reason: string }) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <Panel>
        <h1 className="font-display text-2xl font-bold text-ink">El inicio de sesión no está configurado</h1>
        <p className="text-muted">Falta NEXT_PUBLIC_PRIVY_APP_ID en este entorno.</p>
      </Panel>
    )
  }
  return <Gate reason={reason}>{children}</Gate>
}

function Gate({ children, reason }: { children: React.ReactNode; reason: string }) {
  const { ready, authenticated, login } = usePrivy()
  if (!ready) return <PageSkeleton />
  if (!authenticated) {
    return (
      <Panel>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Entra para continuar</h1>
        <p className="text-base text-muted">{reason}</p>
        <button
          type="button"
          onClick={() => login()}
          className="min-h-12 self-start rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover"
        >
          Entrar con correo o Google
        </button>
      </Panel>
    )
  }
  return <>{children}</>
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-8 shadow-card">{children}</div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-6" aria-busy="true" aria-label="Cargando">
      <div className="h-10 w-64 animate-pulse rounded-md bg-sunk-2 motion-reduce:animate-none" />
      <div className="h-48 animate-pulse rounded-xl bg-sunk-2 motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-xl bg-sunk-2 motion-reduce:animate-none" />
    </div>
  )
}
