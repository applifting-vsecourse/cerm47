# User story: Ask a question with polls

**As a** signed-in user, **I want to** attach a few answers to my quack and let everyone pick one, **so that** the group's answer is counted for us instead of someone tallying replies by hand and getting it wrong.

## Why

People ask group questions in quacks ("where do we go for lunch?") and count the replies by hand. Someone always miscounts, and the post gets buried under replies. This first version only has to show whether people use polls at all.

## Acceptance criteria

**Asking**

- A poll is a quack with answer options attached. The quack text is the question. It follows the existing quack rules (up to 280 characters), and the mood still works.
- The post form has an "Add a poll" toggle. Turning it on shows option inputs: two to start, an "Add option" button up to 6, and a remove button on each option down to 2.
- Each option is trimmed and 1–80 characters. Blank options and duplicates (ignoring case) are rejected, with the message under the field.
- A poll is added when the quack is posted. A quack can't get a poll afterwards, and the question and options can't be edited.
- Existing quacks are not affected. They have no poll.
- After posting, the toggle and options reset, as the rest of the form does.

**Showing a poll**

- The poll sits inside its quack, under the text. It does not get a card of its own.
- Options appear in the order the author wrote them. Each option is a row showing its text, a bar filled to its share, and "7 · 54%".
- Percentages are whole numbers of the total votes. They may not add up to exactly 100. With no votes every option shows "0 · 0%".
- The user's own pick is marked with a check and a bold label.
- The footer reads "13 votes", "1 vote" or "No votes yet". A closed poll also shows "Closed".
- Everyone sees the counts at all times, before and after voting. Nobody sees who voted for what: the API and the screen only ever carry counts and the viewer's own pick.

**Voting**

- Every signed-in user can vote once per poll, including the author.
- Clicking an option casts the vote. Clicking a different option moves the vote there. Clicking the current pick does nothing. There is no way to withdraw a vote, only to switch it.
- Voting feels instant: the pick and the counts update the moment the user clicks, before the server answers.
- Rapid clicks are fine: the last click wins. The server sets the user's vote on the poll; it never adds a second one.
- The counts are computed by the server from the stored votes on every read. No stored total can drift from the real votes.
- Screens pick up other people's votes when the tab regains focus and after the user's own vote. There is no live push and no timer.

**When a vote fails**

- If the server rejects the vote or can't be reached, the pick and counts go back to the server's numbers and a message appears under that poll: "Couldn't save your vote. Try again." or, if the poll closed in the meantime, "This poll is closed."
- The options stay clickable after a failure. The message clears on the next vote attempt.
- The message belongs to the poll that failed. With several polls on screen, it is clear which one it is.

**Closing**

- On an open poll, its author sees a "Close poll" button. Nobody else does.
- The button opens a dialog: "Close this poll? Voting stops and the counts become final. This can't be undone." Closing happens only after the user confirms.
- Closing is not instant. The poll switches to Closed when the server confirms. If it fails, an inline message appears under the poll and the poll stays open.
- A closed poll keeps its final counts and the user's own pick. It cannot be voted on, changed or reopened.
- A vote and a close that happen at the same moment never leave a vote uncounted: the vote is either counted before the poll closes or rejected as closed.

**Search**

- Search keeps working as it does today. It matches the quack text, which is the question. Option text is not searched.
- A poll that matches a search still shows its options and counts.

**API and logging**

- `POST /api/quacks` accepts an optional poll with 2–6 option texts. The author is still taken from the session.
- `GET /api/quacks` returns, for each quack, either no poll or the poll with: its id, whether it is closed, the total votes, each option (id, text, vote count) in order, and the signed-in user's chosen option id (or none).
- `PUT /api/quacks/:quackId/poll/vote` sets the signed-in user's vote and returns the updated poll. It answers 404 if the quack has no poll, 400 if the option isn't one of that poll's options, and 409 if the poll is closed. Repeating the same request changes nothing.
- `POST /api/quacks/:quackId/poll/close` closes the poll and returns it. It answers 403 for anyone but the author and 404 if there is no poll. Closing an already closed poll succeeds and changes nothing.
- All of these keep the existing auth guard and input validation.
- The backend writes one log line each for: a poll created, a vote cast (marked as first vote or changed vote) and a poll closed. Each carries the user id and the poll id. Option texts and question texts are not logged.
- The database makes the rules hold: at most one vote per user per poll, and a vote always points at an option of its own poll. Deleting a user deletes their votes, as it does their quacks.

## Success signal

The log answers whether people use this: polls created per day, how many of them get at least one vote, distinct voters, and how many votes are changed votes. Polls with no votes at all show where the idea isn't catching on.

## Out of scope

- Editing or deleting a poll, its question or its options
- Reopening a closed poll, or a closing deadline
- Withdrawing a vote
- Multiple-choice polls
- Showing who voted for what
- Live updates (websockets, server-sent events, polling on a timer)
- Searching option text
- Adding a poll to a quack after it was posted
- Pagination
- An analytics tool

## Notes for the team

- The log is only a rough count, like the search log. It says how many votes happened, not who changed their mind about what beyond the first/changed flag.
- Vote data is personal: the database knows who voted for what, even though no screen or API shows it. Treat access to the `poll_vote` table like access to the logs.
- Counts are always counted, never stored. If the feed gets slow with many polls, that is the first place to look, and caching comes with the risk of the numbers being wrong.
