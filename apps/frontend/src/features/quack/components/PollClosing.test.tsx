import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import {
  aPoll,
  deferred,
  renderFeed,
  setServerPoll,
} from "@/features/quack/components/pollTestHarness"

const closePoll = vi.hoisted(() => vi.fn())
vi.mock("@/features/quack/api/closePoll", () => ({ closePoll }))

const closeButton = () => screen.queryByRole("button", { name: "Close poll" })
const dialog = () => screen.getByRole("dialog")

describe("closing a poll", () => {
  beforeEach(() => {
    closePoll.mockReset()
  })

  it("offers the author a Close poll button on an open poll", () => {
    renderFeed(aPoll(), { isAuthor: true })

    expect(closeButton()).toBeInTheDocument()
  })

  it("offers nobody else a Close poll button", () => {
    renderFeed(aPoll(), { isAuthor: false })

    expect(closeButton()).not.toBeInTheDocument()
  })

  it("offers no Close poll button on a closed poll, not even to the author", () => {
    renderFeed(aPoll({ isClosed: true }), { isAuthor: true })

    expect(closeButton()).not.toBeInTheDocument()
  })

  it("asks first and sends nothing until the author confirms", async () => {
    renderFeed(aPoll(), { isAuthor: true })

    await userEvent.click(screen.getByRole("button", { name: "Close poll" }))

    expect(within(dialog()).getByText("Close this poll?")).toBeInTheDocument()
    expect(
      within(dialog()).getByText("Voting stops and the counts become final. This can't be undone."),
    ).toBeInTheDocument()
    expect(closePoll).not.toHaveBeenCalled()
  })

  it("sends nothing when the author cancels", async () => {
    renderFeed(aPoll(), { isAuthor: true })
    await userEvent.click(screen.getByRole("button", { name: "Close poll" }))

    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(closePoll).not.toHaveBeenCalled()
    expect(closeButton()).toBeInTheDocument()
  })

  it("shows a pending state while the server answers", async () => {
    renderFeed(aPoll(), { isAuthor: true })
    closePoll.mockReturnValue(deferred<Poll>().promise)
    await userEvent.click(screen.getByRole("button", { name: "Close poll" }))

    await userEvent.click(within(dialog()).getByRole("button", { name: "Close poll" }))

    expect(closePoll).toHaveBeenCalledWith({ quackId: "q1" })
    expect(within(dialog()).getByRole("button", { name: "Close poll" })).toBeDisabled()
    expect(within(dialog()).getByRole("button", { name: "Cancel" })).toBeDisabled()
    // the poll is not closed on screen until the server says so
    expect(screen.queryByText("Closed")).not.toBeInTheDocument()
  })

  it("shows the poll as Closed once the server confirms", async () => {
    renderFeed(aPoll({ myOptionId: "o1" }), { isAuthor: true })
    const closed = aPoll({ myOptionId: "o1", isClosed: true })
    closePoll.mockImplementation(() => {
      setServerPoll(closed)
      return Promise.resolve(closed)
    })
    await userEvent.click(screen.getByRole("button", { name: "Close poll" }))

    await userEvent.click(within(dialog()).getByRole("button", { name: "Close poll" }))

    expect(await screen.findByText("Closed")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(closeButton()).not.toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Pizza/ })).toBeChecked()
  })

  it("keeps the poll open and says why when closing fails", async () => {
    renderFeed(aPoll(), { isAuthor: true })
    closePoll.mockRejectedValue(new Error("network down"))
    await userEvent.click(screen.getByRole("button", { name: "Close poll" }))

    await userEvent.click(within(dialog()).getByRole("button", { name: "Close poll" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't close the poll. Try again.",
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(screen.queryByText("Closed")).not.toBeInTheDocument()
    expect(closeButton()).toBeInTheDocument()
  })

  it("clears the message when the author tries again", async () => {
    renderFeed(aPoll(), { isAuthor: true })
    closePoll.mockRejectedValueOnce(new Error("network down"))
    await userEvent.click(screen.getByRole("button", { name: "Close poll" }))
    await userEvent.click(within(dialog()).getByRole("button", { name: "Close poll" }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    closePoll.mockReturnValue(deferred<Poll>().promise)
    await userEvent.click(screen.getByRole("button", { name: "Close poll" }))
    await userEvent.click(within(dialog()).getByRole("button", { name: "Close poll" }))

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  })
})
