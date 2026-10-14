# Plan: polls on quacks

Implements [`story.md`](story.md). Branch: `feature/polls`.

The plan copies the quack pattern: model → migration → repository → service → controller (DTO-validated) → zod schema → TanStack Query → components. Polls live inside the existing `quack` backend module and `quack` frontend feature, because a poll is part of a quack and features may not import each other.

## Decisions that shape the plan

- **Counts are counted, never stored.** The feed query counts votes per option on every read. There is no `voteCount` column to drift. This is what makes "the numbers have to be right for everyone" true.
- **The database enforces the rules**, not just the service: one vote per user per poll (unique key), and a vote can only point at an option of its own poll (composite foreign key).
- **Voting is a `PUT`, not a `POST`.** "Set my vote on this poll to X" is the same request however often it is sent, so double clicks and retries can't create a second vote.
- **Vote vs. close race** is settled by a row lock on the poll (see step 4), so a vote is either counted before the close or rejected as closed.
- **Poll shape in the API** is `poll: null` or an object, on the quack itself. No extra request per poll.

## Data model

Three new tables. `Quack` and `User` get a back-relation only; no existing column changes.

```prisma
model Poll {
  id       String       @id @default(cuid())
  quack    Quack        @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId  String       @unique          // at most one poll per quack
  closedAt DateTime?                     // null = open; set once, never cleared
  options  PollOption[]
  votes    PollVote[]

  @@map("poll")
}

model PollOption {
  id       String     @id @default(cuid())
  poll     Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId   String
  text     String     @db.VarChar(80)
  position Int                            // order the author wrote them, 0-based
  votes    PollVote[]

  @@unique([pollId, position])
  @@unique([id, pollId])                  // target for the composite FK below
  @@map("poll_option")
}

model PollVote {
  id        String     @id @default(cuid())
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId    String
  option    PollOption @relation(fields: [optionId, pollId], references: [id, pollId], onDelete: Cascade)
  optionId  String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt

  @@unique([pollId, userId])              // one person, one vote
  @@index([optionId])
  @@map("poll_vote")
}
```

Notes:

- `poll.closedAt` rather than a boolean: it records when, and "closed" is `closedAt !== null`.
- The composite foreign key `(optionId, pollId) → (id, pollId)` means the database refuses a vote whose option belongs to another poll. The service also checks, to return a clean 400 instead of a database error.
- Option uniqueness ignoring case and the 2–6 count are validated in the DTO/service. They are not worth a database constraint for a first version.
- Migration is written by hand under `prisma/migrations/<timestamp>_add_polls/` (the repo convention), then applied with `prisma migrate deploy`.

## Endpoints

All under the existing `QuacksController` guard and `ValidationPipe`. Swagger gets the new DTOs.

| Method and path                        | Change                                            | Success                                        | Errors                                                                |
| -------------------------------------- | ------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| `POST /api/quacks`                     | body gains optional `poll: { options: string[] }` | 201, quack with `poll`                         | 400 (count not 2–6, option blank / over 80 / duplicate ignoring case) |
| `GET /api/quacks`                      | each quack gains `poll: null \| PollResponse`     | 200                                            | unchanged                                                             |
| `PUT /api/quacks/:quackId/poll/vote`   | new, body `{ optionId }`                          | 200, `PollResponse`                            | 400 option not in this poll, 404 no such quack or no poll, 409 closed |
| `POST /api/quacks/:quackId/poll/close` | new, no body                                      | 200, `PollResponse` (also when already closed) | 403 not the author, 404 no poll                                       |

```ts
PollResponse = {
  id: string
  isClosed: boolean
  totalVotes: number
  myOptionId: string | null        // the signed-in user's pick, never anyone else's
  options: { id: string; text: string; votes: number }[]   // ordered by position
}
```

`GET` reads everything in one Prisma query: poll → options (ordered by `position`, with `_count.votes`) and the viewer's own vote (`votes where userId = viewer`). `totalVotes` is the sum of option counts. No per-poll queries.

## Backend structure (inside `modules/quack`)

- `domain/poll.ts` — `Poll`, `PollOption` types.
- `repositories/poll.repository.ts` — `castVote`, `closePoll`, `findPollByQuackId`. Mapping from Prisma stays here.
- `repositories/quack.repository.ts` — `createQuack` accepts options and creates quack, poll and options in one nested write. `getQuacks` takes the viewer id and includes the poll shape above.
- `services/polls.service.ts` — vote and close rules, log lines.
- `services/quacks.service.ts` — passes the viewer id through; logs `poll_created`.
- `controllers/polls.controller.ts` (or two routes on `QuacksController`) and `controllers/dto/` — `create-quack.dto.ts` (poll options), `cast-vote.dto.ts`, `poll.response.dto.ts`.

Vote algorithm (`castVote`), in one transaction:

1. `SELECT closed_at FROM poll WHERE id = … FOR SHARE`. Votes share the lock and don't block each other. A close needs the exclusive lock, so it waits for votes in flight, and votes arriving after it see `closed_at` set. If the quack has no poll, return 404.
2. If `closed_at` is set, throw 409.
3. Check the option belongs to the poll (400 otherwise).
4. Upsert on `(pollId, userId)`. If a concurrent first vote from the same user makes the upsert throw a unique violation, retry the upsert once.
5. Return the fresh poll shape, counted from the stored votes.

Close: `updateMany where { id, closedAt: null } set { closedAt: now }`. A count of 0 means it was already closed, which still returns 200. The author check (`quack.userId === viewer.id`) comes before the update.

Logging (JSON, as `quack_search` does): `poll_created { userId, pollId, options: n }`, `poll_vote { userId, pollId, kind: "first" | "changed" }`, `poll_closed { userId, pollId }`. No question or option text. A repeated vote for the same option logs nothing.

## Frontend structure (inside `features/quack`)

- `api/quackSchemas.ts` — add `pollSchema`, make `quackSchema.poll` nullable.
- `api/addQuack.ts` — input gains optional `pollOptions`.
- `api/votePoll.ts`, `api/closePoll.ts` — `PUT` / `POST`, parsed with `pollSchema`.
- `hooks/useVotePoll.ts` — the optimistic vote (below).
- `hooks/useClosePoll.ts` — plain mutation, invalidates `quackKeys.all()` on success.
- `components/PollView.tsx` — option rows, bar, count and percent, footer, inline error, Close button and dialog.
- `components/PollFields.tsx` — the "Add a poll" toggle and option inputs used by `QuackForm` (`useFieldArray`, add/remove, 2–6).
- `lib/pollMath.ts` — percent per option (whole number, 0 when no votes). Pure and unit tested.
- `QuackItem` renders `<PollView>` under the text when `quack.poll` is set.

Optimistic voting (`useVotePoll`, TanStack Query v5):

- `mutationKey` and `scope: { id: pollId }`: mutations for one poll run one after another, in click order, so the last click is also the last write on the server.
- `onMutate`: `cancelQueries(quackKeys.lists())`, snapshot all list caches with `getQueriesData`, then `setQueriesData` on every list: move `myOptionId`, decrement the old option, increment the new one, adjust `totalVotes`. Search results and the full feed stay consistent, since the poll may be in several cached lists.
- `onError`: restore the snapshot, and the component shows the message from `mutation.error` under the poll ("Couldn't save your vote. Try again." or, for a 409, "This poll is closed.").
- `onSettled`: invalidate `quackKeys.lists()` only when no other vote mutation for the poll is still pending, so a refetch doesn't overwrite a later click. Counts then come from the server, the source of truth.
- Clicking the current pick returns early without a request.
- The error state is held by the component's mutation instance, so it is per poll and clears on the next attempt (`mutation.reset()` in the click handler).

Kit and design rules (`DESIGN.md`, `CLAUDE.md`):

- Option rows use the existing `ToggleGroup` (`type="single"`) for radio-style keyboard and screen-reader behaviour. An empty `onValueChange` (deselect) is ignored. The bar is a decorative `aria-hidden` element with the count in text.
- The close confirmation uses the existing `Dialog`. The primary button on the quack form stays the only primary button; "Close poll" is `ghost`/`outline`.
- Spacing from the scale only, semantic colour classes only, no card inside the quack card, no shadows. A new kit control, if one is needed, is added with `pnpm dlx shadcn@latest add <name>` and its shadows stripped.
- Boolean names use `is`/`has`/`should`/`can` prefixes.

## Build order

Each step ends green (`pnpm backend test` / `pnpm frontend test:ci` for what it touched) and could be committed on its own. Tests come first in every step.

1. **Schema and migration.** Add the three models, hand-write the migration, apply, regenerate the Prisma client. Check the composite foreign key and unique keys exist in the database.
2. **Create a poll.** Domain types, DTO (`poll.options` 2–6, 1–80 characters, trimmed, case-insensitive unique), repository nested create, service log line. Tests: DTO through the real `ValidationPipe` (counts, blank, duplicate, over length, `poll` omitted still valid) and service unit tests with a mocked repository.
3. **Read polls in the feed.** `getQuacks(viewerId, terms)` includes the poll; `PollResponse` mapping with `totalVotes` and `myOptionId`; `QuackResponseDto` gains `poll`. Tests: mapping (ordering, counts, viewer's pick, no poll → `null`), and search still works unchanged.
4. **Vote endpoint.** `PUT …/poll/vote` with the transaction above. Tests: first vote, switch, same option twice, option from another poll (400), no poll (404), closed (409), log kind first vs. changed, no log on repeat.
5. **Close endpoint.** Author-only, idempotent. Tests: author closes, other user gets 403, closing twice, no poll (404), log line.
6. **Frontend data layer.** Schemas, `addQuack`, `votePoll`, `closePoll`, `pollMath` with tests. Existing `QuackList`/`QuackItem` tests are updated for `poll: null` in the fixtures.
7. **Show a poll.** `PollView` read-only: rows, bars, percent, own pick, footer, Closed label. Tests: no votes, ties, 1 vote, closed.
8. **Ask a poll.** `PollFields` in `QuackForm`: toggle, 2–6 options, client validation under the field, reset after posting. Tests: add/remove limits, blank and duplicate messages, submit payload with and without a poll.
9. **Vote with optimism.** `useVotePoll` and the click handling in `PollView`. Tests: the pick and counts change before the request resolves, rollback and message on failure (500 and 409), clicking the current pick sends nothing, two quick clicks end on the last one.
10. **Close with confirmation.** Button for the author on open polls only, dialog, pending state, failure message. Tests: hidden for other users and closed polls, nothing sent until confirmed, failure leaves the poll open.
11. **Finish.** Format only touched files (then restore CRLF, per `CLAUDE.md`), run `pnpm check-all`, review `git status --short`.

## Verification and risks

- **No database integration tests exist in this repo** (service tests mock the repository). The two guarantees that matter most — one vote per user, and vote-versus-close ordering — live in the database and the transaction, so unit tests can't prove them. I'd check them once against the running dev database (two vote requests at the same time, and a vote racing a close) and report the result. I would not add test infrastructure for this first version. Say if you want that check.
- **Per CLAUDE.md I won't open the app in a browser** to check the UI unless you ask. Component tests are the evidence for steps 7–10.
- **Feed cost.** Each feed read now counts votes for every poll shown. Fine at this scale. There is no pagination today, so a very large feed with many polls is the first thing to watch.
- **Prisma composite foreign key sharing `pollId` between two relations** is supported, but it is the one piece of the schema I'd confirm early in step 1. The fallback is a plain `optionId` foreign key plus the service check.
- **Vote data is personal.** Votes are stored per user, so the table needs the same care as the logs. The API only ever returns counts and the viewer's own pick.
