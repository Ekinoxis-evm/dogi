'use client'

import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { PawLogo } from './PawLogo'

export default function Header() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label="Dogi, inicio" className="hover:no-underline">
          <PawLogo />
        </Link>
        <nav className="flex items-center gap-2 text-[15px] font-semibold">
          <Link href="/onboarding" className="hidden rounded-full px-4 py-2.5 text-ink hover:bg-sunk hover:no-underline sm:inline-block">
            Mi registro
          </Link>
          <Link href="/host/onboarding" className="hidden rounded-full px-4 py-2.5 text-ink hover:bg-sunk hover:no-underline sm:inline-block">
            Hospeda mascotas
          </Link>
          <Link href="/chat" className="hidden rounded-full px-4 py-2.5 text-ink hover:bg-sunk hover:no-underline sm:inline-block">
            Pregúntale a Dogi
          </Link>
          <Account />
        </nav>
      </div>
    </header>
  )
}

function Account() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return null
  return <AccountButton />
}

function AccountButton() {
  const { ready, authenticated, login, logout } = usePrivy()
  if (!ready) return <span className="inline-block h-11 w-24" aria-hidden="true" />
  return authenticated ? (
    <button onClick={logout} className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-ink hover:bg-sunk">
      Salir
    </button>
  ) : (
    <button onClick={login} className="min-h-11 rounded-full bg-brand px-5 text-white hover:bg-brand-hover">
      Entrar
    </button>
  )
}
