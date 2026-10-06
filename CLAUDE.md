# Quacker — starter template

Full-stack teaching template: pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

The worked example is the quack feed: `Quack` model → seed → repository → service → `GET`/`POST /api/quacks` (DTO-validated, author taken from the session) → zod schema → TanStack Query → list page + post form. Copy its pattern for new features.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs, textareas and cards. [`DESIGN.md`](DESIGN.md) keeps shadows for things that genuinely float — dialogs, dropdowns, toasts. Strip them.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.

### Formatting

Run prettier from inside the workspace (`pnpm --filter backend exec prettier --write src`), not from the repo root. The root run uses a different config, and `check-all` then fails on `format:check`.

### Lint rules generated code trips over

- Boolean variables need an `is`/`has`/`should`/`can`/`did`/`will`/`does` prefix (`isTooShort`, not `tooShort`).
- `||` and `cond ? x : undefined` both trip `prefer-nullish-coalescing`. For "empty string means none", write `x === "" ? undefined : x`.

### Search and filter inputs

- Optional query params: a blank value means "not set", not "invalid". `@IsOptional()` only skips `undefined`/`null`, so a `?q=` that trims to `''` hits `@MinLength` and returns 400. In the `@Transform`, map a blank string to `undefined`.
- Test DTO transforms through the real pipe (`new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` with `pipe.transform(...)`), not by calling the service. The service never sees what the pipe rejects.
- Debounced inputs bound to the URL: a pending draft survives a change made from outside (e.g. clearing after a post) when the URL value doesn't change. Remount the input with a `key` instead of trying to sync the draft.
- With `placeholderData: keepPreviousData`, `isLoading` is false while stale data is shown. Pass `isLoading || isPlaceholderData` to the list, or a stale empty result shows "no matches" for the new term.
- Search terms are logged with the user id (see `story.md`). Treat that as a privacy decision when changing the log line.
