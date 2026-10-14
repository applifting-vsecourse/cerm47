import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { MoodPicker } from "@/components/MoodPicker"

describe("MoodPicker", () => {
  it("shows emoji only, named by aria-label, by default", () => {
    render(
      <MoodPicker
        value="sad"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: "Sad" })).toBeChecked()
    expect(screen.queryByRole("radio", { name: "None" })).not.toBeInTheDocument()
  })

  it("clears the mood when the selected one is pressed again", async () => {
    const onChange = vi.fn()
    render(
      <MoodPicker
        value="sad"
        onChange={onChange}
      />,
    )

    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith("")
  })

  it("offers an explicit None that is selected when there is no mood", () => {
    render(
      <MoodPicker
        value=""
        onChange={vi.fn()}
        hasNoneOption
        hasLabels
      />,
    )

    expect(screen.getByRole("radio", { name: "None" })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Happy/ })).not.toBeChecked()
  })

  it("keeps the choice when the selected item is pressed again with a None option", async () => {
    const onChange = vi.fn()
    render(
      <MoodPicker
        value="sad"
        onChange={onChange}
        hasNoneOption
      />,
    )

    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("radio", { name: "None" }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith("")
  })
})
