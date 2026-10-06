# User story: Search the quack feed

**As a** signed-in user, **I want to** type a word or a name and see only the quacks that match, **so that** I can find a post I saw days ago without scrolling.

## Acceptance criteria

**Search box**

- The Quacks page has a search box between the post form and the list.
- The box accepts up to 100 characters and has a clear button.

**Matching**

- A quack matches when every word in the term appears in its text, its author's name or its author's username. The words can be in any order and can be spread across those fields.
- Matching ignores case and means "contains", so `duck` also finds "Ducks".
- Results stay newest first, as in the feed. There is no ranking.
- Quacks of any age are searched.

**When it runs**

- The list filters while the user types, after a short pause. There is no submit button.
- Searching starts at 3 characters (after trimming). With 1–2 characters the full feed stays and a hint says to type at least 3. This keeps the backend from being queried on every first letter.
- The term is kept in the URL, as in `/quacks?q=duck`. Reloading or sharing the link restores the search.
- A blank or whitespace-only term shows the full feed.

**Results**

- Matched words are highlighted in the quack text, the author's name and the username.
- When nothing matches, the user sees a message that names the term, such as `No quacks match "duck pond".` It comes with a **Clear search** button. The existing "No quacks yet" message stays for an empty feed.
- After the user posts a quack, the search is cleared and the full feed shows with the new post on top.

**API and logging**

- `GET /api/quacks` accepts an optional `q` parameter. The server does the filtering and keeps the existing auth guard.
- A term shorter than 3 or longer than 100 characters (after trimming) is rejected with a 400.
- Each search request writes one backend log line with the user id, the search term and the result count. Blank terms are not logged.

## Success signal

The log answers whether people use this. Count searches per day and distinct users. Zero-result searches show what people look for and can't find.

## Out of scope

- Pagination
- Relevance ranking
- Search-as-you-type suggestions
- Searching by date
- A database table for searches
- An analytics tool

## Notes for the team

- The log is only a rough count. The pause after typing sends one request per pause, and one request per pause isn't one "search". Expect a few log lines for each real search.
- Search terms go into the logs, so they are visible to anyone with log access.
- The `q` value must be escaped before it reaches the database query, so `%` and `_` are not treated as wildcards.
