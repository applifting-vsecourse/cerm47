// Example component test — the pattern to copy for your own components.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows a quack's mood", () => {
    render(<QuackList quacks={[quack({ mood: "happy" })]} />)

    expect(screen.getByText(/Happy/)).toBeInTheDocument()
  })

  it("renders a moodless quack without a mood badge", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.queryByText(/Happy|Sad|Angry|Silly/)).not.toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it("shows a no-match message with a working clear button", async () => {
    const onClearSearch = vi.fn()
    render(
      <QuackList
        quacks={[]}
        searchTerm="duck pond"
        onClearSearch={onClearSearch}
      />,
    )

    expect(screen.getByText('No quacks match "duck pond".')).toBeInTheDocument()
    expect(screen.queryByText(/No quacks yet/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(onClearSearch).toHaveBeenCalledOnce()
  })

  it("highlights the searched words", () => {
    const { container } = render(
      <QuackList
        quacks={[quack()]}
        searchTerm="caffeinated"
      />,
    )

    expect(container.querySelectorAll("mark").length).toBeGreaterThan(0)
  })

  describe("polls", () => {
    const aPoll = (): NonNullable<Quack["poll"]> => ({
      id: "p1",
      isClosed: false,
      totalVotes: 1,
      myOptionId: null,
      options: [
        { id: "o1", text: "Pizza", votes: 1 },
        { id: "o2", text: "Sushi", votes: 0 },
      ],
    })
    const renderList = (quacks: Quack[], currentUserId?: string) =>
      render(
        <QueryClientProvider client={new QueryClient()}>
          <QuackList
            quacks={quacks}
            currentUserId={currentUserId}
          />
        </QueryClientProvider>,
      )

    it("shows the poll under the quack text", () => {
      renderList([quack({ text: "Lunch?", poll: aPoll() })])

      expect(screen.getByText("Lunch?")).toBeInTheDocument()
      expect(screen.getAllByRole("radio")).toHaveLength(2)
    })

    it("shows no poll for a plain quack", () => {
      renderList([quack()])

      expect(screen.queryByRole("radio")).not.toBeInTheDocument()
    })
  })

  it("offers Delete only on the signed-in user's own quacks", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <QuackList
          quacks={[
            quack({ id: "q1", userId: "u1" }),
            quack({ id: "q2", userId: "u2", text: "not mine" }),
          ]}
          currentUserId="u1"
        />
      </QueryClientProvider>,
    )

    expect(screen.getAllByRole("button", { name: "Delete quack" })).toHaveLength(1)
  })

  it("offers no Delete when nobody is known", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.queryByRole("button", { name: "Delete quack" })).not.toBeInTheDocument()
  })

  it("says so when Mine is empty and offers to write the first quack", async () => {
    const onWriteFirst = vi.fn()
    render(
      <QuackList
        quacks={[]}
        isMine
        onWriteFirst={onWriteFirst}
      />,
    )

    expect(screen.getByText("You haven't posted any quacks yet.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Write your first quack" }))
    expect(onWriteFirst).toHaveBeenCalledOnce()
  })
})
