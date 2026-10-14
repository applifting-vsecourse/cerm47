import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { percentOf, withVote } from "@/features/quack/lib/pollMath"

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  isClosed: false,
  totalVotes: 4,
  myOptionId: null,
  options: [
    { id: "o1", text: "Pizza", votes: 3 },
    { id: "o2", text: "Sushi", votes: 1 },
    { id: "o3", text: "Soup", votes: 0 },
  ],
  ...overrides,
})

describe("percentOf", () => {
  it("is 0 when nobody has voted", () => {
    expect(percentOf(0, 0)).toBe(0)
  })

  it("rounds to a whole number", () => {
    expect(percentOf(1, 3)).toBe(33)
    expect(percentOf(2, 3)).toBe(67)
    expect(percentOf(3, 4)).toBe(75)
    expect(percentOf(4, 4)).toBe(100)
  })
})

describe("withVote", () => {
  it("adds a first vote to the option and the total", () => {
    const next = withVote(poll(), "o3")

    expect(next.myOptionId).toBe("o3")
    expect(next.totalVotes).toBe(5)
    expect(next.options.map((option) => option.votes)).toEqual([3, 1, 1])
  })

  it("moves an earlier vote and keeps the total", () => {
    const next = withVote(poll({ myOptionId: "o1" }), "o2")

    expect(next.myOptionId).toBe("o2")
    expect(next.totalVotes).toBe(4)
    expect(next.options.map((option) => option.votes)).toEqual([2, 2, 0])
  })

  it("changes nothing when the option is already the pick", () => {
    const before = poll({ myOptionId: "o1" })

    expect(withVote(before, "o1")).toEqual(before)
  })

  it("changes nothing for an option that is not in the poll", () => {
    const before = poll()

    expect(withVote(before, "nope")).toEqual(before)
  })

  it("does not change a closed poll", () => {
    const before = poll({ isClosed: true })

    expect(withVote(before, "o2")).toEqual(before)
  })

  it("does not modify the poll it was given", () => {
    const before = poll()
    withVote(before, "o2")

    expect(before).toEqual(poll())
  })
})
