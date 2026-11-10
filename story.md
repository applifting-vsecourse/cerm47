# User story: Reply to a quack

**As a** signed-in user, **I want to** answer a specific quack and have my answer show up under it, **so that** a discussion stays attached to what it is about, instead of new quacks starting with "@name…" that nobody can connect to what they answer.

## Why

People discuss a quack by posting a new quack that begins with "@name…". Nobody can tell who answers what, and the discussion is spread across the feed. Replies fix that by hanging the answer under the quack.

Two things must hold together, and they pull against each other:

- A reply belongs to the person who wrote it. If the author of a quack deletes it, the replies to it must stay.
- When someone deletes their quack, its content must really disappear from the application, not just be hidden.

The design resolves this with a **tombstone**: a deleted quack that has replies stays only as an empty, anonymous placeholder that the replies hang on. Its text, mood, poll and author are removed from the database.

## Acceptance criteria

**Replying**

- Every quack in the feed has a control under it: "Reply" when it has no replies, otherwise "1 reply" or "N replies". Clicking it opens the replies in place, under that quack. Clicking again closes them.
- Open replies show, oldest first, each with the writer's avatar, name, username, time and mood, and the text. Below them is the reply form.
- The reply form takes text and an optional mood. Text follows the quack rules (trimmed, 1–280 characters). The mood picker starts on the user's default mood, as the post form does. There is no poll in a reply.
- The submit button shows a pending state and is disabled while submitting. The message for a rejected reply appears under the field, as in the post form.
- After posting, the form resets, the new reply appears in the list and the count under the quack goes up.
- The reply list has the three states from `DESIGN.md`: loading, empty ("No replies yet. Be the first to answer.") and error with a retry button.
- Replies sit inside their quack's card, separated by spacing and a hairline divider. A reply is not a card, and there is no card inside a card.
- Only one level exists. A reply has no reply button and cannot be answered. People answering each other do so in the same list.
- Replies are not in the feed, are not searched and are not part of "mine". Search and "mine" match top-level quacks only, as today.

**Deleting a reply**

- The reply's author sees a delete button on it, and so does an admin on every reply. Nobody else does.
- It opens a dialog: "Delete this reply? This can't be undone." The reply is deleted only after the user confirms.
- A deleted reply is really removed. The count under the quack goes down.

**Deleting a quack**

- The existing rules stay: the author or an admin can delete, after confirming.
- A quack with no replies is removed completely, with its poll, options and votes, as today.
- A quack with replies becomes a tombstone. In the same step its text, mood and author link are removed, and its poll with options and votes is deleted. The replies are untouched.
- If the quack has replies, the dialog says so: "This can't be undone. Its text will be removed. Replies to it stay."
- A tombstone stays in the feed at the position the quack had, and reads "This quack was deleted". It shows no author, no time, no mood, no poll, no delete button and no reply form. Its replies open under it as usual and can still be deleted by their writers and by admins.
- A tombstone is not found by search and is not in "mine", because it has no text and no author.
- When the last reply under a tombstone is deleted, the tombstone is removed in the same step. A tombstone always has at least one reply.
- Deleting a tombstone through the API answers 404, as for a quack that does not exist.
- "Really disappear" means the database: after the delete, no text, mood, author id, poll option or vote of that quack can be read from any table, and none of it is in the log.

**API**

- `GET /api/quacks` returns top-level quacks as before, each with `replyCount` (counted on every read) and `isDeleted`. A tombstone has `text: ""`, `user: null`, `mood: null`, `poll: null`.
- `GET /api/quacks/:quackId/replies` returns that quack's replies, oldest first, each with id, text, mood, createdAt and the writer (id, name, username). It answers 404 if the quack does not exist. It also answers for a tombstone.
- `POST /api/quacks/:quackId/replies` creates a reply with `text` and optional `mood`; the author is taken from the session. It answers 201, 400 for invalid input or any other field (so a `poll` is rejected), 404 if the quack does not exist and 409 "This quack was deleted" for a tombstone.
- `DELETE /api/quacks/:quackId/replies/:replyId` answers 204; 403 for anyone but the writer or an admin; 404 if no such reply exists under that quack.
- `DELETE /api/quacks/:id` keeps its contract and adds the tombstone behaviour above.
- All of these keep the existing auth guard and input validation.

**What the database guarantees**

- A reply always points at a quack, and the foreign key refuses to delete a quack that still has replies. No code path can wipe or orphan replies by deleting their quack.
- A quack row is either alive (author set, not deleted) or a tombstone (no author, deleted, empty text, no mood). A check constraint says so, so no code can leave half the content behind.
- Only a quack can be replied to, because the reply table points at quack and nowhere else. A reply cannot be answered and cannot hold a poll, by construction.
- Deleting a user deletes the replies they wrote, as it does their quacks and votes.
- A reply and a delete of its quack at the same moment never lose or orphan the reply: the reply is either saved first (and the quack becomes a tombstone) or rejected as 404 or 409. Two replies deleted at the same moment under a tombstone never leave an empty tombstone.

**Logging**

- One log line each for: a reply created (user id, quack id, reply id), a reply deleted (user id, reply id) and a quack deleted (user id, quack id, whether it became a tombstone, number of replies). No texts are logged.

## Success signal

The log answers whether people use this: replies per day, how many quacks get at least one reply, distinct people replying, and what share of deleted quacks had replies and so became tombstones. Quacks that never get a reply show where the feature does not catch on.

## Out of scope

- Replying to a reply, or any nesting
- A poll in a reply
- Editing a reply
- Searching reply text, or showing a thread because a reply matched
- Notifications, @mention links, "in reply to" labels
- Pagination of replies
- Live updates
- Deleting an account: while someone else's replies exist, the database refuses to remove a user who wrote the quack. A future delete-account feature must tombstone those quacks first, through the same method as the delete button
- A scheduled cleanup job

## Decisions

Each decision names the option we rejected and why.

1. **One level of replies.** A reply answers a quack and nothing else. _Rejected:_ reply-to-reply shown flat (needs a second link per reply and its own delete rule); a full tree (recursive queries, nested UI, and once deep data exists it cannot be flattened again). The cost we accept: a back-and-forth between several people under one quack can bring "@name…" back inside the list.
2. **A quack with replies is deleted into a tombstone.** _Rejected:_ detach the replies (the parent row is deleted and replies become top-level quacks, so they lose what they answered and the link can never be shown again); a soft-delete flag that keeps the text (the content would still be in the database and backups, which breaks the request).
3. **The tombstone is anonymous.** Author link, text, mood and poll are removed; only id, time and the deleted marker stay. _Rejected:_ keep the author (the database would still say who wrote a deleted quack, and the user cascade would delete the tombstone with the replies' parent).
4. **Count and expand in place.** The feed shows a reply count and loads replies on demand. _Rejected:_ embed all replies in the feed response (the feed has no pagination, so one long thread slows every load); a separate thread page (a new route, and the answer is not "under" the quack).
5. **A reply is text plus mood, no poll.** _Rejected:_ full quack with polls (polls inside expanded threads were never asked for, and taking them away later would break data); text only (a second, different form next to the post form).
6. **An empty tombstone is removed in the same step** as its last reply, under a row lock. _Rejected:_ keep tombstones forever (dead rows and a "hide empty tombstones" filter in every list query); a scheduled purge (this app has no scheduler).
7. **Account deletion stays out of scope, and the database blocks the unsafe case.** The reply foreign key is `RESTRICT`. _Rejected:_ `ON DELETE SET NULL` on the quack author (deleted people's words would stay in the app); building the quack handling for delete-account now (code for a feature nobody asked for).
8. **No new replies under a tombstone** (409). _Rejected:_ allow them (they would answer "This quack was deleted", so nobody could tell what they respond to).
9. **Search and "mine" cover top-level quacks only.** This is the same rule as poll options, which are not searched either. _Rejected:_ find threads by their replies (heavier query, "mine" would need two meanings, and a hit with no visible reason).
10. **Replies live in their own `reply` table.** The product team chose this over the recommended alternative. _Rejected:_ a `parentId` on `Quack`, which would reuse the delete endpoint, DTO and mapper but needs "parentId is null" in every list query or replies leak into the feed. _What we accept:_ the text and mood rules exist twice (quack and reply), there is a second delete endpoint and a second set of tests, and answering a reply later needs a migration.

**Assumptions made without asking, confirmed on 2026-11-10.**

- `Quack.text` stays required, and a tombstone stores `""`. `deletedAt` is the explicit marker (not "text is empty").
- A tombstone keeps `createdAt` so it stays where it was in the feed; the screen shows no time for it.
- A reply has no `updatedAt`, because replies cannot be edited.
- Replies are deleted by their writer or an admin, the same rule as quacks.
- Reply endpoints are nested under the quack, like the poll endpoints.

## Proposed schema

Not applied yet. This is the diff to `apps/backend/prisma/schema.prisma`.

```prisma
model Quack {
  id        String     @id @default(cuid())
  text      String     @db.Text            // "" on a tombstone
  mood      QuackMood?
  // null only on a tombstone; the check constraint below ties the two together
  user      User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String?
  poll      Poll?
  replies   Reply[]
  // set when the author deleted a quack that already had replies
  deletedAt DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt

  @@index([userId])
  @@map("quack")
}

model Reply {
  id        String     @id @default(cuid())
  text      String     @db.Text
  mood      QuackMood?
  // RESTRICT: a quack that still has replies can never be hard-deleted
  quack     Quack      @relation(fields: [quackId], references: [id], onDelete: Restrict)
  quackId   String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime   @default(now())

  // replies of one quack, oldest first
  @@index([quackId, createdAt])
  @@index([userId])
  @@map("reply")
}

model User {
  // ...
  replies   Reply[]
}
```

Prisma cannot express a check constraint, so the migration gets one line of hand-written SQL after the generated part:

```sql
ALTER TABLE "quack" ADD CONSTRAINT "quack_tombstone_is_empty" CHECK (
  ("deletedAt" IS NULL AND "userId" IS NOT NULL)
  OR ("deletedAt" IS NOT NULL AND "userId" IS NULL AND "text" = '' AND "mood" IS NULL)
);
```

## Does the model hold up?

**1. Can everything the user sees be read with simple queries?** Yes. Nothing needs a recursive or aggregate-by-hand query.

- Feed and search: `quack.findMany` with the existing filters, plus `include: { user, poll, _count: { select: { replies: true } } }`. No `parentId` filter exists, because replies are in another table. Tombstones fall out of search and "mine" on their own (no text, no author).
- Replies of a quack: `reply.findMany({ where: { quackId }, include: { user: true }, orderBy: { createdAt: 'asc' } })`, served by the `(quackId, createdAt)` index.
- Reply count: `_count.replies` in the feed query, counted on every read.
- Writes (all in transactions, each locking the quack row first):
  - Create reply: lock the quack `FOR SHARE`, 404 if missing, 409 if `deletedAt` is set, insert.
  - Delete quack: lock `FOR UPDATE`, count its replies. With none, delete the row. With some, delete its poll and set `text = ''`, `mood = null`, `userId = null`, `deletedAt = now()`.
  - Delete reply: lock its quack `FOR UPDATE`, delete the reply, and if the quack is a tombstone with no replies left, delete it.

**2. Is anything stored twice?** No data is copied. The reply count is derived on every read, and no text or author name is copied into a reply. Two small overlaps are on purpose. `deletedAt` and "`userId` is null" say the same thing about a quack, and the check constraint keeps them equal. The text and mood rules (length, mood list) are defined for both quack and reply, so the shared constants live in one place in the backend and the frontend.

**3. What happens to related rows when a quack is deleted?**

- No replies: the quack row is deleted. Its poll, options and votes go with it (existing cascade).
- With replies: the quack row stays as a tombstone. Its poll, options and votes are deleted explicitly. All replies stay, untouched.
- Last reply of a tombstone deleted: the reply and then the tombstone are deleted.
- A user is deleted: their replies are deleted and their votes are deleted. Their quacks without replies are deleted. If someone else replied to one of their quacks, the database refuses (see Decision 7).

**4. Will the migration run on a production database that already has data?** Yes.

- Every change is additive or relaxes a rule: `quack.userId` drops `NOT NULL`, `quack.deletedAt` is a new nullable column with no default, and `reply` is a new empty table. No backfill is needed and existing rows are unchanged.
- The check constraint is validated against existing rows. All of them have an author and no `deletedAt`, so it passes. Adding it scans `quack` under a short lock, which is fine at this size. On a big table it would be added `NOT VALID` and validated afterwards.
- The migration is written as in `CLAUDE.md`: Prisma writes the SQL with `migrate diff`, then the check line is added by hand.
- Rolling back is easy until the first tombstone exists. After that, `userId` cannot get its `NOT NULL` back, so the tombstones would have to be removed first.

## Where it lands in the code

- **Backend, `modules/quack`:** a new reply domain type, repository, service and controller with DTOs next to the existing ones. Changed: `QuackRepository` (reply count, null author in the mapper, tombstone-aware delete), `QuacksService.deleteQuack` (and its log line), the `Quack` domain type (`userId` nullable, `isDeleted`, `replyCount`) and `QuackResponseDto` (`user` nullable).
- **Seed:** a few replies and one tombstone, so the feed shows every state.
- **Frontend, `features/quack` only:** reply schemas, query keys, query and mutations; `ReplyList`, `ReplyForm` and `ReplyItem`; `QuackItem` gets the reply control and the tombstone view; `QuackDeleteButton` changes its dialog text when the quack has replies; the zod quack schema makes `user` nullable. No other feature is touched, so the "features don't import each other" rule holds. The default mood reaches the reply form as a prop from the route, as it does for `QuackForm`.
- **Existing behaviour that must not change:** search, "mine", polls and voting on live quacks, and who can delete what.

## Notes for the team

- The reply foreign key being `RESTRICT` is what protects replies. Do not change it to `CASCADE` or `SET NULL` for convenience.
- The tombstone only works if every delete of a quack goes through the one service method. Do not call `prisma.quack.delete` from anywhere else.
- Vote data of a deleted poll is deleted with it. A tombstone has no poll rows at all.
- The tests mock the repository, so they cannot prove the locks or the foreign key. Check those with a throwaway script against the dev database, as `CLAUDE.md` describes for polls, and break the lock on purpose to see it fail.
