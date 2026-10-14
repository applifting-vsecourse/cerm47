import { describe, expect, it } from "vitest"

import { quackSchema } from "@/features/quack/api/quackSchemas"

const base = {
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "u1",
  createdAt: "2026-01-01T12:00:00Z",
  user: { id: "u1", name: "Duck", username: "duck" },
}

describe("quackSchema", () => {
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
