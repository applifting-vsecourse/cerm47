import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackItem } from "@/features/quack/components/QuackItem"
import {
  aQuack,
  aReply,
  aTombstone,
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
vi.mock("@/features/quack/api/deleteQuack", () => ({ deleteQuack: vi.fn() }))

describe("QuackItem replies", () => {
  beforeEach(() => {
    resetReplyServer()
  })

  it.each([
    [0, "Reply"],
    [1, "1 reply"],
    [3, "3 replies"],
  ])("labels the reply control for %i replies as %s", (replyCount, label) => {
    renderWithQuery(
      <QuackItem
        quack={aQuack({ replyCount })}
        currentUserId="u1"
      />,
    )

    expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
  })

  it("shows no reply control when nobody is signed in, as on the landing page", () => {
    renderWithQuery(<QuackItem quack={aQuack({ replyCount: 2 })} />)

    expect(screen.queryByRole("button", { name: /repl/i })).not.toBeInTheDocument()
  })

  it("opens the replies in place and closes them again", async () => {
    replyServer.replies = [aReply({ text: "Agreed" })]
    renderWithQuery(
      <QuackItem
        quack={aQuack({ replyCount: 1 })}
        currentUserId="u1"
      />,
    )
    const control = screen.getByRole("button", { name: "1 reply" })
    expect(control).toHaveAttribute("aria-expanded", "false")

    await userEvent.click(control)
    expect(await screen.findByText("Agreed")).toBeInTheDocument()
    expect(control).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByLabelText("Your reply")).toBeInTheDocument()

    await userEvent.click(control)
    expect(screen.queryByText("Agreed")).not.toBeInTheDocument()
  })

  it("shows a tombstone as a placeholder with no author, delete button or reply form, but its replies open", async () => {
    replyServer.replies = [aReply({ text: "Still here" }), aReply({ id: "r2", text: "Me too" })]
    renderWithQuery(
      <QuackItem
        quack={aTombstone()}
        currentUserId="u3"
        isAdmin
      />,
    )

    expect(screen.getByText("This quack was deleted")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete quack" })).not.toBeInTheDocument()
    expect(screen.queryByText("Duck")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "2 replies" }))
    expect(await screen.findByText("Still here")).toBeInTheDocument()
    expect(screen.getByText("Me too")).toBeInTheDocument()
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument()
  })
})
