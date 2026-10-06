import { useState } from "react"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuackSearch } from "@/features/quack/components/QuackSearch"

describe("QuackSearch", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it("reports the term once the user pauses typing", async () => {
    const onChange = vi.fn()
    render(
      <QuackSearch
        value=""
        onChange={onChange}
      />,
    )

    await userEvent.type(screen.getByLabelText("Search quacks"), "duck")
    expect(onChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onChange).toHaveBeenCalledExactlyOnceWith("duck")
  })

  it("clears immediately", async () => {
    const onChange = vi.fn()
    render(
      <QuackSearch
        value="duck"
        onChange={onChange}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith("")
    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
  })

  it("follows the value when it is changed from outside", () => {
    const { rerender } = render(
      <QuackSearch
        value="duck"
        onChange={vi.fn()}
      />,
    )
    rerender(
      <QuackSearch
        value=""
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
  })
})

describe("QuackSearch edge cases", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it("keeps a typed leading space when the page reports a blank term", async () => {
    // Mimics the page: a blank term is stored as "" in the URL.
    function Harness() {
      const [value, setValue] = useState("")
      return (
        <QuackSearch
          value={value}
          onChange={(next) => setValue(next.trim() ? next : "")}
        />
      )
    }
    render(<Harness />)

    await userEvent.type(screen.getByLabelText("Search quacks"), " ")
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByLabelText("Search quacks")).toHaveValue(" ")
  })
})
