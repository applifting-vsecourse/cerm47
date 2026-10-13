import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { QuackMood } from "@/lib/mood"

import { QuackForm } from "@/features/quack/components/QuackForm"

function renderForm(defaultMood: QuackMood | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <QuackForm defaultMood={defaultMood} />
    </QueryClientProvider>,
  )
}

describe("QuackForm default mood", () => {
  it("starts with the mood chosen in settings", () => {
    renderForm("silly")
    expect(screen.getByRole("radio", { name: "Silly" })).toBeChecked()
  })

  it("starts without a mood when none is chosen", () => {
    renderForm(null)
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0)
  })
})
