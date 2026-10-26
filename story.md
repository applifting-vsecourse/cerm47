# User story: Moderator deletes any quack

**As a** moderator, **I want to** delete any quack, **so that** nasty quacks disappear even when their author won't remove them.

## Why

Someone has started posting nasty quacks and their author won't delete them. Authors can already delete their own quacks; nobody else can. We need one role that can remove anything, and nothing more for now.

## Acceptance criteria

**Who is a moderator**

- A moderator is a user whose role is `admin`. The seeded `admin@example.com` has it.
- The role comes from the signed-in session. Users cannot set or change their own role.

**Deleting**

- A moderator sees the Delete button on every quack, not only their own. Everyone else still sees it only on their own quacks.
- The button opens the same confirmation dialog as today. After confirming, the quack disappears from the feed.
- A regular user who tries to delete someone else's quack through the API gets 403, as today. A signed-out caller gets 401. An unknown quack is still 404.
- The decision is made on the server, in the one place that already checks the author: the quack's author or an admin may delete.
- Deleting a quack removes its poll with it, as today.

**Unchanged**

- Closing a poll stays with the quack's author. A moderator does not get that button.
- No new endpoint, no new dialog text, no audit log.

## Success signal

A moderator can remove a bad quack in two clicks, and the E2E test proves a regular user still cannot.

## Out of scope

- A separate `moderator` role, or giving admins other powers
- An admin-only page or stats
- An audit log of who deleted what
- Editing or hiding quacks instead of deleting them
- A way to promote users from the app (the role is set in the database)

## Notes for the team

- The role is a plain string compared inline (`user.role !== 'admin'`). A typo fails silently; the unit test and the E2E test are what catch it.
- The seed creates the admin only in an empty database. In a database that already has users, set the role by hand.
