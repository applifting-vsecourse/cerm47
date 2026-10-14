import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { QuackMood } from "@/lib/mood"

import { QuackForm } from "@/features/quack/components/QuackForm"

const addQuack = vi.hoisted(() => vi.fn())
vi.mock("@/features/quack/api/addQuack", () => ({ addQuack }))

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

function nth<T>(items: T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`No item at index ${index}`)
  return item
}

type Payload = { text: string; pollOptions?: string[] }
const sentPayload = () => nth(addQuack.mock.calls as [Payload][], 0)[0]

describe("QuackForm poll", () => {
  beforeEach(() => {
    addQuack.mockReset().mockResolvedValue({})
  })

  async function typeQuack(text: string) {
    await userEvent.type(screen.getByLabelText("New quack"), text)
  }
  const optionInputs = () => screen.queryAllByLabelText(/^Option \d/)
  async function fillOptions(...texts: string[]) {
    const inputs = optionInputs()
    for (const [index, text] of texts.entries()) await userEvent.type(nth(inputs, index), text)
  }
  const submit = () => userEvent.click(screen.getByRole("button", { name: "Quack" }))

  it("posts a plain quack without a poll by default", async () => {
    renderForm(null)
    await typeQuack("hello")
    await submit()

    await waitFor(() => expect(addQuack).toHaveBeenCalledOnce())
    expect(sentPayload()).toEqual({ text: "hello", mood: undefined, pollOptions: undefined })
    expect(optionInputs()).toHaveLength(0)
  })

  it("starts a poll with two empty options", async () => {
    renderForm(null)
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))

    expect(optionInputs()).toHaveLength(2)
    expect(screen.queryByRole("button", { name: /Remove option/ })).not.toBeInTheDocument()
  })

  it("adds options up to 6 and removes them down to 2", async () => {
    renderForm(null)
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))

    for (let count = 2; count < 6; count++) {
      await userEvent.click(screen.getByRole("button", { name: "Add option" }))
    }
    expect(optionInputs()).toHaveLength(6)
    expect(screen.queryByRole("button", { name: "Add option" })).not.toBeInTheDocument()

    for (let count = 6; count > 2; count--) {
      await userEvent.click(nth(screen.getAllByRole("button", { name: /Remove option/ }), 0))
    }
    expect(optionInputs()).toHaveLength(2)
    expect(screen.queryByRole("button", { name: /Remove option/ })).not.toBeInTheDocument()
  })

  it("posts the trimmed options with the quack", async () => {
    renderForm(null)
    await typeQuack("Lunch?")
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))
    await fillOptions("  Pizza ", "Sushi")
    await submit()

    await waitFor(() => expect(addQuack).toHaveBeenCalledOnce())
    expect(sentPayload()).toMatchObject({
      text: "Lunch?",
      pollOptions: ["Pizza", "Sushi"],
    })
  })

  it("asks for a blank option under its field and does not post", async () => {
    renderForm(null)
    await typeQuack("Lunch?")
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))
    await fillOptions("Pizza")
    await submit()

    expect(await screen.findByText("Write an answer")).toBeInTheDocument()
    expect(addQuack).not.toHaveBeenCalled()
  })

  it("rejects duplicate options ignoring case", async () => {
    renderForm(null)
    await typeQuack("Lunch?")
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))
    await fillOptions("Pizza", "pizza ")
    await submit()

    expect(await screen.findByText("Options must be different")).toBeInTheDocument()
    expect(addQuack).not.toHaveBeenCalled()
  })

  it("rejects an option over 80 characters", async () => {
    renderForm(null)
    await typeQuack("Lunch?")
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))
    await fillOptions("Pizza", "x".repeat(81))
    await submit()

    expect(await screen.findByText("Keep it under 80 characters")).toBeInTheDocument()
    expect(addQuack).not.toHaveBeenCalled()
  })

  it("drops the poll when it is removed again", async () => {
    renderForm(null)
    await typeQuack("Lunch?")
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))
    await userEvent.click(screen.getByRole("button", { name: "Remove poll" }))
    expect(optionInputs()).toHaveLength(0)
    await submit()

    await waitFor(() => expect(addQuack).toHaveBeenCalledOnce())
    expect(sentPayload().pollOptions).toBeUndefined()
  })

  it("goes back to a plain form after posting", async () => {
    renderForm(null)
    await typeQuack("Lunch?")
    await userEvent.click(screen.getByRole("button", { name: "Add a poll" }))
    await fillOptions("Pizza", "Sushi")
    await submit()

    await waitFor(() => expect(optionInputs()).toHaveLength(0))
    expect(screen.getByRole("button", { name: "Add a poll" })).toBeInTheDocument()
  })
})
