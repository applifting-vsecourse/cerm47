import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteReply } from "@/features/quack/api/deleteReply"

const del = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ api: { delete: del } }))

describe("deleteReply", () => {
  beforeEach(() => {
    del.mockReset()
  })

  it("deletes the reply under its quack, encoding both ids", async () => {
    del.mockResolvedValue(undefined)

    await deleteReply({ quackId: "q 1", replyId: "r/1" })

    expect(del).toHaveBeenCalledWith("quacks/q%201/replies/r%2F1")
  })
})
