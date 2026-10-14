import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { PollView } from "@/features/quack/components/PollView"

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

export function renderPoll(value: Poll, { isAuthor = false }: { isAuthor?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PollView
        quackId="q1"
        poll={value}
        isAuthor={isAuthor}
      />
    </QueryClientProvider>,
  )
}

describe("PollView display", () => {
  it("lists the options in order with their count and percent", () => {
    renderPoll(poll())

    const rows = screen.getAllByRole("radio")
    expect(rows.map((row) => row.textContent)).toEqual([
      "Pizza3 · 75%",
      "Sushi1 · 25%",
      "Soup0 · 0%",
    ])
  })

  it("shows 0 · 0% everywhere and 'No votes yet' when nobody voted", () => {
    renderPoll(
      poll({
        totalVotes: 0,
        options: [
          { id: "o1", text: "Pizza", votes: 0 },
          { id: "o2", text: "Sushi", votes: 0 },
        ],
      }),
    )

    expect(screen.getAllByText("0 · 0%")).toHaveLength(2)
    expect(screen.getByText("No votes yet")).toBeInTheDocument()
  })

  it.each([
    [1, "1 vote"],
    [4, "4 votes"],
  ])("counts %i total votes as %j", (totalVotes, label) => {
    renderPoll(poll({ totalVotes }))

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("marks the viewer's own pick", () => {
    renderPoll(poll({ myOptionId: "o2" }))

    expect(screen.getByRole("radio", { name: /Sushi/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Pizza/ })).not.toBeChecked()
  })

  it("has no pick when the viewer has not voted", () => {
    renderPoll(poll())

    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0)
  })

  it("says Closed on a closed poll and keeps the final counts", () => {
    renderPoll(poll({ isClosed: true, myOptionId: "o1" }))

    const footer = screen.getByText(/Closed/)
    expect(footer).toBeInTheDocument()
    expect(within(screen.getByRole("radio", { name: /Pizza/ })).getByText("3 · 75%")).toBeVisible()
    expect(screen.getByRole("radio", { name: /Pizza/ })).toBeChecked()
  })

  it("does not say Closed on an open poll", () => {
    renderPoll(poll())

    expect(screen.queryByText(/Closed/)).not.toBeInTheDocument()
  })
})
