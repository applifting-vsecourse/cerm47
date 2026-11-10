# 0001. A deleted quack that has replies becomes an anonymous tombstone

## Status

Proposed, 2026-11-10. It becomes Accepted when the replies feature (`story.md`) is merged.

## Context

Replies are being added to quacks. A reply belongs to the person who wrote it, so deleting the quack it answers must not delete it. At the same time, when someone deletes their quack, its content must really disappear from the application, not just be hidden.

Today a delete is `prisma.quack.delete`, and everything hangs off the quack by cascade: its poll, options and votes. The quack also belongs to its author through a required `Quack.userId`, which cascades when the user is deleted. If replies pointed at the quack with the same cascade, deleting the quack would wipe the replies. If the quack is only hidden, its text is still in the database and its backups.

So a quack that other people's rows depend on must stay as a row, but must stop being a quack. What that remaining row still knows is the question this ADR settles, and its answer changes a rule the rest of the app has relied on since the first migration: every quack has an author.

## Decision

When the author (or an admin) deletes a quack that has replies, the row stays as a **tombstone** and is made anonymous in the same transaction:

- `text` is set to `''`, `mood` to `NULL`, `userId` to `NULL`, and `deletedAt` is set.
- Its poll is deleted, which removes the options and votes.
- Only `id`, `createdAt`, `updatedAt` (which Prisma sets to the time of the delete) and `deletedAt` remain, plus the replies pointing at it.

A quack with no replies is still deleted completely. A tombstone is deleted together with its last reply.

This is the one delete rule for the whole app: a row that no other row depends on is really deleted, and a row that other people's rows depend on is wiped and anonymised. Nothing is only hidden. It replaces the real `DELETE` of a quack from the delete feature (`QuackRepository.deleteQuack`), which is the only place a quack is deleted today.

The database holds this up:

- `Quack.userId` becomes nullable.
- A check constraint allows exactly two shapes of row: alive (`deletedAt IS NULL AND userId IS NOT NULL`) or tombstone (`deletedAt IS NOT NULL AND userId IS NULL AND text = '' AND mood IS NULL`).
- `reply.quackId` is a foreign key with `ON DELETE RESTRICT`, so no code can hard-delete a quack that still has replies.

## Options considered

1. **Anonymous tombstone (chosen).** Nothing about the author or the words is left. Costs a nullable `userId` and a rule every reader of a quack must respect. Reversible in the schema (a nullable column is cheap to make required again while no tombstone exists), not reversible in the data.
2. **Tombstone that keeps the author.** `userId` and `createdAt` stay, so the feed could show "Anna deleted this quack". Rejected: the database would still say who wrote a deleted quack. The `User → Quack` cascade would also delete the tombstone when the account goes, taking the replies' parent with it, so a second rule would still be needed.
3. **Detach the replies (`ON DELETE SET NULL` on the reply link, delete the quack row).** Rejected: replies become top-level quacks out of context, which brings back the "nobody knows who reacts to what" problem, and the link to what they answered is destroyed for good.
4. **Soft-delete flag, text kept.** Rejected: the content is still in the table and in backups, so it has not disappeared. It would have to be scrubbed one day anyway.
5. **`Quack.userId` with `ON DELETE SET NULL` instead of cascade.** Considered for deleting accounts. Rejected: a deleted person's words would stay in the app, and any quack could then have no author, not only tombstones.
6. **Keep today's real `DELETE` and let the replies cascade away with the quack.** The baseline: no tombstone and no schema change on `Quack`. Rejected: a reply belongs to the person who wrote it, so deleting someone else's quack would delete their words, which the request forbids.
7. **Refuse to delete a quack that has replies (409).** Not raised in the interview. It is added here because it is the other obvious way to protect the replies. Rejected: the author could never take their own words back once someone answered, which breaks the second half of the request.

## Consequences

What changes for the rest of the app:

- **"A quack has an author" is no longer true of every row.** A row without an author is a tombstone, and only a tombstone: the check constraint refuses any other combination. Code that reads the author has to handle the empty case.
- **Known readers that need a change:**
  - the `Quack` domain type and the mapper in `quack.repository.ts`, which read `userId` and `user`;
  - `QuackResponseDto.fromDomain`, which declares `userId: string` and throws when `user` is not loaded;
  - `QuacksService.deleteQuack`, whose ownership check `quack.userId !== user.id` lets an admin through a tombstone, so a tombstone must answer 404 before it;
  - the zod quack schema and `QuackItem.tsx`, which destructure `quack.user` and compare `quack.userId`.
- **The delete from the delete feature changes.** `DELETE /api/quacks/:id` keeps its contract (author or admin, 204, 403, 404), but `QuackRepository.deleteQuack` stops being a single `prisma.quack.delete`. It becomes a transaction that locks the quack, counts its replies, and either deletes the row or turns it into a tombstone. The delete dialog in `QuackDeleteButton` warns when replies exist. The Playwright delete tests in `apps/frontend/e2e/quacks.spec.ts` stay valid because their quacks have no replies, and one new test covers a quack that has.
- **"Deleted" has to be true in every place a quack shows up.**
  - Feed and search: a tombstone has no text and no author, so no search term matches it and "mine" leaves it out. The feed shows it as a placeholder.
  - Replies: they keep their own text and never copy the quack's text, so nothing of the deleted quack is left in them.
  - Frontend cache: `useDeleteQuack` invalidates `quackKeys.all()`, which covers the feed and every search. The reply queries must live under the same key prefix, or a cached reply list could outlive its quack.
  - Other people's open tabs keep the old text until they refetch on focus, because there is no live push. That is a short delay, not a leak.
  - Logs: the log lines carry ids and counts, never texts.
  - Backups and old database files still hold the text until they expire. The ADR cannot change that.
- **Readers that already fail safe:** `PollRepository.closePoll` compares `quack.userId !== userId`, and `null` never equals a user id (a tombstone has no poll anyway). The "mine" filter and search by author name leave tombstones out on their own.
- **New code that lists quacks or joins to the author must decide what a tombstone looks like.** The feed keeps tombstones in place, as a "This quack was deleted" placeholder with its replies.
- **Every delete of a quack goes through one service method.** Calling `prisma.quack.delete` directly skips the tombstone step. With replies present the foreign key refuses it, so a mistake fails instead of losing replies.
- **The wipe cannot be undone.** After a quack becomes a tombstone there is no way to bring back its text or author, and a backup restore only returns them to a point before the delete. The migration can be rolled back only while no tombstone exists, because `userId` cannot get its `NOT NULL` back otherwise.
- **Tombstones survive deleting the author's account.** They have no author, so the user cascade does not reach them. Live quacks that have replies from other people block deleting their author, because of the foreign key. A future delete-account feature must tombstone those quacks first, through the same method as the delete button.
- **A precedent for later features:** when other people's rows depend on something a person deletes, the row is wiped and anonymised, not cascaded away.
- **Not yet checked:** the locks and the foreign key behaviour have no test, because the tests mock the repository. They need the throwaway-script check described in `CLAUDE.md`.
