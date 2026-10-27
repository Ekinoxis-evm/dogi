-- Dogi -- initial schema (2026-10-27). NOT APPLIED to any project yet.
--
-- Source: the five-page design of 2026-10-10 (Home, Host onboarding, Pet passport,
-- Host profile, Pet guest profile) -- https://claude.ai/artifact/WJYEt32jxc381VosF8czS4
--
-- Auth model: login is Privy, not Supabase Auth, so auth.uid() does not exist here.
-- The Next.js server verifies the Privy access token, maps the Privy DID to
-- dogi.profiles.privy_did, and reads/writes with the service role. RLS is enabled on
-- every table and denies by default; the only policies are public SELECTs on what an
-- anonymous visitor may see (amenities, live listings, their photos, reviews).
--
-- Money: integer minor units + ISO currency. COP has no cents in practice, so
-- 45.000 COP is amount_minor = 4500000 with currency 'COP' (2 implied decimals),
-- which keeps USD and COP in one column type. Mercado Pago takes whole pesos, so the
-- checkout divides by 100 (src/lib/money.ts) -- never send minor units to MP.
--
-- Payments: Mercado Pago marketplace (split 1:1). Each host connects their own MP
-- account by OAuth; the preference is created with the host's token and a
-- marketplace_fee, so the host's 90% lands in the host's account and Dogi never
-- holds it. Tokens live in dogi.payout_accounts, encrypted by the app.

create schema if not exists dogi;

-- -- Enums ---------------------------------------------------------------------
create type dogi.space_type      as enum ('apartment_pet_room', 'house_no_yard', 'house_with_yard', 'dedicated_pet_space');
create type dogi.demand_level    as enum ('low', 'standard', 'high');          -- x 0.85 / 1.0 / 1.2
create type dogi.listing_status  as enum ('draft', 'pending_check', 'live', 'paused', 'rejected');
create type dogi.species         as enum ('dog', 'cat', 'small_pet');
create type dogi.tri_state       as enum ('yes', 'unsure', 'no');
create type dogi.pet_sex         as enum ('female', 'male');
create type dogi.stay_length     as enum ('drop_in', 'half_day', 'full_day', 'overnight');
create type dogi.min_stay        as enum ('one_hour', 'two_hours', 'half_day');
create type dogi.notice          as enum ('two_hours', 'same_day', 'one_day');
create type dogi.booking_status  as enum ('requested', 'accepted', 'declined', 'cancelled', 'paid', 'in_stay', 'completed', 'disputed');
create type dogi.pay_provider    as enum ('mercadopago', 'wompi', 'stripe');
create type dogi.payment_status  as enum ('pending', 'approved', 'rejected', 'refunded', 'released_to_host');

-- -- People --------------------------------------------------------------------
create table dogi.profiles (
  id                 uuid primary key default gen_random_uuid(),
  privy_did          text not null unique,                  -- did:privy:...
  wallet_address     text,                                  -- Privy embedded wallet, used by the agent
  first_name         text,
  phone              text,
  photo_url          text,
  intro              text check (char_length(intro) <= 1200),
  city               text,
  neighbourhood      text,
  locale             text not null default 'es' check (locale in ('es', 'en')),
  is_host            boolean not null default false,
  id_verified_at     timestamptz,                           -- government ID + selfie
  first_aid_cert_url text,                                  -- needed for the Trusted tier
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- -- Host side -----------------------------------------------------------------
create table dogi.amenities (
  id                text primary key,                       -- 'fenced_yard', 'walks', ...
  label_en          text not null,
  label_es          text not null,
  add_per_hour_cop  integer not null check (add_per_hour_cop >= 0),   -- whole pesos
  sort              smallint not null default 0
);

-- Design prices were USD; converted at ~4,000 COP/USD for the Colombia launch.
insert into dogi.amenities (id, label_en, label_es, add_per_hour_cop, sort) values
  ('fenced_yard',   'Fenced yard',           'Patio cerrado',              6000, 1),
  ('walks',         'Walks included',        'Paseos incluidos',           5000, 2),
  ('live_camera',   'Live camera',           U&'C\00e1mara en vivo',             4000, 3),
  ('first_aid',     'Pet first-aid trained', 'Primeros auxilios',          3000, 4),
  ('climate',       'Climate controlled',    'Clima controlado',           2000, 5),
  ('quiet_room',    'Quiet rest room',       'Cuarto de descanso',         2000, 6),
  ('meds_diets',    'Meds & special diets',  'Medicinas y dietas',         2000, 7),
  ('vet_nearby',    'Vet nearby',            'Veterinaria cerca',          1000, 8);

create table dogi.listings (
  id                   uuid primary key default gen_random_uuid(),
  host_id              uuid not null references dogi.profiles (id) on delete cascade,
  status               dogi.listing_status not null default 'draft',
  space                dogi.space_type not null,
  area_m2              smallint check (area_m2 between 1 and 10000),
  city                 text not null,
  neighbourhood        text not null,
  other_pets_at_home   text,
  -- who can stay
  accepts_small_dogs   boolean not null default true,       -- < 10 kg
  accepts_medium_dogs  boolean not null default true,       -- 10-25 kg
  accepts_large_dogs   boolean not null default false,
  accepts_cats         boolean not null default false,
  accepts_puppies      boolean not null default false,
  accepts_seniors      boolean not null default true,
  max_guests           smallint not null default 1 check (max_guests between 1 and 3),
  earliest_dropoff     time not null default '07:00',
  latest_pickup        time not null default '21:00',
  min_stay             dogi.min_stay not null default 'one_hour',
  notice               dogi.notice not null default 'two_hours',
  requires_vaccines    boolean not null default true,
  requires_meet_greet  boolean not null default false,
  requires_neutered    boolean not null default false,
  -- pricing: hourly = (space base + amenities) x demand, then the host's +/-15% adjustment
  demand               dogi.demand_level not null default 'standard',
  price_adjust_pct     smallint not null default 0 check (price_adjust_pct between -15 and 15 and price_adjust_pct % 5 = 0),
  hourly_minor         bigint not null check (hourly_minor > 0),   -- frozen at publish time
  currency             char(3) not null default 'COP',
  late_pickup_minor    bigint,                                     -- per 30 min
  space_checked_at     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index listings_host_idx on dogi.listings (host_id);
create index listings_live_city_idx on dogi.listings (city, neighbourhood) where status = 'live';

create table dogi.listing_amenities (
  listing_id  uuid not null references dogi.listings (id) on delete cascade,
  amenity_id  text not null references dogi.amenities (id),
  detail      text,                                          -- "1.8 m, fully enclosed"
  primary key (listing_id, amenity_id)
);
create index listing_amenities_amenity_idx on dogi.listing_amenities (amenity_id);

create table dogi.listing_photos (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references dogi.listings (id) on delete cascade,
  path        text not null,                                 -- storage path in the dogi-photos bucket
  caption     text,
  sort        smallint not null default 0
);
create index listing_photos_listing_idx on dogi.listing_photos (listing_id, sort);

-- -- Pet side (the "pet passport") ---------------------------------------------
create table dogi.pets (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references dogi.profiles (id) on delete cascade,
  species               dogi.species not null,
  name                  text not null,
  breed                 text,
  birthday              date,
  weight_kg             numeric(5,2) check (weight_kg > 0),
  sex                   dogi.pet_sex,
  neutered              boolean,
  microchip             text,                                -- shown to a host only during a confirmed stay
  photo_url             text,
  energy                smallint check (energy between 1 and 5),   -- Couch ... Athlete
  good_with_dogs        dogi.tri_state not null default 'unsure',
  good_with_cats        dogi.tri_state not null default 'unsure',
  good_with_kids        dogi.tri_state not null default 'unsure',
  watch_outs            text[] not null default '{}',        -- 'anxious_alone', 'pulls_leash', 'loud_noises', 'guards_food', 'climbs_fences'
  notes                 text,
  meals                 text,
  walks                 text,
  potty                 text,
  sleep                 text,
  calming               text,
  medication            text,
  allergies             text,
  vet_clinic            text,
  vet_phone             text,
  emergency_contact     text,
  emergency_vet_cap_minor bigint,                            -- authorised spend, e.g. $300
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index pets_owner_idx on dogi.pets (owner_id);

create table dogi.pet_vaccines (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references dogi.pets (id) on delete cascade,
  vaccine      text not null,                               -- 'rabies', 'dhpp', 'bordetella', 'fvrcp', ...
  valid_until  date,
  record_path  text,                                        -- private storage path
  unique (pet_id, vaccine)
);

-- -- Bookings and money --------------------------------------------------------
create table dogi.bookings (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references dogi.listings (id),
  host_id             uuid not null references dogi.profiles (id),
  parent_id           uuid not null references dogi.profiles (id),
  stay                dogi.stay_length not null,
  dropoff_at          timestamptz not null,
  pickup_at           timestamptz not null,
  status              dogi.booking_status not null default 'requested',
  -- price breakdown frozen at request time
  base_minor          bigint not null check (base_minor >= 0),
  extra_pets_minor    bigint not null default 0 check (extra_pets_minor >= 0),  -- +60% per extra pet
  total_minor         bigint not null check (total_minor >= 0),
  platform_fee_minor  bigint not null check (platform_fee_minor >= 0),          -- 10% of total
  host_payout_minor   bigint not null check (host_payout_minor >= 0),           -- 90% of total
  currency            char(3) not null default 'COP',
  parent_note         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (pickup_at > dropoff_at),
  check (host_id <> parent_id),
  check (platform_fee_minor + host_payout_minor = total_minor)
);
create index bookings_listing_idx on dogi.bookings (listing_id, dropoff_at);
create index bookings_host_idx on dogi.bookings (host_id, status);
create index bookings_parent_idx on dogi.bookings (parent_id, status);

create table dogi.booking_pets (
  booking_id  uuid not null references dogi.bookings (id) on delete cascade,
  pet_id      uuid not null references dogi.pets (id),
  primary key (booking_id, pet_id)
);
create index booking_pets_pet_idx on dogi.booking_pets (pet_id);

-- A host's connected payout account. Tokens are AES-256-GCM ciphertext produced by the
-- app (DOGI_TOKEN_KEY); the database never sees them in clear. No policy, no grant to
-- anon/authenticated: only the service role can read this table.
create table dogi.payout_accounts (
  profile_id         uuid primary key references dogi.profiles (id) on delete cascade,
  provider           dogi.pay_provider not null default 'mercadopago',
  provider_user_id   text not null,                          -- MP user_id of the host
  access_token_enc   text not null,
  refresh_token_enc  text,
  public_key         text,
  live_mode          boolean not null,
  expires_at         timestamptz not null,                   -- MP OAuth tokens last 180 days
  connected_at       timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (provider, provider_user_id)
);

-- Provider-agnostic shape; Mercado Pago is the provider for launch.
create table dogi.payments (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references dogi.bookings (id),
  provider        dogi.pay_provider not null,
  provider_ref    text not null,                             -- payment / transaction / PaymentIntent id
  status          dogi.payment_status not null default 'pending',
  amount_minor    bigint not null check (amount_minor >= 0),
  currency        char(3) not null,
  marketplace_fee_minor bigint not null default 0 check (marketplace_fee_minor >= 0),  -- Dogi's cut
  method          text,                                      -- 'card', 'pse', 'nequi', ...
  raw             jsonb,                                     -- last webhook payload, for audit
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (provider, provider_ref)                            -- makes webhook handling idempotent
);
create index payments_booking_idx on dogi.payments (booking_id);

create table dogi.messages (
  id          bigint generated always as identity primary key,
  booking_id  uuid not null references dogi.bookings (id) on delete cascade,
  sender_id   uuid not null references dogi.profiles (id),
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index messages_booking_idx on dogi.messages (booking_id, created_at);

-- -- Reputation ----------------------------------------------------------------
-- Reviews only come from completed, paid stays: one per booking per direction.
create table dogi.host_reviews (
  booking_id     uuid primary key references dogi.bookings (id) on delete cascade,
  host_id        uuid not null references dogi.profiles (id),
  author_id      uuid not null references dogi.profiles (id),
  pet_care       smallint not null check (pet_care between 1 and 5),        -- 30%
  safety         smallint not null check (safety between 1 and 5),          -- 25%
  communication  smallint not null check (communication between 1 and 5),   -- 20%
  accuracy       smallint not null check (accuracy between 1 and 5),        -- 15%
  cleanliness    smallint not null check (cleanliness between 1 and 5),     -- 10%
  body           text,
  created_at     timestamptz not null default now()
);
create index host_reviews_host_idx on dogi.host_reviews (host_id);

create table dogi.guest_reviews (
  booking_id      uuid not null references dogi.bookings (id) on delete cascade,
  pet_id          uuid not null references dogi.pets (id),
  author_id       uuid not null references dogi.profiles (id),             -- the host
  behaviour       smallint not null check (behaviour between 1 and 5),
  passport_match  smallint not null check (passport_match between 1 and 5),
  on_time_pickup  smallint not null check (on_time_pickup between 1 and 5),
  communication   smallint not null check (communication between 1 and 5),
  body            text,
  created_at      timestamptz not null default now(),
  primary key (booking_id, pet_id)
);
create index guest_reviews_pet_idx on dogi.guest_reviews (pet_id);

-- Paw Score: weighted 30/25/20/15/10. Tier rules live in app code for now so they can
-- be tuned without a migration (New Host -> Rising -> Trusted -> Pack Leader).
create view dogi.host_scores with (security_invoker = true) as
select host_id,
       count(*)                                            as reviews,
       round(avg(pet_care * 0.30 + safety * 0.25 + communication * 0.20
                 + accuracy * 0.15 + cleanliness * 0.10), 2) as paw_score
from dogi.host_reviews
group by host_id;

-- Good Guest record: plain average of the four host ratings.
create view dogi.pet_scores with (security_invoker = true) as
select pet_id,
       count(*)                                                                  as stays,
       round(avg((behaviour + passport_match + on_time_pickup + communication) / 4.0), 2) as guest_score
from dogi.guest_reviews
group by pet_id;

-- -- Agent chat (ported from the AgentKit version) -----------------------------
create table dogi.agent_messages (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references dogi.profiles (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'tool')),
  content     jsonb not null,
  created_at  timestamptz not null default now()
);
create index agent_messages_profile_idx on dogi.agent_messages (profile_id, created_at);

-- -- updated_at ----------------------------------------------------------------
create function dogi.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on dogi.profiles for each row execute function dogi.touch_updated_at();
create trigger listings_touch before update on dogi.listings for each row execute function dogi.touch_updated_at();
create trigger pets_touch     before update on dogi.pets     for each row execute function dogi.touch_updated_at();
create trigger bookings_touch before update on dogi.bookings for each row execute function dogi.touch_updated_at();
create trigger payments_touch before update on dogi.payments for each row execute function dogi.touch_updated_at();
create trigger payout_accounts_touch before update on dogi.payout_accounts for each row execute function dogi.touch_updated_at();

-- -- Row-level security: deny by default ---------------------------------------
alter table dogi.profiles          enable row level security;
alter table dogi.amenities         enable row level security;
alter table dogi.listings          enable row level security;
alter table dogi.listing_amenities enable row level security;
alter table dogi.listing_photos    enable row level security;
alter table dogi.pets              enable row level security;
alter table dogi.pet_vaccines      enable row level security;
alter table dogi.bookings          enable row level security;
alter table dogi.booking_pets      enable row level security;
alter table dogi.payments          enable row level security;
alter table dogi.payout_accounts   enable row level security;
alter table dogi.messages          enable row level security;
alter table dogi.host_reviews      enable row level security;
alter table dogi.guest_reviews     enable row level security;
alter table dogi.agent_messages    enable row level security;

-- What an anonymous visitor may browse. Everything else goes through the server.
create policy amenities_public on dogi.amenities for select to anon, authenticated using (true);
create policy listings_public  on dogi.listings  for select to anon, authenticated using (status = 'live');
create policy listing_amenities_public on dogi.listing_amenities for select to anon, authenticated
  using (exists (select 1 from dogi.listings l where l.id = listing_id and l.status = 'live'));
create policy listing_photos_public on dogi.listing_photos for select to anon, authenticated
  using (exists (select 1 from dogi.listings l where l.id = listing_id and l.status = 'live'));
create policy host_reviews_public on dogi.host_reviews for select to anon, authenticated using (true);

grant usage on schema dogi to anon, authenticated, service_role;
grant select on dogi.amenities, dogi.listings, dogi.listing_amenities, dogi.listing_photos,
                dogi.host_reviews, dogi.host_scores to anon, authenticated;
grant all on all tables in schema dogi to service_role;
grant all on all sequences in schema dogi to service_role;
