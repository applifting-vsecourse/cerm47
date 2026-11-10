import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addReply } from "@/features/quack/api/addReply"
import { QuackDeletedError } from "@/features/quack/api/replyErrors"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { aReply, renderWithQuery } from "@/features/quack/components/replyTestHarness"

vi.mock("@/features/quack/api/addReply", () => ({ addReply: vi.fn() }))

const submit = () => userEvent.click(screen.getByRole("button", { name: "Post reply" }))

describe("ReplyForm", () => {
  beforeEach(() => {
    vi.mocked(addReply).mockReset()
  })

  it("blocks blank text with a message under the field and sends nothing", async () => {
    renderWithQuery(<ReplyForm quackId="q1" />)

    await userEvent.type(screen.getByLabelText("Your reply"), "   ")
    await submit()

    expect(await screen.findByText("Write something first")).toBeInTheDocument()
    expect(addReply).not.toHaveBeenCalled()
  })

  it("posts the trimmed text with the default mood and then resets the form", async () => {
    vi.mocked(addReply).mockResolvedValue(aReply())
    renderWithQuery(
      <ReplyForm
        quackId="q1"
        defaultMood="happy"
      />,
    )

    await userEvent.type(screen.getByLabelText("Your reply"), "  Agreed  ")
    await submit()

    await waitFor(() =>
      expect(addReply).toHaveBeenCalledWith({ quackId: "q1", text: "Agreed", mood: "happy" }),
    )
    await waitFor(() => expect(screen.getByLabelText("Your reply")).toHaveValue(""))
  })

  it("sends no mood when none is chosen", async () => {
    vi.mocked(addReply).mockResolvedValue(aReply())
    renderWithQuery(<ReplyForm quackId="q1" />)

    await userEvent.type(screen.getByLabelText("Your reply"), "Agreed")
    await submit()

    await waitFor(() =>
      expect(addReply).toHaveBeenCalledWith({ quackId: "q1", text: "Agreed", mood: undefined }),
    )
  })

  it("tells the user when the quack was deleted meanwhile", async () => {
    vi.mocked(addReply).mockRejectedValue(new QuackDeletedError())
    renderWithQuery(<ReplyForm quackId="q1" />)

    await userEvent.type(screen.getByLabelText("Your reply"), "Agreed")
    await submit()

    expect(await screen.findByText("This quack was deleted.")).toBeInTheDocument()
  })

  it("disables the submit button while the reply is being posted", async () => {
    vi.mocked(addReply).mockReturnValue(new Promise(() => undefined))
    renderWithQuery(<ReplyForm quackId="q1" />)

    await userEvent.type(screen.getByLabelText("Your reply"), "Agreed")
    await submit()

    await waitFor(() => expect(screen.getByRole("button", { name: "Post reply" })).toBeDisabled())
  })
})
