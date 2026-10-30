-- Add extended profile fields for onboarding
alter table dogi.profiles
  add column if not exists last_name text,
  add column if not exists phone_country_code text default '+57',
  add column if not exists email text,
  add column if not exists onboarding_completed boolean not null default false;
