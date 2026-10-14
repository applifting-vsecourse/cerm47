import { beforeEach, describe, expect, it, vi } from "vitest"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import { votePoll } from "@/features/quack/api/votePoll"

const put = vi.hoisted(() => vi.fn())
const fakeHttpError = vi.hoisted(
  () =>
    class FakeHttpError extends Error {
      response: { status: number }
      constructor(status: number) {
        super(`status ${status}`)
        this.response = { status }
      }
    },
)
vi.mock("@/lib/api-client", () => ({ api: { put }, HTTPError: fakeHttpError }))

const poll = {
  id: "p1",
  isClosed: false,
  totalVotes: 1,
  myOptionId: "o1",
  options: [
    { id: "o1", text: "Pizza", votes: 1 },
    { id: "o2", text: "Sushi", votes: 0 },
  ],
}

describe("votePoll", () => {
  beforeEach(() => {
    put.mockReset()
  })

  it("puts the option on the quack's poll and parses the answer", async () => {
    put.mockReturnValue({ json: () => Promise.resolve(poll) })

    await expect(votePoll({ quackId: "q1", optionId: "o1" })).resolves.toEqual(poll)
    expect(put).toHaveBeenCalledWith("quacks/q1/poll/vote", { json: { optionId: "o1" } })
  })

  it("turns a 409 into PollClosedError", async () => {
    put.mockReturnValue({ json: () => Promise.reject(new fakeHttpError(409)) })

    await expect(votePoll({ quackId: "q1", optionId: "o1" })).rejects.toBeInstanceOf(
      PollClosedError,
    )
  })

  it("passes other HTTP failures on unchanged", async () => {
    const failure = new fakeHttpError(500)
    put.mockReturnValue({ json: () => Promise.reject(failure) })

    await expect(votePoll({ quackId: "q1", optionId: "o1" })).rejects.toBe(failure)
  })

  it("passes network failures on unchanged", async () => {
    const failure = new Error("network down")
    put.mockReturnValue({ json: () => Promise.reject(failure) })

    await expect(votePoll({ quackId: "q1", optionId: "o1" })).rejects.toBe(failure)
  })
})
