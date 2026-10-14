// Shared by the poll component tests: a feed that shows the poll from the
// cached quack list, the way the real page does, so a change to the cache is
// what changes the screen.
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render } from "@testing-library/react"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { PollView } from "@/features/quack/components/PollView"

export const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  isClosed: false,
  totalVotes: 4,
  myOptionId: null,
  options: [
    { id: "o1", text: "Pizza", votes: 3 },
    { id: "o2", text: "Sushi", votes: 1 },
    { id: "o3", text: "Soup", votes: 0 },
  ],
  ...overrides,
})

const aQuack = (poll: Poll): Quack => ({
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Duck", username: "duck" },
  poll,
})

// What the "server" answers when the feed is read again.
let serverPoll: Poll
export const setServerPoll = (poll: Poll) => {
  serverPoll = poll
}

function Feed({ isAuthor }: { isAuthor: boolean }) {
  const { data } = useQuery({
    queryKey: quackKeys.list(),
    queryFn: () => Promise.resolve([aQuack(serverPoll)]),
  })
  const poll = data?.[0]?.poll
  return poll ? (
    <PollView
      quackId="q1"
      poll={poll}
      isAuthor={isAuthor}
    />
  ) : null
}

export function renderFeed(poll: Poll, { isAuthor = false }: { isAuthor?: boolean } = {}) {
  serverPoll = poll
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(quackKeys.list(), [aQuack(poll)])
  render(
    <QueryClientProvider client={queryClient}>
      <Feed isAuthor={isAuthor} />
    </QueryClientProvider>,
  )
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}
