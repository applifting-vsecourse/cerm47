import { describe, expect, it } from "vitest"

import { activeSearch } from "@/features/quack/lib/searchTerms"

describe("activeSearch", () => {
  it("ignores terms shorter than 3 characters", () => {
    expect(activeSearch(undefined)).toBeUndefined()
    expect(activeSearch("")).toBeUndefined()
    expect(activeSearch("du")).toBeUndefined()
    expect(activeSearch("  du  ")).toBeUndefined()
  })

  it("returns the trimmed term from 3 characters on", () => {
    expect(activeSearch("duc")).toBe("duc")
    expect(activeSearch("  duck pond ")).toBe("duck pond")
  })
})
