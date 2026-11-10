import { describe, expect, it } from "vitest"

import { quackSchema, replySchema } from "@/features/quack/api/quackSchemas"

const base = {
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "u1",
  createdAt: "2026-01-01T12:00:00Z",
  user: { id: "u1", name: "Duck", username: "duck" },
  isDeleted: false,
  replyCount: 0,
}

describe("replySchema", () => {
  it("parses a reply with its writer", () => {
    const reply = replySchema.parse({
      id: "r1",
      text: "Agreed",
      mood: "happy",
      createdAt: "2026-01-01T12:05:00Z",
      user: { id: "u2", name: "Goose", username: "goose" },
    })
    expect(reply.createdAt).toBeInstanceOf(Date)
    expect(reply.user.username).toBe("goose")
  })
})

describe("quackSchema", () => {
  it("parses a tombstone: no author, no text, no poll", () => {
    const tombstone = quackSchema.parse({
      ...base,
      text: "",
      userId: null,
      user: null,
      poll: null,
      isDeleted: true,
      replyCount: 2,
    })
    expect(tombstone.isDeleted).toBe(true)
    expect(tombstone.user).toBeNull()
    expect(tombstone.userId).toBeNull()
    expect(tombstone.replyCount).toBe(2)
  })

  it("rejects a quack without isDeleted, so a stale server is noticed", () => {
    const withoutFlag: Record<string, unknown> = { ...base, poll: null }
    delete withoutFlag.isDeleted
    expect(() => quackSchema.parse(withoutFlag)).toThrow()
  })

  it("parses a quack without a poll", () => {
    expect(quackSchema.parse({ ...base, poll: null }).poll).toBeNull()
  })

  it("parses a poll with counts and the viewer's pick", () => {
    const poll = {
      id: "p1",
      isClosed: false,
      totalVotes: 3,
      myOptionId: "o1",
      options: [
        { id: "o1", text: "Pizza", votes: 2 },
        { id: "o2", text: "Sushi", votes: 1 },
      ],
    }

    expect(quackSchema.parse({ ...base, poll }).poll).toEqual(poll)
  })

  it("rejects a quack with no poll field, so a stale server is noticed", () => {
    expect(() => quackSchema.parse(base)).toThrow()
  })
})
