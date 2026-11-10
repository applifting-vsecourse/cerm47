// Shared by the reply component tests. The "server" answers the replies query
// with whatever the test sets, so a component is tested through the same query
// it uses in the app, not through props alone.
import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack, Reply } from "@/features/quack/api/quackSchemas"

export const aReply = (overrides: Partial<Reply> = {}): Reply => ({
  id: "r1",
  text: "Agreed",
  mood: null,
  createdAt: new Date("2026-01-01T12:05:00Z"),
  user: { id: "u2", name: "Goose", username: "goose" },
  ...overrides,
})

export const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Duck", username: "duck" },
  poll: null,
  isDeleted: false,
  replyCount: 0,
  ...overrides,
})

export const aTombstone = (overrides: Partial<Quack> = {}): Quack =>
  aQuack({ text: "", userId: null, user: null, isDeleted: true, replyCount: 2, ...overrides })

export const replyServer: { replies: Reply[]; error: Error | null; isPending: boolean } = {
  replies: [],
  error: null,
  isPending: false,
}

export const resetReplyServer = () => {
  replyServer.replies = []
  replyServer.error = null
  replyServer.isPending = false
}

// Stands in for repliesQueryOptions in vi.mock.
export const repliesQueryOptionsFake = (quackId: string) => ({
  queryKey: quackKeys.replies(quackId),
  queryFn: (): Promise<Reply[]> => {
    if (replyServer.isPending) return new Promise(() => undefined)
    if (replyServer.error) return Promise.reject(replyServer.error)
    return Promise.resolve(replyServer.replies)
  },
})

export function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}
