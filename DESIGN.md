# DESIGN.md — Dogi

Source of truth: the five-page design of 2026-10-10
(https://claude.ai/artifact/WJYEt32jxc381VosF8czS4), copied to `design/*.dc.html` for
reference. Tokens flow design → this file → `src/app/globals.css` (`@theme`) → code.
Never hardcode a color, radius or size in a component; add the token here first.

## North star

A neighbour you trust with your dog. Calm forest green, warm amber for the one thing
that matters on a screen, lots of white, soft round corners. Plain Spanish first,
English second. Not crypto, not a fintech: no wallets, no jargon.

## Color

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F6F8F7` | page background |
| `surface` | `#FFFFFF` | cards, header, inputs |
| `sunk` | `#EEF4F0` | selected chip, quiet panels |
| `sunk-2` | `#E6ECE8` | track of meters, dividers on surface |
| `line` | `#DCE4DF` | hairlines (header, card edge) |
| `line-strong` | `#C9D6CF` | input and chip borders |
| `ink` | `#13261F` | headings, body |
| `ink-2` | `#2E4239` | secondary headings |
| `muted` | `#4F5F58` | supporting text (6.3:1 on canvas) |
| `brand` | `#1E5B45` | primary buttons, links, selected state |
| `brand-hover` | `#164735` | hover on brand |
| `brand-deep` | `#123B2C` | pressed, link hover |
| `brand-tint` | `#DDEBE2` | brand badges |
| `amber` | `#F2A93B` | the one highlight per screen: tier badge, stars, price |
| `amber-deep` | `#E39A1F` | amber hover |
| `amber-tint` | `#FCEBCB` | amber badge ground |
| `amber-ink` | `#6B4205` | text on amber-tint |

Text on `amber` is always `ink`, never white (white fails contrast).

## Type

- **Display:** Bricolage Grotesque 600/700/800 — `font-display`. Headlines 36–64px, tight tracking.
- **Body:** Figtree 400/500/600/700 — `font-sans`. Body 16px, small 14px, **12px is the floor**.

## Shape and depth

- Radii: `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `2xl` 28 · `full` for pills and chips.
- Cards: `surface` + 1px `line` + `shadow-card`. Popovers: `shadow-pop`.
- Shadows are green-tinted (`rgba(19,38,31,…)`), never pure black.

## Components

- Header: white, 1px bottom `line`, logo tile 36px `brand` with the paw icon.
- Primary button: `brand` fill, white text, `full` radius, 48px tall (44px min target).
- Secondary button: `surface`, 1px `line-strong`, `ink` text.
- Choice chip (space type, demand, energy…): 1px `line-strong`; selected = `brand` fill + white text, `aria-pressed`.
- Badges: pill, 12px+ semibold — tier badge on `amber-tint`/`amber-ink`, trust badge on `brand-tint`/`brand`.

## Do's and Don'ts

- Do keep one amber thing per screen.
- Do write prices in COP with `formatMoney` (es-CO, no decimals).
- Don't show wallets, chains or tokens anywhere in the UI.
- Don't go below 12px text or 44px touch targets; keep visible focus rings (`brand`, 2px offset).
- Respect `prefers-reduced-motion`.
