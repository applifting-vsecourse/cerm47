import { beforeEach, describe, expect, it, vi } from "vitest"

import { addReply } from "@/features/quack/api/addReply"
import { QuackDeletedError } from "@/features/quack/api/replyErrors"

const post = vi.hoisted(() => vi.fn())
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
vi.mock("@/lib/api-client", () => ({ api: { post }, HTTPError: fakeHttpError }))

const reply = {
  id: "r1",
  text: "Agreed",
  mood: "happy",
  createdAt: "2026-01-01T12:05:00Z",
  user: { id: "u2", name: "Goose", username: "goose" },
}

describe("addReply", () => {
  beforeEach(() => {
    post.mockReset()
  })

  it("posts text and mood under the quack and parses the answer", async () => {
    post.mockReturnValue({ json: () => Promise.resolve(reply) })

    const created = await addReply({ quackId: "q1", text: "Agreed", mood: "happy" })

    expect(created.id).toBe("r1")
    expect(post).toHaveBeenCalledWith("quacks/q1/replies", {
      json: { text: "Agreed", mood: "happy" },
    })
  })

  it("turns a 409 into QuackDeletedError", async () => {
    post.mockReturnValue({ json: () => Promise.reject(new fakeHttpError(409)) })

    await expect(addReply({ quackId: "q1", text: "Agreed" })).rejects.toBeInstanceOf(
      QuackDeletedError,
    )
  })

  it("passes other HTTP failures on unchanged", async () => {
    const failure = new fakeHttpError(500)
    post.mockReturnValue({ json: () => Promise.reject(failure) })

    await expect(addReply({ quackId: "q1", text: "Agreed" })).rejects.toBe(failure)
  })
})
