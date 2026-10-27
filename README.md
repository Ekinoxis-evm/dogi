# Dogi

Pet stays by the hour with verified neighbours — Laureles, Medellín first.
DogChain (2025, `../dogchain`) is the legacy version; Dogi is the app. Same idea, rebuilt without crypto.

- **Live (planned):** https://dogi.ekinoxis.xyz
- **Design:** https://claude.ai/artifact/WJYEt32jxc381VosF8czS4 (copies in `design/`), tokens in `DESIGN.md`
- **Stack:** Next.js 16 · Privy (email/Google login) · Supabase (schema `dogi`) · Mercado Pago marketplace · AI SDK 7 via AI Gateway

## How money moves

1. A host connects their own Mercado Pago account (OAuth + PKCE, `/api/mp/connect` → `/api/mp/callback`).
   Their token is AES-GCM encrypted (`DOGI_TOKEN_KEY`) in `dogi.payout_accounts`.
2. A parent books: `/api/bookings` prices the stay on the server (`src/lib/pricing.ts`),
   writes the booking, and creates a Checkout Pro preference **on the host's account**
   with `marketplace_fee` = Dogi's 10%.
3. The parent pays by card, PSE or Nequi. The host's 90% lands in the host's account;
   Dogi never holds it.
4. `/api/webhooks/mercadopago` verifies the signature (fail closed), reads the payment
   with the host's token, and moves the booking to `paid`. Late, out-of-order deliveries
   never move a payment backwards (`src/lib/mercadopago/webhook.ts`).

## Auth

Privy, not Supabase Auth. The browser sends the Privy access token; `requireUser()`
verifies it and maps the DID to `dogi.profiles`. All data access is server-side with the
service role. RLS denies by default; only live listings, amenities and reviews are public.

## Run

```bash
cp .env.example .env.local   # fill in
npm run dev
npm test                     # pricing + webhook unit tests
npm run typecheck
```

Supabase project **`dogi`** (`zzshpuletvmzhrnlhysm`, sa-east-1, org Ekinoxis labs). The
migration in `supabase/migrations/` is applied; `supabase db push` for new ones. The
`dogi` schema is exposed to the API in `supabase/config.toml` and on the `authenticator`
role (`pgrst.db_schemas`); after adding a table run `notify pgrst, 'reload schema'`.

## Before going live

- Create the Mercado Pago app as a **marketplace** with the Colombian merchant account,
  enable PKCE, set the redirect URI to `https://dogi.ekinoxis.xyz/api/mp/callback` and the
  webhook to `https://dogi.ekinoxis.xyz/api/webhooks/mercadopago` (topic: payments).
- Decide which entity is the merchant (Ekinoxis SAS BIC vs the US LLC) with the accountant.
- Add `dogi.ekinoxis.xyz` and `*.vercel.app` to Privy's allowed domains.
- Prices were converted from the design's USD at ~4,000 COP/USD — confirm them.
