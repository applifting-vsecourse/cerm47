# Replies on quacks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People can reply to a quack and see the replies under it. Deleting a quack that has replies leaves an anonymous, empty tombstone, so the replies stay and the quack's content is gone.

**Architecture:** A new `reply` table points at `quack` with `ON DELETE RESTRICT`. A quack with replies is deleted into a tombstone (`userId` null, text empty, poll removed, `deletedAt` set) inside one transaction that locks the quack row. Replies and the delete logic live in the existing `quack` backend module and `quack` frontend feature, because a reply is part of a quack and features may not import each other.

**Tech Stack:** NestJS, Prisma 7, Postgres, Jest · React, Vite, TanStack Query/Router, zod, ky, Vitest, Playwright.

**Spec:** [`story.md`](story.md), [`docs/adr/0001-anonymous-tombstone.md`](docs/adr/0001-anonymous-tombstone.md). Branch: `feature/replies`.

## Global Constraints

- Reply text is trimmed, 1–280 characters; mood is optional (`happy | sad | angry | silly`); no poll. The 280 lives in one constant per app (`QUACK_TEXT_MAX_LENGTH`).
- Endpoints: `GET /api/quacks/:quackId/replies` (200 oldest first, 404), `POST …/replies` (201, 400, 404, 409 "This quack was deleted"), `DELETE …/replies/:replyId` (204, 403, 404). `DELETE /api/quacks/:id` keeps its contract; a tombstone answers 404 to everyone, admins included.
- Controllers keep `@UseGuards(AuthenticatedUserGuard)` and `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Counts are counted on every read (`_count`), never stored. The reply foreign key is `RESTRICT`; never `CASCADE` or `SET NULL`.
- Every quack delete goes through `QuackRepository.deleteQuack`. Nothing else calls `prisma.quack.delete`.
- Log lines carry ids and counts only, never text: `reply_created`, `reply_deleted`, `quack_deleted`.
- Lint: boolean names start with `is/has/should/can/did/will/does`; no `||` or `cond ? x : undefined` (write `x === "" ? undefined : x`).
- UI: controls come from `src/components/ui/` (add with `pnpm dlx shadcn@latest add <name>`, strip `shadow-*` from inputs and cards); no card inside a card; no hardcoded colours; every list has loading, empty and error states; no shadows on non-floating things (`DESIGN.md`).
- Features don't import each other. The default mood reaches the reply form as a prop from the route.
- Formatting: run prettier from inside the workspace on the files you touched, listed by name, never a directory. Match the line endings of sibling files (`file <sibling>`). Report which checks you ran by hand if `pnpm check-all` cannot run.
- Frontend tests: `beforeEach(() => { mock.mockReset() })` with braces; no `mock.calls[0][0]` (use an `nth` helper); test cache-reading components through a feed harness like `pollTestHarness.tsx`.
- Backend tests mock the repository, so they cannot prove locks or foreign keys; Task 4 does.

## Review Focus

Failure modes the story implies but a plain happy-path test would miss. Each has a test in the task named in brackets.

1. A reply body with extra fields (`poll`, `quackId`, `userId`) is rejected with 400, not silently stored. [Task 3]
2. Whitespace-only reply text is rejected on the server, not only in the form (the quack DTO does not trim today; the reply DTO must). [Task 3, Task 6]
3. An admin deleting an already-deleted quack gets 404 and does not purge it or its replies. [Task 2]
4. Two replies deleted at the same moment under a tombstone never leave an empty tombstone; a reply and a delete of its quack at the same moment never orphan or lose the reply. [Task 4]
5. The reply panel of a quack that vanished meanwhile (last reply deleted under a tombstone) shows an error with a retry, not a blank screen or a crash. [Task 6]

---

### Task 1: Schema, migration and a nullable author

**Files:**

- Modify: `apps/backend/prisma/schema.prisma` (as in `story.md`, "Proposed schema")
- Create: `apps/backend/prisma/migrations/<timestamp>_add_replies/migration.sql`
- Modify: `apps/backend/src/modules/quack/domain/quack.ts`, `repositories/quack.repository.ts` (mapper, `include`), `controllers/dto/quack.response.dto.ts`, `controllers/dto/create-quack.dto.ts` (use the constant)
- Test: `controllers/dto/quack.response.dto.spec.ts`, `services/quacks.service.spec.ts` (update `aQuack`)

**Interfaces:**

- Produces: `Quack` gains `userId: string | null`, `isDeleted: boolean`, `replyCount: number`; `export const QUACK_TEXT_MAX_LENGTH = 280` in `domain/quack.ts`; `QuackResponseDto` gains `isDeleted: boolean`, `replyCount: number`, with `userId: string | null` and `user: QuackUserDto | null`.

- [ ] **Step 1: Write the failing tests** in `quack.response.dto.spec.ts`: `serializes a tombstone with no author, text, mood or poll` (`isDeleted: true`, `text: ''`, `user: null`, `userId: null`, `mood: null`, `poll: null`); `still throws for a live quack whose user was not loaded`; `includes replyCount`.
- [ ] **Step 2: Run** `pnpm backend test -- quack.response.dto` → FAIL (type errors / missing fields).
- [ ] **Step 3: Edit `schema.prisma`**, then let Prisma write the SQL: `pnpm --filter backend exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`. Save it as the migration (drop the `Loaded Prisma config` line) and append the `quack_tombstone_is_empty` check from `story.md`.
- [ ] **Step 4: Implement** the type and DTO changes. In `mapPrismaQuackToDomain` add `isDeleted: quack.deletedAt !== null` and `replyCount: quack._count?.replies ?? 0`; `getQuacks` and `createQuack` add `_count: { select: { replies: true } }` to `include`. `fromDomain` throws only when `!quack.isDeleted && !quack.user`. Update `aQuack` with `isDeleted: false, replyCount: 0`.
- [ ] **Step 5: Apply and verify.** `pnpm backend migrate`, then `pnpm backend build`. Check the constraint: `echo "UPDATE \"quack\" SET \"userId\" = NULL WHERE id = (SELECT id FROM \"quack\" LIMIT 1);" | pnpm --filter backend exec prisma db execute --stdin` → fails with `violates check constraint "quack_tombstone_is_empty"`. Run `pnpm backend test` → PASS.
- [ ] **Step 6: Commit** `Add reply table and nullable quack author`.

### Task 2: Deleting a quack with replies makes a tombstone

**Files:**

- Modify: `repositories/quack.repository.ts` (`deleteQuack`), `services/quacks.service.ts` (`deleteQuack`)
- Test: `services/quacks.service.spec.ts`

**Interfaces:**

- Produces: `export type DeleteQuackResult = { status: 'not_found' } | { status: 'ok'; wasTombstoned: boolean; replyCount: number }`; `QuackRepository.deleteQuack(id: string): Promise<DeleteQuackResult>`. The service signature `deleteQuack(user: Identity, id: string): Promise<void>` is unchanged.

- [ ] **Step 1: Write the failing tests** (repository mocked): `answers 404 for a tombstone, even to an admin` (`getQuackById` returns `isDeleted: true`; `deleteQuack` not called); `answers 404 when the repository finds the quack gone` (`not_found`); `logs quack_deleted with the tombstoned flag and the reply count, and no text`; the existing 403 and admin tests keep passing.
- [ ] **Step 2: Run** `pnpm backend test -- quacks.service` → FAIL.
- [ ] **Step 3: Implement** `QuackRepository.deleteQuack` as one `$transaction`: `SELECT "id","deletedAt" FROM "quack" WHERE "id" = ${id} FOR UPDATE` (as `castVoteOnce` does); `not_found` if missing or already deleted; count the replies; with none `quack.delete`; otherwise `poll.deleteMany({ where: { quackId: id } })` then `quack.update` with scalars `text: ''`, `mood: null`, `userId: null`, `deletedAt: new Date()`.
- [ ] **Step 4: Implement the service**: tombstone or missing → `NotFoundException('Quack not found')` before the ownership check; map `not_found` to the same 404; log `{ event: 'quack_deleted', userId, quackId, tombstoned, replies }`.
- [ ] **Step 5: Run** `pnpm backend test` → PASS.
- [ ] **Step 6: Commit** `Turn a deleted quack with replies into a tombstone`.

### Task 3: Replies on the backend

**Files:**

- Create: `domain/reply.ts`, `repositories/reply.repository.ts`, `services/replies.service.ts`, `controllers/replies.controller.ts`, `controllers/dto/create-reply.dto.ts`, `controllers/dto/reply.response.dto.ts`
- Modify: `quack.module.ts` (register controller, service, repository), `apps/backend/src/scripts/seed/seed/seed-database.ts` and create `seed/create-reply.ts`
- Test: `controllers/dto/create-reply.dto.spec.ts`, `services/replies.service.spec.ts`

**Interfaces:**

- Produces:
  - `Reply = { id: string; text: string; mood: QuackMood | null; createdAt: Date; user: QuackAuthor }`
  - `ReplyRepository.getReplies(quackId: string): Promise<Reply[] | null>` (null = no such quack, oldest first)
  - `ReplyRepository.createReply(input: { quackId: string; userId: string; text: string; mood?: QuackMood }): Promise<{ status: 'no_quack' | 'deleted' } | { status: 'ok'; reply: Reply }>`
  - `ReplyRepository.deleteReply(quackId: string, replyId: string, userId: string, isAdmin: boolean): Promise<{ status: 'no_reply' | 'not_author' } | { status: 'ok'; didPurgeQuack: boolean }>`
  - `RepliesService.list(quackId): Promise<Reply[]>`, `.create(user: Identity, quackId: string, data: { text: string; mood?: QuackMood }): Promise<Reply>`, `.remove(user: Identity, quackId: string, replyId: string): Promise<void>`

- [ ] **Step 1: Write the failing DTO tests** with the real `ValidationPipe` (pattern of `create-quack.dto.spec.ts`): accepts `{ text, mood }`; `trims the text`; rejects blank and whitespace-only text; rejects 281 characters, accepts 280; rejects an unknown mood; `rejects extra fields: poll, quackId, userId`.
- [ ] **Step 2: Write the failing service tests** (repository mocked): `list` throws 404 when `getReplies` returns null; `create` maps `no_quack` to 404 and `deleted` to 409 with message `This quack was deleted`; `create` logs `{ event: 'reply_created', userId, quackId, replyId }` only; `remove` maps `no_reply` to 404 and `not_author` to 403; `remove` logs `reply_deleted` with `userId`, `replyId`; an admin passes `isAdmin: true` to the repository.
- [ ] **Step 3: Run** `pnpm backend test -- replies create-reply` → FAIL.
- [ ] **Step 4: Implement the DTOs.** `CreateReplyDto { text: string; mood?: QuackMood }` with `@Transform` trim, `@IsString @IsNotEmpty @MaxLength(QUACK_TEXT_MAX_LENGTH)`; `ReplyResponseDto` with `fromDomain(reply: Reply)` returning `id, text, mood, createdAt, user { id, name, username }`.
- [ ] **Step 5: Implement the repository.** `createReply`: transaction, `SELECT "id","deletedAt" FROM "quack" WHERE "id" = ${quackId} FOR SHARE`; none → `no_quack`; `deletedAt` set → `deleted`; else insert and return with `user`. `deleteReply`: transaction, `SELECT … FROM "quack" WHERE "id" = ${quackId} FOR UPDATE` first; find the reply by `{ id: replyId, quackId }`; not found → `no_reply`; `userId !== userId && !isAdmin` → `not_author`; delete it; if the quack has `deletedAt` and no replies left, delete the quack and return `didPurgeQuack: true`.
- [ ] **Step 6: Implement the service and `RepliesController`** at `@Controller('quacks/:quackId/replies')` with `GET`, `POST` (201), `DELETE ':replyId'` (204), Swagger `@ApiResponse` for each status of the constraints.
- [ ] **Step 7: Seed.** `createReply(prisma, { quackId, userId, text, createdAt? })` mirroring `create-quack.ts`; in `seed-database.ts` add three replies on one quack and one tombstone with a reply (create a quack, create the reply, then update the quack to the tombstone shape). The seed only runs on an empty database; it is exercised in Task 7.
- [ ] **Step 8: Run** `pnpm backend test`, `pnpm backend lint:check`, `pnpm backend build` → all pass.
- [ ] **Step 9: Commit** `Add replies: endpoints, service and repository`.

### Task 4: Prove the database rules (throwaway, not committed)

**Files:** a script in the scratchpad, never in the repo. Deleted afterwards.

- [ ] **Step 1: Write a script** that builds `PrismaService`, `QuackRepository` and `ReplyRepository` against the dev database with temporary users and quacks (names prefixed `tmp-replies-`), and checks: (a) `prisma.quack.delete` on a quack with a reply rejects (the foreign key); (b) the `quack_tombstone_is_empty` constraint refuses a half-wiped row; (c) 200 rounds of `createReply` racing `deleteQuack` on the same quack always end as: reply saved and quack a tombstone, or reply `no_quack`/`deleted` and quack gone, never a reply without its quack; (d) 200 rounds of two `deleteReply` calls racing on the last two replies of a tombstone always end with the tombstone gone; (e) deleting a temporary user removes the replies they wrote. Remove every `tmp-replies-` row at the end.
- [ ] **Step 2: Run it** with `ts-node` from `apps/backend` (same flags as the `seed` script) → every check prints PASS.
- [ ] **Step 3: Break the guard on purpose.** Remove `FOR UPDATE` from `deleteReply`; re-run → check (d) must fail at least once. Remove `FOR SHARE` from `createReply`; re-run → check (c) must fail at least once. Restore both. If a check never fails with its guard removed, the race never overlapped; fix the script before trusting it.
- [ ] **Step 4: Delete the script** and confirm `git status --short` shows nothing from it.

### Task 5: Frontend data layer

**Files:**

- Modify: `features/quack/api/quackSchemas.ts`, `features/quack/api/quackKeys.ts`, `features/quack/components/QuackForm.tsx` (use the shared text rule)
- Create: `features/quack/lib/quackText.ts`, `api/repliesQueryOptions.ts`, `api/addReply.ts`, `api/deleteReply.ts`, `api/replyErrors.ts`, `hooks/useAddReply.ts`, `hooks/useDeleteReply.ts`
- Test: `api/quackSchemas.test.ts`, `api/addReply.test.ts`, `hooks/useAddReply.test.ts`

**Interfaces:**

- Produces:
  - `quackSchema` gains `userId: z.string().nullable()`, `user: quackUserSchema.nullable()`, `isDeleted: z.boolean()`, `replyCount: z.number()`; new `replySchema` (`id, text, mood nullable, createdAt coerce date, user`) and `Reply` type.
  - `quackKeys.replies(quackId: string)` returning `[...quackKeys.all(), "replies", quackId]`, so every invalidation of `quackKeys.all()` also refreshes replies.
  - `quackText.ts`: `QUACK_TEXT_MAX_LENGTH = 280` and `quackTextSchema` (trim, min 1 "Write something first", max 280 "Keep it under 280 characters"); `QuackForm` uses it instead of its local copy.
  - `repliesQueryOptions(quackId: string)`; `addReply(input: { quackId: string; text: string; mood?: QuackMood }): Promise<Reply>`; `deleteReply(input: { quackId: string; replyId: string }): Promise<void>`; `QuackDeletedError` (HTTP 409 on add, message `This quack was deleted.`, like `PollClosedError`); `useAddReply(quackId)`, `useDeleteReply(quackId)` both invalidate `quackKeys.all()` on success.

- [ ] **Step 1: Write the failing tests:** `parses a tombstone (user null, isDeleted true)`; `addReply turns a 409 into QuackDeletedError`; `useAddReply invalidates every quack query`.
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run quack` → FAIL.
- [ ] **Step 3: Implement** the files above. Map the 409 in `addReply` by catching `HTTPError` with `response.status === 409`.
- [ ] **Step 4: Keep the tree compiling.** `quack.user` is now nullable, so `QuackItem` returns early with a bare `<article>` reading "This quack was deleted" when `quack.isDeleted` (Task 6 replaces it with the full tombstone view). Add `isDeleted: false, replyCount: 0` to the quack factories in existing tests (`pollTestHarness.tsx` and any other `aQuack`). Then run `pnpm frontend test:ci` and `pnpm --filter frontend exec tsc --noEmit` → pass.
- [ ] **Step 5: Commit** `Add reply API, schemas and hooks to the frontend`.

### Task 6: Reply UI

**Files:**

- Create: `features/quack/components/DeleteConfirmButton.tsx`, `ReplyDeleteButton.tsx`, `ReplyItem.tsx`, `ReplyForm.tsx`, `ReplyList.tsx`
- Modify: `QuackDeleteButton.tsx` (thin wrapper over `DeleteConfirmButton`, new prop `hasReplies: boolean`), `QuackItem.tsx`, `QuackList.tsx` (pass `defaultMood`), `routes/_ProtectedPages/quacks.tsx` (pass `defaultMood={user?.defaultMood}`)
- Test: `ReplyList.test.tsx`, `ReplyForm.test.tsx`, `QuackItem.test.tsx` (new), `QuackDeleteButton.test.tsx` (extend)

**Interfaces:**

- Produces:
  - `DeleteConfirmButton({ ariaLabel, title, description, isPending, error, onConfirm })`, the dialog from today's `QuackDeleteButton` made reusable.
  - `ReplyList({ quackId, isTombstone, currentUserId, isAdmin, defaultMood })`: loading, empty ("No replies yet. Be the first to answer.") and error-with-retry states, replies oldest first, form below (hidden when `isTombstone`).
  - `ReplyForm({ quackId, defaultMood })`: `quackTextSchema`, `MoodPicker`, pending state, resets after posting, shows `QuackDeletedError` message under the field.
  - `QuackItem` props add `defaultMood?: QuackMood | null`. Tombstone view: "This quack was deleted", no avatar name, no time, no mood, no poll, no delete button; the reply control still works.

- [ ] **Step 1: Write the failing tests:** `QuackItem shows "Reply", "1 reply" and "3 replies"`; `a tombstone shows the placeholder and no author or delete button but still opens its replies`; `ReplyList shows loading, empty and an error with a working retry` (including the 404 case from Review Focus 5); `ReplyForm blocks blank text with "Write something first" and posts text and mood`; `ReplyForm shows "This quack was deleted." on a 409`; `the reply delete button shows only to the writer and to an admin`; `QuackDeleteButton warns "Its text will be removed. Replies to it stay." when hasReplies`.
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run Reply QuackItem QuackDeleteButton` → FAIL.
- [ ] **Step 3: Implement** the components. Replies sit inside the quack's `<article>` under a `border-t border-border` divider with spacing, never a nested card. The control is a `<button aria-expanded>` reading "Reply" / "1 reply" / "N replies". Reply delete dialog: "Delete this reply?" / "This can't be undone."
- [ ] **Step 4: Run** `pnpm frontend test:ci`, `pnpm --filter frontend exec tsc --noEmit`, `npx eslint "./src/**/*.{ts,tsx,js,cjs,mjs}"` in `apps/frontend` → pass.
- [ ] **Step 5: Commit** `Show and post replies under a quack`.

### Task 7: End-to-end check and release

**Files:**

- Modify: `apps/frontend/e2e/quacks.spec.ts`; `docs/adr/0001-anonymous-tombstone.md` and `docs/adr/README.md` (status)
- Test: the same e2e file

- [ ] **Step 1: Write the e2e tests** with the seeded users (pattern of the existing ones): `a reply shows up under its quack`; `deleting a quack with replies leaves a tombstone, keeps the replies, and its text appears nowhere` (assert the text is gone from the feed, from the opened replies, and that `GET /api/quacks?q=<old text>` returns no match); `deleting the last reply removes the tombstone`; `nobody can reply to a tombstone` (POST via `page.request` → 409).
- [ ] **Step 2: Reset the dev database** so the seed shows replies: `pnpm backend db:reset` only after the user confirms, because it wipes their dev data. Then `pnpm --filter frontend e2e` → pass.
- [ ] **Step 3: Run the full suite:** `pnpm check-all`. If the Windows lint or format failures from `CLAUDE.md` appear, run the steps by hand as it describes and say which ones.
- [ ] **Step 4: Release check, on the deployed app after `pnpm backend migrate` has run:** the feed loads; post a reply to an existing quack and see it and the count; delete a quack that has a reply and see the tombstone; search for its old text and find nothing. Do not run the seed in production.
- [ ] **Step 5: Set ADR 0001 and its index row to Accepted** once this branch is merged.
- [ ] **Step 6: Commit** `Add replies end-to-end tests` (and the ADR status as its own commit after the merge).
