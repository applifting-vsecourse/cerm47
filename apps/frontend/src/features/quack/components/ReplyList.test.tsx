import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ReplyList } from "@/features/quack/components/ReplyList"
import {
  aReply,
  renderWithQuery,
  replyServer,
  resetReplyServer,
} from "@/features/quack/components/replyTestHarness"

vi.mock("@/features/quack/api/repliesQueryOptions", async () => {
  const harness = await import("@/features/quack/components/replyTestHarness")
  return { repliesQueryOptions: harness.repliesQueryOptionsFake }
})
vi.mock("@/features/quack/api/addReply", () => ({ addReply: vi.fn() }))
vi.mock("@/features/quack/api/deleteReply", () => ({ deleteReply: vi.fn() }))

const renderList = (props: Partial<React.ComponentProps<typeof ReplyList>> = {}) =>
  renderWithQuery(
    <ReplyList
      quackId="q1"
      isTombstone={false}
      currentUserId="u1"
      isAdmin={false}
      {...props}
    />,
  )

describe("ReplyList", () => {
  beforeEach(() => {
    resetReplyServer()
  })

  it("shows a loading state while the replies load", () => {
    replyServer.isPending = true
    renderList()

    expect(screen.getByRole("status", { name: "Loading replies" })).toBeInTheDocument()
  })

  it("explains an empty list in one sentence", async () => {
    renderList()

    expect(await screen.findByText("No replies yet. Be the first to answer.")).toBeInTheDocument()
  })

  it("lists the replies in the order the server sends them", async () => {
    replyServer.replies = [
      aReply({ id: "r1", text: "First" }),
      aReply({ id: "r2", text: "Second" }),
    ]
    renderList()

    const items = await screen.findAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("First")
    expect(items[1]).toHaveTextContent("Second")
  })

  it("shows an error with a retry that loads the replies, e.g. when the quack vanished", async () => {
    replyServer.error = new Error("Quack not found")
    renderList()

    expect(await screen.findByText("Quack not found")).toBeInTheDocument()

    replyServer.error = null
    replyServer.replies = [aReply({ text: "Back again" })]
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByText("Back again")).toBeInTheDocument()
  })

  it("offers a delete button on a reply only to its writer", async () => {
    replyServer.replies = [
      aReply({ id: "r1", user: { id: "u1", name: "Duck", username: "duck" } }),
      aReply({ id: "r2" }),
    ]
    renderList({ currentUserId: "u1" })

    await screen.findAllByRole("listitem")
    expect(screen.getAllByRole("button", { name: "Delete reply" })).toHaveLength(1)
  })

  it("offers an admin a delete button on every reply", async () => {
    replyServer.replies = [aReply({ id: "r1" }), aReply({ id: "r2" })]
    renderList({ currentUserId: "u9", isAdmin: true })

    await screen.findAllByRole("listitem")
    expect(screen.getAllByRole("button", { name: "Delete reply" })).toHaveLength(2)
  })

  it("shows the reply form under a live quack but not under a tombstone", async () => {
    replyServer.replies = [aReply()]
    const live = renderList()
    await screen.findAllByRole("listitem")
    expect(screen.getByLabelText("Your reply")).toBeInTheDocument()
    live.unmount()

    renderList({ isTombstone: true })
    await screen.findAllByRole("listitem")
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument()
  })
})
