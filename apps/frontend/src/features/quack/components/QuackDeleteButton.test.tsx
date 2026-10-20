import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { QuackDeleteButton } from "@/features/quack/components/QuackDeleteButton"

vi.mock("@/features/quack/api/deleteQuack", () => ({ deleteQuack: vi.fn() }))

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackDeleteButton quackId="q1" />
    </QueryClientProvider>,
  )

describe("QuackDeleteButton", () => {
  beforeEach(() => vi.mocked(deleteQuack).mockReset())

  it("asks first and deletes only after confirming", async () => {
    vi.mocked(deleteQuack).mockResolvedValue()
    renderButton()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    expect(screen.getByText("Delete this quack?")).toBeInTheDocument()
    expect(deleteQuack).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(deleteQuack).toHaveBeenCalledWith("q1"))
  })

  it("does not delete when cancelled", async () => {
    renderButton()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(deleteQuack).not.toHaveBeenCalled()
  })
})
