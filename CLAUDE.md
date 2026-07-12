# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server (Next.js, http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — run Next.js/ESLint

There is no test suite configured in this repo. Both ESLint and TypeScript errors are ignored during build (`next.config.js`: `eslint.ignoreDuringBuilds`, `typescript.ignoreBuildErrors`) — don't rely on `npm run build` to catch type errors; check `tsc` output or the editor directly if type-correctness matters.

Package manager: `package-lock.json` is the real lockfile (npm). A `pnpm-lock.yaml` also exists but is an empty stub — ignore it, use npm.

## Architecture

This is a Next.js (App Router) booking system for a karaoke business ("Alurfia Karaoke"). The core domain is a day-based room/time-slot schedule: customers pick a date, see a grid of rooms × time slots, and book contiguous slots.

### Two backends behind one route tree — proxy vs mock

Routes under `app/api/**` (e.g. `app/api/bookings`, `app/api/schedule`, `app/api/admin/**`, `app/api/user/**`) are **proxies**: they call an external backend at `process.env.API_PATH` with `process.env.API_KEY` in the `apikey` header, then reshape/return the response. They contain the actual business logic for combining rooms + bookings into a schedule (e.g. `app/api/schedule/route.ts`).

Routes under `app/api/mock/**` are a **parallel, self-contained fake backend** implementing the same resource shape (bookings, rooms, admin, promotions, user) but reading/writing local JSON files in `mock-data/*.json` via `lib/mockDb.ts` (`readCollection`/`writeCollection`/`genId`). There is no real database.

These two trees are wired together via env vars, not code: `.env` sets `API_PATH=http://localhost:3000/api/mock` for local dev, so the proxy routes end up calling the mock routes over HTTP on the same server. Pointing `API_PATH` at the real backend (e.g. `https://karaoke-backend-5ono.onrender.com`, see commented-out value in `.env`) switches the whole app to live data with no code changes. When adding a new resource/endpoint, mirror it in both trees if it needs to work in mock mode.

`config/apiKey.config.ts` also reads `API_KEY` directly (throws at import time if missing) and is used by some routes (e.g. `app/api/schedule`) instead of `process.env.API_KEY` directly — either form appears in the codebase.

### Schedule construction

`app/api/schedule/route.ts` is the most complex route: given a `date`, it fetches rooms and that day's bookings from the (proxied) backend, generates time slots via `lib/time-utils.ts#generateTimeSlots` (driven by `siteConfig.schedule.openTime/closeTime/slotDuration`), then cross-references bookings against slots to produce a `ScheduleData` (`rooms`, `timeSlots`, `bookings: TimeSlot[]`).

Because business hours cross midnight (open 12:00, close 01:00 next day), times are normalized to "minutes since open" via `timeToMinutes`, which adds 1440 to anything ≤ close time so overnight comparisons work — same overnight-handling pattern is duplicated in `lib/time-utils.ts` (`isTimeSlotPast`, `generateTimeSlots`). Bookings dated "tomorrow" but before close time are attributed to today's late-night slots; keep this in mind before changing date-matching logic.

### Pricing

`lib/time-utils.ts#calculatePrice` implements tiered/discounted pricing (rate decreases per additional hour, half-hour increments handled separately, optional peak-time multiplier). This is intentionally non-linear — don't "simplify" it without checking against real pricing expectations.

### Admin auth

Admin auth is a thin custom scheme, not a real auth framework: `lib/admin-service.ts` stores the logged-in admin (`admin_id`, `username`, etc.) in `localStorage`, and `hooks/use-admin-auth.ts` wraps it in React state. Authenticated admin requests pass `X-Admin-ID`/`X-Admin-Username` headers plus `admin_id`/`requesting_admin_id` duplicated into the body (see `makeAdminRequest` in `lib/admin-service.ts`). `middleware.ts` only handles a separate concern — site-wide maintenance-mode redirects — and explicitly skips `/admin`, `/api`, `/maintenance` paths; it does not enforce admin auth itself (that in-memory `maintenanceEnabled` flag also resets on server restart since there's no persistence).

### Config

`config/site-config.ts` (`siteConfig`) centralizes business info, PromptPay payment details, schedule/business hours, and theme colors — prefer adding new business-tunable values here over hardcoding in components.

### UI layer

Uses shadcn/ui conventions (`components.json`, `components/ui/*` are generated primitives — Radix + Tailwind). Feature components live flat under `components/` (e.g. `booking-modal.tsx`, `schedule-table.tsx`, `checkout-modal.tsx` for the customer flow) and under `components/admin/*` for the admin panel (tabs: dashboard, admins, rooms, promotions, bookings). Path alias `@/*` maps to repo root (see `tsconfig.json`).

### Types

`types/index.ts` is the single source of truth for shared domain types (`Room`, `TimeSlot`, `BookingRequest`, `ScheduleData`, `AdminUser`, `Promotion`, etc.). `Promotion` carries both current (`snake_case`) and "Legacy support" (`camelCase`) fields side by side — check which one a given call site actually reads before assuming a field is unused.
