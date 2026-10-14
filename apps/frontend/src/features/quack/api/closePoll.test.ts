import { beforeEach, describe, expect, it, vi } from "vitest"

import { closePoll } from "@/features/quack/api/closePoll"

const post = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ api: { post } }))

const closed = {
  id: "p1",
  isClosed: true,
  totalVotes: 1,
  myOptionId: null,
  options: [
    { id: "o1", text: "Pizza", votes: 1 },
    { id: "o2", text: "Sushi", votes: 0 },
  ],
}

describe("closePoll", () => {
  beforeEach(() => {
    post.mockReset()
  })

  it("posts to the quack's poll and parses the answer", async () => {
    post.mockReturnValue({ json: () => Promise.resolve(closed) })

    await expect(closePoll({ quackId: "q1" })).resolves.toEqual(closed)
    expect(post).toHaveBeenCalledWith("quacks/q1/poll/close")
  })

  it("rejects an answer that is not a poll", async () => {
    post.mockReturnValue({ json: () => Promise.resolve({ ok: true }) })

    await expect(closePoll({ quackId: "q1" })).rejects.toThrow()
  })
})
