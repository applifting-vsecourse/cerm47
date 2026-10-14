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

The Windows working tree is CRLF (`core.autocrlf=true`), but prettier writes LF. Running `prettier --write src` over a whole workspace flips every file, and VS Code then shows 100+ changed files while `git diff` shows almost nothing. Format only the files you touched, listed by name (`prettier --write <files>`). A directory argument is the same mistake, even a small one like `src/modules/quack`: it also rewrites the untouched siblings (it flipped the seed scripts to LF once). Then put CRLF back on them (`sed -i 's/$/\r/' <file>`; skip files that already have it). Judge what changed by `git status --short`, which is what VS Code shows, not by `git diff` alone.

Files made with the Write tool are LF, so new files need the same CRLF pass. To check formatting on your own files, tell prettier what the tree uses: `prettier --check --end-of-line crlf <files>`.

### `pnpm check-all` does not pass on this Windows machine

Two failures that have nothing to do with your change, so don't chase them:

- `frontend lint:check` (and the `frontend build`, whose Vite lint plugin runs the same command) pass the glob in single quotes, which Windows does not strip: "No files matching the pattern". Run the steps yourself with double quotes: `npx eslint "./src/**/*.{ts,tsx,js,cjs,mjs}"` and `npx tsc --noEmit` and `npx vitest run` in `apps/frontend`. The production bundle is then not built here.
- `format:check` flags every file (100+ in the frontend) because the tree is CRLF and prettier expects LF. Use the `--end-of-line crlf` check above on the files you changed.

Say in your report which checks you ran by hand, so nobody reads "check-all passed" into it.

### Features don't import each other

ESLint (`import/no-restricted-paths`) forbids `src/features/a` importing from `src/features/b`. When two features need the same thing, put it in `src/lib` (schemas, constants, helpers) or `src/components` (shared UI such as `MoodPicker`); it may not import from features. Wire features together from `src/routes`, which may import any feature, by passing props and callbacks (`QuackForm` gets `defaultMood` from the quacks page; the settings page invalidates the quack list through `onSaved`). Don't reach for a second copy of a control because it lives in another feature.

### Adding a field to the user

The user is a BetterAuth user (a black box), so extra profile fields go through its config, not a custom endpoint:

1. `schema.prisma`: add the column to `User` and write the migration by hand under `prisma/migrations/` (apply with `prisma migrate deploy`).
2. `better-auth.config.ts`: add it to `user.additionalFields` with `input: true` and a `validator.input` (a Standard Schema, see `profile-fields.ts`). That is the server-side validation, and BetterAuth returns it as a 400.
3. `auth-client.ts`: declare the same field in `inferAdditionalFields`.
4. `authSessionQueryOptions.ts`: map it into `SessionUser` (parse enums, don't trust the string).
5. Save with `authClient.updateUser`, sending only the changed fields. Put field-specific server errors (e.g. `USERNAME_IS_ALREADY_TAKEN`) next to their input; the `code` is on the error.

### Lint rules generated code trips over

- Boolean variables need an `is`/`has`/`should`/`can`/`did`/`will`/`does` prefix (`isTooShort`, not `tooShort`). This includes parameters and props: `onOpenChange={(next) => …}` fails, `(isNextOpen) => …` passes.
- `||` and `cond ? x : undefined` both trip `prefer-nullish-coalescing`. For "empty string means none", write `x === "" ? undefined : x`.

### Search and filter inputs

- Optional query params: a blank value means "not set", not "invalid". `@IsOptional()` only skips `undefined`/`null`, so a `?q=` that trims to `''` hits `@MinLength` and returns 400. In the `@Transform`, map a blank string to `undefined`.
- Test DTO transforms through the real pipe (`new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` with `pipe.transform(...)`), not by calling the service. The service never sees what the pipe rejects.
- Debounced inputs bound to the URL: a pending draft survives a change made from outside (e.g. clearing after a post) when the URL value doesn't change. Remount the input with a `key` instead of trying to sync the draft.
- With `placeholderData: keepPreviousData`, `isLoading` is false while stale data is shown. Pass `isLoading || isPlaceholderData` to the list, or a stale empty result shows "no matches" for the new term.
- Search terms are logged with the user id (see `story.md`). Treat that as a privacy decision when changing the log line.

### Hand-written migrations

Let Prisma write the SQL, then save it yourself: `pnpm --filter backend exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`. It diffs the dev database against `schema.prisma`, so run it before `migrate deploy`. Copy the output into `prisma/migrations/<timestamp>_<name>/migration.sql` (CRLF, like the other files) and drop the `Loaded Prisma config` line the CLI prints first.

### Rules the database keeps (polls)

The backend tests mock the repository, so they cannot prove anything the database guarantees: unique keys, composite foreign keys, row locks. Put those rules in the schema or the transaction, and keep derived numbers (vote counts) counted on every read, never stored.

To check a lock or a race, write a throwaway script that calls the real repository against the dev database with temporary users and quacks, and delete them afterwards. Then break the guard on purpose (remove the `FOR SHARE`) and check the script fails; a race script that never overlaps the two requests passes without proving anything. Don't commit the script.

### Optimistic updates

The pattern is `useVotePoll` in `features/quack/hooks`. A pure function (`withVote` in `lib/pollMath.ts`) computes the new state so it can be unit tested. `onMutate` cancels the list queries, snapshots them with `getQueriesData`, and writes the guess into every cached list with `setQueriesData` (the item can sit in the feed and in searches). `onError` restores the snapshot. `onSettled` invalidates, but only when `isMutating({ mutationKey }) <= 1`, so a refetch cannot overwrite a click that is still queued. `scope: { id }` queues the mutations of one item, which keeps quick clicks in order. Turn a status the UI must word differently (409 "closed") into a named error in `api/`, so components never import the HTTP client.

### Frontend test pitfalls

- `beforeEach(() => mock.mockReset())` returns the mock, and vitest calls a function returned from a hook as teardown. That calls your mock after the test and awaits its result, which shows up as a 10 s "Hook timed out" or a rejection blamed on the wrong test. Use braces: `beforeEach(() => { mock.mockReset() })`.
- Test a component that reads the query cache through a small feed component that renders from the cache (`features/quack/components/pollTestHarness.tsx`). Rendering it with props only cannot show an optimistic update or a rollback.
- `noUncheckedIndexedAccess` is on, so `mock.calls[0][0]` does not type-check in tests. Use a small `nth(items, i)` helper that throws.
