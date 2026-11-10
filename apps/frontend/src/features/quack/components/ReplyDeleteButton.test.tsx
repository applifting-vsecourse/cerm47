import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteReply } from "@/features/quack/api/deleteReply"
import { ReplyDeleteButton } from "@/features/quack/components/ReplyDeleteButton"

vi.mock("@/features/quack/api/deleteReply", () => ({ deleteReply: vi.fn() }))

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReplyDeleteButton
        quackId="q1"
        replyId="r1"
      />
    </QueryClientProvider>,
  )

describe("ReplyDeleteButton", () => {
  beforeEach(() => {
    vi.mocked(deleteReply).mockReset()
  })

  it("asks first and deletes only after confirming", async () => {
    vi.mocked(deleteReply).mockResolvedValue()
    renderButton()

    await userEvent.click(screen.getByRole("button", { name: "Delete reply" }))
    expect(screen.getByText("Delete this reply?")).toBeInTheDocument()
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument()
    expect(deleteReply).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(deleteReply).toHaveBeenCalledWith({ quackId: "q1", replyId: "r1" }))
  })

  it("does not delete when cancelled", async () => {
    renderButton()

    await userEvent.click(screen.getByRole("button", { name: "Delete reply" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(deleteReply).not.toHaveBeenCalled()
  })
})
