import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import type { Poll } from "@/features/quack/api/quackSchemas"
import {
  aPoll,
  deferred,
  renderFeed,
  setServerPoll,
} from "@/features/quack/components/pollTestHarness"

const votePoll = vi.hoisted(() => vi.fn())
vi.mock("@/features/quack/api/votePoll", () => ({ votePoll }))

const row = (name: RegExp) => screen.getByRole("radio", { name })
const votedOptionIds = () =>
  (votePoll.mock.calls as [{ optionId: string }][]).map(([input]) => input.optionId)

describe("voting", () => {
  beforeEach(() => {
    votePoll.mockReset()
  })

  it("moves the pick and the counts before the server answers", async () => {
    renderFeed(aPoll())
    votePoll.mockReturnValue(deferred<Poll>().promise)

    await userEvent.click(row(/Sushi/))

    expect(row(/Sushi/)).toBeChecked()
    expect(row(/Sushi/)).toHaveTextContent("2 · 40%")
    expect(screen.getByText("5 votes")).toBeInTheDocument()
    expect(votePoll).toHaveBeenCalledWith({ quackId: "q1", optionId: "o2" })
  })

  it("shows the server's numbers once the vote is saved", async () => {
    renderFeed(aPoll())
    const request = deferred<Poll>()
    votePoll.mockReturnValue(request.promise)

    await userEvent.click(row(/Sushi/))
    // someone else voted meanwhile
    const saved = aPoll({
      myOptionId: "o2",
      totalVotes: 6,
      options: [
        { id: "o1", text: "Pizza", votes: 3 },
        { id: "o2", text: "Sushi", votes: 2 },
        { id: "o3", text: "Soup", votes: 1 },
      ],
    })
    setServerPoll(saved)
    request.resolve(saved)

    await waitFor(() => expect(screen.getByText("6 votes")).toBeInTheDocument())
    expect(row(/Soup/)).toHaveTextContent("1 · 17%")
    expect(row(/Sushi/)).toBeChecked()
  })

  it("puts the numbers back and says so when the vote fails", async () => {
    renderFeed(aPoll({ myOptionId: "o1" }))
    votePoll.mockRejectedValue(new Error("network down"))

    await userEvent.click(row(/Sushi/))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save your vote. Try again.",
    )
    await waitFor(() => expect(row(/Pizza/)).toBeChecked())
    expect(row(/Pizza/)).toHaveTextContent("3 · 75%")
    expect(row(/Sushi/)).toHaveTextContent("1 · 25%")
    expect(row(/Sushi/)).toBeEnabled()
  })

  it("says the poll is closed when the server refuses a vote for that reason", async () => {
    renderFeed(aPoll())
    votePoll.mockRejectedValue(new PollClosedError())

    await userEvent.click(row(/Sushi/))

    expect(await screen.findByRole("alert")).toHaveTextContent("This poll is closed.")
  })

  it("clears the message on the next attempt", async () => {
    renderFeed(aPoll())
    votePoll.mockRejectedValueOnce(new Error("network down"))
    await userEvent.click(row(/Sushi/))
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    votePoll.mockReturnValue(deferred<Poll>().promise)
    await userEvent.click(row(/Soup/))

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  })

  it("sends nothing when the current pick is clicked again", async () => {
    renderFeed(aPoll({ myOptionId: "o1" }))

    await userEvent.click(row(/Pizza/))

    expect(votePoll).not.toHaveBeenCalled()
    expect(row(/Pizza/)).toBeChecked()
  })

  it("sends nothing on a closed poll", async () => {
    renderFeed(aPoll({ isClosed: true }))

    await userEvent.click(row(/Sushi/))

    expect(votePoll).not.toHaveBeenCalled()
  })

  it("sends quick clicks in order and ends on the last one", async () => {
    renderFeed(aPoll())
    const first = deferred<Poll>()
    const second = deferred<Poll>()
    votePoll.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    await userEvent.click(row(/Sushi/))
    await userEvent.click(row(/Soup/))

    expect(row(/Soup/)).toBeChecked()
    // the second request waits for the first, so the server sees them in click order
    expect(votePoll).toHaveBeenCalledTimes(1)

    const saved = aPoll({
      myOptionId: "o3",
      totalVotes: 5,
      options: [
        { id: "o1", text: "Pizza", votes: 3 },
        { id: "o2", text: "Sushi", votes: 1 },
        { id: "o3", text: "Soup", votes: 1 },
      ],
    })
    setServerPoll(saved)
    first.resolve(aPoll())
    await waitFor(() => expect(votePoll).toHaveBeenCalledTimes(2))
    expect(votedOptionIds()).toEqual(["o2", "o3"])
    second.resolve(saved)

    await waitFor(() => expect(screen.getByText("5 votes")).toBeInTheDocument())
    expect(row(/Soup/)).toBeChecked()
    expect(row(/Sushi/)).toHaveTextContent("1 · 20%")
  })
})
