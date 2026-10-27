'use client'

import { PrivyProvider } from '@privy-io/react-auth'

// Email, Google and passkeys: Dogi users are pet parents, not crypto users. No embedded
// wallet is created -- payments are fiat through Mercado Pago.
export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  if (!appId) return <>{children}</>
  return (
    <PrivyProvider
      appId={appId}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined}
      config={{
        loginMethods: ['email', 'google', 'passkey'],
        appearance: { theme: 'light', accentColor: '#1E5B45', logo: '/icon.svg', landingHeader: 'Entra a Dogi' },
        embeddedWallets: { ethereum: { createOnLogin: 'off' } },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
